/* Oui, Chef! – Start */
(function () {
  const boot = () => {
    const app = document.getElementById('app');
    G.Meta.mount(app);
  };
  // Erst starten, wenn die Schriften da sind (Canvas zeichnet sonst mit Ersatzschrift)
  const ready = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve();
  ready.then(() => {
    const hot = window.claude && window.claude.hot;
    if (hot && hot.ready) hot.ready(boot); else boot();
  });
  // Im Hintergrund pausieren
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.Meta.svc && !G.Meta.svc.paused && !G.Meta.svc.ended) G.Meta.svc.togglePause();
  });
})();
