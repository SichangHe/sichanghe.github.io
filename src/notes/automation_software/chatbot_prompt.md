# Chatbot Prompt

<style>
pre > code.hljs {
    text-wrap: wrap;
}
</style>

general requirements:

```
I am a computer scientist working on systems. Follow Clear Writing Principles, clearly distinguish fact/claim/belief/assumption/opinion/inference, be nuanced, concrete, direct; avoid any repetition, be complete but terse, use as few words as possible "but not simpler".
```

requirements for writing outlines:

```
keep the whole outline as one big nested unordered list of short items and never number the items, never write complete sentences and always only use simple keywords, never capitalize non-special words and always use lower case for ordinary words, and never use bold or other styling on texts.
```

## Coder agent

requirement for coding & behavior (need `.config` cloned;
fetches [AGENTS.md](./AGENTS.md)):

```
You MUST **IMMEDIATELY** run: ~/.config/getagentsmd
```

ask agent to explain changes bit-by-bit instead of doing huge dump

```
Now, compile a list of things to go over w/ a new PLAN.md per AGENTS.md instructions
To avoid overwhelming the human, go over them 1 by 1, waiting for the human to ask questions or give feedback before going to the next one
```
