"use client"

import { useState } from "react"
import { completeSignupProfile } from "@/lib/actions/onboarding"
import { COUNTRY_CODES, countryNameAr } from "@/lib/status-labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { FadeIn } from "@/components/motion"

export function CompleteProfileForm({ destination }: { destination: string }) {
  const [phone, setPhone] = useState("")
  const [country, setCountry] = useState("")
  const [city, setCity] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await completeSignupProfile({
      accountType: "patient",
      phone,
      residenceCountry: country,
      city: city || undefined,
    })
    if (!result.ok) {
      setLoading(false)
      setError(result.error)
      return
    }
    // Same hard-navigation reasoning as the sign-up form: router.push +
    // router.refresh race each other right after a server action resolves.
    window.location.assign(destination)
  }

  return (
    <FadeIn>
      <Card className="rounded-3xl border border-border/80 bg-card/95 p-7 sm:p-9 shadow-elegant backdrop-blur-md">
        <div className="mb-6 text-center">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            خطوة أخيرة لإتمام ملفكِ
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            نحتاج رقم جوالكِ ودولة إقامتكِ لتخصيص الاستشارات والمواعيد الأنسب لكِ.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cp-phone">رقم الجوال</Label>
            <Input
              id="cp-phone"
              type="tel"
              dir="ltr"
              className="text-right"
              placeholder="+9665xxxxxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              minLength={8}
              autoComplete="tel"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cp-country">دولة الإقامة</Label>
              <select
                id="cp-country"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              >
                <option value="" disabled>
                  اختر الدولة
                </option>
                {COUNTRY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {countryNameAr(code)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cp-city">
                المدينة{" "}
                <span className="font-normal text-muted-foreground">(اختياري)</span>
              </Label>
              <Input
                id="cp-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoComplete="address-level2"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full" size="lg">
            {loading ? "يرجى الانتظار…" : "متابعة"}
          </Button>
        </form>
      </Card>
    </FadeIn>
  )
}
