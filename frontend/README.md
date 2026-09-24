# finance-dashboard

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.1.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

End-to-end tests use [Playwright](https://playwright.dev/) and live in `playwright/e2e/`.

One-time setup per machine (downloads Chromium):

```bash
bunx playwright install chromium
```

Run the suite:

```bash
bun run e2e
```

Playwright starts its own servers, so nothing needs to be running beforehand:

- backend on `:3100` from `../backend` (`bun src/main.ts`), in-memory sqlite, demo user seeded
- `ng serve` on `:4300`, proxying `/api` to `:3100` (`playwright/proxy.conf.json`)

Your dev servers on `:3000` / `:4200` are not touched, and every run starts from an empty database.
If `:3100` is already taken (e.g. a leftover run), the backend refuses to start; stop that process first.

Every spec runs twice: in the `desktop` project and in the `mobile` project (Pixel 7 viewport).

| Command                                     | What it does                                  |
| ------------------------------------------- | --------------------------------------------- |
| `bun run e2e`                               | all specs, desktop + mobile, headless         |
| `bun run e2e --project=desktop`             | desktop only                                  |
| `bun run e2e playwright/e2e/budget.spec.ts` | a single spec file                            |
| `bun run e2e --headed`                      | watch the browser while tests run             |
| `bun run e2e:ui`                            | Playwright UI mode (pick, rerun, time-travel) |

Covered flows: login, onboarding, transaction add/edit/delete with balance, home figures,
account create/rename, budget overspend. Conventions for writing new tests are in `AGENTS.md`.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
