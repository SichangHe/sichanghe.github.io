# Probabilistic Rely-guarantee Calculus
(authored by agents unless marked 🧑)
Tag: `mciver2014probabilistic`, [paper](http://arxiv.org/abs/1409.0582v3)

## scope and result

The paper extends Jones's rely-guarantee reasoning for shared-variable concurrency with probabilistic behavior. Its abstract states: “Jones’ rely-guarantee calculus for shared variable concurrency is extended to include probabilistic behaviours.” The construction combines probabilistic Kleene algebra (pKA) with concurrent Kleene algebra (CKA) (abstract, p. 1), interprets programs with bundle event structures with internal probability (ipBES, Definition 4.1, p. 8), and derives rely-guarantee rules from that algebraic semantics. The paper's stated use is quantitative: “we show how to obtain bounds on probabilities of correctness by deriving quantitative extensions of rely-guarantee rules” (abstract, p. 1).

Inference: A Verus engineer can use the paper as a design for a probabilistic rely/guarantee layer around a concurrent state-machine model, but the paper's finite-state distributions and algebraic event structures are not a direct Verus library.

The paper proves soundness of its algebra relative to a general probabilistic event-structure semantics and illustrates the rules on a faulty Eratosthenes sieve. Its conclusion says: “The framework developed in this paper has its current limitations. Firstly, neither the algebra nor the event structure model support non-terminating probabilistic concurrent programs at the moment.” (Conclusion, p. 35). It also says that “the concrete model is restricted to programs with finite state spaces” (Conclusion, p. 35).

## technique 1: probabilistic program algebra

What it is. A probabilistic program is a map from a finite state space Ω to non-empty, topologically closed, convex sets of probability distributions (Section 3, pp. 5-6). Section 3 defines the programs that terminate almost certainly, H1Ω, orders them by pointwise inclusion (⊑H), and adds probabilistic choice (Eq. (3)), nondeterministic choice (Eq. (4)), sequential composition (Eq. (5)), tests, and a binary Kleene star (pp. 6-7). The paper explains: “A (nondeterministic) probabilistic program r modelled as a map of type Ω→PDΩ such that r(s) is a non-empty, topologically closed and convex subset of DΩ for every state s∈Ω.” (Section 3, pp. 5-6), where DΩ is the set of distributions over Ω and PDΩ its power set. Sequential composition takes a distribution µ from the first program and a deterministic program f below the second, and forms f⋆µ (Eq. (5), p. 6).

When to use it. Inference: use this model when the state space is finite and a component's outcome is a set of possible distributions, combining probability and nondeterminism. Use the order ⊑H to express refinement and the Kleene star for iteration that terminates almost surely.

How to apply it.
1. Choose a finite Ω and represent each atomic action as a set of distributions for each input state (Section 3, pp. 5-6).
2. Represent probabilistic choice r ⊕p r' by executing r with probability 1-p and r' with probability p (Eq. (3), p. 6).
3. Obtain nondeterministic choice as the union over p in [0,1] of the probabilistic choices (Eq. (4), p. 6); the paper adds that it is "the pointwise union followed by the necessary closure properties" (p. 29).
4. Compose programs with the sequential operation of Eq. (5) (p. 6), and use the least fixed point of f(X) = r' + r·X for the binary Kleene star r∗r' (p. 6).
5. Model guards and conditionals with tests, maps b with b(s) ⊆ {δs}; an if statement is b·r + (¬b)·r' (p. 7).

Verus form. Inference: represent Ω with a Rust datatype and distributions with finite maps plus `spec fn` predicates for nonnegative mass and total mass one. Represent an action's contract as a state relation plus probability bounds; use `requires`, `ensures`, and proof lemmas to show composition and star obligations. A Verus proof function can establish algebraic facts, but an executable `fn` cannot return a mathematical distribution without implementing one. Encoding nondeterministic sets of distributions and their closure in Verus is the study's own design choice, not something the paper or Verus supplies.

Evidence. The paper develops the algebra in Sections 2-3 and then proves semantic soundness through the ipBES interpretation (Theorem 4.13, p. 18; Proposition 4.8, p. 14; Proposition 4.15, p. 22). There is no implementation benchmark or denominator-based empirical evaluation. The evidence is mathematical: propositions and theorems under the stated finite-state and termination assumptions.

Assumptions and failure. The model assumes finite Ω (Section 3, p. 5; Conclusion, p. 35), almost-sure termination in H1Ω (Section 3, p. 6: “we only model nondeterministic programs that are terminating with probability 1”), and internal probability choices (Section 6, p. 29: “probabilities are internal”). Nontermination is outside the model (Conclusion, p. 35). Inference: unbounded Rust heaps, continuous distributions, and external random devices need abstractions and additional trusted contracts.

## technique 2: ipBES and schedulers

What it is. An ipBES is a bundle event structure whose events carry atomic probabilistic programs. Definition 4.1 gives a quintuple E = (E, ↦, #, λ, Φ), with labels λ:E→H1Ω, a bundle relation, an irreflexive symmetric conflict relation #, and a set Φ of final events (p. 8). A scheduler resolves enabled events, conflicts, and interleavings while observing the current state. The paper states: “Definition 4.2 A scheduler σ on an ipBES E is a map” σ:T→[(E×Ω)+D≤1Ω] (Section 4.1, p. 9). Its four properties constrain the domain to events enabled after the trace α, require the scheduler to pick a weight function w and a distribution from the label, require the weights to sum to 1 for each state, and force weight 0 on events whose labels evaluate to the empty set at the current state (pp. 9-10).

When to use it. Inference: use an ipBES when concurrency must retain true-event structure rather than flattening everything into an interleaving trace, and when schedulers must resolve nondeterministic choices while preserving probabilistic labels.

How to apply it.
1. Define events, bundle relation, conflict, labels, and final events as in Definition 4.1 (p. 8).
2. For each finite trace α and state s, assign scheduler weights w(e,s) to enabled events (Definition 4.2, p. 9).
3. Require weights to sum to one over the events enabled after α for each state s; events whose label is empty at s (such as a false test) get weight 0 (properties 3 and 4, p. 9; discussion pp. 9-10).
4. Build partial computations ϕn inductively: ϕ0(∅)=δs and ϕn+1(αe)(s) = Σt [σ(α)(e,t)(s)]ϕn(α)(t) (Section 4.2, pp. 10-11).
5. Take the limit of the partial computations as the complete run ϕ and define the sequential behaviour σs(E) as the sum of ϕ(α) over maximal traces (p. 11). The semantic bracket [[E]](s) is the closed convex hull of the σs(E) for schedulers in Sched1(E), schedulers that give a distribution (p. 12).

Verus form. Inference: encode an event structure as a ghost map of event identifiers to labels and predecessor/conflict sets; encode scheduler validity as `requires`/`ensures` predicates that establish enabledness and sum-of-weights invariants. A state-machine proof can maintain that each transition preserves the event-structure invariant. Verus has no native probability measure or scheduler primitive, so finite rational weights and their normalization must be modeled explicitly.

Evidence. Proposition 4.5 proves that σs(E) is a subdistribution for every scheduler and initial state (p. 11). Theorem 4.13 proves that the simulation order implies the sequential order for feasible, terminating ipBES (p. 18). These are proof results, not measured performance.

Assumptions and failure. Schedulers may inspect the current state when resolving nondeterminism (p. 9: “the scheduler has access to the current program state”). Feasibility (Definition 4.3, p. 10) and termination are required for the semantics and for Theorem 4.13 (p. 18); feasibility means an "if clause" always needs a corresponding "else clause" (p. 10). Inference: a scheduler model that observes secret state can be too powerful for security claims unless observation is restricted.

## technique 3: trace simulation for refinement

What it is. The paper defines t-simulation as a total function f:T(E)→T(F) on traces with f(∅)=∅, finite preimages, and a step condition: each event either is mapped to no new event (stuttering, with its label refining δ) or to an event e' of F whose label it refines, and maximal traces map to weakly maximal traces (Definition 4.9, p. 16). It writes E ⊑sim F when a t-simulation exists. Proposition 4.11 proves this relation is a preorder (p. 17), and Theorem 4.13 states: “Let E and F be feasible and terminating ipBES. Then E vsim F implies E v F.” (p. 18).

When to use it. Inference: use t-simulation to show that a concrete concurrent event structure refines an abstract specification while transferring the distribution sets induced by schedulers. The paper motivates it because the sequential order is not a congruence: there exist E, F, G with E ⊑ F but not E∥G ⊑ F∥G (Section 4.4, p. 15).

How to apply it.
1. Define a total trace map f:T(E)→T(F) satisfying the Definition 4.9 clauses (p. 16).
2. Check the step clause: each extension αe either leaves the image unchanged with label refining δ, or extends it by an event e' with λ(e) ⊑H λ(e') (p. 16).
3. Check the maximality clause: if αe is maximal then f(αe) is weakly maximal in T(F); the finiteness of f⁻¹(β) rules out refining a terminating specification by a diverging implementation (p. 16).
4. Use Proposition 4.12 to compose simulation with +, sequential composition, and concurrency, including E ⊑sim F ⇒ E∥G ⊑sim F∥G (Eqs. (9)-(11), p. 17).
5. Apply Theorem 4.13 to transfer the sequential behaviours of the concrete structure into those of the abstract one (p. 18).

Verus form. Inference: define a ghost `spec fn sim` over finite traces and prove closure lemmas for each transition. Use `ensures` on a proof function to show simulation preservation; represent trace extension with immutable sequences. The event-map and probability-distribution obligations are mathematical ghost state and must be erased or separately implemented.

Evidence. Theorem 4.13's proof constructs a scheduler τ on F from a scheduler σ on E and shows σs(E) = τs(F) (pp. 18-22). Proposition 4.15 extends the result to binary Kleene star (p. 22). No experimental denominator applies.

Assumptions and failure. The theorem requires feasible, terminating structures (p. 18). Inference: simulation does not prove that the abstract specification itself expresses the desired safety property; it only proves inclusion under the supplied mapping.

## technique 4: probabilistic rely and guarantee conditions

What it is. A relation ρ⊆Ω×Ω is lifted to a probabilistic program r with r(s) = {µ | µ({s' | (s,s')∉ρ}) = 0}, so that distributions assign zero mass outside ρ's successor set. The paper says this r is the convex closure of ρ and proves in Proposition 5.1 that, for transitive ρ, r·(r+δ) ⊑H r (Section 5, pp. 25-26). It then defines a general rely/guarantee condition: “A probabilistic rely or guarantee condition R is a probabilistic concurrent program such that RkR vsim R.” (Definition 5.3, p. 26).

When to use it. Inference: use the convex closure for a broad relation-level environment assumption. Use an atomic probabilistic program's star r∗ when interference must preserve atomic probability information. The paper notes that the convex closure "sometimes provides a very general rely condition that is too weak to be useful in the probabilistic case" (p. 26).

How to apply it.
1. State the environment relation ρ over program states (Section 5, p. 25).
2. Construct r so every distribution puts zero mass on states not related by ρ (p. 25).
3. Prove ρ transitive, then use Proposition 5.1 to get r·(r+δ) ⊑H r (p. 25); the sieve then derives r∗ = δ+r from the right induction law of pKA (p. 31).
4. For atomic actions, take r as the nondeterministic choice of all atomic actions in the program (the paper's "strongest guarantee condition", p. 26) and use r∗ as the rely/guarantee condition (pp. 26-27).
5. Check Definition 5.3's simulation closure R∥R ⊑sim R (p. 26).

The paper's concrete example sets x:=uniform(0,n) and gives the guarantee r(s) = {µ | µ({0, n}) ≥ 1/(n+1)} (Example 5.2, p. 26); the paper's text says it "establish[es] a state in {0, n} with probability at least 1/(n+1)" and calls r "an overspecification of x:=uniform(0, x)". Its general advice is: “In practice, constructing a useful transitive probabilistic rely-guarantee condition is difficult, but the standard technique is still valid: the strongest guarantee condition of a given program is the nondeterministic choice of all atomic actions found in that program.” (Section 5, p. 26).

Verus form. Inference: encode ρ as a `spec fn` over pre/post states and prove each environment transition satisfies it with `ensures`. Encode atomic probability bounds as ghost predicates over a finite distribution representation. A Verus state-machine `invariant` (used as a declaration in the state-machine macro, not a function call) can preserve the rely relation between transitions. Verus does not provide R∥R or ⊑sim; these are to be defined as ghost relations and lemmas.

Evidence. Proposition 5.1 is an algebraic proof (pp. 25-26). Definition 5.3 (p. 26) and Eq. (18) (p. 27), which follows from Eq. (13) of Proposition 4.16 (p. 23), establish r∗∥r∗ ⊑sim r∗ for the event-structure model. The assumptions are transitivity, finite-state distributions, and atomicity where claimed.

## technique 5: probabilistic rely-guarantee rules

What it is. A quintuple is valid when P·(R∥E) ⊑ Q and E ⊑sim G (Section 6, p. 27). The paper gives rules for atomic action, conditional, prefixing, concurrent execution, and iteration.

How to apply it.
1. For an atomic statement r0, prove r∗∥r0 ⊑sim r∗(r0·r∗) (Eq. (19), p. 28).
2. For a conditional b·E+c·F, prove r∗∥(b·E+c·F) ⊑sim r∗(b·(r∗∥E)+c·(r∗∥F)) (Eq. (20), p. 28). The tests b and c are assumed atomic and their disjunction is always true, which is needed for feasibility (p. 28).
3. For prefixing, prove r∗∥(r0·E) ⊑sim r∗(r0·(r∗∥E)) (Eq. (21), p. 28).
4. For two components, establish each component's quintuple and the cross-conditions G ⊑sim R' and G' ⊑sim R; choose R'' with R'' ⊑sim R and R'' ⊑sim R'; conclude {P R''} E∥E' {G∥G' Q} (Rule (22), p. 28).
5. For star-shaped conditions, use Proposition 6.1: intersect the relies and combine guarantees by nondeterministic choice (Eq. (23), p. 29).
6. For a loop, unfold the binary star and apply the conditional and prefix rules (p. 29); the paper writes r∗∥((b·E)∗c) ⊑sim r∗(c·r∗ + b·(r∗∥[E·(b·E∗c)])) (p. 29).

Verus form. Inference: write each component's Rust transition function with `requires` for the rely predicate and `ensures` for its guarantee and postcondition. Use proof functions to establish the cross-condition and composition lemmas. Encode loop invariants with `invariant` clauses on `while` loops and prove probability bounds over the finite ghost state. Do not put `ensures` on a `spec fn`; use `ensures` on executable or proof functions, while a `spec fn` itself returns a logical value.

Evidence. The paper says: “These rules are sound with respect to the event structure semantics of Section 4.” (Section 6, p. 27). Rule (22)'s proof uses Theorem 4.13 and the simulation composition laws, Eqs. (7), (10), (11) (p. 28). Proposition 6.1 is proved by substituting r∗ and g∗ into Rule (22) (p. 29). There are no runtime measurements.

Assumptions and failure. Conditional guards must be atomic with an always-true disjunction (p. 28). The framework is partial-correctness only because nontermination is unsupported (Conclusion, p. 35: “can only be applied in a partial correctness setting”). Inference: a Verus implementation must separately prove that the Rust scheduler and synchronization mechanism realize the abstract interleaving operation.

## technique 6: quantitative bounds for the faulty sieve

What it is. The paper verifies a concurrent faulty Eratosthenes sieve. Each thread thd_i, for 2 ≤ i ≤ √n, loops over j=2,…,n/i, executing `skip ⊕_p remove(i*j from s)`. The action u_{i,j} is defined by u_{i,j}(s) = (1-p)δs + pδ_{s\{ij}}: it removes ij with probability p and leaves the set unchanged with probability 1-p (Section 7, p. 30). The specification Q_{i,j} requires µ(O_{i,j}) ≥ p and µ({s' | s'⊆s}) = 1, that is, removal with probability at least p and nothing added. The rely r is the program with r(s) the convex closure of {δs' | s'⊆s} (p. 30).

How to apply it.
1. Define the shared state s0 = {2,…,n}, thread actions u_{i,j}, and prime target set π (p. 30).
2. Define O_{i,j} as states not containing ij, Q_{i,j} as above, and Q_i = Q_{i,2}·Q_{i,3}·…·Q_{i,n/i} (p. 30).
3. Show thd_i ⊑sim r∗ and use the atomic and prefix rules (19) and (21) to derive r∗∥thd_i ⊑ Q_i (pp. 30-31).
4. Apply Rule (23) √n-1 times to obtain every Q_j for the concurrent threads (p. 32).
5. Apply Proposition 7.1 to combine lower bounds: if two runs establish O_1 and O_2 with probabilities p_1 and p_2, their intersection is established with probability at least p_1+p_2-1 (p. 32).
6. For n=15, obtain f(p,15) = p^6+p^4-1, positive when p ≥ 0.868; the paper gives the exact probability p^10+4p^9(1-p)+4p^8(1-p)^2 for this setting (p. 33).
7. Refine the bound using commutation of the actions u_{i,j} and the invariance of O_i; for n=15 the paper obtains g(p,15) = p^8 (p. 33).
8. Use a stronger guarantee, that u_{i,j} never removes i, since otherwise the intersection of the O_i also contains the empty set (p. 34).

The paper's quantitative rule is explicit: “Modularity of finite measures implies that µ(O1 ∩O2 )+µ(O1 ∪O2 ) = µ(O1 )+µ(O2 ) ≥ p1 +p2 .” (Proposition 7.1 proof, p. 32). The general bound is f(p,n) = Σ_{i=2}^{√n} p^{n/i-1} - (√n-2) (p. 33). The denominator is not a sample count: these are symbolic probability bounds over all distributions in the semantics. The n=15 threshold 0.868 is the p value from which the symbolic lower bound f(p,15) is positive, not an empirical confidence interval.

Verus form. Inference: model `s` as a finite set (for example, a Boolean array indexed 0..n), and model each `u_i_j` as a state transition with a ghost probability outcome. Use loop invariants to preserve that no prime is removed and subset monotonicity, then prove a distribution-combination lemma corresponding to p_1+p_2-1. A concrete random generator would require an additional contract connecting sampled outcomes to the abstract probabilities.

Evidence. The evidence is a symbolic derivation, not a test run. For n=15, the paper compares the lower bounds f and g and the exact polynomial in Figure 3 (p. 34), but it gives no measured sample denominator. The framework's correctness rests on the soundness theorems and the stated finite-state semantics.

Assumptions and failure. The initial set, integer division (√n computed without decimals), finite state space, and atomic action interpretation are part of the model (Section 7, pp. 30-34). The first bound can be poor; the paper says f(p,n) “sometimes provides a bad lower-approximation” (p. 33). Inference: the bound can be too weak for product decisions unless domain invariants such as commutation are proved.

## what is proved, trusted, and already done

The paper proves algebraic soundness of its ipBES semantics, simulation-based refinement, rely-guarantee rules, and symbolic probability lower bounds. It does not prove a Rust implementation, a real random-number generator, a scheduler implementation, or nontermination properties. Inference: trusted elements include the finite-state distribution model, the event-structure semantics, the algebraic axioms, and the interpretation of atomic probabilistic actions. Inference: a Verus product would additionally trust the Verus verifier and solver, proof erasure and compiler, random source, and contracts for external code; this follows the trust boundaries documented for Verus rather than from this paper.

Threat to agent-written verified Rust. Inference: medium to high for concurrent probabilistic components. An agent that emits only local functional contracts can miss environment interference and probability aggregation; the paper shows that atomicity, rely closure, and cross-component guarantees are central. The threat is lower for deterministic finite-state code, where ordinary Verus contracts cover more directly, and higher when a product uses shared mutable state, scheduling, or random choices.

Contradictions and numerical checks. The general bound subtracts √n-2 after summing √n-1 terms (p. 33), which matches the repeated p_1+p_2-1 combination. For n=15, √n is integer-truncated to 3, so only i=2 and i=3 are used; the paper states f(p,15) = p^6+p^4-1, and the exponents agree with 15/2-1=6 and 15/3-1=4 (integer division). The 0.868 threshold belongs to this symbolic polynomial, while the exact polynomial is separately stated for the same n=15 setting (p. 33); it is not a measured percentage. Inference: the paper's Example 5.2 writes µ({0, n}) ≥ 1/(n+1), which looks like a possible typo for a bound on each value in {0,…,n}; the study reports the text as written.

## techniques for the catalog

- probabilistic Kleene algebra — model finite-state probabilistic and nondeterministic programs with composition, tests, and iteration

- ipBES scheduler semantics — represent true concurrency with probabilistically labeled events and state-aware schedulers

- t-simulation refinement — map concrete event traces to abstract traces and transfer distribution inclusion

- probabilistic rely/guarantee closure — lift state relations to convex probabilistic programs and require simulation-closed environments

- probabilistic rely-guarantee rules — distribute rely conditions through atomic actions, branches, prefixes, loops, and concurrent composition

- quantitative intersection bound — combine component probability guarantees using the finite-measure lower bound p_1+p_2-1

- faulty-sieve invariant refinement — improve generic probability bounds with commutation and never-remove-primes invariants
