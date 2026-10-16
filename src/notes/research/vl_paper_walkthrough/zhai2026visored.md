# Visored: A Controlled-Natural-Language Prover for LLM-Generated Mathematics
(authored by agents unless marked 🧑)
Tag: `zhai2026visored`, [paper](https://www.semanticscholar.org/paper/e689160adfd81f21f473dc73bab48235171d379a)

## what the paper builds

Visored is a controlled-natural-language (CNL) prover whose input is LaTeX containing structured English proof sentences. It parses those sentences into a typed intermediate representation (IR), discharges omitted routine steps with a cost-bounded rule solver, and optionally emits Lean for an independent kernel check. The central engineering claim is that semantic choices which ordinary prose leaves implicit should be made explicit in the IR. The paper states: “Visored is a semantically rich intermediate representation (IR) in which every decision that has no surface trace in the LaTeX, namely subtype, library lemma, edge-case convention, and cast, is made explicit.” (Section 1, p. 2)

The intended user is an LLM. A proof is accepted by Visored or rejected with a source-local diagnostic. Lean emission is downstream and optional; Visored’s own verdict does not depend on Lean. The design therefore separates a natural mathematical surface from a trusted checker and from target-specific code generation.

## technique 1: spec-driven CNL parsing

What it is. The accepted English templates and LaTeX commands live in external `.lpcsv` specification files. Examples include `Let`, `Assume`, `Then`, `We have`, induction, contradiction, and case analysis. Multiple phrasings map to one constructor. Math mode uses a precedence-aware stack parser; prose uses trie-like matching of token streams against declared templates. Unknown commands produce a structured `UnknownCommand` diagnostic.

When to use it. Use this when an agent should write proofs in a readable mathematical surface while the language remains finite enough to parse deterministically. Add a spec entry for a new sentence form or notation instead of changing parser code.

How it is done. First put proof content in a proof-bearing environment. Second tokenize math and prose separately. Third parse math operators with precedence and prose by template matching. Fourth attach source spans and construct an untyped syntax tree. Fifth resolve names and defer type-dependent ambiguities to semantic elaboration. The paper’s concrete template examples include “Let {formula}”, “Assume {formula}”, and “Then {prop}”. (Appendix B, pp. 17–18)

Verus form. Inference: a Verus front end could retain a small annotation language or Rust macro syntax and lower it into Rust/Verus AST. A proc-macro or external parser would map controlled sentences to `requires`, `ensures`, `assert`, `assume`, and proof-function bodies. Verus does not provide Visored’s CNL parser, trie matcher, or `.lpcsv` configuration, so these are external tooling. The verified Rust remains the artifact checked by Verus; parser correctness is trusted unless its output is independently checked.

Evidence. In the worked examples, a two-line CNL substitution corresponds to a Lean proof requiring square-root lemmas and nonlinear arithmetic, and all three pairs are checked by the artifact Makefile (Section 4, pp. 5–6). This demonstrates reduced surface burden, not that parsing alone proves a theorem.

Assumptions and failure. Inputs outside the configured vocabulary are rejected rather than silently coerced. The vocabulary is therefore a coverage boundary. The experiment also requires an LLM to follow a documented skill and revise after diagnostics; it is not a free-form natural-language theorem prover.

## technique 2: typed IR with explicit well-definedness

What it is. Visored lowers syntax to a typed AST and then to MIR. Every expression carries a kind and type, and partial-function side conditions become proof obligations. Division requires a nonzero divisor, square root requires a nonnegative argument, and logarithm requires a positive argument. Obligations flow asymmetrically through logical context: in `a ∧ b`, facts from `a` are available while checking `b`; implication and conditional branches behave similarly.

When to use it. Use this whenever informal notation can be semantically ambiguous or partial. Make subtype, coercion, edge-case, and library choices explicit before proof search, so a compiling statement cannot silently drift from its prose meaning.

How it is done. Parse to syntax; resolve names against local and global scopes; assign least natural types bottom-up; generate obligations for each partial operation; propagate guards through conjunction, implication, and branches; add obligations to the proof state; discharge them with the same solver used for ordinary goals. The paper says: “Elaboration also enforces well-definedness: writing 1/x demands x ̸= 0, x demands x ≥ 0, log x demands x > 0, with the demands flowing asymmetrically through boolean connectives.” (Section 3, p. 4)

Verus form. Inference: encode domain conditions as `requires` clauses or explicit hypotheses, for example `requires x != 0` before a division specification, and use `assert` or proof functions to establish branch-local conditions. Rust arithmetic itself is total or machine-defined, so mathematical partiality must be modeled in specifications and ghost code. Verus has dependent-like types only in its own supported sense; the Visored least-type canonicalization and predicate-subtyping machinery do not carry over directly.

Evidence. The paper reports that accepted CNL proofs can be emitted to Lean, where `lake build` performs kernel-level checking (Figure 2, p. 4; Section 4, p. 5). The trusted result is therefore a checked proof only after generated Lean compiles; the Visored verdict itself is from its own prototype kernel.

Failure and trust. Lightweight dependent typing excludes nontrivial dependent indexing and higher inductives (Section 7, p. 9). The side-condition mechanism assumes the obligation solver is sound; the paper does not provide a machine-checked proof of Visored’s implementation.

## technique 3: cost-bounded rule solving

What it is. Rules are divided into backward and forward databases. Backward rules unify a goal with a conclusion and recurse on assumptions; forward rules match newly derived hypotheses and add consequences. A discrimination tree indexes each database. The Miracle runtime schedules nondeterministic continuations by fee under a global cost budget, with sub-budgets for subgoals.

When to use it. Use this for routine deductions that should be automated but must terminate predictably. Give cheap, reliable rules priority and return a localized unclosed goal when the budget is exhausted.

How it is done. Write a proposition-shaped rule in a spec file, load it into the appropriate database, canonicalize expressions, enqueue matching continuations with costs, explore by priority, and stop branches over budget. The paper’s rule shape is a proposition containing `Let`, `Assume`, and `Then`; adding a rule does not modify elaborator source (Appendix E.2, p. 21). The paper states: “The budget bounds end-to-end work and rules out non-termination, while the per-step fee scheme lets cheap and reliable rules fire first.” (Appendix E.3, p. 21)

Verus form. Inference: implement analogous search outside Verus (for example, a Rust proof generator that emits candidate `assert` and proof-function steps), then run Verus on the result. Inside Verus, `assert`, `assert forall`, `broadcast proof fn`, `requires`, and `ensures` can express lemmas and obligations, but Verus does not expose a user-extensible priority rule database or cost-bounded nondeterministic runtime. A generated proof function must be compile-time proof code, never a runtime call relied upon for safety.

Evidence. The coverage protocol used one Claude coding agent on all 244 `miniF2F-valid` problems, allowing rules to be added as gaps appeared. It produced accepted proofs for 222/244, 91% (Section 6, p. 7). Denominator and setting matter: this is the development/evaluation split, no bounded retry budget was imposed, and it is not held-out generalization. Rates were induction 8/8 (100%), algebra 86/88 (98%), number theory 66/68 (97%), AMC 42/45 (93%), AIME 13/15 (87%), and IMO 7/20 (35%) (Table 1, p. 8).

Failure and trust. Twenty-two cases remained unsolved; examples include missing AM–GM, limits, finite-field types, trigonometric identities, and a regression. The paper explicitly attributes these to Visored gaps, while one case is a regression (Table 2, p. 8). Rule additions during evaluation make the result a co-development coverage number, not a benchmark of a frozen system.

## technique 4: canonical normalization and target-neutral emission

What it is. A fixed-point normalizer turns accepted expressions into canonical forms after well-definedness is known. UVL MIR stores derivation operations independently of Lean. Sparse emission makes each step a private Lean lemma; dense emission groups steps into a tactic block. Discharge primitives include `norm_num`, `ring`, `decide`, `native_decide`, `simp`, and custom tactics.

When to use it. Canonicalization reduces rule matching complexity. A target-neutral IR is useful when adding Rocq or another backend. Choose sparse output when per-step diagnostics matter and dense output when size and compile time matter more.

How it is done. Normalize each expression to a fixed point; record derivation steps and coercion witnesses; lower to UVL; select a target formatter and discharge primitive; compile the emitted file with the host kernel. The paper reports: “The sparse scheme, which is the current default, realises each Visored derivation step as its own private lemma, with the step’s inputs and outputs spelled out explicitly.” (Appendix F.2, p. 25)

Verus form. Inference: a Verus backend could lower a proof IR to ghost Rust functions and `assert`/`ensures` obligations, with `exec` functions separated from `proof` and `spec` code. Canonicalization would be an external transformation or verified ghost lemma library; Verus has no UVL or automatic coercion-witness packet. Do not mark a function under verification `external_body`; any trusted external body would remove the intended guarantee.

Evidence and cost. The supporting Lean snapshot contains roughly 3,600 theorems across 280 files and 46,000 lines, plus about 170 custom declarations (Appendix F.6, p. 26). On 244 problems, only 32 emitted nontrivial Lean; the sparse output had median ratio about 250×, mean about 1,170×, and a maximum about 24,800×: a 6-line CNL input became 148,889 Lean lines with 37,416 named lemmas (Appendix F.7, p. 27). These denominators and the subset (32 emissions) are essential to interpreting the ratios.

Failure and trust. Lean has no matching normalizer that can reuse Visored’s discharged side conditions, causing verbosity. The emitter’s primitive-selection heuristic can make compilation much slower or fail far from the original error (Appendix F.5, p. 26). The Lean kernel checks emitted proofs, but the large supporting library and the Visored-to-UVL transformation remain trusted engineering components.

## implications for verified Rust agents

Inference: Visored’s strongest product lesson is to expose structured, local diagnostics and preserve semantic decisions in an IR before asking a low-level verifier to finish. This threatens a VeruLaw-style product only if users expect unrestricted prose-to-proof translation; Visored’s 91% is on elementary problems, with co-developed rules and no held-out test. Its reusable ideas are the CNL-to-IR boundary, explicit partiality obligations, deterministic normalization, and feedback loops. Existing VL work should not redo a natural-language parser or generic Lean emitter without measuring whether the target users need those surfaces; the paper already documents substantial transpilation cost and a large library burden.

What is proved or measured: emitted Lean files compile for accepted examples; coverage is 222/244 under the stated protocol; the paper lists concrete unsolved categories and output-size measurements. What stays trusted: Visored implementation, spec files, rule databases, UVL formatter, and the supporting Lean library (until each is independently audited by its host kernel). The CNL text itself is not evidence without a checked artifact.

## techniques for the catalog

- spec-driven CNL parsing — map controlled mathematical sentences and LaTeX commands to typed syntax using editable specifications and localized diagnostics
- explicit well-definedness obligations — generate and solve domain hypotheses for partial functions with asymmetric logical-context flow
- cost-bounded forward/backward rule search — index rules, schedule them by fees, and terminate with a source-local diagnostic on budget exhaustion
- canonical IR and target emission — normalize before matching, record derivations in a target-neutral IR, and choose sparse or dense backend output

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
