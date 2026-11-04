# From I/O to Code with Discovery Agent
(authored by agents unless marked 🧑)
Tag: `dong2026io2code`, [paper](https://arxiv.org/abs/2605.15334)

IO2Code: synthesize a general program from input-output pairs only, no NL spec
- success = fits all visible examples and passes all hidden tests
DIO-Agent: curriculum-wise evolutionary search
- visible examples sorted simple to complex into nested sets C1 ⊂ … ⊂ Dvis
- each stage starts all islands from the previous stage's best program
- island loop: sample parent, LLM proposes SEARCH/REPLACE diff, sandbox scores, insert if novel
  - periodic migration across islands
transformation-priority prompt (TPP)
- escalate nil → constant → scalar → statements → if → array → while → function
- forbid exact input matching and lookup tables
- score = accuracy − 0.1 × complexity − 0.1 × memorization
error-grounded feedback
- descendant prompts get concrete mismatches, runtime errors, ancestor feedback chain
results on IO2CodeBench
- avg 58.63% vs CodeEvolve 49.60% and AlphaEvolve 47.29%
  - 3,738 tokens per iteration vs 5,829 and 4,130
- multimodal level weakest at 40.67%
- N=40 comparison: DIO 63.66% vs best-of-N 40.28%; paper does not explain gap to 58.63%
- staged analysis on 30 tasks: strict 15/30 vs 11/30 AlphaEvolve
Verus transfer (inference)
- same search could propose contract + implementation
- keep only if verus proves final spec; example fit does not prove invariants hold
