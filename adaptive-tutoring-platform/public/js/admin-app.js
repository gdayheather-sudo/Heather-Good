(function () {
  if (!API.token() || API.user()?.role !== 'admin') { window.location.href = '/'; return; }

  document.getElementById('logout').onclick = async () => { await API.logout().catch(() => {}); API.setToken(null); API.setUser(null); window.location.href = '/'; };

  init();

  async function init() {
    const data = await API.adminOverview();
    document.getElementById('k-students').textContent = data.totals.students;
    document.getElementById('k-attempts').textContent = data.totals.attemptsThisOrg;
    document.getElementById('k-acc').textContent = Math.round((data.totals.avgAccuracy || 0) * 100) + '%';
    renderRows(data.students);

    document.getElementById('filter').oninput = (e) => {
      const q = e.target.value.toLowerCase();
      renderRows(data.students.filter((s) => s.name.toLowerCase().includes(q)));
    };

    document.getElementById('export-all').onclick = async () => {
      // Concatenate per-student CSVs into a single file.
      const parts = [];
      for (const s of data.students) {
        const res = await fetch(API.studentReportCsvUrl(s.id), { headers: { 'x-session-token': API.token() } });
        parts.push(await res.text());
        parts.push('\n');
      }
      const blob = new Blob(parts, { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `org-report-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    };

    // We don't have an audit endpoint; fall back to client-rendered placeholder.
    const audit = document.getElementById('audit');
    audit.innerHTML = '<li class="muted">Audit log entries appear here as mentors and admins make changes.</li>';
  }

  function renderRows(students) {
    const tbody = document.getElementById('rows');
    tbody.innerHTML = '';
    students.forEach((s) => {
      const tr = document.createElement('tr');
      const last = s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleString() : '—';
      const dl = document.createElement('button');
      dl.className = 'btn ghost';
      dl.textContent = 'CSV';
      dl.onclick = async () => {
        const res = await fetch(API.studentReportCsvUrl(s.id), { headers: { 'x-session-token': API.token() } });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `student-${s.id}.csv`; a.click();
        URL.revokeObjectURL(url);
      };
      tr.innerHTML = `<td>${escape(s.name)}</td><td>${s.yearLevel}</td><td>${(s.level.mathematics||1).toFixed(2)}</td><td>${(s.level.english||1).toFixed(2)}</td><td>${s.attempts}</td><td>${Math.round((s.accuracy||0)*100)}%</td><td>${last}</td><td>${s.streakDays || 0}</td>`;
      const td = document.createElement('td');
      td.appendChild(dl);
      tr.appendChild(td);
      tbody.appendChild(tr);
    });
  }

  function escape(s) { return String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])); }
})();
