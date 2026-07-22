/*
 * NAZAR → MedOk cross-site handoff — ENTRY (medok.ink side).
 *
 * The nazar portfolio exits through an amber honey veil: fragments converge
 * on the MedOk preview, then dark polygonal sections close over the
 * viewport, ending near-black with a restrained amber center. It then
 * navigates here with `?entry=nazar-medok`. This script plays the matching
 * opening so both halves read as one continuous event:
 *
 *   A  hold        ~60ms   the veil breathes, continuity with the exit;
 *   B  separation  ~60–440 the veil splits into the same polygonal
 *                          sections, which drift outward while amber
 *                          fragments pull toward the screen edges;
 *   C  reveal      ~440–720 the hero clears, a few fragments settle, the
 *                          overlay is removed completely.
 *
 * Shared signature with the portfolio exit (see its MedokHandoffVeil):
 * base #16100a, amber #e8b44f, deep honey #9a5d20, warm white #f6f0e3,
 * hex-derived shard language, seed family 0x6d3d0c.
 *
 * Safety first: the guard attribute is set by an inline <head> script (the
 * veil paints before first render — no flash), the URL is cleaned via
 * history.replaceState immediately, the overlay never intercepts input,
 * reduced motion gets a short static fade, a hidden tab finishes instantly,
 * and two independent timeouts guarantee the site is never left covered.
 * Normal visits (no parameter) exit on the first line.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  if (!root.hasAttribute('data-nazar-entry')) return; // normal visit: no work

  var BASE = '#16100a';
  var AMBER = '232, 180, 79'; // --accent  #e8b44f
  var DEEP = '154, 93, 32'; // --accent-deep #9a5d20
  var WARM = '246, 240, 227'; // --bg #f6f0e3
  var SEED = 0x6d3d0c;

  // Clean the URL right away: drop only the entry trigger, keep every other
  // legitimate parameter, the path and the hash; no new history entry.
  try {
    var u = new URL(location.href);
    u.searchParams.delete('entry');
    var qs = u.searchParams.toString();
    history.replaceState(history.state, '', u.pathname + (qs ? '?' + qs : '') + u.hash);
  } catch (e) { /* cosmetic only */ }

  var reduced = false;
  var small = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    small = window.matchMedia('(max-width: 767px)').matches;
  } catch (e) { /* defaults hold */ }

  var overlay = null;
  var raf = 0;
  var finished = false;

  function finish() {
    if (finished) return;
    finished = true;
    if (raf) cancelAnimationFrame(raf);
    root.removeAttribute('data-nazar-entry');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.removeEventListener('visibilitychange', onHidden);
    window.removeEventListener('resize', onResize);
  }
  function onHidden() {
    if (document.hidden) finish();
  }
  var onResize = function () {};
  document.addEventListener('visibilitychange', onHidden);

  // Hard safety net (independent of the animation): never leave the site
  // covered — reveal, stop, stay usable.
  window.setTimeout(finish, 2400);

  function mulberry32(seedValue) {
    var a = seedValue >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp01(v) {
    return Math.min(1, Math.max(0, v));
  }
  function smooth(a, b, x) {
    var k = clamp01((x - a) / (b - a));
    return k * k * (3 - 2 * k);
  }
  function shardPath(ctx, r, rot, irr) {
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var ang = rot + (i / 6) * Math.PI * 2;
      var rr = r * irr[i];
      if (i === 0) ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
      else ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    ctx.closePath();
  }

  function start() {
    // The overlay replaces the CSS backstop 1:1 before animating, so cover
    // is continuous. Decorative only: hidden from assistive tech and never
    // intercepting input — the page is usable underneath from frame one.
    overlay = document.createElement('div');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:2147483000;pointer-events:none;' +
      'background:radial-gradient(56% 44% at 50% 46%, rgba(232,180,79,.14), rgba(232,180,79,0) 68%),' + BASE + ';';
    document.body.appendChild(overlay);

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    overlay.appendChild(canvas);
    var ctx = null;
    try {
      ctx = canvas.getContext('2d');
    } catch (e) { /* fall through to the static fade */ }

    if (reduced || !ctx) {
      // Reduced motion (or no canvas): short static dark-amber veil, one
      // opacity fade, overlay removed immediately afterward.
      root.removeAttribute('data-nazar-entry');
      overlay.style.transition = 'opacity 180ms ease';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          overlay.style.opacity = '0';
          window.setTimeout(finish, 230);
        });
      });
      return;
    }

    var dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    var W = 0;
    var H = 0;
    var diag = 0;
    function size() {
      W = window.innerWidth;
      H = window.innerHeight;
      diag = Math.hypot(W, H);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    onResize = size;
    window.addEventListener('resize', onResize);

    var rnd = mulberry32(SEED);
    var cx = W * 0.5;
    var cy = H * 0.46; // matches the exit's restrained amber center

    // The same six-direction polygonal sections the exit closed with —
    // here they tile the viewport at t = 0 and drift outward.
    var dirs = [[0, -1], [1, -0.35], [1, 0.75], [0, 1], [-1, 0.65], [-1, -0.45]];
    var slabs = [];
    for (var i = 0; i < dirs.length; i++) {
      var irr = [];
      for (var j = 0; j < 6; j++) irr.push(0.82 + rnd() * 0.36);
      slabs.push({
        dx: dirs[i][0],
        dy: dirs[i][1],
        delay: (i % 3) * 0.07 + rnd() * 0.05,
        rot: (rnd() - 0.5) * 0.5,
        irr: irr,
      });
    }

    // Fragments pulling toward the screen edges as the veil separates,
    // plus a few that settle toward the hero area before fading.
    var count = small ? 150 : 380;
    var F = 8; // x, y, dx, dy, size, tone, alpha, shard
    var frag = new Float32Array(count * F);
    for (var n = 0; n < count; n++) {
      var o = n * F;
      var ang2 = rnd() * Math.PI * 2;
      var r0 = (0.12 + rnd() * 0.4) * diag * 0.5;
      var x = cx + Math.cos(ang2) * r0;
      var y = cy + Math.sin(ang2) * r0 * 0.8;
      var settler = rnd() < 0.08; // settles toward the hero, not the edge
      var ox = Math.cos(ang2) * (0.35 + rnd() * 0.4) * diag * 0.55;
      var oy = Math.sin(ang2) * (0.35 + rnd() * 0.4) * diag * 0.55;
      frag[o] = x;
      frag[o + 1] = y;
      frag[o + 2] = settler ? (rnd() - 0.5) * 60 : ox;
      frag[o + 3] = settler ? 40 + rnd() * 80 : oy;
      var shard = rnd() < 0.28 ? 1 : 0;
      frag[o + 4] = shard ? 2.5 + rnd() * 5 : 0.8 + rnd() * 1.8;
      frag[o + 5] = rnd();
      frag[o + 6] = 0.22 + rnd() * 0.5;
      frag[o + 7] = shard;
    }
    var shardIrr = [1, 0.94, 1.05, 0.9, 1.02, 0.96];

    var D = small ? 580 : 720; // total entry duration (ms)
    var t0 = 0;

    function frame(now) {
      if (finished) return;
      if (!t0) t0 = now;
      var t = now - t0;
      var k = clamp01(t / D);

      // Overlay owns the cover — the CSS backstop can go on first paint.
      if (root.hasAttribute('data-nazar-entry')) root.removeAttribute('data-nazar-entry');

      var sep = smooth(0.08, 0.61, k); // separation (~60–440ms)
      var rev = smooth(0.61, 1, k); // reveal (~440–720ms)

      // The div background was the initial cover; hand it to the canvas on
      // the very first animated frame so gaps can open between sections.
      overlay.style.background = 'transparent';

      ctx.clearRect(0, 0, W, H);

      // Base tone fades early: the slabs carry the cover from here.
      var baseA = 1 - smooth(0.05, 0.42, k);
      if (baseA > 0.002) {
        ctx.fillStyle = 'rgba(22, 16, 10, ' + baseA.toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
      }

      // Polygonal sections drifting outward (mirror of the exit closure).
      var slabA = (1 - rev) * (1 - sep * 0.35);
      if (slabA > 0.004) {
        for (var s = 0; s < slabs.length; s++) {
          var sl = slabs[s];
          var sk = smooth(sl.delay, 1, sep);
          var px = cx + sl.dx * (diag * 0.2 + diag * 0.62 * sk * Math.abs(sl.dx));
          var py = cy + sl.dy * (diag * 0.16 + diag * 0.58 * sk * Math.abs(sl.dy) * 0.9);
          var r = diag * 0.5 * (1.22 - sk * 0.3);
          ctx.save();
          ctx.translate(px, py);
          ctx.fillStyle = 'rgba(26, 18, 10, ' + (0.55 * slabA).toFixed(3) + ')';
          shardPath(ctx, r * 1.06, sl.rot - sk * 0.18, sl.irr);
          ctx.fill();
          ctx.fillStyle = 'rgba(20, 14, 8, ' + (0.94 * slabA).toFixed(3) + ')';
          shardPath(ctx, r, sl.rot - sk * 0.18, sl.irr);
          ctx.fill();
          ctx.restore();
        }
      }

      // Restrained amber center dissolving — continuity with the exit's
      // closing frame; a subtle hold-phase breath, never a flash.
      var glowA = 0.14 * (1 - smooth(0.15, 0.75, k)) * (1 + 0.15 * Math.sin(k * 14));
      if (glowA > 0.004) {
        var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W * 0.3, 320));
        glow.addColorStop(0, 'rgba(' + AMBER + ', ' + glowA.toFixed(3) + ')');
        glow.addColorStop(1, 'rgba(' + AMBER + ', 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }

      // Fragments: most pull toward the edges with the separation; a few
      // settle downward toward the hero before fading out.
      var fragA = Math.sin(Math.PI * clamp01((k - 0.04) / 0.9));
      if (fragA > 0.01) {
        var e = sep * sep * (2 - sep);
        for (var m = 0; m < count; m++) {
          var q = m * F;
          var fx = frag[q] + frag[q + 2] * e;
          var fy = frag[q + 1] + frag[q + 3] * e;
          var tone = frag[q + 5];
          var col = tone < 0.5 ? DEEP : tone < 0.92 ? AMBER : WARM;
          var a = frag[q + 6] * fragA;
          if (frag[q + 7] === 1) {
            ctx.save();
            ctx.translate(fx, fy);
            ctx.rotate(tone * 6.283 + e * 1.4);
            ctx.fillStyle = 'rgba(' + col + ', ' + (a * 0.7).toFixed(3) + ')';
            shardPath(ctx, frag[q + 4], 0, shardIrr);
            ctx.fill();
            ctx.restore();
          } else {
            ctx.fillStyle = 'rgba(' + col + ', ' + a.toFixed(3) + ')';
            ctx.fillRect(fx - frag[q + 4] / 2, fy - frag[q + 4] / 2, frag[q + 4], frag[q + 4]);
          }
        }
      }

      if (k >= 1) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  // `defer` guarantees the DOM is parsed. Give layout two frames to settle
  // (hero image box, fonts already cached or swapped) before opening, but
  // never wait long — the safety timeout above still rules everything.
  requestAnimationFrame(function () {
    requestAnimationFrame(start);
  });
})();
