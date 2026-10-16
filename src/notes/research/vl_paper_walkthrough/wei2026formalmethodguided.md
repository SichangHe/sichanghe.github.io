# Formal-Method-Guided Vibe Coding: Closing the Verification Loop on AI-Generated Safety-Critical Software Through Model-Driven Engineering
(authored by agents unless marked 🧑)
Tag: `wei2026formalmethodguided`, [paper](http://arxiv.org/abs/2606.22413v2)

## contribution and boundary

Inference: Forge is a closed loop for generating ordinary Java from natural-language requirements, extracting formal models, running three complementary verifiers, and feeding failures back as structured prompts. The LLM remains a draft generator; model-driven engineering (MDE) and formal tools discriminate candidates. The pipeline targets an extraction-tractable Java subset rather than arbitrary Java, and it produces evidence rather than a certification claim.

> “The LLM is the draft generator, the MDE chain is the discriminator, and the developer never has to read the formal models.” (Abstract, p. 1)

Inference: The transfer to VL is architectural: keep the agent in a language and code shape it can reliably emit, then derive proof artifacts and corrections mechanically. The paper does not verify Rust or Verus, so every Verus mapping below is an inference.

## seven-phase workflow

Inference: Apply the pipeline in seven phases grouped into generation, extraction, and verification/refinement:

1. Requirements elicitation produces a structured requirement set
2. Code generation uses five prompts—architecture, compilable skeleton, leaves, controller, and review—to produce Java plus a requirement-to-code trace
3. Text-to-model (T2M) parses Java with Spoon into an EMF model conforming to a new Ecore Java metamodel
4. Model-to-model (M2M) transforms Java EMF into a RoboChart state machine with Epsilon ETL
5. Model-to-text (M2T) emits three artifacts: Dafny contracts from Java EMF, RoboChart/CSP-M text, and Isabelle Z-Machine theories from RoboChart
6. Dafny, FDR4, Isabelle, and a vacuity audit check the artifacts
7. Parsers turn failures into correction records and feed them to the next code-generation iteration

> “The pipeline comprises 7 top-level phases grouped into three families: requirements and generation (Phases 1–2, including the preflight sub-phases 2a/2b/2c), extraction (Phases 3–5, with M2T splitting into sub-phases 5a/5b/5c for the three verifiers), and verification with feedback.” (Section 3, p. 6)

Inference: The three formal targets deliberately cover different proof scopes. Dafny checks transition-level contracts, FDR4 checks whole-process CSP behavior, and Isabelle checks symbolic transition invariants and deadlock freedom. This means a candidate is accepted only when all independent views pass.

## generation constraints and preflight

Inference: The M2M extractor pattern-matches a small Java shape. Each safety controller exposes one `step(InputEvent)` method with a two-level if/else: current mode outside, transition priority inside. Guards are named boolean locals before the chain. Events are sealed interfaces with one record per concrete event. Lambdas, streams, method references, pattern-matching `instanceof`, pattern switch expressions, and ternary conditionals are forbidden. Operation methods use direct `this.field = expression` assignments and no local intermediates.

> “These are restrictions on what the Java codegen can use, not on what the controller can express.” (Section 3.1, p. 9)

Inference: Phase 2a compiles and classifies javac errors. Phase 2b checks bidirectional requirement coverage: each requirement must map to generated code and each public element must have a requirement attribution. Phase 2c runs a Spoon structural linter and names violations with source locations. This localizes errors before model transformation.

Inference: A Verus front end can use an analogous extraction profile: require explicit controller methods, named guard predicates, restricted event enums, and proof-friendly assignments; lint the generated Rust before invoking Verus. Rust enums and structs can replace sealed Java interfaces and records. A trace map should associate requirement IDs with functions, fields, and proof obligations. These are design inferences.

## extraction techniques

Inference: The Spoon-to-EMF bridge walks Spoon's AST reflectively using `CtRole`, creating dynamic EMF objects that preserve complete syntax. The ETL M2M pass identifies a mode enumeration as states, decomposes each nested branch into `(source, trigger, target, guard)`, inlines named predicates, and lifts operations, constants, sensors, and clocks into RoboChart constructs. It also emits a deadlock-lint advisory. EGL templates then generate the three verifier inputs.

> “The discoverer maps every AST node to a dynamic EMF EObject via Spoon’s CtRole enumeration, preserving the complete syntactic structure in a form downstream transformations can query.” (Section 3.2, p. 9)

Inference: The bridge matters because the prior MoDisco Java metamodel was frozen at JDK 5. The authors report a 503-line reflective discoverer versus approximately 1,200 lines of hand-coded mapping, and support Java 17+ sealed interfaces, records, and pattern syntax. The extractor and transformations are trusted infrastructure; the Java source is not.

Inference: For Verus, parse Rust into a typed intermediate model containing functions, enum states, event variants, guards, state updates, and specification clauses. Generate proof functions or ghost state-machine transitions from this model. A semantic-preservation proof between Rust and the extracted model is still required; Forge explicitly does not provide one.

## verifier evidence and feedback

Inference: Dafny translates design-by-contract obligations through Boogie to Z3 and checks preconditions, postconditions, bounds, and termination. FDR4 checks CSP deadlock freedom, divergence freedom, and failures-divergences refinement. Isabelle builds Z-Machine theories, proving operation invariants and a top-level `deadlock_free` lemma. Phase 6d rejects vacuous artifacts: a Dafny `Valid()` body equal to `true` without active behavioral ensures, or an Isabelle invariant equal to `True`.

> “Phase 6d (vacuity audit) guards against a verifier that passes only because it had nothing to prove.” (Section 3.2, p. 10)

Inference: Every phase writes Markdown and JSON feedback with status, summary, issue kind, raw tool output, a fix directive, a Java trace field, and a recommended next step. Examples are concrete: a Dafny postcondition failure asks for an event-distinguishing guard; an FDR4 STOP counterexample asks for an outgoing event transition; an Isabelle residual deadlock goal asks for a bare-precondition Tick self-loop in the offending mode.

> “Failures are translated into structured, actionable correction prompts.” (Section 3.3, p. 10)

Inference: In Verus, preserve raw verifier diagnostics and map each failed assertion, postcondition, invariant, or termination proof to the originating requirement and Rust source range. Use deterministic repair directives first; let the LLM edit only the implicated source region. The paper's structured schema supports auditability but does not prove that a suggested repair is semantically correct.

## complementarity technique

Inference: The case study reveals why one verifier is insufficient. A Chemical Detector `Final` mode is empty. Dafny sees no transition contract to violate and passes; FDR4 accepts the generated process; Isabelle's symbolic `deadlock_free` proof finds no covering operation and fails. The correction adds a bare-precondition Tick self-loop. Table 4 generalizes the split: Dafny catches contract violations; FDR4 catches behavioral deadlock and divergence; Isabelle catches structural deadlock and zstore invariants; the vacuity audit catches none of these but catches trivial obligations.

> “Behavioural deadlock (FDR4) and structural deadlock (Isabelle) are different properties even when they share a name—the complementary-verification claim, concretely.” (Section 4.4, p. 13)

Inference: A Verus system should combine function contracts, a global transition-system invariant, and a vacuity/coverage audit. Verus alone may combine these logically, but separate checks can provide defense in depth and clearer failure localization.

## evaluation and denominators

Inference: The three external case studies are SRanger (23 requirements, one controller, three modes, 221 Java LOC), LRE (51 requirements, one controller, four modes, 613 LOC), and Chemical Detector (81 requirements, two controllers, 13 modes, 618 LOC). All use the same infrastructure and no per-study transformation code. For each study, five independent convergence runs are performed.

Inference: Every one of 15 convergence runs passes all phases in two or three iterations, median two. Dafny verifies 5, 6, and 8 methods for SRanger, LRE, and Chemical Detector respectively, all with zero errors. FDR4 establishes deadlock and divergence freedom for each. Isabelle proves 10, 20, and 9 lemmas respectively. The paper reports pipeline wall time from about one minute to 15 minutes, with slow runs dominated by Isabelle residual-goal search, not by FDR4.

> “All 15 runs met the strict convergence criterion in Section 4.5: all 12 pipeline phases passed, and the vacuity audit is clean.” (Section 4.6, p. 15)

Inference: The cold baseline uses K=10 independent runs per study, 30 total, with no verifier feedback and no second LLM invocation. Zero of 30 converge. SRanger compiles 10/10 but Dafny fails all 10; LRE compiles 9/10, with Dafny first failing in 7; Chemical Detector fails compilation in all 10. These denominators show that compile-only success is not formal assurance.

Inference: The compile-only ablation runs five times per study (15 total), exposes only Phases 2a–5, and hides verifier outputs while computing them. All 15 stop-point artifacts fail at least one verifier: Dafny fails at 11 stop points, Isabelle at 5, and FDR4 at 7. Dafny is the sole failing verifier at six stop points and Isabelle the sole failing verifier at two, showing both are individually necessary in this experiment; FDR4 never fails in isolation. The paper correctly describes this as evidence for feedback's contribution, not universal model-independent proof.

## trust, assumptions, and implications for VL

Inference: The strongest unproved assumption is semantic faithfulness of T2M, M2M, and M2T. The authors provide byte-identical regression checks, traceability, and vacuity audits, but explicitly lack a semantic-preservation argument and tool qualification under DO-178C or IEC 61508. Requirements validation, process evidence, independence, configuration management, and assurance-case review remain outside the experiment.

> “The honest claim is that Forge produces evidence a human assurance engineer can review and trace, not evidence to be trusted unexamined.” (Section 5.5, p. 19)

Inference: The evaluation is limited to reactive controllers in the RoboStar/RoboChart ecosystem, Claude Opus 4.8, Java, and three studies. It does not cover hybrid automata, probabilistic systems, arbitrary concurrency, other LLM families, or Rust. The authors state that coverage and requirement mapping do not establish correctness of the mapped behavior.

Inference: VL should reuse the closed-loop discriminator, trace records, complementary proof scopes, structural preflight, and vacuity checks. VL should not redo generic arguments that “iteration helps”; the decisive controls are the 0/30 cold baseline and 15/15 compile-only verification failures. The product threat is moderate to high if agents can generate proof-shaped Rust that satisfies vacuous or incomplete specifications; the paper's audits and traceability are directly relevant mitigations. This threat rating is an inference.

## techniques for the catalog

- extraction-tractable code profile — constrain generated source to patterns that a deterministic source-to-model transformation can faithfully recognize
- top-down staged generation — generate architecture, skeleton, leaves, controller, and review layers so downstream failures can target one layer
- multi-verifier discrimination — check function contracts, whole-process behavior, and model-level invariants with complementary tools
- structured correction loop — preserve raw diagnostics, trace them to requirements and source lines, and feed actionable fix directives to the next iteration
- vacuity and coverage audits — reject obligations that prove `true` without behavior and require bidirectional requirement-to-code attribution
- cold and compile-only controls — measure verifier feedback's causal contribution by withholding it while holding generation and extraction fixed
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
