async function typeClipboardWithDelays(targetElement, msDelay = 2) {
    console.log("👉 Click back on the webpage in 2s...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
        const text = await navigator.clipboard.readText();
        console.log(
            `📋 Typing text (${text.length} chars) with a ${msDelay}ms delay...`,
        );

        for (const char of text) {
            const isSpace = char === " ";
            const keyProperties = {
                key: char,
                code: isSpace ? "Space" : `Key${char.toUpperCase()}`,
                keyCode: isSpace ? 32 : char.toUpperCase().charCodeAt(0),
                bubbles: true,
                cancelable: true,
            };

            // 1. Press key down
            targetElement.dispatchEvent(
                new KeyboardEvent("keydown", keyProperties),
            );

            // 2. Update value & fire input event for form frameworks
            if (
                targetElement.tagName === "INPUT" ||
                targetElement.tagName === "TEXTAREA"
            ) {
                targetElement.value += char;
                targetElement.dispatchEvent(
                    new InputEvent("input", {
                        inputType: "insertText",
                        data: char,
                        bubbles: true,
                    }),
                );
            }

            // 3. Release key up
            targetElement.dispatchEvent(
                new KeyboardEvent("keyup", keyProperties),
            );

            // 4. Wait before pressing the next key
            await new Promise((resolve) => setTimeout(resolve, msDelay));
        }

        console.log("✅ Typing completed successfully!");
    } catch (err) {
        console.error("❌ Failed:", err);
    }
}

typeClipboardWithDelays(document.activeElement);
