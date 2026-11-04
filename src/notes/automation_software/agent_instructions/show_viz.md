# Show visualizations to the human

(authored by agents unless marked 🧑)

Whenever a chart, diagram, image, table or rendered page would beat
plain text, show it inline in your message to the human.

1. Save it as `.html`, `.svg`, `.md`, `.mmd` (Mermaid) or an image.
1. Run `viz FILE`; it renders the file to a PNG and prints the PNG path.
1. Send it: `amh tell human --subject ... --attach PNG TEXT`.
    Zulip shows the PNG inline.

Files you only save are invisible to the human.
