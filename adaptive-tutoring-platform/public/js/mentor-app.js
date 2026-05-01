(function () {
  if (!API.token() || !['mentor', 'admin'].includes(API.user()?.role)) { window.location.href = '/'; return; }

  if (API.user().role === 'admin') document.getElementById('admin-link').hidden = false;

  document.getElementById('logout').onclick = async () => {
    await API.logout().catch(() => {}); API.setToken(null); API.setUser(null); window.location.href = '/';
  };

  let currentId = null;
  init();

  async function init() {
    const { students } = await API.students();
    renderList(students);
    if (students.length) selectStudent(students[0].id);
  }

  function renderList(students) {
    const ul = document.getElementById('student-list');
    ul.innerHTML = '';
    students.forEach((s) => {
      const li = document.createElement('li');
      li.dataset.id = s.id;
      li.innerHTML = `<span><strong>${escape(s.name)}</strong><div class="meta">Year ${s.yearLevel} · M ${s.level.mathematics?.toFixed(1)} · E ${s.level.english?.toFixed(1)}</div></span><span aria-hidden="true">›</span>`;
      li.onclick = () => selectStudent(s.id);
      if (s.id === currentId) li.classList.add('active');
      ul.appendChild(li);
    });
  }

  async function selectStudent(id) {
    currentId = id;
    [...document.querySelectorAll('.student-list li')].forEach((li) => li.classList.toggle('active', li.dataset.id === id));
    document.getElementById('empty').hidden = true;
    document.getElementById('detail').hidden = false;

    const summary = await API.progress(id);
    const { student } = await API.student(id);
    renderDetail(summary, student);
  }

  function renderDetail(summary, s) {
    document.getElementById('d-name').textContent = s.name;
    document.getElementById('d-meta').textContent = `Year ${s.yearLevel} · ${s.interests?.join(', ') || 'no interests yet'}`;
    document.getElementById('d-maths').textContent = (s.level.mathematics || 1).toFixed(2);
    document.getElementById('d-english').textContent = (s.level.english || 1).toFixed(2);
    document.getElementById('d-streak').textContent = s.streakDays || 0;
    document.getElementById('d-attempts').textContent = summary.attempts || 0;
    document.getElementById('d-csv').href = API.studentReportCsvUrl(s.id) + `?t=${API.token()}`;
    // we use header for auth; embed token query for download convenience
    document.getElementById('d-csv').addEventListener('click', async (ev) => {
      ev.preventDefault();
      const res = await fetch(API.studentReportCsvUrl(s.id), { headers: { 'x-session-token': API.token() } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `student-${s.id}.csv`; a.click();
      URL.revokeObjectURL(url);
    }, { once: true });

    // Skill map
    const map = document.getElementById('skill-map');
    map.innerHTML = '';
    if (!summary.skillMap.length) map.innerHTML = '<p class="muted">No attempts yet.</p>';
    summary.skillMap.forEach((m) => {
      const tile = document.createElement('div');
      tile.className = `skill-tile ${m.status}`;
      tile.innerHTML = `<span class="code">${m.code}</span><span class="desc">${escape(m.desc || '')}</span><small class="muted">${m.seen} attempts · ${(m.accuracy * 100).toFixed(0)}%</small>`;
      map.appendChild(tile);
    });

    // Recommendations - tickable as focus
    const recs = document.getElementById('recs');
    recs.innerHTML = '';
    summary.recommended.forEach((r) => {
      const checked = (s.focus || []).includes(r.code) ? 'checked' : '';
      const li = document.createElement('li');
      li.innerHTML = `<input type="checkbox" data-code="${r.code}" ${checked} /> <span><strong>${r.code}</strong><div class="muted">${escape(r.desc || '')} · <em>${r.reason}</em></div></span>`;
      recs.appendChild(li);
    });
    recs.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.onchange = () => {
        const codes = [...recs.querySelectorAll('input[type=checkbox]:checked')].map((x) => x.dataset.code);
        API.updateStudent(s.id, { focus: codes });
      };
    });

    // Profile form
    document.getElementById('p-name').value = s.name || '';
    document.getElementById('p-year').value = String(s.yearLevel);
    document.getElementById('p-theme').value = s.theme || 'space';
    document.getElementById('p-interests').value = (s.interests || []).join(', ');
    document.getElementById('p-strengths').value = (s.strengths || []).join(', ');
    document.getElementById('p-challenges').value = (s.challenges || []).join(', ');
    document.getElementById('p-large').checked = !!s.sensory?.largeText;
    document.getElementById('p-contrast').checked = !!s.sensory?.highContrast;
    document.getElementById('p-motion').checked = !!s.sensory?.reduceMotion;
    document.getElementById('p-sound').checked = !!s.sensory?.reduceSound;

    document.getElementById('profile-form').onsubmit = async (e) => {
      e.preventDefault();
      const body = {
        name: document.getElementById('p-name').value,
        yearLevel: document.getElementById('p-year').value,
        theme: document.getElementById('p-theme').value,
        interests: document.getElementById('p-interests').value.split(',').map((x) => x.trim()).filter(Boolean),
        strengths: document.getElementById('p-strengths').value.split(',').map((x) => x.trim()).filter(Boolean),
        challenges: document.getElementById('p-challenges').value.split(',').map((x) => x.trim()).filter(Boolean),
        sensory: {
          largeText: document.getElementById('p-large').checked,
          highContrast: document.getElementById('p-contrast').checked,
          reduceMotion: document.getElementById('p-motion').checked,
          reduceSound: document.getElementById('p-sound').checked,
        },
      };
      await API.updateStudent(s.id, body);
      const { students } = await API.students();
      renderList(students);
      const updated = await API.student(s.id);
      const summary2 = await API.progress(s.id);
      renderDetail(summary2, updated.student);
    };

    // Time chart - last 14 days
    const chart = document.getElementById('time-chart');
    chart.innerHTML = '';
    const today = new Date();
    const minutes = summary.minutesByDay || {};
    const max = Math.max(1, ...Object.values(minutes));
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const m = minutes[key] || 0;
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = `${(m / max) * 100}%`;
      bar.title = `${key}: ${m.toFixed(1)} min`;
      chart.appendChild(bar);
    }
  }

  document.getElementById('add-student').onclick = () => {
    const dlg = document.getElementById('add-dialog');
    if (dlg.showModal) dlg.showModal();
  };
  document.getElementById('add-form').addEventListener('submit', async (e) => {
    if (e.submitter && e.submitter.value === 'cancel') return;
    e.preventDefault();
    const fd = new FormData(e.target);
    await API.createStudent({
      name: fd.get('name'),
      yearLevel: fd.get('yearLevel'),
      theme: fd.get('theme'),
    });
    document.getElementById('add-dialog').close();
    const { students } = await API.students();
    renderList(students);
  });

  function escape(s) { return String(s ?? '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])); }
})();
