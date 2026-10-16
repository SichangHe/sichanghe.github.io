# The Refutation Gap: Certifying Both Halves of an Optimality Claim
(authored by agents unless marked 🧑)
Tag: `pandey2026refutation`, [paper](https://arxiv.org/abs/2609.20873)

## scope and result
This paper addresses optimality claims in synthesis. An optimality statement has an upper-bound witness (a valid object of size m) and a lower-bound refutation (no object of size m−1). The first is commonly re-executed or proved; the second is often only a solver’s UNSAT answer. The authors call this asymmetry the refutation gap and close it for minimal XOR straight-line programs by emitting DRAT proofs checked by an independent checker. They certify 121 results for matrices with n=6–9: 111 by checked refutations and 10 by free counting bounds. The abstract states: “We close it in a working pipeline that synthesizes minimal linear straight-line programs over GF(2), where every decisive UNSAT answer now emits a DRAT proof checked by an independent third-party checker.” (Abstract, p. 1)

## technique 1: separate and independently check the construction side
Use this when a synthesis pipeline must establish that a candidate object is valid before discussing optimality. For each XOR straight-line program, re-execute gates under a bitmask abstraction and verify that every target row of M occurs. Then encode universal equivalence `∀x. circuit(x)=Mx` as propositional logic and ask Z3 to prove the negation UNSAT. Finally emit a self-contained Lean 4 certificate asserting `SLP.valid n targets prog = true`; `decide` lets the Lean kernel check gate well-formedness, no self-XOR, and target completeness. Keep the three layers independent and share no code with search.

The paper states: “Layer 1 re-runs the circuit from scratch under (2) over the bitmask abstraction; it is the gate on recording any result at all.” (Sect. 3, p. 3) Layer 2 checks all inputs, catching abstraction/specification errors that Layer 1 cannot. Layer 3’s self-contained file avoids dependence on library versions and ends with `#print axioms` to expose trust. Thirteen certificates compiled under Lean 4.33.1 for 98–121-gate circuits over 32 inputs in 5.0–7.6 seconds; the axiom list contained `propext` and no `sorryAx`.

Inference: In Verus, layer 1 can be a pure executable replay, while layers 2 and 3 become `spec fn` equivalence and proof functions with `ensures`. Keep a source-independent checker for emitted certificates and record its trust base.

## technique 2: proof-carrying refutations for lower bounds
Use this whenever minimality depends on an UNSAT query. Encode the existence of a k-gate circuit as `φk(M)`, where `φk(M)` is UNSAT iff `SLP(M)>k`. During the descent from a candidate upper bound m, require the first UNSAT answer at k=m−1 to emit a DRAT proof. Run `drat-trim`, a separate implementation from the solver, and report an optimality result only when it returns VERIFIED. The certified result is the pair `(P, πLean, φm−1(M), πDRAT)`: a witness and a refutation.

The paper states: “A result is reported as proved only if the checker returns VERIFIED; a bare solver verdict no longer suffices.” (Sect. 5, p. 5) This makes lower-bound evidence inspectable and catches solver, encoding, or proof-logging defects. A concrete example has a 1,010-variable, 17,636-clause formula; Glucose 4.2 solves it in 0.17 seconds, emits an 18,118-line 0.91 MB DRAT proof, and `drat-trim` verifies it in 0.24 seconds (Fig. 4, p. 7).

Inference: Verus cannot natively check DRAT; integrate a verified or separately audited checker as an external certificate verifier, and ensure the CNF encoding itself is proved faithful to the synthesis specification. The latter remains a trusted gap in this paper.

## technique 3: count and audit certificates, not just outputs
Use independent artifact checks to detect defects that semantic proof terms miss. Reproduce published baseline numbers; treat mismatches as evidence requiring investigation. Keep run records and proof files, isolate each instance under an address-space cap, and rerun apparent failures without budgets. Run an adversarial audit that recomputes every quantitative claim from raw records. In the paper, this found a doubled aggregation count (20% inflation), a censored statistic, and a false 3% failure tail caused by inheriting the remainder of a global budget. Table 1 lists five defects; none was found by code reading alone.

The authors state: “None of the three is exotic, and none is visible to any artifact-level check.” (Sect. 6, p. 7) Inference: For VL, keep independent run ledgers and have agents recompute denominators and claims; a proof of generated Rust does not validate benchmark aggregation or product-level conclusions.

## evidence and limitations
Across 121 established optimality results, 111 refutations were independently checked and 10 closed by counting bounds; 0 refutations were rejected and 0 disagreed with the uncertified values. Median DRAT proof size is 1.06 MB, maximum 301 MB; median solving time 0.18 s, maximum 160 s; median checking time 0.24 s, maximum 440 s; median check/solve ratio 1.9× and maximum 2.7× (Table 2, p. 8). The 121 are the closable subset of 148 attacked instances, so 82% of all attempted instances end in certified optimality. Four initially budgeted failures later verified in 333–440 seconds, exposing a harness artifact.

The pipeline’s scope is n≤9; beyond n=9 the encoding becomes unreliable, while the surrounding literature studies n=32 and n=64. `drat-trim` itself is trusted but not formally verified; a stronger endpoint would emit LRAT and use a verified checker such as cake-lpr. DRAT certifies `φk(M)`, not the natural-language argument that symmetry-breaking constraints preserve equivalence to the original SLP problem. The paper also reports a CaDiCaL proof rejected by drat-trim (“no conflict”), while Glucose 4.2 proofs verified; on 75 paired instances total solve time differed by 0.4% against 1.3× run variance.

Proved or checked: circuit validity, whole-input equivalence, Lean certificates, DRAT refutations, and numerical recomputation scripts. Trusted: Lean kernel/propext, Z3, Glucose, drat-trim, the CNF encoding argument, target-matrix provenance, and aggregation scripts until audited. Inference: The threat to agent-written verified Rust is high for any claim of “minimal,” “optimal,” or “best” that reports only solver UNSAT. VL should require proof-carrying lower bounds, independent checkers, and denominator audits whenever synthesis claims optimality.

## techniques for the catalog
- layered construction certification: independently replay, symbolically equate, and kernel-check every synthesized artifact
- DRAT proof-carrying lower bounds: require an independently checked refutation for each decisive UNSAT minimality query
- self-contained trust reporting: emit certificates with explicit axiom lists and no hidden library/build dependencies
- adversarial result auditing: recompute claims from raw records and rerun budgeted failures to expose aggregation artifacts
- encoding-faithfulness review: separately verify that solver constraints exactly represent the optimization problem
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
