/**
 * Lesson player.
 *
 * Renders one item at a time, captures the answer, posts it to the server,
 * shows feedback (the WHY, not just right/wrong) and advances to the next item.
 *
 * Public API:
 *   LessonPlayer.start(plan, opts) -> Promise<{ stats }>
 */

window.LessonPlayer = (function () {
  function $(id) { return document.getElementById(id); }

  // ── Voice selection ───────────────────────────────────────────────────
  // Browsers load the voice list asynchronously. We pick once it's ready,
  // preferring an Australian female voice with sensible fallbacks.
  let cachedVoice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const tiers = [
      // 1. Named Australian female voices on common platforms
      (v) => /en[-_]AU/i.test(v.lang) && /(Catherine|Karen|Olivia|Tina|Jenny|Kylie|Nicole|Joanna|Lee|Female)/i.test(v.name),
      // 2. Any Australian voice
      (v) => /en[-_]AU/i.test(v.lang),
      // 3. British female (closer accent than US)
      (v) => /en[-_]GB/i.test(v.lang) && /(Sonia|Kate|Hazel|Susan|Libby|Female|Amy|Emma)/i.test(v.name),
      // 4. Any British voice
      (v) => /en[-_]GB/i.test(v.lang),
      // 5. Generic English female
      (v) => /^en/i.test(v.lang) && /(Samantha|Aria|Jenny|Female|Allison|Ava|Susan|Zira)/i.test(v.name),
      // 6. Anything English
      (v) => /^en/i.test(v.lang),
    ];
    for (const test of tiers) {
      const v = voices.find(test);
      if (v) return v;
    }
    return voices[0];
  }
  function refreshVoice() { cachedVoice = pickVoice(); }
  if ('speechSynthesis' in window) {
    refreshVoice();
    // Voices populate asynchronously on most browsers.
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoice);
  }

  function cleanForSpeech(text) {
    return String(text)
      // Replace underscored gaps with the spoken word "blank"
      .replace(/_{2,}/g, ' blank ')
      // Strip emoji glyphs - they read as nonsense
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, ' ')
      // Tidy whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  function speak(text, mute) {
    if (mute) return;
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
      const v = cachedVoice || pickVoice();
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else {
        u.lang = 'en-AU';
      }
      u.rate = 0.92;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function start(plan, opts) {
    return new Promise((resolve) => {
      const settings = opts || {};
      let i = 0;
      let correctCount = 0;
      const stats = { items: plan.items.length, correct: 0, attempts: [] };
      const total = plan.items.length;
      const startedAt = Date.now();
      let itemStartedAt = Date.now();

      $('lesson').hidden = false;
      $('dashboard').hidden = true;
      $('lesson-title').textContent = (plan.subject === 'mathematics' ? '🧮 ' : '📖 ') + (titleFor(plan) || 'Lesson');
      updateBar();

      // Teach phase
      if (plan.teach) {
        showTeach(plan.teach);
      } else {
        nextItem();
      }

      function showTeach(t) {
        $('phase-teach').hidden = false;
        $('phase-item').hidden = true;
        $('phase-done').hidden = true;
        $('teach-intro').textContent = t.intro || 'Let\'s learn!';
        const ex = $('teach-examples');
        ex.innerHTML = '';
        (t.examples || []).forEach((e) => {
          const div = document.createElement('div');
          div.className = 'example';
          div.innerHTML = `<div class="show">${e.show}</div><div class="label">${e.label}</div>`;
          ex.appendChild(div);
        });
        if (settings.readAloud) speak(t.intro, settings.muteSpeech);
        $('teach-replay').onclick = () => speak(`${t.intro}. ${(t.examples || []).map((e) => e.label).join('. ')}`, settings.muteSpeech);
        $('teach-next').onclick = () => { $('phase-teach').hidden = true; nextItem(); };
      }

      function nextItem() {
        if (i >= total) return finish();
        const it = plan.items[i];
        itemStartedAt = Date.now();
        $('phase-item').hidden = false;
        $('feedback').hidden = true;
        $('feedback').classList.remove('good', 'bad');
        $('item-prompt').textContent = it.prompt;
        if (settings.readAloud) speak(it.prompt, settings.muteSpeech);

        if (it.isInterleaved) {
          $('lesson-title').textContent = '🔁 Quick mix-up!';
        } else {
          $('lesson-title').textContent = (plan.subject === 'mathematics' ? '🧮 ' : '📖 ') + titleFor(plan);
        }

        renderInput(it, (given) => handleAnswer(it, given));
      }

      function renderInput(it, onSubmit) {
        const root = $('item-input');
        root.innerHTML = '';
        if (it.type === 'multiple-choice' || it.type === 'blend') {
          it.options.forEach((opt) => {
            const b = document.createElement('button');
            b.className = 'choice';
            b.textContent = opt;
            b.onclick = () => { lockChoices(b, opt, it.answer); onSubmit(opt); };
            root.appendChild(b);
          });
        } else if (it.type === 'numeric') {
          const wrap = document.createElement('form');
          wrap.onsubmit = (e) => { e.preventDefault(); const v = Number(input.value); onSubmit(v); };
          const input = document.createElement('input');
          input.className = 'numeric-input';
          input.type = 'number';
          input.inputMode = 'numeric';
          input.autofocus = true;
          input.placeholder = '?';
          wrap.appendChild(input);
          const btn = document.createElement('button');
          btn.className = 'primary';
          btn.type = 'submit';
          btn.textContent = 'Check';
          wrap.appendChild(btn);
          root.appendChild(wrap);
          setTimeout(() => input.focus(), 30);
        } else if (it.type === 'tap-count') {
          const area = document.createElement('div');
          area.className = 'tap-area';
          let tapped = 0;
          for (let k = 0; k < it.count; k++) {
            const d = document.createElement('button');
            d.className = 'tap-dot';
            d.textContent = '●';
            d.setAttribute('aria-label', 'dot');
            d.onclick = () => { if (d.classList.contains('tapped')) return; d.classList.add('tapped'); d.textContent = String(++tapped); };
            area.appendChild(d);
          }
          root.appendChild(area);
          const wrap = document.createElement('form');
          wrap.onsubmit = (e) => { e.preventDefault(); onSubmit(Number(inp.value)); };
          const inp = document.createElement('input');
          inp.className = 'numeric-input';
          inp.type = 'number';
          inp.placeholder = 'How many?';
          wrap.appendChild(inp);
          const btn = document.createElement('button');
          btn.className = 'primary';
          btn.type = 'submit';
          btn.textContent = 'Check';
          wrap.appendChild(btn);
          root.appendChild(wrap);
        } else if (it.type === 'order') {
          const list = document.createElement('div');
          list.className = 'order-list';
          const pool = [...it.items];
          shuffle(pool);
          pool.forEach((val) => {
            const p = document.createElement('div');
            p.className = 'order-pill';
            p.textContent = val;
            p.draggable = true;
            p.dataset.val = String(val);
            p.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', String(val)); e.dataTransfer.effectAllowed = 'move'; });
            p.addEventListener('dragover', (e) => e.preventDefault());
            p.addEventListener('drop', (e) => {
              e.preventDefault();
              const from = e.dataTransfer.getData('text/plain');
              const fromEl = list.querySelector(`[data-val="${CSS.escape(from)}"]`);
              if (fromEl && fromEl !== p) list.insertBefore(fromEl, p);
            });
            p.onclick = () => { // tap-to-swap fallback for touch
              const all = [...list.children];
              const idx = all.indexOf(p);
              if (idx > 0) list.insertBefore(p, all[idx - 1]);
            };
            list.appendChild(p);
          });
          root.appendChild(list);
          const btn = document.createElement('button');
          btn.className = 'primary';
          btn.textContent = 'Check';
          btn.onclick = () => {
            const arranged = [...list.children].map((c) => Number(c.dataset.val));
            onSubmit(arranged);
          };
          root.appendChild(btn);
        } else if (it.type === 'sentence-build') {
          const list = document.createElement('div');
          list.className = 'order-list';
          const pool = [...it.words];
          shuffle(pool);
          pool.forEach((w) => {
            const p = document.createElement('div');
            p.className = 'order-pill';
            p.textContent = w;
            p.draggable = true;
            p.dataset.val = w;
            p.onclick = () => {
              const all = [...list.children];
              const idx = all.indexOf(p);
              if (idx > 0) list.insertBefore(p, all[idx - 1]);
            };
            p.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', w));
            p.addEventListener('dragover', (e) => e.preventDefault());
            p.addEventListener('drop', (e) => {
              e.preventDefault();
              const from = e.dataTransfer.getData('text/plain');
              const fromEl = list.querySelector(`[data-val="${CSS.escape(from)}"]`);
              if (fromEl && fromEl !== p) list.insertBefore(fromEl, p);
            });
            list.appendChild(p);
          });
          root.appendChild(list);
          const btn = document.createElement('button');
          btn.className = 'primary';
          btn.textContent = 'Check';
          btn.onclick = () => onSubmit([...list.children].map((c) => c.dataset.val));
          root.appendChild(btn);
        } else if (it.type === 'true-false') {
          ['True', 'False'].forEach((label) => {
            const b = document.createElement('button');
            b.className = 'choice';
            b.textContent = label;
            b.onclick = () => onSubmit(label.toLowerCase() === 'true');
            root.appendChild(b);
          });
        }
      }

      function lockChoices(picked, given, expected) {
        document.querySelectorAll('.choice').forEach((el) => { el.disabled = true; });
        if (String(given) === String(expected)) picked.classList.add('correct');
        else {
          picked.classList.add('wrong');
          document.querySelectorAll('.choice').forEach((el) => { if (el.textContent === String(expected)) el.classList.add('correct'); });
        }
      }

      async function handleAnswer(it, given) {
        const correct = isCorrect(it, given);
        if (correct) correctCount += 1;
        stats.attempts.push({ correct, prompt: it.prompt });
        const mode = i < (plan.items.length - 1) ? 'practice' : 'retrieval';
        const fb = await API.submitAttempt({
          unitId: it.unitId || plan.unitId,
          outcomeCode: it.outcomeCode || plan.outcomeCode,
          correct,
          prompt: it.prompt,
          given,
          expected: it.answer,
          mode,
          durationMs: Date.now() - itemStartedAt,
        }).catch(() => ({ correct, explain: it.explain }));
        showFeedback(correct, fb.explain || it.explain || '', fb);
      }

      function showFeedback(correct, explain, fb) {
        const node = $('feedback');
        node.hidden = false;
        node.classList.toggle('good', correct);
        node.classList.toggle('bad', !correct);
        $('feedback-icon').textContent = correct ? '🎉' : '🤔';
        const lead = correct ? 'You got it!' : 'Not quite.';
        $('feedback-text').textContent = `${lead} ${explain}`;
        if (settings.readAloud) speak(`${lead}. ${explain}`, settings.muteSpeech);
        $('feedback-next').onclick = () => {
          i += 1; updateBar(); nextItem();
        };
        if (fb && fb.badgesNew && fb.badgesNew.length) {
          const t = document.createElement('div');
          t.className = 'badge pulse';
          t.textContent = `🏅 ${fb.badgesNew.map((b) => b.name).join(', ')}`;
          node.appendChild(t);
        }
      }

      function updateBar() {
        const pct = Math.round((i / total) * 100);
        $('lesson-bar').style.width = pct + '%';
      }

      function finish() {
        stats.correct = correctCount;
        $('phase-item').hidden = true;
        $('phase-done').hidden = false;
        const acc = Math.round((correctCount / total) * 100);
        $('done-summary').textContent = `You answered ${correctCount} of ${total} (${acc}%). Lesson took ${Math.round((Date.now() - startedAt) / 1000)} seconds.`;
        if (settings.readAloud) speak('You did it. Great work today.', settings.muteSpeech);
        $('done-again').onclick = () => resolve({ done: 'again', stats });
        $('done-home').onclick = () => resolve({ done: 'home', stats });
      }
    });
  }

  function isCorrect(it, given) {
    if (it.type === 'numeric') return Number(given) === Number(it.answer);
    if (it.type === 'multiple-choice' || it.type === 'blend') return String(given).trim().toLowerCase() === String(it.answer).trim().toLowerCase();
    if (it.type === 'tap-count') return Number(given) === Number(it.answer);
    if (it.type === 'order') return Array.isArray(given) && given.length === it.answer.length && given.every((v, idx) => Number(v) === Number(it.answer[idx]));
    if (it.type === 'sentence-build') return Array.isArray(given) && given.join(' ') === it.answer.join(' ');
    if (it.type === 'true-false') return Boolean(given) === Boolean(it.answer);
    return false;
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function titleFor(plan) {
    return plan.unitTitle || (plan.outcomeCode ? `Outcome ${plan.outcomeCode}` : 'Lesson');
  }

  return { start };
})();
