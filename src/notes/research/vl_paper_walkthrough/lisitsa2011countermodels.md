# Finite countermodels for safety verification of parameterized tree systems
(authored by agents unless marked 🧑)
Tag: `lisitsa2011countermodels`, [paper](http://arxiv.org/abs/1107.5142v1)

## scope and result
This paper verifies safety of parameterized systems with tree topology by translating regular tree model checking (RTMC) into first-order logic and asking a finite model finder for a countermodel. A positive safety result is obtained when the negated reachability formula has a finite model: that model acts as a finite invariant separating reachable from unsafe configurations. The abstract states, “The verification problem is translated to a purely logical problem of finding a finite countermodel for a first-order formula.” (Abstract, p. 1)

The method targets infinite-state or parameterized systems, where unrestricted verification is undecidable. It handles two encodings: RTMC-style tree automata/transducers and parameterized tree rewriting with monotonic abstraction. It proves relative completeness with respect to RTMC and, under a fixed-point assumption, monotonic abstraction/backward symbolic reachability.

## technique: RTMC encoding into first-order logic

what it is and when to use it

Encode initial trees, unsafe trees, and one-step tree transitions as first-order predicates, then encode reachability as a reflexive-transitive relation. Use this when configurations are regular tree languages and a generic finite model finder is available.

how to apply it

1. Specify an initial tree automaton AI, unsafe automaton AU, and tree transducer D for one-step transitions. (Sections 2 and 3, pp. 2–3)
2. Translate each tree into a first-order term using a function symbol for every ranked tree constructor. (Section 3, p. 3)
3. Add `Init2`, `Unsafe2`, and transition predicates from each automaton/transducer rule; close them with universal Horn clauses. (Section 3, pp. 3–4)
4. Define `R(x,x)` for reflexivity and `R(x,y) ∧ R(y,z) → R(x,z)` for transitive closure. (Section 3, p. 4)
5. Ask a finite model finder for a model of the theory conjoined with the negation of reachable-unsafe existence. If a model is found, the safety obligation is established by the paper’s corollary. (Section 3, p. 4)

The key correctness statement is, “If Φ 6⊢ ∃x∃y(Init(1) (x)∧R(x, y)∧U nsaf e(1) (y) then (L(AI )⋆RD∗)∩L(AU ) = ∅”. (Corollary 1, p. 4)

Verus form (Inference)

Represent first-order terms and tree automata as immutable Rust data. Use `spec fn` predicates for `Init`, `Unsafe`, and a bounded or inductively represented reachability relation; prove Horn-clause closure with `proof fn` lemmas. Verus cannot directly serve as a generic finite model finder, so Mace4’s model search remains external unless a finite-domain checker is verified. The finite model can be imported as a certificate and checked by executable Rust predicates.

what evidence shows it works

The method is relatively complete with respect to RTMC whenever a regular inductive language separates reachable and unsafe trees and a complete finite model finder is used (Theorem 1, Section 3.1, p. 5). The proof constructs a finite domain from automaton states plus one error element. This is a theorem, not an empirical denominator.

## technique: finite countermodel as invariant certificate

what it is and when to use it

Treat the finite interpretation returned by the model finder as an abstract invariant. Its `Init`, transition, and unsafe predicates satisfy the encoded theory, while no initial-to-unsafe pair exists. Use this to obtain a compact certificate for a parameterized safety proof.

how to apply it

1. Require the model finder to satisfy all translated automaton and relation clauses. (Section 3, p. 4)
2. Check that all initial terms map into the finite domain’s initial predicate and all unsafe terms map into its unsafe predicate. (Propositions 1–2, pp. 4–5)
3. Check relation reflexivity/transitivity and transducer closure. (Section 3, p. 4)
4. Verify that the interpretation of reachable initial states is disjoint from the unsafe interpretation. (Corollary 1, p. 4)

Verus form (Inference)

Store the finite-domain interpretation as a Rust array or map and prove each generated clause with finite exhaustive lemmas. The resulting proof establishes the encoded model’s safety; a separate refinement theorem is needed to connect the model to concrete Rust execution.

## technique: parameterized tree rewriting and monotonic abstraction

what it is and when to use it

For rewrite systems over trees, over-approximate one-step rewriting by allowing embeddings of left-hand sides, then compute backward reachable unsafe sets to a fixed point. Use when unsafe configurations are finitely based under the tree embedding well-quasi-order.

how to apply it

1. Define local tree rewrite rules and the embedding relation between trees. (Section 5.1, pp. 7–8)
2. Represent unsafe configurations as an upward-closed finitely based set. (Section 5.1, p. 8)
3. Define monotonic abstraction `τ1 ⇒A τ2` when an embedded tree can rewrite to `τ2`. (Section 5.1, p. 8)
4. Iterate `U0 = Unsafe`, `Ui+1 = Ui ∪ Pre(Ui)` until the well-quasi-order guarantees stabilization. (Section 5.1, p. 8)
5. Check `Init ∩ U = ∅`; disjointness proves safety because the abstraction over-approximates concrete reachability. (Section 5.1, p. 8)
6. Translate rewrite rules, initial automata, and unsafe generators into first-order axioms and use finite countermodel finding as an alternative proof route. (Section 5.2, pp. 8–9)

The paper explains, “Since the relation  is a well quasi-ordering [13] this iterative process is guaranteed to stabilize.” (Section 5.1, p. 8)

Verus form (Inference)

Encode trees as recursive datatypes and embedding as a `spec fn`; prove monotonicity and well-founded measure lemmas where feasible. Represent each fixed-point generator set and prove that every concrete transition preserves the complement of the unsafe closure. A fully general infinite-tree fixed-point algorithm is outside ordinary executable Verus and would require bounded certificates or an external checker.

what evidence shows it works

The paper proves relative completeness under termination of the monotonic backward algorithm (Theorem 2, Section 5.2, p. 9). In the Two-way Token case, Mace4 finds a finite model in 0.04 seconds (Section 5.3, p. 10). The denominator is one run for that example, so it is a demonstration, not a performance estimate.

## case study and measurements

The Two-way Token protocol uses finite-state processes in a binary tree; a token moves up or down, and the safety property is that at most one token exists. The RTMC encoding and the tree-rewriting encoding both produce finite countermodels. Experiments use Mace4 from Prover9-Mace4 0.5 on Windows XP, Intel Core 2 Duo T7100 1.8 GHz, 1 GB RAM; each time is an average of 10 attempts (Section 6, p. 10). In the RTMC comparison, Token takes 0.02 s and Two-way Token 0.03 s; in the monotonic-abstraction comparison, IEEE 1394 takes 0.04 s versus 1h15m25s reported by the alternative method (Tables 6.1–6.2, p. 10). The alternative results use different hardware, so direct speed comparisons are confounded.

## what is proved and trusted

Proved: adequacy of automaton/transducer encoding, safety corollaries, relative completeness against RTMC, and relative completeness against monotonic abstraction when its fixed point terminates. Measured: six named protocols in Table 6.2 and two in Table 6.1, with ten attempts per reported Mace4 time. Trusted: first-order theorem/model-finder implementation, correctness of input automata and rewrite rules, finite-domain search, and the abstraction’s relation to concrete code.

Inference: for VeruLaw, finite model certificates suggest a useful external-certificate workflow for parameterized Rust data structures, but tree automata and generic finite model finding are not themselves Verus proofs. Existing work already establishes the core FCM/RTMC reduction; VL should focus on checked certificate import and concrete Rust refinement rather than reproduce the reduction.

## techniques for the catalog

- first-order RTMC encoding: translate tree automata and transducers into Horn clauses and a transitive reachability predicate
- finite countermodel invariant: use a finite model of the negated reachable-unsafe formula as a safety certificate
- monotonic tree abstraction: compute backward unsafe closure under embedding until a well-quasi-order fixed point
- model-finder certificate checking: validate finite interpretations and disjointness before connecting them to implementation code
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
