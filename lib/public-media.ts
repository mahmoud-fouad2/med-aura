const ASSET_VERSION = "20260815"

const versioned = (path: string) => `${path}?v=${ASSET_VERSION}`

export const PROCEDURE_IMAGE_SLUGS = [
  "rhinoplasty",
  "facelift",
  "blepharoplasty",
  "otoplasty",
  "chin-augmentation",
  "neck-lift",
  "brow-lift",
  "breast-augmentation",
  "breast-lift",
  "breast-reduction",
  "liposuction",
  "tummy-tuck",
  "brazilian-butt-lift",
  "arm-lift",
  "thigh-lift",
  "mommy-makeover",
  "botox",
  "dermal-fillers",
  "chemical-peel",
  "laser-hair-removal",
  "microneedling",
  "thread-lift",
  "hair-transplant",
  "prp-hair",
  "veneers",
  "teeth-whitening",
  "smile-makeover",
] as const

const categoryImages: Record<string, string> = {
  "face-neck": versioned("/demo-services/service-face-neck.png"),
  breast: versioned("/demo-services/aesthetic-treatment-room.png"),
  body: versioned("/demo-services/service-body-contouring.png"),
  skin: versioned("/demo-services/service-skin-nonsurgical.png"),
  hair: versioned("/demo-services/service-hair-restoration.png"),
  dental: versioned("/demo-services/service-dental-smile.png"),
}

const procedureImages = Object.fromEntries(
  PROCEDURE_IMAGE_SLUGS.map((slug) => [
    slug,
    versioned(`/service-images/${slug}.jpg`),
  ]),
) as Record<string, string>

const demoDoctorPhotos: Record<string, string> = {
  "dr-sara-alotaibi": "/demo-doctors/dr-sara-alotaibi.jpg",
  "dr-noura-alqahtani": "/demo-doctors/dr-noura-alqahtani.jpg",
  "dr-ahmet-yilmaz": "/demo-doctors/dr-ahmet-yilmaz.jpg",
}

export const PUBLIC_MEDIA = {
  home: "/hero-medaura-consultation.png",
  centers: "/demo-services/aesthetic-clinic-lounge.png",
  destinations: "/demo-services/service-body-contouring.png",
  faq: "/demo-services/service-skin-nonsurgical.png",
  howItWorks: "/demo-services/service-online-consultation.png",
  onlineConsultation: "/demo-services/service-online-consultation.png",
} as const

const destinationImages: Record<string, string> = {
  SA: PUBLIC_MEDIA.centers,
  AE: "/demo-services/service-skin-nonsurgical.png",
  TR: "/demo-services/service-hair-restoration.png",
  EG: "/demo-services/service-dental-smile.png",
  JO: "/demo-services/service-face-neck.png",
  QA: "/demo-services/service-body-contouring.png",
}

export function destinationImage(code?: string | null): string {
  return destinationImages[code?.toUpperCase() ?? ""] ?? PUBLIC_MEDIA.destinations
}

export function categoryImage(slug?: string | null): string {
  return categoryImages[slug ?? ""] ?? versioned("/demo-services/aesthetic-treatment-room.png")
}

export function procedureImage(
  procedureSlug?: string | null,
  categorySlug?: string | null,
): string {
  return procedureImages[procedureSlug ?? ""] ?? categoryImage(categorySlug)
}

export function demoDoctorPhoto(slug: string): string | null {
  return demoDoctorPhotos[slug] ?? null
}
