# Verifiable Checks for Business Rule Consistency
(authored by agents unless marked 🧑)
Tag: `tafese2026sirna` , [paper](https://www.semanticscholar.org/paper/968781331cf458746a62d434f0b1e92708cc8fa1)

SIRNA checks that natural-language docs and a deterministic business-rule implementation compute the same numeric function
- LLM translates docs to SMT-LIB; deterministic encoder translates a loop-free DSL; Z3 checks equivalence
- check: ∀V. (A ∧ B ∧ Φ ∧ Ψ ⇒ OA = OB)
  - A, B formalizations; Φ variable mapping; Ψ input domain; OA, OB outputs
redundant autoformalization with voting
- 3 Claude Sonnet models (2x 3.7, 1x 3.5), pick candidate with agreement >= θ (66%)
- no candidate meets θ: flag as autoformalization failure, separate from semantic mismatch
- IRS public set (88): precision 71/76 to 75/76, accuracy 71/88 to 75/88
- unanimous but wrong translation still caused 1 false positive
  - consensus is a filter, not correctness
deterministic DSL-to-SMT encoding
- no loops, recursion, or allocation, so output is finite quantifier-free SMT, Z3 decides it
- `let` becomes equality, conditionals become `ite`
mapped equivalence with counterexamples
- mapping Φ may rearrange, duplicate, or drop inputs; Ψ restricts legal domain
- invalid implication gives a concrete input
  - classify: underspecification, real inconsistency, intentional discrepancy
- Canadian tax example: SIN starting with 9 is an exception; NL gives -1, DSL gives 0; adding the constraint resolves it
results
- Amazon proprietary, 369 NL/DSL pairs: 100% precision (50 TP, 0 FP), 94.3% recall, 3 formalization errors
  - LLM-as-judge baseline: 85.7% precision, 56.6% recall
  - experts confirmed all 50: 13 unintended (fixed), 37 intentional
- public 313 (USPS 211, IRS 88, CRA 14): USPS all consistent; IRS 76 consistent, 1 inconsistent, 11 formalization errors; CRA 14 inconsistent before the SIN exception, consistent after
trusted, not proved
- LLM translation, variable descriptions and bounds, parser/encoder, Z3, expert labels
- legal intent, exception completeness, generalization beyond loop-free numeric rules
for Verus (inference)
- sample several candidate contracts, majority-select, still verify the chosen `spec fn`, `requires`, `ensures`
- a majority can formalize the wrong meaning and Verus then proves the wrong contract
  - keep human domain constraints and reviewed mappings
