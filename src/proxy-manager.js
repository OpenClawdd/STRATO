import fs from "node:fs";
import { join } from "node:path";

export class ProxyManager {
	constructor() {
		this.backends = [];
		this.activeBackend = null;
		this.healthInterval = null;

		this._loadBackends();
		if (this.backends.length > 0) {
			this.activeBackend = this.backends[0].url;
		}
		this.startHealthCheck();
	}

	_loadBackends() {
		const urls = process.env.PROXY_BACKENDS
			? process.env.PROXY_BACKENDS.split(",").map(s => s.trim()).filter(Boolean)
			: ["http://localhost:8080"];

		this.backends = urls.map((url, index) => ({
			url,
			healthy: true, // assume healthy initially
			index,
		}));
	}

	getActiveBackend() {
		return this.activeBackend;
	}

	startHealthCheck() {
		const interval = parseInt(process.env.PROXY_HEALTH_INTERVAL, 10) || 60000;
		if (this.healthInterval) {
			clearInterval(this.healthInterval);
		}
		this.healthInterval = setInterval(() => this.runHealthCheck(), interval);
		// Run initial check
		this.runHealthCheck();
	}

	async runHealthCheck() {
		const previousActive = this.activeBackend;

		for (const backend of this.backends) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 3000);
				await fetch(backend.url, {
					method: "HEAD",
					signal: controller.signal
				});
				clearTimeout(timeoutId);
				backend.healthy = true;
			} catch (err) {
				backend.healthy = false;
			}
		}

		// Find the first healthy backend
		const nextActiveBackend = this.backends.find(b => b.healthy);

		if (nextActiveBackend) {
			this.activeBackend = nextActiveBackend.url;
		} else if (this.backends.length > 0) {
			// fallback to the first one if none are healthy, just in case
			this.activeBackend = this.backends[0].url;
		}

		if (previousActive !== this.activeBackend) {
			this._logSwitch(previousActive, this.activeBackend);
		}
	}

	_logSwitch(from, to) {
		const timestamp = new Date().toISOString();
		const message = `[${timestamp}] Proxy backend switched from ${from} to ${to}\n`;
		const logFile = join(process.cwd(), "server.log");

		try {
			fs.appendFileSync(logFile, message);
			console.log(message.trim());
		} catch (err) {
			console.error("Failed to write to server.log:", err);
		}
	}

	getStatus() {
		return {
			activeBackend: this.activeBackend,
			backends: this.backends,
		};
	}
}

export const proxyManager = new ProxyManager();
