# Office Expense Items CRUD - Design

## Problem Statement

Office expense items (monthly/yearly recurring costs like Wi-Fi, rent) are currently managed via XLSX seed data with no UI for editing. Users need to modify default amounts and add/remove items directly from the dashboard.

## Goals

1. Enable CRUD operations on office expense items from project dashboard
2. Admin + Director roles have edit access
3. Changes reflect immediately in Annual Office Burden calculations

## UI/UX Design

**Location:** Projects dashboard (projects/land page)

**Layout:** New "Office Budget Items" section alongside existing Office Expenses tab

### Components

1. **Items Table**
   - Columns: Name, Recurrence (badge), Default Amount, Actions
   - Monthly items grouped separately from yearly items
   - Click row or edit icon to open edit modal

2. **Add Item Button**
   - Opens modal with form: Name, Recurrence (select), Amount (number)

3. **Edit Modal**
   - Pre-filled with current item values
   - Can change name, recurrence type, amount

4. **Delete Action**
   - Confirmation dialog
   - Warns if item has recorded expenses (still allows delete)

### Visual Style

- Match existing OfficeExpensePanel styling
- Recurrence badges: Monthly (blue), Yearly (purple)
- Amounts formatted as TZS with thousand separators

## Data Model

```
office_expense_items:
  - id (int, PK)
  - name (varchar)
  - recurrence (enum: 'monthly', 'yearly')
  - default_amount (decimal)
  - sort_order (int)
  - created_at (datetime)
```

## API/Server Actions

1. `createOfficeExpenseItem(name, recurrence, amount)` - INSERT
2. `updateOfficeExpenseItem(id, name, recurrence, amount)` - UPDATE
3. `deleteOfficeExpenseItem(id)` - DELETE (check for related expenses first)

## Access Control

- Admin and Director roles can perform all CRUD operations
- Other roles view only (if needed)

## Acceptance Criteria

1. ✅ Can view list of all office expense items on project dashboard
2. ✅ Can add new monthly or yearly item with name, recurrence, amount
3. ✅ Can edit existing item (name, recurrence, amount)
4. ✅ Can delete item with confirmation
5. ✅ Annual Office Burden updates after any change
6. ✅ Only Admin/Director can edit (others view only)
7. ✅ UI matches existing dashboard styling