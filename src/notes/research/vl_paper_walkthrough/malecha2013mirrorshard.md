# MirrorShard: Proof by Computational Reflection with Verified Hints
(authored by agents unless marked 🧑)

Tag: `malecha2013mirrorshard`, [paper](http://arxiv.org/abs/1305.6543v1)

## what the paper proves or measures

MirrorShard is a Coq framework for extensible reflective verification. Instead of generating an untrusted proof trace for every goal, it implements a decision procedure inside Coq's logic and proves that the procedure is sound. The abstract states: “We describe a method for building composable and extensible verification procedures within the Coq proof assistant.” (Abstract, p. 1.) The authors instantiate it to Bedrock separation logic, including user-defined predicates, symbolic execution, and cancellation.

Inference: the trust boundary is small, because the soundness theorems and the final terms are checked by Coq's kernel; the paper says of its OCaml reification plugin that it “does not need to be trusted more than any Ltac tactic since it constructs terms that are fed into the Coq kernel” (Section 5.3, p. 8). The paper identifies the central benefit: “Now no proofs need to be generated, freeing us from the associated overhead.” (Section 1, p. 2.) Inference: this is a theorem-prover architecture, not a claim that any heuristic finds a proof; the paper's reflective procedures only replace a goal by another formula “that has been proven to imply the original” (Section 3.3, p. 6).

## technique 1: proof by computational reflection

what it is: reify a logical goal as a syntax tree in the proof assistant, run a verified function over that tree, and apply a theorem saying that a successful result implies the original semantic proposition. The simple equality example represents terms as `expr`, computes `f_eq a b`, and returns subterm equalities that suffice to establish equality of the original denotations (Section 2, pp. 3–4).

when to use: use this for repetitive proof search over a domain with a computable syntax and a semantic denotation, especially when checking a generated proof trace would dominate runtime.

how to do it (Sections 2 and 3.1, pp. 3–4):
1. define a reified syntax datatype with decidable equality and explicit constructors for functions, constants, and variables
2. define a denotation function from syntax to semantic Coq values; MirrorShard permits partial denotation to reject ill-typed terms
3. implement a pure procedure that computes obligations, such as equalities between unmatched subterms
4. prove a soundness theorem: if every returned obligation denotes a true proposition, the original goal is true
5. reify the user's Coq goal, run the procedure by reduction, and discharge the smaller obligations

The paper's theorem is `f_eq_correct`: if `Forall` says all constraints returned by `f_eq` are semantically equal, then `denote a = denote b` (Section 2, p. 3). This is a theorem about the procedure itself; the paper's point is that, once it is proved, no proofs need to be generated per invocation (Section 1, p. 2).

Verus form (Inference: the paper targets Coq): a Verus-side tool can reify a Rust/Verus expression into an AST, implement a pure `spec fn` simplifier or decision procedure, and prove a `proof fn` theorem that successful output implies the original relation. Verus proof functions and `ensures` can state the soundness theorem; executable code must not rely on the proof-only function. Verus's SMT-backed verifier is not a replacement for Coq's definitional reduction, so a generated AST procedure remains an auxiliary verified library, not a new trusted solver.

evidence and limits: the procedure is sound only under the proved denotation theorem and obligations. The syntax may admit ill-typed terms, making denotation partial; the paper says denotation “will perform dynamic type-checking to ensure that the Gallina term that it produces is well-typed” (Section 2, p. 3). Inference: reflection does not solve undecidable goals or create missing domain lemmas; the paper notes that “the undecidability of powerful logics forces frequent use of new, problem-specific heuristics” (Section 1, p. 1).

## technique 2: extensible reified syntax with binders and unification variables

what it is: use indexed expression families to represent arbitrary Coq constants, multiple sorts, quantifiers, separation-logic predicates, and two kinds of variables. `Var` represents universally quantified/local variables; `UVar` represents existential/unification variables that the procedure may instantiate. `sexpr` adds separating conjunction, empty heap, predicates, injection of pure expressions, and existential binders (Listing 3, Section 2, p. 4; Section 3.1, p. 4).

when to use: use this representation when a verification engine must reason about higher-order or quantified assertions and must exchange unknown values with an interactive tactic environment.

how to do it (Sections 2 and 3.1, p. 4; Section 3.3 and Figure 1, p. 6):
1. index the expression type by a type environment and define constructors for constants, local variables, unification variables, functions, and equality
2. define a denotation `exprD`/`sexprD` carrying type, function, predicate, ordinary-variable, and unification-variable environments
3. represent binders explicitly (`Exists` and local variable constructors) rather than treating them as text
4. represent a unification as a map from `UVar` names to syntax, and prove that instantiation preserves denotation
5. translate quantified goals into Coq variables and unification variables; substitute solved variables and leave unresolved existential variables in the resulting goal

The paper's preservation theorem states: “Theorem substD_instantiate : ∀ funcs U G e t sub, substD funcs U G sub → exprD funcs U G (instantiate sub e) t = exprD funcs U G e t.” (Section 3.3, p. 6.) Inference: this theorem is the semantic guard on the side effects that resolve unification variables. The paper's own description is that Ltac performs those side effects after the pure function returns its result (Section 3.3, p. 6).

Verus form (Inference): represent proof expressions as ghost enums/structs and existential metavariables as ghost values with explicit substitution maps. Use `spec fn` denotation and `proof fn` substitution-preservation lemmas, with `ensures` equating denotations before and after substitution. Verus does not expose Coq's de Bruijn binders or Ltac unification context; a Rust tool would need a separate verified AST and a boundary that converts generated annotations into ordinary Verus source.

evidence and limits: dependent environments create cast obligations because Coq's definitional equality cannot reduce an abstract environment. MirrorShard's `applyC` computes a constraint-compliant environment so compatible constraints compose definitionally (Section 3.2, pp. 4–5). Inference: the design is implementation-specific; it is not evidence that arbitrary Rust syntax can be reified without a trusted parser.

## technique 3: composable verified hint databases

what it is: package domain knowledge as first-class records containing refinement hints, base-theory provers, memory evaluators, and proofs that all hints are sound. Type, function, and predicate constraints describe the environments in which a package is valid. Compatible packages are composed by applying each other's constraints and letting Coq type-check the result (Section 3.2, pp. 4–5).

when to use: use this when separate ADT authors should teach one reflective prover about lists, words, arrays, or user predicates without modifying the prover's kernel or core algorithm.

how to do it (Listing 1, p. 2; Section 3.2, pp. 4–5):
1. prove ordinary Coq lemmas about an abstract predicate, such as forward and backward BST refinements
2. reify each lemma into a refinement-hint record with universally quantified variables, pure premises, and heap implications
3. package hints plus `Hints_correct` proofs into a `HintDatabase`
4. define base-theory provers as verified functions over syntax; MirrorShard includes reflexivity, assumptions, bitvector arithmetic, and array-bounds provers (Section 4, p. 7)
5. define memory evaluators as verified functions that interpret reads and writes under separation-logic assertions
6. compose packages only when type/function/predicate constraints are compatible; use Ltac to build the composite term and Coq's type checker to reject incompatible combinations

One of the paper's listed contributions is: “Hints are naturally expressed over different logical theories, involving different data structure representation predicates and different background theories (e.g., bitvectors, lists, strings) for stating side conditions of lemmas.” (Section 1, p. 3.) Listing 1 verifies a BST `lookup` by registering hints and finishing with `vcgen; abstract (sep hints; auto).` (p. 2).

Verus form (Inference): model a hint package as ghost `spec fn` lemmas with `requires`/`ensures` and a registry selected by module or trait. A procedure can call a proof lemma only after its contract is established. Verus has no Coq dependent-record environment composition, so compatibility checks would be an external generator or explicit trait-level contracts. The product rule carries over: domain extensions must be proved and independently checked before the agent may use them.

evidence and limits: composability is conditional on environment compatibility; Coq's type checker catches conflicts, but Ltac construction remains dynamically typed and outside Gallina (Section 3.2, p. 5). Inference: the approach therefore keeps the final kernel check while retaining an untrusted search/orchestration layer.

## technique 4: separation-logic symbolic execution and cancellation

what it is: symbolic execution takes a precondition and instruction sequence and computes a post-condition (called the strongest post-condition in the cancellation description) by unfolding predicates with refinement hints and interpreting memory operations with memory evaluators. Cancellation then proves that this computed postcondition implies the method's specified postcondition by repeatedly applying separation-logic cancellation and unification (Section 4, pp. 6–7; Figure 2, p. 6).

when to use: use it for imperative heap code whose data structures are described by abstract separation predicates, including linked lists, arrays, BSTs, and mutable pointers.

how to do it (Section 4, pp. 6–7):
1. refine an abstract predicate when pure context proves a side condition, such as a non-null pointer
2. execute arithmetic and logical instructions by translating their transfer functions into reified syntax
3. interpret memory reads/writes using a memory evaluator, extracting values from points-to or array predicates
4. perform backward refinement on the desired postcondition
5. cancel matching heap predicates; solve equalities with unification, trying ordinary expressions before unification variables
6. discharge pure side conditions, such as pointer non-nullness, with base-theory provers (Section 4, p. 7); goals the reflective procedures leave are simplified and finished in Ltac (Section 3.3, p. 6)

The paper says: “Cancellation proves that the strongest post-condition, computed by symbolic execution, implies the specification’s post-condition.” (Section 4, p. 7.) It uses a lexicographic heuristic because cancellation does not backtrack; unification variables are unified last (Section 4, p. 7).

Verus form (Inference): executable Rust remains ordinary code; represent the abstract heap relation as a ghost predicate or state-machine invariant. Use `requires`/`ensures` for the pre/post relation, `assert` and `proof fn` lemmas to unfold or compose list predicates, and Rust ownership for concrete borrow validity. Verus does not have separation-logic `*` cancellation commands, so cancellation becomes explicit lemma composition over ghost sequences/maps. A generated proof must still be rerun by Verus; a symbolic executor's inferred postcondition is a candidate fact.

evidence and limits: the Bedrock instantiation covers LinkedList, Malloc, ListSet, TreeSet, Queue, and Memoize case studies (Section 6, pp. 10–11). In a list-length microbenchmark, the paper says “Our experiments time out for a list of length 32, while our new reflective automation (Refl) finishes in under a second”, where the timeout refers to the old Ltac-based Bedrock automation (Section 6, p. 11; Figure 6, p. 10). Figure 7 (p. 11) gives the share of verification time by phase: Cancel 4.1%, SymEval 4.9%, Qed 14.6%, and Ltac 76.5%. These percentages describe the paper's verification runs as plotted in that figure; the text does not say they hold for all Coq workloads.

## technique 5: engineer reification, reduction, and proof terms

what it is: choose minimally dependent term representations, non-dependent Boolean equality with a separate correctness lemma, efficient reification, and delimited computation. MirrorShard's OCaml reifier builds environments and terms in one pass; `evm_compute` supports dynamic blacklists so user predicates remain opaque while the verified procedure evaluates.

when to use: use these optimizations after soundness is established and reification or reduction dominates verification time.

how to do it (Section 5, pp. 7–10):
1. compare dependent and minimally dependent encodings; move type obligations from computation into separate lemmas when this reduces casts
2. replace Ltac reification with an OCaml plugin that constructs open terms and environments efficiently
3. formulate correctness theorems with `let`-bound computed results to avoid repeatedly reducing large existential terms
4. use delimited cbv or `evm_compute` with a whitelist/blacklist to keep abstraction predicates opaque
5. measure both proof search and proof checking (the paper reports both, e.g. Figures 4 and 6); Inference: keep an optimization only if the final Coq term still checks

The reported reification change is from roughly 32 minutes to 22 seconds for ten examples, an 88× speedup (Section 5.3, p. 8). The paper says that changing algorithms “to use the non-dependent version of equality checks resulted in a 40% reduction in the proof generation and checking time” (Section 5.2, p. 8). The 88X figure is for a test suite of 10 examples; in Section 6 the authors report “no clear change in overall performance for our full case studies” (p. 11), so these speedups should not be read as end-to-end gains.

Verus form (Inference): analogous engineering means keeping proof ASTs and ghost computations small, using `spec fn` helpers rather than duplicating large terms, and controlling which lemmas are available to the SMT solver. Verus does not expose Coq's reduction controls or OCaml plugin boundary; solver time and proof stability must be measured with Verus runs. Optimization cannot weaken the original `ensures` contract.

## trusted boundary, contradictions, and product threat

The paper states that it proves “the soundness of the hint architecture” (Section 1, p. 2) for its reflected procedures. Inference: the assumptions left are the Coq kernel, the semantics of Bedrock and separation logic, and the specification itself; user hint lemmas are not trusted but must be proved (the `Hints_correct` field, Section 3.2, p. 5), and reification output is checked by the kernel (Section 5.3, p. 8). The case-study table (Figure 5, p. 10) gives program, invariant, tactic and other line counts and an overhead ratio for six case studies, which the paper calls “our six largest”; they are examples, not a random benchmark, and no success rate is reported. The authors report: “Two-thirds of verification time is spent in Ltac, and pushing more reasoning into Gallina procedures is likely to reduce verification time drastically.” (Section 6, p. 11.) Figure 7 plots 76.5% for Ltac, so the text and the figure differ slightly; either way reflection does not remove all automation bottlenecks.

Inference: VL should reuse the architecture's separation between a small checked kernel, extensible domain lemmas, verified search procedures, and a final independent verifier run. VL should not redo the paper's already-established Coq reflection pattern or treat an agent-generated hint as trusted merely because it helps the solver. Inference: the threat to agent-written verified Rust is moderate for proof search and high for extension packages: an unsound `external_body`-like assumption or incorrect ghost predicate can make later proofs meaningless. The useful product analogue is a versioned, reviewed lemma registry whose contracts and bodies are checked in the same Verus run.

## techniques for the catalog

- computational reflection — reify goals, run a verified procedure in the logic, and use its soundness theorem to discharge the original goal
- extensible syntax with binders — represent typed terms, quantifiers, separation predicates, and unification variables in an indexed AST
- composable hint databases — package domain lemmas, theory provers, memory evaluators, and soundness proofs into compatible modules
- reflective symbolic execution — compute strongest postconditions by predicate refinement and verified memory evaluation
- separation-logic cancellation — prove postconditions by matching heap predicates and solving residual equalities with unification
- reduction and reification engineering — optimize term representations, reification, and delimited evaluation without changing soundness

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The underlying problem is that Coq re-typechecks all parts of each new term that is constructed in Ltac."): read the whole arXiv paper text (13 PDF pages) and checked every quotation, number, and section/page reference against it, using PDF page numbers of the arXiv version, and viewed Figure 7 in the PDF; changed the Figure 7 percentages (the study had assigned 76.5% to Qed and 4.1% to VC generation, but the figure shows Cancel 4.1%, SymEval 4.9%, Qed 14.6%, Ltac 76.5%), the section and page references that were off (Section 2 pp. 3-4, Section 3.2 pp. 4-5, reification and equality speedups Sections 5.3 and 5.2 p. 8, Section 6 pp. 10-11, Listing 1 p. 2), the mischaracterized "soundness boundary" quote (it is a contribution bullet, now quoted in full), the claim that reification output and user hint lemmas are trusted (the paper says they are checked or proved), and the overreaching speedup caveat; marked my own conclusions "Inference:". Not checked: the Verus-side suggestions (inference, not from the paper), the bar heights in Figures 3 and 4, the cited external works, and the code repositories.
