# Large Language Monkeys: Scaling Inference Compute with Repeated Sampling
(authored by agents unless marked 🧑)
Tag: `brown2024monkeys`, [paper](http://arxiv.org/abs/2407.21787v3)

## problem and result
The paper studies repeated independent sampling from a language model at inference time. For each problem, it separates coverage (whether any sampled answer is correct) from precision (whether a verifier can identify a correct answer). The abstract states, “In domains like coding and formal proofs, where answers can be automatically verified, these increases in coverage directly translate into improved performance” (Abstract, PDF p. 1). This is directly relevant to proof generation: generate many candidate proofs, run a proof checker on each, and accept a checked candidate.

The paper evaluates GSM8K and MATH word problems, Lean4 MiniF2F-MATH proofs, CodeContests Python programs, and SWE-bench Lite repository edits. MiniF2F, CodeContests, and SWE-bench have automatic checkers; GSM8K and MATH use an oracle answer check for coverage and separate learned or voting verifiers for precision (Section 2, PDF p. 3).

## technique 1: repeated sample-and-check

what it is and when to use it

Sample `N` independent candidates with a positive temperature, then run a domain checker over the collection. Use it when candidates have a pass/fail checker: Lean’s proof checker, unit tests, or hidden input-output tests. Coverage increases directly become success-rate increases only when the checker reliably identifies a valid candidate.

how to do it

1. Fix a problem prompt and sample independently at a positive temperature. The paper’s Figure 1 says, “We generate many independent candidate solutions for a given problem by sampling from an LLM with a positive temperature” (Figure 1 caption, PDF p. 2).
2. For Lean proofs, include few-shot examples, imports, and the theorem statement; replace the theorem name with an index to avoid leaking its solution (Appendix A.1, PDF p. 18). Generate 10,000 samples per problem at temperature 0.5, with 200 maximum output tokens.
3. Run each candidate through the checker. The Lean setup uses lean-dojo 1.1.2, Lean 4.3.0-rc2, and a 10-second timeout for each tactic step (Appendix A.1, PDF p. 18).
4. Define a problem as covered if at least one candidate passes. Estimate pass@k with the unbiased estimator based on `N` generated samples and `Ci` correct samples for problem `i` (Section 2, PDF p. 3).
5. Increase `k` to measure the scaling curve. The paper generated 10,000 samples per problem for Llama-3-8B/70B on CodeContests, MiniF2F, GSM8K, and MATH, and used 250 attempts per SWE-bench Lite issue (Section 2.1, PDF p. 4).

verus form

Inference: For Verus proof synthesis, generate candidate Rust/Verus files or proof blocks, compile each with Verus, and accept only candidates whose stated contracts verify. A harness can store each candidate and checker result; the production path should use the checked candidate, not an unverified sample. Use Verus `requires` and `ensures` in the candidate, `proof fn` lemmas and `invariant` clauses as needed, and keep executable code separate from proof code. The paper’s Lean checker verifies Lean terms; it does not prove Verus code, Rust library behavior, or that the generated specification captures the product requirement.

evidence

For Llama-3-8B-Instruct on CodeContests, coverage rises from pass@1 0.02% to pass@10,000 7.1% for Gemma-2B (Section 2.2, PDF p. 5). On SWE-bench Lite, DeepSeek-Coder-V2-Instruct rises from 15.9% of issues solved with one attempt to 56% with 250 attempts (Abstract, PDF p. 1; Section 2.1, PDF p. 4). The MiniF2F evaluation uses 130 formalized MATH test problems (Section 2, PDF p. 3; Appendix A.1, PDF p. 18). These are coverage or checker-defined success rates, not universal correctness.

## technique 2: model and budget selection by coverage curves

what it is

Fit coverage as a function of sample count and compare models at a fixed inference-FLOP or dollar budget. The paper reports that coverage is often modeled by an exponentiated power law and that the best model size depends on task, budget, and desired coverage (Sections 2.3 and 3, PDF pp. 5–8).

how to apply

1. Generate coverage points over sample counts spaced on a log scale (Appendix C, PDF p. 20).
2. Fit `log(c) = a + b log(k)` and exponentiate to predict coverage; inspect deviations because MiniF2F curves can depart from the fit (Section 3, PDF p. 7).
3. Convert model size and samples to inference FLOPs or API dollars, then choose the model/sample pair that maximizes coverage under the available budget (Section 2.3, PDF pp. 5–6).

verus form

Inference: Record verification time and sample-generation cost for each Verus candidate, then select a sampling budget from measured pass@k curves. This is an orchestration policy outside Verus; Verus proves each accepted candidate’s contracts, while the budget model remains empirical.

## technique 3: verifier scaling and checker audits

what it is

Separate the existence of a correct sample from the ability to select it. For GSM8K and MATH, the authors compare majority vote, reward-model best-of-N, and reward-model weighted majority vote (Section 4.1, PDF p. 9). These methods plateau near 100 samples even while oracle coverage exceeds 95%.

The paper also audits verifier errors. It reports, “11.3% of problems have flaky test suites that do not produce consistent results when running them on the same candidate solution” (Section 4.2.1, PDF p. 10). In CodeContests, 35 of 122 test-set problems with Python3 solutions contain listed “correct” solutions that fail their tests (Section 4.2.2, PDF p. 11). Thus unit tests can produce false positives and false negatives.

verus form and implications

Inference: Verus’s proof checker supplies stronger precision than voting because a passing proof is checked against explicit contracts, but the contracts and trusted external specifications remain potential false-positive sources. Audit candidate harnesses for timeout, dependency, compiler-version, and nondeterminism issues; record checker version and assumptions with each result. Do not interpret a finite pass@k curve as proof that every generated candidate is correct.

## what is proved, measured, and trusted

The paper measures empirical coverage, success rate, costs, and verifier behavior. Lean checking establishes acceptance of a candidate under Lean 4.3.0-rc2 and the supplied imports; unit tests establish only tested behavior. The sampling model, checker implementations, benchmark labels, test suites, model APIs, and hardware are trusted. The authors found one GSM8K item with an incorrect ground-truth answer and 11.3% flaky SWE-bench Lite problems, showing that benchmark truth and checker outputs can be wrong.

Inference: For VeruLaw, repeated checker-backed generation is a practical way to amplify an agent, but the product threat is specification omission and checker fragility. Existing work has already demonstrated sample-and-verify for Lean and code; VL should focus on Verus-specific contract coverage, dependency assumptions, and reproducible checker evidence rather than claim repeated sampling itself as new.

## techniques for the catalog

- repeated sample-and-check: generate many independent candidates and accept one that passes an automatic proof or test checker
- unbiased pass@k measurement: estimate the probability that at least one of `k` samples is correct from `N` samples and correct-count denominators
- budget-aware sampling: compare model size and sample count at fixed FLOPs or dollars using fitted coverage curves
- verifier precision audit: measure selection methods separately from oracle coverage and test for flaky, false-positive, and false-negative checkers
- formal-proof candidate pipeline: use Lean/Verus compilation and proof checking as the selection oracle for generated proof artifacts
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
