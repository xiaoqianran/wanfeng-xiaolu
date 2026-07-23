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
  var ambienceNodes = null;

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

  /** Soft looping ambient pad (two detuned sines + low gain). No external files. */
  function startAmbience(enabled) {
    if (enabled === false) {
      stopAmbience();
      return false;
    }
    var c = getCtx();
    if (!c) return false;
    try {
      if (c.state === "suspended" && c.resume) c.resume();
      if (ambienceNodes) return true;
      var g = c.createGain();
      g.gain.value = 0.0001;
      g.connect(c.destination);
      var o1 = c.createOscillator();
      var o2 = c.createOscillator();
      o1.type = "sine";
      o2.type = "sine";
      o1.frequency.value = 110;
      o2.frequency.value = 164.81;
      o1.connect(g);
      o2.connect(g);
      o1.start();
      o2.start();
      var now = c.currentTime;
      g.gain.exponentialRampToValueAtTime(0.012, now + 1.2);
      ambienceNodes = { g: g, o1: o1, o2: o2 };
      return true;
    } catch (e) {
      ambienceNodes = null;
      return false;
    }
  }

  function stopAmbience() {
    if (!ambienceNodes) return false;
    try {
      var c = getCtx();
      var g = ambienceNodes.g;
      var now = c ? c.currentTime : 0;
      if (g && g.gain) {
        g.gain.cancelScheduledValues(now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      }
      var nodes = ambienceNodes;
      setTimeout(function () {
        try {
          nodes.o1.stop();
          nodes.o2.stop();
          nodes.o1.disconnect();
          nodes.o2.disconnect();
          nodes.g.disconnect();
        } catch (e2) { /* ignore */ }
      }, 500);
    } catch (e) { /* ignore */ }
    ambienceNodes = null;
    return true;
  }

  function isAmbienceOn() {
    return !!ambienceNodes;
  }

  function setAmbience(on, soundEnabled) {
    if (soundEnabled === false || !on) return stopAmbience();
    return startAmbience(true);
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
    if (kind === "harvest") return beep({ freq: 620, dur: 0.16, type: "triangle", vol: 0.045 });
    if (kind === "unlock") return beep({ freq: 880, dur: 0.12, type: "sine", vol: 0.04 });
    if (kind === "theme") return beep({ freq: 480, dur: 0.1, type: "triangle", vol: 0.03 });
    if (kind === "achieve") return beep({ freq: 700, dur: 0.18, type: "sine", vol: 0.04 });
    return beep({ freq: 540, dur: 0.08 });
  }

  return {
    play: play,
    beep: beep,
    startAmbience: startAmbience,
    stopAmbience: stopAmbience,
    setAmbience: setAmbience,
    isAmbienceOn: isAmbienceOn,
  };
});
