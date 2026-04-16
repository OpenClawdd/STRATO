/**
 * Generates the authentication / TOS page HTML with animated background.
 * @param {string} errorMsg - Optional error message (sanitised before injection).
 * @returns {string} HTML string
 */
export function authPage(errorMsg) {
    const safeMessage = errorMsg
        ? errorMsg
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
        : "";

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NoRedInk | Dashboard</title>
        <style>
            *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

            body {
                background: #000;
                color: #fff;
                font-family: 'Inter', -apple-system, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                overflow: hidden;
            }

            /* Animated gradient background */
            .bg-glow {
                position: fixed;
                inset: 0;
                z-index: 0;
                overflow: hidden;
            }
            .bg-glow .orb {
                position: absolute;
                border-radius: 50%;
                filter: blur(80px);
                opacity: 0.4;
                animation: float 12s ease-in-out infinite alternate;
            }
            .bg-glow .orb:nth-child(1) {
                width: 400px; height: 400px;
                background: #ff4da6;
                top: -100px; left: -100px;
                animation-delay: 0s;
                animation-duration: 14s;
            }
            .bg-glow .orb:nth-child(2) {
                width: 350px; height: 350px;
                background: #4da6ff;
                bottom: -80px; right: -80px;
                animation-delay: -4s;
                animation-duration: 16s;
            }
            .bg-glow .orb:nth-child(3) {
                width: 250px; height: 250px;
                background: #a64dff;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                animation-delay: -8s;
                animation-duration: 18s;
            }

            @keyframes float {
                0% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(30px, -30px) scale(1.05); }
                66% { transform: translate(-20px, 20px) scale(0.95); }
                100% { transform: translate(10px, -10px) scale(1.02); }
            }

            /* Floating geometric shapes */
            .shapes {
                position: fixed;
                inset: 0;
                z-index: 1;
                pointer-events: none;
            }
            .shape {
                position: absolute;
                border: 1px solid rgba(255,255,255,0.08);
                animation: drift 20s linear infinite;
            }
            .shape:nth-child(1) {
                width: 60px; height: 60px;
                border-radius: 12px;
                top: 15%; left: 10%;
                animation-delay: 0s;
                animation-duration: 22s;
            }
            .shape:nth-child(2) {
                width: 40px; height: 40px;
                border-radius: 50%;
                top: 70%; left: 80%;
                animation-delay: -5s;
                animation-duration: 18s;
            }
            .shape:nth-child(3) {
                width: 80px; height: 80px;
                border-radius: 16px;
                top: 40%; left: 75%;
                animation-delay: -10s;
                animation-duration: 25s;
                transform: rotate(45deg);
            }
            .shape:nth-child(4) {
                width: 30px; height: 30px;
                border-radius: 50%;
                top: 25%; left: 60%;
                animation-delay: -15s;
                animation-duration: 20s;
            }
            .shape:nth-child(5) {
                width: 50px; height: 50px;
                border-radius: 10px;
                top: 80%; left: 25%;
                animation-delay: -3s;
                animation-duration: 24s;
            }

            @keyframes drift {
                0% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
                25% { transform: translateY(-20px) rotate(90deg); opacity: 0.6; }
                50% { transform: translateY(-10px) rotate(180deg); opacity: 0.3; }
                75% { transform: translateY(-30px) rotate(270deg); opacity: 0.5; }
                100% { transform: translateY(0) rotate(360deg); opacity: 0.3; }
            }

            /* Login card */
            .login-card {
                position: relative;
                z-index: 10;
                background: rgba(10, 10, 10, 0.7);
                backdrop-filter: blur(24px) brightness(0.8);
                -webkit-backdrop-filter: blur(24px) brightness(0.8);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                padding: 48px 40px;
                max-width: 400px;
                width: 90%;
                text-align: center;
                animation: cardIn 0.6s cubic-bezier(0.34, 1.56, 0.84, 1) forwards;
                opacity: 0;
                transform: translateY(20px) scale(0.95);
                box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 40px rgba(255,77,166,0.05);
            }

            @keyframes cardIn {
                to { opacity: 1; transform: translateY(0) scale(1); }
            }

            .logo-icon {
                width: 56px;
                height: 56px;
                margin: 0 auto 20px;
                background: linear-gradient(135deg, #ff4da6, #4da6ff);
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: pulse 3s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(255,77,166,0.2); }
                50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(255,77,166,0.4); }
            }

            .login-card h2 {
                font-size: 20px;
                font-weight: 700;
                margin-bottom: 6px;
                color: #fff;
            }

            .login-card .subtitle {
                font-size: 13px;
                color: #888;
                margin-bottom: 28px;
            }

            .login-card input {
                width: 100%;
                padding: 14px 16px;
                border-radius: 14px;
                border: 1px solid rgba(255,255,255,0.08);
                background: rgba(255,255,255,0.05);
                color: #fff;
                font-size: 15px;
                outline: none;
                transition: border-color 0.2s, background 0.2s;
                font-family: inherit;
            }
            .login-card input:focus {
                border-color: rgba(255,77,166,0.5);
                background: rgba(255,255,255,0.08);
            }
            .login-card input::placeholder {
                color: #555;
            }

            .login-card button {
                width: 100%;
                padding: 14px;
                margin-top: 16px;
                border-radius: 14px;
                border: none;
                background: linear-gradient(135deg, #ff4da6, #e6398d);
                color: #fff;
                font-weight: 700;
                font-size: 15px;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                font-family: inherit;
            }
            .login-card button:hover {
                transform: scale(1.02);
                box-shadow: 0 8px 24px rgba(255,77,166,0.3);
            }
            .login-card button:active {
                transform: scale(0.98);
            }

            .error-msg {
                color: #ff4a4a;
                font-size: 13px;
                margin-bottom: 12px;
                animation: shake 0.4s ease;
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-6px); }
                75% { transform: translateX(6px); }
            }
        </style>
    </head>
    <body>
        <div class="bg-glow">
            <div class="orb"></div>
            <div class="orb"></div>
            <div class="orb"></div>
        </div>
        <div class="shapes">
            <div class="shape"></div>
            <div class="shape"></div>
            <div class="shape"></div>
            <div class="shape"></div>
            <div class="shape"></div>
        </div>
        <div class="login-card">
            <div class="logo-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>
            </div>
            <h2>Who created this site?</h2>
            <p class="subtitle">(hint: first name, all lowercase)</p>
            ${safeMessage ? `<div class="error-msg">${safeMessage}</div>` : ""}
            <form method="POST">
                <input type="password" name="password" required autofocus autocomplete="off" placeholder="Enter password...">
                <button type="submit">Unlock</button>
            </form>
        </div>
    </body>
    </html>
    `;
}
