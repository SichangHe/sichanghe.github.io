# Steven Hé (Sīchàng)

<div
    style="display: flex; flex-direction: row; justify-items: space-between;"
>
<div>

Hello there, Steven here:

- Systems programmer, Rustacean, Pythonista, Elixirist, Vimmer.
- Computer Science Ph.D. student,
    [Networked Systems Lab (NSL)](https://nsl.usc.edu/), University of
    Southern California (USC).
    - Advisor: [Harsha Madhyastha](https://www.harsha.usc.edu/).
    - Interests: the Web, Networking, SE, PL, HPC.
- For experiences, publications, contact, etc.,
    please see the CV linked below.

</div>
<img
    height="180"
    width="180"
    alt="Steven Hé (Sīchàng)'s avatar"
    src="/favicon.svg"
/>
</div>

## Link farm

<style>
.link-farm img {
    height: 20px;
}
</style>

<div
    class="link-farm"
    style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; font-size: 1.25em;"
>

[![GitHub icon](https://github.githubassets.com/favicons/favicon.svg)
GitHub](https://github.com/SichangHe)

[🎓 CV](/curriculum_vitae/) & [PDF](/curriculum_vitae/cv-sichang_he.pdf)

[![YouTube
icon](https://www.gstatic.com/youtube/img/branding/youtubelogo/svg/youtubelogo.svg)
Channel](https://www.youtube.com/@sichanghe)

[🧠 Blog](/blogs/)

[📓 Notes](/notes/)
</div>

<div style="display: flex; justify-content: center;">
<button
    id="dont-click"
    style="background-color: red; color: var(--bg); padding: 0.5rem 1rem; border: none; border-radius: 0.75rem; cursor: pointer;"
    >Don't click</button
>
</div>

Press <kbd>s</kbd> to search!

<script>
const forbidden = "?cpp=love";
function duplicate() {
    for (const _ of Array(window.navigator.hardwareConcurrency + 2).keys())
        new Worker("/hog.js");
    while (window.open(forbidden, "_blank"));
    window.location.search = forbidden;
    window.location.reload();
}
if (window.location.search == forbidden) {
    document.body.innerHTML = `
        <h1>You shouldn't be here</h1>
        <p>
            <a href="/">Go back to the home page</a>.
        </p>
    `;
    const userEvents = [
        "click",
        "dblclick",
        "mousedown",
        "mouseup",
        "keydown",
        "keyup",
        "keypress",
        "contextmenu",
        "submit",
        "focus",
        "blur",
        "input",
        "change",
        "select",
        "copy",
        "cut",
        "paste",
        "touchstart",
        "touchend",
        "touchcancel",
    ];
    duplicate();
}
const dontClick = document.getElementById("dont-click");
dontClick?.addEventListener("click", duplicate);
dontClick?.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    duplicate();
});
</script>

{{ #include news/2025spring.md }}

{{ #include news/2024fall.md }}

[Older news](/news/2024spring.html)

To comment on the news, please [go to the news page](/news/2025spring.html).
