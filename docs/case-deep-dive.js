/*
 * Reusable In-Slide Deep Dive Navigation
 * Initializes every .stage-step-panel containing an .ex-dive element.
 * Content lives in docs/index.html; this script only toggles visibility and focus.
 *
 * Overview triggers: any element inside the panel (outside .ex-dive and .orig-slide-footer)
 * carrying data-dive="<id>" (or data-case="<id>").
 * Deep-dive tabs: .ex-dive-tab[data-dive="<id>"] (or [data-case="<id>"]).
 * Deep-dive panels: .ex-case[data-dive="<id>"] (or [data-case="<id>"]).
 * Footer source groups (optional): .ex-footer-group[data-dive-sources="<id>"] (or [data-case-sources="<id>"]).
 *
 * Keyboard while open:
 * - ← / → (and Presenter PageUp / PageDown) step through tabs; stepping past ends closes.
 * - Esc closes citation popover first (via app.js), otherwise closes the deep dive.
 * - Switching slide or section closes any open deep dive automatically.
 */
(() => {
  'use strict';

  const getId = (el) => el?.dataset.dive || el?.dataset.case || '';
  const getSourcesId = (el) => el?.dataset.diveSources || el?.dataset.caseSources || '';

  function initSlideDeepDive(panel) {
    const dive = panel.querySelector('.ex-dive');
    const body = panel.querySelector('.ex-dive-body');
    if (!dive) return;

    const tabs = Array.from(dive.querySelectorAll('.ex-dive-tab'));
    const cases = Array.from(dive.querySelectorAll('.ex-case'));
    const sourceGroups = Array.from(
      panel.querySelectorAll('.ex-footer-group[data-dive-sources], .ex-footer-group[data-case-sources]')
    );
    const order = tabs.map((t) => getId(t)).filter(Boolean);
    let current = null;
    let lastTrigger = null;

    function isPanelVisible() {
      if (!panel.classList.contains('is-active')) return false;
      if (document.body.classList.contains('is-beamer-mode')) {
        const sec = panel.closest('.section-block');
        const stage = panel.closest('.section-stage');
        if (sec && !sec.classList.contains('is-beamer-section')) return false;
        if (stage && !stage.classList.contains('is-beamer-waypoint')) return false;
      }
      return true;
    }

    function show(id) {
      if (!order.includes(id)) return;
      current = id;
      panel.classList.add('is-diving');
      dive.hidden = false;
      tabs.forEach((tab) => {
        const active = getId(tab) === id;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      cases.forEach((c) => {
        c.hidden = getId(c) !== id;
      });
      sourceGroups.forEach((g) => {
        g.hidden = getSourcesId(g) !== id;
      });
      if (body) body.scrollTop = 0;
    }

    function open(id, triggerEl) {
      lastTrigger = triggerEl || null;
      show(id);
      const activeTab = dive.querySelector('.ex-dive-tab.is-active');
      if (activeTab) activeTab.focus({ preventScroll: true });
    }

    function close({ restoreFocus = true } = {}) {
      if (!current) return;
      const last = current;
      current = null;
      panel.classList.remove('is-diving');
      dive.hidden = true;
      sourceGroups.forEach((g) => {
        g.hidden = true;
      });
      if (!restoreFocus) return;
      const target =
        (lastTrigger && document.contains(lastTrigger) && lastTrigger) ||
        panel.querySelector(`.orig-ex-cell[data-case="${last}"]`) ||
        panel.querySelector(`[data-dive="${last}"]:not(.ex-dive-tab):not(.ex-case):not(.ex-compare-link)`);
      if (target) target.focus({ preventScroll: true });
    }

    function step(delta) {
      const idx = order.indexOf(current);
      const next = idx + delta;
      if (next < 0 || next >= order.length) {
        close();
      } else {
        show(order[next]);
        const activeTab = dive.querySelector('.ex-dive-tab.is-active');
        if (activeTab) activeTab.focus({ preventScroll: true });
      }
    }

    panel.addEventListener('click', (e) => {
      if (e.target.closest('.cite-trigger')) return;

      const closeBtn = e.target.closest('.ex-dive-close');
      if (closeBtn) {
        close();
        return;
      }

      const tab = e.target.closest('.ex-dive-tab');
      if (tab) {
        show(getId(tab));
        return;
      }

      const compareLink = e.target.closest('.ex-compare-row, .ex-compare-link');
      if (compareLink) {
        show(getId(compareLink));
        return;
      }

      if (e.target.closest('.ex-dive, .orig-slide-footer')) return;

      const opener = e.target.closest('[data-dive], [data-case]');
      if (opener && panel.contains(opener)) {
        const id = getId(opener);
        if (!order.includes(id)) return;
        const trigger =
          panel.querySelector(`.orig-ex-cell[data-case="${id}"]`) ||
          (opener.hasAttribute('tabindex') || opener.tagName === 'BUTTON' || opener.tagName === 'A'
            ? opener
            : opener.closest('[tabindex], button, a')) ||
          opener;
        open(id, trigger);
      }
    });

    // Keyboard activation (Enter / Space) for comparison rows and non-native overview items
    panel.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const compareRow = e.target.closest('.ex-compare-row');
      if (current && compareRow && panel.contains(compareRow)) {
        e.preventDefault();
        show(getId(compareRow));
        return;
      }
      if (current) return;
      if (e.target.closest('.ex-dive, .orig-slide-footer, .cite-trigger')) return;
      const el = e.target.closest('[data-dive], [data-case]');
      if (!el || !panel.contains(el)) return;
      if (el.tagName === 'BUTTON' || el.tagName === 'A') return;
      const id = getId(el);
      if (!order.includes(id)) return;
      e.preventDefault();
      open(id, el);
    });

    function isDiveOnScreen() {
      if (!isPanelVisible()) return false;
      if (document.body.classList.contains('is-beamer-mode')) return true;
      const r = dive.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
    }

    // Capture phase so we run before the presenter's slide navigation (app.js)
    window.addEventListener(
      'keydown',
      (e) => {
        if (!current) return;
        if (!isPanelVisible()) {
          close({ restoreFocus: false });
          return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;

        if (!isDiveOnScreen()) return;

        if (e.key === 'Escape') {
          const popover = document.getElementById('citePopover');
          if (popover && !popover.hidden) return; // let app.js close the citation popover first
          e.preventDefault();
          e.stopImmediatePropagation();
          close();
          return;
        }

        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          e.preventDefault();
          e.stopImmediatePropagation();
          step(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          e.preventDefault();
          e.stopImmediatePropagation();
          step(-1);
        }
      },
      true
    );

    // Close automatically when leaving the slide, waypoint, or section
    const autoCloseObserver = new MutationObserver(() => {
      if (current && !isPanelVisible()) close({ restoreFocus: false });
    });
    autoCloseObserver.observe(panel, { attributes: true, attributeFilter: ['class'] });
    const sec = panel.closest('.section-block');
    const stage = panel.closest('.section-stage');
    if (sec) autoCloseObserver.observe(sec, { attributes: true, attributeFilter: ['class'] });
    if (stage) autoCloseObserver.observe(stage, { attributes: true, attributeFilter: ['class'] });
  }

  document.querySelectorAll('.stage-step-panel').forEach((panel) => {
    if (panel.querySelector('.ex-dive')) {
      initSlideDeepDive(panel);
    }
  });
})();
