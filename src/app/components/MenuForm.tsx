"use client";

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
  isComplete,
  moodStep,
  type Choice,
  type RecommendInput,
} from "@/lib/menu";

type Props = {
  input: RecommendInput;
  onChange: (next: RecommendInput) => void;
  onSubmit: () => void;
  loading: boolean;
};

function Chip({
  choice,
  selected,
  onClick,
}: {
  choice: Choice;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="chip" aria-pressed={selected} onClick={onClick}>
      <span className="chip__emoji" aria-hidden="true">
        {choice.emoji}
      </span>
      {choice.label}
    </button>
  );
}

function Section({
  tone,
  num,
  title,
  note,
  children,
}: {
  tone: string;
  num: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={`sec sec--${tone}`}>
      <span className="sec__num" aria-hidden="true">
        {num}
      </span>
      <legend className="sr-only">{title}</legend>
      <p className="sec__title" aria-hidden="true">
        {title}
        {note ? <span className="sec__note">{note}</span> : null}
      </p>
      {children}
    </fieldset>
  );
}

export default function MenuForm({ input, onChange, onSubmit, loading }: Props) {
  const set = (patch: Partial<RecommendInput>) => onChange({ ...input, ...patch });

  const toggle = (key: "avoid" | "prefer", value: string) =>
    set({
      [key]: input[key].includes(value)
        ? input[key].filter((v) => v !== value)
        : [...input[key], value],
    });

  const step = moodStep(input.mood);
  const ready = isComplete(input);

  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !loading) onSubmit();
      }}
    >
      {/* ── 지금 기분 ── */}
      <Section tone="mood" num="01" title="지금 기분" note="드래그해서 골라요">
        <div className="mood__readout">
          <span className="mood__face" aria-hidden="true">
            {step.emoji}
          </span>
          <span className="mood__label">{step.label}</span>
          <span className="mood__score">
            {Math.round(input.mood)}
            <span>/100</span>
          </span>
        </div>

        <input
          type="range"
          className="mood__slider"
          min={MOOD_MIN}
          max={MOOD_MAX}
          step={1}
          value={input.mood}
          aria-label="지금 기분"
          aria-valuetext={`${Math.round(input.mood)}점, ${step.label}`}
          onChange={(e) => set({ mood: Number(e.target.value) })}
        />

        <div className="mood__ticks" aria-hidden="true">
          <span>기분 최악</span>
          <span>기분 중간</span>
          <span>기분 최고</span>
        </div>
      </Section>

      {/* ── 예산 ── */}
      <Section tone="budget" num="02" title="예산" note="1인분 기준">
        <div className="chips">
          {BUDGETS.map((c) => (
            <Chip
              key={c.value}
              choice={c}
              selected={input.budget === c.value}
              onClick={() => set({ budget: c.value })}
            />
          ))}
        </div>
      </Section>

      {/* ── 함께 먹는 사람 ── */}
      <Section tone="company" num="03" title="함께 먹는 사람">
        <div className="chips">
          {COMPANIONS.map((c) => (
            <Chip
              key={c.value}
              choice={c}
              selected={input.companion === c.value}
              onClick={() => set({ companion: c.value })}
            />
          ))}
        </div>
      </Section>

      {/* ── 날씨 ── */}
      <Section tone="weather" num="04" title="날씨" note="오늘 밖은 어때요?">
        <div className="chips">
          {WEATHERS.map((c) => (
            <Chip
              key={c.value}
              choice={c}
              selected={input.weather === c.value}
              onClick={() => set({ weather: c.value })}
            />
          ))}
        </div>
      </Section>

      {/* ── 평소 선호하는 메뉴 ── */}
      <Section tone="prefer" num="05" title="평소 선호하는 메뉴" note="여러 개 골라도 돼요">
        <div className="chips">
          {PREFERENCES.map((c) => (
            <Chip
              key={c.value}
              choice={c}
              selected={input.prefer.includes(c.value)}
              onClick={() => toggle("prefer", c.value)}
            />
          ))}
        </div>
      </Section>

      {/* ── 못 먹는 음식 ── */}
      <Section tone="avoid" num="06" title="못 먹는 음식" note="없으면 넘어가요">
        <div className="chips">
          {AVOIDS.map((c) => (
            <Chip
              key={c.value}
              choice={c}
              selected={input.avoid.includes(c.value)}
              onClick={() => toggle("avoid", c.value)}
            />
          ))}
        </div>

        <label className="mt-4 flex flex-col gap-2">
          <span className="text-sm" style={{ color: "var(--ink-2)" }}>
            그 밖에 빼고 싶은 재료가 있다면
          </span>
          <input
            type="text"
            className="field"
            value={input.avoidEtc}
            maxLength={AVOID_ETC_MAX}
            placeholder="예: 고수, 번데기"
            onChange={(e) => set({ avoidEtc: e.target.value })}
          />
        </label>
      </Section>

      {/* ── 나이 · 술 ── */}
      <Section tone="age" num="07" title="나이" note="술 추천 때문에 물어요">
        <div className="chips">
          {AGES.map((c) => (
            <Chip
              key={c.value}
              choice={c}
              selected={input.age === c.value}
              onClick={() =>
                set({ age: c.value, alcohol: c.value === "minor" ? "no" : "" })
              }
            />
          ))}
        </div>

        {input.age === "adult" ? (
          <div className="rise mt-5">
            <p className="sec__title" style={{ fontSize: "1.05rem", margin: "0 0 0.7rem" }}>
              술도 추천받을까요?
            </p>
            <div className="chips">
              {ALCOHOL_CHOICES.map((c) => (
                <Chip
                  key={c.value}
                  choice={c}
                  selected={input.alcohol === c.value}
                  onClick={() => set({ alcohol: c.value })}
                />
              ))}
            </div>
          </div>
        ) : null}

        {input.age === "minor" ? (
          <p className="rise hand mt-4" style={{ fontSize: "1.1rem", color: "var(--basil)" }}>
            술은 빼고 음료로만 골라드릴게요 🧃
          </p>
        ) : null}
      </Section>

      {/* ── CTA ── */}
      <div className="relative">
        {!loading && ready ? (
          <>
            <span className="steam" style={{ left: "44%", animationDelay: "0s" }} aria-hidden="true" />
            <span className="steam" style={{ left: "50%", animationDelay: "0.5s" }} aria-hidden="true" />
            <span className="steam" style={{ left: "56%", animationDelay: "1s" }} aria-hidden="true" />
          </>
        ) : null}
        <button type="submit" className="cta" disabled={!ready || loading}>
          {loading ? "고르는 중…" : ready ? "메뉴 추천받기" : "위 항목을 골라주세요"}
        </button>
      </div>
    </form>
  );
}
