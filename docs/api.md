# Jai Bharat API Documentation

## Base URL

```
Production: https://api.jaibharat.cloud/v1
Staging: https://api-staging.jaibharat.cloud/v1
Development: http://localhost:3000/v1
```

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Common Headers

```
Content-Type: application/json
Accept: application/json
X-API-Version: 1.0
X-Platform: android|ios|web
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

Common error codes:
- `UNAUTHORIZED`: Invalid or missing authentication
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `RATE_LIMIT`: Too many requests

## API Endpoints

### Authentication

#### POST /auth/register
Register a new user

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91-9876543210",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+91-9876543210"
  },
  "token": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 3600
  }
}
```

#### POST /auth/login
Login with email/password

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:** Same as register

#### POST /auth/login/otp
Request OTP for phone login

**Request:**
```json
{
  "phone": "+91-9876543210"
}
```

**Response:**
```json
{
  "message": "OTP sent successfully",
  "expiresIn": 300
}
```

#### POST /auth/login/otp/verify
Verify OTP and login

**Request:**
```json
{
  "phone": "+91-9876543210",
  "otp": "123456"
}
```

**Response:** Same as register

#### POST /auth/refresh
Refresh access token

**Request:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGci...",
  "expiresIn": 3600
}
```

#### POST /auth/logout
Logout (invalidate tokens)

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### User Profile

#### GET /users/me
Get current user profile

**Response:**
```json
{
  "id": "user_123",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+91-9876543210",
  "avatar": "https://...",
  "preferences": {
    "language": "hi",
    "voiceEnabled": true,
    "notificationsEnabled": true,
    "targetExams": ["ssc", "upsc"]
  },
  "eligibility": {
    "education": ["12th", "graduate"],
    "age": 25,
    "category": "GEN",
    "state": "Maharashtra",
    "district": "Pune"
  },
  "location": {
    "state": "Maharashtra",
    "district": "Pune",
    "taluk": "Pune City"
  }
}
```

#### PUT /users/me
Update user profile

**Request:**
```json
{
  "name": "John Smith",
  "preferences": {
    "language": "en",
    "targetExams": ["ssc", "banking"]
  }
}
```

**Response:** Updated user object

#### GET /users/me/documents
Get DigiLocker documents

**Response:**
```json
{
  "documents": [
    {
      "id": "doc_123",
      "type": "aadhaar",
      "name": "Aadhaar Card",
      "uri": "digilocker://...",
      "verifiedOn": "2026-02-19T05:00:00Z"
    }
  ]
}
```

### Jobs

#### GET /jobs
Get job listings

**Query Parameters:**
- `state`: Filter by state
- `district`: Filter by district
- `taluk`: Filter by taluk
- `authority`: Filter by authority (Central/State/Local)
- `serviceGroup`: Filter by service group (A/B/C/D)
- `sector`: Filter by sector
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```json
{
  "jobs": [
    {
      "id": "job_123",
      "title": "Police Constable",
      "organization": "Maharashtra Police",
      "authority": "State",
      "serviceGroup": "C",
      "sector": "Law Enforcement",
      "location": {
        "state": "Maharashtra",
        "district": "Satara",
        "taluk": "Karad"
      },
      "eligibility": {
        "education": ["12th"],
        "ageMin": 18,
        "ageMax": 25,
        "categories": ["GEN", "OBC", "SC", "ST"]
      },
      "salary": {
        "min": 25000,
        "max": 40000
      },
      "lastDate": "2026-03-31T23:59:59Z",
      "notificationUrl": "https://...",
      "source": "API_SETU"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### GET /jobs/:id
Get job details

**Response:** Single job object

#### POST /jobs/check-eligibility
Check eligibility for jobs

**Request:**
```json
{
  "jobIds": ["job_123", "job_456"]
}
```

**Response:**
```json
{
  "results": [
    {
      "jobId": "job_123",
      "matchType": "Perfect Match",
      "score": 95,
      "reasons": [
        "✓ Education requirement met",
        "✓ Age eligible"
      ],
      "gaps": [],
      "recommendations": [
        "🎯 Start preparing immediately!"
      ]
    }
  ]
}
```

#### POST /jobs/search
Search jobs with natural language

**Request:**
```json
{
  "query": "Uniform jobs for 12th pass in Karad Taluk",
  "language": "hi"
}
```

**Response:** Same as GET /jobs

#### POST /jobs/subscribe
Subscribe to job alerts

**Request:**
```json
{
  "filters": {
    "state": "Maharashtra",
    "district": "Satara",
    "serviceGroup": "C"
  },
  "notificationChannel": "whatsapp"
}
```

**Response:**
```json
{
  "subscriptionId": "sub_123",
  "message": "Subscribed successfully"
}
```

### Content

#### GET /content/topics
Get content topics

**Query Parameters:**
- `category`: Filter by category (history/polity/geography/etc.)
- `moduleId`: Filter by applicable module
- `page`, `limit`: Pagination

**Response:**
```json
{
  "topics": [
    {
      "contentId": "content_123",
      "title": "Ancient Indian History",
      "category": "history",
      "contentType": "text",
      "tags": ["ancient-india", "harappa"],
      "applicableFor": ["learn-govt-jobs", "learn-ias"]
    }
  ],
  "pagination": {}
}
```

#### GET /content/:id
Get content details

**Response:**
```json
{
  "contentId": "content_123",
  "title": "Ancient Indian History",
  "category": "history",
  "contentType": "text",
  "content": {
    "text": "...",
    "images": [],
    "videos": []
  },
  "tags": ["ancient-india"],
  "applicableFor": ["learn-govt-jobs", "learn-ias"]
}
```

### Progress

#### GET /progress
Get user progress

**Query Parameters:**
- `category`: Filter by category
- `moduleId`: Filter by module

**Response:**
```json
{
  "progress": [
    {
      "topicId": "polity-101",
      "topicName": "Constitution Basics",
      "category": "polity",
      "masteryLevel": 85,
      "completedOn": "2026-02-19T05:00:00Z",
      "sourceModule": "learn-govt-jobs",
      "applicableModules": ["learn-ias"]
    }
  ],
  "overall": {
    "masteryLevel": 72,
    "topicsCompleted": 15,
    "topicsTotal": 50
  }
}
```

#### POST /progress
Update progress

**Request:**
```json
{
  "topicId": "polity-101",
  "masteryLevel": 90
}
```

**Response:** Updated progress object

#### GET /progress/category-mastery
Get category-wise mastery

**Response:**
```json
{
  "categories": {
    "history": 85,
    "polity": 72,
    "geography": 68
  }
}
```

### Voice

#### POST /voice/transcribe
Transcribe voice to text

**Request:** multipart/form-data
- `audio`: Audio file
- `language`: Language code (hi/en/etc.)

**Response:**
```json
{
  "text": "मुझे करद तालुका में नौकरियां चाहिए",
  "language": "hi",
  "confidence": 0.95
}
```

#### POST /voice/search-jobs
Voice-based job search

**Request:** multipart/form-data
- `audio`: Audio file
- `language`: Language code

**Response:** Same as GET /jobs

#### POST /voice/synthesize
Convert text to speech

**Request:**
```json
{
  "text": "Welcome to Jai Bharat",
  "language": "hi"
}
```

**Response:**
```json
{
  "audioUrl": "https://...",
  "duration": 3.5
}
```

### Mock Tests

#### GET /mock-tests
Get available mock tests

**Query Parameters:**
- `moduleId`: Filter by module
- `examType`: Filter by exam type

**Response:**
```json
{
  "tests": [
    {
      "testId": "test_123",
      "title": "SSC CGL Mock Test 1",
      "examType": "ssc-cgl",
      "duration": 3600,
      "questions": 100,
      "difficulty": "medium"
    }
  ]
}
```

#### GET /mock-tests/:id
Get mock test details

**Response:** Test object with questions

#### POST /mock-tests/:id/submit
Submit mock test answers

**Request:**
```json
{
  "answers": {
    "q1": "option_a",
    "q2": "option_c"
  }
}
```

**Response:**
```json
{
  "score": 85,
  "correct": 85,
  "wrong": 10,
  "unanswered": 5,
  "timeTaken": 3200,
  "percentile": 92,
  "analysis": {}
}
```

### Analytics

#### GET /analytics/dashboard
Get user dashboard analytics

**Response:**
```json
{
  "stats": {
    "studyStreak": 15,
    "totalStudyTime": 72000,
    "topicsCompleted": 25,
    "testsAttempted": 10,
    "averageScore": 78
  },
  "recentActivity": [],
  "recommendations": []
}
```

## Rate Limits

- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour
- Premium: 5000 requests/hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1645257600
```

## Webhooks

Subscribe to events via webhooks:

### Events
- `job.created`: New job posted
- `job.deadline`: Job deadline approaching
- `test.completed`: User completed test
- `progress.milestone`: User reached milestone

### Configuration
POST /webhooks to configure webhook endpoints.

## SDKs & Libraries

- JavaScript/TypeScript: `@jai-bharat/sdk-js`
- React Native: Built-in support
- Python: `jai-bharat-sdk` (planned)

## Support

- API Status: https://status.jaibharat.cloud
- Documentation: https://docs.jaibharat.cloud
- Support: api@jaibharat.cloud
