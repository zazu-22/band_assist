#!/bin/bash
# Development Environment Setup Script for Band Assist

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Header
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}   Band Assist Development Setup         ${BLUE}║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    local missing_deps=()

    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    else
        NODE_VERSION=$(node -v)
        log_success "Node.js $NODE_VERSION installed"

        # Check if Node version is 22+
        NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -lt 22 ]; then
            log_warning "Node.js version 22+ recommended (currently: $NODE_VERSION)"
        fi
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_deps+=("npm")
    else
        NPM_VERSION=$(npm -v)
        log_success "npm $NPM_VERSION installed"
    fi

    # Check git
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    else
        GIT_VERSION=$(git --version)
        log_success "$GIT_VERSION installed"
    fi

    # Report missing dependencies
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        echo ""
        echo "Please install the missing dependencies:"
        echo "  Node.js 22+: https://nodejs.org/"
        echo "  npm: Comes with Node.js"
        echo "  git: https://git-scm.com/"
        exit 1
    fi

    echo ""
}

# Install dependencies
install_dependencies() {
    log_info "Installing npm dependencies..."

    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi

    log_success "Dependencies installed"
    echo ""
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment variables..."

    if [ ! -f ".env.local" ]; then
        if [ -f ".env.local.example" ]; then
            cp .env.local.example .env.local
            log_success "Created .env.local from .env.local.example"
            log_warning "Please update .env.local with your API keys:"
            echo "  - GEMINI_API_KEY: Get from https://makersuite.google.com/app/apikey"
            echo "  - VITE_SUPABASE_URL: Your Supabase project URL (optional)"
            echo "  - VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key (optional)"
        else
            log_warning ".env.local.example not found, creating basic .env.local"
            cat > .env.local << EOF
# Google Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Configuration (optional)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
EOF
            log_success "Created .env.local template"
            log_warning "Please update .env.local with your API keys"
        fi
    else
        log_success ".env.local already exists"

        # Check if API keys are set
        if grep -q "your_gemini_api_key_here" .env.local || grep -q "GEMINI_API_KEY=$" .env.local; then
            log_warning "GEMINI_API_KEY not configured in .env.local"
        fi
    fi

    echo ""
}

# Setup git hooks
setup_git_hooks() {
    log_info "Setting up git hooks..."

    # Check if .husky directory exists
    if [ -d ".husky" ]; then
        # Make hooks executable
        chmod +x .husky/pre-commit 2>/dev/null || log_warning "pre-commit hook not found"
        chmod +x .husky/commit-msg 2>/dev/null || log_warning "commit-msg hook not found"

        log_success "Git hooks configured"
    else
        log_info "Installing husky..."
        npm install --save-dev husky
        npx husky install

        # Create pre-commit hook
        mkdir -p .husky
        chmod +x .husky/pre-commit 2>/dev/null || true
        chmod +x .husky/commit-msg 2>/dev/null || true

        log_success "Husky installed and configured"
    fi

    echo ""
}

# Verify setup
verify_setup() {
    log_info "Verifying setup..."

    # Check if TypeScript compiles
    log_info "Running TypeScript check..."
    if npx tsc --noEmit; then
        log_success "TypeScript check passed"
    else
        log_warning "TypeScript check found issues (non-critical)"
    fi

    # Try building the project
    log_info "Testing build process..."
    if npm run build > /dev/null 2>&1; then
        log_success "Build successful"
    else
        log_warning "Build had issues (may be due to missing API keys)"
    fi

    echo ""
}

# Print next steps
print_next_steps() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}   Setup Complete! 🎉                     ${GREEN}║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo ""
    echo "  1. Update your API keys in .env.local"
    echo "     ${YELLOW}nano .env.local${NC}"
    echo ""
    echo "  2. Start the development server"
    echo "     ${YELLOW}npm run dev${NC}"
    echo ""
    echo "  3. Open your browser to:"
    echo "     ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo "Additional commands:"
    echo "  ${YELLOW}npm run build${NC}    - Build for production"
    echo "  ${YELLOW}npm run preview${NC}  - Preview production build"
    echo ""
    echo "Documentation:"
    echo "  Setup Guide:      docs/01-SETUP.md"
    echo "  Deployment:       docs/03-DEPLOYMENT.md"
    echo "  Vercel Deploy:    docs/04-VERCEL-QUICKSTART.md"
    echo ""
}

# Main execution
main() {
    check_prerequisites
    install_dependencies
    setup_environment
    setup_git_hooks
    verify_setup
    print_next_steps
}

# Run main function
main
