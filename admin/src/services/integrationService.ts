/**
 * IntegrationService — Firestore CRUD operations for the integrations collection.
 */

import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import {
  Integration,
  CreateIntegrationInput,
  UpdateIntegrationInput,
} from '../types/integration'
import { generateAuthToken } from '../utils/token'
import { buildWebhookUrl } from '../utils/webhookUrl'
import { parseIntegration } from '../utils/parseIntegration'

interface IntegrationService {
  /** Subscribe to all integrations, returns unsubscribe function */
  subscribe(callback: (integrations: Integration[]) => void): () => void
  /** Create a new integration, returns the created document with generated ID */
  create(input: CreateIntegrationInput): Promise<Integration>
  /** Update mutable fields of an existing integration */
  update(id: string, fields: UpdateIntegrationInput): Promise<void>
  /** Delete an integration by ID */
  delete(id: string): Promise<void>
  /** Regenerate the auth token for an integration */
  regenerateToken(id: string): Promise<string>
}

const integrationsRef = collection(db, 'integrations')

function subscribe(callback: (integrations: Integration[]) => void): () => void {
  return onSnapshot(integrationsRef, (snapshot) => {
    const integrations: Integration[] = []
    snapshot.forEach((docSnap) => {
      const parsed = parseIntegration(docSnap.id, docSnap.data())
      if (parsed) {
        integrations.push(parsed)
      }
    })
    callback(integrations)
  })
}

async function create(input: CreateIntegrationInput): Promise<Integration> {
  const authToken = generateAuthToken()
  const webhookUrl = buildWebhookUrl(input.sourceType)

  const data = {
    displayName: input.displayName,
    sourceType: input.sourceType,
    description: input.description ?? '',
    authToken,
    enabled: true,
    webhookUrl,
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(integrationsRef, data)

  return {
    id: docRef.id,
    displayName: input.displayName,
    sourceType: input.sourceType,
    description: input.description ?? '',
    authToken,
    enabled: true,
    webhookUrl,
    createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
  }
}

async function update(id: string, fields: UpdateIntegrationInput): Promise<void> {
  const docRef = doc(db, 'integrations', id)
  await updateDoc(docRef, { ...fields })
}

async function deleteIntegration(id: string): Promise<void> {
  const docRef = doc(db, 'integrations', id)
  await deleteDoc(docRef)
}

async function regenerateToken(id: string): Promise<string> {
  const newToken = generateAuthToken()
  const docRef = doc(db, 'integrations', id)
  await updateDoc(docRef, { authToken: newToken })
  return newToken
}

export const integrationService: IntegrationService = {
  subscribe,
  create,
  update,
  delete: deleteIntegration,
  regenerateToken,
}
