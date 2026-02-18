# SEO and Search Discovery Guide

This guide outlines the steps to ensure that **Windows 98 Web Edition** is correctly indexed and discoverable by Google and other search engines.

## 1. Google Search Console Registration

To officially tell Google about your site, you should register it in Google Search Console.

1.  Go to [Google Search Console](https://search.google.com/search-console/about).
2.  Add a new property using the URL: `https://azayrahmad.github.io/win98-web/`.
3.  **Verification**: Google will ask you to verify ownership. Since you are using GitHub Pages, the easiest way is the **HTML tag** method:
    *   Copy the meta tag provided by Google (e.g., `<meta name="google-site-verification" content="..." />`).
    *   Add it to the `<head>` section of `index.html`.
    *   Deploy the change and click "Verify" in Search Console.

## 2. Submit the Sitemap

Once verified, you should submit your sitemap to speed up indexing:

1.  In Google Search Console, go to **Sitemaps** in the left sidebar.
2.  Enter `sitemap.xml` in the "Add a new sitemap" field.
3.  Click **Submit**.

## 3. Social Media Sharing

The app is now configured with OpenGraph and Twitter Card tags. When you share the URL on platforms like Twitter/X, Facebook, or LinkedIn, it will display a rich preview with:
*   **Title**: Windows 98 Web Edition
*   **Description**: A nostalgic, fully functional Windows 98 simulation...
*   **Image**: A high-quality screenshot of the desktop.

You can test how your link looks using these tools:
*   **Facebook**: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
    *   *Note: You may see a warning about a missing `fb:app_id`. This is only required if you want to use Facebook Insights (analytics). The link preview will still work perfectly without it. If you want to remove the warning, you must create an app at [developers.facebook.com](https://developers.facebook.com/apps/) and add `<meta property="fb:app_id" content="YOUR_APP_ID" />` to `index.html`.*
*   **Twitter/X**: The official validator is now deprecated. To test your card, simply paste the link into a new tweet draft on Twitter/X, and the preview should generate automatically after a second.
*   **LinkedIn**: [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

## 4. Content Updates

To maintain and improve search ranking:
*   **Keywords**: The current keywords include "Windows 98", "Doom", "Pinball", "Clippy", and "Retro Gaming". If you add new major features or games, update the `keywords` and `description` meta tags in `index.html`.
*   **Backlinks**: Share the project on communities like Reddit (r/retro, r/webdev), Hacker News, or specialized forums. Quality backlinks are the strongest signal for Google ranking.

## 5. Summary of Changes Made

*   **`index.html`**: Added SEO meta tags, canonical links, and social media preview tags.
*   **`public/robots.txt`**: Created to allow crawling and point to the sitemap.
*   **`public/sitemap.xml`**: Created to list the site's main URL for indexing.
*   **`vite.config.js`**: Updated the PWA manifest for consistent branding.
*   **`public/img/og-image.png`**: Added a screenshot for rich social media previews.
