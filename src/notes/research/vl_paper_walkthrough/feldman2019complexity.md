# Complexity and information in invariant inference
(authored by agents unless marked 🧑)
Tag: `feldman2019complexity`, [paper](https://doi.org/10.1145/3371073)

## result and scope
Feldman, Immerman, Sagiv, and Shoham analyze how much information invariant-inference algorithms obtain from SAT-style queries. Their abstract states: “We consider the problem of inferring an inductive invariant of polynomial length given a transition system and a safety property.” (Abstract, p. 1.) They model a transition system as initial formula `Init`, transition relation `δ`, and bad-state formula `Bad`; an inductive invariant must include `Init`, be closed under `δ`, and exclude `Bad` (Section 1, p. 2; Section 3.1, p. 9).

## technique: formulate inference as a black-box Hoare-query problem

What it is. An inference algorithm cannot read `δ`; it chooses formulas `α` and `β` and asks whether every one-step successor of `α` satisfies `β`. The oracle is defined exactly as: “the Hoare-query oracle, H (δ, α, β), returns false if (α ∧ δ ∧ ¬β ′) ∈ SAT; otherwise it returns true.” (Definition 5.2, p. 12.) A false answer yields a counterexample transition.

When to use it. Use this abstraction when studying or designing SAT-based inference whose only semantic access is one-step reachability. It captures IC3/PDR and variants (Section 5, pp. 12–13), while excluding white-box abstract interpretation that reads the transition formula directly (Section 1, p. 2).

How to do it.
1. Fix the vocabulary size `n = |Σ|`, initial states, and bad states; hide the transition formula from the learner (Definition 5.1, p. 12).
2. Let the learner issue `H(δ, α, β)` calls. A true result proves the one-step Hoare triple; a false result supplies a pair satisfying `α ∧ δ ∧ ¬β′`.
3. If only the Boolean result is exposed, recover a concrete counterexample by binary search: conjoin each variable of the pre- and post-state vocabulary in turn to `α` or `β`, keeping the literal if the query still answers false and flipping it otherwise. Lemma 5.3 (p. 13) states that this uses `n = |Σ|` Hoare queries; Inference: its proof loops over every variable of `Σ ⊎ Σ′`, which is `2n` variables, so the stated count looks loose by a constant factor.
4. Count worst-case oracle calls as a function of `n`, independently of the formula representation size (Definition 5.4, p. 14).

Verus form. Inference: represent a Rust transition system with a state struct, a `spec fn` for the transition relation, and an invariant `spec fn`. A Verus proof function can establish `requires inv(s) && step(s, s2)` and `ensures inv(s2)`. A synthesis loop outside Verus can propose candidates and use Verus verification failures as analogues of counterexamples, but Verus does not expose a standard Hoare-query oracle or guarantee that failure returns a concrete state.

Evidence and limit. The paper says the information-based analysis “sidesteps open computational complexity questions, and therefore results in unconditional lower bounds on the computational complexity of SAT-based algorithms captured by the model” (Section 5, p. 12). Only the number of queries is counted (Section 5, “Complexity”, p. 13). Inference: a query bound is therefore evidence about information, not a measured wall-clock bound.

Scope of the count. Query complexity is a function of the vocabulary size `n = |Σ|`, not of the size of `δ` (Remark 5.2, p. 14). The paper notes that with unlimited computation and exponentially long queries a Hoare-query algorithm can learn the formula of `δ` for the hard class `P_Σ2P` with polynomially many queries (Lemma B.1, Appendix B, pp. 34–35). It only conjectures a superpolynomial bound in `|Σ| + |TS|` for polynomially long queries (Conjecture B.2, p. 35). The monotone-maximal lower bound is exponential in `|TS|` as well (Section 7.2.3, p. 26).

## technique: backward reachability with generalization (PDR-1)

What it is. Start with `I = ¬Bad`; while `I` is not inductive, obtain a transition from a state satisfying `I` to one violating `I`, then block the pre-state by conjoining `¬d`. The paper gives this scheme as Algorithm 1 (Section 2.1, printed on p. 5). Naive blocking uses the full cube of the counterexample and can require exponentially many queries.

PDR-1 generalizes by dropping literals from the cube when the shortened conjunction remains unreachable from `Init` in one step. Its procedure is printed as:
“for l ∈ cube(σ ) do … if (Init =⇒ ¬t ) ∧ {Init}δ {¬t } then d ←t” (Algorithm 3, p. 5). For the Fig. 1 example (p. 4; the bit order of `x` is chosen by the immutable bits `c`), this obtains `d = x1 ∧ c1` and the clause `c1 → ¬x1`; the paper says “our results show that PDR-1 finds the aforementioned invariant in n2 queries” (Section 2.2, p. 5; read as n², consistent with `n·m` in Lemma 7.8 for `m = n`).

How to use it.
1. Initialize `I` to `¬Bad`.
2. Query `H(δ, I, I)`. If true, return `I`.
3. On false, obtain `(σ, σ′)` and set `d` to `cube(σ)`.
4. For every literal, tentatively remove it; retain the removal only if `t` is not reachable in one step from `Init`.
5. Conjoin `¬d` to `I` and repeat (Algorithm 4, p. 23).

The guarantee is class-specific. For a safe system whose reachable states all occur within one step and are described by a monotone CNF with `m` clauses, PDR-1 returns that invariant using at most `n·m` Hoare queries (Lemma 7.8, p. 24). On monotone maximal systems, polynomial-length inference is decidable in polynomial queries (Corollary 7.9, p. 24).

Verus form. Inference: use a ghost candidate invariant and prove each strengthened clause with a `proof fn`; encode one-step closure with `requires`/`ensures` over state values. Literal dropping is an external synthesis algorithm. Each accepted drop needs a Verus proof that no reachable state satisfies the weakened cube. The algorithm's one-step diameter and monotonicity assumptions must be explicit lemmas; they do not follow from Rust types.

Failure. Generalization can over-exclude: the paper notes that “some states are reachable in two steps but not in one” and that Alg. 1 with the Alg. 3 generalization “might fail in such cases” (Section 2.2, pp. 5–6). The polynomial bound is not a general guarantee.

## technique: separate rich Hoare queries from inductiveness-only queries

What it is. An inductiveness query is the restricted case `H(δ, α, α)`. ICE-style learners propose complete candidates and receive counterexamples to induction. Rich Hoare queries permit different precondition and postcondition; PDR-1 uses this to check the reachability of an individual clause from `Init` rather than the invariant as a whole (Section 2.3, pp. 6–7).

The paper constructs monotone maximal systems where PDR-1 succeeds with polynomially many rich queries but every inductiveness-only algorithm needs exponentially many. The headline theorem is: “There exists a class of systems M E for which polynomial-length invariant inference has polynomial query complexity in the Hoare-query model … but every algorithm in the inductiveness-query model requires an exponential number of queries.” (Theorem 7.3, p. 22.) The lower bound for inductiveness-query algorithms on this class is `2^{Ω(n)}` queries (Corollary 7.11, p. 25), where `n = |Σ|` is the number of Boolean variables, counted in the worst case over systems and oracle answers (Definition 5.4, p. 14; Definition 7.1, p. 21).

How to use the distinction. PDR's checks are captured as `H(δ, F, α)` or `H(δ, F ∧ α, α)` (Section 5, p. 13). The paper's positive result relies on monotone invariants, whose clauses are exactly the prime consequences (Theorem 7.7, p. 23), and on every reachable state being reachable in one step (Lemma 7.8, p. 24). Inference: outside such classes the paper gives no guarantee that richer queries help; it also notes that “this result does not mean that PDR is always more efficient than every ICE algorithm” (Section 1, p. 3).

Verus form. Inference: a Verus-based synthesizer should request targeted proof obligations for a proposed precondition/postcondition pair rather than only asking whether a whole candidate invariant closes. The tool can encode these as separate `proof fn`s over abstract states. This is a design analogy; Verus's solver failures are not proven to have the paper's adversarial oracle behavior.

## technique: information lower bounds for general and interpolation queries

The paper proves an unconditional lower bound: “Every Hoare-query inference algorithm A H deciding polynomial-length inference for the class of all propositional transition systems has query complexity of 2Ω(n).” (Theorem 6.1, p. 14.) The stronger result holds even for computationally unrestricted algorithms and a hard class tied to `ΣP2` quantified Boolean formulas (Theorem 6.2, p. 14). The paper's construction creates two transition systems indistinguishable on all queried valuations but with different invariant existence; fewer than exponentially many queries cannot distinguish them (Section 6.1.2, pp. 16–18).

Polynomial-length inference itself is `ΣP2`-complete (Theorem 4.2, p. 11), where complexity is measured in the input transition-system size while the invariant length is polynomial in vocabulary size. Restricting candidates to conjunctions or a constant number of literals per clause admits polynomial SAT-query procedures, but the richer polynomial-length CNF class is hard (Section 4, pp. 11–12). The proof of Theorem 4.2 is given after Lemma 6.3 (p. 16).

Interpolation does not evade the information barrier. The interpolation-query model returns an interpolant after a bounded reachability check; even computationally unrestricted algorithms still require `2^{Ω(n)}` queries on the constructed class, with the unrolling bounds `k1`, `k2` polynomial in `n` (Definition 6.5 and Theorem 6.6, p. 18). The authors explain that the bound does not follow directly from the Hoare-query result, because “an interpolant can convey information beyond a polynomial number of Hoare queries”, and that `ρ` “may be exponentially long” (Section 6.2, p. 18).

Verus form. Inference: do not assume that stronger SMT formulas or interpolants automatically make invariant synthesis efficient. A product should record the candidate language, oracle information, and worst-case assumptions. If a synthesis layer delegates to Verus, its completeness claims must be restricted to a tractable invariant fragment or backed by explicit empirical evidence.

## what is proved, measured, and trusted

The paper proves query-complexity upper and lower bounds, reductions from quantified Boolean formulas, and separation results between query models. It does not report a software benchmark, success percentage, or average solver time; all numbers above are asymptotic worst-case bounds or the `n²`/`n·m` bounds for specified system classes. The Hoare oracle, SAT validity, transition-system encoding, and Boolean semantics are mathematical assumptions. Inference: for Verus, solver correctness, the encoding from Rust to formulas, and the user's candidate specification remain analogous trust boundaries.

The paper proves worst-case query lower bounds for Hoare, interpolation, and inductiveness-only inference on specific constructed classes, and a polynomial upper bound for PDR-1 on monotone maximal systems.

## techniques for the catalog

- Hoare-query abstraction — hide transitions behind `H(δ, α, β)` and measure information gained per query
- PDR-1 generalization — block a counterexample and drop literals while one-step reachability remains impossible
- rich relative-inductiveness checks — use distinct preconditions and postconditions to recover clauses that inductiveness-only learning cannot identify efficiently
- interpolation-query analysis — model bounded reachability plus interpolants and test whether they overcome information lower bounds
- query-complexity accounting — state vocabulary size, candidate class, oracle interface, and worst-case query denominator before claiming inference efficiency
