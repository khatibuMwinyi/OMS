# Office Expense Items CRUD in Project Dashboard - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add office expense items management UI to the project dashboard (/projects/land) for Admin + Director roles, enabling CRUD on monthly/yearly office items.

**Architecture:** Add new "Office Budget Items" section/panel to existing land projects page. Server actions already exist in projects.ts. Need client-side UI only.

**Tech Stack:** Next.js App Router, server actions, existing UI components (Button, Input, Select, ConfirmSubmit).

---

## File Structure

- Modify: `src/app/projects/land/page.tsx` - Add new tab/panel for office items
- Modify: `src/app/actions/projects.ts` - Update requireAdmin to allow Director role
- Create: `src/components/projects/OfficeItemsPanel.tsx` - New component for items CRUD

---

### Task 1: Update Access Control

**Files:**
- Modify: `src/app/actions/projects.ts:403-432` (createOfficeExpenseItemAction)
- Modify: `src/app/actions/projects.ts:434-469` (updateOfficeExpenseItemAction)
- Modify: `src/app/actions/projects.ts:489-530` (deleteOfficeExpenseItemAction)

- [ ] **Step 1: Read current requireAdmin usage in create action**

Run: `Read F:\OweruManagementSystem\src\app\actions\projects.ts:403-432`

- [ ] **Step 2: Change requireAdmin() to allow Director**

```typescript
// Replace: await requireAdmin();
// With: 
const session = await getCurrentSession();
if (!session || (session.role !== "admin" && session.role !== "director")) {
  throw new Error("Forbidden");
}
```

Do this for all three actions (create, update, delete).

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/projects.ts
git commit -m "feat: allow director role to manage office expense items"
```

---

### Task 2: Create OfficeItemsPanel Component

**Files:**
- Create: `src/components/projects/OfficeItemsPanel.tsx`

- [ ] **Step 1: Create component with list + add/edit forms**

```typescript
"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  createOfficeExpenseItemAction,
  updateOfficeExpenseItemAction,
  deleteOfficeExpenseItemAction,
} from "@/app/actions/projects";
import type { OfficeExpenseItem } from "@/lib/projects";

function fmtTZS(n: number) {
  return new Intl.NumberFormat("sw-TZ", { maximumFractionDigits: 0 }).format(Math.round(n));
}

type Props = {
  items: OfficeExpenseItem[];
  canEdit: boolean;
};

export function OfficeItemsPanel({ items, canEdit }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const monthlyItems = items.filter(i => i.recurrence === "monthly");
  const yearlyItems = items.filter(i => i.recurrence === "yearly");
  
  const editingItem = editId ? items.find(i => i.id === editId) : null;

  return (
    <div>
      <div className="section-head">
        <div>
          <span className="eyebrow">Master Items</span>
          <h2 className="section-title">Office Budget Items</h2>
          <p className="subtle-copy" style={{ marginTop: 6 }}>
            Default amounts for monthly and yearly office expenses. These feed into Annual Office Burden calculations.
          </p>
        </div>
        {canEdit && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add Item
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showForm || editId) && (
        <section className="section-card form-card" style={{ marginBottom: 16 }}>
          <form 
            action={async (formData) => {
              if (editId) {
                await updateOfficeExpenseItemAction(formData);
              } else {
                await createOfficeExpenseItemAction(formData);
              }
              setShowForm(false);
              setEditId(null);
            }}
            className="form-grid"
          >
            {editId && <input type="hidden" name="id" value={editId} />}
            <label className="space-y-2">
              <span className="field-label">Name</span>
              <Input 
                name="name" 
                defaultValue={editingItem?.name} 
                placeholder="e.g. Internet" 
                required 
              />
            </label>
            <label className="space-y-2">
              <span className="field-label">Recurrence</span>
              <Select name="recurrence" defaultValue={editingItem?.recurrence ?? "monthly"}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </label>
            <label className="space-y-2">
              <span className="field-label">Default Amount (TZS)</span>
              <Input 
                name="default_amount" 
                type="number" 
                defaultValue={editingItem ? Number(editingItem.defaultAmount) : undefined}
                placeholder="e.g. 100000" 
                required 
              />
            </label>
            <div className="button-row">
              <Button type="submit">{editId ? "Update" : "Add"} Item</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
                Cancel
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Items Table */}
      <section className="section-card">
        {items.length === 0 ? (
          <div className="empty-state">No office items configured.</div>
        ) : (
          <div className="record-table-wrapper">
            <table className="record-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Recurrence</th>
                  <th>Default Amount</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {monthlyItems.length > 0 && (
                  <>
                    <tr className="section-row">
                      <td colSpan={4} style={{ fontWeight: 600, background: "var(--bg-muted)" }}>
                        Monthly ({monthlyItems.length})
                      </td>
                    </tr>
                    {monthlyItems.map(item => (
                      <tr key={item.id}>
                        <td data-label="Name">{item.name}</td>
                        <td data-label="Recurrence">
                          <span className="badge badge-blue">Monthly</span>
                        </td>
                        <td data-label="Default">TZS {fmtTZS(Number(item.defaultAmount))}</td>
                        {canEdit && (
                          <td data-label="Actions" style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <Button variant="ghost" size="sm" onClick={() => setEditId(item.id)}>
                                <Pencil size={14} />
                              </Button>
                              <form action={deleteOfficeExpenseItemAction}>
                                <input type="hidden" name="id" value={item.id} />
                                <ConfirmSubmit message="Delete this item?" title="Delete">
                                  <Trash2 size={14} />
                                </ConfirmSubmit>
                              </form>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </>
                )}
                {yearlyItems.length > 0 && (
                  <>
                    <tr className="section-row">
                      <td colSpan={4} style={{ fontWeight: 600, background: "var(--bg-muted)" }}>
                        Yearly ({yearlyItems.length})
                      </td>
                    </tr>
                    {yearlyItems.map(item => (
                      <tr key={item.id}>
                        <td data-label="Name">{item.name}</td>
                        <td data-label="Recurrence">
                          <span className="badge badge-purple">Yearly</span>
                        </td>
                        <td data-label="Default">TZS {fmtTZS(Number(item.defaultAmount))}</td>
                        {canEdit && (
                          <td data-label="Actions" style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <Button variant="ghost" size="sm" onClick={() => setEditId(item.id)}>
                                <Pencil size={14} />
                              </Button>
                              <form action={deleteOfficeExpenseItemAction}>
                                <input type="hidden" name="id" value={item.id} />
                                <ConfirmSubmit message="Delete this item?" title="Delete">
                                  <Trash2 size={14} />
                                </ConfirmSubmit>
                              </form>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Commit component**

```bash
git add src/components/projects/OfficeItemsPanel.tsx
git commit -m "feat: add OfficeItemsPanel component for dashboard"
```

---

### Task 3: Add Office Items Tab to Land Projects Page

**Files:**
- Modify: `src/app/projects/land/page.tsx`

- [ ] **Step 1: Add OfficeItemsPanel import and usage**

Find the tabs section (around line 279) where `"office"` tab exists. Add new `"office-items"` tab:

```typescript
import { OfficeItemsPanel } from "@/components/projects/OfficeItemsPanel";

// In tabs array:
{ key: "office-items", label: "Office Items" },

// Add tab panel (new section after office tab):
{tab === "office-items" && (
  <OfficeItemsPanel 
    items={officeItems} 
    canEdit={session.role === "admin" || session.role === "director"} 
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/projects/land/page.tsx
git commit -m "feat: add office items tab to land projects page"
```

---

### Task 4: Test

- [ ] **Step 1: Verify build passes**

Run: `npm run build` (or `npm run dev` and check page)

- [ ] **Step 2: Manual test**

Navigate to `/projects/land`, click "Office Items" tab, verify:
- List shows existing items
- Add item form works
- Edit item works
- Delete item works
- Non-admin users don't see edit buttons

---

## Summary

| Task | Steps |
|------|-------|
| 1. Update Access Control | 3 |
| 2. Create Panel Component | 2 |
| 3. Add Tab to Page | 2 |
| 4. Test | 2 |