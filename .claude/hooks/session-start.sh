#!/bin/bash
set -euo pipefail

# SessionStart hook for Claude Code on the web.
# Installs Node dependencies so typecheck / lint work in fresh remote containers.
# Local sessions already have node_modules, so skip there.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Root tooling project (etsy-social-pipeline).
if [ -f package.json ]; then
  npm install
fi

# Clarity CRM (Next.js app).
if [ -f clarity-crm/package.json ]; then
  (cd clarity-crm && npm install)
fi
