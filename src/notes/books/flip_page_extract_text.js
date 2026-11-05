(async () => {
    const CONFIG = {
        nextSelector:
            "#BookReader > div.BRfooter > div.BRnav.BRnavMain > nav > ul.controls > li:nth-child(4) > button",

        pollMs: 200,
        stableMs: 1500,
        timeoutMs: 45000,
        maxPages: 10000,
    };

    // Each run gets separate storage.
    const runId = Date.now();
    const storageKey = `book-extraction-${runId}`;

    let stopped = false;
    let running = true;

    const pages = [];
    const seen = new Set();

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    window.bookExtraction = {
        runId,
        storageKey,
        pages,
        stop() {
            stopped = true;
        },
        status() {
            return {
                running,
                stopped,
                pages: pages.length,
                currentIndex: getIndex(),
                storageKey,
            };
        },
    };

    function getIndex() {
        const br = window.br;

        if (typeof br?.currentIndex !== "function") {
            throw new Error("BookReader currentIndex() unavailable");
        }

        return br.currentIndex();
    }

    // ----------------------------
    // Extract visible text
    // ----------------------------

    function isVisible(p) {
        const r = p.getBoundingClientRect();
        const s = getComputedStyle(p);

        return (
            r.bottom > 0 &&
            r.top < innerHeight &&
            r.right > 0 &&
            r.left < innerWidth &&
            r.width > 0 &&
            r.height > 0 &&
            s.display !== "none" &&
            s.visibility !== "hidden"
        );
    }

    function extractText() {
        return [...document.querySelectorAll(".BRparagraphElement")]
            .filter(isVisible)
            .map((p) =>
                [...p.querySelectorAll(".BRlineElement")]
                    .map((line) =>
                        [...line.querySelectorAll(".BRwordElement")]
                            .map((w) => w.textContent.trim())
                            .join(" "),
                    )
                    .join("\n"),
            )
            .join("\n\n");
    }

    // ----------------------------
    // Wait for rendering to settle
    // ----------------------------

    async function waitForStableText(expectedIndex, previousText) {
        const started = Date.now();

        let lastText = null;
        let stableSince = 0;

        while (!stopped && Date.now() - started < CONFIG.timeoutMs) {
            const currentIndex = getIndex();
            const text = extractText();
            const now = Date.now();

            // Reset when the page index or text is not ready.
            if (
                currentIndex !== expectedIndex ||
                !text.trim() ||
                (previousText !== null && text === previousText)
            ) {
                lastText = null;
                stableSince = 0;
            } else if (text !== lastText) {
                lastText = text;
                stableSince = now;
            } else if (now - stableSince >= CONFIG.stableMs) {
                return text;
            }

            await sleep(CONFIG.pollMs);
        }

        if (stopped) return null;

        throw new Error(
            `Text did not stabilize at index ${expectedIndex}. ` +
                `Current index: ${getIndex()}, ` +
                `visible text length: ${extractText().length}`,
        );
    }

    // ----------------------------
    // Wait for navigation
    // ----------------------------

    async function waitForNextIndex(oldIndex) {
        const started = Date.now();

        while (!stopped && Date.now() - started < CONFIG.timeoutMs) {
            const current = getIndex();

            if (current !== oldIndex) {
                return current;
            }

            await sleep(CONFIG.pollMs);
        }

        if (stopped) return null;

        throw new Error(`Navigation timeout at index ${oldIndex}`);
    }

    // ----------------------------
    // Persist every page
    // ----------------------------

    function savePage(index, text) {
        if (seen.has(index)) {
            throw new Error(`Duplicate page index ${index}`);
        }

        const page = {
            index,
            text,
            timestamp: new Date().toISOString(),
        };

        // Write to persistent storage first.
        const updated = [...pages, page];

        localStorage.setItem(storageKey, JSON.stringify(updated));

        pages.push(page);
        seen.add(index);

        console.log(
            `[SAVED] Index ${index} | ` +
                `${text.length} characters | ` +
                `${pages.length} pages`,
        );
    }

    // ----------------------------
    // ZIP creation, no libraries
    // ----------------------------

    function makeZip(files) {
        const encoder = new TextEncoder();

        function crc32(bytes) {
            let crc = 0xffffffff;

            for (const byte of bytes) {
                crc ^= byte;

                for (let i = 0; i < 8; i++) {
                    crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
                }
            }

            return (crc ^ 0xffffffff) >>> 0;
        }

        const parts = [];
        const central = [];
        let offset = 0;

        for (const { name: filename, text } of files) {
            const name = encoder.encode(filename);
            const data = encoder.encode(text);
            const crc = crc32(data);

            if (data.length > 0xffffffff) {
                throw new Error("Individual file exceeds ZIP size limit");
            }

            // Local file header.
            const local = new Uint8Array(30 + name.length);
            const v = new DataView(local.buffer);

            v.setUint32(0, 0x04034b50, true);
            v.setUint16(4, 20, true);
            v.setUint16(6, 0x0800, true);
            v.setUint16(8, 0, true);
            v.setUint32(14, crc, true);
            v.setUint32(18, data.length, true);
            v.setUint32(22, data.length, true);
            v.setUint16(26, name.length, true);

            local.set(name, 30);

            // Central directory entry.
            const entry = new Uint8Array(46 + name.length);
            const c = new DataView(entry.buffer);

            c.setUint32(0, 0x02014b50, true);
            c.setUint16(4, 20, true);
            c.setUint16(6, 20, true);
            c.setUint16(8, 0x0800, true);
            c.setUint16(10, 0, true);
            c.setUint32(16, crc, true);
            c.setUint32(20, data.length, true);
            c.setUint32(24, data.length, true);
            c.setUint16(28, name.length, true);
            c.setUint32(42, offset, true);

            entry.set(name, 46);

            parts.push(local, data);
            central.push(entry);

            offset += local.length + data.length;
        }

        if (files.length > 65535 || offset > 0xffffffff) {
            throw new Error("ZIP exceeds classic ZIP limits");
        }

        const centralSize = central.reduce((sum, x) => sum + x.length, 0);

        const end = new Uint8Array(22);
        const e = new DataView(end.buffer);

        e.setUint32(0, 0x06054b50, true);
        e.setUint16(8, files.length, true);
        e.setUint16(10, files.length, true);
        e.setUint32(12, centralSize, true);
        e.setUint32(16, offset, true);

        return new Blob([...parts, ...central, end], {
            type: "application/zip",
        });
    }

    // ----------------------------
    // Download ZIP
    // ----------------------------

    function downloadZip() {
        if (!pages.length) {
            console.warn("[DOWNLOAD] No pages collected");
            return;
        }

        const files = [...pages]
            .sort((a, b) => a.index - b.index)
            .map((p) => ({
                name: `page_${String(p.index).padStart(4, "0")}.txt`,
                text: p.text,
            }));

        const blob = makeZip(files);
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `book-pages-${runId}.zip`;

        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 60000);

        console.log("[DOWNLOAD]", {
            files: files.length,
            sizeMB: (blob.size / 1048576).toFixed(2),
            filename: a.download,
        });
    }

    // ----------------------------
    // Main loop
    // ----------------------------

    let stopReason = null;

    try {
        let currentIndex = getIndex();
        let previousText = null;

        console.log("[START]", {
            index: currentIndex,
            storageKey,
            visibility: document.visibilityState,
        });

        while (!stopped && pages.length < CONFIG.maxPages) {
            console.log(`[WAIT] Index ${currentIndex}`);

            // Wait for stable text before saving.
            const text = await waitForStableText(currentIndex, previousText);

            if (stopped || text === null) break;

            savePage(currentIndex, text);

            // Locate Next.
            const next = document.querySelector(CONFIG.nextSelector);

            if (!next || next.disabled) {
                stopReason = "end of book";
                break;
            }

            // Navigate.
            console.log(`[NEXT] From index ${currentIndex}`);
            next.click();

            const newIndex = await waitForNextIndex(currentIndex);

            if (stopped || newIndex === null) break;

            // Stop if BookReader wrapped to the beginning.
            if (newIndex < currentIndex) {
                stopReason = `navigation wrapped: ${currentIndex} -> ${newIndex}`;
                console.warn("[WRAP DETECTED]", stopReason);
                break;
            }

            // Stop if the next index was already collected.
            if (seen.has(newIndex)) {
                stopReason = `repeated index ${newIndex}`;
                console.warn("[REPEAT DETECTED]", stopReason);
                break;
            }

            console.log(`[NAVIGATED] ${currentIndex} -> ${newIndex}`);

            previousText = text;
            currentIndex = newIndex;
        }

        if (stopped) {
            stopReason = "manually stopped";
        } else if (pages.length >= CONFIG.maxPages) {
            stopReason = "maximum page limit reached";
        }
    } catch (error) {
        stopReason = `error: ${error.message}`;
        console.error("[ERROR]", error);
    } finally {
        running = false;

        console.log("[FINISHED]", {
            pages: pages.length,
            reason: stopReason,
            storageKey,
        });

        // Download whatever was successfully extracted.
        try {
            downloadZip();
        } catch (error) {
            console.error("[ZIP ERROR]", error);
        }
    }
})();

// Example usage
() => {
    // Progress
    bookExtraction.status();

    // Stop and download pages collected so far
    bookExtraction.stop();

    // Inspect collected pages
    console.table(
        bookExtraction.pages.map((p) => ({
            index: p.index,
            characters: p.text.length,
        })),
    );
};
