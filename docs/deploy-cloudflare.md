# Deploying STRATO with Cloudflare Tunnels

Cloudflare Tunnels allow you to expose your local STRATO instance to the internet securely, without having to open ports on your router or expose your home IP address.

## Automated Setup (Recommended)

You can use our provided script to set up a Cloudflare Tunnel quickly on Linux or macOS.

```bash
chmod +x scripts/setup-tunnel.sh
./scripts/setup-tunnel.sh
```

## Manual Setup (Step-by-Step)

If you prefer to set it up manually, follow these steps.

### 1. Install Cloudflared

**Debian/Ubuntu:**
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

**macOS:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

### 2. Authenticate

Run the following command to authenticate `cloudflared` with your Cloudflare account. It will open a browser window or give you a link to follow.

```bash
cloudflared tunnel login
```

### 3. Create the Tunnel

Create a new tunnel named `strato`. This will generate a UUID for your tunnel.

```bash
cloudflared tunnel create strato
```

### 4. Configure the Tunnel

Create a configuration file to route traffic to your local STRATO instance. Cloudflared looks for configurations in `~/.cloudflared/config.yml`.

```yaml
# ~/.cloudflared/config.yml
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: /home/<user>/.cloudflared/<YOUR-TUNNEL-UUID>.json

ingress:
  - hostname: strato.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
```

*Replace `<YOUR-TUNNEL-UUID>`, `<user>`, and `strato.yourdomain.com` with your actual details.*

### 5. Route the DNS

Tell Cloudflare to route traffic from your chosen domain to your tunnel:

```bash
cloudflared tunnel route dns strato strato.yourdomain.com
```

### 6. Run the Tunnel

Start the tunnel to begin serving traffic:

```bash
cloudflared tunnel run strato
```

To run it as a background service so it starts on boot:
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
```
