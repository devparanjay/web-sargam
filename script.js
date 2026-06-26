(() => {
  const buttons = document.querySelectorAll(".swara");
  const nowPlaying = document.getElementById("nowPlaying");

  let ctx = null;
  let activeNodes = [];

  const ensureCtx = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  const stopActive = () => {
    const t = ctx.currentTime;
    activeNodes.forEach(({ gain, osc, lfoGain }) => {
      try {
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.15);
        osc.stop(t + 0.2);
        if (lfoGain) lfoGain.gain.cancelScheduledValues(t);
      } catch (_) { /* already stopped */ }
    });
    activeNodes = [];
  };

  const playSwara = (freq, btn) => {
    const audio = ensureCtx();
    stopActive();

    const now = audio.currentTime;
    const dur = 1.6;

    const master = audio.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(0.35, now + 0.04);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.4);
    master.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    master.connect(audio.destination);

    const lowpass = audio.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.setValueAtTime(2400, now);
    lowpass.frequency.exponentialRampToValueAtTime(900, now + dur);
    lowpass.Q.value = 0.7;
    lowpass.connect(master);

    const partials = [
      { ratio: 1.0,  gain: 0.55, type: "sine"     },
      { ratio: 2.0,  gain: 0.18, type: "sine"     },
      { ratio: 3.0,  gain: 0.08, type: "sine"     },
      { ratio: 4.0,  gain: 0.04, type: "triangle" }
    ];

    const oscs = [];
    partials.forEach(p => {
      const osc = audio.createOscillator();
      osc.type = p.type;
      osc.frequency.setValueAtTime(freq * p.ratio, now);

      const g = audio.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(p.gain, now + 0.05);

      osc.connect(g);
      g.connect(lowpass);
      osc.start(now);
      osc.stop(now + dur + 0.05);

      oscs.push({ osc, g });
    });

    const vibrato = audio.createOscillator();
    const vibratoGain = audio.createGain();
    vibrato.frequency.setValueAtTime(5.2, now);
    vibratoGain.gain.setValueAtTime(freq * 0.012, now);
    vibrato.connect(vibratoGain);
    oscs[0].osc.detune.setValueAtTime(0, now);
    vibratoGain.connect(oscs[0].osc.detune);
    vibrato.start(now);
    vibrato.stop(now + dur + 0.05);

    activeNodes.push(
      { gain: master, osc: oscs[0].osc, lfoGain: vibratoGain },
      ...oscs.slice(1).map(o => ({ gain: o.g, osc: o.osc }))
    );

    if (btn) {
      btn.classList.remove("is-playing");
      void btn.offsetWidth;
      btn.classList.add("is-playing");

      const note = btn.dataset.note;
      const name = btn.querySelector(".swara__name").textContent;
      nowPlaying.textContent = `▶  ${note} — ${name}`;
      nowPlaying.classList.add("is-active");

      clearTimeout(playSwara._t);
      playSwara._t = setTimeout(() => {
        nowPlaying.classList.remove("is-active");
        nowPlaying.textContent = "";
      }, 1600);
    }
  };

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const freq = parseFloat(btn.dataset.freq);
      playSwara(freq, btn);
    });
  });

  const keyboardMap = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6 };
  window.addEventListener("keydown", e => {
    const idx = keyboardMap[e.key];
    if (idx === undefined) return;
    const btn = buttons[idx];
    if (!btn) return;
    btn.click();
  });
})();