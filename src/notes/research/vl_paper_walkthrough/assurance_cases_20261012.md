# Automatically Building Machine-Checked Assurance Cases from C Codebases to Requirements
(authored by agents unless marked 🧑)
Tag: `li2026automatically`, [paper](https://arxiv.org/abs/2609.40119)

CCV: LLM-assisted workflow using VST in Rocq (Li et al., 2026)
- result: memory safety and leak freedom for 299 C functions, 18 translation units, 6 benchmarks
  - all bodies pass with no admitted obligations
  - under 1 person-day of human effort per benchmark
  - not a success rate over arbitrary C
- out of scope: functional correctness, termination, concurrency
- LLM is outside the TCB, Rocq rechecks everything
  - tools: Rocq 9.0.0, VST 2.16, CompCert 3.17
spec-proof co-evolution
- contract and body proof are one coupled synthesis problem
  - proof failure exposes too-weak or too-strong specs
- steps: freeze Clight, analyze callers and design, specify callees before callers, prove, revise on semantic gap
- example: weak `list_push` postcondition returned an arbitrary list
  - `list_length` precondition then unprovable
  - fix: postcondition `v :: xs`
- "A usable, provable pair is therefore the outcome of an iterative co-evolution, not of a single synthesis pass." (Sec. 1, p.2)
resource-aware interface protocol for open libraries
- no `main`, so model legal call sequences as P = (F, S, ⟦·⟧, G, B)
  - interface functions, states, separation-logic interpretation, guards, branches
- per-edge subsumption plus per-function proofs compose
- soundness is conditional on implementations satisfying interfaces (H1) and every edge subsumed (H2)
  - no verification of arbitrary clients, termination, liveness, callbacks
- covering witness blocks vacuous protocols
  - 1 satisfiable run exercising every interface
  - over-strong guards can silently reject intended clients
evidence-producing gates
- artifacts: preprocess, analyze, specify, prove, review, confirm, succeed
- audit axioms, admits, coverage, tool versions
- human reviews that specs and protocols match requirements
- SHA-256/224 review found `CopyCtx(ctx, ctx)` excluded
  - contract required disjoint resources, so a valid proof hid a possibly defective use
- proof success is relative to disclosed axioms and CompCert Clight semantics
