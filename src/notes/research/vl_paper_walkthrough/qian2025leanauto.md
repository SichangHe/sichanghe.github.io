# Lean-auto: An Interface between Lean 4 and Automated Theorem Provers
(authored by agents unless marked 🧑)
Tag: `qian2025leanauto`, [paper](https://doi.org/10.1007/978-3-030-99524-9_24)

## scope and result

Lean-auto is a translation interface from Lean 4 to automated theorem provers (ATPs). The paper defines a hammer as having “three main components: premise selection, translation from ITP to ATP, and proof reconstruction from ATP to ITP” (Section 1, p. 1). Lean-auto mainly supplies translation, with reconstruction fully supported for its native prover path; for other ATPs, the paper says it “will generate a warning to indicate that Lean-auto trusts the ATPs’ output” (Section 1, p. 2). This distinction is a trust boundary for any verifier pipeline.

The workflow is preprocessing Lean 4 into dependent type theory (λC), then monomorphization through quantifier instantiation, λ*→ abstraction, and universe lifting (Sections 1 and 4, pp. 2, 9). The central design choice is monomorphization: unlike encoding, it keeps only concrete instances of polymorphic terms. The paper states that monomorphization “is sound, produces small translation results, and preserves term structures during translation” but “is incomplete” (Section 3, p. 8).

Inference: the directly reusable lesson for Verus is a staged lowering pass that preserves proof-relevant structure while eliminating polymorphism only where concrete instances are visible. The paper does not evaluate Verus.

## technique 1: monomorphization to a lower-order ATP

Use case. Monomorphization translates a dependent, polymorphic goal into a monomorphic higher-order logic (HOL*) problem by instantiating type and term parameters that occur in the goal and hypotheses. Use it when the source proof uses concrete instances of generic functions and an ATP cannot consume the source dependent type theory directly.

How to do it. The paper's List example gives an executable recipe (Sections 4.1–4.2, pp. 9–11):

1. Preprocess the goal by introducing leading universal quantifiers and applying proof by contradiction. For the example, `A B`, `f`, and `xs` enter the context and `neg_goal : Not (...)` is added before the goal becomes `False` (Figure 3, p. 10).
2. Collect HOL* instances occurring in the hypotheses and negated goal. The example collects `@reverse A`, `@reverse B`, `@map A B`, and `@Eq (List B)` (Section 4.2, p. 11).
3. Match dependent arguments in hypothesis theorems against those instances. The paper enumerates six matches, including `@map α β` with `@map A B` and `@reverse α` with `@reverse A` and `@reverse B` (Section 4.2, p. 11).
4. Repeat matching in a saturation loop until no new instances appear or a threshold is reached. Algorithm 1 maintains active hypothesis and constant instances; it adds every newly generated hypothesis and the HOL* instances occurring in it to the queue (Section 6, pp. 15–16).
5. Abstract each resulting HOL* instance into a HOL* variable and retain a substitution mapping variables back to source instances. The λ*→ pass traverses the quasi-monomorphic term and performs exactly this replacement (Section 5, p. 14).
6. Lift universe levels to ordinary HOL and send the result to an ATP (Section 4, p. 9; Appendix E).

Verus form. Inference: a Verus implementation would keep executable Rust unchanged, expose generic proof lemmas as `proof fn`s, and create monomorphic proof obligations by calling those lemmas at concrete type parameters. `requires` and `ensures` contracts would state the source and target relations; a `forall`-style specification and `lemma` calls would supply instances. Verus has no Lean-style ATP translation pass in the cited notes, so the lowering and solver interface would be new infrastructure. Do not represent a proof function as runtime code, and do not use unsupported constructs such as `invariant(...)` calls.

Evidence. On Mathlib4, the benchmark has 149,142 user-declared theorems before technical exclusions and 149,135 problems in Figure 5 (Section 8, pp. 17–19; the paper's two counts differ by seven). The setup is an Amazon EC2 c5ad.16xlarge with 64 CPU cores, 128 GB memory, and a 10-second limit per theorem (Section 8, p. 17). With idealized premises taken from each theorem's human proof, Lean-auto's virtual-best combination solves 61,906 problems; the overall virtual best solves 79,396, or 53.2% of 149,135 (Figure 5 and surrounding text, pp. 19–20). Lean-auto + Duper solves 54,570 (36.6%); the text calls that 5.0 percentage points better than Aesop, while the table lists Aesop at 47,060. The denominator and solver settings are the benchmark above.

Limits. Premise selection is not evaluated: the paper supplies all theorems used by the human proof, an idealization (Section 8, p. 17). SMT backends receive a modified FOL translation and “might have given Z3 and CVC5 a slight disadvantage” (Section 8, p. 18). Monomorphization can fail when no suitable lower-order formula reflects the source; λ*→ abstraction only handles quasi-monomorphic terms (Section 5, p. 14). For unsupported inductive types or non-SMT ATPs, users must manually supply properties (Section 7, p. 17).

## technique 2: definitional-equality control and typeclass absorption

Use case. Full normalization is too expensive, so Lean-auto combines controlled unfolding, fingerprints, and equality checks. The paper says full reduction “is prohibitively expensive on complex expressions in real-life Lean 4 projects” (Section 4.3, p. 13).

How to do it. During preprocessing, partially reduce with `Meta.transform` and `Meta.whnf`; let users select reducibility and provide definitional-equality or unfolding instructions. Topologically sort constants and fail on cycles; generate equations for maximal nonlogical subexpressions (Section 7, p. 16). During abstraction, keep mutually definitionally unequal instances, compare fingerprints first, then call `isDefEq`; during instantiation, generate nontrivial equations between instance pairs (Section 4.3, pp. 12–13). Absorb large, nondependent typeclass arguments into HOL* variables so expressions such as `HAdd.hAdd α β γ inst x y` become a small `h x* y*` (Sections 3 and 4.3, pp. 8, 13).

Verus form. Inference: an analogous Verus tool should normalize only selected spec definitions, cache structural fingerprints, and add explicit equality lemmas for chosen unfoldings. Rust trait dictionaries should be hidden behind proof-level uninterpreted functions when their behavior is irrelevant to the contract; concrete trait laws must still be stated as lemmas.

Evidence and limits. The evaluation reports average times of 1,092.5 ms for Lean-auto + Duper, 774.9 ms for Lean-auto + Zipperposition, and 756.8 ms for the Lean-auto virtual best, versus 92.2 ms for Aesop VBS (Figure 5, p. 19). The paper attributes the slowdown to the verified checker and frequent definitional-equality tests (p. 20). Inference: this is a threat to interactive VL latency, especially when generated proofs repeatedly trigger normalization.

## what is proved, trusted, and still missing

The native-prover path uses a verified checker in Lean-auto; other ATP results are trusted with warnings (Section 8, p. 18). The benchmark demonstrates translation and solving under supplied premises, not correctness of those premises, completeness, or deployment behavior. Inference: VL should not redo a generic translate polymorphism to ATP study without measuring Verus-specific contracts, Rust traits, ownership, and proof reconstruction. The product threat is moderate: automated solving can reduce proof effort, but ideal premise selection, incomplete translation, high latency, and trusted nonreconstructed ATP outputs limit unattended agent-written verified Rust.

## techniques for the catalog

- monomorphization saturation — instantiate concrete generic terms, repeatedly match them against hypotheses, abstract instances to HOL* variables, then call an ATP

- controlled definitional equality — combine selective unfolding, fingerprint filtering, `isDefEq`, and generated equations instead of full normalization

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
