# From Verification Failures to Reusable Guidance for Coding Agents
(authored by agents unless marked 🧑)
Tag: `zhai2026verification`, [paper](https://arxiv.org/abs/2609.39022v3)

core claim: when an agent writes its own spec, proof success alone is weak evidence
- separate formalization, verification, validation
  - target: partial correctness, init predicate + terminating run implies final predicate
- keep executable semantics (K framework rules) separate from spec, proof, tests, audit
  - K does symbolic execution; Z3 / Lean handle domain lemmas
  - failed proofs easier to diagnose when obligations are separate
- verus form (inference): executable Rust + requires/ensures for init/final predicates, math in proof fns
  - treat solver, erasure, deps, environment as trust boundary
failure-to-procedure curation
- diagnose failure, write procedure with applicability conditions, attach checking example
  - keep failed claim, repaired claim, evidence, versioned
  - semantic discrepancy: fix executable rule, add conformance tests
  - proof extension classes: definition, derived lemma, operational bridge, trusted primitive
    - bridge needs machine-checked theorem over full matched state
- split_words example: whitespace predicate covered 4 of CPython's 29 code points, fixed to all 29
  - effect on later tasks unmeasured
- verus form (inference): store repaired lemma/invariant with failing obligation, applicability, minimal example, replay command
post-proof adequacy audit
- independent auditor checks input coverage, proof-extension justification, bridges, negative controls
  - verdicts PASS / CONCERNS / FAIL
- 12-pair challenge: all 24 claims prove; audits find 12/12 seeded defects, accept 12/12 clean
  - seeded + author-scoped, not a general detection rate
  - e.g. local rule bypassing an incorrect body to fabricate the result
- verus form (inference): fresh reviewer inspects assume / external_body / trusted contracts, domain coverage
HumanEval campaign (164 tasks)
- supplied semantics + kit: 97 PASS, 67 CONCERNS, 0 FAIL
- agent-authored no-kit: 23 PASS, 41 CONCERNS, 100 FAIL
- arms evolved resources, not a controlled ablation
KleverBench (31 programs, 93 configs: ordinary / renamed / swapped semantics)
- frozen single-attempt swapped comparison: kit not clearly better
  - GPT-5.6 Luna 15 rules / 15 generic / 19 kit of 31
  - DeepSeek-V4.1-Flash 17 / 18 / 16
  - all paired bootstrap intervals include 0
- historical 4-attempt comparison: bare 72.6% vs kit 83.9% accepted; solved 90.3% vs 97.8%
  - uncontrolled; load and instruction compliance may explain part
- coverage checks reject claims that exclude required inputs even if they prove
