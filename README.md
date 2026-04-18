# EvenAware

A real-time notification hub for Even Realities G2 smart glasses. Aggregates alerts from multiple sources (PagerDuty, OpsGenie, custom webhooks) and displays them on the glasses display. Includes a companion admin web app for managing integrations and monitoring notifications live.

## Architecture

```
├── src/            # G2 glasses app (Vite + React + TypeScript)
├── admin/          # Admin web app (React SPA)
├── functions/      # Firebase Cloud Functions (webhook ingestion)
├── firestore.rules # Firestore security rules
└── docs/           # G2 SDK reference documentation
```

**Glasses App** — Runs in the Even Hub WebView on iPhone. Subscribes to Firestore for real-time notification updates and renders them on the G2's 576×288 micro-LED display via the SDK container model.

**Admin App** — Standalone React SPA for administrators. Manage notification source integrations (create, edit, enable/disable, delete) and view a live dashboard of incoming notifications.

**Cloud Functions** — Firebase Cloud Functions that receive webhooks from external sources, validate per-integration auth tokens, normalize payloads via pluggable source adapters, and write to Firestore.

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Firestore and Authentication enabled

### Glasses App

```bash
npm install
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173).

### Admin App

```bash
cd admin
npm install
npm run dev
```

Opens at [http://localhost:5174](http://localhost:5174).

Copy `admin/.env.example` to `admin/.env` and fill in your Firebase project config.

### Cloud Functions

```bash
cd functions
npm install
npm run build
```

To run locally with the Firebase emulator:

```bash
npm run serve
```

## Testing

```bash
# Glasses app tests
npm test

# Admin app tests
cd admin && npm test

# Cloud Functions tests
cd functions && npm test
```

## Simulator

Test the glasses app with the Even Hub simulator:

```bash
npx @evenrealities/evenhub-simulator@latest http://localhost:5173
```

## Build & Deploy

### Glasses App (Even Hub)

```bash
npm run build
npx @evenrealities/evenhub-cli pack app.json dist
```

Upload the generated `.ehpk` file to the Even Hub.

### Admin App (Firebase Hosting)

```bash
cd admin
npm run build
firebase deploy --only hosting
```

### Cloud Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

## Notification Sources

The system supports pluggable source adapters. Built-in adapters:

| Source | Type | Severity Mapping |
|--------|------|-----------------|
| PagerDuty | `pagerduty` | trigger→critical, acknowledge→warning, resolve→info |
| OpsGenie | `opsgenie` | P1/P2→critical, P3→warning, P4/P5→info |
| Custom | `custom` | Passed through from payload |

To add a new source, configure it in the Admin App — it generates a webhook URL and auth token automatically.

## Project Specs

Detailed requirements, design, and implementation tasks:

- `.kiro/specs/notification-hub/` — Glasses app notification hub
- `.kiro/specs/admin-app/` — Admin web application
