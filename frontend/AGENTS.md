# Angular Development Guide

## Project Structure

Use a feature-first architecture with standalone Angular components. Do not create
NgModules.

```text
frontend/
├── public/                         # Static assets
├── src/
│   ├── app/
│   │   ├── app.ts                  # Root shell component
│   │   ├── app.config.ts           # Global providers
│   │   ├── config/
│   │   │   ├── paths.config.ts     # Shared route and navigation paths
│   │   │   └── routes.config.ts    # Top-level lazy-loaded routes
│   │   ├── core/
│   │   │   ├── api/                # Generated hey-api client code
│   │   │   ├── api-config.ts       # Runtime API client configuration
│   │   │   └── auth/               # better-auth client and session handling
│   │   ├── components/             # Shared thin Angular Material wrappers
│   │   ├── pipes/                  # Reusable application-wide pipes
│   │   ├── pages/                  # Top-level pages not owned by a feature
│   │   └── features/
│   │       └── <feature>/
│   │           ├── pages/          # Route-level feature components
│   │           ├── smart_components/
│   │           │   └── <component>/# State, navigation, and orchestration
│   │           ├── dumb_components/
│   │           │   └── <component>/# Presentational input/output components
│   │           ├── services/       # Feature-specific services and validators
│   │           ├── <feature>.types.ts
│   │           └── <feature-data>.ts
│   ├── main.ts                     # bootstrapApplication entry point
│   └── styles.css                  # Reset, theme, and global element styles
└── cypress/
    ├── e2e/
    ├── fixtures/
    └── support/
```

## Architecture

- Organize business code by feature, not by global technical type.
- Put route-level screens in `features/<feature>/pages`.
- Put components that inject services, perform navigation, load data, or coordinate
  child components in `smart_components`.
- Put presentational components in `dumb_components`.
- Dumb components receive data through signal-based `input()` and communicate upward
  through `output()`. They must not directly access feature services.
- Put reusable, feature-independent UI in `app/components`.
- Shared UI components must be thin wrappers around Angular Material components.
- Keep services feature-local unless they genuinely serve multiple features.
- Keep feature models and related utility types in `<feature>.types.ts`.
- Register application-wide providers in `app.config.ts`.
- Bootstrap with `bootstrapApplication`; do not introduce `AppModule`.
- Feature code may import shared code. Shared code must not import from a feature.
- Dumb components must not import smart components or feature services.

## Components

- Keep components small and focused on a single responsibility.
- Use standalone components and list dependencies explicitly in `imports`.
- Use signals for local state and derived values.
- Use `input()` and `output()` for component communication.
- Treat inputs as immutable. Never mutate values received through an input.
- Use `ChangeDetectionStrategy.OnPush` where applicable.
- Prefer inline templates for simple components.
- Extract templates into `.html` files when they become complex.
- Use CSS or SCSS for component styling. Avoid inline `style` attributes.
- Use Angular Material for buttons, dialogs, form fields, tables, and similar UI
  behavior through shared thin wrapper components.
- Use Flex Layout utilities or Tailwind CSS for layout when available.
- Do not introduce custom controls that duplicate Angular Material behavior.

## Dependency Injection and Services

- Design services around a single responsibility.
- Use `providedIn: 'root'` for singleton services.
- Always inject services and Angular dependencies through the constructor.
- Do not use Angular's `inject()` function.
- Declare injected dependencies as `private readonly` unless templates or consumers
  require wider visibility.
- Keep constructors limited to dependency injection. Perform initialization in field
  initializers or lifecycle hooks.

```ts
constructor(
  private readonly userService: UserService,
  private readonly router: Router,
  private readonly route: ActivatedRoute,
) {}
```

## Routing

- Keep top-level route definitions centralized in `app/config/routes.config.ts`.
- Keep reusable route names and navigation metadata in `paths.config.ts`.
- Lazy-load feature pages with `loadComponent` or feature route collections with
  `loadChildren`.
- Do not eagerly import feature page components into the root route configuration.
- Use route guards for authentication and authorization.
- Prefer class-based guards when dependency injection is required so dependencies can
  be supplied through the constructor.
- Keep feature-specific routes inside their feature folders when using `loadChildren`.

## Forms

- Prefer typed reactive forms for non-trivial forms.
- Avoid template-driven and signal forms unless the task explicitly requires them.
- Keep form state in the component that owns the form.
- Extract custom validation into feature-local validator functions or services.
- Disable submission while the form is invalid or an operation is in progress.
- Display accessible, actionable validation messages.

## API Access

- All generated API code lives in `src/app/core/api`.
- Use the generated hey-api client for all backend communication.
- Never hand-write `HttpClient` or `fetch` calls for endpoints covered by the OpenAPI
  specification.
- Never edit generated API files manually.
- Feature services may consume the generated SDK and expose feature-specific state or
  operations, but must not duplicate or relocate generated clients.
- Generated API code must be committed to the repository.
- Generate the client after backend contract changes by starting the backend once so
  it writes `backend/openapi.json`, or by running `bun run openapi:generate` in the
  backend and then `bun run api:generate` in the frontend.
- Runtime client configuration, including the base URL and
  `credentials: 'include'`, lives in `src/app/core/api-config.ts`.
- Authentication endpoints for sign-in, sign-out, and session handling use the
  better-auth client in `src/app/core/auth`; they are not part of the OpenAPI document.

## TypeScript and Templates

- Keep TypeScript and Angular template strictness enabled.
- Avoid `any`. Use `unknown` and narrow it when the type is genuinely unknown.
- Prefer `readonly` for signals, inputs, outputs, forms, and injected dependencies.
- Use Angular's built-in template control flow: `@if`, `@for`, and `@switch`.
- Supply stable `track` expressions for every `@for`.
- Prefer computed signals over methods called repeatedly from templates.
- Avoid side effects in computed signals and templates.
- Use class and style bindings instead of manual DOM manipulation.
- When updating signal objects or arrays, return new references instead of mutating
  existing values.

## Naming

- Directories and filenames use kebab-case.
- Component classes use PascalCase.
- Page classes end in `Page`.
- General service classes end in `Service`.
- Shared type files end in `.type.ts`; feature type files end in `.types.ts`.
- Unit tests sit beside their implementation as `<name>.spec.ts`.
- End-to-end tests live under `cypress/e2e` as `<feature>.cy.ts`.
- Use the `app-` prefix for application component selectors.

## Accessibility

- Use semantic HTML before adding ARIA attributes.
- Every interactive element must be reachable and usable with a keyboard.
- Provide labels for form controls and accessible names for icon-only buttons.
- Preserve visible focus indicators.
- Ensure text and controls meet WCAG AA color-contrast requirements.
- Use Angular Material accessibility behavior instead of recreating it manually.

## Images

- Use `NgOptimizedImage` for static images unless there is a specific documented
  reason not to.
- Include explicit image dimensions where possible to prevent layout shifts.
- Use meaningful alternative text, or an empty `alt` attribute for decorative images.

## Testing

- Test standalone components through `TestBed` using `imports`, not `declarations`.
- Bind signal inputs with `inputBinding` where appropriate.
- Provide router dependencies with `provideRouter`.
- Unit-test emitted outputs, rendered behavior, routing links, validation, and service
  state transitions.
- Keep Cypress tests focused on complete user-visible flows.
- Add stable `data-testid` attributes only when semantic selectors are insufficient.
