import sharp from "sharp";
import { mkdirSync } from "fs";

const src = "public/brand/app-icon.png";

const launcher = {
  "mipmap-ldpi": 36,
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const foreground = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
};

for (const [dir, size] of Object.entries(launcher)) {
  const out = `android/app/src/main/res/${dir}`;
  mkdirSync(out, { recursive: true });
  const buf = await sharp(src).resize(size, size, { fit: "cover" }).png().toBuffer();
  await sharp(buf).toFile(`${out}/ic_launcher.png`);
  await sharp(buf).toFile(`${out}/ic_launcher_round.png`);
  console.log(dir, "launcher", size);
}

for (const [dir, size] of Object.entries(foreground)) {
  const out = `android/app/src/main/res/${dir}`;
  mkdirSync(out, { recursive: true });
  await sharp(src).resize(size, size, { fit: "cover" }).png().toFile(`${out}/ic_launcher_foreground.png`);
  console.log(dir, "foreground", size);
}

await sharp(src).resize(512, 512, { fit: "cover" }).png().toFile("android/app/src/main/res/drawable/ic_launcher_foreground_full.png");
await sharp(src).resize(288, 288, { fit: "cover" }).png().toFile("android/app/src/main/res/drawable/splash_icon.png");
console.log("done");
