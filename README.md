# Orby frontend

Angular 21 application with responsive light/dark/system themes, editable AI agreements, approved budget plans, specialist collaboration, version-bound review, economic receipts and Safe Mode Intents quotes.

Start the complete application from the paired [backend repository](https://github.com/hadiseh787/orby-backend):

```powershell
git clone https://github.com/hadiseh787/orby-backend.git
cd orby-backend
npm.cmd run local
```

Install Git and Node.js 24 LTS with npm first (22.19+ supported). The single launcher fetches this repository at its pinned commit, installs both lockfiles, starts PostgreSQL/API/worker/model and serves Angular at http://127.0.0.1:4200. Stop with Ctrl+C or `npm.cmd run local:stop`. No global Angular CLI or separate database installation is required. For real Ollama on Windows, stop the app, run `npm.cmd run demo:model:setup` from backend, then start again.

Settings > Installation readiness displays the exact frontend build commit, responding backend commit, API origin, network, public contract and model. Explicit Recheck runs real inference. Source-only clones have no owner signing keys; real testnet execution requires an independent deployment or owner-provisioned local configuration. Simulation and the 15 labeled samples require no signing keys.

For split-server development only:

```powershell
npm.cmd ci
npm.cmd start
```

Angular 4200 proxies `/api` to backend 3000. The complete launcher serves API and Angular on the same 4200 origin. Builds create ignored `public/build-info.json` from the source Git commit (archives report `archive-no-git`).

Run `npm.cmd run test:browser:isolated` from backend for disposable browser regression fixtures. The actual 4200 installation's real Ollama/testnet acceptance evidence, full recording, setup instructions and limitations are in the [backend verification guide](https://github.com/hadiseh787/orby-backend/blob/main/docs/INSTALLED_DEMO_VERIFICATION.md).

Source: [MIT](LICENSE). No secrets or model binaries are included. Google Sheets is disabled until configured; mainnet Intents is mandatory-dry and never signs, transfers or credits funds.
