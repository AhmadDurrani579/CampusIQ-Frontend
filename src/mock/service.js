import { DEMO_KEY, demoPassword, seedRecords, demoAccounts } from "./seed.js";
export { demoAccounts } from "./seed.js";
import { ROLES as roles, STAFF_ROLES, REPLY_ROLES, isDepartmentStaff } from '../utils/roles.js';
import { upgradeRoleRecords } from './roleUpgrade.js';
const statuses = [
  "SUBMITTED",
  "CLASSIFYING",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "ESCALATED",
  "MANUAL_REVIEW",
  "CLASSIFICATION_FAILED",
  "CLOSED"
];
const channels = [
  "Web",
  "Email",
  "WhatsApp"
];
const clone = (value) => structuredClone(value);
const fail = (message, status = 400) => {
  const e = new Error(message);
  e.response = {
    status,
    data: { detail: message }
  };
  throw e;
};
const requireText = (value, label, max = 5000) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) fail(`${label} is required and must be at most ${max} characters.`);
  return value.trim();
};
const same = (a, b) => String(a) === String(b);
const publicUser = (u) => {
  const { credential, ...safe } = u;
  return safe;
};
let unauthorizedHandler = null;
export function setMockUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}
export function clearMockSession() {
  singleton?.clearSession();
}
export function createMockService({ storage, crypto = globalThis.crypto, now = () => Date.now(), onUnauthorized = () => unauthorizedHandler?.() } = {}) {
  let actorId = null;
  let sessionGeneration = 0;
  let queue = Promise.resolve();
  const persistence = () => storage || globalThis.localStorage;
  const id = () => crypto.randomUUID();
  async function hash(password, salt) {
    if (!crypto?.subtle) fail("Secure local password hashing is unavailable. Use localhost or HTTPS.");
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({
      name: "PBKDF2",
      hash: "SHA-256",
      salt: new TextEncoder().encode(salt),
      iterations: 100000
    }, material, 256);
    return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  const save = (state) => {
    try {
      persistence().setItem(DEMO_KEY, JSON.stringify(state));
    } catch {
      fail("Unable to save local demo data. Browser storage may be full or disabled.", 507);
    }
  };
  async function load() {
    let raw;
    try {
      raw = persistence().getItem(DEMO_KEY);
    } catch {
      fail("Unable to read local demo storage.", 507);
    }
    if (raw) {
      let state;
      try {
        state = JSON.parse(raw);
      } catch {
        fail("Local demo data is damaged. Reset demo data to continue.");
      }
      if (!state || state.version !== 1 || !Array.isArray(state.users) || !Array.isArray(state.queries) || !Array.isArray(state.departments) || !Array.isArray(state.notifications) || !Array.isArray(state.announcements) || !Array.isArray(state.audit) || !state.leaves || !Number.isFinite(Date.parse(state.now))) fail("Local demo data is incompatible. Reset demo data to continue.");
      validateRecords(state);
      const seedCredential = state.users.find(u => u.email === "admin@demo.campusiq.edu")?.credential;
      if (upgradeRoleRecords(state, seedCredential, demoAccounts)) save(state);
      state.clockOffset = Number.isFinite(state.clockOffset) ? state.clockOffset : Date.parse(state.now) - now();
      state.now = new Date(now() + state.clockOffset).toISOString();
      return state;
    }
    const salt = id();
    const state = seedRecords(now(), {
      salt,
      hash: await hash(demoPassword, salt),
      algorithm: "PBKDF2-SHA256",
      iterations: 100000
    });
    save(state);
    return state;
  }
  // Serialize operations so asynchronous credential hashing cannot lose writes.
  const run = (fn) => {
    const result = queue.then(fn);
    queue = result.catch(() => {});
    return result;
  };
  // Capture the requesting session before entering the operation queue.
  const requestingSession = () => {
    const generation = sessionGeneration;
    const userId = actorId;
    return () => {
      if (generation !== sessionGeneration || userId !== actorId) {
        fail("Your session changed. This operation was interrupted.", 401);
      }
    };
  };
  function actor(state, allowed = roles) {
    const u = state.users.find((u) => same(u.id, actorId));
    if (!u || !u.is_active || u.approval_status !== "APPROVED") {
      actorId = null;
      onUnauthorized();
      fail("Please sign in with an approved, active account.", 401);
    }
    if (!allowed.includes(u.role)) fail("You do not have permission to perform this action.", 403);
    return u;
  }
  const permitted = (u, q) => u.role === "ADMIN" || u.role === "STUDENT" && same(q.student_id, u.id) || u.role === "INSTRUCTOR" && same(q.assigned_to, u.id) || (u.role === "HOD" || isDepartmentStaff(u.role)) && same(q.department_id, u.department_id);
  const query = (s, u, key) => {
    const q = s.queries.find((q) => same(q.id, key));
    if (!q) fail("Query not found.", 404);
    if (!permitted(u, q)) fail("You do not have permission to view or change this query.", 403);
    return q;
  };
  const department = (s, key, active = false) => {
    const d = s.departments.find((d) => same(d.id, key));
    if (!d || active && !d.is_active) fail("Choose an active department.");
    return d;
  };
  function notify(s, user_id, title, message, query_id) {
    if (!user_id) return;
    s.notifications.unshift({
      id: id(),
      user_id,
      title,
      message,
      query_id,
      created_at: s.now,
      read: false,
      channel: "In-app"
    });
  }
  function audit(s, u, action, detail, resource = "Demo") {
    s.audit.unshift({
      id: id(),
      action,
      actor: u.full_name,
      detail,
      details: detail,
      created_at: s.now,
      timestamp: s.now,
      resource,
      result: "Success"
    });
  }
  function event(s, q, status, label) {
    q.status = status;
    q.updated_at = s.now;
    q.timeline.push({
      id: id(),
      status,
      label,
      created_at: s.now
    });
  }
  function escalate(s, q, u) {
    if (["RESOLVED", "CLOSED"].includes(q.status)) fail("Resolved or closed queries cannot be escalated.");
    if (q.status === "ESCALATED") return;
    event(s, q, "ESCALATED", "Escalated to department HOD");
    s.users.filter((x) => x.is_active && x.approval_status === "APPROVED" && (x.role === "ADMIN" || x.role === "HOD" && same(x.department_id, q.department_id))).forEach((x) => notify(s, x.id, "Query escalated", q.subject, q.id));
    notify(s, q.student_id, "Query escalated", q.subject, q.id);
    audit(s, u, "QUERY_ESCALATED", q.reference, "Query");
  }
  const mutate = (allowed, fn) => {
    const currentSession = requestingSession();
    return run(async () => {
      currentSession();
      const s = await load();
      currentSession();
      const u = actor(s, allowed);
      const result = await fn(s, u);
      currentSession();
      save(s);
      return clone(result);
    });
  };
  function sweep(s) {
    let changed = false;
    const system = { full_name: "Demo escalation scheduler" };
    s.queries.filter((q) => ![
      "RESOLVED",
      "CLOSED",
      "ESCALATED"
    ].includes(q.status) && !q.timeline.some((e) => e.status === "ESCALATED") && Date.parse(s.now) - Date.parse(q.created_at) >= 24 * 3600000).forEach((q) => {
      escalate(s, q, system);
      changed = true;
    });
    return changed;
  }
  const read = (allowed, fn, scheduler = false) => {
    const currentSession = requestingSession();
    return run(async () => {
      currentSession();
      const s = await load();
      currentSession();
      const u = actor(s, allowed);
      const result = fn(s, u);
      if (scheduler && sweep(s)) {
        save(s);
        return clone(fn(s, u));
      }
      return clone(result);
    });
  };
  function decorate(s, q) {
    const student = s.users.find((u) => same(u.id, q.student_id));
    const staff = s.users.find((u) => same(u.id, q.assigned_to));
    const d = s.departments.find((d) => same(d.id, q.department_id));
    const { draft, ...safe } = q;
    return {
      ...safe,
      student: student?.full_name || "Student",
      initials: (student?.full_name || "Student").split(" ").map((p) => p[0]).slice(0, 2).join(""),
      color: "blue",
      department: d?.name || "Unassigned",
      assigned_instructor: staff?.full_name || "Unassigned",
      date: new Date(q.created_at).toLocaleDateString("en-GB"),
      updated: new Date(q.updated_at).toLocaleString("en-GB"),
      submitted_at: q.created_at
    };
  }
  function dateRange(filters = {}) {
    const parse = (value, end = false) => {
      if (value == null || value === "") return null;
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail("Use valid YYYY-MM-DD report dates.");
      return Date.parse(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`);
    };
    const from = parse(filters.from);
    const to = parse(filters.to, true);
    if (from !== null && to !== null && from > to) fail("Start date must be before end date.");
    return [from, to];
  }
  const inRange = (date, [from, to]) => (from === null || Date.parse(date) >= from) && (to === null || Date.parse(date) <= to);
  function filterQueries(s, u, filters = {}) {
    const range = dateRange(filters);
    return s.queries.filter((q) => permitted(u, q) && inRange(q.created_at, range) && (!filters.status || filters.status === "ALL" || q.status === filters.status) && (!filters.priority || filters.priority === "ALL" || q.priority === filters.priority) && (!filters.channel || filters.channel === "ALL" || q.channel === filters.channel) && (!filters.department_id || same(q.department_id, filters.department_id)) && (!filters.assigned_to || same(q.assigned_to, filters.assigned_to)) && (!filters.search || `${q.subject} ${q.description} ${q.reference}`.toLowerCase().includes(String(filters.search).toLowerCase())));
  }
  function attachments(input = []) {
    if (!Array.isArray(input) || input.length > 3) fail("Attach at most 3 files.");
    let bytes = 0;
    return input.map((a) => {
      const name = requireText(a.name, "File name", 180).replace(/[\\/\x00-\x1f]/g, "_");
      const types = [
        "application/pdf",
        "text/plain",
        "image/png",
        "image/jpeg",
        "image/webp"
      ];
      if (!types.includes(a.type) || !Number.isInteger(a.size) || a.size < 1 || a.size > 2 * 1024 * 1024 || typeof a.dataUrl !== "string" || !a.dataUrl.startsWith(`data:${a.type};base64,`)) fail("Files must be PDF, text, PNG, JPEG or WebP, at most 2 MB each.");
      const encoded = a.dataUrl.split(",")[1];
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0 || encoded.length > Math.ceil(2 * 1024 * 1024 / 3) * 4) fail("Invalid or oversized attachment data.");
      const length = encoded.length / 4 * 3 - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
      if (length !== a.size) fail("Attachment size does not match its data.");
      bytes += length;
      if (bytes > 4 * 1024 * 1024) fail("Combined attachments must be at most 4 MB.");
      return {
        name,
        type: a.type,
        size: length,
        dataUrl: a.dataUrl
      };
    });
  }
  function analytics(s, u, filters = {}) {
    const qs = filterQueries(s, u, filters), all = s.queries.filter((q) => permitted(u, q));
    const resolved = qs.filter((q) => q.status === "RESOLVED");
    const progress = qs.filter((q) => q.status === "IN_PROGRESS").length;
    const escalated = qs.filter((q) => q.status === "ESCALATED").length;
    const closed = qs.filter((q) => q.status === "CLOSED").length;
    const open = qs.length - resolved.length - closed;
    const awaiting = open - progress - escalated;
    const volume = new Map();
    const bin = (date) => {
      const day = date.slice(0, 10);
      if (!volume.has(day)) volume.set(day, {
        day,
        queries: 0,
        resolved: 0
      });
      return volume.get(day);
    };
    qs.forEach((q) => bin(q.created_at).queries++);
    const range = dateRange(filters);
    all.filter((q) => q.resolved_at && inRange(q.resolved_at, range)).forEach((q) => bin(q.resolved_at).resolved++);
    const average = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const responses = qs.map((q) => {
      const response = q.messages.find((m) => m.role !== "STUDENT" && !m.auto_reply);
      return response ? (Date.parse(response.created_at) - Date.parse(q.created_at)) / 60000 : null;
    }).filter((x) => x !== null);
    const visibleUsers = s.users.filter((x) => u.role === "ADMIN" || same(x.id, u.id) || (u.role === "HOD" || isDepartmentStaff(u.role)) && same(x.department_id, u.department_id));
    return {
      queries: qs.map((q) => decorate(s, q)),
      total: qs.length,
      open,
      closed,
      in_progress: progress,
      resolved: resolved.length,
      escalated,
      resolution_rate: qs.length ? resolved.length / qs.length * 100 : 0,
      avg_resolution_hours: average(resolved.map((q) => (Date.parse(q.resolved_at) - Date.parse(q.created_at)) / 3600000)),
      avg_response_minutes: average(responses),
      registered_users: visibleUsers.filter((x) => x.approval_status === "APPROVED").length,
      active_departments: s.departments.filter((d) => d.is_active && (u.role === "ADMIN" || u.role === "STUDENT" || same(d.id, u.department_id))).length,
      pending_approvals: u.role === "ADMIN" ? s.users.filter((x) => x.approval_status === "PENDING").length : 0,
      volume: [...volume.values()].sort((a, b) => a.day.localeCompare(b.day)),
      statuses: [
        {
          name: "Open",
          value: awaiting,
          color: "#f6b452"
        },
        {
          name: "In progress",
          value: progress,
          color: "#4a70ed"
        },
        {
          name: "Resolved",
          value: resolved.length,
          color: "#10b981"
        },
        {
          name: "Escalated",
          value: escalated,
          color: "#f07878"
        },
        {
          name: "Closed",
          value: closed,
          color: "#94a3b8"
        }
      ],
      departmentsChart: s.departments.map((d) => ({
        name: d.name,
        value: qs.filter((q) => same(q.department_id, d.id)).length
      })).filter((d) => d.value),
      staffWorkload: s.users.filter((x) => STAFF_ROLES.includes(x.role) && (u.role === "ADMIN" || u.role === "INSTRUCTOR" && same(x.id, u.id) || (u.role === "HOD" || isDepartmentStaff(u.role)) && same(x.department_id, u.department_id))).map((x) => ({
        name: x.full_name,
        value: qs.filter((q) => same(q.assigned_to, x.id) && !["RESOLVED", "CLOSED"].includes(q.status)).length
      })),
      activities: qs.flatMap((q) => q.timeline.map((e) => ({
        id: e.id,
        text: e.label,
        detail: q.subject,
        time: e.created_at,
        initials: "CQ",
        color: "blue"
      }))).sort((a, b) => b.time.localeCompare(a.time)).slice(0, 12),
      routing: [{
        name: "Simulated AI",
        value: qs.filter((q) => q.classification.method === "Simulated AI").length
      }, {
        name: "Staff override",
        value: qs.filter((q) => q.classification.method === "Staff override").length
      }]
    };
  }
  const service = {
    clearSession: () => {
      sessionGeneration++;
      actorId = null;
    },
    login: (body) => {
      const generation = ++sessionGeneration;
      actorId = null;
      return run(async () => {
        if (generation !== sessionGeneration) fail("Sign in was interrupted. Please try again.", 401);
        const s = await load();
        if (generation !== sessionGeneration) fail("Sign in was interrupted. Please try again.", 401);
        const email = requireText(body.email, "Email", 254).toLowerCase();
        const u = s.users.find((u) => u.email.toLowerCase() === email);
        if (!u || typeof body.password !== "string" || await hash(body.password, u.credential.salt) !== u.credential.hash) fail("Email or password is incorrect.", 401);
        if (generation !== sessionGeneration) fail("Sign in was interrupted. Please try again.", 401);
        if (u.approval_status !== "APPROVED") fail(u.approval_status === "REJECTED" ? "Your registration was rejected. Contact the administrator." : "Your account is awaiting administrator approval.", 403);
        if (!u.is_active) fail("Your account is inactive. Contact the administrator.", 403);
        actorId = u.id;
        return {
          access_token: "local-demo-session",
          local_demo: true
        };
      });
    },
    logout: () => {
      service.clearSession();
      return run(async () => {});
    },
    signup: (body) => run(async () => {
      const s = await load();
      if (!roles.includes(body.requested_role)) fail("Choose a supported registration role.");
      const requestedDepartment = isDepartmentStaff(body.requested_role) ? s.departments.find(d => d.staff_role === body.requested_role && d.is_active) : null;
      if (isDepartmentStaff(body.requested_role) && !requestedDepartment) fail("Choose an active department; ask the Admin to reactivate your department.");
      const full_name = requireText(body.full_name, "Full name", 100);
      const email = requireText(body.email, "Email", 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Enter a valid email address.");
      if (s.users.some((u) => u.email.toLowerCase() === email)) fail("This email address is already registered.");
      if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 128) fail("Password must be 8 to 128 characters.");
      const salt = id();
      const u = {
        id: Math.max(...s.users.map((u) => u.id)) + 1,
        full_name,
        email,
        role: "STUDENT",
        requested_role: body.requested_role,
        department_id: requestedDepartment?.id ?? (body.requested_role === "ADMIN" ? null : 1),
        approval_status: "PENDING",
        is_active: false,
        created_at: s.now,
        credential: {
          salt,
          hash: await hash(body.password, salt),
          algorithm: "PBKDF2-SHA256",
          iterations: 100000
        }
      };
      s.users.push(u);
      s.users.filter((x) => x.role === "ADMIN").forEach((x) => notify(s, x.id, "Registration awaiting approval", `${full_name} requested ${u.requested_role}`));
      audit(s, u, "SIGNUP_PENDING", email, "User");
      save(s);
      return {
        message: "Registration saved locally. Sign in as the demo Admin to approve this account.",
        user: publicUser(u)
      };
    }),
    getMe: () => read(roles, (s, u) => publicUser(u)),
    updateMe: (body) => mutate(roles, (s, u) => {
      u.full_name = requireText(body.full_name, "Full name", 100);
      audit(s, u, "PROFILE_UPDATED", u.email, "User");
      return publicUser(u);
    }),
    getUsers: () => read(REPLY_ROLES, (s, u) => s.users.filter((x) => u.role === "ADMIN" || STAFF_ROLES.includes(x.role) && x.is_active && x.approval_status === "APPROVED" && same(x.department_id, u.department_id)).map(publicUser)),
    updateUser: (key, body) => mutate(["ADMIN"], (s, u) => {
      const target = s.users.find((x) => same(x.id, key));
      if (!target) fail("User not found.", 404);
      if (same(target.id, u.id) && body.is_active === false) fail("You cannot deactivate your own Admin account.");
      if (body.department_id !== undefined) {
        const selected = department(s, body.department_id, true);
        const fixedRole = target.approval_status === "PENDING" ? target.requested_role : target.role;
        if (isDepartmentStaff(fixedRole) && selected.staff_role !== fixedRole) fail("This staff role must stay in its matching department.");
        target.department_id = selected.id;
      }
      if (body.is_active !== undefined) {
        if (typeof body.is_active !== "boolean") fail("Active must be true or false.");
        if (body.is_active && target.approval_status !== "APPROVED") fail("Account approval is required before activation.");
        target.is_active = body.is_active;
      }
      audit(s, u, "USER_UPDATED", target.email, "User");
      return publicUser(target);
    }),
    getPendingUsers: () => read(["ADMIN"], (s) => s.users.filter((u) => u.approval_status === "PENDING").map(publicUser)),
    approveUser: (key) => mutate(["ADMIN"], (s, u) => {
      const t = s.users.find((x) => same(x.id, key));
      if (!t || t.approval_status !== "PENDING") fail("Choose a pending registration.");
      if (isDepartmentStaff(t.requested_role)) {
        const assigned = s.departments.find(d => d.staff_role === t.requested_role && d.is_active);
        if (!assigned) fail("Choose an active department; reactivate this staff department before approval.");
        t.department_id = assigned.id;
      } else if (t.requested_role === "ADMIN") t.department_id = null;
      t.approval_status = "APPROVED";
      t.role = t.requested_role;
      t.is_active = true;
      audit(s, u, "USER_APPROVED", t.email, "User");
      notify(s, t.id, "Registration approved", "You can now sign in to your local demo account.");
      return publicUser(t);
    }),
    rejectUser: (key) => mutate(["ADMIN"], (s, u) => {
      const t = s.users.find((x) => same(x.id, key));
      if (!t || t.approval_status !== "PENDING") fail("Choose a pending registration.");
      t.approval_status = "REJECTED";
      t.is_active = false;
      notify(s, t.id, "Registration rejected", "Your registration was rejected by the local demo administrator.");
      audit(s, u, "USER_REJECTED", t.email, "User");
      return publicUser(t);
    }),
    getDepartments: () => read(roles, (s) => s.departments),
    getDepartment: (key) => read(roles, (s) => department(s, key)),
    createDepartment: (body) => mutate(["ADMIN"], (s, u) => {
      const name = requireText(body.name, "Department name", 100), code = requireText(body.code, "Department code", 20).toUpperCase();
      if (s.departments.some((d) => d.code === code || d.name.toLowerCase() === name.toLowerCase())) fail("Department name or code already exists.");
      const d = {
        id: Math.max(...s.departments.map((d) => d.id)) + 1,
        name,
        code,
        description: typeof body.description === "string" ? body.description.trim().slice(0, 1000) : "",
        keywords: normalizeKeywords(body.keywords),
        is_active: true
      };
      s.departments.push(d);
      audit(s, u, "DEPARTMENT_CREATED", d.name, "Department");
      return d;
    }),
    updateDepartment: (key, body) => mutate(["ADMIN"], (s, u) => {
      const d = department(s, key);
      if (body.name !== undefined) d.name = requireText(body.name, "Department name", 100);
      if (body.code !== undefined) d.code = requireText(body.code, "Department code", 20).toUpperCase();
      if (s.departments.some((x) => x.id !== d.id && (x.code === d.code || x.name.toLowerCase() === d.name.toLowerCase()))) fail("Department name or code already exists.");
      if (body.description !== undefined) d.description = String(body.description).trim().slice(0, 1000);
      if (body.keywords !== undefined) d.keywords = normalizeKeywords(body.keywords);
      if (body.is_active !== undefined) {
        if (typeof body.is_active !== "boolean") fail("Active must be true or false.");
        d.is_active = body.is_active;
      }
      audit(s, u, "DEPARTMENT_UPDATED", d.name, "Department");
      return d;
    }),
    deactivateDepartment: (key) => service.updateDepartment(key, { is_active: false }),
    getQueries: (filters) => read(roles, (s, u) => filterQueries(s, u, filters).map((q) => decorate(s, q)), true),
    getQuery: (key) => read(roles, (s, u) => decorate(s, query(s, u, key)), true),
    createQuery: (body) => mutate(["STUDENT"], (s, u) => {
      const subject = requireText(body.subject, "Subject", 180), description = requireText(body.description, "Description", 5000);
      if (!channels.includes(body.channel)) fail("Choose Web, Email or WhatsApp.");
      const files = attachments(body.attachments);
      const text = `${subject} ${description}`.toLowerCase();
      const scored = s.departments.filter((d) => d.is_active).map((d) => ({
        d,
        hits: d.keywords.filter((k) => text.includes(k.toLowerCase())).length
      })).sort((a, b) => b.hits - a.hits || (a.hits ? Number(Boolean(b.d.staff_role)) - Number(Boolean(a.d.staff_role)) : 0));
      const d = body.department_id ? department(s, body.department_id, true) : scored[0]?.d;
      if (!d) fail("No active departments are available.");
      const candidates = s.users.filter((x) => STAFF_ROLES.includes(x.role) && same(x.department_id, d.id) && x.is_active && x.approval_status === "APPROVED").sort((a, b) => Number(b.role === d.staff_role) - Number(a.role === d.staff_role));
      const onLeave = (x) => {
        const l = s.leaves[x.id];
        return l?.enabled && inRange(s.now, dateRange(l));
      };
      const available = candidates.filter((x) => !onLeave(x));
      const staff = (available.length ? available : candidates)[0];
      const key = Math.max(0, ...s.queries.map((q) => q.id)) + 1;
      const q = {
        id: key,
        reference: `QRY-${String(key).padStart(4, "0")}`,
        subject,
        description,
        student_id: u.id,
        department_id: d.id,
        assigned_to: staff?.id ?? null,
        priority: /urgent|deadline|emergency|overdue/.test(text) ? "High" : /wifi|wi-fi|library/.test(text) ? "Low" : "Medium",
        channel: body.channel,
        status: "SUBMITTED",
        created_at: s.now,
        updated_at: s.now,
        resolved_at: null,
        classification: {
          intent: d.name,
          confidence: scored.find((x) => x.d.id === d.id)?.hits ? .92 : .6,
          method: "Simulated AI"
        },
        attachments: files,
        messages: [],
        timeline: [{
          id: id(),
          status: "SUBMITTED",
          label: `Submitted through ${body.channel} simulator`,
          created_at: s.now
        }],
        draft: ""
      };
      event(s, q, "CLASSIFYING", "Local simulated AI classified the query");
      event(s, q, staff ? "ASSIGNED" : "MANUAL_REVIEW", staff ? `Simulated AI routed to ${d.name}` : "Awaiting an available staff assignment");
      s.queries.unshift(q);
      notify(s, u.id, "Query submitted", q.subject, q.id);
      const recipients = new Set([staff?.id, ...candidates.filter(x => isDepartmentStaff(x.role)).map(x => x.id)]);
      recipients.forEach(userId => notify(s, userId, "New query assigned", q.subject, q.id));
      // Only the primary instructor's absence affects this routing decision.
      const absent = candidates[0] && onLeave(candidates[0]) ? candidates[0] : null;
      if (absent) {
        const l = s.leaves[absent.id];
        q.messages.push({
          id: id(),
          author: absent.full_name,
          role: "INSTRUCTOR",
          body: `Simulated auto-reply: ${l.message}${available.length ? " An available colleague has been assigned." : ""}`,
          created_at: s.now,
          simulated: true,
          auto_reply: true
        });
        notify(s, u.id, "Simulated leave auto-reply", l.message, q.id);
      }
      audit(s, u, "QUERY_CREATED", `${q.reference} routed by simulated AI; ${q.channel} delivery is simulated`, "Query");
      return decorate(s, q);
    }),
    updateQuery: (key, body) => mutate(REPLY_ROLES, (s, u) => {
      const q = query(s, u, key);
      if (!statuses.includes(body.status) || ["SUBMITTED", "CLASSIFYING"].includes(body.status)) fail("Choose a supported query status.");
      if (q.status === body.status) return decorate(s, q);
      if (body.status === "ESCALATED") escalate(s, q, u);
      else {
        event(s, q, body.status, `Status changed by ${u.full_name}`);
        if (body.status === "RESOLVED") q.resolved_at = s.now;
        else if (body.status !== "CLOSED") q.resolved_at = null;
        notify(s, q.student_id, "Query status updated", `${q.subject}: ${q.status}`, q.id);
        audit(s, u, "QUERY_STATUS_UPDATED", `${q.reference}: ${q.status}`, "Query");
      }
      return decorate(s, q);
    }),
    generateDraft: (key) => mutate(REPLY_ROLES, (s, u) => {
      const q = query(s, u, key);
      q.draft = `Simulated AI suggestion — please review before sending.\n\nHello ${s.users.find((x) => same(x.id, q.student_id))?.full_name || "Student"},\n\nThank you for contacting ${department(s, q.department_id).name} about “${q.subject}”. We have reviewed your request. Please provide any supporting information so our team can help.\n\nRegards,\n${u.full_name}`;
      audit(s, u, "DRAFT_GENERATED", q.reference, "Query");
      notify(s, u.id, "Simulated draft ready", `Review the suggested reply for ${q.subject}`, q.id);
      return { content: q.draft };
    }),
    getDrafts: (key) => read(REPLY_ROLES, (s, u) => ({ content: query(s, u, key).draft || "" })),
    saveDraft: (key, body) => mutate(REPLY_ROLES, (s, u) => {
      const q = query(s, u, key);
      q.draft = requireText(body.content, "Draft", 10000);
      audit(s, u, "DRAFT_SAVED", q.reference, "Query");
      return { content: q.draft };
    }),
    sendReply: (key, body) => mutate(REPLY_ROLES, (s, u) => {
      const q = query(s, u, key);
      const content = requireText(body.content, "Reply", 10000);
      q.messages.push({
        id: id(),
        author: u.full_name,
        role: u.role,
        body: content,
        created_at: s.now,
        simulated: true
      });
      event(s, q, body.resolve ? "RESOLVED" : "IN_PROGRESS", `Reply approved and sent by ${u.full_name} (simulated delivery)`);
      q.resolved_at = body.resolve ? s.now : null;
      q.draft = "";
      notify(s, q.student_id, "Staff replied to your query", q.subject, q.id);
      audit(s, u, "REPLY_SENT", `${q.reference}: ${q.channel} delivery simulated`, "Query");
      return decorate(s, q);
    }),
    escalateQuery: (key) => mutate(REPLY_ROLES, (s, u) => {
      const q = query(s, u, key);
      escalate(s, q, u);
      return decorate(s, q);
    }),
    reassignQuery: (key, body) => mutate(["HOD", "ADMIN"], (s, u) => {
      const q = query(s, u, key);
      const d = department(s, body.department_id, true);
      if (u.role === "HOD" && !same(d.id, u.department_id)) fail("HOD reassignment must stay in your own department.", 403);
      const staff = s.users.find((x) => same(x.id, body.assigned_to) && STAFF_ROLES.includes(x.role) && x.is_active && x.approval_status === "APPROVED" && same(x.department_id, d.id));
      if (!staff) fail("Choose active approved staff in this department.");
      q.department_id = d.id;
      q.assigned_to = staff.id;
      q.classification = {
        intent: d.name,
        confidence: 1,
        method: "Staff override"
      };
      q.resolved_at = null;
      event(s, q, "ASSIGNED", `Reassigned to ${staff.full_name} by ${u.full_name}`);
      notify(s, staff.id, "Query reassigned", q.subject, q.id);
      notify(s, q.student_id, "Query reassigned", q.subject, q.id);
      audit(s, u, "QUERY_REASSIGNED", `${q.reference} → ${staff.full_name}`, "Query");
      return decorate(s, q);
    }),
    getNotifications: () => read(roles, (s, u) => s.notifications.filter((n) => same(n.user_id, u.id)).map(({ user_id, ...n }) => ({
      ...n,
      query_id: n.query_id && s.queries.some((q) => same(q.id, n.query_id) && permitted(u, q)) ? n.query_id : null
    }))),
    markRead: (key, value = true) => mutate(roles, (s, u) => {
      const n = s.notifications.find((n) => same(n.id, key) && same(n.user_id, u.id));
      if (!n) fail("Notification not found.", 404);
      if (typeof value !== "boolean") fail("Read state must be true or false.");
      n.read = value;
      const { user_id, ...safe } = n;
      return safe;
    }),
    markAllRead: () => mutate(roles, (s, u) => {
      s.notifications.filter((n) => same(n.user_id, u.id)).forEach((n) => n.read = true);
      return { success: true };
    }),
    getOverview: (filters) => read(roles, (s, u) => analytics(s, u, filters), true),
    getReports: (filters) => read(roles, (s, u) => analytics(s, u, filters), true),
    getAnnouncements: () => read(roles, (s, u) => s.announcements.filter((a) => u.role === "ADMIN" || a.audience === "ALL" || same(a.audience, u.department_id))),
    publishAnnouncement: (body) => mutate(["ADMIN"], (s, u) => {
      const title = requireText(body.title, "Title", 180), content = requireText(body.content, "Announcement", 5000);
      const audience = body.audience === "ALL" ? "ALL" : department(s, body.audience, true).id;
      if (!Array.isArray(body.channels) || !body.channels.length || body.channels.some((c) => ![
        "In-app",
        "Email",
        "WhatsApp"
      ].includes(c))) fail("Choose valid announcement channels.");
      const a = {
        id: id(),
        title,
        content,
        audience,
        channels: [...new Set(body.channels)],
        created_at: s.now,
        author: u.full_name
      };
      s.announcements.unshift(a);
      const targets = s.users.filter((x) => x.role === "STUDENT" && x.is_active && x.approval_status === "APPROVED" && (audience === "ALL" || same(x.department_id, audience)));
      if (a.channels.includes("In-app")) targets.forEach((x) => notify(s, x.id, title, content));
      audit(s, u, "ANNOUNCEMENT_PUBLISHED", `${title}; ${targets.length} targeted students; ${a.channels.filter((c) => c !== "In-app").join(", ") || "no external"} delivery simulated`, "Announcement");
      return a;
    }),
    getLeave: () => read(["INSTRUCTOR"], (s, u) => s.leaves[u.id] || {
      enabled: false,
      from: "",
      to: "",
      message: ""
    }),
    saveLeave: (body) => mutate(["INSTRUCTOR"], (s, u) => {
      if (typeof body.enabled !== "boolean") fail("Leave enabled must be true or false.");
      if (body.enabled) {
        if (!body.from || !body.to) fail("Choose leave start and end dates.");
        dateRange(body);
        requireText(body.message, "Auto-reply message", 1000);
      }
      const leave = {
        enabled: body.enabled,
        from: body.from || "",
        to: body.to || "",
        message: typeof body.message === "string" ? body.message.trim().slice(0, 1000) : ""
      };
      s.leaves[u.id] = leave;
      audit(s, u, "LEAVE_UPDATED", leave.enabled ? `${leave.from} to ${leave.to}` : "Leave disabled", "Leave");
      return leave;
    }),
    getAuditLogs: () => read(["ADMIN"], (s) => s.audit),
    getDemoInfo: () => run(async () => ({ now: (await load()).now })),
    advanceClock: (hours = 24) => mutate(["ADMIN"], (s, u) => {
      if (!Number.isFinite(hours) || hours <= 0 || hours > 8760) fail("Advance by 1 to 8760 hours.");
      s.clockOffset += hours * 3600000;
      s.now = new Date(now() + s.clockOffset).toISOString();
      sweep(s);
      audit(s, u, "DEMO_CLOCK_ADVANCED", `${hours} hours`);
      return { now: s.now };
    }),
    resetDemo: () => {
      const currentSession = requestingSession();
      return run(async () => {
        currentSession();
        try {
          persistence().removeItem(DEMO_KEY);
        } catch {
          fail("Unable to reset local demo storage.", 507);
        }
        service.clearSession();
        return { success: true };
      });
    }
  };
  return service;
}
function validateRecords(state) {
  const damaged = () => fail("Local demo records are damaged. Reset demo data to continue.");
  const timestamp = (value) => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  if (!timestamp(state.now)) damaged();
  if (state.users.some((u) => !u || u.id == null || !roles.includes(u.role) || typeof u.full_name !== "string" || typeof u.email !== "string" || typeof u.is_active !== "boolean" || ![
    "PENDING",
    "APPROVED",
    "REJECTED"
  ].includes(u.approval_status) || !roles.includes(u.requested_role) || typeof u.credential?.salt !== "string" || typeof u.credential?.hash !== "string" || !/^[a-f0-9]{64}$/.test(u.credential.hash))) damaged();
  if (new Set(state.users.map((u) => String(u.id))).size !== state.users.length) damaged();
  if (state.departments.some((d) => !d || d.id == null || typeof d.name !== "string" || typeof d.is_active !== "boolean" || !Array.isArray(d.keywords) || d.keywords.some((k) => typeof k !== "string"))) damaged();
  if (state.queries.some((q) => !q || q.id == null || typeof q.subject !== "string" || !statuses.includes(q.status) || !timestamp(q.created_at) || !timestamp(q.updated_at) || Date.parse(q.updated_at) < Date.parse(q.created_at) || (q.resolved_at != null && (!timestamp(q.resolved_at) || Date.parse(q.resolved_at) < Date.parse(q.created_at))) || (q.status === "RESOLVED" && q.resolved_at == null) || !Array.isArray(q.messages) || !Array.isArray(q.timeline) || !Array.isArray(q.attachments) || !q.classification || q.messages.some((m) => !m || typeof m.body !== "string" || !timestamp(m.created_at) || Date.parse(m.created_at) < Date.parse(q.created_at)) || q.timeline.some((e) => !e || typeof e.status !== "string" || !timestamp(e.created_at)))) damaged();
  if (state.notifications.some((n) => !n || n.id == null || typeof n.title !== "string" || typeof n.read !== "boolean") || state.announcements.some((a) => !a || !Array.isArray(a.channels) || typeof a.title !== "string") || state.audit.some((a) => !a || typeof a.action !== "string")) damaged();
}
function normalizeKeywords(value = []) {
  const list = typeof value === "string" ? value.split(",") : value;
  if (!Array.isArray(list) || list.length > 30 || list.some((k) => typeof k !== "string" || k.length > 80)) fail("Keywords must be a list of at most 30 short phrases.");
  return [...new Set(list.map((k) => k.trim()).filter(Boolean))];
}
let singleton;
// Importing facades for public preview does not initialize or read storage.
export const mockService = new Proxy({}, { get: (_, key) => (...args) => {
  singleton ||= createMockService();
  if (typeof singleton[key] !== "function") throw new Error(`Unknown mock operation ${String(key)}`);
  return singleton[key](...args);
} });
