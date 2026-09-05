import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const php = process.env.MYMETEO_PHP_BINARY || "php";
try {
  await exec(php, ["-r", "if (!extension_loaded('curl')) { fwrite(STDERR, 'PHP cURL extension is required.'); exit(1); }"], { timeout: 10000 });
} catch (error) {
  throw new Error("Proxy tests require PHP CLI with cURL. Put php on PATH or set MYMETEO_PHP_BINARY to its executable path.", { cause: error });
}
await exec(php, ["-l", path.join(projectRoot, "api/knmi-wms.php")]);
const cacheTests = await exec(php, [path.join(projectRoot, "tools/test-knmi-cache.php")], { timeout: 60000 });
process.stdout.write(cacheTests.stdout);

// Copy only the public proxy into an isolated webroot. The production endpoint
// stays fixed to KNMI; only this disposable fixture points at a loopback server.
const fixtureRoot = await mkdtemp(path.join(tmpdir(), "mymeteo-knmi-proxy-"));
const webroot = path.join(fixtureRoot, "public");
const cacheDir = path.join(fixtureRoot, "cache");
let proxy;
let proxyExited;
let proxyLog = "";
let upstream;
let upstreamMode = "ok";
let upstreamCount = 0;
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255, 0, 65]);
const bodies = { GetMap: png, GetFeatureInfo: Buffer.from('{"data":{"run":{"time":0}}}'), GetCapabilities: Buffer.from("<?xml version=\"1.0\"?><WMS_Capabilities/>") };
const contentTypes = { GetMap: "image/png", GetFeatureInfo: "application/json", GetCapabilities: "application/xml" };
const baseQuery = {
  dataset: "radar_forecast_2.0", service: "WMS", version: "1.3.0", request: "GetMap",
  layers: "precipitation_nowcast", crs: "EPSG:3857", bbox: "0,6106855,1000000,7658602",
  width: "700", height: "700", format: "image/png", transparent: "true", styles: "radar/nearest",
  time: "2026-09-05T12:00:00Z", reference_time: "2026-09-05T11:55:00Z",
};
const queries = {
  GetMap: baseQuery,
  GetCapabilities: { dataset: baseQuery.dataset, service: "WMS", request: "GetCapabilities" },
  GetFeatureInfo: { ...baseQuery, request: "GetFeatureInfo", crs: "EPSG:4326", bbox: "52.3,4.8,52.4,4.9", width: "101", height: "101", i: "50", j: "50", query_layers: baseQuery.layers, info_format: "application/json" },
};

async function choosePort() {
  const server = createNetServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

try {
  await mkdir(webroot);
  upstream = createServer((request, response) => {
    upstreamCount += 1;
    if (request.headers.authorization !== "synthetic-test-only-key") {
      response.writeHead(401); response.end(); return;
    }
    if (upstreamMode === "disconnect") { request.socket.destroy(); return; }
    if (upstreamMode === "slow-disconnect") { setTimeout(() => request.socket.destroy(), 2100); return; }
    const kind = new URL(request.url, "http://localhost").searchParams.get("request");
    if (upstreamMode === "http-error") { response.writeHead(503, { "Content-Type": "application/json" }); response.end('{"error":"Synthetic KNMI outage"}'); return; }
    if (upstreamMode === "wrong-content") { response.writeHead(200, { "Content-Type": "text/html" }); response.end("Synthetic upstream error page"); return; }
    response.writeHead(200, { "Content-Type": contentTypes[kind] }); response.end(bodies[kind]);
  });
  await new Promise((resolve, reject) => { upstream.once("error", reject); upstream.listen(0, "127.0.0.1", resolve); });
  const upstreamUrl = `http://127.0.0.1:${upstream.address().port}/wms`;
  const source = await readFile(path.join(projectRoot, "api/knmi-wms.php"), "utf8");
  const fixedEndpoint = "https://api.dataplatform.knmi.nl/wms/adaguc-server";
  assert.equal(source.split(fixedEndpoint).length, 2, "production has exactly one fixed upstream endpoint");
  await writeFile(path.join(webroot, "knmi-wms.php"), source.replace(fixedEndpoint, upstreamUrl));
  const mainStart = source.indexOf("\nif (($_SERVER['REQUEST_METHOD']");
  const functionsStart = source.indexOf("\nfunction mymeteo_load_config()");
  assert.ok(mainStart > 0 && functionsStart > mainStart, "fixture extracts helpers without running the request or reading configuration");
  await writeFile(path.join(fixtureRoot, "helpers.php"), source.slice(0, mainStart) + source.slice(functionsStart));
  await writeFile(path.join(fixtureRoot, "seed.php"), `<?php
require __DIR__ . '/helpers.php';
$input = json_decode(file_get_contents('php://stdin'), true);
$request = mymeteo_build_wms_request($input['query']);
$paths = mymeteo_cache_paths(__DIR__ . '/cache', $request['cache_key']);
$response = ['status' => 200, 'content_type' => $input['content_type'], 'body' => base64_decode($input['body'])];
if (!mymeteo_write_cached_response($paths, $response, time() - $input['age'])) { exit(1); }
`);
  await writeFile(path.join(fixtureRoot, "config.php"), "<?php return ['knmi_wms_api_key' => 'synthetic-test-only-key', 'cache_dir' => __DIR__ . '/cache'];\n");
  const port = await choosePort();
  proxy = spawn(php, ["-d", "display_errors=0", "-d", "log_errors=1", "-S", `127.0.0.1:${port}`, "-t", webroot], {
    env: { ...process.env, MYMETEO_KNMI_CONFIG: path.join(fixtureRoot, "config.php") }, stdio: ["ignore", "pipe", "pipe"],
  });
  proxyExited = new Promise(resolve => { proxy.once("error", error => { proxyLog += error.message; resolve(); }); proxy.once("exit", resolve); });
  proxy.stdout.on("data", data => { proxyLog += data; });
  proxy.stderr.on("data", data => { proxyLog += data; });
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { await fetch(origin, { signal: AbortSignal.timeout(1000) }); ready = true; break; }
    catch { if (proxy.exitCode !== null) break; await new Promise(resolve => setTimeout(resolve, 25)); }
  }
  assert.ok(ready, `temporary PHP server started: ${proxyLog}`);

  async function request(query = baseQuery, method = "GET") {
    const response = await fetch(`${origin}/knmi-wms.php?${new URLSearchParams(query)}`, { method, signal: AbortSignal.timeout(18000) });
    return { status: response.status, body: Buffer.from(await response.arrayBuffer()), headers: response.headers };
  }
  async function clearCache() {
    await rm(cacheDir, { recursive: true, force: true });
    await mkdir(cacheDir);
  }
  async function seed(kind, age) {
    const child = spawn(php, [path.join(fixtureRoot, "seed.php")], { stdio: ["pipe", "ignore", "pipe"] });
    let error = ""; child.stderr.on("data", data => { error += data; });
    const exited = new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", code => code === 0 ? resolve() : reject(new Error(`Seed failed: ${error}`))); });
    child.stdin.end(JSON.stringify({ query: queries[kind], age, content_type: contentTypes[kind], body: bodies[kind].toString("base64") }));
    await exited;
  }
  function assertSuccess(result, kind, state, minAge) {
    assert.equal(result.status, 200);
    assert.equal(result.headers.get("x-mymeteo-knmi-cache"), state);
    assert.equal(result.headers.get("x-mymeteo-knmi-proxy"), "1");
    assert.ok(result.headers.get("content-type").startsWith(contentTypes[kind]));
    assert.deepEqual(result.body, bodies[kind], "binary body remains unchanged");
    if (minAge !== undefined) assert.ok(Number(result.headers.get("age")) >= minAge && Number(result.headers.get("age")) <= 1800);
  }

  for (const kind of Object.keys(queries)) {
    await clearCache(); upstreamMode = "ok";
    assertSuccess(await request(queries[kind]), kind, "miss");
    const count = upstreamCount;
    assertSuccess(await request(queries[kind]), kind, "hit", 0);
    assert.equal(upstreamCount, count, "fresh cache avoids upstream request");
    await clearCache(); await seed(kind, 600);
    assertSuccess(await request(queries[kind]), kind, "refresh");
  }
  for (const failure of ["disconnect", "http-error", "wrong-content"]) {
    await clearCache(); await seed("GetMap", 600); upstreamMode = failure;
    assertSuccess(await request(), "GetMap", "stale", 600);
    await clearCache();
    const empty = await request(); assert.equal(empty.status, 502); assert.equal(empty.headers.get("cache-control"), "no-store");
    await seed("GetMap", 1801);
    assert.equal((await request()).status, 502, "expired fallback is never served");
  }
  await clearCache(); await seed("GetMap", 1799); upstreamMode = "slow-disconnect";
  assert.equal((await request()).status, 502, "a fallback that expires during the failed fetch must not be served");
  await clearCache(); await seed("GetMap", 600); upstreamMode = "disconnect";
  assertSuccess(await request(), "GetMap", "stale", 600);
  upstreamMode = "ok";
  assertSuccess(await request(), "GetMap", "refresh");
  assertSuccess(await request(), "GetMap", "hit", 0);

  // A cache publication failure must not hide a valid upstream response.
  await clearCache();
  await writeFile(path.join(cacheDir, "v2"), "Synthetic path obstruction");
  assertSuccess(await request(), "GetMap", "miss");
  await rm(cacheDir, { recursive: true, force: true });
  await writeFile(cacheDir, "Synthetic unavailable cache directory");
  assertSuccess(await request(), "GetMap", "miss");
  const beforeInvalid = upstreamCount;
  const invalid = await request({ ...baseQuery, layers: "unapproved-layer" });
  assert.equal(invalid.status, 400);
  assert.equal((await request(baseQuery, "POST")).status, 405);
  assert.equal(upstreamCount, beforeInvalid, "invalid requests never reach upstream");
  assert.ok(!invalid.body.toString().includes("synthetic-test-only-key"));
  console.log("MyMeteo KNMI HTTP proxy checks passed: all response types, cache hits, refresh, transport/HTTP/content failures, age limits, recovery and cache-write failure.");
} finally {
  if (proxy && proxy.exitCode === null) proxy.kill("SIGTERM");
  if (proxyExited) await proxyExited;
  if (upstream) await new Promise(resolve => { upstream.close(resolve); upstream.closeAllConnections(); });
  await rm(fixtureRoot, { recursive: true, force: true });
}
