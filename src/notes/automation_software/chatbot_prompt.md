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

search & cite sources:

```
For searches, always quote the relevant original words verbatim and provide a pointer to the source.
```

summarize paper w/ focus on FOCUS

```
What does this paper talk about in terms of FOCUS? Try your best to summarize every single aspect mentioned in the paper. For every single point you elaborate, always quote the exact original related phrase, sentence, or paragraph.
```

general requirements (old):

```
Requirements R: write prose that is clear and coherent, professional and complete yet approachable and natural, as succinct and simple as possible but not too simple. Prefer verb over noun, adjective over adverb, active tense over passive tense. Avoid fluff or self-judgements. Never lose any information, or praise or repeat any given content. Keep the original language, style, and meaning as much as possible. Make minimal changes for improvement.
```

To remind the bot the requirements:

```
Repeat Requirements R verbatim.
```

requirements for writing outlines:

```
keep the whole outline as one big nested unordered list of short items and never number the items, never write complete sentences and always only use simple keywords, never capitalize non-special words and always use lower case for ordinary words, and never use bold or other styling on texts.
```

point out problem but not revise:

```
Criticize my draft and list all the problems. For each problem separately, quote my original words, reason about the problem, provide suggestions, and provide suggested change.
```

compress text:

```
Revise this part to make it more succinct, without loosing any information. Stay close to the original language and make minimal changes.
```

refine prompt based on result I do not like:

```
I do not like how you PROBLEM.
What could I have said instead so that you would never ever say that?
```

ask to find official sources:

```
Do not trust random strangers and blogs on the Internet. Try to find the official sources and quote them.
```

## Coder agent

requirement for coding & behavior (need `.config` cloned; fetches [AGENTS.md](./AGENTS.md)):

```
You MUST **IMMEDIATELY** run: ~/.config/getagentsmd
```

git interactive rebase

```
Instructions for interactive rebase:
ALWAYS pass in non-interactive script as `EDITOR` for all Git commands to avoid stuck
E.g. when editing Git-TODO or commit message
First, to see what the editor would be editing, use script that print out file content elsewhere AND THEN EMPTY THE FILE to abort Git
Then, to actually edit, use a script that directly writes desired content to file
If the preview file contains a non‑empty commit message or todo, proceed by writing it back unchanged with the write script. Only ask user if the preview content is empty or I explicitly asked to edit it. Existing commit messages are acceptable by default
For each conflict, figure out yourself what each side is doing, and combine the changes in a way that preserves both functionalities
```

use tmux for REPL

```
To spawn and continuously interact w/ long-running REPL, you MUST use tmux
Create a tmux session and start the REPL there
To read REPL output, pipe `tmux capture-pane` to a file
Never directly read the entire REPL output screen to avoid context pollution
Print unique markers to help yourself find relevant new output
To run commands in the REPL, `tmux send-keys` ending with Enter
Be very careful to clean up any tmux session you create and stop any REPL to avoid leaking resources
```

ask agent to explain changes bit-by-bit instead of doing huge dump

```
Now, compile a list of things to go over w/ a new PLAN.md per AGENTS.md instructions
To avoid overwhelming the human, go over them 1 by 1, waiting for the human to ask questions or give feedback before going to the next one
```
