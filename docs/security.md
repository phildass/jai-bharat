# Security & Privacy Model

## Overview

Jai Bharat implements a comprehensive security and privacy model to protect user data and ensure compliance with Indian data protection regulations.

## Security Architecture

### 1. Authentication & Authorization

#### Single Sign-On (SSO)
- OAuth 2.0 protocol
- JWT (JSON Web Tokens) for session management
- Token expiry: 1 hour (access token)
- Token refresh mechanism
- Secure token storage using encrypted AsyncStorage

#### Authentication Flow
```
1. User enters credentials
2. Server validates credentials
3. Server issues JWT tokens (access + refresh)
4. App stores tokens securely (encrypted)
5. All API calls include access token in header
6. Token auto-refresh before expiry
```

#### Authorization Levels
- **Public**: No authentication required
- **Authenticated**: Valid JWT token required
- **Module**: Module-specific permissions required
- **Admin**: Administrative access required

### 2. Data Security

#### Data Classification

**Level 1 - Public Data**
- Job postings
- Study materials
- Public exam information
- No special protection required

**Level 2 - Personal Data**
- User profile (name, email, phone)
- Preferences
- Progress tracking
- Encrypted at rest and in transit

**Level 3 - Sensitive Data**
- Government ID numbers (Aadhaar, PAN)
- Educational certificates
- Category certificates
- DigiLocker integration only (no local storage)

**Level 4 - Critical Data**
- Payment information
- OTP/passwords
- Never stored locally
- Ephemeral sessions only

#### Encryption

**In Transit**
- TLS 1.3 for all API communications
- Certificate pinning
- No fallback to HTTP

**At Rest**
- AES-256 encryption for local data
- Encrypted AsyncStorage for tokens
- No plaintext sensitive data storage

### 3. DigiLocker Integration

#### Document Verification
```
User → App → DigiLocker OAuth
            ↓
      User authorizes
            ↓
      App receives token
            ↓
      Fetch documents from DigiLocker
            ↓
      Display in app (no local storage)
```

#### Security Features
- Documents never stored locally
- Real-time verification via DigiLocker API
- Government-issued document validation
- Automatic expiry handling

### 4. Ephemeral Sessions

For form submissions (job applications):

```
1. User fills application form
2. Data stored in memory only
3. Form submitted to server
4. Server processes and forwards to authority
5. Data wiped from memory immediately
6. Receipt sent via WhatsApp
7. No local persistence
```

### 5. API Security

#### Authentication
- API keys for server-to-server
- JWT tokens for user-to-server
- Rate limiting per user/IP

#### Request Security
- Request signing (HMAC)
- Timestamp validation (prevent replay attacks)
- Nonce usage (prevent duplicate requests)

#### Response Security
- Response signing
- Content-Type validation
- XSS prevention headers

### 6. Network Security

#### HTTPS Only
- All communications over HTTPS
- Certificate pinning
- HSTS enforcement

#### API Gateway
- Centralized entry point
- DDoS protection
- Rate limiting
- Request validation

#### VPN Support
- Works through VPNs
- No geofencing restrictions (except for location-based features)

### 7. Mobile App Security

#### Code Security
- Code obfuscation
- ProGuard/R8 (Android)
- BitCode (iOS)
- No hardcoded secrets

#### Root/Jailbreak Detection
- Detect rooted/jailbroken devices
- Warn user about security risks
- Optional: Block sensitive operations

#### Secure Storage
- Android: Keystore
- iOS: Keychain
- Encrypted SharedPreferences/UserDefaults

### 8. Third-Party Integration Security

#### API Setu, OGD, NCS
- OAuth 2.0 authentication
- API keys stored server-side
- No client-side secrets

#### WhatsApp Business API
- Server-side integration only
- Message templates pre-approved
- No user data in logs

#### Bhashini API
- Voice data encrypted in transit
- No permanent storage of voice recordings
- Privacy-preserving NLP

## Privacy Model

### 1. Data Collection

#### What We Collect
- **Account Data**: Name, email, phone, password (hashed)
- **Profile Data**: Education, age, category, location
- **Usage Data**: App usage, feature usage, performance
- **Progress Data**: Study progress, test scores
- **Location Data**: State, district, taluk (with consent)

#### What We Don't Collect
- Precise GPS coordinates (unless explicitly needed)
- Contacts list
- SMS messages
- Call logs
- Other apps data

### 2. Data Usage

#### Primary Uses
- Provide job recommendations
- Personalized study plans
- Progress tracking
- Eligibility matching

#### Secondary Uses
- App improvement (anonymized analytics)
- Feature usage analysis
- Performance optimization

#### Prohibited Uses
- Sale to third parties
- Behavioral advertising
- Sharing with employers without consent

### 3. Data Sharing

#### With User Consent
- DigiLocker: Document verification
- Job portals: Application submission
- WhatsApp: Notifications (opt-in)

#### Without User Consent (Allowed)
- Legal compliance
- Security purposes
- Anonymized analytics

#### Never Shared
- Passwords
- OTPs
- Payment information
- Category certificates (except via DigiLocker)

### 4. User Rights

#### Right to Access
- View all collected data
- Export data in JSON format
- Request data report (within 30 days)

#### Right to Rectification
- Update profile information
- Correct inaccurate data
- Update preferences

#### Right to Deletion
- Delete account
- Remove all personal data
- Retain anonymized data for analytics

#### Right to Portability
- Export data in machine-readable format
- Transfer to another service

#### Right to Opt-Out
- Disable notifications
- Disable voice features
- Disable location features

### 5. Data Retention

#### Active Users
- Profile data: Retained while account active
- Progress data: Retained while account active
- Usage data: 2 years

#### Inactive Users
- After 1 year: Notification to reactivate
- After 2 years: Account marked for deletion
- After 2.5 years: Account deleted

#### Deleted Accounts
- Personal data: Deleted immediately
- Anonymized data: Retained for analytics
- Backups: Purged within 90 days

### 6. Cookies & Tracking

#### First-Party Cookies
- Session management
- Preferences
- Security tokens

#### Third-Party Cookies
- Analytics (Google Analytics - anonymized)
- No advertising cookies

#### Mobile Identifiers
- Device ID for authentication
- No IDFA/AAID sharing with advertisers

### 7. Children's Privacy

- App not intended for users under 13
- Age verification during signup
- Parental consent required for 13-17
- Special protections for minor's data

### 8. Regional Compliance

#### India-Specific
- Compliance with Digital Personal Data Protection Act (DPDPA)
- Data localization (stored in India)
- RBI guidelines for payments
- Aadhaar Act compliance

#### International
- Ready for GDPR compliance (for future expansion)
- Privacy Shield framework awareness

## Security Best Practices

### For Users

1. **Strong Password**
   - Minimum 8 characters
   - Mix of letters, numbers, symbols
   - No common passwords

2. **Enable Two-Factor Authentication**
   - OTP via SMS
   - Future: TOTP support

3. **Keep App Updated**
   - Regular security patches
   - New features and improvements

4. **Device Security**
   - Lock screen enabled
   - Avoid rooted/jailbroken devices
   - Install from official stores only

5. **Be Cautious**
   - Don't share OTPs
   - Verify URLs before clicking
   - Report suspicious activity

### For Developers

1. **Code Review**
   - Mandatory peer review
   - Security-focused review
   - Automated security scanning

2. **Dependency Management**
   - Regular updates
   - Vulnerability scanning
   - Audit third-party libraries

3. **Testing**
   - Security testing
   - Penetration testing (annual)
   - Vulnerability assessment

4. **Logging**
   - No sensitive data in logs
   - Audit logs for critical operations
   - Log retention: 90 days

5. **Incident Response**
   - Security incident plan
   - Breach notification within 72 hours
   - Regular drills

## Incident Response Plan

### 1. Detection
- Automated monitoring
- User reports
- Security alerts

### 2. Assessment
- Severity classification
- Impact analysis
- Root cause identification

### 3. Containment
- Isolate affected systems
- Prevent further damage
- Preserve evidence

### 4. Eradication
- Remove threat
- Patch vulnerabilities
- Update security controls

### 5. Recovery
- Restore services
- Verify integrity
- Monitor for recurrence

### 6. Communication
- Notify affected users (within 72 hours)
- Regulatory notification
- Public disclosure (if required)

### 7. Post-Incident
- Incident report
- Lessons learned
- Update procedures

## Compliance

### Audits
- Annual security audit
- Quarterly vulnerability assessment
- Continuous monitoring

### Certifications (Planned)
- ISO 27001 (Information Security)
- SOC 2 Type II
- India-specific certifications

### Regular Reviews
- Privacy policy: Quarterly
- Security controls: Monthly
- Access controls: Weekly

## Contact

### Security Issues
- Email: security@jaibharat.cloud
- Bug Bounty: Coming soon
- Response time: 24 hours

### Privacy Concerns
- Email: privacy@jaibharat.cloud
- DPO: dpo@jaibharat.cloud
- Response time: 7 days

### User Support
- Email: support@jaibharat.cloud
- Phone: +91-XXXX-XXXXXX
- Response time: 48 hours

---

**Last Updated**: February 2026
**Version**: 1.0
**Review Date**: May 2026
