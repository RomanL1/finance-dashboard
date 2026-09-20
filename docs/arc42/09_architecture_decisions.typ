= Architecture Decisions (ADRs)

== ADR-1: "Uncategorized" is the absence of a category, not a reserved category row

*Status:* accepted · deviates from the wording of M5 and M6 in the proposal.

=== Context

M5 lets a transaction be entered without choosing a category, M6 lets a category be deleted without leaving its transactions unassigned. The proposal describes both with a _reserved catch-all category_ that such transactions fall into.

A reserved category would be an ordinary row in `category` with special rules: created with every household, not renamable, not deletable, not selectable as a transfer target of itself, excluded from the suggested onboarding list, and recognisable by a flag or a magic name in every query that treats it differently.

=== Decision

`transaction.category_id` is nullable. `null` _is_ the catch-all: a transaction without a category belongs to the bucket "Uncategorized". The foreign key uses `on delete set null`, so deleting a category moves its transactions into that bucket in the same statement, unless the user picks another category to transfer them to.

The bucket is a first-class value everywhere a category appears: the transaction list and the analytics chart label it "Uncategorized", the history filter offers it as an option (`categoryId=none`), and the category statistics group it as its own slice.

=== Consequences

- M5 and M6 hold as the user experiences them: entry is never blocked, and deleting a category offers "move to Uncategorized" or "move to another category". No transaction is ever without a visible assignment.
- No special-case rows: nothing to seed, protect, migrate or filter out of the category management UI. The database enforces the fallback by itself.
- The bucket cannot be renamed; its label comes from the translation files.
- Limits are keyed by `(category_id, month)`, so uncategorized spending cannot get a limit of its own. It still counts as an expense in the monthly cashflow and therefore lowers Safe-to-Spend. No Should-have story asks for a limit on it.
- Should a limit on uncategorized spending become a requirement, the migration is mechanical: insert one reserved category per household and update the `null` rows to it.
