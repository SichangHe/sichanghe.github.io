Create an explicit diagram brief before drawing: canvas/aspect ratio, nodes and
their labels, edges and directions, groups or hierarchy,
intended reading order, layout, visual style, and any required colors or
output paths.
Resolve missing choices with the user when they materially affect the diagram.

Use a persistent ChatGPT conversation with `pb-chatgpt-prompt-file`. Use a xhigh or max thinking effort.
Tell ChatGPT the full diagram brief, and tell them:
```
DO NOT use image generation. Code the diagram in SVG by writing self-contained SVG code in plain text. Render your SVG into PNG and look at it to check if it looks pretty and the layout is good, and do so iteratively until it is good. Make sure the fonts are as big as they possibly can without looking bad.
```

(Below are written by agents, for reference only)

Retrieve the SVG from the captured response, not from a ChatGPT attachment.
The supported client writes the answer to `--output`;
it has no binary-artifact download command. Extract the plain-text SVG:

```sh
extract_chatgpt_svg "$work_dir/chatgpt-answer.md" "$work_dir/diagram.svg"
```

Render the SVG locally and inspect the PNG visually:

```sh
convert -background white -density 192 "$work_dir/diagram.svg" "$work_dir/diagram.png"
```
