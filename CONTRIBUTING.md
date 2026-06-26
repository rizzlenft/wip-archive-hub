# Contributing to The WIP Meetup

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. **Fork & clone** the repo
2. Copy env template: `cp .env.example .env`
3. Install dependencies: `npm install`
4. Start the frontend: `npm run dev`
5. For backend work: `cd backend && npm install && cp .env.example .env` (fill in credentials), then `npm start`

CI runs `lint`, `test`, and `build` automatically on PRs. Run them locally before pushing:

```sh
npm run lint && npm test && npm run build
```

## Branch Naming

Use descriptive branch names:

- `feature/add-episode-filters`
- `fix/login-redirect-loop`
- `chore/update-dependencies`

## Making Changes

1. Create a branch from `main`
2. Make focused, small commits with clear messages
3. Test your changes locally before opening a PR
4. Run `npm run lint` to check for issues

## Pull Requests

- Keep PRs small and focused on a single change
- Include a clear description of **what** changed and **why**
- Link any related issues
- Add screenshots for UI changes

## Code Style

- **TypeScript** — avoid `any`; use proper types
- **Tailwind** — use semantic design tokens from `index.css` (e.g. `bg-primary`, `text-muted-foreground`), never hardcoded colors
- **Components** — keep them small and focused; use shadcn/ui primitives
- **Naming** — PascalCase for components, camelCase for functions/variables

## Project Structure

| Directory | Purpose |
|---|---|
| `src/components/` | Reusable UI components |
| `src/pages/` | Route-level page components |
| `src/auth/` | Authentication context & guards |
| `src/lib/` | Utilities, data, and helpers |
| `src/assets/` | Images and static assets |
| `api/` | Vercel serverless functions |
| `api-lib/` | Shared serverless helpers |
| `backend/` | Express API server |
| `docs/` | Architecture and tooling docs |

## Automated code review

See [docs/CLAWPATCH.md](docs/CLAWPATCH.md) for running [clawpatch](https://github.com/openclaw/clawpatch) against this repo.

## Reporting Issues

Open a GitHub issue with:

- Steps to reproduce
- Expected vs. actual behavior
- Browser/environment info if relevant

## Questions?

Reach out to the team in our community channels or open a discussion on GitHub.
