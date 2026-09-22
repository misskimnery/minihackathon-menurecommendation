/** Gemini 호출 — 서버 전용. API 키는 이 파일 밖으로 나가지 않는다. */

import {
  BUDGETS,
  COMPANIONS,
  WEATHERS,
  labelOf,
  moodStep,
  wantsAlcohol,
  type MenuCard,
  type RecommendInput,
  type RecommendResult,
} from "./menu";

/* 첫 모델이 붐비면(503) 다음 모델로 넘어간다. 발표 중에 한 번에 되는 게 제일 중요하다.
   순서는 2026-09-22 실측 기준: lite 계열이 2~3초, 큰 flash 는 10초 이상이거나 503. */
const MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
].filter((m, i, all) => m && all.indexOf(m) === i);

/* 한 모델이 60초씩 붙잡고 안 놓는 경우가 있다. 그러면 배포 환경에서 함수가 통째로 죽는다.
   3.6-flash 는 느린 날 10초 가까이 걸려서, 그 정도는 기다려 준다. */
const CALL_TIMEOUT_MS = 18_000;

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
  "- 못 먹는 음식은 주재료뿐 아니라 육수·고명·소스·반찬에도 들어가면 안 됩니다.",
  "  메뉴를 정하기 전에 재료를 하나씩 점검하세요. 조금이라도 걸리면 다른 메뉴로 바꾸세요.",
  "  자주 놓치는 것: 칼국수·잔치국수 육수의 멸치와 바지락, 김치찌개의 멸치육수,",
  "  짬뽕·부대찌개의 해물, 돈가스 소스의 멸치, 떡국 육수의 사골·멸치,",
  "  비빔밥·김밥 속 오이, 면·빵류의 밀가루, 크림소스의 유제품.",
  "- 기분 점수는 0(최악)부터 100(최고)까지입니다. 점수가 낮으면 속을 달래주는 메뉴,",
  "  높으면 신나게 즐길 메뉴 쪽으로 기울이세요.",
  "- 평소 선호하는 메뉴가 적혀 있으면 3가지 중 최소 2가지는 그 취향 안에서 고르세요.",
  "  단, 못 먹는 음식 제한이 항상 취향보다 우선입니다.",
  "- priceHint 는 1인분 기준 가격이고, 주어진 예산 구간 안에 들어와야 합니다.",
  "  구간보다 싼 메뉴도 안 됩니다. 2~3만원이면 1만원대 메뉴를 고르지 마세요.",
  "  예산이 상관없음이면 흔한 시세를 적으세요. 형식 예시: 9,000원대",
  "- side 는 같이 시키면 좋은 음식, drink 는 어울리는 음료입니다. 각각 짧은 한 마디.",
  "  side 와 drink 에도 못 먹는 재료가 들어가면 안 됩니다.",
  "  (밀가루를 못 먹는데 튀김·만두·빵을 사이드로 붙이면 안 됩니다.)",
  "  side·drink 에는 음식 이름만 쓰세요. 무엇 대신 무엇 같은 설명은 쓰지 마세요.",
  "- reason 에는 사용자가 고른 조건(기분·날씨·함께 먹는 사람)을 직접 언급하세요.",
  "  두 문장 이내, 친구한테 말하듯 편한 말투로.",
  "- emoji 는 그 메뉴를 나타내는 이모지 딱 1개.",
  "- headline 은 왜 이렇게 골랐는지 한 줄 요약. 25자 안쪽.",
  "- 모든 글은 한국어로 씁니다.",
].join("\n");

const MENU_PROPS = {
  name: { type: "string" },
  emoji: { type: "string" },
  reason: { type: "string" },
  side: { type: "string" },
  drink: { type: "string" },
  priceHint: { type: "string" },
  alcohol: { type: "string" },
};

function schemaFor(withAlcohol: boolean) {
  const required = ["name", "emoji", "reason", "side", "drink", "priceHint"];
  return {
    type: "object",
    properties: {
      headline: { type: "string" },
      menus: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: MENU_PROPS,
          required: withAlcohol ? [...required, "alcohol"] : required,
        },
      },
    },
    required: ["headline", "menus"],
  };
}

/* 라벨만 주면 모델이 1~2만원을 느슨하게 해석해 8천원짜리를 골라온다. 숫자로 못 박는다. */
const BUDGET_RANGE: Record<string, string> = {
  under10: " (1인분 10,000원 이하)",
  "10to20": " (1인분 10,000~20,000원. 10,000원 미만 금지)",
  "20to30": " (1인분 20,000~30,000원. 20,000원 미만 금지)",
};

export function buildPrompt(input: RecommendInput): string {
  const avoid = [...input.avoid, input.avoidEtc.trim()].filter(Boolean);
  const step = moodStep(input.mood);
  const drinking = wantsAlcohol(input);

  return [
    "오늘 내 상황이야:",
    `- 기분: ${step.label} (100점 만점에 ${Math.round(input.mood)}점)`,
    `- 예산: ${labelOf(BUDGETS, input.budget)}${BUDGET_RANGE[input.budget] ?? ""}`,
    `- 함께 먹는 사람: ${labelOf(COMPANIONS, input.companion)}`,
    `- 날씨: ${labelOf(WEATHERS, input.weather)}`,
    `- 평소 선호하는 메뉴: ${input.prefer.length ? input.prefer.join(", ") : "특별히 없음"}`,
    `- 못 먹는 음식: ${avoid.length ? avoid.join(", ") : "없음"}`,
    "",
    "이 조건에 맞는 메뉴 3가지를 추천해줘.",
    // 제약은 마지막에 한 번 더 못 박는다. 앞에만 적으면 모델이 흘려보낸다.
    ...(avoid.length
      ? [
          "",
          `반드시 지킬 것: ${avoid.join(", ")} 은(는) 내가 못 먹어.`,
          "주재료는 물론 육수·고명·소스에 조금이라도 들어가면 절대 추천하지 마.",
          "고르기 전에 메뉴마다 재료를 따져보고, 애매하면 그 메뉴는 빼.",
        ]
      : []),
    "",
    ...(input.age === "minor"
      ? [
          "나는 미성년자야. 술은 절대 추천하지 마.",
          "drink 에 소주·맥주·막걸리·하이볼·와인·사케 같은 술을 쓰면 안 돼.",
          "무알콜 음료만 골라줘. alcohol 항목은 쓰지 마.",
        ]
      : drinking
        ? [
            "나는 성인이고 술도 같이 추천받고 싶어.",
            "메뉴마다 alcohol 항목에 어울리는 술 한 가지를 짧게 추천해줘.",
            "drink 항목에는 술이 아닌 음료를 쓰고, 술은 alcohol 항목에만 써.",
          ]
        : [
            "나는 성인이지만 오늘은 술을 안 마셔.",
            "drink 에 술을 쓰지 말고, alcohol 항목도 쓰지 마.",
          ]),
  ].join("\n");
}

type Body = Record<string, unknown>;

function requestBody(prompt: string, withSchema: boolean, withAlcohol: boolean): Body {
  const generationConfig: Body = { temperature: 1, responseMimeType: "application/json" };
  // 스키마를 안 주면 모델이 필드 이름을 제멋대로 짓는다(menu_name, recommendations...).
  // 그래서 스키마가 기본이고, 거부당했을 때만 빼고 다시 부른다.
  if (withSchema) generationConfig.responseSchema = schemaFor(withAlcohol);
  return {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
  };
}

async function callGemini(
  apiKey: string,
  prompt: string,
  withSchema: boolean,
  withAlcohol: boolean,
  model: string,
) {
  try {
    return await fetch(ENDPOINT(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(requestBody(prompt, withSchema, withAlcohol)),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
  } catch {
    // 끊겼으면 이 모델은 지금 안 된다고 보고 다음 모델로 넘긴다.
    return new Response("timeout", { status: 503 });
  }
}

/** 코드 울타리나 앞뒤 설명이 섞여 와도 JSON 만 건져낸다. */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text
    .replace(/^﻿/, "")
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

/* 미성년자에게 술이 나가는 건 프롬프트만 믿고 넘길 일이 아니다.
   모델이 어기더라도 서버에서 한 번 더 막는다. */
const ALCOHOL_WORDS = [
  "소주", "맥주", "생맥", "소맥", "막걸리", "하이볼", "와인", "사케", "청하", "정종",
  "위스키", "보드카", "데킬라", "럼주", "브랜디", "칵테일", "모히토", "진토닉", "샴페인",
  "고량주", "이슬", "카스", "테라", "켈리", "복분자주", "매실주", "과실주", "리큐르", "술",
];
const SAFE_DRINK = "시원한 탄산수";

function hasAlcohol(text: string): boolean {
  return ALCOHOL_WORDS.some((w) => text.includes(w));
}

/** 술을 원하지 않거나 미성년자면, 모델 답에서 술기운을 걷어낸다. */
export function stripAlcohol(result: RecommendResult): RecommendResult {
  return {
    ...result,
    menus: result.menus.map((m) => {
      const next: MenuCard = { ...m };
      delete next.alcohol;
      if (hasAlcohol(next.drink)) next.drink = SAFE_DRINK;
      if (hasAlcohol(next.side)) next.side = "—";
      return next;
    }),
  };
}

/** 모델이 형식을 조금 어겨도 화면이 깨지지 않게 다듬는다. */
export function shapeResult(raw: unknown): RecommendResult | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const list = Array.isArray(obj.menus) ? obj.menus : [];
  const menus: MenuCard[] = list
    .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === "object")
    .map((m) => {
      const card: MenuCard = {
        name: str(m.name),
        emoji: str(m.emoji, "🍽️").slice(0, 4),
        reason: str(m.reason),
        side: str(m.side, "—"),
        drink: str(m.drink, "—"),
        priceHint: str(m.priceHint, "—"),
      };
      const al = str(m.alcohol);
      if (al) card.alcohol = al;
      return card;
    })
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
  const drinking = wantsAlcohol(input);

  let res: Response | null = null;
  for (const model of MODELS) {
    res = await callGemini(apiKey, prompt, true, drinking, model);
    // 모델이 스키마를 거부하면(400) 스키마 없이 한 번 더.
    if (res.status === 400) res = await callGemini(apiKey, prompt, false, drinking, model);
    // 503 = 붐빔/무응답, 429 = 그 모델의 무료 할당량 소진.
    // 둘 다 "이 모델은 지금 못 쓴다"는 뜻이라 기다리지 말고 다음 모델로 넘긴다.
    // 3.6-flash 는 품질이 좋은 대신 할당량이 빡빡해서, 이 폴백이 없으면 시연 중에 멈춘다.
    if (res.status !== 503 && res.status !== 429) break;
    console.warn(`[gemini] ${res.status}, 다음 모델로:`, model);
  }

  if (!res || !res.ok) {
    const status = res?.status ?? 0;
    const detail = res ? await res.text().catch(() => "") : "";
    if (status === 401 || status === 403) {
      throw new RecommendError(
        "API 키가 거부됐어요. AI Studio에서 키를 다시 확인해주세요.",
        "auth",
      );
    }
    if (status === 503) {
      throw new RecommendError(
        "지금 Gemini 쪽이 붐벼요. 10초쯤 뒤에 다시 눌러주세요.",
        "upstream",
      );
    }
    if (status === 429) {
      throw new RecommendError(
        "요청이 너무 많아요. 잠시 뒤에 다시 눌러주세요. (무료 할당량 초과)",
        "quota",
      );
    }
    console.error("[gemini]", status, detail.slice(0, 500));
    throw new RecommendError(
      `Gemini 호출에 실패했어요. (${status}) 잠시 뒤 다시 시도해주세요.`,
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
  return drinking ? shaped : stripAlcohol(shaped);
}
