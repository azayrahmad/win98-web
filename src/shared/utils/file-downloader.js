async function createBlobFromContent(content) {
    if (typeof content === 'string') {
        // If it's a URL-like string, fetch it.
        if (content.startsWith('http') || content.startsWith('data:') || content.includes('/')) {
            try {
                const response = await fetch(content);
                if (!response.ok) {
                    console.error(`HTTP error! status: ${response.status} for URL: ${content}`);
                    return null; // Indicate failure
                }
                return await response.blob();
            } catch (error) {
                console.error(`Failed to fetch content from URL: ${content}`, error);
                return null; // Indicate failure
            }
        } else {
            // It's a plain string, use it as the content.
            return new Blob([content], { type: 'text/plain' });
        }
    } else if (content instanceof Blob) {
        return content; // It's already a blob
    } else {
        // It could be an ArrayBuffer or other data type.
        return new Blob([content], { type: 'application/octet-stream' });
    }
}


export async function downloadFile(filename, content) {
    if (!filename || !content) {
        console.error("downloadFile requires both filename and content.");
        return;
    }

    const blob = await createBlobFromContent(content);

    if (!blob) {
        // The blob creation failed (e.g., fetch error), so we stop.
        console.error(`Could not create a blob for ${filename}. Download cancelled.`);
        return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
