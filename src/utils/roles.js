export const LEGACY_ROLES = ['STUDENT', 'INSTRUCTOR', 'HOD', 'ADMIN'];
export const DEPARTMENT_ROLES = ['EXAM_STAFF', 'FINANCE_STAFF', 'IT_STAFF'];
export const ROLES = [...LEGACY_ROLES.slice(0, 3), ...DEPARTMENT_ROLES, 'ADMIN'];
export const STAFF_ROLES = ['INSTRUCTOR', ...DEPARTMENT_ROLES];
export const REPLY_ROLES = [...STAFF_ROLES, 'HOD', 'ADMIN'];
export const isDepartmentStaff = role => DEPARTMENT_ROLES.includes(role);
export const getRoleHome = role => ROLES.includes(role) ? `/${role.toLowerCase()}/dashboard` : '/access-denied';
export const roleLabels = { STUDENT: 'Student', INSTRUCTOR: 'Instructor', HOD: 'Head of department', EXAM_STAFF: 'Examination Staff', FINANCE_STAFF: 'Finance Staff', IT_STAFF: 'IT Department Staff', ADMIN: 'Administrator' };
