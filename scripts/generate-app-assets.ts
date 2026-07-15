/**
 * Generates every visual asset the native app ships with, from the single
 * source-of-truth brand logo (assets/logo.png).
 *
 * Why programmatic instead of hand-drawn files:
 *  - the brand logo is an opaque PNG on white; dropped straight onto the
 *    purple splash it renders as a white slab. We key out the white here.
 *  - onboarding/empty-state art must stay on-brand and identical in style;
 *    generating it from the same palette guarantees that and keeps every
 *    asset in-repo (no CDN, no hotlink, no licence ambiguity).
 *  - no generated human faces anywhere: illustrations are abstract/scenic
 *    only. Real doctor photos come from the database.
 *
 * Rerun after changing the logo:  pnpm tsx scripts/generate-app-assets.ts
 */
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const LOGO = "assets/logo.png"
const OUT = "apps/mobile/assets"

// Brand palette — mirrors apps/mobile/src/theme/index.ts.
const PRIMARY = "#4A1D96"
const PRIMARY_DEEP = "#2B1047"
const PRIMARY_SOFT = "#F3EEFC"
const LAVENDER = "#7C5CC4"
const GOLD = "#C9A24B"
const CREAM = "#FFFCF7"
const INK = "#1A1740"

async function write(file: string, buf: Buffer) {
  const full = path.join(OUT, file)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, buf)
  console.log("wrote", path.relative(".", full))
}

/**
 * Keys out the logo's white background into real transparency, then trims to
 * the artwork. `removeAlpha`+`ensureAlpha` alone can't do this — we build the
 * alpha mask from luminance so anti-aliased edges fade out instead of
 * leaving a white fringe.
 */
async function transparentLogo(): Promise<Buffer> {
  const src = sharp(LOGO).ensureAlpha()
  const { data, info } = await src
    .raw()
    .toBuffer({ resolveWithObject: true })

  const out = Buffer.alloc(info.width * info.height * 4)
  for (let i = 0; i < info.width * info.height; i++) {
    const s = i * info.channels
    const d = i * 4
    const r = data[s]
    const g = data[s + 1]
    const b = data[s + 2]
    // Luminance → alpha: white (255) becomes fully transparent, dark ink
    // stays fully opaque, mid greys keep proportional coverage.
    const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255
    const alpha = Math.round(Math.max(0, Math.min(1, (1 - lum) * 1.12)) * 255)
    // Keep the original hue but un-premultiply against white so colours stay
    // true where the logo is coloured rather than pure black.
    out[d] = r
    out[d + 1] = g
    out[d + 2] = b
    out[d + 3] = alpha
  }

  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .trim({ threshold: 2 })
    .toBuffer()
}

/** SVG → PNG buffer. */
function render(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/* ── Onboarding illustrations ─────────────────────────────────────────────
   Abstract, calm, on-brand scenes. No faces, no text baked into the image
   (text must stay translatable), RTL-neutral compositions. */

const W = 900
const H = 900

function frame(inner: string, tint = PRIMARY_SOFT): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${tint}"/>
      <stop offset="1" stop-color="${CREAM}"/>
    </linearGradient>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${LAVENDER}"/>
      <stop offset="1" stop-color="${PRIMARY}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E4C87E"/>
      <stop offset="1" stop-color="${GOLD}"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="26"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" rx="0" fill="url(#bg)"/>
  <circle cx="${W * 0.82}" cy="${H * 0.16}" r="150" fill="${GOLD}" opacity=".14" filter="url(#soft)"/>
  <circle cx="${W * 0.16}" cy="${H * 0.86}" r="180" fill="${PRIMARY}" opacity=".10" filter="url(#soft)"/>
  ${inner}
</svg>`
}

/** 1 — Choose your doctor with confidence: verified shield + profile cards. */
function slideTrust(): string {
  return frame(`
  <g transform="translate(450 430)">
    <circle r="250" fill="#fff" opacity=".72"/>
    <circle r="250" fill="none" stroke="${PRIMARY}" stroke-opacity=".14" stroke-width="2"/>
    <!-- shield -->
    <path d="M0,-168 L128,-118 C128,-8 84,102 0,168 C-84,102 -128,-8 -128,-118 Z"
          fill="url(#grad)"/>
    <path d="M-52,-8 L-16,32 L60,-52" fill="none" stroke="#fff" stroke-width="20"
          stroke-linecap="round" stroke-linejoin="round"/>
    <!-- gold accent orbit -->
    <circle cx="150" cy="-150" r="26" fill="url(#gold)"/>
    <circle cx="-168" cy="96" r="15" fill="url(#gold)" opacity=".75"/>
  </g>
  <!-- floating profile chips (abstract, no faces) -->
  <g opacity=".95">
    <rect x="120" y="150" width="210" height="74" rx="24" fill="#fff"/>
    <circle cx="163" cy="187" r="22" fill="${PRIMARY_SOFT}"/>
    <rect x="196" y="172" width="104" height="12" rx="6" fill="${INK}" opacity=".22"/>
    <rect x="196" y="194" width="66" height="10" rx="5" fill="${INK}" opacity=".12"/>
  </g>
  <g opacity=".95">
    <rect x="570" y="676" width="210" height="74" rx="24" fill="#fff"/>
    <circle cx="613" cy="713" r="22" fill="${PRIMARY_SOFT}"/>
    <rect x="646" y="698" width="104" height="12" rx="6" fill="${INK}" opacity=".22"/>
    <rect x="646" y="720" width="66" height="10" rx="5" fill="${INK}" opacity=".12"/>
  </g>`)
}

/** 2 — Consultation closer than you think: video-call composition. */
function slideConsult(): string {
  return frame(
    `
  <g transform="translate(450 430)">
    <rect x="-260" y="-190" width="520" height="360" rx="40" fill="#fff" opacity=".8"/>
    <rect x="-260" y="-190" width="520" height="360" rx="40" fill="none"
          stroke="${PRIMARY}" stroke-opacity=".12" stroke-width="2"/>
    <!-- screen -->
    <rect x="-216" y="-146" width="432" height="248" rx="26" fill="url(#grad)"/>
    <!-- abstract silhouette: shoulders + head, no facial features -->
    <circle cx="0" cy="-46" r="46" fill="#fff" opacity=".9"/>
    <path d="M-86,80 a86,74 0 0 1 172,0 Z" fill="#fff" opacity=".9"/>
    <!-- call controls -->
    <g transform="translate(0 140)">
      <rect x="-120" y="-24" width="240" height="48" rx="24" fill="#fff"/>
      <circle cx="-64" cy="0" r="14" fill="${PRIMARY}" opacity=".8"/>
      <circle cx="0" cy="0" r="14" fill="${PRIMARY}" opacity=".8"/>
      <circle cx="64" cy="0" r="16" fill="#D9484A"/>
    </g>
    <circle cx="238" cy="-196" r="24" fill="url(#gold)"/>
  </g>`,
    "#F6F1FB",
  )
}

/** 3 — Your whole journey in one place: timeline / records. */
function slideJourney(): string {
  const row = (y: number, w: number, badge: string) => `
    <g transform="translate(0 ${y})">
      <rect x="-230" y="-30" width="460" height="60" rx="20" fill="#fff"/>
      <circle cx="-192" cy="0" r="15" fill="${badge}"/>
      <rect x="-160" y="-9" width="${w}" height="12" rx="6" fill="${INK}" opacity=".2"/>
      <rect x="-160" y="9" width="${w * 0.55}" height="9" rx="4.5" fill="${INK}" opacity=".1"/>
    </g>`
  return frame(
    `
  <g transform="translate(450 430)">
    <rect x="-280" y="-260" width="560" height="520" rx="44" fill="#fff" opacity=".7"/>
    <rect x="-280" y="-260" width="560" height="520" rx="44" fill="none"
          stroke="${PRIMARY}" stroke-opacity=".12" stroke-width="2"/>
    <!-- timeline spine -->
    <rect x="-194" y="-190" width="4" height="380" rx="2" fill="${PRIMARY}" opacity=".16"/>
    ${row(-150, 210, PRIMARY)}
    ${row(-40, 170, LAVENDER)}
    ${row(70, 190, GOLD)}
    ${row(180, 150, "#CFC5E4")}
    <circle cx="250" cy="-238" r="26" fill="url(#gold)"/>
  </g>`,
    "#F4EFFB",
  )
}

/** 4 — Privacy first: lock + protected record. */
function slidePrivacy(): string {
  return frame(
    `
  <g transform="translate(450 430)">
    <circle r="236" fill="#fff" opacity=".74"/>
    <circle r="236" fill="none" stroke="${PRIMARY}" stroke-opacity=".14" stroke-width="2"/>
    <!-- lock body -->
    <rect x="-112" y="-16" width="224" height="176" rx="42" fill="url(#grad)"/>
    <!-- shackle -->
    <path d="M-62,-16 v-52 a62,62 0 0 1 124,0 v52" fill="none"
          stroke="url(#grad)" stroke-width="30" stroke-linecap="round"/>
    <!-- keyhole -->
    <circle cx="0" cy="58" r="22" fill="#fff"/>
    <rect x="-9" y="58" width="18" height="46" rx="9" fill="#fff"/>
    <circle cx="176" cy="-158" r="24" fill="url(#gold)"/>
    <circle cx="-186" cy="130" r="14" fill="url(#gold)" opacity=".7"/>
  </g>`,
    "#F2F7F4",
  )
}

/* ── Empty states / status art ────────────────────────────────────────── */

const EW = 640
const EH = 480

function emptyFrame(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${EW}" height="${EH}" viewBox="0 0 ${EW} ${EH}">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${LAVENDER}"/>
      <stop offset="1" stop-color="${PRIMARY}"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E4C87E"/>
      <stop offset="1" stop-color="${GOLD}"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>
  <circle cx="${EW * 0.5}" cy="${EH * 0.5}" r="180" fill="${PRIMARY}" opacity=".06" filter="url(#soft)"/>
  ${inner}
</svg>`
}

function emptyAppointments(): string {
  return emptyFrame(`
  <g transform="translate(320 240)">
    <rect x="-130" y="-118" width="260" height="236" rx="34" fill="#fff"
          stroke="${PRIMARY}" stroke-opacity=".14" stroke-width="2"/>
    <rect x="-130" y="-118" width="260" height="62" rx="34" fill="url(#grad)"/>
    <rect x="-130" y="-90" width="260" height="34" fill="url(#grad)"/>
    <circle cx="-70" cy="-138" r="10" fill="${PRIMARY_DEEP}"/>
    <circle cx="70" cy="-138" r="10" fill="${PRIMARY_DEEP}"/>
    <g fill="${PRIMARY}" opacity=".16">
      <rect x="-98" y="-32" width="42" height="34" rx="9"/>
      <rect x="-40" y="-32" width="42" height="34" rx="9"/>
      <rect x="18" y="-32" width="42" height="34" rx="9"/>
      <rect x="-98" y="14" width="42" height="34" rx="9"/>
    </g>
    <circle cx="40" cy="34" r="30" fill="url(#gold)"/>
    <path d="M28,34 l8,9 l17,-19" fill="none" stroke="#fff" stroke-width="6"
          stroke-linecap="round" stroke-linejoin="round"/>
  </g>`)
}

function emptyFiles(): string {
  return emptyFrame(`
  <g transform="translate(320 240)">
    <rect x="-118" y="-130" width="236" height="260" rx="28" fill="#fff"
          stroke="${PRIMARY}" stroke-opacity=".14" stroke-width="2"/>
    <path d="M40,-130 h78 v78 Z" fill="${PRIMARY_SOFT}"/>
    <g fill="${PRIMARY}" opacity=".14">
      <rect x="-78" y="-40" width="156" height="14" rx="7"/>
      <rect x="-78" y="0" width="156" height="14" rx="7"/>
      <rect x="-78" y="40" width="96" height="14" rx="7"/>
    </g>
    <circle cx="86" cy="96" r="30" fill="url(#gold)"/>
    <path d="M86,82 v28 M72,96 h28" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
  </g>`)
}

function emptyNotifications(): string {
  return emptyFrame(`
  <g transform="translate(320 236)">
    <path d="M0,-124 a86,86 0 0 1 86,86 v56 l26,40 h-224 l26,-40 v-56 a86,86 0 0 1 86,-86 Z"
          fill="#fff" stroke="${PRIMARY}" stroke-opacity=".14" stroke-width="2"/>
    <path d="M0,-124 a86,86 0 0 1 86,86 v10 h-172 v-10 a86,86 0 0 1 86,-86 Z" fill="url(#grad)"/>
    <rect x="-14" y="-142" width="28" height="22" rx="11" fill="url(#grad)"/>
    <path d="M-30,70 a30,26 0 0 0 60,0 Z" fill="${PRIMARY}" opacity=".2"/>
    <circle cx="96" cy="-96" r="24" fill="url(#gold)"/>
  </g>`)
}

function emptyInvoices(): string {
  return emptyFrame(`
  <g transform="translate(320 240)">
    <path d="M-108,-134 h216 v250 l-36,-22 l-36,22 l-36,-22 l-36,22 l-36,-22 l-36,22 Z"
          fill="#fff" stroke="${PRIMARY}" stroke-opacity=".14" stroke-width="2"/>
    <rect x="-108" y="-134" width="216" height="56" fill="url(#grad)"/>
    <g fill="${PRIMARY}" opacity=".14">
      <rect x="-74" y="-46" width="148" height="12" rx="6"/>
      <rect x="-74" y="-12" width="148" height="12" rx="6"/>
      <rect x="-74" y="22" width="90" height="12" rx="6"/>
    </g>
    <circle cx="70" cy="34" r="26" fill="url(#gold)"/>
    <path d="M70,20 v28 M60,28 h20 M60,40 h20" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  </g>`)
}

function successBooking(): string {
  return emptyFrame(`
  <g transform="translate(320 240)">
    <circle r="126" fill="url(#grad)"/>
    <circle r="126" fill="none" stroke="${PRIMARY}" stroke-opacity=".2" stroke-width="2"/>
    <path d="M-52,4 L-14,44 L58,-40" fill="none" stroke="#fff" stroke-width="22"
          stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="132" cy="-108" r="26" fill="url(#gold)"/>
    <circle cx="-140" cy="94" r="16" fill="url(#gold)" opacity=".7"/>
    <circle cx="112" cy="118" r="11" fill="${LAVENDER}" opacity=".6"/>
  </g>`)
}

function offlineState(): string {
  return emptyFrame(`
  <g transform="translate(320 240)">
    <circle r="120" fill="#fff" stroke="${PRIMARY}" stroke-opacity=".14" stroke-width="2"/>
    <g stroke="url(#grad)" stroke-width="16" stroke-linecap="round" fill="none">
      <path d="M-74,-24 a104,104 0 0 1 148,0"/>
      <path d="M-44,16 a62,62 0 0 1 88,0"/>
    </g>
    <circle cx="0" cy="56" r="13" fill="${PRIMARY}"/>
    <path d="M-92,-92 L92,92" stroke="#D9484A" stroke-width="14" stroke-linecap="round"/>
  </g>`)
}

/* ── Scenic backgrounds (splash / login / home hero) ──────────────────── */

function splashBackground(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="2400" viewBox="0 0 1200 2400">
  <defs>
    <linearGradient id="bg" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0" stop-color="#5A2AAE"/>
      <stop offset="0.5" stop-color="${PRIMARY}"/>
      <stop offset="1" stop-color="${PRIMARY_DEEP}"/>
    </linearGradient>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="120"/>
    </filter>
  </defs>
  <rect width="1200" height="2400" fill="url(#bg)"/>
  <circle cx="980" cy="420" r="300" fill="${GOLD}" opacity=".16" filter="url(#blur)"/>
  <circle cx="180" cy="1900" r="360" fill="${LAVENDER}" opacity=".3" filter="url(#blur)"/>
  <circle cx="1080" cy="2050" r="220" fill="${GOLD}" opacity=".1" filter="url(#blur)"/>
</svg>`
}

function authBackground(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${PRIMARY_SOFT}"/>
      <stop offset="0.55" stop-color="${CREAM}"/>
      <stop offset="1" stop-color="${CREAM}"/>
    </linearGradient>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="90"/>
    </filter>
  </defs>
  <rect width="1200" height="1600" fill="url(#bg)"/>
  <circle cx="1010" cy="180" r="260" fill="${LAVENDER}" opacity=".18" filter="url(#blur)"/>
  <circle cx="140" cy="330" r="200" fill="${GOLD}" opacity=".14" filter="url(#blur)"/>
  <circle cx="620" cy="1520" r="300" fill="${PRIMARY}" opacity=".07" filter="url(#blur)"/>
</svg>`
}

function homeHero(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5A2AAE"/>
      <stop offset="1" stop-color="${PRIMARY_DEEP}"/>
    </linearGradient>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="70"/>
    </filter>
  </defs>
  <rect width="1200" height="700" fill="url(#bg)"/>
  <circle cx="1030" cy="120" r="210" fill="#fff" opacity=".08" filter="url(#blur)"/>
  <circle cx="150" cy="620" r="200" fill="${GOLD}" opacity=".22" filter="url(#blur)"/>
  <circle cx="900" cy="640" r="150" fill="${LAVENDER}" opacity=".3" filter="url(#blur)"/>
  <g opacity=".07" fill="none" stroke="#fff" stroke-width="2">
    <circle cx="600" cy="350" r="180"/>
    <circle cx="600" cy="350" r="280"/>
  </g>
</svg>`
}

/** Neutral, faceless avatar background for doctors with no real photo. */
function avatarFallback(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PRIMARY_SOFT}"/>
      <stop offset="1" stop-color="#E3D8F7"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <circle cx="200" cy="164" r="66" fill="${PRIMARY}" opacity=".18"/>
  <path d="M76,340 a124,104 0 0 1 248,0 Z" fill="${PRIMARY}" opacity=".18"/>
</svg>`
}

async function main() {
  // 1. Brand logo with real transparency (used on the purple splash).
  const logo = await transparentLogo()
  await write("brand/logo-transparent.png", logo)

  // Light-surface variant keeps the original ink colours; on deep purple we
  // need a solid white knockout so the mark stays legible.
  const meta = await sharp(logo).metadata()
  const logoWhite = await sharp(logo)
    .composite([
      {
        input: {
          create: {
            width: meta.width ?? 1200,
            height: meta.height ?? 600,
            channels: 4,
            background: "#FFFFFF",
          },
        },
        blend: "in",
      },
    ])
    .png()
    .toBuffer()
  await write("brand/logo-white.png", logoWhite)

  // 2. Onboarding illustrations.
  await write("onboarding/trust.png", await render(slideTrust()))
  await write("onboarding/consult.png", await render(slideConsult()))
  await write("onboarding/journey.png", await render(slideJourney()))
  await write("onboarding/privacy.png", await render(slidePrivacy()))

  // 3. Backgrounds.
  await write("backgrounds/splash.png", await render(splashBackground()))
  await write("backgrounds/auth.png", await render(authBackground()))
  await write("backgrounds/home-hero.png", await render(homeHero()))

  // 4. Empty / status art.
  await write("states/no-appointments.png", await render(emptyAppointments()))
  await write("states/no-files.png", await render(emptyFiles()))
  await write("states/no-notifications.png", await render(emptyNotifications()))
  await write("states/no-invoices.png", await render(emptyInvoices()))
  await write("states/booking-success.png", await render(successBooking()))
  await write("states/offline.png", await render(offlineState()))
  await write("states/avatar-fallback.png", await render(avatarFallback()))

  // 5. App icon + adaptive foreground, rebuilt from the transparent logo so
  //    the launcher icon has no white slab either.
  const iconBg = "#FCFAFB"
  const icon = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: iconBg },
  })
    .composite([
      { input: await sharp(logo).resize(820, 820, { fit: "inside" }).toBuffer(), gravity: "center" },
    ])
    .png()
    .toBuffer()
  await write("brand/icon.png", icon)

  const adaptive = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: await sharp(logo).resize(560, 560, { fit: "inside" }).toBuffer(), gravity: "center" },
    ])
    .png()
    .toBuffer()
  await write("brand/adaptive-foreground.png", adaptive)

  // Splash logo: white knockout, sized for the native splash plugin.
  await write(
    "brand/splash-logo.png",
    await sharp(logoWhite).resize(720, 720, { fit: "inside" }).png().toBuffer(),
  )

  console.log("\nall app assets generated")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
