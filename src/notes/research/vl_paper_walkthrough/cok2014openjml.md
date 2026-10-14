# OpenJML: Software verification for Java 7 using JML, OpenJDK, and Eclipse
(authored by agents unless marked 🧑)
Tag: `cok2014openjml`, [paper](http://arxiv.org/abs/1404.6608v1)
## system and contribution
OpenJML checks Java code against JML specifications from the command line or Eclipse. It extends the OpenJDK compiler, translates Java plus JML to verification conditions, sends SMT-LIB2 to a solver, and maps results back to source. The paper states, “OpenJML is a tool for verification (checking consistency of code and specifications) of Java programs” (section 1, p. 79). Its practical contribution is an integrated workflow: static checking, runtime assertion checking, IDE status, and source-level counterexamples.

Inference: Verus can reuse the workflow architecture, but its Rust/SMT semantics differ. The paper is evidence about tooling patterns, not about Verus soundness.

## technique 1: specification-to-VC compilation

What it is. OpenJML lowers method contracts into assumptions and assertions, converts code to single-assignment basic blocks, emits compact VCs in SMT-LIB2, and invokes CVC4 or Z3. The paper lists the pipeline: “The procedure specifications are translated into assumptions and assertions interleaved with the Java code” and “The basic blocks are translated into compact verification conditions (VCs)” (section 2, p. 80).

How to do it.
1. Parse Java and JML together; typecheck model types, fields, methods, and JML constructs in augmented OpenJDK phases (table 1, p. 81).
2. Insert preconditions as assumptions at method entry and postconditions as assertions at method exit (section 2, p. 80).
3. Convert statements to basic blocks with single-assignment labels (section 2, p. 80).
4. Encode the blocks as one method VC in SMT-LIB2 and call a selected SMT solver (section 2, p. 80).
5. If invalid, translate logical counterexample variables and values back to source expressions, locations, and program states (sections 2 and 4.2, pp. 80, 82–83).

Verus form. Inference: Verus already performs Rust-to-SMT lowering. The useful addition is explicit provenance from each `requires`, `ensures`, `assert`, and loop `invariant` to the generated obligation. Use Verus constructs as documented in the Verus notes; do not invent JML `assignable` syntax or a runtime `proof fn` call. Rust’s ownership and borrow checking happen before verification and are additional trusted front-end checks.

Evidence and limits. The paper reports interoperability with CVC4 and Z3 but gives no benchmark denominator or proof-success percentage. It notes a planned Boogie integration rather than a completed result (section 5, p. 84). The solver, encoding, Java model, and OpenJDK extensions remain trusted components.

## technique 2: vacuity and multiple-failure checking

What it is. A single method VC may be valid because specifications make all paths infeasible, or one failed assertion may mask later failures. OpenJML checks feasibility after a valid result and iteratively finds additional falsified assertions after an invalid result. The paper says, “OpenJML extends this basic model to also check the generated VC for vacuity or for multiple falsified assertions” (section 2, p. 80).

How to do it.
1. Check the full method VC.
2. If valid, check that feasible paths exist to method exit and each assertion; an infeasible path can indicate contradictory specifications (section 2, p. 80).
3. If invalid, compute a path condition leading to the falsified assertion.
4. Conjoin the negation of that path condition to the VC and recheck; this blocks rediscovering the same failure while allowing another failure (section 2, pp. 80–81).
5. Repeat until the accumulated VC is valid, collecting all falsifiable assertions (section 2, p. 81).

Verus form. Inference: a Verus IDE can run a post-pass asking whether each assertion and method exit has a satisfiable path condition. For repeated failures, retain a blocking clause for the same path or assertion in a diagnostic query. Keep the production proof query unchanged; these checks explain vacuity and do not replace the trusted Verus proof. Verus branch assumptions arise from Rust control flow and specifications, not JML path-condition syntax.

Evidence and limits. This is an algorithmic feature; the paper supplies no measured number of paths, runtime overhead, or false-negative rate. Quantifiers and inconsistent specifications can still hide errors, as the soundness discussion explains (section 6.3, p. 87).

## technique 3: source-level counterexample reconstruction

What it is. SMT counterexamples use logical variables and internal values that are hard to read. OpenJML stores the mapping from source expressions to SMT variables, then reconstructs values at each single-assignment program state and displays the failing path as text and editor highlighting. The paper calls this “an important innovation in the Eclipse GUI” (section 4.2, p. 82).

How to do it.
1. During translation, record each source expression’s SMT logical variable and source location.
2. When the solver returns a model, map each logical variable back to the corresponding source expression.
3. Use single-assignment versions to associate values with the correct program point (section 4.2, p. 83).
4. Read branch booleans in the model to reconstruct the path to the failed assertion.
5. Display values on hover, a textual trace in a separate view, and path highlighting over source (section 4.2, p. 83).

Verus form. Inference: Verus tooling should preserve spans for Rust expressions and specifications through translation, then display model values with the Rust type and path condition. For opaque or unsupported model values, show the solver term and identify the abstraction. This is UI metadata; it must not be mistaken for a proof certificate.

Evidence and limits. The paper provides a GUI design and screenshot, not a controlled usability result. SMT models may contain spurious values when theories are incomplete; the paper explicitly warns that “the underlying solvers [may] find ‘counterexamples’ that are not valid in reality” (section 6.3, p. 87).

## technique 4: modular IDE status and runtime checking

What it is. OpenJML’s Eclipse plug-in runs type checking, static checking, and runtime assertion compilation. A proof-status view records each method attempt, prover, time, validity, invalidity, and out-of-date state; users select an attempt to inspect its counterexample. Runtime checking inserts assertion code into the OpenJDK AST before ordinary compilation.

How to use it.
1. Run verification per method against its own implementation and referenced specifications, without opening referenced implementations (section 4.1, p. 82).
2. Record each attempt and show a tree summary; color indicates valid, invalid, or out of date, and the prover and elapsed time are visible (section 4.1, p. 82).
3. Select an attempt to inspect details and counterexample values.
4. For runtime checking, insert checks into the AST during the OpenJDK pipeline and compile the resulting class (table 1, p. 81).
5. Use Eclipse problem markers and build integration to rerun checks on save or build (section 4.4, p. 83).

Verus form. Inference: a Verus IDE can maintain per-function proof status, solver and elapsed time, dependency invalidation, and separate runtime tests. Verus `proof fn` and `spec fn` are compile-time artifacts; they must not be emitted as runtime calls. Rust tests and debug assertions are a separate dynamic layer.

Evidence and limits. OpenJML had been used in assignments in at least four courses during fall 2013 and in several other integrations (section 7, p. 88). The paper gives no student count or controlled comparison. Eclipse integration incurs double parsing/typechecking; the paper says the extra work was not noticeable relative to SMT proof attempts (section 4.3, p. 83), but gives no denominator or timing table.

## technique 5: explicit frame, definedness, and vacuity policies

OpenJML integrates several specification policies that prevent silent modeling errors: default non-null references, rejecting specifications that cannot be shown well-defined (for example, division by an unconstrained zero), selectable arithmetic modes, datagroups/frame conditions, purity, visibility, model fields, and vacuity checking (section 5, pp. 84–85). The paper explains the definedness policy with the concrete contrast “i/j < 10 (for unconstrained j) is undefined, but j != 0 && i/j < 10 is well-defined” (section 5, p. 84).

Inference: Verus should similarly make arithmetic domains and memory footprints explicit. Rust overflow behavior, ownership, and `requires` conditions provide different mechanisms; a Verus study must state the exact integer model and frame assumptions instead of importing JML defaults. The OpenJML frame-condition example shows how a convenient default can conflict with visibility: “A visibility rule is that a specification clause may not refer to variables of more restricted visibility than the clause itself” (section 7.1, p. 89). Inference: generated Rust specifications should expose which fields a function may mutate and avoid hidden broad permissions.

## what is proved, trusted, and left open
The paper demonstrates an implemented Java 7 verifier and IDE workflow, with course use and small-scale code studies. It does not establish completeness or soundness experimentally. The author lists false negatives from wrong specifications, independently verified methods, heuristic invariant assumptions, solver resource limits, quantifiers, and implementation bugs; false positives can come from incomplete theories, unmodeled Java behavior such as floating point, and modular abstraction (section 6.3, pp. 87–88). Inference: agent-written verified Rust faces the same product threat of misleading diagnostics and specification mistakes; the larger threat is trusting an incorrect contract or unsupported model, not simply solver timeout.

What VL should not redo: a basic contract-to-VC pipeline, SMT-LIB emission, source counterexample mapping, method-status views, and vacuity checks are established patterns. Inference: VL should focus on Rust/Verus provenance, ownership-aware frames, and reliable explanations rather than rebuilding generic IDE plumbing.

## techniques for the catalog
- contract-to-VC pipeline — lower specifications and single-assignment blocks to SMT obligations with source mappings
- vacuity and multiple-failure analysis — check feasible paths and iteratively block already-found assertion failures
- source-level counterexamples — map solver models and branch paths back to expressions and editor locations
- modular proof-status IDE — track per-method attempts, prover, time, status, dependencies, and runtime checks
- definedness and frame policies — reject undefined specifications and make arithmetic, purity, visibility, and mutation assumptions explicit
Checked 2026-10-13: audit record cok2014openjml; paper-study comparison complete; gate executed; experiments not rerun
