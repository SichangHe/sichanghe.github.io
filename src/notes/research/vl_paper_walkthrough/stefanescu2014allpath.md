# All-Path Reachability Logic
(authored by agents unless marked 🧑)
Tag: `stefanescu2014allpath`, [paper](https://doi.org/10.23638/LMCS-15%282:5%292019) (DOI printed in the paper text; the text is the 2019 LMCS journal version, pp. 5:1-5:23, which says an earlier shorter version appeared at RTA-TCLA 2014)

## result and setting

This paper gives a language-independent proof system for properties that must hold on every terminating execution path of a nondeterministic program. Its abstract says: “This paper presents a language-independent proof system for reachability properties of programs written in non-deterministic (e.g., concurrent) languages, referred to as all-path reachability logic.” (Abstract, PDF p. 1) The system takes an unconditional operational semantics as axioms and derives partial-correctness properties. The authors report that soundness is mechanized in Coq and that the system is implemented in K (Abstract and Section 1, pp. 1–3).

The distinction from one-path reachability is essential. One-path rules can establish a property on one execution or tolerate divergence; an all-path rule requires every complete path to reach a matching post-pattern. A Hoare triple is a special case whose right side contains no remaining code, while all-path reachability can require an intermediate configuration (Section 3, pp. 4–6). The introduction presents this as a way to verify nondeterministic programs directly from an operational semantics, without defining the language a second time as a set of Hoare-style proof rules (Section 1, pp. 1–2).

## technique 1: specify configurations with topmost matching logic

What it is. A matching-logic pattern combines a configuration term (a basic pattern) with first-order constraints. A pattern describes all configurations matching its structure and satisfying its constraints. The logic is parameterized by a signature, sorts, and a configuration model, so the same proof rules can be used for different languages (Section 2, pp. 3–4).

When to use it. Use this representation when an operational semantics already describes concrete configurations but proofs need symbolic variables, arithmetic conditions, maps, lists, heaps, or concurrent syntax. The paper notes that the configuration signature may be as small as IMP or as large as C with more than 100 semantic components (Section 2, p. 3).

How to do it.

1. Choose a sorted signature with a distinguished `Cfg` sort and constructors for program syntax and state components.
2. Let a basic pattern be a configuration term with variables; add logical constraints to restrict matching valuations.
3. Interpret satisfaction by matching a ground configuration against the term and checking the constraints. The paper's example `⟨x := x+1 || x := x+1, x ↦ n⟩ ∧ (n = 0 ∨ n = 1)` describes the two possible initial values (Section 2, p. 4).
4. If an SMT or first-order prover is used, translate each basic pattern `π` into an equality `□ = π` with a fresh configuration variable `□`; the paper states, right after Definition 2.2, that (γ, ρ) |= ϕ iff ρ_γ |= ϕ_□ (Section 2, p. 4).

Verus form. Inference: represent the executable Rust state with ordinary structs and values, and represent the mathematical state predicate with a `spec fn` over those values. Use `requires` and `ensures` for pre/post patterns; use `assert` and lemmas to discharge first-order constraints. Matching logic's configuration equality is not a Verus construct, so the state projection and abstraction relation must be stated explicitly in Rust specifications.

Evidence and assumptions. Definition 2.2 provides the FOL translation. The model must interpret the chosen constructors and theories; the framework does not prove that an arbitrary model faithfully implements a real machine. Inference: a Verus proof similarly depends on the correspondence between its modeled state and the deployed state.

## technique 2: define all-path reachability over unconditional semantics

What it is. An operational semantics is a set `S` of one-step rules `ϕ_l ⇒∃ ϕ_r`. An all-path property is `ϕ ⇒∀ ϕ′`: for every complete path starting in a configuration matching `ϕ`, some configuration on that path matches `ϕ′`. The paper defines validity as: “An all-path reachability rule ϕ ⇒∀ ϕ0 is satisfied, S |= ϕ ⇒∀ ϕ0 , iff for all complete T⇒S-paths τ starting with γ ∈ TCfg and for all ρ : Var → T such that (γ, ρ) |= ϕ, there exists some γ0 ∈ τ such that (γ0, ρ) |= ϕ0.” (Definition 3.2, p. 5)

When to use it. The paper uses `⇒∀` for specifications such as the racing increment, and `⇒∃` for the semantics rules and one-path properties (Section 3, pp. 5–6). Inference: use `⇒∀` for races, thread interleavings, nondeterministic choices, and loops where every terminating execution must satisfy the same postcondition.

How to do it.

1. Write unconditional reduction rules for the language. A rule `l ⇒∃ r if b` becomes the matching-logic rule `l ∧ b ⇒∃ r`.
2. Define the initial pattern, including code and state variables.
3. Define the target pattern, which may still contain code if an intermediate state is required.
4. Prove that every complete path from the initial pattern contains a target match.

The racing increment example starts with `x := x+1 || x := x+1` and state `x ↦ m`; its target says both threads finish and `x` is `m+1` or `m+2` (Section 3, p. 5). This captures both possible interleaving outcomes without assuming determinism.

Verus form. Inference: for a concurrent Rust API, model the permitted transition as a state-machine transition and state the desired postcondition over every allowed transition sequence. Verus state-machine invariants and `ensures` can express preserved facts, but the paper's path quantifier is a proof-system concept; a Verus user must encode the scheduler/interleaving abstraction explicitly. Inference: if the product needs safety on nonterminating executions, this paper's complete-path partial correctness is insufficient without an additional progress argument.

Evidence and limits. The semantics must be weakly well-defined: a matching left side must have a successor. The paper handles unconditional rules such as K, evaluation contexts, and the chemical abstract machine; Section 10 says conditional rules with premises are outside the current system (Section 3, p. 5; Section 10, p. 22).

## technique 3: prove with Step, Axiom, and structural rules

What it is. Figure 1 supplies `Step`, `Axiom`, `Reflexivity`, `Transitivity`, `Case Analysis`, `Abstraction`, `Consequence`, and `Circularity` (technique 4). A sequent is `S, A ⊢_C ϕ ⇒∀ ϕ′`, where `A` contains trusted reachability rules and `C` contains circularities that may be used only after progress. The key Step rule has two kinds of premise: every state matching `ϕ` matches the left side of some rule in `S` and so can take a step, and every successor satisfies `ϕ′` (Section 4, pp. 6–7).

When to use it. Use Step to handle one transition of every possible nondeterministic successor, Axiom to reuse an established rule, Case Analysis to split disjunctive states, Consequence to strengthen or weaken patterns using logical implication, and Transitivity to compose phases. Use Abstraction to existentially quantify variables `X` that do not occur free in the target.

How to do it.

1. Prove the Step progress premise: `|= ϕ → ⋁ ∃FreeVars(ϕ_l) ϕ_l`, the disjunction taken over all rules `ϕ_l ⇒∃ ϕ_r` in `S`. It ensures every configuration matching `ϕ` can take a step.
2. Prove the successor premise `|= ∃c (ϕ[c/□] ∧ ϕ_l[c/□]) ∧ ϕ_r → ϕ′` for each rule `ϕ_l ⇒∃ ϕ_r` in `S`. It ensures every successor matches `ϕ′`.
3. Apply Step to obtain a one-step all-path sequent.
4. Apply Reflexivity (which requires `C` to be empty) together with Consequence when a configuration already matches the target, and Transitivity to chain intermediate patterns.
5. Apply Consequence for logical implication and Case Analysis for disjunctions.

The racing increment proof enumerates reachable symbolic configurations. For each branch, lookup and arithmetic rules are matched modulo theories; the successor constraints determine whether the result is `m+1` or `m+2` (Section 5, pp. 9–10). The paper says Step requires “only one premise for each rule by which some configuration ϕ can take a step, even if that rule can be used to derive multiple transitions,” which handles unbounded branching (Section 4, p. 7).

Verus form. Inference: Step corresponds to proving each branch of a Rust `match` or each permitted state-machine transition, then using `assert` or a lemma to show the transition preserves the target invariant. `requires`, `ensures`, `assert`, `proof fn`, and state-machine invariants are suitable Verus constructs; `⇒∀` itself is not a Verus syntax feature. Inference: the paper's overlap/unification obligations (the satisfiability of `∃c (ϕ[c/□] ∧ ϕ_l[c/□])`, discussed on p. 10) would become explicit branch conditions in Verus.

Evidence and trust. Theorem 7.1 gives the paper’s soundness result: if `S ⊢ ϕ ⇒∀ ϕ′` then `S |= ϕ ⇒∀ ϕ′` (Section 7, p. 12); the paper says it proves soundness “once and for all languages” and mechanized the proof in Coq. Step and Consequence have first-order validity premises, and the K implementation uses Z3 for domain reasoning (Section 6, p. 11). Inference: the solver and the semantic definitions therefore remain trusted components of the deployed toolchain.

## technique 4: use Circularity as a sound loop invariant rule

What it is. `Circularity` adds the current reachability claim to `C`, but requires a prior Step or Axiom progress before that assumption can be used. This is a coinductive rule that generalizes language-specific loop and recursion invariant rules. The progress guard prevents an immediate self-assumption from proving a false claim (Section 4, pp. 6–7).

When to use it. Use Circularity for while loops, recursive functions, and jumps. Pick an invariant pattern `ϕ_inv` that is implied by the initial state and from which the target follows after one or more steps.

How to do it.

1. Choose `ϕ_inv` and show `|= ϕ → ϕ_inv`; use Consequence to change the goal to `ϕ_inv ⇒∀ ϕ′`.
2. Claim `ϕ_inv ⇒∀ ϕ′` as a circularity (Circularity rule) and prove it by Transitivity with the intermediate pattern `ϕ_inv ∨ ϕ′`.
3. The first part of the Transitivity proves `ϕ_inv ⇒∀ ϕ_inv ∨ ϕ′`, which takes at least one step (Step) before the circularity becomes usable.
4. Prove the second part, `ϕ_inv ∨ ϕ′ ⇒∀ ϕ′` with the circularity as an axiom, by Case Analysis, Axiom, and Reflexivity (Section 5, p. 10).

For Peterson's algorithm, the authors use a circularity for each reachable configuration with one thread in its loop; revisiting a configuration can then use the established invariant rule (Section 5, p. 10). For the sum loop `s := 0; while (n>0) {s := s+n; n := n-1}`, they use Circularity with the invariant rule `∃n0 (⟨LOOP, (s ↦ (n−n0)*(n+n0+1)/2, n ↦ n0)⟩ ∧ n0 ≥ 0) ⇒∀ ϕ′`, where `ϕ′` is the post-pattern `⟨skip, (s ↦ n*(n+1)/2, n ↦ 0)⟩` (Section 5, p. 10).

Verus form. Inference: write the selected invariant after `while` as a Verus `invariant` clause, prove initialization before the loop, and prove preservation across one body iteration; use a terminating condition to derive `ensures`. Circularity's explicit progress side condition is analogous to requiring a valid loop invariant and a decreasing `decreases` measure when termination is claimed. Inference: Verus loop invariants are checked by the verifier rather than added as coinductive assumptions, so the proof workflow differs even though the reusable invariant idea is the same.

Evidence and failure. The paper explains that circularity is sound because “requiring progress (taking at least one step in the transition system (T , ⇒TS )) before circularities can be used ensures that only diverging executions can correspond to endless invocation of a circularity.” (Section 4, p. 7) The method still reasons only about complete paths; it does not establish termination by itself.

## technique 5: automate symbolic execution by narrowing

What it is. The K prototype performs concrete execution on ground configurations and symbolic execution by narrowing conjunctive patterns. A conjunctive pattern has the form `∃X(π ∧ ψ)`. When it does not directly match a rule left side but is unifiable with one, narrowing collects unification, rule, and successor constraints and checks their satisfiability with an SMT solver (Section 6, pp. 10–12).

How to apply it.

1. Represent the current symbolic state as a basic configuration pattern plus constraints.
2. Unify its basic pattern with each semantic rule's left side modulo the supported theories.
3. Record equalities from theory terms instead of decomposing them syntactically.
4. Ask Z3 whether the conjunction of existing constraints, unification constraints, and rule conditions is satisfiable.
5. For each satisfiable match, construct the successor pattern with the rule's right side and accumulated constraints.
6. Search from the left side of each user-provided rule for formulas implying its right side, using all attempted rules as circularities and semantic rules as `S`.

For `if (b) then x=1 else x=0`, narrowing creates one successor with `b=true` and one with `b=false` (Section 6, p. 11). The authors say their practical evaluation found conjunctive patterns sufficient for both operational semantics and specifications (Section 6, p. 11).

Verus form. Inference: this resembles splitting a proof on symbolic branch conditions and retaining path constraints with `assert` and lemmas. Verus does not expose K's narrowing engine; the user or automation must provide branch facts and suitable triggers. Inference: ghost state can hold accumulated path information, but it must be erased or kept proof-only so it does not change the executable Rust behavior.

Evidence and limits. The prototype is Java plus Z3 and uses unification modulo theories such as booleans, integers, sequences, sets, and maps (Section 6, pp. 10–12). The paper warns that the disjunction generated for Step “may not be finite, but it is sufficient for the examples that we considered.” (Section 6, p. 12) This is an explicit automation boundary.

## technique 6: establish foundational soundness and relative completeness

What it is. The paper proves soundness once for all languages and proves relative completeness under assumptions on the semantics and state theory. Soundness is mechanized in Coq; relative completeness assumes an oracle for first-order validity in the configuration model (Sections 7–8, pp. 12–20).

How to use the result. Treat the operational semantics as the language-specific artifact and reuse the generic proof rules. For relative completeness, ensure the semantics set `S` is finite, configurations are countable via an injective encoding into natural numbers, and the model supports natural-number `0`, `1`, addition, and multiplication. Theorem 8.1 then says every semantically valid all-path rule is derivable relative to the first-order oracle (Section 8, pp. 14–15; the proof runs to p. 20).

Verus form. Inference: the analogous engineering boundary is to keep Rust-specific semantics and library contracts explicit, then reuse generic proof lemmas. Verus cannot inherit the paper's theorem automatically: its supported Rust subset, translation to SMT, libraries, compiler, and solver are separate trusted components. Inference: mechanizing a Verus API's soundness in a proof assistant would strengthen foundations but would not prove the complete Rust implementation correct.

What is proved and what stays trusted. The paper proves the generic proof-system soundness and relative completeness, and Coq checks the soundness formalization. It does not prove every K language definition, Z3, Java implementation, or real program specification correct. Inference: a Verus proof likewise establishes the written contract under its trusted verifier and environment assumptions, not the adequacy of that contract.

## techniques for the catalog

- matching-logic state patterns — represent language configurations and constraints in a reusable first-order state model
- all-path reachability rules — require every complete execution path from a pre-pattern to hit a post-pattern
- Step-based nondeterministic proof — prove progress and all successor obligations for each matching semantic rule
- circularity invariants — justify loops and recursion by allowing a post-step invariant assumption
- narrowing symbolic execution — unify symbolic configurations with operational rules and accumulate SMT-checked path constraints
- mechanized generic foundations — establish language-independent soundness in Coq and relative completeness under a first-order oracle
