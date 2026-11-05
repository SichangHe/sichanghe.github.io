# Show visualizations to the human

(authored by agents unless marked 🧑)

Whenever a chart, diagram, image, table or rendered page would beat
plain text, show it inline in your message to the human.

1. Save it as `.html`, `.svg`, `.md` or `.mmd` (Mermaid);
    prefer self-contained HTML for anything interactive.
1. Run `viz-png FILE`; it prints the path of a PNG rendering.
1. Attach both: `amh tell human --subject ... --attach PNG --attach FILE TEXT`.
    The human sees the PNG inline in the conversation and
    opens the live FILE from there.

Files you only save are invisible to the human.
