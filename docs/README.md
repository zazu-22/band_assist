# 📖 Band Assist Documentation Index

Welcome to the Band Assist documentation! This is your complete guide to setting up, deploying, and maintaining the application.

---

## 🚀 Quick Start

**New to the project?** Follow these docs in order:

1. **[01-SETUP.md](./01-SETUP.md)** → Get your local environment running
2. **[02-SUPABASE_SCHEMA.md](./02-SUPABASE_SCHEMA.md)** → Understand the backend architecture
3. **[03-DEPLOYMENT.md](./03-DEPLOYMENT.md)** → Deploy to production

---

## 📚 Documentation Overview

### 01. Setup Guide

**File:** [01-SETUP.md](./01-SETUP.md)
**Purpose:** Complete local development setup
**You'll Learn:**

- Installing dependencies
- Configuring environment variables
- Setting up Supabase backend (optional)
- Running the development server

**Start here if:** This is your first time with the project

---

### 02. Database Schema

**File:** [02-SUPABASE_SCHEMA.md](./02-SUPABASE_SCHEMA.md)
**Purpose:** Backend architecture reference
**You'll Learn:**

- PostgreSQL table structures
- JSONB data formats
- Row-level security policies
- Storage bucket configuration
- Real-time subscriptions

**Start here if:** You need to understand the data model

---

### 03. Deployment Guide

**File:** [03-DEPLOYMENT.md](./03-DEPLOYMENT.md)
**Purpose:** Production deployment walkthrough
**You'll Learn:**

- Creating Supabase project
- Running database migrations
- Deploying to Vercel
- Configuring custom domains
- Troubleshooting deployment issues

**Start here if:** You're ready to go live

---

## 🔄 Implementation Status

### ✅ Complete & Ready

- Authentication system (login/logout)
- Database schema and migrations
- Storage service abstraction
- Local development setup
- Production deployment configuration

### 🚧 Pending (Not Blockers)

- File upload integration with Supabase Storage
- Real-time subscription UI integration
- Migration UI component

**See:** [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md) for detailed status

---

## 📋 Additional Resources

### Root Documentation

- **[DEPLOYMENT_READY.md](../DEPLOYMENT_READY.md)** - Final deployment checklist
- **[IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)** - Complete implementation status
- **[CLAUDE.md](../CLAUDE.md)** - Project guidelines and architecture

### Code Documentation

- **Migration Service:** `services/migrationService.ts` - LocalStorage → Supabase migration
- **Storage Services:** `services/` directory - Backend abstraction layer
- **Database Migrations:** `supabase/migrations/` - SQL schema files

## 🎯 Common Tasks

### Path 1: Local Development Only

```bash
1. npm install
2. cp .env.local.example .env.local
3. npm run dev
```

**Result:** App runs locally with localStorage (data stays on your device)

### Path 2: Full Backend Setup

```bash
1. Follow "Path 1" above
2. Create Supabase project (see [01-SETUP.md](./01-SETUP.md))
3. Run database migrations
4. Add Supabase credentials to .env.local
5. npm run dev
```

**Result:** App syncs data across all users via Supabase

### Path 3: Production Deployment

```bash
1. Complete "Path 2" above
2. Follow [03-DEPLOYMENT.md](./03-DEPLOYMENT.md)
3. Deploy to Vercel
4. Share URL with band members
```

**Result:** Live production app accessible to your band

---

## 🏗️ Architecture Overview

### Frontend

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **State Management:** React hooks (no Redux/Zustand)
- **File Rendering:** AlphaTab for Guitar Pro files

### Backend

- **Database:** Supabase (PostgreSQL)
- **File Storage:** Supabase Storage (S3-compatible)
- **Authentication:** Supabase Auth (shared password model)
- **Real-time:** Supabase real-time subscriptions

### Data Flow

```text
User Action → React Component → StorageService (wrapper)
                                       ↓
                          ┌────────────┴────────────┐
                          ↓                         ↓
                  LocalStorageService    SupabaseStorageService
                  (client-side)          (backend sync)
                          ↓                         ↓
                   Browser Storage          PostgreSQL + Storage
```

**Smart Fallback:** If Supabase is not configured, app automatically uses localStorage.

---

## 📂 File Structure

```text
band_assist/
├── docs/                        # Documentation (you are here!)
│   ├── README.md               # Documentation index (this file)
│   ├── 01-SETUP.md             # Setup guide
│   ├── 02-SUPABASE_SCHEMA.md   # Database schema
│   └── 03-DEPLOYMENT.md        # Deployment guide
│
├── supabase/                    # Supabase configuration
│   ├── migrations/              # SQL migration files
│   │   ├── 001_initial_schema.sql
│   │   └── 002_enable_realtime.sql
│   └── storage/                 # Storage bucket configuration
│       ├── band-files-config.md
│       └── band-files-policies.sql
│
├── services/                    # Service layer
│   ├── storageService.ts       # Storage factory (auto-selects backend)
│   ├── localStorageService.ts  # LocalStorage implementation
│   ├── supabaseStorageService.ts # Supabase implementation
│   ├── supabaseClient.ts       # Supabase client singleton
│   ├── migrationService.ts     # LocalStorage → Supabase migration
│   └── IStorageService.ts      # Storage interface
│
├── components/                  # React components
├── types.ts                     # TypeScript type definitions
├── App.tsx                      # Main application component
├── .env.local.example          # Environment variable template
├── vercel.json                 # Vercel deployment config
└── package.json                # Dependencies and scripts
```

---

## 🔑 Environment Variables

### Optional (for Backend)

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

**See:** [01-SETUP.md](./01-SETUP.md#environment-variables) for detailed instructions

---

## ⚙️ Storage Service Architecture

The app uses a **pluggable storage architecture** that automatically selects the appropriate backend:

### LocalStorageService

- **Use Case:** Local development, offline use, no backend needed
- **Storage:** Browser localStorage (5-10MB limit)
- **Files:** Stored as Base64 data URIs (inline)
- **Sync:** None (data stays on device)

### SupabaseStorageService

- **Use Case:** Production, multi-user collaboration
- **Storage:** PostgreSQL database + S3-compatible file storage
- **Files:** Stored in Supabase Storage buckets
- **Sync:** Real-time updates across all users
- **Features:**
  - File upload/download/delete
  - Real-time subscriptions
  - Row-level security
  - Automatic backups

### StorageService (Wrapper)

- **Automatically selects** between Local and Supabase based on env vars
- **Backward compatible** with existing code
- **Graceful fallback** if Supabase is unavailable

**Code Example:**

```typescript
// This works with BOTH LocalStorage and Supabase!
await StorageService.save(songs, members, roles, events);
const data = await StorageService.load();
```

---

## 🔄 Real-time Collaboration

When using Supabase, the app supports real-time updates:

1. User A adds a song
2. Supabase broadcasts the change
3. User B's app receives the update
4. User B sees the new song appear automatically

**Implementation:** See `SupabaseStorageService.subscribeToChanges()` in `services/supabaseStorageService.ts`

**Note:** Real-time subscriptions are NOT yet implemented in the UI (pending task).

---

## 🔒 Security & Authentication

### Current Model: Shared Password

- One email/password shared by all band members
- Simple setup, easy to share
- Good for small bands (4-6 people)
- RLS policies trust all authenticated users

### Future Enhancement: Individual Accounts

- Each member has their own login
- Track who made which changes
- More granular permissions
- Requires signup UI (not yet implemented)

---

## 🧪 Testing

### Local Testing

```bash
# Run locally with localStorage
npm run dev

# Run locally with Supabase
# (Add Supabase env vars first)
npm run dev
```

### Production Testing

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Manual Tests

1. ✅ Add a song with charts
2. ✅ Upload a PDF chart
3. ✅ Upload a Guitar Pro file
4. ✅ Add a backing track
5. ✅ Export backup (JSON)
6. ✅ Import backup
7. ✅ Open in another browser (if using Supabase)
8. ✅ Verify data syncs

---

## 📊 Monitoring & Maintenance

### Supabase Dashboard

- **Database:** Monitor table sizes, query performance
- **Storage:** Track file storage usage (1GB free tier)
- **Auth:** View active sessions, user management
- **Logs:** Query logs, errors, real-time connections

### Backups

1. **Automatic:** Supabase creates daily backups (7-day retention on free tier)
2. **Manual:** Use Settings → Export Backup in the app (download JSON)
3. **Recommended:** Export weekly backups to your computer

---

## 🐛 Common Issues

### Issue: "Supabase is not configured"

- **Cause:** Environment variables not set
- **Fix:** See [01-SETUP.md](./01-SETUP.md#troubleshooting)

### Issue: File uploads fail

- **Cause:** Storage bucket not created or policies missing
- **Fix:** See [03-DEPLOYMENT.md](./03-DEPLOYMENT.md#troubleshooting)

### Issue: Data not syncing

- **Cause:** Real-time not enabled
- **Fix:** Run `002_enable_realtime.sql` migration

**More troubleshooting:** See [01-SETUP.md](./01-SETUP.md#troubleshooting) and [03-DEPLOYMENT.md](./03-DEPLOYMENT.md#troubleshooting)

---

## 🚀 Future Enhancements

### Planned Features

- [ ] **Authentication UI** - Login/logout components
- [ ] **Real-time UI updates** - Implement subscribeToChanges in App.tsx
- [ ] **File upload progress** - Show upload % for large files
- [ ] **Optimistic updates** - Update UI before server confirms
- [ ] **Conflict resolution** - Handle simultaneous edits gracefully
- [ ] **Setlist persistence** - Currently not stored in backend
- [ ] **Activity log** - Track who changed what

### Nice-to-Have

- [ ] **Mobile app** (React Native)
- [ ] **Offline mode** with sync queue
- [ ] **Version history** for songs
- [ ] **Advanced permissions** (admin vs member roles)
- [ ] **Multi-band support** (one user, multiple bands)

---

## 🤝 Contributing

1. Read [CLAUDE.md](../CLAUDE.md) for project guidelines
2. Make changes in a feature branch
3. Test locally with both storage modes
4. Create pull request
5. Deploy preview on Vercel (automatic)

---

## 📞 Support

**Documentation Issues:** Open an issue on GitHub

**Supabase Help:** <https://supabase.com/docs>

**Vercel Help:** <https://vercel.com/docs>

**General Questions:** Check existing issues or open a new one
