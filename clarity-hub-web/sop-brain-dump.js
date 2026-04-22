/* ================================================================
 * The SOP Brain Dump — client-side logic
 *
 * Three stages, swapped by showing/hiding .sop-stage elements:
 *   1. input       — user types or speaks a brain dump
 *   2. processing  — spinner while the Anthropic function runs
 *   3. result      — rendered SOP with copy / Google Docs / Word exports
 *
 * Voice input uses MediaRecorder (cross-browser, including in-app browsers)
 * and posts audio blobs to /api/transcribe. The old SpeechRecognition API
 * was replaced because it's Chrome-only and flaky inside social-app webviews.
 * ================================================================ */

(function () {
  'use strict';

  // ---------- DOM ----------
  const stage = document.getElementById('sop-stage');
  const stages = {
    input: stage.querySelector('[data-stage="input"]'),
    processing: stage.querySelector('[data-stage="processing"]'),
    result: stage.querySelector('[data-stage="result"]'),
  };

  const textarea = document.getElementById('sop-input');
  const mic = document.getElementById('sop-mic');
  const micIconOn = mic.querySelector('.sop-mic__icon--on');
  const micIconOff = mic.querySelector('.sop-mic__icon--off');
  const micStatus = document.getElementById('sop-mic-status');
  const generateBtn = document.getElementById('sop-generate');
  const resetBtns = [document.getElementById('sop-reset'), document.getElementById('sop-reset-2')];
  const errorEl = document.getElementById('sop-error');
  const wordcountEl = document.getElementById('sop-wordcount');
  const docEl = document.getElementById('sop-doc');
  const toastEl = document.getElementById('sop-toast');

  const copyBtn = document.getElementById('sop-copy');
  const gdocsBtn = document.getElementById('sop-gdocs');
  const wordBtn = document.getElementById('sop-word');

  // ---------- State ----------
  let isListening = false;
  let isTranscribing = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let mediaStream = null;
  let currentSop = null;
  let toastTimer = null;

  // ---------- Utilities ----------
  function setStage(name) {
    Object.entries(stages).forEach(([k, el]) => {
      el.hidden = k !== name;
    });
    // Scroll back to stage top on transition (nice on mobile)
    if (name !== 'input') {
      stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function showError(msg) {
    if (!msg) {
      errorEl.hidden = true;
      errorEl.textContent = '';
      return;
    }
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function showToast(msg, ms) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, ms || 3500);
  }

  function updateWordcount() {
    const count = textarea.value.trim().split(/\s+/).filter(Boolean).length;
    wordcountEl.textContent = count + (count === 1 ? ' word' : ' words');
    generateBtn.disabled = textarea.value.trim().length < 10;
  }

  function setMicState(pressed, label) {
    mic.setAttribute('aria-pressed', String(pressed));
    mic.setAttribute('aria-label', label || (pressed ? 'Stop recording' : 'Start voice input'));
    micIconOn.hidden = pressed;
    micIconOff.hidden = !pressed;
  }

  function setMicStatus(text) {
    micStatus.textContent = text || '';
  }

  function track(event, props) {
    // Umami may or may not be loaded; this is a best-effort no-op otherwise.
    try {
      if (window.umami && typeof window.umami.track === 'function') {
        window.umami.track(event, props || {});
      }
    } catch (_) {}
  }

  // ---------- Voice input: MediaRecorder -> Whisper ----------
  async function toggleListening() {
    if (isListening) {
      stopRecording();
      return;
    }
    await startRecording();
  }

  async function startRecording() {
    showError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('Voice input isn\u2019t supported by this browser. Type instead.');
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      showError('Voice recording isn\u2019t supported by this browser. Type instead.');
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      showError('Microphone access denied. Check browser or iOS permissions, then retry. Or type instead.');
      return;
    }

    try {
      mediaRecorder = new MediaRecorder(mediaStream);
    } catch (err) {
      // Some browsers are fussy about mimeType; fall back to explicit webm.
      try {
        mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' });
      } catch (err2) {
        stopStream();
        showError('Voice recording isn\u2019t supported by this browser. Type instead.');
        return;
      }
    }

    audioChunks = [];
    mediaRecorder.addEventListener('dataavailable', (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    });
    mediaRecorder.addEventListener('stop', handleRecorderStop);

    mediaRecorder.start();
    isListening = true;
    setMicState(true);
    setMicStatus('Listening\u2026');
    track('sop_voice_started');
  }

  function stopRecording() {
    if (!mediaRecorder) return;
    try {
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    } catch (_) {}
    isListening = false;
    setMicState(false);
  }

  function stopStream() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
  }

  async function handleRecorderStop() {
    stopStream();
    if (!audioChunks.length) {
      setMicStatus('');
      return;
    }
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];
    isTranscribing = true;
    setMicStatus('Transcribing\u2026');

    const form = new FormData();
    form.append('audio', blob, 'recording.webm');

    try {
      const res = await fetch('/api/transcribe', { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Transcription failed');
      }
      const { text } = await res.json();
      if (text) {
        const current = textarea.value;
        const sep = current && !current.endsWith(' ') ? ' ' : '';
        textarea.value = (current + sep + text).trim() + ' ';
        updateWordcount();
      }
    } catch (err) {
      showError(err.message || 'Transcription failed. Try again or type instead.');
    } finally {
      isTranscribing = false;
      setMicStatus('');
    }
  }

  // ---------- Generate ----------
  async function handleGenerate() {
    const brainDump = textarea.value.trim();
    if (brainDump.length < 10) {
      showError('Add a bit more detail first \u2014 a sentence or two at minimum.');
      return;
    }
    if (brainDump.length > 10000) {
      showError('That\u2019s a lot \u2014 trim it to under 10,000 characters and try again.');
      return;
    }

    showError(null);
    setStage('processing');
    track('sop_started', { words: brainDump.split(/\s+/).length });

    try {
      const res = await fetch('/api/generate-sop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brainDump }),
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Hourly limit reached. Try again later.');
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Generation failed');
      }

      currentSop = await res.json();
      renderSop(currentSop);
      setStage('result');
      track('sop_generated');
    } catch (err) {
      showError(err.message || 'Something went wrong. Try simplifying the input and try again.');
      setStage('input');
    }
  }

  // ---------- Render SOP ----------
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderList(items, warnClass) {
    if (!items || !items.length) return '<p class="sop-doc__list-empty"><em>None noted.</em></p>';
    const cls = warnClass ? 'sop-doc__list sop-doc__list--warn' : 'sop-doc__list';
    return (
      '<ul class="' +
      cls +
      '">' +
      items.map((i) => '<li><span>' + esc(i) + '</span></li>').join('') +
      '</ul>'
    );
  }

  function renderSop(sop) {
    const steps = (sop.steps || [])
      .map((s) => {
        return (
          '<li>' +
          '<span>' +
          '<span class="sop-doc__step-action">' + esc(s.action) + '</span>' +
          '<span class="sop-doc__step-meta">' + esc(s.owner) + ' \u2014 ' + esc(s.tool) + '</span>' +
          '</span>' +
          '</li>'
        );
      })
      .join('');

    const tools = (sop.toolsUsed || []).map(esc).join(', ');

    const assumptions = sop.assumptionsToConfirm && sop.assumptionsToConfirm.length
      ? '<div class="sop-doc__assumptions">' +
        '<p class="sop-doc__assumptions-title">Assumptions to confirm</p>' +
        renderList(sop.assumptionsToConfirm, true) +
        '</div>'
      : '';

    docEl.innerHTML =
      '<p class="sop-doc__eyebrow">Standard Operating Procedure</p>' +
      '<h2 class="sop-doc__title">' + esc(sop.processName) + '</h2>' +

      '<div class="sop-doc__meta">' +
      '<div><span class="sop-doc__meta-label">Purpose:</span> ' + esc(sop.purpose) + '</div>' +
      '<div><span class="sop-doc__meta-label">Trigger:</span> ' + esc(sop.trigger) + '</div>' +
      '<div><span class="sop-doc__meta-label">Frequency:</span> ' + esc(sop.frequency) + '</div>' +
      '<div><span class="sop-doc__meta-label">Owner:</span> ' + esc(sop.owner) + '</div>' +
      '<div class="sop-doc__meta-row--full"><span class="sop-doc__meta-label">Tools:</span> ' + tools + '</div>' +
      '</div>' +

      '<h3 class="sop-doc__section-title">Steps</h3>' +
      '<ol class="sop-doc__steps">' + steps + '</ol>' +

      '<div class="sop-doc__cols">' +
      '<div>' +
      '<h3 class="sop-doc__section-title">Inputs needed</h3>' +
      renderList(sop.inputsNeeded) +
      '</div>' +
      '<div>' +
      '<h3 class="sop-doc__section-title">Outputs produced</h3>' +
      renderList(sop.outputsProduced) +
      '</div>' +
      '</div>' +

      '<h3 class="sop-doc__section-title">Known failure points</h3>' +
      renderList(sop.knownFailurePoints, true) +

      assumptions;
  }

  // ---------- Exports ----------
  function sopAsText(sop) {
    if (!sop) return '';
    const L = [];
    L.push(sop.processName || 'SOP');
    L.push('');
    L.push('Purpose: ' + (sop.purpose || ''));
    L.push('Trigger: ' + (sop.trigger || ''));
    L.push('Frequency: ' + (sop.frequency || ''));
    L.push('Owner: ' + (sop.owner || ''));
    L.push('Tools: ' + ((sop.toolsUsed || []).join(', ')));
    L.push('');
    L.push('STEPS');
    (sop.steps || []).forEach((s, i) => {
      L.push((i + 1) + '. ' + s.action + ' \u2014 ' + s.owner + ' \u2014 ' + s.tool);
    });
    L.push('');
    L.push('INPUTS NEEDED');
    (sop.inputsNeeded || []).forEach((i) => L.push('\u2022 ' + i));
    L.push('');
    L.push('OUTPUTS PRODUCED');
    (sop.outputsProduced || []).forEach((i) => L.push('\u2022 ' + i));
    L.push('');
    L.push('KNOWN FAILURE POINTS');
    (sop.knownFailurePoints || []).forEach((i) => L.push('\u2022 ' + i));
    L.push('');
    L.push('ASSUMPTIONS TO CONFIRM');
    (sop.assumptionsToConfirm || []).forEach((i) => L.push('\u2022 ' + i));
    return L.join('\n');
  }

  function sopAsWordHtml(sop) {
    const dash = '\u2014';
    function e(s) { return esc(s); }
    function list(items) {
      return '<ul>' + (items || []).map((i) => '<li>' + e(i) + '</li>').join('') + '</ul>';
    }
    const stepsHtml = (sop.steps || []).map((s) => {
      return '<li><strong>' + e(s.action) + '</strong><br><span class="step-meta">' + e(s.owner) + ' ' + dash + ' ' + e(s.tool) + '</span></li>';
    }).join('');

    return (
      '<!DOCTYPE html>\n' +
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">\n' +
      '<head><meta charset="utf-8"><title>' + e(sop.processName) + '</title>\n' +
      '<style>\n' +
      'body { font-family: Calibri, Arial, sans-serif; color: #2E2E2E; line-height: 1.5; font-size: 11pt; }\n' +
      'h1 { font-family: Georgia, serif; color: #3F5366; font-size: 22pt; margin-bottom: 4pt; }\n' +
      'h2 { font-family: Georgia, serif; color: #3F5366; font-size: 13pt; border-bottom: 1px solid #8FA79A; padding-bottom: 3pt; margin-top: 18pt; }\n' +
      '.meta { color: #6B6B6B; font-size: 10pt; font-style: italic; margin-top: 0; }\n' +
      'table { border-collapse: collapse; width: 100%; margin-top: 8pt; }\n' +
      'td { padding: 5pt 10pt; border-bottom: 1px solid #E8E2D8; vertical-align: top; }\n' +
      'td.label { font-weight: bold; color: #3F5366; width: 28%; }\n' +
      'ol, ul { padding-left: 20pt; }\n' +
      'li { margin-bottom: 5pt; }\n' +
      '.step-meta { color: #6B6B6B; font-style: italic; font-size: 10pt; }\n' +
      '.footer { color: #6B6B6B; font-size: 9pt; font-style: italic; margin-top: 24pt; border-top: 1px solid #E8E2D8; padding-top: 8pt; }\n' +
      '</style></head>\n' +
      '<body>\n' +
      '<h1>' + e(sop.processName) + '</h1>\n' +
      '<p class="meta">Created with The Clarity Hub ' + dash + ' SOP Brain Dump</p>\n' +
      '<h2>Overview</h2>\n' +
      '<table>\n' +
      '<tr><td class="label">Purpose</td><td>' + e(sop.purpose || '') + '</td></tr>\n' +
      '<tr><td class="label">Trigger</td><td>' + e(sop.trigger || '') + '</td></tr>\n' +
      '<tr><td class="label">Frequency</td><td>' + e(sop.frequency || '') + '</td></tr>\n' +
      '<tr><td class="label">Owner</td><td>' + e(sop.owner || '') + '</td></tr>\n' +
      '<tr><td class="label">Tools</td><td>' + e((sop.toolsUsed || []).join(', ')) + '</td></tr>\n' +
      '</table>\n' +
      '<h2>Steps</h2>\n' +
      '<ol>' + stepsHtml + '</ol>\n' +
      '<h2>Inputs Needed Before Starting</h2>\n' + list(sop.inputsNeeded) + '\n' +
      '<h2>Outputs Produced</h2>\n' + list(sop.outputsProduced) + '\n' +
      '<h2>Known Failure Points</h2>\n' + list(sop.knownFailurePoints) + '\n' +
      '<h2>Assumptions to Confirm</h2>\n' + list(sop.assumptionsToConfirm) + '\n' +
      '<p class="footer">Generated via the SOP Brain Dump workflow ' + dash + ' clarityhub.com.au</p>\n' +
      '</body></html>'
    );
  }

  async function exportCopy() {
    if (!currentSop) return;
    try {
      await navigator.clipboard.writeText(sopAsText(currentSop));
      const oldLabel = copyBtn.querySelector('.sop-export__label');
      if (oldLabel) {
        oldLabel.textContent = 'Copied';
        setTimeout(() => { oldLabel.textContent = 'Copy'; }, 1800);
      }
      track('sop_exported', { format: 'copy' });
    } catch (err) {
      showToast('Couldn\u2019t copy to clipboard.');
    }
  }

  async function exportGoogleDocs() {
    if (!currentSop) return;
    try {
      await navigator.clipboard.writeText(sopAsText(currentSop));
      window.open('https://docs.google.com/document/create', '_blank', 'noopener');
      showToast('Copied to clipboard. Paste into the new Google Doc.');
      track('sop_exported', { format: 'gdocs' });
    } catch (err) {
      showToast('Couldn\u2019t copy. Use Copy first, then open Google Docs.');
    }
  }

  function exportWord() {
    if (!currentSop) return;
    const html = sopAsWordHtml(currentSop);
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (currentSop.processName || 'SOP').replace(/[^a-z0-9]/gi, '_') + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast('Downloaded. Opens in Word, or upload to Google Drive to convert.');
    track('sop_exported', { format: 'word' });
  }

  // ---------- Reset ----------
  function handleReset() {
    currentSop = null;
    textarea.value = '';
    updateWordcount();
    showError(null);
    if (isListening) stopRecording();
    setStage('input');
    textarea.focus();
  }

  // ---------- Wire events ----------
  textarea.addEventListener('input', updateWordcount);
  mic.addEventListener('click', toggleListening);
  generateBtn.addEventListener('click', handleGenerate);
  resetBtns.filter(Boolean).forEach((b) => b.addEventListener('click', handleReset));
  copyBtn.addEventListener('click', exportCopy);
  gdocsBtn.addEventListener('click', exportGoogleDocs);
  wordBtn.addEventListener('click', exportWord);

  updateWordcount();
})();
