import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';

// Resolve the actual CLI dependency tree; do not add parallel test-only versions.
const require = createRequire(import.meta.url);
const cli = createRequire(require.resolve('@angular/cli/package.json'));
const pacote = cli('pacote');
const fromPacote = createRequire(cli.resolve('pacote'));
const PackageJson = fromPacote('@npmcli/package-json');
const cacache = fromPacote('cacache');
const sigstore = createRequire(fromPacote.resolve('sigstore'));
const tuf = createRequire(sigstore.resolve('@sigstore/tuf'));
const models = createRequire(tuf.resolve('tuf-js'))('@tufjs/models');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../tmp/dependency-checks');

async function withFixture(run) {
  await mkdir(root, { recursive: true });
  const folder = await mkdtemp(join(root, 'case-'));
  try {
    await run(folder);
  } finally {
    // Only remove this test's freshly-created workspace child.
    assert.equal(dirname(resolve(folder)), root);
    await rm(folder, { recursive: true, force: true });
  }
}

test('CLI package normalization discovers executable files with patched glob', async () => {
  await withFixture(async (folder) => {
    await mkdir(join(folder, 'bin'));
    await writeFile(join(folder, 'bin/demo.js'), '#!/usr/bin/env node\n');
    await writeFile(
      join(folder, 'package.json'),
      JSON.stringify({ name: 'demo-fixture', version: '1.0.0', directories: { bin: 'bin' } }),
    );
    const pkg = await PackageJson.normalize(folder);
    assert.equal(pkg.content.bin['demo.js'], 'bin/demo.js');
  });
});

test('CLI pacote packs and extracts local files respecting npmignore patterns', async () => {
  await withFixture(async (folder) => {
    const source = join(folder, 'source'),
      output = join(folder, 'output');
    await mkdir(join(source, 'lib'), { recursive: true });
    await writeFile(
      join(source, 'package.json'),
      JSON.stringify({ name: 'demo-fixture', version: '1.0.0' }),
    );
    await writeFile(join(source, 'lib/keep.js'), 'export const value = 1;');
    await writeFile(join(source, 'lib/excluded.test.js'), 'fictional test file');
    await writeFile(join(source, '.npmignore'), '**/*.test.js\n');
    const archive = join(folder, 'fixture.tgz');
    const options = {
      cache: join(folder, 'cache'),
      ignoreScripts: true,
      offline: true,
      tree: {
        path: source,
        package: { name: 'demo-fixture', version: '1.0.0' },
        isProjectRoot: true,
        edgesOut: new Map(),
      },
    };
    await pacote.tarball.file(`file:${source}`, archive, options);
    await pacote.extract(`file:${archive}`, output, options);
    assert.equal(await readFile(join(output, 'lib/keep.js'), 'utf8'), 'export const value = 1;');
    await assert.rejects(readFile(join(output, 'lib/excluded.test.js')), { code: 'ENOENT' });
  });
});

test('CLI cache verification and cleanup work with patched glob', async () => {
  await withFixture(async (folder) => {
    const cache = join(folder, 'cache');
    await cacache.put(cache, 'demo-key', 'fictional content');
    const result = await cacache.verify(cache);
    assert.equal(result.verifiedContent, 1);
    assert.equal((await cacache.get(cache, 'demo-key')).data.toString(), 'fictional content');
    await cacache.rm.all(cache);
    await assert.rejects(cacache.get(cache, 'demo-key'), { code: 'ENOENT' });
  });
});

test('TUF delegation matching preserves allowed paths and rejects other paths', () => {
  const targets = models.Targets.fromJSON({
    _type: 'targets',
    spec_version: '1.0.0',
    version: 1,
    expires: '2030-01-01T00:00:00Z',
    targets: {},
    delegations: {
      keys: {},
      roles: [
        {
          name: 'demo',
          keyids: ['fictional-key'],
          threshold: 1,
          terminating: false,
          paths: ['packages/*.json'],
        },
      ],
    },
  });
  const role = targets.delegations.roles.demo;
  assert.equal(role.isDelegatedPath('packages/allowed.json'), true);
  assert.equal(role.isDelegatedPath('elsewhere/allowed.json'), false);
  assert.equal(role.isDelegatedPath('packages/nested/allowed.json'), false);
  assert.equal(role.isDelegatedPath('packages/other.txt'), false);
});
