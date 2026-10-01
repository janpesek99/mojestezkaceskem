const assert = require('node:assert/strict');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const { spawn } = require('node:child_process');

async function main() {
  const probe = net.createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const server = spawn('powershell.exe', [
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, '..', 'serve-local.ps1'), '-Port', String(port),
  ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = new Promise((resolve) => server.once('exit', resolve));
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Local server did not start')), 10000);
      server.once('error', (error) => { clearTimeout(timeout); reject(error); });
      server.stdout.on('data', (chunk) => {
        if (chunk.toString().includes('http://127.0.0.1:')) { clearTimeout(timeout); resolve(); }
      });
    });
    const request = (target, method = 'GET') => new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, path: target, method, timeout: 5000 }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
      });
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('Request timed out')));
      req.end();
    });
    const root = await request('/');
    assert.equal(root.status, 200);
    assert.match(root.body, /id="journalForm"/);
    assert.equal(root.headers['cache-control'], 'no-store');
    assert.equal(root.headers['x-content-type-options'], 'nosniff');
    const js = await request('/app.js?version=test');
    assert.equal(js.status, 200);
    assert.match(js.headers['content-type'], /javascript/);
    assert.equal((await request('/app.js', 'HEAD')).body, '');
    assert.equal((await request('/supabase/schema.sql')).status, 404);
    assert.equal((await request('/../.gitignore')).status, 404);
    const post = await request('/index.html', 'POST');
    assert.equal(post.status, 405);
    assert.equal(post.headers.allow, 'GET, HEAD');
    const malformed = await new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: '127.0.0.1', port }, () => socket.write('GET\r\n\r\n'));
      let data = '';
      socket.on('data', (chunk) => { data += chunk; });
      socket.on('end', () => resolve(data));
      socket.on('error', reject);
      socket.setTimeout(5000, () => socket.destroy(new Error('Malformed request timed out')));
    });
    assert.match(malformed, /^HTTP\/1\.1 400 Bad Request/);
    console.log('PASS: local server GET/HEAD, query strings, MIME, cache headers, file whitelist, POST 405, malformed 400');
  } finally {
    server.kill();
    await exited;
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
