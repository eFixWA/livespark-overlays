// Shared overlay runtime: live connection to LiveSpark, language, theme, sounds.
(function () {
  const params = new URLSearchParams(location.search);

  const STR = {
    en: {
      follow: 'just followed', share: 'shared the LIVE', gift: 'sent', join: 'joined', like: 'sent likes',
      likeGoal: 'Like goal', giftGoal: 'Gift goal', topGifters: 'Top gifters', reached: 'Goal reached!',
      diamonds: 'diamonds', waiting: 'Waiting for gifts…', thanks: 'Thank you!',
    },
    es: {
      follow: 'te sigue', share: 'compartió el LIVE', gift: 'envió', join: 'se unió', like: 'envió likes',
      likeGoal: 'Meta de likes', giftGoal: 'Meta de regalos', topGifters: 'Top regaladores', reached: '¡Meta lograda!',
      diamonds: 'diamantes', waiting: 'Esperando regalos…', thanks: '¡Gracias!',
    },
  };

  const LS = {
    params,
    lang: params.get('lang') === 'es' ? 'es' : 'en',
    theme: params.get('theme') || 'spark',
    settings: { volume: 0.7, alertSeconds: 5 },
    t(key) { return (STR[this.lang] || STR.en)[key] || key; },
    fmt(n) {
      n = Number(n) || 0;
      if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
      if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
      return n.toLocaleString(this.lang === 'es' ? 'es-US' : 'en-US');
    },
    applyTheme(theme) {
      if (theme) this.theme = theme;
      document.documentElement.dataset.theme = this.theme;
    },
    // Escape text that came from TikTok before it touches innerHTML.
    esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    initials(name) {
      const clean = String(name || '?').replace(/[^\p{L}\p{N}]/gu, '');
      return (clean[0] || '?').toUpperCase();
    },

    connect(handlers) {
      if (params.get('demo') === '1') return; // static preview, no live connection
      // Served by LiveSpark itself → same host. Hosted on the web (needed by apps such as
      // TikTok LIVE Studio, which only accept https links) → talk to LiveSpark on this PC.
      const local = /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(location.host);
      const port = Number(params.get('port')) || 21420;
      const url = local ? `ws://${location.host}/ws` : `ws://127.0.0.1:${port}/ws`;
      let delay = 500;
      const open = () => {
        const ws = new WebSocket(url);
        ws.onopen = () => { delay = 500; };
        ws.onmessage = (m) => {
          let msg; try { msg = JSON.parse(m.data); } catch { return; }
          if (msg.kind === 'state') {
            if (msg.settings) {
              this.settings = { ...this.settings, ...msg.settings };
              if (!params.get('lang') && msg.settings.lang) this.lang = msg.settings.lang;
              if (!params.get('theme')) this.applyTheme(msg.settings.theme);
            }
            handlers.state && handlers.state(msg.state, this.settings);
          } else if (msg.kind === 'event') {
            handlers.event && handlers.event(msg.event, this.settings);
          }
        };
        ws.onclose = () => { setTimeout(open, delay); delay = Math.min(delay * 2, 5000); };
      };
      open();
    },
  };

  // ---- synthesized sounds: no audio files to ship or license ----
  let ctx = null;
  function audio() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, vol, type = 'sine') {
    const a = audio();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime + start);
    g.gain.setValueAtTime(0.0001, a.currentTime + start);
    g.gain.exponentialRampToValueAtTime(vol, a.currentTime + start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + dur);
    o.connect(g).connect(a.destination);
    o.start(a.currentTime + start);
    o.stop(a.currentTime + start + dur + 0.05);
  }
  function whoosh(vol) {
    const a = audio();
    const len = a.sampleRate * 0.5;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = a.createBufferSource();
    const f = a.createBiquadFilter();
    const g = a.createGain();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(400, a.currentTime);
    f.frequency.exponentialRampToValueAtTime(3000, a.currentTime + 0.4);
    g.gain.value = vol * 0.6;
    src.buffer = buf;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  }
  LS.sound = function (type) {
    // Dashboard previews pass mute=1 so only OBS plays alert sounds.
    if (params.get('mute') === '1') return;
    const v = Math.max(0, Math.min(1, Number(this.settings.volume ?? 0.7))) * 0.35;
    if (v <= 0) return;
    try {
      if (type === 'follow') { tone(784, 0, 0.35, v); tone(1175, 0.11, 0.5, v); }
      else if (type === 'gift') { [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.07, 0.45, v * 0.8, 'triangle')); }
      else if (type === 'big') { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.06, 0.7, v, 'triangle')); tone(2093, 0.4, 1.1, v * 0.7); }
      else if (type === 'share') whoosh(v);
      else if (type === 'goal') { [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.12, 0.6, v, 'square')); }
      else tone(880, 0, 0.25, v * 0.6);
    } catch { /* audio blocked */ }
  };

  LS.applyTheme();
  window.LS = LS;
})();
