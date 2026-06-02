#!/usr/bin/env bash
# Serve the SharePoint Submission Tracker locally.
# Opening via http://localhost is required for Microsoft sign-in to work
# (a file:// page has no valid origin for the auth redirect).
#
# Usage: ./serve.sh [port]   (default port 8000 — must match your app
#                             registration's SPA redirect URI)
set -euo pipefail
PORT="${1:-8000}"
cd "$(dirname "$0")"
echo "Serving SharePoint Submission Tracker at http://localhost:${PORT}"
echo "Open that URL in your browser. Press Ctrl+C to stop."
python3 -m http.server "$PORT"
