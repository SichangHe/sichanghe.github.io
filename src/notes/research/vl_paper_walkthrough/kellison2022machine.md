# A Machine-Checked Direct Proof of the Steiner-Lehmus Theorem
(authored by agents unless marked 🧑)
Tag: `kellison2022machine`, [paper](https://arxiv.org/abs/2112.11182)

## what the paper proves

Kellison formalizes a constructive Euclidean geometry and proves the Steiner-Lehmus theorem in Nuprl. The theorem says that equal internal angle bisectors imply an isosceles triangle. The paper's directness criterion is that a proof "does not rely on reductio ad absurdum" (abstract), and that all auxiliary theorems are also proved directly, going back to the axioms. Its guarantee of directness comes from building the proof in the constructive logic of Nuprl. The paper says, “In this paper, we provide a direct proof of the Steiner-Lehmus theorem.” (§1, p.1)

The key logical technique is to exploit stability. A proposition is stable when `¬¬P → P`; negative propositions are stable, so a proof of a stable conclusion can introduce `¬¬(P ∨ ¬P)` and eliminate the double negation. The paper states, “Thus, in the proof of a stable proposition P, one need only introduce the double negation of the desired case distinction as a hypothesis and apply the appropriate elimination rules to obtain the desired cases.” (§2, p.2) The paper notes that the double negation of the law of excluded middle holds for arbitrary propositions (Theorem 2.3), so this permits case analysis for stable conclusions without assuming classical excluded middle.

## technique: encode geometry constructively

What it is: represent points, segments, orientation, and metric relations with atomic positive relations, then define classical-looking relations negatively. A segment is a pair of points. The atomic relations are strict segment-length order `ab > cd` and orientation `Left(a,bc)`. Point apartness is `a#b := ab > aa`; segment apartness is a disjunction of strict orders; non-strict order is negated strict order. Collinearity is `¬(a#bc)`, betweenness is collinearity plus two non-strict length inequalities, and congruence is `¬(ab#cd)`. The paper emphasizes, “Instead, we define equivalence, collinearity, betweenness, and congruence ... negatively in terms of a strictly positive atomic relation.” (§2.1, p.2)

When to use it: Inference: use this encoding when a constructive proof must distinguish equality from apartness and must retain stability of geometric predicates. The paper says that equality on points implies equivalence but equivalence does not imply equality (§3.3, p.3), so do not silently substitute equality for congruence.

How to apply it:
1. Define `Point` and `Segment = Point × Point`; use pair projections for segment endpoints (§3.1, p.2)
2. Choose strict order and orientation as atoms, then define apartness and non-strict order (§3.2, pp.2–3)
3. Define collinearity, betweenness, strict betweenness, congruence, angle congruence, angle sum, angle inequality, and parallelism from those atoms (§3.3–§3.5, pp.3–4)
4. State universally quantified axioms separately from constructor axioms. The former (Axioms U) contain no disjunctions or existential quantifiers; the latter (Axioms C) are constructor axioms relying on them and have a functional reading (§4, pp.4–5)

Verus form: Inference: model points as a datatype or mathematical tuple and expose executable coordinates separately from `spec` relations. Define `spec fn apart(a,b) -> bool`, `congruent`, and `between` using Boolean combinations and quantified specifications; prove lemmas connecting constructors to those relations. Verus can express `requires`, `ensures`, `assert`, and `proof fn`, but Nuprl's constructive extraction and dependent type judgment do not carry over automatically. In particular, a Verus proof of a negative relation establishes the written predicate, not geometric soundness unless coordinate-model lemmas are also proved.

Evidence and limits: the paper's model interprets strict order on constructive reals by a witness rational approximation and interprets `Left` with a determinant; it says, “The soundness of our axioms with respect to the constructive reals provides additional assurance that our axioms do not use reductio ad absurdum.” (§7, p.8) Definition 7.1 (p.7) defines `x >R y` as `∃n. x(n) >Q y(n) + 4`, and Definition 7.2 (p.8) defines `Left(a,bc)` as a determinant being strictly positive. This is a semantic model of the axioms, not an empirical benchmark. The paper notes that `>R` is not decidable while `>Q` is (§7, p.7), and that the model “says nothing about the existence of direct proof in the classical reals.” (§7, p.8)

## technique: stable propositions and constructive case analysis

What it is: prove a stable geometric target by first assuming a double-negated disjunction, then eliminate it. The paper's worked example, Theorem 3.8, proves that any three collinear points satisfy a weak betweenness relation. The proof reasons by cases on `¬¬(a#b ∨ ¬a#b)` (and likewise for `a#c`, `b#c`); in the case where all three pairs are apart, it assumes the negation of all candidate cases and derives that `¬B(abc)` gives `¬¬(a#bc ∨ ab > ac ∨ bc > ac)`; stability of the conclusion eliminates the double negation for each betweenness relation, and expanding the disjunctions gives absurdity (§3.3, p.3).

How to apply it:
1. Identify a target `P` whose form is negative or otherwise stable (§2, p.2)
2. Introduce `¬¬(A ∨ ¬A)` rather than `A ∨ ¬A` (§2, p.2)
3. Eliminate the double negation using the stability proof for the target, then split cases (§2, p.2)
4. In each branch derive the desired relation or contradiction using only constructive axioms and previously proved lemmas (§3.3, p.3)

Verus form: Inference: encode the stable target as a predicate and prove a lemma whose postcondition is the target. Verus's SMT logic is classical, so the exact Nuprl discipline is a specification-design rule rather than a kernel restriction; preserve the discipline by avoiding an unproved `forall`/excluded-middle axiom and by proving each branch with `assert` and lemmas.

Evidence: the paper's conclusion identifies stability as the crux: “The crux of the proof is the realization that congruence in constructive geometry is a stable relation, and that the proof of a stable relation permits double negation elimination and therefore also case distinctions.” (§8, p.8) There are no runtime measurements or proof-time denominators reported, so scalability is unknown.

## technique: construct a direct geometric proof from reusable lemmas

What it is: prove a parallelogram construction lemma, then use it to derive Steiner-Lehmus. Lemma 5.1 takes `a#bc` and strict-betweenness points `x`, `y` (`SB(axb)`, `SB(cyb)`) and proves the double negation of the existence of a point `t` with `yt ∥ ax`, `xt ∥ ay`, `ax ≅ yt`, `xt ≅ ay` and `t#bc` (§5, p.6). The paper explains that, because the conclusion of the theorem is stable, it proves this double-negated form rather than a plain existence lemma (§5, p.5). The construction sequence is explicit: construct the midpoint `m` of `xy` (Euclid I.10), extend `am` to `t` with `am ≅ mt` (Lemma 6.1), get `xma ≅a ymt` from Euclid I.15 and the congruences `ax ≅ yt`, `xt ≅ ay` from Euclid I.4 and Axiom U10, get parallelism from Euclid I.27, then reason by cases on `t#bc` versus `Col(tbc)`. The collinear case is refuted using Lemmas 6.10, 6.11, 6.13 and 6.14 (§5, p.6).

Theorem 5.2 assumes `a#bc`, `SB(axb)`, `SB(cyb)`, `ay ≅ cx`, `xay ≅a cay` and `ycx ≅a acx`, and concludes `ab ≅ cb` (§5, p.6). Its proof constructs the parallelogram `ayxt` by Lemma 5.1, obtains `xct ≅a xtc` from Euclid I.5, obtains the angle sums `xty + ytc ≅a xtc` and `xcy + yct ≅a xct` by constructing a point `q` with Axiom C2, and splits on `cy > ax` versus `¬(cy > ax)`. If `cy > ax`, Euclid I.25 and I.18 together with Lemma 6.15 yield the contradiction `xty <a xcy`. If `¬(cy > ax)`, stability gives cases `ax > cy` or `ax ≅ cy`; the first is symmetric, while in the second Definition 3.12 gives `xac ≅a yca` and Euclid I.6 (Theorem 6.4) yields `ab ≅ cb` (§5, p.6).

How to apply it:
1. State each geometric construction as a (double-negated) existential lemma with all non-degeneracy preconditions (§5, pp.5–6)
2. Build midpoint and extension points using constructor axioms and lemmas (§5, p.6)
3. Derive congruence and angle relations by named Euclidean lemmas (§5, p.6)
4. Derive parallelism from alternate-angle congruence (§5, p.6; Theorem 6.9, p.7)
5. Use stability to split metric cases, and close each branch with angle-order lemmas or congruence (§5, p.6)
6. Keep all auxiliary statements in the library; the paper lists the required theorems in §6 (pp.6–7)

Verus form: Inference: represent each construction as a `proof fn` lemma with existential postconditions, or return a witness in executable code when it must run. Use `requires` for non-degeneracy, `ensures` for parallelism/congruence, and separate lemmas for midpoint, angle, and ordering facts. A Verus lemma is erased and cannot be called at runtime; if a construction is executable, its witness-producing function must be verified against the lemma. The Nuprl proof's constructive witness and dependent types therefore require an explicit Rust data representation.

Evidence and limits: the paper reports a completed Nuprl proof and gives library URLs, but no line count, runtime, or failure rate. The model validates the axiom interpretation; it does not validate an implementation of a Rust geometry library. The proof depends on the listed Euclidean axioms and constructive real model, and excludes the parallel postulate: “parallelism is a symmetric and reflexive relation but not a transitive relation.” (§3.5, p.4)

## techniques for the catalog

- constructive negative geometry: define equivalence, collinearity, betweenness, and congruence from positive atoms to preserve constructive stability
- stable case analysis: derive controlled case splits by double-negation elimination only for stable targets
- constructor-lemma decomposition: build a complex theorem from explicit existential constructions and named auxiliary lemmas
- semantic model checking: interpret axioms over constructive reals to test soundness and expose assumptions
