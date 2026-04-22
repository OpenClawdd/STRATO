/**
 * Generates the login/TOS gateway HTML string.
 * This payload acts as the entry point and gatekeeper.
 *
 * @returns {string} The HTML content for the authentication page.
 */
export function getAuthPage() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>STRATO | System Initializing</title>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
    <style>
        :root {
            --accent: #00e5ff;
            --accent-dim: rgba(0, 229, 255, 0.2);
            --bg: #020508;
            --panel: rgba(255, 255, 255, 0.03);
            --border: rgba(255, 255, 255, 0.1);
        }

        body {
            margin: 0;
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: #fff;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            background-image: 
                radial-gradient(circle at 50% 0%, #050c17 0%, transparent 70%),
                linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%),
                linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
            background-size: 100% 100%, 100% 4px, 3px 100%;
        }

        .boot-overlay {
            position: fixed;
            inset: 0;
            background: var(--bg);
            z-index: 100;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            transition: opacity 1s ease-out, visibility 1s;
        }

        .boot-text {
            font-family: 'JetBrains Mono', monospace;
            color: var(--accent);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }

        .boot-bar {
            width: 200px;
            height: 2px;
            background: rgba(255,255,255,0.1);
            position: relative;
            overflow: hidden;
        }

        .boot-bar::after {
            content: '';
            position: absolute;
            left: -100%;
            width: 100%;
            height: 100%;
            background: var(--accent);
            animation: loading 1.5s infinite linear;
        }

        @keyframes loading {
            from { left: -100%; }
            to { left: 100%; }
        }

        .glass-panel {
            background: var(--panel);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 40px;
            width: 90%;
            max-width: 450px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 10;
        }

        .glass-panel.visible {
            opacity: 1;
            transform: translateY(0);
        }

        h1 { 
            margin-top: 0; 
            font-weight: 600; 
            text-align: center; 
            color: #fff; 
            text-transform: uppercase; 
            letter-spacing: 4px; 
            font-family: 'Rajdhani', sans-serif;
            font-size: 28px;
            text-shadow: 0 0 10px var(--accent-dim);
        }

        .tagline { 
            text-align: center; 
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            opacity: 0.6; 
            margin-bottom: 25px; 
            color: var(--accent);
        }

        .tos-box {
            background: rgba(0, 0, 0, 0.4);
            padding: 20px;
            border-radius: 8px;
            height: 180px;
            overflow-y: auto;
            font-size: 13px;
            margin-bottom: 25px;
            border: 1px solid var(--border);
            line-height: 1.6;
            color: rgba(255,255,255,0.8);
        }

        .tos-box strong { color: var(--accent); }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
            font-size: 14px;
            user-select: none;
        }

        .checkbox-container input {
            display: none;
        }

        .checkmark {
            width: 18px;
            height: 18px;
            border: 2px solid var(--border);
            border-radius: 4px;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: all 0.2s;
        }

        .checkbox-container input:checked + .checkmark {
            background: var(--accent);
            border-color: var(--accent);
        }

        .checkbox-container input:checked + .checkmark::after {
            content: '✓';
            color: var(--bg);
            font-weight: bold;
            font-size: 12px;
        }

        input[type="password"] {
            width: 100%;
            padding: 14px;
            border: 1px solid var(--border);
            border-radius: 8px;
            box-sizing: border-box;
            background: rgba(0,0,0,0.3);
            color: #fff;
            outline: none;
            font-family: 'JetBrains Mono', monospace;
            transition: border-color 0.3s;
        }

        input[type="password"]:focus {
            border-color: var(--accent);
        }

        button {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 8px;
            background: var(--accent);
            color: var(--bg);
            letter-spacing: 2px;
            font-weight: bold;
            text-transform: uppercase;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            font-family: 'Rajdhani', sans-serif;
            opacity: 0.5;
            pointer-events: none;
        }

        button.active {
            opacity: 1;
            pointer-events: all;
            box-shadow: 0 0 20px var(--accent-dim);
        }

        button.active:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 25px var(--accent-dim);
        }

        button:active { transform: scale(0.98); }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }

        .glitch-wrapper {
            position: relative;
        }

        @keyframes glitch {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(-2px, -2px); }
            60% { transform: translate(2px, 2px); }
            80% { transform: translate(2px, -2px); }
            100% { transform: translate(0); }
        }

        .glitch:hover {
            animation: glitch 0.3s infinite;
        }
    </style>
</head>
<body>
    <div class="boot-overlay" id="bootOverlay">
        <div class="boot-text" id="bootStatus">Initializing STRATO environment...</div>
        <div class="boot-bar"></div>
    </div>

    <div class="glass-panel" id="mainPanel">
        <h1 class="glitch">STRATO Arcade</h1>
        <div class="tagline">"Filter can't reach up here."</div>
        
        <div class="tos-box">
            <p><strong>1. Keep it lowkey:</strong> Do not show this dashboard to teachers, admin, or ops. If the link leaks, the site gets blocked.</p>
            <p><strong>2. Watch your screen:</strong> Strato bypasses network filters, but it cannot stop GoGuardian or Securly screen monitoring. Use About:Blank cloaking when necessary.</p>
            <p><strong>3. No illegal activity:</strong> Don't use the proxy engines to do anything illegal or stupid that gets the server taken down.</p>
            <p><strong>4. Play smart:</strong> Eco Mode is there for a reason. If your Chromebook is struggling, turn off the Aero effects.</p>
        </div>

        <form action="/login" method="POST" id="authForm">
            <div class="form-group">
                <label class="checkbox-container">
                    <input type="checkbox" name="tos_accepted" id="tosCheck" value="true">
                    <span class="checkmark"></span>
                    I agree to the STRATO Terms of Service
                </label>

                <button type="submit" id="submitBtn">Initialize Launcher</button>
            </div>
        </form>
    </div>

    <script>
        const bootOverlay = document.getElementById('bootOverlay');
        const bootStatus = document.getElementById('bootStatus');
        const mainPanel = document.getElementById('mainPanel');
        const tosCheck = document.getElementById('tosCheck');
        const submitBtn = document.getElementById('submitBtn');
        const authForm = document.getElementById('authForm');

        // Check localStorage for prior acceptance
        const hasAccepted = localStorage.getItem('strato_tos_accepted');

        window.addEventListener('load', () => {
            const steps = [
                "Loading kernel modules...",
                "Bypassing node restrictions...",
                "Configuring proxy tunnels...",
                "STRATO Environment Ready."
            ];
            
            let i = 0;
            const interval = setInterval(() => {
                if (i < steps.length) {
                    bootStatus.textContent = steps[i];
                    i++;
                } else {
                    clearInterval(interval);
                    
                    if (hasAccepted) {
                        // Auto-login if already accepted
                        bootStatus.textContent = "Resuming session...";
                        authForm.submit();
                    } else {
                        bootOverlay.style.opacity = '0';
                        setTimeout(() => {
                            bootOverlay.style.visibility = 'hidden';
                            mainPanel.classList.add('visible');
                        }, 1000);
                    }
                }
            }, 600);
        });

        tosCheck.addEventListener('change', () => {
            if (tosCheck.checked) {
                submitBtn.classList.add('active');
            } else {
                submitBtn.classList.remove('active');
            }
        });

        authForm.addEventListener('submit', () => {
            localStorage.setItem('strato_tos_accepted', 'true');
        });
    </script>
</body>
</html>
    `;
}
