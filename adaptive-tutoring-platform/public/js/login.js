(function () {
  const cards = document.querySelectorAll('.role-card');
  const formSection = document.querySelector('.login-form');
  const roleInput = document.getElementById('role');
  const errEl = document.getElementById('login-error');

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      cards.forEach((c) => c.setAttribute('aria-pressed', c === card ? 'true' : 'false'));
      roleInput.value = card.dataset.role;
      formSection.hidden = false;
      formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('username').focus();
    });
  });

  document.getElementById('login').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    errEl.hidden = true;
    const username = document.getElementById('username').value.trim();
    const pin = document.getElementById('pin').value.trim();
    const role = roleInput.value;
    try {
      const { token, user } = await API.login({ username, pin, role });
      API.setToken(token);
      API.setUser(user);
      const dest = role === 'student' ? '/student.html' : role === 'mentor' ? '/mentor.html' : '/admin.html';
      window.location.href = dest;
    } catch (err) {
      errEl.textContent = 'That username or PIN didn\'t match. Please try again.';
      errEl.hidden = false;
    }
  });

  // Pre-select role if stored
  const u = API.user();
  if (u && API.token()) {
    const dest = u.role === 'student' ? '/student.html' : u.role === 'mentor' ? '/mentor.html' : '/admin.html';
    window.location.href = dest;
  }
})();
