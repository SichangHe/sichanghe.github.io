# On Automated Lemma Generation for Separation Logic with Inductive Definitions
(authored by agents unless marked 🧑)
Tag: `enea2015automatedlemma`, [paper](http://arxiv.org/abs/1507.05581v1)

## scope and result

The paper generates separation-logic lemmas from the syntax of inductive predicates, then applies the generated and inductive-rule lemmas with a deterministic entailment procedure. Its target is iterative code whose loop invariants describe partial data structures. The abstract states, “We propose a novel approach for generating these lemmas automatically which is based on simple syntactic criteria and deterministic strategies for applying them.” (Abstract, p. I) The approach handles shape, content, and size constraints and is evaluated on sorted lists, binary-search trees, red-black trees, AVL trees, nested lists, and skip lists.

The key engineering choice is to put a compositional “data port” in an inductive predicate. The ordinary sorted-list segment `lseg(E,M,F)` needs a side condition `M1 ≤ M2` to compose two segments. The revised `lseg(E,M,F,M')` carries the multiset `M'` of the hole segment and gets the simpler lemma `lseg(E1,M1,E2,M2) * lseg(E2,M2,E3,M3) ⇒ lseg(E1,M1,E3,M3)` (§1, p. II, eqs. (3)–(5)). The paper says the new class of definitions allows lemmas to be synthesized "using efficiently checkable, almost syntactic, criteria" (§1, p. II).

## technique 1: design syntactically compositional predicates

What it is. Parameters are divided into source parameters `α` (source location and cumulative data), hole parameters `β` (hole location and hole data), and static parameters `ξ` (§4, p. VII). A predicate is syntactically compositional when it has exactly one base rule and at least one inductive rule of the restricted form: a pure part, a nonempty points-to part, optional predicate atoms, and one recursive predicate whose hole parameters occur nowhere else in the rule. The base rule equates source and hole parameters and contains `emp` (§4, pp. VII–VIII).

The criterion is intended to make the composition lemma true: joining `P(α,β,ξ)` with `P(β,γ,ξ)` entails `P(α,γ,ξ)`. Theorem 1 proves this by induction on heap size (§4, p. VIII). The paper says, “The syntactically compositional predicates are rather general in the sense that they allow nestings of predicates, branchings (e.g. trees), as well as data and size constraints.” (Remark 1, p. VIII)

How to apply it.

1. Identify the source location/data and a hole location/data that can serve as a composition port (§4, p. VII).
2. Make the base case equate source and hole and own `emp` (§4, p. VII).
3. Write every inductive rule as `∃Z. Π ∧ Σ1 * Σ2 * P(γ,β,ξ)`: `Σ1` has only points-to atoms and at least one, `Σ2` has only predicate atoms (possibly none, possibly `P` atoms), and the one recursive atom `P` reuses the same hole parameters β and static parameters ξ, with `γ` drawn from the rule's existential variables (§4, p. VII).
4. Ensure the hole parameters β occur only in the recursive atom: not in `Π`, `Σ1`, `Σ2`, or `γ` (§4, p. VII).
5. Apply Theorem 1 to generate the composition lemma (§4, p. VIII).

The BST example uses `bsthole(E,M1,F,M2)` to represent a truncated tree with a hole and a multiset port. The loop invariant is `∃M1. bsthole(root,M0,t,M1) * bst(t,M1) ∧ (key ∈ M0 ⇔ key ∈ M1)` (§2, p. IV, eq. (11)). The generated composition lemma joins two `bsthole` fragments at the traversal pointer.

Verus form. Inference: represent a compositional predicate as a recursive Verus `spec fn` over a mathematical tree/sequence plus source and hole parameters. Prove a composition lemma with a recursive `proof fn` and `ensures` that joining the two abstract fragments yields the larger fragment. Rust ownership can represent disjoint heap fragments, but the paper's separating conjunction and least-fixed-point semantics require ghost predicates and explicit disjointness lemmas. Inference: this predicate redesign is more directly portable to Verus than automatic lemma synthesis; the synthesis criteria themselves would need a Rust/Verus AST checker.

Evidence and limit. Theorem 1 is proved in Appendix A (p. XVIII), and the body gives a proof sketch by induction on heap size (§4, p. VIII). Table 2 reports nonzero composition-lemma applications (#c) and derived-lemma applications (#d) for every RDBI row (p. XIV). The class is not complete: Remark 2 (§5.3, p. X) says "generating all the lemmas is at least EXPTIME-hard, even for a fragment restricted to shape properties, without any data or size constraint", citing Thm. 3 of [15] rather than proving it.

## technique 2: generate completion lemmas

A completion lemma relates a partial structure to a complete one. For `bsthole` and `bst`, the paper obtains `bsthole(E,M1,F,M2) * bst(F,M2) ⇒ bst(E,M1)` (§5.1, p. VIII). More generally, a predicate `P'` is a completion of compositional `P` when its rules are obtained by substituting constants for the hole parameters. Theorem 2 gives both the equivalence of `P'` with `P` at those constants and the completion entailment (§5.1, p. IX).

How to apply it. Define the partial predicate with a hole port, choose constants for the completed endpoint (for a tree, `nil` and `∅`, as in the substitution `{F → nil, M2 → ∅}` of §5.1, p. VIII), substitute those constants into the rules as in the definition of completion (§5.1, p. IX), and declare the resulting predicate as `P'`. Theorem 2 then gives `P'(α,ξ) ⇔ P(α,c,ξ)` and `∃β. P(α,β,ξ) * P'(β,ξ) ⇒ P'(α,ξ)` (§5.1, p. IX). Inference: a lemma generator would emit these two lemmas for each declared completion.

Verus form. Inference: define a complete ghost predicate as the partial predicate specialized to `nil`/empty values, then prove a specialization lemma and a join lemma. Use `requires` to state that the hole fragment is complete and `ensures` to return the completed structure. Inference: Verus will not infer the substitution automatically; generate the lemma skeleton from the predicate declaration.

## technique 3: generate stronger-predicate lemmas

A predicate `P'` is stronger than `P` when every inductive rule of `P'` has the same spatial structure as a corresponding rule of `P` and its pure constraints imply those of `P` (§5.2, p. IX). Theorem 3 then gives both `P' ⇒ P` and the composition entailment `∃β. P'(α,β,ξ) * P(β,γ,ξ) ⇒ P(α,γ,ξ)` (§5.2, p. IX). The paper's `natbsth` adds `M3 ≥ 0` to `bsthole`; this yields `natbsth ⇒ bsthole` and a composition entailment (§5.2, p. IX).

A relaxed criterion permits the body of `P'` to imply an unfolding of `P` for a bounded number of steps, enabling lemmas relating even-length list segments to list segments (§5.2, p. IX). The paper reports that the "stronger" lemmas are used to check the verification conditions for rebalancing AVL trees and red-black trees (§5, p. VIII). Inference: use this class when invariants carry extra arithmetic facts but share the same heap shape.

Verus form. Inference: encode the stronger predicate and prove a weakening lemma from its pure invariant. Then prove composition using the base predicate's composition lemma. The bounded-unfolding extension requires explicit recursive lemmas and a chosen unfolding depth; it is not automatic in Verus.

## technique 4: generate static-parameter contraction lemmas

Static-parameter contraction removes or replaces static parameters with hole parameters. In the example, `stabsth(E,M1,F,M2,B)` (points-to atom with `(tail, B)`) is compositional, while `tailbsth(E,M1,F,M2)` (points-to atom with `(tail, F)`) is not, because `F` occurs in the points-to atoms. Replacing `B` with `F` gives `tailbsth(E,M1,F,M2) ⇔ stabsth(E,M1,F,M2,F)`, and from it the lemma `∃E2,M2. stabsth(E1,M1,E2,M2,E3) * tailbsth(E2,M2,E3,M3) ⇒ tailbsth(E1,M1,E3,M3)` (§5.3, p. X). The paper notes that these lemmas "are not used in our experiments" and could be useful for lists with tail pointers (§5, p. VIII). Theorem 4 generalizes this using a contraction substitution that maps each static parameter either to itself or to a hole parameter of the same data type (§5.3, p. X).

Inference: apply it by identifying a hole parameter that appears in the points-to atoms, introducing a fresh static parameter in its place so the predicate satisfies the compositional criterion, and recording the contraction substitution; this is the route the paper's tail-pointer example takes, but the paper gives no tool support or experiment for it.

Verus form. Inference: use a ghost parameter for the static pointer and instantiate it with the hole pointer in a wrapper predicate. Prove equivalence and composition with `proof fn` lemmas. Inference: Rust field aliasing makes such a pointer substitution delicate; the Verus encoding must preserve the actual ownership/disjointness invariant rather than only the abstract predicate.

## technique 5: deterministic entailment proof strategy

The procedure proves entailments `ϕ1 ⇒ ∃X.ϕ2` where only data variables are existentially quantified. It assumes `ϕ1` is quantifier-free (existentials skolemized) and treats `ϕ1`, `ϕ2` as `Π ∧ Σ` (disjunctions are handled disjunct by disjunct), then applies four rules in the order given in Figure 2: `Match1`, `Match2`, `Lemma`, and `Slice` (§6, p. XI, Fig. 2 and following text, pp. XI–XII). Inductive rules of the predicates are treated as lemmas too (§6, p. X).

1. `Match1` syntactically matches all RHS spatial atoms to LHS atoms and records a substitution for existential variables; equalities for free variables become pure obligations (§6, p. XI).
2. `Match2` turns a purely syntactic-matching judgement (`|=SUB`, produced by `Match1`) into the general judgement `|=η` (§6, Fig. 2, p. XI).
3. `Lemma` applies an inductive rule or generated lemma whose root is the unique predicate atom or points-to conjunction rooted at the target; it splits the proof into root matching (via `Match1`) and an entailment for the rest of the lemma body, then extends the instantiation using the lemma's pure part (§6, pp. XI–XII). The paper's extension is equality propagation in the experiments (§6, footnote 7, p. XII).
4. `Slice` chooses one RHS spatial atom `A`, proves it (using `Match2` and `Lemma`) from a spatial sub-formula of the LHS, proves the remaining RHS from the remaining LHS, combines the instantiations, and checks the pure constraints; the choice of `A` "is done arbitrary, since it does not affect the efficiency of proving validity" (§6, p. XII).
5. Translate data-constraint entailments into satisfiability problems in the theory of integers with uninterpreted functions and discharge them with an SMT solver (§7, p. XIII).

The BST loop example applies the `bsthole` composition lemma (13), unfolds `bsthole` twice (rule (10), then rule (8)), matches atoms one by one, instantiates `M1` of `Inv'` with `M2` of `post(Inv)`, and lets the data constraints entail the rest (§2, pp. IV–V). The paper walks through the sorted-list entailment in full in §6 (pp. XII–XIII) and Appendix D (pp. XXII–XXIV). Theorem 5 states soundness: if `ϕ1 |=η ∃X.ϕ2` for some `η`, then `ϕ1 ⇒ ∃X.ϕ2` (§6, p. XIII); the paper gives no proof of Theorem 5 in the appendix (Appendices A–B prove Theorems 1–4). Before the theorem, the paper argues that, with a finite set of lemmas and each lemma application removing at least one spatial atom of `ϕ1`, applications of the `Lemma` rule terminate (§6, p. XIII).

Verus form. Inference: generate a proof-search plan that first matches ghost heap fragments, then invokes a generated lemma, then discharges arithmetic with Verus assertions/lemmas. Verus's SMT backend can handle many arithmetic obligations, but a custom spatial matcher and lemma registry would be needed. Inference: keep the deterministic order as an agent workflow heuristic; it is not itself a Verus proof unless every generated step is checked.

## technique 6: normalize separation logic and use SMT for data constraints

The implementation extends `spen`. It starts with a normalization step "based on the boolean abstractions described in [11]", which saturates the formulas with (dis)equalities between location variables implied by the separating conjunction. It then translates data-constraint entailments to satisfiability problems in the theory of integers with uninterpreted functions and calls an SMT solver (§7, p. XIII). Inference: the spatial phase is responsible for heap shape and the SMT phase for the data constraints (multisets, order, sizes, arithmetic); the paper does not describe how multisets are encoded.

This split is useful when spatial matching is syntactic but content constraints are not. In the sorted-list example, matching two cells generates `M = {v1,v2}` (as `η = {M → {v1} ∪ {v2} ∪ ∅}`) and `Slice` finally checks `Π1 ∧ EQ(η) |= v2 ∈ M` (§6, p. XIII; Appendix D, p. XXIV).

Verus form.

## evidence and limits

RDBI is described as verification conditions for iterative procedures (delete, insert, search) over sorted lists, BSTs, AVL trees, and red-black trees (§7, p. XIII); Table 2 has rows for search, insert, and delete on sorted lists and BSTs but only search and insert on AVL trees and red-black trees. Table 2 reports 4 sorted-list search VCs at 1.108 s of spen time plus 0.10 s SMT time; 25 BST-delete VCs at 8.412 s plus 0.58 s SMT; 22 AVL-insert VCs at 6.393 s plus 1.33 s SMT; and 21 RBT-insert VCs at 6.962 s plus 2.53 s SMT (Table 2, p. XIV). The `#VC` column is the number of verification conditions considered for each procedure, and the machine is a 2.53 GHz Intel processor with 2 GB, running Linux on VBox (§7, p. XIV, footnote 9). The spen column is the "system" time spent by spen on all verification conditions of a function excluding the SMT solving time, which is the separate SMT column (§7, p. XIV).

SL-COMP'14 contains 16 nested-list VCs, 4 two-level skip-list VCs, and 10 three-level skip-list VCs. spen takes 4.428 s, 1.629 s, and 3.858 s respectively, while the comparison `spen-TA` (the decision procedure of [11]) takes 4.382 s, 1.636 s, and 3.485 s (Table 3, p. XIV). The paper says "The times of the two decision procedures are almost the same, which demonstrates that our approach, as an extension of that in [11], is robust." (§7, p. XIV). Inference: this is not evidence of a speedup.

Proved (Appendices A–B, pp. XVIII–XX): Theorem 1's syntactic criterion implies semantic compositionality, and Theorems 2–4 justify the three derived lemma classes. Stated without proof in the paper: Theorem 5 (soundness), with an informal termination argument. Measured (Tables 2–3, p. XIV): VC counts, lemma-application counts, the number of data-constraint entailments (`⇒D`), and system times. Inference: trusted or assumed are the least-fixed-point semantics of the inductive predicates (§3, p. VII), the correctness of the SMT solver and of the normalization, the finite lemma set, and the restriction that RHS existential variables are data variables (§6, footnote 5, p. XI, where the authors write "We believe that this restriction is reasonable for the verification conditions appearing in practice"). The method is incomplete: Remark 2 says the lemmas “may not cover all the lemmas for a given set of inductive predicates.” (§5.3, p. X)

## techniques for the catalog

- compositional predicate design — expose source and hole data/location ports so composition follows from syntax
- completion lemma generation — specialize a partial predicate at endpoint constants to connect it to a complete structure
- stronger-predicate generation — derive weakening and composition lemmas from rule-by-rule pure implication
- static-parameter contraction — replace compatible static parameters with hole parameters through a generated substitution
- deterministic spatial entailment — apply matching, lemma, and slicing rules in a fixed terminating order
- SMT data discharge — separate heap-shape matching from arithmetic, multiset, and size constraints
- proof-producing lemma compiler — generate finite lemma sets whose applications are checked by a sound entailment procedure
