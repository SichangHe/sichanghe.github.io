// ==UserScript==
// @name         ChatGPT Read Aloud Controls
// @namespace    chatgpt-read-aloud-controls
// @version      2.0
// @match        https://chatgpt.com/*
// @run-at       document-start
// @grant        none
// @sandbox      raw
// @inject-into  page
// ==/UserScript==

(() => {
  "use strict";

  // Prevent duplicate installation.
  if (window.__RA_ENHANCER__) return;

  const state = window.__RA_ENHANCER__ = {
    audio: null,

    rate: Number(localStorage.getItem("__ra_rate")) || 1.0,
    collapsed: localStorage.getItem("__ra_collapsed") === "1",

    scrubbing: false,

    panel: null,
    collapsedButton: null,
    pauseButton: null,
    speedSelect: null,
    seek: null,
    currentLabel: null,
    endLabel: null,
  };

  state.rate = Math.max(0.1, Math.min(4.0, state.rate));

  // ============================================================
  // Capture ChatGPT's detached Read Aloud audio
  // ============================================================

  const originalPlay = HTMLMediaElement.prototype.play;

  function looksLikeReadAloud(audio) {
    if (!(audio instanceof HTMLAudioElement)) return false;

    const src = audio.currentSrc || audio.src || "";

    return (
      src.startsWith("blob:https://chatgpt.com/") ||
      !audio.isConnected
    );
  }

  function captureAudio(audio) {
    state.audio = audio;

    audio.playbackRate = state.rate;
    audio.defaultPlaybackRate = state.rate;

    if (!audio.__raListenersInstalled) {
      audio.__raListenersInstalled = true;

      for (const event of [
        "play",
        "pause",
        "ended",
        "timeupdate",
        "progress",
        "durationchange",
        "ratechange",
        "loadedmetadata",
      ]) {
        audio.addEventListener(event, updateControls);
      }
    }

    updateControls();
  }

  HTMLMediaElement.prototype.play = function (...args) {
    if (looksLikeReadAloud(this)) {
      captureAudio(this);
    }

    return originalPlay.apply(this, args);
  };

  // ============================================================
  // Timeline helpers
  // ============================================================

  function getSeekBounds(audio) {
    if (!audio || audio.seekable.length === 0) {
      return null;
    }

    return {
      start: audio.seekable.start(0),
      end: audio.seekable.end(audio.seekable.length - 1),
    };
  }

  function seekBy(seconds) {
    const audio = state.audio;
    if (!audio) return;

    const bounds = getSeekBounds(audio);

    if (!bounds) {
      // Fallback while seekable information is not ready yet.
      try {
        audio.currentTime = Math.max(
          0,
          audio.currentTime + seconds
        );
      } catch {}

      return;
    }

    const target = Math.max(
      bounds.start,
      Math.min(
        bounds.end,
        audio.currentTime + seconds
      )
    );

    audio.currentTime = target;
    updateControls();
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";

    seconds = Math.max(0, seconds);

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  // ============================================================
  // Panel
  // ============================================================

  function makeButton(text) {
    const button = document.createElement("button");

    button.textContent = text;

    Object.assign(button.style, {
      boxSizing: "border-box",
      background: "#343541",
      color: "#fff",
      border: "1px solid #666",
      borderRadius: "6px",
      padding: "6px 10px",
      cursor: "pointer",
      font: "13px system-ui, sans-serif",
    });

    button.addEventListener("mouseenter", () => {
      button.style.background = "#444654";
    });

    button.addEventListener("mouseleave", () => {
      button.style.background = "#343541";
    });

    return button;
  }

  function setCollapsed(collapsed) {
    state.collapsed = collapsed;

    localStorage.setItem(
      "__ra_collapsed",
      collapsed ? "1" : "0"
    );

    if (state.panel) {
      state.panel.style.display =
        collapsed ? "none" : "flex";
    }

    if (state.collapsedButton) {
      state.collapsedButton.style.display =
        collapsed ? "block" : "none";
    }
  }

  function createControls() {
    if (!document.body) return;
    if (document.getElementById("__raControls")) return;

    // ----------------------------------------------------------
    // Main panel
    // ----------------------------------------------------------

    const panel = document.createElement("div");
    panel.id = "__raControls";
    state.panel = panel;

    Object.assign(panel.style, {
      position: "fixed",
      right: "18px",
      bottom: "80px",

      zIndex: "999999",

      boxSizing: "border-box",
      width: "340px",

      display: "flex",
      flexDirection: "column",
      gap: "9px",

      padding: "10px",

      background: "#202123",
      color: "#fff",

      border: "1px solid #555",
      borderRadius: "10px",

      boxShadow: "0 4px 16px rgba(0,0,0,.35)",

      font: "13px system-ui, sans-serif",
      colorScheme: "dark",
    });

    // ----------------------------------------------------------
    // Header
    // ----------------------------------------------------------

    const header = document.createElement("div");

    Object.assign(header.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    });

    const title = document.createElement("span");
    title.textContent = "Read aloud";

    const hideButton = makeButton("−");
    hideButton.title = "Collapse";
    hideButton.style.padding = "2px 10px";

    hideButton.onclick = () => {
      setCollapsed(true);
    };

    header.append(title, hideButton);

    // ----------------------------------------------------------
    // Playback controls
    // ----------------------------------------------------------

    const playbackRow = document.createElement("div");

    Object.assign(playbackRow.style, {
      display: "flex",
      gap: "7px",
    });

    const backButton = makeButton("−10s");
    const pauseButton = makeButton("Pause");
    const forwardButton = makeButton("+10s");

    state.pauseButton = pauseButton;

    backButton.style.flex = "1";
    pauseButton.style.flex = "1";
    forwardButton.style.flex = "1";

    backButton.onclick = () => {
      seekBy(-10);
    };

    forwardButton.onclick = () => {
      seekBy(10);
    };

    pauseButton.onclick = async () => {
      const audio = state.audio;
      if (!audio) return;

      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }

      updateControls();
    };

    playbackRow.append(
      backButton,
      pauseButton,
      forwardButton
    );

    // ----------------------------------------------------------
    // Speed selector
    // ----------------------------------------------------------

    const speedRow = document.createElement("div");

    Object.assign(speedRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    });

    const speedLabel = document.createElement("span");
    speedLabel.textContent = "Speed";

    const speedSelect = document.createElement("select");
    state.speedSelect = speedSelect;

    Object.assign(speedSelect.style, {
      boxSizing: "border-box",

      background: "#343541",
      color: "#fff",

      border: "1px solid #666",
      borderRadius: "6px",

      padding: "5px 8px",

      font: "13px system-ui, sans-serif",

      cursor: "pointer",
      colorScheme: "dark",
    });

    // 0.1× through 4.0×
    for (let i = 1; i <= 40; i++) {
      const rate = i / 10;

      const option = document.createElement("option");

      option.value = rate.toFixed(1);
      option.textContent = `${rate.toFixed(1)}×`;

      if (Math.abs(rate - state.rate) < 0.001) {
        option.selected = true;
      }

      speedSelect.appendChild(option);
    }

    speedSelect.onchange = () => {
      state.rate = Number(speedSelect.value);

      localStorage.setItem(
        "__ra_rate",
        String(state.rate)
      );

      if (state.audio) {
        state.audio.playbackRate = state.rate;
        state.audio.defaultPlaybackRate = state.rate;
      }
    };

    speedRow.append(
      speedLabel,
      speedSelect
    );

    // ----------------------------------------------------------
    // Timeline
    // ----------------------------------------------------------

    const seekRow = document.createElement("div");

    Object.assign(seekRow.style, {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    });

    const currentLabel = document.createElement("span");
    currentLabel.textContent = "0:00";
    currentLabel.style.minWidth = "38px";

    const endLabel = document.createElement("span");
    endLabel.textContent = "0:00";
    endLabel.style.minWidth = "38px";

    state.currentLabel = currentLabel;
    state.endLabel = endLabel;

    const seek = document.createElement("input");
    state.seek = seek;

    seek.type = "range";
    seek.min = "0";
    seek.max = "1";
    seek.step = "0.05";
    seek.value = "0";

    Object.assign(seek.style, {
      flex: "1",
      minWidth: "0",
      cursor: "pointer",
    });

    seek.addEventListener("pointerdown", () => {
      state.scrubbing = true;
    });

    window.addEventListener("pointerup", () => {
      state.scrubbing = false;
      updateControls();
    });

    seek.addEventListener("input", () => {
      const audio = state.audio;
      if (!audio) return;

      const bounds = getSeekBounds(audio);
      if (!bounds) return;

      let target = Number(seek.value);

      target = Math.max(
        bounds.start,
        Math.min(bounds.end, target)
      );

      audio.currentTime = target;

      currentLabel.textContent =
        formatTime(target);
    });

    seekRow.append(
      currentLabel,
      seek,
      endLabel
    );

    // ----------------------------------------------------------
    // Assemble panel
    // ----------------------------------------------------------

    panel.append(
      header,
      playbackRow,
      speedRow,
      seekRow
    );

    // ----------------------------------------------------------
    // Small collapsed button
    // ----------------------------------------------------------

    const collapsedButton = makeButton("RA");
    collapsedButton.id = "__raCollapsed";

    state.collapsedButton = collapsedButton;

    Object.assign(collapsedButton.style, {
      position: "fixed",
      right: "18px",
      bottom: "80px",

      zIndex: "999999",

      padding: "7px 10px",

      background: "#202123",
      color: "#fff",

      border: "1px solid #666",
      borderRadius: "8px",

      boxShadow: "0 3px 10px rgba(0,0,0,.3)",
    });

    collapsedButton.title =
      "Show Read Aloud controls";

    collapsedButton.onclick = () => {
      setCollapsed(false);
    };

    document.body.append(
      panel,
      collapsedButton
    );

    setCollapsed(state.collapsed);
    updateControls();
  }

  // ============================================================
  // Keep UI synchronized with current audio
  // ============================================================

  function updateControls() {
    if (!state.pauseButton) return;

    const audio = state.audio;

    if (!audio) {
      state.pauseButton.textContent = "Pause";
      state.currentLabel.textContent = "0:00";
      state.endLabel.textContent = "0:00";
      return;
    }

    state.pauseButton.textContent =
      audio.paused ? "Play" : "Pause";

    // ChatGPT may alter the rate internally.
    // Keep our selected rate authoritative.
    if (
      Math.abs(audio.playbackRate - state.rate) > 0.001
    ) {
      audio.playbackRate = state.rate;
    }

    const bounds = getSeekBounds(audio);

    if (!bounds) {
      state.currentLabel.textContent =
        formatTime(audio.currentTime);

      return;
    }

    state.seek.min = String(bounds.start);
    state.seek.max = String(bounds.end);

    if (!state.scrubbing) {
      state.seek.value =
        String(
          Math.max(
            bounds.start,
            Math.min(
              bounds.end,
              audio.currentTime
            )
          )
        );
    }

    state.currentLabel.textContent =
      formatTime(audio.currentTime);

    state.endLabel.textContent =
      formatTime(bounds.end);
  }

  setInterval(updateControls, 150);

  // ============================================================
  // Add permanent 🔊 button to every assistant response
  // ============================================================

  function getVisibleReadAloudMenuItem() {
    return [
      ...document.querySelectorAll(
        '[data-testid="voice-play-turn-action-button"]'
      ),
    ].find(
      element => element.offsetParent !== null
    );
  }

  async function triggerReadAloud(moreButton) {
    // User explicitly clicked our button:
    // always expose the controls.
    setCollapsed(false);

    moreButton.click();

    for (let i = 0; i < 90; i++) {
      await new Promise(resolve =>
        requestAnimationFrame(resolve)
      );

      const item = getVisibleReadAloudMenuItem();

      if (item) {
        item.click();
        return;
      }
    }

    console.warn(
      "[RA] Could not find ChatGPT's Read Aloud menu item."
    );
  }

  function addReadAloudButtons() {
    const bars = document.querySelectorAll(
      '[aria-label="Response actions"]'
    );

    for (const bar of bars) {
      const container = bar.parentElement;
      if (!container) continue;

      // Already added for this response.
      if (
        container.querySelector(
          ':scope > [data-ra-read-aloud-button]'
        )
      ) {
        continue;
      }

      const moreButton = bar.querySelector(
        'button[aria-label="More actions"]'
      );

      if (!moreButton) continue;

      const readButton = document.createElement("button");

      readButton.type = "button";
      readButton.textContent = "🔊";

      readButton.dataset.raReadAloudButton = "1";

      readButton.setAttribute(
        "aria-label",
        "Read aloud"
      );

      readButton.title = "Read aloud";

      Object.assign(readButton.style, {
        boxSizing: "border-box",

        width: "32px",
        height: "32px",
        flex: "0 0 32px",

        padding: "0",

        border: "0",
        borderRadius: "8px",

        background: "transparent",
        color: "inherit",

        cursor: "pointer",

        fontSize: "15px",
        lineHeight: "32px",
        textAlign: "center",
      });

      readButton.addEventListener(
        "mouseenter",
        () => {
          readButton.style.background =
            "var(--token-surface-hover, rgba(128,128,128,.15))";
        }
      );

      readButton.addEventListener(
        "mouseleave",
        () => {
          readButton.style.background =
            "transparent";
        }
      );

      readButton.onclick = event => {
        event.preventDefault();
        event.stopPropagation();

        triggerReadAloud(moreButton);
      };

      // Insert outside ChatGPT's hover/mask action bar,
      // so this button remains visible.
      container.insertBefore(
        readButton,
        bar
      );
    }
  }

  // ============================================================
  // Start DOM-dependent parts without DOMContentLoaded
  // ============================================================

  function startDOMIntegration() {
    if (!document.body) {
      requestAnimationFrame(startDOMIntegration);
      return;
    }

    createControls();
    addReadAloudButtons();

    let scheduled = false;

    const observer = new MutationObserver(() => {
      if (scheduled) return;

      scheduled = true;

      requestAnimationFrame(() => {
        scheduled = false;

        createControls();
        addReadAloudButtons();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  startDOMIntegration();
})();
