# LLVM Translation Validation Automated with Large Language Models and Lean
(authored by agents unless marked 🧑)
Tag: `liao2026llvm`, [paper](https://doi.org/10.48550/arxiv.2609.19583)

## what is proved and measured

Trivet combines deterministic Lean proof scaffolds with LLM-supplied transformation-specific reasoning. Its abstract reports 148 LLVM transformations: it “verifies or refutes 147, leaving one invalid case unresolved.” (abstract, p.1). The dataset is 74 valid and 74 invalid cases, split between 60 loop-free and 14 restricted loop-containing transformations (sec.2.2, p.2; Table 2, p.8). Every accepted verdict is checked by the Lean kernel; the LLM is not itself trusted. Inference: the trusted base still includes Lean's kernel and the formalized LLVM semantics, standard axioms allowed by the paper, and the correctness of the source/target model.

The main split is deliberate: “Trivet generates structured proof scaffolds based on source and target functions, automatically discharges obligations amenable to deterministic reasoning, and delegates transformation-specific obligations to LLMs.” (abstract, p.1). Successful cases include 60 loop-free symbolic-bitwidth transformations, 27 restricted loop-containing cases, and 10 complex valid fixed-bitwidth cases on which Alive2 times out (abstract, p.1). Compared with an unscaffolded baseline, scaffolding adds 26 proofs, reduces mean proof time by 75.9%, and reduces mean monetary cost by 88% on cases solved by both configurations (abstract, p.1; sec.4.5, pp.11–12).

## technique: refinement rather than equivalence under LLVM undefined behavior

What it is: LLVM transformations are judged by a refinement relation because undefined behavior makes ordinary equality too strong. The paper defines: “A target function tgt refines a source function src, denoted src ⊒ tgt, if for every input” followed by three cases: source immediate UB permits any target behavior; source poison permits poison or a value but no target immediate UB; and a well-defined source requires the same value and no target immediate UB (Definition 2.1, p.3).

When to use it: use this relation for compiler rewrites that may exploit LLVM poison, overflow flags, assumptions, or division-by-zero behavior. The transformation judgment is `PRE ⊨ LHS ⇒ RHS`; `PRE` is encoded by `llvm.assume` in the source function (sec.2.1, p.2).

How to apply it:
1. Encode the precondition and source operation in `src`, and replacement in `tgt`.
2. Identify immediate-UB, poison, and target-specific UB conditions.
3. Split proof cases by those conditions.
4. Discharge source-UB cases using the refinement rules; for well-defined cases prove value equality and rule out target UB.
5. Have Lean kernel-check the resulting theorem.

Inference: in Verus, this maps to a Rust executable function with `requires` for `PRE` and `ensures` for the refinement postcondition, with `spec fn` definitions for mathematical semantics. LLVM poison and immediate UB need an explicit ghost/result datatype; ordinary Rust `ensures` alone does not reproduce LLVM's refinement lattice.

## technique: scaffold refinement proofs by UB-sensitive case decomposition

What it is: Trivet identifies nine UB-sensitive operators or flags and their trigger conditions, then automatically creates branch hypotheses and typed proof holes. The paper says, “Trivet constructs the scaffold by splitting cases on these conditions and automatically discharging proof obligations whenever the source yields UB.” (sec.3.1, p.4). Under well-defined source cases it leaves a value-equivalence hole and separate target-UB holes (sec.3.1, pp.4–5).

How to apply it:
1. Scan source and target for UB-sensitive constructs, such as signed/unsigned overflow, zero divisors, poison inputs, and `llvm.assume` failures (sec.3.1.2, p.5).
2. Order source UB cases by when values are demanded, then split on each condition.
3. Automatically discharge branches where the source has immediate UB; for poison, first rule out target immediate UB.
4. Insert typed holes for value equality and every target-specific UB condition in well-defined branches.
5. Ask an LLM to fill only those holes, then require Lean checks with no `sorry` or `admit`, unchanged definitions/theorem statement, and only standard axioms (sec.3.1.3, p.6).

The illustrative transformation produces a value hole `(y <u T) = (z <u 1)` and a target-UB hole `noUOverflow (a + b)` after splitting C1–C4 (Fig.2, p.5). Inference: the Verus analogue is to keep the theorem and executable function fixed, expose focused `assert`/`assert forall` obligations, and use `by(nonlinear_arith)` or lemmas only where supported; a `proof fn` is proof-only and cannot be called by run-time code.

## technique: LLM proof completion with diagnostic repair

The LLM is assigned the role of Lean prover and receives proof goals and diagnostics. It may add auxiliary lemmas and raise resource limits, but hard rules forbid changing the theorem or definitions (sec.3.1.3, p.6). A candidate is accepted only when kernel checking succeeds, no `sorry`/`admit` remains, dependencies use standard axioms, and definitions/theorem statement are unchanged (sec.3.1.3, p.6).

Use this as a bounded repair loop:
1. Generate the deterministic scaffold.
2. Send focused typed holes and current Lean diagnostics to the LLM.
3. Insert the proposed proof and run Lean.
4. Return diagnostics on failure and repeat until accepted or the time budget expires (sec.3, p.4).

Inference: for Verus, the same loop can feed verifier diagnostics back to an agent while preserving a human-reviewed specification boundary. Verus syntax must follow the local Verus reference; the paper's Lean tactics and theorem names do not carry over.

## technique: deterministic counterexample certification

What it is: one concrete counterexample disproves a universally quantified refinement claim. The paper states, “Because refinement quantifies universally over all admissible bitwidths and inputs, a single counterexample suffices to disprove it.” (sec.3.2, p.6).

How to apply it:
1. Ask the LLM to propose concrete bitwidths and inputs satisfying all width constraints.
2. Build a deterministic scaffold with a computable `Decidable` instance for the refinement relation, including values, poison, and immediate UB.
3. Assume refinement, instantiate it at the candidate, and let kernel evaluation compare concrete outcomes.
4. Prove the width constraints computationally and package the contradiction as non-refinement.
5. Retry with diagnostics when certification fails; the paper allows at most five candidate attempts for a transformation (sec.3.2.2, p.7).

The example candidate uses `w1=2, w2=3, x=1, C1=0, C2=1`; evaluation yields a well-defined source `0` and a poison target, so `0 ⊒ poison` is false (Fig.3, pp.6–7). Inference: Verus can encode a concrete witness in a `proof fn` and close a negated postcondition with `assert`, but the witness checker must be written in supported spec/proof code; it should not be hidden behind `external_body`.

## technique: inductive scaffold for restricted loops

What it is: Trivet replaces bounded loop unrolling with induction for a restricted canonical loop: a three-block source (preheader, one self-loop body, exit) and a loop-free single-block target (sec.3.3, p.7). The paper states, “Trivet establishes refinement by induction, yielding a single correctness proof that covers all feasible loop iteration counts without relying on a fixed unrolling bound.” (sec.3.3, p.7).

How to apply it:
1. Reuse source-UB case decomposition and target-UB obligations from loop-free scaffolding.
2. Ask the LLM for a loop invariant relating inputs and loop state.
3. Prove invariant initialization at loop entry.
4. Prove the inductive step preserves it on the back edge.
5. Prove exit establishes the target result and assemble the arbitrary-iteration theorem (Table 1, p.8).

The quotient example's invariant relates completed and remaining subtractions: `q + floor(x/b) = floor(n/(a*b))`; the inductive step preserves it under `(x,q) -> (x-b,q+1)` and exit gives `q=floor(n/(a*b))` (sec.3.3.1, pp.7–8). Inference: in Verus this is a loop `invariant` clause over Rust variables, with `decreases` for termination and `ensures` for the result; the exact syntax and arithmetic lemmas must come from Verus documentation, not Lean.

The loop counterexample branch adds a concrete execution bound so candidate evaluation terminates, then certifies it with the same deterministic comparison and allows five attempts (sec.3.3.2, p.8). General CFGs remain unsupported because every cycle needs an invariant-bearing cutpoint (sec.3.3, p.7).

## techniques for the catalog

- LLVM refinement semantics — compare source and target under UB-aware refinement rather than plain equality
- UB-sensitive scaffold generation — split on source and target UB conditions and leave typed, focused holes
- kernel-checked LLM completion — let an LLM fill holes while Lean enforces unchanged statements and no admits
- diagnostic repair loop — iterate proposals using deterministic prover diagnostics under a bounded budget
- counterexample certification — turn a concrete LLM candidate into a kernel-checked non-refinement proof
- inductive loop scaffolding — prove initialization, preservation, and exit for a canonical loop without bounded unrolling
- deterministic semantic harness — accept results only after the formal kernel checks the assembled proof
