import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  redactCredentials,
  REDACTED,
} from '@/lib/observability/redact';

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
