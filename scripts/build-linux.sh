#!/bin/bash
# AskPlex Build Script for Linux/macOS
# Creates launcher scripts in bin/ directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$PROJECT_ROOT/bin"

echo "=== AskPlex Linux/macOS Build Script ==="
echo "Project Root: $PROJECT_ROOT"

# Create bin directory
mkdir -p "$BIN_DIR"
echo "Created bin/ directory"

# Install dependencies
echo ""
echo "Installing dependencies..."
cd "$PROJECT_ROOT/server" && npm install --silent
cd "$PROJECT_ROOT/mcp-server" && npm install --silent
echo "Dependencies installed"

# Create askplex CLI wrapper
cat > "$BIN_DIR/askplex" << EOF
#!/bin/bash
node "$PROJECT_ROOT/cli/askplex.js" "\$@"
EOF
chmod +x "$BIN_DIR/askplex"
echo "Created bin/askplex"

# Create askplex-server wrapper
cat > "$BIN_DIR/askplex-server" << EOF
#!/bin/bash
echo "Starting AskPlex Bridge Server..."
cd "$PROJECT_ROOT/server"
node server.js
EOF
chmod +x "$BIN_DIR/askplex-server"
echo "Created bin/askplex-server"

# Create systemd service file (optional)
read -p "Create systemd service for auto-start? (y/n): " CREATE_SERVICE
if [ "$CREATE_SERVICE" = "y" ]; then
    SERVICE_FILE="$BIN_DIR/askplex.service"
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=AskPlex Bridge Server
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_ROOT/server
ExecStart=$(which node) server.js
Restart=on-failure
RestartSec=10
User=$USER

[Install]
WantedBy=multi-user.target
EOF
    echo "Created bin/askplex.service"
    echo ""
    echo "To install systemd service:"
    echo "  sudo cp $SERVICE_FILE /etc/systemd/system/"
    echo "  sudo systemctl daemon-reload"
    echo "  sudo systemctl enable askplex"
    echo "  sudo systemctl start askplex"
fi

# Create .desktop file for Linux desktop environments
read -p "Create desktop launcher? (y/n): " CREATE_DESKTOP
if [ "$CREATE_DESKTOP" = "y" ]; then
    DESKTOP_FILE="$HOME/.local/share/applications/askplex-server.desktop"
    mkdir -p "$(dirname "$DESKTOP_FILE")"
    cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=AskPlex Server
Comment=Start AskPlex Bridge Server
Exec=gnome-terminal -- bash -c "cd $PROJECT_ROOT/server && node server.js; exec bash"
Terminal=false
Type=Application
Categories=Development;
EOF
    echo "Created desktop launcher: $DESKTOP_FILE"
fi

echo ""
echo "=== Build Complete ==="
echo ""
echo "To use askplex from anywhere, add bin/ to your PATH:"
echo "  export PATH=\"\$PATH:$BIN_DIR\""
echo ""
echo "Or add to ~/.bashrc or ~/.zshrc:"
echo "  echo 'export PATH=\"\$PATH:$BIN_DIR\"' >> ~/.bashrc"
echo ""
echo "Usage:"
echo "  askplex-server              # Start the bridge server"
echo "  askplex --new \"question\"    # Ask a new question"
echo "  askplex \"follow up\"         # Follow-up in same thread"
echo ""
echo "Next steps:"
echo "1. Load Chrome extension from: $PROJECT_ROOT/extension"
echo "2. Open https://www.perplexity.ai/ in Chrome"
echo "3. Start server: askplex-server"
echo "4. Test: askplex --new \"what is 2+2?\""
