/** 입력 선택지와 결과 타입 — 서버(프롬프트 조립)와 클라이언트(폼) 양쪽에서 쓴다. */

export type Choice = { value: string; label: string; emoji: string };

export const MOODS: Choice[] = [
  { value: "tired", label: "지치고 힘듦", emoji: "😮‍💨" },
  { value: "stressed", label: "스트레스 폭발", emoji: "😤" },
  { value: "good", label: "기분 좋음", emoji: "😆" },
  { value: "flat", label: "그냥 무난", emoji: "🙂" },
  { value: "blue", label: "울적함", emoji: "🥲" },
  { value: "excited", label: "설렘", emoji: "🥰" },
];

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

export type RecommendInput = {
  mood: string;
  budget: string;
  companion: string;
  weather: string;
  avoid: string[];
  avoidEtc: string;
};

export type MenuCard = {
  name: string;
  emoji: string;
  reason: string;
  side: string;
  drink: string;
  priceHint: string;
};

export type RecommendResult = {
  headline: string;
  menus: MenuCard[];
};

export const AVOID_ETC_MAX = 40;

export function labelOf(list: Choice[], value: string): string {
  return list.find((c) => c.value === value)?.label ?? "";
}

/** 폼이 다 채워졌는지. 못 먹는 음식은 비어 있어도 된다. */
export function isComplete(input: RecommendInput): boolean {
  return Boolean(input.mood && input.budget && input.companion && input.weather);
}

export const EMPTY_INPUT: RecommendInput = {
  mood: "",
  budget: "",
  companion: "",
  weather: "",
  avoid: [],
  avoidEtc: "",
};
