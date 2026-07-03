#!/usr/bin/env bash
set -euo pipefail

echo "Installing SHarD — Secure Harness Design"
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
        echo ""
        echo "Note: nono was installed to ~/.local/bin. If 'nono' is not found after restarting your terminal, add this to your shell profile (~/.zshrc or ~/.bashrc):"
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
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
if curl -fsSL https://raw.githubusercontent.com/wrgore/shard-demo/main/nono/pi.json -o "$PROFILE_DIR/pi.json"; then
  echo "✓ SHarD nono profile installed to $PROFILE_DIR/pi.json"
else
  echo "Warning: Could not install nono profile. Download it manually from:"
  echo "  https://raw.githubusercontent.com/wrgore/shard-demo/main/nono/pi.json"
  echo "  and copy it to $PROFILE_DIR/pi.json"
fi

echo ""

# --- ShaRD Pi package ---
echo "Installing ShaRD Pi package..."
pi install git:github.com/wrgore/shard-demo
echo ""

# Install SHarD global permissions rules
echo "Installing SHarD permissions rules..."
PERMISSIONS_DIR="$HOME/.pi/agent"
mkdir -p "$PERMISSIONS_DIR"
cat > "$PERMISSIONS_DIR/permissions.json" << 'PERMISSIONS_EOF'
{
  "permissions": {
    "rules": [
      {
        "message": "SHarD Demo: rm is blocked to demonstrate harness-level tool restriction",
        "priority": 10,
        "match": {
          "tool": "bash",
          "params": {
            "command": "rm\\s+"
          }
        },
        "action": "deny"
      },
      {
        "message": "SHarD Demo: rmdir is blocked to demonstrate harness-level tool restriction",
        "priority": 10,
        "match": {
          "tool": "bash",
          "params": {
            "command": "rmdir\\s+"
          }
        },
        "action": "deny"
      }
    ]
  }
}
PERMISSIONS_EOF
echo "✓ SHarD permissions rules installed to $PERMISSIONS_DIR/permissions.json"

echo ""

echo "================================================"
echo "SHarD installation complete."
echo ""
echo "Verifying installation..."
pi --version && echo "✓ Pi installed" || echo "✗ Pi not found"
nono --version && echo "✓ nono installed" || echo "✗ nono not found"
echo ""
echo "Run 'pi' in any project directory to start."
echo "On first run, SHarD will check for your SandyClaw API key and guide you through setup if needed."
echo "For best security, launch Pi via nono: nono run --profile pi -- pi"
echo "================================================"
