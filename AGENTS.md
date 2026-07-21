<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Goals

## Success Criteria

# Project

Citizen Money — a Next.js 16 (App Router) + React 19 app using Redux Toolkit for state and Tailwind CSS 4 for styling. TypeScript throughout.

- App code lives under `src/app`. Routes are folders with `page.tsx`; shared UI/logic should live outside `app/` (e.g. `src/components`, `src/lib`, `src/store`) as the app grows — don't pile non-route code into `app/`.
- directories with `page.tsx` routing files should have a second file mirroring the name of the enclosing directory. page.tsx should then import from the second file. This is for developer convenience so they know which route they are working on by the filename.
- Path alias `@/*` maps to `src/*` (see `tsconfig.json`) — use it instead of long relative imports.

# Best practices for coding agents

- Simpler is better, keep code short and elegant.
- Be concise.  Comments only when necessary.  Use short READMEs and no emjis.
- IMPORTANT: Avoid overly defensive programming, avoid instanceof checks, only manage exceptions when necessary.
- Before using any Next.js, React, or Tailwind API you're not certain about, check `node_modules/next/dist/docs/` and `node_modules/react/` types rather than relying on training data — versions here are newer than most training cutoffs and APIs may have changed.
- Default to Server Components. Only add `"use client"` when a file needs hooks, browser APIs, or event handlers — and put that boundary as low in the tree as possible.
- Use Redux Toolkit idioms (`createSlice`, `configureStore`) — no hand-written action types/reducers or legacy Redux boilerplate.
- Style with Tailwind utility classes; avoid introducing a second styling system (CSS-in-JS, separate CSS modules) unless Tailwind genuinely can't express something.
- Keep types explicit at module boundaries (component props, Redux state/actions, API responses). Let TypeScript infer locally.
- Run `npm run lint` after non-trivial changes; fix or justify every warning rather than suppressing it.
- No new dependencies for problems solvable with what's already installed (Next.js, React, Redux Toolkit, Tailwind). Ask before adding a package.
- Match the existing file's conventions (naming, export style, import order) over introducing a new pattern in an otherwise consistent codebase.
