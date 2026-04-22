// STRATO - Dynamic Proxy Fallback Client

(function() {
    let activeBackend = null;

    async function fetchProxyStatus() {
        try {
            const res = await fetch('/api/proxy-status');
            if (res.ok) {
                const data = await res.json();
                if (data.activeBackend) {
                    activeBackend = data.activeBackend;
                }
            }
        } catch (e) {
            console.warn("Failed to fetch proxy status:", e);
        }
    }

    function showToast(message) {
        // Use existing glassmorphism card styles
        const toast = document.createElement('div');
        toast.className = 'glass-card proxy-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: rgba(10, 10, 15, 0.7);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: #fff;
            font-size: 14px;
            z-index: 9999;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            transition: opacity 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        let requestUrl = args[0];

        try {
            const response = await originalFetch.apply(this, args);
            if (!response.ok && isProxyRequest(requestUrl)) {
                throw new Error("Proxy request failed with status " + response.status);
            }
            return response;
        } catch (error) {
            if (isProxyRequest(requestUrl)) {
                console.warn("Proxy request failed, attempting fallback...", error);
                showToast("Switching proxy...");

                await fetchProxyStatus();

                if (activeBackend) {
                    const newUrl = rewriteProxyUrl(requestUrl, activeBackend);
                    if (newUrl) {
                        args[0] = newUrl;
                    }
                }

                return originalFetch.apply(this, args);
            }
            throw error;
        }
    };

    function isProxyRequest(url) {
        let urlStr = getUrlString(url);
        if (!urlStr) return false;

        return urlStr.includes('/bare/') || urlStr.includes('/wisp/') || urlStr.includes('/proxy');
    }

    function getUrlString(url) {
        if (typeof url === 'string') return url;
        if (url instanceof URL) return url.toString();
        if (url instanceof Request) return url.url;
        if (url && typeof url === 'object' && url.url) return url.url;
        return null;
    }

    function rewriteProxyUrl(urlObj, newOrigin) {
        let urlStr = getUrlString(urlObj);
        if (!urlStr) return urlObj;

        try {
            // Check if it's an absolute URL
            if (urlStr.startsWith('http://') || urlStr.startsWith('https://') || urlStr.startsWith('ws://') || urlStr.startsWith('wss://')) {
                const parsedUrl = new URL(urlStr);
                const parsedOrigin = new URL(newOrigin);

                // Keep the original protocol, but replace hostname and port
                // Or if we must replace the whole origin:
                // Note: activeBackend could be http://something or wss://something
                // But typically it's http/https.

                let isWs = parsedUrl.protocol.startsWith('ws');
                let newProtocol = parsedOrigin.protocol;
                if (isWs) {
                    newProtocol = newProtocol.replace('http', 'ws');
                }

                parsedUrl.protocol = newProtocol;
                parsedUrl.hostname = parsedOrigin.hostname;
                parsedUrl.port = parsedOrigin.port;

                if (urlObj instanceof Request) {
                    // Clone the request with the new URL
                    return new Request(parsedUrl.toString(), urlObj);
                }
                return parsedUrl.toString();
            } else {
                // If it's a relative URL, we append it to the new origin
                // Note: newOrigin shouldn't have a trailing slash if we're doing this, but URL handles it
                const parsedUrl = new URL(urlStr, newOrigin);
                if (urlObj instanceof Request) {
                    return new Request(parsedUrl.toString(), urlObj);
                }
                return parsedUrl.toString();
            }
        } catch (e) {
            console.error("Failed to rewrite proxy url:", e);
            return urlObj;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fetchProxyStatus);
    } else {
        fetchProxyStatus();
    }
})();
