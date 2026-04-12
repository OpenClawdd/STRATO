export function authPage(errorMsg) {
	return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Restricted</title>
        <style>
            body { background: #121212; color: #fff; font-family: 'Nunito', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .login-box { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 16px; border: 2px solid rgba(255,255,255,0.2); text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            input { padding: 10px; margin: 10px 0; border-radius: 8px; border: 1px solid #444; background: #222; color: #fff; width: 100%; box-sizing: border-box;}
            button { padding: 10px 20px; border-radius: 8px; border: none; background: #00a8ff; color: #fff; font-weight: bold; cursor: pointer; width: 100%; margin-top: 10px;}
            button:hover { background: #0088cc; }
            .error { color: #ff4a4a; font-size: 14px; margin-bottom: 10px;}
            p { font-size: 14px; color: #aaa; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>Who created this site?</h2>
            <p>(hint: first name, all lowercase)</p>
            ${errorMsg ? `<div class="error">${errorMsg}</div>` : ""}
            <form method="POST">
                <input type="password" name="password" required autofocus autocomplete="off">
                <button type="submit">Unlock</button>
            </form>
        </div>
    </body>
    </html>
    `;
}
