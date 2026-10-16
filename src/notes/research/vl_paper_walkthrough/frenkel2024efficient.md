# Efficient Implementation of an Abstract Domain of Quantified First-Order Formulas
(authored by agents unless marked 🧑)
Tag: `frenkel2024efficient`, [paper](https://doi.org/10.1145/2594291.2594317)

## result and scope
Frenkel et al. make quantified first-order abstract interpretation practical by representing formula sets compactly, weakening formulas against concrete states, and indexing the representation. The abstract domain is sets of formulas interpreted conjunctively. Its abstraction is α(S) = formulas true in every state of S. The paper's central claim is: “We introduce an efficient representation of abstract elements, which eliminates redundancies based on a novel syntactic subsumption relation that under-approximates semantic entailment.”

The implementation computes the least fixpoint of the best abstract transformer, therefore the strongest inductive invariant expressible in a selected bounded language. It is implemented in the Rust verifier Flyvy and evaluated on 19 distributed protocols. The paper reports a Paxos fixpoint represented by 1,438 formulas with ∀*∃*∀* quantification, and Table 1 records five-run median ± maximum deviation except timeouts, which run once, under a 3-hour (10,800-second) limit on a 48-thread, 384-GiB AWS z1d.metal machine.

## technique: bounded languages and syntactic subsumption
Use this when a quantified formula language is too large to enumerate semantically but its syntax can be bounded. Construct a finite language inductively from a finite, variable-permutation-closed base set, then apply binary conjunction/disjunction, bounded homogeneous disjunction, unbounded nonempty conjunction, and existential/universal quantification (Section 3.1). Quantifier and Boolean bounds control precision and finite representation.

Define subsumption recursively over the same constructors (Section 3.2): base formulas subsume themselves or bottom; binary connectives extend pointwise; homogeneous disjunction uses an injective mapping from each left disjunct to a right disjunct it subsumes; homogeneous conjunction maps each right conjunct to a left conjunct; quantifiers permit variable permutations, and the mixed ∃∀ constructor lets universal formulas subsume existential ones. Theorem 1 proves that subsumption is a preorder and that `φ ⊑ ψ` implies semantic entailment `φ |= ψ`.

Inference: For Verus, this can guide invariant-candidate generation over bounded predicates, but Verus specifications are Rust expressions rather than the paper's finite FOL language. Any mapping from a Verus predicate AST to this grammar is an inference.

## technique: canonicalization and antichain representation
Use this to remove equivalent and subsumed candidates before storing them. Canonicalize recursively (Section 3.3): canonicalize subformulas, sort homogeneous sequences by a total order extending subsumption, remove subsumed conjuncts, and choose the least body over quantified-variable permutations. Theorem 2 states that canonicalization is representative and decisive and that subsumption becomes a partial order over canonical formulas.

Represent a formula set F as `R_F = min_⊑ {c(φ) | φ ∈ F}` (Section 3.4): canonicalize every formula, then keep only subsumption-minimal formulas, an antichain. Theorem 3 says this preserves the set's upward closure; for entailment-closed abstractions, the full set is recovered by upward closure. The paper explains the purpose: “The representation combines two forms of redundancy elimination: the use of canonical formulas eliminates redundancies due to subsumption-equivalence, and the use of ⊑L-minimal elements reduces the size of the set by ignoring subsumed formulas.”

Inference: A Verus implementation could canonicalize normalized invariant ASTs and keep an antichain of candidate `ensures` predicates. Verus's logical equivalence is solver-dependent, so the paper's syntactic guarantees do not imply Verus semantic equivalence.

## technique: recursive weaken operator
Use this to join an abstract element with a concrete state without enumerating every formula in its upward closure. Given canonical φ and state s, define `W_L(φ,s)` as minimal canonical formulas subsumed by φ that s satisfies (Section 4.1). If s already satisfies φ, return {φ}. Otherwise recurse by language constructor:

1. Base language: return all satisfied base formulas only when φ is bottom; otherwise return empty.
2. Binary disjunction: weaken either disjunct and rebuild; homogeneous bounded disjunction additionally may append a weakened bottom disjunct if below its bound, then sort and remove subsumed results.
3. Conjunction: weaken every conjunct and combine all resulting pairs; unbounded homogeneous conjunction accumulates all weakened conjuncts and minimizes them.
4. Existential quantifier: try every assignment to the quantified variables, weaken the body, re-quantify, canonicalize, and minimize.
5. Universal quantifier: iteratively weaken the body for every assignment; the mixed quantifier combines existential and universal results.

These are the paper's recursive rules in Theorem 4. Its worked example starts from bottom in `L = ∀{x,y}[∨²[L_A]]`, a two-element universe with predicate p true of both elements, and four assignments. It obtains `{∀{x,y}.⟨p(x)⟩}` while handling at most two formulas even though bottom's upward closure has 21 formulas and the weakened result has 14.

Lift weakening to an antichain by unioning each `W_L(φ,s)` and minimizing (Section 4.2). Corollary 3 applies this repeatedly to states `s₁,…,sₙ`; Corollary 4 starts from `{⊥_L}` to abstract a state set. Algorithm 1 mutates the antichain: filter formulas not satisfied by s, remove them, weaken them, then insert results in total-order order only if no existing formula subsumes the candidate.

Inference: In Verus, this resembles refining an invariant candidate with concrete counterexamples, but Verus's counterexamples and quantifier semantics are solver-specific. The recursive algorithm itself is not a Verus construct.

## technique: LSet indexed filters
Use this when antichains become large. LSet[L] stores canonical formulas and supports two filters without scanning all formulas: formulas not satisfied by state s (`R|≠|s`) and formulas subsuming candidate φ (`R|⊑φ`) (Section 5). Define LSet recursively with auxiliary indexes. For binary disjunction, store an LSet of first disjuncts and a map from each first disjunct to an LSet of second disjuncts. For bounded homogeneous disjunction, use a trie whose edges are formula labels; recursively traverse only edges passing the relevant filter. Base languages use straightforward iteration.

Inference: A Verus invariant synthesizer could index normalized predicate trees similarly, but the paper supplies no Verus implementation or benchmark.

## technique: symbolic abstraction to strongest invariants
Use this to compute a language-relative strongest inductive invariant rather than a property-guided guess. Input a first-order transition system `(ι,τ)` and bounded language L (Section 6.1). Define `T♯ = α ∘ T ∘ γ`; start with F = L. While F differs from `T♯(F)`, find a counterexample to induction, a state s′ that is initial or follows from a state satisfying F, and update `F := F ⊔ α({s′})` using Algorithm 1. Restrict SMT counterexample queries to EPR so finite counterexamples and decidability hold.

The paper's exact invariant claim is: “Any fixpoint of T♯, i.e., a set F ⊆ L such that T♯(F) = F, is an inductive invariant of (ι, τ) ... and the least fixpoint, lfpT♯, is the strongest inductive invariant in L.”

## evidence, limits, and measurements
All 19 protocol experiments use the same 48-thread/384-GiB machine and 10,800-second cap. Each experiment runs five times unless timeout; reported values are median ± maximum deviation. LSet versus a parallelized naive filter is the controlled comparison. Examples include `ticket`: 32.6 ± 3.3 s with LSet versus 862.2 ± 21.9 s without, with 43 ± 7% versus 97 ± 0% of time in weakening and 2,621 versus 1,693 formulas in the final representation. `paxos-epr`: 621.5 ± 246.8 s with LSet versus 789.6 ± 285.5 s without, 1 ± 1% versus 11 ± 3% weakening, and 1,438 versus 1,693 formulas. `cache` reaches 106,348 formulas in 4,029.4 ± 220.7 s with LSet, while the naive version times out after about 20,000 formulas; the paper says this is “more than ten times the number of formulas.” These denominators are runs of the named benchmark under the stated machine and timeout, not a random sample of systems.

The method still times out on learning-switch, multi-paxos-epr, fast-paxos-epr, stoppable-paxos-epr, and vertical-paxos-epr. The paper attributes bottlenecks either to SMT counterexample queries or to weakening over very expressive languages and large literal bases. It explicitly says the strongest invariant is language-relative; failure to prove safety in L does not mean the protocol is unsafe, only that the selected domain cannot express a proof.

Trusted elements include Flyvy's implementation, the SMT solvers for EPR queries, the recursive data structure, and the mathematical proofs in the appendices. The paper does not provide a machine-checked proof of the implementation's Rust code. It also notes that comparison runtimes for DuoAI and P-FOL-IC3 come from different papers, machines, and limits, so they are reference points rather than precise comparisons.

Inference: VL should not redo generic antichain canonicalization, recursive weakening, indexed formula sets, or counterexample-driven abstract interpretation as ideas. The threat to agent-written verified Rust is indirect: a bounded candidate domain can miss a needed invariant, and a buggy translation or solver interface can silently weaken guarantees. A Verus study would need to measure expressiveness, verifier cost, and trusted translation code rather than assume these FOL results transfer.

## techniques for the catalog
- bounded quantified language: define a finite syntax with quantifier and Boolean bounds to make invariant search enumerable
- syntactic subsumption and canonicalization: quotient equivalent formulas and retain a minimal antichain
- recursive weakening: replace unsatisfied formulas with minimal subsumed formulas satisfied by a counterexample state
- LSet indexed filters: use recursive maps and tries to filter unsatisfied or subsuming formulas without full scans
- symbolic abstract fixpoint: iterate counterexample-guided joins to compute the strongest invariant expressible in the language
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
