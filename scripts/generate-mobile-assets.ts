/**
 * Generates every Android launcher icon + splash screen from assets/logo.png.
 *
 * Replaces `npx @capacitor/assets` (whose pinned sharp@0.32 cannot install on
 * Node 24). Rerun after changing the brand logo:
 *
 *   pnpm tsx scripts/generate-mobile-assets.ts
 */
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const LOGO = "assets/logo.png"
const RES = "android/app/src/main/res"
// Matches the logo's own opaque background so icons and splash blend seamlessly.
const BG = "#FCFAFB"

async function composeOnCanvas(
  width: number,
  height: number,
  logoRatio: number,
  background: string | { r: number; g: number; b: number; alpha: number },
): Promise<Buffer> {
  const inner = Math.round(Math.min(width, height) * logoRatio)
  const logo = await sharp(LOGO)
    .resize(inner, inner, { fit: "inside" })
    .toBuffer()
  return sharp({
    create: { width, height, channels: 4, background },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer()
}

async function write(file: string, buf: Buffer) {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, buf)
  console.log("wrote", file)
}

async function main() {
  const densities = [
    { name: "mdpi", scale: 1 },
    { name: "hdpi", scale: 1.5 },
    { name: "xhdpi", scale: 2 },
    { name: "xxhdpi", scale: 3 },
    { name: "xxxhdpi", scale: 4 },
  ]

  for (const { name, scale } of densities) {
    const launcher = Math.round(48 * scale)
    const foreground = Math.round(108 * scale)
    // Launcher (legacy) + round: logo fills most of the tile.
    const tile = await composeOnCanvas(launcher, launcher, 0.82, BG)
    await write(`${RES}/mipmap-${name}/ic_launcher.png`, tile)
    await write(`${RES}/mipmap-${name}/ic_launcher_round.png`, tile)
    // Adaptive foreground: keep logo inside the center 66% safe zone.
    await write(
      `${RES}/mipmap-${name}/ic_launcher_foreground.png`,
      await composeOnCanvas(foreground, foreground, 0.5, {
        r: 0, g: 0, b: 0, alpha: 0,
      }),
    )
  }

  const splashPort = [
    { name: "mdpi", w: 320, h: 480 },
    { name: "hdpi", w: 480, h: 800 },
    { name: "xhdpi", w: 720, h: 1280 },
    { name: "xxhdpi", w: 960, h: 1600 },
    { name: "xxxhdpi", w: 1280, h: 1920 },
  ]
  for (const { name, w, h } of splashPort) {
    await write(
      `${RES}/drawable-port-${name}/splash.png`,
      await composeOnCanvas(w, h, 0.42, BG),
    )
    await write(
      `${RES}/drawable-land-${name}/splash.png`,
      await composeOnCanvas(h, w, 0.42, BG),
    )
  }
  await write(`${RES}/drawable/splash.png`, await composeOnCanvas(480, 320, 0.42, BG))

  // Adaptive icon background layer color.
  await write(
    `${RES}/values/ic_launcher_background.xml`,
    Buffer.from(
      `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`,
    ),
  )
  console.log("done")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
