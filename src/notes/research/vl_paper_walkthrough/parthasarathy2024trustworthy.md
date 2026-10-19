# Towards Trustworthy Automated Program Verifiers: Formally Validating Translations into an Intermediate Verification Language (extended version)
(authored by agents unless marked 🧑)
Tag: `parthasarathy2024trustworthy`, [paper](https://arxiv.org/abs/2404.03614)

## scope and result

The paper addresses a trust gap in translational verifiers. A front end translates a source program to an intermediate verification language (IVL), and an IVL back end checks the result. Proving only the source and target logics is insufficient if the implemented translation is wrong. For a supported Viper subset, the authors instrument and adjust the existing Viper-to-Boogie translator to emit an Isabelle proof that correctness of the Boogie program implies correctness of the Viper program. The proof can be checked independently (Abstract and Sections 1 and 5, pages 1–2 and 19–21).

## technique 1: prove front-end soundness by forward simulation

What it is. A forward simulation relates source and IVL states and shows that every successful source execution has a corresponding target execution, while every failing source execution has a failing target execution. The latter implication is the soundness direction needed for verification. The paper states, “By defining the simulation such that a failing Viper execution is simulated only by failing Boogie executions, a forward simulation implies our desired result in particular.” (Section 3.1, page 9.)

When to use it. Inference: use this method for a front-end translation when both languages have formal semantics and the implementation can be instrumented. Back-end validation is separate. The paper validates translations produced by an adjusted existing implementation, including supported alternative encodings; it does not cover all its optimizations (Sections 5 and 7, pages 19–23).

How to do it. (1) Give formal operational semantics for the source and IVL languages. (2) Define an input relation and output relation between source and target states. (3) Define source success and failure predicates. (4) State a generic `sim` judgment parameterized by target context, state relations, predicates, and target program points. (5) Prove the success simulation and the failure simulation. (6) Compose statement-level simulations into a method-level theorem and then a program-level theorem. The generic judgment requires that a successful source execution reach a related target state and that a failing source execution reach target failure (Section 3.2, page 10); Section 4.5 derives the final theorem (pages 18–19).

Verus form. Inference: model a Verus translation as a relation between a Rust/Verus execution state and the generated SMT or IVL state, then prove a lemma that each source failure has a corresponding target failure. Inference: local semantic contracts and simulation lemmas could express parts of such a proof, but the certificate must connect the actual input and output programs to their formal semantics. The paper does not use Verus.

Evidence and limits. The method assumes formal semantics for both languages and a trustworthy independent proof checker. It does not by itself prove the IVL back end, SMT solver, compiler, or runtime. The paper explicitly separates front-end soundness from IVL back-end soundness (Section 1, pages 2–3).

## technique 2: decompose translations into semantic effects and compose generic lemmas

What it is. Instead of one monolithic proof over the entire translation, the authors decompose simulations syntactically and, where useful, split a source statement into semantic effects. Viper `exhale`, for example, has a permission-removal check (`remcheck`) and a nondeterministic assignment; each gets a simulation and the two are composed (Sections 3.1 and 3.4, pages 9 and 12). The paper describes “syntactic and semantic decompositions into smaller and more-focused simulation sub-results that are easier to automate” (Section 3, page 9.)

When to use it. Inference: use effect decomposition when source and target syntax differ, when one source construct expands to several target commands, or when proofs repeatedly handle the same operation. It keeps each proof obligation local and makes translator changes less brittle.

How to do it. (1) Identify the semantic effects of each source construct. (2) Instantiate the generic `sim` judgment for each effect, such as `stmSim`, `wfSim`, or `rcSim`. (3) Define intermediate state relations between effects. (4) Prove generic composition lemmas for sequential composition, separating conjunction, conditionals, and stuttering target steps. (5) Apply the composition rule to rebuild the source statement simulation. Figure 5's `comp` rule composes two simulations when the first output relation and program point match the second input relation and point (Section 3.3, page 11).

Verus form. Inference: split a Rust translation or verified wrapper into proof lemmas for parsing, state update, permission checks, and nondeterministic choices. Use intermediate predicates to connect the postcondition of one effect to the precondition of the next. Inference: this decomposition could simplify proof obligations; an explicit state relation would specify the correspondence between the programs.

Evidence and limits. The authors report that generic composition rules are proved once and instantiated for multiple translations, including sequential statements, `remcheck`, and `inhale` (Section 3.3, page 11). The approach still requires formal semantic definitions for every source effect and target command.

## technique 3: parameterize simulations for diverse translations

What it is. The generic simulation relation abstracts over state representations, input/output relations, success and failure predicates, and target program points. Concrete simulations are instantiations, so alternative target encodings can use the same proof rules. This handles translators that choose different encodings for the same source feature (Sections 3.2–3.4, pages 10–12).

When to use it. Inference: use parameterization when an implementation has optimized and fallback translations, or when a translator evolves while preserving a common semantic interface. Keep translation-specific details in state relations and instantiation lemmas rather than in the generic composition machinery.

How to do it. (1) Define `sim` with parameters for target context Γb, relations Rin/Rout, source success/failure predicates, and target entry/exit points. (2) Instantiate it for each semantic effect. (3) Prove instantiation-independent composition and propagation rules. (4) Supply hints identifying which alternative encoding was selected. (5) Reuse generic rules while providing translation-specific proof strategies for atomic effects. The authors show `exh-sim` handling two implementations of nondeterministic heap assignment, including one that emits no code for the nondeterministic assignment when the assertion contains no accessibility predicate (Section 3.4, page 12).

Verus form. Inference: define a generic Verus predicate relating source and generated-state records, parameterized by the translation variant. Prove variant-specific lemmas and reuse generic sequencing lemmas. Inference: this can support multiple Rust code-generation strategies while keeping one proof interface, with each concrete translation requiring a checked proof.

Evidence and limits. The paper argues that genericity “provides the abstraction to address the diverse translations used in practical translational verifiers” (Section 3.4, page 12). It evaluates one implemented Viper-to-Boogie translator. Inference: portability beyond that case is a methodological claim rather than a measured result.

## technique 4: inject non-local hypotheses through state relations

What it is. Some translation checks are performed elsewhere from the effect being simulated. The methodology carries a contextual predicate Q in the state relation, then uses specialized simulation rules that preserve Q through decomposition. For a method-call precondition, the hypothesis comes from the specification well-formedness check in the callee’s translated procedure, not necessarily an earlier point in the caller (Sections 3.5 and 4.2, pages 12–15).

When to use it. Inference: use contextual hypotheses when a local translation omits a check because a caller, method specification, or earlier pass guarantees it. This avoids repeating the same global reasoning at every syntax node while making the assumption explicit in the proof state.

How to do it. (1) Identify the non-local fact and define Q over assertions and states. (2) Add Q to the input relation of the specialized simulation. (3) Prove that Q propagates through each semantic effect. (4) For a separating conjunction A1∗A2, prove the rsep-sim premise that Q for the whole assertion implies Q for A1 and for the post-state of A1 before simulating A2. (5) Reuse the specialized rule at every occurrence. Figure 7 shows this pattern and says the propagation premise can be proved once for all assertions (Section 3.5, page 13).

Verus form. Inference: encode Q as a ghost predicate on the current Rust state and assertion, include it in lemma `requires`, and carry it in the proof context while decomposing a command. Inference: the final theorem must justify Q from the relevant non-local check, rather than leave it as an unchecked assumption.

Evidence and limits. The paper applies Q to omitted well-definedness checks for `remcheck` and discusses the analogous issue for `inhale` (Sections 3.5 and 4.2, pages 12–15). It proves a partial inversion lemma relating `remcheck` and `inhale` to propagate the chosen predicate (Lemma 4.1, page 15). Section 4.5 discharges specification well-formedness assumptions using correctness of all translated procedures (pages 18–19).

## technique 5: generate and independently check a proof for every run

What it is. Instrumentation in the existing translator emits an Isabelle proof connecting the input Viper AST to the internal Boogie AST. Isabelle checks the proof independently, and the implementation avoids trusting the Boogie text parser by relating ASTs directly (Section 5, page 19). The abstract states, “For each run of the verifier, we automatically generate a proof in Isabelle showing that the correctness of the produced IVL program implies the correctness of the input program.” (Abstract, page 1.)

When to use it. Inference: use proof-producing translation when the translator is large, changes frequently, or cannot itself be fully formalized. Per-run certificates let an independent proof checker validate the concrete translation used for a program.

How to do it. (1) Instrument each translation branch to emit proof hints for the selected encoding. (2) Generate the Boogie translation and Isabelle proof from the same source AST. (3) Check the proof in Isabelle. (4) Compose per-method relational proofs into a program-level theorem (Section 4.5, pages 18–19). Inference: accept a translation as certified only after the proof checks. The implementation also desugars polymorphic maps, omits declarations and commands used only by unsupported features, disables simple syntactic transformations including constant folding, and introduces `havoc` where a scoped Viper variable is declared (Section 5, pages 19–20).

Verus form. Inference: a corresponding Verus experiment would emit a certificate relating the actual source and translated programs and check it independently. The paper implements this architecture in Isabelle for Viper-to-Boogie; it does not establish a Verus implementation.

Evidence and limits. The study used 72 Viper files containing 299 methods from Viper, Gobra, VerCors, and MPP suites. Isabelle checked every generated proof. The overall means were 54 Viper lines, 335 Boogie lines, 2,217 Isabelle lines, and 39.0 seconds mean proof-check time with 32.9 seconds median (Table 1, page 20). Table 2 reports 242.4 seconds for MPP’s `banerjee` file (page 21; also Appendix D, Table 4, page 28). These denominators are files and methods as shown; the timing is the mean of five repetitions on the stated ThinkPad setup.

## what is proved, measured, and trusted

The formal development proves forward-simulation rules and derives front-end soundness for the supported Viper subset and implemented translation. The evaluation demonstrates certificate generation and measures Isabelle proof-checking time, not the correctness of Boogie, Z3, the Viper source semantics outside the formalized subset, or unsupported translator optimizations. The paper reports that generated Boogie translations average 6.2 times the non-empty lines of Viper code (Section 5, page 20). Inference: this expansion illustrates the encoding size difference, not a general complexity bound.

Inference: for Verus, a trustworthy translation pipeline should separate the trusted certificate checker from the code generator, and should state which Rust features, libraries, and solver translations remain outside the certificate. Inference: a certificate could detect a translation that drops a required check if that omission prevents proving the semantic correspondence. It would not establish that the user’s specification expresses their intent.

## techniques for the catalog

- forward-simulation certificates: prove that every source failure has a corresponding failing target execution
- semantic-effect decomposition: split source constructs into small effects and compose generic simulation lemmas
- parameterized simulations: reuse one generic judgment across alternative translation encodings
- contextual hypotheses: carry non-local well-formedness facts in state relations and specialized rules
- per-run proof production: generate an independently checked Isabelle certificate from each concrete translation
