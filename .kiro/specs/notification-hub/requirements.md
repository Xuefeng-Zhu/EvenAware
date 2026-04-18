# Requirements Document

## Introduction

Notification Hub is a real-time notification aggregation app for the Even Realities G2 smart glasses. It connects to multiple external sources — incident management platforms (PagerDuty, OpsGenie), inventory management systems, and other webhook-capable services — and displays incoming notifications on the G2 display as they arrive. The app acts as a centralized hub: one place to see all alerts regardless of origin, rendered within the constraints of the G2's 576×288 green micro-LED display and R1 ring input.

The app consists of a web frontend (Vite + React + TypeScript) that runs in the Even Hub WebView on iPhone, Firebase Cloud Functions that receive webhooks from external sources and write normalized notifications to Firestore, and the glasses UI rendered via the G2 SDK's container model. Firebase provides the real-time backbone: Cloud Functions handle webhook ingestion, Firestore stores and syncs notifications, and the Frontend subscribes to Firestore `onSnapshot` listeners for instant updates without managing custom WebSocket infrastructure.

## Glossary

- **Notification_Hub**: The complete system including Firebase Cloud Functions, Firestore, the WebView frontend, and the glasses UI
- **Cloud_Functions**: Firebase Cloud Functions that receive webhooks from external Sources, normalize payloads via Source_Adapters, and write Notifications to Firestore
- **Firestore**: The Firebase Cloud Firestore database that stores Notifications and provides real-time synchronization to the Frontend via `onSnapshot` listeners
- **Frontend**: The React web app running inside the Even Hub WebView on iPhone; subscribes to Firestore for real-time Notification updates and manages the glasses display
- **Glasses_UI**: The display layer rendered on the G2 glasses via the SDK container model (text, list, and image containers on a 576×288 canvas)
- **Source**: An external system that sends notifications to the Backend (e.g., PagerDuty, OpsGenie, an inventory management system)
- **Source_Adapter**: A module in the Backend that parses a specific Source's webhook payload into the normalized Notification format
- **Notification**: A normalized data object representing a single alert from any Source, containing fields such as title, body, severity, source name, and timestamp
- **Notification_Feed**: The chronologically ordered list of Notifications displayed on the Glasses_UI
- **Severity**: A classification level for a Notification: critical, warning, or info
- **Webhook**: An HTTP POST request sent by a Source to the Backend when an event occurs
- **R1_Ring**: The Even Realities control ring used for scroll, tap, and double-tap input gestures
- **SDK_Storage**: The Even Hub persistent storage API (`bridge.setLocalStorage` / `bridge.getLocalStorage`), used instead of browser `localStorage`

## Requirements

### Requirement 1: Webhook Reception

**User Story:** As an on-call engineer, I want the system to receive webhooks from external services, so that notifications arrive in real time without polling.

#### Acceptance Criteria

1. THE Cloud_Functions SHALL expose an HTTP-triggered function at the path `/webhooks/:sourceType` that accepts webhook payloads from configured Sources
2. WHEN Cloud_Functions receives a valid webhook payload, THE Cloud_Functions SHALL respond with an HTTP 200 status code within 2000 milliseconds
3. WHEN Cloud_Functions receives a webhook payload that fails validation, THE Cloud_Functions SHALL respond with an HTTP 400 status code and a JSON body containing a human-readable error message
4. IF Cloud_Functions receives a request with an invalid or missing authentication token, THEN THE Cloud_Functions SHALL respond with an HTTP 401 status code and discard the payload

### Requirement 2: Source Adapter System

**User Story:** As a developer, I want a pluggable adapter system for different notification sources, so that adding a new source does not require changes to core notification logic.

#### Acceptance Criteria

1. THE Cloud_Functions SHALL define a Source_Adapter interface with a `parse(rawPayload: unknown): Notification` method and a `sourceType: string` identifier
2. WHEN a webhook arrives for a given `:sourceType`, THE Cloud_Functions SHALL route the payload to the matching Source_Adapter for parsing
3. IF no Source_Adapter is registered for the received `:sourceType`, THEN THE Cloud_Functions SHALL respond with an HTTP 404 status code
4. THE Cloud_Functions SHALL include built-in Source_Adapters for PagerDuty and OpsGenie webhook formats
5. WHEN a Source_Adapter parses a payload, THE Source_Adapter SHALL produce a Notification containing: title (max 120 characters), body (max 400 characters), severity (critical, warning, or info), source name, source type, and timestamp

### Requirement 3: Notification Normalization and Validation

**User Story:** As a user, I want all notifications to follow a consistent format regardless of source, so that the glasses display is predictable and readable.

#### Acceptance Criteria

1. THE Cloud_Functions SHALL truncate the Notification title to 120 characters and the Notification body to 400 characters when the Source_Adapter output exceeds those limits
2. THE Cloud_Functions SHALL assign a unique identifier to each Notification upon creation using Firestore auto-generated document IDs
3. WHEN a Source_Adapter produces a Notification with a severity value outside the set {critical, warning, info}, THE Cloud_Functions SHALL default the severity to info
4. THE Cloud_Functions SHALL record a UTC ISO-8601 timestamp on each Notification at the moment of receipt using Firestore server timestamps

### Requirement 4: Real-Time Sync via Firestore

**User Story:** As a user wearing the glasses, I want notifications to appear on the display within seconds of the source event, so that I can respond to incidents promptly.

#### Acceptance Criteria

1. THE Cloud_Functions SHALL write each normalized Notification to a Firestore `notifications` collection upon successful webhook processing
2. THE Frontend SHALL subscribe to the Firestore `notifications` collection using an `onSnapshot` real-time listener to receive new Notifications as they are written
3. WHEN a new Notification document is added to Firestore, THE Frontend SHALL receive the update and process it for display within 2000 milliseconds of the write
4. IF the Firestore real-time listener is disconnected, THEN THE Frontend SHALL rely on Firestore SDK automatic reconnection and re-synchronization to recover missed Notifications
5. THE Frontend SHALL query the Firestore `notifications` collection for the most recent 50 Notifications on initial load, ordered by timestamp descending

### Requirement 5: Notification Feed Display on Glasses

**User Story:** As a user wearing the glasses, I want to see a scrollable list of recent notifications on the G2 display, so that I can review alerts at a glance.

#### Acceptance Criteria

1. THE Glasses_UI SHALL display the Notification_Feed as a list container showing the most recent Notifications, ordered from newest to oldest
2. THE Glasses_UI SHALL display each Notification list item as a single line containing the severity indicator, the source name, and the truncated title, fitting within 64 characters
3. THE Glasses_UI SHALL render the Notification_Feed within the 576×288 pixel canvas using a full-screen list container
4. WHEN the Notification_Feed contains more items than fit on one screen, THE Glasses_UI SHALL allow the user to scroll through items using R1_Ring scroll gestures, with the firmware handling native list scrolling
5. THE Glasses_UI SHALL display a maximum of 50 Notifications in the Notification_Feed, discarding the oldest when the limit is exceeded

### Requirement 6: Notification Detail View

**User Story:** As a user, I want to tap on a notification to see its full details, so that I can understand the alert without reaching for my phone.

#### Acceptance Criteria

1. WHEN the user performs a CLICK_EVENT on a Notification in the Notification_Feed list, THE Glasses_UI SHALL navigate to a detail view for the selected Notification
2. THE Glasses_UI SHALL display the detail view using a text container showing: severity, source name, timestamp, title, and body
3. WHEN the detail view content exceeds the visible area of the text container, THE Glasses_UI SHALL enable internal text scrolling via R1_Ring scroll gestures on the text container with `isEventCapture: 1`
4. WHEN the user performs a DOUBLE_CLICK_EVENT on the detail view, THE Glasses_UI SHALL navigate back to the Notification_Feed list

### Requirement 7: Real-Time Display Update

**User Story:** As a user viewing the notification feed, I want new notifications to appear on the display as they arrive, so that I always see the latest alerts.

#### Acceptance Criteria

1. WHEN a new Notification arrives while the user is viewing the Notification_Feed, THE Glasses_UI SHALL rebuild the list container to include the new Notification at the top of the feed
2. WHEN a new Notification with critical severity arrives while the user is viewing the detail view of another Notification, THE Glasses_UI SHALL display a brief banner text at the top of the screen for 3 seconds before restoring the detail view
3. WHEN a new Notification with warning or info severity arrives while the user is viewing the detail view, THE Glasses_UI SHALL not interrupt the detail view

### Requirement 8: Severity Filtering

**User Story:** As a user, I want to filter notifications by severity, so that I can focus on critical alerts when I am busy.

#### Acceptance Criteria

1. THE Glasses_UI SHALL provide a filter screen accessible from the Notification_Feed via a designated gesture (CLICK_EVENT when the feed is scrolled to the top boundary, triggering on SCROLL_TOP_EVENT)
2. THE Glasses_UI SHALL display the filter screen as a list container with items: "All", "Critical Only", "Warning & Critical", representing the available severity filter options
3. WHEN the user selects a filter option via CLICK_EVENT, THE Glasses_UI SHALL apply the selected filter to the Notification_Feed and navigate back to the filtered feed
4. THE Frontend SHALL persist the selected severity filter using SDK_Storage so the filter survives app restarts

### Requirement 9: Source Filtering

**User Story:** As a user, I want to filter notifications by source, so that I can focus on alerts from a specific system.

#### Acceptance Criteria

1. THE Glasses_UI SHALL provide a source filter screen accessible from the filter screen as an additional list item labeled "Filter by Source"
2. THE Glasses_UI SHALL display the source filter screen as a list container listing all Sources that have sent at least one Notification, plus an "All Sources" option
3. WHEN the user selects a source via CLICK_EVENT, THE Glasses_UI SHALL apply the source filter to the Notification_Feed in combination with the active severity filter and navigate back to the feed
4. THE Frontend SHALL persist the selected source filter using SDK_Storage so the filter survives app restarts

### Requirement 10: App Lifecycle and Navigation

**User Story:** As a user, I want the app to follow G2 navigation conventions, so that the experience is consistent with other glasses apps.

#### Acceptance Criteria

1. THE Frontend SHALL call `bridge.connect()` automatically on page load without requiring user interaction
2. THE Frontend SHALL call `createStartUpPageContainer` exactly once at app startup to establish the initial Notification_Feed layout
3. WHEN the user performs a DOUBLE_CLICK_EVENT on the root Notification_Feed screen, THE Glasses_UI SHALL call `shutDownPageContainer(1)` to invoke the Even Hub exit dialogue
4. WHEN the user performs a DOUBLE_CLICK_EVENT on any non-root screen (detail view, filter screens), THE Glasses_UI SHALL navigate back to the previous screen
5. WHEN the app receives a FOREGROUND_ENTER_EVENT, THE Frontend SHALL refresh the Notification_Feed with the latest Notifications from Firestore
6. WHEN the app receives an ABNORMAL_EXIT_EVENT, THE Frontend SHALL detach the Firestore real-time listener to clean up resources

### Requirement 11: Notification Data Model and Serialization

**User Story:** As a developer, I want notifications to follow a well-defined Firestore document schema, so that the system can reliably store, sync, and render notification data.

#### Acceptance Criteria

1. THE Cloud_Functions SHALL write each Notification to Firestore as a document with fields: id, title, body, severity, sourceName, sourceType, and timestamp
2. THE Frontend SHALL deserialize Firestore document snapshots into Notification objects using a shared TypeScript type definition
3. FOR ALL valid Notification objects, converting to a Firestore document and reading back from a Firestore document snapshot SHALL produce an equivalent Notification object (round-trip property)
4. WHEN the Frontend receives a Firestore document that does not conform to the Notification schema, THE Frontend SHALL discard the document and log a warning

### Requirement 12: WebView Settings UI

**User Story:** As a user, I want a settings page in the phone WebView where I can manage notification sources and view connection status, so that I can configure the hub without needing a separate tool.

#### Acceptance Criteria

1. THE Frontend SHALL provide a settings page rendered in the iPhone WebView using the even-toolkit component library
2. THE Frontend SHALL display the current Firestore listener status (connected, disconnected) on the settings page
3. THE Frontend SHALL display a list of configured Sources with their Cloud_Functions webhook URLs on the settings page
4. THE Frontend SHALL provide a mechanism on the settings page to copy the webhook URL for each Source to the clipboard
5. WHEN the Firestore listener connection status changes, THE Frontend SHALL update the displayed connection status on the settings page within 2 seconds

### Requirement 13: Error Handling and Resilience

**User Story:** As a user, I want the app to handle errors gracefully, so that a single failed notification does not disrupt the entire experience.

#### Acceptance Criteria

1. IF a Source_Adapter throws an error while parsing a webhook payload, THEN THE Cloud_Functions SHALL log the error with the source type and a sanitized excerpt of the payload, and respond with HTTP 422
2. IF the Frontend fails to render a Notification on the Glasses_UI, THEN THE Frontend SHALL skip the failed Notification and continue displaying the remaining Notifications
3. IF the BLE connection between the iPhone and the G2 glasses is lost, THEN THE Frontend SHALL queue incoming Notifications and display them when the connection is restored
4. WHEN the Frontend encounters a rendering error during `rebuildPageContainer` or `textContainerUpgrade`, THE Frontend SHALL retry the operation once after a 500-millisecond delay before skipping the update
