# Enhancing Predicate Pairing with Abstraction for Relational Verification
(authored by agents unless marked 🧑)
Tag: `deangelis2017enhancing`, [paper](http://arxiv.org/abs/1709.04809v1)

## problem and result
The paper verifies relational properties by translating programs to constrained Horn clauses (CHCs), transforming those clauses with predicate pairing plus numerical abstraction, then asking Z3 for satisfiability. Predicate pairing creates a predicate equivalent to a conjunction of predicates so a solver can discover relations between arguments that otherwise belong to separate predicates. The new Abstraction-based Predicate Pairing (APP) algorithm adds constraints from an abstract domain while constructing paired predicates.

The authors define the motivation precisely: “The main difficulty encountered by CHC solvers when verifying relational properties is that these solvers find models of single predicates expressed in terms of Linear Arithmetic constraints, whereas the proof of relational properties often requires the discovery of relations among arguments of two (or more) distinct predicates.” (Section 1, PDF p. 2). Their experimental lesson is: “The transformations achieving the best results make use of constraint domains that are expressive enough to describe relations between variables (such as, Bounded Differences and Octagons), without requiring the higher precision of Convex Polyhedra.” (Section 1, PDF p. 3).

## technique: abstraction-based predicate pairing (APP)

when to use it
- Use for relational verification encoded as CHCs, such as equivalence, non-interference, monotonicity, injectivity, functional dependency, or loop-optimization relations (Sections 1 and 5, PDF pp. 2, 10)
- Use when a CHC solver cannot infer cross-predicate relations from the original clauses
- Prefer Bounded Differences or Octagons when pairwise variable relations suffice; Boxes cannot represent relations between variables, while Convex Polyhedra may cost too much (Section 5, PDF pp. 11–13)

how to do it
1. Encode each program as CHCs and express a failed relational property as a constrained fact, for example `false ← X1 ≤ X2−1, s11(...), s21(...)` (Section 2, PDF pp. 3–4)
2. Choose an abstract constraint domain D: Universe, Boxes, Bounded Differences, Octagons, or Convex Polyhedra (Section 3, PDF p. 6; Section 5, PDF p. 10)
3. Choose a Partition operator that splits a conjunction of body atoms into subconjunctions to be tupled (Section 4, PDF p. 7)
4. For each input clause, unfold every body atom using its defining clauses (APP algorithm, PDF p. 8)
5. Delete unfolded clauses whose constraints are unsatisfiable (APP algorithm, PDF p. 8)
6. For every resulting body subconjunction Gi, abstract its constraint d with `di := α(d) ⇓ Vi`, projecting onto Gi’s variables (APP algorithm, PDF p. 8)
7. Reuse an existing definition when its constraint entails the new one; otherwise create a fresh predicate definition `newpi(Vi) ← di, Gi`. If an ancestor definition exists, widen with `ai = fi ∇ (fi ⊔ di)` (APP algorithm, PDF p. 8)
8. Fold the original clause using the new predicates, repeat until no input clauses remain, and give the transformed CHCs to a CHC solver (APP algorithm and Theorem 1, PDF pp. 8–9)
9. Rely on the theorem that, if APP terminates, the original and transformed clause sets are equisatisfiable (Theorem 1, PDF p. 9)

paper example
- Two loops P1 and P2 are related by equality of output x. Simple predicate pairing still leaves Z3 unable to prove the relation. Convex-Polyhedra APP introduces `pp1` and `pp2` definitions with constraints such as `G ≤ K −1` and `A ≤ B −1`; the resulting clauses have no constrained facts, so a model assigning both paired predicates false makes satisfiability immediate (Section 2, PDF pp. 4–5)
- The paper explains that “The constraints occurring in the new predicate definitions are crucial for deriving a set of clauses without constrained facts.” (Section 2, PDF p. 5)

abstract domains and specialization
- Convex Polyhedra permits arbitrary linear inequalities
- Octagons permit `a1*x1 + a2*x2 ≤ a` with coefficients in {-1,0,1}; Bounded Differences restrict the two coefficients to different signs; Boxes permit only `x ≤ a` (Section 3, PDF p. 6)
- Projection removes variables while preserving the strongest D-constraint expressible in the domain; widening guarantees a finite ascending chain (Section 3, PDF p. 6)
- CHC Specialization with Abstraction (ASp) is APP with a partition of one atom at a time. The experiments compare ASp and APP in different orders (Section 4, PDF p. 9)

Verus form
Inference: A Verus adaptation would encode two Rust executions or two versions as paired ghost state and prove a relational postcondition using `requires`, `ensures`, `spec fn`, loop `invariant`, and proof functions. Predicate pairing corresponds to introducing a ghost predicate or a proof lemma whose arguments contain the states of both runs, so Z3 sees cross-run relations in one formula. Numerical abstraction corresponds to supplying linear invariants (for example, equalities or bounded differences) as `invariant` clauses or lemma preconditions. Verus does not consume CHCs through VeriMAP, so APP would be an external preprocessing or proof-generation layer that emits paired ghost lemmas. The paper’s satisfiability-preservation theorem is about unfold/fold CHCs; it does not establish Verus or Rust soundness.

Evidence and limits
- The benchmark contains 136 CHC problem sets and 1,655 clauses representing relational properties (Section 5, PDF p. 10)
- Direct Z3 solved 28 of 136 problems in 2.36 average CPU seconds per problem. With ASp(OS) then APP(OS), Z3 solved 121 of 136; transformation produced 20,361 clauses, and Z3 averaged 3.90 seconds per solved problem (Table 1, PDF pp. 10–12). The denominators are the 136 input problems; “average time per solved problem” excludes unsolved cases as the caption states.
- APP with Boxes solved 73 problems, Bounded Differences 121, and Octagons 120 when starting from the original clauses (Frame 4, Table 1, PDF p. 12). Convex Polyhedra solved 110 or 113 depending on widening. The paper attributes the lower Box result to inability to represent inter-variable relations and the lower Convex-Polyhedra result to expensive computation and more timeouts (Section 5, PDF pp. 11–13)
- Each VeriMAP or Z3 run had a 300-second timeout; experiments used Z3 4.5.0 with Duality on an Intel Xeon E5-2640 at 2.00 GHz and 64 GB RAM (Section 5, PDF p. 11; Table 1 caption, PDF p. 12)
- The algorithm terminates when the partition bounds each subconjunction size and widening makes the definitions finite (Section 4, PDF p. 9). Its correctness claim is conditional on termination (Theorem 1, PDF p. 9)

what is proved, trusted, and assumed
- Proved: APP preserves CHC satisfiability when it terminates; a solver model then decides the transformed encoding’s satisfiability
- Trusted: the program-to-CHC encoding, VeriMAP unfold/fold implementation, Parma Polyhedra Library operations, Z3, and the abstract-domain definitions
- Assumed: the relational property is correctly encoded, linear arithmetic is expressive enough, and the selected partition and domain terminate within resource limits
- Inference: For agent-written verified Rust, paired ghost state can expose relations between two executions, but the method does not remove the need for manually chosen invariants or a correct relational specification. Clause explosion (up to 20,361 from 1,655 in the reported OS pipeline) is a product risk for automated proof generation.

## techniques for the catalog
- abstraction-based predicate pairing: unfold CHCs, abstract constraints, create paired predicates, fold, then solve the equisatisfiable result
- abstract-domain selection: use Bounded Differences or Octagons for cross-variable relations; Boxes are weaker and Convex Polyhedra costlier
- specialization composition: instantiate the same APP framework with one-atom partitions to propagate abstract constraints through CHCs
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
