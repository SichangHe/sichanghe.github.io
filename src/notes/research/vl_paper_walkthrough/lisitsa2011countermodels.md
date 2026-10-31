# Finite countermodels for safety verification of parameterized tree systems
(authored by agents unless marked 🧑)
Tag: `lisitsa2011countermodels`, [paper](http://arxiv.org/abs/1107.5142v1)

## scope and result
This paper verifies safety of parameterized systems with tree topology by translating regular tree model checking (RTMC) into first-order logic and asking a finite model finder for a countermodel. A positive safety result is obtained when the negated reachability formula has a finite model (Corollary 1, p. 5). Inference: that model acts as a finite invariant separating reachable from unsafe configurations; the paper itself only says, in Section 7, that success rests on “the presence of regular sets of configurations (invariants) covering all reachable configurations and disjoint with the sets of unsafe configurations” (p. 16). The abstract states, “The verification problem is translated to a purely logical problem of finding a finite countermodel for a first-order formula” (Abstract, p. 1).

The method targets infinite-state or parameterized systems, where unrestricted verification is undecidable. It handles two encodings: RTMC-style tree automata/transducers and parameterized tree rewriting with monotonic abstraction. It proves relative completeness with respect to RTMC and, under a fixed-point assumption, monotonic abstraction/backward symbolic reachability.

## technique: RTMC encoding into first-order logic

what it is and when to use it

Encode initial trees, unsafe trees, and one-step tree transitions as first-order predicates, then encode reachability as a reflexive-transitive relation. Use this when configurations are regular tree languages and a generic finite model finder is available.

how to apply it

1. Specify an initial tree automaton AI, unsafe automaton AU, and tree transducer D for one-step transitions. (Sections 2 and 3, pp. 2–4)
2. Translate each tree into a first-order term using a function symbol for every ranked tree constructor, a p-ary function symbol fθ for each θ of arity p (Section 3, p. 4)
3. Add `Init2`, `Unsafe2`, and transition predicates from each automaton/transducer rule; close them with universally closed implications (clauses 1–9 of Φ). (Section 3, p. 4)
4. Define `R(x,x)` for reflexivity and `R(x,y) ∧ R(y,z) → R(x,z)` for transitive closure. (Section 3, p. 4)
5. Ask a finite model finder for a model of the theory conjoined with the negation of reachable-unsafe existence. If a model is found, the safety obligation is established by the paper’s corollary. (Corollary 1, p. 5; the paper delegates the search to a finite model finder, p. 6)

The key correctness statement is, “If Φ 6⊢ ∃x∃y(Init(1) (x)∧R(x, y)∧U nsaf e(1) (y) then (L(AI )⋆RD∗)∩L(AU ) = ∅”. (Corollary 1, p. 5; the extracted text prints ⊬ as “6⊢”)

Verus form (Inference)

Represent first-order terms and tree automata as immutable Rust data. Use `spec fn` predicates for `Init`, `Unsafe`, and a bounded or inductively represented reachability relation; prove Horn-clause closure with `proof fn` lemmas. Verus cannot directly serve as a generic finite model finder, so Mace4’s model search remains external unless a finite-domain checker is verified. The finite model can be imported as a certificate and checked by executable Rust predicates.

what evidence shows it works

The method is relatively complete with respect to RTMC: if there is a regular tree language that contains the reachable trees L(AI) ⋆ RD* and is disjoint from L(AU), then a finite countermodel exists, so a complete finite model finder will find one (Theorem 1, Section 3.1, pp. 6–7). The proof takes as domain the states of a deterministic automaton for that language, the states of AI, AU and D, and one extra element e. This is a theorem, not an empirical denominator.

## technique: finite countermodel as invariant certificate

what it is and when to use it

Inference: treat the finite interpretation returned by the model finder as an abstract invariant (the paper does not use this wording for models). Its `Init`, transition, and unsafe predicates satisfy the encoded theory, while no initial-to-unsafe pair exists. Use this to obtain a compact certificate for a parameterized safety proof.

how to apply it

Inference: the paper delegates all of this to Mace4 and gives no separate checking procedure; the steps below are the obligations a checker of a returned model would have to discharge.

1. Require the model to satisfy all translated automaton and relation clauses. (Section 3, p. 4)
2. Check that the interpretations of Init(1) and Unsafe(1) contain the images of the initial and unsafe trees (adequacy: Propositions 1–2, p. 5)
3. Check relation reflexivity/transitivity and transducer closure (clauses 7–11). (Section 3, p. 4)
4. Verify that no pair in the interpretation of R links an Init(1) element to an Unsafe(1) element, i.e. the model satisfies the negation of ∃x∃y(Init(1)(x) ∧ R(x,y) ∧ Unsafe(1)(y)). (Corollary 1, p. 5)

Verus form (Inference)

Store the finite-domain interpretation as a Rust array or map and prove each generated clause with finite exhaustive lemmas. The resulting proof establishes the encoded model’s safety; a separate refinement theorem is needed to connect the model to concrete Rust execution.

## technique: parameterized tree rewriting and monotonic abstraction

what it is and when to use it

For rewrite systems over trees, over-approximate one-step rewriting (a tree may step to τ2 whenever some tree embedded in it rewrites to τ2), then compute backward reachable unsafe sets to a fixed point. Use when initial configurations form a regular tree language and unsafe configurations are finitely based under the tree embedding order (Problem 2, p. 11).

how to apply it

1. Define local tree rewrite rules and the embedding relation between trees. (Section 5.1, pp. 10–11)
2. Represent unsafe configurations as an upward-closed finitely based set. (Section 5.1, p. 11)
3. Define monotonic abstraction `τ1 ⇒A τ2` when some tree embedded in `τ1` rewrites to `τ2`. (Section 5.1, p. 11)
4. Iterate `U0 = Unsafe`, `Ui+1 = Ui ∪ Pre(Ui)` until the well-quasi-order guarantees stabilization. (Section 5.1, p. 11)
5. Check `Init ∩ U = ∅`; disjointness proves safety because the abstraction over-approximates concrete reachability. (Section 5.1, p. 11)
6. Translate rewrite rules, initial automata, and unsafe generators into first-order axioms and use finite countermodel finding as an alternative proof route. (Section 5.2, pp. 12–13)

The paper explains that “is a well quasi-ordering [13] this iterative process is guaranteed to stabilize” (Section 5.1, p. 11; the extracted text drops the order symbol before “is”).

Verus form (Inference)

Encode trees as recursive datatypes and embedding as a `spec fn`; prove monotonicity and well-founded measure lemmas where feasible. Represent each fixed-point generator set and prove that every concrete transition preserves the complement of the unsafe closure. A fully general infinite-tree fixed-point algorithm is outside ordinary executable Verus and would require bounded certificates or an external checker.

what evidence shows it works

The paper proves relative completeness under termination of the monotonic backward algorithm with Init ∩ U = ∅ (Theorem 2, Section 5.2, p. 13). In the Two-way Token case (second encoding), the text says Mace4 finds a model in 0.04 s (Section 5.3, p. 15), while Table 6.2 lists 0.03 s for Two-way Token (p. 16); the paper does not explain the difference. Section 6 says each reported time is an average of 10 attempts (p. 15). Inference: these are demonstrations on small standard protocols, not a general performance estimate.

## case study and measurements

The Two-way Token protocol uses finite-state processes in a binary tree; a token moves up or down, and the safety property is that at most one token exists. The RTMC encoding and the tree-rewriting encoding both produce finite countermodels. Experiments use Mace4 from Prover9-Mace4 0.5 on Windows XP, Intel Core 2 Duo T7100 1.8 GHz, 1 GB RAM; each time is an average of 10 attempts (Section 6, p. 15). In the RTMC comparison, Token takes 0.02 s and Two-way Token 0.03 s; in the monotonic-abstraction comparison, IEEE 1394 takes 0.04 s versus 1h15m25s reported by the alternative method (Table 6.1, p. 15; Table 6.2, p. 16; the alternative method’s Token and Two-way Token times in Table 6.2 are 1 s each). The table footnotes give different hardware for the alternative results (Centrino 1.6 GHz, 768 MB for [6]; dual Opteron 2.8 GHz, 8 GB for [5]), so Inference: direct speed comparisons are confounded.

## what is proved and trusted

Proved: adequacy of automaton/transducer encoding, safety corollaries, relative completeness against RTMC, and relative completeness against monotonic abstraction when its fixed point terminates. Measured: six named protocols in Table 6.2 and two in Table 6.1, with ten attempts per reported Mace4 time. Inference, trusted: first-order theorem/model-finder implementation, correctness of input automata and rewrite rules, finite-domain search, and the abstraction’s relation to concrete code.

## techniques for the catalog

- first-order RTMC encoding: translate tree automata and transducers into Horn clauses and a transitive reachability predicate
- finite countermodel invariant: use a finite model of the negated reachable-unsafe formula as a safety certificate
- monotonic tree abstraction: compute backward unsafe closure under embedding until a well-quasi-order fixed point
- model-finder certificate checking: validate finite interpretations and disjointness before connecting them to implementation code
