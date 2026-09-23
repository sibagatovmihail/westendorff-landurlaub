/* Designentwurf „Landurlaub bei Westendorff’s“
   Gestaltung und Code © 2026 Mykhailo Sibahatov. Alle Rechte vorbehalten.
   Nur zur Ansicht — keine Nutzung ohne schriftliche Vereinbarung (LICENSE).
   Landurlaub bei Westendorff's — all interactions, no dependencies */
(function () {
  'use strict';

  /* ---------- Licence: the draft only runs where it has been licensed ----------
     Add a domain here once a written agreement is in place. */
  var LICENSED = ['sibagatovmihail.github.io', 'localhost', '127.0.0.1'];
  if (location.protocol !== 'file:' && LICENSED.indexOf(location.hostname) === -1) {
    var lock = document.createElement('div');
    lock.className = 'licence-lock';
    lock.setAttribute('role', 'alertdialog');
    lock.innerHTML = '<div><b>Nicht lizenzierte Kopie</b>' +
      '<p>Diese Website ist ein urheberrechtlich geschützter Designentwurf von Mykhailo Sibahatov und für diese Domain nicht lizenziert.</p>' +
      '<p>Nutzungsrechte: <a href="mailto:sibagatovmihail@gmail.com">sibagatovmihail@gmail.com</a></p></div>';
    var mount = function () { document.body.appendChild(lock); document.documentElement.style.overflow = 'hidden'; };
    if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  }

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mqDesktop = window.matchMedia('(min-width: 48.0625rem)');

  /* ---------- Frozen viewport unit (refresh on width change only) ---------- */
  var vhPx = window.innerHeight;
  function setVH() {
    vhPx = window.innerHeight;
    root.style.setProperty('--vh', (vhPx * 0.01) + 'px');
  }
  setVH();
  var vw0 = window.innerWidth;
  var widthListeners = [];
  window.addEventListener('resize', function () {
    if (window.innerWidth === vw0) return;
    vw0 = window.innerWidth;
    setVH();
    widthListeners.forEach(function (fn) { fn(); });
  });
  function onWidth(fn) { widthListeners.push(fn); }

  /* one rAF-throttled scroll bus */
  var scrollFns = [];
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      scrollFns.forEach(function (fn) { fn(); });
    });
  }, { passive: true });

  /* ---------- Header ---------- */
  var header = document.querySelector('[data-header]');
  if (header) {
    var menuBtn = header.querySelector('[data-menu-btn]');
    var setScrolled = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
    scrollFns.push(setScrolled);
    setScrolled();

    var setOpen = function (open) {
      header.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
    };
    if (menuBtn) {
      menuBtn.addEventListener('click', function () { setOpen(!header.classList.contains('is-open')); });
      header.querySelectorAll('.sheet a').forEach(function (a) {
        a.addEventListener('click', function () { setOpen(false); });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && header.classList.contains('is-open')) { setOpen(false); menuBtn.focus(); }
      });
      window.matchMedia('(min-width: 64.0625rem)').addEventListener('change', function () { setOpen(false); });
    }
  }

  /* ---------- Nav: sliding hover highlight (Jesus Punkt pattern) ---------- */
  var navEl = document.querySelector('.nav');
  if (navEl && !reduced) {
    var glider = document.createElement('span');
    glider.className = 'nav__glider';
    glider.setAttribute('aria-hidden', 'true');
    navEl.prepend(glider);
    var moveTo = function (link) {
      glider.style.left = link.offsetLeft + 'px';
      glider.style.width = link.offsetWidth + 'px';
    };
    var showGlider = function (link) {
      if (!navEl.classList.contains('has-glider')) {
        glider.style.transition = 'none';        // first entry: appear in place, no slide-in from 0
        moveTo(link);
        void glider.offsetWidth;
        glider.style.transition = '';
        navEl.classList.add('has-glider');
      } else {
        moveTo(link);
      }
    };
    var hideGlider = function () { navEl.classList.remove('has-glider'); };
    navEl.querySelectorAll('.nav__link').forEach(function (link) {
      link.addEventListener('mouseenter', function () { showGlider(link); });
      link.addEventListener('focus', function () { showGlider(link); });
      link.addEventListener('blur', hideGlider);
    });
    navEl.addEventListener('mouseleave', hideGlider);
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Statement — words gain their ink as you scroll (smoothed, never raw) ---------- */
  var scrub = document.querySelector('[data-scrub]');
  if (scrub) {
    // split text nodes into word spans; inline pictures count as one "word"
    var units = [];
    Array.prototype.slice.call(scrub.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          var w = document.createElement('span');
          w.className = 'w'; w.textContent = part;
          frag.appendChild(w); units.push(w);
        });
        scrub.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        units.push(node);
      }
    });
    var sTarget = 0, sShown = -1, sRaf = null, sLast = 0;
    var sPaint = function (p) {
      var n = units.length, lit = p * n;
      units.forEach(function (u, i) {
        var k = Math.max(0, Math.min(1, lit - i));        // 0 → 1 across one word
        if (u.classList.contains('inline-pic')) {
          u.style.opacity = 0.25 + 0.75 * k;
          u.style.transform = 'rotate(var(--rot, 0deg)) scale(' + (0.82 + 0.18 * k) + ')';
        } else {
          u.style.opacity = 0.16 + 0.84 * k;
        }
      });
    };
    var pin = scrub.closest('[data-pin]');
    var sProgress = function () {
      if (pin) {
        // pinned: progress = how far through the runway; fill during 0–78 %, then a short hold
        var pr = pin.getBoundingClientRect();
        var run = pr.height - vhPx;
        var p = run > 0 ? -pr.top / run : 1;
        return Math.max(0, Math.min(1, p / 0.78));
      }
      var r = scrub.getBoundingClientRect();
      var start = vhPx * 0.85, end = vhPx * 0.45;
      return Math.max(0, Math.min(1, (start - r.top) / (r.height + start - end)));
    };
    var sLoop = function (now) {
      var dt = Math.min(64, now - (sLast || now)); sLast = now;
      sShown += (sTarget - sShown) * (1 - Math.exp(-dt / 150));
      if (Math.abs(sTarget - sShown) < 0.001) sShown = sTarget;
      sPaint(sShown);
      sRaf = sShown !== sTarget ? requestAnimationFrame(sLoop) : null;
      if (!sRaf) sLast = 0;
    };
    if (reduced) { sPaint(1); if (pin) pin.classList.add('is-static'); }
    else {
      sShown = sTarget = sProgress(); sPaint(sShown);
      scrollFns.push(function () { sTarget = sProgress(); if (!sRaf) sRaf = requestAnimationFrame(sLoop); });
    }
  }

  /* ---------- Unterkünfte — one card open at a time (wide screens only) ---------- */
  var street = document.querySelector('[data-street]');
  if (street) {
    var mqStreet = window.matchMedia('(min-width: 72.0625rem)');
    var houses = Array.prototype.slice.call(street.querySelectorAll('.house'));
    var activate = function (house) {
      if (house.hasAttribute('data-active')) return;
      houses.forEach(function (h) {
        var on = h === house;
        h.toggleAttribute('data-active', on);
        h.querySelector('.house__head').setAttribute('aria-expanded', String(on));
      });
    };
    var hoverTimer, pending = null, lastX = -1, lastY = -1;
    houses.forEach(function (house) {
      house.addEventListener('click', function (e) {
        if (mqStreet.matches && !e.target.closest('a')) activate(house);
      });
      // only a *real* pointer move opens a card — when the row reflows under a
      // resting cursor the browser fires synthetic hover events with unchanged
      // coordinates, which would otherwise cascade the cards open one by one
      house.addEventListener('pointermove', function (e) {
        if (!mqStreet.matches || e.pointerType !== 'mouse') return;
        if (Math.abs(e.clientX - lastX) < 1 && Math.abs(e.clientY - lastY) < 1) return;
        lastX = e.clientX; lastY = e.clientY;
        if (house.hasAttribute('data-active') || pending === house) return;
        clearTimeout(hoverTimer); pending = house;
        hoverTimer = setTimeout(function () { pending = null; activate(house); }, 120);   // intent delay
      });
      house.addEventListener('mouseleave', function () { clearTimeout(hoverTimer); pending = null; });
      house.querySelector('.house__head').addEventListener('focus', function () {
        if (mqStreet.matches) activate(house);
      });
    });
  }

  /* ---------- Prefill the enquiry form from any [data-house] link ---------- */
  var houseSelect = document.getElementById('f-house');
  function prefill(name) {
    if (!houseSelect || !name) return;
    Array.prototype.forEach.call(houseSelect.options, function (o) {
      if (o.text === name) houseSelect.value = o.text;
    });
    if (houseSelect._sync) houseSelect._sync();
  }
  document.querySelectorAll('[data-house]').forEach(function (a) {
    a.addEventListener('click', function () { prefill(a.getAttribute('data-house')); });
  });
  if (houseSelect && houseSelect.dataset.default) prefill(houseSelect.dataset.default);

  /* ---------- Pinnwand — drag the polaroids ---------- */
  var board = document.querySelector('[data-board]');
  if (board) {
    var z = 10;
    board.querySelectorAll('.polaroid').forEach(function (card) {
      var sx, sy, dx0, dy0, bounds, base, pid = null;
      card.addEventListener('pointerdown', function (e) {
        if (!mqDesktop.matches || e.button !== 0) return;
        pid = e.pointerId;
        card.setPointerCapture(pid);
        card.classList.add('is-dragging');
        card.style.zIndex = ++z;
        sx = e.clientX; sy = e.clientY;
        dx0 = parseFloat(card.style.getPropertyValue('--dx')) || 0;
        dy0 = parseFloat(card.style.getPropertyValue('--dy')) || 0;
        bounds = board.getBoundingClientRect();
        var r = card.getBoundingClientRect();
        base = { l: r.left - dx0, t: r.top - dy0, w: r.width, h: r.height };
      });
      card.addEventListener('pointermove', function (e) {
        if (e.pointerId !== pid) return;
        var dx = dx0 + e.clientX - sx;
        var dy = dy0 + e.clientY - sy;
        // keep at least half the card on the board
        dx = Math.max(bounds.left - base.l - base.w / 2, Math.min(bounds.right - base.l - base.w / 2, dx));
        dy = Math.max(bounds.top - base.t - base.h / 3, Math.min(bounds.bottom - base.t - base.h / 2, dy));
        card.style.setProperty('--dx', dx + 'px');
        card.style.setProperty('--dy', dy + 'px');
      });
      var end = function (e) {
        if (e.pointerId !== pid) return;
        pid = null;
        card.classList.remove('is-dragging');
      };
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);
    });
    mqDesktop.addEventListener('change', function () {
      board.querySelectorAll('.polaroid').forEach(function (c) {
        c.style.removeProperty('--dx'); c.style.removeProperty('--dy'); c.style.zIndex = '';
      });
    });
  }

  /* ---------- Ausflüge — topic list (desktop: one always open; phones: accordion) ---------- */
  document.querySelectorAll('[data-guide]').forEach(function (guide) {
    var mqGuide = window.matchMedia('(min-width: 48.0625rem)');
    var cats = Array.prototype.slice.call(guide.querySelectorAll('.cat'));
    var set = function (cat, open) {
      cat.classList.toggle('is-open', open);
      cat.querySelector('.cat__btn').setAttribute('aria-expanded', String(open));
    };
    cats.forEach(function (cat) {
      cat.querySelector('.cat__btn').addEventListener('click', function () {
        var wasOpen = cat.classList.contains('is-open');
        if (mqGuide.matches && wasOpen) return;               // desktop: something is always shown
        cats.forEach(function (c) { set(c, false); });
        if (!wasOpen) set(cat, true);
      });
    });
    mqGuide.addEventListener('change', function (e) {      // back on desktop: never leave the panel empty
      if (e.matches && !cats.some(function (c) { return c.classList.contains('is-open'); })) set(cats[0], true);
    });
  });

  /* ---------- Anreise — marker arrives at mid-screen, dwells, travels on ---------- */
  var route = document.querySelector('[data-route]');
  if (route) {
    var marker = route.querySelector('.route__marker');
    var stops = Array.prototype.slice.call(route.querySelectorAll('.stop'));
    var nodes = stops.map(function (s) { return s.querySelector('.stop__node'); });
    var axis = 'x', pos = [], anchors = [], rendered = 0, target = 0, raf = null, last = 0;
    var DWELL = 0.4;
    var easeSine = function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; };

    var measure = function () {
      axis = getComputedStyle(route).getPropertyValue('--track-axis').trim() || 'x';
      var rects = nodes.map(function (n) { return n.getBoundingClientRect(); });
      var c0 = axis === 'x' ? rects[0].left + rects[0].width / 2 : rects[0].top + rects[0].height / 2;
      pos = rects.map(function (r) {
        return (axis === 'x' ? r.left + r.width / 2 : r.top + r.height / 2) - c0;
      });
      var sy = window.scrollY;
      if (axis === 'y') {
        // each village is reached exactly when it crosses the middle of the screen
        anchors = rects.map(function (r) { return r.top + r.height / 2 + sy - vhPx / 2; });
      } else {
        // one horizontal line: spread the legs across the line's pass through the lower 2/3 of the screen,
        // ~0.7px of scroll per px travelled, never less than 0.6 screens overall
        var lineY = rects[0].top + sy;
        var span = Math.max(vhPx * 0.6, Math.min(pos[pos.length - 1] * 0.7, vhPx * 0.62));
        var start = lineY - vhPx * 0.82;
        anchors = pos.map(function (_, i) { return start + span * i / (pos.length - 1); });
      }
    };
    var targetFor = function (s) {
      if (s <= anchors[0]) return 0;
      var n = anchors.length - 1;
      if (s >= anchors[n]) return pos[n];
      for (var i = 0; i < n; i++) {
        if (s < anchors[i + 1]) {
          var u = (s - anchors[i]) / (anchors[i + 1] - anchors[i]);
          var t = u < DWELL ? 0 : easeSine((u - DWELL) / (1 - DWELL));
          return pos[i] + (pos[i + 1] - pos[i]) * t;
        }
      }
      return pos[n];
    };
    var paint = function (v) {
      marker.style.setProperty('--mx', axis === 'x' ? v + 'px' : '0px');
      marker.style.setProperty('--my', axis === 'y' ? v + 'px' : '0px');
      route.style.setProperty('--done', Math.max(0, v) + 'px');
      stops.forEach(function (s, i) { s.classList.toggle('is-reached', v >= pos[i] - 2); });
    };
    var loop = function (now) {
      var dt = Math.min(64, now - (last || now));
      last = now;
      // never apply the scroll position raw — glide toward it (~150ms)
      rendered += (target - rendered) * (1 - Math.exp(-dt / 150));
      if (Math.abs(target - rendered) < 0.4) rendered = target;
      paint(rendered);
      raf = rendered !== target ? requestAnimationFrame(loop) : null;
      if (!raf) last = 0;
    };
    var update = function () {
      target = targetFor(window.scrollY);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    var init = function () {
      measure();
      if (reduced) { rendered = target = pos[pos.length - 1]; paint(rendered); return; }
      target = rendered = targetFor(window.scrollY);
      paint(rendered);
    };
    init();
    if (!reduced) scrollFns.push(update);
    onWidth(init);
    window.addEventListener('load', init);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
  }

  /* ---------- Custom dropdowns — the native <select> stays for value + validation ---------- */
  var closeAllPopups = function (except) {
    document.querySelectorAll('.select.is-open').forEach(function (w) { if (w !== except) w._close(); });
    document.querySelectorAll('[data-range].is-open').forEach(function (w) { if (w !== except) w._close(); });
  };
  var uid = 0;
  document.querySelectorAll('[data-form] select.input').forEach(function (sel) {
    var wrap = document.createElement('div');
    wrap.className = 'select';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('select__native');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');

    var id = sel.id || ('sel' + (++uid));
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'input select__btn';
    btn.id = id + '-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span class="select__val"></span><svg class="i select__chev" aria-hidden="true"><use href="#i-chev"/></svg>';
    var label = document.querySelector('label[for="' + sel.id + '"]');
    if (label) { label.htmlFor = btn.id; label.id = label.id || id + '-lbl'; btn.setAttribute('aria-labelledby', label.id + ' ' + btn.id); }

    var list = document.createElement('ul');
    list.className = 'select__list';
    list.id = id + '-list';
    list.setAttribute('role', 'listbox');
    list.tabIndex = -1;
    if (label) list.setAttribute('aria-labelledby', label.id);
    btn.setAttribute('aria-controls', list.id);
    var opts = Array.prototype.map.call(sel.options, function (o, i) {
      var li = document.createElement('li');
      li.id = id + '-o' + i;
      li.setAttribute('role', 'option');
      li.dataset.index = i;
      li.innerHTML = '<span>' + o.text + '</span><svg class="i" aria-hidden="true"><use href="#i-check"/></svg>';
      if (o.value === '') li.classList.add('is-placeholder');
      list.appendChild(li);
      return li;
    });
    wrap.appendChild(btn);
    wrap.appendChild(list);

    var active = sel.selectedIndex;
    var sync = function () {
      var o = sel.options[sel.selectedIndex];
      btn.querySelector('.select__val').textContent = o ? o.text : '';
      btn.classList.toggle('is-empty', !o || o.value === '');
      opts.forEach(function (li, i) { li.setAttribute('aria-selected', String(i === sel.selectedIndex)); });
    };
    var mark = function (i) {
      active = Math.max(0, Math.min(opts.length - 1, i));
      opts.forEach(function (li, k) { li.classList.toggle('is-active', k === active); });
      list.setAttribute('aria-activedescendant', opts[active].id);
      var li = opts[active];
      if (li.offsetTop < list.scrollTop) list.scrollTop = li.offsetTop - 4;
      else if (li.offsetTop + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = li.offsetTop + li.offsetHeight - list.clientHeight + 4;
    };
    var open = function () {
      closeAllPopups(wrap);
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      // flip upward when there's no room below
      var r = btn.getBoundingClientRect();
      wrap.classList.toggle('is-up', vhPx - r.bottom < 260 && r.top > vhPx - r.bottom);
      mark(sel.selectedIndex < 0 ? 0 : sel.selectedIndex);
      list.focus({ preventScroll: true });
    };
    var close = function (focusBtn) {
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (focusBtn) btn.focus({ preventScroll: true });
    };
    wrap._close = function () { close(false); };
    var choose = function (i) {
      sel.selectedIndex = i;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      sync();
      close(true);
    };
    btn.addEventListener('click', function () { wrap.classList.contains('is-open') ? close(true) : open(); });
    btn.addEventListener('keydown', function (e) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(e.key) > -1) { e.preventDefault(); open(); }
    });
    var typed = '', typedT;
    list.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); mark(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mark(active - 1); }
      else if (e.key === 'Home') { e.preventDefault(); mark(0); }
      else if (e.key === 'End') { e.preventDefault(); mark(opts.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active); }
      else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') { close(false); }
      else if (e.key.length === 1) {                       // type-ahead
        typed += e.key.toLowerCase(); clearTimeout(typedT);
        typedT = setTimeout(function () { typed = ''; }, 600);
        for (var k = 0; k < opts.length; k++) {
          if (sel.options[k].text.toLowerCase().indexOf(typed) === 0) { mark(k); break; }
        }
      }
    });
    opts.forEach(function (li, i) {
      li.addEventListener('click', function () { choose(i); });
      li.addEventListener('mousemove', function () { if (active !== i) mark(i); });
    });
    sel.addEventListener('change', sync);               // programmatic changes (prefill)
    sel._sync = sync;
    sync();
  });

  /* ---------- Range calendar for Anreise / Abreise ---------- */
  var MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  var DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parse = function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var sameDay = function (a, b) { return a && b && a.getTime() === b.getTime(); };
  var mqTwo = window.matchMedia('(min-width: 80rem), (min-width: 48.0625rem) and (max-width: 56rem)');   // two months only where the form is wide enough

  document.querySelectorAll('[data-range]').forEach(function (field) {
    var btns = { from: field.querySelector('[data-end="from"]'), to: field.querySelector('[data-end="to"]') };
    var vals = { from: field.querySelector('[data-value="from"]'), to: field.querySelector('[data-value="to"]') };
    var cal = field.querySelector('.cal');
    var today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var st = { from: null, to: null, end: 'from', view: new Date(today.getFullYear(), today.getMonth(), 1), hover: null, focus: null };

    var mqNarrow = window.matchMedia('(max-width: 37.5rem)');
    var fmt = function (d) {                      // phones: drop the weekday so the date never truncates
      return d.toLocaleDateString('de-DE', mqNarrow.matches ? { day: 'numeric', month: 'short', year: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };
    var out = function () {
      ['from', 'to'].forEach(function (k) {
        var d = st[k];
        btns[k].querySelector('[data-out]').textContent = d ? fmt(d) : 'Datum wählen';
        btns[k].classList.toggle('is-empty', !d);
        btns[k].classList.toggle('is-current', field.classList.contains('is-open') && st.end === k);
        vals[k].value = d ? iso(d) : '';
      });
    };
    var nights = function () { return st.from && st.to ? Math.round((st.to - st.from) / 864e5) : 0; };

    var render = function () {
      var n = mqTwo.matches ? 2 : 1;
      var html = '<div class="cal__head"><button type="button" class="cal__nav" data-nav="-1" aria-label="Vorheriger Monat"><svg class="i"><use href="#i-chev"/></svg></button>' +
        '<p class="cal__hint">' + (st.end === 'from' ? 'Anreisetag wählen' : 'Abreisetag wählen') + '</p>' +
        '<button type="button" class="cal__nav" data-nav="1" aria-label="Nächster Monat"><svg class="i"><use href="#i-chev"/></svg></button></div><div class="cal__months">';
      var lo = st.from, hi = st.to || (st.end === 'to' && st.from && st.hover && st.hover > st.from ? st.hover : null);
      for (var m = 0; m < n; m++) {
        var first = new Date(st.view.getFullYear(), st.view.getMonth() + m, 1);
        var lead = (first.getDay() + 6) % 7;
        var len = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
        html += '<div class="cal__month"><p class="cal__title">' + MONTHS[first.getMonth()] + ' ' + first.getFullYear() + '</p><div class="cal__grid" role="grid">';
        DAYS.forEach(function (d) { html += '<span class="cal__dow" aria-hidden="true">' + d + '</span>'; });
        for (var e = 0; e < lead; e++) html += '<span></span>';
        for (var day = 1; day <= len; day++) {
          var d = new Date(first.getFullYear(), first.getMonth(), day);
          var cls = ['cal__day'];
          if (sameDay(d, today)) cls.push('is-today');
          if (sameDay(d, st.from)) cls.push('is-start');
          if (sameDay(d, st.to) || (!st.to && sameDay(d, hi))) cls.push('is-end');
          if (lo && hi && d > lo && d < hi) cls.push(st.to ? 'in-range' : 'in-preview');
          if (lo && hi && sameDay(d, lo)) cls.push('band-r');
          if (lo && hi && sameDay(d, hi)) cls.push('band-l');
          var dis = d < today;
          var label = d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          html += '<button type="button" class="' + cls.join(' ') + '" data-date="' + iso(d) + '"' + (dis ? ' disabled' : '') +
            ' aria-label="' + label + '"' + (sameDay(d, st.from) || sameDay(d, st.to) ? ' aria-pressed="true"' : '') +
            ' tabindex="' + (sameDay(d, st.focus) ? '0' : '-1') + '">' + day + '</button>';
        }
        html += '</div></div>';
      }
      var nn = nights();
      html += '</div><div class="cal__foot"><span>' + (nn ? nn + (nn === 1 ? ' Nacht' : ' Nächte') : (st.from ? 'Anreise: ' + fmt(st.from) : 'Noch nichts gewählt')) + '</span>' +
        '<button type="button" class="cal__reset"' + (st.from ? '' : ' disabled') + '>Zurücksetzen</button></div>';
      cal.innerHTML = html;
      out();
    };
    var focusDay = function () {
      var b = cal.querySelector('[data-date="' + iso(st.focus) + '"]');
      if (b) b.focus({ preventScroll: true });
    };
    var openCal = function (end) {
      closeAllPopups(field);
      st.end = end === 'to' && !st.from ? 'from' : end;
      var anchor = (st.end === 'to' ? st.to || st.from : st.from) || today;
      st.view = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      st.focus = anchor < today ? today : anchor;
      field.classList.add('is-open');
      cal.hidden = false;
      btns.from.setAttribute('aria-expanded', 'true'); btns.to.setAttribute('aria-expanded', 'true');
      render(); focusDay();
    };
    var closeCal = function (refocus) {
      field.classList.remove('is-open');
      cal.hidden = true;
      btns.from.setAttribute('aria-expanded', 'false'); btns.to.setAttribute('aria-expanded', 'false');
      out();
      if (refocus) btns[st.end].focus({ preventScroll: true });
    };
    field._close = function () { closeCal(false); };
    var pick = function (d) {
      if (st.end === 'from' || !st.from || d <= st.from) {
        st.from = d; if (st.to && st.to <= d) st.to = null;
        st.end = 'to'; st.focus = d; render(); focusDay();
      } else {
        st.to = d; st.focus = d; render();
        field.classList.remove('is-invalid');
        setTimeout(function () { closeCal(true); }, 220);   // a beat to see the range land
      }
    };
    btns.from.addEventListener('click', function () { field.classList.contains('is-open') && st.end === 'from' ? closeCal(true) : openCal('from'); });
    btns.to.addEventListener('click', function () { field.classList.contains('is-open') && st.end === 'to' ? closeCal(true) : openCal('to'); });
    cal.addEventListener('click', function (e) {
      var t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.nav) { st.view = new Date(st.view.getFullYear(), st.view.getMonth() + (+t.dataset.nav), 1); render(); return; }
      if (t.classList.contains('cal__reset')) { st.from = st.to = null; st.end = 'from'; render(); return; }
      if (t.dataset.date) pick(parse(t.dataset.date));
    });
    cal.addEventListener('mouseover', function (e) {
      var t = e.target.closest('.cal__day');
      if (!t || st.end !== 'to' || !st.from || st.to) return;
      var d = parse(t.dataset.date);
      if (!sameDay(d, st.hover)) { st.hover = d; render(); }
    });
    cal.addEventListener('keydown', function (e) {
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (e.key === 'Escape') { e.preventDefault(); closeCal(true); return; }
      if (!step || !e.target.dataset.date) return;
      e.preventDefault();
      var d = parse(e.target.dataset.date);
      d.setDate(d.getDate() + step);
      if (d < today) return;
      st.focus = d;
      var n = mqTwo.matches ? 2 : 1;
      var lastShown = new Date(st.view.getFullYear(), st.view.getMonth() + n, 0);
      if (d < st.view || d > lastShown) st.view = new Date(d.getFullYear(), d.getMonth() - (d > lastShown ? n - 1 : 0), 1);
      if (st.end === 'to' && st.from && !st.to) st.hover = d;
      render(); focusDay();
    });
    document.addEventListener('pointerdown', function (e) {
      if (field.classList.contains('is-open') && !field.contains(e.target)) closeCal(false);
    });
    mqTwo.addEventListener('change', function () { if (field.classList.contains('is-open')) render(); });
    out();
  });
  document.addEventListener('pointerdown', function (e) {
    document.querySelectorAll('.select.is-open').forEach(function (w) { if (!w.contains(e.target)) w._close(); });
  });

  /* ---------- Enquiry form (pitch build: simulated send) ---------- */
  document.querySelectorAll('[data-form]').forEach(function (form) {
    var control = function (field) {
      return field.querySelector('.select__btn, .dates__btn, input:not([type="hidden"]), textarea');
    };
    var check = function (field) {
      var ok;
      if (field.hasAttribute('data-range')) {
        var f = field.querySelector('[data-value="from"]').value, t = field.querySelector('[data-value="to"]').value;
        ok = !!f && !!t && t > f;
      } else {
        var input = field.querySelector('select, input:not([type="hidden"]), textarea');
        if (!input) return true;
        ok = input.checkValidity();
      }
      field.classList.toggle('is-invalid', !ok);
      return ok;
    };
    form.querySelectorAll('.field').forEach(function (f) {
      var input = f.querySelector('select, input:not([type="hidden"]), textarea');
      if (!input) return;
      input.addEventListener('blur', function () { if (f.classList.contains('is-invalid') || input.value) check(f); });
      input.addEventListener('change', function () { if (f.classList.contains('is-invalid')) check(f); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.querySelector('.hp').value) return;                 // honeypot
      var bad = Array.prototype.filter.call(form.querySelectorAll('.field'), function (f) { return !check(f); });
      if (bad.length) { var c = control(bad[0]); if (c) c.focus(); return; }
      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      setTimeout(function () {                                      // Production: POST to Web3Forms here
        form.classList.add('is-sent');
        form.querySelector('.form__done').focus();
      }, 600);
    });
  });

  /* ---------- House page: lightbox ---------- */
  var lb = document.querySelector('[data-lightbox]');
  if (lb && typeof lb.showModal === 'function') {
    var items = Array.prototype.slice.call(document.querySelectorAll('[data-lb]'));
    var seen = {};
    var slides = [];
    items.forEach(function (el) {
      var img = el.querySelector('img');
      var src = img.getAttribute('src');
      if (!(src in seen)) { seen[src] = slides.length; slides.push({ src: src, cap: el.getAttribute('data-cap') || img.alt }); }
      el.addEventListener('click', function () { openLb(seen[src]); });
    });
    var lbImg = lb.querySelector('.lightbox__stage img');
    var lbCap = lb.querySelector('.lightbox__cap');
    var lbCount = lb.querySelector('.lightbox__count');
    var cur = 0;
    var show = function (i) {
      cur = (i + slides.length) % slides.length;
      lbImg.src = slides[cur].src;
      lbImg.alt = slides[cur].cap;
      lbCap.textContent = slides[cur].cap;
      lbCount.textContent = (cur + 1) + ' / ' + slides.length;
    };
    var openLb = function (i) { show(i); lb.showModal(); root.classList.add('menu-open'); };
    lb.addEventListener('close', function () { root.classList.remove('menu-open'); });
    lb.querySelector('[data-lb-close]').addEventListener('click', function () { lb.close(); });
    lb.querySelector('[data-lb-prev]').addEventListener('click', function () { show(cur - 1); });
    lb.querySelector('[data-lb-next]').addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') show(cur + 1);
      if (e.key === 'ArrowLeft') show(cur - 1);
    });
    var stage = lb.querySelector('.lightbox__stage');
    var px = null;
    stage.addEventListener('pointerdown', function (e) { px = e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (px === null) return;
      var d = e.clientX - px; px = null;
      if (Math.abs(d) > 50) show(cur + (d < 0 ? 1 : -1));
    });
    document.querySelectorAll('[data-lb-all]').forEach(function (b) {
      b.addEventListener('click', function () { openLb(0); });
    });
  }

  /* ---------- House page: tour scrollspy ---------- */
  var tourIndex = document.querySelector('[data-tour-index]');
  if (tourIndex && 'IntersectionObserver' in window) {
    var links = Array.prototype.slice.call(tourIndex.querySelectorAll('a'));
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var a = byId[en.target.id];
        links.forEach(function (l) { l.classList.toggle('is-current', l === a); });
        if (a && tourIndex.scrollWidth > tourIndex.clientWidth) {
          tourIndex.scrollTo({ left: a.offsetLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('.room[id]').forEach(function (r) { spy.observe(r); });
  }

  /* ---------- House page: mobile price bar ---------- */
  var buybar = document.querySelector('[data-buybar]');
  if (buybar && 'IntersectionObserver' in window) {
    var state = { hero: true, form: false, foot: false };
    var syncBar = function () { buybar.classList.toggle('is-shown', !state.hero && !state.form && !state.foot); };
    var watch = function (sel, key) {
      var el = document.querySelector(sel);
      if (!el) return;
      new IntersectionObserver(function (en) { state[key] = en[0].isIntersecting; syncBar(); }).observe(el);
    };
    watch('[data-p-hero]', 'hero');
    watch('#anfrage', 'form');
    watch('.footer', 'foot');
  }
})();
