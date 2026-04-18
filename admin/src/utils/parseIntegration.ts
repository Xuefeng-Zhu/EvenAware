/**
 * Validates and parses a Firestore document into an Integration object.
 */

import { Integration } from '../types/integration'

/** Parse a Firestore integration document. Returns null if required fields are missing or invalid. */
export function parseIntegration(id: string, data: Record<string, unknown>): Integration | null {
  if (
    typeof data.displayName !== 'string' ||
    typeof data.sourceType !== 'string' ||
    typeof data.authToken !== 'string' ||
    typeof data.enabled !== 'boolean' ||
    typeof data.webhookUrl !== 'string' ||
    !data.createdAt
  ) {
    console.warn(`Invalid integration document: ${id}`)
    return null
  }
  return {
    id,
    displayName: data.displayName,
    sourceType: data.sourceType,
    description: (data.description as string) ?? '',
    authToken: data.authToken,
    enabled: data.enabled,
    webhookUrl: data.webhookUrl,
    createdAt: data.createdAt as { seconds: number; nanoseconds: number },
  }
}
