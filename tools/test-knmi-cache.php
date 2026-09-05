<?php
declare(strict_types=1);

// Execute the real cache functions without executing the HTTP entrypoint or loading configuration.
$proxySource = (string) file_get_contents(__DIR__ . '/../api/knmi-wms.php');
$tokens = token_get_all($proxySource);
$declarations = '';
$depth = 0;
for ($index = 0, $count = count($tokens); $index < $count; $index++) {
    $token = $tokens[$index];
    if ($depth === 0 && is_array($token) && ($token[0] === T_CONST || $token[0] === T_FUNCTION)) {
        $isFunction = $token[0] === T_FUNCTION;
        if ($isFunction) {
            $nameIndex = $index + 1;
            while (isset($tokens[$nameIndex]) && is_array($tokens[$nameIndex]) && $tokens[$nameIndex][0] === T_WHITESPACE) {
                $nameIndex++;
            }
            if (!isset($tokens[$nameIndex]) || !is_array($tokens[$nameIndex]) || $tokens[$nameIndex][0] !== T_STRING) {
                continue;
            }
        }
        $functionDepth = 0;
        $hasBody = false;
        for (; $index < $count; $index++) {
            $part = $tokens[$index];
            $declarations .= is_array($part) ? $part[1] : $part;
            if ($part === '{') {
                $hasBody = true;
                $functionDepth++;
            } elseif ($part === '}') {
                $functionDepth--;
                if ($isFunction && $hasBody && $functionDepth === 0) {
                    break;
                }
            } elseif (!$isFunction && $part === ';') {
                break;
            }
        }
        $declarations .= "\n";
        continue;
    }
    if ($token === '{') {
        $depth++;
    } elseif ($token === '}') {
        $depth--;
    }
}
eval('declare(strict_types=1);' . $declarations);
unset($proxySource, $tokens, $declarations);

function test_check(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function test_same($expected, $actual, string $message): void
{
    test_check($expected === $actual, $message . ' (expected ' . var_export($expected, true) . ', got ' . var_export($actual, true) . ')');
}

function test_remove_tree(string $path): void
{
    if (is_link($path) || is_file($path)) {
        unlink($path);
        return;
    }
    if (!is_dir($path)) {
        return;
    }
    foreach (new DirectoryIterator($path) as $entry) {
        if (!$entry->isDot()) {
            test_remove_tree($entry->getPathname());
        }
    }
    rmdir($path);
}

function test_temp_dir(string $name): string
{
    $dir = sys_get_temp_dir() . '/mymeteo-knmi-cache-test-' . bin2hex(random_bytes(8)) . '-' . $name;
    test_check(mkdir($dir, 0700), 'Create isolated test directory');
    return $dir;
}

function test_response(int $generation): array
{
    return [
        'status' => 200 + ($generation % 2),
        'content_type' => 'application/x-mymeteo-fixture-' . $generation,
        'body' => $generation . "\n" . str_repeat(chr($generation % 256), 128 * 1024) . "\0binary-end\xff",
    ];
}

function test_coherent_response(?array $response, string $context): void
{
    test_check($response !== null, $context . ': valid cache record must remain readable');
    $separator = strpos($response['body'], "\n");
    test_check($separator !== false, $context . ': body has its generation marker');
    $generation = (int) substr($response['body'], 0, $separator);
    $expected = test_response($generation);
    foreach (['status', 'content_type', 'body'] as $field) {
        test_check($response[$field] === $expected[$field], $context . ': metadata and binary body must belong to one complete generation');
    }
}

function test_start_worker(array $arguments, string $logDir): array
{
    $suffix = bin2hex(random_bytes(6));
    $stdout = $logDir . '/worker-' . $suffix . '.out';
    $stderr = $logDir . '/worker-' . $suffix . '.err';
    $pipes = [];
    $process = proc_open(
        array_merge([PHP_BINARY, __FILE__, '--worker'], $arguments),
        [0 => ['pipe', 'r'], 1 => ['file', $stdout, 'w'], 2 => ['file', $stderr, 'w']],
        $pipes
    );
    test_check(is_resource($process), 'Start concurrent PHP process');
    fclose($pipes[0]);
    return ['process' => $process, 'stdout' => $stdout, 'stderr' => $stderr];
}

function test_wait_workers(array $workers, float $timeoutSeconds = 15.0): void
{
    $deadline = microtime(true) + $timeoutSeconds;
    foreach ($workers as $worker) {
        do {
            $status = proc_get_status($worker['process']);
            if (!$status['running']) {
                break;
            }
            if (microtime(true) >= $deadline) {
                foreach ($workers as $runningWorker) {
                    @proc_terminate($runningWorker['process']);
                }
                throw new RuntimeException('Concurrent cache tests exceeded their deadline');
            }
            usleep(1000);
        } while (true);
        $closeCode = proc_close($worker['process']);
        $exitCode = $status['exitcode'] >= 0 ? $status['exitcode'] : $closeCode;
        $details = (string) file_get_contents($worker['stderr']);
        test_same(0, $exitCode, 'Concurrent cache worker succeeded: ' . trim($details));
    }
}

function test_entry_path(string $dir, string $key, int $now): string
{
    return $dir . '/v2/' . (intdiv($now, MYMETEO_CACHE_BUCKET_SECONDS) * MYMETEO_CACHE_BUCKET_SECONDS) . '/' . $key . '.cache';
}

function test_fixture_file(string $path, string $content, ?int $modifiedAt = null): void
{
    if (!is_dir(dirname($path))) {
        test_check(mkdir(dirname($path), 0700, true), 'Create fixture parent directory');
    }
    test_same(strlen($content), file_put_contents($path, $content), 'Write synthetic fixture');
    if ($modifiedAt !== null) {
        test_check(touch($path, $modifiedAt), 'Set synthetic file age');
    }
}

function test_count_cache_files(string $dir): int
{
    $count = 0;
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    foreach ($iterator as $entry) {
        if (!$entry->isLink() && $entry->isFile() && preg_match('/^[a-f0-9]{64}\.(cache|body|json)$/D', $entry->getFilename())) {
            $count++;
        }
    }
    return $count;
}

function test_worker(array $args): void
{
    [$mode, $dir, $key, $clock, $barrier] = $args;
    $now = (int) $clock;
    $paths = mymeteo_cache_paths($dir, $key);
    $ready = $barrier . '.' . $mode . '.ready';
    test_fixture_file($ready, 'ready');
    $deadline = microtime(true) + 10;
    while (!is_file($barrier)) {
        test_check(microtime(true) < $deadline, 'Worker start barrier timed out');
        usleep(1000);
        clearstatcache(true, $barrier);
    }
    $successfulWrites = 0;
    if ($mode === 'writer-a' || $mode === 'writer-b') {
        $base = $mode === 'writer-a' ? 100 : 200;
        for ($iteration = 0; $iteration < 60; $iteration++) {
            if (mymeteo_write_cached_response($paths, test_response($base + $iteration), $now)) {
                $successfulWrites++;
            }
            test_coherent_response(mymeteo_read_cached_response($paths, 240, false, $now), $mode);
            usleep(1000);
        }
    } elseif ($mode === 'reader') {
        for ($iteration = 0; $iteration < 300; $iteration++) {
            test_coherent_response(mymeteo_read_cached_response($paths, 240, false, $now), 'Concurrent reader');
            usleep(1000);
        }
    } elseif ($mode === 'cleanup') {
        for ($iteration = 0; $iteration < 80; $iteration++) {
            // The cadence gate and nonblocking lock remain active, as on real requests.
            mymeteo_cleanup_cache($dir, $now, 40, 0.02);
            test_coherent_response(mymeteo_read_cached_response($paths, 240, false, $now), 'Concurrent cleanup');
            usleep(1000);
        }
    } else {
        throw new RuntimeException('Unknown synthetic worker mode');
    }
    echo json_encode(['writes' => $successfulWrites]) . "\n";
}

if (($argv[1] ?? '') === '--worker') {
    try {
        test_worker(array_slice($argv, 2));
        exit(0);
    } catch (Throwable $error) {
        fwrite(STDERR, $error->getMessage() . "\n");
        exit(1);
    }
}

$testDirs = [];
$workers = [];
try {
    $now = time();
    $dir = test_temp_dir('records');
    $testDirs[] = $dir;
    $key = hash('sha256', 'age-boundary');
    $paths = mymeteo_cache_paths($dir, $key);
    // Write just before an hour boundary, so even the short fresh TTL crosses buckets.
    $writtenAt = intdiv($now, 3600) * 3600 + 3590;
    $response = test_response(2);
    test_check(mymeteo_write_cached_response($paths, $response, $writtenAt), 'Write complete binary cache record');
    foreach ([0, 239, 240] as $age) {
        $cached = mymeteo_read_cached_response($paths, 240, false, $writtenAt + $age);
        test_coherent_response($cached, 'Fresh cache age ' . $age);
        test_same($age, $cached['cache_age'], 'Fresh Age remains exact across hour rollover');
        test_same('fresh', $cached['cache_mode'], 'Fresh read mode');
        test_same($writtenAt, $cached['fetched_at'], 'Original fetch time is retained');
    }
    test_same(null, mymeteo_read_cached_response($paths, 240, false, $writtenAt + 241), 'Default fresh TTL ends at 240 seconds');
    test_same(300, mymeteo_cache_ttl_for_request('GetCapabilities'), 'Capabilities retain their existing five-minute fresh TTL');
    test_check(mymeteo_read_cached_response($paths, 300, false, $writtenAt + 300) !== null, 'Capabilities fresh TTL includes its boundary');
    test_same(null, mymeteo_read_cached_response($paths, 300, false, $writtenAt + 301), 'Capabilities fresh TTL rejects older data');
    foreach ([241, 1799, 1800] as $age) {
        $cached = mymeteo_read_cached_response($paths, 1800, true, $writtenAt + $age);
        test_coherent_response($cached, 'Stale cache age ' . $age);
        test_same($age, $cached['cache_age'], 'Stale Age is accurate');
        test_same('stale', $cached['cache_mode'], 'Stale read mode');
    }
    test_same(null, mymeteo_read_cached_response($paths, 1800, true, $writtenAt + 1801), 'Stale data is unavailable beyond thirty minutes');
    test_same(null, mymeteo_read_cached_response($paths, 9999, true, $writtenAt + 1801), 'Caller TTL cannot extend the thirty-minute stale bound');
    test_same(null, mymeteo_read_cached_response($paths, 240, false, $writtenAt - 1), 'Future-dated records are not fresh data');

    $entryPath = test_entry_path($dir, $key, $writtenAt);
    $entry = (string) file_get_contents($entryPath);
    $newline = strpos($entry, "\n");
    test_check($newline !== false, 'Complete entry has one metadata line');
    $header = json_decode(substr($entry, 0, $newline), true);
    $body = substr($entry, $newline + 1);
    test_same($response['body'], $body, 'Cache preserves binary bytes without text encoding');
    $malformed = [
        'invalid JSON' => "{not-json}\n" . $body,
        'truncated header' => substr($entry, 0, $newline),
        'truncated body' => substr($entry, 0, -1),
        'extra body bytes' => $entry . "\x00",
        'missing metadata' => "{}\n" . $body,
    ];
    foreach ([
        ['version', 1], ['fetched_at', 'invalid'], ['status', 502],
        ['content_type', null], ['body_length', -1], ['body_length', '10'],
    ] as [$field, $value]) {
        $changed = $header;
        $changed[$field] = $value;
        $malformed['invalid ' . $field . '-' . json_encode($value)] = json_encode($changed) . "\n" . $body;
    }
    foreach ($malformed as $label => $bytes) {
        test_fixture_file($entryPath, $bytes);
        test_same(null, mymeteo_read_cached_response($paths, 240, false, $writtenAt), $label . ' must be a cache miss');
    }
    test_fixture_file($entryPath, $entry);

    // Real I/O failure, without permission assumptions or a production fault-injection hook.
    $lockPath = $dir . '/.mymeteo-cache.lock';
    $savedLock = $dir . '/saved-lock';
    test_check(rename($lockPath, $savedLock), 'Preserve coordination lock fixture');
    test_check(mkdir($lockPath), 'Replace lock path with an unwritable file target');
    try {
        test_same(false, mymeteo_write_cached_response($paths, test_response(3), $writtenAt), 'Cache I/O failure is best-effort');
        test_same($entry, file_get_contents($entryPath), 'Failed write preserves the previous complete record');
        test_coherent_response(mymeteo_read_cached_response($paths, 240, false, $writtenAt), 'Read after failed write');
    } finally {
        rmdir($lockPath);
        rename($savedLock, $lockPath);
    }
    $invalidMetadata = test_response(3);
    $invalidMetadata['content_type'] = "invalid-utf8-\xff";
    test_same(false, mymeteo_write_cached_response($paths, $invalidMetadata, $writtenAt), 'Metadata encoding failure cannot replace the record');
    test_same($entry, file_get_contents($entryPath), 'Encoding failure preserves existing bytes');

    // A busy coordination lock must not turn successful upstream work into a hung request.
    $lock = fopen($lockPath, 'c+b');
    test_check($lock !== false && flock($lock, LOCK_EX), 'Hold coordination lock in another file description');
    try {
        $started = microtime(true);
        test_same(false, mymeteo_write_cached_response($paths, test_response(4), $writtenAt), 'Busy cache publication is skipped');
        mymeteo_cleanup_cache($dir, $writtenAt, 20, 0.025);
        test_check(microtime(true) - $started < 0.5, 'Busy lock cannot stall writes or cleanup');
        test_same($entry, file_get_contents($entryPath), 'Busy lock leaves the old complete record intact');
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }

    // Legacy pairs are never treated as a coherent response; a new-format write recovers normally.
    $legacyKey = hash('sha256', 'legacy-pair');
    test_fixture_file($dir . '/' . $legacyKey . '.body', 'legacy body', $now);
    test_fixture_file($dir . '/' . $legacyKey . '.json', json_encode([
        'fetched_at' => $now, 'status' => 200, 'content_type' => 'application/json',
    ]), $now);
    $legacyPaths = mymeteo_cache_paths($dir, $legacyKey);
    test_same(null, mymeteo_read_cached_response($legacyPaths, 1800, true, $now), 'Unverifiable old metadata/body pairs are not served');
    test_check(mymeteo_write_cached_response($legacyPaths, test_response(6), $now), 'Legacy key can publish a coherent new-format response');
    test_coherent_response(mymeteo_read_cached_response($legacyPaths, 240, false, $now), 'New record beside legacy pair');

    // A configured cache directory may be an intentional symlink; reserved inner paths may not.
    $aliasDir = test_temp_dir('configured-symlink');
    $testDirs[] = $aliasDir;
    $configuredAlias = $aliasDir . '/cache';
    test_check(symlink($dir, $configuredAlias), 'Create intentional configured cache directory alias');
    $aliasPaths = mymeteo_cache_paths($configuredAlias, hash('sha256', 'configured-alias'));
    test_check(mymeteo_write_cached_response($aliasPaths, test_response(8), $now), 'Configured cache directory symlink still supports atomic publication');
    test_coherent_response(mymeteo_read_cached_response($aliasPaths, 240, false, $now), 'Read from configured cache alias');
    $externalMarker = $aliasDir . '/external-marker';
    test_fixture_file($externalMarker, 'must stay untouched');
    test_check(rename($lockPath, $savedLock), 'Preserve lock before symbolic-link fixture');
    test_check(symlink($externalMarker, $lockPath), 'Create reserved lock symbolic link');
    try {
        test_same(false, mymeteo_write_cached_response($paths, test_response(9), $now), 'Writer refuses reserved lock symlink');
        mymeteo_cleanup_cache($dir, $now, 20, 0.5);
        test_same('must stay untouched', file_get_contents($externalMarker), 'Writer and cleanup never follow reserved lock symlink');
    } finally {
        unlink($lockPath);
        rename($savedLock, $lockPath);
    }
    $namespaceDir = test_temp_dir('namespace-symlink');
    $testDirs[] = $namespaceDir;
    $externalNamespace = test_temp_dir('external-namespace');
    $testDirs[] = $externalNamespace;
    $namespaceKey = hash('sha256', 'namespace-alias');
    $namespaceHeader = $header;
    $namespaceHeader['fetched_at'] = $now;
    $externalRecord = $externalNamespace . '/' . (intdiv($now, 3600) * 3600) . '/' . $namespaceKey . '.cache';
    test_fixture_file($externalRecord, json_encode($namespaceHeader) . "\n" . $body);
    test_check(symlink($externalNamespace, $namespaceDir . '/v2'), 'Create reserved namespace symbolic link');
    $namespacePaths = mymeteo_cache_paths($namespaceDir, $namespaceKey);
    test_same(false, mymeteo_write_cached_response($namespacePaths, test_response(10), $now), 'Writer refuses reserved namespace symlink');
    test_same(null, mymeteo_read_cached_response($namespacePaths, 240, false, $now), 'Reader refuses reserved namespace symlink');
    mymeteo_cleanup_cache($namespaceDir, $now, 20, 0.5);
    test_check(is_file($externalRecord), 'Cleanup does not follow reserved namespace symlink');

    $pruneDir = test_temp_dir('cleanup');
    $testDirs[] = $pruneDir;
    $bucket = intdiv($now, 3600) * 3600;
    $pruneNow = $bucket + 900;
    $cutoff = $pruneNow - 1800;
    $expiredBucket = $bucket - 3 * 3600;
    $oldPaths = [];
    for ($index = 0; $index < 12; $index++) {
        $oldPaths[] = $pruneDir . '/v2/' . $expiredBucket . '/' . hash('sha256', 'expired-' . $index) . '.cache';
        test_fixture_file($oldPaths[count($oldPaths) - 1], 'expired record', $now);
        foreach (['body', 'json'] as $extension) {
            $oldPaths[] = $pruneDir . '/' . hash('sha256', 'legacy-' . $index) . '.' . $extension;
            test_fixture_file($oldPaths[count($oldPaths) - 1], 'expired legacy', $cutoff - 1);
        }
    }
    $temporary = $pruneDir . '/v2/' . $expiredBucket . '/mymeteo-Ab12Cd';
    test_fixture_file($temporary, 'abandoned temporary bytes', $now);
    $protected = [
        $pruneDir . '/notes.txt',
        $pruneDir . '/not-a-cache.json',
        $pruneDir . '/v2/' . $expiredBucket . '/keep.txt',
        $pruneDir . '/v2/' . $bucket . '/' . hash('sha256', 'current-bucket') . '.cache',
        $pruneDir . '/v2/' . ($bucket - 3600) . '/' . hash('sha256', 'previous-bucket') . '.cache',
        $pruneDir . '/' . hash('sha256', 'recent-legacy') . '.body',
        $pruneDir . '/' . hash('sha256', 'boundary-legacy') . '.json',
    ];
    foreach ($protected as $path) {
        test_fixture_file($path, 'protected', strpos($path, 'boundary') !== false ? $cutoff : $now);
    }
    // Explicitly exercise the exact mtime cutoff; the cache key intentionally hides its name.
    touch($pruneDir . '/' . hash('sha256', 'boundary-legacy') . '.json', $cutoff);
    $outside = test_temp_dir('outside');
    $testDirs[] = $outside;
    $outsideFile = $outside . '/untouched';
    test_fixture_file($outsideFile, 'outside target', $cutoff - 20);
    $link = $pruneDir . '/v2/' . $expiredBucket . '/' . hash('sha256', 'symlink') . '.cache';
    test_check(symlink($outsideFile, $link), 'Create synthetic cache symlink');
    $before = test_count_cache_files($pruneDir);
    mymeteo_cleanup_cache($pruneDir, $pruneNow, 4, 0.5);
    $after = test_count_cache_files($pruneDir);
    test_check($before - $after > 0 && $before - $after <= 4, 'Cleanup makes progress within its file budget');
    mymeteo_cleanup_cache($pruneDir, $pruneNow + 59, 100, 0.5);
    test_same($after, test_count_cache_files($pruneDir), 'Cleanup cadence avoids repeated work on every request');
    foreach ($protected as $path) {
        test_check(is_file($path), 'Cleanup protects recent, boundary, current and unrelated files');
    }
    test_check(is_link($link), 'Cleanup skips symbolic links');
    test_same('outside target', file_get_contents($outsideFile), 'Cleanup never follows a symlink to its target');
    test_check(is_file($pruneDir . '/.mymeteo-cache.lock'), 'Coordination lock remains stable');
    mymeteo_cleanup_cache($pruneDir, $pruneNow + 60, 100, 0.5);
    foreach ($oldPaths as $path) {
        test_check(!file_exists($path), 'Later cleanup retires the old entry backlog');
    }
    test_check(!file_exists($temporary), 'Expired abandoned temporary file is pruned');
    test_check(is_file($pruneDir . '/v2/' . $expiredBucket . '/keep.txt'), 'Unknown files keep their directory intact');

    // A bucket exactly beyond all possible thirty-minute records can be pruned.
    $boundaryDir = test_temp_dir('bucket-boundary');
    $testDirs[] = $boundaryDir;
    $boundaryNow = $bucket + 1800;
    $oldBucketFile = $boundaryDir . '/v2/' . ($bucket - 3600) . '/' . hash('sha256', 'last-expired-bucket') . '.cache';
    $newBucketFile = $boundaryDir . '/v2/' . $bucket . '/' . hash('sha256', 'first-protected-bucket') . '.cache';
    test_fixture_file($oldBucketFile, 'old bucket');
    test_fixture_file($newBucketFile, 'current bucket');
    mymeteo_cleanup_cache($boundaryDir, $boundaryNow, 20, 0.5);
    test_check(!file_exists($oldBucketFile), 'Wholly expired bucket is removed at its exact age boundary');
    test_check(file_exists($newBucketFile), 'Bucket containing an age1800 record remains protected');
    test_check(!is_dir(dirname($oldBucketFile)), 'Empty expired bucket is removed');

    // Real simultaneous PHP processes exercise open-inode reads, atomic publication and pruning.
    $concurrentDir = test_temp_dir('concurrency');
    $testDirs[] = $concurrentDir;
    $concurrentKey = hash('sha256', 'shared-record');
    $concurrentPaths = mymeteo_cache_paths($concurrentDir, $concurrentKey);
    test_check(mymeteo_write_cached_response($concurrentPaths, test_response(0), $now), 'Seed complete concurrent cache entry');
    for ($index = 0; $index < 20; $index++) {
        test_fixture_file($concurrentDir . '/v2/' . $expiredBucket . '/' . hash('sha256', 'concurrent-old-' . $index) . '.cache', 'expired');
    }
    $barrier = $concurrentDir . '/start-workers';
    $modes = ['writer-a', 'writer-b', 'reader', 'cleanup'];
    foreach ($modes as $mode) {
        $workers[] = test_start_worker([$mode, $concurrentDir, $concurrentKey, (string) $now, $barrier], $concurrentDir);
    }
    $readyDeadline = microtime(true) + 10;
    do {
        $readyCount = count(glob($barrier . '.*.ready') ?: []);
        test_check(microtime(true) < $readyDeadline, 'Concurrent workers became ready');
        usleep(1000);
    } while ($readyCount !== count($modes));
    test_fixture_file($barrier, 'go');
    test_wait_workers($workers);
    $successfulWrites = 0;
    foreach ($workers as $worker) {
        $result = json_decode((string) file_get_contents($worker['stdout']), true);
        test_check(is_array($result), 'Worker returned its completion result');
        $successfulWrites += $result['writes'];
    }
    $workers = [];
    test_check($successfulWrites > 0, 'Concurrent publication made successful progress');
    test_coherent_response(mymeteo_read_cached_response($concurrentPaths, 240, false, $now), 'Final concurrent record');
    $oldRemaining = count(glob($concurrentDir . '/v2/' . $expiredBucket . '/*.cache') ?: []);
    test_check($oldRemaining < 20, 'Cleanup ran alongside reader and writer processes');
    test_same([], glob($concurrentDir . '/v2/*/mymeteo-*') ?: [], 'Completed writes leave no temporary entries');

    echo "MyMeteo KNMI cache age, corruption, publication, cleanup and concurrency checks passed.\n";
} catch (Throwable $error) {
    fwrite(STDERR, 'KNMI cache test failed: ' . $error->getMessage() . "\n");
    $testExitCode = 1;
} finally {
    foreach ($workers as $worker) {
        if (is_resource($worker['process'])) {
            @proc_terminate($worker['process']);
            @proc_close($worker['process']);
        }
    }
    foreach (array_reverse($testDirs) as $testDir) {
        test_remove_tree($testDir);
    }
}
exit($testExitCode ?? 0);
