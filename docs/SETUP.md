# Setup Guide - Slambed MCP

Complete setup and configuration guide for the Slambed MCP intelligent development assistant.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18 or higher
- **Git**: Latest version recommended
- **Memory**: Minimum 4GB RAM (8GB recommended for collaboration features)
- **Storage**: 1GB free space for installation and data

### Required Services
- **Claude Desktop**: For MCP integration (primary interface)
- **API Keys**: At least one AI service (see API Configuration below)

### Optional but Recommended
- **Docker**: For containerized deployment
- **Redis**: For enhanced session management and caching
- **PostgreSQL**: For production database (SQLite used by default)

## 🚀 Installation Methods

### Method 1: Clone from Repository (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/slambed-mcp.git
cd slambed-mcp

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit environment variables (see API Configuration)
nano .env

# Initialize the system
npm run setup

# Start the server
npm start
```

### Method 2: NPM Package

```bash
# Install globally
npm install -g slambed-mcp

# Initialize new project
slambed-mcp init

# Start server
slambed-mcp start
```

### Method 3: Docker

```bash
# Using Docker Compose
git clone https://github.com/your-username/slambed-mcp.git
cd slambed-mcp

# Copy and edit environment
cp .env.example .env
# Edit .env with your configuration

# Start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps
```

## 🔑 API Configuration

### Required Environment Variables

Create `.env` file with the following variables. **At least one AI service API key is required:**

```env
# AI Service APIs (Choose at least one)
ANTHROPIC_API_KEY=your_anthropic_key_here          # Claude models (Recommended)
OPENAI_API_KEY=your_openai_key_here                # GPT models
PERPLEXITY_API_KEY=your_perplexity_key_here        # Research features

# Optional AI Services
GOOGLE_API_KEY=your_google_key_here                # Gemini models
MISTRAL_API_KEY=your_mistral_key_here              # Mistral models
XAI_API_KEY=your_xai_key_here                      # Grok models
OPENROUTER_API_KEY=your_openrouter_key_here        # Multiple models

# Server Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
DEBUG=false

# Security Configuration
JWT_SECRET=your_random_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here
SESSION_SECRET=your_session_secret_here

# Database Configuration
DATABASE_URL=sqlite://./data/slambed.db
# For PostgreSQL: postgresql://user:password@localhost/slambed
# For MySQL: mysql://user:password@localhost/slambed

# Cache Configuration (Optional)
REDIS_URL=redis://localhost:6379

# Feature Toggles
ENABLE_COLLABORATION=true
ENABLE_LEARNING=true
ENABLE_RECOVERY=true
ENABLE_SECURITY=true
ENABLE_ANALYTICS=true

# GitHub Integration (Optional)
GITHUB_TOKEN=your_github_token_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret_here

# Deployment Configuration (Optional)
DEPLOYMENT_ENVIRONMENT=development
MONITORING_ENABLED=false
BACKUP_ENABLED=true
BACKUP_INTERVAL=6h
```

### Getting API Keys

#### Anthropic (Claude) - Recommended
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Create account and verify email
3. Navigate to "API Keys"
4. Create new key and copy to `ANTHROPIC_API_KEY`

#### OpenAI (GPT)
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create account and add payment method
3. Go to "API Keys" section
4. Create new secret key and copy to `OPENAI_API_KEY`

#### Perplexity (Research Features)
1. Visit [Perplexity API](https://www.perplexity.ai/api)
2. Sign up for API access
3. Generate API key and copy to `PERPLEXITY_API_KEY`

### Security Key Generation

Generate secure random keys for your installation:

```bash
# Generate all security keys at once
npm run generate:keys

# Or generate individually
npm run generate:jwt-secret
npm run generate:encryption-key
npm run generate:session-secret
```

## ⚙️ Claude Desktop Configuration

### Step 1: Locate Claude Desktop Config

**macOS:**
```bash
~/.claude/config.json
```

**Windows:**
```bash
%APPDATA%\.claude\config.json
```

**Linux:**
```bash
~/.claude/config.json
```

### Step 2: Add Slambed MCP Server

Edit or create the config file:

```json
{
  "mcpServers": {
    "slambed-mcp": {
      "command": "node",
      "args": ["./src/index.js"],
      "cwd": "/absolute/path/to/slambed-mcp",
      "env": {
        "ANTHROPIC_API_KEY": "your_anthropic_key",
        "OPENAI_API_KEY": "your_openai_key",
        "PERPLEXITY_API_KEY": "your_perplexity_key",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

After configuration, restart Claude Desktop completely:

1. Quit Claude Desktop
2. Wait 5 seconds
3. Relaunch Claude Desktop
4. Check for Slambed tools in the interface

### Troubleshooting Claude Integration

If tools don't appear in Claude Desktop:

```bash
# Check MCP server logs
npm run mcp:logs

# Test MCP connection
npm run mcp:test

# Validate configuration
npm run mcp:validate

# Debug mode
DEBUG=true npm run mcp:debug
```

## 🗄️ Database Setup

### SQLite (Default)
No additional setup required. Database file created automatically at:
```
./data/slambed.db
```

### PostgreSQL (Production Recommended)

1. **Install PostgreSQL:**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS with Homebrew
brew install postgresql
brew services start postgresql

# Windows: Download from postgresql.org
```

2. **Create Database:**
```sql
-- Connect as postgres user
sudo -u postgres psql

-- Create database and user
CREATE DATABASE slambed;
CREATE USER slambed_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE slambed TO slambed_user;
\q
```

3. **Update Environment:**
```env
DATABASE_URL=postgresql://slambed_user:secure_password@localhost/slambed
```

4. **Initialize Schema:**
```bash
npm run db:migrate
npm run db:seed
```

### Redis Setup (Optional but Recommended)

Redis improves performance for sessions and caching:

1. **Install Redis:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS with Homebrew
brew install redis
brew services start redis

# Windows: Use WSL or Docker
```

2. **Configure Redis:**
```env
REDIS_URL=redis://localhost:6379
```

3. **Test Connection:**
```bash
npm run redis:test
```

## 🔐 Security Setup

### 1. Generate Security Keys

```bash
# Generate all security keys
npm run security:init

# This creates:
# - JWT signing key
# - Encryption key for sensitive data
# - Session secret
# - API key encryption
```

### 2. Configure User Roles

```bash
# Set up default roles and permissions
npm run security:setup-roles

# Create admin user
npm run security:create-admin

# Test security configuration
npm run security:test
```

### 3. Enable Audit Logging

```bash
# Initialize audit system
npm run audit:init

# Test audit logging
npm run audit:test

# View audit logs
npm run audit:logs
```

### 4. SSL/TLS Configuration (Production)

For production deployment, configure SSL:

```bash
# Generate self-signed certificates (development)
npm run ssl:generate

# Or use Let's Encrypt (production)
npm run ssl:letsencrypt

# Configure SSL in .env
SSL_ENABLED=true
SSL_CERT_PATH=./certs/cert.pem
SSL_KEY_PATH=./certs/key.pem
```

## 🚀 Initial Configuration

### 1. Run Setup Wizard

```bash
# Interactive setup wizard
npm run setup:wizard

# Or automated setup with defaults
npm run setup:auto
```

### 2. Verify Installation

```bash
# Health check
npm run health

# Test all components
npm run test:integration

# Check API connections
npm run test:apis
```

### 3. Configure Learning System

```bash
# Initialize learning system
npm run learning:init

# Set privacy preferences
npm run learning:privacy

# Test predictive suggestions
npm run learning:test
```

## 🎛️ Advanced Configuration

### Collaboration Settings

```env
# Real-time collaboration configuration
COLLABORATION_MAX_USERS=10
COLLABORATION_TIMEOUT=30000
WEBSOCKET_PORT=3001
OPERATIONAL_TRANSFORM=true
```

### Learning System Configuration

```env
# Machine learning and personalization
LEARNING_DATA_RETENTION=30d
LEARNING_PRIVACY_MODE=balanced
LEARNING_MIN_DATA_POINTS=100
LEARNING_TRAINING_INTERVAL=1h
```

### Recovery System Configuration

```env
# Time machine and recovery settings
RECOVERY_SNAPSHOT_INTERVAL=5m
RECOVERY_MAX_SNAPSHOTS=50
RECOVERY_COMPRESSION=true
RECOVERY_RETENTION=7d
```

### Performance Tuning

```env
# Performance optimization
MAX_CONCURRENT_OPERATIONS=5
CACHE_TTL=3600
BATCH_SIZE=100
WORKER_THREADS=4
```

## 📊 Monitoring Setup

### Enable Monitoring

```bash
# Install monitoring dependencies
npm install --save-dev @sentry/node @sentry/tracing

# Configure monitoring
npm run monitoring:init

# Set up alerts
npm run monitoring:alerts
```

### Metrics Collection

```env
# Monitoring configuration
SENTRY_DSN=your_sentry_dsn_here
MONITORING_ENABLED=true
METRICS_ENDPOINT=/metrics
HEALTH_CHECK_ENDPOINT=/health
```

## 🔄 Updates and Maintenance

### Automatic Updates

```bash
# Check for updates
npm run update:check

# Update to latest version
npm run update:install

# Backup before update
npm run backup:create
```

### Database Maintenance

```bash
# Optimize database
npm run db:optimize

# Clean old data
npm run db:cleanup

# Backup database
npm run db:backup

# Restore from backup
npm run db:restore backup-file.sql
```

### Log Management

```bash
# Rotate logs
npm run logs:rotate

# Clean old logs
npm run logs:cleanup

# Archive logs
npm run logs:archive
```

## 🆘 Troubleshooting

### Common Issues

#### 1. MCP Connection Failed
```bash
# Check Claude Desktop logs
tail -f ~/.claude/logs/claude.log

# Verify server is running
npm run status

# Test MCP protocol
npm run mcp:test-connection
```

#### 2. API Key Issues
```bash
# Validate all API keys
npm run validate:api-keys

# Test specific API
npm run test:anthropic
npm run test:openai
npm run test:perplexity
```

#### 3. Database Connection Issues
```bash
# Test database connection
npm run db:test

# Check database status
npm run db:status

# Reset database (WARNING: destroys data)
npm run db:reset
```

#### 4. Permission Issues
```bash
# Check file permissions
npm run check:permissions

# Fix permission issues
npm run fix:permissions

# Reset security configuration
npm run security:reset
```

### Getting Help

- **Documentation**: [Full documentation](./docs/)
- **Issues**: [GitHub Issues](https://github.com/your-username/slambed-mcp/issues)
- **Discord**: [Community Discord](https://discord.gg/slambed)
- **Support**: support@slambed.dev

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Enable debug mode
DEBUG=slambed:* npm start

# Specific debug categories
DEBUG=slambed:mcp,slambed:security npm start

# Save debug logs to file
DEBUG=slambed:* npm start > debug.log 2>&1
```

---

## ✅ Verification Checklist

After setup, verify everything is working:

- [ ] Server starts without errors
- [ ] Claude Desktop shows Slambed tools
- [ ] Can execute basic `slam` commands
- [ ] Database connection works
- [ ] API keys are valid
- [ ] Security system is active
- [ ] Learning system is initialized
- [ ] Collaboration features work (if enabled)
- [ ] Recovery system is tracking changes
- [ ] Logs are being written correctly

**Next Steps**: See [Usage Guide](./USAGE.md) for detailed usage instructions.