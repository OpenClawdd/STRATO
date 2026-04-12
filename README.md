<p align="center"><img src="https://raw.githubusercontent.com/titaniumnetwork-dev/Ultraviolet-Static/main/public/uv.png" height="200"></p>

<h1 align="center">Ultraviolet-App</h1>

> [!CAUTION]
> Please note that this project isn't really maintained anymore before making issues! It has been superseded by [Scramjet](https://github.com/MercuryWorkshop/scramjet). An example application setup can be found [here](https://github.com/MercuryWorkshop/Scramjet-App).

The deployable all-in-one bundle for [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet), a highly sophisticated proxy used for evading internet censorship or accessing websites in a controlled sandbox using the power of service-workers and more!

## Deployment

### Self-Hosting Securely with Cloudflare Tunnels (For playing on PC & sharing safely)
If you want to host this on your own PC so your friends can play, you should use **Cloudflare Tunnels**. This protects your home IP address from DDOS attacks and prevents you from having to open ports on your router.

1. **Start the local server:** Open a terminal in this directory and run `npm start` (it will start on port 8080).
2. **Install Cloudflared:** Download the `cloudflared` executable for your OS from [Cloudflare's website](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
3. **Run the Tunnel:** Open a new terminal and run:
   ```bash
   cloudflared tunnel --url http://localhost:8080
   ```
4. **Share the Link:** The terminal will spit out a random `.trycloudflare.com` link. Copy that link and send it to your friends! It is fully secured and hides your IP.

> Note: The site is protected by a password screen to keep strangers out. The password is `johnson`.


### HuggingFace Spaces (Recommended Free Host)
HuggingFace Spaces provides free Docker hosting that is less restrictive than Render.
1. Create a free account at [HuggingFace Spaces](https://huggingface.co/spaces)
2. Create a new Space, choose **Docker** as the Space SDK, and select "Blank".
3. In the Space settings, set the **Port** to `8080` (this is crucial).
4. Upload the files from this repository into the Space (or link your GitHub repo).
5. The space will automatically build the `Dockerfile` and host your site for free!



[![Run on Replit](https://binbashbanana.github.io/deploy-buttons/buttons/remade/replit.svg)](https://github.com/titaniumnetwork-dev/Ultraviolet-App/wiki/Run-on-Replit)
[![Deploy on Railway](https://binbashbanana.github.io/deploy-buttons/buttons/remade/railway.svg)](https://github.com/titaniumnetwork-dev/Ultraviolet-App/wiki/Deploy-on-Railway)
[![Deploy to Koyeb](https://binbashbanana.github.io/deploy-buttons/buttons/remade/koyeb.svg)](https://github.com/titaniumnetwork-dev/Ultraviolet-App/wiki/Deploy-to-Koyeb)

If you are deploying to an alternative service or to a server, refer to [Deploy via terminal](https://github.com/titaniumnetwork-dev/Ultraviolet-App/wiki/Deploy-via-terminal).

Additional information such as [customizing your frontend](https://github.com/titaniumnetwork-dev/Ultraviolet-App/wiki/Customizing-your-frontend) can be found on the [wiki](https://github.com/titaniumnetwork-dev/Ultraviolet-App/wiki).

Support and updates can be found in our [Discord Server](discord.gg/unblock).

> [!IMPORTANT]  
> Until deployed on a domain with a valid SSL certificate, Firefox will not be able to load the site. Use chromium for testing on localhost

### HTTP Transport

The example uses [EpoxyTransport](https://github.com/MercuryWorkshop/EpoxyTransport) to fetch proxied data encrypted.

You may also want to use [CurlTransport](https://github.com/MercuryWorkshop/CurlTransport), a different way of fetching encrypted data, or [Bare-Client](https://github.com/MercuryWorkshop/Bare-as-module3), the legacy (unencrypted!) transport.

See the [bare-mux](https://github.com/MercuryWorkshop/bare-mux) documentation for more information.
