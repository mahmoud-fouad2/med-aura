import {
  GoogleGenAI,
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

// `gemini-flash-latest` is a stable alias that always resolves to Google's
// current recommended Flash model — safer than pinning a versioned ID that
// gets deprecated for new users (as `gemini-2.5-flash` was). Fast, cheap,
// supports function calling — the right balance for a real-time chat.
const MODEL = "gemini-flash-latest"
const MAX_TOOL_ROUNDS = 4

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

const SYSTEM_PROMPT = `أنت "مستشار Med Aura"، مساعد ذكي داخل تطبيق طبي للتجميل. مهمتك مساعدة المريض على فهم خياراته وترشيح الأطباء والإجراءات المناسبة له من كتالوج المنصة الحقيقي فقط.

قواعد أساسية:
- تحدّث بالعربية بأسلوب دافئ ومهني وموجز. اسأل سؤالاً أو سؤالين بسيطين عند الحاجة لفهم هدف المريض (المنطقة، المدينة، الميزانية، حضوري أم عن بُعد).
- أنت لست طبيباً ولا تقدّم تشخيصاً طبياً أو وصفة أو جرعة. إن سُئلت عن أمر طبي/تشخيصي، اشرح بشكل عام مبسّط ثم وجّه المريض لحجز استشارة مع طبيب مختص.
- عند ترشيح أطباء، استخدم أداة search_doctors دائماً — لا تخترع أسماء أطباء أو أسعاراً أبداً. رشّح من نتائج الأداة فقط، وإن لم توجد نتائج فاقترح توسيع البحث.
- عند الحديث عن الإجراءات المتاحة، استخدم أداة list_procedures لمعرفة ما تقدّمه المنصة.
- لا تحجز ولا تنفّذ أي دفع. بعد الترشيح، اذكر أن المريض يمكنه فتح ملف الطبيب والحجز بنفسه من البطاقة الظاهرة.
- في نهاية كل رد، استخدم أداة set_followups لاقتراح 2-4 أسئلة قصيرة يمكن للمريض الضغط عليها لمتابعة الحوار.
- أضف تنبيهاً قصيراً عند أول رد بأن هذه المساعدة للإرشاد وليست بديلاً عن الاستشارة الطبية.`

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
export async function runAssistant(history: AssistantTurn[]): Promise<AssistantResult> {
  const ai = new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") })

  const contents: Content[] = history.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const doctors: AssistantDoctor[] = []
  let followups: string[] = []

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations: TOOLS }],
      },
    })

    const calls = response.functionCalls ?? []
    if (calls.length === 0) {
      return { reply: response.text?.trim() ?? "", doctors, followups }
    }

    // Echo the model's function-call turn back, then answer every call.
    contents.push({
      role: "model",
      parts: calls.map((c) => ({ functionCall: c })),
    })

    const responseParts: Part[] = []
    for (const call of calls) {
      const args = (call.args ?? {}) as Record<string, unknown>
      let output: Record<string, unknown>
      if (call.name === "search_doctors") {
        const found = await runSearchDoctors(args)
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
  const closing = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { systemInstruction: SYSTEM_PROMPT },
  })
  return { reply: closing.text?.trim() ?? textOf(closing.candidates?.[0]?.content?.parts), doctors, followups }
}
