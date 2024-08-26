<!-- toc -->

# University of Southern California Living

## Banking

| plan          | regst. | mon.  | US wire in | out  | intl. in    | out                  | ATM w/draw                          | Zelle |
| ------------- | -----: | ----: | ---------: | ---: | ----------: | -------------------: | ----------------------------------- | ----- |
| USCCU student | \$9    | \$0   | \$5        | \$20 | -2/yr, \$10 | \$40                 | Citibank branch, -2non-shared/mon   | ✅    |
| BoA student   | \$0    | \$5-  | \$15       | \$30 | \$15        | \$0 if not USD, \$45 | BoA, \$2.5 (5) if non-BoA (intl.)   | ✅    |
| Chase college | \$0    | \$12- | \$15       | \$25 | \$15        | \$5 if not USD, \$40 | Chase, \$3 (5) if non-Chase (intl.) | ✅    |

- no international wire transfer: SoFi, Chime
- US-citizen-only: ally

## Housing

places

- DPS
- downtown
- farther: Santa Monica and Culver City (closer to the beach and Hollywood);
    Monterey Park and San Gabriel (tons of Chinese food and markets);
    Koreatown (many Korean food, markets and great hair saloons);
    Pasadena (a bit far but peaceful and beautiful)

house vs apartment: house old, apartment expensive & small & have maintenance

website: Zillow

careful for: heat, floor noise

### JavaScript highlight keyword on page

```javascript
function highlight(regex, classes) {
    let regExp = new RegExp(regex, "gi");
    let openTag = `<span class="${classes.join(' ')}">`;

    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            let parent = node.parentNode;
            if (parent && parent.nodeName !== "SCRIPT" && parent.nodeName !== "STYLE") {
                let html = node.nodeValue;
                if (regExp.test(html)) {
                    let newHtml = html.replace(regExp, function(match) {
                        return `${openTag}${match}</span>`;
                    });
                    let span = document.createElement("span");
                    span.innerHTML = newHtml;
                    parent.replaceChild(span, node);
                }
            }
        } else {
            let childNodes = Array.from(node.childNodes);
            childNodes.forEach(child => processNode(child));
        }
    }

    processNode(document.body);
}

highlight(String.raw`\b(?:\$[\d,]+|(?:\d,?)?\d{3})\b`, ["highlight"]);
highlight(String.raw`\b(?:female|girls?|wom[ea]n)`, ["highlight-neg"]);

let style = document.createElement("style");
style.innerHTML = `
    .highlight {
        background-color: yellow;
    }
    .highlight-neg {
        color: red;
    }
`;
document.head.appendChild(style);
```

<style>#content main {
    max-width: unset;
}
</style>

## PEMS

Staying safe:

```javascript
function clickAll() {
    const down = document.getElementsByClassName("lesson-nav-link__link")[1];
    if (down) {
        console.log(down);
        down.click();
    }
    const cont = document.getElementsByClassName("continue-btn")[0];
    if (cont) {
        console.log(cont);
        cont.click();
    }
    for (const expand of document.getElementsByClassName("blocks-accordion__header")) {
        if (expand.ariaExpanded === "false") {
            expand.click();
        }
    }
    for (const select of document.getElementsByClassName("blocks-tabs__header-item--after-active")) {
        if (select.ariaSelected === "false") {
            select.click();
        }
    }
    setTimeout(clickAll, 200);
}
clickAll();
```

Diversity, Equity and Inclusion for Students:

```javascript
function clickAll() {
    const next = document.getElementById("next");
    if (next) {
        console.log(next);
        next.click();
    }
    const cont = document.getElementsByClassName("ng-binding")[0];
    if (cont) {
        console.log(cont);
        cont.click();
    }
    for (const expand of document.getElementsByClassName("accordian-btn")) {
        if (expand.ariaExpanded === "false") {
            expand.click();
        }
    }
    setTimeout(clickAll, 200);
}
clickAll();
```
