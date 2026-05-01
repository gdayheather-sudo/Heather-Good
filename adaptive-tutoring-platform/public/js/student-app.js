(function () {
  if (!API.token() || API.user()?.role !== 'student') { window.location.href = '/'; return; }

  const me = API.user();
  $('greet').textContent = `Hi ${me.name.split(' ')[0]}!`;

  const settings = loadSettings();
  applySettings(settings);

  init();

  async function init() {
    try {
      const summary = await API.progress(me.id);
      renderDashboard(summary);
    } catch (e) { /* show fallback */ }
  }

  function renderDashboard(summary) {
    $('streak').textContent = summary.student.streakDays || 0;
    $('points').textContent = summary.student.points || 0;
    $('lvl-maths').textContent = (summary.student.level.mathematics || 1).toFixed(1);
    $('lvl-eng').textContent = (summary.student.level.english || 1).toFixed(1);
    const cov = summary.coverage;
    const pct = cov.outcomesAvailable ? Math.round((cov.outcomesAttempted / cov.outcomesAvailable) * 100) : 0;
    $('journey-bar').style.width = pct + '%';
    $('journey-text').textContent = `${cov.mastered} mastered · ${cov.outcomesAttempted}/${cov.outcomesAvailable} explored`;
    const badges = $('badges');
    badges.innerHTML = '';
    (summary.student.badges || []).forEach((b) => {
      const t = document.createElement('span');
      t.className = 'badge';
      t.textContent = `🏅 ${b.name}`;
      badges.appendChild(t);
    });
    if ((summary.student.badges || []).length === 0) {
      badges.innerHTML = '<span class="muted">Earn your first badge by finishing a lesson.</span>';
    }
    // mascot picks based on theme
    const mascotByTheme = { space: '🚀', ocean: '🐠', dogs: '🐶', art: '🎨', default: '🌟' };
    $('mascot').textContent = mascotByTheme[settings.theme] || '🌟';
  }

  $('start-lesson').onclick = startLesson;
  $('lesson-back').onclick = goHome;
  $('logout').onclick = async () => { await API.logout().catch(() => {}); API.setToken(null); API.setUser(null); window.location.href = '/'; };

  $('settings-btn').onclick = () => { $('settings').hidden = false; bindSettings(); };
  $('settings-close').onclick = () => { $('settings').hidden = true; };

  $('read-aloud').onclick = () => {
    settings.readAloud = !settings.readAloud;
    $('read-aloud').setAttribute('aria-pressed', String(settings.readAloud));
    $('read-aloud').classList.toggle('primary', settings.readAloud);
    saveSettings(settings);
  };

  async function startLesson() {
    try {
      const plan = await API.nextLesson();
      if (plan.error) {
        $('hero-sub').textContent = 'No lessons available yet.'; return;
      }
      const result = await LessonPlayer.start(plan, settings);
      $('lesson').hidden = true;
      $('dashboard').hidden = false;
      const summary = await API.progress(me.id);
      renderDashboard(summary);
      if (result.done === 'again') startLesson();
    } catch (e) {
      console.error(e);
      $('hero-sub').textContent = 'Hit a snag - please try again in a moment.';
    }
  }

  function goHome() {
    $('lesson').hidden = true;
    $('dashboard').hidden = false;
    $('phase-teach').hidden = true;
    $('phase-item').hidden = true;
    $('phase-done').hidden = true;
  }

  // ── Settings ──────────────────────────────────────────────────────────
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem('btp_settings')) || defaults(); }
    catch { return defaults(); }
  }
  // Read-aloud is ON by default - early learners benefit from voice + text
  // every time. Auto-read fires on prompt entry, the per-prompt 🔊 button
  // gives "Read again" on demand. A learner who finds it overstimulating
  // can switch it off in Settings.
  function defaults() { return { theme: 'space', readAloud: true, largeText: false, highContrast: false, reduceMotion: false, muteSpeech: false }; }
  function saveSettings(s) { localStorage.setItem('btp_settings', JSON.stringify(s)); applySettings(s); }
  function applySettings(s) {
    document.body.classList.remove('theme-space', 'theme-ocean', 'theme-dogs', 'theme-art', 'theme-default');
    document.body.classList.add(`theme-${s.theme || 'space'}`);
    document.body.classList.toggle('acc-large-text', !!s.largeText);
    document.body.classList.toggle('acc-high-contrast', !!s.highContrast);
    document.body.classList.toggle('acc-reduce-motion', !!s.reduceMotion);
    if ($('read-aloud')) {
      $('read-aloud').setAttribute('aria-pressed', String(!!s.readAloud));
      $('read-aloud').classList.toggle('primary', !!s.readAloud);
    }
  }
  function bindSettings() {
    $('set-theme').value = settings.theme || 'space';
    $('set-large').checked = !!settings.largeText;
    $('set-contrast').checked = !!settings.highContrast;
    $('set-motion').checked = !!settings.reduceMotion;
    $('set-sound').checked = !!settings.muteSpeech;
    $('set-theme').onchange = () => { settings.theme = $('set-theme').value; saveSettings(settings); };
    $('set-large').onchange = () => { settings.largeText = $('set-large').checked; saveSettings(settings); };
    $('set-contrast').onchange = () => { settings.highContrast = $('set-contrast').checked; saveSettings(settings); };
    $('set-motion').onchange = () => { settings.reduceMotion = $('set-motion').checked; saveSettings(settings); };
    $('set-sound').onchange = () => { settings.muteSpeech = $('set-sound').checked; saveSettings(settings); };
  }

  function $(id) { return document.getElementById(id); }
})();
