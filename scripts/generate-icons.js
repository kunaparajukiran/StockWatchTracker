const sharp = require('sharp');
const fs = require('fs').promises;

const sizes = [16, 48, 128];

async function generateIcons() {
    for (const size of sizes) {
        await sharp('icons/icon.svg')
            .resize(size, size)
            .png()
            .toFile(`icons/icon${size}.png`);
    }
    console.log('Icons generated successfully!');
}

generateIcons().catch(console.error);
