# Probabilistic Rely-guarantee Calculus
(authored by agents unless marked 🧑)
Tag: `mciver2014probabilistic`, [paper](http://arxiv.org/abs/1409.0582v3)

## scope and result

The paper extends Jones's rely-guarantee reasoning for shared-variable concurrency with probabilistic behavior. Its abstract states: “Jones’ rely-guarantee calculus for shared variable concurrency is extended to include probabilistic behaviours.” The construction combines probabilistic Kleene algebra (pKA) with concurrent Kleene algebra (CKA), interprets programs with bundle event structures with internal probability (ipBES), and derives rely-guarantee rules from that algebraic semantics (abstract, p. 1). The paper's stated use is quantitative: “we show how to obtain bounds on probabilities of correctness by deriving quantitative extensions of rely-guarantee rules” (abstract, p. 1).

Inference: A Verus engineer can use the paper as a design for a probabilistic rely/guarantee layer around a concurrent state-machine model, but the paper's finite-state distributions and algebraic event structures are not a direct Verus library.

The paper proves soundness of its algebra relative to a general probabilistic event-structure semantics and illustrates the rules on a faulty Eratosthenes sieve. Its conclusion says: “The framework developed in this paper has its current limitations. Firstly, neither the algebra nor the event structure model support non-terminating probabilistic concurrent programs at the moment.” (Conclusion, p. 34). It also says the concrete model is restricted to finite state spaces (Conclusion, p. 34).

## technique 1: probabilistic program algebra

What it is. A probabilistic program is a map from a finite state space Ω to sets of probability distributions. Section 3 defines almost-surely terminating programs H¹Ω, orders them by pointwise inclusion, and adds probabilistic choice, nondeterministic choice, sequential composition, tests, and a binary Kleene star. The paper explains: “A (nondeterministic) probabilistic program r modelled as a map of type” (Section 3, p. 7); the displayed type is (r:Ω→2^{DΩ}), where (DΩ) is the set of distributions. Sequential composition uses a distribution produced by the first program and a deterministic program below the second (Eq. (5), p. 8).

When to use it. Use this model when the state space is finite and a component's outcome is a set of possible distributions, combining probability and nondeterminism. Use pKA order (r\sqsubseteq_H r') to express refinement and Kleene star for finite or almost-surely terminating iteration.

How to apply it.
1. Choose finite Ω and represent each atomic action as a set of distributions for each input state (Section 3, pp. 7–8).
2. Represent probabilistic choice (r\oplus_p r') by executing r with probability (1-p) and r' with p (p. 8).
3. Close pointwise unions to obtain nondeterministic choice (p. 8).
4. Compose programs with the paper's convolution-style sequential operation (Eq. (5), p. 8), and use the least fixed point binary star for iteration (p. 8).
5. Use tests as programs for guards and conditionals (p. 9).

Verus form. Inference: represent Ω with a Rust datatype and distributions with finite maps plus `spec fn` predicates for nonnegative mass and total mass one. Represent an action's contract as a state relation plus probability bounds; use `requires`, `ensures`, and proof lemmas to show composition and star obligations. A Verus proof function can establish algebraic facts, but an executable `fn` cannot return a mathematical distribution without implementing one. The paper's nondeterministic sets of distributions and finite-state closure are inference-level encodings; they are not constructs supplied by the paper or by Verus.

Evidence. The paper develops the algebra in Sections 2–3 and then proves semantic soundness through the ipBES interpretation (Theorem 4.13, p. 20; Proposition 4.15, p. 24). There is no implementation benchmark or denominator-based empirical evaluation. The evidence is mathematical: propositions and theorems under the stated finite-state and termination assumptions.

Assumptions and failure. The model assumes finite Ω (Conclusion, p. 34), almost-sure termination in H¹Ω (Section 3, p. 7), and internal probability choices. Nontermination is outside the model (Conclusion, p. 34). Inference: unbounded Rust heaps, continuous distributions, and external random devices need abstractions and additional trusted contracts.

## technique 2: ipBES and schedulers

What it is. An ipBES is a bundle event structure whose events carry atomic probabilistic programs. Definition 4.1 gives a quintuple (E=(E,↦,#,λ,Φ)), with labels (λ:E→H¹Ω), bundle enabling, conflict, and internal probability. A scheduler resolves enabled events, nondeterministic conflicts, and interleavings while observing the current state. The paper states: “Definition 4.2 A scheduler σ on an ipBES E is a map” (Section 4.1, p. 10). Its four properties require enabled-event selection, probability normalization, and forced choice of events whose labels are tests (pp. 10–11).

When to use it. Use an ipBES when concurrency must retain true-event structure rather than flattening everything into an interleaving trace, and when schedulers must resolve nondeterministic choices while preserving probabilistic labels.

How to apply it.
1. Define events, bundle-enabling relation, conflict, labels, and probability information as in Definition 4.1 (p. 9).
2. For each finite trace α and state s, assign scheduler weights (w(e,s)) to enabled events (Definition 4.2, p. 10).
3. Require weights to sum to one over the events selected after α and state s; tests that hold at s must be selected (properties 2–4, pp. 10–11).
4. Build partial computations inductively by applying the labels of the first n events to the initial distribution (Section 4.2, pp. 12–13).
5. Take the limit of partial computations as the complete run and collect the resulting distribution (pp. 13–14).

Verus form. Inference: encode an event structure as a ghost map of event identifiers to labels and predecessor/conflict sets; encode scheduler validity as `requires`/`ensures` predicates that establish enabledness and sum-of-weights invariants. A state-machine proof can maintain that each transition preserves the event-structure invariant. Verus has no native probability measure or scheduler primitive, so finite rational weights and their normalization must be modeled explicitly.

Evidence. Proposition 4.5 proves that every complete run is a probability distribution (p. 14). Theorem 4.13 proves that the simulation order is sound for terminating feasible ipBES (p. 20). These are proof results, not measured performance.

Assumptions and failure. Schedulers may inspect the current state when resolving nondeterminism (p. 10). Feasibility and termination are required (Definitions 4.2 and 4.3, pp. 10–11; Theorem 4.13, p. 20). Inference: a scheduler model that observes secret state can be too powerful for security claims unless observation is restricted.

## technique 3: trace simulation for refinement

What it is. The paper defines t-simulation as a trace mapping preserving labels, probability behavior, and structural constraints (Definition 4.9, p. 18). It writes (E\preceq_{sim}F) when a t-simulation exists. Proposition 4.11 proves this relation is a preorder, and Theorem 4.13 states: “Let E and F be feasible and terminating ipBES. Then E vsim F” under the theorem's simulation premises (p. 20).

When to use it. Use t-simulation to show that a concrete concurrent event structure refines an abstract specification while preserving the probability sets induced by schedulers. It is useful when ordinary sequential inclusion is too weak to describe interference and trace shape.

How to apply it.
1. Define a total trace map (f:T(E)→T(F)) satisfying the three Definition 4.9 clauses (p. 18).
2. Check that mapped traces preserve event labels and the required state/distribution relation.
3. Check the extension and minimal-trace conditions so concurrent events cannot be mapped in a way that invents forbidden ordering (p. 18).
4. Use Proposition 4.12 to compose simulation with `+`, sequential composition, and concurrency (p. 19).
5. Apply Theorem 4.13 to transfer the concrete distribution set below the abstract one (p. 20).

Verus form. Inference: define a ghost `spec fn sim` over finite traces and prove closure lemmas for each transition. Use `ensures` on a proof function to show simulation preservation; represent trace extension with immutable sequences. The event-map and probability-distribution obligations are mathematical ghost state and must be erased or separately implemented.

Evidence. Theorem 4.13 constructs a scheduler on F from one on E and proves the resulting distribution inclusion (pp. 20–22). Proposition 4.15 extends the result to binary Kleene star (p. 24). No experimental denominator applies.

Assumptions and failure. The theorem requires feasible, terminating structures (p. 20). Inference: simulation does not prove that the abstract specification itself expresses the desired safety property; it only proves inclusion under the supplied mapping.

## technique 4: probabilistic rely and guarantee conditions

What it is. A relation (ρ⊆Ω×Ω) is lifted to a probabilistic program r whose distributions assign zero mass outside ρ's successor set. The paper defines this as the convex closure of ρ and proves in Proposition 5.1 that, for transitive ρ, (r·(r+δ)\sqsubseteq_H r) (Section 5, pp. 25–26). It then defines a general rely/guarantee condition: “A probabilistic rely or guarantee condition R is a probabilistic concurrent program such that RkR vsim R.” (Definition 5.3, p. 26).

When to use it. Use the convex closure for a broad relation-level environment assumption. Use an atomic probabilistic program's star (r^*) when interference must preserve atomic probability information.

How to apply it.
1. State the environment relation ρ over program states (Section 5, p. 25).
2. Construct r so every distribution puts zero mass on states not related by ρ (p. 25).
3. Prove ρ transitive, then use Proposition 5.1 to establish closure under repeated environment steps (p. 25).
4. For atomic actions, choose r as the nondeterministic choice of all allowed atomic effects and use (r^*) as rely/guarantee (pp. 26–27).
5. Check Definition 5.3's simulation closure (R\parallel R\preceq_{sim}R) (p. 26).

The paper's concrete example sets (x:=uniform(0,n)) and requires (μ({0,…,n})≥1/(n+1)) (Example 5.2, p. 26). It warns that the convex closure can be too weak because atomicity matters: “In practice, constructing a useful transitive probabilistic rely-guarantee condition is difficult, but the standard technique is still valid: the strongest guarantee condition of a given program is the nondeterministic choice of all atomic actions found in that program.” (Section 5, p. 26).

Verus form. Inference: encode ρ as a `spec fn` over pre/post states and prove each environment transition satisfies it with `ensures`. Encode atomic probability bounds as ghost predicates over a finite distribution representation. A Verus state-machine `invariant` (used as a declaration in the state-machine macro, not a function call) can preserve the rely relation between transitions. Verus does not provide `R\parallel R` or `vsim`; these are to be defined as ghost relations and lemmas.

Evidence. Proposition 5.1 is an algebraic proof. Definition 5.3 and Eq. (18) establish (r^*\parallel r^*\preceq_{sim}r^*) for the event-structure model (p. 26). The assumptions are transitivity, finite-state distributions, and atomicity where claimed.

## technique 5: probabilistic rely-guarantee rules

What it is. A quintuple is valid when (P·(R\parallel E)\sqsubseteq Q) and (E\preceq_{sim}G) (Section 6, p. 27). The paper derives rules for atomic action, conditional, prefixing, concurrent execution, and iteration.

How to apply it.
1. For an atomic statement (r_0), prove (r^*\parallel r_0\preceq_{sim}r^*(r_0·r^*)) (Eq. (19), p. 27).
2. For a conditional (b·E+c·F), prove (r^*\parallel(b·E+c·F)\preceq_{sim}r^*(b·(r^*\parallel E)+c·(r^*\parallel F))) (Eq. (20), p. 28). The guards are assumed atomic and jointly feasible (p. 28).
3. For prefixing, prove (r^*\parallel(r_0·E)\preceq_{sim}r^*(r_0·(r^*\parallel E))) (Eq. (21), p. 28).
4. For two components, establish each component's quintuple and cross-conditions (G\preceq_{sim}R') and (G'\preceq_{sim}R); choose (R'') below both relies; conclude the concurrent quintuple (Rule (22), p. 28).
5. For star-shaped conditions, use Proposition 6.1: intersect the relies and combine guarantees by nondeterministic choice (Eq. (23), p. 29).
6. For a loop, unfold the binary star and repeatedly apply conditional and prefixing rules (p. 29).

Verus form. Inference: write each component's Rust transition function with `requires` for the rely predicate and `ensures` for its guarantee and postcondition. Use proof functions to establish the cross-condition and composition lemmas. Encode loop invariants with `invariant` clauses on `while` loops and prove probability bounds over the finite ghost state. Do not put `ensures` on a `spec fn`; use `ensures` on executable or proof functions, while a `spec fn` itself returns a logical value.

Evidence. The paper says these rules are sound with respect to the event-structure semantics (Section 6, p. 27). Rule (22)'s proof uses Theorem 4.13 and the simulation composition laws (p. 28). Proposition 6.1 is proved by substituting (r^*) and (g^*) into Rule (22) (p. 29). There are no runtime measurements.

Assumptions and failure. Conditional guards must be atomic and jointly cover execution (p. 28). The framework is partial-correctness only because nontermination is unsupported (p. 34). Inference: a Verus implementation must separately prove that the Rust scheduler and synchronization mechanism realize the abstract interleaving operation.

## technique 6: quantitative bounds for the faulty sieve

What it is. The paper verifies a concurrent faulty Eratosthenes sieve. Each thread `thd_i` loops over (j=2,…,n/i), executing `skip ⊕_p remove(i*j from s)`. The action (u_{i,j}) removes (ij) with probability p and leaves the set unchanged with probability (1-p) (Section 7, p. 30). The specification (Q_{i,j}) requires removal probability at least p and forbids additions. The rely r is the convex closure of subset-decreasing states (p. 30).

How to apply it.
1. Define the shared state (s_0={2,…,n}), thread actions (u_{i,j}), and prime target set π (p. 30).
2. Define (O_{i,j}) as states still containing (ij), (Q_{i,j}) as distributions removing it with probability at least p, and (Q_i) as their sequential composition (p. 30).
3. Prove each atomic action satisfies r and use the prefix rule to derive (r^*\parallel thd_i\sqsubseteq Q_i) (pp. 30–31).
4. Apply Proposition 6.1 repeatedly to obtain every (Q_i) for concurrent threads (p. 32).
5. Apply Proposition 7.1 to combine lower bounds: if two runs establish (O_1,O_2) with probabilities (p_1,p_2), their intersection is established with at least (p_1+p_2-1) (p. 32).
6. For n=15, obtain (f(p,15)=p^6+p^4-1), positive when (p≥0.868); the paper gives exact probability (p^{10}+4p^9(1-p)+4p^8(1-p)^2) for this setting (p. 33).
7. Refine the bound using commutation and invariants; for n=15 the paper obtains (g(p,15)=p^8) (p. 33).
8. Strengthen the guarantee so no thread removes a prime; otherwise the abstract intersection also allows the empty set (p. 34).

The paper's quantitative rule is explicit: “Modularity of finite measures implies that µ(O1 ∩O2 )+µ(O1 ∪O2 ) = µ(O1 )+µ(O2 ) ≥ p1 +p2 .” (Proposition 7.1 proof, p. 32). The general bound is (f(p,n)=Σ_{i=2}^{√n}p^{n/i-1}-(√n-2)) (p. 33). The denominator is not a sample count: these are symbolic probability bounds over all distributions in the semantics. The n=15 threshold 0.868 is the p value where the symbolic lower bound becomes positive, not an empirical confidence interval.

Verus form. Inference: model `s` as a finite set (for example, a Boolean array indexed 0..n), and model each `u_i_j` as a state transition with a ghost probability outcome. Use loop invariants to preserve “no prime is removed” and subset monotonicity, then prove a distribution-combination lemma corresponding to (p_1+p_2-1). A concrete random generator would require an additional contract connecting sampled outcomes to the abstract probabilities.

Evidence. The evidence is a symbolic derivation, not a test run. For n=15, the paper compares the lower bounds (f), (g), and the exact polynomial in Figure 3 (p. 34), but it gives no measured sample denominator. The framework's correctness rests on the soundness theorems and the stated finite-state semantics.

Assumptions and failure. The initial set, integer division, finite state space, independent-looking per-action probability abstraction, and atomic action interpretation are part of the model (Section 7, pp. 30–34). The first bound can be poor; the paper says it “sometimes provides a bad lower-approximation” (p. 33). Inference: the bound can be too weak for product decisions unless domain invariants such as commutation are proved.

## what is proved, trusted, and already done

The paper proves algebraic soundness of its ipBES semantics, simulation-based refinement, rely-guarantee rules, and symbolic probability lower bounds. It does not prove a Rust implementation, a real random-number generator, a scheduler implementation, or nontermination properties. Trusted elements include the finite-state distribution model, the event-structure semantics, the algebraic axioms, and the interpretation of atomic probabilistic actions. Inference: a Verus product would additionally trust the Verus verifier and solver, proof erasure and compiler, random source, and contracts for external code; this follows the trust boundaries documented for Verus rather than from this paper.

The paper already supplies compositional rely-guarantee rules, scheduler-based event semantics, a quantitative intersection rule, and a worked concurrent sieve. VL should not redo those as if they were new techniques. Inference: a product contribution would need to connect these ideas to executable Rust/Verus state machines, expose proof obligations to users, and validate the connection between concrete randomness and abstract distributions.

Threat to agent-written verified Rust. Inference: medium to high for concurrent probabilistic components. An agent that emits only local functional contracts can miss environment interference and probability aggregation; the paper shows that atomicity, rely closure, and cross-component guarantees are central. The threat is lower for deterministic finite-state code, where ordinary Verus contracts cover more directly, and higher when a product uses shared mutable state, scheduling, or random choices.

Contradictions and numerical checks. The text's general bound subtracts (√n-2) after summing (√n-1) terms (p. 33), which matches the repeated (p_1+p_2-1) combination. For n=15, (√n) is integer-truncated to 3, so only i=2 and i=3 are used; the paper states (f(p,15)=p^6+p^4-1), and the exponents agree with (15/2-1=6) and (15/3-1=4). The 0.868 threshold belongs to this symbolic polynomial, while the exact polynomial is separately stated for the same n=15 setting (p. 33); it is not a measured percentage.

## techniques for the catalog

- probabilistic Kleene algebra — model finite-state probabilistic and nondeterministic programs with composition, tests, and iteration

- ipBES scheduler semantics — represent true concurrency with probabilistically labeled events and state-aware schedulers

- t-simulation refinement — map concrete event traces to abstract traces and transfer distribution inclusion

- probabilistic rely/guarantee closure — lift state relations to convex probabilistic programs and require simulation-closed environments

- probabilistic rely-guarantee rules — distribute rely conditions through atomic actions, branches, prefixes, loops, and concurrent composition

- quantitative intersection bound — combine component probability guarantees using the finite-measure lower bound (p_1+p_2-1)

- faulty-sieve invariant refinement — improve generic probability bounds with atomicity, commutation, and “never remove primes” invariants

Checked 2026-10-15 against the paper by a Codex agent for probabilistic_rely_guarantee_calculus_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
