# Jai Bharat – Voice-First Mobile Implementation Plan

> **Stack**: React Native (iOS + Android) · Node.js/Express backend · Google STT / TTS · Gemini intent parsing (v2) · Phone OTP (SMS/WhatsApp) · Self-hosted speaker verification

---

## Part A – Sprint-by-Sprint Roadmap

### Week 1 – Foundation: Phone Auth + PTT Voice MVP

**Milestone**: User can sign in with phone OTP; a push-to-talk button captures speech, sends transcript to backend, and reads a spoken response back.

**Acceptance Criteria**
- [ ] `POST /api/auth/start` sends a 6-digit OTP (logged to console in dev) with rate-limit (5/15 min per IP).
- [ ] `POST /api/auth/verify-otp` validates OTP hash, upserts user row, starts 24-hour trial keyed to server time, returns `{token, refreshToken, user, entitlements}`.
- [ ] `GET /api/auth/me` returns user + live entitlements using Bearer auth.
- [ ] `PhoneAuthScreen` (two-step: phone → OTP) launches app flow on success.
- [ ] `PushToTalkButton` (press-hold to speak, release to submit) uses `react-native-voice` on-device STT.
- [ ] `VoiceSessionService` starts a session, submits transcript, receives `{intent, response, ttsText}`.
- [ ] Trial banner shows hours remaining; expired trial blocks the app.
- [ ] No always-on microphone. No raw audio stored.

**Engineering Tasks**
| # | Task | Owner | Est. | Dep |
|---|------|-------|------|-----|
| 1.1 | `POST /api/auth/start` – OTP generation + hash storage | Backend | S | — |
| 1.2 | `POST /api/auth/verify-otp` – validate + upsert user + start trial | Backend | M | 1.1 |
| 1.3 | `GET /api/auth/refresh`, `GET /api/auth/me` | Backend | S | 1.2 |
| 1.4 | `PhoneAuthScreen.tsx` – 2-step phone + OTP UI | Mobile | S | 1.1, 1.2 |
| 1.5 | Update `AuthService.loginWithOTP` → real API | Mobile | S | 1.2 |
| 1.6 | `PushToTalkService.ts` – record/stop/cancel via `react-native-voice` | Mobile | M | — |
| 1.7 | `POST /api/voice/session/start`, `POST /api/voice/command` | Backend | S | 1.2 |
| 1.8 | `VoiceSessionService.ts` – state machine (idle→starting→active→executing) | Mobile | M | 1.7 |
| 1.9 | `PushToTalkButton.tsx` – animated PTT button + partial transcript display | Mobile | M | 1.6, 1.8 |
| 1.10 | DB migrations: `phone_otps`, `voice_sessions` tables | Backend | S | — |

---

### Week 2–3 – Voice Enrollment, Entitlements, Error Resilience

**Milestone**: Speaker enrollment flow works end-to-end; entitlement middleware enforces trial/subscription gates; intermittent network handled gracefully with spoken error messages.

**Acceptance Criteria**
- [ ] Speaker enrollment: 3-phrase capture → embedding stored (no raw audio retained by default).
- [ ] `POST /api/voice/verify` returns `{verified, confidence}` with threshold ≥ 0.85.
- [ ] Step-up auth: high-risk actions require voice + OTP spoken OR device biometrics.
- [ ] Network offline → spoken error message + UI fallback (retry button).
- [ ] Barge-in: user pressing PTT cancels any active TTS playback.
- [ ] Auth token auto-refresh on 401; graceful re-login prompt on refresh failure.

**Engineering Tasks**
| # | Task | Owner | Est. | Dep |
|---|------|-------|------|-----|
| 2.1 | `POST /api/voice/enroll/start`, `POST /api/voice/enroll/finish` | Backend | M | 1.2 |
| 2.2 | `POST /api/voice/verify` – cosine similarity on float32 embeddings | Backend | M | 2.1 |
| 2.3 | `voice_enrollments` DB table migration | Backend | S | — |
| 2.4 | Entitlements middleware (trial/subscription gate) | Backend | S | 1.3 |
| 2.5 | Voice enrollment UI flow (3 prompts + progress) | Mobile | M | 2.1 |
| 2.6 | Barge-in: cancel TTS on PTT press-down (`react-native-tts` or Sound) | Mobile | S | 1.9 |
| 2.7 | Network error handler: spoken error + retry UI | Mobile | S | 1.8 |
| 2.8 | Token auto-refresh in `AuthService.refreshAuth()` | Mobile | S | 1.3 |
| 2.9 | Device biometrics step-up (`react-native-biometrics`) | Mobile | M | 1.5 |
| 2.10 | Step-up middleware on high-risk endpoints | Backend | M | 1.2 |

---

### Week 4+ – Payments, Polish, CI

**Milestone**: Payment step-up enforced; push notification after payment; CI pipeline running unit + integration tests.

**Acceptance Criteria**
- [ ] `POST /api/payments/create` requires step-up auth (voice verify OR biometrics).
- [ ] Payment webhook sets `payment_status = 'active'`; sends OTP to phone.
- [ ] iOS: Keychain used for token storage (replaces AsyncStorage for sensitive tokens).
- [ ] Android: Keystore / EncryptedSharedPreferences for token storage.
- [ ] CI: unit tests pass; backend integration tests run against test DB.
- [ ] E2E (Detox) smoke test: login → PTT command → response.
- [ ] `apps/web` integration deferred – does not block mobile MVP.

---

## Part B – Repo-Aligned Backlog

### Mobile (iOS + Android Shared)

| ID | Task | Owner | Effort | Dep | DoD |
|----|------|-------|--------|-----|-----|
| M-1 | `PhoneAuthScreen` – phone+OTP two-step auth | Mobile | S | BE-1,2 | Screen renders; OTP flow completes; onSuccess fires |
| M-2 | `PushToTalkService` – record/stop/cancel | Mobile | M | — | Unit test passes; startRecording triggers onFinalResult |
| M-3 | `VoiceSessionService` – state machine | Mobile | M | BE-4 | State transitions tested; executeCommand returns ttsText |
| M-4 | `PushToTalkButton` – PTT with animation | Mobile | M | M-2,3 | Press-hold captures; release submits; status label updates |
| M-5 | `AuthService` – real phone OTP + token storage | Mobile | S | BE-1,2,3 | loginWithOTP stores tokens; loadStoredAuth restores state |
| M-6 | Barge-in TTS cancellation | Mobile | S | M-4 | PTT press cancels TTS audio |
| M-7 | Network error → spoken message | Mobile | S | M-3 | Offline returns spoken error; retry button visible |
| M-8 | Token auto-refresh on 401 | Mobile | S | M-5 | Expired token triggers refresh; re-login on failure |
| M-9 | Trial banner (hours remaining) | Mobile | S | BE-3 | Banner shows; expired trial shows paywall |
| M-10 | Voice enrollment UI (3 phrases) | Mobile | M | BE-5,6 | Enrollment completes; embedding stored |

### Mobile iOS-Specific

| ID | Task | Owner | Effort | Dep | DoD |
|----|------|-------|--------|-----|-----|
| iOS-1 | Microphone permission (`NSMicrophoneUsageDescription`) | Mobile-iOS | S | — | First launch prompts; denial shows friendly message |
| iOS-2 | Speech recognition permission (`NSSpeechRecognitionUsageDescription`) | Mobile-iOS | S | — | iOS Speech API authorized on first use |
| iOS-3 | Audio session category: `.playAndRecord` + `.allowBluetooth` | Mobile-iOS | S | — | Bluetooth headset works; call interruption handled |
| iOS-4 | Audio interruption handling (call incoming → pause recording) | Mobile-iOS | S | iOS-3 | Recording auto-stops; UI resets cleanly |
| iOS-5 | Keychain token storage (replace AsyncStorage for JWT/refresh) | Mobile-iOS | M | M-5 | Token stored in Keychain; removed on logout |
| iOS-6 | `LAContext` biometrics step-up (Face ID / Touch ID) | Mobile-iOS | M | — | Step-up triggers Face ID; fallback to OTP |
| iOS-7 | `react-native-voice` iOS config (enable partial results) | Mobile-iOS | S | M-2 | Partial words show while speaking |

### Mobile Android-Specific

| ID | Task | Owner | Effort | Dep | DoD |
|----|------|-------|--------|-----|-----|
| Droid-1 | `RECORD_AUDIO` permission request | Mobile-Android | S | — | Runtime prompt; denial handled gracefully |
| Droid-2 | `AudioManager` Bluetooth headset routing | Mobile-Android | S | — | Headset mic used when connected |
| Droid-3 | Audio focus: `AUDIOFOCUS_REQUEST_EXCLUSIVE` during recording | Mobile-Android | S | — | Other audio ducks; released on stop |
| Droid-4 | `EncryptedSharedPreferences` / Keystore for tokens | Mobile-Android | M | M-5 | Tokens encrypted at rest |
| Droid-5 | `BiometricPrompt` step-up | Mobile-Android | M | — | Step-up shows biometric prompt; fallback to OTP |
| Droid-6 | `react-native-voice` Android config (Google STT locale) | Mobile-Android | S | M-2 | Hindi (`hi-IN`) + English (`en-IN`) recognized |
| Droid-7 | Back-press handling during PTT | Mobile-Android | S | M-4 | Back press cancels recording cleanly |

### Backend Required for Mobile MVP

| ID | Endpoint | Owner | Effort | Dep | DoD |
|----|----------|-------|--------|-----|-----|
| BE-1 | `POST /api/auth/start` – generate + store OTP hash | Backend | S | DB-1 | Rate-limited; OTP logged (SMS TODO) |
| BE-2 | `POST /api/auth/verify-otp` – validate + upsert user + start trial | Backend | M | BE-1 | Trial `starts_at` = server time; returns entitlements |
| BE-3 | `GET /api/auth/me` + `POST /api/auth/refresh` | Backend | S | BE-2 | Bearer auth; returns user + entitlements |
| BE-4 | `POST /api/voice/session/start` + `POST /api/voice/command` | Backend | S | BE-2 | Session 30 min; intent parsed; ttsText returned |
| DB-1 | `phone_otps` migration (phone, otp_hash, expires_at, attempts) | Backend | S | — | Migration idempotent |
| DB-2 | `voice_sessions` migration (uuid, user_id, expires_at, is_active) | Backend | S | — | Migration idempotent |

### Backend Required for Voice Enrollment/Verify

| ID | Endpoint | Owner | Effort | Dep | DoD |
|----|----------|-------|--------|-----|-----|
| BE-5 | `POST /api/voice/enroll/start` – return enrollmentId + prompt | Backend | S | BE-2 | Returns spoken prompt text |
| BE-6 | `POST /api/voice/enroll/finish` – store base64 embedding | Backend | M | BE-5 | Embedding stored as bytea; no raw audio |
| BE-7 | `POST /api/voice/verify` – cosine similarity ≥ 0.85 | Backend | M | BE-6 | Returns `{verified, confidence}` |
| DB-3 | `voice_enrollments` migration (user_id, embedding bytea) | Backend | S | — | Migration idempotent |

### Security / Privacy

| ID | Task | Owner | Effort | Dep | DoD |
|----|------|-------|--------|-----|-----|
| SEC-1 | OTP: store SHA-256 hash only (never plaintext) | Backend | S | BE-1 | No plaintext OTP in DB |
| SEC-2 | OTP expiry 10 min; max 5 attempts; lockout + reset | Backend | S | BE-1 | Lockout after 5 bad attempts |
| SEC-3 | No raw audio storage; only embeddings + minimal metadata | Backend | S | BE-5,6 | Audit log confirms no audio blobs |
| SEC-4 | Voice sessions short-lived (30 min); auto-expire | Backend | S | BE-4 | Expired sessions rejected |
| SEC-5 | Refresh token rotation on every use (invalidate old) | Backend | S | BE-3 | Replay of old refresh token rejected |
| SEC-6 | Step-up for high-risk actions (payments, phone change) | Backend | M | BE-7 | Endpoint returns 403 without step-up |
| SEC-7 | CORS: production domains only (no wildcards) | Backend | S | — | Wildcard origin blocked |
| SEC-8 | Rate limits on all auth + voice endpoints | Backend | S | — | 429 returned on threshold breach |

### Payments / Trial

| ID | Task | Owner | Effort | Dep | DoD |
|----|------|-------|--------|-----|-----|
| PAY-1 | Trial: 24h from first OTP verify (server time) | Backend | S | BE-2 | `trial_starts_at` set at verify time |
| PAY-2 | `GET /api/entitlements` (or merged into `/me`) | Backend | S | BE-2 | Returns `{hasAccess, reason, hoursRemaining}` |
| PAY-3 | `POST /api/payments/create` – step-up required | Backend | M | BE-7,SEC-6 | Returns 403 without valid step-up proof |
| PAY-4 | Payment webhook from aienter.in – verify HMAC signature | Backend | S | PAY-3 | Invalid signature = 401 |
| PAY-5 | Subscription activation after webhook; OTP sent to phone | Backend | S | PAY-4 | `subscription_active = true`; OTP delivered |
| PAY-6 | Trial banner: update every 5 min; dismiss on subscribe | Mobile | S | PAY-2 | Hours displayed correctly; gone after payment |

---

## Part C – iOS & Android Specifics

### Audio Capture & Permissions

**iOS**
```xml
<!-- Info.plist -->
<key>NSMicrophoneUsageDescription</key>
<string>Jai Bharat uses your microphone for voice commands.</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>Jai Bharat uses speech recognition to understand your voice commands.</string>
```

Set AVAudioSession category in `AppDelegate.m` (or Swift):
```objc
[[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayAndRecord
    withOptions:AVAudioSessionCategoryOptionAllowBluetooth
    error:nil];
```

Handle interruptions (incoming call):
```objc
[[NSNotificationCenter defaultCenter]
  addObserver:self
  selector:@selector(handleAudioInterruption:)
  name:AVAudioSessionInterruptionNotification
  object:nil];
```

**Android** (`AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
```

Request runtime permission before first recording attempt.

### Streaming STT (Partial Results)

`react-native-voice` delivers partial results via `onSpeechPartialResults` callback. The `PushToTalkService` wires this to display live transcription above the PTT button. Full results are delivered via `onSpeechResults` on stop.

For production upgrade: replace with Google Cloud STT streaming gRPC via a backend proxy to avoid exposing API keys on device.

### TTS with Barge-In

- Play TTS using `react-native-tts` (or a custom sound player).
- On `onPressIn` of the PTT button, **cancel any active TTS** before starting recording.
- This ensures the user can interrupt the assistant at any time (natural conversation feel).

```typescript
// In PushToTalkButton.tsx handlePressIn:
import Tts from 'react-native-tts';
Tts.stop(); // Cancel TTS before recording
```

### Push-to-Talk UX (v1)

- **Press-and-hold** the 🎤 button to speak; **release** to submit.
- While recording: button turns red, pulses (scale 1.0→1.2), shows "Listening...".
- After release: shows "Processing..." while waiting for backend response.
- Partial transcript displayed above button in italic gray text.
- Error messages displayed as spoken TTS + inline text (2 seconds auto-dismiss).
- **Wake word** (v2): deferred to avoid always-on microphone.

### Secure Token Storage

| Platform | Storage | Implementation |
|----------|---------|----------------|
| iOS | Keychain | `react-native-keychain` – `setGenericPassword` / `getGenericPassword` |
| Android | Keystore | `react-native-keychain` with `BIOMETRY_STRONG` security level |
| Fallback | AsyncStorage | Dev/CI only; not for production tokens |

Migration plan: Week 4 – swap `AsyncStorage.setItem('jwt_token', ...)` to `Keychain.setGenericPassword(...)`.

### Device Biometrics Step-Up

```typescript
import ReactNativeBiometrics from 'react-native-biometrics';
const rnBiometrics = new ReactNativeBiometrics();

async function performStepUp(): Promise<boolean> {
  const { available } = await rnBiometrics.isSensorAvailable();
  if (!available) return false; // fallback to OTP
  const { success } = await rnBiometrics.simplePrompt({
    promptMessage: 'Confirm your identity to continue',
    cancelButtonText: 'Use OTP instead',
  });
  return success;
}
```

---

## Part D – API Contract

### Auth Endpoints

#### `POST /api/auth/start`
```json
// Request
{ "phone": "+919876543210" }

// Response 200
{ "message": "OTP sent to +919876543210" }

// Response 429
{ "error": "Too many OTP requests. Please try again later." }
```

#### `POST /api/auth/verify-otp`
```json
// Request
{ "phone": "+919876543210", "otp": "123456", "deviceId": "device-uuid-string" }

// Response 200
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": "uuid", "phone": "+919876543210", "name": null },
  "entitlements": {
    "hasAccess": true,
    "reason": "trial_active",
    "trialEndsAt": "2026-02-28T03:13:00.000Z",
    "hoursRemaining": 23.99
  }
}

// Response 400
{ "error": "Invalid OTP", "attemptsLeft": 4 }
```

#### `POST /api/auth/refresh`
```json
// Request
{ "refreshToken": "eyJhbGciOiJIUzI1NiJ9..." }

// Response 200
{ "token": "eyJ...", "refreshToken": "eyJ..." }
```

#### `GET /api/auth/me`
```
Authorization: Bearer {token}
```
```json
// Response 200
{
  "user": { "id": "uuid", "phone": "+91...", "full_name": "Ravi Kumar", "email": null },
  "entitlements": {
    "hasAccess": true,
    "reason": "trial_active",
    "hoursRemaining": 22.5,
    "isTrialActive": true
  }
}
```

### Voice Endpoints

#### `POST /api/voice/session/start`
```
Authorization: Bearer {token}
```
```json
// Request: empty body

// Response 200
{ "sessionId": "uuid", "expiresAt": "2026-02-27T03:43:00.000Z" }
```

#### `POST /api/voice/command`
```
Authorization: Bearer {token}
```
```json
// Request
{
  "sessionId": "uuid",
  "transcript": "मुझे SSC CGL के लिए नौकरी खोजें",
  "language": "hi-IN",
  "confidence": 0.92
}

// Response 200
{
  "intent": "search",
  "response": "Searching for SSC CGL jobs.",
  "ttsText": "Searching for SSC CGL jobs for you."
}
```

#### `POST /api/voice/enroll/start`
```
Authorization: Bearer {token}
```
```json
// Response 200
{
  "enrollmentId": "uuid",
  "promptText": "Please say: My voice is my password, verify me."
}
```

#### `POST /api/voice/enroll/finish`
```
Authorization: Bearer {token}
```
```json
// Request
{ "enrollmentId": "uuid", "embedding": "<base64-encoded float32 array>" }

// Response 200
{ "success": true }
```

#### `POST /api/voice/verify`
```
Authorization: Bearer {token}
```
```json
// Request
{ "embedding": "<base64-encoded float32 array>" }

// Response 200
{ "verified": true, "confidence": 0.923 }

// Response 200 (failed)
{ "verified": false, "confidence": 0.612 }
```

### Entitlements (merged into `/me`)

The `/api/auth/me` response includes `entitlements`:
```json
{
  "hasAccess": true,
  "reason": "trial_active" | "subscription_active" | "trial_expired",
  "hoursRemaining": 23.5,
  "isTrialActive": true
}
```

### Payments

#### `POST /api/payments/create` *(Week 4 – step-up required)*
```
Authorization: Bearer {token}
X-Step-Up-Proof: <biometric-signed-challenge OR spoken-OTP-token>
```
```json
// Request
{ "amount": 116.82, "currency": "INR" }

// Response 200
{ "paymentUrl": "https://aienter.in/payments/jaibharatpay?user_id=uuid&amount=116.82" }

// Response 403
{ "error": "Step-up authentication required", "stepUpRequired": true }
```

---

## Part E – Testing Strategy

### Unit Tests (Jest)

```
tests/unit/
├── VoiceSessionService.test.ts    – state machine transitions
├── PushToTalkService.test.ts      – startRecording/stopRecording/cancelRecording
├── AuthService.test.ts            – loginWithOTP, refreshAuth, loadStoredAuth
├── intentParser.test.js           – keyword matching (search/apply/status/help)
└── otpHash.test.js                – OTP hash generation + validation
```

**Example: State machine test**
```typescript
it('transitions idle→starting→active on startSession', async () => {
  const states: VoiceSessionState[] = [];
  const unsub = voiceSessionService.subscribe(s => states.push(s));
  await voiceSessionService.startSession('mock-token');
  expect(states).toEqual(['starting', 'active']);
  unsub();
});
```

### Integration Tests

```
tests/integration/
├── auth.test.js      – start → verify-otp → me → refresh (real DB or test DB)
├── voice.test.js     – session/start → command → enroll → verify
└── entitlements.test.js – trial window; expired trial; subscription active
```

Run against Docker Postgres: `DATABASE_URL=postgres://...` `npm test`.

### E2E Tests (Detox)

```
e2e/
├── auth-flow.e2e.js          – login → PTT → command → response
├── trial-expiry.e2e.js       – mock clock; trial expires → paywall shown
└── voice-noisy.e2e.js        – inject low-SNR audio; expect graceful spoken error
```

**Detox config**:
```json
{
  "devices": {
    "simulator": { "type": "ios.simulator", "device": { "type": "iPhone 15" } },
    "emulator": { "type": "android.emulator", "device": { "avdName": "Pixel_7_API_34" } }
  }
}
```

### Security Tests

| Scenario | How | Expected |
|----------|-----|----------|
| OTP brute force | 6 wrong OTPs | 429 after 5 attempts; locked |
| Replay attack on OTP | Re-use verified OTP | 400 `OTP already used` |
| Expired OTP | Submit after 10 min | 400 `OTP has expired` |
| Expired JWT | Call /me after 1h | 401 `Invalid or expired token` |
| Replay refresh token | Re-use old refresh token | 401 rejected |
| Voice replay attack | Re-submit recorded embedding | Confidence < 0.85; denied |
| Missing step-up on payment | No `X-Step-Up-Proof` | 403 |

### GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, 'copilot/**']
  pull_request:

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: jaibharat_test }
        options: --health-cmd pg_isready
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd backend && npm ci
      - run: cd backend && npm test
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/jaibharat_test
          JWT_SECRET: test-secret-32-chars-minimum

  mobile-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test -- --ci --passWithNoTests

  e2e-ios:
    runs-on: macos-latest
    needs: [mobile-unit]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npx detox build --configuration ios.sim.debug
      - run: npx detox test --configuration ios.sim.debug --headless

  e2e-android:
    runs-on: ubuntu-latest
    needs: [mobile-unit]
    steps:
      - uses: actions/checkout@v4
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          script: npx detox test --configuration android.emu.debug
```

*E2E jobs are parallel work; they do not block the first mobile sprint.*

---

## Part F – ASCII Flow Diagrams

### Flow 1: Activation + Trial Start

```
User                   Mobile App              Backend                    DB
 |                         |                      |                        |
 |  Enter phone number      |                      |                        |
 |------------------------>|                      |                        |
 |                         | POST /auth/start      |                        |
 |                         |--------------------->|                        |
 |                         |                      | generate OTP (6-digit) |
 |                         |                      | hash(OTP) → phone_otps |
 |                         |                      |----------------------->|
 |                         |                      | log OTP to console     |
 |                         |                      | (TODO: SMS/WhatsApp)   |
 |                         | 200 { message }      |                        |
 |                         |<---------------------|                        |
 |  "OTP sent to +91..."    |                      |                        |
 |<------------------------|                      |                        |
 |                         |                      |                        |
 |  Enter 6-digit OTP       |                      |                        |
 |------------------------>|                      |                        |
 |                         | POST /auth/verify-otp |                       |
 |                         |--------------------->|                        |
 |                         |                      | hash(otp) == stored?   |
 |                         |                      | upsert users row       |
 |                         |                      | INSERT user_subscriptions
 |                         |                      | trial_starts_at = NOW()|
 |                         |                      | trial_ends_at = NOW()+24h
 |                         |                      |----------------------->|
 |                         |                      | sign JWT(1h)           |
 |                         |                      | sign refreshToken(7d)  |
 |                         | 200 {token, refresh, |                        |
 |                         |  user, entitlements} |                        |
 |                         |<---------------------|                        |
 |                         | store tokens in      |                        |
 |                         | AsyncStorage/Keychain|                        |
 |  App main screen loads  |                      |                        |
 |<------------------------|                      |                        |
 |  Trial banner: 23h 59m  |                      |                        |
```

### Flow 2: Push-to-Talk Command Execution

```
User                   Mobile App              Backend
 |                         |                      |
 |  [Press & hold 🎤]       |                      |
 |------------------------>|                      |
 |                         | ensureSession()       |
 |                         | (if no active session)|
 |                         | POST /voice/session/start
 |                         |--------------------->|
 |                         | {sessionId,expiresAt}|
 |                         |<---------------------|
 |                         |                      |
 |                         | Voice.start('hi-IN') |
 |                         | [on-device STT]       |
 |  [Speaking: "SSC CGL..]  |                      |
 |  partial: "SSC..."       |                      |
 |  shown in UI             |                      |
 |                         |                      |
 |  [Release 🎤]            |                      |
 |------------------------>|                      |
 |                         | Voice.stop()         |
 |                         | onSpeechResults fires|
 |                         | transcript captured  |
 |                         |                      |
 |                         | POST /voice/command  |
 |                         | {sessionId,          |
 |                         |  transcript,         |
 |                         |  language,           |
 |                         |  confidence}         |
 |                         |--------------------->|
 |                         |                      | validate session
 |                         |                      | parseIntent(transcript)
 |                         |                      | → intent: "search"
 |                         |                      | buildResponse(intent)
 |                         | {intent:"search",    |
 |                         |  response:"Searching"|
 |                         |  ttsText:"Searching..|
 |                         |  for you."}          |
 |                         |<---------------------|
 |                         |                      |
 |                         | Tts.speak(ttsText)   |
 |  🔊 "Searching for       |                      |
 |     SSC CGL jobs..."    |                      |
 |<------------------------|                      |
 |                         | onCommand callback   |
 |                         | (navigate / display) |
```

---

## Database Migrations Required

```sql
-- phone_otps
CREATE TABLE IF NOT EXISTS phone_otps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       VARCHAR(20) NOT NULL,
  otp_hash    VARCHAR(64) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON phone_otps(phone);

-- voice_sessions
CREATE TABLE IF NOT EXISTS voice_sessions (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_sessions(user_id);

-- voice_enrollments
CREATE TABLE IF NOT EXISTS voice_enrollments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  embedding   BYTEA,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- users: add phone + device_id columns if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id VARCHAR(255);
```

---

## Implementation Constraints Summary

| Constraint | Approach |
|------------|----------|
| No always-on microphone | Push-to-talk only; `react-native-voice` starts/stops on demand |
| No continuous cloud streaming | On-device STT in v1; backend proxy for Google STT in v2 |
| No raw audio storage | Only float32 embeddings stored (voice_enrollments.embedding) |
| Intermittent network | Spoken error messages + retry UI; token refresh on 401 |
| Trial starts server-side | `trial_starts_at = NOW()` set in DB at OTP verify time |
| High-risk step-up | Biometrics OR spoken OTP; enforced by backend middleware |
| web app low priority | `apps/web` not modified; does not block mobile MVP |
