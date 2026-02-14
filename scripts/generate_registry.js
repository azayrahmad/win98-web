
import fs from 'fs';
import path from 'path';

const appsDir = 'src/apps';
const registryPath = 'src/config/app-registry.js';

function extractConfig(content) {
    const match = content.match(/static config = ([\s\S]*?);/);
    if (match) {
        return match[1].trim();
    }
    return null;
}

function generateRegistry() {
    const rawMetadata = {};
    const searchDirs = ['src/apps', 'src/shell'];

    for (const searchDir of searchDirs) {
        if (!fs.existsSync(searchDir)) continue;
        const dirs = fs.readdirSync(searchDir);

        for (const dir of dirs) {
            const dirPath = path.join(searchDir, dir);
            if (!fs.statSync(dirPath).isDirectory()) continue;

            const files = fs.readdirSync(dirPath);
            const appFile = files.find(f => f.endsWith('-app.js'));

            if (appFile) {
                const content = fs.readFileSync(path.join(dirPath, appFile), 'utf-8');
                const config = extractConfig(content);
                if (config) {
                    const relativeSearchDir = searchDir.replace('src/', '');
                    rawMetadata[dir] = {
                        config,
                        file: `../${relativeSearchDir}/${dir}/${appFile}`
                    };
                }
            }
        }
    }

    let output = `import { ICONS } from './icons.js';
import { getClippyMenuItems } from '../apps/clippy/clippy.js';
import { getESheepMenuItems } from '../apps/esheep/esheep.js';
import { getWebampMenuItems } from '../apps/webamp/webamp.js';

export const appRegistry = {
`;

    for (const key in rawMetadata) {
        const item = rawMetadata[key];
        let config = item.config;

        // Ensure variable references are preserved
        config = config.replace(/ICONS/g, 'ICONS');
        config = config.replace(/getClippyMenuItems/g, 'getClippyMenuItems');
        config = config.replace(/getESheepMenuItems/g, 'getESheepMenuItems');
        config = config.replace(/getWebampMenuItems/g, 'getWebampMenuItems');

        output += `  "${key}": {
    config: ${config},
    importApp: () => import("${item.file}")
  },
`;
    }

    output += `};
`;

    fs.writeFileSync(registryPath, output);
    console.log(`Successfully generated ${registryPath}`);
}

generateRegistry();
