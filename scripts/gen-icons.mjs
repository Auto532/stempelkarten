import sharp from "sharp";

const svg192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" rx="32" fill="#18181b"/>
  <text x="96" y="135" font-size="100" text-anchor="middle" fill="#fbbf24" font-family="serif">S</text>
</svg>`;

const svg512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="80" fill="#18181b"/>
  <text x="256" y="360" font-size="270" text-anchor="middle" fill="#fbbf24" font-family="serif">S</text>
</svg>`;

await sharp(Buffer.from(svg192)).png().toFile("public/icon-192.png");
console.log("icon-192.png ok");

await sharp(Buffer.from(svg512)).png().toFile("public/icon-512.png");
console.log("icon-512.png ok");
