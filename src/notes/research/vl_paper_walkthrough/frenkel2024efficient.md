# Efficient Implementation of an Abstract Domain of Quantified First-Order Formulas
(authored by agents unless marked 🧑)
Tag: `frenkel2024efficient`, [paper](https://arxiv.org/abs/2405.10308v4)

## result and scope
Frenkel et al. make quantified first-order abstract interpretation practical by representing formula sets compactly, weakening formulas against concrete states, and indexing the representation. The abstract domain is sets of formulas interpreted conjunctively. Its abstraction is α(S) = formulas true in every state of S. The abstract (p. 1) states: “We introduce an efficient representation of abstract elements, which eliminates redundancies based on a novel syntactic subsumption relation that under-approximates semantic entailment.”

The implementation computes the least fixpoint of the best abstract transformer, therefore the strongest inductive invariant expressible in a selected bounded language. It is implemented in the Rust verifier Flyvy and evaluated on 19 distributed protocols. The paper reports a Paxos fixpoint represented by 1,438 formulas with ∀*∃*∀* quantification, and Table 1 records five-run median ± maximum deviation except timeouts, which run once, under a 3-hour (10,800-second) limit on a 48-thread, 384-GiB AWS z1d.metal machine.

## technique: bounded languages and syntactic subsumption
Inference: Use this when a quantified formula language is too large to enumerate but its syntax can be bounded. Construct a finite language inductively from a finite, variable-permutation-closed base set augmented with bottom, then apply binary conjunction/disjunction, bounded homogeneous disjunction, unbounded nonempty conjunction, and existential/universal quantification (Section 3.1). Quantifier and Boolean bounds control precision and finite representation.

Define subsumption recursively over the same constructors (Section 3.2): bottom subsumes every base formula, and every base formula subsumes itself; binary connectives extend pointwise; homogeneous disjunction uses an injective mapping from each left disjunct to a right disjunct it subsumes; homogeneous conjunction maps each right conjunct to a left conjunct; quantifiers permit variable permutations, and the mixed ∃∀ constructor lets universal formulas subsume existential ones. Theorem 1 proves that subsumption is a preorder and that `φ ⊑ ψ` implies semantic entailment `φ |= ψ`.

Inference: A Verus invariant synthesizer could use bounded predicates, but would need a justified translation into this first-order grammar. The paper does not evaluate Verus.

## technique: canonicalization and antichain representation
Inference: Use this to remove subsumption-equivalent and subsumed candidates before storing them. Canonicalize recursively (Section 3.3): canonicalize subformulas, sort homogeneous sequences by a total order extending subsumption, remove subsumed conjuncts, and choose the least body over quantified-variable permutations. Theorem 2 states that canonicalization is representative and decisive and that subsumption becomes a partial order over canonical formulas.

Represent a formula set F as `R_F = min_⊑ {c(φ) | φ ∈ F}` (Section 3.4): canonicalize every formula, then keep only subsumption-minimal formulas, an antichain. Theorem 3 says this preserves both conjunctive semantics and the set's upward closure; for subsumption-closed sets, including abstractions, the full set is recovered by upward closure (Corollary 2). Section 3.4 (p. 10) explains: “The representation combines two forms of redundancy elimination: the use of canonical formulas eliminates redundancies due to subsumption-equivalence, and the use of ⊑L -minimal elements reduces the size of the set by ignoring subsumed formulas.”

Inference: A Verus invariant synthesizer could canonicalize predicate syntax trees and keep an antichain. Its subsumption rules would need their own entailment justification; the paper proves rules for its bounded first-order languages.

## technique: recursive weaken operator
Inference: Use this to join an abstract element with a concrete state without enumerating every formula in its upward closure. Given canonical φ and state s, define `W_L(φ,s)` as minimal canonical formulas subsumed by φ that s satisfies (Section 4.1). If s already satisfies φ, return {φ}. Otherwise recurse by language constructor:

1. Base language: return all satisfied base formulas only when φ is bottom; otherwise return empty.
2. Binary disjunction: weaken either disjunct and rebuild; homogeneous bounded disjunction additionally may append a weakened bottom disjunct if below its bound, then sort and remove subsumed results.
3. Binary conjunction: take all pairs of weakened conjuncts. Unbounded homogeneous conjunction accumulates all weakened conjuncts, minimizes and sorts them, and returns a singleton set containing that conjunction.
4. Existential quantifier: try every assignment to the quantified variables, weaken the body, re-quantify, canonicalize, and minimize.
5. Universal quantifier: iteratively weaken the body for every assignment, then re-quantify, canonicalize, and minimize. In the mixed constructor, an existential formula uses only existential weakening; a universal formula combines existential and universal weakening and minimizes the union.

These are the paper's recursive rules in Theorem 4. Its worked example starts from bottom in `L = ∀{x,y}[∨²[L_A]]`, a two-element universe with predicate p true of both elements, and four assignments. It obtains `{∀{x,y}.∨⟨p(x)⟩}` while handling at most two formulas even though bottom's upward closure has 21 formulas and the weakened result has 14.

Lift weakening to an antichain by unioning each `W_L(φ,s)` and minimizing (Section 4.2). Corollary 3 applies this repeatedly to states `s₁,…,sₙ`; Corollary 4 starts from `{⊥_L}` to abstract a state set. Algorithm 1 mutates the antichain: filter formulas not satisfied by s, remove them, weaken them, then insert results in total-order order only if no existing formula subsumes the candidate.

Inference: A Verus invariant synthesizer could weaken candidates against concrete counterexamples if it can evaluate its chosen predicate language on those states. The paper supplies no such Verus integration.

## technique: LSet indexed filters
Inference: Use this when antichains become large. LSet[L] stores canonical formulas and uses recursive indexes for two filters: formulas not satisfied by state s (`R|≠|s`) and formulas subsuming candidate φ (`R|⊑φ`) (Section 5). Define LSet recursively with auxiliary indexes. For binary disjunction, store an LSet of first disjuncts and a map from each first disjunct to an LSet of second disjuncts. For bounded homogeneous disjunction, use a trie whose edges are formula labels; recursively traverse only edges passing the relevant filter. Base languages use straightforward iteration. Appendix C (pp. 31–34) also describes homogeneous conjunction filters that scan stored conjunctions after filtering their shared conjuncts, quantifier filters over assignments or permutations, and integer formula IDs to avoid repeated hashing. LSet can store sets that are not antichains, as needed for its recursive auxiliary indexes.

Inference: A Verus invariant synthesizer could index normalized predicate trees similarly, but the paper supplies no Verus implementation or benchmark.

## technique: symbolic abstraction to strongest invariants
Inference: Use this to compute a language-relative strongest inductive invariant. Input a first-order transition system `(ι,τ)` and bounded language L (Section 6.1). Define `T♯ = α ∘ T ∘ γ`; start with F = L. While F differs from `T♯(F)`, find a counterexample to induction, a state s′ that violates F and is initial or follows from a state satisfying F, and update `F := F ⊔ α({s′})` using Algorithm 1. Restrict SMT counterexample queries to EPR so finite counterexamples and decidability hold.

Section 6.1 (p. 16) explains the consequence: “The strongest inductive invariant is useful for verifying safety properties of the system, or showing that they cannot be proven in L (if the strongest inductive invariant in L cannot prove safety, neither can any other inductive invariant expressible in L).” Appendix E, Algorithm 2 (p. 37), gives the representation-based loop. Appendix F (p. 37) describes separate relative-inductiveness checks for each formula, implication checks against formulas already proved relatively inductive, parallel and incremental SMT queries, and simulation from previous counterexamples.

## evidence, limits, and measurements
All 19 protocol experiments use the same 48-thread/384-GiB machine and 10,800-second cap. Each experiment runs five times unless timeout; reported values are median ± maximum deviation. LSet versus a parallelized naive filter is the controlled comparison. Examples include `ticket`: 32.6 ± 3.3 s with LSet versus 862.2 ± 21.9 s without, with 43 ± 7% versus 97 ± 0% of time in weakening and 2,621 formulas in the final representation for both implementations. `paxos-epr`: 621.5 ± 246.8 s with LSet versus 789.6 ± 285.5 s without, 1 ± 1% versus 11 ± 3% weakening, and 1,438 formulas in the final representation for both implementations. `cache` reaches 106,348 formulas in 4,029.4 ± 220.7 s with LSet, while the naive version times out after about 20,000 formulas; Section 6.3 (p. 19) says LSet solves it “while handling more than ten times the number of formulas.” This compares formulas handled during the run, not the final representation alone. The percentages measure runtime spent weakening, and the deviations are maximum distances from the five-run median (Section 6.3, p. 17).

The method still times out on learning-switch, multi-paxos-epr, fast-paxos-epr, stoppable-paxos-epr, and vertical-paxos-epr. The paper attributes bottlenecks either to SMT counterexample queries or to weakening over very expressive languages and large literal bases. It explicitly says the strongest invariant is language-relative; failure to prove safety in L does not mean the protocol is unsafe, only that the selected domain cannot express a proof.

Inference: Applying the implementation requires trusting its Rust code and the solvers; the mathematical arguments in Appendix B do not establish correctness of the actual Rust implementation. I did not inspect or verify that code. Section 6.2 (p. 17) cautions: “Thus, the inclusion of their results is not intended as a precise comparison to our tool, but as a reference for the difficulty of the invariant inference task of each example, as evidenced by state-of-the-art techniques.” The DuoAI and P-FOL-IC3 times come from their respective papers and reflect different architectures and time limits.

## techniques for the catalog
- bounded first-order language: define a finite syntax with quantifier and Boolean bounds to make invariant search enumerable
- syntactic subsumption and canonicalization: quotient equivalent formulas and retain a minimal antichain
- recursive weakening: replace unsatisfied formulas with minimal subsumed formulas satisfied by a counterexample state
- LSet indexed filters: use recursive maps and tries to prune searches for unsatisfied or subsuming formulas
- symbolic abstract fixpoint: iterate counterexample-guided joins to compute the strongest invariant expressible in the language
