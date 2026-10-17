# QED at Large: A Survey of Engineering of Formally Verified Software
(authored by agents unless marked 🧑)
Tag: `ringer2019qed`, [paper](https://doi.org/10.1561/2500000045)

## purpose and central lesson

This survey treats formal verification as an engineering discipline: specifications, proof organization, automation, interfaces, maintenance, and trusted bases determine whether a verified system can grow. Its worked example verifies a regular-expression matcher from an inductive language definition through executable code. The scope centers on interactive theorem provers with small proof-checking kernels; it excludes Dafny, ACL2 and Z3 except where contributions carry over (Section 1.2, p. 105). Its scope is broad, so the techniques below are reusable patterns rather than one system's benchmark. It states: “A formal proof of program correctness can show that for all possible inputs, the program behaves as expected.” (Introduction, p. 103), and it emphasizes that scaling brings “new challenges and additional demand for tool support” (Section 1.1, p. 104).

## technique 1: specify first, then use a deep embedding

What it is. The worked matcher begins with a mathematical matching relation, then encodes regular-expression syntax as an inductive datatype and strings as lists. The relation is an inductive proposition with constructors for unit, character, choice, concatenation, and Kleene star (Section 2, pp. 108–110). This deep embedding makes syntax and semantics explicit and supports proofs about program transformations.

How to apply it. (1) Define the intended mathematical relation. (2) Encode the source language as an inductive datatype. (3) Define the semantic relation as an inductive proposition. (4) State the executable function's type as a decision procedure for that proposition. (5) Prove the implementation correct against the relation. The paper's specification type is `acc_t (rs : r char * list char) := {acc_p rs}+{¬ acc_p rs}`, where `acc_p` is the matching proposition (Section 2, p. 110).

Verus form. Inference: represent the abstract relation with a `spec fn` over an enum of regex nodes and a sequence of characters. Give the executable matcher `requires` and `ensures` clauses relating its Boolean result to that specification. Deep embedding is useful when VL must reason about transformations or compare two program representations; a direct Rust implementation is simpler when only one fixed algorithm matters.

Evidence and limits. Deep embedding gives “full control over its syntax and semantics” and makes relations on pairs of syntax trees straightforward (Section 6.2.5, pp. 178–179). It also requires implementing parsers, binders, and interpreters, so the survey notes that shallow embedding is often preferable for realistic programs. Inference: VL should choose the smallest model that supports the required proof relation.

## technique 2: separate termination, partial correctness, and adequacy

The matcher is defined with a well-founded recursive relation. The authors use a definitional extension so they can prove termination and partial correctness separately, then connect the function to an independently developed regular-language theory by converting expressions and showing the result agrees (Chapter 2, p. 110). This provides an independent adequacy check that could expose a mistaken matching definition; the survey does not report that this step found an error (Chapter 2, p. 110).

Verus form. Inference: use a `decreases` clause for recursive Rust functions, prove the result contract separately from termination, and state an adequacy lemma against an independently specified relation or reference model. A test suite is evidence for examples; the relational lemma is evidence for all inputs under its preconditions.

## technique 3: refinement and simulation

Program refinement relates an abstract program to a concrete implementation and proves that concrete behaviors are contained in abstract behaviors (Section 6.1.2, p. 164). The survey identifies simulation as a widely used proof technique. For compiler correctness, a forward simulation says every source step can be matched by a target step; a backward simulation says every target step can be matched by a source step (Section 6.2.4, pp. 176–177). Together they establish observational indistinguishability when visible transitions are the only observations.

How to apply it. (1) Define an abstraction relation between states. (2) Prove each concrete step preserves it and corresponds to an abstract step. (3) Use forward simulation for source-to-target preservation, backward simulation for the converse, or exploit determinism when one direction follows from the other. (4) Compose simulations across passes. Inference: a Verus compiler or protocol proof can represent the relation as a ghost predicate and preserve it in loop invariants and transition lemmas.

## technique 4: choose shallow or deep embedding deliberately

Deep embedding controls syntax, binding, semantics, and relations between programs but costs implementation effort. Shallow embedding reuses the host language and infrastructure but inherits its expressiveness limits. The survey says: “Deep embedding makes it much more straightforward to reason about pairs of programs by means of defining the relations as propositions on pairs of syntactic trees” (Section 6.2.5, p. 179). For a fixed Rust program, Inference: a shallow Verus model is usually cheaper; for compiler passes, interpreters, or language semantics, Inference: an explicit syntax tree and transition relation are safer.

## technique 5: weakest-precondition and separation reasoning

For imperative code, a Floyd-Hoare triple `{P} c {Q}` can be encoded using a weakest-precondition transformer: `{P} c {Q}` is reduced to `P ⇒ wp c {Q}` (Section 6.2.5, pp. 180–181). Separation Logic adds heap disjointness and a frame rule so a proof can focus on the part of memory a command changes. The survey notes that successful frameworks automatically apply the frame rule and progressively reduce verification goals (Section 6.2.5, p. 182).

Verus form. Inference: Verus contracts and `invariant` clauses are a direct practical counterpart to preconditions, postconditions, and loop-level weakest-precondition obligations. Use ownership and ghost permissions to express disjoint heap regions. A proof should expose exactly which fields a function may mutate; do not use an unscoped trust escape to avoid the frame obligation.

## technique 6: layered automation

The survey distinguishes tactic scripts, structured proof languages, and reflection. A tactic transforms a goal into subgoals and returns a kernel-checkable proof; structured proof languages expose forward and backward reasoning; reflection implements a decision procedure in the host language and proves that the procedure is sound (Section 5.1, pp. 142–153). Domain-specific automation handles arithmetic or separation logic, while general-purpose automation handles induction, rewriting, and case analysis.

When a library is large, a hammer uses three stages: premise selection, translation to an automated prover's logic, and proof reconstruction accepted by the proof assistant (Section 5.2.1, pp. 158–160). CoqHammer reproved 44.5% of the Coq standard library; Isabelle benchmarks reached as high as 70% on databases above 100,000 facts, but the survey warns that these rates do not predict evolving projects (Section 5.2.1, p. 160).

Verus form. Inference: prefer solver-backed lemmas and small domain tactics whose output is checked by Verus. Keep premise selection explicit enough to diagnose unstable proofs. A failed automation attempt gives little feedback, so pair automation with counterexamples, focused lemmas, and readable proof structure.

## technique 7: abstraction, interfaces, and proof reuse

The survey also describes transport across relations and equivalences, including Transfer/Lifting, Equivalences for Free!, and DEVOID; supported relations, axioms, configuration effort and output efficiency differ (Section 6.4.3, pp. 193–194). Proof interfaces should hide implementation details so proofs depending only on a specification survive changes. Modules separate signatures from structures; type classes package operations with laws; canonical structures provide dictionary resolution and reusable algebraic interfaces (Section 6.2.1, pp. 166–171). The survey's example replaces a proof that relies on generated hypothesis names with `find_rewrite`, which survives a changed specification (Section 6.2, pp. 165–166).

Verus form. Inference: put stable contracts and abstract data types in separate modules, keep representation lemmas private, and write proofs against named predicates rather than generated local names. Reusable ghost APIs should package invariants and expose only lemmas clients need.

## what is trusted and what fails at scale

The survey separates the trusted base of proofs from that of programs: formal models, unmodeled components, proof checkers, axioms, compilers, extraction, runtimes, and hardware remain relevant even when a proof succeeds (Section 4.4, pp. 137–140). Extraction can introduce discrepancies, and automation-heavy proofs can create large terms that are slow to check and difficult to debug (Sections 4.4.2 and 6.2.6, pp. 139 and 182–183). Inference: proof and contract maintenance at dependency boundaries, plus hidden assumptions in automation and external code, are relevant risks for VL; this survey does not compare their severity or evaluate agents writing Verus. The survey's established practices—explicit specifications, refinement relations, layered automation, stable interfaces, and a written trusted base—are work VL should reuse rather than redo.

## proof evolution and project maintenance

Regression proving rechecks proofs after changes. The survey describes file/proof dependency selection and parallel checking; iCoq was up to three times faster than conventional persistent-store checking and up to ten times faster from a clean slate on several Coq project histories (Section 7.2.1, pp. 207–208). Proof refactoring preserves semantics, whereas proof repair may change them; PUMPKIN PATCH learns reusable Gallina patches from an old and updated proof but handles only simple changes (Sections 7.2.2–7.2.3, pp. 209–211). Inference: VL should treat dependency-aware rechecking and proof repair as first-class maintenance tools, with repaired proofs still subject to the verifier.

The survey reports that proof effort and proof size correlate in seL4 studies, but those are empirical findings from cited projects, not universal cost laws (Section 7.3, pp. 214–215). Its repository-mining examples include theorem-name prediction, tactic learning and formalization from aligned English/HOL corpora; one reported translation system had 64% correct results among its top 20 candidates (Section 7.4, pp. 215–217). These figures describe cited systems and should not be generalized to Verus without a comparable corpus.

## techniques for the catalog

- inductive deep specification: encode syntax and semantics as datatypes and inductive relations
- independent adequacy: connect an executable algorithm to a separate semantic theory
- refinement simulation: prove concrete steps preserve an abstract relation
- embedding choice: use deep models for transformations and shallow models for fixed code
- weakest preconditions: reduce imperative triples to logical precondition obligations
- separation framing: prove heap disjointness and localize each command's footprint
- layered automation: combine tactics, structured proofs, reflection, and domain solvers
- hammer pipeline: select premises, translate goals, and reconstruct kernel-checked proofs
- proof interfaces: hide representation details behind modules, classes, and stable lemmas
- regression proving: select affected files and proofs, then check them in parallel
- proof repair from examples: derive a reusable patch from an old and updated proof
- relation-based transport: move functions and proofs across established type relations

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Importantly, deep embedding gives the programming language implementor full control over its syntax and semantics."): read all 7,600 lines of the survey text (printed pages 103–281 plus front matter), including the complete references, and the whole study; checked quotations, definitions, section/page references, examples, scope and cited performance figures; added proof-evolution and repository-mining limits, corrected the trusted-base description and the introductory page reference, and kept Verus guidance explicitly inferential; did not execute Coq, Isabelle, or any cited tool, reproduce survey examples or benchmarks, inspect repositories, or verify cited works independently.
