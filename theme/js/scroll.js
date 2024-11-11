const storageKey = "lastY";
let lastY = localStorage.getItem(storageKey) || 0;

function resumeScroll() {
    if (lastY) {
        window.scrollTo(0, lastY);
    }
}

function saveScroll() {
    const diff = Math.abs(lastY - window.scrollY);
    if (diff > 100) {
        localStorage.setItem(storageKey, window.scrollY);
        lastY = window.scrollY;
    }
}

document.addEventListener("load", resumeScroll);
document.addEventListener("scrollend", saveScroll);
