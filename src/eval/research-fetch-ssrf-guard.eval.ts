import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  assertPublicResearchDestination,
  nextPublicResearchUrl,
} from '@/lib/research/public-destination';
import { httpUrl } from '@/lib/safe-url';

const REPO_ROOT = process.cwd();
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

const BLOCKED: string[] = [
  'http://localhost/',
  'http://localhost:8080/admin',
  'https://app.localhost/path',
  'http://127.0.0.1/',
  'http://127.0.0.1:3000/',
  'http://[::1]/',
  'http://[::1]:8080/',
  'http://10.0.0.1/',
  'http://10.255.255.254/x',
  'http://172.16.0.1/',
  'http://172.31.255.1/',
  'http://192.168.1.1/',
  'http://192.168.0.50/',
  'http://169.254.1.1/',
  'http://169.254.169.254/latest/meta-data/',
  'http://metadata.google.internal/',
  'http://metadata.google.internal/computeMetadata/v1/',
  'http://[fe80::1]/',
  'http://[fc00::1]/',
  'http://[fd12:3456:789a::1]/',
  'http://[::ffff:127.0.0.1]/',
  'http://[::ffff:10.1.2.3]/',
  'http://0.0.0.0/',
];

const ALLOWED: string[] = [
  'https://example.com/',
  'https://acme.test/careers',
  'http://93.184.216.34/',
  'https://company.io/about',
];

describe('httpUrl stays protocol-only for UI', () => {
  it('still accepts loopback and private hosts for rendering', () => {
    assert.equal(httpUrl('http://127.0.0.1/'), 'http://127.0.0.1/');
    assert.equal(httpUrl('http://192.168.1.1/'), 'http://192.168.1.1/');
    assert.equal(httpUrl('http://localhost/'), 'http://localhost/');
  });
});

describe('assertPublicResearchDestination', () => {
  for (const url of BLOCKED) {
    it(`blocks ${url}`, () => {
      assert.throws(
        () => assertPublicResearchDestination(url),
        /blocked|must be http|not a valid/i,
      );
    });
  }

  for (const url of ALLOWED) {
    it(`allows ${url}`, () => {
      assert.equal(assertPublicResearchDestination(url), new URL(url).href);
    });
  }

  it('rejects non-http schemes', () => {
    assert.throws(() => assertPublicResearchDestination('javascript:alert(1)'));
    assert.throws(() => assertPublicResearchDestination('file:///etc/passwd'));
  });
});

describe('nextPublicResearchUrl revalidates redirect hops', () => {
  it('allows a public absolute Location', () => {
    assert.equal(
      nextPublicResearchUrl('https://acme.test/', 'https://cdn.acme.test/page'),
      'https://cdn.acme.test/page',
    );
  });

  it('resolves a relative Location against the current URL', () => {
    assert.equal(
      nextPublicResearchUrl('https://acme.test/a', '/b'),
      'https://acme.test/b',
    );
  });

  it('blocks redirect into loopback', () => {
    assert.throws(
      () => nextPublicResearchUrl('https://acme.test/', 'http://127.0.0.1/'),
      /blocked/i,
    );
  });

  it('blocks redirect into link-local metadata', () => {
    assert.throws(
      () =>
        nextPublicResearchUrl(
          'https://acme.test/',
          'http://169.254.169.254/latest/meta-data/',
        ),
      /blocked/i,
    );
  });

  it('blocks redirect into metadata.google.internal', () => {
    assert.throws(
      () =>
        nextPublicResearchUrl(
          'https://acme.test/',
          'http://metadata.google.internal/',
        ),
      /blocked/i,
    );
  });

  it('blocks redirect into RFC1918 space', () => {
    assert.throws(
      () => nextPublicResearchUrl('https://acme.test/', 'http://10.0.0.5/'),
      /blocked/i,
    );
  });
});

describe('collectors use the shared public-destination guard', () => {
  for (const path of [
    'src/lib/research/website.ts',
    'src/lib/research/careers.ts',
  ] as const) {
    it(`${path} calls fetchResearchResponse and does not use redirect:'follow'`, () => {
      const source = read(path);
      assert.match(
        source,
        /fetchResearchResponse\s*\(/,
        `${path} must call fetchResearchResponse`,
      );
      assert.doesNotMatch(
        source,
        /redirect\s*:\s*['"]follow['"]/,
        `${path} must not use unchecked redirect:'follow'`,
      );
      assert.doesNotMatch(
        source,
        /\bfetch\s*\(\s*url\s*,/,
        `${path} must not call fetch(url, …) directly`,
      );
    });
  }

  it('public-destination fetch uses redirect:manual', () => {
    const source = read('src/lib/research/public-destination.ts');
    assert.match(
      source,
      /fetch\s*\(\s*current\s*,\s*\{[^}]*redirect\s*:\s*['"]manual['"]/s,
    );
    assert.doesNotMatch(
      source,
      /fetch\s*\([^;]*redirect\s*:\s*['"]follow['"]/s,
    );
    assert.match(source, /assertPublicResearchDestination/);
    assert.match(source, /nextPublicResearchUrl/);
  });

  it('keeps the research body byte cap wiring', () => {
    for (const path of [
      'src/lib/research/website.ts',
      'src/lib/research/careers.ts',
    ] as const) {
      const source = read(path);
      assert.match(source, /readBoundedResponseText\s*\(\s*response\s*\)/);
    }
  });
});
