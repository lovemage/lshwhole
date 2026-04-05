# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js (App Router) frontend for Lsx Wholesale.

- `src/app/`: route pages and API handlers (`src/app/api/*`).
- `src/components/`: shared UI, with admin-specific UI in `src/components/admin/`.
- `src/lib/`: service and utility code (e.g., API/Supabase helpers).
- `src/types/`, `src/data/`, `src/templates/`, `src/styles/`: types, static data, templates, and styling.
- `public/` and `icons/`: static assets.
- Root `migrations*.sql` files: database schema changes; keep each migration focused and additive.

## Build, Test, and Development Commands
Use npm (lockfile is `package-lock.json`).

- `npm install`: install dependencies.
- `npm run dev`: start local dev server on port `3003`.
- `npm run build`: build production bundle.
- `npm start`: run production server.
- `npm run lint`: run ESLint (Next.js + TypeScript rules).
- `npx tsc --noEmit`: run strict TypeScript checks.

## Coding Style & Naming Conventions
- Language: TypeScript + React functional components.
- Indentation: 2 spaces; keep imports grouped and use `@/*` path alias for `src/*`.
- Components/files: `PascalCase` for components, `camelCase` for functions/variables, kebab-case for route segments under `src/app/`.
- Linting: follow `eslint.config.mjs`; underscore-prefixed unused params (e.g., `_req`) are acceptable.

## Testing Guidelines
There is currently no committed test suite (`*.test.*` / `*.spec.*` not present).

For new logic:
- Add tests with the feature in the same PR.
- Prefer colocated tests (`feature.test.ts`) or `__tests__/` near the module.
- Minimum gate before merge: `npm run lint` and `npx tsc --noEmit` must pass.

## Commit & Pull Request Guidelines
Recent history favors concise Traditional Chinese summaries (e.g., `修正選單`, `修正lint錯誤`). Keep commits focused on one change.

PRs should include:
- What changed and why.
- Affected routes/modules (e.g., `src/app/products`, `src/app/api/products`).
- Screenshots/GIFs for UI changes.
- Migration notes if any `migrations*.sql` file is added/updated.
- Verification steps with exact commands run.

## Security & Configuration Tips
- Store secrets only in `.env.local`; never commit credentials.
- Typical variables include Supabase keys and admin JWT secret.
- Validate auth/permission changes in admin and guest flows before merge.
