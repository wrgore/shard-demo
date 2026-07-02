#!/usr/bin/env bash
set -euo pipefail

echo "Installing ShaRD — Security Harness and Research Distribution"
echo ""

# --- Pi ---
echo "Checking for pi..."
if command -v pi &>/dev/null; then
    echo "  pi found: $(pi --version 2>&1 | head -1)"
else
    echo "  pi not found. Installing @earendil-works/pi-coding-agent..."
    if ! command -v npm &>/dev/null; then
        echo "Error: npm not found. Install Node.js from https://nodejs.org and re-run this script." >&2
        exit 1
    fi
    npm install -g --ignore-scripts @earendil-works/pi-coding-agent
    echo "  pi installed."
fi

echo ""

# --- nono ---
echo "Checking for nono..."
if command -v nono &>/dev/null; then
    echo "  nono found: $(nono --version 2>&1 | head -1)"
else
    echo "  nono not found. Installing from https://nono.sh..."
    if curl -fsSL https://nono.sh/install.sh | sh; then
        echo "  nono installed."
        export PATH="$HOME/.local/bin:$PATH"
    else
        echo "Warning: nono could not be installed automatically." >&2
        echo "  nono is recommended but not required to run ShaRD." >&2
        echo "  Install it manually from https://nono.sh" >&2
    fi
fi

echo ""

# Install SHarD nono profile
echo "Installing SHarD nono profile..."
PROFILE_DIR="$HOME/.config/nono/profiles"
mkdir -p "$PROFILE_DIR"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if cp "$SCRIPT_DIR/nono/pi.json" "$PROFILE_DIR/pi.json"; then
  echo "✓ SHarD nono profile installed to $PROFILE_DIR/pi.json"
else
  echo "Warning: Could not install nono profile. You can install it manually by copying nono/pi.json to $PROFILE_DIR/pi.json"
fi

echo ""

# --- ShaRD Pi package ---
echo "Installing ShaRD Pi package..."
pi install git:github.com/wrgore/shard-demo --ignore-scripts
echo ""

echo "ShaRD installed. Run 'pi' in any project directory to start."
echo ""
echo "On first run, ShaRD will check for your SandyClaw API key and guide you through setup if needed."
echo ""
echo "For best security, launch Pi via nono: nono run --profile pi -- pi"
