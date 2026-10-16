# Error Localization, Certificates, and Hints for Probabilistic Program Verification via Slicing (Extended Version)
(authored by agents unless marked 🧑)
Tag: `schroer2025error`, [paper](https://doi.org/10.48550/arxiv.2512.20214)

## scope
The paper uses statement deletion to produce diagnostics for deductive verification of probabilistic programs. Its abstract says the principle is “providing slices for (1) error reporting, (2) proof simplification, and (3) preserving successful verification results.” (abstract, p. 1) The implementation works on HeyVL, a quantitative intermediate verification language, so the definitions transfer across source languages that compile to HeyVL.

Inference: The same idea can make failed Verus proofs actionable: produce a smallest subprogram or set of proof statements that still fails, then report that slice; for a successful proof, retain only statements needed for the postcondition.

## technique 1: error-witnessing slices for localization

when to use it

Use this when verification fails and the user needs to know which statements cause a counterexample. Definition 3 requires a slice to fail and every one of its counterexamples to remain a counterexample of the original program: “The first requirement ensures that the slice S′ has at least one counterexample state. The second requirement states that all counterexamples of S′ are counterexamples of S too.” (section 3.1, p. 12)

steps

1. Translate the program and quantitative pre/postcondition to HeyVL.
2. Mark statements that may be removed; keep specification and control constructs needed by the slicing theory.
3. Remove a candidate statement and check whether the resulting subprogram still fails.
4. Check the stronger witness condition: each counterexample state of the slice must also violate the original program.
5. Minimize the slice. The implementation offers a first-found strategy and an `opt` strategy that searches for a guaranteed minimal slice.

The paper's two-bit example samples `b0` and `b1`, computes `r=b0+2*b1`, and attempts to prove `Pr(r≥2)≤1/3`. The traces `(b0=0,b1=1)` and `(b0=1,b1=1)` have total probability `1/2>1/3`; deleting the assignment `b1:=0` leaves an error-witnessing slice because that assignment is irrelevant (section 1.3, Figure 3). This concrete counterexample is the diagnostic shown to the user.

Verus form

Inference: For Rust, create a reduced verification harness by deleting executable statements or proof assertions, retain the same `requires`/`ensures`, and rerun Verus. A failed reduced harness is useful only if its counterexample or failed obligation also exists in the full function; Verus does not expose probabilistic expectation semantics, so the paper's exact witness relation must be replaced by a Rust assertion/counterexample relation. Mark the reduction driver as untrusted and keep the full proof check authoritative.

## technique 2: verification-witnessing slices as certificates

A verification-witnessing slice is sufficient to imply that the full program verifies. The definition is: “A subprogram S′ of a program S is called a verification-witnessing slice w.r.t. X, Y ∈ E if |= ⟨X⟩⪯ S′ ⟨Y⟩ implies |= ⟨X⟩⪯ S ⟨Y⟩.” (section 3.2, p. 13) Such a slice removes proof-irrelevant statements while preserving a successful certificate.

steps

1. Start from a program that verifies.
2. Remove candidate statements, especially extensive `assume`-like statements only when the theorem's conditions hold.
3. Verify the reduced program.
4. Keep a reduction only when the implication from reduced verification to original verification is established by the slicing theorem.

The paper proves that removing extensive statements yields a verification-witnessing slice (Theorem 15, section 3.2). Inference: In Verus, analogous candidates include redundant ghost updates or proof blocks, but deletion is valid only after rechecking the generated Rust with Verus; the paper's theorem does not cover Rust ownership or mutable borrows.

## technique 3: verification-preserving slices and hints

A verification-preserving slice retains enough statements that any full-program proof implies the slice also proves the same specification: “A subprogram S′ of a program S is called a verification-preserving slice w.r.t. X, Y ∈ E if |= ⟨X⟩⪯ S ⟨Y⟩ implies |= ⟨X⟩⪯ S′ ⟨Y⟩.” (section 3.3, p. 15) The result is a compact explanation of which computations are necessary. The paper connects it to specification-based slicing and proves that every error-witnessing slice is verification-preserving (Lemma 17).

steps

1. Start from a verified program and specification.
2. Select a potentially sliceable statement set.
3. Search for a subset with the same verification result. The paper compares unsatisfiable-core (`core`), minimal-unsatisfiable-subset (`mus`/`sus`), and direct SMT encoding (`e-f`) strategies (section 5).
4. Return the subset as a hint or explanatory certificate, with its size and runtime.

Verus form

Inference: Treat each executable statement or proof lemma as a Boolean selector in an external SMT optimization problem. Generate a reduced Rust function from selected statements and rerun Verus. Because Verus proofs can affect solver context without runtime behavior, classify proof blocks separately; the paper's quantitative semantics do not specify this case.

## evidence, limits, and trust

For error-witnessing slices, the benchmark has 16 programs, ranging from 7–57 lines, with at most five sliceable statements and three on average. The paper reports search “below 20 milliseconds” in the usual case; the first found slice is optimal for 10/16 benchmarks, and optimal search costs at most 20 ms more than first-found (section 5.1). For verifying slices, the benchmark has 30 examples: 25 verification-preserving and five verification-witnessing, with 3–75 potentially sliceable statements. The core strategy returns instant results (≤5 ms) in most cases and never exceeds 105 ms; `sus` can hit a 30-second timeout (section 5.2). These denominators and settings are the paper's benchmark descriptions.

Inference: The results measure diagnostic computation, not proof soundness beyond the HeyVL semantics and verifier. Trusted components include the translation to HeyVL, slicing transformation, SMT solver, and the underlying Caesar verifier. The paper's limits include dependence on reductive/extensive statement classifications and on exact probabilistic weakest-precondition semantics. Inference: VL threat is low for the reduction idea but medium for implementation: an incorrect slice could hide a missing Rust statement, so the full Verus proof must always be rerun.

## what VL should reuse or avoid

Inference: Reuse minimal failing slices to localize failed `requires`, `ensures`, and loop-invariant obligations, and use preserving slices to explain which lemmas are essential. The paper already supplies generic core/MUS/SMT search; VL should adapt the selector encoding rather than inventing another minimizer. It should not treat a reduced proof as a replacement for checking the complete Rust function.

## techniques for the catalog

- error-witnessing slicing: delete statements while preserving a failing counterexample relation to localize errors
- verification-witnessing certificates: retain a reduced program whose successful verification implies the full program verifies
- verification-preserving hints: minimize a verified program to statements sufficient to preserve its specification
- core/MUS/SMT slice search: compute minimal or fast slices with unsatisfiable cores, MUS enumeration, or direct SMT encoding
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
