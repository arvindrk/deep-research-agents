import {
  assertEmbeddingDimensions,
  EMBEDDING_DIMENSIONS,
} from './company-embedding';

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';

type OpenAIEmbeddingsResponse = {
  data?: Array<{ embedding?: number[] }>;
};

/**
 * Embeds text with the OpenAI embeddings HTTP API via fetch (no SDK).
 * Reads OPENAI_API_KEY only at call time so importing this module is
 * side-effect free and `next build` needs no secrets.
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed with status ${response.status}`);
  }

  const body = (await response.json()) as OpenAIEmbeddingsResponse;
  const embedding = body.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error('Embedding response missing vector');
  }

  return assertEmbeddingDimensions(embedding);
}
