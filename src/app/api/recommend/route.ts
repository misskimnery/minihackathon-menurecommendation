import { RecommendError, recommend } from "@/lib/gemini";
import {
  AGES,
  ALCOHOL_CHOICES,
  AVOIDS,
  AVOID_ETC_MAX,
  BUDGETS,
  COMPANIONS,
  MOOD_MAX,
  MOOD_MIN,
  PREFERENCES,
  WEATHERS,
  type Choice,
  type RecommendInput,
} from "@/lib/menu";

// Vercel 기본 제한(10초)으로는 모델이 느린 날 잘린다.
// 모델 3개를 각 10초 타임아웃으로 넘겨보므로 최악 30초 + 여유.
export const maxDuration = 45;

function pick(list: Choice[], value: unknown): string {
  return typeof value === "string" && list.some((c) => c.value === value) ? value : "";
}

function multi(list: Choice[], value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => list.some((c) => c.value === v))
    : [];
}

/** 클라이언트가 보낸 값을 그대로 믿지 않고, 아는 선택지만 통과시킨다. */
function readInput(body: unknown): RecommendInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const moodRaw = typeof b.mood === "number" ? b.mood : Number(b.mood);
  const mood = Number.isFinite(moodRaw)
    ? Math.min(MOOD_MAX, Math.max(MOOD_MIN, Math.round(moodRaw)))
    : 50;

  const age = pick(AGES, b.age);
  const input: RecommendInput = {
    mood,
    budget: pick(BUDGETS, b.budget),
    companion: pick(COMPANIONS, b.companion),
    weather: pick(WEATHERS, b.weather),
    prefer: multi(PREFERENCES, b.prefer),
    avoid: multi(AVOIDS, b.avoid),
    avoidEtc:
      typeof b.avoidEtc === "string" ? b.avoidEtc.trim().slice(0, AVOID_ETC_MAX) : "",
    age,
    // 미성년자면 클라이언트가 뭘 보내든 술 추천은 없다.
    alcohol: age === "adult" ? pick(ALCOHOL_CHOICES, b.alcohol) : "no",
  };

  if (!input.budget || !input.companion || !input.weather || !input.age) return null;
  if (input.age === "adult" && !input.alcohol) return null;
  return input;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "요청을 읽지 못했어요." }, { status: 400 });
  }

  const input = readInput(body);
  if (!input) {
    return Response.json(
      { error: "예산·함께 먹는 사람·날씨·나이를 모두 골라주세요." },
      { status: 400 },
    );
  }

  try {
    return Response.json(await recommend(input));
  } catch (e) {
    if (e instanceof RecommendError) {
      const status = e.kind === "no-key" ? 503 : e.kind === "quota" ? 429 : 502;
      return Response.json({ error: e.message, kind: e.kind }, { status });
    }
    console.error("[recommend]", e);
    return Response.json(
      { error: "알 수 없는 오류가 났어요. 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
