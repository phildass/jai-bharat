# Jai Bharat Super-App

**India Govt. Jobs. Everywhere. Anywhere. Every Job. From Peons to IAS and beyond**

## Overview

Jai Bharat is a Super-App and Digital Employment Concierge that seamlessly guides Indian youth through the government job preparation journey. It integrates multiple mini-apps into a unified platform with voice-first, local-first, and AI-first features.

## Architecture

### Modular Mini-App System

```
jai-bharat/                    # Parent Shell
├── src/
│   ├── core/                  # Core Shell functionality
│   │   ├── auth/             # SSO & Authentication
│   │   ├── navigation/       # Triple-gate navigation
│   │   └── shell/            # Shell container
│   ├── modules/              # Feature modules (symlinked)
│   ├── shared/               # Shared components & utilities
│   └── services/             # Backend services
├── modules/
│   ├── learn-govt-jobs/      # Foundation: SSC, Banking, Railways, Police
│   └── learn-ias/            # Elite: UPSC/State PSC prep
├── config/                   # Configuration files
└── docs/                     # Documentation
```

## Features

### 1. Triple-Gate Navigation
After login, users select their path:
- **Jai Bharat Core**: Real-time job alerts, hyper-local discovery
- **Learn Govt Jobs**: Speed-driven prep for SSC, Banking, Railways, Police
- **Learn IAS**: Deep analysis and essay writing for UPSC/State PSC

### 2. Unified Backend & SSO
- Single Sign-On across all modules
- User profile and documents (DigiLocker) persist across modules
- Payment history synchronized
- Progress portability between modules

### 3. Content Sync Engine
- Shared modules (History, Polity, Current Affairs) stored once
- Delivered adaptively based on exam type
- Progress in one module auto-syncs to relevant areas in others

### 4. Inclusive "Village First" Technology
- **Voice-to-Job Search**: Bhashini/NLP integration for voice queries
- **Hyper-local Discovery**: Geofencing for taluk/district-level jobs
- **Accessible UI**: Semantic icons, color coding, glanceable dashboard

### 5. Data Engine & API Integration
- API Setu, OGD, NCS for official job postings
- DigiLocker integration for user verification
- WhatsApp Business API for alerts and admit cards
- AI PDF parsing for recruitment notifications

### 6. Eligibility AI Filter
- AI-powered eligibility checking with Gemini/BharatGPT
- Category-specific relaxations, education, age criteria
- State/district quota rules
- Output: Perfect Match, Potential Match, Future Match

### 7. Mock-Test Bot & Career Ladder
- AI-powered mock interview and quiz bot
- Unified mock-test platform with adaptive papers
- Career ladder tracking from Group C/D to IAS

### 8. Security & Privacy
- DigiLocker integration for document management
- Ephemeral sessions for form submissions
- Data wiped post-submission
- WhatsApp receipt delivery

## Technology Stack

- **Frontend**: React Native (for cross-platform mobile)
- **Backend**: Node.js/Express (microservices architecture)
- **Authentication**: OAuth 2.0 + JWT for SSO
- **Database**: PostgreSQL (user data), MongoDB (content)
- **AI/ML**: Gemini API, BharatGPT integration
- **Voice**: Bhashini API
- **Location**: React Native Geolocation
- **APIs**: API Setu, Open Government Data, National Career Service

## Getting Started

### Prerequisites
- Node.js >= 16.x
- React Native CLI
- Android Studio / Xcode

### Installation

```bash
# Install dependencies
npm install

# Install module dependencies
cd modules/learn-govt-jobs && npm install
cd ../learn-ias && npm install
cd ../..

# Start the app
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## Module Integration

Modules are integrated as independent feature packages that can be loaded dynamically by the Shell. Each module exposes:

1. **Navigation Routes**: Registered with the Shell's navigation system
2. **Configuration**: Module metadata and capabilities
3. **Services**: Shared services for backend communication
4. **Components**: Reusable UI components

## Development

### Adding a New Module

1. Create module directory in `modules/`
2. Define module interface in `src/modules/interfaces.ts`
3. Register module in Shell configuration
4. Implement module routes and screens

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Documentation

- [Architecture Guide](docs/architecture.md)
- [Module Integration Guide](docs/module-integration.md)
- [API Documentation](docs/api.md)
- [Security & Privacy Model](docs/security.md)
- [Voice Integration Guide](docs/voice-integration.md)
- [Deployment Guide](docs/deployment.md)

## Roadmap

See [ROADMAP.md](docs/ROADMAP.md) for planned features and improvements.

## Web App & Backend – Environment Variables

### `apps/web` (Next.js)

Copy `apps/web/.env.local.example` to `apps/web/.env.local` and set:

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL (no trailing slash) | `https://api.jaibharat.cloud` |
| `NEXT_PUBLIC_APP_DOWNLOAD_URL` | APK / App Store download URL | `/downloads/jai-bharat.apk` |
| `NEXT_PUBLIC_PAYMENT_URL` | Payment page URL for the "Pay Now" button | `https://aienter.in/payments/jaibharat` |

### `backend` (Node/Express)

Copy `backend/.env.example` to `backend/.env` and set:

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes (production) |
| `PORT` | Server port (default `8080`) | No |
| `TEST_DATA_MODE` | Set to `true` to return in-memory seed jobs without a DB (testing only) | No |
| `CORS_ORIGINS` | Comma-separated extra CORS origins to allow | No |

> **Testing note**: Set `TEST_DATA_MODE=true` in the backend when no database is available. This returns 5 deterministic sample jobs for all job endpoints and is intended for development/testing only.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- Website: https://jaibharat.cloud
- Email: support@jaibharat.cloud
- Twitter: @JaiBharatApp

---

**Built with ❤️ for Bharat's Youth**
