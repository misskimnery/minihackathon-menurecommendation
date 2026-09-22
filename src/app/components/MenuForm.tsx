"use client";

import {
  AVOIDS,
  AVOID_ETC_MAX,
  BUDGETS,
  COMPANIONS,
  MOODS,
  WEATHERS,
  isComplete,
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
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-4 py-2.5 text-sm transition-colors ${
        selected
          ? "border-brand bg-brand text-brand-ink"
          : "border-line bg-surface text-foreground hover:border-brand hover:text-brand"
      }`}
    >
      <span aria-hidden="true" className="mr-1.5">
        {choice.emoji}
      </span>
      {choice.label}
    </button>
  );
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-3 text-sm font-semibold">
        {title}
        {hint ? <span className="ml-2 font-normal text-muted">{hint}</span> : null}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

export default function MenuForm({ input, onChange, onSubmit, loading }: Props) {
  const set = (patch: Partial<RecommendInput>) => onChange({ ...input, ...patch });
  const toggleAvoid = (value: string) =>
    set({
      avoid: input.avoid.includes(value)
        ? input.avoid.filter((v) => v !== value)
        : [...input.avoid, value],
    });

  const ready = isComplete(input);

  return (
    <form
      className="flex flex-col gap-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !loading) onSubmit();
      }}
    >
      <Group title="지금 기분">
        {MOODS.map((c) => (
          <Chip
            key={c.value}
            choice={c}
            selected={input.mood === c.value}
            onClick={() => set({ mood: c.value })}
          />
        ))}
      </Group>

      <Group title="예산">
        {BUDGETS.map((c) => (
          <Chip
            key={c.value}
            choice={c}
            selected={input.budget === c.value}
            onClick={() => set({ budget: c.value })}
          />
        ))}
      </Group>

      <Group title="함께 먹는 사람">
        {COMPANIONS.map((c) => (
          <Chip
            key={c.value}
            choice={c}
            selected={input.companion === c.value}
            onClick={() => set({ companion: c.value })}
          />
        ))}
      </Group>

      <Group title="날씨">
        {WEATHERS.map((c) => (
          <Chip
            key={c.value}
            choice={c}
            selected={input.weather === c.value}
            onClick={() => set({ weather: c.value })}
          />
        ))}
      </Group>

      <Group title="못 먹는 음식" hint="없으면 넘어가도 돼요 · 여러 개 선택 가능">
        {AVOIDS.map((c) => (
          <Chip
            key={c.value}
            choice={c}
            selected={input.avoid.includes(c.value)}
            onClick={() => toggleAvoid(c.value)}
          />
        ))}
      </Group>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-muted">그 밖에 빼고 싶은 재료가 있다면</span>
        <input
          type="text"
          value={input.avoidEtc}
          maxLength={AVOID_ETC_MAX}
          placeholder="예: 고수, 번데기"
          onChange={(e) => set({ avoidEtc: e.target.value })}
          className="rounded-xl border border-line bg-surface px-4 py-3 outline-none placeholder:text-muted focus:border-brand"
        />
      </label>

      <button
        type="submit"
        disabled={!ready || loading}
        className="rounded-xl bg-brand px-6 py-4 text-base font-semibold text-brand-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "고르는 중…" : ready ? "메뉴 추천받기" : "위 항목을 골라주세요"}
      </button>
    </form>
  );
}
