# On Automated Lemma Generation for Separation Logic with Inductive Definitions
(authored by agents unless marked 🧑)
Tag: `enea2015automatedlemma`, [paper](http://arxiv.org/abs/1507.05581v1)

## scope and result

The paper generates separation-logic lemmas from the syntax of inductive predicates, then applies the generated and inductive-rule lemmas with a deterministic entailment procedure. Its target is iterative code whose loop invariants describe partial data structures. The abstract states, “We propose a novel approach for generating these lemmas automatically which is based on simple syntactic criteria and deterministic strategies for applying them.” (Abstract, p. I) The approach handles shape, content, and size constraints and is evaluated on sorted lists, binary-search trees, red-black trees, AVL trees, nested lists, and skip lists.

The key engineering choice is to put a compositional “data port” in an inductive predicate. The ordinary sorted-list segment `lseg(E,M,F)` needs a side condition `M1 ≤ M2` to compose two segments. The revised `lseg(E,M,F,M')` carries the multiset `M'` of the hole segment and gets the simpler rule `lseg(E1,M1,E2,M2) * lseg(E2,M2,E3,M3) ⇒ lseg(E1,M1,E3,M3)` (§1, pp. II–III). This representation change makes lemma synthesis almost syntactic.

## technique 1: design syntactically compositional predicates

What it is. Parameters are divided into source parameters `α` (source location and cumulative data), hole parameters `β` (hole location and hole data), and static parameters `ξ` (§4, p. VII). A predicate is syntactically compositional when it has exactly one base rule and at least one inductive rule of the restricted form: a pure part, a nonempty points-to part, optional predicate atoms, and one recursive predicate whose hole parameters occur nowhere else in the rule. The base rule equates source and hole parameters and contains `emp` (§4, pp. VII–VIII).

The criterion is intended to make the composition lemma true: joining `P(α,β,ξ)` with `P(β,γ,ξ)` entails `P(α,γ,ξ)`. Theorem 1 proves this by induction on heap size (§4, p. VIII). The paper says, “The syntactically compositional predicates are rather general in the sense that they allow nestings of predicates, branchings (e.g. trees), as well as data and size constraints.” (Remark 1, p. VIII)

How to apply it.

1. Identify the source location/data and a hole location/data that can serve as a composition port (§4, p. VII).
2. Make the base case equate source and hole and own `emp` (§4, p. VII).
3. In every inductive case, put at least one points-to atom in the first spatial part, put recursive/predicate atoms in the second part, and recurse with the same hole parameters (§4, p. VII).
4. Ensure every hole parameter occurs exactly once in the rule's recursive structure and nowhere in the other pure or spatial atoms (§4, p. VII).
5. Apply Theorem 1 to generate the composition lemma (§4, p. VIII).

The BST example uses `bsthole(E,M1,F,M2)` to represent a truncated tree with a hole and a multiset port. The loop invariant is `bsthole(root,M0,t,M1) * bst(t,M1) ∧ (key ∈ M0 ⇔ key ∈ M1)` (§2, pp. III–IV). The generated composition lemma joins two `bsthole` fragments at the traversal pointer.

Verus form. Inference: represent a compositional predicate as a recursive Verus `spec fn` over a mathematical tree/sequence plus source and hole parameters. Prove a composition lemma with a recursive `proof fn` and `ensures` that joining the two abstract fragments yields the larger fragment. Rust ownership can represent disjoint heap fragments, but the paper's separating conjunction and least-fixed-point semantics require ghost predicates and explicit disjointness lemmas. Inference: this predicate redesign is more directly portable to Verus than automatic lemma synthesis; the synthesis criteria themselves would need a Rust/Verus AST checker.

Evidence and limit. Theorem 1 is proved in the paper's appendix and the generated lemmas are exercised on all RDBI benchmarks. The class is not complete: generating all possible lemmas is at least EXPTIME-hard even for shape-only fragments (§5.3, p. X).

## technique 2: generate completion lemmas

A completion lemma relates a partial structure to a complete one. For `bsthole` and `bst`, the paper obtains `bsthole(E,M1,F,M2) * bst(F,M2) ⇒ bst(E,M1)` (§5.1, p. VIII). More generally, a predicate `P'` is a completion of compositional `P` when its rules are obtained by substituting constants for the hole parameters. Theorem 2 gives both the equivalence of `P'` with `P` at those constants and the completion entailment (§5.1, pp. VIII–IX).

How to apply it. Define the partial predicate with a hole port, choose constants for the completed endpoint (for a tree, `nil` and empty data), substitute those constants into every base and inductive rule, and register the resulting predicate as `P'`. The generator emits the completion equivalence and composition-to-complete lemma (§5.1, p. VIII).

Verus form. Inference: define a complete ghost predicate as the partial predicate specialized to `nil`/empty values, then prove a specialization lemma and a join lemma. Use `requires` to state that the hole fragment is complete and `ensures` to return the completed structure. Inference: Verus will not infer the substitution automatically; generate the lemma skeleton from the predicate declaration.

## technique 3: generate stronger-predicate lemmas

A predicate `P'` is stronger than `P` when every inductive rule of `P'` has the same spatial structure as a corresponding rule of `P` and its pure constraints imply those of `P` (§5.2, pp. IX–X). Theorem 3 then generates both `P' ⇒ P` and a composition rule combining `P'` with `P`. The paper's `natbsth` adds `M3 ≥ 0` to `bsthole`; this yields `natbsth ⇒ bsthole` and a composition entailment (§5.2, p. IX).

A relaxed criterion permits the body of `P'` to imply an unfolding of `P` for a bounded number of steps, enabling lemmas for even-length list segments (§5.2, p. X). Use this when rebalancing invariants carry extra arithmetic facts but share the same heap shape.

Verus form. Inference: encode the stronger predicate and prove a weakening lemma from its pure invariant. Then prove composition using the base predicate's composition lemma. The bounded-unfolding extension requires explicit recursive lemmas and a chosen unfolding depth; it is not automatic in Verus.

## technique 4: generate static-parameter contraction lemmas

Static-parameter contraction removes or replaces static parameters with hole parameters. In the example, `stabsth(E,M1,F,M2,B)` is compositional, while `tailbsth(E,M1,F,M2)` is obtained by replacing `B` with `F`; the generator proves `tailbsth(E,M1,F,M2) ⇔ stabsth(E,M1,F,M2,F)` and derives a composition lemma (§5.3, pp. X–XI). Theorem 4 generalizes this using a substitution that maps each static parameter either to itself or to a type-compatible hole parameter (§5.3, p. XI).

Apply it by identifying a non-compositional pointer/data parameter that appears in recursive points-to atoms, introducing a fresh static parameter so the predicate satisfies the compositional criterion, then registering the contraction substitution. This handles tail-pointer structures while preserving the generated composition machinery.

Verus form. Inference: use a ghost parameter for the static pointer and instantiate it with the hole pointer in a wrapper predicate. Prove equivalence and composition with `proof fn` lemmas. Inference: Rust field aliasing makes such a pointer substitution delicate; the Verus encoding must preserve the actual ownership/disjointness invariant rather than only the abstract predicate.

## technique 5: deterministic entailment proof strategy

The procedure proves entailments `ϕ1 ⇒ ∃X.ϕ2` where only data variables are existentially quantified. It normalizes formulas to pure part `Π` and spatial part `Σ`, then applies four rule families in a fixed order: `Match1`, `Match2`, `Lemma`, and `Slice` (Figure 2, pp. XI–XII).

1. `Match1` syntactically matches all RHS spatial atoms to LHS atoms and records a substitution for existential variables; equalities for free variables become pure obligations (§6, p. XI).
2. `Match2` handles matching a selected subformula when a complete match is impossible (§6, p. XI).
3. `Lemma` applies an inductive rule or generated lemma whose root is the unique predicate atom or points-to conjunction rooted at the target; it splits the proof into root matching and residual entailment (§6, pp. XI–XII).
4. `Slice` chooses one RHS spatial atom, proves it from a disjoint LHS slice, proves the remaining RHS from the remainder, combines substitutions, and checks pure constraints (§6, p. XII).
5. Translate the final data implication to integer arithmetic with uninterpreted functions and discharge it with an SMT solver (§7, p. XIII).

The BST loop example applies the generated `bsthole` composition lemma, unfolds `bsthole` twice, matches nodes, instantiates `M1` with `M2`, and proves the remaining multiset constraints (§2, pp. IV–V). Theorem 5 proves soundness: if the procedure finds a substitution witnessing the judgment, the original entailment is valid; termination follows because each lemma application removes at least one matched spatial atom (§6, p. XIII).

Verus form. Inference: generate a proof-search plan that first matches ghost heap fragments, then invokes a generated lemma, then discharges arithmetic with Verus assertions/lemmas. Verus's SMT backend can handle many arithmetic obligations, but a custom spatial matcher and lemma registry would be needed. Inference: keep the deterministic order as an agent workflow heuristic; it is not itself a Verus proof unless every generated step is checked.

## technique 6: normalize separation logic and use SMT for data constraints

The implementation extends `spen`. It first saturates formulas with equalities and disequalities implied by separating conjunction using Boolean abstractions. It then translates data entailments to satisfiability problems over integers with uninterpreted functions and calls an SMT solver (§7, p. XIII). The spatial phase is responsible for heap shape; the SMT phase is responsible for multisets, order, sizes, and arithmetic.

This split is useful when spatial matching is syntactic but content constraints are not. In the sorted-list example, matching two cells generates `M = {v1,v2}` and the final SMT obligation proves `v2 ∈ M` (§6, pp. XII–XIII).

Verus form. Inference: represent content measures as sequences, sets, or ghost maps and prove arithmetic/set lemmas in Verus. Use solver-friendly definitions and expose equalities with `assert`; do not assume Verus automatically supports the paper's multiset theory. Inference: an external SMT result must be imported only through a proof-producing or replayed certificate if it is to remain inside VL's auditable boundary.

## evidence and limits

RDBI contains iterative `search`, `insert`, and `delete` procedures over sorted lists, BSTs, AVL trees, and red-black trees. Table 2 reports 4 sorted-list search VCs at 1.108 s of spen time plus 0.10 s SMT time; 25 BST-delete VCs at 8.412 s plus 0.58 s SMT; 22 AVL-insert VCs at 6.393 s plus 1.33 s SMT; and 21 RBT-insert VCs at 6.962 s plus 2.53 s SMT (Table 2, p. XIV). The denominator is the number of verification conditions in each row, and the machine is 2.53 GHz with 2 GB under Linux in VirtualBox (§7, p. XIV). The reported timings include all VCs for a function; the SMT column excludes spen's own processing (§7, p. XIV).

SL-COMP'14 contains 16 nested-list VCs, 4 two-level skip-list VCs, and 10 three-level skip-list VCs. spen takes 4.428 s, 1.629 s, and 3.858 s respectively, while the comparison `spen-TA` takes 4.382 s, 1.636 s, and 3.485 s (Table 3, p. XIV). The paper says these near-equal times show robustness, not a universal speedup.

Proved: Theorem 1's syntactic criterion implies semantic compositionality; Theorems 2–4 justify the generated lemma classes; Theorem 5 establishes entailment soundness and termination under its restrictions. Measured: the benchmark VC counts, lemma applications, SMT calls, and wall-clock times above. Trusted or assumed: the least-fixed-point semantics of the inductive predicates, the correctness of the SMT solver, normalization, the finite generated-lemma set, and the restriction that RHS existential variables are data variables. The method is incomplete: the paper explicitly says its derived lemma classes “may not cover all the lemmas for a given set of inductive predicates.” (§5.3, p. X)

Inference: the threat to agent-written verified Rust is moderate and specific. Automatic generation can remove repetitive list/tree lemmas, but it cannot choose a suitable predicate representation when the intended invariant is absent. Inference: wrong ghost content parameters can make a generated proof succeed for a specification that does not capture the implementation's real property. Inference: the strongest reusable component for VL is a predicate-to-lemma compiler with proof replay, not an untrusted text generator.

## what VL should not redo

The paper already provides a principled way to make inductive predicates compositional, four generated lemma classes, a deterministic matching/slicing strategy, a soundness argument, and benchmark evidence across balanced trees and lists. VL should not reimplement these as ad hoc proof templates. It should adapt them to Verus ghost predicates, ownership, Rust pointer APIs, and proof-producing arithmetic/set reasoning, while preserving the paper's explicit incompleteness and domain restrictions.

## techniques for the catalog

- compositional predicate design — expose source and hole data/location ports so composition follows from syntax
- completion lemma generation — specialize a partial predicate at endpoint constants to connect it to a complete structure
- stronger-predicate generation — derive weakening and composition lemmas from rule-by-rule pure implication
- static-parameter contraction — replace compatible static parameters with hole parameters through a generated substitution
- deterministic spatial entailment — apply matching, lemma, and slicing rules in a fixed terminating order
- SMT data discharge — separate heap-shape matching from arithmetic, multiset, and size constraints
- proof-producing lemma compiler — generate finite lemma sets whose applications are checked by a sound entailment procedure

Checked 2026-10-15 against the paper by a Codex agent for on_automated_lemma_generation_for_separa_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
