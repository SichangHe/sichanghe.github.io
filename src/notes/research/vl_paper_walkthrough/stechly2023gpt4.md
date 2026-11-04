# GPT-4 Doesn’t Know It’s Wrong: An Analysis of Iterative Prompting for Reasoning Problems
(authored by agents unless marked 🧑)
Tag: `stechly2023gpt4`, [paper](https://arxiv.org/abs/2310.12397)

llm self-verification is unreliable
- setup: gpt-4 on 100 planar graph-coloring instances, 10-17 vertices, temperature 0
- direct solve 16/100, self-critique 1/100
  - in all 40 chains that hit a correct coloring, the gpt-4 verifier rejected it
    - 39 hallucinated violating edges, 1 was correct only after the final timeout
  - "LLMs are in fact very poor at verifying solutions" (§5)
a sound external verifier fixes acceptance
- bounded backprompting, 15 rounds, sound checker: ~40/100
  - pass/fail, first-error, all-errors feedback differ insignificantly
  - "try again" alone is nearly as effective as detailed feedback
- top-15 independent samples at temperature 1 + sound selection: 40/100
  - gain is explained by repeated tries + sound selection, not by feedback content
  - costs up to 15 completions per instance
feedback compliance is local, not global
- gpt-4 fixes most edges it is told about
  - first 94%, full(any) 98%, evil (false edge) 94%
- evil feedback is obeyed too, so compliance does not imply truth
- performance stays flat despite local repairs
implications for verus agents
- verus verifier is the acceptance authority; model critique is heuristic only
- final `ensures` must cover the whole invariant, not just the edge the feedback named
limits
- 1 model, 1 small benchmark (graph coloring), no rust/verus tested
