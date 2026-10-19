# Verification Limits Code LLM Training
(authored by agents unless marked 🧑)
Tag: `gureja2025verification`, [paper](http://arxiv.org/abs/2509.20837v1)

## central finding

This paper studies the “verification ceiling”: “The quality of the training data becomes fundamentally constrained by the capabilities of the synthetic verification system itself.” (Introduction, p. 2) “The true bottleneck is not correctness itself, but the brittle, narrowly defined methods we currently use to enforce it, highlighting the need for a calibrated, nuanced approach.” (Introduction, p. 3) Synthetic code training is limited by the coverage, diversity, and strictness of the tests or judges that filter generated solutions. The authors define a candidate set, test suite, pass fraction, and threshold: “The verification function Vk (s; Tk ) ∈ [0, 1] measures the fraction of tests passed, where traditional approaches use a strict threshold: Vk (s; Tk ) = 1 if and only if solution s passes all tests in Tk .” (Sec. 2, p. 3). Inference: the filtering abstraction could apply to generated Verus code, but this paper does not test proof checkers or establish the same performance effects for formal verification.

## technique 1: complexity-targeted test generation

What it is: generate increasingly strong unit tests with three prompts. Minimal prompting receives only the problem and asks for non-trivial inputs; Structured prompting receives problem, candidate solution, and minimal tests and targets edge cases and under-tested logic; Contrastive prompting receives multiple candidate solutions and asks for tests that make at least one candidate fail (Sec. 4.1, pp. 5–6).

How to apply it: (1) generate candidate solutions and an initial test suite from the problem. (2) For structured tests, expose one candidate and the initial tests; request complete edge-case and coverage tests. (3) For contrastive tests, expose multiple candidates; request tests such that at least one candidate fails each test. (4) Filter a fixed number of training samples, retaining only candidates passing all tests (τ=1), so downstream comparisons have equal sample counts (Sec. 4.1, p. 6). (5) Validate that complexity increased with a separate LLM judge (Sec. 4.1, p. 6).

Evidence: these complexity experiments use 70K synthetic samples per setup. Structured tests improve average pass@1 by 3 points over Minimal; Contrastive adds 1 point over Structured and reaches 7 points absolute over the base model (Sec. 4.1, p. 6 and Fig. 2). Evaluation covers HumanEval, BigCodeBench, LBPP, LiveCodeBench, MBPPPlus, and McEval in Python, C++, Java, and JavaScript where available. Section 3.3 reports 1-shot pass@1 and a weighted aggregate accounting for benchmark and language dataset sizes (p. 4). Table 1 says MBPPPlus uses the original, non-plus test sets (p. 5). Inference: for VL, generate adversarial proof obligations that distinguish candidate implementations, but ensure the obligations are semantically valid rather than merely difficult.

Verus form (Inference): use a `proof fn` or verification harness with `requires` describing an input edge case and `ensures` stating the intended postcondition. Structured generation corresponds to adding boundary-case lemmas around a candidate function; contrastive generation corresponds to finding a model that satisfies weak lemmas but violates a stronger one. A Verus adaptation would need to validate generated contracts against the intended behavior; successful proofs alone would not establish that match.

## technique 2: control quantity and preserve hard examples

What it is: vary the number of tests per sample while holding generator and prompt fixed, then inspect how filtering changes problem difficulty. The paper tests one through four tests and samples 70K examples at τ=1 (Sec. 4.2, pp. 6–7).

Result and use: moving from one to two tests improves downstream pass@1 by 3 points; requiring more than two degrades it. Command A rates each problem from 1 to 5, grouped as easy (1–2), medium (3), and hard (4–5). Stricter filtering disproportionately removes hard samples (Sec. 4.2, p. 7). A controlled rebalancing experiment fixes 40% medium problems and compares 40% hard/20% easy with 40% easy/20% hard at τ=0.6; the hard-upsampled model wins by 6 average pass@1 points (Sec. 4.2, pp. 7–8).

Verus form (Inference): measure proof difficulty (solver time, obligation count, or manual lemma count) and retain difficult but valid proofs rather than selecting only short proofs. A CI policy can require proof success while stratifying examples by difficulty. Table 1 lists evaluation problem counts, including 164 HumanEval problems per language and 1,140 Python BigCodeBench problems (p. 5).

## technique 3: diversify verifier sources

What it is: compare a single test generator with multiple generators while keeping coding problems and test complexity and quantity fixed. Multiple generators improve C++ by 3 and Java by 1 absolute points, but degrade Python by 1 and JavaScript by 0.1 (Sec. 4.3, p. 8 and Fig. 5). Inference: verifier diversity can expose language-specific blind spots, but its effect is not universally positive.

Verus form (Inference): combine independently written specifications or proof harnesses, then require a candidate to satisfy the intersection; audit whether each harness covers distinct behaviors. Multiple solvers or proof styles may provide diversity, but solver disagreement is not itself evidence of correctness.

## technique 4: relax the pass threshold

What it is: retain a candidate when its test fraction Vk(s;Tk) is at least τ in {0.1, 0.2, 0.4, 0.6, 0.8, 1}, with 70K samples in every mixture (Sec. 5.1, p. 9). Moderate thresholds 0.6–0.8 generally outperform τ=1. On LBPP, relaxing to 0.7 hurts Minimal suites by 0.5 points but improves Structured by 1 point; richer suites reject clearly incorrect code while retaining non-canonical solutions (Sec. 5.1, pp. 9–10; Fig. 1).

Verus form (Inference): do not accept code with failed safety or functional proof obligations in production. Instead, use graded proof progress for training or triage, while a release prerequisite check requires a complete proof. A partial score can count discharged lemmas or covered branches only if the metric is clearly separated from correctness.

## technique 5: LLM-based verification

What it is: replace tests with an LLM score Lk(s;M) for plausibility, idiomatic use, and likely correctness, retaining scores at least τ (Sec. 5.2, pp. 10–11). GPT-4.1-mini at temperature 0 and Claude-3.7-sonnet at temperature 0 each select one answer deemed correct from the attempts for a problem. Appendix D requests a binary 0/1 correctness score and explanation (p. 28). Figure 7 reports comparable downstream performance to Structured filtering and these overlaps: “Claude-3.7 vs. GPT-4.1-mini: 49%; Structured Test Suite vs. Claude-3.7: 32.6%; Structured Test Suite vs. GPT-4.1-mini: 32.9%” (p. 11). Inference: judges add a complementary signal but are not formal proof.

## technique 6: multiple solutions per problem

What it is: hold the problem set fixed and train with 1, 2, or 5 solutions per problem. Appendix B starts from a 70K subset and generates additional solutions using Command-A, DeepSeek-V3, Qwen2.5-coder-32B, and llama-3.1 at various temperatures. Selected samples have average test pass rate τ=0.5. Both the 2-solution and 5-solution variants improve average pass@1 (Appendix B, pp. 24–25; Fig. 13). The text does not state that total solution counts are held equal across variants.

Inference: VL could compare multiple verified implementations per specification, while controlling total training examples to separate diversity from data quantity. The paper does not establish this effect for proofs.

## why verification remains necessary

A human study samples 300 Python examples: 100 synthetic-test incorrect and 200 correct. Figure 8 excludes 27 samples labeled unsure and reports 21% of tests correct and complete and 53.6% correct but incomplete; synthetic and expert labels agree weakly (κ=0.07), and 49% of samples failing synthetic tests pass junior-expert tests (Sec. 6.1, pp. 11–12; Fig. 8). Section 6.2 describes two solutions per fixed problem and reports “41K samples”; its “formally correct” and “formally incorrect” groups average test pass rates τ=0.85 and τ=0.05, respectively. Models trained on the former outperform those trained on the latter by 3 pass@1 points (p. 13; Fig. 9). These labels refer to test outcomes, not formal proofs; the reported 0.85 average also falls below an all-tests-pass criterion. Inference: verification must be calibrated, but removing it would flood training with unfiltered errors. Synthetic code remains competitive with human-authored code on the same problems (Sec. 6.3, pp. 13–14).

## trusted parts, limits, and VL threat

Section 3.1 uses the Command 7B base model and reports averages over three training seeds (p. 4). Section 3.2 normally uses DeepSeek-v3 to generate problems, tests, and solutions, with 70K synthetic code samples, a fixed 70K public code samples, and 5% non-code instruction-following data (p. 4). Inference: the conclusions depend on those generators, judges, benchmark tests, and training conditions. The study covers supervised fine-tuning, not reinforcement learning. Its pass@1 evaluation does not measure readability, maintainability, efficiency, or adherence to best practices (Sec. 9, p. 15). Inference: the relevance to agent-written verified Rust is specification and selection bias; these experiments do not quantify that risk. Weak or incomplete specifications can admit wrong code; a complete Verus proof blocks failures expressible in the specification, but external bodies, libraries, compiler, solver, and environment remain trusted. VL should reuse this paper's warning about verifier-induced data bias rather than redo generic unit-test filtering.

## techniques for the catalog

- complexity-targeted tests — generate minimal, structured, and contrastive tests to increase behavioral coverage
- difficulty-stratified filtering — vary test quantity and retain hard examples instead of selecting only easy survivors
- verifier diversity — combine independent test generators and measure language-specific effects
- relaxed thresholds — use partial pass rates for training while requiring complete proofs in release prerequisite checks
- LLM judging — use model assessments instead of unit-test filtering; inference: combine signals for VL without treating judgments as proofs
- solution diversity — train with multiple implementations of fixed problems; selected samples average 50% test pass rate

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "To address the confounding factor of synthetic unit tests correctness, we report the agreement of the subset with verified synthetic unit tests correctness."): checked the full text including appendices, study quotations, numbers, methods, section and page references, and paper identity; corrected the truncated quotation, contrastive-test requirement, threshold inequalities, sample-count scope, evaluation description and Figure 7 page; added solution diversity and human-study exclusions, and clarified test-based correctness and Verus inferences; did not reproduce experiments, inspect underlying data or code, or independently validate the proposed Verus adaptations.
