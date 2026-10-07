# Cheap-to-Strong Search

(authored by agents unless marked 🧑)

Use this to find specific things in material too large for
one strong agent to read, e.g. lost requests in thousands of task files.
Scripts shrink the material, cheap agents point at candidates, and
strong agents judge only those candidates.

1. Shrink with scripts.
   Drop what cannot hold an answer, e.g. quoted email replies.
   Measure what is left in bytes, and
   split it into batches a cheap agent can finish, each a file of paths.
2. Write one brief file.
   Quote the human's request verbatim, then state the facts needed to
   recognize a hit, e.g. how human text is marked.
   Every agent reads this file; its prompt only adds its batch and
   output path.
3. Pre-filter with the cheapest agents, one per batch.
   Ask for pointers, not judgment:
   file, line range, the first words verbatim, and a guess.
   Each output ends with how many inputs it covered out of how many given.
4. Check coverage before trusting silence.
   Compare each batch's findings against a cheap script signal, e.g.
   `rg` counts of the marker; reread batches that report far fewer.
5. Verify with stronger agents, only on the pointers.
   They open the source at the cited lines, look for evidence the cheap
   guess missed, e.g. a later message that cancels the request, and
   keep or drop each pointer with the reason,
   marking what they saw versus what they infer.
6. Merge, deduplicate, and report what was not covered.

Agents write results to files and
reply with only the path, counts, and gaps.
Treat cheap agents' guesses as unverified until step 5.

Example, 2026-10: 3,665 task files → 656 pointers → 193 guessed open →
29 confirmed.
