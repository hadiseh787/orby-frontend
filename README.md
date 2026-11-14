# Orby frontend

Angular 21 interface for **Orby**, a NEAR HACKATHON project connecting clients and agents through explicit agreements, bounded specialist spending, version-bound review and verifiable testnet settlement.

**Start with the [complete project README](https://github.com/hadiseh787/orby-backend#readme).** This repository is the companion UI for the same Orby entry, not a second contest project. The backend contains contracts, database, worker, setup, launcher, current evidence and the authoritative frontend pin.

| Review resource | Link |
| --- | --- |
| Install and understand the product | [Backend README](https://github.com/hadiseh787/orby-backend#readme) |
| Follow actions and expected results | [Judge walkthrough](https://github.com/hadiseh787/orby-backend/blob/main/docs/JUDGES_GUIDE.md) |
| Watch actual native Mac execution | [Recording and evidence](https://github.com/hadiseh787/orby-backend/blob/main/docs/mac-acceptance/README.md) |
| Inspect successful/failed acceptance attempts | [Portable release report](https://github.com/hadiseh787/orby-backend/blob/main/docs/PORTABLE_RELEASE.md) |
| Understand reused code and event scope | [Build history](https://github.com/hadiseh787/orby-backend/blob/main/docs/BUILD_HISTORY.md) |
| Run natively on macOS | [Mac quickstart](https://github.com/hadiseh787/orby-backend/blob/main/docs/QUICKSTART_MAC.md) |

## Run the complete application

Prerequisites: Git and Node.js **24 LTS** with npm, or **22.19+ within major 22** (`^22.19.0 || ^24.0.0`). Node 26 is not supported by the launcher. Initial installation needs internet and several GB for the local model. Embedded PostgreSQL must run as a normal user.

Run these commands from a new backend checkout, not from this frontend directory:

```sh
git clone https://github.com/hadiseh787/orby-backend.git
cd orby-backend
npm ci
npm run setup:model
npm run setup:testnet
npm run local
```

Open **http://127.0.0.1:4200**. The backend launcher retrieves the exact revision in its `workspace.json`, builds both applications and starts PostgreSQL/API/worker/configured model. Angular and `/api/v1` share 4200. No separate frontend command, global Angular CLI, Docker or separate database install is needed. Windows PowerShell can use `npm.cmd`.

`setup:testnet` provisions locally owned identities and signs actual testnet setup/deployment operations; it is not a mainnet action or a read-only check. No private Windows key file is distributed. A public contract address does not grant signing authority. For simulation-only exploration, omit the two setup commands and run the local launcher; amounts remain simNEAR and real AI/testnet readiness is not implied.

For an existing backend installation, stop its stack, preserve `.env`, `.data/postgres` and local private keys, update with `git pull --ff-only`, install with `npm ci`, run the setup steps as needed and restart. Preserve local edits if Git refuses the update; do not delete data or reset the repository to force it. Subsequent launches use `npm run local`; stop with Ctrl+C or `npm run local:stop` from the backend directory.

## What the UI demonstrates

- **Marketplace:** eight supplied-source comparison specialists, focused profiles, explicit input/price limits and six sample starters that prefill an editable job.
- **Agreement wizard:** goal-based real-AI drafting when configured; editable budget/deadline/acceptance checks. Drafting is not payment authorization.
- **Proposal and plan review:** compare fixed-version proposals, inspect the permitted specialist and approve the plan before funding.
- **Live collaboration:** stage/check/attempt history, creator-funded specialist costs and one bounded recovery in the approved mission scenario.
- **Versioned delivery:** inspect source evidence, request a targeted revision and approve the current version/hash; stale approval is rejected.
- **Work receipt:** inspect decisions and allocations, build private/redacted evidence and verify testnet contract state or labeled simulation records.
- **Workspace tools:** programs, selected knowledge snapshots, personal templates, Quality Lab and team draft/review roles. Team review is not on-chain multisig.
- **Balance:** environment-specific ledger/history and a no-transfer mainnet Intents quote preview.
- **Settings and trust:** actual installation identity and separate model, contract and mission readiness, plus disclosed operator boundaries.
- **Responsive presentation:** light/dark/system themes and scoped 390px mobile regression coverage.

The catalog organizes supplied claims. It does not promise web research, independent factual verification or eight independently trained models. Frozen sample history is labeled and excluded from real performance statistics. Google Sheets controls remain disabled until server OAuth is configured.

## Environment and financial labels

| Mode | UI meaning |
| --- | --- |
| Simulation / simNEAR | Local simulated funds; deterministic or explicitly selected real-model execution; no chain payment |
| NEAR testnet / testNEAR | Real testnet wallet operations against a configured V3 deployment; final outcomes must be confirmed |
| Mainnet Intents preview / dry:true | Live quote only, with expiry and fee notices; no executable deposit address, signature, transfer or balance credit |

Neither simNEAR nor testNEAR is real money. Historical quotes are expired observations. A successful screenshot or transaction hash alone is not final settlement proof.

In Settings → Recheck connections, require the real model to pass its JSON/revision probes. Contract CONNECTED and mission READY are separate: the latter also verifies executor permissions/allowance/funds and agent policies. Cold model checks may take several minutes; the UI allows a bounded wait of up to seven minutes.

## Frontend-only development

For developers intentionally running split servers:

1. Configure/migrate the backend database using its documented setup. Run backend `npm run dev` on 3000 and `npm run worker` as required.
2. In this repository:

```sh
npm ci
npm start
```

Angular serves 4200 and [`proxy.conf.json`](proxy.conf.json) forwards `/api` to backend 3000. Do not also run the complete backend launcher on the same port.

Production frontend build:

```sh
npm run build
```

Output: `dist/orby/browser`. [`scripts/build-info.mjs`](scripts/build-info.mjs) writes ignored frontend build metadata from the checked-out Git commit; archives report `archive-no-git`. Do not hand-edit metadata to imply a different source revision.

The complete launcher chooses a clean checkout matching the backend pin. An old/edited adjacent frontend is preserved. Explicit backend `--frontend PATH` / `FRONTEND_DIR` opts into a developer-selected checkout. This repository's documentation can be newer than the tested runtime pin without changing application behavior.

## Tests and evidence

Recommended isolated browser regression command, **from the backend**:

```sh
npm run test:browser:isolated
```

It provisions disposable fixtures and starts the paired frontend. The lower-level frontend `npm run test:e2e` requires the appropriate running fixtures; repeatedly applying it to a personal long-lived database can hit valid account limits. Do not erase user data to make a test pass.

The recorded [native Apple Silicon workflow](https://github.com/hadiseh787/orby-backend/actions/runs/43634985936) succeeded with frontend `16f188ecfd4627dbcfad0835c09c69998fe88bf5` and backend `549767ef67b7655acdf29013c03288abc44a1857`. It includes a real-model testnet mission, controlled specialist recovery, actual Revision 1 and verified settlement. Separate eight-agent catalog checks use real inference with **simulated** funds. Subsequent changes and scoped regression results are described in the release report; later documentation commits do not rerun that acceptance automatically.

The recorded wallet adapter signs real testnet transactions with ignored development fixtures; it is not a claim of manual HOT/Meteor approval or a certification of another user's Mac.

## Security, licensing and submission

Models cannot authorize arbitrary spending. Backend/contract policy and wallet review enforce boundaries; evaluator/admin trust remains disclosed. Private source material is not a TEE, and the project is not independently audited or intended for real mainnet custody. Do not commit `.env`, private keys, database files or signed checkpoints. Public transaction data remains public; review evidence redaction before sharing.

Source is [MIT](LICENSE). Angular/RxJS/TypeScript, `@hot-labs/near-connect`, Playwright/axe and other dependencies retain their own licenses; exact versions are in [`package-lock.json`](package-lock.json). Paired model/runtime and contract attribution is documented in the backend build history. AI-assisted development is allowed by the event; no wholly manual authorship or new model training is claimed.

The source repositories are public. Current submission status and remaining owner decisions are tracked in [SUBMISSION.md](https://github.com/hadiseh787/orby-backend/blob/main/docs/SUBMISSION.md). Source publication is not an X demo post or contest registration. The entrant must publish the real execution video, confirm their team/payout/contact information and submit the single Orby project once under the live event rules.
