async function req(method, url, body, isForm) {
  const opts = { method, headers: {} };
  if (body && isForm) {
    opts.body = body; // FormData
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (u) => req('GET', u),
  post: (u, b) => req('POST', u, b),
  put: (u, b) => req('PUT', u, b),
  del: (u) => req('DELETE', u),
  upload: (u, formData) => req('POST', u, formData, true),

  // domain helpers
  meta: () => req('GET', '/api/meta'),
  settings: () => req('GET', '/api/settings'),
  saveSettings: (b) => req('PUT', '/api/settings', b),

  brands: () => req('GET', '/api/brands'),
  brand: (id) => req('GET', `/api/brands/${id}`),
  createBrand: (b) => req('POST', '/api/brands', b),
  updateBrand: (id, b) => req('PUT', `/api/brands/${id}`, b),
  deleteBrand: (id) => req('DELETE', `/api/brands/${id}`),

  posts: (q = '') => req('GET', `/api/posts${q}`),
  board: (q = '') => req('GET', `/api/posts/board${q}`),
  calendar: (q = '') => req('GET', `/api/posts/calendar${q}`),
  post: (id) => req('GET', `/api/posts/${id}`),
  createPost: (b) => req('POST', '/api/posts', b),
  updatePost: (id, b) => req('PUT', `/api/posts/${id}`, b),
  deletePost: (id) => req('DELETE', `/api/posts/${id}`),
  addVariant: (id, b) => req('POST', `/api/posts/${id}/variants`, b),
  updateVariant: (id, vid, b) => req('PUT', `/api/posts/${id}/variants/${vid}`, b),
  deleteVariant: (id, vid) => req('DELETE', `/api/posts/${id}/variants/${vid}`),

  tasks: (q = '') => req('GET', `/api/tasks${q}`),
  createTask: (b) => req('POST', '/api/tasks', b),
  updateTask: (id, b) => req('PUT', `/api/tasks/${id}`, b),
  deleteTask: (id) => req('DELETE', `/api/tasks/${id}`),

  genStatus: () => req('GET', '/api/generate/status'),
  genCopy: (b) => req('POST', '/api/generate/copy', b),
  genImage: (b) => req('POST', '/api/generate/image', b),
};
