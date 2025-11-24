# Workflow Automation Guide

This document describes the automated workflows set up for Band Assist to streamline development, testing, deployment, and maintenance.

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Pre-commit Hooks](#pre-commit-hooks)
- [Dependency Management](#dependency-management)
- [Security Scanning](#security-scanning)
- [Release Process](#release-process)
- [Development Setup](#development-setup)
- [Configuration](#configuration)

## Overview

Band Assist uses comprehensive automation to ensure code quality, security, and smooth deployments:

- **CI/CD Pipeline**: Automated testing, building, and deployment
- **Code Quality**: Linting, formatting, and type checking
- **Security**: Dependency scanning, secret detection, and vulnerability checks
- **Dependency Updates**: Automated dependency updates with Dependabot
- **Release Management**: Automated versioning and changelog generation

## GitHub Actions Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**

- Push to `main` or `development` branches
- Pull requests to `main` or `development`

**Jobs:**

#### Code Quality

- Type checking with TypeScript
- Linting (ESLint)
- Build verification

#### Build

- Builds for both development and production environments
- Generates build size reports
- Uploads build artifacts

#### Security

- npm audit for dependency vulnerabilities
- TruffleHog for secret detection

**Usage:**

```bash
# Runs automatically on push/PR
# View results in GitHub Actions tab
```

### 2. Vercel Deployment (`.github/workflows/deploy-vercel.yml`)

**Triggers:**

- Push to `main` (production deployment)
- Push to `development` (preview deployment)
- Pull requests (preview deployment)

**Requirements:**
Set these secrets in GitHub:

- `VERCEL_TOKEN`: Vercel authentication token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

**Features:**

- Automatic preview deployments for PRs
- Production deployments on main branch
- Deployment URL posted as PR comment

**Setup:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login and link project
vercel login
vercel link

# Get your tokens
vercel whoami  # Organization info
# Add secrets to GitHub: Settings > Secrets and variables > Actions
```

### 3. Dependency Updates (`.github/workflows/dependency-update.yml`)

**Triggers:**

- Schedule: Every Monday at 9 AM UTC
- Manual: workflow_dispatch

**Jobs:**

#### Update Dependencies

- Checks for minor/patch updates
- Runs tests to verify updates
- Creates PR with changes

#### Security Updates

- Runs npm audit
- Applies security fixes automatically
- Creates high-priority PR for security issues

**Configuration:**
Adjust schedule in workflow file:

```yaml
schedule:
  - cron: '0 9 * * 1' # Monday 9 AM UTC
```

### 4. Security Scanning (`.github/workflows/security-scan.yml`)

**Triggers:**

- Push to `main` or `development`
- Pull requests
- Schedule: Every Sunday at midnight
- Manual trigger

**Scans:**

#### CodeQL Analysis

- Static code analysis for JavaScript/TypeScript
- Detects security vulnerabilities
- Uploads results to GitHub Security tab

#### Dependency Scan

- npm audit for known vulnerabilities
- Generates detailed audit report

#### Secret Scan

- TruffleHog for hardcoded secrets
- Checks for `.env` files in repository
- Validates no credentials are committed

#### Client-Side Security

- Checks for dangerous patterns (`eval()`, `dangerouslySetInnerHTML`)
- Validates no hardcoded secrets
- Ensures secure coding practices

#### License Check

- Verifies all dependencies have approved licenses
- Generates license compliance report

**View Results:**

- GitHub Security tab > Code scanning alerts
- Actions tab > Workflow runs > Artifacts

### 5. Release Workflow (`.github/workflows/release.yml`)

**Triggers:**

- Git tags matching `v*.*.*` (e.g., v1.0.0)
- Manual trigger with version input

**Process:**

1. Runs tests and builds
2. Generates categorized changelog
3. Creates GitHub release
4. Updates documentation
5. Deploys to production

**Creating a Release:**

```bash
# Option 1: Create tag locally
git tag v1.0.0
git push origin v1.0.0

# Option 2: Use GitHub Actions UI
# Actions tab > Release workflow > Run workflow > Enter version
```

**Versioning Convention:**

- `v1.0.0` - Production release
- `v1.0.0-beta.1` - Beta release (marked as pre-release)
- `v1.0.0-alpha.1` - Alpha release (marked as pre-release)

## Pre-commit Hooks

Located in `.husky/` directory. Automatically run before commits.

### Pre-commit Hook

**Checks:**

- TypeScript type checking
- Linting (if configured)
- Large file detection (>1MB)
- console.log warnings
- TODO/FIXME warnings

**Bypass (not recommended):**

```bash
git commit --no-verify -m "message"
```

### Commit Message Hook

Enforces [Conventional Commits](https://www.conventionalcommits.org/) format:

**Format:**

```
type(scope?): subject

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
```

**Examples:**

```bash
# Good commits
git commit -m "feat: add song export functionality"
git commit -m "fix(player): resolve audio playback issue"
git commit -m "docs: update deployment guide"

# Bad commits (will be rejected)
git commit -m "updated stuff"
git commit -m "Fixed bug"
```

## Dependency Management

### Dependabot Configuration

File: `.github/dependabot.yml`

**Features:**

- Weekly dependency updates
- Groups minor/patch updates
- Separate PRs for development and production dependencies
- Automatic GitHub Actions updates

**Labels:**

- `dependencies` - All dependency updates
- `automated` - Auto-generated PRs
- `security` - Security-related updates

**Customization:**
Edit `.github/dependabot.yml`:

```yaml
schedule:
  interval: 'daily' # Change frequency
open-pull-requests-limit: 5 # Limit concurrent PRs
```

### Manual Dependency Updates

```bash
# Check for updates
npm outdated

# Update specific package
npm update package-name

# Update all packages (patch and minor)
npm update

# Major version updates
npm install package-name@latest
```

## Security Scanning

### Regular Scans

**Automated:**

- Weekly CodeQL scan (Sundays)
- Dependency scan on every commit
- Secret detection on all PRs

**Manual Scan:**

```bash
# Run npm audit locally
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (may break things)
npm audit fix --force
```

### Security Best Practices

1. **Never commit secrets**
   - Use `.env.local` for local development
   - Use GitHub Secrets for CI/CD
   - Use environment variables in Vercel

2. **Review security PRs promptly**
   - Check GitHub Security tab regularly
   - Test security updates thoroughly

3. **Keep dependencies updated**
   - Review and merge Dependabot PRs weekly
   - Monitor for security advisories

## Release Process

### Semantic Versioning

We follow [SemVer](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backward compatible)
- **PATCH** (0.0.1): Bug fixes

### Release Checklist

1. **Prepare Release**

   ```bash
   # Ensure development branch is up to date
   git checkout development
   git pull origin development

   # Run tests locally
   npm run typecheck
   npm run build
   ```

2. **Create Release Branch**

   ```bash
   git checkout -b release/v1.0.0
   ```

3. **Update Version**
   - Version is in `package.json` (currently 0.1.0)
   - Update CHANGELOG if maintaining one manually

4. **Create PR to Main**
   - Create PR from release branch to main
   - Wait for CI to pass
   - Get review approval

5. **Trigger Release**

   ```bash
   # After PR is merged
   git checkout main
   git pull origin main
   git tag v1.0.0
   git push origin v1.0.0
   ```

6. **Verify Deployment**
   - Check GitHub Release was created
   - Verify production deployment
   - Test production site

## Development Setup

### Automated Setup Script

Run the setup script to configure your development environment:

```bash
./scripts/setup-dev.sh
```

**What it does:**

1. Checks prerequisites (Node.js 22+, npm, git)
2. Installs dependencies
3. Sets up `.env.local` from example
4. Configures git hooks
5. Verifies setup with build test

### Manual Setup

If you prefer manual setup:

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
nano .env.local  # Add your API keys

# Setup git hooks
npm run prepare

# Verify setup
npm run typecheck
npm run build
```

### Required Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url        # Optional
SUPABASE_ANON_KEY=your_supabase_key   # Optional
```

## Configuration

### ESLint Configuration

File: `.eslintrc.json`

**Customize rules:**

```json
{
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### Prettier Configuration

File: `.prettierrc`

**Current settings:**

- Single quotes
- 2 space indentation
- 100 character line width
- Semicolons enabled
- Trailing commas (ES5)

### TypeScript Configuration

File: `tsconfig.json`

**Key settings:**

- Strict mode enabled
- Target: ES2022
- React JSX transform
- Path aliases: `@/*` maps to root

## Troubleshooting

### Common Issues

#### 1. Pre-commit Hook Fails

```bash
# Check what's failing
npx tsc --noEmit  # Type errors?
npm run lint       # Lint errors?

# Fix and try again
git add .
git commit -m "fix: resolve issues"
```

#### 2. Build Fails in CI

```bash
# Test build locally
npm run build

# Check for missing environment variables
# CI doesn't have access to .env.local
```

#### 3. Vercel Deployment Fails

- Check Vercel secrets are set correctly
- Verify `VERCEL_TOKEN` has correct permissions
- Check Vercel CLI is linked: `vercel whoami`

#### 4. Dependabot PRs Failing

- Review the changes in package-lock.json
- Check for breaking changes in updated packages
- Test locally before merging

### Getting Help

- Check GitHub Actions logs for detailed error messages
- Review workflow files in `.github/workflows/`
- Consult documentation in `docs/` directory

## Maintenance

### Regular Tasks

**Weekly:**

- Review and merge Dependabot PRs
- Check GitHub Security tab for alerts
- Monitor build times and artifact sizes

**Monthly:**

- Review and update workflow configurations
- Audit dependencies manually
- Update documentation as needed

**Quarterly:**

- Review and optimize workflow performance
- Update GitHub Actions versions
- Assess automation effectiveness

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

---

**Last Updated:** 2025-11-23
**Maintained by:** Band Assist Team
