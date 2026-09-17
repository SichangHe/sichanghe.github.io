// ==UserScript==
// @name         Options Leverage & Greeks Injector
// @match        *://*.robinhood.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let renderFrame;

    window.__optionsInjectorDebug = {
        underlyingPrice: NaN,
        legs: [],
        lastUpdate: null
    };

    const GREEK_DEFS = {
        'Delta': 'Change in option price per 1 point change in underlying',
        'Gamma': 'Rate of change in Delta per 1 point change in underlying',
        'Theta': 'Daily time decay in option price',
        'Vega': 'Change in option price per 1% change in implied volatility',
        'Rho': 'Change in option price per 1% change in interest rates'
    };

    const log = (msg, data = '') =>
        console.log(`[Options Injector] ${msg}`, data);

    function extractUnderlyingPrice() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;

        while ((node = walker.nextNode())) {
            const txt = node.nodeValue.trim();
            if (!txt) continue;

            // Pattern 1: Legacy button format (Equities)
            if (/^Share price:\s*\$[0-9,.]+$/i.test(txt)) {
                return parseFloat(txt.replace(/[^\d.]/g, ''));
            }

            // Pattern 2: Legacy button format (Indices)
            if (/^Index value:\s*[0-9,.]+$/i.test(txt)) {
                return parseFloat(txt.replace(/[^\d.]/g, ''));
            }

            // Pattern 3: Table layout format
            if (
                /^Current\s+[A-Z0-9-.]+\s+price$/i.test(txt) &&
                txt.toLowerCase() !== 'current price'
            ) {
                const containerNode = node.parentElement?.parentElement;
                if (!containerNode) continue;

                const match = containerNode.textContent.match(/\$([0-9,.]+)/);

                if (match) {
                    return parseFloat(match[1].replace(/,/g, ''));
                }
            }
        }

        return NaN;
    }

    /*
     * Find the option price associated with the current Greeks block.
     *
     * We walk upward from the Greek row so that we prefer a price belonging
     * to the same option/leg rather than an unrelated dollar value elsewhere
     * on the page.
     */
    function extractOptionPrice(row) {
        let container = row;

        for (
            let depth = 0;
            container && depth < 10;
            depth++, container = container.parentElement
        ) {
            const text = container.textContent || '';

            /*
             * Prefer explicitly labelled values.
             *
             * Robinhood's wording/layout can change, so several common
             * names are accepted here.
             */
            const patterns = [
                /(?:Option\s+price|Option\s+value|Mark\s+price|Mark|Current\s+price)\s*:?\s*\$([0-9,.]+)/i,
                /(?:Option\s+price|Option\s+value|Mark\s+price|Mark|Current\s+price)\s*:?\s*([0-9,.]+)/i
            ];

            for (const pattern of patterns) {
                const match = text.match(pattern);

                if (match) {
                    const price = parseFloat(
                        match[1].replace(/,/g, '')
                    );

                    if (Number.isFinite(price) && price > 0) {
                        return price;
                    }
                }
            }
        }

        return NaN;
    }

    function inject() {
        if (!window.location.pathname.startsWith('/options/')) {
            return;
        }

        const underlyingPrice = extractUnderlyingPrice();

        const cellLabels = Array.from(
            document.querySelectorAll(
                'div[data-testid="cell-label"]'
            )
        );

        const greekRows = cellLabels.filter(div => {
            const txt = div.textContent.trim();

            return Object.keys(GREEK_DEFS).some(
                greek => txt.startsWith(greek)
            );
        });

        if (greekRows.length === 0) {
            return;
        }

        let mutated = false;

        const currentLegs = [];
        let currentLegIndex = 0;

        for (let i = 0; i < greekRows.length; i++) {
            const row = greekRows[i];

            const labelDiv =
                row.querySelector('span:first-of-type > div') ||
                row.querySelector('span:first-of-type');

            const valueDiv =
                row.querySelector('span:last-of-type > div') ||
                row.querySelector('span:last-of-type');

            if (!labelDiv || !valueDiv) {
                continue;
            }

            /*
             * Strip anything previously appended by this script.
             */
            const currentText =
                labelDiv.textContent
                    .split(' | ')[0]
                    .trim();

            const greekName =
                Object.keys(GREEK_DEFS).find(
                    greek => currentText === greek
                );

            if (!greekName) {
                continue;
            }

            if (greekName === 'Delta') {
                currentLegIndex++;
            }

            /*
             * Normalize Unicode minus signs before parsing.
             *
             * parseFloat intentionally stops at appended text, so rerunning
             * the injector remains safe for values such as:
             *
             * -0.0500 (-2.50%/d -75.00%/M)
             */
            const originalValueText = valueDiv.textContent;

            const normalizedValueText =
                originalValueText.replace(/[−–—]/g, '-');

            const rawValue =
                parseFloat(
                    normalizedValueText
                        .split(' | ')[0]
                );

            let newLabel = labelDiv.textContent;
            let newValue = normalizedValueText;
            let hoverText = GREEK_DEFS[greekName];

            /*
             * DELTA + LEVERAGE
             *
             * Correct leverage here is option elasticity:
             *
             *     leverage = Delta × underlyingPrice / optionPrice
             *
             * It approximates:
             *
             *     % change in option
             *     ------------------
             *     % change in stock
             *
             * Example:
             * Delta = 0.20
             * Stock = $100
             * Option = $1
             *
             * Leverage = 0.20 × 100 / 1 = 20×
             */
            if (
                greekName === 'Delta' &&
                Number.isFinite(underlyingPrice) &&
                Number.isFinite(rawValue)
            ) {
                const optionPrice =
                    extractOptionPrice(row);

                if (
                    Number.isFinite(optionPrice) &&
                    optionPrice > 0
                ) {
                    const leverage =
                        (
                            rawValue *
                            underlyingPrice
                        ) /
                        optionPrice;

                    newLabel = 'Delta | Leverage';

                    newValue =
                        `${rawValue.toFixed(4)} | ` +
                        `${leverage.toFixed(2)}×`;

                    hoverText =
                        `${GREEK_DEFS.Delta} | ` +
                        `Leverage (option elasticity): ` +
                        `Delta × Underlying Price ÷ Option Price`;

                    if (
                        !currentLegs.some(
                            leg =>
                                leg.legIndex ===
                                currentLegIndex
                        )
                    ) {
                        currentLegs.push({
                            legIndex: currentLegIndex,
                            rawDelta: rawValue,
                            optionPrice,
                            leverage
                        });
                    }
                }
            }

            /*
             * THETA
             *
             * Daily theta percentage:
             *
             *     theta / optionPrice × 100
             *
             * Monthly figure:
             *
             *     daily percentage × 30
             *
             * /M is only a linear 30-day extrapolation. Actual theta is
             * nonlinear and generally changes as expiration approaches.
             */
            if (
                greekName === 'Theta' &&
                Number.isFinite(rawValue)
            ) {
                const optionPrice =
                    extractOptionPrice(row);

                if (
                    Number.isFinite(optionPrice) &&
                    optionPrice > 0
                ) {
                    const thetaPctDay =
                        (
                            rawValue /
                            optionPrice
                        ) * 100;

                    const thetaPctMonth =
                        thetaPctDay * 30;

                    newValue =
                        `${rawValue} ` +
                        `(${thetaPctDay.toFixed(2)}%/d ` +
                        `${thetaPctMonth.toFixed(2)}%/M)`;

                    hoverText =
                        `${GREEK_DEFS.Theta} | ` +
                        `Daily: Theta ÷ Option Price × 100 | ` +
                        `Monthly: Daily percentage × 30 ` +
                        `(linear approximation)`;
                }
            }

            /*
             * Apply changes only when needed.
             * This prevents unnecessary MutationObserver loops.
             */
            if (labelDiv.textContent !== newLabel) {
                labelDiv.textContent = newLabel;
                mutated = true;
            }

            if (valueDiv.textContent !== newValue) {
                valueDiv.textContent = newValue;
                mutated = true;
            }

            if (labelDiv.title !== hoverText) {
                labelDiv.title = hoverText;
                mutated = true;
            }

            if (row.title !== hoverText) {
                row.title = hoverText;
                mutated = true;
            }
        }

        if (mutated) {
            window.__optionsInjectorDebug = {
                underlyingPrice,
                legs: currentLegs,
                lastUpdate: new Date().toISOString()
            };

            log(
                `Processed Greeks. ` +
                `Underlying: ${underlyingPrice}. ` +
                `Valid Legs: ${currentLegs.length}`,
                window.__optionsInjectorDebug
            );
        }
    }

    const observer = new MutationObserver(() => {
        cancelAnimationFrame(renderFrame);
        renderFrame = requestAnimationFrame(inject);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    log(
        'Initialized. TreeWalker extraction active for equities and indices.'
    );
})();
