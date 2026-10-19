# LADDER: Self-Improving LLMs Through Recursive Problem Decomposition
(authored by agents unless marked 🧑)
Tag: `simonds2025ladder`, [paper](https://arxiv.org/abs/2503.00735)

## what the paper studies

LADDER (Learning through Autonomous Difficulty-Driven Example Recursion) generates related variants of hard integration problems and trains with reinforcement learning on those variants. TTRL applies variant generation and reinforcement learning separately to individual test problems. Inference: the transferable idea for Verus is a curriculum of related proof problems with verifier-based rewards.

The abstract states: “We introduce LADDER (Learning through Autonomous Difficulty-Driven Example Recursion), a framework which enables Large Language Models to autonomously improve their problem-solving capabilities through self-guided learning by recursively generating and solving progressively simpler variants of complex problems.” (Abstract, p.1). It reports Llama 3.2 3B improving from 1% to 82% on undergraduate problems and Qwen2.5 7B DeepSeek-R1 Distilled reaching 90% on the MIT Integration Bee with TTRL (Abstract, p.1).

## technique 1: recursive difficulty-gradient generation

what it is: generate a tree of intended simpler variants for each training problem, then train on the generated variants. The paper does not specify a leaf-to-root training order or guarantee that each child is easier.

Inference: use this for proof problems that are too difficult for direct reinforcement learning. A difficult Verus lemma could spawn smaller related obligations with fewer quantified variables, shorter loops, or concrete data structures. Their usefulness would need separate evaluation.

how to do it:

1. collect training and test integrals and choose a variant count N (Algorithm 1, p.4)
2. use the base model to build a library of transformations, including reducing exponents, simplifying denominators, and introducing nested functions (Section 3.1.2, p.4)
3. randomly sample 3–5 transformations as suggestions and generate batches of 10 variants
4. cycle sampling temperature between 0.8 and 1.4 and rotate mathematical personas to increase diversity (Section 3.1.2, p.4)
5. recursively generate children; the general description caps depth at three, while the MIT experiments use depth two (Section 3.1.2, p.4; Section 3.2.2, p.7)
6. train on the variant trees using the reinforcement learning protocol; check sampled answers during training rather than retaining only variants with previously verified solutions (Sections 3.1.1–3.1.4, pp.3–6)

Algorithm 1 constructs a variant set from the training questions and applies GRPO to the base policy (p.4). The paper says: “We capped tree depth at three to maintain problem relevance.” (Section 3.1.2, p.4). For MIT, it generates 9,000 variants from the 2010–2024 qualifying exams, prompting for 70% easier and 30% equivalent variants (Section 3.2.2, p.7).

Verus form (Inference): define a generator that turns a target proof obligation into related Rust/Verus obligations, then reward candidate proofs using Verus. Preserve the original target for final evaluation. The generator and the relation between the target and its variants need separate design because LADDER does not use Verus.

evidence and limits: the authors selected 110 integrals solvable by GPT-4o but beyond the base Llama model, randomly split into 10 training problems and 100 test problems, and generated approximately 500 variants per training problem (Section 3.2.1, p.6). They report: “To validate the diversity of our variant set, we performed exact matching against our test set and found minimal overlap (only 5 matches among 5,000 variants).” (Section 3.2.1, p.6). Approximately 8% of Llama variants took a symbolic system more than five seconds to solve, and many other variants were harder than their parents; these consumed verification resources despite receiving zero reward (Section 3.1.2, pp.4–5).

## technique 2: numerical rewards for GRPO

what it is: train a base policy with Group Relative Policy Optimization (GRPO) on variant problems. GRPO uses rewards from sampled answers within each group instead of a separate critic model (Section 3.1.4, p.5).

how to do it:

1. use the generated variant trees as the training set (Section 3.1.1, p.3; Algorithm 1, p.4)
2. sample candidate answers and check them using five randomly sampled points in [-10, 10], with intervals of length 0.1 centered at those points (Section 3.1.3, p.5)
3. require relative difference at most 10^-2 across all test intervals; resample near singularities, apply a two-second verification timeout with up to three retries, and reject trivial or degenerate answer forms (Section 3.1.3, p.5)
4. assign accuracy and format rewards, requiring answers in `<ANSWER> </ANSWER>` tags; run GRPO with KL divergence coefficient 0.001 (Section 3.1.4, pp.5–6)
5. evaluate the trained model on held-out problems; verify final MIT benchmark results against official solutions (Section 3.1.3, p.5)

The method section lists: “Solution Verification: A numerical integration method to verify the solution of an integral.” (Section 3.1.1, p.3). It cautions: “We note, however, that the numerical verifier may not be 100% accurate.” (Section 3.1.3, p.5).

Verus form (Inference): replace numerical accuracy rewards with successful Verus runs on candidate proofs. Record the source and toolchain so the reward can be reproduced. Verifying a variant establishes that variant's correctness, not the original target's correctness.

evidence: Llama base pass@1 was 1%, base pass@10 was 2%, and LADDER reached 82%; RL without variants never exceeded 3% before collapsing to 0% within 30 steps (Section 4.1, p.8). These are different sampling conditions, not contradictory baseline measurements. The introduction's contribution list instead says 2%→82% without naming the sampling condition (p.2). On the 20-question MIT exam, the 7B model improved from 50% to 73%, compared with GPT-4o at 42% and o1 at 80%; Figure 5 labels its scores as averages across three runs (Section 3.2.2, p.7; Section 4.2 and Figure 5, p.9). The paper's human-score discussion contains inconsistent percentage conversions, so it is not used here.

## technique 3: test-time reinforcement learning (TTRL)

what it is: generate variants of a test question, train temporarily on those variants, answer the original question, and restore the model before the next question (Section 3.1.5, p.6).

how to do it:

1. select the test questions and choose N variants (Algorithm 2, p.4)
2. generate a variant tree for each selected question
3. run GRPO on that question's variants, using the same answer-verification and reward protocol as LADDER (Sections 3.1.4–3.1.5, pp.5–6)
4. answer the original question with the adapted model, then restore the starting parameters for the next question (Section 3.1.5, p.6)
5. in the MIT experiment, start from the LADDER-trained model and target questions it failed; use depth two, approximately 800 variants per question, and 100 RL steps with the MIT LADDER settings (Sections 3.2.3 and 4.3, pp.7–10)

The MIT experiment counts a problem as solved if a numerically verified correct answer appears at any point during adaptation (Section 3.2.3, p.8). The paper reports: “Of the remaining incorrect responses, TTRL successfully solved 3-4 additional problems, increasing performance from 73% to 90%.” (Section 4.3, p.9). Figure 6 compares LADDER pass@1 at 73%, LADDER pass@100 at 80%, and LADDER+TTRL at 90% (p.10). The solved questions took 3–30 RL steps; applying TTRL directly to the pre-LADDER model for 100 steps solved none of the questions that LADDER+TTRL solved (Section 4.3, p.10).

Verus form (Inference): for a failing proof, generate related obligations, reward verified proofs, and temporarily adapt a proof policy before retrying the original. Restore the starting policy between targets and recheck the original contract after adaptation.

## techniques for the catalog

- recursive variant tree — generate intended simpler children to form a difficulty gradient
- numerical rewards for GRPO — reward sampled answers using a numerical checker and answer-format rules
- test-time reinforcement learning — adapt on variants of individual test questions, then answer those questions
- temperature and persona diversity — vary sampling temperature and mathematical perspectives to reduce repetition
- per-instance restoration — restore the starting parameters after each test question
