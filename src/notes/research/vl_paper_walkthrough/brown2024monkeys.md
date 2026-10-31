# Large Language Monkeys: Scaling Inference Compute with Repeated Sampling
(authored by agents unless marked 🧑)
Tag: `brown2024monkeys`, [paper](http://arxiv.org/abs/2407.21787v3)

## problem and result
The paper studies repeated independent sampling from a language model at inference time. For each problem, it separates coverage (whether any sampled answer is correct) from precision (whether a verifier can identify a correct answer). The abstract states, “In domains like coding and formal proofs, where answers can be automatically verified, these increases in coverage directly translate into improved performance” (Abstract, PDF p. 1). Inference: Apply this to proof generation by generating many candidate proofs, running a proof checker on each, and accepting a checked candidate.

The paper evaluates GSM8K and MATH word problems, Lean4 MiniF2F-MATH proofs, CodeContests Python programs, and SWE-bench Lite repository edits. MiniF2F, CodeContests, and SWE-bench have automatic checkers; GSM8K and MATH use an oracle answer check for coverage and separate learned or voting verifiers for precision (Section 2, PDF pp. 3–4).

## technique 1: repeated sample-and-check

what it is and when to use it

Sample `N` independent candidates with a positive temperature, then run a domain checker over the collection. Use it when candidates have a pass/fail checker: Lean’s proof checker, unit tests, or hidden input-output tests. Coverage increases directly become success-rate increases only when the checker reliably identifies a valid candidate.

how to do it

1. Fix the prompt and sampling hyperparameters across independent attempts, using a positive temperature (Section 5, PDF p. 12). The paper’s Figure 1 says, “We generate many independent candidate solutions for a given problem by sampling from an LLM with a positive temperature” (Figure 1 caption, PDF p. 2).
2. For Lean proofs, include few-shot examples, imports, and the theorem statement; replace the theorem name with an index to avoid leaking its solution (Appendix A.1, PDF p. 19). Generate 10,000 samples per problem at temperature 0.5 without nucleus sampling, with 200 maximum output tokens.
3. Run each candidate through the checker. The Lean setup uses lean-dojo 1.1.2, Lean 4.3.0-rc2, and a 10-second timeout for each tactic step (Appendix A.1, PDF p. 19).
4. Define a problem as covered if at least one candidate passes. Estimate pass@k with the unbiased estimator based on `N` generated samples and `Ci` correct samples for problem `i` (Section 2, PDF pp. 3–4).
5. Increase `k` to measure the scaling curve. The paper generated 10,000 samples per problem for Llama-3-8B-Instruct and Llama-3-70B-Instruct on CodeContests, MiniF2F, GSM8K, and MATH, and used 250 independent attempts per SWE-bench Lite issue (Section 2.1, PDF pp. 4–5). One SWE-bench attempt is a full multi-turn trajectory with Moatless Tools; CodeContests and MiniF2F attempts are single-turn, without execution feedback (Section 5, PDF p. 12).

verus form

Inference: For Verus proof synthesis, generate candidate Rust/Verus files or proof blocks, compile each with Verus, and accept only candidates whose stated contracts verify. A harness can store each candidate and checker result; the production path should use the checked candidate, not an unverified sample. Use Verus `requires` and `ensures` in the candidate, `proof fn` lemmas and `invariant` clauses as needed, and keep executable code separate from proof code. The paper’s Lean checker verifies Lean terms; it does not prove Verus code, Rust library behavior, or that the generated specification captures the product requirement.

evidence

For Gemma-2B on CodeContests, coverage rises from pass@1 0.02% to pass@10,000 7.1% (Section 2.2, PDF pp. 5–6). On SWE-bench Lite, DeepSeek-Coder-V2-Instruct rises from 15.9% of issues solved with one attempt to 56% with 250 attempts (Abstract, PDF p. 1; Section 2.1, PDF p. 5). The MiniF2F evaluation uses 130 formalized MATH test problems (Section 2, PDF p. 4; Appendix A.1, PDF p. 19). These are coverage or checker-defined success rates, not universal correctness.

## technique 2: model and budget selection by coverage curves

what it is

Fit coverage as a function of sample count and compare models at a fixed inference-FLOP or dollar budget. The paper reports that coverage is often modeled by an exponentiated power law and that the best model size depends on task, budget, and desired coverage (Sections 2.3 and 3, PDF pp. 6–9).

how to apply

1. Sample 40 coverage points spaced on a log scale and remove duplicate sample counts (Appendix C.1, PDF p. 24).
2. Fit `c ≈ exp(a * k**b)`, equivalently `log(c) ≈ a * k**b`, where `c` is coverage, `k` is sample count, and `a` and `b` are fitted parameters. The authors use SciPy’s `curve_fit` on coverage points (Appendix C.1, PDF p. 24). Inspect deviations because MiniF2F curves can depart from the fit (Section 3.1, Figure 5, PDF p. 8).
3. Convert model size and samples to inference FLOPs or API dollars, then choose the model/sample pair that maximizes coverage under the available budget (Section 2.3, PDF pp. 6–7).

verus form

Inference: Record verification time and sample-generation cost for each Verus candidate, then select a sampling budget from measured pass@k curves. This is an orchestration policy outside Verus; Verus proves each accepted candidate’s contracts, while the budget model remains empirical.

## technique 3: verifier scaling and checker audits

what it is

Separate the existence of a correct sample from the ability to select it. For GSM8K and MATH, the authors compare majority vote, reward-model best-of-N, and reward-model weighted majority vote (Section 4.1, PDF p. 9). These methods plateau near 100 samples even while oracle coverage exceeds 95%.

The paper also audits verifier errors. It reports, “11.3% of problems have flaky test suites that do not produce consistent results when running them on the same candidate solution” (Section 4.2.1, PDF p. 11). In CodeContests, 35 of 122 test-set problems with Python3 solutions contain listed “correct” solutions that fail their tests (Section 4.2.2, PDF p. 11). The authors describe test suites as less comprehensive than proof checkers and explain that they can produce false positives and false negatives (Section 4.2, PDF pp. 10–11). For the full SWE-bench evaluation, they run test suites 11 times on problems with flaky tests and use majority voting to classify each solution. Removing the 34 flaky problems leaves 266 problems and gives 54.14% coverage at 250 attempts (Appendix B.2, Figure 9, PDF pp. 23–24).

verus form and implications

Inference: Verus’s proof checker supplies stronger precision than voting because a passing proof is checked against explicit contracts, but the contracts and trusted external specifications remain potential false-positive sources. Audit candidate harnesses for timeout, dependency, compiler-version, and nondeterminism issues; record checker version and assumptions with each result. Do not interpret a finite pass@k curve as proof that every generated candidate is correct.

## what is proved, measured, and trusted

The paper measures empirical coverage, success rate, costs, and verifier behavior. Lean checking establishes acceptance of a candidate under Lean 4.3.0-rc2 and the supplied imports; unit tests establish only tested behavior. Inference: Interpreting these measurements depends on the sampling implementation, checkers, benchmark labels, test suites, and reported cost assumptions. The authors found one GSM8K item with an incorrect ground-truth answer and 11.3% flaky SWE-bench Lite problems, showing that benchmark truth and checker outputs can be wrong.

## techniques for the catalog

- repeated sample-and-check: generate many independent candidates and accept one that passes an automatic proof or test checker
- unbiased pass@k measurement: estimate the probability that at least one of `k` samples is correct from `N` samples and each problem’s correct-sample count
- budget-aware sampling: compare model size and sample count at fixed FLOPs or dollars using fitted coverage curves
- verifier precision audit: measure selection methods separately from oracle coverage and test for flaky, false-positive, and false-negative checkers
- formal-proof candidate pipeline: use Lean proof checking (Inference: adapt to Verus) as the selection oracle for generated proof artifacts
