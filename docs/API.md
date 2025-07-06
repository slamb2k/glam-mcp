# API Documentation - Slambed MCP

Complete API reference for integrating with Slambed MCP intelligent development assistant.

## 📋 Table of Contents

- [Authentication](#authentication)
- [MCP Tools API](#mcp-tools-api)
- [REST API](#rest-api)
- [WebSocket API](#websocket-api)
- [Learning System API](#learning-system-api)
- [Security API](#security-api)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)

## 🔐 Authentication

### API Key Authentication

```javascript
// Set API key in headers
const headers = {
  'Authorization': 'Bearer your-api-key-here',
  'Content-Type': 'application/json'
};
```

### Session-Based Authentication

```javascript
// Login to get session token
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'user@example.com',
    password: 'password'
  })
});

const { token } = await response.json();

// Use token in subsequent requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### MCP Authentication

```json
// In Claude Desktop config
{
  "mcpServers": {
    "slambed-mcp": {
      "env": {
        "SLAMBED_API_KEY": "your-api-key",
        "ANTHROPIC_API_KEY": "your-anthropic-key"
      }
    }
  }
}
```

---

## 🛠️ MCP Tools API

### Universal SLAM Tool

**Tool Name:** `slam`

```typescript
interface SlamRequest {
  command: string;           // Natural language command
  context?: string;          // Additional context
  options?: {
    priority?: 'low' | 'medium' | 'high';
    async?: boolean;         // Execute asynchronously
    preview?: boolean;       // Preview mode only
  };
}

interface SlamResponse {
  success: boolean;
  action: string;            // Action performed
  result: any;              // Tool-specific result
  suggestions?: string[];    // Related suggestions
  execution_time: number;   // Milliseconds
}
```

**Example:**
```javascript
// Via MCP
const result = await slam({
  command: "commit my changes with a good message",
  options: { priority: 'high' }
});

// Response
{
  "success": true,
  "action": "commit_generated",
  "result": {
    "message": "feat(auth): implement JWT authentication",
    "files": ["src/auth.js", "src/middleware/auth.js"]
  },
  "suggestions": ["Run tests", "Deploy to staging"],
  "execution_time": 1200
}
```

### Context Tool

**Tool Name:** `slam_context`

```typescript
interface ContextRequest {
  action: 'status' | 'analyze' | 'files' | 'git' | 'dependencies';
  options?: {
    detailed?: boolean;
    type?: string;
    include?: string[];
    exclude?: string[];
  };
}

interface ContextResponse {
  success: boolean;
  project: ProjectInfo;
  git: GitInfo;
  files: FileInfo;
  dependencies: DependencyInfo;
  health: HealthInfo;
}
```

**Example:**
```javascript
const context = await slam_context({
  action: 'status',
  options: { detailed: true }
});
```

### Suggestion Tool

**Tool Name:** `slam_suggest`

```typescript
interface SuggestRequest {
  action: 'get' | 'next' | 'workflow' | 'code';
  options?: {
    area?: string;
    file?: string;
    priority?: 'low' | 'medium' | 'high';
    count?: number;
  };
}

interface Suggestion {
  type: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
  confidence: number;
  estimated_time?: number;
}
```

### Development Tool

**Tool Name:** `slam_develop`

```typescript
interface DevelopRequest {
  action: 'start' | 'test' | 'build' | 'lint' | 'format' | 'run';
  options?: {
    port?: number;
    env?: string;
    file?: string;
    watch?: boolean;
    script?: string;
    coverage?: boolean;
  };
}
```

### Ship Tool

**Tool Name:** `slam_ship`

```typescript
interface ShipRequest {
  action: 'deploy' | 'release' | 'promote' | 'rollback' | 'status';
  options?: {
    environment?: string;
    version?: string;
    branch?: string;
    tag?: string;
    from?: string;
    to?: string;
  };
}
```

### Commit Tool

**Tool Name:** `slam_commit`

```typescript
interface CommitRequest {
  action: 'generate' | 'commit' | 'amend' | 'history' | 'branch';
  options?: {
    type?: string;
    scope?: string;
    files?: string[];
    message?: string;
    push?: boolean;
    count?: number;
    analyze?: boolean;
  };
}
```

### Collaboration Tool

**Tool Name:** `slam_collaborate`

```typescript
interface CollaborateRequest {
  action: 'start' | 'join' | 'invite' | 'status' | 'chat' | 'lock' | 'share';
  options?: {
    name?: string;
    members?: string[];
    sessionId?: string;
    email?: string;
    role?: string;
    message?: string;
    file?: string;
    duration?: number;
  };
}
```

### Learning Tool

**Tool Name:** `slam_learn`

```typescript
interface LearnRequest {
  action: 'profile' | 'preferences' | 'history' | 'suggest' | 'train' | 'privacy';
  options?: {
    update?: object;
    feature?: string;
    data?: string;
    mode?: 'strict' | 'balanced' | 'permissive';
    dataCollection?: object;
  };
}
```

### Recovery Tool

**Tool Name:** `slam_recover`

```typescript
interface RecoverRequest {
  action: 'save' | 'restore' | 'undo' | 'history' | 'snapshot' | 'list';
  options?: {
    name?: string;
    description?: string;
    savepoint?: string;
    count?: number;
    preview?: boolean;
    limit?: number;
    details?: boolean;
    compress?: boolean;
    include?: string[];
  };
}
```

---

## 🌐 REST API

### Base URL
```
https://api.slambed.dev/v1
```

### Authentication Headers
```javascript
{
  'Authorization': 'Bearer your-api-key',
  'Content-Type': 'application/json',
  'X-API-Version': '1.0'
}
```

### Core Endpoints

#### Project Status
```http
GET /api/project/status
```

**Response:**
```json
{
  "success": true,
  "project": {
    "name": "my-project",
    "type": "Node.js",
    "health": "good",
    "lastActivity": "2024-01-05T10:30:00Z"
  },
  "git": {
    "branch": "main",
    "commits": 142,
    "uncommitted": 3
  }
}
```

#### Execute Command
```http
POST /api/command/execute
```

**Request:**
```json
{
  "tool": "slam_commit",
  "action": "generate",
  "options": {
    "type": "feat",
    "scope": "auth"
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "message": "feat(auth): implement JWT authentication",
    "confidence": 0.95
  },
  "execution_time": 850
}
```

#### Suggestions
```http
GET /api/suggestions?type=next&priority=high
```

**Response:**
```json
{
  "suggestions": [
    {
      "type": "commit",
      "priority": "high",
      "title": "Commit pending changes",
      "action": "slam_commit generate",
      "confidence": 0.9
    }
  ]
}
```

#### Team Collaboration
```http
POST /api/collaboration/sessions
```

**Request:**
```json
{
  "name": "Feature Development",
  "members": ["alice@team.com", "bob@team.com"],
  "workspace": {
    "permissions": {
      "alice@team.com": "admin",
      "bob@team.com": "write"
    }
  }
}
```

#### Deployment
```http
POST /api/deploy
```

**Request:**
```json
{
  "environment": "staging",
  "branch": "feature/auth",
  "options": {
    "runTests": true,
    "notify": ["team@company.com"]
  }
}
```

#### Learning System
```http
GET /api/learning/profile
PUT /api/learning/preferences
```

---

## 🔌 WebSocket API

### Connection
```javascript
const ws = new WebSocket('wss://api.slambed.dev/ws');

ws.onopen = () => {
  // Authenticate
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'your-jwt-token'
  }));
};
```

### Real-time Collaboration

#### Join Session
```javascript
ws.send(JSON.stringify({
  type: 'collaboration:join',
  sessionId: 'collab-123'
}));
```

#### File Lock
```javascript
ws.send(JSON.stringify({
  type: 'collaboration:lock',
  file: 'src/auth.js',
  action: 'acquire'
}));
```

#### Team Chat
```javascript
ws.send(JSON.stringify({
  type: 'collaboration:chat',
  message: 'Working on the authentication module',
  sessionId: 'collab-123'
}));
```

#### Cursor Tracking
```javascript
ws.send(JSON.stringify({
  type: 'collaboration:cursor',
  file: 'src/auth.js',
  line: 45,
  column: 12
}));
```

### Live Updates

#### Project Changes
```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'project:file_changed':
      console.log('File changed:', data.file);
      break;
      
    case 'project:commit_created':
      console.log('New commit:', data.commit);
      break;
      
    case 'collaboration:member_joined':
      console.log('Member joined:', data.member);
      break;
  }
};
```

---

## 🧠 Learning System API

### Profile Management

#### Get Profile
```http
GET /api/learning/profile
```

#### Update Profile
```http
PUT /api/learning/profile
```

**Request:**
```json
{
  "preferences": {
    "editor": "vscode",
    "theme": "dark",
    "gitStyle": "conventional"
  },
  "workingHours": {
    "start": 9,
    "end": 17,
    "timezone": "UTC-8"
  }
}
```

### Training Data

#### Submit Training Data
```http
POST /api/learning/train
```

**Request:**
```json
{
  "feature": "commit_patterns",
  "data": {
    "commits": [
      {
        "message": "feat(auth): add JWT support",
        "files": ["src/auth.js"],
        "changes": 145
      }
    ]
  }
}
```

### Privacy Controls

#### Update Privacy Settings
```http
PUT /api/learning/privacy
```

**Request:**
```json
{
  "mode": "balanced",
  "dataCollection": {
    "commands": true,
    "files": false,
    "timing": true,
    "errors": true
  },
  "retention": "30d",
  "anonymization": true
}
```

---

## 🛡️ Security API

### Session Management

#### Create Session
```http
POST /api/auth/session
```

#### Validate Session
```http
GET /api/auth/session/validate
```

#### Destroy Session
```http
DELETE /api/auth/session
```

### Access Control

#### Check Permissions
```http
GET /api/auth/permissions?resource=project&action=write
```

#### Update User Role
```http
PUT /api/auth/users/{userId}/role
```

### Audit Logs

#### Get Audit Logs
```http
GET /api/audit/logs?start=2024-01-01&end=2024-01-31&action=deploy
```

**Response:**
```json
{
  "logs": [
    {
      "id": "audit-123",
      "action": "deploy",
      "userId": "user-456",
      "resource": "production",
      "timestamp": "2024-01-05T14:30:00Z",
      "details": {
        "environment": "production",
        "version": "1.2.0"
      }
    }
  ],
  "total": 1,
  "page": 1
}
```

---

## ❌ Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "SLAM_001",
    "message": "Tool not found",
    "details": "The specified tool 'slam_invalid' does not exist",
    "timestamp": "2024-01-05T14:30:00Z",
    "requestId": "req-123"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `SLAM_001` | 404 | Tool not found |
| `SLAM_002` | 400 | Invalid action |
| `SLAM_003` | 403 | Permission denied |
| `SLAM_004` | 502 | Network error |
| `SLAM_005` | 429 | Rate limit exceeded |
| `SLAM_006` | 401 | Authentication required |
| `SLAM_007` | 422 | Validation failed |
| `SLAM_008` | 500 | Internal server error |
| `SLAM_009` | 503 | Service unavailable |
| `SLAM_010` | 409 | Conflict (e.g., file locked) |

### Error Handling Best Practices

```javascript
async function executeSlam(command) {
  try {
    const response = await fetch('/api/command/execute', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(`${data.error.code}: ${data.error.message}`);
    }
    
    return data.result;
  } catch (error) {
    console.error('Slam execution failed:', error);
    
    // Handle specific errors
    if (error.message.includes('SLAM_005')) {
      // Rate limited - wait and retry
      await new Promise(resolve => setTimeout(resolve, 5000));
      return executeSlam(command);
    }
    
    if (error.message.includes('SLAM_006')) {
      // Authentication failed - refresh token
      await refreshAuthToken();
      return executeSlam(command);
    }
    
    throw error;
  }
}
```

---

## ⏱️ Rate Limits

### Default Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/command/execute` | 100 requests | 1 hour |
| `/api/suggestions` | 200 requests | 1 hour |
| `/api/collaboration/*` | 500 requests | 1 hour |
| `/api/learning/*` | 50 requests | 1 hour |
| `/api/deploy` | 10 requests | 1 hour |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704471600
X-RateLimit-Window: 3600
```

### Handling Rate Limits

```javascript
async function makeRequest(url, options) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const resetTime = response.headers.get('X-RateLimit-Reset');
    const waitTime = (resetTime * 1000) - Date.now();
    
    console.log(`Rate limited. Waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    return makeRequest(url, options);
  }
  
  return response;
}
```

---

## 📊 Webhooks

### Setup Webhooks

```http
POST /api/webhooks
```

**Request:**
```json
{
  "url": "https://your-app.com/webhooks/slambed",
  "events": ["deployment.completed", "collaboration.session.started"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

#### Deployment Events
```json
{
  "event": "deployment.completed",
  "data": {
    "deploymentId": "deploy-123",
    "environment": "production",
    "status": "success",
    "duration": 45000
  },
  "timestamp": "2024-01-05T14:30:00Z"
}
```

#### Collaboration Events
```json
{
  "event": "collaboration.session.started",
  "data": {
    "sessionId": "collab-123",
    "name": "Feature Development",
    "members": ["alice@team.com", "bob@team.com"]
  },
  "timestamp": "2024-01-05T14:30:00Z"
}
```

---

## 🔧 SDK Examples

### JavaScript/TypeScript SDK

```typescript
import { SlamClient } from 'slambed-sdk';

const client = new SlamClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.slambed.dev/v1'
});

// Execute commands
const result = await client.slam('commit my changes');

// Get suggestions
const suggestions = await client.suggest.get();

// Start collaboration
const session = await client.collaborate.start({
  name: 'Feature Development',
  members: ['team@company.com']
});

// Deploy
const deployment = await client.ship.deploy({
  environment: 'staging'
});
```

### Python SDK

```python
from slambed import SlamClient

client = SlamClient(api_key='your-api-key')

# Execute commands
result = client.slam('analyze my project')

# Get context
context = client.context.status()

# Generate commit
commit = client.commit.generate(type='feat', scope='auth')
```

### cURL Examples

```bash
# Get project status
curl -H "Authorization: Bearer $API_KEY" \
     https://api.slambed.dev/v1/api/project/status

# Execute command
curl -X POST \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"tool":"slam_commit","action":"generate"}' \
     https://api.slambed.dev/v1/api/command/execute

# Start collaboration
curl -X POST \
     -H "Authorization: Bearer $API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"name":"Team Session","members":["team@company.com"]}' \
     https://api.slambed.dev/v1/api/collaboration/sessions
```

---

For more detailed examples and advanced usage, see the [Usage Guide](./USAGE.md) and [Setup Guide](./SETUP.md).