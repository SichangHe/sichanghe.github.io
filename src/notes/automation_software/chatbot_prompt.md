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
