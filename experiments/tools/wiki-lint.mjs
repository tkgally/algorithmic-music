#!/usr/bin/env node
/* wiki-lint.mjs — health checks for wiki/ per wiki/conventions.md.
   Usage: node experiments/tools/wiki-lint.mjs [--index]
     default : report problems (broken links, bad frontmatter, orphans, missing sections)
     --index : emit a TSV of filename<TAB>status<TAB>tags<TAB>summary for building index.md */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const WIKI = join(process.cwd(), 'wiki');
const SPECIAL = new Set(['index.md', 'log.md', 'llm-wiki.md']); // exempt from content-page rules
const REQUIRED_KEYS = ['title', 'tags', 'status', 'created', 'updated', 'summary'];
const STATUSES = new Set(['stub', 'draft', 'reviewed']);

const mdFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? mdFiles(join(dir, e.name)).map((f) => join(e.name, f))
    : e.name.endsWith('.md') ? [e.name] : []);

const pages = mdFiles(WIKI);
const pageSet = new Set(pages);
const problems = [];
const inbound = new Map(pages.map((p) => [p, 0]));
const rows = [];

for (const rel of pages) {
  const raw = readFileSync(join(WIKI, rel), 'utf8');
  // ignore links inside fenced code blocks and inline code spans (examples, not links)
  const text = raw.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  const isSpecial = SPECIAL.has(rel);

  // frontmatter
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = {};
  if (fm) {
    for (const line of fm[1].split('\n')) {
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m) meta[m[1]] = m[2];
    }
  }
  if (!isSpecial) {
    if (!fm) problems.push(`${rel}: missing frontmatter`);
    else {
      for (const k of REQUIRED_KEYS) if (!(k in meta)) problems.push(`${rel}: frontmatter missing "${k}"`);
      if (meta.status && !STATUSES.has(meta.status)) problems.push(`${rel}: bad status "${meta.status}"`);
    }
    // required sections (content pages only, not project/meta-tagged pure-process pages)
    if (!/^## Related pages/m.test(text)) problems.push(`${rel}: no "## Related pages" section`);
    if (!/^## Implications for generative engines/m.test(text) && !/tags:.*(project|meta)/.test(fm?.[1] ?? ''))
      problems.push(`${rel}: no "## Implications for generative engines" section`);
  }
  rows.push([rel, meta.status ?? '-', (meta.tags ?? '').replace(/[\[\]]/g, ''), meta.summary ?? '']);

  // local links
  for (const m of text.matchAll(/\]\(([^)#\s]+\.md)(#[^)]*)?\)/g)) {
    const target = m[1];
    if (/^https?:/.test(target)) continue;
    // resolve relative to the linking file's directory within wiki/
    const base = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/') + 1) : '';
    const resolved = target.startsWith('../') ? target.slice(3) : base + target;
    const norm = resolved.replace(/^\.\//, '');
    if (!pageSet.has(norm)) problems.push(`${rel}: broken link -> ${target}`);
    else inbound.set(norm, inbound.get(norm) + 1);
  }
}

if (process.argv.includes('--index')) {
  for (const r of rows.sort((a, b) => a[0].localeCompare(b[0]))) console.log(r.join('\t'));
  process.exit(0);
}

for (const [p, n] of inbound) {
  if (n === 0 && !SPECIAL.has(p) && p !== 'conventions.md') problems.push(`${p}: orphan (no inbound links)`);
}

if (problems.length) {
  console.log(problems.sort().join('\n'));
  console.log(`\n${problems.length} problem(s) across ${pages.length} pages.`);
  process.exit(1);
} else {
  console.log(`OK: ${pages.length} pages, no problems.`);
}
