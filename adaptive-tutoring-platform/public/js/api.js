/**
 * Tiny API client used by every page.
 *
 * Stores the session token in localStorage so a refresh keeps the user
 * signed in. Wraps fetch with consistent error handling and JSON parsing.
 */
window.API = (function () {
  const TOKEN_KEY = 'btp_token';
  const USER_KEY = 'btp_user';

  function token() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }
  function user() { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } }
  function setUser(u) { u ? localStorage.setItem(USER_KEY, JSON.stringify(u)) : localStorage.removeItem(USER_KEY); }

  async function request(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token()) headers['x-session-token'] = token();
    const res = await fetch(path, { ...opts, headers, body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body });
    const ct = res.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) throw Object.assign(new Error(data.error || res.statusText), { status: res.status, body: data });
    return data;
  }

  return {
    token, setToken, user, setUser,
    login: (creds) => request('/api/auth/login', { method: 'POST', body: creds }),
    logout: () => request('/api/auth/logout', { method: 'POST' }),
    me: () => request('/api/auth/me'),
    students: () => request('/api/students'),
    student: (id) => request(`/api/students/${id}`),
    createStudent: (body) => request('/api/students', { method: 'POST', body }),
    updateStudent: (id, body) => request(`/api/students/${id}`, { method: 'PATCH', body }),
    progress: (id) => request(`/api/progress/${id}`),
    nextLesson: (subject) => request(`/api/lessons/next${subject ? `?subject=${subject}` : ''}`),
    submitAttempt: (body) => request('/api/lessons/attempt', { method: 'POST', body }),
    curriculum: () => request('/api/curriculum'),
    outcomes: (subject, year) => request(`/api/curriculum/${subject}/${year}`),
    adminOverview: () => request('/api/admin/overview'),
    studentReportCsvUrl: (id) => `/api/admin/student/${id}/report.csv`,
    baseline: (id) => request(`/api/baseline/${id}`),
    submitBaseline: (id, answers) => request(`/api/baseline/${id}`, { method: 'POST', body: { answers } }),
  };
})();
