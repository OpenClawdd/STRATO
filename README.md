# 🎓 Noah Education (Unblocked Proxy & Arcade)

This is a custom-built, dark-mode "Wii-style" arcade and web proxy. It uses [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) under the hood to bypass web filters, allowing you to play games, browse the web, and use apps like TikTok at school.

To avoid getting caught, the site is disguised as an educational platform called **"Noah Education"** and is protected by a password.

---

## 🔒 How to Unlock the Site
When you or your friends first open the site, you will see a screen asking: **"Who created this site?"**

* **Password:** `noah` *(must be all lowercase)*

Once you enter the password, you'll be granted access to the arcade. It will remember you, so you won't have to type it again unless you clear your cookies.

---

## 🚀 How to Host This for Free Online
If you want to share a link with your friends without keeping your computer turned on, you can host it online for free using these two methods.

### Option 1: Replit (Easiest & Best for Sharing)
Replit is a free coding platform that lets you run this project with one click. It is highly recommended because it rarely bans game proxies.
1. Create a free account on [Replit](https://replit.com/).
2. You can import this repository directly into a new Repl, or use a deploy button if you fork the project.
3. Click the big green **"Run"** button at the top. Replit will download the files and give you a public URL you can share with your friends!

### Option 2: HuggingFace Spaces (Backup Option)
HuggingFace provides free Docker hosting. It's a great alternative if Replit is slow.
1. Create a free account at [HuggingFace Spaces](https://huggingface.co/spaces).
2. Create a new Space, choose **Docker** as the Space SDK, and select "Blank".
3. **CRITICAL:** In the Space settings, set the **Port** to `8080`.
4. Upload the files from this repository into the Space (or link your GitHub repo).
5. The space will automatically build and give you a free, shareable link!

*(Note: We do **not** recommend Render or Vercel, as they will instantly ban your account for hosting proxies).*

---

## 💻 How to Host Securely from Your PC
If you want the fastest speeds and don't want to rely on a free host, you can run the site directly from your computer and share it safely using **Cloudflare Tunnels**. This hides your home IP address so you can't be DDOS'd or hacked.

**Step 1: Start the server on your PC**
1. You must have [Node.js](https://nodejs.org/) installed on your computer.
2. Open a terminal/command prompt in this folder and type:
   `npm install`
   `npm start`
   *Your server is now running on `http://localhost:8080`!*

**Step 2: Create a secure tunnel**
1. Download the `cloudflared` tool for your operating system from [Cloudflare's website](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Open a **new** terminal window and run this command:
   `cloudflared tunnel --url http://localhost:8080`
3. Cloudflare will generate a random, secure link (it looks like `https://some-random-words.trycloudflare.com`). **Copy that link and send it to your friends!**

*Important: The site will only work as long as your computer is awake and the terminals are open.*

---

## 🎮 How to Add New Games
By default, the site comes with a few shortcuts and a playable Tetris game. Here is how to add your own games:

1. Open `public/index.html` in a text editor.
2. Scroll down until you find the `const GAMES = [` list.
3. To add a new game, add a new line inside the brackets like this:
   `{ n:'Game Name', e:'🎮', u:'https://link-to-the-game.com' },`
   * `n:` is the Name of the game.
   * `e:` is the Emoji icon for the card.
   * `u:` is the URL (link) to the game.

**Self-Hosting Games (Like Tetris):**
Instead of linking to another website, you can put the game files directly into your repository!
1. Create a folder inside the `public/games/` directory (e.g., `public/games/pacman/`).
2. Put the `index.html` and other game files inside that folder.
3. Change the URL in `public/index.html` to point to your new folder:
   `{ n:'Pacman', e:'🟡', u:'/games/pacman/' },`
