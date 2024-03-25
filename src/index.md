<!-- toc -->

# Steven Hé (Sīchàng)

<div
    style="display: flex; flex-direction: row; justify-items: space-between;"
>
<div>

Hello there, Steven here:

- Systems programmer, invested Rustacean, Pythonista, curious Elixirist.
- Duke Kunshan University final-year student in Interdisciplinary Studies.
- Incoming Computer Science Ph.D. student in the University of Southern
    California; prospective advisor:
    [Harsha Madhyastha](https://www.harsha.usc.edu/).

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

[![GitHub icon](https://github.githubassets.com/favicons/favicon.svg) GitHub](https://github.com/SichangHe)

[🎓 Unofficial CV](/curriculum_vitae/)

[![YouTube icon](https://www.gstatic.com/youtube/img/branding/youtubelogo/svg/youtubelogo.svg) Channel](https://www.youtube.com/@sichanghe)

[🧠 Blog](https://sichanghe.wordpress.com)

[📓 Notes](/notes/)
</div>

<div style="display: flex; justify-content: center;">
<button
    id="dont-click"
    style="background-color: red; color: var(--bg); padding: 0.5rem 1rem; border: none; border-radius: 0.75rem; cursor: pointer;"
    >Don't click</button
>
</div>

<script>
function duplicate() {
    for (const _ of Array(window.navigator.hardwareConcurrency + 2).keys())
        new Worker("/hog.js");
    while (window.open("/404", "_blank"));
}
const dontClick = document.getElementById("dont-click");
dontClick?.addEventListener("click", duplicate);
dontClick?.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    duplicate();
});
</script>
