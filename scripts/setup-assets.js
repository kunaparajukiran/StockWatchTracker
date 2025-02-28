const fs = require('fs').promises;
const path = require('path');

async function copyFontAwesomeAssets() {
    // Create directories if they don't exist
    await fs.mkdir('lib/fontawesome/css', { recursive: true });
    await fs.mkdir('lib/fontawesome/webfonts', { recursive: true });

    // Copy CSS files
    await fs.copyFile(
        'node_modules/@fortawesome/fontawesome-free/css/all.min.css',
        'lib/fontawesome/css/all.min.css'
    );

    // Copy webfonts
    const webfontsDir = 'node_modules/@fortawesome/fontawesome-free/webfonts';
    const files = await fs.readdir(webfontsDir);
    
    for (const file of files) {
        await fs.copyFile(
            path.join(webfontsDir, file),
            path.join('lib/fontawesome/webfonts', file)
        );
    }

    console.log('Font Awesome assets copied successfully!');
}

copyFontAwesomeAssets().catch(console.error);
