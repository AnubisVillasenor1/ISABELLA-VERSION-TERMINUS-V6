import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('src/ui/index.html', 'utf8');
const js = fs.readFileSync('src/ui/app.js', 'utf8');
const css = fs.readFileSync('src/ui/cinematic.css', 'utf8');
const server = fs.readFileSync('src/server.ts', 'utf8');

const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const ids = new Set(allIds);
assert.equal(ids.size, allIds.length, 'Every HTML id must be unique to keep navigation and ARIA references deterministic');
const navLinks = [...html.matchAll(/<a\b[^>]*href="#([^"]+)"[^>]*>/g)].map((match) => match[1]);
for (const target of navLinks) assert.ok(ids.has(target), `Navigation target #${target} must exist`);
for (const id of ['top', 'chat', 'tools', 'skills', 'economy', 'protocols']) assert.ok(ids.has(id), `Missing section id #${id}`);
for (const id of ['navToggle', 'primaryLinks', 'runtimeStatus', 'soundToggle', 'chatForm', 'prompt', 'mic', 'enterChat', 'skipIntro']) {
  assert.ok(ids.has(id), `Missing interactive UI element #${id}`);
  assert.ok(js.includes(`byId('${id}')`) || js.includes(`byId("${id}")`) || js.includes(`#${id}`), `Missing interaction wiring for #${id}`);
}
assert.ok(js.includes("fetch('/api/v1/cognition/route'"), 'Chat must call the existing cognition route');
assert.ok(js.includes("fetch('/api/v1/health'"), 'UI must check the health endpoint');
assert.ok(server.includes('app.get("/api/v1/health"'), 'The runtime health endpoint must exist');
assert.ok(server.includes('res.type("html").send(cinematicHtml)'), 'The root UI must use the startup-cached HTML asset');
assert.ok(server.includes('res.type("css").send(cinematicCss)'), 'The stylesheet route must use the startup-cached CSS asset');
assert.ok(css.includes('.nav-links.is-open'), 'Responsive menu open state must be styled');
assert.ok(!css.includes('hebbkx1anhila5yf'), 'Enterprise UI must not depend on the unowned external intro background asset');
assert.ok(css.includes('.message-copy'), 'Assistant replies must expose the copy affordance styling');
assert.ok(js.includes("!cinematicRequested"), 'The default workspace must not force a lengthy cinematic intro before interaction');
assert.ok(css.includes('position:sticky;top:0;z-index:30'), 'Navbar must remain sticky without a later position override');
assert.ok(!html.includes('LATENCIA<br><b>12ms</b>'), 'UI must not publish an unverified fixed latency');
console.log('UI_NAVIGATION_SMOKE_OK');

assert.equal((html.match(/class="intro-scene(?: is-active)?"/g) || []).length, 12, 'Cinematic intro must contain exactly 12 scenes');
assert.ok(html.includes('class="intro-world"'), 'Intro must include the 3D Genesis world');
assert.ok(html.includes('intro-enter'), 'Final intro scene must provide a direct entrance to chat');
assert.ok(js.includes('INTRO_SCENE_MS = 4_200'), 'Intro timing must be scene-based and bounded');
assert.ok(js.includes("intro.dataset.scene = String(sceneIndex)"), 'Scene changes must drive camera angles');
assert.ok(css.includes('.cinematic-intro[data-scene="11"] .intro-world'), 'Every scene camera pose must be defined through scene 12');
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'), 'Cinematic effects must respect reduced motion');
console.log('CINEMATIC_INTRO_12_SCENES_OK');
