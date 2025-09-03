# Spec‑Driven Todo App (Client‑Only MVP)

A minimal, high‑quality Todo application that runs entirely in the browser with no backend. Data is persisted locally (IndexedDB with localStorage fallback). This project is intentionally light on tooling and dependencies to keep it fast and easy to run anywhere.

## Demo / Screenshot
- Single‑page app with accessible keyboard navigation, filtering, sorting, bulk actions, and import/export.
- Theme toggle (light/dark) with system default detection.

## Features
- 100% client‑side; no network calls
- Persist to IndexedDB (fallback to localStorage)
- CRUD todos (title, description, status, priority, due date, tags)
- Filters: status, text search
- Sorting: newest, due date, priority, title
- Bulk actions: complete, delete (with Undo toast)
- Import/Export JSON
- Accessible semantics (landmarks, labels, ARIA), visible focus, keyboard shortcuts

## Keyboard Shortcuts
- N: New todo
- /: Focus search
- Esc: Close modal
- Arrow keys: Move focus (native focus order)

## Tech / Decisions
- Vanilla HTML/CSS/JS. No framework and no build step.
- Storage implemented with IndexedDB (preferred) and localStorage fallback.
- Simple event bus for local analytics (console‑logged behind a debug flag in code).
- Small CSS with CSS variables; respects prefers‑color‑scheme.

## Project Structure
```
public/
  index.html             # App shell
src/
  app/main.js            # App logic and UI wiring
  lib/                   # helpers: events, uuid, validation
  storage/repo.js        # storage (IndexedDB + localStorage fallback)
  styles/theme.css       # styles & theming
specification.md         # full product spec used to guide implementation
```

## Getting Started (Local Development)
This app is a static site. You can open it via any static file server. A few options:

- Using Python (built‑in):
  1. cd to the repo root
  2. Run: `python3 -m http.server 5173`
  3. Open: http://localhost:5173/public/

- Using Node’s `serve` (if you already have it):
  1. `npx serve public` (or install globally: `npm i -g serve`)
  2. Open the provided URL

- Using VS Code Live Server extension: open the repo and "Open with Live Server" on `public/index.html`.

Note: Opening `public/index.html` directly from the filesystem (file://) can be blocked by browser security for modules. Use a local server as shown above.

## Usage Notes
- Data persists in your browser (per origin). Clearing site data will remove todos.
- Export creates a `todos-export.json` that you can import later.
- Undo is available for delete and complete via the toast that appears after the action.

## JSON Export Format
Example shape:
```
{ "version": 1, "exportedAt": "2025-01-01T12:00:00Z", "todos": [] }
```

## Accessibility
- Proper landmarks: header/nav/main/footer, list semantics for todos
- Labels for inputs; errors announced via `aria-describedby`
- Toasts announced via `aria-live="polite"`
- Visible focus outlines; high contrast

## Limitations (v1)
- No accounts/auth, sync, collaboration, or notifications
- No backend; data lives in the browser only

## Deploying to GitHub Pages
Because this is a static site, GitHub Pages is perfect.

Option A: Deploy from `main` branch using `docs/` folder
1. Create a `docs/` folder and copy `public/*` into it (or configure your workflow to build/copy there)
2. In repo Settings → Pages → Build and deployment: Branch = `main`, Folder = `/docs`
3. Visit `https://<your-username>.github.io/<repo-name>/`

Option B: Deploy from `/public` via GitHub Action (recommended)
- Create a simple workflow that publishes the `public` folder to Pages. Example `/.github/workflows/pages.yml`:
```
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: public
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v4
```
Then enable Pages in Settings → Pages → Source: GitHub Actions.

Option C: Deploy to any static host (Netlify, Vercel, S3, Cloudflare Pages)
- Set the publish directory to `public`

## Contributing
- Issues and PRs welcome. Please discuss major changes via an issue first.
- Keep the app client‑only, dependency‑light, and accessible.

## License
MIT

