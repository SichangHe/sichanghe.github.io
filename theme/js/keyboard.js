(() => {
    const sidebar_toggle = document.getElementById("sidebar-toggle");
    const toc_toggle = document.getElementById("toc-toggle");
    document.addEventListener("keydown", (e) => {
        if (e.ctrlKey ^ e.metaKey) {
            if (e.key === "b") {
                sidebar_toggle.click();
            } else if (e.key === "B") {
                toc_toggle.click();
            }
        }
    });
})();
