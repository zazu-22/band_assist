# Automation Setup - Quick Start Guide

This guide will help you set up all the automated workflows for Band Assist.

## Prerequisites

- Node.js 22+
- npm
- Git
- GitHub account with repository access
- Vercel account (for deployments)

## Step-by-Step Setup

### 1. Install Development Dependencies

```bash
# Install all dependencies including dev tools
npm install

# This will install:
# - ESLint and plugins
# - Prettier
# - Husky (git hooks)
# - TypeScript
```

### 2. Setup Git Hooks

```bash
# Initialize Husky
npm run prepare

# Make hooks executable (if needed)
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

### 3. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your API keys
nano .env.local
```

Required variables:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url        # Optional
SUPABASE_ANON_KEY=your_supabase_key   # Optional
```

### 4. Setup GitHub Secrets

For CI/CD workflows to work, add these secrets in GitHub:

**Repository Settings > Secrets and variables > Actions > New repository secret**

#### Required Secrets

1. **For Vercel Deployment:**

   ```text
   VERCEL_TOKEN          - Your Vercel authentication token
   VERCEL_ORG_ID         - Your Vercel organization ID
   VERCEL_PROJECT_ID     - Your Vercel project ID
   ```

   Get these by running:

   ```bash
   npm install -g vercel
   vercel login
   vercel link
   # Follow the prompts, then check .vercel/project.json for IDs
   ```

2. **For Claude Code (optional):**

   ```text
   CLAUDE_CODE_OAUTH_TOKEN - OAuth token for Claude Code actions
   ```

#### Optional Secrets

```text
CODECOV_TOKEN         - For code coverage reporting
SNYK_TOKEN           - For Snyk security scanning
SLACK_WEBHOOK        - For deployment notifications
```

### 5. Enable GitHub Features

1. **Enable Dependabot**
   - Settings > Code security and analysis
   - Enable "Dependabot alerts"
   - Enable "Dependabot security updates"

2. **Enable CodeQL**
   - Settings > Code security and analysis
   - Enable "Code scanning" with CodeQL

3. **Configure Branch Protection (Recommended)**
   - Settings > Branches > Add rule for `main`
   - Require pull request reviews
   - Require status checks to pass
   - Require branches to be up to date

### 6. Test the Setup

```bash
# Test type checking
npm run typecheck

# Test linting
npm run lint

# Test formatting
npm run format:check

# Test build
npm run build

# Try a commit (will trigger pre-commit hooks)
git add .
git commit -m "test: verify automation setup"
```

### 7. Verify Workflows

1. **Push to trigger CI:**

   ```bash
   git push origin development
   ```

2. **Check Actions tab in GitHub:**
   - CI workflow should run
   - All jobs should pass

3. **Create a test PR:**
   - CI should run on PR
   - Claude Code review should trigger (if configured)

## Workflow Overview

### Automated Workflows

| Workflow               | Trigger              | Purpose                          |
| ---------------------- | -------------------- | -------------------------------- |
| **CI**                 | Push, PR             | Type checking, linting, building |
| **Deploy (Vercel)**    | Push to main/dev, PR | Deploy to Vercel                 |
| **Dependency Update**  | Weekly (Mon 9AM)     | Update dependencies              |
| **Security Scan**      | Weekly (Sun 12AM)    | Security analysis                |
| **Release**            | Version tags         | Create releases                  |
| **Claude Code Review** | PR opened            | AI code review                   |

### Git Hooks

| Hook           | Purpose                            |
| -------------- | ---------------------------------- |
| **pre-commit** | Type check, lint, file size check  |
| **commit-msg** | Enforce conventional commit format |

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run typecheck        # Run TypeScript check
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run format:check     # Check formatting

# Setup
npm run prepare          # Setup git hooks
./scripts/setup-dev.sh   # Run full setup script
```

## Commit Message Format

Use Conventional Commits format:

```bash
# Format
<type>(<scope>): <subject>

# Types
feat:      New feature
fix:       Bug fix
docs:      Documentation
style:     Formatting
refactor:  Code restructuring
test:      Tests
chore:     Maintenance
perf:      Performance
ci:        CI/CD changes
build:     Build system

# Examples
git commit -m "feat: add song export functionality"
git commit -m "fix(player): resolve audio playback issue"
git commit -m "docs: update deployment guide"
```

## Creating a Release

### Option 1: GitHub UI

1. Go to Actions tab
2. Select "Release" workflow
3. Click "Run workflow"
4. Enter version (e.g., 1.0.0)

### Option 2: Git Tag

```bash
git checkout main
git pull origin main
git tag v1.0.0
git push origin v1.0.0
```

## Troubleshooting

### Hooks Not Running

```bash
# Reinstall hooks
rm -rf .husky
npm run prepare
chmod +x .husky/*
```

### CI Failing

1. Check Actions tab for error details
2. Run the same commands locally:

   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```

3. Fix issues and push again

### Vercel Deployment Failing

1. Verify secrets are set in GitHub
2. Check Vercel dashboard for errors
3. Test Vercel CLI locally:

   ```bash
   vercel --prod
   ```

### Dependabot Not Creating PRs

1. Check `.github/dependabot.yml` exists
2. Verify GitHub > Insights > Dependency graph is enabled
3. Check Settings > Code security > Dependabot is enabled

## Next Steps

1. **Read Full Documentation**
   - [Workflow Automation Guide](docs/05-WORKFLOW-AUTOMATION.md)
   - [Deployment Guide](docs/03-DEPLOYMENT.md)

2. **Customize Workflows**
   - Edit `.github/workflows/*.yml` as needed
   - Adjust ESLint rules in `.eslintrc.json`
   - Customize Prettier in `.prettierrc`

3. **Set Up Monitoring**
   - Configure error tracking (Sentry, LogRocket, etc.)
   - Set up uptime monitoring
   - Configure deployment notifications

## Support

If you encounter issues:

1. Check workflow logs in GitHub Actions
2. Review documentation in `docs/` directory
3. Check `.github/workflows/` files for configuration
4. Open an issue with detailed error messages

---

**Setup Complete!** 🎉

Your repository now has:

- ✅ Automated CI/CD
- ✅ Code quality checks
- ✅ Security scanning
- ✅ Dependency management
- ✅ Release automation
- ✅ Pre-commit hooks

Happy coding!
