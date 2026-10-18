# Modeling Reachability Types with Logical Relations: Semantic Type Soundness, Termination, Effect Safety, and Equational Theory
(authored by agents unless marked 🧑)
Tag: `bao2023modeling`, [paper](https://arxiv.org/abs/2309.05885)

## scope and results

The paper gives a semantic, logical-relations model for reachability types. Its four proved targets are semantic type soundness, termination, effect safety, and contextual equivalence/equational laws. The authors build the model bottom-up: a unary relation for first-order references, reachability qualifiers, higher-order references, and write effects; then a binary relation for two-program reasoning. The formal results are mechanized in Rocq. The paper states: “The formal results in this paper have all been mechanized in Rocq.” (Introduction, p. 3).

Inference: this is a specification-and-proof architecture rather than an implementation of Rust or Verus. Its useful lesson for VeruLaw is to make reachable state and allowed mutation explicit in contracts, then prove generic lemmas once and reuse them across programs.

## technique 1: unary logical relation with store reachability

what it is and when to use it

The base relation interprets each type as a set of triples `(environment, store typing, value)`. A store typing maps locations to semantic types; a term relation requires evaluation from every well-typed store to a well-typed value and a monotone store extension. This is the method for proving semantic type soundness and termination, including terms that are not syntactically well typed but satisfy the semantic interpretation.

The paper’s setup is explicit: “The value interpretation of type T, written as V [[T]], is a set of triples of form (H, Σ, v), where H is a value environment, Σ is a store typing, and v is a value.” (Section 2.2, p. 7). It defines the key theorem: “Every syntactically well-typed term is semantically well-typed, i.e., if Γ ⊢ t : T, then Γ |= t : T.” (Theorem 2.1, p. 7). Adequacy then states: “Every closed semantically well-typed term t is safe: if ∅ |= t : T, then ∃ v, σ. t, ∅, ∅ ⇓ v, σ.” (Theorem 2.2, p. 7).

how to apply it

1. Define values, environments, stores, and a store typing Σ mapping each allocated location to a semantic value set (Section 2.2, pp. 5–7).
2. Define `L(v)`, the locations reachable from a value: constants reach nothing, locations reach themselves, and closures reach the locations reachable from their free variables in the closure's environment (Fig. 2, p. 6; the function `L(v)` is discussed in Section 2.3, p. 8).
3. Define store extension `Σ ⊑ Σ′`, well-formed stores `σ : Σ`, and a value interpretation `V [[T]]`; interpret function types by requiring safe evaluation for every future store extension and well-typed argument (Fig. 2, p. 6).
4. Define the term interpretation `E [[T]]` as termination to a value in `V [[T]]`, with a monotone final store and preservation of locations outside the term’s observed reachability (Fig. 2, p. 6).
5. Prove one compatibility lemma per typing rule (each semantic typing rule is a compatibility lemma; Section 2.2, p. 7). The fundamental theorem "follows immediately from the compatibility lemmas" (Section 2.2, p. 7) and is proven by induction on the type derivation, each case being a compatibility lemma (Discussion 3, p. 17). Adequacy and termination follow from the fundamental theorem and the definition of the term interpretation (Sections 2.2 and 3.4, pp. 7, 12).

Inference: the corresponding Verus design is a `spec fn` for the mathematical reachability set and a ghost representation of store typing, with executable Rust functions carrying `requires` clauses for the relation’s preconditions and `ensures` clauses for post-state typing and reachability. Proof functions can establish each compatibility lemma. Verus does not natively provide this paper’s closure-and-environment calculus, so the Rust model must expose the relevant heap state through ghost data or an abstraction invariant.

what the evidence shows and limits

The theorem statements establish logical implication, not benchmark coverage. Inference: Rocq mechanization is evidence that the definitions and proofs were checked in the stated calculus. The result is stated for a totalized big-step evaluation with fuel (termination is proven "by providing enough fuel", Discussion 2, p. 17), while the logical relations themselves are not step-indexed. The paper says: “Following [Amin and Rompf 2017; Ernst et al. 2006; Siek 2013; Wang and Rompf 2017], in the proof of semantic type soundness, we extend the big-step semantics ⇓ to a total evaluation function by adding a numeric fuel value and explicit timeout and error results.” (Section 2.2, p. 6). It does not report a number of programs, proof lines, or verification time.

## technique 2: relational store typing and time travelling

what it is and when to use it

The standard store typing extension `Σ ⊑ Σ′` carries no information about which locations a value reaches. The paper introduces relational store typing (RST) `Σ ⊑_L Σ′`, which parameterizes extension by a set `L` of reachable locations: the two typings must agree on `L` and leave the remainder unspecified (Fig. 2, p. 6; Section 2.3, p. 8). This gives "a degree of local reasoning" (Section 2.3, p. 8) about a function’s reachable state and yields the time-travelling lemma, which transports a value’s validity between store typings that agree on its reachable locations.

The paper says: “RST is symmetric, allowing Σ′ to be defined from Σ, such that they agree on L, leaving the remainder unspecified.” (Section 2.3, p. 8). Its lemma is: “If (H, Σ, v) ∈ V [[T]], and Σ ⊑ L(v) Σ′, then (H, Σ′, v) ∈ V [[T]].” (Lemma 2.3, p. 8).

how to apply it

1. Compute the reachable location set `L(v)` for the value being transported (Fig. 2, p. 6).
2. Require the old and new store typings to agree on that set, while allowing unrelated locations to change (Section 2.3, p. 8).
3. Reuse the time-travelling lemma to show that the value remains in the same semantic type (Lemma 2.3, p. 8).
4. For a function, instantiate `L` in the store-typing relation (formula 1) with the function closure’s reachability, and preserve all store locations outside the closure's and the argument's reachability (formula 4); the paper concludes that "functions can only access locations reachable from their arguments and themselves" (Section 2.3, p. 8; Fig. 2, p. 6).

Inference: in Verus, encode `L` as a ghost `Set<Loc>` and state a relation between pre- and post-state abstract stores that preserves entries in `L`. A function contract can require disjointness or controlled overlap of reachability sets and ensure unchanged values outside the allowed set. The paper’s relation is a semantic proof device; Verus users must choose a concrete map, sequence, or state-machine representation.

The paper connects this to separation-style reasoning but states its boundary: “This characterizes a separation logic [O’Hearn et al. 2001; Reynolds 2002] style of reasoning, but without enforcing exclusiveness of ownership, uniqueness, or immutability.” (Section 2.3, p. 8). Inference: this is weaker than Rust ownership and cannot by itself prove exclusive mutable access.

## technique 3: qualifiers, freshness, self references, and subtyping

what it is and when to use it

The user-facing calculus `λBq` exposes reachability as finite qualifiers on types and function arguments/results. `q` denotes freshness; `s` denotes a self reference; qualifiers describe one-step reachability and are saturated transitively when checking overlap. The application rule checks whether an argument’s saturated reachability is permitted by the function’s domain qualifier. This is used for borrowing-like separation, alias tracking, and escaping closures.

The paper’s motivating example is: “A fresh argument type means that the locations reachable from the argument and the function must be mutually disjoint, so that the function cannot observe any potential overlap with variables in the environment.” (Section 2.1, p. 4). For escaping values it says: “Our self references are similar to this pointers in OO languages.” (Section 2.1, p. 4).

how to apply it

1. Assign each variable a minimal one-step qualifier; compute transitive closure by the variable-reachability relation and qualifier saturation (Section 3.2, p. 10).
2. Mark a fresh result or argument with `q`; require disjoint reachability from the function closure unless the type explicitly permits overlap (Sections 2.1 and 3.3, pp. 4, 11–12).
3. Use `s` in an argument or result qualifier when the value may reach what the function itself reaches; use it for an escaping closure whose local variable is no longer in scope (Section 3.1, p. 9; Section 3.3, p. 12).
4. At application, substitute the argument qualifier for the parameter and the closure qualifier for `s`; check the overlap side condition and compute the result qualifier (semantic rules t-app and t-appq, Fig. 6, p. 13).
5. If a type must be widened, use semantic subtyping: qualifier inclusion, contravariant function arguments, covariant results, and the contextual `q-var` rule. The paper’s example replaces a local result variable by `s` through three sound subtyping steps (Section 3.5, pp. 13–14).

Inference: in Verus, represent qualifier sets as ghost sets or predicates over abstract locations. A verified Rust function can require set-disjointness for a fresh argument and ensure that returned references are related to the argument or receiver abstraction. Verus has no direct dependent function type with this qualifier syntax; the Rust API must carry the relationships in ghost parameters, tracked state, or explicit predicates. 

The model’s higher-order-reference extension adds location saturation and an allocation-order condition. The paper says: “our logical definition requires that earlier allocated locations cannot reach those allocated later” (Section 3.6, p. 15). It explicitly excludes cycles and reports the limitation: “This is a limitation in prior work [Wei et al. 2024] we discovered, leading to programs like Landin‘s knot [Landin 1964] not being typeable.” (Discussion 2, p. 17). The related-work section adds: “Recently, Deng et al. [2025] refined Wei et al. [2024]’s system to support cyclic references, addressing the key limitation identified in this paper.” (Section 6, p. 28). Inference: cyclic Rust data structures require a different abstraction or a cyclic-heap logic; this model cannot be applied unchanged.

## technique 4: explicit write-effect qualifiers

what it is and when to use it

`λεq` extends reachability qualifiers with an effect qualifier `ε`, a finite set of variables that may be modified. Function types carry latent effects. Sequential effects compose by set union. This gives a stronger guarantee than approximating writes by all reachable locations: pure expressions have no observable writes, and encapsulated computations have no observable effects.

The paper’s example states: “The function f has its latent effect on the variable c1, meaning that its body can only modify the locations reachable from c1, as shown in the highlighted formula in Fig. 9.” (Section 3.7, p. 17). It defines the composition: “In a flow-insensitive effect system like λεq, the composition is defined as set union.” (Section 3.7, p. 19).

how to apply it

1. Annotate each function type with `ε`; interpret it as pre-state locations that may change (Section 3.7, pp. 17–18).
2. Give assignments an intrinsic effect equal to the reference's qualifier `p̃` (the locations reachable from the variables in `p̃` that are modified); combine subterm effects and intrinsic effects with union (Section 3.7, p. 19; rule e-:=, Fig. 10, p. 18).
3. At calls, substitute the argument and self qualifiers into the latent effect (`θ = [o/x, p/s]`) and require the latent effect, minus the parameter, to be within the observation `φ` (rules e-app and e-app-q, Fig. 10, p. 18).
4. Prove the effect-aware fundamental theorem and adequacy by the same compatibility-lemma induction used for the unary relation (Section 3.7, p. 19).
5. Use Lemma 3.6 for encapsulation: for an expression typed with empty observation, empty reachability and empty effect, the term interpretation holds at any store typing that agrees with the original on the empty set; the paper says this means "an encapsulated computation does not induce observable effects" (Section 3.7, p. 19).

Inference: Verus can encode `ε` as a ghost set and express a frame condition in `ensures`: locations outside the effect set retain their abstract values. A `proof fn` can show set-union composition across calls. This requires a chosen abstract store; the paper’s effect semantics does not automatically transfer to arbitrary Rust aliasing.

## technique 5: binary logical relations and equational proofs

what it is and when to use it

To prove two programs equivalent in every well-typed context, the authors lift the unary relation to a binary Kripke relation indexed by a world `W = (Σ1, Σ2, f, V̂)`. The partial bijection `f` relates locations in two stores; worlds grow monotonically as allocations occur. Logical equivalence is shown sound with respect to contextual equivalence (Theorem 4.7, p. 23), and is then used to prove reordering of non-interfering expressions and beta-equivalence for pure arguments. Reordering requires separate observations (re-order-λq: `φ1* ∩ φ2* = ∅`) or, with effects, that each term's observation is disjoint from the other's effects (re-order-λεq: `φ1* ∩ ε2* = ∅` and `φ2* ∩ ε1* = ∅`) (Fig. 14, p. 24; Section 5.1, p. 25).

The paper defines the world as: “A world W is a tuple (Σ1, Σ2, f, V̂).” (Definition 4.2, p. 21). Its contextual criterion is: “we consider two terms contextually equivalent if they yield the same answer value in all Boolean contexts.” (Section 4.1, p. 20).

how to apply it

1. Define two store typings, a partial bijection between allocated locations, and related semantic values (Definition 4.2, p. 21; Fig. 12).
2. Require the relation to be well formed in both directions and monotone under world extension (Section 4.2, pp. 21–22).
3. Interpret paired references, functions, and terms so both executions preserve the relation and allowed effects (Fig. 13, pp. 22–23).
4. For reordering `t1 ; t2` and `t2 ; t1`, show each term preserves the other’s observation and effects, discharge world-extension obligations, and construct a final related world (Section 5.1, pp. 25–26; Fig. 15).
5. For β-equivalence, restrict the argument to an empty observation, empty reachability qualifier and empty write effect; apply the binary encapsulated-computation lemma (Lemma 5.4), then prove semantic weakening (Lemma 5.5) and semantic substitution (Lemma 5.6) by induction on the type derivations, and build the final world as an extension of the initial one (Section 5.2, pp. 26–27; Fig. 14, p. 24).

The paper concludes: “Rules re-ordering-λq and re-ordering-λεq in Fig. 14 are sound.” (Theorem 5.3, p. 26) and “Rule β-equiv in Fig. 14 is sound.” (Theorem 5.7, p. 27). It also reports a boundary: “While we have not yet mechanized such extended cases in Rocq” for non-empty observations in beta-equivalence (Discussion, p. 28).

Inference: Verus can approximate this with two ghost executions or a relational state machine, a ghost bijection between abstract locations, and paired `ensures` contracts. This is substantially more manual than a unary postcondition and is useful only when a product optimization or refactoring needs contextual equivalence.

## proved, trusted, and product implications

The proved facts are semantic theorems for the defined calculi: compatibility lemmas, fundamental theorems, adequacy, termination, effect safety, binary soundness, reordering, and β-equivalence. The paper states "All results are proven in Rocq." (Section 7, p. 30), but the Section 5 proofs are only outlined in the text ("Full proofs can be found in the Rocq artifacts", Section 5, p. 24), and the extended beta-equivalence cases are explicitly not mechanized (Section 5.2 discussion, p. 28). The paper does not prove properties of Rust, Verus, Z3, a compiler, or an external library. Inference: a VeruLaw product built from these ideas still trusts its specification, the abstraction connecting Rust memory to the model, Verus’s translation and solver, proof erasure, and unmodeled unsafe or foreign code.

The central limitation is acyclic higher-order state. The paper explicitly rules out cycles through allocation-order constraints and identifies Landin’s knot as untypable (Discussion 2, p. 17). Inference: agent-written verified Rust that uses ordinary trees, maps, queues, and ownership-shaped APIs is a closer fit than intrusive cyclic structures, alias-heavy graph code, or arbitrary unsafe code. The techniques are a high threat to any product claim that “verified” means all Rust behavior is covered automatically; they are a lower threat to a product that deliberately restricts APIs and asks users to state reachability and effect contracts.

## techniques for the catalog

- unary logical relations — interpret types and terms over environments, store typings, and values to prove semantic soundness and termination
- relational store typing — preserve values across store typings that agree on reachable locations
- qualifier saturation and freshness — track one-step and transitive reachability, disjoint arguments, and escaping self references
- higher-order reference invariants — use saturated reachability and allocation order to rule out cycles
- write-effect qualifiers — track exactly which reachable locations may be modified and prove effect safety
- binary Kripke relations — relate two stores with worlds and a partial location bijection for contextual equivalence
- equational proofs — prove reordering of non-interfering computations and β-equivalence of pure calls
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "The effect rules are straightforward: the final effect of a compound term combines the effects of sub-terms with the intrinsic effect of this term."): I read the paper text from the first line to the last and read the whole study. I checked every quotation word for word, the section, page, figure and theorem references, and each technique step against the paper's definitions (Figs. 2, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15). I changed: the L(v) reference; the fundamental-theorem step (now cites Discussion 3, p. 17 for induction on the type derivation); the RST step 4 (the paper uses the closure reachability in formula 1 and preserves outside closure plus argument reachability in formula 4); the Fig. 10 page (p. 18, not 19) and the e-:= and call steps; the beta-equivalence step order (Lemma 5.4, then 5.5, 5.6); the contextual-equivalence quote (lower-case "we"); the Landin quote (restored "[Landin 1964]"); added the Deng et al. 2025 remark (Section 6, p. 28), the reordering side conditions, and the caveat that Section 5 proofs are outlined and extended beta cases are not mechanized; removed the stray `invariant` remark; marked the Rocq-evidence remark as Inference. Tag kept (arXiv 2309.05885 appears in the paper text; the paper text is the v3 of 2025 and the OOPSLA 2025 DOI is doi:10.1145/3763116). I did not check the Rocq artifacts, the Verus and VeruLaw Inference paragraphs against Verus itself, or the cited prior work.
