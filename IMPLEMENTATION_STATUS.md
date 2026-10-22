# Requirement coverage — 14 October 2026

The frontend defaults to a persisted local demo. API mode retains the confirmed server contracts and explicitly labels unsupported operations. The separately developed FastAPI backend was not changed or verified live.

| Brief area | Mock-mode behavior | API-mode boundary |
|---|---|---|
| App shell | Seven role-specific mock dashboards/navigation, accessible mobile menu, light/dark mode, page search, breadcrumbs, local-demo banner and unread notification dropdown. | Same shell; unsupported services are labelled. |
| Signup and authentication | Public request for any of the seven mock choices creates inactive Student with requested role, Pending status and no session. Admin approval assigns role; canonical login, profile update and sign-out use memory-only session. Refresh returns to login while local records persist. Seven demo accounts share public password `Demo@12345`. Google sign-in is Coming Soon. | Confirmed signup/login/profile/logout endpoints; no persisted refresh token. |
| Student queries | Actual scoped submission, optional active department and validated local attachments, Web/Email/WhatsApp channel simulation, search/filter/pagination, timeline, message and file download. | Query endpoint contract unavailable; actions disabled. |
| Instructor workflow | Assigned queries, simulated draft generation, explicit human review/send, status updates, persisted leave schedule and simulated absence auto-reply with alternate routing. | Draft/reply/leave services unavailable. |
| HOD workflow | Scoped department metrics, escalations, staff workload, within-department reassignment and routing override, date-filtered reports. | These backend contracts unavailable. |
| Admin approvals | Real local pending list, confirmation, approval/rejection and cache refresh. | Confirmed pending/approve/reject endpoints. |
| Admin users/staff | Search/filter complete local directory; requested/assigned roles, status and department; confirmed department assignment and approved-account activation/deactivation with self-deactivation blocked. Staff assignments select approved active Instructors, HODs and department staff, with matching department restrictions for Exam/Finance/IT staff. No direct role edit. | User directory and assignment mutations unavailable. |
| Departments | List/detail/create/edit/deactivate/reactivate, search/status filters, reusable form with string keywords and confirmation. | List/detail endpoints; POST is opt-in, edit/deactivate unavailable. |
| Routing/audit | Actual local intent, confidence, department, staff and method (`Simulated AI`/`Staff override`) with query detail link. Admin-only chronological audit with search, actor/action/resource/result/details. | Services unavailable. |
| Announcements/notifications | Admin publishes all-student or active-department announcements via selected channels. Targeted students see publication history and in-app notices. Notification center saves read/unread/all state; header polls local unread count. External channel events are audited as simulated. | Services unavailable; no WebSocket/provider claim. |
| Analytics/exports | Scoped live local metrics and charts, inclusive report dates, PDF and Excel export of actual rows. Lazy ExcelJS loads only on export. | Analytics/export contracts unavailable. |
| Demo controls | Admin advances the demo clock 24 hours, triggering due escalations, or confirms reset. Login reset recovers corrupt data. Reset removes only the demo key and signs out, preserving theme/unrelated storage. | Controls absent. |
| Preview/security | Public `/preview` uses isolated read-only fixtures and never reads private demo data. Domain operations check canonical actors and permissions. | Route guards remain UX; FastAPI must enforce server permissions. |

The demo simulates classification, AI draft suggestions, email, WhatsApp and external delivery. It is a single-browser demonstration, not a production authorization, multi-user or provider integration. The older backend found elsewhere on this machine has different contracts; see `../docs/backend-contract-gaps.md`.

Verification evidence and remaining integration limits are in `VERIFICATION.md` and `../docs/superpowers/mock-admin-ui-report.md`.


## Approved role extension

Mock registration now includes Examination Staff (`EXAM_STAFF`), Finance Staff (`FINANCE_STAFF`), IT Department Staff (`IT_STAFF`) and Admin requests. Together with the existing Student/Instructor/HOD choices, there are seven choices. Every application is inactive and pending until an existing Admin approves it; Admin access cannot be acquired merely by selecting it.

Department staff receive dedicated dashboards, department query queues, reply drafts/approval/send, status/escalation actions, scoped reports/charts, notifications and profile. Oversight, reassignment, administration, broadcasts, demo controls and report exports retain their existing boundaries. Instructor leave stays Instructor-only. API mode/public preview retain the confirmed original-role contracts.

The additive migration preserves existing accounts, credentials, queries and settings. Department identity uses stable legacy IDs and internal tags rather than mutable codes; conflicting new department names/codes receive unique values without modifying user-created departments. Existing inactive accounts are never re-enabled by migration. Finance/IT routing prefers available approved department staff; Examinations is a distinct department for exams, results, timetable and transcript queries.
