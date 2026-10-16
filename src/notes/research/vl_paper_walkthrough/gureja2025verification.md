# Verification Limits Code LLM Training
(authored by agents unless marked 🧑)
Tag: `gureja2025verification`, [paper](http://arxiv.org/abs/2509.20837v1)

## central finding

This paper studies the “verification ceiling”: “The quality of the training data becomes fundamentally constrained by the capabilities of the synthetic verification system itself.” (Introduction, p. 2) “The true bottleneck is not correctness itself, but the brittle, narrowly defined methods we currently use to enforce it.” (Introduction, p. 3) synthetic code training is limited by the coverage, diversity, and strictness of the tests or judges that filter generated solutions. The authors define a candidate set, test suite, pass fraction, and threshold: “The verification function Vk (s; Tk ) ∈ [0, 1] measures the fraction of tests passed, where traditional approaches use a strict threshold: Vk (s; Tk ) = 1 if and only if solution s passes all tests in Tk .” (Sec. 2, p. 3). Inference: the same abstraction applies to generated Verus code, where a proof checker is a verifier whose accepted set can become narrow or biased.

## technique 1: complexity-targeted test generation

What it is: generate increasingly strong unit tests with three prompts. Minimal prompting receives only the problem and asks for non-trivial inputs; Structured prompting receives problem, candidate solution, and minimal tests and targets edge cases and under-tested logic; Contrastive prompting receives multiple candidate solutions and asks for tests that make at least one candidate fail (Sec. 4.1, pp. 5–6).

How to apply it: (1) generate candidate solutions and an initial test suite from the problem. (2) For structured tests, expose one candidate and the initial tests; request complete edge-case and coverage tests. (3) For contrastive tests, expose multiple candidates; require each generated test to distinguish at least one pair. (4) Filter a fixed number of training samples, retaining only candidates passing all tests (τ=1), so downstream comparisons have equal sample counts (Sec. 4.1, p. 6). (5) Validate that complexity increased with a separate LLM judge (Sec. 4.1, p. 6).

Evidence: all experiments use 70K synthetic samples per setup. Structured tests improve average pass@1 by 3 points over Minimal; Contrastive adds 1 point over Structured and reaches 7 points absolute over the base model (Sec. 4.1, p. 6 and Fig. 2). The denominator is the paper's aggregate evaluation across HumanEval, BigCodeBench, LBPP, LiveCodeBench, MBPPPlus, and McEval; the figure caption reports averages across those benchmarks. Inference: for VL, generate adversarial proof obligations that distinguish candidate implementations, but ensure the obligations are semantically valid rather than merely difficult.

Verus form (Inference): use a `proof fn` or verification harness with `requires` describing an input edge case and `ensures` stating the intended postcondition. Structured generation corresponds to adding boundary-case lemmas around a candidate function; contrastive generation corresponds to finding a model that satisfies weak lemmas but violates a stronger one. Verus checks the final contract, while test generation remains trusted unless separately proved.

## technique 2: control quantity and preserve hard examples

What it is: vary the number of tests per sample while holding generator and prompt fixed, then inspect how filtering changes problem difficulty. The paper tests one through four tests and samples 70K examples at τ=1 (Sec. 4.2, p. 7).

Result and use: two tests improve downstream pass@1 by 3 points; requiring more than two degrades it. Command A rates each problem from 1 to 5, grouped as easy (1–2), medium (3), and hard (4–5). Stricter filtering disproportionately removes hard samples (Sec. 4.2, p. 7). A controlled rebalancing experiment fixes 40% medium problems and compares 40% hard/20% easy with 40% easy/20% hard at τ=0.6; the hard-upsampled model wins by 6 average pass@1 points (Sec. 4.2, pp. 7–8).

Verus form (Inference): measure proof difficulty (solver time, obligation count, or manual lemma count) and retain difficult but valid proofs rather than selecting only short proofs. A CI policy can require proof success while stratifying examples by difficulty. The paper's pass@1 denominator is the benchmark test cases; its exact benchmark sizes are listed in Table 1, e.g. HumanEval has 164 per language and BigCodeBench has 1,140 Python cases (Table 1, p. 5).

## technique 3: diversify verifier sources

What it is: compare a single test generator with multiple generators while keeping coding problems and test complexity and quantity fixed. Multiple generators improve C++ by 3 and Java by 1 absolute points, but degrade Python by 1 and JavaScript by 0.1 (Sec. 4.3, p. 8 and Fig. 5). Inference: verifier diversity can expose language-specific blind spots, but its effect is not universally positive.

Verus form (Inference): combine independently written specifications or proof harnesses, then require a candidate to satisfy the intersection; audit whether each harness covers distinct behaviors. Multiple solvers or proof styles may provide diversity, but solver disagreement is not itself evidence of correctness.

## technique 4: relax the pass threshold

What it is: retain a candidate when its test fraction Vk(s;Tk) exceeds τ in {0.1, 0.2, 0.4, 0.6, 0.8, 1}, with 70K samples in every mixture (Sec. 5.1, p. 9). Moderate thresholds 0.6–0.8 generally outperform τ=1. On LBPP, relaxing to 0.7 hurts Minimal suites by 0.5 points but improves Structured by 1 point; richer suites reject clearly incorrect code while retaining non-canonical solutions (Sec. 5.1, pp. 9–10; Fig. 1).

Verus form (Inference): do not accept code with failed safety or functional proof obligations in production. Instead, use graded proof progress for training or triage, while a release gate remains a complete proof. A partial score can count discharged lemmas or covered branches only if the metric is clearly separated from correctness.

## technique 5: LLM-based verification

What it is: replace tests with an LLM score Lk(s;M) for plausibility, idiomatic use, and likely correctness, retaining scores above τ (Sec. 5.2, pp. 10–11). GPT-4.1-mini at temperature 0 and Claude-3.7-sonnet at temperature 0 each select one answer per problem. Their selected sets overlap 49%; overlap with Structured tests is 32.6% and 32.9% (Fig. 7, p. 10). Inference: judges add a complementary signal but are not formal proof.

## why verification remains necessary

A human study samples 300 Python examples: 100 synthetic-test incorrect and 200 correct. Only 21% of tests are correct and complete, while 53.6% are correct but incomplete; synthetic and expert labels agree weakly (κ=0.07), and 49% of samples failing synthetic tests pass junior-expert tests (Sec. 6.1, pp. 11–12; Fig. 8). A controlled 41K-pair comparison holds problems fixed: formally correct solutions average τ=0.85, incorrect τ=0.05, and correct-trained models outperform incorrect-trained models by 3 pass@1 points (Sec. 6.2, p. 13; Fig. 9). Inference: verification must be calibrated, but removing it would flood training with unfiltered errors. Synthetic code remains competitive with human-authored code on the same problems (Sec. 6.3, pp. 13–14).

## trusted parts, limits, and VL threat

The experiments trust teacher models, generated tests, LLM judges, benchmark tests, and the Command 7B training pipeline. Evaluation is pass@1 and does not measure readability, maintenance, efficiency, or style (Sec. 9, p. 15). Inference: the threat to agent-written verified Rust is medium. Weak or incomplete specifications can admit wrong code; a complete Verus proof blocks failures expressible in the specification, but external bodies, libraries, compiler, solver, and environment remain trusted. VL should reuse this paper's warning about verifier-induced data bias rather than redo generic unit-test filtering.

## techniques for the catalog

- complexity-targeted tests — generate minimal, structured, and contrastive tests to increase behavioral coverage
- difficulty-stratified filtering — vary test quantity and retain hard examples instead of selecting only easy survivors
- verifier diversity — combine independent test generators and measure language-specific effects
- relaxed thresholds — use partial pass rates for training while keeping complete proof gates for release
- LLM judging — add a plausibility judge as a complementary signal, not as formal correctness

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
