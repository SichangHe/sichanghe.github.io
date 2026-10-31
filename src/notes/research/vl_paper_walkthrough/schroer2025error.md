# Error Localization, Certificates, and Hints for Probabilistic Program Verification via Slicing (Extended Version)
(authored by agents unless marked 🧑)
Tag: `schroer2025error`, [paper](https://arxiv.org/abs/2512.20214v2)

## scope
The paper uses statement deletion to produce diagnostics for deductive verification of probabilistic programs. Its abstract says the principle is “providing slices for (1) error reporting, (2) proof simplification, and (3) preserving successful verification results.” (abstract, p. 1) The implementation works on HeyVL, a quantitative intermediate verification language, so the definitions transfer across source languages that compile to HeyVL.

Inference: The same idea can make failed Verus proofs actionable: produce a smallest subprogram or set of proof statements that still fails, then report that slice; for a successful proof, retain only statements needed for the postcondition.

## technique 1: error-witnessing slices for localization

when to use it

Use this when verification fails and the user needs to locate relevant proof obligations. Definition 3 requires a slice to fail and every one of its counterexamples to remain a counterexample of the original program: “The first requirement ensures that the slice S′ has at least one counterexample state. The second requirement states that all counterexamples of S′ are counterexamples of S too.” (section 3.1, p. 11)

steps

1. Translate the program and quantitative pre/postcondition to HeyVL.
2. For lower-bound verification, select reductive statements: `assert`, `coassume`, `havoc`, and `validate`. Their verification pre-expectations never exceed the supplied post-expectation (Lemma 6, p. 12). Upper-bound verification uses the dual classification.
3. Introduce a Boolean selector for each candidate. For example, replace `assert Y` by `assert ite(enabled, Y, ∞)`. The transformation avoids duplicating the post-expectation (section 5, p. 19; Table 3, p. 40).
4. Ask the SMT solver for selectors and an initial state that refute verification. Removing only reductive statements guarantees that every counterexample of the slice also refutes the original program (Theorem 7); a separate universal counterexample check is unnecessary.
5. Use `first` for one model, setting variables marked irrelevant by Z3 to false. Use `opt` for a modified binary search over bounds on the number of enabled statements. Unanswered SMT queries are treated as unacceptable, so solver incompleteness limits the search (section 5, p. 20).

The paper's two-bit example samples `b0` and `b1`, computes `r=b0+2*b1`, and attempts to prove `Pr(r≥2)≤1/3`. The traces `(b0=0,b1=1)` and `(b0=1,b1=1)` have total probability `1/2>1/3`; deleting the assignment `b1:=0` leaves an error-witnessing slice (section 1.3, Figure 3, p. 4). In the implementation's HeyVL encoding, Brutus slices a `coassume` to exclude that branch and reports the remaining relevant statements (Figure 16, p. 47).

For loop diagnostics, minimality matters: Theorem 21 distinguishes a precondition that does not entail the invariant, a noninductive invariant, and an invariant that does not entail the postcondition. The last conclusion additionally requires that the loop body contain neither `assert` nor `coassume` (section 4.3, pp. 17–18). These are conditions on the Park-induction encoding, not arbitrary statement deletion.

Verus form

Inference: For Rust, create a reduced verification harness by deleting executable statements or proof assertions, retain the same `requires`/`ensures`, and rerun Verus. A failed reduced harness is useful only if its counterexample or failed obligation also exists in the full function; Verus does not expose probabilistic expectation semantics, so the paper's exact witness relation must be replaced by a Rust assertion/counterexample relation. Mark the reduction driver as untrusted and keep the full proof check authoritative.

## technique 2: verification-witnessing slices as certificates

A verification-witnessing slice has this implication: if the slice verifies for the specified pre/post-expectations, the original program verifies too (Definition 11, section 3.2, p. 14). The definition permits nonverifying slices, which the paper excludes from practical consideration: “Subprograms that fail to verify trivially become verification-witnessing slices. As these slices are not very helpful, we exclude them in the following.” (p. 14)

steps

1. Start from a program that verifies.
2. For lower bounds, select extensive statements: `assume`, `coassert`, `cohavoc`, `covalidate`, and `reward` (Lemma 14, p. 14). Removing them establishes the required implication by Theorem 15.
3. Instrument those statements with selectors and search for a selection that verifies for every initial state.
4. Return a verifying slice. Minimality is not required for the verification-witnessing diagnostics (section 5, p. 23).

Removing the initial `assume` from a specification encoding can show verifiability for any pre-expectation (Theorem 19, p. 16). Removing selected assumptions from the Park encoding can justify replacing the invariant by ∞ or replacing the loop with an `if` statement (Theorem 22, p. 18).

Inference: In Verus, redundant proof assumptions may be candidates, but the implication needs justification for Verus's semantics. Merely rechecking a modified Rust function does not establish that deleting arbitrary ghost updates or proof blocks preserves verification of the original.

## technique 3: verification-preserving slices and hints

A verification-preserving slice has the reverse implication: if the original verifies for the specified pre/post-expectations, the slice verifies too (Definition 16, section 3.3, p. 14). The paper connects this to specification-based slicing and proves that every error-witnessing slice is verification-preserving (Lemma 17, p. 15). It preserves the specification's verification, rather than the program's complete behavior.

steps

1. Start from a verified program and specification.
2. Manually mark statements for slicing, including assignments if desired. Instrument them with Boolean selectors.
3. Search for selectors such that every initial state satisfies verification. The direct `exists-forall` strategy submits this quantified formula. The `core` strategy uses an unsatisfiable core representing enabled statements sufficient to exclude counterexamples. The `mus` strategy enumerates minimal unsatisfiable subsets to obtain a slice with no smaller verifying subprogram. The `sus` strategy enumerates all such subsets to find a globally smallest slice (section 5, p. 20).
4. Return a verifying subset as a hint about what the specification requires. A minimal slice and a globally smallest slice are different objectives.

For the faulty reservoir sampler, the choice probability is `1/n` instead of `1/i`, yet the stated upper bound still verifies. Slicing the Park encoding shows that a single loop iteration suffices, suggesting the specification may be too weak (Figure 5, p. 5; Theorem 22, p. 18).

Verus form

Inference: Treat each executable statement or proof lemma as a Boolean selector in an external SMT optimization problem. Generate a reduced Rust function from selected statements and rerun Verus. Because Verus proofs can affect solver context without runtime behavior, classify proof blocks separately; the paper's quantitative semantics do not specify this case.

## evidence, limits, and trust

For error-witnessing slices, the benchmark has 16 programs, ranging from 7–57 lines, with at most five sliceable statements and three on average. Section 5, p. 21 reports: “For 10 (out of 16) benchmarks, the first found slice is already optimal”. It describes runtimes as usually below 20 ms and the extra time for optimal search as at most 20 ms. Table 5, p. 46 also includes a substantial exception to interactive speed: `tortoise_hare12` takes 10,400 ms with either strategy.

For verifying slices, the benchmark has 30 examples: 25 verification-preserving and five verification-witnessing, with 3–75 potentially sliceable statements (section 5, p. 22). The prose claims that `core` never exceeds 105 ms, but Table 6, p. 51 reports 370 ms for `bn_passified`. On 13/30 benchmarks, `core` removes nothing. `mus` matches the sizes found by `sus` where both produce results; `sus` can reach the 30-second timeout. `exists-forall` matches optimal sizes in 12 cases but cannot handle verification tasks with uninterpreted functions (pp. 22–23). Experiments used a 2021 Apple MacBook with an M1 Pro chip, 16 GB RAM, and a 30-second timeout (p. 21). These are reported measurements, not reproduced experiments.

The implementation requires a consistent SAT model for error diagnostics and rejects potentially inconsistent models returned with `unknown` (section 5, p. 22). Verification queries are not necessarily decidable (p. 19, footnote 8). The conclusion identifies the selection of only assert-like statements for error-witnessing slicing as a limitation and proposes investigating syntactic slicing and local reductiveness (p. 25).

Inference: Applying this to Verus requires trusting or validating the translation, selector transformation, solver results, and final verifier. The paper provides no Verus evaluation or quantitative risk estimate. Keep the complete Rust verification as the acceptance criterion; a reduced function can otherwise hide a missing statement.

## techniques for the catalog

- error-witnessing slicing: delete statements while preserving a failing counterexample relation to localize errors
- verification-witnessing certificates: retain a reduced program whose successful verification implies the full program verifies
- verification-preserving hints: minimize a verified program to statements sufficient to preserve its specification
- core/MUS/SMT slice search: compute minimal or fast slices with unsatisfiable cores, MUS enumeration, or direct SMT encoding
