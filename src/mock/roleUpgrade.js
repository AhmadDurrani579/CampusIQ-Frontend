// Additive migration: never reset records or re-enable an existing account.
const departmentDefinitions = [
  { role: 'FINANCE_STAFF', code: 'FIN', legacyId: 2, name: 'Finance', description: 'Tuition, payments and scholarships', keywords: ['fee', 'tuition', 'payment', 'refund', 'scholarship'] },
  { role: 'IT_STAFF', code: 'ITS', legacyId: 3, name: 'IT Support', description: 'Campus technology and access', keywords: ['wifi', 'wi-fi', 'password', 'portal', 'computer'] },
  { role: 'EXAM_STAFF', code: 'EXM', name: 'Examinations', description: 'Exams, timetables, results and transcripts', keywords: ['exam', 'examination', 'timetable', 'result', 'transcript'] },
];
const uniqueValue = (values, wanted) => {
  const taken = new Set(values.map(v => v.toLowerCase()));
  let value = wanted, suffix = 2;
  while (taken.has(value.toLowerCase())) value = `${wanted}${suffix++}`;
  return value;
};
export function upgradeRoleRecords(state, credential, accounts) {
  if (state.roleUpgrade === 1) return false;
  const claimed = new Set();
  for (const definition of departmentDefinitions) {
    const eligible = d => !claimed.has(d.id) && (!d.staff_role || d.staff_role === definition.role);
    // Existing tags and original numeric IDs survive Admin edits to names/codes.
    // A newly introduced role may reuse a matching department name, never an arbitrary code.
    let department = state.departments.find(d => eligible(d) && d.staff_role === definition.role)
      || (definition.legacyId && state.departments.find(d => eligible(d) && d.id === definition.legacyId))
      || state.departments.find(d => eligible(d) && d.name.toLowerCase() === definition.name.toLowerCase());
    if (!department) {
      department = { id: Math.max(0, ...state.departments.map(d => d.id)) + 1, name: uniqueValue(state.departments.map(d => d.name), definition.name), code: uniqueValue(state.departments.map(d => d.code), definition.code), description: definition.description, keywords: [...definition.keywords], is_active: true };
      state.departments.push(department);
    }
    department.staff_role = definition.role;
    claimed.add(department.id);
  }
  for (const account of accounts.filter(a => departmentDefinitions.some(d => d.role === a.role))) {
    if (state.users.some(u => u.email.toLowerCase() === account.email.toLowerCase())) continue;
    if (!credential) throw new Error('Local demo credentials are missing. Reset demo data to continue.');
    state.users.push({ ...account, id: Math.max(0, ...state.users.map(u => u.id)) + 1, department_id: state.departments.find(d => d.staff_role === account.role).id, requested_role: account.role, approval_status: 'APPROVED', is_active: true, created_at: state.now, credential: { ...credential } });
  }
  state.roleUpgrade = 1;
  return true;
}
