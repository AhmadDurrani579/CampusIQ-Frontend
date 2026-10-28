# Frontend verification ? 15 October 2026

Latest verified feature: seven mock signup choices, approved department staff workflows and pending Admin requests. No backend/provider changes.

| Check | Fresh result | Evidence |
|---|---|---|
| Domain | 42 passed, 0 failed | `artifacts/department-roles-domain.txt` |
| Full npm test browser suite | 60 passed, 1 intentional optional skip, 0 unexpected, 0 flaky; 6.6 minutes | `artifacts/department-roles-final-results.json` |
| Enabled department-create API case | 1 passed; 17.2 seconds | `artifacts/department-roles-department-create.json` |
| Production build | Exit0, 3343 modules, 9.56 seconds | `artifacts/department-roles-build.txt` |
| Visual walk | 108 desktop/mobile views, 0 errors/overflow/API requests | `artifacts/department-roles-visual-check.json` |
| Independent review | Approved after one migration fix wave | `../docs/superpowers/department-roles-review.md` |

There are 27 passing mock browser cases (18 original +9 new), 33 passing default API-contract cases and one separately passing optional API case: 61 distinct browser cases passed across the two configurations. All mock cases assert zero API requests and uncaught page errors. The new cases cover all four new requested choices through pending/failed pre-approval login/Admin approval/canonical login/profile, all three staff query routing/replies/cross-department denials/no Admin or export access, and mobile/theme/preview isolation.

Eight new domain cases plus original34 pass. The initial five new cases failed before implementation. Three additional migration regressions failed for the exact independent-review findings, then passed after stable identity/conflict handling was repaired. Existing queries, account/password hashes, IDs and unrelated storage remain; the one-time upgrade never reactivates disabled existing accounts.

The final visual walk covers the seven role workspaces and authentication at 1440?1000 and 390?844. It submits three queries through the actual Student mock facade to populate realistic new department queues; no bypassed role or fake session. Three new staff desktop dashboards, Examination mobile dashboard, IT mobile query details and desktop signup were actually viewed. Screenshots use `artifacts/mock-exam_staff-*`, `mock-finance_staff-*`, `mock-it_staff-*` and `mock-signup-*` names. Native dropdown choices are asserted by the browser test.

The lazy ExcelJS export chunk warning remains 929.48kB minified /256.40kB gzip. Tests use owned5175/5176 and visual QA uses5177, with all owned servers stopped; user dev5173 is untouched. API contracts are tested with intercepted fixtures, not a live backend. API/signup and public preview retain the original contracts until server-side new roles exist. Real Google/AI/email/WhatsApp integrations remain outside the mock scope.

## Earlier verified mock release ? 14 October 2026


The authorized functional mock frontend is complete. The default `.env` is `VITE_APP_MODE=mock`; no backend is needed. This record supersedes the earlier API-only verification.

| Check | Fresh result | Evidence |
|---|---|---|
| Domain behavior | 34 passed, 0 failed | `artifacts/mock-frontend-final-domain.txt` |
| Full `npm test` browser run | 51 passed, 1 intentional opt-in skip, 0 unexpected, 0 flaky; 6.4 minutes | `artifacts/mock-frontend-final-results.json` |
| Enabled department-create API case | 1 passed; 19.5 seconds | `artifacts/mock-frontend-final-department-create.json` |
| Production `npm run build` | Exit 0; 3341 modules; 6.94 seconds after final CSS correction | `artifacts/mock-frontend-final-build.txt` |
| Final visual walk | 72 desktop/mobile page inspections, 0 failures, 0 page errors, 0 `/api/v1` requests | `artifacts/mock-visual-check.json` |
| Independent source review | Approved after one fix wave; no outstanding Critical/Important findings | `../docs/superpowers/mock-frontend-final-review.md` |

The full browser run comprises 33 passing API-contract cases and 18 passing functional mock cases. The one optional department POST case is separately exercised with its capability flag enabled: 52 distinct browser cases passed across both configurations. Every mock browser test asserts zero API requests and uncaught page errors. API tests use test-only intercepted responses; they do not establish compatibility with a deployed FastAPI server.

Three final-review domain regressions were observed failing before repairs, then passed: explicit escalation after reassignment while automatic escalation remains once per query; requested-role signup notifications; notification links removed after assignment access is lost. The full domain/API/mock run passed after those behavior changes. A subsequent CSS-only correction aligns query labels and values when no icon is present; its covering checks were the fresh build and complete visual walk.

The final walk covers all four role workspaces, query details, administration, notifications/profile, submission, leave, escalations, reports and authentication screens at 1440×1000 and 390×844. Representative screenshots were actually viewed: four role desktops, Admin and HOD mobile dashboards, Admin mobile users, desktop/mobile query details, dark Admin, mobile login and desktop signup. A preceding visual capture had a heading-wait timeout and incomplete capture; the helper now waits for paint and records interruptions, and the final fresh run completed all 72 views. The full browser regression suite itself reported no flaky cases. Screenshots use the `artifacts/mock-*.png` names.

Fresh exported Admin PDF was rendered to `artifacts/mock-report-admin-page-1.png` and visually inspected: one readable landscape page with clear demo/actor metadata, aligned summary and all 8 query rows without clipping. Task 2's independent Excel inspection confirmed Admin 8 queries/3 departments and HOD 5 Academics queries, with appropriate scope and metadata. Formula-looking query text is exported as string cells and exercised by the browser tests.

The lazy ExcelJS export dependency retains the expected 929.48 kB minified / 256.40 kB gzip chunk warning. It loads on Excel export. The build warning is not a build failure.

Tests used owned transient ports 5175/5176; visual QA used 5177. All owned servers were stopped after verification. The normal user development port 5173 was not occupied by verification.

Real Google OAuth, Gemini/Claude, email, WhatsApp and WebSocket connections remain future integrations. Classification, drafts and delivery are explicitly simulated. The single-browser demo persists local records, hashes passwords and uses canonical memory-only sessions; it is not a production multi-user authorization boundary. No backend was changed or verified live.
