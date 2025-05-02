# Contributing Guide

This document provides guidelines for contributing to the Chat App project.

## Branch Strategy

This project uses the following branch strategy:

- `main` - Production code that has been deployed to production
- `release` - Release candidates, ready for deployment. Changes to this branch trigger both CI and CD pipelines
- `develop` - Integration branch for ongoing development. Changes to this branch trigger only CI pipeline (tests and build)
- `feature/*` - Feature branches for development of new features or major changes
- `bugfix/*` - Bugfix branches for specific bug fixes
- `hotfix/*` - Hot fixes for urgent production issues (branched from `main`)

## Development Workflow

1. **Create Feature Branch**
   - Branch from `develop` for new features or bug fixes
   - Use a descriptive name with the prefix `feature/` or `bugfix/`
   - Example: `feature/user-authentication` or `bugfix/message-display-error`

2. **Develop and Test**
   - Make your changes in the feature branch
   - Write comprehensive unit tests
   - Ensure all tests pass locally before pushing

3. **Create Pull Request**
   - Push your feature branch to the repository
   - Create a Pull Request (PR) to merge your changes into `develop`
   - Fill out the PR template with details about your changes
   - Request code review from team members

4. **Code Review and CI**
   - Address any feedback from code reviews
   - The CI pipeline will automatically run tests and build the application
   - Fix any issues identified by the CI pipeline

5. **Merge to Develop**
   - Once approved and all tests pass, merge your PR into `develop`
   - Delete the feature branch after successful merge

6. **Release Process**
   - Periodically, changes from `develop` are merged into `release`
   - The CI/CD pipeline will run tests, build, and deploy to the staging environment
   - Perform QA testing on the staging environment

7. **Production Deployment**
   - After successful testing in staging, merge `release` to `main`
   - The CI/CD pipeline will deploy to production

## Commit Message Guidelines

Follow these guidelines to write clear and meaningful commit messages:

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

Example of a good commit message:
```
Add user authentication feature

- Implement JWT-based authentication
- Add login and register endpoints
- Create middleware for route protection
- Add tests for authentication flow

Resolves #123
```

## Pull Request Guidelines

- Keep PRs focused on a single feature or bug fix
- Include tests for any new functionality
- Update documentation if necessary
- Ensure all tests pass
- Add relevant screenshots or demos if applicable

## Testing Guidelines

- All new features should include unit tests
- Write tests for bug fixes to prevent regressions
- Maintain test coverage above 80%
- Test edge cases and failure scenarios
- Run tests locally before pushing changes

## Code Style

- Follow the established project code style
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused on a single responsibility
- Use consistent indentation and formatting

## Getting Help

If you need help with the contribution process or have questions, feel free to:

- Open an issue in the repository
- Ask for help in the project's communication channels
- Reach out to the project maintainers
