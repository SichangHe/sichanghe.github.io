function fix_toc_n_add_math_copying() {
    const sidebar = document.getElementById("sidebar-scrollbox");
    const sidebar_toc = document.getElementById("toc-scrollbox");
    const toc_toggle_button = document.getElementById("toc-toggle");
    sidebar_toc.style.display = "none";
    toc_toggle_button.addEventListener("click", () => {
        if (html.classList.contains("toc-shown")) {
            html.classList.remove("toc-shown");
            sidebar.style.display = "block";
            sidebar_toc.style.display = "none";
        } else {
            html.classList.add("toc-shown");
            sidebar.style.display = "none";
            sidebar_toc.style.display = "block";
        }
    });

    const toc = document.querySelector("#content > main > ul");
    if (!toc) {
        return false;
    }
    sidebar_toc.replaceChildren(toc);

    const toc_anchors = toc.querySelectorAll("a");
    const header_anchors = document
        .querySelector("main")
        .querySelectorAll("h1 > a, h2 > a, h3 > a, h4 > a");
    const elements_w_refs = [];
    toc_anchors.forEach((anchor, index) => {
        const header = header_anchors[index];
        anchor.href = header.href;
        elements_w_refs.push([header, anchor]);
    });
    let current_active = undefined;
    document.addEventListener("scroll", () => {
        let last_passed_anchor = null;
        for (const [element, anchor] of elements_w_refs) {
            if (window.innerHeight / 3 + window.scrollY > element.offsetTop) {
                last_passed_anchor = anchor;
            } else {
                if (last_passed_anchor) {
                    if (current_active) {
                        current_active.classList.remove("active");
                    }
                    current_active = last_passed_anchor;
                    current_active.classList.add("active");
                    current_active.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                    });
                    break;
                }
            }
        }
    });

    // Click katex element to copy their source.
    for (const data of document.querySelectorAll("data.katex-src")) {
        data.title = "Click to copy source.";
        data.addEventListener("click", () =>
            navigator.clipboard.writeText(data.value),
        );
    }
    return true;
}

if (document.readyState === "complete") {
    fix_toc_n_add_math_copying();
} else {
    document.addEventListener("DOMContentLoaded", fix_toc_n_add_math_copying);
}
document.addEventListener("load", fix_toc_n_add_math_copying);
