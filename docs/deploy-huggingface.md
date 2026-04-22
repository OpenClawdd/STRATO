# Deploying STRATO to Hugging Face Spaces

Hugging Face Spaces is an excellent, free way to deploy STRATO. Since Spaces uses Docker environments and requires applications to listen on port `7860`, we've provided a specific `Dockerfile.hf` for this target.

## Setup Instructions

1. **Create a Space**
   - Go to [Hugging Face Spaces](https://huggingface.co/spaces) and click **Create new Space**.
   - **Space name:** Choose a name (e.g., `strato-proxy`).
   - **License:** OpenRAIL (or your preference).
   - **Select the Space SDK:** Choose **Docker**.
   - **Hardware:** The free **Blank** tier is perfectly fine.
   - Click **Create Space**.

2. **Clone the Space Repository locally**
   - Follow the instructions on the Hugging Face page to clone the newly created repository to your local machine.
   ```bash
   git clone https://huggingface.co/spaces/<your-username>/<your-space-name>
   cd <your-space-name>
   ```

3. **Copy STRATO Source Files**
   - Copy all the files from the STRATO repository into your Hugging Face Space folder.

4. **Prepare the Dockerfile**
   - Rename `Dockerfile.hf` to `Dockerfile`. Hugging Face looks for a file named exactly `Dockerfile` at the root.
   ```bash
   cp Dockerfile.hf Dockerfile
   ```

5. **Configure Secrets**
   - In your Hugging Face Space settings (on the website), go to **Settings** -> **Variables and secrets** -> **Secrets**.
   - Add the following secrets:
     - `SITE_PASSWORD`: The password required to access the dashboard.
     - `COOKIE_SECRET`: A long random string used to sign session cookies.
     - `SECURE_COOKIES`: Set to `true` (Hugging Face provides HTTPS).

6. **Push the Code**
   - Commit and push the files to your Hugging Face Space.
   ```bash
   git add .
   git commit -m "Initial STRATO deployment"
   git push
   ```

7. **Build and Run**
   - Once pushed, Hugging Face will automatically begin building your Docker container. You can watch the logs in the "Logs" tab.
   - Once it says "Running", your STRATO instance is live!
