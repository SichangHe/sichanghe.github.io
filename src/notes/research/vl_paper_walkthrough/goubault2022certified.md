# Certified Verification of Relational Properties
(authored by agents unless marked 🧑)
Tag: `goubault2022certified`, [paper](http://arxiv.org/abs/2202.10349v3)

This paper verifies properties relating several executions directly, using a verification-condition generator (VCGen) over separate memory states. It targets pointer aliasing without self-composition. The authors state: “This paper proposes an alternative approach that is not based on code transformation or relational rules.” (Introduction, p.3). They formalize the method in Coq; “Our Coq development contains about 3400 lines.” (p.3).

## technique: direct relational VCGen
Use this when a property compares two or more runs, such as swap equivalence, monotonicity, or non-interference, and composing renamed copies would create difficult separation assumptions. Give each run its own memory state and a relational precondition and postcondition over the tuple of states. Generate the ordinary VCGen for each command, but compose it over the sequence of commands. The recursive definition `Tcr` applies `Tc` from the last command backward, threading a relational postcondition. For two commands the paper writes: “Tcr ((c1 , c2 ), (σ1 , σ2 ), φ, Q) ≡ Tc Jc2 K(σ2 , φ, λσ′2 .Tc Jc1 K(σ1 , φ, λσ′1 .Q(σ′1 , σ′2 )))” (Definition 7, p.12). Generate auxiliary obligations with `Tar`, the conjunction of each command’s `Ta` conditions.

Then prove three obligations: procedure contracts (`Tf`), relational auxiliary conditions under the relational precondition, and the main `Tcr` condition under that precondition. The paper’s soundness theorem states: “a relational property is valid if all procedure contracts are valid, and, assuming the relational precondition holds, both the auxiliary verification conditions and the main relational verification condition hold.” (Theorem 3, p.14).

Inference: In Verus, represent each execution with separate values or ghost state and state the relation in `requires`/`ensures`. Prove each run’s ordinary loop invariants and then a relational lemma connecting final states. Verus has no paper-specific `Tc`, `Ta`, or `Tcr` commands; these are an inference mapping to proof functions and assertions. Separate ghost snapshots can encode the tuple of states, but ownership and borrowing must be handled explicitly.

## technique: ordinary VCGen decomposition
The paper’s base VCGen splits into three functions. `Tc` builds the main postcondition formula; `Ta` collects assertions, loop-invariant establishment and preservation, and callee preconditions; `Tf` checks every procedure body against its contract. For a loop, `Tc` assumes the invariant and exit condition for the final state, while `Ta` requires the invariant initially and proves it preserved on every body iteration (Figures 7–8, pp.9–11). This decomposition lets the relational generator reuse the already proved functional soundness theorem.

Inference: A Verus implementation should keep executable code and contracts in Rust and use ghost proof functions for `Ta`-like preservation facts. Loop invariants are written with Verus `invariant` clauses; postconditions belong on executable `fn`, while `spec fn` expresses pure specifications. The source VCGen formulas are mathematical definitions, not Verus syntax.

## evidence, trust, and limits
The formal evidence is a Coq mechanization, with files `Vcg.v`, `Correct.v`, `Rela.v`, and `Correct Rela.v` containing definitions and proofs (pp.11, 14). The motivating swap example compares a temporary-variable swap with arithmetic in-place swap (Figure 1, pp.1–2). No empirical benchmark denominator or runtime is reported. Trusted assumptions include the language semantics, contract environment, Coq kernel, and any automated prover used for generated formulas. The method assumes partial correctness unless termination is proved separately (p.1). It handles aliasing by construction because “The locations of each program are separated by construction: each program has its own memory state.” (p.3)

Inference: This directly threatens a product that only supports self-composition, because it removes a recurring source of cross-run separation lemmas. It does not replace Verus’s ownership proofs or prove Rust unsafe code sound. VL should reuse the paper’s relational-obligation decomposition rather than reimplement its Coq language.

## techniques for the catalog

- direct relational VCGen: compose weakest-condition generation over separate memory states for multiple runs
- three-part obligations: prove procedure contracts, relational auxiliary conditions, and the composed main condition
- aliasing by state separation: give each execution an independent memory state instead of renaming and separating heaps
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
