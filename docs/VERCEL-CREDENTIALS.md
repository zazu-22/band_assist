# Getting Vercel Credentials for GitHub Actions

This guide explains how to get the Vercel credentials needed for automated deployments.

## Required Credentials

You need three pieces of information:

1. `VERCEL_TOKEN` - Authentication token
2. `VERCEL_ORG_ID` - Your organization/team ID
3. `VERCEL_PROJECT_ID` - Your project ID

## Method 1: Using Vercel CLI (Recommended)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate with your Vercel account.

### Step 3: Link Your Project

Navigate to your project directory and run:

```bash
cd /path/to/band_assist
vercel link
```

Follow the prompts:

- Set up and deploy? **Yes**
- Which scope? Select your account/team
- Link to existing project? **No** (if first time) or **Yes** (if project exists)
- What's your project's name? `band-assist` (or your preferred name)

### Step 4: Get Project IDs

After linking, Vercel creates a `.vercel` directory with the IDs:

```bash
cat .vercel/project.json
```

You'll see something like:

```json
{
  "orgId": "team_xxxxxxxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxxxxxxx"
}
```

**Save these values:**

- `orgId` → Use as `VERCEL_ORG_ID` in GitHub secrets
- `projectId` → Use as `VERCEL_PROJECT_ID` in GitHub secrets

### Step 5: Create Authentication Token

1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
2. Or navigate: Vercel Dashboard → Settings → Tokens
3. Click "Create Token"
4. Give it a name (e.g., "GitHub Actions - Band Assist")
5. Set scope:
   - **Full Account** (if using personal account)
   - **Specific Team** (if using team account - select your team)
6. Set expiration (recommend "No Expiration" for CI/CD)
7. Click "Create Token"
8. **Copy the token immediately** (you won't see it again!)

**Save this as `VERCEL_TOKEN` in GitHub secrets**

## Method 2: Getting IDs from Vercel Dashboard

If you already have a project deployed on Vercel:

### Get Organization ID

The organization ID is **different from your user ID**.

**For Personal Account:**

```bash
# Run this after logging in with CLI
vercel whoami
```

The output shows your username. Your org ID is usually `team_` followed by a hash.

**Alternative - From Project Settings:**

1. Go to your project on Vercel dashboard
2. Click Settings
3. Scroll to "General"
4. Look at the URL - it contains your org/username
5. Run `vercel list` to see project details including team ID

**From Browser Console (Advanced):**

1. Open your Vercel dashboard
2. Open browser DevTools (F12)
3. Go to Network tab
4. Click on your project
5. Look at API requests - you'll see `teamId` in the request parameters

### Get Project ID

**Option 1 - From CLI:**

```bash
vercel list
```

This shows all projects with their IDs.

**Option 2 - From Project Settings:**

1. Go to your project in Vercel dashboard
2. Settings → General
3. The project ID is at the bottom: "Project ID: prj_xxxxxxxxx"

## Adding Secrets to GitHub

Once you have all three values:

1. Go to your GitHub repository
2. Navigate to: **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add each secret:

### Add VERCEL_TOKEN

- Name: `VERCEL_TOKEN`
- Value: (paste your token from Vercel)
- Click "Add secret"

### Add VERCEL_ORG_ID

- Name: `VERCEL_ORG_ID`
- Value: (paste the `orgId` from `.vercel/project.json`)
- Click "Add secret"

### Add VERCEL_PROJECT_ID

- Name: `VERCEL_PROJECT_ID`
- Value: (paste the `projectId` from `.vercel/project.json`)
- Click "Add secret"

## Important Notes

### About Organization ID

**Your Vercel Org ID is NOT the same as your User ID!**

- **User ID**: Shows in your profile (user_xxxxx)
- **Org ID**: Used for team/project access (team_xxxxx)
  - Even personal accounts have a "team" ID
  - This is what you need for `VERCEL_ORG_ID`

### Security Best Practices

1. **Never commit tokens to Git**
   - Add `.vercel` to `.gitignore` (already done)
   - Keep tokens only in GitHub Secrets

2. **Use scoped tokens**
   - Create separate tokens for different projects
   - Limit scope to specific teams if possible

3. **Rotate tokens regularly**
   - Set expiration dates if possible
   - Update GitHub secrets when rotating

4. **Monitor token usage**
   - Check Vercel Dashboard → Settings → Tokens
   - Revoke unused tokens

### Troubleshooting

#### "Invalid token" error in GitHub Actions

- Check if token is correctly copied (no extra spaces)
- Verify token hasn't expired
- Make sure token has correct scope/permissions

#### "Project not found" error

- Verify `VERCEL_PROJECT_ID` matches your project
- Ensure token has access to the team/org
- Check `VERCEL_ORG_ID` is correct (not your user ID!)

#### "Unauthorized" error

- Verify `VERCEL_ORG_ID` is the team ID, not user ID
- Check token belongs to the same account as the project
- Ensure token has deployment permissions

## Verification

To verify your setup works:

1. **Test locally:**

   ```bash
   export VERCEL_TOKEN="your_token"
   export VERCEL_ORG_ID="your_org_id"
   export VERCEL_PROJECT_ID="your_project_id"

   vercel pull --yes --environment=preview
   ```

2. **Test in GitHub:**
   - Make a small change
   - Push to a branch
   - Create a PR
   - Check GitHub Actions tab - deployment should start

## Quick Reference

```bash
# Install CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# View project info
cat .vercel/project.json

# Get token: https://vercel.com/account/tokens
```

## Additional Resources

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel Tokens](https://vercel.com/docs/rest-api#authentication)
- [GitHub Actions with Vercel](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel)

---

**Last Updated:** 2025-11-23
