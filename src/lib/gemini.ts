/** Gemini 호출 — 서버 전용. API 키는 이 파일 밖으로 나가지 않는다. */

import {
  AVOIDS,
  BUDGETS,
  COMPANIONS,
  PREFERENCES,
  WEATHERS,
  labelOf,
  labelsOf,
  moodStep,
  wantsAlcohol,
  type Lang,
  type MenuCard,
  type RecommendInput,
  type RecommendResult,
} from "./menu";

/* 첫 모델이 붐비면(503) 다음 모델로 넘어간다. 발표 중에 한 번에 되는 게 제일 중요하다. */
const MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
].filter((m, i, all) => m && all.indexOf(m) === i);

/* 한 모델이 60초씩 붙잡고 안 놓는 경우가 있다. 그러면 배포 환경에서 함수가 통째로 죽는다.
   아래 hedge 로 다른 모델을 겹쳐 띄우니, 한 모델을 오래 기다릴 이유가 없다. */
const CALL_TIMEOUT_MS = 12_000;

/* 첫 모델이 이 시간 안에 답을 안 주면, 기다리지 말고 다음 모델도 같이 띄운다.
   먼저 도착한 답을 쓴다. 한 모델이 느린 날 30초씩 기다리던 게 이걸로 사라진다.
   1.5초는 건강한 날 3.6-flash 가 혼자 끝낼 여유는 주면서, 느린 날엔 금방 넘어가는 선. */
const HEDGE_MS = 1_500;

/* 그래도 전부 실패하면 한 바퀴 더. 많이 붐비는 시간대에는 아무리 돌려도 안 붙으니,
   예산을 짧게 잡아 실패도 빨리 알려주는 쪽이 낫다. */
const MAX_PASSES = 2;
const SWEEP_BUDGET_MS = 22_000;

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export type ErrKind = "no-key" | "auth" | "quota" | "upstream" | "parse";

/** 화면에 그대로 보여줄 문구를 들고 다니는 에러. */
export class RecommendError extends Error {
  constructor(
    message: string,
    readonly kind: ErrKind,
  ) {
    super(message);
  }
}

const MESSAGES: Record<Lang, Record<ErrKind, string>> = {
  ko: {
    "no-key":
      "GEMINI_API_KEY 가 설정되지 않았어요. .env.local 에 키를 넣고 개발 서버를 다시 시작해주세요.",
    auth: "API 키가 거부됐어요. AI Studio에서 키를 다시 확인해주세요.",
    quota: "요청이 너무 많아요. 잠시 뒤에 다시 눌러주세요. (무료 할당량 초과)",
    upstream: "지금 Gemini 쪽이 붐벼요. 10초쯤 뒤에 다시 눌러주세요.",
    parse: "AI 응답을 읽지 못했어요. 한 번만 다시 눌러주세요.",
  },
  en: {
    "no-key":
      "GEMINI_API_KEY is not set. Add the key to .env.local and restart the dev server.",
    auth: "The API key was rejected. Double-check it in AI Studio.",
    quota: "Too many requests right now. Give it a moment and try again. (free quota)",
    upstream: "Gemini is busy at the moment. Try again in about 10 seconds.",
    parse: "Couldn't read the AI response. Please tap once more.",
  },
};

function fail(lang: Lang, kind: ErrKind, extra = ""): never {
  throw new RecommendError(MESSAGES[lang][kind] + extra, kind);
}

const SYSTEM_KO = [
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
  "  side·drink 에는 음식 이름만 쓰세요. 무엇 대신 무엇 같은 설명은 쓰지 마세요.",
  "- reason 에는 사용자가 고른 조건(기분·날씨·함께 먹는 사람)을 직접 언급하세요.",
  "  두 문장 이내, 친구한테 말하듯 편한 말투로.",
  "- emoji 는 그 메뉴를 나타내는 이모지 딱 1개.",
  "- headline 은 왜 이렇게 골랐는지 한 줄 요약. 25자 안쪽.",
  "- 모든 글은 한국어로 씁니다.",
].join("\n");

const SYSTEM_EN = [
  "You are a friend who helps people in South Korea decide what to eat.",
  "Given the conditions the user picked, recommend 3 dishes they can actually buy today.",
  "",
  "Rules:",
  "- Only recommend dishes really sold in South Korea. Never invent dish names.",
  "  Use the common English name, with the romanized Korean name when it helps",
  "  (for example: Kimchi stew (kimchi-jjigae)).",
  "- Make the 3 dishes different in kind (for example: a soup, a noodle, a rice bowl).",
  "- Foods the user cannot eat must not appear as a main ingredient, and also not in",
  "  the broth, topping, sauce or side dishes. Check the ingredients one by one before",
  "  choosing. If anything is even slightly questionable, pick a different dish.",
  "  Commonly missed: anchovy and clam in kalguksu broth, anchovy stock in kimchi stew,",
  "  seafood in jjamppong and budae-jjigae, anchovy in tonkatsu sauce, cucumber in",
  "  bibimbap and gimbap, wheat in noodles and bread, dairy in cream sauces.",
  "- The mood score runs from 0 (awful) to 100 (amazing). A low score means comforting,",
  "  soothing food; a high score means food that is fun to celebrate with.",
  "- If the user listed cuisines they usually like, at least 2 of the 3 dishes must come",
  "  from those. The must-avoid list always outranks their preferences.",
  "- priceHint is the price for one person and must fall inside the given budget range.",
  "  Do not go below the range either. Keep prices in Korean won, like: around 9,000 KRW",
  "- side is a dish to order alongside; drink is a matching beverage. One short phrase each.",
  "  Neither may contain anything the user cannot eat.",
  "  Write only the name of the food or drink, never an explanation like 'X instead of Y'.",
  "- In reason, directly mention the conditions the user picked (mood, weather, company).",
  "  Two sentences at most, in a warm casual voice, like talking to a friend.",
  "- emoji is exactly one emoji representing the dish.",
  "- headline is a one-line summary of why you chose these. Keep it under 60 characters.",
  "- Write every field in English.",
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

/* 라벨만 주면 모델이 예산 구간을 느슨하게 해석해 절반값짜리를 골라온다. 숫자로 못 박는다. */
const BUDGET_RANGE: Record<Lang, Record<string, string>> = {
  ko: {
    under10: " (1인분 10,000원 이하)",
    "10to20": " (1인분 10,000~20,000원. 10,000원 미만 금지)",
    "20to30": " (1인분 20,000~30,000원. 20,000원 미만 금지)",
  },
  en: {
    under10: " (up to 10,000 KRW per person)",
    "10to20": " (10,000–20,000 KRW per person. Nothing under 10,000)",
    "20to30": " (20,000–30,000 KRW per person. Nothing under 20,000)",
  },
};

export function buildPrompt(input: RecommendInput): string {
  const lang = input.lang;
  const avoid = [
    ...labelsOf(AVOIDS, input.avoid, lang),
    input.avoidEtc.trim(),
  ].filter(Boolean);
  const prefer = labelsOf(PREFERENCES, input.prefer, lang);
  const step = moodStep(input.mood);
  const drinking = wantsAlcohol(input);
  const score = Math.round(input.mood);

  if (lang === "en") {
    return [
      "Here's my situation today:",
      `- Mood: ${step.en} (${score} out of 100)`,
      `- Budget: ${labelOf(BUDGETS, input.budget, lang)}${BUDGET_RANGE.en[input.budget] ?? ""}`,
      `- Eating with: ${labelOf(COMPANIONS, input.companion, lang)}`,
      `- Weather: ${labelOf(WEATHERS, input.weather, lang)}`,
      `- Cuisines I usually like: ${prefer.length ? prefer.join(", ") : "no particular preference"}`,
      `- Foods I cannot eat: ${avoid.length ? avoid.join(", ") : "none"}`,
      "",
      "Recommend 3 dishes that fit.",
      ...(avoid.length
        ? [
            "",
            `Hard rule: I cannot eat ${avoid.join(", ")}.`,
            "Not as a main ingredient, and not in the broth, topping or sauce either.",
            "Check each dish before you choose it, and drop it if you're unsure.",
          ]
        : []),
      "",
      ...(input.age === "minor"
        ? [
            "I am under the legal drinking age. Never recommend alcohol.",
            "Do not put soju, beer, makgeolli, highballs, wine or sake in drink.",
            "Only non-alcoholic drinks. Leave the alcohol field out.",
          ]
        : drinking
          ? [
              "I am of legal age and I'd like a drink pairing too.",
              "For each dish, put one short alcohol suggestion in the alcohol field.",
              "Keep drink non-alcoholic; alcohol goes only in the alcohol field.",
            ]
          : [
              "I am of legal age but I'm not drinking today.",
              "No alcohol in drink, and leave the alcohol field out.",
            ]),
    ].join("\n");
  }

  return [
    "오늘 내 상황이야:",
    `- 기분: ${step.ko} (100점 만점에 ${score}점)`,
    `- 예산: ${labelOf(BUDGETS, input.budget, lang)}${BUDGET_RANGE.ko[input.budget] ?? ""}`,
    `- 함께 먹는 사람: ${labelOf(COMPANIONS, input.companion, lang)}`,
    `- 날씨: ${labelOf(WEATHERS, input.weather, lang)}`,
    `- 평소 선호하는 메뉴: ${prefer.length ? prefer.join(", ") : "특별히 없음"}`,
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

function requestBody(
  prompt: string,
  withSchema: boolean,
  withAlcohol: boolean,
  lang: Lang,
): Body {
  const generationConfig: Body = { temperature: 1, responseMimeType: "application/json" };
  // 스키마를 안 주면 모델이 필드 이름을 제멋대로 짓는다(menu_name, recommendations...).
  // 그래서 스키마가 기본이고, 거부당했을 때만 빼고 다시 부른다.
  if (withSchema) generationConfig.responseSchema = schemaFor(withAlcohol);
  return {
    systemInstruction: { parts: [{ text: lang === "en" ? SYSTEM_EN : SYSTEM_KO }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
  };
}

async function callGemini(
  apiKey: string,
  prompt: string,
  withSchema: boolean,
  withAlcohol: boolean,
  lang: Lang,
  model: string,
) {
  try {
    return await fetch(ENDPOINT(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(requestBody(prompt, withSchema, withAlcohol, lang)),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
  } catch {
    // 끊겼으면 이 모델은 지금 안 된다고 보고 다음 모델로 넘긴다.
    return new Response("timeout", { status: 503 });
  }
}

/** 한 모델에 한 번 물어본다. 스키마를 거부당하면(400) 스키마 없이 한 번 더. */
async function tryModel(
  apiKey: string,
  prompt: string,
  drinking: boolean,
  lang: Lang,
  model: string,
): Promise<Response> {
  let res = await callGemini(apiKey, prompt, true, drinking, lang, model);
  if (res.status === 400) {
    res = await callGemini(apiKey, prompt, false, drinking, lang, model);
  }
  if (!res.ok) console.warn(`[gemini] ${model} -> ${res.status}`);
  return res;
}

/* 모델을 하나씩 기다리면 느린 모델의 시간을 고스란히 까먹는다.
   먼저 한 개를 띄우고, HEDGE_MS 안에 안 오면 다음 모델을 겹쳐서 띄운다.
   먼저 도착한 성공 응답을 쓰고, 전부 실패하면 마지막 실패 응답을 돌려준다.
   (실패해도 응답을 들고 와야 429·503 을 구분해 알맞은 문구를 보여줄 수 있다.) */
function hedgedRace(
  models: string[],
  run: (model: string) => Promise<Response>,
): Promise<Response | null> {
  return new Promise((resolve) => {
    let done = false;
    let launched = 0;
    let failed = 0;
    let lastFail: Response | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const finish = (value: Response | null) => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      resolve(value);
    };

    const launchNext = () => {
      if (done || launched >= models.length) return;
      const model = models[launched++];

      run(model).then(
        (res) => {
          if (done) return;
          if (res.ok) return finish(res);
          lastFail = res;
          failed++;
          if (failed >= models.length) return finish(lastFail);
          launchNext(); // 실패했으니 기다리지 말고 다음 모델
        },
        () => {
          if (done) return;
          failed++;
          if (failed >= models.length) return finish(lastFail);
          launchNext();
        },
      );

      // 아직 살아 있어도 잠시 뒤 다음 모델을 겹쳐 띄운다
      timers.push(setTimeout(launchNext, HEDGE_MS));
    };

    launchNext();
  });
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
   모델이 어기더라도 서버에서 한 번 더 막는다. 영어 답변도 같이 본다. */
const ALCOHOL_WORDS = [
  "소주", "맥주", "생맥", "소맥", "막걸리", "하이볼", "와인", "사케", "청하", "정종",
  "위스키", "보드카", "데킬라", "럼주", "브랜디", "칵테일", "모히토", "진토닉", "샴페인",
  "고량주", "이슬", "카스", "테라", "켈리", "복분자주", "매실주", "과실주", "리큐르", "술",
];
const ALCOHOL_WORDS_EN = [
  "soju", "beer", "lager", "ale", "makgeolli", "highball", "wine", "sake", "whisky",
  "whiskey", "vodka", "tequila", "rum", "brandy", "cocktail", "mojito", "gin", "champagne",
  "cider", "liqueur", "alcohol", "alcoholic", "cheongha", "baijiu", "bokbunja",
];
const SAFE_DRINK: Record<Lang, string> = {
  ko: "시원한 탄산수",
  en: "Sparkling water",
};

function hasAlcohol(text: string, lang: Lang): boolean {
  if (ALCOHOL_WORDS.some((w) => text.includes(w))) return true;
  const lower = text.toLowerCase();
  // 영어는 단어 단위로 봐야 한다. "ginger" 안의 "gin" 에 걸리면 안 된다.
  const words = lower.split(/[^a-z]+/).filter(Boolean);
  if (lang === "en" || /[a-z]/.test(lower)) {
    return ALCOHOL_WORDS_EN.some((w) => words.includes(w));
  }
  return false;
}

/** 술을 원하지 않거나 미성년자면, 모델 답에서 술기운을 걷어낸다. */
export function stripAlcohol(result: RecommendResult, lang: Lang): RecommendResult {
  return {
    ...result,
    menus: result.menus.map((m) => {
      const next: MenuCard = { ...m };
      delete next.alcohol;
      if (hasAlcohol(next.drink, lang)) next.drink = SAFE_DRINK[lang];
      if (hasAlcohol(next.side, lang)) next.side = "—";
      return next;
    }),
  };
}

/** 모델이 형식을 조금 어겨도 화면이 깨지지 않게 다듬는다. */
export function shapeResult(raw: unknown, lang: Lang): RecommendResult | null {
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
  const fallbackHead =
    lang === "en" ? "How about these today?" : "오늘은 이런 메뉴 어때요?";
  return { headline: str(obj.headline, fallbackHead), menus };
}

export async function recommend(input: RecommendInput): Promise<RecommendResult> {
  const lang = input.lang;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) fail(lang, "no-key");

  const prompt = buildPrompt(input);
  const drinking = wantsAlcohol(input);

  /* 무료 등급은 시간대에 따라 세 모델이 동시에 붐빌 때가 있다.
     그때 503 은 몇 초 만에 되돌아오므로, 한 바퀴 돌고 포기하지 말고
     제한 시간 안에서 몇 바퀴 더 돌아본다. 대개 다음 바퀴에서 붙는다. */
  const started = Date.now();
  let res: Response | null = null;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    if (pass > 0) {
      if (Date.now() - started > SWEEP_BUDGET_MS) break;
      await new Promise((r) => setTimeout(r, 700));
    }
    res = await hedgedRace(MODELS, (model) =>
      tryModel(apiKey, prompt, drinking, lang, model),
    );
    if (res?.ok) break;
  }

  if (!res || !res.ok) {
    const status = res?.status ?? 0;
    const detail = res ? await res.text().catch(() => "") : "";
    if (status === 401 || status === 403) fail(lang, "auth");
    if (status === 503) fail(lang, "upstream");
    if (status === 429) fail(lang, "quota");
    console.error("[gemini]", status, detail.slice(0, 500));
    fail(lang, "upstream", ` (${status})`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p?.text ?? "")
    .join("");

  const shaped = shapeResult(parseJsonLoose(text), lang);
  if (!shaped) {
    console.error("[gemini] 파싱 실패:", text.slice(0, 500));
    fail(lang, "parse");
  }
  return drinking ? shaped : stripAlcohol(shaped, lang);
}
