(() => {
    function setup() {
        const sidebar = document.querySelector("mdbook-sidebar-scrollbox");
        const menu = document.querySelector(".left-buttons");
        const headings = [...document.querySelectorAll("main :is(h1,h2,h3,h4,h5,h6) > a.header")];
        if (sidebar && menu && headings.length) {
            // 🧑 "Clean up the ToC hack we did and preserve the functionalities"
            const toc = document.createElement("div");
            toc.id = "page-toc";
            toc.className = "sidebar-scrollbox";
            toc.hidden = true;
            const list = document.createElement("ul");
            const entries = headings.map(heading => {
                const item = document.createElement("li");
                item.style.marginInlineStart = `${(Number(heading.parentElement.tagName.slice(1)) - 1) * 0.75}rem`;
                const link = document.createElement("a");
                link.href = heading.getAttribute("href");
                link.replaceChildren(...[...heading.childNodes].map(node => node.cloneNode(true)));
                item.append(link);
                list.append(item);
                return {heading, link};
            });
            toc.append(list);
            sidebar.after(toc);
            const button = document.createElement("button");
            button.id = "toc-toggle";
            button.className = "icon-button";
            button.type = "button";
            button.title = "Toggle this page's contents (Ctrl/Command+Shift+B)";
            button.setAttribute("aria-label", "Toggle this page's contents");
            button.setAttribute("aria-controls", "page-toc");
            button.setAttribute("aria-expanded", "false");
            button.innerHTML = '<span aria-hidden="true">☷</span>';
            menu.children[0].after(button);
            button.addEventListener("click", () => {
                toc.hidden = !toc.hidden;
                sidebar.hidden = !toc.hidden;
                button.setAttribute("aria-expanded", String(!toc.hidden));
            });
            let active;
            function update() {
                let current = entries[0];
                for (const entry of entries) {
                    if (entry.heading.getBoundingClientRect().top > window.innerHeight / 3) break;
                    current = entry;
                }
                if (active === current) return;
                active?.link.classList.remove("active");
                active?.link.removeAttribute("aria-current");
                active = current;
                active.link.classList.add("active");
                active.link.setAttribute("aria-current", "location");
                if (!toc.hidden) {
                    const offset = active.link.getBoundingClientRect().top - toc.getBoundingClientRect().top;
                    toc.scrollTop += offset - toc.clientHeight / 2;
                }
            }
            document.addEventListener("scroll", update, {passive: true});
            update();
        }
        for (const data of document.querySelectorAll("data.katex-src")) {
            data.title = "Click to copy source.";
            data.addEventListener("click", () => navigator.clipboard?.writeText(data.value).catch(console.error));
        }
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, {once: true});
    else setup();
})();
