import { EMBEDDING_MODEL } from './parameters';

const EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';

type EmbeddingResponse = {
  data: { index: number; embedding: number[] }[];
};

export class MissingApiKeyError extends Error {
  constructor() {
    super('Missing EXPO_PUBLIC_OPENAI_API_KEY');
    this.name = 'MissingApiKeyError';
  }
}

export function getOpenAiApiKey(): string | null {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) return null;
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function embedTexts(inputs: string[]): Promise<number[][]> {
  if (inputs.length === 0) return [];

  const key = getOpenAiApiKey();
  if (!key) throw new MissingApiKeyError();

  const response = await fetch(EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embeddings failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as EmbeddingResponse;
  const vectors = [...payload.data]
    .sort((left, right) => left.index - right.index)
    .map((row) => row.embedding);

  if (vectors.length !== inputs.length || vectors.some((vector) => vector.length === 0)) {
    throw new Error('OpenAI returned an unexpected number of embeddings');
  }

  return vectors;
}
