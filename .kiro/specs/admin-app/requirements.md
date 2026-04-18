# Requirements Document

## Introduction

The Admin App is a companion web application for the Notification Hub system. It is a standalone React single-page application (separate from the G2 glasses WebView app) that connects to the same Firebase project. The Admin App serves two primary purposes: (1) managing integrations with notification sources such as PagerDuty, OpsGenie, and custom webhooks, and (2) providing a real-time dashboard for monitoring notifications as they flow through the system.

The existing Notification Hub system already handles webhook ingestion via Firebase Cloud Functions at `/webhooks/:sourceType`, stores normalized notifications in a Firestore `notifications` collection, and uses a pluggable Source Adapter pattern (PagerDuty, OpsGenie). The Admin App builds on this infrastructure by introducing a new Firestore `integrations` collection for managing source configurations, and by reading from the existing `notifications` collection for the live dashboard. The Admin App uses Firebase Authentication to restrict access to authorized administrators.

## Glossary

- **Admin_App**: The React single-page application that provides integration management and real-time notification monitoring
- **Dashboard**: The main view of the Admin_App that displays live notifications as they arrive in real time
- **Integration**: A configured connection to an external notification source, stored as a document in the Firestore `integrations` collection
- **Integration_Manager**: The Admin_App component responsible for creating, editing, enabling, disabling, and deleting Integrations
- **Notification**: A normalized data object stored in the Firestore `notifications` collection, containing id, title, body, severity, sourceName, sourceType, and timestamp
- **Source_Type**: An identifier string (e.g., "pagerduty", "opsgenie", "custom") that maps to a Source Adapter in the Cloud Functions backend
- **Webhook_URL**: The full HTTP endpoint URL that an external source posts events to, in the format `{functions_base_url}/handleWebhook/webhooks/{sourceType}`
- **Auth_Token**: A bearer token used to authenticate incoming webhook requests from a configured source
- **Firestore**: The Firebase Cloud Firestore database shared between the Admin_App and the existing Notification Hub backend
- **Firebase_Auth**: Firebase Authentication service used to restrict Admin_App access to authorized users
- **Notification_Feed**: The real-time, chronologically ordered list of Notifications displayed on the Dashboard
- **Severity**: A classification level for a Notification: critical, warning, or info
- **Cloud_Functions**: The existing Firebase Cloud Functions backend that receives webhooks and writes Notifications to Firestore

## Requirements

### Requirement 1: Admin Authentication

**User Story:** As an administrator, I want to sign in to the Admin App with my credentials, so that only authorized users can manage integrations and view notifications.

#### Acceptance Criteria

1. THE Admin_App SHALL require Firebase_Auth authentication before granting access to any Admin_App functionality
2. THE Admin_App SHALL provide a sign-in page that supports email and password authentication via Firebase_Auth
3. WHEN a user successfully authenticates via Firebase_Auth, THE Admin_App SHALL redirect the user to the Dashboard
4. WHEN a user fails to authenticate after submitting credentials, THE Admin_App SHALL display an error message describing the failure reason (invalid credentials, account disabled, or network error)
5. THE Admin_App SHALL provide a sign-out action accessible from all authenticated pages
6. WHEN a user signs out, THE Admin_App SHALL redirect the user to the sign-in page and detach all Firestore real-time listeners

### Requirement 2: Integration Listing

**User Story:** As an administrator, I want to see all configured integrations in one place, so that I can understand which notification sources are connected to the system.

#### Acceptance Criteria

1. THE Integration_Manager SHALL display a list of all Integration documents from the Firestore `integrations` collection
2. THE Integration_Manager SHALL display each Integration with its display name, Source_Type, enabled/disabled status, and creation timestamp
3. THE Integration_Manager SHALL subscribe to the Firestore `integrations` collection using an `onSnapshot` real-time listener so that changes made by other users appear within 2 seconds
4. WHEN the `integrations` collection is empty, THE Integration_Manager SHALL display an empty state message prompting the user to create a new Integration
5. THE Integration_Manager SHALL visually distinguish enabled Integrations from disabled Integrations using a status indicator

### Requirement 3: Integration Creation

**User Story:** As an administrator, I want to add a new notification source integration, so that the system can start receiving webhooks from that source.

#### Acceptance Criteria

1. THE Integration_Manager SHALL provide a form for creating a new Integration with fields: display name, Source_Type selection, and an optional description
2. THE Integration_Manager SHALL offer Source_Type selection from a predefined list that includes "pagerduty", "opsgenie", and "custom"
3. WHEN the user submits a valid Integration creation form, THE Integration_Manager SHALL write a new document to the Firestore `integrations` collection with the provided fields, a generated Auth_Token, an enabled status of true, and a server-generated creation timestamp
4. WHEN the Integration is created, THE Integration_Manager SHALL generate a unique Auth_Token of at least 32 cryptographically random characters for the new Integration
5. WHEN the Integration is created, THE Integration_Manager SHALL display the generated Webhook_URL and Auth_Token to the user with a copy-to-clipboard action for each
6. IF the user submits the creation form with a missing display name, THEN THE Integration_Manager SHALL display a validation error and prevent submission

### Requirement 4: Integration Configuration

**User Story:** As an administrator, I want to view and edit the details of an existing integration, so that I can update its settings or retrieve its webhook credentials.

#### Acceptance Criteria

1. WHEN the user selects an Integration from the list, THE Integration_Manager SHALL display a detail view showing: display name, Source_Type, description, Webhook_URL, Auth_Token (masked by default), enabled status, and creation timestamp
2. THE Integration_Manager SHALL provide a mechanism to reveal the masked Auth_Token on user action
3. THE Integration_Manager SHALL provide copy-to-clipboard actions for the Webhook_URL and Auth_Token fields
4. THE Integration_Manager SHALL allow the user to edit the display name and description of an existing Integration
5. WHEN the user saves edits to an Integration, THE Integration_Manager SHALL update the corresponding Firestore `integrations` document with the modified fields
6. THE Integration_Manager SHALL provide a mechanism to regenerate the Auth_Token for an existing Integration
7. WHEN the user regenerates an Auth_Token, THE Integration_Manager SHALL display a confirmation prompt warning that the previous token will stop working before proceeding

### Requirement 5: Integration Enable and Disable

**User Story:** As an administrator, I want to enable or disable an integration without deleting it, so that I can temporarily stop receiving notifications from a source.

#### Acceptance Criteria

1. THE Integration_Manager SHALL provide a toggle control to enable or disable each Integration
2. WHEN the user disables an Integration, THE Integration_Manager SHALL update the Integration document in Firestore to set the enabled field to false
3. WHEN the user enables a previously disabled Integration, THE Integration_Manager SHALL update the Integration document in Firestore to set the enabled field to true
4. WHILE an Integration is disabled, THE Cloud_Functions SHALL reject webhook requests for that Integration with an HTTP 403 status code and a JSON body indicating the integration is disabled

### Requirement 6: Integration Deletion

**User Story:** As an administrator, I want to delete an integration I no longer need, so that the system stays clean and manageable.

#### Acceptance Criteria

1. THE Integration_Manager SHALL provide a delete action for each Integration
2. WHEN the user initiates a delete action, THE Integration_Manager SHALL display a confirmation dialog stating the integration name and warning that deletion is permanent
3. WHEN the user confirms deletion, THE Integration_Manager SHALL remove the Integration document from the Firestore `integrations` collection
4. IF the Firestore delete operation fails, THEN THE Integration_Manager SHALL display an error message and retain the Integration in the list

### Requirement 7: Real-Time Notification Dashboard

**User Story:** As an administrator, I want to see notifications arriving in real time on a dashboard, so that I can monitor the health and activity of the notification system.

#### Acceptance Criteria

1. THE Dashboard SHALL subscribe to the Firestore `notifications` collection using an `onSnapshot` real-time listener ordered by timestamp descending
2. THE Dashboard SHALL display the most recent 100 Notifications in a scrollable Notification_Feed list
3. THE Dashboard SHALL display each Notification with its severity, source name, title, and a human-readable relative timestamp (e.g., "2 minutes ago")
4. WHEN a new Notification document is added to Firestore, THE Dashboard SHALL prepend the Notification to the top of the Notification_Feed within 2 seconds without requiring a page refresh
5. THE Dashboard SHALL visually distinguish Notifications by severity using color-coded indicators: red for critical, amber for warning, and blue for info
6. THE Dashboard SHALL display a connection status indicator showing whether the Firestore real-time listener is active or disconnected

### Requirement 8: Dashboard Filtering

**User Story:** As an administrator, I want to filter the notification dashboard by severity and source, so that I can focus on specific types of alerts.

#### Acceptance Criteria

1. THE Dashboard SHALL provide filter controls for severity level, allowing selection of: all, critical only, warning and critical, or info only
2. THE Dashboard SHALL provide a filter control for source name, populated dynamically from the distinct source names present in the current Notification_Feed
3. WHEN the user applies a severity filter, THE Dashboard SHALL display only Notifications matching the selected severity criteria
4. WHEN the user applies a source filter, THE Dashboard SHALL display only Notifications from the selected source
5. WHEN both severity and source filters are active, THE Dashboard SHALL display only Notifications matching both filter criteria simultaneously
6. THE Dashboard SHALL display the count of visible Notifications out of the total loaded Notifications when filters are active (e.g., "Showing 12 of 100")

### Requirement 9: Dashboard Notification Detail

**User Story:** As an administrator, I want to expand a notification on the dashboard to see its full details, so that I can investigate alerts without leaving the dashboard.

#### Acceptance Criteria

1. WHEN the user clicks on a Notification in the Notification_Feed, THE Dashboard SHALL expand an inline detail panel showing the full title, body, severity, source name, source type, and formatted UTC timestamp
2. WHEN the user clicks on an expanded Notification, THE Dashboard SHALL collapse the detail panel
3. THE Dashboard SHALL allow only one Notification detail panel to be expanded at a time

### Requirement 10: Integration Data Model

**User Story:** As a developer, I want a well-defined Firestore schema for integrations, so that the Admin App and Cloud Functions can reliably share integration configuration data.

#### Acceptance Criteria

1. THE Admin_App SHALL store each Integration in the Firestore `integrations` collection as a document with fields: id (document ID), displayName (string), sourceType (string), description (string), authToken (string), enabled (boolean), webhookUrl (string), and createdAt (Firestore server timestamp)
2. THE Admin_App SHALL generate the webhookUrl field by concatenating the Cloud_Functions base URL with `/handleWebhook/webhooks/` and the sourceType value
3. FOR ALL valid Integration objects, writing to Firestore and reading back from a Firestore document snapshot SHALL produce an equivalent Integration object (round-trip property)
4. WHEN the Admin_App reads an `integrations` document that does not conform to the Integration schema, THE Admin_App SHALL discard the document and log a warning

### Requirement 11: Webhook Authentication with Integration Tokens

**User Story:** As an administrator, I want each integration to have its own authentication token, so that I can revoke access for a single source without affecting others.

#### Acceptance Criteria

1. WHEN Cloud_Functions receives a webhook request, THE Cloud_Functions SHALL look up the Integration document matching the request sourceType and validate the request Authorization header bearer token against the Integration authToken field
2. IF no Integration document exists for the received sourceType, THEN THE Cloud_Functions SHALL respond with an HTTP 404 status code
3. IF the bearer token in the request does not match the Integration authToken, THEN THE Cloud_Functions SHALL respond with an HTTP 401 status code
4. WHILE an Integration is disabled, THE Cloud_Functions SHALL respond to webhook requests for that Integration with an HTTP 403 status code

### Requirement 12: Admin App Navigation and Layout

**User Story:** As an administrator, I want a clear navigation structure, so that I can move between the dashboard and integration management efficiently.

#### Acceptance Criteria

1. THE Admin_App SHALL provide a persistent navigation sidebar or header with links to the Dashboard and the Integration_Manager views
2. THE Admin_App SHALL highlight the currently active navigation item to indicate the user's current location
3. THE Admin_App SHALL use client-side routing (React Router) to navigate between views without full page reloads
4. THE Admin_App SHALL display the authenticated user's email in the navigation area alongside the sign-out action

### Requirement 13: Error Handling and Feedback

**User Story:** As an administrator, I want clear feedback when operations succeed or fail, so that I know the current state of the system.

#### Acceptance Criteria

1. WHEN a Firestore write operation (create, update, delete) succeeds, THE Admin_App SHALL display a brief success notification to the user
2. IF a Firestore write operation fails, THEN THE Admin_App SHALL display an error message describing the failure and retain the user's input so the operation can be retried
3. IF the Firestore real-time listener disconnects, THEN THE Dashboard SHALL display a visible warning banner indicating that the notification feed may not reflect the latest data
4. WHEN the Firestore real-time listener reconnects after a disconnection, THE Dashboard SHALL remove the warning banner and re-synchronize the Notification_Feed
