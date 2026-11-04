# Self-Spec Verifiable Code Generation
(authored by agents unless marked 🧑)
Tag: `qian2026selfspec`, [paper](https://arxiv.org/abs/2609.39568)

verifier acceptance does not mean the spec captures the requirement
- VeriCodeBench: 400 problems, 100 each for C/ACSL, Java/JML, Rust/Verus, Python/Nagini
  - model writes spec then code, verified against its own spec
- metric: joint success = spec covers all curated targets and verifier accepts code
  - coverage < 1 can hide behind high validity
  - Kimi-K2.7-Code, Rust, direct: validity 91 both self-spec and oracle spec, coverage 0.697 vs 1.000, joint 57 vs 91
- a verified-but-incomplete contract counts as done if only the verifier is checked
  - best Rust result 73 of 100 joint (Claude-Sonnet-5, CodeNova)
  - a product reporting only "Verus accepted" would count 97 of those as done
- paper's checker needs hand-written hidden targets, so it only works where someone already wrote them
freeze the self-written spec
- store requires/ensures as data, rebuild the signature from it after every repair
  - repair may only edit bodies, helper proofs, loop annotations
  - blocks silently deleting a postcondition or strengthening a precondition
- a wrong frozen spec stays wrong
  - DeepSeek V3.2, C: repair raised valid 34 to 60 but joint only 8 to 11
coverage scoring by directional entailment (CEF)
- target precondition must entail the generated ones; generated postconditions must entail the target
  - SMT check of L and not-R unsat, over smallest clause subsets first
  - reversed precondition direction denies credit for over-restrictive domains
- no agreement study with human judgment, so coverage numbers carry unmeasured false negatives
- targets are requirement-level obligations, not every annotation of the reference proof
constraint-guided specification (CGS)
- extract atomic constraints by role, translate to spec, self-review, refine
  - loop invariants and termination measures stay outside the contract
  - mutation rule: state changed value, length change, and unchanged region as separate clauses
- coverage up in all 16 model-language settings (mean 0.716 to 0.776)
- validity down (71.0% to 65.6%), because fuller contracts are harder to prove
  - Kimi-K2.7-Code, Rust: valid 91 to 60, joint 57 to 43
  - review is the model checking itself, so budget exhaustion is not alignment
verifier-guided candidate repair (VGCR)
- turn diagnostics into typed subgoals, write several whole-program candidates each with a different focus, accept the first the verifier passes
  - subgoals are LLM readings of diagnostics, not proved lemmas
  - candidates rejected by prechecks never replace the current code
- CGS then VGCR: validity 65.6% to 75.7%, joint 45.6% to 49.1%
- cannot add coverage: no joint success without an adequate initial spec
repair moves from case studies (single examples)
- replace existential invariant with witness index variable plus two plain invariants
  - Verus form: invariant 0 <= min_idx < i and a@[min_idx as int] == min
- Verus mutable-reference postconditions need old/final to name pre- and post-state
- one compound postcondition split into one clause per target
experiment controls
- paired runs: reuse exact spec and first code when measuring repair, so coverage is fixed
- oracle-spec swap measures sensitivity to the contract, not an error count
  - it changes both information and obligations
paper inconsistencies
- text says direct joint 44.1%, table sums to 43.9%
- oracle gap stated 12.4 points, table sums give 17.0
- pass@k reported only as curves, no numbers
