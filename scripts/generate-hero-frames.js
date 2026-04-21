#!/usr/bin/env node
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const SRC = path.join(__dirname, "..", "assets", "images", "Blastoise-transparent-bg-10x.png");
const OUT_ROOT = path.join(__dirname, "..", "assets", "images", "hero-sequence");

const TARGET_X = 0.3765;
const TARGET_Y = 0.408;
const FRAME_COUNT = 90;
const FINAL_SCALE = 90;
const BG = { r: 45, g: 0, b: 0, alpha: 1 };

const PROFILES = [
  {
    name: "desktop",
    frameW: 1600,
    frameH: 900,
    objectPositionX: 0.55,
    objectPositionY: 0.45,
  },
  {
    name: "mobile",
    frameW: 900,
    frameH: 1600,
    objectPositionX: 0.5,
    objectPositionY: 0.5,
  },
];

function easeInQuad(t) {
  return t * t;
}

async function renderProfile(profile, meta) {
  const { name, frameW, frameH, objectPositionX, objectPositionY } = profile;
  const IW = meta.width;
  const IH = meta.height;

  const frameAspect = frameW / frameH;
  const imageAspect = IW / IH;
  let displayedWidth, displayedHeight;
  if (frameAspect > imageAspect) {
    displayedHeight = frameH;
    displayedWidth = displayedHeight * imageAspect;
  } else {
    displayedWidth = frameW;
    displayedHeight = displayedWidth / imageAspect;
  }
  const imageOffsetX = (frameW - displayedWidth) * objectPositionX;
  const imageOffsetY = (frameH - displayedHeight) * objectPositionY;
  const targetDisplayX = imageOffsetX + displayedWidth * TARGET_X;
  const targetDisplayY = imageOffsetY + displayedHeight * TARGET_Y;

  const outDir = path.join(OUT_ROOT, name);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n[${name}] frame ${frameW}x${frameH}, displayed image ${displayedWidth.toFixed(0)}x${displayedHeight.toFixed(0)} at (${imageOffsetX.toFixed(0)}, ${imageOffsetY.toFixed(0)})`);

  for (let i = 0; i < FRAME_COUNT; i++) {
    const progress = FRAME_COUNT === 1 ? 0 : i / (FRAME_COUNT - 1);
    const eased = easeInQuad(progress);
    const scale = 1 + (FINAL_SCALE - 1) * eased;
    const tx = eased * (frameW / 2 - targetDisplayX);
    const ty = eased * (frameH / 2 - targetDisplayY);

    const imgLeft = targetDisplayX + scale * (imageOffsetX - targetDisplayX) + tx;
    const imgTop = targetDisplayY + scale * (imageOffsetY - targetDisplayY) + ty;
    const imgW = scale * displayedWidth;
    const imgH = scale * displayedHeight;

    const visLeft = Math.max(0, imgLeft);
    const visTop = Math.max(0, imgTop);
    const visRight = Math.min(frameW, imgLeft + imgW);
    const visBottom = Math.min(frameH, imgTop + imgH);

    const outPath = path.join(outDir, `frame-${String(i).padStart(3, "0")}.webp`);

    if (visRight <= visLeft || visBottom <= visTop) {
      await sharp({
        create: { width: frameW, height: frameH, channels: 3, background: BG },
      })
        .webp({ quality: 80, effort: 4 })
        .toFile(outPath);
      continue;
    }

    const sxMin = ((visLeft - imgLeft) / imgW) * IW;
    const syMin = ((visTop - imgTop) / imgH) * IH;
    const sxMax = ((visRight - imgLeft) / imgW) * IW;
    const syMax = ((visBottom - imgTop) / imgH) * IH;

    const srcX = Math.max(0, Math.min(IW - 1, Math.round(sxMin)));
    const srcY = Math.max(0, Math.min(IH - 1, Math.round(syMin)));
    const srcW = Math.max(1, Math.min(IW - srcX, Math.round(sxMax - sxMin)));
    const srcH = Math.max(1, Math.min(IH - srcY, Math.round(syMax - syMin)));

    const destLeft = Math.round(visLeft);
    const destTop = Math.round(visTop);
    const destW = Math.max(1, Math.min(frameW - destLeft, Math.round(visRight - visLeft)));
    const destH = Math.max(1, Math.min(frameH - destTop, Math.round(visBottom - visTop)));

    const resized = await sharp(SRC)
      .extract({ left: srcX, top: srcY, width: srcW, height: srcH })
      .resize(destW, destH, { fit: "fill", kernel: "lanczos3" })
      .flatten({ background: BG })
      .png()
      .toBuffer();

    await sharp({
      create: { width: frameW, height: frameH, channels: 3, background: BG },
    })
      .composite([{ input: resized, top: destTop, left: destLeft }])
      .webp({ quality: 80, effort: 4 })
      .toFile(outPath);
  }

  const files = fs.readdirSync(outDir).map((f) => fs.statSync(path.join(outDir, f)).size);
  const total = files.reduce((a, b) => a + b, 0);
  console.log(`[${name}] ${files.length} frames, ${(total / 1024 / 1024).toFixed(2)} MB`);
}

async function main() {
  const meta = await sharp(SRC).metadata();
  console.log(`Source: ${meta.width}x${meta.height}`);

  // Wipe old flat output if it exists from previous versions
  const legacy = fs.readdirSync(OUT_ROOT).filter((f) => f.startsWith("frame-"));
  for (const f of legacy) fs.rmSync(path.join(OUT_ROOT, f));

  for (const profile of PROFILES) {
    await renderProfile(profile, meta);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
