(function () {
  const cfg = window.APP_CONFIG;
  const $ = (id) => document.getElementById(id);

  const els = {
    badge: $('modeBadge'),
    carousel: $('voiceCarousel'),
    voiceCount: $('voiceCount'),
    text: $('textInput'),
    charCount: $('charCount'),
    fixedNote: $('fixedNote'),
    speed: $('speedSelect'),
    format: $('formatSelect'),
    speakBtn: $('speakBtn'),
    btnText: $('speakBtn').querySelector('.btn-text'),
    spinner: $('speakBtn').querySelector('.spinner'),
    playerCard: $('playerCard'),
    playPauseBtn: $('playPauseBtn'),
    playerVoice: $('playerVoice'),
    playerTime: $('playerTime'),
    seekBar: $('seekBar'),
    downloadBtn: $('downloadBtn'),
    audio: $('audioEl'),
    toast: $('toast')
  };

  let voices = [];
  let selectedVoice = null;
  let humanPass = null;
  let lastRequestKey = '';
  let currentBlobUrl = null;

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.add('hidden'), 2600);
  }

  function setLoading(on) {
    els.speakBtn.disabled = on;
    els.btnText.classList.toggle('hidden', on);
    els.spinner.classList.toggle('hidden', !on);
  }

  function formatTime(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function renderVoices() {
    els.voiceCount.textContent = `${voices.length} دەنگ`;
    els.carousel.innerHTML = '';
    voices.forEach((v, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'voice-card' + (i === 0 ? ' active' : '');
      btn.innerHTML = `
        <div class="voice-top">
          <span class="voice-name">${v.name}</span>
          <span class="voice-kind">${v.kind || 'دەنگ'}</span>
        </div>
        <span class="voice-tag">${v.tag || v.description || ''}</span>
      `;
      btn.onclick = () => {
        selectedVoice = v;
        els.carousel.querySelectorAll('.voice-card').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
      };
      els.carousel.appendChild(btn);
    });
    selectedVoice = voices[0] || null;
  }

  async function initVoices() {
    els.badge.textContent = cfg.DEMO_MODE ? 'دۆخێ تاقیکرنێ' : 'سێرڤەر چالاکە';
    if (cfg.DEMO_MODE) {
      voices = cfg.DEMO_VOICES;
      renderVoices();
      return;
    }
    try {
      const res = await fetch(`${cfg.API_URL}/v1/voices`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      voices = data.voices || [];
      renderVoices();
    } catch {
      voices = cfg.DEMO_VOICES;
      renderVoices();
      showToast('سێرڤەر بەردەست نینە، دەنگێن تاقیکرنێ هاتنە نیشاندان');
    }
  }

  // دەنگەکێ کورتێ WAV بۆ تاقیکرنا پلەیەر و داگرتنێ بێی سێرڤەر
  function createDemoWavBlob() {
    const sampleRate = 22050, duration = 1.5, numSamples = Math.floor(sampleRate * duration);
    const buf = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buf);
    const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF'); view.setUint32(4, 36 + numSamples * 2, true);
    writeStr(8, 'WAVE'); writeStr(12, 'fmt '); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    writeStr(36, 'data'); view.setUint32(40, numSamples * 2, true);
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 2.5);
      const sample = (Math.sin(2 * Math.PI * 440 * t) + 0.5 * Math.sin(2 * Math.PI * 660 * t)) * 0.25 * env;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  }

  async function requestSpeech(retried) {
    const payload = {
      text: els.text.value.trim(),
      voice: selectedVoice.id || selectedVoice.name,
      speed: Number(els.speed.value),
      format: els.format.value,
      pass: humanPass
    };

    if (cfg.DEMO_MODE) {
      await new Promise(r => setTimeout(r, 550));
      return { blob: createDemoWavBlob(), fixed: true, ext: 'wav' };
    }

    const res = await fetch(`${cfg.API_URL}/v1/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.headers.get('X-Pass')) humanPass = res.headers.get('X-Pass');
    if (res.status === 401 && !retried) {
      humanPass = null;
      return requestSpeech(true);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'کێشەیەک د سێرڤەری دا ڕوو دا');
    }

    return {
      blob: await res.blob(),
      fixed: res.headers.get('X-Text-Fixed') === '1',
      ext: payload.format
    };
  }

  function loadAudio(blob, ext) {
    if (currentBlobUrl) URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = URL.createObjectURL(blob);
    els.audio.src = currentBlobUrl;
    els.playerVoice.textContent = selectedVoice.name;
    els.downloadBtn.href = currentBlobUrl;
    els.downloadBtn.download = `badini-${selectedVoice.id || 'voice'}.${ext}`;
    els.playerCard.classList.remove('hidden');
    els.audio.play().catch(() => {});
  }

  els.speakBtn.onclick = async () => {
    const txt = els.text.value.trim();
    if (!txt) return showToast('تکایە سەرەتا تێکستەکی بنڤیسە');
    if (!selectedVoice) return showToast('دەنگەکی هەلبژێرە');

    const key = `${txt}|${selectedVoice.id || selectedVoice.name}|${els.speed.value}|${els.format.value}`;
    if (key === lastRequestKey && els.audio.src) {
      if (els.audio.paused) els.audio.play(); else els.audio.pause();
      return;
    }

    setLoading(true);
    els.fixedNote.classList.add('hidden');
    try {
      const result = await requestSpeech(false);
      lastRequestKey = key;
      if (result.fixed) els.fixedNote.classList.remove('hidden');
      loadAudio(result.blob, result.ext);
      if (cfg.DEMO_MODE) showToast('دۆخێ تاقیکرنێ: دەنگێ نموونەیی لێدرا');
    } catch (e) {
      showToast(e.message || 'شاشیەک ڕوو دا');
    } finally {
      setLoading(false);
    }
  };

  // Player controls
  els.playPauseBtn.onclick = () => {
    if (els.audio.paused) els.audio.play(); else els.audio.pause();
  };
  els.audio.onplay = () => { els.playPauseBtn.textContent = '❚❚'; };
  els.audio.onpause = () => { els.playPauseBtn.textContent = '▶'; };
  els.audio.ontimeupdate = () => {
    const dur = els.audio.duration || 0;
    const cur = els.audio.currentTime || 0;
    els.seekBar.value = dur ? (cur / dur) * 100 : 0;
    els.playerTime.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
  };
  els.seekBar.oninput = () => {
    if (els.audio.duration) els.audio.currentTime = (els.seekBar.value / 100) * els.audio.duration;
  };

  // Text helpers
  els.text.oninput = () => {
    els.charCount.textContent = `${els.text.value.length} / ${cfg.MAX_CHARS}`;
  };
  $('sampleBtn').onclick = () => {
    els.text.value = 'ب خێر هاتی بۆ ستۆدیۆیا دەنگێ بادینی. تۆ دشێی هەر نڤیسینەکا کوردی ب کوالێتییەکا سافی بکەیە دەنگ.';
    els.text.dispatchEvent(new Event('input'));
  };
  $('clearBtn').onclick = () => {
    els.text.value = '';
    els.text.dispatchEvent(new Event('input'));
    els.fixedNote.classList.add('hidden');
  };

  initVoices();
})();
