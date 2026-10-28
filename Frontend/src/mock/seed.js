import { upgradeRoleRecords } from './roleUpgrade.js';
export const DEMO_KEY = 'campusiq.local-demo.v1';
export const demoPassword = 'Demo@12345';
export const demoAccounts = Object.freeze([
  { role: 'STUDENT', email: 'student@demo.campusiq.edu', full_name: 'Ayesha Siddiqui' },
  { role: 'INSTRUCTOR', email: 'instructor@demo.campusiq.edu', full_name: 'Dr. Sarah Khan' },
  { role: 'HOD', email: 'hod@demo.campusiq.edu', full_name: 'Dr. Omar Farooq' },
  { role: 'ADMIN', email: 'admin@demo.campusiq.edu', full_name: 'Hassan Ahmed' },
  { role: 'EXAM_STAFF', email: 'exam@demo.campusiq.edu', full_name: 'Sadia Malik' },
  { role: 'FINANCE_STAFF', email: 'finance@demo.campusiq.edu', full_name: 'Farhan Ahmed' },
  { role: 'IT_STAFF', email: 'it@demo.campusiq.edu', full_name: 'Hamza Shah' },
]);
export function seedRecords(now, credential) {
  const at = hours => new Date(now - hours * 3600000).toISOString();
  const departments = [
    { id: 1, name: 'Academics', code: 'ACA', description: 'Courses, registration and examinations', keywords: ['course', 'registration', 'exam', 'timetable', 'academic'], is_active: true },
    { id: 2, name: 'Finance', code: 'FIN', description: 'Tuition, payments and scholarships', keywords: ['fee', 'tuition', 'payment', 'refund', 'scholarship'], is_active: true },
    { id: 3, name: 'IT Support', code: 'ITS', description: 'Campus technology and access', keywords: ['wifi', 'wi-fi', 'password', 'portal', 'computer'], is_active: true },
  ];
  const users = demoAccounts.slice(0, 4).map((u, i) => ({ ...u, id: i + 1, department_id: u.role === 'ADMIN' ? null : 1, requested_role: u.role, approval_status: 'APPROVED', is_active: true, created_at: at(200), credential: { ...credential } }));
  users.push(...[
    { id: 5, full_name: 'Dr. Sana Ali', email: 'sana@demo.campusiq.edu', role: 'INSTRUCTOR', department_id: 1 },
    { id: 6, full_name: 'Ali Raza', email: 'ali@demo.campusiq.edu', role: 'STUDENT', department_id: 2 },
    { id: 7, full_name: 'Ms. Nadia Ahmed', email: 'nadia@demo.campusiq.edu', role: 'INSTRUCTOR', department_id: 2 },
    { id: 8, full_name: 'Mr. Bilal Noor', email: 'bilal@demo.campusiq.edu', role: 'INSTRUCTOR', department_id: 3 },
    { id: 9, full_name: 'Ahmed Hassan', email: 'pending@demo.campusiq.edu', role: 'INSTRUCTOR', department_id: 1, approval_status: 'PENDING' },
    { id: 10, full_name: 'Maryam Ali', email: 'maryam@demo.campusiq.edu', role: 'STUDENT', department_id: 2, approval_status: 'PENDING' },
  ].map(u => ({ ...u, requested_role: u.role, role:u.approval_status==='PENDING'?'STUDENT':u.role, approval_status: u.approval_status || 'APPROVED', is_active: u.approval_status!=='PENDING', created_at: at(24), credential: { ...credential } })));
  const items = [
    [1,'Course registration assistance',1,1,2,'ASSIGNED',3,'Medium','Web'],
    [2,'Examination timetable',1,1,2,'IN_PROGRESS',15,'High','Email'],
    [3,'Transcript request overdue',1,1,2,'ASSIGNED',80,'High','Web'],
    [4,'Tuition fee installment',6,2,7,'ESCALATED',90,'High','WhatsApp'],
    [8,'Academic appeal escalated',1,1,2,'ESCALATED',100,'High','Email'],
    [5,'Scholarship application',1,2,7,'RESOLVED',60,'Medium','Email'],
    [6,'Campus Wi-Fi access',6,3,8,'ASSIGNED',6,'Low','Web'],
    [7,'Course change resolved',1,1,5,'RESOLVED',48,'Low','Web'],
  ];
  const queries = items.map(([id, subject, student_id, department_id, assigned_to, status, hours, priority, channel]) => {
    const created_at = at(hours); const resolved_at = status === 'RESOLVED' ? at(hours - 10) : null;
    const q = { id, reference: `QRY-${String(id).padStart(4,'0')}`, subject, description: `Please help me with ${subject.toLowerCase()}.`, student_id, department_id, assigned_to, status, priority, channel, created_at, updated_at: resolved_at || created_at, resolved_at, classification: { intent: departments.find(d=>d.id===department_id).name, confidence: 0.92, method: 'Simulated AI' }, attachments: [], messages: [], timeline: [{ id: `seed-${id}-1`, status: 'SUBMITTED', label: 'Query submitted', created_at }, { id: `seed-${id}-2`, status, label: status === 'ESCALATED' ? 'Escalated to department HOD' : 'Routed by simulated AI', created_at: resolved_at || created_at }], draft: '' };
    if (resolved_at) q.messages.push({ id: `seed-reply-${id}`, author: users.find(u=>u.id===assigned_to).full_name, role: 'INSTRUCTOR', body: 'Your request has been processed in this local demo.', created_at: resolved_at, simulated: true });
    return q;
  });
  const state = { version: 1, clockOffset:0, now: new Date(now).toISOString(), users, departments, queries, leaves: {}, notifications: [{ id: 'welcome-student', user_id: 1, title: 'Welcome to the local demo', message: 'Your queries and replies are stored on this browser.', created_at: at(1), read: false, channel: 'In-app' }], announcements: [{ id: 'welcome', title: 'Welcome to CampusIQ', content: 'This local demo simulates campus communication.', audience: 'ALL', channels: ['In-app'], created_at: at(24), author: 'Hassan Ahmed' }], audit: [] };
  upgradeRoleRecords(state, credential, demoAccounts);
  return state;
}
