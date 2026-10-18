# A Cyclic Proof System for HFLN
(authored by agents unless marked 🧑)
Tag: `kori2020cyclic`, [paper](http://arxiv.org/abs/2010.14891v3)

## scope and contribution

The paper defines a cyclic sequent calculus for HFLN, a higher-order logic with natural numbers and alternating least/greatest fixed points. Its motivating claim is explicit: “Cyclic proofs enable inductive reasoning without explicit inductions, which would be useful for proof automation.” (Section 1, p. 1.) The paper names semi-automated verification of higher-order programs as the potential application of the calculus (Abstract). It states that “Verification of various temporal properties of higher-order programs can naturally be reduced to validity checking for HFLN formulas.” (Section 1, p. 1.)

Inference: This is a proof-search architecture rather than an implementation for Rust. A Verus integration would need to translate a Rust verification condition into this kind of sequent and then emit a cyclic derivation, or use the global condition as a proof-search discipline.

## technique 1: encode recursive programs as HFLN fixed points

What it is. HFLN has natural-number terms, Boolean formulas, higher-order λ-terms, and `µ`/`ν` fixed-point binders. The semantics interprets `µ` as a least fixed point and `ν` as a greatest fixed point over monotone functions. The paper's running example encodes a recursive OCaml program:

> “let rec g n = if n=0 then () else g (n-1) in
> let rec f h m = h m; f h (m+1) in f g 0”

(Section 1, p. 1.) Its property is expressed with a greatest fixed point for the repeatedly-called function and a least fixed point for the terminating decrementing function (the displayed formula immediately following that program, pp. 1–2).

When to use it. Use this encoding when a recursive higher-order program's behavior can be represented as a monotone predicate over natural-number arguments. The paper restricts natural-number occurrences to argument positions and requires the types of fixed-point formulas and their variables to be of the form T, never N (Section 2.1, p. 3). Inference: this is what lets the semantics use complete lattices, so that least and greatest fixed points of monotone functions exist (Section 2.2, p. 5).

How to do it.
1. Choose a predicate for each recursive function; pass higher-order arguments as predicate arguments (Section 1, p. 1).
2. Translate a base case to a disjunct and a recursive call to the fixed-point variable applied to the successor/decremented argument. For example, the paper defines natural-number universal quantification as `forall := νX.λp.λx.p x ∧ X p (S x)` (Example 2, p. 3).
3. Use `µ` for terminating/inductive behavior and `ν` for recurrent behavior: the Section 1 formula uses `ν` for “f is infinitely often called” and `µ` for the decrementing function, Example 2 defines `forall` with `ν`, and Examples 2–4 define `∃`, `sum` and `<` with `µ` (pp. 2–4).
4. State the desired property as a sequent `Γ ⊢ Δ`; validity means some left formula is false or some right formula is true under every valuation (Definition 6, p. 5).

Verus form. Inference: model each recursive function's mathematical behavior with a `spec fn` or a ghost predicate and state its contract in `requires`/`ensures`; use a `proof fn` for induction lemmas. Verus has no HFLN `µ`/`ν` binders in Rust syntax, so the fixed-point equation becomes a recursive specification plus an explicitly supplied well-founded or invariant argument. Inference: CPS-style predicates are more natural than executable higher-order closures when the target is SMT automation.

Evidence. The paper gives concrete encodings for universal and existential quantification, addition (`sum`), and `<` (Examples 2–4, pp. 3–4; multiplication is only described as definable “in a similar way”, Example 3, p. 4), and reduces its OCaml termination example to a validity sequent in Example 17 (pp. 11–12).

Limits and assumptions. Monotonicity is required by the semantic domains (Section 2.2, p. 5). HFLN omits primitive negation: “HFLN does not have negation ¬.” (Remark 5, p. 4.) Completeness is later restricted to sequents without higher-order free variables (Theorem 22, p. 15).

## technique 2: cyclic pre-proofs and relevant traces

What it is. A pre-proof is a finite derivation tree plus a map from each open leaf to a same-sequent node; repeatedly replacing leaves creates an infinite derivation. The paper defines it precisely: “A pre-proof consists of a finite derivation tree D and a function R that assigns to each open leaf n in D a non-leaf node R(n) that has the same sequent as n.” (Definition 8, p. 6.) A path follows premises and jumps across `R`; a pre-trace follows formula occurrences that remain relevant through each rule (Section 3.1, pp. 6–8).

When to use it. Use a finite cyclic graph when ordinary induction would repeat the same obligation. The back-edge must preserve the sequent, and every infinite path must have a tail with a left `µ`-trace or right `ν`-trace (Definition 11, p. 9).

How to do it.
1. Build a finite Gentzen-style derivation with ordinary logical, substitution, λ, fixed-point, and natural-number rules (Figure 3, p. 7).
2. Leave recurring obligations open and map each open leaf to an earlier node with the same sequent (Definition 8, p. 6).
3. Track a formula occurrence down each path using the rule's relevant occurrence relation; the paper gives the `∧L` and `∨L` cases and notes `Mono` as the possible exception, where `ψ ~y` and `χ ~y` are the relevant occurrences of `ϕ[ψ/x]` and `ϕ[χ/x]`; Remark 7 (p. 6) turns `Mono` into a rule with one premise per occurrence of `x`, and the full definition is in Appendix A (p. 8, p. 19).
4. Check the global trace condition described below.

Verus form. Inference: a cyclic proof obligation can be represented by a recursive `proof fn` whose recursive call is justified by a `decreases` measure; loop invariants and recursive contracts play the role of sequents. Verus proof functions are not runtime calls, and the cyclic graph itself is not a Verus construct. Inference: an external checker could consume Verus-generated obligations and certify back-edges, while Verus checks each local rule instance.

Evidence. The calculus includes explicit examples: well-foundedness of a tree (Example 16, p. 11) and termination of a nondeterministic `repeat` program (Example 17, pp. 11–12). The latter's proof closes the recursive case through a cycle and states that the global condition holds because “we can trace the left µ in N for every infinite path.” (Example 17, p. 12.)

Limits and assumptions. Relevant-occurrence bookkeeping is structural and can duplicate premises for `Mono` (Remark 7, p. 6). Inference: a compiler that changes formula shape can invalidate a trace even when the underlying program is equivalent.

## technique 3: sequence annotations and the global trace condition

What it is. Each fixed-point occurrence receives a finite sequence of fresh natural numbers. Unfolding extends the sequence; `Mono` selects the premise corresponding to the occurrence being traced. Definition 9 gives the algorithm: “For every σ in τ0, we assign ε to σ.” On a principal fixed-point rule, the recursive occurrence receives `p.k` for a fresh `k`; otherwise annotations follow the relevant occurrence (Definition 9, p. 8).

A trace is a `µ`-trace when arbitrarily long prefixes of one infinite sequence label `µ`, and similarly for `ν`. A cyclic proof requires every infinite path to have a tail with a left `µ`-trace or right `ν`-trace: “A cyclic proof is a pre-proof that satisfies the global trace condition: for every infinite path, a tail of the path has a left µ-trace or right ν-trace.” (Definition 11, p. 9.)

When to use it. Use sequence annotations when fixed points alternate or nest and higher-order predicates are present. The paper notes that [14, Theorem 25] “suggests a negative answer” to whether a simpler condition such as the parity condition could replace it (Remark 13, p. 9).

How to do it.
1. Start every fixed point in the initial trace with the empty sequence (Definition 9, p. 8).
2. At each principal `σL`/`σR` unfolding of an operator annotated `p`, annotate the recursive occurrences `p.k` for a number `k` not used before (Definition 9, p. 8).
3. At `Mono`, if the traced occurrence continues into the j-th premise, it becomes `ψj ~y` there, taking over the annotations of the corresponding part of `ϕ[ψ1/x1, ..., ψk/xk]` (Definition 9, p. 8).
4. At λ, substitution, logical, and back-edge steps, copy annotations to the relevant occurrence (Definition 9, p. 8).
5. Accept a path if some tail has a left `µ`-trace or right `ν`-trace, i.e. one infinite sequence `p` whose every finite prefix labels the operator in some trace occurrence (Definitions 9 and 11, pp. 8–9).

Verus form. Inference: represent the sequence as a ghost `Seq<nat>` and prove that each recursive proof call extends it, or more simply use a lexicographic `decreases` tuple whose strict descent mirrors the paper's ordinal argument. Verus can express ghost state and quantified invariants, but it does not provide the paper's trace automaton; the sequence checker would be an external proof artifact.

Evidence. Example 10 explicitly annotates a ν occurrence `0`, then `0.2`, `0.2.4`, while the µ annotation stays empty; the paper concludes, “Hence this trace is a ν-trace but not a µ-trace.” (Example 10, p. 9.) Theorem 21 proves soundness from this condition.

Limits and assumptions. The global criterion is more complicated than a parity condition: the paper cites Tsukada [14, Theorem 25] as showing that “the validity of HFLN formulas cannot be captured by parity games” (Remark 13, p. 9). Inference: implementing it requires preserving occurrence identity through every transformation.

## technique 4: decide the condition with Büchi-automata containment

What it is. The paper constructs `Apath`, accepting all infinite paths of a finite pre-proof, and `Agtc`, accepting paths with a valid global trace. The validity question becomes automata inclusion. Section 4 says, “One automaton accepts all infinite paths of the pre-proof and the other accepts those that satisfy the global trace condition.” (Section 4, p. 12.)

How to do it.
1. Use proof nodes as the alphabet and build `Apath` from the finite graph (Section 4, p. 13).
2. Build `Agtc` whose states are marked formula occurrences plus an initial state (Definition 18, p. 13).
3. Mark one fixed-point occurrence and nondeterministically follow it through λ, substitution, `Mono`, and fixed-point rules. When the marked operator is unfolded, either continue marking its recursive copy or drop the mark and follow another copy (Definition 18, pp. 13–14).
4. In the case where the marked operator is the one being unfolded and tracked, the transition that keeps tracking it is accepting when the rule is `µL` or `νR`; all other transitions are non-accepting (Definition 18, p. 14).
5. Check that every path accepted by `Apath` is accepted by `Agtc`; Lemma 19 establishes the language correspondence and Theorem 20 concludes decidability (p. 14). Theorem 20 is worded as “The validity checking of a pre-proof (D, R) is decidable”; Section 4's introduction and Lemma 19 make clear that what is checked is the global trace condition.

Verus form. Inference: export the finite proof graph and occurrence labels from a Verus proof-generation pass, then run a Büchi-inclusion checker as a separate trusted tool. A direct Verus encoding would be cumbersome and would still require proving the checker implementation correct. Inference: this is most useful as a proof-search validator, not as an executable Rust component.

Evidence and limits. Theorem 20 states that “The validity checking of a pre-proof (D, R) is decidable.” (Section 4, p. 14.) The paper says the finite cyclic system is incomplete (Section 6, p. 15). Inference: the construction depends on the pre-proof being finite, so that the automaton `Apath` has finitely many states.

## soundness, completeness, and trusted remainder

Soundness is proved by contraposition. An invalid root yields an infinite invalid path; the global trace then induces an infinite descending ordinal chain. The paper states: “Therefore, if the path has a left µ-trace witnessed by an infinite sequence p, then αp[0:1] > αp[0:2] > αp[0:3] > . . . is an infinite decreasing chain of ordinals.” (Section 5, p. 15.) Theorem 21 concludes: “If there is a cyclic proof of Γ ` ∆, then Γ ` ∆ is valid.” (Theorem 21, p. 15.)

The finite cyclic system is incomplete: “Existence of a proof in our cyclic proof system is computably enumerable, but the valid sequents in HFLN are not because HFLN includes Peano arithmetic.” (Section 6, p. 15.) The infinitary variant has proofs as possibly infinite derivation trees; the infinitary variant is complete for sequents without higher-order free variables. Theorem 22 states that every valid such sequent has an infinitary proof (Section 6, p. 15). The construction requires fair expansion of every open leaf and eventual principal exposure of each formula (Section 6, p. 15).

Inference: the trusted base for a Verus adaptation includes the translation from Rust obligations to HFLN, the local rule checker, occurrence tracking, Büchi inclusion, and the soundness of the Verus-to-logic encoding. The paper proves mathematical soundness of its calculus, not correctness of a Rust compiler, SMT solver, or translation implementation.

## what is proved or measured

The paper proves: semantic soundness (Theorem 21), decidability of the global trace condition (Theorem 20), admissibility of quantifier and Park fixed-point rules (Propositions 14–15), and restricted completeness of the infinitary system (Theorem 22). It reports no runtime benchmark, proof-size corpus, or success denominator; the evidence is theorem-level plus the two worked proof diagrams (Examples 10, 16, 17; further proof diagrams are in Appendices B and D). Inference: threat to agent-written verified Rust is indirect but meaningful: cyclic search could reduce manual induction obligations, while the higher-order trace machinery and translation burden make an end-to-end product integration substantial.

## techniques for the catalog

- cyclic HFLN encoding — represent recursive higher-order behavior with monotone natural-number predicates and `µ`/`ν` fixed points

- finite cyclic pre-proof — close repeated sequent obligations with back-edges and relevant-occurrence tracking

- sequence global-trace condition — certify every infinite path by an unbounded left-`µ` or right-`ν` trace

- Büchi trace checker — decide the global condition by containment between path and accepting-trace automata

- ordinal soundness argument — turn a good trace into an impossible infinite descending ordinal chain
