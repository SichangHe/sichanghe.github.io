(() => {
    const key = `lastY:${location.pathname}`;
    function restore() {
        if (location.hash) return;
        try { window.scrollTo(0, Number(sessionStorage.getItem(key)) || 0); } catch {}
    }
    window.addEventListener("load", restore, {once: true});
    window.addEventListener("pagehide", () => {
        try { sessionStorage.setItem(key, String(window.scrollY)); } catch {}
    });
})();
