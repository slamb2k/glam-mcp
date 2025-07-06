# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-01-06

### Added
- **9 New SLAM Tools** - Complete suite of AI-powered development tools:
  - `slam` - Universal natural language interface
  - `slam_context` - Rich project intelligence and analysis
  - `slam_suggest` - AI-powered development suggestions
  - `slam_develop` - Development automation (test, build, lint)
  - `slam_ship` - Deployment and release management
  - `slam_commit` - AI-generated commit messages
  - `slam_collaborate` - Real-time team collaboration
  - `slam_learn` - Personalization and learning system
  - `slam_recover` - Time machine and recovery features

- **Machine Learning System**:
  - Privacy-preserving data collection (strict/balanced/permissive modes)
  - Feature extraction and pattern recognition
  - Adaptive suggestions based on usage patterns
  - User profiling and personalization

- **Real-time Collaboration**:
  - WebSocket-based team synchronization
  - File locking and conflict prevention
  - Team presence tracking and cursor sharing
  - Integrated team chat
  - Operational Transformation for conflict resolution

- **Time Machine Recovery**:
  - Automatic state snapshots with compression
  - Named savepoints for major milestones
  - Granular undo/redo with action history
  - Smart conflict resolution during recovery

- **Enterprise Security**:
  - AES-256-GCM encryption for sensitive data
  - JWT-based authentication with session management
  - Role-Based Access Control (RBAC)
  - Comprehensive audit logging
  - Brute force protection
  - Security middleware suite

- **Backward Compatibility Layer**:
  - Full support for existing CLI commands
  - Automatic command mapping to new MCP tools
  - Migration suggestions for deprecated commands
  - Usage statistics and migration tracking

- **Enhanced Project Intelligence**:
  - Deep code analysis with NLP
  - Dependency vulnerability scanning
  - Performance profiling
  - Health metrics and scoring

- **Advanced Configuration**:
  - Secure configuration management
  - API key rotation and management
  - Environment-specific settings
  - Feature toggles

### Changed
- Upgraded to MCP-based architecture for better Claude Desktop integration
- Enhanced git operations with AI-powered intelligence
- Improved error handling and recovery mechanisms
- Better performance with caching and optimization

### Fixed
- Circular dependency in package.json
- Missing error handling in various edge cases
- Security vulnerabilities in session management

## [1.1.11] - 2024-01-05

### Added
- Initial MCP server implementation
- Basic git automation tools
- CLI interface for common workflows

### Changed
- Updated documentation
- Improved error messages

### Fixed
- Various bug fixes and improvements

## [1.0.0] - 2024-01-01

### Added
- Initial release
- Basic git flow automation
- Simple CLI commands

---

For detailed migration instructions from v1.x to v2.0, see [MIGRATION.md](./docs/MIGRATION.md).