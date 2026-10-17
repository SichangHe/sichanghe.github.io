# Developments in Formal Proofs
(authored by agents unless marked 🧑)
Tag: `hales2014developments`, [paper](https://doi.org/10.48550/arxiv.1408.6474)

## scope and evidence
Hales's Bourbaki report surveys three developments: a trustworthy HOL Light foundation, the Coq formalization of the Feit–Thompson Odd Order theorem, and automation in proof assistants. The paper defines the object of study directly: “A formal proof is one that has been verified from first principles (generally by computer)” (opening, p. 1). It is a survey, so most evidence is reported from projects rather than a new controlled experiment. The automation rates are explicit: “Fully automated procedures can prove 40% of the theorems in the Mizar math library, 47% of the HOL Light/Flyspeck libraries, with comparable rates in Isabelle” (Sec. 3.1, p. 12). The denominators are theorems in each named library; no theorem count is supplied in this paper, and the rates are not a benchmark of Verus.

The survey's appendix lists formal statements for the Four-Color theorem, Prime Number theorem, Brouwer fixed point theorem, central limit theorem, and Kepler conjecture (Appendix 5, pp. 16–17). It does not claim that the appendix proves these results anew; it points to existing formalizations. Inference: the techniques below are transferable engineering patterns, while the mathematical subject matter is not itself a Verus systems recipe.

## technique 1: small typed kernel with a theorem datatype

What it is. HOL Light is based on a simply typed λ-calculus (Sec. 1.1), and the paper says its ML type system prevents theorems from being built except through a small kernel (Sec. 1.3). The paper gives the kernel datatypes (condensed here from its seven-line listing, Sec. 1.4, p. 5):

```
type hol_type = Tyvar of string | Tyapp of string * hol_type list
type term = Var of string * hol_type | Const of string * hol_type | Comb of term * term | Abs of term * term
type thm = Sequent of (term list * term)
```

The key engineering claim is: “The strict type system of the language ML prevents the construction of any theorems except through a carefully secured kernel that expresses the axioms and rules of inference” (Sec. 1.3, p. 4). The kernel is “only about 400 lines of computer code” (Sec. 1.4, p. 4), a reported size rather than an independently measured result.

How to apply it (Inference, derived from Sec. 1.3–1.4; the paper gives no step list).
1. Define typed terms, types, and sequents as data, with no public constructor that bypasses checking.
2. Encode axioms and inference rules in a small kernel.
3. Make proof-producing operations return only the abstract theorem datatype.
4. Have every high-level tactic produce a kernel-checkable theorem rather than trusted output.
5. Audit or formally verify the kernel itself; the paper reports a model of HOL built in HOL Light and independent rechecking in HOL Zero and HOL4 (Sec. 1.4, pp. 4–5).

Verus form (Inference). Put executable code behind a narrow verified API and represent proof facts with ghost data and `proof fn`s. Use `requires`/`ensures` to prevent callers from manufacturing a fact; expose only lemmas whose postconditions are proved. Verus's verifier and Rust compiler remain trusted components, unlike the paper's specifically typed `thm` datatype.

Evidence and assumptions. The paper gives a proof sketch of HOL consistency relative to ZFC (Theorem 1) by interpreting types as sets and checking axioms and inference rules (Sec. 1.2, pp. 2–4). It also says the kernel code was formally verified “using the HOL Light proof assistant itself (extended by a large cardinal)” (Sec. 1.4, p. 5). The self-hosting proof has a stated foundational assumption: the added large-cardinal axiom and the correctness of the surrounding implementation.

## technique 2: close the trust chain to machine code

What it is. A verified kernel is not the whole execution story. The report says: “The reliability of the proof assistant ultimately rests on the entire computer environment in which the software operates, including the semantics of programming languages, compilers, operating systems, and hardware” (Sec. 1.5, p. 5). CakeML supplies a mathematically specified operational semantics, and a verified compiler has been constructed for CakeML, which the paper says “brings us close to end-to-end verification of HOL Light” (Sec. 1.5, p. 6).

How to apply it (Inference, derived from Sec. 1.5–1.6; the paper gives no step list).
1. Specify the implementation language semantics (Sec. 1.5).
2. Verify the proof-kernel implementation against those semantics.
3. Compile with a verified compiler whose correctness theorem relates source and target behavior.
4. Include runtime and hardware assumptions in the trust statement.
5. State residual assumptions explicitly; the report warns that “Proofs of correctness are made relative to mathematically precise idealized descriptions of things rather than the physical objects themselves” (Sec. 1.6, p. 6).

Verus form (Inference). A Verus project can document a trust boundary around Verus, Z3, Rust compilation, libraries, hardware, and unsafe or foreign code, then verify a small wrapper or model at each boundary. This is a methodology rather than a built-in Verus feature.

## technique 3: constructive refactoring of a classical proof

What it is. The Coq Odd Order formalization translates a classical mathematical proof into constructive type theory. Hales lists six concrete transformations (Sec. 2.2, pp. 9–10): replace minimal-counterexample contradiction with induction; replace complex vector spaces and conjugation with explicitly constructed algebraic closures and real subfields; use a decision procedure for algebraically closed fields to justify a constructive test for simplicity of a submodule, giving a constructive definition of the socle; mark classical intermediate results with `classically φ`; use finite types with decidable equality to recover function extensionality and quotient groups; and use an ambient finite group to avoid many separate group types and embeddings.

How to apply it (Inference, derived from Sec. 2.2; the paper gives no step list).
1. Identify every use of excluded middle, contradiction, choice, quotient, or noncomputable construction.
2. Replace contradiction with induction on a well-founded measure where possible (Sec. 2.2, item 1).
3. Define explicit constructive carriers and algorithms for algebraic objects (item 2).
4. Isolate unavoidable classical facts behind a predicate such as `classically φ` and prevent them from contaminating the final theorem (item 4).
5. Add decidable equality or finite-type structure when it enables required extensionality or quotient operations (item 5).
6. Simplify proof APIs with a common ambient structure when repeated embeddings create overhead (item 6).

Verus form (Inference). In Verus, replace non-terminating or choice-based ghost definitions with `spec fn`s whose termination and domains are explicit; use inductive proofs and finite domains rather than assuming general classical lemmas. Verus's specification language is not Coq's dependent type theory, so this translation is an analogy.

Evidence and limits. The paper reports a formally verified Odd Order theorem and the supporting abstract-algebra libraries, but gives no line count or proof-time denominator. The library work includes “all the necessary background material described at the beginning of this section” (Sec. 2.3, p. 10), which is a scope claim, not a completeness proof for all algebra.

## technique 4: library engineering and notation inference

What it is. Large formal developments move implicit mathematical knowledge into reusable libraries. Hales notes that the Coq project had to teach the computer expected operations such as inferring the binary operation in `g * h` and treating the intersection of two subgroups as again a subgroup (Sec. 2.3, p. 10). Inference: the technique is to build general algebraic interfaces once, then instantiate them in the target theorem.

How to apply it (Inference; the paper only describes the library effort, Sec. 2.3). Define reusable structures and lemmas; give operations shared interfaces; prove closure lemmas early; and make application proofs call these library facts instead of reopening low-level definitions.

Verus form (Inference). Use `struct`s, `spec fn`s, and proof lemmas for reusable invariants such as map ordering, ownership, or state-machine transitions. Keep executable methods thin and put algebraic facts in proof modules. Coq's mechanisms for this inference do not carry over literally.

## technique 5: proof-producing premise selection (sledgehammer)

What it is. First-order provers can search a large theorem library, while the proof assistant reconstructs and checks the resulting proof. The paper describes a refinement in which “an automated heuristic procedure selects a few hundred theorems deemed to be the most relevant and ships those to the theorem prover” (Sec. 3.1, p. 12). The paper adds that “machine learning algorithms can be trained to do this effectively” (Sec. 3.1, p. 12). The convex-hull example selected three facts—convex hull subset of affine hull, affine hull measure zero, and subset preservation—and generated the logical glue automatically (Sec. 3.1, p. 12).

How to apply it (Inference, derived from Sec. 3.1; the paper gives no step list).
1. Index proved lemmas with names, types, and conclusion symbols.
2. Given a goal, rank candidate premises by syntactic or learned relevance.
3. Send only a bounded candidate set to a refutation-complete prover.
4. Reconstruct the proof inside the trusted assistant.
5. Fail quickly and document the selected step; the report warns that automation should take a “fully-documented circumscribed step forward” when it succeeds (Sec. 3, p. 11).

Verus form (Inference). A Verus workflow can expose a curated set of `broadcast` or explicitly called lemmas to the SMT solver and log which facts discharge each goal. Verus does not provide the paper's sledgehammer pipeline as a general theorem-library service; adding one would require an external index and proof replay.

Evidence and limits. The 40% Mizar and 47% HOL Light/Flyspeck rates above are the paper's reported library-level denominators. Inference: by subtraction, 60% and 53% respectively are not proved by these fully automated procedures; no cross-library normalization is provided.

## technique 6: SAT/SMT reduction with formal replay

What it is. Encode a finite mathematical case analysis as a quantifier-free SMT problem, obtain unsatisfiability or a model, and transcribe the result into a proof assistant. In the Odd Order proof, a 4×2 matrix block is enumerated; Théry “programmed the claim into a quantifier-free problem with uninterpreted symbols in an SMT solver. The SMT solution was then transcribed into a formal proof in Coq” (Sec. 3.2, p. 13).

How to apply it (Inference, generalized from the Odd Order example in Sec. 3.2).
1. Reduce symmetry to a finite representative case, here arbitrary 4×2 submatrices (Sec. 3.2).
2. Encode the remaining constraints as quantifier-free Boolean/theory predicates.
3. Ask an SMT solver for satisfiability or unsatisfiability.
4. Turn the result into proof-assistant terms and replay/check them in the kernel.

Verus form (Inference). Use Verus arithmetic and bit-vector specifications to state the finite case, then prove the solver-generated fact with a `proof fn` or explicit `assert` chain. Solver output remains evidence only when Verus checks the resulting proof obligation.

## technique 7: proof-producing algebraic automation

What it is. The paper says a system of polynomial equalities and inequalities that holds in every integral domain of characteristic zero “can be transformed into a Gröbner basis problem over Q.” The report says: “Buchberger’s algorithm has been implemented in many of the major proof assistants” and says one line of code suffices to generate a formal proof of an isogeny of elliptic curves over R (Sec. 3.3, p. 13). It also mentions “the certification of linear programs and nonlinear inequalities over the real numbers” (Sec. 3.3, p. 14).

Verus form (Inference). For polynomial invariants, state the identity as a `spec fn` relation and prove normalization lemmas or call an available arithmetic tactic; Verus has no guarantee of the paper's Gröbner tactic, so an integration would need proof-producing certificates.

## what is proved, measured, and trusted; product threat
The report proves or reports HOL consistency, kernel verification, an end-to-end direction through CakeML, the Coq Odd Order formalization, library theorems, and automation rates. It does not prove physical hardware correctness, compiler correctness for every deployment, or that a selected premise is semantically relevant. Inference: the main threat to agent-written verified Rust is false confidence from solver success while specifications, libraries, compiler behavior, or unsafe boundaries remain outside the proof. VL should reuse proof-producing replay, small trusted kernels, explicit trust ledgers, and reusable libraries; it should not redo generic claims that HOL Light, Coq, CakeML, and existing automation already establish.

## techniques for the catalog
- typed theorem kernel — make every theorem an abstract typed value constructible only through a small checked kernel
- end-to-end trust chain — verify kernel implementation, language semantics, compiler, and runtime assumptions down to machine code
- constructive proof refactoring — replace contradiction, choice, and nonconstructive algebra with induction, explicit constructions, and isolated classical predicates
- formal libraries and interfaces — encode implicit domain knowledge as reusable typed structures and closure lemmas
- proof-producing premise selection — rank a bounded set of relevant library facts and replay the generated proof in the assistant
- SMT case reduction — reduce symmetric finite cases to quantifier-free constraints and transcribe solver results into checked proofs
- proof-producing algebra automation — certify polynomial, linear-program, and nonlinear-inequality reasoning with proof-producing procedures
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "With search algorithms, we can take a more relaxed approach, with the understanding that their results must eventually be verified by the proof assistant before being admitted as part of formal proof."): read the whole paper text (pp. 1-24, including appendices and references) and the whole study; checked every quotation, the page and section references (page numbers taken from the 1086-NN headers), the 40%/47% rates, the kernel listing, the six Odd Order transformations, the Théry SMT passage, and the tag and arXiv link (arXiv:1408.6474 appears on the paper's first page); changed the Theorem 1 page range to pp. 2-4, the kernel-listing page and wording, the CakeML sentence (now quoted), the decision-procedure/socle item, the Gröbner and linear-programs sentences, the removal of the unsupported "typeclass" and "reflective" labels, and marked the how-to-apply step lists and the 60%/53% subtraction as Inference; did not check the cited external works, the Verus-form paragraphs (all marked Inference, not claims of the paper), or the PDF figures beyond the text layer.
