/** 입력 선택지와 결과 타입 — 서버(프롬프트 조립)와 클라이언트(폼) 양쪽에서 쓴다. */

export type Choice = { value: string; label: string; emoji: string };

/* ── 기분: 0~100 슬라이더. 결과에 넘길 때는 10단위 10칸으로 잘라 쓴다. ── */
export type MoodStep = { label: string; emoji: string };

export const MOOD_STEPS: MoodStep[] = [
  { label: "기분 최악", emoji: "😭" },
  { label: "많이 가라앉음", emoji: "😞" },
  { label: "울적함", emoji: "🥲" },
  { label: "살짝 지침", emoji: "😮‍💨" },
  { label: "그저 그럼", emoji: "😐" },
  { label: "기분 중간", emoji: "🙂" },
  { label: "조금 좋음", emoji: "😌" },
  { label: "기분 좋음", emoji: "😊" },
  { label: "신남", emoji: "😆" },
  { label: "기분 최고", emoji: "🤩" },
];

export const MOOD_MIN = 0;
export const MOOD_MAX = 100;

/** 0~100 을 10칸 중 하나로. 100 은 마지막 칸(90~100)에 들어간다. */
export function moodIndex(value: number): number {
  const v = Math.min(MOOD_MAX, Math.max(MOOD_MIN, Math.round(value)));
  return Math.min(MOOD_STEPS.length - 1, Math.floor(v / 10));
}
export function moodStep(value: number): MoodStep {
  return MOOD_STEPS[moodIndex(value)];
}

export const BUDGETS: Choice[] = [
  { value: "under10", label: "1만원 이하", emoji: "🪙" },
  { value: "10to20", label: "1~2만원", emoji: "💵" },
  { value: "20to30", label: "2~3만원", emoji: "💳" },
  { value: "any", label: "상관없음", emoji: "✨" },
];

export const COMPANIONS: Choice[] = [
  { value: "alone", label: "혼밥", emoji: "🧍" },
  { value: "friend", label: "친구", emoji: "🧑‍🤝‍🧑" },
  { value: "lover", label: "연인", emoji: "💘" },
  { value: "family", label: "가족", emoji: "👨‍👩‍👧" },
  { value: "team", label: "회식", emoji: "🍻" },
];

export const WEATHERS: Choice[] = [
  { value: "hot", label: "덥고 습함", emoji: "🥵" },
  { value: "cold", label: "춥고 쌀쌀", emoji: "🧊" },
  { value: "rain", label: "비 옴", emoji: "🌧️" },
  { value: "clear", label: "맑음", emoji: "☀️" },
  { value: "cloudy", label: "흐림", emoji: "☁️" },
];

/** 평소 선호하는 메뉴 — 여러 개 고를 수 있고, 안 골라도 된다. */
export const PREFERENCES: Choice[] = [
  { value: "한식", label: "한식", emoji: "🍚" },
  { value: "중식", label: "중식", emoji: "🥟" },
  { value: "일식", label: "일식", emoji: "🍣" },
  { value: "양식", label: "양식", emoji: "🍝" },
  { value: "분식", label: "분식", emoji: "🌭" },
  { value: "아시안", label: "아시안", emoji: "🍛" },
  { value: "고기·구이", label: "고기·구이", emoji: "🥩" },
  { value: "면·국수", label: "면·국수", emoji: "🍜" },
  { value: "국물·탕", label: "국물·탕", emoji: "🍲" },
  { value: "덮밥·비빔", label: "덮밥·비빔", emoji: "🍱" },
  { value: "튀김·치킨", label: "튀김·치킨", emoji: "🍗" },
  { value: "가볍게", label: "가볍게", emoji: "🥗" },
];

/** 못 먹는 음식 — 여러 개 고를 수 있고, 안 골라도 된다. */
export const AVOIDS: Choice[] = [
  { value: "해산물", label: "해산물", emoji: "🦐" },
  { value: "매운 음식", label: "매운 음식", emoji: "🌶️" },
  { value: "유제품", label: "유제품", emoji: "🥛" },
  { value: "돼지고기", label: "돼지고기", emoji: "🐷" },
  { value: "소고기", label: "소고기", emoji: "🐮" },
  { value: "견과류", label: "견과류", emoji: "🥜" },
  { value: "오이", label: "오이", emoji: "🥒" },
  { value: "밀가루", label: "밀가루", emoji: "🌾" },
];

/** 미성년자에게는 어떤 경우에도 술을 추천하지 않는다. */
export const AGES: Choice[] = [
  { value: "adult", label: "성인이에요", emoji: "🪪" },
  { value: "minor", label: "미성년자예요", emoji: "🧒" },
];

export const ALCOHOL_CHOICES: Choice[] = [
  { value: "yes", label: "술도 추천받을래요", emoji: "🍶" },
  { value: "no", label: "술은 빼주세요", emoji: "🚫" },
];

export type RecommendInput = {
  mood: number;
  budget: string;
  companion: string;
  weather: string;
  prefer: string[];
  avoid: string[];
  avoidEtc: string;
  age: string;
  alcohol: string;
};

export type MenuCard = {
  name: string;
  emoji: string;
  reason: string;
  side: string;
  drink: string;
  priceHint: string;
  /** 성인이 술 추천을 원할 때만 채워진다. */
  alcohol?: string;
};

export type RecommendResult = {
  headline: string;
  menus: MenuCard[];
};

export const AVOID_ETC_MAX = 40;

export function labelOf(list: Choice[], value: string): string {
  return list.find((c) => c.value === value)?.label ?? "";
}

/** 술 추천을 곁들일지. 미성년자면 무조건 아니다. */
export function wantsAlcohol(input: RecommendInput): boolean {
  return input.age === "adult" && input.alcohol === "yes";
}

/** 선택형 항목이 다 채워졌는지. 선호·못 먹는 음식은 비어 있어도 된다. */
export function isComplete(input: RecommendInput): boolean {
  if (!input.budget || !input.companion || !input.weather || !input.age) return false;
  // 성인은 술을 받을지 말지 직접 골라야 한다.
  if (input.age === "adult" && !input.alcohol) return false;
  return true;
}

export const EMPTY_INPUT: RecommendInput = {
  mood: 50,
  budget: "",
  companion: "",
  weather: "",
  prefer: [],
  avoid: [],
  avoidEtc: "",
  age: "",
  alcohol: "",
};
