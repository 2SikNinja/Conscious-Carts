"use client";

import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { friendlyMessage } from "@/lib/auth/errors";
import {
  addAvoidIngredient,
  allergenKeys,
  allergenLabels,
  dietKeys,
  dietLabels,
  goalKeys,
  goalLabels,
  maxAvoidIngredientLength,
  sameProfile,
  toggleItem,
  type DietaryProfile,
} from "@/lib/profile";

type ProfileFormProps = {
  savedProfile: DietaryProfile;
  onSave: (profile: DietaryProfile) => Promise<void>;
};

export function ProfileForm({ savedProfile, onSave }: ProfileFormProps) {
  // Edits stay local until saved. Null means "no edits, show what's saved".
  const [draft, setDraft] = useState<DietaryProfile | null>(null);
  const [ingredientInput, setIngredientInput] = useState("");
  const [ingredientError, setIngredientError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const profile = draft ?? savedProfile;
  const hasChanges = draft !== null && !sameProfile(draft, savedProfile);

  function edit(change: (current: DietaryProfile) => DietaryProfile) {
    setDraft(change(profile));
    setStatus(null);
  }

  function handleAddIngredient(event?: FormEvent) {
    event?.preventDefault();
    const result = addAvoidIngredient(profile, ingredientInput);
    setIngredientError(result.error ?? null);
    if (!result.error) {
      if (result.profile !== profile) edit(() => result.profile);
      setIngredientInput("");
    }
  }

  async function handleSave() {
    if (!draft) return;
    setIsSaving(true);
    setStatus(null);
    try {
      await onSave(draft);
      setDraft(null);
      setStatus({ tone: "success", message: "Saved. New analyses will use your profile." });
    } catch (error) {
      setStatus({ tone: "error", message: friendlyMessage(error) });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <ChipGroup
        title="Allergies"
        description="Flagged on every product, and never suggested in healthier swaps."
        options={allergenKeys}
        labels={allergenLabels}
        selected={profile.allergens}
        onToggle={(key) => edit((current) => ({ ...current, allergens: toggleItem(current.allergens, key) }))}
      />
      <ChipGroup
        title="Diets"
        options={dietKeys}
        labels={dietLabels}
        selected={profile.diets}
        onToggle={(key) => edit((current) => ({ ...current, diets: toggleItem(current.diets, key) }))}
      />
      <ChipGroup
        title="Goals"
        options={goalKeys}
        labels={goalLabels}
        selected={profile.goals}
        onToggle={(key) => edit((current) => ({ ...current, goals: toggleItem(current.goals, key) }))}
      />

      <fieldset className="rounded-2xl border border-border bg-surface p-5">
        <legend className="sr-only">Ingredients to avoid</legend>
        <h2 aria-hidden className="text-lg font-semibold">
          Ingredients to avoid
        </h2>
        <p className="mt-1 text-sm text-muted">Anything else you skip, like palm oil, aspartame, or red 40.</p>
        <form onSubmit={handleAddIngredient} className="mt-4 flex gap-2">
          <label htmlFor="avoid-input" className="sr-only">
            Add an ingredient to avoid
          </label>
          <input
            id="avoid-input"
            value={ingredientInput}
            onChange={(event) => {
              setIngredientInput(event.target.value);
              setIngredientError(null);
            }}
            maxLength={maxAvoidIngredientLength}
            placeholder="Add an ingredient"
            aria-invalid={ingredientError ? true : undefined}
            aria-describedby={ingredientError ? "avoid-error" : undefined}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
          />
          <Button type="submit" variant="secondary" disabled={!ingredientInput.trim()}>
            Add
          </Button>
        </form>
        {ingredientError ? (
          <p id="avoid-error" className="mt-2 text-sm text-danger">
            {ingredientError}
          </p>
        ) : null}
        {profile.avoidIngredients.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Ingredients you avoid">
            {profile.avoidIngredients.map((item) => (
              <li key={item} className="flex items-center gap-1 rounded-full bg-background py-1 pl-3 pr-1 text-sm">
                {item}
                <button
                  type="button"
                  onClick={() =>
                    edit((current) => ({
                      ...current,
                      avoidIngredients: current.avoidIngredients.filter((entry) => entry !== item),
                    }))
                  }
                  aria-label={`Remove ${item}`}
                  className="flex size-6 items-center justify-center rounded-full text-muted hover:bg-surface-strong hover:text-foreground"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>

      <div
        className={
          "sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] flex flex-wrap sm:bottom-4 items-center justify-between gap-3 rounded-2xl border p-4 transition " +
          (hasChanges ? "border-primary bg-background shadow-lg" : "border-transparent")
        }
      >
        <p role="status" className={`text-sm ${status?.tone === "error" ? "text-danger" : status ? "text-success" : "text-muted"}`}>
          {status?.message ?? (hasChanges ? "You have unsaved changes." : "")}
        </p>
        <div className="flex gap-2">
          {hasChanges ? (
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={isSaving}>
              Discard
            </Button>
          ) : null}
          <Button onClick={handleSave} disabled={!hasChanges} isLoading={isSaving}>
            Save profile
          </Button>
        </div>
      </div>
    </div>
  );
}

type ChipGroupProps<Key extends string> = {
  title: string;
  description?: string;
  options: readonly Key[];
  labels: Record<Key, string>;
  selected: readonly Key[];
  onToggle: (key: Key) => void;
};

function ChipGroup<Key extends string>({ title, description, options, labels, selected, onToggle }: ChipGroupProps<Key>) {
  const headingId = useId();
  return (
    <section className="rounded-2xl border border-border bg-surface p-5" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-lg font-semibold">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((key) => {
          const isSelected = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(key)}
              className={
                "min-h-9 rounded-full border px-4 text-sm font-medium transition " +
                (isSelected
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border bg-background hover:bg-surface-strong")
              }
            >
              {isSelected ? <span aria-hidden>✓ </span> : null}
              {labels[key]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
