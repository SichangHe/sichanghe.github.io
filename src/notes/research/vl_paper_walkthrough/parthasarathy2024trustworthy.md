# Towards Trustworthy Automated Program Verifiers: Formally Validating Translations into an Intermediate Verification Language (extended version)
(authored by agents unless marked 🧑)
Tag: `parthasarathy2024trustworthy`, [paper](https://doi.org/10.48550/arxiv.2404.03614)

## scope and result

The paper addresses a trust gap in translational verifiers. A front end translates a source program to an intermediate verification language (IVL), and an IVL back end checks the result. Proving only the source and target logics is insufficient if the implemented translation is wrong. The authors instrument the existing Viper-to-Boogie translator so every run emits an independently checked Isabelle proof that a correct Boogie program implies correctness of the Viper program (Abstract and Sections 1 and 5, pages 1–2 and 19–21).

## technique 1: prove front-end soundness by forward simulation

What it is. A forward simulation relates source and IVL states and shows that every successful source execution has a corresponding target execution, while every failing source execution has a failing target execution. The latter implication is the soundness direction needed for verification. The paper states, “By defining the simulation such that a failing Viper execution is simulated only by failing Boogie executions, a forward simulation implies our desired result in particular.” (Section 3.1, page 9.)

When to use it. Use this method for any verifier whose front end lowers one language into another and whose back end already has a semantic correctness argument. It validates the actual translator implementation, including optimizations and alternative encodings, rather than only an idealized compiler.

How to do it. (1) Give formal operational semantics for the source and IVL languages. (2) Define an input relation and output relation between source and target states. (3) Define source success and failure predicates. (4) State a generic `sim` judgment parameterized by target context, state relations, predicates, and target program points. (5) Prove the success simulation and the failure simulation. (6) Compose statement-level simulations into a method-level theorem and then a program-level theorem. The generic judgment requires that a successful source execution reach a related target state and that a failing source execution reach target failure (Section 3.2, page 10).

Verus form. Inference: model a Verus translation as a relation between a Rust/Verus execution state and the generated SMT or IVL state, then prove a lemma that each source failure has a corresponding target failure. Inference: use Verus `requires` and `ensures` for local semantic contracts and proof functions for simulation lemmas; a separate Isabelle or Lean checker would still be needed to validate the translation implementation itself. The paper does not use Verus.

Evidence and limits. The method assumes formal semantics for both languages and a trustworthy independent proof checker. It does not by itself prove the IVL back end, SMT solver, compiler, or runtime. The paper explicitly separates front-end soundness from IVL back-end soundness (Section 1, pages 2–3).

## technique 2: decompose translations into semantic effects and compose generic lemmas

What it is. Instead of one monolithic proof over the entire translation, the authors split each source statement into semantic effects and prove small simulations for each. Viper `exhale`, for example, has a permission-removal check (`remcheck`) and a nondeterministic assignment; each gets a simulation and the two are composed (Sections 3.1 and 3.4, pages 9 and 12). The paper's general strategy is “syntactic and semantic decompositions into smaller and more-focused simulation sub-results that are easier to automate.” (Section 3, page 9.)

When to use it. Use effect decomposition when source and target syntax differ, when one source construct expands to several target commands, or when proofs repeatedly handle the same operation. It keeps each proof obligation local and makes translator changes less brittle.

How to do it. (1) Identify the semantic effects of each source construct. (2) Instantiate the generic `sim` judgment for each effect, such as `stmSim`, `wfSim`, or `rcSim`. (3) Define intermediate state relations between effects. (4) Prove generic composition lemmas for sequential composition, separating conjunction, conditionals, and stuttering target steps. (5) Apply the composition rule to rebuild the source statement simulation. Figure 5's `comp` rule composes two simulations when the first output relation and program point match the second input relation and point (Section 3.3, page 11).

Verus form. Inference: split a Rust translation or verified wrapper into proof lemmas for parsing, state update, permission checks, and nondeterministic choices. Use intermediate predicates to connect the postcondition of one effect to the precondition of the next. Inference: this decomposition can reduce solver search, but the state relation must be explicit because Verus does not infer semantic correspondence between two programs.

Evidence and limits. The authors report that generic composition rules are proved once and instantiated for multiple translations, including sequential statements, `remcheck`, and `inhale` (Section 3.3, page 11). The approach still requires formal semantic definitions for every source effect and target command.

## technique 3: parameterize simulations for diverse translations

What it is. The generic simulation relation abstracts over state representations, input/output relations, success and failure predicates, and target program points. Concrete simulations are instantiations, so alternative target encodings can use the same proof rules. This handles translators that choose different encodings for the same source feature (Sections 3.2–3.4, pages 10–12).

When to use it. Use parameterization when an implementation has optimized and fallback translations, or when a translator evolves while preserving a common semantic interface. Keep translation-specific details in state relations and instantiation lemmas rather than in the generic composition machinery.

How to do it. (1) Define `sim` with parameters for target context Γb, relations Rin/Rout, source success/failure predicates, and target entry/exit points. (2) Instantiate it for each semantic effect. (3) Prove instantiation-independent composition and propagation rules. (4) Supply hints identifying which alternative encoding was selected. (5) Reuse the same tactic and lemmas for each encoding. The authors show `exh-sim` handling two implementations of nondeterministic heap assignment, including one that emits no Boogie code when no permission is removed (Section 3.4, page 12).

Verus form. Inference: define a generic Verus predicate relating source and generated-state records, parameterized by the translation variant. Prove variant-specific lemmas and reuse generic sequencing lemmas. Inference: this can support multiple Rust code-generation strategies while keeping one proof interface, but the final theorem must quantify over every enabled variant.

Evidence and limits. The paper argues that genericity “provides the abstraction to address the diverse translations used in practical translational verifiers” (Section 3.4, page 12). It evaluates one implemented Viper-to-Boogie translator, so portability beyond that case is a methodological claim rather than a measured result.

## technique 4: inject non-local hypotheses through state relations

What it is. Some translation checks are performed elsewhere from the effect being simulated. The methodology carries a contextual predicate Q in the state relation, then uses specialized simulation rules that preserve Q through decomposition. For `remcheck`, Q records a well-formedness fact established at an earlier program point (Section 3.5, pages 12–13).

When to use it. Use contextual hypotheses when a local translation omits a check because a caller, method specification, or earlier pass guarantees it. This avoids repeating the same global reasoning at every syntax node while making the assumption explicit in the proof state.

How to do it. (1) Identify the non-local fact and define Q over assertions and states. (2) Add Q to the input relation of the specialized simulation. (3) Prove that Q propagates through each semantic effect. (4) For a separating conjunction A1∗A2, prove the rsep-sim premise that Q for the whole assertion implies Q for A1 and for the post-state of A1 before simulating A2. (5) Reuse the specialized rule at every occurrence. Figure 7 shows this pattern and says the propagation premise can be proved once for all assertions (Section 3.5, page 13).

Verus form. Inference: encode Q as a ghost predicate on the current Rust state and assertion, include it in lemma `requires`, and carry it in the proof context while decomposing a command. Inference: this is safer than silently trusting a caller-side check, but it remains an assumption unless the caller's proof establishes Q.

Evidence and limits. The paper's Q mechanism addresses the Viper implementation's omitted well-definedness checks for `remcheck` and `inhale`; it does not automatically discover missing hypotheses. A wrong Q or an unsound caller proof can still invalidate the translation result.

## technique 5: generate and independently check a proof for every run

What it is. Instrumentation in the existing translator emits an Isabelle proof connecting the input Viper AST to the internal Boogie AST. Isabelle checks the proof independently, and the implementation avoids trusting the Boogie text parser by relating ASTs directly (Section 5, page 19). The abstract states, “For each run of the verifier, we automatically generate a proof in Isabelle showing that the correctness of the produced IVL program implies the correctness of the input program.” (Abstract, page 1.)

When to use it. Use proof-producing translation when the translator is large, changes frequently, or cannot itself be fully formalized. Per-run certificates let a small trusted checker validate the exact translation used for a program.

How to do it. (1) Instrument each translation branch to emit proof hints for the selected encoding. (2) Generate the Boogie translation and Isabelle proof from the same source AST. (3) Check the proof in Isabelle. (4) Reject the run if checking fails. (5) Keep unsupported syntax and implementation transformations explicit; the paper disables unsupported constant folding and introduces a faithful `havoc` for scoped variables (Section 5, page 19). (6) Compose per-method relational proofs into a program-level theorem (Section 4.5, pages 17–19).

Verus form. Inference: emit a proof certificate or serialized proof obligations alongside generated Verus code, then check them in an independently trusted Verus/SMT environment. Inference: Verus proof functions are erased from executable Rust, so certificate checking must happen before erasure and cannot rely on a run-time proof call. The paper's Isabelle certificate architecture is a model for a separate translation checker, not a Verus feature.

Evidence and limits. The study used 72 Viper files containing 299 methods from Viper, Gobra, VerCors, and MPP suites. Isabelle checked every generated proof. The overall means were 54 Viper lines, 335 Boogie lines, 2,217 Isabelle lines, and 39.0 seconds mean proof-check time with 32.9 seconds median (Table 1, page 20). No file took longer than four minutes in this evaluation (Section 5, page 21). These denominators are files and methods as shown; the timing is the mean of five repetitions on the stated ThinkPad setup.

## what is proved, measured, and trusted

The formal development proves forward-simulation rules and derives front-end soundness for the supported Viper subset and implemented translation. The evaluation measures certificate generation and Isabelle checking, not the correctness of Boogie, Z3, the Viper source semantics outside the formalized subset, or unsupported translator optimizations. The paper reports that generated Boogie translations average 6.2 times the non-empty lines of Viper code (Section 5, page 21), illustrating the semantic gap rather than a proof of complexity.

Inference: for Verus, a trustworthy translation pipeline should separate the trusted certificate checker from the code generator, and should state which Rust features, libraries, and solver translations remain outside the certificate. Inference: the threat to agent-written verified Rust is high at the front end: a sound Verus proof can certify the wrong IVL obligations if an agent-generated translation drops a check or misstates a state relation. Per-run certificates would make that class of bug mechanically visible, but they do not validate the user's specification or external code.

## contradictions and what VL should not redo

The paper says Isabelle checked all 72 files and also says the resulting proofs are checked in less than a minute, while Table 2 lists selected files taking 38 seconds to 242.4 seconds. These statements use different scopes: “less than a minute” is the broad evaluation summary, whereas Table 2 contains selected larger examples, including MPP files, and reports individual totals (Sections 5, pages 20–21). The paper also disables several implementation transformations and supports only a subset, so the result is not evidence for every Viper feature.

Inference: VL should not redo a generic claim that front-end translations need soundness proofs. This paper already provides a per-run Isabelle method, decomposition rules, and measured coverage. A useful new experiment would apply the certificate pattern to the Verus-to-SMT translation or to agent-generated proof scaffolding, then measure which translation bugs are caught and the certificate-check cost under dependency and compiler upgrades.

## techniques for the catalog

- forward-simulation certificates: prove that every source failure has a corresponding failing target execution
- semantic-effect decomposition: split source constructs into small effects and compose generic simulation lemmas
- parameterized simulations: reuse one generic judgment across alternative translation encodings
- contextual hypotheses: carry non-local well-formedness facts in state relations and specialized rules
- per-run proof production: generate an independently checked Isabelle certificate from each concrete translation
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
