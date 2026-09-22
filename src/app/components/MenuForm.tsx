"use client";

import { COPY } from "@/lib/i18n";
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
  label,
  moodStep,
  type Choice,
  type Lang,
  type RecommendInput,
} from "@/lib/menu";

type Props = {
  input: RecommendInput;
  lang: Lang;
  onChange: (next: RecommendInput) => void;
  onSubmit: () => void;
  loading: boolean;
};

function Chip({
  choice,
  lang,
  selected,
  onClick,
}: {
  choice: Choice;
  lang: Lang;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="chip" aria-pressed={selected} onClick={onClick}>
      <span className="chip__emoji" aria-hidden="true">
        {choice.emoji}
      </span>
      {label(choice, lang)}
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
    <fieldset className={`torn sec sec--${tone}`}>
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

export default function MenuForm({ input, lang, onChange, onSubmit, loading }: Props) {
  const t = COPY[lang];
  const set = (patch: Partial<RecommendInput>) => onChange({ ...input, ...patch });

  const toggle = (key: "avoid" | "prefer", value: string) =>
    set({
      [key]: input[key].includes(value)
        ? input[key].filter((v) => v !== value)
        : [...input[key], value],
    });

  const step = moodStep(input.mood);
  const stepLabel = lang === "en" ? step.en : step.ko;
  const ready = isComplete(input);
  const score = Math.round(input.mood);

  const group = (list: Choice[], key: "budget" | "companion" | "weather" | "age") =>
    list.map((c) => (
      <Chip
        key={c.value}
        choice={c}
        lang={lang}
        selected={input[key] === c.value}
        onClick={() =>
          key === "age"
            ? set({ age: c.value, alcohol: c.value === "minor" ? "no" : "" })
            : set({ [key]: c.value })
        }
      />
    ));

  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !loading) onSubmit();
      }}
    >
      {/* ── 지금 기분 ── */}
      <Section tone="mood" num="01" title={t.secMood} note={t.noteMood}>
        <div className="mood__readout">
          <span className="mood__face" aria-hidden="true">
            {step.emoji}
          </span>
          <span className="mood__label">{stepLabel}</span>
          <span className="mood__score">
            {score}
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
          aria-label={t.moodAria}
          aria-valuetext={t.moodValueText(score, stepLabel)}
          onChange={(e) => set({ mood: Number(e.target.value) })}
        />

        <div className="mood__ticks" aria-hidden="true">
          <span>{t.moodLow}</span>
          <span>{t.moodMid}</span>
          <span>{t.moodHigh}</span>
        </div>
      </Section>

      {/* ── 예산 ── */}
      <Section tone="budget" num="02" title={t.secBudget} note={t.noteBudget}>
        <div className="chips">{group(BUDGETS, "budget")}</div>
      </Section>

      {/* ── 함께 먹는 사람 ── */}
      <Section tone="company" num="03" title={t.secCompany}>
        <div className="chips">{group(COMPANIONS, "companion")}</div>
      </Section>

      {/* ── 날씨 ── */}
      <Section tone="weather" num="04" title={t.secWeather} note={t.noteWeather}>
        <div className="chips">{group(WEATHERS, "weather")}</div>
      </Section>

      {/* ── 평소 선호하는 메뉴 ── */}
      <Section tone="prefer" num="05" title={t.secPrefer} note={t.notePrefer}>
        <div className="chips">
          {PREFERENCES.map((c) => (
            <Chip
              key={c.value}
              choice={c}
              lang={lang}
              selected={input.prefer.includes(c.value)}
              onClick={() => toggle("prefer", c.value)}
            />
          ))}
        </div>
      </Section>

      {/* ── 못 먹는 음식 ── */}
      <Section tone="avoid" num="06" title={t.secAvoid} note={t.noteAvoid}>
        <div className="chips">
          {AVOIDS.map((c) => (
            <Chip
              key={c.value}
              choice={c}
              lang={lang}
              selected={input.avoid.includes(c.value)}
              onClick={() => toggle("avoid", c.value)}
            />
          ))}
        </div>

        <label className="mt-4 flex flex-col gap-2">
          <span className="text-sm" style={{ color: "var(--ink-2)" }}>
            {t.avoidEtcLabel}
          </span>
          <input
            type="text"
            className="field"
            value={input.avoidEtc}
            maxLength={AVOID_ETC_MAX}
            placeholder={t.avoidEtcPlaceholder}
            onChange={(e) => set({ avoidEtc: e.target.value })}
          />
        </label>
      </Section>

      {/* ── 나이 · 술 ── */}
      <Section tone="age" num="07" title={t.secAge} note={t.noteAge}>
        <div className="chips">{group(AGES, "age")}</div>

        {input.age === "adult" ? (
          <div className="rise mt-5">
            <p className="sec__title" style={{ fontSize: "1.05rem", margin: "0 0 0.7rem" }}>
              {t.alcoholQuestion}
            </p>
            <div className="chips">
              {ALCOHOL_CHOICES.map((c) => (
                <Chip
                  key={c.value}
                  choice={c}
                  lang={lang}
                  selected={input.alcohol === c.value}
                  onClick={() => set({ alcohol: c.value })}
                />
              ))}
            </div>
          </div>
        ) : null}

        {input.age === "minor" ? (
          <p className="rise hand mt-4" style={{ fontSize: "1.1rem", color: "var(--sage)" }}>
            {t.minorNote}
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
          {loading ? t.ctaLoading : ready ? t.ctaReady : t.ctaIncomplete}
        </button>
      </div>
    </form>
  );
}
