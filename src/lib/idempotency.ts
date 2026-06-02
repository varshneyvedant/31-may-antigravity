import { prisma } from '@/lib/prisma';

/**
 * Checks the idempotency registry for duplicate concurrent requests or past successes.
 */
export async function checkIdempotency(key: string | null | undefined) {
  if (!key) return null;

  const existing = await prisma.idempotencyRecord.findUnique({
    where: { key }
  });

  if (existing) {
    return {
      status: existing.status as 'PROCESSING' | 'SUCCESS' | 'FAILED',
      response: existing.response ? JSON.parse(existing.response) : null
    };
  }

  // Create new processing record atomically
  try {
    await prisma.idempotencyRecord.create({
      data: {
        key,
        status: 'PROCESSING'
      }
    });
  } catch (err) {
    // Concurrent request hit a race condition database conflict
    return {
      status: 'PROCESSING',
      response: null
    };
  }

  return null;
}

/**
 * Commits the transaction outcome to the idempotency registry.
 */
export async function completeIdempotency(
  key: string | null | undefined,
  status: 'SUCCESS' | 'FAILED',
  responsePayload: any
) {
  if (!key) return;

  await prisma.idempotencyRecord.update({
    where: { key },
    data: {
      status,
      response: JSON.stringify(responsePayload)
    }
  });
}
