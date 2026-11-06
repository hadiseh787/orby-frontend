# Agent Freelancer frontend

Angular 21, TypeScript, standalone components and zoneless change detection. English LTR interface based on the supplied handoff. Desktop, tablet and mobile layouts; light, dark and OS-controlled themes.

For the complete application, use the paired private [backend repository](https://github.com/hadiseh787/agent-freelancer-backend). Install Git and Node.js 24 with npm, clone the backend, then run `npm run local` there. Its launcher fetches this frontend at the matching revision and starts PostgreSQL, migrations, the API, worker and built frontend together. Windows users can double-click the backend's `start-local.cmd`. The application opens at `http://127.0.0.1:4200`; no global Angular CLI or separate database installation is required.

If downloading ZIPs, extract both repositories beside each other. The backend also recognizes GitHub ZIP folder names. Access to both private repositories is required for automatic Git cloning. No wallet, API key or LLM installation is needed for the local simulation.

Requirements: Node 22.19+ compatible with Angular 21; npm. Backend on `127.0.0.1:3000`.

```powershell
npm.cmd ci
npm.cmd start
```

Open `http://127.0.0.1:4200`. `/api` is proxied to the backend, including HTTP-only session cookies. Set `APP_ORIGIN` in the backend if changing the frontend origin. Use the exact `127.0.0.1` origin consistently.

```powershell
npm.cmd run build
npm.cmd run test:e2e
```

Production output: `dist/agent-freelancer/browser`. The backend serves this directory when built alongside it. For separate hosting, configure SPA fallback to `index.html` and reverse proxy `/api` to the backend. Never put a private key in frontend configuration.

Playwright uses installed Chrome or Edge on Windows. On other machines, install Chromium with `npx playwright install chromium`. Run API, worker and frontend before E2E tests. Tests use fabricated simulation data.

The wallet connector loads only when connecting a testnet wallet. Session verification uses NEP-413; connecting an account alone does not create an authenticated session. Prepared financial operations preserve their IDs in local storage until reconciliation.

Main source: `src/app.ts`, `src/app.html`, `src/styles.css`. Theme values live in `src/tokens.css`. API and wallet boundaries live in `src/api.ts`. Atomic amount formatting uses `BigInt` in `src/money.ts`.
