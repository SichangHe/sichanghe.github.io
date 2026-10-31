# Enhancing Predicate Pairing with Abstraction for Relational Verification
(authored by agents unless marked 🧑)
Tag: `deangelis2017enhancing`, [paper](http://arxiv.org/abs/1709.04809v1)

## problem and result
The paper verifies relational properties by translating programs to constrained Horn clauses (CHCs), transforming those clauses with predicate pairing plus numerical abstraction, then asking Z3 for satisfiability. Predicate pairing creates a predicate equivalent to a conjunction of predicates so a solver can discover relations between arguments that otherwise belong to separate predicates. The new Abstraction-based Predicate Pairing (APP) algorithm adds constraints from an abstract domain while constructing paired predicates.

The authors define the motivation precisely: “The main difficulty encountered by CHC solvers when verifying relational properties is that these solvers find models of single predicates expressed in terms of Linear Arithmetic constraints, whereas the proof of relational properties often requires the discovery of relations among arguments of two (or more) distinct predicates.” (Section 1, PDF p. 2). Their experimental lesson is: “The lesson one may learn from the results of our experiments is that the transformations achieving the best results make use of constraint domains that are expressive enough to describe relations between variables (such as, Bounded Differences and Octagons), without requiring the higher precision of Convex Polyhedra.” (Section 1, PDF pp. 2–3).

## technique: abstraction-based predicate pairing (APP)

when to use it
- Use for relational verification encoded as CHCs. The paper names program equivalence, non-interference and relative correctness (Section 1, PDF p. 2), and its benchmarks cover loop optimizations, equivalence, monotonicity, injectivity, functional dependency and non-interference (Section 5, PDF p. 10)
- Use when a CHC solver cannot infer cross-predicate relations from the original clauses
- Prefer Bounded Differences or Octagons: the paper reports them as the most effective domains, expressive enough to relate variables yet simpler than Convex Polyhedra. Boxes cannot represent relations among variables, and Convex Polyhedra were more expensive, so timeouts were reached more often (Section 5, PDF p. 11; Section 6, PDF p. 13)

how to do it
1. Encode each program as CHCs and express a failed relational property as a constrained fact, for example `false ← X1 ≤ X2−1, s11(...), s21(...)` (Section 2, PDF pp. 3–4). The paper splits `X1 ≠ X2` into two clauses because the techniques do not handle disequality
2. Choose an abstract constraint domain D: Universe, Boxes, Bounded Differences, Octagons, or Convex Polyhedra (Section 3, PDF p. 6; Section 5, PDF p. 10)
3. Choose a Partition operator that splits the conjunction G of body atoms of a clause into n ≥ 1 subconjunctions G1, ..., Gn to be tupled (Section 4, PDF p. 7)
4. Starting from the input clause C, unfold it with respect to each atom of its body using the original clauses P (APP algorithm, Figure 2, PDF p. 8)
5. Delete unfolded clauses whose constraints are unsatisfiable (Figure 2, PDF p. 8)
6. For each remaining unfolded clause `H ← d, G`, partition G and, for every Gi, abstract the constraint d with `di := α(d) ⇓ Vi`, where Vi is the set of variables in Gi (Figure 2, PDF p. 8)
7. If Defs already holds a definition `newpi(Vi) ← ei, Gi` with `di ⊑ ei` (the new constraint entails the existing one), reuse it. Otherwise create a new definition: if an ancestor of C has the form `newq(Vi) ← fi, Gi` (same body Gi), use `ai = fi ∇ (fi ⊔ di)` as its constraint (widening); else use `di`. Add the new definition to the input clauses to be processed (Figure 2, PDF p. 8)
8. Add the clause `H ← d, newp1(V1), ..., newpn(Vn)` (folding) to the output set TransfCls, which starts as P. Repeat while input clauses remain, then give TransfCls to a CHC solver (Figure 2, PDF p. 8; Section 5, PDF p. 9)
9. Rely on Theorem 1: if APP terminates, `P ∪ {C}` is satisfiable iff TransfCls is satisfiable (Theorem 1, PDF p. 9). The paper obtains this from “well-known correctness results for the unfold/fold rules [19]” and does not give a separate proof in this text

paper example
- Two loops P1 and P2 (P2 obtained from P1 by software pipelining) are related by equality of output x. Z3 fails on the original clauses and on clauses from ‘simple’ predicate pairing. Convex-Polyhedra APP introduces `pp1` and `pp2` definitions with constraints such as `G ≤ K −1` and `A ≤ B −1`; the resulting clauses contain no constrained facts, so taking both paired predicates false is a model and Z3 checks satisfiability easily (Section 2, PDF pp. 4–5). The paper treats only the clause F1 for simplicity
- The paper explains that “The constraints occurring in the new predicate definitions are crucial for deriving a set of clauses without constrained facts.” (Section 2, PDF p. 5)

abstract domains and specialization
- Convex Polyhedra: atomic constraints `a1·x1 + ... + an·xn ≤ a` with real coefficients
- Octagons: `a1·x1 + a2·x2 ≤ a` with ai in {−1, 0, 1}; Bounded Differences: the same form with a1 different from a2; Boxes: `x ≤ a` (Section 3, PDF p. 6)
- Projection `c ⇓ X` is a D-constraint over X equivalent to ∃Y.c, where Y is the variables of c not in X. The abstraction operator α maps a constraint c to a D-constraint with c ⊑ α(c) that entails every D-constraint e that c entails. A widening operator makes the chain it builds finite (Section 3, PDF p. 6)
- CHC Specialization with Abstraction (ASp) is APP with a partition into single atoms, so no predicate pairing is made (Section 4, PDF p. 9). The experiments compare ASp and APP in different orders (Section 5, PDF pp. 10–11)

Verus form
Inference: A Verus adaptation would encode two Rust executions or two versions as paired ghost state and prove a relational postcondition using `requires`, `ensures`, `spec fn`, loop `invariant`, and proof functions. Predicate pairing corresponds to introducing a ghost predicate or a proof lemma whose arguments contain the states of both runs, so Z3 sees cross-run relations in one formula. Numerical abstraction corresponds to supplying linear invariants (for example, equalities or bounded differences) as `invariant` clauses or lemma preconditions. Verus does not consume CHCs through VeriMAP, so APP would be an external preprocessing or proof-generation layer that emits paired ghost lemmas. The paper’s satisfiability-preservation theorem is about unfold/fold CHCs; it does not establish Verus or Rust soundness.

Evidence and limits
- The benchmark contains 136 sets of CHCs and 1655 clauses representing relational verification problems (Section 5, PDF p. 10)
- Experiment 0, Z3 directly: 28 of 136 problems solved, average 2.36 seconds per problem. Experiment 2 with Octagons (ASp(OS) then APP(OS)): ASp(OS) turned 1655 clauses into 3540 (0.73 s average); APP(OS) then produced 20361 clauses (4.60 s average; 134 of 136 problems finished within the timeout), and Z3 solved 121 of 136 problems at 3.90 s average per solved problem (Section 5, PDF pp. 10–11; Table 1 Frames 0 and 2, PDF p. 12)
- Applying APP directly to the original clauses (Frame 4, Table 1, PDF p. 12): Universe (‘simple’ pairing) 73, Boxes 78, Bounded Differences 121, Octagons 120, Convex Polyhedra 110 with Halbwachs widening (CP-H) and 113 with Bagnara et al. widening (CP-B), out of 136. The paper attributes the poor Boxes result to Boxes not being “expressive enough to represent relations among variables of programs” and the Convex-Polyhedra result to more expensive computations that reach the timeout more often (Section 5, PDF p. 11)
- The paper reports that ASp after APP does not change efficacy significantly, and that ASp before APP for Bounded Differences and Octagons “does not really pay off”; applying APP directly to the encoding solved more problems with lower verification time (Section 5, PDF p. 11). Specialization alone (Frame 1) solved 28 to 36 problems (Table 1, PDF p. 12)
- Each VeriMAP or Z3 run had a 300-second timeout; if VeriMAP timed out on a problem, that problem was not passed on and not counted in averages and size ratios. Experiments used Z3 4.5.0 with the Duality fixed-point engine on an Intel Xeon E5-2640 at 2.00 GHz with 64 GB RAM under CentOS 7; times are CPU seconds in user mode (Section 5, PDF p. 11; Table 1 caption, PDF p. 12)
- The algorithm terminates if some integer k bounds the size of every subconjunction Gi produced by Partition; with that bound, the widening properties make the set of definitions finite. Pairing gives k = 2 (Section 4, PDF p. 8). Its correctness claim is conditional on termination (Theorem 1, PDF p. 9)
- The authors note the clause growth: “The large values in Column OutCls show that in our implementation more effort should be put in keeping the number of clauses generated by the APP and ASp strategies small” (Section 5, PDF p. 13)

what is proved, trusted, and assumed
- Proved (by citation to unfold/fold correctness results): if APP terminates, the original and transformed clause sets are equisatisfiable (Theorem 1, PDF p. 9)
- Inference: Trusted: the program-to-CHC encoding, the VeriMAP unfold/fold implementation, Parma Polyhedra Library operations, Z3, and the abstract-domain definitions
- Inference: Assumed: the relational property is correctly encoded, linear arithmetic is expressive enough, and the selected partition and domain terminate within resource limits
- Inference: For agent-written verified Rust, paired ghost state can expose relations between two executions, but the method does not remove the need for manually chosen invariants or a correct relational specification. Clause growth (20361 clauses in Frame 2 for Octagons, 36871 in Frame 3, from 1655 original; Table 1, PDF p. 12) is a product risk for automated proof generation.

## techniques for the catalog
- abstraction-based predicate pairing: unfold CHCs, abstract constraints, create paired predicates, fold, then solve the equisatisfiable result
- abstract-domain selection: use Bounded Differences or Octagons for cross-variable relations; Boxes are weaker and Convex Polyhedra costlier
- specialization composition: instantiate the same APP framework with one-atom partitions to propagate abstract constraints through CHCs
