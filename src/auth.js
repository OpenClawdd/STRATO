/**
 * Generates the login/TOS gateway HTML string.
 * This payload acts as the entry point and gatekeeper.
 *
 * @constant {string} authPage - The HTML content for the authentication page.
 */
export const authPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Strato | Terms of Service</title>
    <style>
        body {
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: radial-gradient(circle at 50% 0%, #050c17 0%, #020508 100%); color: #fff;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: rgba(220, 235, 255, 0.95);
        }
        .glass-panel {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
        }
        h1 { margin-top: 0; font-weight: 600; text-align: center; color: #fff; text-transform: uppercase; letter-spacing: 2px; font-family: 'Rajdhani', sans-serif; }
        .tagline { text-align: center; font-style: italic; opacity: 0.8; margin-bottom: 20px; }
        .tos-box {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 8px;
            height: 150px;
            overflow-y: auto;
            font-size: 14px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        input[type="password"] {
            width: 100%;
            padding: 12px;
            margin-bottom: 15px;
            border: none;
            border-radius: 8px;
            box-sizing: border-box;
            background: rgba(255, 255, 255, 0.08); color: #fff;
            outline: none;
            font-family: monospace;
        }
        button {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 8px;
            background: linear-gradient(135deg, #00e5ff 0%, #00b0ff 100%); color: #020508; letter-spacing: 1px;
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.1s;
        }
        button:active { transform: scale(0.98); }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 4px; }
    </style>
</head>
<body>
    <div class="glass-panel">
        <h1>Terms of Service</h1>
        <div class="tagline">"Filter can't reach up here."</div>
        
        <div class="tos-box">
            <p><strong>1. Keep it lowkey:</strong> Do not show this dashboard to teachers, admin, or ops. If the link leaks, the site gets blocked.</p>
            <p><strong>2. Watch your screen:</strong> Strato bypasses network filters, but it cannot stop GoGuardian or Securly screen monitoring. Use About:Blank cloaking when necessary.</p>
            <p><strong>3. No illegal activity:</strong> Don't use the proxy engines to do anything illegal or stupid that gets the server taken down.</p>
            <p><strong>4. Play smart:</strong> Eco Mode is there for a reason. If your Chromebook is struggling, turn off the Aero effects.</p>
        </div>

        <form action="/login" method="POST">
            <input type="password" name="password" placeholder="Enter access code to agree..." required>
            <button type="submit">I Agree & Enter Strato</button>
        </form>
    </div>
</body>
</html>
`;
