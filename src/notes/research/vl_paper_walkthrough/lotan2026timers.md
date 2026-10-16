# Verifying First-Order Temporal Properties of Infinite-State Systems via Timers and Rankings
(authored by agents unless marked 🧑)
Tag: `lotan2026timers`, [paper](https://www.semanticscholar.org/paper/d96d54d3edb7c0936a6b34848ed76a2355cf5555)

## scope and result

The paper gives a deductive reduction from arbitrary first-order linear temporal logic (FO-LTL) properties to termination. Its abstract states: “We present a unified deductive verification framework for first-order temporal properties based on well-founded rankings, where verification conditions are discharged using SMT solvers” (abstract, PDF p. 1). The construction augments a transition system with prophecy timers for temporal subformulas, then proves a well-founded ranking decreases. The reduction is claimed sound and complete (section 4.2, PDF p. 9), but the proof remains semi-automatic: users provide rankings, invariants, and sometimes finite approximations.

## technique: timer transition system and temporal-to-termination reduction

Use this when a liveness or safety property is temporal but the verifier has termination machinery.

1. For property φ, collect every subformula and, for each □ψ, also ¬ψ; introduce a timer function tψ for each collected formula (section 4.1, PDF p. 7)
2. Give the timer sort intended semantics N ∪ {∞}, with 0, ∞, ≤, and predecessor −1 (section 4.1, PDF p. 7)
3. Constrain timer zero to correspond to the current satisfaction of ψ; positive finite timers decrement each transition; ∞ remains ∞; define the transition clauses ηψ from the temporal operator (Definition 1, PDF p. 7)
4. Set the initial timer for φ to zero, so every timer-system trace satisfies φ (section 4.1, PDF p. 7)
5. Build the product of the original system T(S) with the timer system for ¬φ. The product contains exactly original traces satisfying ¬φ; prove that product terminates (section 4.2, PDF pp. 9–10)

The central semantic invariant is stated as: “for any ψ ∈ A(φ), timers evaluated to 0 capture the satisfaction of the corresponding temporal formula” (Lemma 1, PDF p. 8). The paper's theorem is explicit: “T (S) |= φ if and only if T (S) × T¬φ (Stime ) terminates” (Theorem 1, PDF p. 9). For a running scheduling example, the timer for ♢sched(x) is finite and repeatedly decreases to zero, forcing infinitely many scheduling points (Example 1, PDF p. 8).

Inference: Verus has no native FO-LTL or prophecy-timer sort. A practical adapter can encode a bounded timer as a Rust integer or ghost state, use `requires`/`ensures` for transition contracts, and prove termination with `decreases` on a well-founded integer measure. For an unbounded temporal proof, the timer semantics and product transition system remain ghost specification machinery; executable Rust need not carry timers. The reduction's completeness does not transfer automatically to Verus because the encoding and temporal semantics must themselves be proved.

## technique: implicit rankings with explicit soundness conditions

Use this when a ranking function is conceptually clear but hard to define directly in first-order logic. A closed implicit ranking is a formula over pre-state and post-state symbols that implies strict decrease of some hidden ranking function. The paper permits a soundness condition C, requiring well-foundedness only on the reachable image (section 5.1, PDF pp. 10–11). The termination rule is: “If every reachable state s of T (S) satisfies s ∈ C and every reachable transition (s, s′ ) of T (S) satisfies s, s′ |= τ> then T (S) terminates” (Theorem 2, PDF p. 11).

1. Choose a relation and term whose decrease is expressible, without defining the ranking function itself (section 5.1, PDF p. 10)
2. State τ> for strict decrease, τ≥ for weak conservation, and κmin for minimal elements; attach C for well-foundedness or finiteness (Definition 3, PDF p. 11)
3. Prove an inductive invariant θ: initial states imply θ, transitions preserve θ, and θ plus a transition implies τ> (section 5.3, PDF p. 14)
4. Separately establish C using intended finite semantics or a first-order sufficient condition (section 5.3, PDF pp. 14–15)

Inference: in Verus, encode an explicit ranking as a ghost `spec fn` or a proof-level relation and put its decrease in a `decreases` clause or lemma postcondition. Use `invariant` clauses on loops and `proof fn` lemmas for the three invariant obligations. Keep non-first-order assumptions as explicit preconditions or trusted axioms; Verus cannot silently justify well-foundedness of arbitrary user relations. Verus's `decreases` checks executable recursion/loops, whereas the paper's implicit ranking can describe a hidden function over transition-system structures.

## technique: ranking constructors and timer composition

The paper supplies compositional constructors. The position constructor uses a strict partial order ℓ and term t, with strict formula `order(ℓ) ∧ ℓ(t′, t)` and minimality `∀y.¬ℓ(y,t)` (Constructor 1, PDF p. 12). The conditional constructor ranks states under a predicate α and makes states failing α minimal (Constructor 2, PDF p. 12). Domain-pointwise aggregation combines parameterized rankings over all domain elements, requiring finitely many non-minimal elements (Constructor 3, PDF p. 13). Domain-lexicographic aggregation uses a well-founded index relation and reverse lexicographic order; the paper warns standard lexicographic order on infinite sequences is not well-founded (Constructor 4, PDF pp. 13–14). The shorthand `TimerRank(ψ(x), α(x))` combines a timer position, condition, and domain aggregation (Example 4, PDF p. 13).

Inference: Verus can model the position and conditional cases with ghost measures and nested `decreases` tuples, and model pointwise aggregation with a finite collection plus an invariant bounding active elements. Infinite-domain aggregation and reverse lexicographic well-foundedness require a separate mathematical lemma; they do not arise from merely writing a tuple in Verus.

## technique: inductively finite over-approximation

Use this when C requires a set to be finite but the underlying sort is infinite. Choose β over-approximating α. Prove (i) α implies β under θ, (ii) initially β contains at most one witness for each parameter, and (iii) each transition preserves that bounded-growth property (section 5.3, PDF p. 15). The paper explains the induction principle: “if there is m ∈ N such that initially there are at most m elements in B and any transition adds at most m elements to B then by induction, B is finite” (section 5.3, PDF p. 15). Example 6 uses β(x)=¬idle(x) to show only finitely many served threads (PDF p. 15).

Inference: in Verus, represent β as a ghost predicate and prove its initial and transition preservation with `requires`, `ensures`, and `invariant`; state the finite bound explicitly. A mathematical finiteness argument is still needed for the ranking's well-foundedness.

## implementation, evidence, and limits

The tool takes a first-order transition system, FO-LTL property, composed implicit ranking, inductive invariant, and optional finite approximations; it generates the timer reduction and verification conditions and discharges them with Z3 (section 6, PDF p. 16). Timers are encoded as interpreted integers, with ∞ represented by −1; quantifier hints and timer-free invariant checks are optimizations (section 6, PDF p. 16). Evaluation uses a MacBook Pro Apple M1 Pro and Z3 4.13.3 (section 6, PDF p. 16). Table 2 reports seconds per example: Ticket 2, Paxos 101, ABP 4, HRB-Correct 135, HRB-Relay 56, Ackermann 0.8, LexArray 0.08, TimestampedQueue 0.5, CascadingQueue 1.2, ReorderingQueue 2.3, MutexRing 0.5, LeaderRing 0.3, ToyStabilization 0.3, Dijkstra k-State 64.8, BinaryCounter 0.02, SAT-Backtrack 0.3, and SAT-CDCL 5.3 (Table 2, PDF p. 16). These are one reported run per example; the table gives no repeated-run denominator or confidence interval. Proof inputs are user-provided rankings and invariants, so Z3 validates supplied obligations rather than discovering all ranking arguments.

The paper contrasts its proofs with liveness-to-safety proofs: for shared examples, its proofs avoid a monitored copy and finite abstraction, and are often shorter (section 6, PDF p. 17). Existing liveness-to-safety methods and their abstractions are work VL should not redo as the same idea. The paper does not prove that a Verus implementation correctly realizes its FO-LTL model, nor that the chosen invariants are complete.

Inference: threat to a product producing agent-written verified Rust is moderate to high for liveness claims. Timers plus rankings give VL a principled way to turn temporal requirements into termination obligations, but the hard parts—ranking choice, invariant discovery, finite-set assumptions, and semantic correspondence—remain trusted human or synthesis inputs. VL should reuse timer/ranking decomposition and SMT-style obligation generation; it must add Rust ownership, panic, integer-overflow, and executable-state correspondence checks.

## techniques for the catalog

- prophecy timer reduction — augment a transition system with subformula timers and reduce FO-LTL satisfaction to termination of the negated-property product
- implicit ranking — specify decrease relationally without defining the ranking function, with an explicit soundness condition
- ranking constructors — compose position, conditional, pointwise, and reverse-lexicographic rankings
- inductive invariant validation — discharge initial, preservation, and decrease verification conditions with SMT
- inductively finite approximation — prove finiteness in infinite domains using a bounded-growth over-approximation
- timer-aware termination — use decreasing prophecy timers as components of a well-founded ranking

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
