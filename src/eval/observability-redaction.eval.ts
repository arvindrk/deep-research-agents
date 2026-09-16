import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  redactCredentials,
  REDACTED,
} from '@/lib/observability/redact';
import {
  boundQueryText,
  MAX_LOGGED_QUERY_CHARS,
} from '@/lib/observability/search-event';

/**
 * Samples are assembled, never written out. A literal here would be an added
 * line matching the repository's own secret guard, which refuses exactly these
 * shapes in a diff, so the file that proves the redaction works would be the
 * file that cannot be committed.
 */
const sample = {
  postgresUrl: () => 'postgres' + 'ql://app:' + 'hunter2'.repeat(3) + '@db.internal/app',
  githubToken: () => 'gh' + 'p_' + 'abcdefghij'.repeat(4),
  openAiKey: () => 'sk-' + 'abcdefghij'.repeat(3),
  awsKeyId: () => 'AKIA' + 'ABCDEFGHIJKLMNOP',
  slackToken: () => 'xox' + 'b-' + '1234567890-abcdefghij',
  privateKey: () => '-----BEGIN ' + 'RSA PRIVATE KEY-----',
};

describe('redactCredentials', () => {
  it('redacts every shape the repository refuses to let into a diff', () => {
    for (const [name, build] of Object.entries(sample)) {
      const secret = build();
      const scrubbed = redactCredentials(secret);
      assert.equal(scrubbed.includes(REDACTED), true, name);
      assert.equal(
        scrubbed.includes(secret),
        false,
        `${name} survived the redaction`,
      );
    }
  });

  it('leaves no fragment of the secret behind', () => {
    for (const [name, build] of Object.entries(sample)) {
      const scrubbed = redactCredentials(`before ${build()} after`);
      assert.equal(scrubbed, `before ${REDACTED} after`, name);
    }
  });

  it('redacts a secret wherever it sits in the text', () => {
    const secret = sample.openAiKey();
    assert.equal(redactCredentials(secret), REDACTED);
    assert.equal(redactCredentials(`key=${secret}`), `key=${REDACTED}`);
    assert.equal(
      redactCredentials(`${secret} and ${sample.awsKeyId()}`),
      `${REDACTED} and ${REDACTED}`,
    );
  });

  it('redacts more than one of the same shape in one string', () => {
    const two = `${sample.openAiKey()} ${sample.openAiKey()}`;
    assert.equal(redactCredentials(two), `${REDACTED} ${REDACTED}`);
  });

  it('leaves ordinary reader text alone', () => {
    for (const text of [
      'climate fintech',
      'companies like stripe',
      'sk- prefix with nothing after it',
      'postgres tuning',
      'AKIA',
      '',
      '   ',
    ]) {
      assert.equal(redactCredentials(text), text, text);
    }
  });

  it('answers the same thing every time it is asked', () => {
    // A global-flagged regex kept between calls would carry lastIndex and
    // answer differently on the second call with the same input.
    const secret = sample.githubToken();
    const answers = new Set(
      Array.from({ length: 5 }, () => redactCredentials(`a ${secret} b`)),
    );
    assert.deepEqual([...answers], [`a ${REDACTED} b`]);
  });

  it('marks the redaction in a way a log reader can see', () => {
    assert.equal(REDACTED, '[redacted]');
    assert.doesNotMatch(REDACTED, /[A-Za-z0-9]{20,}/);
  });
});

/**
 * The shell guard is the reference: it decides what may enter a diff, and the
 * redaction decides what may enter a log. They are the same judgement about
 * the same shapes, so a pattern that exists on one side and not the other is
 * a hole, and until now nothing said so.
 */
const GUARDS_SCRIPT = 'agent/local/guards.sh';

function shellSecretPatterns(): string[] {
  const script = readFileSync(join(process.cwd(), GUARDS_SCRIPT), 'utf8');
  const block = /GUARD_SECRET_PATTERNS=\(([\s\S]*?)\n\)/.exec(script);
  assert.ok(block, 'the guard script no longer declares GUARD_SECRET_PATTERNS');

  return block[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const unquoted = line.replace(/^'/, '').replace(/',?$/, '');
      // Shell has no escape inside single quotes, so a literal quote is
      // written by closing, escaping, and reopening the string.
      return unquoted.split(`'"'"'`).join("'");
    });
}

/** A shape each shell pattern describes, and a sample that shape matches. */
const COVERAGE: { marker: string; sample: () => string }[] = [
  { marker: 'postgres', sample: sample.postgresUrl },
  { marker: 'gh[pousr]', sample: sample.githubToken },
  { marker: 'sk-', sample: sample.openAiKey },
  { marker: 'AKIA', sample: sample.awsKeyId },
  { marker: 'xox', sample: sample.slackToken },
  { marker: 'PRIVATE KEY', sample: sample.privateKey },
];

describe('the redaction and the harness guard', () => {
  const shellPatterns = shellSecretPatterns();

  it('describe the same number of shapes', () => {
    assert.equal(shellPatterns.length, COVERAGE.length);
    assert.equal(shellPatterns.length, Object.keys(sample).length);
  });

  it('leave no shell pattern unaccounted for', () => {
    for (const pattern of shellPatterns) {
      const covered = COVERAGE.filter((entry) => pattern.includes(entry.marker));
      assert.equal(
        covered.length,
        1,
        `${pattern} matches ${covered.length} declared shapes`,
      );
    }
  });

  it('agree on every sample, in both directions', () => {
    for (const pattern of shellPatterns) {
      const entry = COVERAGE.find((candidate) => pattern.includes(candidate.marker));
      assert.ok(entry, pattern);
      const secret = entry.sample();

      // POSIX classes are the only ERE-only syntax in the list.
      const asJs = new RegExp(pattern.replace(/\[:space:\]/g, '\\s'));
      assert.equal(
        asJs.test(secret),
        true,
        `the guard would not catch the sample for ${pattern}`,
      );
      assert.equal(
        redactCredentials(secret).includes(REDACTED),
        true,
        `the redaction does not catch what the guard refuses: ${pattern}`,
      );
    }
  });

  it('are value-shaped, so neither flags the file describing it', () => {
    for (const pattern of shellPatterns) {
      assert.match(
        pattern,
        /\{\d+,?\}|\{\d+\}|PRIVATE KEY/,
        `${pattern} has no payload requirement`,
      );
    }
  });
});

describe('a secret that straddles the length bound', () => {
  it('leaves no fragment in the logged prefix', () => {
    const secret = sample.openAiKey();
    // Place the secret so the bound would cut it in half.
    const lead = 'a'.repeat(MAX_LOGGED_QUERY_CHARS - 10);
    const bounded = boundQueryText(`${lead}${secret}`);

    assert.equal(bounded.query_prefix.length <= MAX_LOGGED_QUERY_CHARS, true);
    assert.equal(bounded.query_prefix.includes('sk-'), false);
    for (const length of [8, 12, 20]) {
      assert.equal(
        bounded.query_prefix.includes(secret.slice(0, length)),
        false,
        `a ${length} character fragment survived`,
      );
    }
  });

  it('reports the length of what the reader actually sent', () => {
    const secret = sample.githubToken();
    const bounded = boundQueryText(`  ${secret}  `);
    assert.equal(bounded.query_chars, secret.length);
    assert.equal(bounded.query_prefix, REDACTED);
  });

  it('scrubs before it slices, for every shape', () => {
    for (const [name, build] of Object.entries(sample)) {
      const bounded = boundQueryText(build());
      assert.equal(bounded.query_prefix.includes(REDACTED), true, name);
    }
  });
});
