<?php
declare(strict_types=1);

const MYMETEO_KNMI_WMS_BASE_URL = 'https://api.dataplatform.knmi.nl/wms/adaguc-server';
const MYMETEO_KNMI_DATASET = 'radar_forecast_2.0';
const MYMETEO_KNMI_LAYER = 'precipitation_nowcast';
const MYMETEO_KNMI_STYLE = 'radar/nearest';
const MYMETEO_DEFAULT_CACHE_TTL_SECONDS = 240;
const MYMETEO_CAPABILITIES_CACHE_TTL_SECONDS = 300;
const MYMETEO_STALE_CACHE_TTL_SECONDS = 1800;

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    mymeteo_json_error(405, 'Method not allowed');
}

try {
    $config = mymeteo_load_config();
    $apiKey = mymeteo_get_api_key($config);

    if ($apiKey === '') {
        mymeteo_json_error(503, 'KNMI proxy is not configured');
    }

    $wmsRequest = mymeteo_build_wms_request($_GET);
    $cacheDir = mymeteo_get_cache_dir($config);
    $cacheTtl = mymeteo_cache_ttl_for_request($wmsRequest['request']);
    $cachePaths = mymeteo_cache_paths($cacheDir, $wmsRequest['cache_key']);
    $cachedResponse = mymeteo_read_cached_response($cachePaths, $cacheTtl);

    if ($cachedResponse !== null) {
        mymeteo_send_response($cachedResponse, 'hit');
    }

    $staleResponse = mymeteo_read_cached_response($cachePaths, MYMETEO_STALE_CACHE_TTL_SECONDS, true);
    $upstreamResponse = mymeteo_fetch_upstream($wmsRequest['url'], $apiKey, $wmsRequest['accept']);

    if ($upstreamResponse['status'] >= 200 && $upstreamResponse['status'] < 300) {
        try {
            mymeteo_validate_upstream_content($wmsRequest['request'], $upstreamResponse);
        } catch (RuntimeException $error) {
            if ($staleResponse !== null) {
                mymeteo_send_response($staleResponse, 'stale');
            }

            throw $error;
        }

        mymeteo_write_cached_response($cachePaths, $upstreamResponse);
        mymeteo_send_response($upstreamResponse, $staleResponse === null ? 'miss' : 'refresh');
    }

    if ($staleResponse !== null) {
        mymeteo_send_response($staleResponse, 'stale');
    }

    mymeteo_json_error(502, 'KNMI upstream request failed', mymeteo_get_upstream_error_context($upstreamResponse));
} catch (InvalidArgumentException $error) {
    mymeteo_json_error(400, $error->getMessage());
} catch (RuntimeException $error) {
    mymeteo_json_error(502, 'KNMI proxy request failed');
}

function mymeteo_load_config(): array
{
    $paths = [];
    $envConfigPath = getenv('MYMETEO_KNMI_CONFIG');

    if (is_string($envConfigPath) && $envConfigPath !== '') {
        $paths[] = $envConfigPath;
    }

    $paths[] = __DIR__ . '/../../private/knmi-config.php';
    $paths[] = __DIR__ . '/../private/knmi-config.php';

    foreach ($paths as $path) {
        if (!is_file($path)) {
            continue;
        }

        $config = require $path;
        if (!is_array($config)) {
            throw new RuntimeException('KNMI config file must return an array');
        }

        $config['_config_dir'] = dirname($path);
        return $config;
    }

    return [];
}

function mymeteo_get_api_key(array $config): string
{
    $apiKey = $config['knmi_wms_api_key'] ?? $config['api_key'] ?? '';

    if (!is_string($apiKey) || $apiKey === '') {
        $apiKey = getenv('KNMI_WMS_API_KEY') ?: '';
    }

    if (!is_string($apiKey)) {
        return '';
    }

    return trim($apiKey);
}

function mymeteo_get_cache_dir(array $config): string
{
    $cacheDir = $config['cache_dir'] ?? '';

    if (!is_string($cacheDir) || $cacheDir === '') {
        $configDir = $config['_config_dir'] ?? (__DIR__ . '/../../private');
        $cacheDir = $configDir . '/knmi-cache';
    }

    if (!is_dir($cacheDir) && !mkdir($cacheDir, 0750, true) && !is_dir($cacheDir)) {
        throw new RuntimeException('Could not create KNMI cache directory');
    }

    if (!is_writable($cacheDir)) {
        throw new RuntimeException('KNMI cache directory is not writable');
    }

    return $cacheDir;
}

function mymeteo_build_wms_request(array $rawParams): array
{
    $params = mymeteo_normalize_params($rawParams);
    $request = mymeteo_enum_param($params, 'request', ['GetCapabilities', 'GetMap', 'GetFeatureInfo'], true);
    $dataset = mymeteo_string_param($params, 'dataset', true);
    $service = strtoupper(mymeteo_string_param($params, 'service', true));

    if ($dataset !== MYMETEO_KNMI_DATASET) {
        throw new InvalidArgumentException('Unsupported KNMI dataset');
    }

    if ($service !== 'WMS') {
        throw new InvalidArgumentException('Unsupported KNMI service');
    }

    if ($request === 'GetCapabilities') {
        $query = [
            'DATASET' => MYMETEO_KNMI_DATASET,
            'SERVICE' => 'WMS',
            'request' => 'GetCapabilities',
        ];

        return mymeteo_pack_wms_request($request, $query, 'application/xml,text/xml,*/*');
    }

    $version = mymeteo_string_param($params, 'version', true);
    $crs = strtoupper(mymeteo_string_param($params, 'crs', true));
    $bbox = mymeteo_bbox_param($params);
    $width = mymeteo_int_param($params, 'width', 1, 1200, true);
    $height = mymeteo_int_param($params, 'height', 1, 1200, true);
    $styles = mymeteo_string_param($params, 'styles', true);
    $time = mymeteo_iso_time_param($params, 'time', true);
    $referenceTime = mymeteo_iso_time_param($params, 'reference_time', true);

    if ($version !== '1.3.0') {
        throw new InvalidArgumentException('Unsupported KNMI WMS version');
    }

    if ($crs !== 'EPSG:4326') {
        throw new InvalidArgumentException('Unsupported KNMI CRS');
    }

    if ($styles !== MYMETEO_KNMI_STYLE) {
        throw new InvalidArgumentException('Unsupported KNMI style');
    }

    if ($request === 'GetMap') {
        $layers = mymeteo_string_param($params, 'layers', true);
        $format = strtolower(mymeteo_string_param($params, 'format', true));
        $transparent = strtolower(mymeteo_string_param($params, 'transparent', true));

        if ($layers !== MYMETEO_KNMI_LAYER) {
            throw new InvalidArgumentException('Unsupported KNMI layer');
        }

        if ($format !== 'image/png') {
            throw new InvalidArgumentException('Unsupported KNMI image format');
        }

        if ($transparent !== 'true') {
            throw new InvalidArgumentException('Unsupported KNMI transparency option');
        }

        $query = [
            'DATASET' => MYMETEO_KNMI_DATASET,
            'SERVICE' => 'WMS',
            'VERSION' => '1.3.0',
            'request' => 'GetMap',
            'LAYERS' => MYMETEO_KNMI_LAYER,
            'CRS' => 'EPSG:4326',
            'BBOX' => $bbox,
            'WIDTH' => (string) $width,
            'HEIGHT' => (string) $height,
            'FORMAT' => 'image/png',
            'TRANSPARENT' => 'true',
            'STYLES' => MYMETEO_KNMI_STYLE,
            'TIME' => $time,
            'reference_time' => $referenceTime,
        ];

        return mymeteo_pack_wms_request($request, $query, 'image/png,*/*');
    }

    $layers = mymeteo_string_param($params, 'layers', true);
    $queryLayers = mymeteo_string_param($params, 'query_layers', true);
    $infoFormat = strtolower(mymeteo_string_param($params, 'info_format', true));
    $format = strtolower(mymeteo_string_param($params, 'format', true));
    $i = mymeteo_int_param($params, 'i', 0, $width - 1, true);
    $j = mymeteo_int_param($params, 'j', 0, $height - 1, true);

    if ($layers !== MYMETEO_KNMI_LAYER || $queryLayers !== MYMETEO_KNMI_LAYER) {
        throw new InvalidArgumentException('Unsupported KNMI feature layer');
    }

    if ($infoFormat !== 'application/json') {
        throw new InvalidArgumentException('Unsupported KNMI feature format');
    }

    if ($format !== 'image/png') {
        throw new InvalidArgumentException('Unsupported KNMI base map format');
    }

    $query = [
        'DATASET' => MYMETEO_KNMI_DATASET,
        'SERVICE' => 'WMS',
        'VERSION' => '1.3.0',
        'request' => 'GetFeatureInfo',
        'LAYERS' => MYMETEO_KNMI_LAYER,
        'QUERY_LAYERS' => MYMETEO_KNMI_LAYER,
        'CRS' => 'EPSG:4326',
        'BBOX' => $bbox,
        'WIDTH' => (string) $width,
        'HEIGHT' => (string) $height,
        'I' => (string) $i,
        'J' => (string) $j,
        'INFO_FORMAT' => 'application/json',
        'FORMAT' => 'image/png',
        'STYLES' => MYMETEO_KNMI_STYLE,
        'TIME' => $time,
        'reference_time' => $referenceTime,
    ];

    return mymeteo_pack_wms_request($request, $query, 'application/json,*/*');
}

function mymeteo_pack_wms_request(string $request, array $query, string $accept): array
{
    $queryString = http_build_query($query, '', '&', PHP_QUERY_RFC3986);

    return [
        'request' => $request,
        'accept' => $accept,
        'cache_key' => hash('sha256', $queryString),
        'url' => MYMETEO_KNMI_WMS_BASE_URL . '?' . $queryString,
    ];
}

function mymeteo_normalize_params(array $rawParams): array
{
    $params = [];

    foreach ($rawParams as $key => $value) {
        if (is_array($value)) {
            throw new InvalidArgumentException('Repeated KNMI parameters are not supported');
        }

        $params[strtolower((string) $key)] = trim((string) $value);
    }

    return $params;
}

function mymeteo_string_param(array $params, string $key, bool $required = false): string
{
    if (!array_key_exists($key, $params) || $params[$key] === '') {
        if ($required) {
            throw new InvalidArgumentException('Missing KNMI parameter: ' . $key);
        }

        return '';
    }

    if (strlen($params[$key]) > 200) {
        throw new InvalidArgumentException('KNMI parameter is too long: ' . $key);
    }

    return $params[$key];
}

function mymeteo_enum_param(array $params, string $key, array $allowedValues, bool $required = false): string
{
    $value = mymeteo_string_param($params, $key, $required);

    foreach ($allowedValues as $allowedValue) {
        if (strcasecmp($value, $allowedValue) === 0) {
            return $allowedValue;
        }
    }

    throw new InvalidArgumentException('Unsupported KNMI parameter: ' . $key);
}

function mymeteo_int_param(array $params, string $key, int $min, int $max, bool $required = false): int
{
    $value = mymeteo_string_param($params, $key, $required);

    if (!preg_match('/^\d+$/', $value)) {
        throw new InvalidArgumentException('Invalid KNMI integer parameter: ' . $key);
    }

    $number = (int) $value;

    if ($number < $min || $number > $max) {
        throw new InvalidArgumentException('KNMI integer parameter out of range: ' . $key);
    }

    return $number;
}

function mymeteo_iso_time_param(array $params, string $key, bool $required = false): string
{
    $value = mymeteo_string_param($params, $key, $required);

    if (!preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', $value)) {
        throw new InvalidArgumentException('Invalid KNMI time parameter: ' . $key);
    }

    return $value;
}

function mymeteo_bbox_param(array $params): string
{
    $bbox = mymeteo_string_param($params, 'bbox', true);
    $parts = explode(',', $bbox);

    if (count($parts) !== 4) {
        throw new InvalidArgumentException('Invalid KNMI BBOX parameter');
    }

    $numbers = [];
    foreach ($parts as $part) {
        if (!is_numeric($part)) {
            throw new InvalidArgumentException('Invalid KNMI BBOX number');
        }

        $numbers[] = (float) $part;
    }

    [$south, $west, $north, $east] = $numbers;

    if ($south < 48.0 || $south > 56.5 || $north < 48.0 || $north > 56.5 || $south >= $north) {
        throw new InvalidArgumentException('KNMI BBOX latitude out of range');
    }

    if ($west < -0.5 || $west > 12.0 || $east < -0.5 || $east > 12.0 || $west >= $east) {
        throw new InvalidArgumentException('KNMI BBOX longitude out of range');
    }

    return implode(',', array_map('mymeteo_format_bbox_number', $numbers));
}

function mymeteo_format_bbox_number(float $number): string
{
    $formatted = rtrim(rtrim(sprintf('%.8F', $number), '0'), '.');
    return $formatted === '-0' ? '0' : $formatted;
}

function mymeteo_cache_ttl_for_request(string $request): int
{
    return $request === 'GetCapabilities'
        ? MYMETEO_CAPABILITIES_CACHE_TTL_SECONDS
        : MYMETEO_DEFAULT_CACHE_TTL_SECONDS;
}

function mymeteo_cache_paths(string $cacheDir, string $cacheKey): array
{
    return [
        'body' => $cacheDir . '/' . $cacheKey . '.body',
        'meta' => $cacheDir . '/' . $cacheKey . '.json',
    ];
}

function mymeteo_read_cached_response(array $cachePaths, int $ttl, bool $allowStale = false): ?array
{
    if (!is_file($cachePaths['meta']) || !is_file($cachePaths['body'])) {
        return null;
    }

    $meta = json_decode((string) file_get_contents($cachePaths['meta']), true);
    if (!is_array($meta) || !isset($meta['fetched_at'], $meta['status'], $meta['content_type'])) {
        return null;
    }

    $age = time() - (int) $meta['fetched_at'];
    if ($age > $ttl) {
        return null;
    }

    $body = file_get_contents($cachePaths['body']);
    if ($body === false) {
        return null;
    }

    return [
        'status' => (int) $meta['status'],
        'content_type' => (string) $meta['content_type'],
        'body' => $body,
        'cache_age' => $age,
        'cache_mode' => $allowStale ? 'stale' : 'fresh',
    ];
}

function mymeteo_write_cached_response(array $cachePaths, array $response): void
{
    $meta = [
        'fetched_at' => time(),
        'status' => $response['status'],
        'content_type' => $response['content_type'],
    ];

    file_put_contents($cachePaths['body'], $response['body'], LOCK_EX);
    file_put_contents($cachePaths['meta'], json_encode($meta), LOCK_EX);
}

function mymeteo_fetch_upstream(string $url, string $apiKey, string $accept): array
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('cURL is not available');
    }

    $curl = curl_init($url);
    curl_setopt_array($curl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_USERAGENT => 'MyMeteo KNMI proxy (+https://mymeteo.nl/)',
        CURLOPT_HTTPHEADER => [
            'Authorization: ' . $apiKey,
            'Accept: ' . $accept,
        ],
    ]);

    $rawResponse = curl_exec($curl);
    $curlError = curl_error($curl);
    $headerSize = (int) curl_getinfo($curl, CURLINFO_HEADER_SIZE);
    $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
    $contentType = (string) curl_getinfo($curl, CURLINFO_CONTENT_TYPE);
    curl_close($curl);

    if ($rawResponse === false) {
        throw new RuntimeException($curlError !== '' ? $curlError : 'KNMI request failed');
    }

    $body = substr((string) $rawResponse, $headerSize);
    $contentType = mymeteo_sanitize_content_type($contentType);

    return [
        'status' => $status,
        'content_type' => $contentType,
        'body' => $body,
    ];
}

function mymeteo_sanitize_content_type(string $contentType): string
{
    $contentType = strtolower(trim($contentType));

    if ($contentType === '') {
        return 'application/octet-stream';
    }

    if (!preg_match('/^[a-z0-9.+-]+\/[a-z0-9.+-]+(?:;\s*charset=[a-z0-9._-]+)?$/', $contentType)) {
        return 'application/octet-stream';
    }

    return $contentType;
}

function mymeteo_validate_upstream_content(string $request, array $response): void
{
    $contentType = strtolower((string) $response['content_type']);

    if ($request === 'GetMap' && strpos($contentType, 'image/png') !== 0) {
        throw new RuntimeException('KNMI map response was not PNG');
    }

    if ($request === 'GetFeatureInfo' && strpos($contentType, 'application/json') !== 0) {
        throw new RuntimeException('KNMI feature response was not JSON');
    }

    if ($request === 'GetCapabilities' && strpos($contentType, 'xml') === false) {
        throw new RuntimeException('KNMI capabilities response was not XML');
    }
}

function mymeteo_get_upstream_error_context(array $response): array
{
    $context = [
        'upstream_status' => (int) ($response['status'] ?? 0),
        'upstream_content_type' => (string) ($response['content_type'] ?? ''),
    ];
    $upstreamError = mymeteo_extract_upstream_error($response);

    if ($upstreamError !== '') {
        $context['upstream_error'] = $upstreamError;
    }

    return $context;
}

function mymeteo_extract_upstream_error(array $response): string
{
    $body = trim((string) ($response['body'] ?? ''));
    if ($body === '') {
        return '';
    }

    $contentType = strtolower((string) ($response['content_type'] ?? ''));
    if (strpos($contentType, 'application/json') === 0) {
        $data = json_decode($body, true);
        if (is_array($data)) {
            $message = $data['error'] ?? $data['message'] ?? '';
            if (is_string($message)) {
                return mymeteo_sanitize_error_detail($message);
            }
        }
    }

    return mymeteo_sanitize_error_detail(strip_tags($body));
}

function mymeteo_sanitize_error_detail(string $detail): string
{
    $detail = preg_replace('/\s+/', ' ', trim($detail));
    if (!is_string($detail) || $detail === '') {
        return '';
    }

    return strlen($detail) > 180 ? substr($detail, 0, 177) . '...' : $detail;
}

function mymeteo_send_response(array $response, string $cacheState): void
{
    http_response_code((int) $response['status']);
    header('Content-Type: ' . $response['content_type']);
    header('Cache-Control: public, max-age=60');
    header('X-MyMeteo-KNMI-Proxy: 1');
    header('X-MyMeteo-KNMI-Cache: ' . $cacheState);

    if (isset($response['cache_age'])) {
        header('Age: ' . max(0, (int) $response['cache_age']));
    }

    echo $response['body'];
    exit;
}

function mymeteo_json_error(int $status, string $message, array $details = []): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-MyMeteo-KNMI-Proxy: 1');
    echo json_encode([
        'error' => $message,
    ] + $details);
    exit;
}
