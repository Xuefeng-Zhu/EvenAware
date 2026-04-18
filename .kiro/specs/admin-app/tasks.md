# Implementation Plan: Admin App

## Overview

Build a standalone React + TypeScript SPA in the `admin/` directory that provides integration management and real-time notification monitoring for the Notification Hub. The admin app shares the same Firebase project as the existing glasses app. Implementation proceeds bottom-up: project scaffolding → shared types and utilities → Firebase services → UI components → webhook handler update → Firestore rules → final wiring.

## Tasks

- [x] 1. Scaffold the admin app project
  - [x] 1.1 Initialize the `admin/` directory with Vite + React + TypeScript
    - Create `admin/package.json` with dependencies: react, react-dom, react-router, firebase, tailwindcss
    - Create `admin/vite.config.ts` with React plugin, Tailwind CSS plugin, Vitest config (environment: jsdom, include `src/**/*.test.ts` and `src/**/*.test.tsx`), and path alias `@/` → `./src/*`
    - Create `admin/tsconfig.json` extending standard React + Vite settings
    - Create `admin/index.html` entry point
    - Create `admin/src/main.tsx` with BrowserRouter and App component mount
    - Create `admin/.env.example` listing all `VITE_FIREBASE_*` and `VITE_FUNCTIONS_BASE_URL` variables
    - _Requirements: 12.3_

  - [x] 1.2 Set up Firebase configuration for the admin app
    - Create `admin/src/firebase/config.ts` exporting `db` (Firestore) and `auth` (Firebase Auth) instances
    - Use `import.meta.env.VITE_FIREBASE_*` environment variables matching the existing glasses app pattern in `src/firebase/config.ts`
    - _Requirements: 1.1, 1.2_

- [x] 2. Implement shared types, utilities, and services
  - [x] 2.1 Create the Integration data model and types
    - Create `admin/src/types/integration.ts` with `Integration`, `CreateIntegrationInput`, `UpdateIntegrationInput`, `SeverityFilter`, and `DashboardFilterState` interfaces
    - Reuse the existing `Notification` type from `src/types/notification.ts` — copy it to `admin/src/types/notification.ts` to keep the admin app self-contained
    - _Requirements: 10.1, 10.2_

  - [x] 2.2 Implement pure utility functions
    - Create `admin/src/utils/token.ts` with `generateAuthToken()` using `crypto.getRandomValues()` to produce a 64-hex-character string (32 bytes)
    - Create `admin/src/utils/webhookUrl.ts` with `buildWebhookUrl(sourceType: string): string` using `VITE_FUNCTIONS_BASE_URL`
    - Create `admin/src/utils/parseIntegration.ts` with `parseIntegration(id, data)` that validates all required fields and returns `Integration | null`
    - Create `admin/src/utils/filterNotifications.ts` with `filterNotifications(notifications, filter)` and `getDistinctSources(notifications)` pure functions
    - _Requirements: 3.4, 8.1, 8.2, 8.3, 8.4, 8.5, 10.2, 10.3, 10.4_

  - [ ]* 2.3 Write property tests for utility functions (Properties 5, 7, 8, 9)
    - Install `fast-check` as a dev dependency in `admin/`
    - Create `admin/src/__tests__/properties/filterNotifications.prop.test.ts`
      - **Property 5: Notification filtering correctness** — for any list of notifications and any filter combination, every item in the result matches both criteria, and no matching item is excluded
      - **Validates: Requirements 8.3, 8.4, 8.5**
    - Create `admin/src/__tests__/properties/buildWebhookUrl.prop.test.ts`
      - **Property 7: Webhook URL generation** — for any non-empty sourceType, the URL equals `{baseUrl}/handleWebhook/webhooks/{sourceType}`
      - **Validates: Requirements 10.2**
    - Create `admin/src/__tests__/properties/parseIntegration.prop.test.ts`
      - **Property 8: Integration round-trip serialization** — for any valid Integration, converting to Firestore format and parsing back produces an equivalent object
      - **Property 9: Malformed integration document rejection** — for any document missing a required field or with wrong type, `parseIntegration` returns null
      - **Validates: Requirements 10.1, 10.3, 10.4**

  - [ ]* 2.4 Write property tests for token generation and source filter options (Properties 2-partial, 4)
    - Create `admin/src/__tests__/properties/generateAuthToken.prop.test.ts`
      - **Property 2 (partial): Token format** — for any invocation, the generated token is at least 32 hex characters
      - **Validates: Requirements 3.4**
    - Create `admin/src/__tests__/properties/sourceFilterOptions.prop.test.ts`
      - **Property 4: Source filter options match distinct sources** — for any list of notifications, `getDistinctSources` returns exactly the set of distinct `sourceName` values
      - **Validates: Requirements 8.2**

- [x] 3. Implement AuthContext and sign-in flow
  - [x] 3.1 Create the AuthContext provider
    - Create `admin/src/contexts/AuthContext.tsx` implementing `AuthContextValue` interface
    - Subscribe to `onAuthStateChanged` in the provider, expose `user`, `loading`, `signIn`, `signOut`
    - On sign-out, call all registered Firestore listener cleanup functions before calling `firebaseSignOut`
    - Create `admin/src/components/ProtectedRoute.tsx` that redirects unauthenticated users to `/sign-in`
    - _Requirements: 1.1, 1.5, 1.6_

  - [x] 3.2 Create the SignInPage component
    - Create `admin/src/pages/SignInPage.tsx` with email and password form fields
    - On submit, call `signIn(email, password)` from AuthContext
    - On success, redirect to `/` (Dashboard)
    - On failure, display mapped error message (invalid-credential, user-disabled, too-many-requests, network-request-failed, fallback)
    - Retain email input on failure so the user can retry
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ]* 3.3 Write unit tests for SignInPage
    - Create `admin/src/__tests__/unit/SignInPage.test.tsx`
    - Test: successful sign-in redirects to dashboard
    - Test: failed sign-in displays error message and retains email
    - Test: sign-out redirects to sign-in page
    - _Requirements: 1.3, 1.4, 1.6_

- [x] 4. Implement the toast feedback system
  - [x] 4.1 Create the ToastContext and ToastContainer
    - Create `admin/src/contexts/ToastContext.tsx` with `ToastContextValue` interface: `toasts`, `showSuccess`, `showError`, `dismiss`
    - Success toasts auto-dismiss after 4 seconds; error toasts persist until manually dismissed
    - Create `admin/src/components/ToastContainer.tsx` that renders active toasts
    - _Requirements: 13.1, 13.2_

- [x] 5. Implement IntegrationService
  - [x] 5.1 Create the IntegrationService module
    - Create `admin/src/services/integrationService.ts` implementing the `IntegrationService` interface
    - `subscribe(callback)`: use `onSnapshot` on the `integrations` collection, parse each doc with `parseIntegration`, skip invalid docs
    - `create(input)`: generate auth token via `generateAuthToken()`, build webhook URL via `buildWebhookUrl()`, write to Firestore with `enabled: true` and `serverTimestamp()` for `createdAt`
    - `update(id, fields)`: update only the provided fields on the Firestore document
    - `delete(id)`: delete the Firestore document
    - `regenerateToken(id)`: generate a new token, update the document, return the new token
    - _Requirements: 2.1, 2.3, 3.3, 3.4, 4.5, 5.2, 5.3, 6.3, 10.1_

  - [ ]* 5.2 Write property test for integration creation (Property 2)
    - Create `admin/src/__tests__/properties/integrationCreation.prop.test.ts`
    - **Property 2: Integration creation produces correct defaults** — for any valid CreateIntegrationInput, the created document has authToken ≥ 32 hex chars, enabled is true, and webhookUrl matches the expected format
    - **Validates: Requirements 3.3, 3.4**

- [x] 6. Implement NotificationService
  - [x] 6.1 Create the NotificationService module
    - Create `admin/src/services/notificationService.ts` implementing the `NotificationService` interface
    - `subscribe(callback)`: use `onSnapshot` with `query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(100))`
    - Track connection state via snapshot metadata (`fromCache`, `hasPendingWrites`) and expose it to the callback
    - _Requirements: 7.1, 7.2, 7.4, 7.6_

- [x] 7. Checkpoint — Verify services and utilities
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the AppLayout and navigation
  - [x] 8.1 Create the AppLayout component
    - Create `admin/src/components/AppLayout.tsx` with a persistent sidebar containing nav links to Dashboard (`/`) and Integrations (`/integrations`)
    - Display the authenticated user's email and a sign-out button in the sidebar/header
    - Highlight the currently active navigation item using React Router's location
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 1.5_

  - [x] 8.2 Set up routing in App.tsx
    - Create `admin/src/App.tsx` with React Router routes:
      - `/sign-in` → `SignInPage` (public)
      - `/` → `DashboardPage` (protected, wrapped in `AppLayout`)
      - `/integrations` → `IntegrationsPage` (protected, wrapped in `AppLayout`)
      - `/integrations/:id` → `IntegrationDetailPage` (protected, wrapped in `AppLayout`)
    - Wrap protected routes with `ProtectedRoute`
    - Wrap the app with `AuthProvider` and `ToastProvider`
    - _Requirements: 12.3, 1.1_

- [x] 9. Implement the Dashboard page
  - [x] 9.1 Create the DashboardPage component
    - Create `admin/src/pages/DashboardPage.tsx`
    - Subscribe to `NotificationService` on mount, unsubscribe on unmount
    - Render the notification feed as a scrollable list ordered by timestamp descending
    - Display each notification with severity color indicator (red=critical, amber=warning, blue=info), source name, title, and relative timestamp
    - Display connection status indicator (connected/disconnected) based on snapshot metadata
    - Show warning banner when Firestore listener is disconnected: "Connection lost — notification feed may be stale"
    - Remove warning banner on reconnection
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 13.3, 13.4_

  - [x] 9.2 Implement filter controls on the Dashboard
    - Add severity filter dropdown/buttons: all, critical only, warning and critical, info only
    - Add source filter dropdown populated dynamically from `getDistinctSources(notifications)`
    - Apply filters client-side using `filterNotifications()` pure function
    - Display count: "Showing X of Y" when filters are active
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 9.3 Implement notification detail expand/collapse
    - Clicking a notification expands an inline detail panel showing full title, body, severity, source name, source type, and formatted UTC timestamp
    - Clicking an expanded notification collapses it
    - Only one detail panel can be open at a time
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 9.4 Write property tests for dashboard rendering (Properties 3, 6)
    - Create `admin/src/__tests__/properties/notificationFeedItem.prop.test.ts`
      - **Property 3: Notification rendering contains required fields** — for any valid Notification, the rendered feed item contains severity indicator, source name, title, and relative timestamp
      - **Validates: Requirements 7.3**
    - Create `admin/src/__tests__/properties/filterCount.prop.test.ts`
      - **Property 6: Filter count accuracy** — for any notification list and filter combination, the displayed count matches the actual filtered and total counts
      - **Validates: Requirements 8.6**

- [x] 10. Implement the Integrations pages
  - [x] 10.1 Create the IntegrationsPage component
    - Create `admin/src/pages/IntegrationsPage.tsx`
    - Subscribe to `IntegrationService` on mount, unsubscribe on unmount
    - Display a list of integrations showing display name, source type, enabled/disabled status indicator, and creation timestamp
    - Visually distinguish enabled from disabled integrations
    - Show empty state message with prompt to create when no integrations exist
    - Provide a "Create Integration" button that opens a creation form/dialog
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 10.2 Implement the integration creation form
    - Create a form with fields: display name (required), source type dropdown (pagerduty, opsgenie, custom), optional description
    - Validate that display name is non-empty before submission
    - On submit, call `IntegrationService.create()` and show success toast
    - After creation, display the generated webhook URL and auth token with copy-to-clipboard actions
    - Show error toast on failure, retain form input
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 13.1, 13.2_

  - [x] 10.3 Create the IntegrationDetailPage component
    - Create `admin/src/pages/IntegrationDetailPage.tsx`
    - Display: display name, source type, description, webhook URL, auth token (masked by default), enabled status, creation timestamp
    - Provide reveal/mask toggle for auth token
    - Provide copy-to-clipboard for webhook URL and auth token
    - Provide edit form for display name and description with save action
    - Provide enable/disable toggle that updates Firestore
    - Provide regenerate token action with confirmation dialog warning that the previous token will stop working
    - Provide delete action with confirmation dialog stating integration name and warning deletion is permanent
    - Show success/error toasts for all operations
    - On delete success, navigate back to integrations list
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 13.1, 13.2_

  - [ ]* 10.4 Write property test for integration list item rendering (Property 1)
    - Create `admin/src/__tests__/properties/integrationListItem.prop.test.ts`
    - **Property 1: Integration list item rendering contains required fields** — for any valid Integration, the rendered list item contains displayName, sourceType, enabled/disabled indicator, and human-readable creation timestamp
    - **Validates: Requirements 2.2**

- [x] 11. Checkpoint — Verify admin app frontend
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Update the webhook handler for per-integration auth
  - [x] 12.1 Implement `validateIntegrationAuth` in Cloud Functions
    - Modify `functions/src/webhook.ts` to add the `validateIntegrationAuth` function
    - Query the `integrations` collection by `sourceType`, validate enabled status and bearer token
    - Return appropriate error objects: 404 (no integration), 403 (disabled), 401 (missing/invalid token)
    - Replace the existing `validateAuthToken` function call in `handleWebhook` with `validateIntegrationAuth`
    - Keep the existing adapter lookup, parse, normalize, and Firestore write logic unchanged
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 5.4_

  - [ ]* 12.2 Write property tests for webhook auth (Properties 10, 11, 12)
    - Create `functions/src/__tests__/properties/webhookAuth.prop.test.ts`
    - Install `fast-check` as a dev dependency in `functions/`
    - **Property 10: Webhook auth — missing integration returns 404** — for any sourceType with no matching integration doc, the handler responds 404
    - **Validates: Requirements 11.2**
    - **Property 11: Webhook auth — invalid token returns 401** — for any request with a non-matching bearer token, the handler responds 401
    - **Validates: Requirements 11.3**
    - **Property 12: Webhook auth — disabled integration returns 403** — for any request targeting a disabled integration, the handler responds 403 regardless of token correctness
    - **Validates: Requirements 5.4, 11.4**

  - [ ]* 12.3 Update existing webhook unit tests
    - Update `functions/src/__tests__/webhook.test.ts` to test per-integration auth flow instead of single `WEBHOOK_AUTH_TOKEN`
    - Add test cases: no integration → 404, disabled integration → 403, wrong token → 401, valid token → 200
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 13. Update Firestore security rules
  - [x] 13.1 Add integrations collection rules
    - Update `firestore.rules` to add rules for the `integrations` collection: allow read/write only if `request.auth != null`
    - Keep existing `notifications` collection rules (readable by anyone, writable only by Cloud Functions via admin SDK)
    - _Requirements: 1.1, 10.1_

- [x] 14. Final checkpoint — Verify complete implementation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 12 universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The admin app is fully self-contained in the `admin/` directory with its own Vite config, dependencies, and test setup
- The only shared code is the Firebase project configuration (same project) and the `functions/` directory for webhook handler updates
