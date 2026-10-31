# Verifier-Guided Code Translation via Meta-Step Decoding
(authored by agents unless marked 🧑)
Tag: `zhou2026metastep`, [paper](https://arxiv.org/abs/2605.17626)

## scope and result

This paper presents Decoding Time Verification (DTV), a controller that interrupts code generation at structural boundaries, runs deterministic compiler/type/lint oracles, and either commits the prefix or rolls it back with diagnostic feedback. The abstract states: “DTV interleaves generation with verifier calls under a state-machine controller that enforces valid prefixes, using structural-boundary checks and structure-aware rollback to prevent error propagation while reducing wasted tokens.” (Abstract, p. 1). It is evaluated on C-to-Rust and JavaScript-to-TypeScript translation, not on formal proof. Its oracles are compilers, a linter, and finite differential tests.

DTV has six controller actions: GENERATE, VERIFY, COMMIT, ROLLBACK, FEEDBACK, and TERMINATE (Section 2.1, p. 3). Generation uses an unchanged pretrained model between boundaries; the controller is a meta-level wrapper around greedy, top-k, or top-p sampling (Section 2.2, p. 4). A scope set orders statement, block, function, and program from fine to coarse. A deterministic renderer turns a boundary-terminated prefix into an oracle-consumable artifact. Each oracle returns pass, fail, or not-applicable plus diagnostics (Section 2.1, p. 3).

## technique 1: structural-boundary verification and legal-prefix commits

What it is. DTV does not verify arbitrary token prefixes because they are often syntactically incomplete. It stops at a completed statement, block, function, or program, renders the prefix, invokes the oracles applicable at that scope, and commits only when all applicable oracles pass. The paper calls this the “legal prefix invariant: only prefixes satisfying all applicable verifiers are admitted as conditioning context for subsequent decoding.” (Section 1, p. 2).

When to use it. Use this when a verifier needs a complete syntactic unit, such as `rustc`, `tsc`, ESLint, or a test runner, and when an early error could poison the autoregressive context for later tokens.

How to apply it.

1. Define an ordered scope set, for example `stmt ⪯ block ⪯ func ⪯ program`, and mark the closing token of each scope (Section 2.1, p. 3).
2. Implement a deterministic renderer that accepts only a prefix ending at a structural boundary and emits an artifact plus its scope (Section 2.1, p. 3).
3. Give each oracle an applicability predicate; run it only when the artifact is large enough and meaningful for that oracle (Section 2.1, p. 3).
4. At each boundary, commit the prefix only when every applicable oracle returns pass; continue sampling from that committed context (Section 2.2, p. 4).
5. Terminate on program-level pass, bailout, or token-budget exhaustion (Section 2.2, p. 4).

The concrete renderer maintains a group stack, pushes at block/function openings, pops at corresponding closings, and has a token-level stop criterion aware of strings, comments, and nested delimiters (Appendix H, p. 19). Prefix diagnostics caused only by incompleteness are filtered before they affect the controller (Appendix E, pp. 16–17).

Verus form. Inference: model a generated Rust prefix as a ghost sequence with a `spec fn` identifying structural boundaries and a predicate for an oracle-clean checkpoint. A proof function can use `requires` for a well-formed parser state and `ensures` to state that committed prefixes end at a boundary and satisfy the selected abstract obligations. A loop `invariant` can preserve that every stored checkpoint is boundary-terminated. This is a control and specification analogue, not a proof that a Verus program is semantically correct.

Evidence and limits. On the full sets, DTV/one-shot reaches 47.0% compile pass on 300 C-to-Rust cases versus 16.3% for naive/one-shot, and 21.3% on 150 JS-to-TS cases versus 4.7% (Table 5, Appendix J.2, p. 21). These are compiler/linter pass rates. The paper requires that “the committed prefix can be extended into a program that passes all oracles” (Section 2.2, p. 4) but commits when the oracles applicable at the current scope pass (Algorithm 1, Appendix G, p. 19). Inference: that check does not establish extendability, so the invariant guides checkpointing and is not proved.

## technique 2: deterministic oracle composition and diagnostic filtering

What it is. The oracle suite is task-specific. C-to-Rust uses `rustc` in the loop and differential testing after generation; JavaScript-to-TypeScript uses `tsc` and ESLint because executable tests are unavailable (Section 3, p. 5; Appendix E, pp. 15–16). The abstract oracle interface returns `(qj, dj)` where `qj` is pass, fail, or not applicable and `dj` is diagnostic text (Section 2.1, p. 3). DTV uses compiler-style diagnostics for local rollback while reserving slower or weaker signals for final evaluation.

When to use it. Use this when multiple deterministic checks cover distinct failure classes, but only some checks can operate on partial artifacts or provide source-local diagnostics.

How to apply it.

1. List all candidate oracles and define applicability from artifact scope and features (Section 2.1, p. 3).
2. Separate structural incompleteness from real translation failures. The paper drops rustc diagnostics whose spans extend past the prefix, analogous tsc diagnostics, and ESLint diagnostics beyond the prefix boundary (Appendix E, p. 17).
3. If an oracle is intentionally weakened for partial programs, document that separately from noise filtering. For JS-to-TS, in-loop tsc disables strict mode and drops TS2322, TS2339, and TS2345; outer and post-hoc tsc retain those checks (Appendix E, p. 17).
4. Store each failing oracle's message and source anchor in feedback state, and use it for scope selection and prompt augmentation (Section 2.2, pp. 4–5).
5. Retain a stronger post-hoc oracle where in-loop checks are incomplete; C-to-Rust differential testing is explicitly not given to the DTV controller (Table 3, Appendix E, p. 16; Appendix A, p. 13).

Verus form. Inference: represent each Rust verifier as a proof-relevant record with a `spec fn` result and diagnostic anchor. Use `requires` to state which artifact model the checker accepts and `ensures` to preserve the source location of a failing obligation. A Verus proof may combine contracts and executable tests, but finite test outputs cannot replace universal `ensures`; external compilers and linters remain trusted tools unless modeled and proved.

Evidence and limits. The C-to-Rust dataset's final 300 cases are drawn from 306 candidates; its surviving fuzz corpus has mean per-sample line coverage 93.4% and aggregate line coverage 85.1% (11,721/13,781), with aggregate branch coverage 78.9% (6,838/8,662) (Appendix E, pp. 16–17). These denominators describe test-input coverage, not proof coverage. JS-to-TS has no executable test suite, so its oracle evidence is only `tsc` plus ESLint (Appendix E, pp. 15–16). The authors warn that global pass/fail oracles cannot guide structure-aware rollback and that nonlocal errors exceed the bounded rollback ladder (Appendix A, p. 13).

## technique 3: feedback state and prompt augmentation

What it is. Rollback alone resamples under the same conditioning context. DTV maintains a bounded feedback state containing unresolved diagnostics, updates it deterministically after each oracle result, encodes it as a textual block, and augments the source prompt. The paper says: “Rollback-with-feedback is therefore not blind resampling: decoding resumes under updated feedback while S remains fixed.” (Section 2.2, p. 5).

When to use it. Use it when diagnostics identify an actionable local error and the model can repair it if the error and source anchor are made explicit.

How to apply it.

1. After each verification, add new failures and drop failures resolved by passing verdicts; bound the number of retained records (Section 2.2, p. 4).
2. Encode active diagnostics into a prompt block and replace the original conditioning context with the augmented context while keeping the source fixed (Section 2.2, pp. 4–5).
3. Retry either by inline continuation, appending the diagnostic as a comment, or by a new turn requesting a minimal patch (Section 2.2, p. 5; Appendix H, pp. 19–20).
4. Reject patches outside the chosen rollback scope and advance the retry ladder when the same diagnostic persists (Appendix H, p. 20).

The paper's example gives rustc E0277, where `Vec<f64>` is changed to `Vec<i32>` either inline or as a constrained diff (Appendix H, p. 20).

Verus form. Inference: encode the feedback record as ghost state and let a proof function show that each retry consumes the latest diagnostic record. An executable repair loop can use `requires` for a stable source specification and `ensures` for preservation of already committed prefix facts. `assert` can connect an error anchor to a repair obligation. The model's generated patch is still untrusted until Verus verifies the resulting Rust.

Evidence and limits. On 100 C-to-Rust ablation cases, removing feedback lowers pass rate from 85.0% to 74.0% (85/100 to 74/100) and raises average tokens from 3,580 to 4,138 (Table 1, p. 7; Appendix L.1, p. 26). Inner one-shot pass drops 23 percentage points (Table 16, Appendix L.2, p. 27). The paper states that DTV requires oracles to produce local, actionable diagnostics with source-line attribution (Appendix A, p. 13), and DTV's rescue rate falls as the needed fix moves away from the failing line (Table 2, p. 8). The no-feedback drop is paired-significant (p = 0.035, n = 100; Appendix L.2, p. 25).

## technique 4: structure-aware rollback, escalation, and bailout

What it is. On failure, DTV rolls back to the smallest scope implicated by the diagnostic, then widens the scope after repeated failures. Statement, block, and function retries are ordered on a fixed ladder, and each scope supports inline and patch-based modes. A visit counter for a diagnostic anchor triggers bailout when a persistent error exceeds its threshold (Appendix H, pp. 19–20).

When to use it. Use fine-grained rollback for local errors, and escalation when a later diagnostic is caused by an earlier binding or declaration. Use bailout for errors that persist after escalation (Section 2.2, p. 5).

How to apply it.

1. Commit the token prefix and parser/group-stack state at each passing boundary (Appendix H, p. 19).
2. Select the smallest rollback scope that contains the diagnostic anchor (Section 2.2, p. 5).
3. Retry with diagnostic feedback; constrain a patch to the selected scope (Appendix H, p. 20).
4. On repeated failure, widen from statement to block to function, exhausting the configured retry count for each pair of scope and mode (Appendix H, p. 20).
5. Count visits by enclosing function, primary error code, and primary message; return the current artifact and diagnostics when the threshold is exceeded (Appendix H, p. 20).

Verus form. Inference: represent checkpoints as ghost snapshots and prove with `ensures` that rollback restores the selected prefix and preserves earlier committed facts. Use a loop `invariant` for monotonic scope escalation and a `decreases` counter for bounded retries. Verus can prove the controller's data-structure properties; it cannot infer that a source-level diagnostic's smallest repair scope is semantically sufficient.

Evidence and limits. Removing escalation lowers pass rate on the same 100-case cohort from 85.0% to 79.0% and leaves average tokens near the full system (3,623 versus 3,580) (Table 1, p. 7). Removing all in-loop recovery (“detect-and-abort”) lowers pass to 70.0% and raises average tokens to 4,417; inner one-shot pass falls 30 points (Table 1, p. 7; Table 16, p. 27). The no-escalation drop (-6.0 pp) is not paired-significant at n = 100 (p = 0.263; Appendix L.2, p. 25). DTV's rescue rate is shape-dependent: on C-to-Rust, local 50.0% (12 cases), mixed 43.5% (168), and nonlocal 29.6% (27); on JS-to-TS, local 29.3% (58), mixed 11.9% (67), and nonlocal 0.0% (2, underpowered) (Table 2, p. 8; Appendix M.2, p. 28). The paper does not use the underpowered JS nonlocal cell (n = 2) to claim a nonlocal gap on JS-to-TS (Appendix M.2, p. 29). Rescue rates are measured on naive R1-failure cases, and fix shape is approximated from where naive's second attempt edits its first (Section 4.3, p. 8).

## technique 5: patch-based repair and streaming rendering

What it is. DTV's renderer streams tokens while maintaining structural state. When a failed prefix is rolled back, inline mode continues in the same assistant turn, while patch mode opens a new turn and requests a minimal diff constrained to the selected scope (Appendix H, pp. 19–20). The renderer rejects non-boundary prefixes and tracks nested delimiters so the oracle sees a legal artifact.

When to use it. Use inline continuation when preserving the conversation is useful; use patch mode when a localized diff is easier to constrain and inspect.

How to apply it.

1. Stream tokens and maintain a group stack for block/function scope (Appendix H, p. 19).
2. Stop on a structural boundary with strings, comments, and nested delimiters handled (Appendix H, p. 19).
3. Save prefix plus group stack at COMMIT and use the saved state for ROLLBACK (Appendix G, p. 18; Appendix H, p. 19).
4. In patch mode, provide the failed snippet, diagnostic, and scope goal; reject edits outside that scope (Appendix I, p. 20).

Verus form. Inference: model the checkpoint as a ghost pair `(prefix, parser_state)` and prove restoration with a `proof fn`. Use `requires` for valid delimiter-stack state and `ensures` for unchanged bytes outside the patch range. The renderer and model API are executable trusted components; Verus cannot prove a parser correct without a parser specification.

Evidence and limits. The paper does not isolate patch mode from inline mode in the main ablation, so no separate causal number is available. The renderer requires nontrivial language-pair engineering, including prefix context rules, oracle drivers, output parsers, and model-specific decoding backends (Appendix A, p. 13). Verifier wall-clock cost is not included in token-matched budgets, even though DTV invokes oracles more often (Appendix A, p. 13).

## what is proved, measured, and trusted

DTV's headline experiments use Qwen3-4B-Instruct and compare matched decoding strategies. On the full sets, DTV/self-refine passes compilation/linting on 246/300 C-to-Rust cases (82.0%) and 69/150 JS-to-TS cases (46.0%), versus 217/300 (72.3%) and 50/150 (33.3%) for naive/self-refine (Table 5, Appendix J.2, p. 21). DTV/one-shot gets 141/300 (47.0%) and 32/150 (21.3%). On cost-matched subsets, DTV/self-refine gets 169/200 (84.5%) versus 152/200 (76.0%) for naive/self-refine on C-to-Rust, and 50/100 (50.0%) versus 37/100 (37.0%) on JS-to-TS (Table 6, Appendix J.3, p. 22). The primary denominators are therefore explicit and differ between full-set and baseline-grid comparisons. Cost: average tokens per case relative to source tokens (k) for DTV/self-refine versus naive/self-refine is 5.28 versus 7.18 on C-to-Rust and 10.11 versus 11.48 on JS-to-TS, but tokens per passing case on JS-to-TS are higher for DTV (2103 versus 1648) (Table 5, p. 21). The paper's own limitation is that budgets are matched in tokens, not verifier wall-clock time (Appendix A, p. 13).

Behavioral correctness is a guardrail, not the headline oracle. On all 300 C-to-Rust cases, DTV/self-refine has 246/300 compile passes and 10.2% full success conditional on compiling, while naive/self-refine has 217/300 and 13.0% conditional full success (Table 8, p. 23). On the 195 cases where both compile, full differential success is 10.8% for DTV and 12.3% for naive, difference −1.54 percentage points with McNemar p=0.549 (Table 9, p. 23). The paper therefore reports no significant behavioral regression, but compilation improvement is not behavioral equivalence.

Inference: trusted assumptions include the source program and task specification, renderer correctness, filtered diagnostics, compiler/type/lint semantics, model sampling, finite differential inputs, and the decision that ignored diagnostics are non-actionable. The authors explicitly state that DTV “does not certify behavioral equivalence on all inputs, freedom from undefined behavior, concurrency correctness, or fitness for any particular safety-critical use.” (Appendix B, p. 13). The paper gives no formal proof of the controller or of the generated programs.

## techniques for the catalog

- structural-boundary verification: render only complete statement, block, function, or program prefixes and commit when all applicable deterministic oracles pass
- oracle composition and filtering: combine compiler, type, lint, and behavioral checks while filtering incomplete-prefix noise and recording source-local diagnostics
- feedback-state augmentation: encode unresolved verifier diagnostics into the next model context so retries are informed rather than blind
- scope-aware rollback: restore the smallest failing checkpoint, escalate from statement to block/function after repeated failures, and bail out on persistent diagnostics
- streaming render and patch repair: maintain parser scope state, stop at boundaries, and request a minimal constrained patch in a fresh turn
