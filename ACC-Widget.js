(function () {
  'use strict';
  if (document.getElementById('acc-widget-root')) return;

  /* ═══════════════════════════════════════════════════════
     ACC ACCESSIBILITY WIDGET v2  |  acclogo embedded
  ═══════════════════════════════════════════════════════ */

  const ACC_LOGO = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22%230f1117%22%2F%3E%3Crect%20width%3D%2262%22%20height%3D%2262%22%20x%3D%221%22%20y%3D%221%22%20rx%3D%2213%22%20fill%3D%22none%22%20stroke%3D%22%232a2d3e%22%20stroke-width%3D%221.5%22%2F%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2214%22%20r%3D%225.5%22%20fill%3D%22%234f8ef7%22%2F%3E%3Cpath%20d%3D%22M32%2021%20L32%2039%22%20stroke%3D%22%234f8ef7%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%3Cpath%20d%3D%22M13%2027%20L32%2023%20L51%2027%22%20stroke%3D%22%2338d9a9%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20fill%3D%22none%22%2F%3E%3Cpath%20d%3D%22M32%2039%20L22%2053%22%20stroke%3D%22%2338d9a9%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%3Cpath%20d%3D%22M32%2039%20L42%2053%22%20stroke%3D%22%2338d9a9%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E';

  const auditHistory = [];

  // ── Font link
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
  document.head.appendChild(fontLink);

  // ══════════════════════════════════════════
  // 1. STYLES
  // ══════════════════════════════════════════
  const style = document.createElement('style');
  style.id = 'acc-widget-styles';
  style.textContent = `
    :root {
      --acc-dark:    #0a1628;
      --acc-panel:   #0d1f3c;
      --acc-surface: #112244;
      --acc-border:  #1e3a6b;
      --acc-accent:  #4f8ef7;
      --acc-accent2: #38d9a9;
      --acc-warn:    #f5a623;
      --acc-error:   #f75f5f;
      --acc-text:    #e8edf8;
      --acc-muted:   #8a9bbf;
      --acc-font:    'Sora', sans-serif;
      --acc-mono:    'JetBrains Mono', monospace;
    }

    /* ── Toggle button ── */
    #acc-toggle {
      position: fixed; bottom: 24px; right: 24px;
      width: 62px; height: 62px; border-radius: 16px;
      background: var(--acc-dark);
      border: 1.5px solid var(--acc-border);
      cursor: pointer; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 3px;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
      z-index: 2147483646; padding: 0; outline: none;
      transition: transform .2s, box-shadow .3s, border-color .2s;
    }
    #acc-toggle:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,.6), 0 0 0 4px rgba(79,142,247,.2); border-color: var(--acc-accent); }
    #acc-toggle:focus-visible { outline: 3px solid var(--acc-accent) !important; outline-offset: 3px !important; }
    #acc-toggle img { width: 36px; height: 36px; object-fit: contain; }
    #acc-toggle-label { display: none; }

    /* ── Panel ── */
    #acc-panel {
      position: fixed; bottom: 100px; right: 24px;
      width: min(400px, calc(100vw - 48px)); max-height: 86vh;
      background: var(--acc-panel);
      border: 1px solid var(--acc-border);
      border-radius: 20px;
      box-shadow: 0 24px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.04) inset;
      z-index: 2147483645; overflow: hidden;
      display: flex; flex-direction: column;
      transform: scale(.92) translateY(16px); opacity: 0; pointer-events: none;
      transition: transform .3s cubic-bezier(.34,1.56,.64,1), opacity .2s;
      font-family: var(--acc-font); box-sizing: border-box;
    }
    #acc-panel.acc-open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    #acc-panel * { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Wix iframe mode ── */
    body.acc-in-iframe { overflow: hidden; }
    body.acc-in-iframe #acc-toggle { position: absolute !important; bottom: 10px !important; right: 10px !important; }
    body.acc-in-iframe #acc-panel  { position: absolute !important; overflow-y: auto !important; }

    /* ── Header ── */
    .acc-header { background: linear-gradient(135deg, #0a1628 0%, #0d1f3c 100%); border-bottom: 1px solid var(--acc-border); padding: 16px 18px 0; flex-shrink: 0; }
    .acc-header-top { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .acc-header-logo { width: 32px; height: 32px; object-fit: contain; filter: brightness(1.15) drop-shadow(0 0 6px rgba(79,142,247,.3)); }
    .acc-header-title { flex: 1; }
    .acc-header-title h2 { font-size: .9rem; font-weight: 700; color: var(--acc-text); letter-spacing: .05em; text-transform: uppercase; }
    .acc-header-title p { font-size: .7rem; color: var(--acc-muted); margin-top: 1px; }
    .acc-close-btn { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--acc-border); background: var(--acc-surface); color: var(--acc-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: background .15s, color .15s; }
    .acc-close-btn:hover { background: var(--acc-border); color: var(--acc-text); }
    .acc-close-btn:focus-visible { outline: 2px solid var(--acc-accent); outline-offset: 2px; }

    /* ── Active profile badge in header ── */
    .acc-active-profile-badge {
      display: none; align-items: center; gap: 6px;
      background: rgba(56,217,169,.12); border: 1px solid rgba(56,217,169,.3);
      border-radius: 6px; padding: 4px 10px; margin-bottom: 10px;
      font-size: .68rem; font-weight: 600; color: var(--acc-accent2);
    }
    .acc-active-profile-badge.visible { display: flex; }
    .acc-active-profile-badge button {
      background: none; border: none; color: var(--acc-muted); cursor: pointer;
      font-size: .7rem; margin-left: auto; padding: 0 2px;
      transition: color .15s;
    }
    .acc-active-profile-badge button:hover { color: var(--acc-error); }

    /* ── Tabs ── */
    .acc-tabs { display: flex; gap: 1px; padding-bottom: 0; overflow-x: auto; scrollbar-width: none; }
    .acc-tabs::-webkit-scrollbar { display: none; }
    .acc-tab { flex: 1; padding: 9px 4px; font-size: .65rem; font-weight: 600; color: var(--acc-muted); cursor: pointer; border: none; background: none; letter-spacing: .03em; text-transform: uppercase; border-bottom: 2px solid transparent; transition: color .15s, border-color .15s; font-family: var(--acc-font); white-space: nowrap; }
    .acc-tab.acc-active { color: var(--acc-accent); border-bottom-color: var(--acc-accent); }
    .acc-tab:focus-visible { outline: 2px solid var(--acc-accent); outline-offset: -2px; }

    /* ── Tab panels ── */
    .acc-panel-content { display: none; flex: 1; overflow-y: auto; flex-direction: column; }
    .acc-panel-content.acc-active { display: flex; }
    .acc-panel-content::-webkit-scrollbar { width: 4px; }
    .acc-panel-content::-webkit-scrollbar-track { background: transparent; }
    .acc-panel-content::-webkit-scrollbar-thumb { background: var(--acc-border); border-radius: 4px; }
    .acc-body { padding: 14px; display: flex; flex-direction: column; gap: 7px; flex: 1; }

    /* ── Section label ── */
    .acc-section { font-size: .63rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--acc-muted); margin: 6px 0 2px; font-family: var(--acc-mono); display: flex; align-items: center; gap: 6px; }
    .acc-section::after { content: ''; flex: 1; height: 1px; background: var(--acc-border); }

    /* ── Toggle row ── */
    .acc-row { display: flex; align-items: center; justify-content: space-between; background: var(--acc-surface); border: 1px solid var(--acc-border); border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: background .15s, border-color .15s; user-select: none; }
    .acc-row:hover { background: #0f2a50; border-color: #1a3a6b; }
    .acc-row.acc-on { background: rgba(79,142,247,.08); border-color: rgba(79,142,247,.35); }
    .acc-row:focus-visible { outline: 2px solid var(--acc-accent); outline-offset: 2px; }
    .acc-row-label { display: flex; align-items: center; gap: 9px; font-size: .83rem; font-weight: 500; color: var(--acc-text); }
    .acc-row-icon { font-size: 1.1rem; line-height: 1; width: 22px; text-align: center; }
    .acc-row-sub { font-size: .68rem; color: var(--acc-muted); margin-top: 1px; }
    .acc-switch { width: 36px; height: 20px; background: var(--acc-border); border-radius: 99px; position: relative; transition: background .2s; flex-shrink: 0; }
    .acc-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: transform .2s; box-shadow: 0 1px 4px rgba(0,0,0,.3); }
    .acc-row.acc-on .acc-switch { background: var(--acc-accent); }
    .acc-row.acc-on .acc-switch::after { transform: translateX(16px); }

    /* ── Stepper ── */
    .acc-stepper { display: flex; align-items: center; justify-content: space-between; background: var(--acc-surface); border: 1px solid var(--acc-border); border-radius: 10px; padding: 9px 12px; }
    .acc-stepper-label { font-size: .83rem; font-weight: 500; color: var(--acc-text); display: flex; align-items: center; gap: 9px; }
    .acc-stepper-ctrl { display: flex; align-items: center; gap: 8px; }
    .acc-step-btn { width: 26px; height: 26px; border-radius: 7px; border: 1px solid var(--acc-border); background: var(--acc-dark); color: var(--acc-text); font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s; font-weight: 700; line-height: 1; padding: 0; font-family: inherit; }
    .acc-step-btn:hover { background: var(--acc-border); }
    .acc-step-btn:focus-visible { outline: 2px solid var(--acc-accent); }
    .acc-step-val { font-size: .8rem; font-family: var(--acc-mono); min-width: 42px; text-align: center; color: var(--acc-accent); font-weight: 500; }

    /* ── Select row ── */
    .acc-select-row { background: var(--acc-surface); border: 1px solid var(--acc-border); border-radius: 10px; padding: 9px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .acc-select-row select { background: var(--acc-dark); border: 1px solid var(--acc-border); border-radius: 6px; color: var(--acc-accent); font-family: var(--acc-mono); font-size: .78rem; padding: 4px 8px; outline: none; cursor: pointer; }
    .acc-select-row select:focus { border-color: var(--acc-accent); }

    /* ── Align buttons ── */
    .acc-align-row { background: var(--acc-surface); border: 1px solid var(--acc-border); border-radius: 10px; padding: 9px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .acc-align-btns { display: flex; gap: 4px; }
    .acc-align-btn { width: 30px; height: 26px; border-radius: 6px; border: 1px solid var(--acc-border); background: var(--acc-dark); color: var(--acc-muted); font-size: .85rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .15s, border-color .15s, color .15s; padding: 0; }
    .acc-align-btn:hover { background: var(--acc-border); }
    .acc-align-btn.acc-active-align { background: rgba(79,142,247,.15); border-color: var(--acc-accent); color: var(--acc-accent); }

    /* ── Colour swatches ── */
    .acc-colors-box { background: var(--acc-surface); border: 1px solid var(--acc-border); border-radius: 10px; padding: 11px 12px; }
    .acc-colors-label { font-size: .83rem; font-weight: 500; color: var(--acc-text); margin-bottom: 9px; display: flex; align-items: center; gap: 8px; }
    .acc-swatches { display: flex; gap: 7px; flex-wrap: wrap; }
    .acc-swatch { width: 30px; height: 30px; border-radius: 8px; border: 2px solid transparent; cursor: pointer; transition: transform .15s, border-color .15s, box-shadow .15s; outline: none; padding: 0; font-size: .6rem; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .acc-swatch:hover { transform: scale(1.1); }
    .acc-swatch:focus-visible { outline: 2px solid var(--acc-accent); }
    .acc-swatch.acc-picked { border-color: var(--acc-accent) !important; box-shadow: 0 0 0 3px rgba(79,142,247,.25); transform: scale(1.1); }

    /* ── Reset ── */
    .acc-reset { width: 100%; padding: 10px; border-radius: 10px; margin-top: 2px; border: 1px solid rgba(247,95,95,.3); background: rgba(247,95,95,.08); color: var(--acc-error); font-size: .82rem; font-weight: 600; cursor: pointer; font-family: var(--acc-font); transition: background .15s; }
    .acc-reset:hover { background: rgba(247,95,95,.15); }
    .acc-reset:focus-visible { outline: 2px solid var(--acc-error); }

    /* ════════════════════════════════════
       PROFILES TAB
    ════════════════════════════════════ */
    .acc-profiles-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .acc-profiles-intro { font-size: .78rem; color: var(--acc-muted); line-height: 1.6; padding: 10px 12px; background: rgba(79,142,247,.06); border: 1px solid rgba(79,142,247,.15); border-radius: 10px; }
    .acc-profile-card {
      background: var(--acc-surface); border: 1px solid var(--acc-border);
      border-radius: 12px; padding: 14px; cursor: pointer;
      transition: border-color .2s, background .2s, transform .15s;
      display: flex; align-items: center; gap: 12px;
      user-select: none;
    }
    .acc-profile-card:hover { border-color: rgba(79,142,247,.4); background: #0f2a50; transform: translateY(-1px); }
    .acc-profile-card.acc-profile-active { border-color: var(--acc-accent2); background: rgba(56,217,169,.07); }
    .acc-profile-card:focus-visible { outline: 2px solid var(--acc-accent); outline-offset: 2px; }
    .acc-profile-icon { font-size: 1.8rem; width: 44px; height: 44px; border-radius: 10px; background: rgba(79,142,247,.08); border: 1px solid rgba(79,142,247,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .acc-profile-card.acc-profile-active .acc-profile-icon { background: rgba(56,217,169,.12); border-color: rgba(56,217,169,.3); }
    .acc-profile-info { flex: 1; }
    .acc-profile-name { font-size: .88rem; font-weight: 700; color: var(--acc-text); margin-bottom: 3px; }
    .acc-profile-desc { font-size: .7rem; color: var(--acc-muted); line-height: 1.5; }
    .acc-profile-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .acc-profile-tag { font-size: .58rem; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(79,142,247,.1); color: var(--acc-accent); text-transform: uppercase; letter-spacing: .05em; }
    .acc-profile-check { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--acc-border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: .7rem; transition: background .2s, border-color .2s; }
    .acc-profile-card.acc-profile-active .acc-profile-check { background: var(--acc-accent2); border-color: var(--acc-accent2); color: #fff; }

    /* ── Auto-Fix Tab ── */
    .acc-fix-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .acc-score-card { background: linear-gradient(135deg, #0a1628, #0d1f3c); border: 1px solid var(--acc-border); border-radius: 14px; padding: 18px; text-align: center; position: relative; overflow: hidden; }
    .acc-score-card::before { content: ''; position: absolute; top: -40px; right: -40px; width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle, rgba(79,142,247,.12), transparent 70%); }
    .acc-score-ring { width: 80px; height: 80px; margin: 0 auto 10px; border-radius: 50%; background: var(--acc-surface); border: 3px solid var(--acc-border); display: flex; align-items: center; justify-content: center; position: relative; }
    .acc-score-num { font-size: 1.8rem; font-weight: 700; color: var(--acc-text); font-family: var(--acc-mono); line-height: 1; }
    .acc-score-label { font-size: .65rem; color: var(--acc-muted); text-transform: uppercase; letter-spacing: .1em; margin-top: 2px; }
    .acc-score-sub { font-size: .72rem; color: var(--acc-muted); margin-top: 8px; }
    .acc-stats { display: flex; justify-content: center; gap: 20px; margin-top: 12px; }
    .acc-stat { text-align: center; }
    .acc-stat-n { font-size: 1.1rem; font-weight: 700; font-family: var(--acc-mono); }
    .acc-stat-n.g { color: var(--acc-accent2); }
    .acc-stat-n.y { color: var(--acc-warn); }
    .acc-stat-n.r { color: var(--acc-error); }
    .acc-stat-l { font-size: .6rem; color: var(--acc-muted); text-transform: uppercase; letter-spacing: .06em; margin-top: 2px; }
    .acc-scan-btn { width: 100%; padding: 12px; border-radius: 11px; border: none; background: linear-gradient(135deg, var(--acc-accent), #3a6fd8); color: #fff; font-size: .88rem; font-weight: 700; cursor: pointer; font-family: var(--acc-font); transition: opacity .15s, transform .1s; display: flex; align-items: center; justify-content: center; gap: 8px; letter-spacing: .02em; box-shadow: 0 4px 16px rgba(79,142,247,.3); }
    .acc-scan-btn:hover { opacity: .92; }
    .acc-scan-btn:active { transform: scale(.98); }
    .acc-scan-btn:disabled { background: var(--acc-surface); color: var(--acc-muted); box-shadow: none; cursor: default; }
    .acc-scan-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
    .acc-dl-btn { width: 100%; padding: 10px; border-radius: 11px; border: 1px solid rgba(56,217,169,.3); background: rgba(56,217,169,.07); color: var(--acc-accent2); font-size: .82rem; font-weight: 600; cursor: pointer; font-family: var(--acc-font); transition: background .15s; display: flex; align-items: center; justify-content: center; gap: 7px; }
    .acc-dl-btn:hover { background: rgba(56,217,169,.14); }
    .acc-dl-btn:disabled { opacity: .35; cursor: default; }
    .acc-issues { display: flex; flex-direction: column; gap: 6px; }
    .acc-issue { background: var(--acc-surface); border-radius: 10px; padding: 10px 12px; border-left: 3px solid var(--acc-border); }
    .acc-issue.fixed   { border-left-color: var(--acc-accent2); background: rgba(56,217,169,.05); }
    .acc-issue.warning { border-left-color: var(--acc-warn);    background: rgba(245,166,35,.05); }
    .acc-issue.error   { border-left-color: var(--acc-error);   background: rgba(247,95,95,.05); }
    .acc-issue-head { display: flex; align-items: flex-start; gap: 7px; justify-content: space-between; }
    .acc-issue-title { font-size: .82rem; font-weight: 600; color: var(--acc-text); display: flex; align-items: center; gap: 6px; }
    .acc-badge { font-size: .6rem; font-weight: 700; padding: 2px 7px; border-radius: 6px; text-transform: uppercase; letter-spacing: .05em; flex-shrink: 0; margin-top: 1px; }
    .acc-badge.fixed   { background: rgba(56,217,169,.15);  color: var(--acc-accent2); }
    .acc-badge.warning { background: rgba(245,166,35,.15);  color: var(--acc-warn); }
    .acc-badge.error   { background: rgba(247,95,95,.15);   color: var(--acc-error); }
    .acc-issue-desc { font-size: .75rem; color: var(--acc-muted); margin-top: 5px; line-height: 1.55; }
    .acc-issue-cnt  { font-size: .68rem; font-family: var(--acc-mono); color: #4a6a9b; margin-top: 4px; }

    /* ── History Tab ── */
    .acc-hist-body { padding: 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
    .acc-hist-empty { text-align: center; color: var(--acc-muted); font-size: .83rem; padding: 30px 0; line-height: 1.7; }
    .acc-hist-card { background: var(--acc-surface); border: 1px solid var(--acc-border); border-radius: 10px; padding: 11px 13px; }
    .acc-hist-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
    .acc-hist-date { font-size: .7rem; color: var(--acc-muted); font-family: var(--acc-mono); }
    .acc-hist-score { font-size: .88rem; font-weight: 700; font-family: var(--acc-mono); color: var(--acc-accent); }
    .acc-hist-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .acc-hist-pill { font-size: .65rem; padding: 2px 8px; border-radius: 6px; font-weight: 600; }
    .acc-hist-pill.g { background: rgba(56,217,169,.12); color: var(--acc-accent2); }
    .acc-hist-pill.y { background: rgba(245,166,35,.12);  color: var(--acc-warn); }
    .acc-hist-pill.r { background: rgba(247,95,95,.12);   color: var(--acc-error); }
    .acc-hist-dl { margin-top: 8px; width: 100%; padding: 6px; border-radius: 7px; border: 1px solid var(--acc-border); background: transparent; color: var(--acc-muted); font-size: .72rem; cursor: pointer; font-family: var(--acc-font); transition: border-color .15s, color .15s; }
    .acc-hist-dl:hover { border-color: var(--acc-accent2); color: var(--acc-accent2); }

    /* ── Footer ── */
    .acc-footer { padding: 9px 16px; border-top: 1px solid var(--acc-border); font-size: .65rem; color: var(--acc-muted); text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px; flex-shrink: 0; }
    .acc-footer img { width: 14px; height: 14px; object-fit: contain; opacity: .5; }

    /* ── Reading guide ── */
    #acc-reading-line { position: fixed; left: 0; right: 0; height: 34px; background: rgba(79,142,247,.1); border-top: 2px solid rgba(79,142,247,.4); border-bottom: 2px solid rgba(79,142,247,.4); pointer-events: none; z-index: 2147483644; display: none; top: 0; }

    /* ── Reading mask ── */
    #acc-reading-mask-top    { position: fixed; left:0; right:0; top:0; background: rgba(0,0,0,.75); pointer-events: none; z-index: 2147483643; display: none; }
    #acc-reading-mask-bottom { position: fixed; left:0; right:0; bottom:0; background: rgba(0,0,0,.75); pointer-events: none; z-index: 2147483643; display: none; }

    /* ── Accessibility effect classes ── */
    body.acc-big-cursor, body.acc-big-cursor * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44'%3E%3Ccircle cx='11' cy='11' r='10' fill='%230a1628' stroke='%234f8ef7' stroke-width='2.5'/%3E%3C/svg%3E") 11 11, auto !important; }
    body.acc-highlight-links a { outline: 2px solid var(--acc-warn) !important; outline-offset: 2px !important; background: rgba(245,166,35,.08) !important; }
    body.acc-highlight-headings h1, body.acc-highlight-headings h2, body.acc-highlight-headings h3, body.acc-highlight-headings h4, body.acc-highlight-headings h5, body.acc-highlight-headings h6 { outline: 2px solid rgba(79,142,247,.6) !important; outline-offset: 3px !important; background: rgba(79,142,247,.05) !important; }
    body.acc-highlight-hover *:hover { outline: 2px solid var(--acc-accent2) !important; outline-offset: 2px !important; }
    body.acc-readable,  body.acc-readable  * { font-family: Georgia, 'Times New Roman', serif !important; letter-spacing: .03em !important; }
    body.acc-dyslexia,  body.acc-dyslexia  * { font-family: 'Trebuchet MS', Verdana, sans-serif !important; line-height: 2 !important; letter-spacing: .09em !important; word-spacing: .22em !important; }
    body.acc-high-contrast   { filter: contrast(180%) !important; }
    body.acc-invert          { filter: invert(1) hue-rotate(180deg) !important; }
    body.acc-grayscale       { filter: grayscale(1) !important; }
    body.acc-low-saturation  { filter: saturate(0.2) !important; }
    body.acc-stop-anim *, body.acc-stop-anim *::before, body.acc-stop-anim *::after { animation: none !important; transition: none !important; }
    body.acc-focus-ring *:focus { outline: 3px solid var(--acc-accent) !important; outline-offset: 3px !important; }
    body.acc-text-spacing, body.acc-text-spacing * { line-height: 1.95 !important; letter-spacing: .13em !important; word-spacing: .15em !important; }
    body.acc-big-targets a, body.acc-big-targets button { min-height: 44px !important; min-width: 44px !important; display: inline-flex !important; align-items: center !important; }
    body.acc-reduced-stimulus { background: #f5f0e8 !important; color: #2a2a2a !important; filter: saturate(0.6) brightness(1.05) !important; }
    body.acc-text-align-left  * { text-align: left  !important; }
    body.acc-text-align-center * { text-align: center !important; }
    body.acc-text-align-right  * { text-align: right  !important; }
    body.acc-keyboard-nav *:focus { outline: 4px solid #ffeb3b !important; outline-offset: 4px !important; box-shadow: 0 0 0 8px rgba(255,235,59,.2) !important; }

    /* ── Status announcer (screen readers) ── */
    #acc-status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }

    /* ══════════════════════════════════════════
       MOBILE RESPONSIVE
    ══════════════════════════════════════════ */
    @media (max-width: 480px) {
      #acc-toggle { width: 54px; height: 54px; border-radius: 14px; bottom: 16px; right: 16px; }
      #acc-toggle img { width: 30px; height: 30px; }
      #acc-toggle-label { display: none; }
      #acc-panel { position: fixed !important; bottom: 0 !important; top: auto !important; left: 0 !important; right: 0 !important; width: 100% !important; max-width: 100% !important; max-height: 88vh !important; border-radius: 20px 20px 0 0 !important; transform: translateY(110%) !important; opacity: 1 !important; }
      #acc-panel.acc-open { transform: translateY(0) !important; }
      .acc-tab { font-size: .6rem; padding: 8px 2px; }
      .acc-body, .acc-fix-body, .acc-hist-body, .acc-profiles-body { padding: 10px; gap: 6px; }
      .acc-stepper, .acc-row { padding: 8px 10px; }
      .acc-row-label { font-size: .78rem; }
      .acc-profile-card { padding: 10px; }
      .acc-profile-icon { width: 36px; height: 36px; font-size: 1.4rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      #acc-panel { transition: none !important; }
      #acc-toggle { transition: none !important; }
    }
  `;
  document.head.appendChild(style);

  // ══════════════════════════════════════════
  // 2. HTML
  // ══════════════════════════════════════════
  const root = document.createElement('div');
  root.id = 'acc-widget-root';
  root.innerHTML = `
    <div id="acc-reading-line" role="presentation" aria-hidden="true"></div>
    <div id="acc-reading-mask-top" aria-hidden="true"></div>
    <div id="acc-reading-mask-bottom" aria-hidden="true"></div>
    <div id="acc-status" aria-live="polite" aria-atomic="true" role="status"></div>

    <button id="acc-toggle" aria-label="Open ACC Accessibility Panel" aria-expanded="false" aria-haspopup="dialog">
      <img src="${ACC_LOGO}" alt="" aria-hidden="true" />
      <span id="acc-toggle-label" aria-hidden="true">A11Y</span>
    </button>

    <div id="acc-panel" role="dialog" aria-modal="true" aria-label="ACC Accessibility Settings">
      <div class="acc-header">
        <div class="acc-header-top">
          <img class="acc-header-logo" src="${ACC_LOGO}" alt="" aria-hidden="true" />
          <div class="acc-header-title">
            <h2>ACC Accessibility</h2>
            <p>Powered by Auto AI Engine</p>
          </div>
          <button class="acc-close-btn" id="acc-close" aria-label="Close accessibility panel">✕</button>
        </div>
        <div class="acc-active-profile-badge" id="acc-active-badge" aria-live="polite">
          <span id="acc-active-badge-text"></span>
          <button id="acc-clear-profile" aria-label="Clear active profile">✕ Clear</button>
        </div>
        <div class="acc-tabs" role="tablist" aria-label="Accessibility settings sections">
          <button class="acc-tab acc-active" data-tab="profiles" role="tab" aria-selected="true"  aria-controls="panel-profiles" id="tab-profiles">👤 Profiles</button>
          <button class="acc-tab"            data-tab="settings" role="tab" aria-selected="false" aria-controls="panel-settings" id="tab-settings">⚙ Settings</button>
        </div>
      </div>

      <!-- ═══ PROFILES TAB ═══ -->
      <div class="acc-panel-content acc-active" data-panel="profiles" id="panel-profiles" role="tabpanel" aria-labelledby="tab-profiles" tabindex="0">
        <div class="acc-profiles-body">
          <div class="acc-profiles-intro">
            Select a profile to instantly apply accessibility settings tailored for a specific need. You can then fine-tune individual settings in the Settings tab.
          </div>

          <div class="acc-profile-card" data-profile="visually-impaired" role="button" tabindex="0" aria-pressed="false" aria-label="Visually Impaired profile">
            <div class="acc-profile-icon" aria-hidden="true">👁</div>
            <div class="acc-profile-info">
              <div class="acc-profile-name">Visually Impaired</div>
              <div class="acc-profile-desc">Larger text, high contrast, enhanced focus indicators</div>
              <div class="acc-profile-tags">
                <span class="acc-profile-tag">Large Text</span>
                <span class="acc-profile-tag">High Contrast</span>
                <span class="acc-profile-tag">Focus Ring</span>
              </div>
            </div>
            <div class="acc-profile-check" aria-hidden="true"></div>
          </div>

          <div class="acc-profile-card" data-profile="cognitive" role="button" tabindex="0" aria-pressed="false" aria-label="Cognitive and Learning profile">
            <div class="acc-profile-icon" aria-hidden="true">🧠</div>
            <div class="acc-profile-info">
              <div class="acc-profile-name">Cognitive / Learning</div>
              <div class="acc-profile-desc">Dyslexia font, extra spacing, no animations, reading guide</div>
              <div class="acc-profile-tags">
                <span class="acc-profile-tag">Dyslexia Font</span>
                <span class="acc-profile-tag">Text Spacing</span>
                <span class="acc-profile-tag">No Animations</span>
              </div>
            </div>
            <div class="acc-profile-check" aria-hidden="true"></div>
          </div>

          <div class="acc-profile-card" data-profile="motor" role="button" tabindex="0" aria-pressed="false" aria-label="Motor and Physical Impaired profile">
            <div class="acc-profile-icon" aria-hidden="true">🖱</div>
            <div class="acc-profile-info">
              <div class="acc-profile-name">Motor / Physical</div>
              <div class="acc-profile-desc">Large cursor, bigger click targets, keyboard navigation</div>
              <div class="acc-profile-tags">
                <span class="acc-profile-tag">Large Cursor</span>
                <span class="acc-profile-tag">Big Targets</span>
                <span class="acc-profile-tag">Keyboard Nav</span>
              </div>
            </div>
            <div class="acc-profile-check" aria-hidden="true"></div>
          </div>

          <div class="acc-profile-card" data-profile="deaf" role="button" tabindex="0" aria-pressed="false" aria-label="Deaf and Hard of Hearing profile">
            <div class="acc-profile-icon" aria-hidden="true">🔇</div>
            <div class="acc-profile-info">
              <div class="acc-profile-name">Deaf / Hard of Hearing</div>
              <div class="acc-profile-desc">Highlighted links, muted media, visual cues emphasized</div>
              <div class="acc-profile-tags">
                <span class="acc-profile-tag">Highlight Links</span>
                <span class="acc-profile-tag">Mute Media</span>
                <span class="acc-profile-tag">Visual Cues</span>
              </div>
            </div>
            <div class="acc-profile-check" aria-hidden="true"></div>
          </div>

          <div class="acc-profile-card" data-profile="adhd" role="button" tabindex="0" aria-pressed="false" aria-label="ADHD Friendly profile">
            <div class="acc-profile-icon" aria-hidden="true">⚡</div>
            <div class="acc-profile-info">
              <div class="acc-profile-name">ADHD Friendly</div>
              <div class="acc-profile-desc">Reduced visual stimulus, no animations, readable font</div>
              <div class="acc-profile-tags">
                <span class="acc-profile-tag">Reduced Stimulus</span>
                <span class="acc-profile-tag">No Animations</span>
                <span class="acc-profile-tag">Readable Font</span>
              </div>
            </div>
            <div class="acc-profile-check" aria-hidden="true"></div>
          </div>

          <div class="acc-profile-card" data-profile="senior" role="button" tabindex="0" aria-pressed="false" aria-label="Senior Friendly profile">
            <div class="acc-profile-icon" aria-hidden="true">👴</div>
            <div class="acc-profile-info">
              <div class="acc-profile-name">Senior Friendly</div>
              <div class="acc-profile-desc">Bigger text, larger cursor, high contrast, generous spacing</div>
              <div class="acc-profile-tags">
                <span class="acc-profile-tag">Large Text</span>
                <span class="acc-profile-tag">Large Cursor</span>
                <span class="acc-profile-tag">High Contrast</span>
              </div>
            </div>
            <div class="acc-profile-check" aria-hidden="true"></div>
          </div>

        </div>
      </div>

      <!-- ═══ SETTINGS TAB ═══ -->
      <div class="acc-panel-content" data-panel="settings" id="panel-settings" role="tabpanel" aria-labelledby="tab-settings" tabindex="0">
        <div class="acc-body">

          <div class="acc-section">Content</div>

          <div class="acc-stepper">
            <div class="acc-stepper-label"><span class="acc-row-icon" aria-hidden="true">🔤</span> Font Size</div>
            <div class="acc-stepper-ctrl">
              <button class="acc-step-btn" id="acc-fs-dn" aria-label="Decrease font size">−</button>
              <span class="acc-step-val" id="acc-fs-val" aria-live="polite" aria-label="Font size value">100%</span>
              <button class="acc-step-btn" id="acc-fs-up" aria-label="Increase font size">+</button>
            </div>
          </div>

          <div class="acc-stepper">
            <div class="acc-stepper-label"><span class="acc-row-icon" aria-hidden="true">↕</span> Line Height</div>
            <div class="acc-stepper-ctrl">
              <button class="acc-step-btn" id="acc-lh-dn" aria-label="Decrease line height">−</button>
              <span class="acc-step-val" id="acc-lh-val" aria-live="polite" aria-label="Line height value">1.6</span>
              <button class="acc-step-btn" id="acc-lh-up" aria-label="Increase line height">+</button>
            </div>
          </div>

          <div class="acc-stepper">
            <div class="acc-stepper-label"><span class="acc-row-icon" aria-hidden="true">↔</span> Letter Spacing</div>
            <div class="acc-stepper-ctrl">
              <button class="acc-step-btn" id="acc-ls-dn" aria-label="Decrease letter spacing">−</button>
              <span class="acc-step-val" id="acc-ls-val" aria-live="polite" aria-label="Letter spacing value">0px</span>
              <button class="acc-step-btn" id="acc-ls-up" aria-label="Increase letter spacing">+</button>
            </div>
          </div>

          <div class="acc-stepper">
            <div class="acc-stepper-label"><span class="acc-row-icon" aria-hidden="true">⎵</span> Word Spacing</div>
            <div class="acc-stepper-ctrl">
              <button class="acc-step-btn" id="acc-ws-dn" aria-label="Decrease word spacing">−</button>
              <span class="acc-step-val" id="acc-ws-val" aria-live="polite" aria-label="Word spacing value">0px</span>
              <button class="acc-step-btn" id="acc-ws-up" aria-label="Increase word spacing">+</button>
            </div>
          </div>

          <div class="acc-select-row">
            <div class="acc-stepper-label"><span class="acc-row-icon" aria-hidden="true">🔡</span> Font Family</div>
            <select id="acc-font-family" aria-label="Select font family">
              <option value="">Default</option>
              <option value="dyslexia">Dyslexia</option>
              <option value="readable">Readable</option>
              <option value="mono">Monospace</option>
            </select>
          </div>

          <div class="acc-align-row">
            <div class="acc-stepper-label"><span class="acc-row-icon" aria-hidden="true">≡</span> Text Align</div>
            <div class="acc-align-btns" role="group" aria-label="Text alignment">
              <button class="acc-align-btn" data-align="" aria-label="Default alignment" aria-pressed="true">−</button>
              <button class="acc-align-btn" data-align="acc-text-align-left" aria-label="Align left" aria-pressed="false">⬅</button>
              <button class="acc-align-btn" data-align="acc-text-align-center" aria-label="Align center" aria-pressed="false">≡</button>
              <button class="acc-align-btn" data-align="acc-text-align-right" aria-label="Align right" aria-pressed="false">➡</button>
            </div>
          </div>

          <div class="acc-section">Vision</div>

          <div class="acc-colors-box">
            <div class="acc-colors-label" id="acc-filter-label"><span aria-hidden="true">🎨</span> Colour Filter</div>
            <div class="acc-swatches" id="acc-swatches" role="radiogroup" aria-labelledby="acc-filter-label">
              <button class="acc-swatch acc-picked" data-filter="" style="background:#112244;border-color:#4a6a9b;color:#8a9bbf;" aria-label="No filter (default)" aria-checked="true" role="radio" title="Default">↺</button>
              <button class="acc-swatch" data-filter="acc-high-contrast"  style="background:#000;color:#fff;"  aria-label="High contrast" aria-checked="false" role="radio" title="High Contrast">HC</button>
              <button class="acc-swatch" data-filter="acc-invert"         style="background:linear-gradient(135deg,#000 50%,#fff 50%);" aria-label="Invert colours" aria-checked="false" role="radio" title="Invert"></button>
              <button class="acc-swatch" data-filter="acc-grayscale"      style="background:#888;" aria-label="Greyscale" aria-checked="false" role="radio" title="Greyscale">GS</button>
              <button class="acc-swatch" data-filter="acc-low-saturation" style="background:#b3a89d;" aria-label="Low saturation" aria-checked="false" role="radio" title="Low Saturation">LS</button>
            </div>
          </div>

          <div class="acc-section">Navigation & Focus</div>

          <div class="acc-row" id="acc-t-focus" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">🔲</span> Focus Ring</div><div class="acc-row-sub">Enhanced keyboard focus indicator</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>
          <div class="acc-row" id="acc-t-keyboard" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">⌨</span> Keyboard Navigation</div><div class="acc-row-sub">High-visibility yellow focus ring</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>
          <div class="acc-row" id="acc-t-cursor" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">🖱</span> Large Cursor</div><div class="acc-row-sub">Enlarged mouse pointer</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>
          <div class="acc-row" id="acc-t-bigtargets" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">🎯</span> Big Click Targets</div><div class="acc-row-sub">Min 44px touch target on links &amp; buttons</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>
          <div class="acc-row" id="acc-t-links" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">🔗</span> Highlight Links</div><div class="acc-row-sub">Outlines all hyperlinks</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>
          <div class="acc-row" id="acc-t-headings" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">📋</span> Highlight Headings</div><div class="acc-row-sub">Outlines all H1–H6 elements</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>
          <div class="acc-row" id="acc-t-hover" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">✨</span> Highlight on Hover</div><div class="acc-row-sub">Visual outline on hovered elements</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>

          <div class="acc-section">Reading</div>

          <div class="acc-row" id="acc-t-guide" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">📏</span> Reading Guide</div><div class="acc-row-sub">Highlights current reading line</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>
          <div class="acc-row" id="acc-t-mask" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">🎭</span> Reading Mask</div><div class="acc-row-sub">Darkens page above &amp; below focus line</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>
          <div class="acc-row" id="acc-t-spacing" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">📐</span> Text Spacing</div><div class="acc-row-sub">Extra word &amp; letter spacing (WCAG 1.4.12)</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>

          <div class="acc-section">Motion &amp; Media</div>

          <div class="acc-row" id="acc-t-anim" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">⏸</span> Pause Animations</div><div class="acc-row-sub">Stops all motion &amp; transitions</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>
          <div class="acc-row" id="acc-t-media" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">🔇</span> Mute All Media</div><div class="acc-row-sub">Silences auto-playing audio &amp; video</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>
          <div class="acc-row" id="acc-t-stimulus" role="switch" aria-checked="false" tabindex="0">
            <div><div class="acc-row-label"><span class="acc-row-icon" aria-hidden="true">🧘</span> Reduce Stimulus</div><div class="acc-row-sub">Softer colours, reduced visual noise</div></div>
            <div class="acc-switch" aria-hidden="true"></div>
          </div>

          <button class="acc-reset" id="acc-reset" aria-label="Reset all accessibility settings to default">↺ Reset All Settings</button>
        </div>
      </div>

      >

      <div class="acc-footer">
        <img src="${ACC_LOGO}" alt="" aria-hidden="true" />
        ACC Accessibility Widget &mdash; Auto AI Engine
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // ══════════════════════════════════════════
  // 3. STATE & REFS
  // ══════════════════════════════════════════
  const S = {
    open: false, fontSize: 100, lineHeight: 1.6, letterSpacing: 0,
    wordSpacing: 0, colorFilter: '', textAlign: '', fontFamily: '',
    activeProfile: null, toggles: {}
  };

  const toggleBtn   = document.getElementById('acc-toggle');
  const panel       = document.getElementById('acc-panel');
  const guide       = document.getElementById('acc-reading-line');
  const maskTop     = document.getElementById('acc-reading-mask-top');
  const maskBottom  = document.getElementById('acc-reading-mask-bottom');
  const widgetEl    = document.getElementById('acc-widget-root');
  const statusEl    = document.getElementById('acc-status');

  function announce(msg) { statusEl.textContent = ''; setTimeout(() => { statusEl.textContent = msg; }, 50); }

  // ── Wix iframe detection & dynamic positioning ──────
  const isInIframe = window.self !== window.top;
  if (isInIframe) document.body.classList.add('acc-in-iframe');

  function positionPanel() {
    if (!isInIframe) return;
    const iframeH = window.innerHeight;
    const iframeW = window.innerWidth;
    const btnRect = toggleBtn.getBoundingClientRect();
    const panelW  = Math.min(400, iframeW - 20);
    const spaceBelow = iframeH - btnRect.bottom - 10;
    const spaceAbove = btnRect.top - 10;
    const rightOffset = iframeW - btnRect.right;
    panel.style.right = rightOffset + 'px';
    panel.style.left  = 'auto';
    panel.style.width = panelW + 'px';
    if (spaceAbove > spaceBelow && spaceAbove > 300) {
      panel.style.top    = 'auto';
      panel.style.bottom = (iframeH - btnRect.top + 8) + 'px';
      panel.style.maxHeight = Math.min(spaceAbove - 10, iframeH * 0.85) + 'px';
    } else {
      panel.style.top    = (btnRect.bottom + 8) + 'px';
      panel.style.bottom = 'auto';
      panel.style.maxHeight = Math.min(spaceBelow - 10, iframeH * 0.85) + 'px';
    }
  }

  const openPanel = () => {
    S.open = true;
    positionPanel();
    panel.classList.add('acc-open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.getElementById('acc-close').focus();
  };
  const closePanel = () => {
    S.open = false;
    panel.classList.remove('acc-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.focus();
  };

  toggleBtn.addEventListener('click', () => S.open ? closePanel() : openPanel());
  document.getElementById('acc-close').addEventListener('click', closePanel);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && S.open) { closePanel(); }
    // Trap focus inside panel when open
    if (e.key === 'Tab' && S.open) {
      const focusable = panel.querySelectorAll('button:not([disabled]), [tabindex="0"], select, input');
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ── Tabs ──
  const accTabs = Array.from(document.querySelectorAll('.acc-tab'));
  accTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      accTabs.forEach(t => { t.classList.remove('acc-active'); t.setAttribute('aria-selected','false'); t.setAttribute('tabindex','-1'); });
      document.querySelectorAll('.acc-panel-content').forEach(c => c.classList.remove('acc-active'));
      tab.classList.add('acc-active');
      tab.setAttribute('aria-selected','true');
      tab.setAttribute('tabindex','0');
      document.querySelector(`.acc-panel-content[data-panel="${tab.dataset.tab}"]`).classList.add('acc-active');
    });
    tab.addEventListener('keydown', (e) => {
      let newIndex = index;
      if (e.key === 'ArrowRight') newIndex = (index + 1) % accTabs.length;
      else if (e.key === 'ArrowLeft') newIndex = (index - 1 + accTabs.length) % accTabs.length;
      else if (e.key === 'Home') newIndex = 0;
      else if (e.key === 'End') newIndex = accTabs.length - 1;
      else return;
      e.preventDefault();
      accTabs[newIndex].click();
      accTabs[newIndex].focus();
    });
  });
  // Set initial tabindex state
  accTabs.forEach(t => t.setAttribute('tabindex', t.classList.contains('acc-active') ? '0' : '-1'));

  // ══════════════════════════════════════════
  // 4. PROFILES
  // ══════════════════════════════════════════
  const PROFILES = {
    'visually-impaired': {
      name: '👁 Visually Impaired',
      apply: () => {
        setFontSize(150);
        setLineHeight(2.0);
        applyFilter('acc-high-contrast');
        setToggle('acc-t-focus', true);
        setToggle('acc-t-links', true);
      }
    },
    'cognitive': {
      name: '🧠 Cognitive / Learning',
      apply: () => {
        setFontFamily('dyslexia');
        setLineHeight(2.2);
        setWordSpacing(4);
        setToggle('acc-t-spacing', true);
        setToggle('acc-t-anim', true);
        setToggle('acc-t-guide', true);
      }
    },
    'motor': {
      name: '🖱 Motor / Physical',
      apply: () => {
        setToggle('acc-t-cursor', true);
        setToggle('acc-t-bigtargets', true);
        setToggle('acc-t-focus', true);
        setToggle('acc-t-keyboard', true);
      }
    },
    'deaf': {
      name: '🔇 Deaf / Hard of Hearing',
      apply: () => {
        setToggle('acc-t-links', true);
        setToggle('acc-t-media', true);
        setToggle('acc-t-headings', true);
        setToggle('acc-t-hover', true);
      }
    },
    'adhd': {
      name: '⚡ ADHD Friendly',
      apply: () => {
        setFontFamily('readable');
        setToggle('acc-t-anim', true);
        setToggle('acc-t-stimulus', true);
        setToggle('acc-t-spacing', true);
        setTextAlign('acc-text-align-left');
      }
    },
    'senior': {
      name: '👴 Senior Friendly',
      apply: () => {
        setFontSize(140);
        setLineHeight(2.0);
        applyFilter('acc-high-contrast');
        setToggle('acc-t-cursor', true);
        setToggle('acc-t-bigtargets', true);
        setToggle('acc-t-focus', true);
      }
    }
  };

  document.querySelectorAll('.acc-profile-card').forEach(card => {
    const activate = () => {
      const pid = card.dataset.profile;
      // Deactivate previous
      document.querySelectorAll('.acc-profile-card').forEach(c => {
        c.classList.remove('acc-profile-active');
        c.setAttribute('aria-pressed','false');
        c.querySelector('.acc-profile-check').textContent = '';
      });
      if (S.activeProfile === pid) {
        // Toggle off
        S.activeProfile = null;
        resetAll();
        document.getElementById('acc-active-badge').classList.remove('visible');
        announce('Profile cleared');
        return;
      }
      resetAll(true);
      S.activeProfile = pid;
      card.classList.add('acc-profile-active');
      card.setAttribute('aria-pressed','true');
      card.querySelector('.acc-profile-check').textContent = '✓';
      PROFILES[pid].apply();
      const badge = document.getElementById('acc-active-badge');
      document.getElementById('acc-active-badge-text').textContent = PROFILES[pid].name + ' active';
      badge.classList.add('visible');
      announce(PROFILES[pid].name + ' profile activated');
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); activate(); } });
  });

  document.getElementById('acc-clear-profile').addEventListener('click', () => {
    document.querySelectorAll('.acc-profile-card').forEach(c => {
      c.classList.remove('acc-profile-active');
      c.setAttribute('aria-pressed','false');
      c.querySelector('.acc-profile-check').textContent = '';
    });
    S.activeProfile = null;
    resetAll();
    document.getElementById('acc-active-badge').classList.remove('visible');
    announce('Profile cleared');
  });

  // ══════════════════════════════════════════
  // 5. SETTINGS HELPERS
  // ══════════════════════════════════════════
  function setFontSize(v) {
    S.fontSize = Math.min(200, Math.max(70, v));
    document.documentElement.style.fontSize = S.fontSize + '%';
    document.getElementById('acc-fs-val').textContent = S.fontSize + '%';
  }
  function setLineHeight(v) {
    S.lineHeight = +v.toFixed(1);
    document.body.style.lineHeight = S.lineHeight;
    document.getElementById('acc-lh-val').textContent = S.lineHeight;
  }
  function setLetterSpacing(v) {
    S.letterSpacing = +v.toFixed(1);
    document.body.style.letterSpacing = S.letterSpacing + 'px';
    document.getElementById('acc-ls-val').textContent = S.letterSpacing + 'px';
  }
  function setWordSpacing(v) {
    S.wordSpacing = +v.toFixed(1);
    document.body.style.wordSpacing = S.wordSpacing + 'px';
    document.getElementById('acc-ws-val').textContent = S.wordSpacing + 'px';
  }
  function applyFilter(cls) {
    if (S.colorFilter) document.body.classList.remove(S.colorFilter);
    document.querySelectorAll('.acc-swatch').forEach(s => { s.classList.remove('acc-picked'); s.setAttribute('aria-checked','false'); });
    S.colorFilter = cls;
    if (cls) {
      document.body.classList.add(cls);
      const sw = document.querySelector(`.acc-swatch[data-filter="${cls}"]`);
      if (sw) { sw.classList.add('acc-picked'); sw.setAttribute('aria-checked','true'); }
    } else {
      const sw = document.querySelector('.acc-swatch[data-filter=""]');
      if (sw) { sw.classList.add('acc-picked'); sw.setAttribute('aria-checked','true'); }
    }
  }
  function setFontFamily(val) {
    S.fontFamily = val;
    document.getElementById('acc-font-family').value = val;
    document.body.classList.remove('acc-dyslexia','acc-readable','acc-mono-font');
    if (val === 'dyslexia') document.body.classList.add('acc-dyslexia');
    else if (val === 'readable') document.body.classList.add('acc-readable');
    else if (val === 'mono') {
      document.body.style.fontFamily = 'monospace';
    }
  }
  function setTextAlign(cls) {
    if (S.textAlign) document.body.classList.remove(S.textAlign);
    S.textAlign = cls;
    if (cls) document.body.classList.add(cls);
    document.querySelectorAll('.acc-align-btn').forEach(b => {
      const active = b.dataset.align === cls;
      b.classList.toggle('acc-active-align', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  // Stepper wiring
  function stepper(upId, dnId, valId, getV, setFn, min, max, step) {
    document.getElementById(upId).addEventListener('click', () => { if (getV() < max) setFn(+(getV() + step).toFixed(2)); });
    document.getElementById(dnId).addEventListener('click', () => { if (getV() > min) setFn(+(getV() - step).toFixed(2)); });
  }
  stepper('acc-fs-up','acc-fs-dn','acc-fs-val', () => S.fontSize,       setFontSize,       70,  200, 10);
  stepper('acc-lh-up','acc-lh-dn','acc-lh-val', () => S.lineHeight,     setLineHeight,     1.0, 3.0, 0.2);
  stepper('acc-ls-up','acc-ls-dn','acc-ls-val', () => S.letterSpacing,  setLetterSpacing,  0,   10,  1);
  stepper('acc-ws-up','acc-ws-dn','acc-ws-val', () => S.wordSpacing,    setWordSpacing,    0,   20,  2);

  // Font family select
  document.getElementById('acc-font-family').addEventListener('change', e => setFontFamily(e.target.value));

  // Text align buttons
  document.querySelectorAll('.acc-align-btn').forEach(btn => {
    btn.addEventListener('click', () => setTextAlign(btn.dataset.align));
  });

  // Colour swatches
  document.querySelectorAll('.acc-swatch').forEach(sw => {
    sw.addEventListener('click', () => applyFilter(sw.dataset.filter));
  });

  // ── Toggle rows ──
  const toggleMap = {
    'acc-t-guide':      'acc-reading-guide-on',
    'acc-t-mask':       'acc-reading-mask-on',
    'acc-t-links':      'acc-highlight-links',
    'acc-t-headings':   'acc-highlight-headings',
    'acc-t-hover':      'acc-highlight-hover',
    'acc-t-cursor':     'acc-big-cursor',
    'acc-t-bigtargets': 'acc-big-targets',
    'acc-t-focus':      'acc-focus-ring',
    'acc-t-keyboard':   'acc-keyboard-nav',
    'acc-t-spacing':    'acc-text-spacing',
    'acc-t-anim':       'acc-stop-anim',
    'acc-t-media':      'acc-mute-media',
    'acc-t-stimulus':   'acc-reduced-stimulus',
  };

  function setToggle(id, forceOn) {
    const row = document.getElementById(id);
    if (!row) return;
    const cls = toggleMap[id];
    const currentlyOn = row.classList.contains('acc-on');
    if (forceOn === undefined) {
      // regular toggle
      const on = row.classList.toggle('acc-on');
      row.setAttribute('aria-checked', on ? 'true' : 'false');
      document.body.classList.toggle(cls, on);
      S.toggles[cls] = on;
      handleSideEffects(cls, on);
    } else {
      if (forceOn && !currentlyOn) {
        row.classList.add('acc-on');
        row.setAttribute('aria-checked','true');
        document.body.classList.add(cls);
        S.toggles[cls] = true;
        handleSideEffects(cls, true);
      } else if (!forceOn && currentlyOn) {
        row.classList.remove('acc-on');
        row.setAttribute('aria-checked','false');
        document.body.classList.remove(cls);
        S.toggles[cls] = false;
        handleSideEffects(cls, false);
      }
    }
  }

  function handleSideEffects(cls, on) {
    if (cls === 'acc-reading-guide-on') guide.style.display = on ? 'block' : 'none';
    if (cls === 'acc-reading-mask-on') {
      maskTop.style.display = on ? 'block' : 'none';
      maskBottom.style.display = on ? 'block' : 'none';
    }
    if (cls === 'acc-mute-media') {
      document.querySelectorAll('video, audio').forEach(m => {
        if (!widgetEl.contains(m)) m.muted = on;
      });
    }
  }

  Object.keys(toggleMap).forEach(id => {
    S.toggles[toggleMap[id]] = false;
    const row = document.getElementById(id);
    if (!row) return;
    row.addEventListener('click', () => setToggle(id));
    row.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setToggle(id); } });
  });

  // Reading guide & mask mouse tracking
  document.addEventListener('mousemove', e => {
    if (S.toggles['acc-reading-guide-on']) guide.style.top = (e.clientY - 17) + 'px';
    if (S.toggles['acc-reading-mask-on']) {
      const y = e.clientY;
      const h = 60;
      maskTop.style.height    = Math.max(0, y - h) + 'px';
      maskBottom.style.height = Math.max(0, window.innerHeight - y - h) + 'px';
    }
  });

  // ══════════════════════════════════════════
  // 6. RESET
  // ══════════════════════════════════════════
  function resetAll(silent) {
    setFontSize(100);
    setLineHeight(1.6);
    setLetterSpacing(0);
    setWordSpacing(0);
    applyFilter('');
    setFontFamily('');
    setTextAlign('');
    Object.keys(toggleMap).forEach(id => setToggle(id, false));
    guide.style.display = 'none';
    maskTop.style.display = 'none';
    maskBottom.style.display = 'none';
    document.body.style.fontFamily = '';
    if (!silent) announce('All settings reset');
  }

  document.getElementById('acc-reset').addEventListener('click', () => {
    document.querySelectorAll('.acc-profile-card').forEach(c => {
      c.classList.remove('acc-profile-active');
      c.setAttribute('aria-pressed','false');
      c.querySelector('.acc-profile-check').textContent = '';
    });
    S.activeProfile = null;
    document.getElementById('acc-active-badge').classList.remove('visible');
    resetAll();
  });

  // ══════════════════════════════════════════
  // 7. AUTO-FIX ENGINE (unchanged + improved)
  // ══════════════════════════════════════════
  let lastAudit = null;

  function runScan() {
    const issues = [];

    if (!document.documentElement.getAttribute('lang')) {
      document.documentElement.setAttribute('lang', 'en');
      issues.push({ type:'fixed', icon:'🌐', title:'Page Language Set', desc:'Set lang="en" on <html>. Screen readers use this to select the correct speech synthesis voice.' });
    }
    (function(){
      const imgs = Array.from(document.querySelectorAll('img')).filter(e => !widgetEl.contains(e));
      let fixed=0, warned=0;
      imgs.forEach(img => {
        if (!img.hasAttribute('alt')) { const f=(img.getAttribute('src')||'').split('/').pop().replace(/\.[^.]+$/,'').replace(/[-_]/g,' '); img.setAttribute('alt',f&&f.length<80?f:'image'); fixed++; }
        else if (img.getAttribute('alt')===img.getAttribute('src')) warned++;
      });
      if (fixed)  issues.push({ type:'fixed',   icon:'🖼', title:'Missing Alt Text Added',  desc:`Assigned alt attributes to ${fixed} image(s).`, count:fixed });
      if (warned) issues.push({ type:'warning', icon:'🖼', title:'Alt Equals File Path',     desc:`${warned} image(s) have the file path as their alt.`, count:warned });
    })();
    (function(){
      const links = Array.from(document.querySelectorAll('a')).filter(e => !widgetEl.contains(e));
      let fixed=0, warned=0;
      links.forEach(l => {
        const txt=l.textContent.trim(), aria=l.getAttribute('aria-label')||l.getAttribute('title');
        if (!txt&&!aria&&!l.querySelector('img[alt]')) { l.setAttribute('aria-label',l.getAttribute('href')||'link'); fixed++; }
        else if (['click here','read more','here','more','link','details','learn more'].includes(txt.toLowerCase())) warned++;
      });
      if (fixed)  issues.push({ type:'fixed',   icon:'🔗', title:'Empty Links Labelled',  desc:`Added aria-label to ${fixed} anchor(s).`, count:fixed });
      if (warned) issues.push({ type:'warning', icon:'🔗', title:'Vague Link Text',        desc:`${warned} link(s) use non-descriptive text.`, count:warned });
    })();
    (function(){
      const btns = Array.from(document.querySelectorAll('button,input[type=submit],input[type=button]')).filter(e => !widgetEl.contains(e));
      let fixed=0;
      btns.forEach(b => { if (!(b.textContent||'').trim()&&!b.getAttribute('value')&&!b.getAttribute('aria-label')) { const t=b.querySelector('svg title'); b.setAttribute('aria-label',t?t.textContent:'button'); fixed++; }});
      if (fixed) issues.push({ type:'fixed', icon:'🔘', title:'Unlabelled Buttons Fixed', desc:`Added aria-label to ${fixed} button(s).`, count:fixed });
    })();
    (function(){
      const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea')).filter(e => !widgetEl.contains(e));
      let fixed=0, warned=0;
      inputs.forEach(inp => {
        const lbl=inp.id?document.querySelector(`label[for="${inp.id}"]`):null;
        const aria=inp.getAttribute('aria-label')||inp.getAttribute('aria-labelledby');
        if (!lbl&&!aria) { inp.setAttribute('aria-label',inp.getAttribute('placeholder')||inp.getAttribute('name')||'field'); fixed++; }
        else if (lbl&&!lbl.textContent.trim()) warned++;
      });
      if (fixed)  issues.push({ type:'fixed',   icon:'📝', title:'Unlabelled Inputs Fixed', desc:`Labelled ${fixed} form control(s).`, count:fixed });
      if (warned) issues.push({ type:'warning', icon:'📝', title:'Empty Label Elements',    desc:`${warned} <label>(s) contain no text.`, count:warned });
    })();
    (function(){
      if (!document.querySelector('[data-acc-skip],[href="#main"],[href="#content"],.skip-link,#skip-nav,[id*="skip"]')) {
        const main = document.querySelector('main,[role=main],#main,#content');
        if (main) {
          if (!main.id) main.id='acc-main';
          const skip=document.createElement('a');
          skip.href='#'+main.id; skip.textContent='Skip to main content';
          skip.setAttribute('data-acc-skip','1');
          Object.assign(skip.style,{position:'absolute',top:'-999px',left:'0',zIndex:'9999999',background:'#0a1628',color:'#4f8ef7',padding:'8px 18px',borderRadius:'0 0 10px 0',fontFamily:'sans-serif',fontSize:'14px',textDecoration:'none',fontWeight:'600'});
          skip.addEventListener('focus',()=>skip.style.top='0');
          skip.addEventListener('blur',()=>skip.style.top='-999px');
          document.body.insertBefore(skip,document.body.firstChild);
          issues.push({ type:'fixed', icon:'⏭', title:'Skip Navigation Added', desc:'Keyboard users can now bypass navigation with one Tab press.' });
        }
      }
    })();
    if (!document.querySelector('main,[role=main]'))       issues.push({ type:'warning', icon:'🗺', title:'No <main> Landmark',   desc:'Add a <main> element around your primary content.' });
    if (!document.querySelector('nav,[role=navigation]'))  issues.push({ type:'warning', icon:'🗺', title:'No <nav> Landmark',    desc:'Wrap navigation menus in a <nav> element.' });
    (function(){
      const hds=Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).filter(h=>!widgetEl.contains(h));
      const h1s=hds.filter(h=>h.tagName==='H1');
      let skipped=0;
      for(let i=1;i<hds.length;i++) if(parseInt(hds[i].tagName[1])-parseInt(hds[i-1].tagName[1])>1) skipped++;
      if (!h1s.length)    issues.push({ type:'warning', icon:'📋', title:'No H1 Heading',          desc:'Every page needs exactly one <h1>.' });
      if (h1s.length > 1) issues.push({ type:'warning', icon:'📋', title:'Multiple H1s',           desc:`Found ${h1s.length} H1 elements.`, count:h1s.length });
      if (skipped)        issues.push({ type:'warning', icon:'📋', title:'Heading Levels Skipped', desc:`${skipped} non-sequential heading jump(s).`, count:skipped });
    })();
    (function(){
      const frames=Array.from(document.querySelectorAll('iframe')).filter(e=>!widgetEl.contains(e));
      let fixed=0;
      frames.forEach(f=>{if(!f.getAttribute('title')&&!f.getAttribute('aria-label')){f.setAttribute('title','Embedded content');fixed++;}});
      if (fixed) issues.push({ type:'fixed', icon:'🖥', title:'iFrames Titled', desc:`Added title to ${fixed} iframe(s).`, count:fixed });
    })();
    (function(){
      const bad=Array.from(document.querySelectorAll('table')).filter(t=>!widgetEl.contains(t)&&(!t.querySelector('th')||!t.querySelector('caption'))).length;
      if (bad) issues.push({ type:'warning', icon:'📊', title:'Tables Missing Semantics', desc:`${bad} table(s) lack <th> or <caption>.`, count:bad });
    })();
    (function(){
      const media=Array.from(document.querySelectorAll('video[autoplay],audio[autoplay]')).filter(e=>!widgetEl.contains(e));
      let fixed=0;
      media.forEach(m=>{if(!m.muted){m.muted=true;fixed++;}});
      if (fixed) issues.push({ type:'fixed', icon:'🔇', title:'Autoplay Media Muted', desc:`Muted ${fixed} auto-playing element(s).`, count:fixed });
    })();
    (function(){
      const bad=Array.from(document.querySelectorAll('[tabindex]')).filter(e=>!widgetEl.contains(e)&&parseInt(e.getAttribute('tabindex'))>0).length;
      if (bad) issues.push({ type:'warning', icon:'⌨', title:'Positive tabindex Values', desc:`${bad} element(s) disrupt keyboard focus order.`, count:bad });
    })();
    (function(){
      const links=Array.from(document.querySelectorAll('a[target=_blank]')).filter(e=>!widgetEl.contains(e));
      let fixed=0;
      links.forEach(a=>{
        const rel=a.getAttribute('rel')||'';
        if(!rel.includes('noopener')) a.setAttribute('rel','noopener noreferrer');
        const lbl=a.getAttribute('aria-label')||a.textContent.trim();
        if(lbl&&!lbl.includes('new tab')) a.setAttribute('aria-label',lbl+' (opens in new tab)');
        fixed++;
      });
      if (fixed) issues.push({ type:'fixed', icon:'🔒', title:'External Links Secured', desc:`Applied rel="noopener noreferrer" to ${fixed} link(s).`, count:fixed });
    })();
    (function(){
      if (!document.querySelector('meta[name=viewport]')) {
        const m=document.createElement('meta'); m.name='viewport'; m.content='width=device-width,initial-scale=1'; document.head.appendChild(m);
        issues.push({ type:'fixed', icon:'📱', title:'Viewport Meta Added', desc:'Injected <meta name="viewport"> for mobile scaling.' });
      }
    })();
    // ARIA landmark check: missing role=main content
    (function(){
      const hasAriaLabel = Array.from(document.querySelectorAll('[aria-label],[aria-labelledby]')).filter(e=>!widgetEl.contains(e)).length;
      if (hasAriaLabel > 0) issues.push({ type:'fixed', icon:'♿', title:'ARIA Labels Detected', desc:`${hasAriaLabel} element(s) already have ARIA labels — good practice confirmed.`, count:hasAriaLabel });
    })();
    (function(){
      let warned=0;
      const els=Array.from(document.querySelectorAll('p,span,li,h1,h2,h3,h4,h5,h6,a,button,label')).filter(e=>!widgetEl.contains(e)&&e.textContent.trim());
      els.slice(0,60).forEach(el=>{
        try {
          const cs=getComputedStyle(el);
          const fgM=cs.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if(!fgM) return;
          // Walk up DOM to find actual background
          let bgM=null;
          let node=el;
          while(node&&node!==document.body){
            const bg=getComputedStyle(node).backgroundColor;
            if(bg&&bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent'){
              bgM=bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
              break;
            }
            node=node.parentElement;
          }
          if(!bgM) bgM='rgb(10,22,40)'.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/); // fallback to --navy
          const lum=(r,g,b)=>{const t=c=>{c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4);}; return .2126*t(r)+.7152*t(g)+.0722*t(b);};
          const l1=lum(+fgM[1],+fgM[2],+fgM[3]),l2=lum(+bgM[1],+bgM[2],+bgM[3]);
          const ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
          if(ratio<4.5) warned++;
        } catch(e){}
      });
      if (warned) issues.push({ type:'warning', icon:'🎨', title:'Potential Low Contrast Text', desc:`~${warned} text element(s) may fail WCAG AA (4.5:1 ratio).`, count:warned });
    })();

    const nFixed=issues.filter(i=>i.type==='fixed').length;
    const nWarn =issues.filter(i=>i.type==='warning').length;
    const nErr  =issues.filter(i=>i.type==='error').length;
    const score =Math.max(0,Math.round(100-nWarn*7-nErr*14));

    document.getElementById('acc-score').textContent=score;
    document.getElementById('acc-n-fixed').textContent=nFixed;
    document.getElementById('acc-n-warn').textContent=nWarn;
    document.getElementById('acc-n-err').textContent=nErr;

    const scanBtn=document.getElementById('acc-scan');
    scanBtn.innerHTML='✓ Scan Complete — Scan Again';
    scanBtn.disabled=false;
    document.getElementById('acc-dl-now').disabled=false;

    const list=document.getElementById('acc-issues');
    if (!issues.length) {
      list.innerHTML='<div style="text-align:center;color:#38d9a9;font-size:.88rem;padding:24px 0;line-height:1.6;">🎉 Excellent! No issues found.</div>';
    } else {
      const order={fixed:0,warning:1,error:2};
      issues.sort((a,b)=>order[a.type]-order[b.type]);
      list.innerHTML=issues.map(i=>`
        <div class="acc-issue ${i.type}">
          <div class="acc-issue-head">
            <div class="acc-issue-title">${i.icon} ${i.title}</div>
            <span class="acc-badge ${i.type}">${i.type==='fixed'?'Fixed':i.type==='warning'?'Warn':'Critical'}</span>
          </div>
          <div class="acc-issue-desc">${i.desc}</div>
          ${i.count&&i.count>1?`<div class="acc-issue-cnt">Affected: ${i.count} element(s)</div>`:''}
        </div>`).join('');
    }

    const record={date:new Date().toLocaleString(),score,nFixed,nWarn,nErr,issues:JSON.parse(JSON.stringify(issues))};
    lastAudit=record;
    auditHistory.unshift(record);
    if (auditHistory.length>20) auditHistory.length=20;
    renderHistory();
    announce(`Scan complete. Score: ${score} out of 100. ${nFixed} fixes applied, ${nWarn} warnings.`);
    return record;
  }

  function renderHistory() {
    const empty=document.getElementById('acc-hist-empty');
    const list=document.getElementById('acc-hist-list');
    if (!auditHistory.length){empty.style.display='';list.innerHTML='';return;}
    empty.style.display='none';
    list.innerHTML=auditHistory.map((r,idx)=>`
      <div class="acc-hist-card">
        <div class="acc-hist-top"><div class="acc-hist-date">${r.date}</div><div class="acc-hist-score">${r.score}/100</div></div>
        <div class="acc-hist-pills">
          <span class="acc-hist-pill g">${r.nFixed} Fixed</span>
          <span class="acc-hist-pill y">${r.nWarn} Warnings</span>
          <span class="acc-hist-pill r">${r.nErr} Critical</span>
        </div>
        <button class="acc-hist-dl" data-idx="${idx}" aria-label="Download report from ${r.date}">↓ Download this report</button>
      </div>`).join('');
    list.querySelectorAll('.acc-hist-dl').forEach(btn=>{btn.addEventListener('click',()=>downloadReport(auditHistory[+btn.dataset.idx]));});
  }

  function downloadReport(record) {
    const rows=record.issues.map(i=>`<tr class="${i.type}"><td>${i.icon} ${i.title}</td><td><span class="badge ${i.type}">${i.type==='fixed'?'Auto-Fixed':i.type==='warning'?'Warning':'Critical'}</span></td><td>${i.desc}</td><td>${i.count||1}</td></tr>`).join('');
    const html=`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>ACC Audit — ${record.date}</title>
<style>body{font-family:'Segoe UI',sans-serif;background:#f4f5f7;padding:40px}
.report{max-width:860px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)}
.rhead{background:linear-gradient(135deg,#0a1628,#0d1f3c);color:#fff;padding:28px 32px}
.rhead h1{font-size:1.2rem;margin:0 0 4px}
.rhead p{font-size:.78rem;color:#a0aec0;margin:0}
.rscore{display:flex;align-items:center;gap:32px;padding:24px 32px;background:#f8f9fc;border-bottom:1px solid #e5e7eb}
.score-big{font-size:3rem;font-weight:800}
.pills{display:flex;gap:10px;flex-wrap:wrap;margin-left:auto}
.pill{padding:6px 14px;border-radius:8px;font-size:.8rem;font-weight:600}
.pill.g{background:#d1fae5;color:#065f46}.pill.y{background:#fef3c7;color:#92400e}.pill.r{background:#fee2e2;color:#991b1b}
table{width:100%}th{background:#f1f3f9;padding:12px 16px;font-size:.78rem;text-transform:uppercase;color:#8a9bbf;text-align:left;border-bottom:1px solid #e5e7eb}
td{padding:12px 16px;font-size:.85rem;border-bottom:1px solid #f0f0f0;vertical-align:top}
tr.fixed td:first-child{border-left:3px solid #10b981}tr.warning td:first-child{border-left:3px solid #f59e0b}tr.error td:first-child{border-left:3px solid #ef4444}
.badge{padding:2px 8px;border-radius:6px;font-size:.7rem;font-weight:700;text-transform:uppercase}
.badge.fixed{background:#d1fae5;color:#065f46}.badge.warning{background:#fef3c7;color:#92400e}.badge.error{background:#fee2e2;color:#991b1b}
.rfooter{padding:16px 32px;font-size:.72rem;color:#9ca3af;text-align:center;border-top:1px solid #e5e7eb}
</style></head><body><div class="report">
<div class="rhead"><h1>ACC Accessibility Audit Report</h1><p>Auto AI Engine — Generated ${record.date}</p></div>
<div class="rscore"><div><div class="score-big">${record.score}</div><div style="font-size:.75rem;color:#8a9bbf;text-transform:uppercase;">out of 100</div></div>
<div class="pills"><span class="pill g">✓ ${record.nFixed} Auto-Fixed</span><span class="pill y">⚠ ${record.nWarn} Warnings</span><span class="pill r">✕ ${record.nErr} Critical</span></div></div>
<table><thead><tr><th>Issue</th><th>Status</th><th>Description</th><th>#</th></tr></thead><tbody>${rows}</tbody></table>
<div class="rfooter">ACC Accessibility Widget — Auto AI Engine — ${record.date}</div>
</div></body></html>`;
    const blob=new Blob([html],{type:'text/html'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=`ACC-Audit-${new Date().toISOString().slice(0,10)}.html`; a.click();
    URL.revokeObjectURL(url);
  }

  document.getElementById('acc-scan').addEventListener('click', () => {
    const btn=document.getElementById('acc-scan');
    btn.innerHTML='⏳ Scanning…'; btn.disabled=true;
    announce('Scanning page for accessibility issues…');
    setTimeout(runScan, 150);
  });
  document.getElementById('acc-dl-now').addEventListener('click', () => { if (lastAudit) downloadReport(lastAudit); });

  // ── Auto-scan on page load (silent background run) ──
  setTimeout(() => {
    try { runScan(); } catch(e) {}
  }, 2000);

})();
