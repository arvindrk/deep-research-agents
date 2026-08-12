import {
  buildCompanyEmbeddingText,
  type CompanyEmbeddingFields,
} from './company-embedding';
import { embedText } from './embed';
import { updateCompanyEmbedding } from '@/db/queries/companies';
import type { QueryResult } from '@/db/types';

/**
 * Embed company text and store the vector. Call after insert or meaningful
 * text updates so search stays current without a full backfill.
 */
export async function refreshCompanyEmbedding(
  id: string,
  fields: CompanyEmbeddingFields,
): Promise<QueryResult<{ id: string }>> {
  try {
    const text = buildCompanyEmbeddingText(fields);
    if (!text) {
      return { success: false, error: 'Company has no text to embed' };
    }
    const vector = await embedText(text);
    return updateCompanyEmbedding(id, vector);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === 'OPENAI_API_KEY environment variable is not set' ||
        error.message.startsWith('Expected embedding length') ||
        error.message.startsWith('Embedding request failed') ||
        error.message === 'Embedding response missing vector'
      ) {
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Failed to refresh company embedding' };
  }
}
