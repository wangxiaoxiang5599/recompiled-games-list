// Renders index.html, the GitHub Pages landing page for the list: counts by console, method and
// status, the newest projects, and how to download the data. The full list with filters lives on
// portedgames.com/recompiled-games.
const SITE = 'https://portedgames.com';
const LIST = `${SITE}/recompiled-games/`;
const RAW = 'https://raw.githubusercontent.com/wangxiaoxiang5599/recompiled-games-list/main/data';
const REPO = 'https://github.com/wangxiaoxiang5599/recompiled-games-list';
// Consoles that have their own page on the site; the rest link to the main list.
const consolePages = { 'Xbox 360': 'xbox-360', N64: 'n64', PS4: 'ps4', PS1: 'ps1', Xbox: 'xbox', PS3: 'ps3', GameCube: 'gamecube' };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${months[m - 1]} ${d}, ${y}`;
};

function bars(pairs, href) {
  const top = Math.max(...pairs.map(([, n]) => n));
  return pairs
    .map(([k, n]) => {
      const label = href?.(k) ? `<a href="${esc(href(k))}">${esc(k)}</a>` : esc(k);
      return `<div class="bar"><span>${label}</span><i><span style="width:${Math.round((n / top) * 100)}%"></span></i><span>${n}</span></div>`;
    })
    .join('\n');
}

export function renderPage(rows, updated) {
  const tally = (key) => {
    const m = new Map();
    for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  };
  const byConsole = tally('console');
  const byMethod = tally('method');
  const stages = ['Working', 'Beta', 'Early', 'Unconfirmed', 'Offline', 'Taken down'];
  const byStage = stages.map((s) => [s, rows.filter((r) => r.stage === s).length]).filter(([, n]) => n);
  const n = (s) => rows.filter((r) => r.stage === s).length;
  const win = rows.filter((r) => r.platforms.includes('Windows')).length;
  const linux = rows.filter((r) => r.platforms.includes('Linux')).length;
  const mac = rows.filter((r) => r.platforms.includes('macOS')).length;
  const newest = [...rows].sort((a, b) => b.added.localeCompare(a.added) || a.game.localeCompare(b.game)).slice(0, 10);
  const consoleHref = (c) => (consolePages[c] ? `${LIST}${consolePages[c]}/` : LIST);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Recompiled Games List: Open Data</title>
<meta name="description" content="Open list of ${rows.length} fan projects that turn console games into native PC programs (static recompilations, decompilations and game-specific runtimes), with status checked daily. JSON and CSV, CC BY 4.0.">
<style>
:root{--bg:#f7f6f2;--card:#fff;--ink:#1b1d22;--muted:#5d626d;--line:#e3e0d8;--accent:#1c7ed6;--bar:#c5dcf3}
@media (prefers-color-scheme:dark){:root{--bg:#0f1115;--card:#171a20;--ink:#e9eaee;--muted:#a0a5b0;--line:#2a2e37;--accent:#4dabf7;--bar:#1f3a55}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{max-width:860px;margin:0 auto;padding:40px 16px 64px}
a{color:var(--accent)}
h1{font-size:clamp(1.7rem,4vw,2.4rem);line-height:1.15;margin:0 0 12px}
h2{font-size:1.2rem;margin:40px 0 12px}
.lead{color:var(--muted);margin:0 0 24px;max-width:62ch}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.stat{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.stat b{display:block;font-size:1.6rem;line-height:1.2}
.stat span{color:var(--muted);font-size:.85rem}
.bars{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px}
.bar{display:grid;grid-template-columns:minmax(110px,190px) 1fr 3ch;gap:10px;align-items:center;padding:4px 0;font-size:.92rem}
.bar i{display:block;height:10px;border-radius:6px;background:var(--bar)}
.bar i span{display:block;height:100%;border-radius:6px;background:var(--accent)}
ul.latest{list-style:none;margin:0;padding:0;background:var(--card);border:1px solid var(--line);border-radius:12px}
ul.latest li{padding:12px 16px;border-top:1px solid var(--line)}
ul.latest li:first-child{border-top:0}
ul.latest small{display:block;color:var(--muted)}
pre{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 16px;overflow-x:auto;font-size:.85rem}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dl{display:flex;flex-wrap:wrap;gap:10px}
.dl a{display:inline-block;padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);text-decoration:none;color:var(--ink)}
footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:.85rem}
</style>
</head>
<body>
<div class="wrap">
<h1>Recompiled games: open data</h1>
<p class="lead">Fan projects that turn old console games into native PC programs instead of running them in an emulator: static recompilations, decompilations, game-specific runtimes and single-game emulator forks. This is the data behind the <a href="${LIST}">PortedGames recompiled games list</a>, where every project is listed with its status and what you need to run it. Re-checked daily; last update ${esc(fmt(updated))}.</p>

<div class="stats">
<div class="stat"><b>${rows.length}</b><span>projects across ${byConsole.length} platforms</span></div>
<div class="stat"><b>${n('Working')}</b><span>marked working, plus ${n('Beta')} in beta</span></div>
<div class="stat"><b>${esc(byConsole[0][0])}</b><span>most projects (${byConsole[0][1]})</span></div>
<div class="stat"><b>${win} / ${linux} / ${mac}</b><span>build for Windows / Linux / macOS</span></div>
</div>

<h2>By console</h2>
<div class="bars">
${bars(byConsole, consoleHref)}
</div>

<h2>By method</h2>
<div class="bars">
${bars(byMethod)}
</div>
<p>Static recompilation translates the console's machine code into C or C++ ahead of time (N64Recomp, XenonRecomp, ReXGlue). Decompilation rebuilds readable source that compiles back into the game. PS4 projects mostly run the game's own x86-64 code with a runtime written for that one game. How each method works: <a href="${SITE}/how-it-works/">how fan ports work</a>.</p>

<h2>By status</h2>
<div class="bars">
${bars(byStage)}
</div>

<h2>Newest projects</h2>
<ul class="latest">
${newest.map((r) => `<li><a href="${esc(r.entry ?? r.url)}">${esc(r.game)}</a><small>${esc(r.console)} · ${esc(r.project)} · ${esc(r.method)} · ${esc(r.stage)} · added ${esc(fmt(r.added))}</small></li>`).join('\n')}
</ul>
<p><a href="${LIST}">All ${rows.length} projects on PortedGames →</a></p>

<h2>Download</h2>
<div class="dl">
<a href="${RAW}/recompiled-games.json">recompiled-games.json</a>
<a href="${RAW}/recompiled-games.csv">recompiled-games.csv</a>
<a href="${REPO}">Repository on GitHub</a>
</div>

<h2>Use it</h2>
<pre><code>// JavaScript
const rows = await (await fetch('${RAW}/recompiled-games.json')).json();
const working = rows.filter((r) =&gt; r.stage === 'Working');</code></pre>
<pre><code># Python
import pandas as pd
df = pd.read_csv('${RAW}/recompiled-games.csv', parse_dates=['added', 'lastChecked'])
df.groupby(['console', 'method']).size()</code></pre>
<p>Each row has the game, the console, the project and its official repository, the method, the status, the PC platforms it builds for, a short note, the dates it was added and last checked, and sources. Field descriptions are in the <a href="${REPO}#fields">README</a>.</p>

<h2>Scope</h2>
<p>A project is listed when it produces a program that runs a console game natively on PC and has a public repository or official page. Every project needs files from your own copy of the game: none of them ship it, and no game files, ROMs or ISOs are hosted or linked here. Missing a project or a status is wrong? <a href="${REPO}/issues">Open an issue</a>.</p>

<footer>
Data: CC BY 4.0. Please credit <a href="${SITE}/">PortedGames</a>, a directory of fan and AI ports of classic games with their status checked daily, and link to <a href="${LIST}">${LIST}</a>. Related dataset: <a href="https://wangxiaoxiang5599.github.io/fan-port-takedowns/">fan and AI game port takedowns</a>.
</footer>
</div>
</body>
</html>
`;
}
