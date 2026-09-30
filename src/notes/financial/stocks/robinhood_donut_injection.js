// ==UserScript==
// @name         Robinhood Proportional Portfolio Donut
// @match        *://*.robinhood.com/*
// @grant        none
// ==/UserScript==

(() => {
    "use strict";

    const ID = "proportional-portfolio-donut";
    const NS = "http://www.w3.org/2000/svg";
    const COLORS = ["#ff0000", "#008cff"];

    let raf;
    let focus = null;
    let equityClicked = false;
    const paths = new Map();

    const money = (s) => {
        const m = s?.replace(/,/g, "").match(/\$(-?\d+(?:\.\d+)?)/);
        return m ? +m[1] : NaN;
    };

    function holdings() {
        const out = new Map();

        for (const a of document.querySelectorAll('a[href^="/stocks/"]')) {
            const m = a.getAttribute("href")?.match(/^\/stocks\/([^/?#]+)/);
            if (!m) continue;

            const symbol = decodeURIComponent(m[1]).toUpperCase();

            const values = [...a.querySelectorAll("span,div")]
                .filter((x) => !x.children.length)
                .map((x) => money(x.textContent))
                .filter(Number.isFinite);

            if (values.length < 3) continue;

            const equity = values.at(-1);
            if (equity > 0)
                out.set(symbol, {
                    symbol,
                    equity,
                    href: a.getAttribute("href"),
                });
        }

        return [...out.values()];
    }

    function builtin() {
        return [
            ...document.querySelectorAll(
                'svg[data-testid="VisualizationsWrapper"]',
            ),
        ].find((x) => /Stocks\s*&\s*options/i.test(x.textContent));
    }

    function stickyParent(el) {
        for (let x = el.parentElement; x; x = x.parentElement)
            if (getComputedStyle(x).position === "sticky") return x;

        return el.parentElement;
    }

    function sortByEquity() {
        if (equityClicked) return;

        for (const header of document.querySelectorAll("header")) {
            const label = [...header.querySelectorAll("span,div")].find(
                (x) => !x.children.length && x.textContent.trim() === "Equity",
            );

            if (!label) continue;

            const cell =
                label.closest("button,[role=button]") ||
                [...header.children].find((x) => x.contains(label));

            if (cell) {
                cell.click();
                equityClicked = true;
            }

            return;
        }
    }

    const point = (r, a) => [130 + r * Math.cos(a), 130 + r * Math.sin(a)];

    function arc(a, b) {
        const ro = 125,
            ri = 106,
            span = b - a;

        // single holding: full ring
        if (span >= Math.PI * 2 - 1e-6)
            return (
                "M130,5 A125,125 0 1 1 129.999,5 " +
                "M130,24 A106,106 0 1 0 130.001,24"
            );

        const [x1, y1] = point(ro, a);
        const [x2, y2] = point(ro, b);
        const [x3, y3] = point(ri, b);
        const [x4, y4] = point(ri, a);
        const big = span > Math.PI ? 1 : 0;

        return (
            `M${x1},${y1} A${ro},${ro} 0 ${big} 1 ${x2},${y2}` +
            ` L${x3},${y3} A${ri},${ri} 0 ${big} 0 ${x4},${y4} Z`
        );
    }

    function ensure(original) {
        let box = document.getElementById(ID);
        const host = stickyParent(original);

        if (!box) {
            box = document.createElement("div");
            box.id = ID;
            box.style.cssText = "width:260px;height:275px;margin-top:12px";

            box.innerHTML = `
                <svg width="260" height="260" viewBox="0 0 260 260"
                     style="display:block">
                    <g data-arcs></g>

                    <text data-title x="130" y="112"
                          text-anchor="middle"
                          fill="currentColor" font-size="13"></text>

                    <text data-value x="130" y="136"
                          text-anchor="middle"
                          fill="currentColor" font-size="16"></text>

                    <text data-percent x="130" y="158"
                          text-anchor="middle"
                          fill="currentColor" font-size="12"></text>
                </svg>`;

            box.querySelector("svg").addEventListener("pointermove", (e) => {
                const p = e.target.closest?.("path[data-symbol]");
                const symbol = p?.dataset.symbol || null;

                // Only real pointer movement changes focus.
                if (symbol !== focus) {
                    focus = symbol;
                    updateText();
                }
            });

            box.querySelector("svg").addEventListener("pointerleave", () => {
                focus = null;
                updateText();
            });

            box.querySelector("svg").addEventListener("click", (e) => {
                const p = e.target.closest?.("path[data-symbol]");
                if (p?.dataset.href) location.href = p.dataset.href;
            });
        }

        // Robinhood may remount the sticky container.
        if (box.parentElement !== host) host.appendChild(box);

        return box;
    }

    const amount = (n, total = false) =>
        n.toLocaleString(undefined, {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: total ? 2 : 4,
        });

    function updateText() {
        const box = document.getElementById(ID);
        if (!box) return;

        const hs = holdings();
        const total = hs.reduce((s, h) => s + h.equity, 0);
        const h = hs.find((x) => x.symbol === focus);

        box.querySelector("[data-title]").textContent = h
            ? h.symbol
            : "Stocks · proportional";

        box.querySelector("[data-value]").textContent = amount(
            h ? h.equity : total,
            !h,
        );

        box.querySelector("[data-percent]").textContent =
            h && total
                ? `${((h.equity / total) * 100).toFixed(2)}%`
                : "100.00%";

        for (const [symbol, p] of paths)
            p.style.opacity = !focus || symbol === focus ? "1" : ".35";
    }

    function render() {
        sortByEquity();

        const original = builtin();
        const hs = holdings();

        if (!original || !hs.length) return;

        const box = ensure(original);
        const layer = box.querySelector("[data-arcs]");
        const total = hs.reduce((s, h) => s + h.equity, 0);

        const alive = new Set(hs.map((h) => h.symbol));

        for (const [symbol, p] of [...paths])
            if (!alive.has(symbol)) {
                p.remove();
                paths.delete(symbol);
            }

        if (focus && !alive.has(focus)) focus = null;

        let a = -Math.PI / 2;

        hs.forEach((h, i) => {
            const b =
                i === hs.length - 1
                    ? Math.PI * 1.5
                    : a + (h.equity / total) * Math.PI * 2;

            let p = paths.get(h.symbol);

            if (!p) {
                p = document.createElementNS(NS, "path");
                p.dataset.symbol = h.symbol;
                p.style.cssText = "cursor:pointer;transition:opacity .08s";
                paths.set(h.symbol, p);
                layer.appendChild(p);
            }

            const color = COLORS[i % COLORS.length];

            p.dataset.href = h.href;
            p.setAttribute("d", arc(a, b));
            p.setAttribute("fill", color);

            // same-color stroke removes anti-aliasing hairlines, not angle
            p.setAttribute("stroke", color);
            p.setAttribute("stroke-width", ".5");

            a = b;
        });

        updateText();
    }

    new MutationObserver((ms) => {
        // Ignore mutations made by this donut itself.
        if (
            ms.every((m) =>
                (m.target.nodeType === 1
                    ? m.target
                    : m.target.parentElement
                )?.closest?.("#" + ID),
            )
        )
            return;

        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(render);
    }).observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
    });

    requestAnimationFrame(render);
})();
