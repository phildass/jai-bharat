# Jai Bharat Super-App Architecture

## Overview

Jai Bharat is a modular super-app that integrates multiple mini-apps (Learn Govt Jobs and Learn IAS) into a unified platform. This document describes the architecture and design principles.

## Architecture Principles

### 1. Modular Mini-App System

The app follows a **Shell + Feature Modules** architecture:

- **Shell (Parent)**: Core functionality, navigation, SSO, and shared services
- **Feature Modules**: Independent mini-apps with their own functionality
  - Learn Govt Jobs
  - Learn IAS
  - Future modules can be added

### 2. Module Independence

Each module:
- Has its own package.json and dependencies
- Exposes a configuration contract (ModuleConfig)
- Can be developed, tested, and deployed independently
- Registers itself with the Shell at runtime

### 3. Shared Services

Services shared across all modules:
- **Authentication Service**: SSO with JWT tokens
- **Content Sync Service**: Shared content management
- **Progress Sync Service**: Cross-module progress tracking
- **API Integration Service**: External API integrations
- **Voice Service**: Bhashini-based voice interface
- **Location Service**: Geofencing and local job discovery
- **Eligibility AI Service**: AI-powered eligibility checking

## Directory Structure

```
jai-bharat/
├── src/
│   ├── core/                      # Core Shell functionality
│   │   ├── auth/                 # Authentication & SSO
│   │   │   └── AuthService.ts
│   │   ├── navigation/           # Navigation system
│   │   └── shell/                # Shell container
│   │
│   ├── modules/                  # Module interfaces & registry
│   │   ├── interfaces.ts         # Module contracts
│   │   └── ModuleRegistry.ts     # Module registration
│   │
│   ├── services/                 # Shared services
│   │   ├── api/                  # API integrations
│   │   │   ├── APIIntegrationService.ts
│   │   │   └── EligibilityAIService.ts
│   │   ├── sync/                 # Sync engines
│   │   │   ├── ContentSyncService.ts
│   │   │   └── ProgressSyncService.ts
│   │   ├── voice/                # Voice interface
│   │   │   └── VoiceService.ts
│   │   └── location/             # Location services
│   │       └── LocationService.ts
│   │
│   └── shared/                   # Shared components
│       ├── components/           # UI components
│       ├── utils/                # Utilities
│       └── hooks/                # React hooks
│
├── modules/                      # Feature modules
│   ├── learn-govt-jobs/         # SSC, Banking, Railways, Police
│   │   ├── package.json
│   │   ├── index.ts             # Module config & exports
│   │   └── screens/             # Module screens
│   │
│   └── learn-ias/               # UPSC/State PSC
│       ├── package.json
│       ├── index.ts
│       └── screens/
│
├── config/                       # Configuration files
├── docs/                         # Documentation
└── package.json                  # Root package
```

## Module Interface Contract

Every module must implement the `ModuleConfig` interface:

```typescript
interface ModuleConfig {
  id: string;                    // Unique module ID
  name: string;                  // Display name
  version: string;               // Semantic version
  description: string;           // Module description
  icon: string;                  // Module icon
  routes: ModuleRoute[];         // Navigation routes
  services?: ModuleService[];    // Module-specific services
  permissions?: string[];        // Required permissions
}
```

## Data Flow

### 1. Authentication Flow
```
User → Login Screen → AuthService
                   ↓
            Store JWT Token
                   ↓
     Update AuthState (Observable)
                   ↓
      Notify All Modules
```

### 2. Content Sync Flow
```
Module A → Creates/Updates Content
                   ↓
         ContentSyncService
                   ↓
    Store with applicableFor tags
                   ↓
         Available in Module B
```

### 3. Progress Sync Flow
```
User completes topic in Module A
                   ↓
        ProgressSyncService
                   ↓
    Auto-sync to applicable modules
                   ↓
    Topic marked as mastered in Module B
```

## Navigation Architecture

### Triple-Gate Navigation

After login, users see three entry points:

1. **Jai Bharat Core** (Job Alerts)
   - Real-time job notifications
   - Hyper-local discovery
   - Quick apply features

2. **Learn Govt Jobs** (Foundation)
   - SSC, Banking, Railways, Police
   - Speed-driven MCQ practice
   - Quick preparation mode

3. **Learn IAS** (Elite)
   - UPSC/State PSC
   - Deep analysis & essays
   - Rigorous preparation

### Navigation Implementation

```typescript
// Bottom tabs for main sections
<BottomTabs>
  <Tab name="Jobs" icon="briefcase" />
  <Tab name="Learn" icon="book" />
  <Tab name="Profile" icon="user" />
</BottomTabs>

// Within Learn tab, module selection
<ModulePicker>
  <Module id="learn-govt-jobs" />
  <Module id="learn-ias" />
</ModulePicker>
```

## Data Management

### User Profile

Shared across all modules via SSO:
- Basic info (name, email, phone)
- Preferences (language, notifications)
- Documents (DigiLocker integration)
- Eligibility criteria
- Location data

### Content Storage

Content is stored once with tags:
```typescript
{
  contentId: "history-101",
  category: "history",
  applicableFor: ["learn-govt-jobs", "learn-ias"],
  tags: ["ancient-india", "mcq", "essay"]
}
```

### Progress Tracking

Progress syncs across modules:
```typescript
{
  topicId: "polity-101",
  masteryLevel: 85,
  sourceModule: "learn-govt-jobs",
  applicableModules: ["learn-ias"]
}
```

## Security Architecture

### Authentication
- OAuth 2.0 + JWT tokens
- Token refresh mechanism
- Secure token storage (encrypted AsyncStorage)

### API Security
- HTTPS only
- API key authentication
- Rate limiting
- Request signing

### Data Privacy
- DigiLocker for document verification
- Ephemeral sessions for form submissions
- Data wiped post-submission
- No sensitive data in logs

### Document Security
- Documents synced via DigiLocker API
- No local storage of sensitive documents
- Verification via government systems

## API Integration

### External APIs

1. **API Setu**: Government job data
2. **Open Government Data (OGD)**: Public job postings
3. **National Career Service (NCS)**: Career information
4. **DigiLocker**: Document verification
5. **WhatsApp Business API**: Notifications
6. **Bhashini API**: Voice/translation

### API Architecture

```typescript
APIIntegrationService
├── fetchJobsFromAPISetu()
├── fetchJobsFromOGD()
├── fetchJobsFromNCS()
├── verifyDocument() → DigiLocker
├── sendWhatsAppNotification()
└── parsePDFNotification() → AI
```

## AI/ML Integration

### Eligibility AI Filter

Uses Gemini/BharatGPT for:
- Eligibility checking
- Category-specific relaxations
- Age criteria calculations
- Match type determination

Output:
- **Perfect Match**: 85-100% score
- **Potential Match**: 60-84% score
- **Future Match**: 40-59% score
- **No Match**: <40% score

### AI Features
- Conversational eligibility queries
- Voice-based job search
- PDF notification parsing
- Mock interview bot
- Essay evaluation

## Scalability Considerations

### Module Loading
- Lazy loading of modules
- Code splitting by module
- Dynamic imports

### Caching Strategy
- Content cached locally
- Progressive Web App (PWA) support
- Offline mode for core features

### Performance
- React Native optimization
- Image lazy loading
- Virtual lists for large datasets
- Debounced search

## Deployment Architecture

```
[Mobile App]
    ↓
[API Gateway]
    ↓
[Microservices]
├── Auth Service
├── Content Service
├── Jobs Service
├── User Service
└── Analytics Service
    ↓
[Data Layer]
├── PostgreSQL (User data)
├── MongoDB (Content)
└── Redis (Cache)
```

## Future Enhancements

1. **More Modules**
   - Learn State PSC
   - Learn Defence
   - Learn Teaching Jobs

2. **Advanced Features**
   - AR/VR for interview practice
   - Peer learning groups
   - Live classes integration

3. **Platform Expansion**
   - Web app (React.js)
   - Desktop app (Electron)
   - WhatsApp bot

4. **AI Enhancements**
   - Personalized study plans
   - Predictive analytics
   - Success probability scoring
