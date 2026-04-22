<div align="center">
  <img src="https://raw.githubusercontent.com/OpenClawdd/STRATO/master/public/assets/strato-logo.png" alt="STRATO Logo" width="200" height="200" />

  # STRATO 🚀

  **The Most Polished Open-Source Proxy & Arcade Dashboard.**

  [![Node CI](https://github.com/OpenClawdd/STRATO/actions/workflows/node.js.yml/badge.svg)](https://github.com/OpenClawdd/STRATO/actions/workflows/node.js.yml)
  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
  [![Version](https://img.shields.io/github/package-json/v/OpenClawdd/STRATO)](https://github.com/OpenClawdd/STRATO)
  [![GitHub stars](https://img.shields.io/github/stars/OpenClawdd/STRATO?style=social)](https://github.com/OpenClawdd/STRATO/stargazers)
  [![GitHub forks](https://img.shields.io/github/forks/OpenClawdd/STRATO?style=social)](https://github.com/OpenClawdd/STRATO/network/members)
  [![GitHub last commit](https://img.shields.io/github/last-commit/OpenClawdd/STRATO)](https://github.com/OpenClawdd/STRATO/commits/master)
  <br>
  <a href="https://huggingface.co/spaces/OpenClawdd/STRATO" target="_blank">
    <img src="https://huggingface.co/datasets/huggingface/badges/raw/main/deploy-to-spaces-lg.svg" alt="Deploy to HF Spaces" />
  </a>

  *Engineered for speed, built for low-end hardware, and designed with an uncompromising aesthetic.*

  [Live Demo](#) • [Documentation](https://github.com/OpenClawdd/STRATO/wiki) • [Report Bug](https://github.com/OpenClawdd/STRATO/issues) • [Request Feature](https://github.com/OpenClawdd/STRATO/issues)
</div>

---

## 🌟 Why STRATO?

Forget the clunky, generic proxy forks of yesterday. STRATO is a premium, open-source web application designed from the ground up to provide an unparalleled user experience. We took the robust foundation of [SPLASH](https://github.com/rhenryw/SPLASH) (via `@mercuryworkshop/wisp-js`) and wrapped it in a beautifully designed, high-performance interface.

### 🎮 The Ultimate Arcade Experience
Self-host your favorite web games or connect to external ones. Our dynamic UI builds a beautiful grid of your library instantly.

### 🌐 Blazing Fast Web Proxy
Bypass restrictions with ease. Browse the web seamlessly through our integrated proxy engine.

### 🛡️ Ironclad Security
- **Stealth Cloaking:** Enter via an `about:blank` gateway that masks your activity.
- **Panic Button:** Instantly redirect to Google Classroom with a single click or by pressing `Escape`.
- **Signed Cookies:** Secure access via robust backend authentication.

### ⚡ Optimized for the Real World
Engineered specifically for low-end hardware (like Chromebooks). We use intelligent memory management, streaming downloads, and minimal DOM manipulation to keep things smooth when it matters most.

---

### 🥊 Competitor Comparison

| Feature | STRATO | Rammerhead | Ultraviolet |
|---|:---:|:---:|:---:|
| **Full Arcade Dashboard** | ✅ | ❌ | ❌ |
| **Built-in Games** | ✅ | ❌ | ❌ |
| **Cloaking & Privacy** | ✅ | ✅ | ✅ |
| **Stealth about:blank** | ✅ | ❌ | ❌ |
| **Dark/Light Themes** | ✅ | ❌ | ❌ |
| **Memory Optimized** | ✅ | ❌ | ❌ |
| **Local Storage Vault** | ✅ | ❌ | ❌ |

---

## ✨ Feature Grid

| Feature | Description |
|---|---|
| **🎨 "Stratosphere" Theme** | A deep, atmospheric dark mode with frosted glass and cinematic transitions. |
| **📦 Server-Side Smuggler** | Stream blocked files (ROMs, assets) directly through your server to bypass strict firewalls. |
| **🗄️ StratoVault** | IndexedDB-based storage keeps large assets off your RAM, ensuring the dashboard never crashes on low-end devices. |
| **📱 Responsive Design** | Looks and works flawlessly on any device, from massive monitors to small mobile screens. |
| **🌩️ Cloudflare Tunnels** | Share your instance securely with friends without exposing your home IP. |
| **🔒 Screen Privacy** | Productivity presets mask your tab title and icon to avoid unwanted attention. |

---

## 🚀 Deploy in 60 Seconds

Get STRATO running locally in under 2 minutes. Choose your preferred deployment method below:

### Docker
```bash
docker build -t strato .
docker run -p 8080:8080 --env-file .env strato
```

### Cloudflare
```bash
cloudflared tunnel --url http://localhost:8080
```

### HF Spaces
Click the **Deploy to HF Spaces** button at the top of the README.

### Local Deployment
#### 1. Clone & Install
```bash
git clone https://github.com/OpenClawdd/STRATO.git
cd STRATO
npm install
```

#### 2. Configure
```bash
cp .env.example .env
```
Edit `.env` to set your secure password and cookie secret. Need a secret quickly? Run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3. Launch
**Windows:**
```cmd
start.bat
```

**Linux / Mac / Chrome OS:**
```bash
chmod +x start.sh
./start.sh
```

Your server is now live at `http://localhost:8080`.

---

## 📸 Screenshots

| Dashboard View | Proxy View |
|:---:|:---:|
| <img src="https://placehold.co/800x500/0a0a1a/00f0ff?text=Dashboard" alt="Dashboard" width="100%"/> | <img src="https://placehold.co/800x500/0a0a1a/00f0ff?text=Proxy" alt="Proxy" width="100%"/> |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) for details.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

Distributed under the AGPL-3.0 License. See `LICENSE` for more information.

**Note on AGPL-3.0**: We use the GNU Affero General Public License (AGPL) because it explicitly states that if you run a modified program on a server and let other users communicate with it there, your server must also allow them to download the source code corresponding to the modified version running there. This ensures that the community always benefits from your improvements.