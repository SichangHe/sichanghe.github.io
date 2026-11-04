# A Neurosymbolic Approach to Loop Invariant Generation via Weakest Precondition Reasoning
(authored by agents unless marked 🧑)
Tag: `king2025neurosymbolic`, [paper](https://arxiv.org/abs/2512.15816)

NeuroInv: loop invariants for Java methods with given JML pre/postconditions (King, Koutavas, Kovács, arXiv 2025)
- neural module: LLM walks the method backwards from the postcondition, computes WPs, proposes one invariant per loop
- symbolic module: OpenJML checks the annotated method, its raw error output drives repair
- o4-mini, 150 programs x 5 runs: 99.5% avg success
  - neural-only (NeuroInv*) 84.7% vs single zero-shot prompt 66.4%
  - 10 hard programs (authors' own): 62% full, 40% neural-only, 14% zero-shot
  - no ablation of symbolic module alone, so WP chaining is not shown necessary once verifier feedback exists
  - one model only, cost and tokens not reported
  - 62 of 150 programs are single-loop integer programs from Code2Inv
tool-checked only at the end
- WPs and the two implications are judged by the LLM itself
  - no backtracking when the final precondition check fails
  - paper leaves per-link verifier checking to future work
- trusted: OpenJML 21-0.11 + Z3 4.13.4, given contract
- partial correctness only, sequential loops only, no nested loops
technique 1: marker-comment segmentation
- tag loop-free stretches and while loops with `// code N open/close`, `// while N open/close`
  - prompts name a segment by index, scripts cut it out
- works unchanged in Rust
technique 2: backward WP chaining
- start with currentPost = method postcondition
- process loops last to first
  - loopPost = currentPost, LLM proposes invariant, validated by technique 3
  - accepted invariant becomes the new currentPost
  - code before a loop: currentPost = LLM-computed WP of that code
- loop obligations
  - init: precondition implies invariant
  - preservation: I and B imply WP(C, I)
  - exit: I and not-B imply loopPost
- Verus mapping (inference)
  - postcondition = `ensures`, precondition = `requires`, invariant = `invariant`
  - check an LLM WP with `assert` before and after the stretch instead of trusting it
  - Java-only gaps: no overflow obligations, no `decreases` produced
technique 3: self-check with typed refinement
- LLM judges preservation and exit separately, using only invariant + guard
  - needing a precondition fact means the invariant fails and must be strengthened
- refine from the failed implication, max 5 attempts per loop
  - preservation failed: add facts on unmodified vars, modified vars, kept relations, bounds
  - exit failed: add what the loop accomplished, full-range quantified facts
- stats
  - 0.59 refinements per program on standard set, 2.9 on hard set
  - 37 to 41% of programs needed any refinement
  - implication-1 failure hides implication-2 failure, so exit failures are undercounted
- Verus mapping (inference)
  - Verus already reports entry / preservation / ensures failures separately, so use it as the sound judge
  - loop isolation makes precondition facts need copying into invariants, same as the paper's rule
  - existential invariant: ghost witness variable updated in the body
technique 4: contract-locked repair
- feed OpenJML output + program to LLM, max 5 repairs
  - may change only loop invariants and variants
  - lock enforced by prompt, no mechanical diff check
- locked repair lifts 84.7% to 99.5% standard, 40% to 62% hard
- baseline SpecGen rewrote the given contract in about 68% of programs
  - counted as failure, since contract equivalence is lost
- output is error text, not parsed counterexample values
  - whether concrete values help is untested
- Verus mapping (inference)
  - accept a reply only if signature, `requires`, `ensures`, code are unchanged
inconsistencies in the paper
- zero-shot 66.4% in Table 2 vs 64.40 in Figure 3
- hard set loops: abstract says avg 7, Table 3 sums to 60 (avg 6)
- max refinements 102 in text vs 104 in figures
catalog
- marker-comment segmentation
- backward WP chaining
- self-sufficient invariant rule
- typed refinement guidance
- ghost witness for existential invariants
- contract-locked repair
- count contract-altering results as failures
