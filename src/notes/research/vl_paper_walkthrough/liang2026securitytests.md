# Security Tests as Executable Specifications for LLM Code Generation: Benefits, Trade-offs, and Coverage Limits
(authored by agents unless marked 🧑)
Tag: `liang2026securitytests`, [paper](https://www.semanticscholar.org/paper/145362a1a1877367b3fb0f5acd3e2c07f86003cb)

## what the paper establishes

This paper evaluates security tests as executable specifications shown before generation and as feedback during repair. It defines the useful outcome as passing functional and security tests on the same candidate, J(c) = F(c) ∧ S(c). Its scaffold, SecTDD, runs code in a sandbox, exposes only visible behavior partitions, allows at most two revisions, and mounts hidden tests only once for final evaluation. The paper states: "A candidate that omits dangerous behavior can look secure while being useless; a candidate that passes ordinary unit tests can still contain command injection, path traversal, or improper certificate validation." (section 1, p. 1)

The study contains 2,705 trajectories over 31 task instances, three benchmarks, 16 CWE categories, two model families, and five local repetitions or independent API request slots. Showing all visible tests upfront improves hidden joint success by 19.3 percentage points on the unweighted nine benchmark–model conditions, but helps seven and hurts two. Shared-candidate structured feedback repairs 80 initially unsuccessful candidates with zero joint regressions; fixed raw feedback repairs 83 with three regressions. Head-to-head, structured and raw feedback each win six of 465 paired cells and tie 453. No adjusted comparison is below 0.05. The paper warns: "Candidates that pass all visible tests still fail hidden behavior families under every common regime." (abstract, p. 1) It also states: "Hidden functional and security tests run once, after stopping, and never enter a prompt or decision." (section 1, p. 2)

## technique: joint functional-and-security oracle

What it is. Evaluate F and S on the same final program and report J = F ∧ S as the primary endpoint. Also report the four states F+S+, F+S−, F−S+, and F−S−, plus SAFE@1 as a sensitivity metric. Security-only scores can reward a broken or empty program (section 2.1, p. 3).

When to use it. Use this for any generated security artifact where preserving requested behavior matters. Use hidden functional and hidden security partitions for the final decision; keep partial states to expose trade-offs.

How to do it.

1. Define functional and security behavior families for each task (sections 2.1 and 4.2, pp. 3, 5)
2. Split visible and hidden tests by behavior family or attack mechanism, not by random assertions; keep hidden source, inputs, outputs, and logs unavailable to generation (section 4.2, p. 5)
3. Run the frozen candidate once against hidden tests after stopping, then compute Fhid, Shid, and J (section 3, p. 4)
4. Count repairs as hidden joint failure to hidden joint success and regressions in the reverse direction; separately count F+S− to F+S+ security-only repairs (section 4.4, p. 7)

Verus form. Inference: encode a Rust module contract as separate predicates for functional behavior and security invariants, then define `spec fn joint_ok(...) -> bool { functional_ok(...) && security_ok(...) }`. Use `requires` for input assumptions and `ensures` for both predicates on the returned state. Keep the four-state classification as executable audit data; Verus proves a supplied implementation against the predicates, not that the predicates cover every attack.

Evidence. The principal grid reports Hidden Secure-Pass@1 per benchmark/model/method rather than pooling heterogeneous grids (table 3, p. 8). For all methods available on every grid, visible-joint passes included 12 hidden failures for B0 (5.6% TFOR), 73 for B3 (18.8%), 49 for B4 (13.6%), and 50 for M (13.9%) (table 5, p. 11). Denominators are visible-joint pass counts, not all trajectories.

Limits. Dynamic tests cover specified CWE behaviors, not arbitrary vulnerabilities; a finite oracle can reject safe alternative implementations or miss attacks (section 7, p. 13). Inference: a Verus proof of `joint_ok` is only as complete as the modeled behavior families.

## technique: visible tests as upfront executable specifications

What it is. Include all visible functional and security tests in the initial prompt (method B3), while withholding hidden tests. This changes the initial generation distribution, so it is not an edit-level repair comparison (sections 2.2–2.3, pp. 3–4).

How to do it.

1. Give the natural-language contract plus visible test code, without hidden identifiers or strings (sections 3 and 4.2, pp. 4–5)
2. Ask for one complete module under frozen token, execution, and timeout budgets (section 4.3, p. 6)
3. Sandbox the module and stop; do not feed hidden outcomes back (section 3, p. 4)
4. Evaluate hidden joint success and compare B3 with requirement-only B0 as a benchmark–model contrast, not a causal repair effect (section 2.3, p. 4)

Verus form. Inference: translate visible examples into `requires`/`ensures` cases or lemma tests, but keep hidden properties in separate proof modules. A verified implementation should satisfy the full contract; visible examples alone are regression tests and cannot stand for a complete specification.

Evidence. B3 beats B0 in seven of nine conditions, with macro +19.3 points. Qwen3-32B/CWEval rises 22.2% to 73.3%; Qwen3.6-27B/SALLM rises 60.0% to 90.9%. Exceptions: SALLM/Qwen2.5-Coder-7B falls 45.5% to 41.8%, and CodeGuard+/DeepSeek-V4-Flash falls 89.1% to 81.8%; the latter has TFOR 18.2% versus 0% for B0 (section 5.1, pp. 8–9).

Limits. Tests consume context and can anchor attention on concrete values. The paper concludes that visible tests are a model-dependent specification mechanism, not a monotonic safety intervention (section 5.1, p. 9).

## technique: shared-candidate executable feedback

What it is. Generate a byte-identical initial candidate under B0 (or B3 for B6), execute visible tests, and let a feedback policy request a complete replacement module. B4, B5, and M load the B0 response; B6 loads B3. This isolates repair from initial-prompt effects (sections 2.3 and 3, pp. 4–5).

How to do it.

1. Freeze task, model, repetition, initial response bytes, and usage accounting (section 2.3, p. 4)
2. Run visible functional/security cases in a fresh sandbox; stop if all pass or a frozen budget is exhausted (section 3, p. 4)
3. If any visible case fails, send at most 600 feedback tokens per round and request a complete replacement module; allow at most two revisions (sections 3 and 4.3, pp. 4, 6)
4. Mount hidden tests only after stopping and never use them for feedback or stop decisions (section 3, p. 4)

Verus form. Inference: wrap generated Rust in a verifier gate that runs only after proof checking. Feed runtime test failures as untrusted diagnostics; do not let a hidden test or runtime failure alter a Verus proof. A repair loop can regenerate source, but acceptance remains `cargo verus` plus the joint contract.

Evidence. Over 465 shared task–repetition cells, structured M triggered 252 times, repaired 80 hidden joint failures, and caused zero joint regressions; fixed raw B4 repaired 83 and caused three regressions. B6 triggered 47/330 cells, repaired 18, and had zero joint regressions (table 4, p. 9). On the outcome-unfiltered CodeGuard+ breadth wave, M triggered 21/110 cells and repaired four, showing opportunity shrinks when visible tests already pass (section 5.2, p. 10).

Limits. Feedback cannot react to hidden failures that produce no visible failure. Extra rounds therefore cannot fix an unexposed behavior family (section 5.4, p. 11).

## technique: structured security-priority feedback

What it is. M selects at most two failures per round: failing security cases first, then previously unselected cases, then a stable case identifier. Each block contains identifier, functional/security marker, executable-property description, and failure-log tail. B4 sends all raw failures in stable order; B5 sends one deterministic random raw failure (section 3.1, p. 5).

When to use it. Use typed compact feedback when token control and explicit property labels matter, but treat the policy as an engineering choice rather than a proven optimum.

How to do it.

1. Collect visible failures and classify them functional or security (section 3.1, p. 5)
2. Sort by security priority, novelty, and stable ID; retain at most two (section 3.1, p. 5)
3. Include the property description and tail of the observed failure, never hidden data (sections 3.1 and 4.2, pp. 5–6)
4. Replace the candidate and repeat until visible pass or budget stop (section 3, p. 4)

Verus form. Inference: represent diagnostics as a Rust enum carrying a case ID and observed trace; prove with `invariant` that the selector returns no more than two distinct visible failures and with `ensures` that hidden identifiers are absent from the feedback object. The selector cannot prove the repaired code's security.

Evidence. M and B4 tie in 453/465 cells; each wins six. Raw feedback repairs 83 versus M's 80, while M has zero joint regressions versus B4's three (section 5.3, p. 10). CodeGuard+ has identical joint outcomes for B4, B5, and M for both models (78.2% Qwen2.5-Coder-14B and 94.5% DeepSeek), because few feedback opportunities differentiate representations (section 5.3, p. 10).

Limits. A security-first choice can turn F+S− into F−S+, as a SALLM CWE-22 trajectory demonstrates; functionality can regress even when security improves (section 5.3, p. 10).

## technique: qualify visible/hidden oracles

What it is. Build behavior-partitioned dynamic oracles using secure implementations, vulnerable mutants, repeated sandbox runs, semantic review, and manual review. The six qualification gates are explicit (section 4.2, p. 5).

How to do it.

1. Require a secure implementation to pass every functional and security case
2. Require a functionality-preserving vulnerable mutant to fail at least one security case
3. Run both subjects three times in independent fresh sandboxes and require stable observations
4. Check that visible and hidden partitions represent declared behavior families without sharing concrete hidden material
5. Blind two strong model reviewers to provenance and construction labels; adjudicate disagreements with a third model
6. Have three software-engineering doctoral students review contract/oracle agreement, implementation semantics, attack realism, and partition separation after executable gates pass (section 4.2, p. 5)

Verus form. Inference: model the secure implementation's contract as a proof obligation and the mutant as a negative test artifact. Prove deterministic partition metadata and sandbox-result accounting where possible; keep model reviewers and human review trusted. Verus cannot prove that a test family represents all real attacks.

Evidence. The paper uses nine CWEval tasks, 11 SALLM tasks, and 11 CodeGuard+ breadth tasks; total 31 task instances and 16 CWE identifiers (section 4.1, p. 5). The authors explicitly say machine-assisted overlays are human-reviewed but remain a limitation (section 4.2, p. 5).

Limits. Public prompts may occur in pretraining; behavior-family splits reduce direct memorization but do not establish contamination-free evaluation (section 7, p. 14).

## technique: measure coverage with TFOR

What it is. Test-feedback overfitting rate is hidden-joint failures among candidates that pass visible joint tests: TFOR = count(Jvis ∧ ¬Jhid) / count(Jvis). Report numerator and denominator because small denominators make it unstable (section 4.4, p. 8).

How to do it.

1. Freeze visible and hidden partitions before generation
2. Run each final candidate on both, but expose only visible results before stopping
3. Count visible-joint passes and hidden-joint failures by method; report their ratio and counts (section 4.4, p. 8)
4. Interpret TFOR beside overall hidden joint success, never as a standalone population estimate (section 5.4, p. 11)

Verus form. Inference: use executable test harnesses to calculate TFOR over verified Rust binaries; use Verus to prove harness bookkeeping and candidate identity, while treating test-family adequacy as empirical.

Evidence. Pooled TFOR is 5.6% B0 (12/213), 18.8% B3 (73/389), 13.6% B4 (49/360), and 13.9% M (50/360), with counts over heterogeneous tasks used for diagnosis rather than significance (table 5, p. 11). DeepSeek/CodeGuard+ B6 made no revision in 55 cells although five candidates failed hidden joint evaluation (section 5.4, p. 11).

Limits. More iterations do not help when the visible oracle is silent. The paper recommends stronger and more diverse tests, mutation testing, metamorphic variants, boundary generation, and independent fuzzing, while avoiding near-duplicates of hidden tests (section 6.2, p. 12).

## what is proved, measured, and trusted

The paper measures observed dynamic outcomes, paired repair/regression transitions, task-cluster bootstrap intervals, exact sign-flip tests, token/call budgets, and TFOR. It treats task—not trajectory—as the inference unit: 2,705 trajectories are repeated observations, while confidence intervals use 10,000 task-cluster bootstrap resamples and confirmatory tests use task-level sign-flip permutations with Holm correction (section 4.5, p. 8). No adjusted comparison reaches 0.05. Trusted components include model generation, sandbox isolation, benchmark contracts, dynamic oracles, machine and human oracle review, hidden-test construction, local tokenizer budgets, and the remote API's unreproducible backend.

Inference: for VL, visible tests are useful executable specifications but cannot replace Verus contracts and hidden-behavior reasoning. A Verus-verified Rust function can satisfy all visible examples while violating an unmodeled attack family. The product threat is a false confidence path: tests pass, the agent stops, and the hidden behavior remains outside the contract. Keep hidden tests and independent proof obligations separate from model feedback; record test coverage families and TFOR-like diagnostics for every generated module.

Inference: the safest VL adaptation is a staged gate: generate Rust, run visible tests only for diagnostics, require Verus proof of the complete explicit contract, then run hidden differential tests. Keep function and security predicates conjunctive and report partial states so a security repair cannot silently break functionality.

## techniques for the catalog

- joint secure outcome — require functional and security success on the same candidate and retain four partial states
- visible tests as specification — expose partitioned executable examples before generation under fixed budgets
- shared-candidate feedback — reuse byte-identical initial code to isolate repair from prompt effects
- structured failure selection — prioritize security and novel failures with typed bounded diagnostics
- oracle qualification — validate secure implementations, vulnerable mutants, stability, partition separation, and human review
- test-feedback overfitting rate — measure hidden joint failures among visible-joint passes with explicit counts

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
