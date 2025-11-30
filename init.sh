#!/bin/bash
# Init script for Band Assist Design System Phase 2
# This script sets up and runs the development environment

set -e  # Exit on error

echo "=========================================="
echo "Band Assist - Design System Phase 2 Setup"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check for required environment variables
if [ ! -f ".env.local" ]; then
    echo "Warning: .env.local not found. Supabase configuration may be missing."
    echo "Copy .env.local.example to .env.local and configure your Supabase credentials."
fi

# Install dependencies if node_modules doesn't exist or is outdated
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo ""
    echo "Installing dependencies..."
    npm install
fi

echo ""
echo "=========================================="
echo "Project Information"
echo "=========================================="
echo "Tech Stack: React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui"
echo "Backend: Supabase"
echo ""
echo "Key Commands:"
echo "  npm run dev       - Start development server"
echo "  npm run typecheck - Run TypeScript type checking"
echo "  npm run lint      - Run ESLint"
echo "  npm run build     - Build for production"
echo ""
echo "Test Credentials:"
if [ -f "test-credentials.json" ]; then
    echo "  Available in test-credentials.json"
else
    echo "  Not configured. Copy test-credentials.example.json to test-credentials.json"
fi
echo ""
echo "=========================================="
echo "Starting Development Server..."
echo "=========================================="
echo ""
echo "The app will be available at: http://localhost:5173"
echo ""

# Start the development server
npm run dev
