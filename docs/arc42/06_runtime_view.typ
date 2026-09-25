#import "diagram.typ": diagram

= Runtime View

== Sign-in and session

#diagram("06_sign_in", [The session lives in an HTTP-only cookie; the SPA never handles a token.])

- Router guards call `GET /api/households/me`: 404 means no household yet and redirects to `/onboarding`; otherwise the shell opens.

== Onboarding

#diagram("06_onboarding", [Validation steps never write; the single submit creates the whole household in one libsql batch.])

- A page reload resumes the wizard from the draft in localStorage; only the final submit writes (ADR-3).

== Monthly limits take-over

#diagram("06_budget_take_over", [Opening an empty current or next month copies the nearest earlier limits once; a month the user emptied stays empty. Rules and reasons: ADR-2.])

- `BudgetService.loadMonth` (frontend) runs the take-over before Home or the budgets tab renders, so both show the same limits.
