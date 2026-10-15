# Gillian: Compositional Symbolic Execution for All
(authored by agents unless marked 🧑)
Tag: `santos2020gillian`, [paper](http://arxiv.org/abs/2001.05059v1)

## scope and trust boundary

Gillian is a language-independent framework whose reusable unit is a compiler from a source language to GIL plus a memory model. The paper states: “We present Gillian, a language-independent framework for the development of compositional symbolic analysis tools.” (abstract, p. 1). It supports whole-program symbolic testing, specification-driven verification, and bi-abduction. The meta-theory is proved once for an abstract state model; each language instantiation must prove memory-specific lemmas. “Hence, the soundness theorems of whole-program symbolic execution, veriﬁcation, and bi-abduction are proven in general once and for all, and can be instantiated to each target language provided that the user proves the necessary memory-speciﬁc lemmas.” (Introduction, p. 2)

Inference: In Verus, the analogous trust boundary is a verified Rust program plus a Verus specification and solver. A reusable state-model library could carry generic lemmas, but each Rust heap representation and unsafe boundary still needs its own proof obligations. Gillian's compiler and memory model are trusted as implemented unless separately certified.

## technique 1: parameterize symbolic execution by actions

what it is and when to use it. GIL is a small goto IR whose commands are parameterized by actions supplied by a memory model. Use this when several source languages have different heaps, pointers, objects, or allocation rules but should share one symbolic interpreter and soundness proof.

how to apply it (paper method). First define a state model as states, values, and actions. The paper's definition is: “A state model S ∈ S is a triple h|S |, V , Ai, consisting of: (1) a set of states on which GIL programs operate, |S | ∋ S, (2) a set of values stored in those states, V ∋ v, and (3) a set of actions that can be performed on those states, A ∋ α.” (Definition 2.1, p. 3). Next provide `setVar`, `setStore`, `getStore`, expression evaluation, and nondeterministic action execution. Compile each source command to GIL assignments, branches, calls, and action commands. Add `assume`, `symb`, and `fresh` actions so paths can be constrained and symbolic locations allocated. Instantiate a concrete memory and a symbolic memory, then define an interpretation relating symbolic states to concrete states. Finally prove the generic soundness relation's memory-specific conditions.

Verus form. Inference: represent the concrete heap abstraction as a Rust datatype with `spec fn` observers and executable transition functions; represent symbolic state as a ghost datatype. Use `requires`/`ensures` on transition functions and `proof fn` lemmas for the interpretation relation. GIL's nondeterministic action relation has no direct executable Verus equivalent; model it as a ghost relation or a set of possible post-states. Rust ownership changes the representation of heap resources, while the action interface and interpretation proof pattern carry over.

what evidence shows it works. The authors instantiate Gillian to JavaScript and C data-structure libraries. Table 1 reports whole-program symbolic testing times for six structures in each language: JavaScript tests use 3–6 tests and 28,389–137,379 GIL commands, taking 0.21–1.36 s; C uses 1–5 tests and 1,008–15,256 commands, taking 0.11–0.33 s (Table 1, p. 23). These are per-library measurements, not success percentages.

limits and assumptions. The source compiler must preserve the state-model interface; soundness depends on the user proving memory-specific lemmas. Solver cost dominates some cases: “the core of the obtained time does not lie with the number of executed commands, but rather with the time spent in the ﬁrst-order solver” (evaluation, p. 23). Inference: a Verus port inherits SMT sensitivity and must state what unsafe code, compiler, and solver are trusted.

## technique 2: separation-logic predicates to merge paths and verify procedures

what it is and when to use it. Naive symbolic execution only covers one path. Gillian adds core predicates, user predicates, separating conjunction, fold/unfold, and specification calls so branches and loops can be merged compositionally. The paper explains: “To account for branching, we need a mechanism for merging symbolic execution traces.” (Section 4.1, p. 15).

steps. Define core predicates with getter and setter actions that are inverses. The required law is printed as “This well-formedness constraint captures the intuition behind getters and setters and states that they have to be, essentially, each other’s inverses.” (Equation 2 discussion, p. 16). Define recursive predicates such as list segments from core predicates and separating conjunction. Annotate each function with `{P} f(x) {Q,e}`. During verification, fold a predicate by removing its unfolded footprint with `getP` and adding the folded predicate with `setP`; use a specification call to consume `P` and produce `Q` without executing the body. The paper's operational rule says: “The rule folds the predicate denoted by pn(e). First, it obtains the j-th deﬁnition of the predicate to be folded, P j , and uses its getter, getP j , to remove the corresponding footprint from the current state; then, it uses the action setP to extend the current state with the folded predicate.” (Section 4.3, p. 18). Supply proofs that core getter/setter interpretations are well formed, then apply the generic verification theorem.

Verus form. Inference: encode ownership predicates as ghost `struct` facts or `spec fn` predicates over a model heap; use `proof fn` lemmas to split and recombine resources. Verus has no separation-logic `fold` command, so folding is expressed by strengthening or weakening ghost facts and calling lemmas. Function contracts use `requires` and `ensures`; a specification call corresponds to proving the callee contract and letting Verus avoid body expansion. Rust borrow checking supplies additional alias guarantees; predicate facts still describe recursive shape and values.

Evidence and limits. Table 2 verifies 2–6 functions per library with 2–9 specifications, taking 0.17–5.57 s per library; Gillian-C's binary-search tree is the slowest at 5.57 s because of complex Z3 entailments (Table 2, p. 24). The paper's theorem applies after symbolic traces are merged; incorrect or incomplete predicate interpretations invalidate the instantiation. Inference: predicates can encode a wrong ownership abstraction unless their getter/setter laws are proved against the actual Rust representation.

## technique 3: bi-abduction for missing resources

what it is and when to use it. Bi-abduction infers missing heap resources when no specifications or tests are supplied. Extend action execution so a failed action returns a fix assertion; add that assertion to the state and continue, while recording all fixes to synthesize a procedure specification.

steps. Change the action result type to either success or a set of assertion fixes. Require every fix to satisfy the paper's soundness condition: “if we extend the original state with the generated ﬁx, it must be possible to execute the action successfully.” (Section 5.1, p. 19). Lift the state with an accumulated assertion `P`. On an action failure with fix `Q`, set `Q` and retry; retain `P * Q`. At procedure exit, return the inferred precondition and postcondition (and bug/error traces). For While, `lookup` and `getCell` are fixable; `mutate`, `setCell`, and `dispose` are not, as detailed in Section 5.2.

Verus form. Inference: use a ghost precondition synthesizer that proposes missing ownership facts, then prove the final Rust contract from those facts. Verus cannot execute a failed proof action and mutate a runtime state; this is a meta-level inference pass generating `requires` clauses. The resulting contract is checked by ordinary Verus proofs. Fixes that mention fresh logical variables need explicit ghost identities and framing lemmas.

Evidence and limits. Table 3 reports inferred success/bug (and JavaScript error) specifications and times. For Gillian-JS, BST yields 26/0/5 specs in 3.98 s; for Gillian-C, BST yields 37/8 in 0.37 s (S/E/B for JS, S/B for C; Table 3, p. 24). Counts are bounded behaviors, not exhaustive correctness. The authors warn that inferred specifications “could contain false positive bug reports that need to be treated afterwards either automatically or by the developer.” (Section 6.3, p. 24). Inference: agent-written verified Rust should treat inferred contracts as candidates requiring human review, especially around unsafe pointers.

## proved, measured, trusted, and product threat

Proved: generic soundness theorems for symbolic execution, predicate verification, and bi-abduction, conditional on memory-specific lemmas. Measured: command counts, wall-clock times, and numbers of inferred specifications for six JavaScript and six C libraries; denominators are the listed libraries and tests, not all programs. Trusted: the GIL semantics, source-to-GIL compilers, OCaml implementations, first-order solver, and any unproved memory-model code. Inference: the main threat to VeruLaw is specification/model mismatch at a Rust heap or unsafe boundary; the reusable action-and-predicate architecture could reduce repeated proof engineering if its Rust memory model is itself verified. Existing work already supplies path merging and automatic missing-resource inference, so VL should not rebuild these as ad hoc tactics without checking Gillian's soundness conditions.

## techniques for the catalog

- action-parameterized symbolic execution — compile languages to GIL and instantiate a state/memory action model, reusing generic soundness proofs
- predicate-based path merging — use getter/setter core predicates, separating conjunction, fold/unfold, and contracts to merge branches and verify recursively
- bi-abductive resource inference — turn failed actions into sound assertion fixes, replay execution, and synthesize bounded procedure specifications
Checked 2026-10-15 against paper santos2020gillian: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
