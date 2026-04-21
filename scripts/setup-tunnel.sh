#!/bin/sh

# Exit on error
set -e

echo "================================================="
echo "      STRATO Cloudflare Tunnel Setup Script"
echo "================================================="

# Check if cloudflared is installed
if ! command -v cloudflared >/dev/null 2>&1; then
    echo "[!] cloudflared not found. Installing..."

    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)

    if [ "$OS" = "linux" ]; then
        if [ "$ARCH" = "x86_64" ]; then
            curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
            sudo dpkg -i cloudflared.deb || { echo "Failed to install cloudflared. Please install manually."; exit 1; }
            rm cloudflared.deb
        elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
            curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb
            sudo dpkg -i cloudflared.deb || { echo "Failed to install cloudflared. Please install manually."; exit 1; }
            rm cloudflared.deb
        else
            echo "Unsupported architecture: $ARCH. Please install cloudflared manually."
            exit 1
        fi
    elif [ "$OS" = "darwin" ]; then
        if command -v brew >/dev/null 2>&1; then
            brew install cloudflare/cloudflare/cloudflared
        else
            echo "Homebrew not found. Please install cloudflared manually."
            exit 1
        fi
    else
        echo "Unsupported OS: $OS. Please install cloudflared manually."
        exit 1
    fi
    echo "[✓] cloudflared installed successfully."
else
    echo "[✓] cloudflared is already installed."
fi

# Authenticate if needed
echo "\n[>] Authenticating with Cloudflare..."
cloudflared tunnel login

# Get Domain
printf "\nEnter the domain you want to use (e.g., strato.yourdomain.com): "
read DOMAIN

# Create tunnel
echo "\n[>] Creating tunnel 'strato'..."
cloudflared tunnel create strato || echo "[!] Tunnel 'strato' might already exist. Proceeding..."

# Route DNS
echo "\n[>] Routing DNS for $DOMAIN to tunnel 'strato'..."
cloudflared tunnel route dns strato "$DOMAIN"

# Get the UUID of the newly created tunnel
TUNNEL_UUID=$(cloudflared tunnel list | grep strato | awk '{print $1}')

if [ -z "$TUNNEL_UUID" ]; then
    echo "Failed to get tunnel UUID. Something went wrong."
    exit 1
fi

echo "\n[>] Configuring tunnel..."
mkdir -p ~/.cloudflared
cat <<EOF > ~/.cloudflared/config.yml
tunnel: $TUNNEL_UUID
credentials-file: $HOME/.cloudflared/$TUNNEL_UUID.json

ingress:
  - hostname: $DOMAIN
    service: http://localhost:8080
  - service: http_status:404
EOF

echo "[✓] Configuration complete."

echo "\n[>] You can now start the tunnel by running:"
echo "    cloudflared tunnel run strato"
echo "================================================="
