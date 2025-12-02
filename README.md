# Band Assist

A modern web application for band management. Helps bands organize songs, charts, setlists, practice schedules, and member assignments.

## Features

- **Song Library** - Manage your band's repertoire with metadata, lyrics, and notes
- **Chart Viewer** - View and play Guitar Pro files with AlphaTab integration
- **Practice Mode** - Interactive practice with playback controls, looping, and tempo adjustment
- **Performance Mode** - Streamlined view for live performances
- **Setlist Management** - Create and organize setlists for gigs
- **Member Management** - Track band members and role assignments
- **Schedule & Events** - Manage rehearsals and gigs

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui, Radix UI |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Music | AlphaTab (Guitar Pro rendering) |

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/zazu-22/band_assist.git
cd band_assist

# Install dependencies
npm install
```

### Environment Setup

Create a `.env.local` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

See [docs/01-SETUP.md](docs/01-SETUP.md) for detailed setup instructions.

### Running Locally

```bash
# Development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Tests
npm run test
```

## Project Structure

```
band_assist/
├── src/
│   ├── components/     # React components
│   │   ├── primitives/ # Base shadcn/ui components
│   │   └── ui/         # Composed UI components
│   ├── services/       # API and data services
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript definitions
│   └── lib/            # Utilities
├── docs/               # Documentation
├── specs/              # Feature specifications
└── supabase/           # Database migrations
```

## Documentation

| Document | Description |
|----------|-------------|
| [Setup Guide](docs/01-SETUP.md) | Initial project setup |
| [Database Schema](docs/02-SUPABASE_SCHEMA.md) | Supabase tables and RLS |
| [Deployment](docs/03-DEPLOYMENT.md) | Production deployment |
| [Design System](docs/design-system.md) | UI/UX guidelines |
| [Specifications](specs/README.md) | Feature specs and roadmap |

## Development

### Code Quality

```bash
# Run all checks
npm run typecheck && npm run lint && npm run test

# Format code
npm run format
```

### Component Guidelines

The app uses a three-tier component architecture:

1. **Primitives** - Base shadcn/ui components (minimal modifications)
2. **UI Components** - Composed, reusable components
3. **Feature Components** - Page-level components

See [CLAUDE.md](CLAUDE.md) for detailed development guidelines.

## Contributing

1. Check [specs/STATUS.md](specs/STATUS.md) for current priorities
2. Review the relevant spec in `specs/` before implementing
3. Follow the component guidelines in [CLAUDE.md](CLAUDE.md)
4. Ensure all checks pass before submitting PR

## License

Private - All rights reserved
