/**
 * Soft WebAudio cues for 晚风小路 — no external files.
 * Respects settings.sound; safe when AudioContext missing.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WanfengAudio = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ctx = null;

  function getCtx() {
    if (ctx) return ctx;
    var AC = typeof AudioContext !== "undefined" ? AudioContext : typeof webkitAudioContext !== "undefined" ? webkitAudioContext : null;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    return ctx;
  }

  function beep(opts) {
    opts = opts || {};
    if (opts.enabled === false) return false;
    var c = getCtx();
    if (!c) return false;
    try {
      if (c.state === "suspended" && c.resume) c.resume();
      var o = c.createOscillator();
      var g = c.createGain();
      o.type = opts.type || "sine";
      o.frequency.value = opts.freq || 520;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(c.destination);
      var now = c.currentTime;
      var vol = opts.vol != null ? opts.vol : 0.04;
      g.gain.exponentialRampToValueAtTime(vol, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (opts.dur || 0.12));
      o.start(now);
      o.stop(now + (opts.dur || 0.12) + 0.02);
      return true;
    } catch (e) {
      return false;
    }
  }

  function play(kind, enabled) {
    if (enabled === false) return false;
    if (kind === "pickup") return beep({ freq: 660, dur: 0.09, type: "triangle" });
    if (kind === "water") return beep({ freq: 420, dur: 0.11, type: "sine" });
    if (kind === "serve") return beep({ freq: 780, dur: 0.14, type: "sine", vol: 0.05 });
    if (kind === "ui") return beep({ freq: 500, dur: 0.06, type: "square", vol: 0.02 });
    return beep({ freq: 540, dur: 0.08 });
  }

  return { play: play, beep: beep };
});
