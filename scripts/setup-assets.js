const fs = require('fs').promises;
const path = require('path');

async function copyBootstrapAssets() {
    // Create directories if they don't exist
    await fs.mkdir('lib/bootstrap/css', { recursive: true });
    await fs.mkdir('lib/bootstrap/js', { recursive: true });

    // Copy Bootstrap CSS and JS files
    await fs.copyFile(
        'node_modules/bootstrap/dist/css/bootstrap.min.css',
        'lib/bootstrap/css/bootstrap.min.css'
    );
    await fs.copyFile(
        'node_modules/bootstrap/dist/js/bootstrap.bundle.min.js',
        'lib/bootstrap/js/bootstrap.bundle.min.js'
    );

    console.log('Bootstrap assets copied successfully!');
}

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

async function setupAssets() {
    try {
        await copyBootstrapAssets();
        await copyFontAwesomeAssets();
        console.log('All assets setup completed successfully!');
    } catch (error) {
        console.error('Error setting up assets:', error);
        process.exit(1);
    }
}

setupAssets().catch(console.error);