import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('src/ui/index.html', 'utf8');
const js = fs.readFileSync('src/ui/app.js', 'utf8');
const css = fs.readFileSync('src/ui/cinematic.css', 'utf8');
const server = fs.readFileSync('src/server.ts', 'utf8');

const ids = new Set([...html.matchAll(/\\bid="([^"]+)"/g)].map((match) => match[1]));
const navLinks = [...html.matchAll(/<a\\b[^>]*href="#([^"]+)"[^>]*>/g)].map((match) => match[1]);
for (const target of navLinks) assert.ok(ids.has(target), `Navigation target #${target} must exist`);
for (const id of ['top', 'chat', 'tools', 'skills', 'economy', 'protocols']) assert.ok(ids.has(id), `Missing section id #${id}`);
for (const id of ['navToggle', 'primaryLinks', 'runtimeStatus', 'soundToggle', 'chatForm', 'prompt', 'mic', 'enterChat', 'skipIntro']) {
  assert.ok(ids.has(id), `Missing interactive UI element #${id}`);
  assert.ok(js.includes(`byId('${id}')`) || js.includes(`byId("${id}")`) || js.includes(`#${id}`), `Missing interaction wiring for #${id}`);
}
assert.ok(js.includes("fetch('/api/v1/cognition/route'"), 'Chat must call the existing cognition route');
assert.ok(js.includes("fetch('/api/v1/health'"), 'UI must check the health endpoint');
assert.ok(server.includes('app.get("/api/v1/health"'), 'The runtime health endpoint must exist');
assert.ok(css.includes('.nav-links.is-open'), 'Responsive menu open state must be styled');
assert.ok(css.includes('position:sticky;top:0;z-index:30'), 'Navbar must remain sticky without a later position override');
assert.ok(!html.includes('LATENCIA<br><b>12ms</b>'), 'UI must not publish an unverified fixed latency');
console.log('UI_NAVIGATION_SMOKE_OK');
