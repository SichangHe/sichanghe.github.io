# PropertyGPT: LLM-driven Formal Verification of Smart Contracts through Retrieval-Augmented Property Generation
(authored by agents unless marked 🧑)
Tag: `liu2025propertygpt`, [paper](https://doi.org/10.14722/ndss.2025.241357)

pipeline = llm spec generation + formal check for Solidity (NDSS 2025)
- goal: generated properties compilable, appropriate, verifiable
- verus mappings below are inference; paper targets Solidity and custom language PSL
small intermediate property language (PSL)
- 3 forms: invariants over state, pre/post Hoare triples, rules made of assume/assert
- compile against the contract; reject undefined variables, bad operators, properties not mentioning target function
- verus form: requires/ensures/invariant as target grammar, old values as pre-state snapshots
- limit: adds trusted compiler; proves the formula, not the auditor's intent
code-keyed retrieval augmentation
- embed critical code of human properties (not the property text), retrieve by dot product above threshold
  - example threshold 0.8, typically 10-20 references, one candidate per reference as one-shot example
- 90 held-out Certora properties, 9 projects: recall 0.80, precision 0.64, F1 0.71
- similarity of detected vs missed cases 0.68 vs 0.67 (37 detection cases)
  - inference: barely separates them; no no-retrieval ablation, so retrieval benefit unmeasured
type-specific prompts
- separate rule prompt and function pre/post prompt
  - symbolic $var, never copy names from the example, strict output grammar
- cannot ensure semantic relevance
compiler-feedback repair plus static check
- feed error location and message back, retry cap 9
  - compilable 321/370 (87%) with repair vs 234/370 (63%) without
  - 84% of compilable properties needed ≤5 fixes
  - undeclared variables dominate residual failures
- static check that a rule actually calls the target function, special repair prompt if not
- compiling does not mean correct; repair may silently delete the intended assertion
- verus form: run verus per edit, add AST checks for non-vacuous postconditions
candidate ranking
- weighted sum of 4 similarities (code, code summary, property, property summary)
  - linear regression on 3,622 properties; weights 0.134, 0.556, 0.141, 0.168
- send top-K to prover; paper recommends top-2 (precision 0.64 → 0.65 vs top-1)
- ranking is similarity not logical strength; summaries are untrusted model steps
source-level prover
- symbolic execution with strongest postconditions over Solidity small-step semantics
  - {p} f {q} checks sp(f, p ∧ δ) ⇒ q; failed formulas go to BMC for counterexamples
- bounds and assumptions
  - BMC depth 3, loop iterations 5
  - external calls assumed to succeed with symbolic return, sha3 injective
- no soundness proof stated
detection results (selected datasets, not general coverage)
- 9/13 CVEs, 17/24 attack incidents
- 22 findings on 4 bounty projects, 12 confirmed and fixed for $8,256
- 7 missed attacks lacked runtime context (e.g. deflationary tokens)
trusted: PSL compiler, version converter, symbolic executor, Z3 4.11.2, embedding/summary models, manual equivalence judging
