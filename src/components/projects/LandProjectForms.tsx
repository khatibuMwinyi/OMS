"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  createProjectSequenceAction,
  addProjectToSequenceAction,
  addProjectRevenueAction,
  addProjectCostAction,
  addOfficeExpenseAction,
} from "@/app/actions/projects";
import type { LandProject } from "@/lib/projects";
import { legacyVoucherRecords } from "@/lib/legacy-form-data";

const LAND_COST_CATEGORIES = ["Operations & Field", "Marketing & Sales"] as const;

const LAND_COST_DESCRIPTIONS: Record<string, string[]> = LAND_COST_CATEGORIES.reduce(
  (acc, category) => {
    const descriptions = legacyVoucherRecords
      .filter((record) => record.category === category)
      .map((record) => record.description);
    acc[category] = Array.from(new Set(descriptions));
    return acc;
  },
  {} as Record<string, string[]>,
);

function LandCostCategoryFields() {
  const [category, setCategory] = useState<string>(LAND_COST_CATEGORIES[0]);
  const descriptions = useMemo(
    () => LAND_COST_DESCRIPTIONS[category] ?? [],
    [category],
  );
  const [description, setDescription] = useState<string>(descriptions[0] ?? "");

  return (
    <>
      <label className="space-y-2">
        <span className="field-label">Category</span>
        <Select
          name="category"
          value={category}
          onChange={(event) => {
            const next = event.target.value;
            setCategory(next);
            const nextDescriptions = LAND_COST_DESCRIPTIONS[next] ?? [];
            setDescription(nextDescriptions[0] ?? "");
          }}
          required
        >
          {LAND_COST_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-2">
        <span className="field-label">Description</span>
        <Select
          name="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
        >
          {descriptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </label>
    </>
  );
}

type Props =
  | { mode: "create-sequence" }
  | { mode: "add-project"; seqId: number; nextNumber: number }
  | { mode: "entries"; project: LandProject; seqId: number };

export function LandProjectForms(props: Props) {
  const today = new Date().toISOString().slice(0, 10);

  // ── Create sequence + P1 ──────────────────────────────────────────────────
  if (props.mode === "create-sequence") {
    return (
      <form action={createProjectSequenceAction} className="form-grid form-grid--wide">
        {/* Sequence fields */}
        <label className="space-y-2">
          <span className="field-label">Sequence name</span>
          <Input
            name="sequence_name"
            placeholder="e.g. Mbezi Beach Development 2025"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="field-label">Initial running capital (TZS)</span>
          <Input
            name="initial_capital"
            type="number"
            placeholder="e.g. 50000000"
            required
          />
        </label>

        {/* Divider */}
        <div
          style={{
            gridColumn: "1 / -1",
            borderTop: "1px solid rgba(148,163,184,0.14)",
            paddingTop: 14,
          }}
        >
          <p
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 14,
            }}
          >
            Project 1 Details
          </p>
        </div>

        <label className="space-y-2">
          <span className="field-label">Project name</span>
          <Input
            name="project_name"
            placeholder="e.g. Plot A — Mbezi Beach"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="field-label">Land cost (TZS)</span>
          <Input
            name="land_cost"
            type="number"
            placeholder="e.g. 45000000"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="field-label">Start date</span>
          <Input name="start_date" type="date" defaultValue={today} required />
        </label>
        <div
          className="helper-panel"
          style={{ alignSelf: "flex-end", marginBottom: 0 }}
        >
          End date auto-set to <strong>start + 3 months</strong>
        </div>
        <label className="space-y-2" style={{ gridColumn: "1 / -1" }}>
          <span className="field-label">Description (optional)</span>
          <Input name="description" placeholder="Location, buyer info, notes…" />
        </label>

        <div className="button-row" style={{ gridColumn: "1 / -1" }}>
          <Button type="submit">Create Sequence + Project 1</Button>
        </div>
      </form>
    );
  }

  // ── Add next project ──────────────────────────────────────────────────────
  if (props.mode === "add-project") {
    return (
      <div>
        <div className="section-head">
          <div>
            <span className="eyebrow">Sequence</span>
            <h2 className="section-title">Add Project {props.nextNumber}</h2>
          </div>
        </div>
        <p
          className="subtle-copy"
          style={{ marginBottom: 18, marginTop: -8 }}
        >
          Capital from the previous project's retained earnings has been
          automatically carried forward.
        </p>
        <form
          action={addProjectToSequenceAction}
          className="form-grid form-grid--wide"
        >
          <input type="hidden" name="sequence_id" value={props.seqId} />
          <label className="space-y-2">
            <span className="field-label">Project name</span>
            <Input
              name="project_name"
              placeholder={`e.g. Plot ${String.fromCharCode(64 + props.nextNumber)} development`}
              required
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">Land cost (TZS)</span>
            <Input
              name="land_cost"
              type="number"
              placeholder="e.g. 50000000"
              required
            />
          </label>
          <label className="space-y-2">
            <span className="field-label">Start date</span>
            <Input name="start_date" type="date" defaultValue={today} required />
          </label>
          <div className="helper-panel" style={{ alignSelf: "flex-end" }}>
            End date = start + 3 months (auto)
          </div>
          <label className="space-y-2" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">Description (optional)</span>
            <Input name="description" placeholder="Location, notes…" />
          </label>
          <div className="button-row" style={{ gridColumn: "1 / -1" }}>
            <Button type="submit">Create Project {props.nextNumber}</Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Entry forms (revenue, costs, office expenses) ─────────────────────────
  return (
    <div>
      <div className="section-head">
        <div>
          <span className="eyebrow">
            P{props.project.projectNumber} · {props.project.name}
          </span>
          <h2 className="section-title">Add Financial Entries</h2>
        </div>
      </div>

      <div className="module-grid" style={{ gap: 16 }}>
        {/* Revenue */}
        <section className="section-card">
          <div className="section-head">
            <div>
              <span
                className="eyebrow"
                style={{ color: "#9be2d1" }}
              >
                Step 1 · Revenue
              </span>
              <h3 className="section-title" style={{ fontSize: "1rem" }}>
                Add Revenue
              </h3>
            </div>
          </div>
          <form
            action={addProjectRevenueAction}
            className="form-grid"
          >
            <input type="hidden" name="project_id" value={props.project.id} />
            <label className="space-y-2">
              <span className="field-label">Description</span>
              <Input name="description" placeholder="Plot sale — buyer name" required />
            </label>
            <label className="space-y-2">
              <span className="field-label">Amount (TZS)</span>
              <Input name="amount" type="number" placeholder="e.g. 85000000" required />
            </label>
            <label className="space-y-2">
              <span className="field-label">Date</span>
              <Input name="revenue_date" type="date" defaultValue={today} required />
            </label>
            <div className="button-row">
              <Button type="submit" variant="outline">
                Add Revenue
              </Button>
            </div>
          </form>
        </section>

        {/* Project Costs */}
        <section className="section-card">
          <div className="section-head">
            <div>
              <span
                className="eyebrow"
                style={{ color: "#fca5a5" }}
              >
                Step 2 · Project Costs
              </span>
              <h3 className="section-title" style={{ fontSize: "1rem" }}>
                Add Cost
              </h3>
            </div>
          </div>
          <form
            action={addProjectCostAction}
            className="form-grid"
          >
            <input type="hidden" name="project_id" value={props.project.id} />
            <LandCostCategoryFields />
            <label className="space-y-2">
              <span className="field-label">Amount (TZS)</span>
              <Input name="amount" type="number" placeholder="e.g. 5000000" required />
            </label>
            <label className="space-y-2">
              <span className="field-label">Date</span>
              <Input name="cost_date" type="date" defaultValue={today} required />
            </label>
            <div className="button-row">
              <Button type="submit" variant="outline">
                Add Cost
              </Button>
            </div>
          </form>
        </section>

        {/* Office Expenses */}
        <section className="section-card">
          <div className="section-head">
            <div>
              <span
                className="eyebrow"
                style={{ color: "#c4b5fd" }}
              >
                Step 3 · Office Expenses
              </span>
              <h3 className="section-title" style={{ fontSize: "1rem" }}>
                Add Office Expense
              </h3>
            </div>
          </div>
          <form
            action={addOfficeExpenseAction}
            className="form-grid"
          >
            <input type="hidden" name="project_id" value={props.project.id} />
            <label className="space-y-2">
              <span className="field-label">Description</span>
              <Input
                name="description"
                placeholder="e.g. Office rent, salaries"
                required
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Amount (TZS)</span>
              <Input name="amount" type="number" placeholder="e.g. 3000000" required />
            </label>
            <label className="space-y-2">
              <span className="field-label">Date</span>
              <Input name="expense_date" type="date" defaultValue={today} required />
            </label>
            <div className="helper-panel">
              Enter this project&apos;s share of office overhead for the 3-month
              window. <strong>25%</strong> is deducted as allocation; remaining
              75% represents the other three projects in the sequence.
            </div>
            <div className="button-row">
              <Button type="submit" variant="outline">
                Add Expense
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}