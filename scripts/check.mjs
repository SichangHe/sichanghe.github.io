import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, symlinkSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const root = mkdtempSync(join(tmpdir(), 'homepage-check-'));
const external = mkdtempSync(join(tmpdir(), 'homepage-external-'));
const scripts = resolve(import.meta.dirname);
const timestamp = '2024-02-03T04:05:06+00:00';
function run(command, args, options = {}) {
    const result = spawnSync(command, args, {cwd: root, encoding: 'utf8', ...options});
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
}
try {
    mkdirSync(join(root, 'src'));
    mkdirSync(join(root, '_site/html'), {recursive: true});
    mkdirSync(join(root, '_site/sitemap'));
    run('git', ['init', '-q']);
    writeFileSync(join(root, 'src/page.md'), '# A\n\n- original list\n');
    writeFileSync(join(external, 'page.md'), '# External\n');
    symlinkSync(join(external, 'page.md'), join(root, 'src/external.md'));
    run('git', ['add', '.']);
    run('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.org', 'commit', '-qm', 'source'],
        {env: {...process.env, GIT_AUTHOR_DATE: timestamp, GIT_COMMITTER_DATE: timestamp}});
    writeFileSync(join(root, 'src/untracked.md'), '# Untracked\n');
    symlinkSync('page.md', join(root, 'src/link.md'));
    const chapter = (source_path, path = source_path) => ({Chapter: {name: 'A', content: '# A\n\n- original list\n', path, source_path, sub_items: []}});
    const book = {items: [chapter('page.md'), chapter('link.md'), chapter('untracked.md'), chapter(null), chapter('external.md')]};
    const config = {book: {}, preprocessor: {'page-meta': {footers: [{regex: '^page', padding: '\nfooter\n'}]}}, output: {sitemap: {'base-url': 'https://example.org/'}}};
    const processed = JSON.parse(run(process.env.LUA || 'lua', [join(scripts, 'page-meta.lua')], {input: JSON.stringify([{root, config}, book])}));
    assert.ok(processed.items[0].Chapter.content.includes(`datetime="${timestamp}"`));
    assert.ok(processed.items[0].Chapter.content.includes('footer'));
    assert.ok(processed.items[0].Chapter.content.includes('- original list'));
    assert.ok(processed.items[1].Chapter.content.includes(`datetime="${timestamp}"`));
    assert.ok(!processed.items[2].Chapter.content.includes('Last edited'));
    assert.ok(Array.isArray(processed.items[3].Chapter.sub_items));
    assert.ok(processed.items[4].Chapter.content.includes(`datetime="${timestamp}"`));
    run(process.env.LUA || 'lua', [join(scripts, 'sitemap.lua')], {input: JSON.stringify({root, config, book, destination: join(root, '_site/sitemap')})});
    const sitemap = readFileSync(join(root, '_site/html/sitemap.xml'), 'utf8');
    assert.ok(sitemap.includes(`<loc>https://example.org/page.html</loc><lastmod>${timestamp}</lastmod>`));
    assert.ok(sitemap.includes('<loc>https://example.org/untracked.html</loc></url>'));
    assert.ok(!sitemap.includes('null.html'));
} finally {
    rmSync(root, {recursive: true, force: true});
    rmSync(external, {recursive: true, force: true});
}
