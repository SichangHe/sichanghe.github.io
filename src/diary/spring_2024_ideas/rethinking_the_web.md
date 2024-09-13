# Rethinking The Web

## Browser space

- HTML is messed up.
    - It is a "markup", but it can contain scripts (logic).
        It should be the other way around.
        - Cannot share and reuse HTML because of its side effects.
            HTML does not have `#include`, only the bad `<iframe>`.
        - Same reason why HTML is seldom cacheable ⇒ dead links ensured.
        - HTML is not safe: cross-site scripting (XSS).
        - Even CSS is messed up in the same way.
    - If it were to exist:
        - It should be strictly content-based,
            without the ability to be scripted.
        - It should be a templating language.
            Just look at how many HTML-based templating languages we have.
        - It should be called by other "real" programming
            languages to manage logic, not the other way around like we do now.
    - Alan Kay: HTML should not exist at all.
        Content on the web should contain the specification of how they should
        be interpreted and rendered.
        (Source: The Computer Revolution Hasn't Happened Yet, 1997).
- WebAssembly (WASM) is a wasted potential.
    - It does not have feature parity with JS:
        No DOM manipulation, no direct access to browser APIs.
        - Browsers are fundamentally screwed in the first place:
            browser APIs are in JS, dynamic and complex. (I hope I am wrong).
    - The realistic way WASM could have saved the world is for it to lie under
        JS.
        - We now have to choose between the two, and do the horrible interop,
            but if JS compiles to WASM, we don't.
            - But, that is not going to happen because JS is so complex.
            - We do have JS to WASM compilers. They just embed a JS runtime.
- The web beat other worlds for apps.
    - Not because JS is amazing,
        but because the browser is the only accessible app development
        interface that works consistently cross-platform.
