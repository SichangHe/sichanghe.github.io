# Simplifying Formal Proof-Generating Models with ChatGPT and Basic Searching Techniques
(authored by agents unless marked 🧑)
Tag: `han2025simplifying`, [paper](https://arxiv.org/abs/2502.03321v3)

## contribution and setting

Han et al. combine ChatGPT with searches having breadth-first and depth-first properties around Lean. They target formal theorem proving, mainly the 244-theorem Lean 3 miniF2F test set, and deliberately avoid additional model fine-tuning. The abstract reports: “Despite its simplicity, our best-performing Lean-based model surpasses all known benchmarks with a 31.15% pass rate.” (Abstract, p. 1) Section 4.2 qualifies that claim: “This pass rate surpasses all values in Table 1 except for in the case of the HyperTree model, which uses a much larger sample budget.” (p. 9) Inference: the reusable engineering idea is to check proposed tactics with a proof assistant and search again after failures.

The baseline interaction is explicit. The model receives a tactic state containing hypotheses and goals, proposes tactics, sends each tactic to Lean, receives new goals or hypotheses, and repeats. The paper's termination conditions are: “The process is terminated when (a) goals no longer appear, indicating a valid proof has been generated, (b) all tactics fail to update the tactic state, (c) the model gives up on proving, generating sorry, or (d) the time limit is reached.” (Section 2.3, p. 5) Inference: a successful proof establishes the theorem formalized in Lean under the environment and library used.

## technique 1: b-search, breadth-oriented tactic sampling

what it is

`b-search` asks ChatGPT for 64 tactic samples at each tactic state using the API parameter `n`, then removes duplicate tactics before interacting with Lean. It resembles beam-search-based proof search, but obtains its candidates through ChatGPT's sampling parameter. Temperature controls diversity. The paper says: “However, instead of looking at n many tactics through beam search as ReProver and Llemma do, the b-search generates tactics that have a very high probability of correctly continuing the proof but are likely to be redundant.” (Section 3, p. 5)

when to use it

Inference: use b-search when many alternative next tactics may work and memory/API calls are available. It is the paper's stronger single search: bChatLean reaches 29.10% pass@1 on miniF2F under GPT-4 Turbo at temperature 1.4, while dChatLean reaches 23.77% at 50 attempts (Table 1, p. 8). The comparison uses the same 244-problem miniF2F test set reported by the paper, with a 600-second per-theorem limit.

how to do it

1. Use five examples from miniF2F validation data, the current tactic state, and the instructions “Generate only the single line of proof that immediately follows.” and “Do not use ‘sorry’.” The ChatGPT baselines are GPT-4-0613 and GPT-4-1106-preview; Table 1 uses the latter (Sections 4.1–4.2, p. 7).
2. Ask ChatGPT for `n = 64` tactic candidates at the current state (Section 3, p. 5).
3. Deduplicate equal tactic strings for that state (Section 3, p. 5).
4. Submit each remaining tactic to Lean through LeanDojo and obtain new goals or hypotheses (Section 2.3, p. 4; Section 4.1, p. 7).
5. Repeat for new tactic states until one has no goals, all tactics fail to update the state, the model gives up with `sorry`, or 600 seconds elapse (Section 2.3, p. 5; Section 4.1, p. 7). Table 1 reports one b-search attempt per theorem (p. 8).

Verus form (inference)

Inference: Replace a Lean tactic state with a Verus diagnostic state: Rust source, current `requires`/`ensures` or `invariant` obligation, and the verifier error. Ask the model for one Rust/proof edit, run Verus, and branch on the checked result. Verus proof edits can use `assert`, `proof fn`, `lemma`-style proof functions as defined by Verus, `requires`, `ensures`, and loop `invariant` clauses; generated executable code must still pass Rust compilation. Inference: candidate deduplication should include normalized source and specification changes, because syntactically different assertions can be semantically equivalent. A timeout or unsupported feature is a failed search transition, not proof evidence.

evidence and limits

The reported 29.10% is a pass rate over the miniF2F test set under the stated GPT-4 Turbo, temperature 1.4, one attempt, 64 tactic samples, and dynamic API calls (Table 1, p. 8). The paper notes a prompt limitation: “Contrary to our purposes, the proof for the solved problems often manifested as a single line of output, achieved by combining various tactics through the generous use of semicolons.” (Section 4.2, p. 9)

## technique 2: d-search with restart and Bad(O)

what it is

`d-search` samples one highest-probability tactic (`n = 1`), interacts with Lean, and restarts from the theorem's initial state when the tactic path fails. It tries the theorem up to `k` times. `dChatLean+` adds `Bad(O)`, a map from a tactic state to tactics that failed there, so a restart avoids repeating the same failed choice. The paper defines the memory as follows: “Bad(O) refers to the set of tactics that are unproductive or erroneous within a specific proof state.” (Section 3, p. 6)

when to use it

Inference: use d-search when one tactic sample per state is desirable and repeated attempts can supply diversity. Use Bad(O) when restarts revisit the same states. The paper states that d-search generally uses fewer resources (Section 3, p. 5), but restarts after failure and is sensitive to typos (Section 4.3, p. 9).

how to do it

1. Start at the theorem's initial tactic state and request one tactic (`n = 1`) (Section 3, p. 6).
2. Submit the tactic to Lean. If it creates a new state, continue greedily; if it fails, record the failure and restart at the root (Section 3, p. 6).
3. For dChatLean+, store the failed tactic together with its tactic state in `Bad(O)` (Section 3, p. 6).
4. On a later visit to a matching state, use `Bad(O)` as feedback to avoid the recorded failed tactics (Section 3, p. 6).
5. Stop on a goal-free state, exhausted attempts, `sorry`, or timeout (Section 2.3, p. 5; Sections 3–4.1, pp. 6–7).

The paper's worked example for `mathd_algebra_171` records failed tactics, tries alternatives at recurring states, changes the proof direction, and succeeds on trial 21 (Section 5, pp. 14–15). Its conclusion is: “As demonstrated in this example, the feedback algorithm in dChatLean+ allows the model to adapt failed tactics or change the direction of the proof by referring to previous attempts.” (p. 15)

Verus form (inference)

Inference: Key `Bad(O)` by a normalized Verus error location plus the relevant source/specification hash, and store failed edits or lemma applications. On a restart, reject the same edit only when the obligation hash matches; after a code change, invalidate the entry. Inference: a failed solver attempt can reflect timeout or unstable automation, so the cache should distinguish a semantic counterexample from an engineering failure. Use Verus's checked result as the branch test and preserve all successful source revisions for reproducibility.

evidence and limits

On miniF2F with GPT-4 Turbo at temperature 1.4, dChatLean+ reaches 25.00% pass@50 versus 23.77% for dChatLean (Table 1, p. 8). Table 4 gives pass rates under the same dataset and model: at 10 attempts, 18.85% with Bad(O) versus 15.16% without, a 3.69 percentage-point increase; at 50 attempts, 25.00% versus 23.77%, a 1.23-point increase (Table 4, p. 10). These are rates over the 244 miniF2F test problems. The paper warns: “Additionally, any minor typos in dChatLean’s tactic generation can critically impact the model’s pass rate.” (Section 4.3, p. 9)

## technique 3: combine complementary searches

what it is

The authors combine bChatLean and dChatLean+ and report their solved-theorem overlap. Their combination uses one b-search attempt (`k = 1`, `n = 64`) and up to 50 d-search attempts (`k = 50`, `n = 1`). The paper reports: “Out of the 244 theorems attempted, 56 were successfully solved by both of our models, 15 were only solved in bChatLean, and 5 were only solved in dChatLean+.” (Section 4.2, p. 9)

how to apply it

Inference: the following is an implementation proposal; the paper does not specify this execution order.

1. Run b-search under its sample budget and collect checked proofs.
2. Run d-search with Bad(O) on unsolved theorems.
3. Deduplicate proofs by theorem and retain any proof that Lean checks.
4. Record which search found each proof and compare overlap; do not count a theorem twice.

The combined model reaches 31.15% on the miniF2F test set (Table 1, p. 8). Inference: the overlap counts give 56 + 15 + 5 = 76 solved theorems out of 244, consistent with the rounded rate.

Verus form (inference)

Inference: run a breadth beam of candidate Rust/specification patches, then a restart-based single-patch loop with a failure cache for remaining obligations. Keep the first Verus-checked proof per target and retain alternatives for regression testing. Inference: combining search strategies is useful only if each candidate is checked in the same pinned Verus/Rust environment; a model-generated proof text is not evidence.

## cross-dataset evidence and boundaries

The coupled model proves 46 of 350 ProofNet theorems (13.14%), with topic counts of Analysis 14/88 (15.91%), Abstract Algebra 21/162 (12.96%), Linear Algebra 3/28 (10.71%), Topology 6/60 (10.00%), and Examinations 2/12 (16.67%) (Table 5, p. 12). Table 5 is used here because the prose on p. 11 swaps the Linear Algebra and Topology rates and overlooks Examinations when naming the best-performing topic. The model proves 6 of 26 newly formalized 2023 AMC 12 problems (reported as 23.07%) (Section 4.4, p. 12). With Llemma and Lean 4, the best combination reaches 28.28% on miniF2F, versus the cited Llemma baseline 26.23% (Table 6, p. 13). Bad(O) lowers standalone dLlemLean performance from 22.54% to 21.31%, while the combination with bLlemLean improves from 27.46% to 28.28% (Table 6). Inference: these results support complementarity, not a universal benefit from failure feedback; rates across different datasets, Lean versions, and models should not be merged.

The paper's Bernoulli example uses the existing mathlib theorem `one_add_mul_le_pow`, which proves the target but may not follow the intended induction argument (Section 5, pp. 15–16). The authors say: “While the problem was technically solved, the resulting proof may be considered unsatisfactory.” (p. 16)

## techniques for the catalog

- checker-in-the-loop tactic search: generate one or many tactics, submit each to a proof assistant, and expand only checked states
- breadth-oriented b-search: sample 64 tactics per state, deduplicate, and explore valid successors
- restart d-search: try one greedy tactic path, restart from the root after failure, and vary attempts
- Bad(O) failure memory: key failed tactics by proof state so restarts avoid repeated dead ends
- complementary search union: combine breadth and restart searches, count overlap, and retain any checked proof
- Inference: pass-rate accounting should report numerator, denominator, model, Lean version, temperature, attempts, and tactic budget together
