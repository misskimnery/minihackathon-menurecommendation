import { RecommendError, recommend } from "@/lib/gemini";
import {
  AVOIDS,
  AVOID_ETC_MAX,
  BUDGETS,
  COMPANIONS,
  MOODS,
  WEATHERS,
  type Choice,
  type RecommendInput,
} from "@/lib/menu";

// Vercel 기본 제한(10초)으로는 모델이 느린 날 잘린다.
export const maxDuration = 30;

function pick(list: Choice[], value: unknown): string {
  return typeof value === "string" && list.some((c) => c.value === value) ? value : "";
}

/** 클라이언트가 보낸 값을 그대로 믿지 않고, 아는 선택지만 통과시킨다. */
function readInput(body: unknown): RecommendInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const input: RecommendInput = {
    mood: pick(MOODS, b.mood),
    budget: pick(BUDGETS, b.budget),
    companion: pick(COMPANIONS, b.companion),
    weather: pick(WEATHERS, b.weather),
    avoid: Array.isArray(b.avoid)
      ? b.avoid.filter((v): v is string => AVOIDS.some((c) => c.value === v))
      : [],
    avoidEtc:
      typeof b.avoidEtc === "string" ? b.avoidEtc.trim().slice(0, AVOID_ETC_MAX) : "",
  };
  if (!input.mood || !input.budget || !input.companion || !input.weather) return null;
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
      { error: "기분·예산·함께 먹는 사람·날씨를 모두 골라주세요." },
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
