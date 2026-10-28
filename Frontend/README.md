# CampusIQ — University Intelligent Communication Hub

React/Vite frontend for the Smart Query Routing & Email Automation System. The default local mode runs a functional browser-only demo; no backend is needed.

## Run locally

Use Node.js 22.12+ (Node 24 is supported):

```powershell
cd Frontend
npm install
npm run dev
```

Open http://localhost:5173. `.env` defaults to `VITE_APP_MODE=mock`. The original four demo accounts are `student@demo.campusiq.edu`, `instructor@demo.campusiq.edu`, `hod@demo.campusiq.edu`, and `admin@demo.campusiq.edu`. Their shared public demo password is `Demo@12345`. The login page can fill each account for you; sign-in still uses the canonical stored profile and assigned role. There is no authenticated role switch.

The demo stores accounts, queries, departments, announcements, notifications, leave settings and audit records in this browser under `campusiq.local-demo.v1`. Passwords are salted and hashed; no plaintext account password is stored. The session stays in memory, so refreshing returns to login while records remain. Admin > Users contains a confirmed **Reset local demo** control, which deletes only the demo records and signs out. The login page also has a confirmed recovery reset for damaged demo data. Theme and unrelated browser storage remain. This local demo is for demonstration, not a multi-user server or a production security boundary.

Public signup always creates an inactive Student account with the requested Student, Instructor or HOD role pending. To try approval, register, sign in as the demo Admin, open **Approvals**, approve the request, sign out, then sign in with the new account's own credentials. Approval assigns the requested role. Admin cannot assign roles directly through the Users page.

## What the local demo does

Students submit and track queries, upload supported local attachments, read replies and announcements, and manage notifications. Instructors review and explicitly send reply drafts, update statuses, and save leave settings. Active leave routes new Academics queries to an available alternate and shows a simulated absence reply. HODs inspect their department and reassign or override routing within it. Admins approve users, manage users and departments, assign approved staff, inspect routing/audit records, publish student announcements, export reports, advance the demo clock by 24 hours, and reset the demo. Profile updates persist with the user.

Classification, AI drafts, email, WhatsApp and external announcement delivery are **simulated**. The 24-hour escalation follows the demo clock. Notification views poll local data; there is no WebSocket or provider connection. The public `/preview` is a separate read-only showcase that does not read private demo records. Google sign-in is Coming Soon.

PDF and Excel reports contain actual scoped local records and applied filters. ExcelJS loads only when an Excel export is requested; the production build reports its 929 kB minified / 256 kB gzip lazy chunk.

## API mode

Set `VITE_APP_MODE=api` in `.env`, configure `VITE_API_BASE_URL` (including `/api/v1`), then restart Vite. `.env.example` documents these values. API mode retains the confirmed auth, profile, approval and department list/detail contracts. Department POST remains gated by `VITE_ENABLE_DEPARTMENT_CREATE=true` until its backend contract is confirmed. Query workflows, user management, department edit/deactivation, notifications, announcements, analytics, leave, audit and exports remain explicitly unavailable in API mode; the frontend does not report simulated results as server success.

Never place database passwords, JWT signing keys or provider secrets in Vite variables. API access tokens are in memory; refresh tokens are discarded. FastAPI must independently enforce role and record permissions. The separately developed backend was not modified or live-tested here. See `../docs/backend-contract-gaps.md` for known differences in an older backend found on this machine.

## Tests and build

```powershell
cd Frontend
npm run test:domain
npx playwright test --project=mock
npx playwright test --project=chromium
npm run build
```

Playwright uses separate Vite servers on ports 5175 (API fixtures) and 5176 (mock), serial Microsoft Edge with GPU acceleration disabled. It does not use the normal development port 5173. To exercise the opt-in department POST path in PowerShell:

```powershell
$env:VITE_ENABLE_DEPARTMENT_CREATE='true'
npx playwright test --project=chromium -g 'enabled department creation'
Remove-Item Env:VITE_ENABLE_DEPARTMENT_CREATE
```

The app uses React Router, TanStack Query, Axios, React Hook Form/Zod, Radix, Recharts, Lucide, Sonner, Motion and Tailwind/CSS. `src/mock/` contains the persisted local domain; `src/api/` switches mode without exposing demo data to API mode; `src/preview/` contains isolated public fixtures.


## Department staff signup

Mock signup now offers Student, Instructor, Head of department, Examination Staff, Finance Staff, IT Department Staff and Admin. Every new request stays inactive and pending until an existing Admin approves it. Selecting Admin does not grant immediate Admin access. The confirmed API-mode signup retains Student/Instructor/HOD until the backend supports additional role contracts.

New department staff use department dashboards, query queues, drafts/replies, statuses, escalations, scoped analytics, notifications and profile. They cannot override routing, approve users, manage the directory, broadcast, reset the demo or export reports. Instructor leave and Admin/HOD capabilities retain their existing boundaries.

Additional demo accounts: `exam@demo.campusiq.edu`, `finance@demo.campusiq.edu`, `it@demo.campusiq.edu`; password `Demo@12345`. Existing local data upgrades once without reset. Original accounts, credentials, queries, assignments and read state are preserved. New Examinations handles exams, timetable, results and transcript queries. Finance/IT routing prefers active approved department staff and can fall back to an Instructor. Department identity survives edited display names/codes. Public preview remains the isolated four-role showcase.

If this project was moved/renamed, open its current `Frontend` folder and restart Vite to load the changes. The current project is `C:/Users/Ali Noor/Desktop/Smart-Query-Routing-Email-Automation-System`.
