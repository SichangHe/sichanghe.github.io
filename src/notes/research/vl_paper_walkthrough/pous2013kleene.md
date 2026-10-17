# Kleene Algebra with Tests and Coq Tools for While Programs
(authored by agents unless marked 🧑)
Tag: `pous2013kleene`, [paper](http://arxiv.org/abs/1302.1737v1)

## scope and model

The paper presents a Coq library for Kleene algebra with tests (KAT), a two-sorted algebra for control flow and Boolean guards. Its abstract says: “Kleene algebra with tests make it possible to represent if-then-else statements and while loops in most imperative programming languages.” (Abstract, p. 1.) The library proves completeness over guarded-string languages, implements a decision procedure as a reflexive Coq tactic, eliminates several classes of hypotheses, and applies the tools to while-program equivalence, Hoare rules, compiler optimisations, and flowchart schemes.

Inference: KAT is a useful intermediate language for Verus control-flow proofs. It abstracts state transformers and guards; it does not by itself prove arithmetic, ownership, memory-layout, or data-structure properties.

## technique 1: encode imperative control flow as KAT

What it is. A KAT consists of a Kleene algebra `(X, ·, +, star, 1, 0)` and a Boolean algebra of tests `B`, embedded by `[·]`. Product is sequential composition, `+` is choice, and `x*` is finite iteration. In the binary-relation model, Kleene elements are relations on states and tests are state predicates (Section 1.1, pp. 2–3).

How to apply it.
1. Choose a state type and interpret each primitive action as a binary relation on states; the paper assumes "a type state of states, a type loc of memory locations, and an update function" (Section 5.1, p. 10; binary-relation model in Section 1.1, pp. 2–3).
2. Interpret `skip` as identity `1` and sequential composition as relational composition (Section 5.1, p. 11); `+` is union of relations (Section 1.1, p. 3).
3. Interpret a conditional as `[b]p + [¬b]q` (Section 5.1, p. 11).
4. Interpret `while b do p` as `([b]p)*[¬b]`; the paper says "We make sure one cannot exit the loop before the condition gets false by post-guarding the iteration with the negation of this test." (Section 5.1, p. 11).
5. Define program equivalence as equality of the resulting relations and simplify the program expression with KAT laws.

The Coq case study defines an inductive `prog` with `skp`, `aff` (assignment), `seq`, `ite`, and `whl` (p. 10), then gives both an inductive big-step relation and a concise relational KAT definition (p. 11). The paper notes, “This alternative definition is easily proved equivalent to the previous one.” (Section 5.1, p. 11.)

Verus form. Inference: represent the abstract state transformer as a ghost relation or `spec fn`, and represent guards as predicates over a mathematical state. `seq` becomes relational composition in a lemma, branching becomes disjunction, and loop iteration requires a Verus loop invariant plus `decreases` argument. Verus has no KAT star operator; encode the needed closure property rather than executing a relation. Mutable Rust updates still need frame and ownership proofs outside KAT.

Evidence. The paper proves the equivalences `two_loops`, `fold_loop`, and `dead_code` with `simpl. kat.` each (Section 5.1, pp. 11–12). Inference: since `kat` proves only equations of the equational theory of KAT (p. 8), these equations hold in every KAT model, including relations.

The relational model needs care: "one needs either to restrict to decidable predicates ... or to assume the law of excluded middle: B must be a Boolean algebra, so that negation has to be an involution" (Section 1.1, p. 3). The choice is left to the library user.

Limits. KAT captures control flow and Boolean tests, but “the theory of KAT only deals with the control-flow graph of the programs and with the Boolean expressions, not with the concrete meaning of assignments or arithmetic expressions.” (Section 5.1, p. 12.) Concrete assignment facts require additional hypotheses.

## technique 2: completeness through guarded-string languages

What it is. Guarded strings alternate atoms (truth assignments to primitive tests) and action letters. KAT expressions denote sets of guarded strings. Theorem 1 states that equality of these languages implies derivability from KAT axioms. The paper uses this model to build its reflexive tactic: "it allows us to prove (in)equations in arbitrary models of KAT, by resorting to an algorithm deciding guarded string language equivalence" (Section 2, p. 5).

How to apply it.
1. Reify each KAT expression over a set of letters `Σ` and a finite set `Θ` of primitive tests (Section 1.3, p. 4).
2. Interpret tests as sets of atoms and actions as guarded strings `α p β` (Section 1.4, p. 4).
3. Prove or use Theorem 1: language equality entails `KAT ⊢ x = y` (Section 2, p. 5).
4. Decide language equality by the partial-derivative algorithm below.

The completeness development separates proof simplicity from tactic efficiency: the paper says, “the algorithm to be executed by the final reflexive tactic should be relatively efficient, but we do not need to prove it complete, nor to replay its correctness algebraically: we only need to prove its correctness w.r.t. languages, which is much easier.” (Section 2.1, p. 5.)

Verus form. Inference: use guarded strings as an external proof certificate for a finite control-flow abstraction, then import only the resulting equation as a lemma. Verus cannot check Coq's KAT derivation directly; a translation layer and a theorem connecting the abstraction to Rust code remain trusted.

Evidence. The Coq library formalises KA completeness, KAT completeness, finite sets, matrices, automata, and guarded-string semantics; the reported implementation has 4377 lines of specifications and 3020 lines of proofs according to coqwc (Section 7, p. 15). The paper also reports KA completeness at 124 lines of specifications and 119 of proofs (Section 2.1, p. 6), and KAT completeness, once KA completeness is proved, at 278 and 360 (Section 2.2, p. 7). These are source-size figures, not runtime measurements.

Limits. The completeness proof uses Kozen and Smith's expansion function, which "produces expressions that are almost systematically exponentially larger than the given ones"; the paper defers actual computation to a different algorithm (Section 2.2, p. 6). The paper does not formalise the completeness of KAT over relational models (Section 1.1, p. 3).

## technique 3: partial derivatives and bisimulation decision procedure

What it is. For an expression `x`, the Boolean function `εα(x)` indicates whether `x` accepts the single atom `α`, and partial derivative `δ'α,p(x)` returns a finite set of expressions after reading atom `α` and letter `p` (Section 3, pp. 7–8; Fig. 1, p. 8). A bisimulation relates sets of residuals when they have equal atom acceptance and related derivatives for every atom/action pair.

How to apply it.
1. Reify the left and right KAT expressions as singleton residual sets `{x}` and `{y}`.
2. Compare their atom-acceptance predicates.
3. For each atom `α` and action `p`, compute finite partial derivatives using Figure 1; recurse on the resulting sets.
4. Record pairs already visited as a bisimulation relation.
5. Accept when all related pairs agree on acceptance and derivatives; on failure, the auxiliary OCaml implementation prints a guarded string as counter-example (Section 3.1, p. 9).

The paper states: “This algorithm terminates because the set of partial derivatives reachable from a pair of expressions is finite (we do not need to formalise this fact since we just need the correctness of this algorithm).” (Section 3, p. 8.) The Coq tactic `kat` packs these ingredients into a reflexive tactic that closes "automatically any goal which belongs to the equational theory of KAT" (Section 3.1, pp. 8–9).

Verus form. Inference: a Rust control-flow extractor could produce KAT expressions and run the derivative checker externally; the checker can emit a proof certificate or counterexample trace. Verus can verify the extracted trace's relation to a loop invariant, but the derivative algorithm itself is outside Verus unless reimplemented as ghost code with extensive termination proofs.

Evidence and limits. The tactic works on library models (relations, languages, matrices, traces) and user-declared models (Section 3.1, p. 9). The Coq algorithm "does not produce a counter-example in case of failure"; the paper runs "an OCaml copy of the algorithm first (extracted from Coq, and modified by hand to produce counter-examples)", which makes the tactic faster in case of failure (p. 9). Inference: the OCaml copy only affects failure reporting, so a counter-example from it would still need independent checking before use as evidence in another system.

## technique 4: eliminate hypotheses before automation

What it is. Basic `kat` proves only universal KAT equations. The `hkat` tactic preprocesses hypotheses that have one of five shapes: empty relation `x=0`; guarded equations/inequalities such as `[a]x ≤ x[b]`; postcondition forms `x ≤ [a]x` or `x ≤ x[a]`; test implications `a=b` or `a≤b`; and atomic-action equations `[a]p=[a]` (Section 4, pp. 9–10).

How to apply it.
1. Convert hypotheses of shapes (ii)–(iv) to a single Hoare equation `z=0`; for example `[a]x ≤ x[b]` becomes `[a]x[¬b]=0` (Section 4, p. 9).
2. Combine multiple empty-relation hypotheses with disjunction/sum.
3. Add the universal expression `u = Σ*` around the empty relation using `x + uzu = y + uzu ⇒ x=y`; this removes counterexamples containing a forbidden `z` substring (Section 4, p. 9).
4. Rewrite atomic-action hypotheses using `[a]p=[a]` iff `p=[¬a]p+[a]` (equation (‡), p. 10).
5. Run `kat` on the transformed goal. `hkat` automates collection, aggregation, rewriting, and the final call (Section 4.1, p. 10).

Verus form. Inference: encode a Hoare triple as a lemma precondition/postcondition and use generated rewrite lemmas to normalize the goal before SMT solving. A Verus `requires`/`ensures` contract is not a KAT hypothesis automatically; the bridge must prove that the Rust operation's relation satisfies the equation. The KAT star-elimination trick is an external normalization, not a Verus keyword.

Evidence. The paper proves the while Hoare rule automatically: `{A ∧ b} p {A} → {A} whl b p {A ∧ ¬b}` is `simpl. hkat.` (Section 5.2, p. 12). It also handles assignment delay by one manually asserted update equation followed by `hkat` (Section 5.1, p. 12), showing the boundary between algebraic and semantic facts.

Limits. Hypotheses of the form `pq=qp` ("the instructions p and q commute") are typically those that cannot be eliminated and "have to be used manually" (Section 5.3, p. 13). The paper notes that completeness of the elimination method is a meta-theorem [15] that it does not formalise (Section 4.1, p. 10). Inference: an agent-generated proof should classify each assumption and avoid treating `hkat` success as proof of concrete state semantics.

## applications and measured evidence

The paper formalises Kozen and Patron's equational proofs of standard compiler optimisations: "Most of them can actually be solved instantaneously, by a simple call to the hkat tactic", and the remaining few took "three to four lines proofs" (Section 5.3, p. 13). It also covers partial-correctness Hoare rules, while-program equivalences, and Paterson's flowchart equivalence, formalised "in three rather sparse screens" versus about six pages in Angus and Kozen's paper proof (Section 5.4, p. 13). The proof skeleton in Fig. 2 (p. 14) shows `transitivity` steps y_1 through y_19, each closed by `hkat`, separated by manual rewriting. The paper reports no runtime benchmark or solved-instance count. Its quantitative evidence is source size: 4377 lines of specifications and 3020 lines of proofs, with 1400 and 1444 for completeness, decision procedures, and tactics (Section 7, p. 15).

Inference: threat to agent-written verified Rust is moderate for control-flow normalization and invariant-rule automation, low for concrete memory correctness. KAT can shorten repetitive algebraic proofs and expose counterexample traces, but the trusted relation model, extraction, and manually supplied state facts remain substantial.

## proved, trusted, and limits

Proved in Coq: KAT and KA completeness over language models (Theorems 1–2), correctness of the partial-derivative bisimulation algorithm, the equivalences used to eliminate hypotheses, and the case-study equations. Not formalised, by the paper's own statements: termination of the algorithm (p. 8), completeness of the hypothesis-elimination method (p. 10), and completeness of KAT over relational models (p. 3). Inference: trusted when applied to Rust are Coq's kernel, the OCaml reification code, the relation semantics connecting Rust programs to KAT, and all concrete assignment/arithmetic lemmas. The library is described as "documented and axiom-free" (Section 7, p. 15); Inference: that is a statement about the Coq development, and it does not remove assumptions about a target Rust implementation.

Inference: this work should not be redone inside VL as a generic KAT prover unless Rust control-flow abstractions are a core requirement. The existing result already supplies a reusable verified algebraic tactic; VL's novel work would be the sound extraction of Verus obligations and state semantics.

## techniques for the catalog

- KAT control-flow encoding — model sequence, choice, tests, and loops as relation algebra with Kleene star
- guarded-string completeness — reduce universal KAT equality to equality of finite guarded-string languages
- partial-derivative bisimulation — decide KAT language equality through finite residual sets
- reflexive Coq tactic — reify algebraic goals and run a proved decision procedure inside Coq
- hypothesis elimination — normalize Hoare-style and guarded assumptions before calling the base tactic
- KAT Hoare encoding — express `{A} p {B}` as `[A]p[¬B]=0` and automate standard rules
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Therefore, we can aggregate all hypotheses of shape (i-iv) into a single one (of shape (i)), and use the above technique just once."): I read the whole paper text (pp. 1-19 including appendices) and the whole study, and checked every quotation, line count, section and page reference, technique step, and the tag and arXiv link (arXiv:1302.1737v1 appears in the paper text). I changed: page references (Section 3.1 counter-example material is p. 9, Section 7 numbers and "axiom-free" are p. 15, Fig. 2 is p. 14, Section 5.2 is p. 12 only); one quotation that had altered capitalisation and cut mid-sentence; the claim that Σ is finite (the paper says only Θ is finite); the earlier hedge about exponentially larger expansions to the paper's wording "almost systematically exponentially larger"; the claim that the OCaml counter-example path is trusted (now an Inference, since the paper only says the OCaml copy is run first for failure reporting); the "no admitted axioms" gloss on "axiom-free" (now an Inference); added items the paper states it does not formalise; marked unsupported statements as Inference. I did not check the Verus-related Inference paragraphs against anything outside the paper, the cited external works, the figure drawings in Appendix A, or that the glyph for the acceptance function is ε in the PDF (the text extraction drops it).
