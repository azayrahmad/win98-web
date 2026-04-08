# Internet Explorer Retro Proxy Setup Guide

To use the new emulated Internet Explorer with real archived websites, you need to set up a CORS proxy. A Cloudflare Worker is the best free option for this.

## Cloudflare Worker Setup

1.  **Create a Cloudflare Account**: If you don't have one, sign up for free at [cloudflare.com](https://www.cloudflare.com/).
2.  **Create a Worker**:
    *   Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
    *   Navigate to **Workers & Pages** > **Overview**.
    *   Click **Create application** > **Create Worker**.
    *   Name it `win98-web-proxy` and click **Deploy**.
3.  **Configure the Worker**:
    *   Click **Edit Code**.
    *   Replace the entire content of `worker.js` with the script provided below.
    *   Click **Save and Deploy**.
4.  **Get your Proxy URL**:
    *   Your worker URL will look like `https://win98-web-proxy.yourname.workers.dev/`.
    *   Copy this URL.

## Using the Proxy in Win98-Web

1.  Open the emulated Internet Explorer in your browser.
2.  (Optional) If I implement a settings UI: Paste the URL into the "Proxy Settings" dialog.
3.  Currently, the proxy is hardcoded to a default, but you can change it in `localStorage`:
    *   Open Browser Console (F12).
    *   Type: `localStorage.setItem("ie-proxy-url", "https://your-worker-url.workers.dev/proxy/")`
    *   Restart the Internet Explorer app.

---

## Proxy Script (`worker.js`)

```javascript
/**
 * win98-web-proxy
 * A simple CORS proxy for OldWebToday-style historical browsing.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Expose-Headers": "*",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle OPTIONS request for CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Expecting URL format: /proxy/http://example.com or /proxy/https://web.archive.org/...
    let targetUrl = url.pathname.slice(1);
    if (targetUrl.startsWith("proxy/")) {
        targetUrl = targetUrl.replace("proxy/", "");
    }

    if (!targetUrl) {
      return new Response("Win98 Web Proxy is running. Usage: /proxy/http://url-to-fetch", {
        headers: { "Content-Type": "text/plain", ...CORS_HEADERS }
      });
    }

    // Ensure protocol
    if (!targetUrl.startsWith("http")) {
        targetUrl = "http://" + targetUrl;
    }

    try {
      const newRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: "follow"
      });

      const response = await fetch(newRequest);

      // Reconstruct the response with CORS headers
      const newResponse = new Response(response.body, response);
      Object.keys(CORS_HEADERS).forEach(key => {
        newResponse.headers.set(key, CORS_HEADERS[key]);
      });

      return newResponse;
    } catch (err) {
      return new Response("Proxy Error: " + err.message, {
        status: 500,
        headers: CORS_HEADERS
      });
    }
  },
};
```
