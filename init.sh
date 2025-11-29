#!/usr/bin/env bash
# init.sh - Development environment setup for Band Assist Setlist Builder
#
# This script sets up and runs the development environment for the
# Setlist Builder design system extension project.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Band Assist - Setlist Builder Setup  ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo "Please install Node.js v18 or later: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓${NC} Node.js detected: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed.${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓${NC} npm detected: $NPM_VERSION"

# Check for .env.local file
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Warning: .env.local file not found.${NC}"
    echo "Creating from .env.local.example..."
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo -e "${YELLOW}Please edit .env.local with your Supabase credentials.${NC}"
    else
        echo -e "${RED}Error: .env.local.example not found. Please create .env.local manually.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓${NC} Environment file found"
fi

# Install dependencies
echo ""
echo -e "${BLUE}Installing dependencies...${NC}"
npm install

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Dependencies installed successfully"
else
    echo -e "${RED}Error: Failed to install dependencies${NC}"
    exit 1
fi

# Run type checking
echo ""
echo -e "${BLUE}Running type check...${NC}"
npm run typecheck

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} TypeScript type check passed"
else
    echo -e "${YELLOW}Warning: Type check had errors${NC}"
fi

# Run linting
echo ""
echo -e "${BLUE}Running linter...${NC}"
npm run lint

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Lint check passed"
else
    echo -e "${YELLOW}Warning: Lint had errors${NC}"
fi

# Print helpful information
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!                       ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "  ${BLUE}Development Commands:${NC}"
echo "    npm run dev       - Start development server (port 3000)"
echo "    npm test          - Run tests"
echo "    npm run build     - Build for production"
echo "    npm run typecheck - Run TypeScript type checking"
echo "    npm run lint      - Run ESLint"
echo ""
echo -e "  ${BLUE}Project Structure:${NC}"
echo "    src/components/setlist/    - New setlist components"
echo "    src/components/SetlistManager.tsx - Main setlist component"
echo "    docs/design-system.md      - Design system reference"
echo ""
echo -e "  ${BLUE}Key Files to Modify (Design Extension):${NC}"
echo "    src/components/SongDetail.tsx     - Main refactor target"
echo "    src/components/ui/MetadataItem.tsx - New component to create"
echo "    src/components/ui/UploadZone.tsx   - New component to create"
echo "    docs/design-system.md              - Add new sections"
echo ""
echo -e "  ${BLUE}Feature Tracking:${NC}"
echo "    feature_list.json - 100 test cases to implement (source of truth)"
echo "    Update 'passes': false -> true as features are completed"
echo ""

# Start development server
echo -e "${BLUE}Starting development server...${NC}"
echo ""
npm run dev
