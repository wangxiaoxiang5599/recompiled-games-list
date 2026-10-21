#!/usr/bin/env node
// Pulls the recompiled games list from portedgames.com and writes data/recompiled-games.json,
// data/recompiled-games.csv, index.html (the GitHub Pages landing page) and the list in README.md.
// Run by .github/workflows/sync.yml once a day; safe to run by hand (SOURCE_FILE=path reads a local copy).
import { readFileSync, writeFileSync } from 'node:fs';
import { renderPage } from './page.mjs';

const SOURCE = 'https://portedgames.com/recompiled-games.json';
const SITE_LIST = 'https://portedgames.com/recompiled-games/';

let body;
if (process.env.SOURCE_FILE) body = JSON.parse(readFileSync(process.env.SOURCE_FILE, 'utf8'));
else {
  const res = await fetch(SOURCE, { headers: { 'user-agent': 'recompiled-games-list-sync (+https://github.com/wangxiaoxiang5599/recompiled-games-list)' } });
  if (!res.ok) throw new Error(`${SOURCE}: HTTP ${res.status}`);
  body = await res.json();
}
const { projects, updated } = body;
if (!Array.isArray(projects) || projects.length === 0) throw new Error(`${SOURCE}: no rows`);

export const consoles = ['Xbox 360', 'N64', 'PS4', 'PS1', 'PS2', 'PS3', 'Xbox', 'GameCube', 'Wii', 'Wii U', 'Switch', 'Other'];
const stageRank = { Working: 0, Beta: 1, Early: 2, Unconfirmed: 3, Offline: 4, 'Taken down': 5 };

// Stable output: by console (in the order above), then stage, then game.
const rows = projects
  .map((r) => ({
    id: r.id,
    game: r.game,
    console: r.console,
    project: r.project,
    url: r.url,
    method: r.method,
    stage: r.stage,
    platforms: r.platforms ?? [],
    note: r.note ?? '',
    added: r.added,
    lastChecked: r.lastChecked,
    entry: r.entry ?? null,
    sources: r.sources ?? [],
  }))
  .sort((a, b) => consoles.indexOf(a.console) - consoles.indexOf(b.console) || stageRank[a.stage] - stageRank[b.stage] || a.game.localeCompare(b.game) || a.id.localeCompare(b.id));

writeFileSync('data/recompiled-games.json', JSON.stringify(rows, null, 2) + '\n');
writeFileSync('index.html', renderPage(rows, updated));

const cols = ['id', 'game', 'console', 'project', 'url', 'method', 'stage', 'platforms', 'note', 'added', 'lastChecked', 'entry', 'sources'];
const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const val = (r, c) => (c === 'platforms' ? r.platforms.join(' ') : c === 'sources' ? r.sources.map((s) => s.url).join(' ') : r[c]);
writeFileSync('data/recompiled-games.csv', [cols.join(','), ...rows.map((r) => cols.map((c) => cell(val(r, c))).join(','))].join('\n') + '\n');

// README list between the markers: a summary, then one table per console.
const md = (s) => String(s).replace(/\|/g, '\\|');
const count = (f) => rows.filter(f).length;
const groups = consoles.map((c) => [c, rows.filter((r) => r.console === c)]).filter(([, l]) => l.length);
const stageIcon = { Working: '🟢 Working', Beta: '🟡 Beta', Early: '🟠 Early', Unconfirmed: '⚪ Unconfirmed', Offline: '⚫ Offline', 'Taken down': '🔴 Taken down' };
const anchor = (c) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const list = [
  `**${rows.length} projects** across ${groups.length} platforms, last checked ${updated}. ${count((r) => r.stage === 'Working')} working, ${count((r) => r.stage === 'Beta')} in beta, ${count((r) => r.stage === 'Early')} early. ${count((r) => r.method === 'Static recompilation')} are static recompilations, ${count((r) => r.method === 'Decompilation')} decompilations, ${count((r) => r.method === 'Game-specific runtime')} game-specific runtimes and ${count((r) => r.method === 'Emulator fork')} emulator forks.`,
  '',
  groups.map(([c, l]) => `[${c}](#${anchor(c)}) (${l.length})`).join(' · '),
  '',
  ...groups.flatMap(([c, l]) => [
    `### ${c}`,
    '',
    '| Game | Project | Method | Status | PC platforms | Notes |',
    '|---|---|---|---|---|---|',
    ...l.map((r) => `| ${r.entry ? `[${md(r.game)}](${r.entry})` : md(r.game)} | [${md(r.project)}](${r.url}) | ${r.method} | ${stageIcon[r.stage] ?? r.stage} | ${r.platforms.join(', ')} | ${md(r.note)} |`),
    '',
  ]),
  `Game names link to the project's page on PortedGames when it has one. Full list with filters and per-console pages: [portedgames.com/recompiled-games](${SITE_LIST}).`,
].join('\n');

const readme = readFileSync('README.md', 'utf8');
const start = '<!-- list:start -->';
const end = '<!-- list:end -->';
const i = readme.indexOf(start);
const j = readme.indexOf(end);
if (i < 0 || j < i) throw new Error('README.md is missing the list markers');
writeFileSync('README.md', `${readme.slice(0, i + start.length)}\n${list}\n${readme.slice(j)}`);

console.log(`${rows.length} rows, updated ${updated}`);
