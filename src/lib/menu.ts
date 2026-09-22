/** 입력 선택지와 결과 타입 — 서버(프롬프트 조립)와 클라이언트(폼) 양쪽에서 쓴다. */

export type Lang = "ko" | "en";

/** value 는 언어와 무관한 식별자. 화면과 프롬프트에는 ko/en 을 골라 쓴다. */
export type Choice = { value: string; ko: string; en: string; emoji: string };

export function label(c: Choice, lang: Lang): string {
  return lang === "en" ? c.en : c.ko;
}

/* ── 기분: 0~100 슬라이더. 결과에 넘길 때는 10단위 10칸으로 잘라 쓴다. ── */
export type MoodStep = { ko: string; en: string; emoji: string };

export const MOOD_STEPS: MoodStep[] = [
  { ko: "기분 최악", en: "Awful", emoji: "😭" },
  { ko: "많이 가라앉음", en: "Really low", emoji: "😞" },
  { ko: "울적함", en: "Down", emoji: "🥲" },
  { ko: "살짝 지침", en: "A bit drained", emoji: "😮‍💨" },
  { ko: "그저 그럼", en: "Meh", emoji: "😐" },
  { ko: "기분 중간", en: "Okay", emoji: "🙂" },
  { ko: "조금 좋음", en: "Pretty good", emoji: "😌" },
  { ko: "기분 좋음", en: "Good", emoji: "😊" },
  { ko: "신남", en: "Great", emoji: "😆" },
  { ko: "기분 최고", en: "Amazing", emoji: "🤩" },
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
  { value: "under10", ko: "1만원 이하", en: "Under ₩10,000", emoji: "🪙" },
  { value: "10to20", ko: "1~2만원", en: "₩10,000–20,000", emoji: "💵" },
  { value: "20to30", ko: "2~3만원", en: "₩20,000–30,000", emoji: "💳" },
  { value: "any", ko: "상관없음", en: "No limit", emoji: "✨" },
];

export const COMPANIONS: Choice[] = [
  { value: "alone", ko: "혼밥", en: "By myself", emoji: "🧍" },
  { value: "friend", ko: "친구", en: "Friends", emoji: "🧑‍🤝‍🧑" },
  { value: "lover", ko: "연인", en: "Partner", emoji: "💘" },
  { value: "family", ko: "가족", en: "Family", emoji: "👨‍👩‍👧" },
  { value: "team", ko: "회식", en: "Work dinner", emoji: "🍻" },
];

export const WEATHERS: Choice[] = [
  { value: "hot", ko: "덥고 습함", en: "Hot & humid", emoji: "🥵" },
  { value: "cold", ko: "춥고 쌀쌀", en: "Cold & chilly", emoji: "🧊" },
  { value: "rain", ko: "비 옴", en: "Rainy", emoji: "🌧️" },
  { value: "clear", ko: "맑음", en: "Clear", emoji: "☀️" },
  { value: "cloudy", ko: "흐림", en: "Cloudy", emoji: "☁️" },
];

/** 평소 선호하는 메뉴 — 여러 개 고를 수 있고, 안 골라도 된다. */
export const PREFERENCES: Choice[] = [
  { value: "korean", ko: "한식", en: "Korean", emoji: "🍚" },
  { value: "chinese", ko: "중식", en: "Chinese", emoji: "🥟" },
  { value: "japanese", ko: "일식", en: "Japanese", emoji: "🍣" },
  { value: "western", ko: "양식", en: "Western", emoji: "🍝" },
  { value: "snack", ko: "분식", en: "Korean street food", emoji: "🌭" },
  { value: "asian", ko: "아시안", en: "Other Asian", emoji: "🍛" },
  { value: "grill", ko: "고기·구이", en: "Grilled meat", emoji: "🥩" },
  { value: "noodle", ko: "면·국수", en: "Noodles", emoji: "🍜" },
  { value: "soup", ko: "국물·탕", en: "Soup & stew", emoji: "🍲" },
  { value: "ricebowl", ko: "덮밥·비빔", en: "Rice bowls", emoji: "🍱" },
  { value: "fried", ko: "튀김·치킨", en: "Fried & chicken", emoji: "🍗" },
  { value: "light", ko: "가볍게", en: "Something light", emoji: "🥗" },
];

/** 못 먹는 음식 — 여러 개 고를 수 있고, 안 골라도 된다. */
export const AVOIDS: Choice[] = [
  { value: "seafood", ko: "해산물", en: "Seafood", emoji: "🦐" },
  { value: "spicy", ko: "매운 음식", en: "Spicy food", emoji: "🌶️" },
  { value: "dairy", ko: "유제품", en: "Dairy", emoji: "🥛" },
  { value: "pork", ko: "돼지고기", en: "Pork", emoji: "🐷" },
  { value: "beef", ko: "소고기", en: "Beef", emoji: "🐮" },
  { value: "nuts", ko: "견과류", en: "Nuts", emoji: "🥜" },
  { value: "cucumber", ko: "오이", en: "Cucumber", emoji: "🥒" },
  { value: "wheat", ko: "밀가루", en: "Wheat / gluten", emoji: "🌾" },
];

/** 미성년자에게는 어떤 경우에도 술을 추천하지 않는다. */
export const AGES: Choice[] = [
  { value: "adult", ko: "성인이에요", en: "I'm of legal age", emoji: "🪪" },
  { value: "minor", ko: "미성년자예요", en: "I'm under 19", emoji: "🧒" },
];

export const ALCOHOL_CHOICES: Choice[] = [
  { value: "yes", ko: "술도 추천받을래요", en: "Yes, pair a drink", emoji: "🍶" },
  { value: "no", ko: "술은 빼주세요", en: "No alcohol, thanks", emoji: "🚫" },
];

export type RecommendInput = {
  lang: Lang;
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

export function labelsOf(list: Choice[], values: string[], lang: Lang): string[] {
  return values
    .map((v) => list.find((c) => c.value === v))
    .filter((c): c is Choice => Boolean(c))
    .map((c) => label(c, lang));
}

export function labelOf(list: Choice[], value: string, lang: Lang): string {
  const found = list.find((c) => c.value === value);
  return found ? label(found, lang) : "";
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
  lang: "ko",
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
