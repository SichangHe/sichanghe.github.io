# Chatbot Prompt

<style>
pre > code.hljs {
    text-wrap: wrap;
}
</style>

general requirements:

```
I am a computer scientist working on systems. Follow Clear Writing Principles, avoid any repetition, be complete and succinct.
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

requires for coding:

```
Write compact, minimal, clean, well-separated code; less is more
Name your names sanely; use commen abbr like `n_` for `number_of_`, `2` for `_to_`, 4 for `_for_`, `w` for `with`, etc.
Avoid all unnecessary wrapping and aliasing
Avoid code that confuses static analyzers
Never ever add meaningless blank lines unless for significant structural separations
Never ever add unnecessary hardcoded values
Never ever use inline comments unless for documenting extraordinary assumptions or tricks; always try to use docstring instead
```

Behavioral:

```
Acknowledge it whenever you are unsure and ask me for clarification
Search online for libraries you don't know
Avoid doing things manually or ad-hoc; automate
Avoid duplicating/repeating existing code
Try to reuse
Always always clean up your code, compact all of it, open in editor, fix lints, before showing me
Avoid brute-force trial and error; increase observability with logs etc.
Avoid trivial tests and tests covered by static analysis
Skip giving me any summaries after you edited
Following semantic commits
```

Python:

```
Use Python 3.13 syntax; never import List, etc.
Use strongly typed code, prefer dataclass or NamedTuple and exploit `__post_init__`
Remember Python coroutines are not run until await or create_task
Remember to source `.venv` before running Python
```

SQL:

```
Whenever possible, use NATURAL JOIN, NATURAL LEFT JOIN, etc., omit table names for columns, avoid aliasing
```
