# Verifying LLM-Generated Code in the Context of Software Verification with Ada/SPARK
(authored by agents unless marked 🧑)
Tag: `cramer2025llm`, [paper](http://arxiv.org/abs/2502.07728v1)

Marmaragan: gpt-4o adds proof annotations to existing Ada/SPARK programs
- input: spec (.ads), implementation (.adb), dependencies
- prompt restricts edits to Assert/Loop_Invariant/Loop_Variant (+ for/if enclosing only pragmas)
  - no check that the model obeys the restriction
- success = GNATprove reports no errors and no mediums
  - medium = unproved obligation
  - medium count is not a progress measure
verifier feedback
- optional: run GNATprove first, put each medium + its source line and the next line in the prompt
  - no ablation without it
- retry: feed back failed attempt + its mediums
  - unspecified: which candidate when n>1, how context accumulates
sampling vs retry under a fixed budget of 12 answers per case, n samples x (r+1) rounds
- n=12 r=0: 20/71
- n=6 r=1: 24/71 (rerun 26)
- n=4 r=2: 24/71 (rerun 25)
- n=3 r=3: 20/71
- n=2 r=5: 18/71
- takeaway: balance samples and 1-2 feedback rounds beats either extreme
  - caveat: no n=1 config, no statistics, only 2 reruns
- explain-first prompt: 25/71 at n=6 r=1, equals mean of base runs, so no evidence of gain
benchmark: 71 cases made by stripping annotations from verified programs
- keep a case only if GNATprove then emits mediums
- 5 schemata, solved across all 5 experiments
  - One Assert 7/7
  - Last Invariant One Loop 14/22
  - Last Invariant All Loops 6/12
  - All Pragmas 5/14
  - All Pragmas One Loop 4/16
- headline 36/71 = 50.7% is the union across 5 configs, not one config
- source counts in §4.1 sum to 18, not the stated 16 programs
- Argu cases (36) post-date gpt-4 training cutoff per authors: 16/36 solved
  - rest 20/35 (inferred)
caveats
- verifying file is not proof that original code and contracts are preserved
- specs fixed; generating pre/postconditions is future work
- small benchmark, cases from the same program not independent
