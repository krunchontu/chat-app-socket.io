# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2025-05-01

### Added
- Complete CI/CD pipeline with branch-specific workflows
  - `develop` branch: Triggers CI (tests and build)
  - `release` branch: Triggers CI/CD (tests, build, and deploy)
- Comprehensive test suite with three unit test files:
  - Message service tests
  - Socket authentication tests
  - User controller tests
- Branch initialization scripts:
  - `init-branches.sh` for Unix/Linux/Mac
  - `init-branches.ps1` for Windows
- MongoDB Atlas integration for containerized deployments
- Enhanced documentation:
  - CONTRIBUTING.md with branch strategy and workflow guidelines
  - Updated README.md with CI/CD pipeline information

### Changed
- Updated GitHub Actions workflow for branch-specific behavior
- Modified test scripts to ensure tests must pass for the pipeline to continue
- Updated docker-compose.yml to work with MongoDB Atlas instead of local MongoDB
- Enhanced server package.json with Jest configuration
- Improved error handling in tests

### Fixed
- Removed fallback mechanisms that would allow CI pipeline to continue despite test failures
- Addressed potential environment variable naming inconsistencies

## [1.0.0] - Initial Release

- Initial version of the chat application
