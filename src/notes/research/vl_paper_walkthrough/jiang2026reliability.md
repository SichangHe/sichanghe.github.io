# Beyond Pass@k: Measuring Reliability and Security of Agentic Code Generation
(authored by agents unless marked 🧑)
Tag: `jiang2026reliability`, [paper](https://arxiv.org/abs/2608.14711)

## claim and measurement target

Jiang, Zheng, Vidra, and Setty diagnose a metric error in coding-agent benchmarks. The abstract says: “current implementations misapply it: they set n to the number of unit tests in a single submission rather than the number of independent rollout attempts, conflating test-suite size with attempt independence.” (Abstract, p. 1). Chen et al.'s estimator assumes `n` independent full-solution samples and `c` fully correct samples. The paper reports, “This gap reveals that the metric change, while not inverting rankings in this particular synthetic experiment, fundamentally alters the fidelity of score interpretation.” (§4.2, p. 7) The proposed `reliability@k` keeps that estimator but defines `n` as independent agent rollouts for one task-agent pair and `c` as rollouts that fully succeed (§2.2, p. 3; §3.4, p. 5).

## technique 1: reliability@k with independent rollouts

What it is. Generate `n >= k` independent complete attempts for every task-agent pair; let `c` be the number with full execution success; compute the Chen estimator `1 - C(n-c,k)/C(n,k)` (§2.2, p. 3). The paper says nonzero temperature produces run-to-run variation and that this is “the source of the variance that pass@k is designed to measure” (§2.1, pp. 2–3).

How to do it.
1. Define one task and an environment that can be reset between runs, since agent runs produce side effects that “must be reset between runs” (§2.4, pp. 3–4).
2. Sample independent full agent rollouts at nonzero temperature (§2.1, pp. 2–3).
3. Mark a rollout successful only when it reaches near-complete test success, implemented as `pass_rate >= 0.95` for synthetic CodeBench (§3.4, p. 5); the paper's strict task-level pilot instead requires the official harness to resolve the task (§4.5, p. 10).
4. Count `n` rollouts and `c` full successes, then apply the estimator (§2.2, p. 3).
5. Inference: report task and agent settings, seed, rollout count, and success criterion (the paper fixes seed=42 and 8 rollouts per pair but gives no reporting checklist).

Evidence. In a synthetic benchmark with 10 tasks, three agent profiles, eight rollouts per pair, and seed 42, the broken test-case metric reports 0.959–0.975 for the three agents while corrected reliability@5 reports 0.000, 0.000, and 0.125 (Table 1, p. 6). Inflation is 0.850–0.965 per agent and mean 0.924 (Table 1, p. 6; §4.2, p. 7). The denominator is three agents × ten tasks × eight rollouts = 240 synthetic execution entries (§3.4, p. 5).

Inference: In Verus, `c` should count rollouts where the target module verifies with Verus and designated executable tests pass. The proof can use `requires`, `ensures`, loop invariants, `spec fn`, and `proof fn`; proof code is erased and must not be counted as a runtime test. Each attempt needs a fresh checkout and fixed toolchain/solver versions. Reliability is evidence about repeatability, not a proof that the specification matches product intent.

## technique 2: expose the pass@k category error with a controlled counterexample

What it is. Construct two submissions with the same single-submission test pass rate but different test-suite sizes. Agent-A passes 4/10 tests; Agent-B passes 2/5. Applying the broken formula with tests as `n` gives 0.9762 and 1.0000 (§4.1, p. 6). The only difference in scores is test count, violating the independent-sample assumption.

When to use it. Use this diagnostic before trusting any benchmark implementation that reports pass@k from repository test counts.

Inference: A Verus benchmark can create two attempts with the same fraction of checked postconditions or unit tests but different numbers of assertions. If its score changes solely because assertion count changes, the benchmark is measuring obligation granularity rather than rollout reliability. This is a diagnostic adaptation, not a result in the paper.

## technique 3: test a cheap single-rollout proxy, then reject it if correlation is weak

What it is. CodeBench defines pass rate, regression rate, tool efficiency, cost-adjusted score, and a seven-pattern security score. The proposed proxy is `pass_rate × (1 - regression_rate) × tool_efficiency` (§3.3, p. 5; §4.3, p. 7). Tool efficiency is `max(0, 1 - tool_calls_used/20)` and security scans for `eval()`, `exec()`, `os.system()`, `subprocess(shell=True)`, `pickle.load()`, unsafe `yaml.load()`, and `__import__()` (§3.3, p. 5).

How to do it. Compute the proxy once per task-agent pair, collect reliability@5 from eight independent rollouts, and calculate Spearman correlation over all 30 task-agent pairs (§3.4, p. 5; §4.3, p. 7). The paper prespecified ρ >= 0.70 as the threshold for a usable surrogate. Observed ρ = 0.417, p = 0.0218, so the proxy was insufficient (§4.3, p. 7).

## technique 4: security-adjusted reliability

What it is. Count a rollout toward `security_adjusted_reliability@5` only when it fully passes tests and reaches security score >= 0.80 (§4.4, p. 8). The live test used three agents × ten tasks × eight rollouts = 240 generations, half algorithmic and half security-sensitive (§4.4, p. 8). Scores were codex 1.000, agent-x 0.988, and claude-code 0.793 for both adjusted and unadjusted metrics; Kendall τ = 1.000, p = 0.333, with no rank change (§4.4, pp. 8–9).

The authors explicitly do not treat H4 as confirmed: three agents provide little statistical power, the >=0.80 threshold is lenient, and only five of ten tasks exercise security-sensitive behavior (§4.4, p. 9). The paper says, “This does not confirm H4” (§4.4, p. 8) and calls the metric “a proposed complementary lens” (Abstract, p. 1; §8, p. 13).

Inference: A Verus security adjustment could require no high-severity unsafe pattern, no unauthorized `unsafe` block, and successful checks of memory-safety contracts, but Verus proof success alone does not certify supply-chain or cryptographic security. The scanner and threshold would need an independently justified threat model.

## technique 5: compare strict resolution with partial hidden-test rates

The five-task SWE-bench Verified pilot used one Claude Code attempt per task, official Docker evaluation, and no self-testing because `acceptEdits` disallowed shell execution (§4.5, p. 10). Exactly one of five tasks resolved (reliability@1 = 0.20), while macro-averaged hidden-test pass rate was 0.8049 and regression rate 0.1539 (§4.5, pp. 10–11). The table gives exact denominators: one task had 2/2 fail-to-pass and 13/13 pass-to-pass; two near misses had 0/1 and 0/2 fail-to-pass with 20/20 and 644/644 pass-to-pass; two regressions broke 5 and 7 tests (§4.5, Table 2, p. 11).

Inference: A Verus evaluation should report strict module verifies and required behavior tests pass separately from the fraction of assertions or tests that pass. The strict denominator must be tasks or rollouts, while test-level denominators remain diagnostic. A high assertion-pass average can coexist with zero complete verified repairs.

## what is measured, trusted, and threatening

Measured claims are limited to the synthetic seed-42 benchmark, the three-agent live-API run, and the five-task astropy pilot. The authors say results should be read “as a methodological demonstration of when reliability metrics diverge, not as a production benchmark of any specific commercial coding agent” (§5, p. 12). Inference: the results rest on the task specifications, synthetic rollout generator, model APIs, Docker and official harness, unit and hidden tests, heuristic scanner, and the definition of full success. The paper cautions that CodeBench “is not a substitute for standard security auditing, static analysis, or penetration testing before deploying AI-generated code in production settings” (§6, p. 12).

Inference: The threat to a product that generates agent-written verified Rust is substantial if dashboards report partial proof/test fractions as reliability. A model can produce many near-miss proofs that pass easy obligations while failing one critical invariant. Reliability@k, strict resolution, and security-adjusted outcomes make this failure visible, but they do not replace checking that the Verus specification encodes the product requirement.

## techniques for the catalog

- reliability@k — estimate success from independent complete rollouts with `n` attempts and `c` fully successful attempts
- category-error counterexample — hold test pass fraction fixed while varying test-suite size to detect misuse of pass@k
- proxy validation — correlate a cheap one-shot score with repeated reliability before using it as a surrogate
- security-adjusted reliability — count only functionally correct rollouts that pass a defined security screen, while reporting power limits
- strict-versus-partial reporting — separate complete task resolution from macro-averaged test or assertion pass rates
