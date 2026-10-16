# MirrorShard: Proof by Computational Reflection with Verified Hints
(authored by agents unless marked 🧑)

Tag: `malecha2013mirrorshard`, [paper](http://arxiv.org/abs/1305.6543v1)

## what the paper proves or measures

MirrorShard is a Coq framework for extensible reflective verification. Instead of generating an untrusted proof trace for every goal, it implements a decision procedure inside Coq's logic and proves that the procedure is sound. The abstract states: “We describe a method for building composable and extensible verification procedures within the Coq proof assistant.” (Abstract, p. 1.) The authors instantiate it to Bedrock separation logic, including user-defined predicates, symbolic execution, and cancellation.

The trust boundary is deliberately small: the Coq kernel checks the soundness theorems and the computed proof terms; hint procedures are ordinary verified functions. The paper identifies the central benefit: “Now no proofs need to be generated, freeing us from the associated overhead.” (Section 1, p. 2.) This is a theorem-prover architecture, not a claim that any heuristic finds a proof. A goal is accepted only after the reflected procedure's correctness theorem and its premises reduce or check in Coq.

## technique 1: proof by computational reflection

what it is: reify a logical goal as a syntax tree in the proof assistant, run a verified function over that tree, and apply a theorem saying that a successful result implies the original semantic proposition. The simple equality example represents terms as `expr`, computes `f_eq a b`, and returns subterm equalities that suffice to establish equality of the original denotations (Section 2, pp. 2–3).

when to use: use this for repetitive proof search over a domain with a computable syntax and a semantic denotation, especially when checking a generated proof trace would dominate runtime.

how to do it (Sections 2 and 3.1, pp. 2–4):
1. define a reified syntax datatype with decidable equality and explicit constructors for functions, constants, and variables
2. define a denotation function from syntax to semantic Coq values; MirrorShard permits partial denotation to reject ill-typed terms
3. implement a pure procedure that computes obligations, such as equalities between unmatched subterms
4. prove a soundness theorem: if every returned obligation denotes a true proposition, the original goal is true
5. reify the user's Coq goal, run the procedure by reduction, and discharge the smaller obligations

The paper's theorem is `f_eq_correct`: if `Forall` says all constraints returned by `f_eq` are semantically equal, then `denote a = denote b` (Section 2, p. 3). This is a proof-producing theorem about the procedure itself, although no per-invocation proof trace is constructed.

Verus form (Inference: the paper targets Coq): a Verus-side tool can reify a Rust/Verus expression into an AST, implement a pure `spec fn` simplifier or decision procedure, and prove a `proof fn` theorem that successful output implies the original relation. Verus proof functions and `ensures` can state the soundness theorem; executable code must not rely on the proof-only function. Verus's SMT-backed verifier is not a replacement for Coq's definitional reduction, so a generated AST procedure remains an auxiliary verified library, not a new trusted solver.

evidence and limits: the procedure is sound only under the proved denotation theorem and obligations. The syntax may admit ill-typed terms, making denotation partial; this shifts work into dynamic type checks and proof premises (Section 2, p. 3). Reflection does not solve undecidable goals or create missing domain lemmas.

## technique 2: extensible reified syntax with binders and unification variables

what it is: use indexed expression families to represent arbitrary Coq constants, multiple sorts, quantifiers, separation-logic predicates, and two kinds of variables. `Var` represents universally quantified/local variables; `UVar` represents existential/unification variables that the procedure may instantiate. `sexpr` adds separating conjunction, empty heap, predicates, injection of pure expressions, and existential binders (Listing 3, Section 3.1, pp. 4–5).

when to use: use this representation when a verification engine must reason about higher-order or quantified assertions and must exchange unknown values with an interactive tactic environment.

how to do it (Section 3.1 and Figure 1, pp. 4–6):
1. index the expression type by a type environment and define constructors for constants, local variables, unification variables, functions, and equality
2. define a denotation `exprD`/`sexprD` carrying type, function, predicate, ordinary-variable, and unification-variable environments
3. represent binders explicitly (`Exists` and local variable constructors) rather than treating them as text
4. represent a unification as a map from `UVar` names to syntax, and prove that instantiation preserves denotation
5. translate quantified goals into Coq variables and unification variables; substitute solved variables and leave unresolved existential variables in the resulting goal

The paper's preservation theorem states: “Theorem substD_instantiate : ∀ funcs U G e t sub, substD funcs U G sub → exprD funcs U G (instantiate sub e) t = exprD funcs U G e t.” (Section 3.3, p. 6.) This theorem is the semantic guard on side effects that resolve unification variables.

Verus form (Inference): represent proof expressions as ghost enums/structs and existential metavariables as ghost values with explicit substitution maps. Use `spec fn` denotation and `proof fn` substitution-preservation lemmas, with `ensures` equating denotations before and after substitution. Verus does not expose Coq's de Bruijn binders or Ltac unification context; a Rust tool would need a separate verified AST and a boundary that converts generated annotations into ordinary Verus source.

evidence and limits: dependent environments create cast obligations because Coq's definitional equality cannot reduce an abstract environment. MirrorShard's `applyC` computes a constraint-compliant environment so compatible constraints compose definitionally (Section 3.2, pp. 5–6). The design is powerful but implementation-specific; it is not evidence that arbitrary Rust syntax can be reified without a trusted parser.

## technique 3: composable verified hint databases

what it is: package domain knowledge as first-class records containing refinement hints, base-theory provers, memory evaluators, and proofs that all hints are sound. Type, function, and predicate constraints describe the environments in which a package is valid. Compatible packages are composed by applying each other's constraints and letting Coq type-check the result (Section 3.2, pp. 5–6).

when to use: use this when separate ADT authors should teach one reflective prover about lists, words, arrays, or user predicates without modifying the prover's kernel or core algorithm.

how to do it (Listing 1 and Section 3.2, pp. 2, 5–6):
1. prove ordinary Coq lemmas about an abstract predicate, such as forward and backward BST refinements
2. reify each lemma into a refinement-hint record with universally quantified variables, pure premises, and heap implications
3. package hints plus `Hints_correct` proofs into a `HintDatabase`
4. define base-theory provers as verified functions over syntax; MirrorShard includes reflexivity, assumptions, bitvector arithmetic, and array-bounds provers (Section 4, pp. 6–7)
5. define memory evaluators as verified functions that interpret reads and writes under separation-logic assertions
6. compose packages only when type/function/predicate constraints are compatible; use Ltac to build the composite term and Coq's type checker to reject incompatible combinations

The paper summarizes the soundness boundary: “Hints are naturally expressed over different logical theories, involving different data structure representation predicates and different background theories.” (Section 1, p. 2.) Listing 1 verifies a BST `lookup` by registering hints and finishing with `vcgen; abstract (sep hints; auto).` (pp. 2–3).

Verus form (Inference): model a hint package as ghost `spec fn` lemmas with `requires`/`ensures` and a registry selected by module or trait. A procedure can call a proof lemma only after its contract is established. Verus has no Coq dependent-record environment composition, so compatibility checks would be an external generator or explicit trait-level contracts. The product rule carries over: domain extensions must be proved and independently checked before the agent may use them.

evidence and limits: composability is conditional on environment compatibility; Coq's type checker catches conflicts, but Ltac construction remains dynamically typed and outside Gallina. The approach therefore keeps the final kernel check while retaining an untrusted search/orchestration layer.

## technique 4: separation-logic symbolic execution and cancellation

what it is: symbolic execution takes a precondition and instruction sequence and computes a strongest postcondition by unfolding predicates with refinement hints and interpreting memory operations with memory evaluators. Cancellation then proves that this computed postcondition implies the method's specified postcondition by repeatedly applying separation-logic cancellation and unification (Section 4, pp. 6–7; Figure 2).

when to use: use it for imperative heap code whose data structures are described by abstract separation predicates, including linked lists, arrays, BSTs, and mutable pointers.

how to do it (Section 4, pp. 6–7):
1. refine an abstract predicate when pure context proves a side condition, such as a non-null pointer
2. execute arithmetic and logical instructions by translating their transfer functions into reified syntax
3. interpret memory reads/writes using a memory evaluator, extracting values from points-to or array predicates
4. perform backward refinement on the desired postcondition
5. cancel matching heap predicates; solve equalities with unification, trying ordinary expressions before unification variables
6. discharge remaining pure side conditions with base-theory provers and return the verified implication

The paper says: “Cancellation proves that the strongest post-condition, computed by symbolic execution, implies the specification’s post-condition.” (Section 4, p. 7.) It uses a lexicographic heuristic because cancellation does not backtrack; unification variables are unified last (Section 4, p. 7).

Verus form (Inference): executable Rust remains ordinary code; represent the abstract heap relation as a ghost predicate or state-machine invariant. Use `requires`/`ensures` for the pre/post relation, `assert` and `proof fn` lemmas to unfold or compose list predicates, and Rust ownership for concrete borrow validity. Verus does not have separation-logic `*` cancellation commands, so cancellation becomes explicit lemma composition over ghost sequences/maps. A generated proof must still be rerun by Verus; a symbolic executor's inferred postcondition is a candidate fact.

evidence and limits: the Bedrock instantiation covers LinkedList, Malloc, ListSet, TreeSet, Queue, and Memoize case studies (Section 6, pp. 8–9). In a list-length microbenchmark, old Ltac verification times out at length 32 while reflective automation finishes under one second (Section 6, p. 9). Figure 7 attributes 76.5% of reflective verification time to `Qed`, 14.6% to cancellation, 4.9% to symbolic execution, and 4.1% to VC generation (p. 9). These percentages describe that experiment's phase breakdown, not all Coq workloads.

## technique 5: engineer reification, reduction, and proof terms

what it is: choose minimally dependent term representations, non-dependent Boolean equality with a separate correctness lemma, efficient reification, and delimited computation. MirrorShard's OCaml reifier builds environments and terms in one pass; `evm_compute` supports dynamic blacklists so user predicates remain opaque while the verified procedure evaluates.

when to use: use these optimizations after soundness is established and reification or reduction dominates verification time.

how to do it (Section 5, pp. 7–9):
1. compare dependent and minimally dependent encodings; move type obligations from computation into separate lemmas when this reduces casts
2. replace Ltac reification with an OCaml plugin that constructs open terms and environments efficiently
3. formulate correctness theorems with `let`-bound computed results to avoid repeatedly reducing large existential terms
4. use delimited cbv or `evm_compute` with a whitelist/blacklist to keep abstraction predicates opaque
5. measure both proof search and kernel checking; retain the optimization only if the final Coq term still checks

The reported reification change is from roughly 32 minutes to 22 seconds for ten examples, an 88× speedup (Section 5.2, p. 7). The non-dependent equality choice reduces proof-generation and checking time by 40% (Section 5.2, p. 7). These are the paper's test suite settings, and the authors note that full case studies show comparable overall performance rather than the same speedup.

Verus form (Inference): analogous engineering means keeping proof ASTs and ghost computations small, using `spec fn` helpers rather than duplicating large terms, and controlling which lemmas are available to the SMT solver. Verus does not expose Coq's reduction controls or OCaml plugin boundary; solver time and proof stability must be measured with Verus runs. Optimization cannot weaken the original `ensures` contract.

## trusted boundary, contradictions, and product threat

MirrorShard proves soundness of its reflected procedures and hint architecture in Coq. Trusted or assumed pieces include the Coq kernel, the semantics of Bedrock and separation logic, correctness of user-supplied hint lemmas, Ltac/OCaml reification's production of well-formed terms, and the specification itself. The case-study table gives implementation/specification/proof line counts but no aggregate success denominator; the six named modules all serve as examples rather than a random benchmark. The authors explicitly report that two-thirds of verification time remains in Ltac in Figure 7 despite reflective components, so reflection does not remove all automation bottlenecks (Section 6, p. 9).

Inference: VL should reuse the architecture's separation between a small checked kernel, extensible domain lemmas, verified search procedures, and a final independent verifier run. VL should not redo the paper's already-established Coq reflection pattern or treat an agent-generated hint as trusted merely because it helps the solver. Inference: the threat to agent-written verified Rust is moderate for proof search and high for extension packages: an unsound `external_body`-like assumption or incorrect ghost predicate can make later proofs meaningless. The useful product analogue is a versioned, reviewed lemma registry whose contracts and bodies are checked in the same Verus run.

## techniques for the catalog

- computational reflection — reify goals, run a verified procedure in the logic, and use its soundness theorem to discharge the original goal
- extensible syntax with binders — represent typed terms, quantifiers, separation predicates, and unification variables in an indexed AST
- composable hint databases — package domain lemmas, theory provers, memory evaluators, and soundness proofs into compatible modules
- reflective symbolic execution — compute strongest postconditions by predicate refinement and verified memory evaluation
- separation-logic cancellation — prove postconditions by matching heap predicates and solving residual equalities with unification
- reduction and reification engineering — optimize term representations, reification, and delimited evaluation without changing soundness

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
