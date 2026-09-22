/** Gemini 호출 — 서버 전용. API 키는 이 파일 밖으로 나가지 않는다. */

import {
  BUDGETS,
  COMPANIONS,
  MOODS,
  WEATHERS,
  labelOf,
  type MenuCard,
  type RecommendInput,
  type RecommendResult,
} from "./menu";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

/** 화면에 그대로 보여줄 한국어 문구를 들고 다니는 에러. */
export class RecommendError extends Error {
  constructor(
    message: string,
    readonly kind: "no-key" | "auth" | "quota" | "upstream" | "parse",
  ) {
    super(message);
  }
}

const SYSTEM = [
  "당신은 한국에서 끼니 메뉴를 골라주는 친구입니다.",
  "사용자가 고른 조건을 보고, 지금 사 먹을 수 있는 메뉴 3가지를 추천합니다.",
  "",
  "지켜야 할 것:",
  "- 한국에서 실제로 파는 메뉴만 추천하세요. 지어낸 요리 이름은 쓰지 마세요.",
  "- 3가지는 서로 종류가 겹치지 않게 하세요 (예: 국물 / 면 / 덮밥 처럼).",
  "- 못 먹는 음식은 주재료는 물론 고명·육수·소스에도 들어가면 안 됩니다.",
  "  조금이라도 걸리면 그 메뉴는 빼고 다른 걸 고르세요.",
  "- reason 에는 사용자가 고른 조건(기분·날씨·함께 먹는 사람)을 직접 언급하세요.",
  "  두 문장 이내, 친구한테 말하듯 편한 말투로.",
  "- priceHint 는 1인분 기준 대략 가격이며 반드시 예산 안이어야 합니다.",
  "  예산이 '상관없음'이면 흔한 시세를 적으세요. 형식: \"9,000원대\"",
  "- side 는 같이 시키면 좋은 음식, drink 는 어울리는 음료입니다. 각각 짧은 한 마디.",
  "- emoji 는 그 메뉴를 나타내는 이모지 딱 1개.",
  "- headline 은 왜 이렇게 골랐는지 한 줄 요약. 25자 안쪽.",
  "- 모든 글은 한국어로 씁니다.",
].join("\n");

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    menus: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          emoji: { type: "string" },
          reason: { type: "string" },
          side: { type: "string" },
          drink: { type: "string" },
          priceHint: { type: "string" },
        },
        required: ["name", "emoji", "reason", "side", "drink", "priceHint"],
      },
    },
  },
  required: ["headline", "menus"],
};

export function buildPrompt(input: RecommendInput): string {
  const avoid = [...input.avoid, input.avoidEtc.trim()].filter(Boolean);
  return [
    "오늘 내 상황이야:",
    `- 기분: ${labelOf(MOODS, input.mood)}`,
    `- 예산: ${labelOf(BUDGETS, input.budget)}`,
    `- 함께 먹는 사람: ${labelOf(COMPANIONS, input.companion)}`,
    `- 날씨: ${labelOf(WEATHERS, input.weather)}`,
    `- 못 먹는 음식: ${avoid.length ? avoid.join(", ") : "없음"}`,
    "",
    "이 조건에 맞는 메뉴 3가지를 추천해줘.",
  ].join("\n");
}

type Body = Record<string, unknown>;

function requestBody(prompt: string, withSchema: boolean): Body {
  const generationConfig: Body = { temperature: 1, responseMimeType: "application/json" };
  if (withSchema) {
    generationConfig.responseSchema = SCHEMA;
    // 2.5 flash 는 기본으로 '생각'을 한다. 해커톤 데모에선 응답 속도가 더 중요하다.
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  return {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
  };
}

async function callGemini(apiKey: string, prompt: string, withSchema: boolean) {
  const res = await fetch(ENDPOINT(MODEL), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(requestBody(prompt, withSchema)),
  });
  return res;
}

/** ```json 울타리나 앞뒤 설명이 섞여 와도 JSON 만 건져낸다. */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

/** 모델이 형식을 조금 어겨도 화면이 깨지지 않게 다듬는다. */
export function shapeResult(raw: unknown): RecommendResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const list = Array.isArray(obj.menus) ? obj.menus : [];
  const menus: MenuCard[] = list
    .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === "object")
    .map((m) => ({
      name: str(m.name),
      emoji: str(m.emoji, "🍽️").slice(0, 4),
      reason: str(m.reason),
      side: str(m.side, "—"),
      drink: str(m.drink, "—"),
      priceHint: str(m.priceHint, "—"),
    }))
    .filter((m) => m.name)
    .slice(0, 3);
  if (!menus.length) return null;
  return { headline: str(obj.headline, "오늘은 이런 메뉴 어때요?"), menus };
}

export async function recommend(input: RecommendInput): Promise<RecommendResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new RecommendError(
      "GEMINI_API_KEY 가 설정되지 않았어요. .env.local 에 키를 넣고 개발 서버를 다시 시작해주세요.",
      "no-key",
    );
  }

  const prompt = buildPrompt(input);
  let res = await callGemini(apiKey, prompt, true);
  // responseSchema / thinkingConfig 를 모델이 거부하면(400) 그것 없이 한 번 더.
  if (res.status === 400) res = await callGemini(apiKey, prompt, false);

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new RecommendError(
        "API 키가 거부됐어요. AI Studio에서 키를 다시 확인해주세요.",
        "auth",
      );
    }
    if (res.status === 429) {
      throw new RecommendError(
        "요청이 너무 많아요. 잠시 뒤에 다시 눌러주세요. (무료 할당량 초과)",
        "quota",
      );
    }
    console.error("[gemini]", res.status, detail.slice(0, 500));
    throw new RecommendError(
      `Gemini 호출에 실패했어요. (${res.status}) 잠시 뒤 다시 시도해주세요.`,
      "upstream",
    );
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p?.text ?? "")
    .join("");

  const shaped = shapeResult(parseJsonLoose(text));
  if (!shaped) {
    console.error("[gemini] 파싱 실패:", text.slice(0, 500));
    throw new RecommendError(
      "AI 응답을 읽지 못했어요. 한 번만 다시 눌러주세요.",
      "parse",
    );
  }
  return shaped;
}
