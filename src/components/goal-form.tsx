"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { createGoal } from "@/app/goals/actions";
import type { Goal } from "@/db/schema";

const GOAL_TYPES: Goal["goalType"][] = ["emergency_fund", "vacation", "debt_payoff", "custom"];

export function GoalForm() {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        await createGoal({
          name: String(formData.get("name")),
          goalType: String(formData.get("goalType")) as Goal["goalType"],
          targetAmount: Number(formData.get("targetAmount")),
          startingAmount: Number(formData.get("startingAmount") || 0),
          targetDate: String(formData.get("targetDate") || ""),
        });
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" required className="w-40 rounded-md border bg-background px-2 py-1.5" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Type
        <select name="goalType" className="rounded-md border bg-background px-2 py-1.5" required>
          {GOAL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Target amount
        <input name="targetAmount" type="number" min="0" step="1" required className="w-28 rounded-md border bg-background px-2 py-1.5" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Starting amount
        <input name="startingAmount" type="number" min="0" step="1" className="w-28 rounded-md border bg-background px-2 py-1.5" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Target date
        <input name="targetDate" type="date" className="rounded-md border bg-background px-2 py-1.5" />
      </label>
      <Button type="submit">Create goal</Button>
    </form>
  );
}
