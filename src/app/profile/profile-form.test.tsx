// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/auth/errors";
import { emptyProfile, parseProfile } from "@/lib/profile";

import { ProfileForm } from "./profile-form";

afterEach(cleanup);

describe("ProfileForm", () => {
  it("shows the saved profile and keeps Save disabled until something changes", () => {
    render(<ProfileForm savedProfile={parseProfile({ allergens: ["peanuts"] })} onSave={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Peanuts/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Save profile" })).toBeDisabled();
  });

  it("saves toggled chips and custom ingredients", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileForm savedProfile={emptyProfile} onSave={onSave} />);

    await user.click(screen.getByRole("button", { name: "Milk" }));
    await user.click(screen.getByRole("button", { name: "Vegan" }));
    await user.type(screen.getByLabelText("Add an ingredient to avoid"), "  Palm Oil {enter}");
    expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(onSave).toHaveBeenCalledWith({
      allergens: ["milk"],
      diets: ["vegan"],
      goals: [],
      avoidIngredients: ["palm oil"],
    });
    expect(await screen.findByText(/Saved\./)).toBeInTheDocument();
  });

  it("treats toggling back to the saved state as no change", async () => {
    const user = userEvent.setup();
    render(<ProfileForm savedProfile={emptyProfile} onSave={vi.fn()} />);
    const milk = screen.getByRole("button", { name: "Milk" });
    await user.click(milk);
    await user.click(milk);
    expect(screen.getByRole("button", { name: "Save profile" })).toBeDisabled();
  });

  it("rejects duplicate ingredients and shows save errors", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new AppError("Couldn't save your profile. Please try again."));
    render(<ProfileForm savedProfile={parseProfile({ avoidIngredients: ["red 40"] })} onSave={onSave} />);

    await user.type(screen.getByLabelText("Add an ingredient to avoid"), "Red 40{enter}");
    expect(screen.getByText(/already on your list/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove red 40" }));
    await user.click(screen.getByRole("button", { name: "Save profile" }));
    expect(await screen.findByText("Couldn't save your profile. Please try again.")).toBeInTheDocument();
  });
});
