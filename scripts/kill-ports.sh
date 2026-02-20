#!/bin/bash
# Kill processes using Ultraphonics Live Hub ports

echo "Killing processes using ports 3000, 8080, and 39052..."

# Kill process on port 3000 (Express server)
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 3000" || echo "○ No process on port 3000"

# Kill process on port 8080 (WebSocket server)
lsof -ti:8080 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 8080" || echo "○ No process on port 8080"

# Kill process on port 39052 (UDP - may not show up in lsof)
lsof -ti:39052 | xargs kill -9 2>/dev/null && echo "✓ Killed process on port 39052" || echo "○ No process on port 39052"

echo ""
echo "Done! You can now start the Electron app."
