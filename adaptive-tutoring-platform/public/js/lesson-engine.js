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

  // ── Feedback phrase pools ────────────────────────────────────────────
  // Calm, varied, age-appropriate. Picked at random per item so a learner
  // doesn't hear the same phrase twice in a row.
  const POSITIVE = [
    "You got it!", "Nice work!", "Yes!", "Spot on!", "Awesome!",
    "Great job!", "Well done!", "That's it!", "Brilliant!", "Perfect!",
    "Top effort!", "Beautiful!", "You're on fire!", "Lovely thinking!",
  ];
  const ENCOURAGING = [
    "Not quite.", "Close - have another look.", "Almost!",
    "Tricky one - let's see why.", "Good try - here's the trick.",
    "Nearly there.", "No worries - let's check.", "Keep going - here's why.",
  ];
  let lastPhrase = null;
  function pickPhrase(pool) {
    if (!pool || !pool.length) return '';
    let p = pool[Math.floor(Math.random() * pool.length)];
    if (p === lastPhrase && pool.length > 1) p = pool[(pool.indexOf(p) + 1) % pool.length];
    lastPhrase = p;
    return p;
  }

  // End-of-lesson summary - tone matches accuracy. Below ~50% the message
  // is supportive ("good try, more learning to do, we'll get there"); at
  // 50-79% it's positive but realistic; at 80%+ it's a celebration.
  function endOfLessonMessage(correct, total) {
    const pct = total ? correct / total : 0;
    if (pct >= 0.8) return { icon: '🎉', headline: 'You did it!',     body: `You got ${correct} out of ${total}. That's terrific work.` };
    if (pct >= 0.5) return { icon: '🌱', headline: 'Nice work!',      body: `You got ${correct} out of ${total}. You're growing every lesson.` };
    return                  { icon: '💪', headline: 'Good try!',      body: `You got ${correct} out of ${total}. We have a little more learning to do, but we will get there together.` };
  }

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

  // ── Cloud TTS (ElevenLabs, optional) ─────────────────────────────────
  // The server tells us at boot whether ElevenLabs is configured. If it
  // is, speak() routes through /api/tts which returns a cached MP3 in a
  // far better voice than the browser's built-in. We keep browser TTS as
  // the fallback when cloud isn't available or the request fails.
  let currentAudio = null;
  let cloudTtsAvailable = false;
  fetch('/api/config').then((r) => r.json()).then((cfg) => { cloudTtsAvailable = !!cfg.ttsCloud; }).catch(() => {});

  function cloudSpeak(text) {
    return new Promise((resolve, reject) => {
      try { window.speechSynthesis.cancel(); } catch {}
      if (currentAudio) { try { currentAudio.pause(); } catch {} }
      const url = `/api/tts?text=${encodeURIComponent(text)}`;
      const a = new Audio(url);
      currentAudio = a;
      a.onended = () => resolve();
      a.onerror = () => reject(new Error('cloud audio error'));
      a.play().catch(reject);
    });
  }

  // ── Phonetic preprocessor ────────────────────────────────────────────
  // TTS engines read "sh" as "ess aitch", "ch" as "see aitch", etc.
  // For phonics work that's wrong - we want the digraph SOUND. We rewrite
  // standalone phonic tokens to letter sequences that nudge the engine
  // toward the right phoneme. Content can also set a `say` field on a
  // teach example or item to bypass this entirely.
  const PHONIC_SAY = {
    sh: 'shh',  ch: 'chuh',  th: 'thh',  ph: 'fff',  wh: 'wuh',
    ng: 'ng',   ck: 'kuh',   qu: 'kwuh',
    a: 'aaa',   e: 'eh',     i: 'ih',    o: 'awe',   u: 'uh',
    b: 'buh',   c: 'kuh',    d: 'duh',   f: 'fff',   g: 'guh',
    h: 'huh',   j: 'juh',    k: 'kuh',   l: 'lll',   m: 'mmm',
    n: 'nnn',   p: 'puh',    r: 'ruh',   s: 'sss',   t: 'tuh',
    v: 'vvv',   w: 'wuh',    x: 'ks',    y: 'yuh',   z: 'zzz',
  };
  function phoneticise(text) {
    // The hyphen rewrite (c - a - t -> kuh, aaa, tuh) sounded robotic in
    // every voice we tried. Content authors should provide a `say` field
    // with natural language, or - better - an `audio` URL pointing at a
    // recorded human voice. We only keep two narrow rewrites here:
    //
    //  - quoted digraphs: "sh", "ch", "th" -> "shh"/"chuh"/"thh"
    //    (TTS otherwise spells these as "ess aitch" etc.)
    //  - bare digraph comma lists: "sh, ch, th" -> phonetic equivalents
    return String(text)
      .replace(/(["'])((?:sh|ch|th|ph|wh|ng|ck|qu))\1/gi, (_, q, tok) => PHONIC_SAY[tok.toLowerCase()])
      .replace(/\b((?:sh|ch|th|ph|wh|ng|ck|qu)(?:\s*,\s*(?:sh|ch|th|ph|wh|ng|ck|qu))+)\b/gi,
        (run) => run.split(/\s*,\s*/).map((t) => PHONIC_SAY[t.toLowerCase()]).join(', '));
  }

  // Maths preprocessor: TTS engines read "12 - 5" as the clock time
  // "twelve to five" because en-AU treats hyphenated numbers as durations.
  // Spell the operator out so a Year 1 learner hears "twelve take five
  // equals seven" instead. Only triggers when there are digits on both
  // sides so plain hyphenated text ("Year 1 - Maths") is untouched.
  function maths(text) {
    return String(text)
      .replace(/(\d+)\s*=\s*(\d+)/g, '$1 equals $2')
      .replace(/(\d+)\s*=\s*\?/g, '$1 equals what')
      .replace(/(\d+)\s*-\s*(\d+)/g, '$1 take $2')
      .replace(/(\d+)\s*\+\s*(\d+)/g, '$1 plus $2')
      .replace(/(\d+)\s*[×x*]\s*(\d+)/g, '$1 times $2')
      .replace(/(\d+)\s*[÷/]\s*(\d+)/g, '$1 divided by $2');
  }

  function cleanForSpeech(text) {
    return phoneticise(maths(String(text)))
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
    const cleaned = cleanForSpeech(text);
    // Prefer cloud TTS (ElevenLabs) when available - much better for
    // phonics work. Fall back to browser TTS on any failure.
    if (cloudTtsAvailable) {
      cloudSpeak(cleaned).catch(() => browserSpeak(cleaned));
      return;
    }
    browserSpeak(cleaned);
  }
  function browserSpeak(cleaned) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(cleaned);
      const v = cachedVoice || pickVoice();
      if (v) {
        u.voice = v;
        u.lang = v.lang;
      } else {
        u.lang = 'en-AU';
      }
      u.rate = 0.92;
      u.pitch = 1.0;
      // Spell out individual letters or digraphs slower so the phoneme is clear.
      if (cleaned.length <= 6) u.rate = 0.78;
      window.speechSynthesis.speak(u);
    } catch {}
  }

  // ── Speak / Record buttons ───────────────────────────────────────────
  // Play a recorded audio file (real human voice). Used when content
  // provides an `audio` URL - this is the gold standard for phonics
  // because synthetic voices can't produce true phonemes well.
  function playAudio(url) {
    try { window.speechSynthesis.cancel(); } catch {}
    if (currentAudio) { try { currentAudio.pause(); } catch {} }
    const a = new Audio(url);
    currentAudio = a;
    a.play().catch(() => {});
  }

  // Speak via recorded audio if provided, else fall back to TTS.
  function speakOrPlay(audioUrl, text, mute) {
    if (audioUrl) return playAudio(audioUrl);
    return speak(text, mute);
  }

  // Multi-utterance speaker. Each part is { text, rate?, pause? }. Used for
  // phonics blending: each sound is a separate utterance with explicit
  // gaps so the learner can hear segmentation clearly. The previous "all
  // in one comma-separated breath" approach sounded robotic.
  function speakSequence(parts, mute, opts) {
    if (mute) return;
    if (!('speechSynthesis' in window)) return;
    try { window.speechSynthesis.cancel(); } catch {}
    let i = 0;
    function step() {
      if (i >= parts.length) { opts && opts.onDone && opts.onDone(); return; }
      const p = parts[i];
      const u = new SpeechSynthesisUtterance(cleanForSpeech(p.text));
      const v = cachedVoice || pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'en-AU'; }
      u.rate = p.rate ?? 0.78;
      u.pitch = p.pitch ?? 1.0;
      u.onstart = () => { opts && opts.onPart && opts.onPart(i, p); };
      u.onend = () => {
        i += 1;
        setTimeout(step, p.pause ?? 350);
      };
      window.speechSynthesis.speak(u);
    }
    step();
  }

  // Derive ['d','o','g'] from a hyphenated show like 'd-o-g'.
  function parseSegments(show) {
    if (typeof show !== 'string') return null;
    if (!/^[a-z](?:-[a-z]){1,4}$/i.test(show.trim())) return null;
    return show.trim().toLowerCase().split('-');
  }

  // Sound out each segment, then say the whole word. The segment lookup
  // uses PHONIC_SAY so single letters become their best TTS approximation
  // ('d' -> 'duh', 'o' -> 'awe'). The word at the end is spoken naturally.
  function playBlend(segments, word, mute, opts) {
    const parts = segments.map((s) => ({
      text: PHONIC_SAY[s.toLowerCase()] || s,
      rate: 0.7,
      pause: 450,
    }));
    parts.push({ text: word, rate: 0.95, pause: 0 });
    speakSequence(parts, mute, opts);
  }

  // While the i-th part of a blend is being spoken, mark that letter on
  // screen so the learner sees the connection.
  function highlightSegments(host, idx, total) {
    if (!host) return;
    [...host.querySelectorAll('.seg')].forEach((el, k) => {
      el.classList.toggle('seg-active', k === idx);
      el.classList.toggle('seg-said', k < idx);
    });
    if (idx >= total) {
      [...host.querySelectorAll('.seg')].forEach((el) => el.classList.remove('seg-active'));
    }
  }

  // makeSpeakButton: a small 🔊 that re-reads a specific line.
  //   - audioUrl: play that recorded file (gold standard)
  //   - blend:   { segments, word, hostEl? } - sound out each segment as
  //              a separate TTS utterance, then say the word; if hostEl
  //              is provided, highlight each letter as it's spoken.
  function makeSpeakButton(text, audioUrl, blend) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini-btn speak-btn';
    b.title = blend ? 'Sound it out' : 'Read aloud';
    b.setAttribute('aria-label', b.title);
    b.innerHTML = `<span aria-hidden="true">🔊</span><span class="mini-label">${blend ? 'Sound out' : 'Listen'}</span>`;
    b.onclick = (ev) => {
      ev.preventDefault();
      if (audioUrl) return playAudio(audioUrl);
      if (blend) return playBlend(blend.segments, blend.word, false, { onPart: blend.onPart });
      speak(text, false);
    };
    return b;
  }

  // makeRecordButton: 🎤 records the student's voice for up to 8s and plays
  // it back so they can hear how they sounded out the word/sound. Audio is
  // held in a blob URL and discarded when the lesson moves on.
  function makeRecordButton() {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini-btn rec-btn';
    b.title = 'Record yourself';
    b.setAttribute('aria-label', 'Record yourself');
    b.innerHTML = '<span aria-hidden="true">🎤</span><span class="mini-label">Record</span>';
    let recorder = null;
    let stream = null;
    let chunks = [];
    let audioEl = null;
    let recTimer = null;
    let lastUrl = null;

    async function startRec() {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Recording isn\'t supported on this browser.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        alert('Please allow microphone access to record yourself.');
        return;
      }
      chunks = [];
      try { recorder = new MediaRecorder(stream); }
      catch { recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' }); }
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(blob);
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.controls = true;
          audioEl.className = 'rec-playback';
          b.parentElement?.appendChild(audioEl);
        }
        audioEl.src = lastUrl;
        audioEl.play().catch(() => {});
        b.classList.remove('recording');
        b.querySelector('.mini-label').textContent = 'Re-record';
      };
      recorder.start();
      b.classList.add('recording');
      b.querySelector('.mini-label').textContent = 'Stop';
      recTimer = setTimeout(stopRec, 8000);
    }
    function stopRec() {
      if (recTimer) { clearTimeout(recTimer); recTimer = null; }
      if (recorder && recorder.state === 'recording') recorder.stop();
    }
    b.onclick = (ev) => {
      ev.preventDefault();
      if (recorder && recorder.state === 'recording') stopRec();
      else startRec();
    };
    return b;
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

      function shouldShowRecord(it) {
        // Recording helps when the student is meant to say a word/sound
        // aloud. Skip it for typed answers, dot-tapping, ordering, or
        // anything in the maths subject - it's just clutter there.
        if (!it) return plan.subject === 'english';
        if (it.record === false) return false;
        if (it.record === true) return true;
        if (['numeric', 'tap-count', 'order'].includes(it.type)) return false;
        return plan.subject === 'english';
      }

      function showTeach(t) {
        $('phase-teach').hidden = false;
        $('phase-item').hidden = true;
        $('phase-done').hidden = true;
        $('teach-intro').textContent = t.intro || 'Let\'s learn!';
        const ex = $('teach-examples');
        ex.innerHTML = '';
        const showRecExamples = plan.subject === 'english';
        (t.examples || []).forEach((e) => {
          const div = document.createElement('div');
          div.className = 'example';
          const show = document.createElement('div');
          show.className = 'show';
          // Hyphenated CVC like "d-o-g": render each letter as a span so
          // we can highlight it while the matching sound is spoken.
          const segs = parseSegments(e.show);
          if (segs) {
            segs.forEach((s, idx) => {
              const seg = document.createElement('span');
              seg.className = 'seg';
              seg.dataset.idx = String(idx);
              seg.textContent = s;
              show.appendChild(seg);
              if (idx < segs.length - 1) {
                const sep = document.createElement('span');
                sep.className = 'seg-sep';
                sep.textContent = '-';
                show.appendChild(sep);
              }
            });
            show.classList.add('show-segmented');
          } else {
            show.textContent = e.show;
          }
          const label = document.createElement('div');
          label.className = 'label';
          label.textContent = e.label;
          const actions = document.createElement('div');
          actions.className = 'example-actions';
          // Segmented show + a known word -> "Sound out" button that plays
          // each phoneme as a separate utterance, highlighting each letter.
          const blendOpts = segs && (e.say || e.label) ? {
            segments: segs,
            word: e.say || e.label,
            onPart: (i) => highlightSegments(show, i, segs.length),
          } : null;
          actions.appendChild(makeSpeakButton(e.say || `${e.show}. ${e.label}`, e.audio, blendOpts));
          if (showRecExamples) actions.appendChild(makeRecordButton());
          div.append(show, label, actions);
          ex.appendChild(div);
        });
        // Auto-read every teach screen on entry. Prefers a recorded
        // audio file if the content provides one; otherwise uses TTS.
        // Muted by the top-bar sound toggle (settings.muteSpeech).
        // If the first example has a blendable segmented show like
        // "d-o-g", chain a sound-out demonstration after the intro.
        const firstBlendable = (t.examples || [])
          .map((e) => ({ e, segs: parseSegments(e.show) }))
          .find((x) => x.segs);
        if (t.audio) {
          playAudio(t.audio);
        } else if (firstBlendable && !settings.muteSpeech) {
          speak(t.say || t.intro, settings.muteSpeech);
          // Wait until the intro finishes before sounding out the example.
          const introMs = Math.max(2200, (t.say || t.intro || '').length * 55);
          setTimeout(() => {
            const exHost = ex.querySelector('.example .show.show-segmented');
            playBlend(firstBlendable.segs, firstBlendable.e.say || firstBlendable.e.label, settings.muteSpeech, {
              onPart: (i) => highlightSegments(exHost, i, firstBlendable.segs.length),
            });
          }, introMs);
        } else {
          speak(t.say || t.intro, settings.muteSpeech);
        }
        $('teach-replay').onclick = () => {
          if (firstBlendable) {
            const exHost = ex.querySelector('.example .show.show-segmented');
            playBlend(firstBlendable.segs, firstBlendable.e.say || firstBlendable.e.label, false, {
              onPart: (i) => highlightSegments(exHost, i, firstBlendable.segs.length),
            });
          } else {
            const intro = t.say || t.intro;
            const exTexts = (t.examples || []).map((e) => e.say || `${e.show}, ${e.label}`).join('. ');
            speak(`${intro}. ${exTexts}`, false);
          }
        };
        $('teach-next').onclick = () => { $('phase-teach').hidden = true; nextItem(); };
      }

      function nextItem() {
        if (i >= total) return finish();
        const it = plan.items[i];
        itemStartedAt = Date.now();
        $('phase-item').hidden = false;
        $('feedback').hidden = true;
        $('feedback').classList.remove('good', 'bad');
        // Render prompt + small toolbar (speak / optionally record).
        $('item-prompt').innerHTML = '';
        const promptText = document.createElement('span');
        promptText.textContent = it.prompt;
        $('item-prompt').appendChild(promptText);
        // Optional picture cue (emoji) - lets us ask "which letter starts
        // this word?" without revealing the answer in the prompt text.
        if (it.picture) {
          const pic = document.createElement('div');
          pic.className = 'item-picture';
          pic.textContent = it.picture;
          pic.setAttribute('aria-hidden', 'true');
          $('item-prompt').after(pic);
        } else {
          // Clear any leftover picture from a previous item.
          const prev = document.querySelector('.item-picture');
          if (prev) prev.remove();
        }
        const tools = document.createElement('span');
        tools.className = 'prompt-tools';
        // For blend items, derive the segment list from the prompt so the
        // Listen button sounds it out (c... a... t... cat) instead of just
        // reading the surrounding sentence.
        let blendOpts = null;
        if (it.type === 'blend') {
          const m = (it.prompt || '').match(/([a-z])\s*-\s*([a-z])\s*-\s*([a-z])(?:\s*-\s*([a-z]))?/i);
          if (m) {
            const segs = m.slice(1).filter(Boolean).map((s) => s.toLowerCase());
            blendOpts = { segments: segs, word: it.answer };
          }
        }
        tools.appendChild(makeSpeakButton(it.say || it.prompt, it.audio, blendOpts));
        if (shouldShowRecord(it)) tools.appendChild(makeRecordButton());
        $('item-prompt').appendChild(tools);
        // Auto-read every new slide. For blend items, sound out the
        // segments after the prompt sentence so the learner hears it.
        if (blendOpts && !it.audio) {
          speak(it.say || it.prompt, settings.muteSpeech);
          setTimeout(() => playBlend(blendOpts.segments, blendOpts.word, settings.muteSpeech), 1600);
        } else {
          speakOrPlay(it.audio, it.say || it.prompt, settings.muteSpeech);
        }

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
        const lead = pickPhrase(correct ? POSITIVE : ENCOURAGING);
        $('feedback-text').textContent = `${lead} ${explain}`;
        // Always offer a "Listen again" alongside the feedback so a learner
        // who missed the explanation can re-hear it without a setting toggle.
        const fbActions = node.querySelector('.feedback-actions') || (() => {
          const w = document.createElement('div');
          w.className = 'feedback-actions';
          $('feedback-text').after(w);
          return w;
        })();
        fbActions.innerHTML = '';
        fbActions.appendChild(makeSpeakButton(`${lead}. ${explain}`));
        // Auto-read every feedback message; learners can mute globally.
        speak(`${lead}. ${explain}`, settings.muteSpeech);
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
        // Grade-aware celebration. Low scores get a supportive message
        // rather than fake confetti.
        const msg = endOfLessonMessage(correctCount, total);
        const headlineEl = $('phase-done').querySelector('h2');
        if (headlineEl) headlineEl.textContent = `${msg.icon} ${msg.headline}`;
        $('done-summary').textContent = msg.body;
        speak(`${msg.headline} ${msg.body}`, settings.muteSpeech);
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
