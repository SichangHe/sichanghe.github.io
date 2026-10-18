# Certified Verification of Relational Properties
(authored by agents unless marked 🧑)
Tag: `goubault2022certified`, [paper](http://arxiv.org/abs/2202.10349v3)

This paper (Blatter, Kosmatov, Prevosto, Le Gall; arXiv v3, May 2022; the Coq repository is tagged iFM2022, footnote 7) verifies properties relating several executions directly, using a verification-condition generator (VCGen) over separate memory states. It targets pointer aliasing without self-composition. The authors state: “This paper proposes an alternative approach that is not based on code transformation or relational rules.” (Introduction, p.3). They formalize the method in Coq; “Our Coq development contains about 3400 lines.” (p.3).

## technique: direct relational VCGen
Property form: a relational property links n commands to a relational precondition and postcondition, each a predicate over the sequence of n memory states (Definition 3, p.9).

Inference: use this when a property compares two or more runs, such as swap equivalence, monotonicity, or non-interference (the paper's own examples, pp.2, 9), and composing renamed copies would create difficult separation assumptions.

Method: give each run its own memory state. Generate the ordinary VCGen formula `Tc` for each command, and compose it over the sequence of commands. The recursive definition `Tcr` (Definition 7, p.12–13) puts `Tc` of the last command cn outermost; its postcondition is `Tcr` over the first n−1 commands, which threads the relational postcondition Q̂ inward. The paper describes the two-command case in these words: “Intuitively, for n = 2, Tcr gives the weakest relational condition that σ1 and σ2 must fulfill in order for” Q̂ to hold after the two commands (p.13). The formula (my transcription, p.13) is `Tcr((c1,c2),(σ1,σ2),φ,Q̂) ≡ Tc⟦c2⟧(σ2,φ,λσ2'. Tc⟦c1⟧(σ1,φ,λσ1'. Q̂(σ1',σ2')))`. Auxiliary obligations come from `Tar`, the conjunction of each command's `Ta` conditions (Definition 8, p.14).

Then prove three obligations (Theorem 3, p.14): procedure contracts (`Tf`, hypothesis 4), the relational auxiliary conditions under the relational precondition (5), and the main `Tcr` condition under that precondition (6). The paper's gloss on the soundness theorem is: “In other words, a relational property is valid if all procedure contracts are valid, and, assuming the relational precondition holds, both the auxiliary verification conditions and the main relational verification condition hold.” (after Theorem 3, p.14). The proof is by induction on n and uses the functional soundness Theorem 2 for the last command (p.15).

Inference: In Verus, represent each execution with separate values or ghost state and state the relation in `requires`/`ensures`. Prove each run's ordinary loop invariants and then a relational lemma connecting final states. Verus has no paper-specific `Tc`, `Ta`, or `Tcr` commands; these are an inference mapping to proof functions and assertions. Separate ghost snapshots can encode the tuple of states, but ownership and borrowing must be handled explicitly.

## technique: ordinary VCGen decomposition
The paper's base VCGen splits into three functions (Section 5.1, pp.9–11). `Tc` builds the main postcondition formula, assuming auxiliary annotations hold; `Ta` collects assertions, preconditions of called procedures, and loop-invariant establishment and preservation; `Tf` checks each procedure body in the procedure environment against its contract. For a loop, `Tc` assumes the invariant and the false loop condition for the final state, while `Ta` requires the invariant initially and its preservation by the loop body (Figures 7–8, pp.10–11). Soundness is Theorem 2 (p.12), proved with Theorem 1 and Lemmas 2–3. The relational generator reuses Theorem 2, and the paper says the method works with “any VCGen respecting Theorem 2” (Section 6, p.12).

Inference: A Verus implementation should keep executable code and contracts in Rust and use ghost proof functions for `Ta`-like preservation facts. Loop invariants are written with Verus `invariant` clauses; postconditions belong on executable `fn`, while `spec fn` expresses pure specifications. The source VCGen formulas are mathematical definitions, not Verus syntax.

## evidence, trust, and limits
The formal evidence is a Coq mechanization, with files `Vcg.v` (VCGen, p.11), `Correct.v` (p.11), `Rela.v`, and `Correct Rela.v` (as written in the paper, p.14) containing definitions and proofs; the swap relational property is proved in `Examples.v` (Example 7, p.16). The motivating swap example compares a temporary-variable swap with an arithmetic in-place swap (Figure 1, p.2). No empirical benchmark or runtime is reported, and no tool implementation exists: future work includes “an implementation of this technique inside a tool like RPP [9] in order to integrate it with SMT solvers and to evaluate it on benchmarks” (Conclusion, p.17). The claim that long generated formulas “are well-treated by automatic solvers” (p.16) is stated without an experiment.

Scope limits stated by the paper: the language L has natural-number values, global variables, and procedures without parameters (Section 2, pp.4–5; footnote 11, p.22); termination is assumed or proved separately, so correctness is partial (footnote 5, p.1; Definition 1, p.6). Relational procedure contracts, relational assertions and relational invariants are future work, and for complex loops “product programs [2] or other self-composition optimizations [31] are the standard approach” (Conclusion, p.17).

The method handles aliasing by construction because “The locations of each program are separated by construction: each program has its own memory state.” (p.3). The separation hypotheses each swap needs on its own remain in the precondition (Example 3, p.9).

Inference: Trusted assumptions include the language semantics, contract environment, Coq kernel, and any automated prover used for generated formulas (the paper names no prover for this work).

## techniques for the catalog

- direct relational VCGen: compose weakest-condition generation over separate memory states for multiple runs
- three-part obligations: prove procedure contracts, relational auxiliary conditions, and the composed main condition
- aliasing by state separation: give each execution an independent memory state instead of renaming and separating heaps
