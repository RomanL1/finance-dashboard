# Finance Dashboard

Household finance tracking: accounts, transactions, budgets, recurring bookings.

## Language

**Household**:
The group of users sharing one set of accounts, categories, budgets and transactions; has one currency and one time zone.
_Avoid_: family, workspace

**Transaction** (de: Buchung):
A single income or expense on an account at a date.
_Avoid_: booking, entry

**Recurring transaction** (de: Wiederkehrende Buchung):
Creates a **Transaction** on every **Occurrence** of its interval, from a start date on.
_Avoid_: standing order, Dauerauftrag (implies a bank-executed transfer), subscription, template

**Occurrence**:
One due date of a **Recurring transaction**. Every **Occurrence** of the current month is booked as a **Transaction** when the month starts (local midnight of the 1st), so the month shows everything that will happen in it.
_Avoid_: instance, run

**Upcoming transaction**:
A **Transaction** dated after today. One created by a **Recurring transaction** still follows it: editing, pausing or deleting the **Recurring transaction** re-creates or removes it. Editing it by hand detaches it from the **Recurring transaction**.
_Avoid_: planned, scheduled, future

**Varying amount**:
Property of a **Recurring transaction** whose real amount differs each time; its **Transactions** are created with its expected amount and flagged for confirmation.
_Avoid_: estimate, variable

**Needs confirmation**:
Flag on a **Transaction** created by a **Recurring transaction** with a **Varying amount**; shown once its day has come, cleared when the user confirms or edits it.

**Weekend shift** (de: Am Wochenende vorziehen):
Option of a monthly or longer **Recurring transaction**: an **Occurrence** on Saturday or Sunday is booked on the Friday before, even across a month boundary. The schedule itself keeps the unshifted date.

**Paused**:
State of a **Recurring transaction** whose **Occurrences** are skipped for good until resumed.

## Relationships

- A **Recurring transaction** belongs to one account and optionally one category
- A **Transaction** comes from at most one **Recurring transaction**; when the **Recurring transaction** is deleted, **Transactions** whose day has come stay and lose the link
- Editing, pausing or deleting a **Recurring transaction** never changes **Transactions** whose day has come; its **Upcoming transactions** follow the change
- An **Occurrence** moved by the **Weekend shift** belongs to the month it is booked in
- An **Occurrence** on a day missing in a shorter month falls on that month's last day
