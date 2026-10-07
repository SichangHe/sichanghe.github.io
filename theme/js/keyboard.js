(() => {
    document.addEventListener("keydown", (e) => {
        if (e.target.closest("input, textarea, [contenteditable]")) return;
        if (e.ctrlKey ^ e.metaKey) {
            if (e.key === "b" && !e.shiftKey) {
                e.preventDefault();
                document.getElementById("mdbook-sidebar-toggle")?.click();
            } else if (e.key.toUpperCase() === "B" && e.shiftKey) {
                e.preventDefault();
                document.getElementById("toc-toggle")?.click();
            }
        }
    });
})();
