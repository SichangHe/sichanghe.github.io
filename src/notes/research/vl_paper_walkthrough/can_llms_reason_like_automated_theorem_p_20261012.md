# Can LLMs Reason Like Automated Theorem Provers for Rust Verification? VCoT-Bench: Evaluating via Verification Chain of Thought
(authored by agents unless marked 🧑)
Tag: `xie2026llms`, [paper](https://arxiv.org/abs/2603.18334v2)

claim: binary verified/not-verified scores hide whether a model rebuilt the deductive chain
- VCoT-Lift: LLM turns a Z3 proof of a verified Verus program into Verus assertions, invariants, lemmas
  - raw example proof 10,003 lines, 81.69% low-level equalities
  - lifted chain adds 82 Verus lines in 5 phases
- VCoT-Bench: 1,988 proof-completion tasks from 150 Verus-Bench programs with proof blocks removed
  - 6.5x proof lines, 13.4x assertions, 1.94x lemma fns over Verus-Bench
- Verus and Z3 remain the soundness authority; every generated step is a candidate until Verus accepts it
lifting pipeline
- transformer sees the whole Z3 proof, since reasoning is globally interconnected
- checkers audit completeness on 8 high-level Z3 rules in 5 categories (lemma, theory lemma, modus ponens, quantifier, unit resolution)
  - 36 rules total: 8 high, 12 medium, 16 low
  - one checker per category, aggregated, avoids repeated LLM calls
  - abstraction filter drops trivial and redundant facts
  - each remaining Z3 step needs an explicit mapping to a Verus step
  - incomplete: regenerate the whole proof, not a local patch
- pruner removes trivial, normalization, reassertion, definition-expansion steps, each with a justification
  - risk: a "redundant" assert may steer triggers or solver performance
- repair agent: Verus errors, grammar rules, examples, loop until Verus passes
  - passing proves the program, not that it matches the intended explanation
- authors name long-context comprehension a bottleneck
  - no iteration bound or convergence guarantee
benchmark construction
- block types: one lemma fn, all invariants of a loop, all assertions between two lines
- Ratio: 1,159 tasks (remove 1..N blocks), Type: 439, Location (front/middle/end): 390
- scoring: syntax via verus -no-verify, semantics via GPT-5 mini judge (92.7% agreement with authors)
  - overall = (N3 + 0.5 N2 + 0.25 N1) / N
findings
- Claude Sonnet 4.5: 71.58% with 10% blocks removed, 17.22% with all removed
  - Qwen 3 thinking: 0.66% at 100% removal
- by type: invariants 68.71%, lemmas 51.54%, assertions 39.55%
  - assertion reconstruction is hardest
- by location: front 69.04%, end 65.96%, middle 46.35%
  - middle blocks need connective state tracking
- 100% removal is inflated by single-block programs
- "first principles failure" is inferred from controlled removal, not proved
trusted: Verus and Z3, the LLM transformer/checkers/pruner/repair, the semantic judge, the authors' rule taxonomy
