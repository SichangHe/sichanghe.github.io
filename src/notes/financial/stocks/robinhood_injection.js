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

    const log = (msg, data = '') => console.log(`[Options Injector] ${msg}`, data);

    function extractUnderlyingPrice() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
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

            // Pattern 3: Table layout format (Strictly forces ticker inclusion)
            if (/^Current\s+[A-Z0-9-.]+\s+price$/i.test(txt) && txt.toLowerCase() !== 'current price') {
                const containerNode = node.parentElement?.parentElement;
                if (!containerNode) continue;

                // Captures standard dollar values in the table cell
                const match = containerNode.textContent.match(/\$([0-9,.]+)/);
                if (match) return parseFloat(match[1].replace(/,/g, ''));
            }
        }
        return NaN;
    }

    function inject() {
        if (!window.location.pathname.startsWith('/options/')) return;

        const underlyingPrice = extractUnderlyingPrice();

        const cellLabels = Array.from(document.querySelectorAll('div[data-testid="cell-label"]'));
        const greekRows = cellLabels.filter(div => {
            const txt = div.textContent.trim();
            return Object.keys(GREEK_DEFS).some(g => txt.startsWith(g));
        });

        if (greekRows.length === 0) return;

        let mutated = false;
        const currentLegs = [];
        let currentLegIndex = 0;

        for (let i = 0; i < greekRows.length; i++) {
            const row = greekRows[i];
            
            const labelDiv = row.querySelector('span:first-of-type > div') || row.querySelector('span:first-of-type');
            const valueDiv = row.querySelector('span:last-of-type > div') || row.querySelector('span:last-of-type');

            if (!labelDiv || !valueDiv) continue;

            const currentText = labelDiv.textContent.split(' | ')[0].trim();
            const greekName = Object.keys(GREEK_DEFS).find(g => currentText === g);
            
            if (!greekName) continue;
            if (greekName === 'Delta') currentLegIndex++;

            const originalValueText = valueDiv.textContent;
            const normalizedValueText = originalValueText.replace(/[−–—]/g, '-');
            const rawValue = parseFloat(normalizedValueText.split(' | ')[0]);

            let newLabel = labelDiv.textContent;
            let newValue = normalizedValueText;
            let hoverText = GREEK_DEFS[greekName];

            if (greekName === 'Delta' && !isNaN(underlyingPrice) && !isNaN(rawValue)) {
                const leverage = (rawValue * underlyingPrice).toFixed(4);
                
                newLabel = 'Delta | Leverage';
                newValue = `${rawValue.toFixed(4)} | ${leverage}`;
                hoverText = `${GREEK_DEFS['Delta']} | Leverage: Effective share exposure (Delta × Underlying Price)`;
                
                if (!currentLegs.some(l => l.legIndex === currentLegIndex)) {
                    currentLegs.push({ legIndex: currentLegIndex, rawDelta: rawValue, leverage });
                }
            }

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
            log(`Processed Greeks. Underlying: ${underlyingPrice}. Valid Legs: ${currentLegs.length}`, window.__optionsInjectorDebug);
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

    log('Initialized. TreeWalker extraction active for equities and indices.');
})();
