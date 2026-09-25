#import "diagram.typ": diagram

= Runtime View

== Sign-in and session

#diagram("06_sign_in", [The session lives in an HTTP-only cookie; the SPA never handles a token. Router guards decide between shell and onboarding from `GET /api/households/me`.])

- `signIn()` calls `refresh()` (`GET /api/auth/get-session`) before navigating, so the Angular `AuthGuard` passes on the cached user. On a cold boot without session, that same `refresh()` returns no user and the guard redirects to `/login`.
- `/api/households/me` answers 404 when the user has no household; `HouseholdService.getHouseholdOrNull()` maps it to `null` and `OnboardingGuard` redirects to `/onboarding`.

- Rate limiting keys on `X-Real-IP`, which nginx overwrites (ch. 7, ch. 8 Security).
- Controller routes need a session unless marked `@Public()`; household routes additionally pass `HouseholdMemberGuard`.

== Onboarding

#diagram("06_onboarding", [Validation steps never write; the single submit creates the whole household in one libsql batch.])

- Steps 2–3 return 204 without a write; a reload resumes from the localStorage draft.
- Only `POST /api/households/onboarding` persists records, atomically (ADR-3). See `onboarding.page.ts` and `OnboardingRepository`.
- A user who already belongs to a household gets 409 (`OnboardingService`).

== Monthly limits take-over

#diagram("06_budget_take_over", [Opening an empty current or next month copies the nearest earlier limits once; a month the user emptied stays empty.])

- `BudgetService.loadMonth` (frontend) runs the take-over before the dashboard or budgets tab renders, so both views agree whichever opens first.
- The decision rules and their rationale are in ADR-2.
