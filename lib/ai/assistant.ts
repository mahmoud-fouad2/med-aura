import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type Content,
  type FunctionDeclaration,
  type Part,
} from "@google/genai"
import { requireEnv } from "@/lib/env"
import { searchDoctors } from "@/lib/data/doctors"
import { listProceduresGrouped } from "@/lib/data/procedures"

/**
 * Med Aura's in-app AI concierge (Google Gemini). A guided, action-taking
 * assistant that answers aesthetic-care questions and recommends *real,
 * verified* doctors and procedures from the platform catalog via tools —
 * never invented ones. It is a discovery/matchmaking helper, explicitly NOT a
 * source of medical advice or diagnosis; anything clinical is redirected to
 * booking a real consultation.
 *
 * The model runs a short function-calling loop server-side (the model never
 * sees the user's session — only the tools do). Doctor recommendations are
 * collected as structured `doctors` the app renders as tappable cards that
 * deep-link into the booking flow; the user always confirms the booking
 * themselves — the assistant never books or charges.
 */

/**
 * Model chain, tried in order — all pinned to explicitly documented, GA
 * (generally available) IDs.
 *
 * Do NOT use the `-latest` aliases here. `gemini-flash-latest` resolves to an
 * *experimental* model carrying much tighter rate limits, which is why the
 * concierge returned 503 "high demand" in production even with effectively
 * zero traffic. Versioned GA IDs get real production capacity.
 *
 * - gemini-3.7-flash  — GA, most capable Flash, tuned for agentic/tool use
 * - gemini-3.6-flash  — GA, the model Google's own function-calling docs use
 * - gemini-3.5-flash-lite — GA, cheapest/fastest, a separate capacity pool so
 *   a spike on the newer models still resolves instead of erroring
 *
 * Retirement is handled at runtime, not by hoping: a 404/NOT_FOUND on any
 * entry advances to the next model instead of failing the request (see
 * isModelUnavailable), so the assistant survives Google retiring one.
 */
export const MODELS = ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"] as const
/**
 * Latency budget. This runs behind a phone request that the user is staring
 * at, so every knob here is tuned for "answers fast" over "answers perfectly":
 * 2 rounds is enough for search/list → close (Gemini can request multiple
 * tools in one round, so most turns finish in 1-2 real calls anyway), and the
 * project currently runs on the Gemini API *free tier*, whose per-model RPM
 * quota is tight enough that a 3rd speculative round routinely tips a turn
 * over budget for no benefit.
 */
const MAX_TOOL_ROUNDS = 2
/** Attempts per model before moving to the next one in the chain. */
export const ATTEMPTS_PER_MODEL = 2

/**
 * Real transient failures worth a short same-model retry: 500/502/504 blips
 * and undici's bare "fetch failed" — momentary and usually gone within a
 * second. 429/RESOURCE_EXHAUSTED is deliberately NOT here — see
 * isRateLimited — because on the free tier it is a per-minute quota, not a
 * blip, and a short backoff on the same model just burns the request's time
 * budget for a retry that cannot possibly succeed yet.
 */
export function isTransient(err: unknown): boolean {
  if (isRateLimited(err)) return true
  const status = (err as { status?: number })?.status
  if (typeof status === "number") return status >= 500
  const msg = err instanceof Error ? err.message : String(err)
  return /\b(500|502|503|504)\b|UNAVAILABLE|overloaded|high demand|fetch failed|ETIMEDOUT|ECONNRESET|socket hang up/i.test(
    msg,
  )
}

/**
 * The model itself is gone or not reachable by this key — Google retired it,
 * or restricted it to existing users (the exact 404 that took the concierge
 * down when it was pinned to `gemini-2.5-flash`). Retrying the same model is
 * pointless, but the *next* model in the chain may well work, so this is a
 * "skip ahead" signal rather than a hard failure.
 */
export function isModelUnavailable(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  if (status === 404) return true
  const msg = err instanceof Error ? err.message : String(err)
  return /\b404\b|NOT_FOUND|is not found|no longer available|not supported for/i.test(msg)
}

/**
 * A 429/RESOURCE_EXHAUSTED — the free-tier per-model RPM quota, not a
 * capacity blip. The quota window resets on the order of a minute; our
 * whole request budget is seconds, so retrying the *same* model can never
 * succeed in time. Each model has its own separate quota pool though, so
 * skipping straight to the next model (no backoff sleep wasted) is the only
 * retry that can actually help within this request.
 */
export function isRateLimited(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  if (status === 429) return true
  const msg = err instanceof Error ? err.message : String(err)
  return /\b429\b|RESOURCE_EXHAUSTED|quota/i.test(msg)
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Runs `call` against each model in the chain, retrying real transient
 * failures with exponential backoff + jitter, but skipping straight to the
 * next model (no wasted backoff) on a retired model or a rate-limit quota
 * hit. Throws the last error only when every model and attempt is exhausted.
 */
export async function withModelFallback<T>(call: (model: string) => Promise<T>): Promise<T> {
  let lastError: unknown
  for (const model of MODELS) {
    for (let attempt = 0; attempt < ATTEMPTS_PER_MODEL; attempt++) {
      try {
        return await call(model)
      } catch (err) {
        lastError = err
        // Retired/restricted model, or this model's own quota is exhausted
        // for the current window — either way, stop hammering it and try the
        // next one immediately.
        if (isModelUnavailable(err) || isRateLimited(err)) break
        // A genuine bug (400 bad request, 401 bad key) — surface it now
        // rather than burning the whole retry budget on it.
        if (!isTransient(err)) throw err
        // Don't sleep after the final attempt on the final model.
        const isLast = model === MODELS[MODELS.length - 1] && attempt === ATTEMPTS_PER_MODEL - 1
        if (isLast) break
        // 400ms, 800ms, 1600ms (+ up to 250ms jitter) — enough to ride out a
        // short capacity blip without making the user wait on a dead call.
        await sleep(400 * 2 ** attempt + Math.random() * 250)
      }
    }
  }
  throw lastError
}

export type AssistantDoctor = {
  id: string
  slug: string
  name: string
  title: string | null
  city: string | null
  consultationFee: string | null
  currency: string
  photoUrl: string | null
}

export type AssistantTurn = {
  role: "user" | "assistant"
  content: string
}

export type AssistantResult = {
  reply: string
  doctors: AssistantDoctor[]
  followups: string[]
}

/**
 * Real checkpoints inside the tool-calling loop — not cosmetic timers. Fired
 * from the exact points where the corresponding work actually starts, so the
 * client's "thinking stage" UI reflects what's genuinely happening instead of
 * faking progress while one fixed request silently sits and waits.
 */
export type AssistantStage = "understanding" | "searching_doctors" | "reviewing_procedures" | "finalizing"

export type OnStage = (stage: AssistantStage) => void

/** What we already know about the signed-in patient, so the assistant never
 *  asks for details their own profile already answers. */
export type AssistantUserContext = {
  name?: string | null
  city?: string | null
  country?: string | null
}

function buildSystemPrompt(user: AssistantUserContext): string {
  const known: string[] = []
  if (user.name) known.push(`الاسم: ${user.name}`)
  if (user.city) known.push(`المدينة: ${user.city}`)
  if (user.country) known.push(`الدولة: ${user.country}`)

  const profileBlock = known.length
    ? `معلومات المريض المسجّلة في حسابه (اعتمد عليها ولا تسأل عنها مرة أخرى):
${known.map((k) => `- ${k}`).join("\n")}

استخدم هذه المعلومات مباشرة. مثلاً إن كانت مدينته معروفة فابحث فيها تلقائياً بدل أن تسأله "في أي مدينة؟". لا تسأل إلا عن المعلومة الناقصة فعلاً (نوع الإجراء أو ما يزعجه).`
    : `لا تتوفر معلومات مسجّلة عن المريض، فاسأله عن مدينته وما يبحث عنه.`

  return `أنت "مستشار Med Aura"، مساعد ذكي داخل تطبيق طبي للتجميل. مهمتك مساعدة المريض على فهم خياراته وترشيح الأطباء والإجراءات المناسبة له من كتالوج المنصة الحقيقي فقط.

${profileBlock}

تنسيق الرد (مهم جداً):
- اكتب نصاً عادياً بسيطاً فقط. ممنوع تماماً استخدام أي رموز تنسيق: لا تستخدم النجمة * ولا ** ولا الشرطة السفلية _ ولا علامة # ولا الشرطة - في بداية السطر ولا الأرقام مثل "1." لعمل قوائم.
- بدل القوائم، اكتب جملاً قصيرة متتابعة، كل فكرة في سطر مستقل.
- اجعل الرد قصيراً: من سطرين إلى أربعة أسطر كحد أقصى. المريض يقرأ على شاشة هاتف.
- لا تكرر التحية في كل رد، ولا تكرر التنبيه الطبي أكثر من مرة واحدة في بداية المحادثة.
- تحدّث بالعربية بأسلوب دافئ ومهني ومباشر.

قواعد أساسية:
- أنت لست طبيباً ولا تقدّم تشخيصاً طبياً أو وصفة أو جرعة. إن سُئلت عن أمر طبي/تشخيصي، اشرح بشكل عام مبسّط ثم وجّه المريض لحجز استشارة مع طبيب مختص.
- عند ترشيح أطباء، استخدم أداة search_doctors دائماً — لا تخترع أسماء أطباء أو أسعاراً أبداً. رشّح من نتائج الأداة فقط، وإن لم توجد نتائج فاقترح توسيع البحث.
- بطاقات الأطباء تظهر للمريض تلقائياً أسفل ردك، فلا تعيد كتابة أسمائهم أو أسعارهم في النص. اكتفِ بجملة قصيرة مثل "اخترت لك هؤلاء الأطباء" ثم اتركه يضغط على البطاقة.
- عند الحديث عن الإجراءات المتاحة، استخدم أداة list_procedures لمعرفة ما تقدّمه المنصة.
- لا تحجز ولا تنفّذ أي دفع. المريض يفتح ملف الطبيب ويحجز بنفسه من البطاقة.
- في نهاية كل رد، استخدم أداة set_followups لاقتراح 2-4 أسئلة قصيرة يمكن للمريض الضغط عليها لمتابعة الحوار.`
}

/**
 * Strips Markdown the model emits anyway. The chat renders through a plain
 * <Text>, so `**bold**` and `1.` list markers show up as literal clutter —
 * exactly what the screenshots showed. Instructing the model helps but is not
 * reliable on its own, so this is the guarantee rather than the hope.
 */
export function sanitizeReply(text: string): string {
  return (
    text
      // Bold/italic/underline markers, keeping the words inside. `[\s\S]`
      // rather than the `s` flag, which this tsconfig's target rejects.
      .replace(/\*\*\*([\s\S]+?)\*\*\*/g, "$1")
      .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
      .replace(/\*([\s\S]+?)\*/g, "$1")
      .replace(/__([\s\S]+?)__/g, "$1")
      .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
      // Headings and blockquotes at the start of a line.
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s{0,3}>\s?/gm, "")
      // Bullet and numbered list markers — the content stays, the marker goes.
      .replace(/^\s{0,3}[-*+]\s+/gm, "")
      .replace(/^\s{0,3}\d+[.)]\s+/gm, "")
      // Markdown links -> just the label.
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Any leftover stray emphasis characters.
      .replace(/\*+/g, "")
      // Collapse the blank-line runs those removals leave behind.
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  )
}

const TOOLS: FunctionDeclaration[] = [
  {
    name: "search_doctors",
    description:
      "Search Med Aura's verified doctor catalog and return matching doctors. Use this whenever recommending doctors — never invent doctors or fees. Returns only approved, published, verified providers.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description:
            "Free-text keywords in Arabic or English — a procedure, specialty, or concern (e.g. 'بوتوكس', 'تجاعيد', 'زراعة شعر').",
        },
        city: { type: Type.STRING, description: "City name to filter by, if the patient named one." },
        maxFee: {
          type: Type.NUMBER,
          description: "Maximum consultation fee the patient is comfortable with, if mentioned.",
        },
        consultationType: {
          type: Type.STRING,
          enum: ["video", "in_person"],
          description:
            "Filter to doctors offering video or in-person consultations, if the patient has a preference.",
        },
      },
    },
  },
  {
    name: "list_procedures",
    description:
      "List the aesthetic procedures and categories Med Aura offers, so you can ground recommendations in what's actually available. Returns Arabic names grouped by category.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "set_followups",
    description:
      "Provide 2-4 short suggested follow-up questions (in Arabic) the patient can tap to continue. Call this once near the end of your reply.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        chips: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "2-4 short suggested questions, each under ~40 characters.",
        },
      },
      required: ["chips"],
    },
  },
]

async function runSearchDoctors(input: {
  query?: string
  city?: string
  maxFee?: number
  consultationType?: "video" | "in_person"
}): Promise<AssistantDoctor[]> {
  const { results } = await searchDoctors({
    q: input.query,
    city: input.city,
    priceMax: typeof input.maxFee === "number" ? input.maxFee : undefined,
    consultation:
      input.consultationType === "video"
        ? "VIDEO_CONSULTATION"
        : input.consultationType === "in_person"
          ? "IN_PERSON_CONSULTATION"
          : undefined,
    sort: "rating",
    pageSize: 4,
  })
  return results.map((d) => ({
    id: d.id,
    slug: d.slug,
    name: d.name,
    title: d.title,
    city: d.city,
    consultationFee: d.consultationFee,
    currency: d.currency,
    photoUrl: d.photoUrl,
  }))
}

async function runListProcedures(): Promise<string> {
  const groups = await listProceduresGrouped()
  // A compact catalog the model can reason over without huge token cost.
  return groups
    .map((g) => `${g.nameAr}: ${g.procedures.map((p) => p.nameAr).join("، ")}`)
    .join("\n")
}

function textOf(parts: Part[] | undefined): string {
  return (parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim()
}

/**
 * Runs one assistant turn: feeds the conversation to Gemini, executes any
 * function calls (doctor search / procedure list / follow-ups), and returns
 * the final reply plus the structured doctor cards and follow-up chips the app
 * renders.
 */
export async function runAssistant(
  history: AssistantTurn[],
  userContext: AssistantUserContext = {},
  onStage?: OnStage,
): Promise<AssistantResult> {
  const SYSTEM_PROMPT = buildSystemPrompt(userContext)
  const ai = new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") })

  const contents: Content[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const doctors: AssistantDoctor[] = []
  let followups: string[] = []

  onStage?.("understanding")

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await withModelFallback((model) =>
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations: TOOLS }],
          // Gemini 3 thinks by default, which is the single biggest latency
          // cost here. Routing a patient to a doctor is not a reasoning-heavy
          // task, and the user is waiting on a phone — LOW keeps replies
          // quick while leaving enough headroom for correct tool selection.
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      }),
    )

    const calls = response.functionCalls ?? []
    if (calls.length === 0) {
      onStage?.("finalizing")
      return { reply: sanitizeReply(response.text ?? ""), doctors, followups }
    }

    // Echo the model's turn back VERBATIM. Gemini 3 attaches an encrypted
    // `thoughtSignature` to each functionCall part, and the docs are explicit:
    // "You MUST always resend all thought blocks exactly as they were received
    // from the model." Rebuilding the parts from `response.functionCalls`
    // silently drops those signatures, which is what produced the 400
    // "Function call is missing a thought_signature in functionCall parts".
    // Passing the original parts through also preserves any text the model
    // emitted alongside the calls.
    const modelParts = response.candidates?.[0]?.content?.parts
    contents.push({
      role: "model",
      parts: modelParts?.length ? modelParts : calls.map((c) => ({ functionCall: c })),
    })

    if (calls.some((c) => c.name === "search_doctors")) onStage?.("searching_doctors")
    else if (calls.some((c) => c.name === "list_procedures")) onStage?.("reviewing_procedures")

    const responseParts: Part[] = []
    for (const call of calls) {
      const args = (call.args ?? {}) as Record<string, unknown>
      let output: Record<string, unknown>
      if (call.name === "search_doctors") {
        // Fall back to the patient's own city when the model didn't specify
        // one, so a signed-in user gets local results without being asked
        // for a detail their profile already holds.
        const found = await runSearchDoctors({
          ...args,
          city: (args.city as string | undefined) || userContext.city || undefined,
        })
        for (const d of found) {
          if (!doctors.some((existing) => existing.id === d.id)) doctors.push(d)
        }
        output = {
          doctors: found.map((d) => ({
            name: d.name,
            title: d.title,
            city: d.city,
            fee: d.consultationFee ? `${d.consultationFee} ${d.currency}` : null,
          })),
          note: found.length ? undefined : "لا يوجد أطباء مطابقون حالياً.",
        }
      } else if (call.name === "list_procedures") {
        output = { catalog: await runListProcedures() }
      } else if (call.name === "set_followups") {
        const chips = (args as { chips?: unknown }).chips
        if (Array.isArray(chips)) {
          followups = chips.filter((c): c is string => typeof c === "string").slice(0, 4)
        }
        output = { ok: true }
      } else {
        output = { error: "أداة غير معروفة." }
      }
      responseParts.push({
        functionResponse: { name: call.name, response: output },
      })
    }

    contents.push({ role: "user", parts: responseParts })
  }

  // Tool-round budget exhausted — one final call with no tools so the model
  // produces a closing reply instead of looping forever.
  onStage?.("finalizing")
  const closing = await withModelFallback((model) =>
    ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    }),
  )
  return {
    reply: sanitizeReply(closing.text ?? textOf(closing.candidates?.[0]?.content?.parts)),
    doctors,
    followups,
  }
}
