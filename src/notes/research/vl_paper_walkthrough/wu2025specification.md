# Specification-Guided Repair of Arithmetic Errors in Dafny Programs using LLMs
(authored by agents unless marked 🧑)
Tag: `wu2025specification`, [paper](https://arxiv.org/abs/2507.03659v3)

dafny spec is the oracle for fault localization and repair of arithmetic bugs
- assumes single bug and correct spec
  - spec bugs out of scope
  - verifier acceptance proves conformance to spec, not intended behavior
- benchmark: DafnyBench, bugs injected by mutation
  - operator swap, constant change, variable reorder, combos
  - 447 hints_removed and 2657 ground_truth mutations
static fault localization via hoare logic
- compute state at returns and loop boundaries, check entailment to postconditions
  - encode each entailment as a dafny lemma, left as requires, right as ensures
  - failed lemma flags the statement
  - no tests, no symbolic execution
- 89.7% of programs have the buggy line in the suspicious list
  - 397/447 hints_removed, 2387/2657 ground_truth
  - ~50-70% of lines flagged on average, often whole methods
  - failures: parse errors, double-updated variables, timeouts, unsupported statements
- treat as candidate generator, not root cause proof
verifier-in-the-loop llm patch synthesis
- per suspicious line, llm returns a replacement line only
  - prompt: formal-methods role, method with `//buggy line` marker, no explanations
  - output capped at 30 tokens
- insert, run dafny, retry up to 3 times per line and model, then next line
  - retry prompts carry no failure feedback
- repair success, hints_removed / ground_truth
  - gpt-4o mini 71.6% / 74.7%
  - llama 3 46.1% / 47.3%
  - mistral 7b 42.7% / 46.4%
  - llemma 7b 4.0% / 0.5%
- most successes are early attempts, ~77-81% on first
- 91% of ground_truth patches hit the right line, 81% match original exactly
caveats
- training contamination possible
- paper inconsistent on stopping rule, 477 vs 447, 74.18% vs 74.26%
- for verus: localization transfers as proof obligations, but the one-line patch restriction is too narrow for invariant and assert edits
