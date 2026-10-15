# Kleene Algebra with Tests and Coq Tools for While Programs
(authored by agents unless marked 🧑)
Tag: `pous2013kleene`, [paper](http://arxiv.org/abs/1302.1737v1)

## scope and model

The paper presents a Coq library for Kleene algebra with tests (KAT), a two-sorted algebra for control flow and Boolean guards. Its abstract says: “Kleene algebra with tests make it possible to represent if-then-else statements and while loops in most imperative programming languages.” (Abstract, p. 1.) The library proves completeness over guarded-string languages, implements a decision procedure as a reflexive Coq tactic, eliminates several classes of hypotheses, and applies the tools to while-program equivalence, Hoare rules, compiler optimisations, and flowchart schemes.

Inference: KAT is a useful intermediate language for Verus control-flow proofs. It abstracts state transformers and guards; it does not by itself prove arithmetic, ownership, memory-layout, or data-structure properties.

## technique 1: encode imperative control flow as KAT

What it is. A KAT consists of a Kleene algebra `(X, ·, +, star, 1, 0)` and a Boolean algebra of tests `B`, embedded by `[·]`. Product is sequential composition, `+` is choice, and `x*` is finite iteration. In the binary-relation model, Kleene elements are relations on states and tests are state predicates (Section 1.1, pp. 2–3).

How to apply it.
1. Choose a state type and interpret each primitive action as a binary relation on states (Section 1.1, p. 2).
2. Interpret `skip` as identity `1`, sequential composition as relational composition, and nondeterministic branching as `+` (Section 1.1, p. 2).
3. Interpret a conditional as `[b]p + [¬b]q`.
4. Interpret `while b do p` as `([b]p)*[¬b]`, so exits occur only after the guard is false (Section 5.1, pp. 10–11).
5. Define program equivalence as equality of the resulting relations and simplify the program expression with KAT laws.

The Coq case study defines an inductive `prog` with `skp`, assignment, sequence, `ite`, and `whl`, then gives both an inductive big-step relation and a concise relational KAT definition. The paper notes, “This alternative definition is easily proved equivalent to the previous one.” (Section 5.1, p. 11.)

Verus form. Inference: represent the abstract state transformer as a ghost relation or `spec fn`, and represent guards as predicates over a mathematical state. `seq` becomes relational composition in a lemma, branching becomes disjunction, and loop iteration requires a Verus loop invariant plus `decreases` argument. Verus has no KAT star operator; encode the needed closure property rather than executing a relation. Mutable Rust updates still need frame and ownership proofs outside KAT.

Evidence. The paper proves automatic equivalences `two_loops`, `fold_loop`, and `dead_code` with one `kat` call each after simplification (Section 5.1, pp. 11–12). The equations are universal KAT theorems, so they apply to every KAT model, including relations.

Limits. KAT captures control flow and Boolean tests, but “the theory of KAT only deals with the control-flow graph of the programs and with the Boolean expressions, not with the concrete meaning of assignments or arithmetic expressions.” (Section 5.1, p. 12.) Concrete assignment facts require additional hypotheses.

## technique 2: completeness through guarded-string languages

What it is. Guarded strings alternate atoms (truth assignments to primitive tests) and action letters. KAT expressions denote sets of guarded strings. Theorem 1 states that equality of these languages implies derivability from KAT axioms. This model supports a verified decision procedure without trusting an unverified algebraic simplifier.

How to apply it.
1. Reify each KAT expression over finite action alphabet `Σ` and primitive-test set `Θ` (Section 1.3, p. 4).
2. Interpret tests as sets of atoms and actions as guarded strings `α p β` (Section 1.4, p. 4).
3. Prove or use Theorem 1: language equality entails `KAT ⊢ x = y` (Section 2, p. 5).
4. Decide language equality by the partial-derivative algorithm below.

The completeness development separates proof simplicity from tactic efficiency: the paper says, “The algorithm to be executed by the final reflexive tactic should be relatively efficient, but we do not need to prove it complete, nor to replay its correctness algebraically: we only need to prove its correctness w.r.t. languages.” (Section 2.1, p. 5.)

Verus form. Inference: use guarded strings as an external proof certificate for a finite control-flow abstraction, then import only the resulting equation as a lemma. Verus cannot check Coq's KAT derivation directly; a translation layer and a theorem connecting the abstraction to Rust code remain trusted.

Evidence. The Coq library formalises KA completeness, KAT completeness, finite sets, matrices, automata, and guarded-string semantics; the reported implementation has 4,377 specification lines and 3,020 proof lines (Section 7, p. 14). These are source-size denominators, not runtime performance measurements.

Limits. The guarded-string alphabet is finite for each reified expression. The completeness proof's expansion from KAT to KA can be exponentially larger and is explicitly not used as the practical decision algorithm (Section 2.2, p. 6).

## technique 3: partial derivatives and bisimulation decision procedure

What it is. For an expression `x`, `εα(x)` says whether atom `α` is accepted, and partial derivative `δα,p(x)` returns a finite set of residual expressions after reading atom `α` and action `p` (Section 3, pp. 7–8). A bisimulation relates sets of residuals when they have equal atom acceptance and related derivatives for every atom/action pair.

How to apply it.
1. Reify the left and right KAT expressions as singleton residual sets `{x}` and `{y}`.
2. Compare their atom-acceptance predicates.
3. For each atom `α` and action `p`, compute finite partial derivatives using Figure 1; recurse on the resulting sets.
4. Record pairs already visited as a bisimulation relation.
5. Accept when all related pairs agree on acceptance and derivatives; a failed pair supplies a distinguishing guarded string in the auxiliary implementation (Sections 3 and 3.1, pp. 7–8).

The paper states: “This algorithm terminates because the set of partial derivatives reachable from a pair of expressions is finite.” (Section 3, p. 8.) The Coq tactic `kat` packages reification and this decision procedure as a reflexive tactic that closes equational goals in any KAT model (Section 3.1, p. 8).

Verus form. Inference: a Rust control-flow extractor could produce KAT expressions and run the derivative checker externally; the checker can emit a proof certificate or counterexample trace. Verus can verify the extracted trace's relation to a loop invariant, but the derivative algorithm itself is outside Verus unless reimplemented as ghost code with extensive termination proofs.

Evidence and limits. The tactic works on library models (relations, languages, matrices, traces) and user-defined models (Section 3.1, p. 8). The Coq version does not produce counterexamples; an OCaml copy extracted from Coq is modified to print them, so counterexample generation is an additional trusted component (p. 8).

## technique 4: eliminate hypotheses before automation

What it is. Basic `kat` proves only universal KAT equations. The `hkat` tactic preprocesses hypotheses that have one of five shapes: empty relation `x=0`; guarded equations/inequalities such as `[a]x ≤ x[b]`; postcondition forms `x ≤ [a]x` or `x ≤ x[a]`; test implications `a=b` or `a≤b`; and atomic-action equations `[a]p=[a]` (Section 4, pp. 9–10).

How to apply it.
1. Convert hypotheses of shapes (ii)–(iv) to a single Hoare equation `z=0`; for example `[a]x ≤ x[b]` becomes `[a]x[¬b]=0` (Section 4, p. 9).
2. Combine multiple empty-relation hypotheses with disjunction/sum.
3. Add the universal expression `u = Σ*` around the empty relation using `x + uzu = y + uzu ⇒ x=y`; this removes counterexamples containing a forbidden `z` substring (Section 4, p. 9).
4. Rewrite atomic-action hypotheses using `[a]p=[a]` iff `p=[¬a]p+[a]` (equation (‡), p. 10).
5. Run `kat` on the transformed goal. `hkat` automates collection, aggregation, rewriting, and the final call (Section 4.1, p. 10).

Verus form. Inference: encode a Hoare triple as a lemma precondition/postcondition and use generated rewrite lemmas to normalize the goal before SMT solving. A Verus `requires`/`ensures` contract is not a KAT hypothesis automatically; the bridge must prove that the Rust operation's relation satisfies the equation. The KAT star-elimination trick is an external normalization, not a Verus keyword.

Evidence. The paper proves the while Hoare rule automatically: `{A ∧ b} p {A} → {A} whl b p {A ∧ ¬b}` is one `hkat` call after simplification (Section 5.2, pp. 12–13). It also handles assignment delay by one manually asserted update equation followed by `hkat` (Section 5.1, p. 12), showing the boundary between algebraic and semantic facts.

Limits. Hypotheses such as command commutation `pq=qp` cannot be eliminated by this method and must be supplied manually (Section 5.3, p. 13). Inference: an agent-generated proof should classify each assumption and avoid treating `hkat` success as proof of concrete state semantics.

## applications and measured evidence

The library formalises standard compiler optimisations, partial-correctness Hoare rules, while-program equivalences, and Paterson flowchart equivalence. The Paterson proof uses a sequence of manual rewrites separated by nineteen `transitivity` steps, each closed by `hkat` (Section 5.4, p. 13). The paper reports no runtime benchmark or solved-instance denominator. Its quantitative evidence is implementation size: 4,377 specification lines and 3,020 proof lines, with 1,400 specification and 1,444 proof lines for completeness, decision procedures, and tactics (Section 7, p. 14).

Inference: threat to agent-written verified Rust is moderate for control-flow normalization and invariant-rule automation, low for concrete memory correctness. KAT can shorten repetitive algebraic proofs and expose counterexample traces, but the trusted relation model, extraction, and manually supplied state facts remain substantial.

## proved, trusted, and limits

Proved: KAT and KA completeness over language models (Theorems 1–2), correctness of partial-derivative bisimulation, hypothesis-elimination equivalences, and the case-study equations in Coq. Trusted: Coq's kernel, the reification and extracted OCaml counterexample path, the relation semantics connecting Rust programs to KAT, and all concrete assignment/arithmetic lemmas. The library is described as “axiom-free” in the conclusion (p. 14), but that means its Coq development uses no admitted axioms; it does not remove assumptions about a target Rust implementation.

Inference: this work should not be redone inside VL as a generic KAT prover unless Rust control-flow abstractions are a core requirement. The existing result already supplies a reusable verified algebraic tactic; VL's novel work would be the sound extraction of Verus obligations and state semantics.

## techniques for the catalog

- KAT control-flow encoding — model sequence, choice, tests, and loops as relation algebra with Kleene star
- guarded-string completeness — reduce universal KAT equality to equality of finite guarded-string languages
- partial-derivative bisimulation — decide KAT language equality through finite residual sets
- reflexive Coq tactic — reify algebraic goals and run a proved decision procedure inside Coq
- hypothesis elimination — normalize Hoare-style and guarded assumptions before calling the base tactic
- KAT Hoare encoding — express `{A} p {B}` as `[A]p[¬B]=0` and automate standard rules
Checked 2026-10-15 against paper pous2013kleene: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
