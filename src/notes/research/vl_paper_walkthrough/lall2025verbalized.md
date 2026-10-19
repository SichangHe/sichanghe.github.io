# Verbalized Algorithms: Classical Algorithms are All You Need (Mostly)
(authored by agents unless marked 🧑)
Tag: `lall2025verbalized`, [paper](https://arxiv.org/abs/2509.08150)

## core idea

Verbalized algorithms (VAs) keep a classical algorithm's control flow and replace only atomic operations, such as comparisons, with LLM text queries. The algorithm supplies decomposition, iteration, parallelism, and data structures; the LLM supplies a small oracle over natural-language objects. This limits the model's task and transfers the classical algorithm's guarantees when the oracle agrees with the intended predicate.

The paper defines the approach as follows: “a verbalized algorithm replaces some atomic operations in a classical algorithm with LLM-driven text-based oracles while retaining the high-level control flow, thereby largely retaining the theoretical guarantees.” (Section 1, p. 2). Inference: for a Verus agent, use a fixed verified search, sorting, or synthesis algorithm and call an LLM only for a candidate comparison or ranking. The Rust/Verus proof should establish the classical algorithm's invariant independently of the LLM; the oracle answer is an input whose semantic accuracy must be checked or treated as an assumption.

## technique 1: binary or categorical oracle with constrained output

Definition 1 instantiates an n-argument Boolean oracle as a query whose output is constrained to “yes” or “no”, mapped to true or false. Steps (Section 2, p. 4): (1) choose a classical algorithm A with oracle f; (2) serialize its objects as strings; (3) prompt the LLM with the task criterion and objects; (4) constrain decoding to the allowed labels; (5) map the label into the oracle result; (6) let A continue unchanged. For categorical choices, the appendix generalizes this to an (n,k)-VA using a k-way Plackett–Luce reward model.

The authors state, “This preserves the theoretical properties of the classical algorithm A[τ ] if the model’s reward model matches the ground truth.” (Section 2, p. 4). For inaccurate oracles, they propose using robust algorithms with existing error bounds, while leaving deeper analysis of theoretical error rates to future work. The categorical definition is in Appendix A, p. 14. Inference: a Verus wrapper can expose the oracle result as an input enum and prove that a verified algorithm preserves memory safety and structural invariants for either answer. It cannot prove that a remote LLM chose the semantically correct label.

## technique 2: symmetrize pairwise queries

Pairwise LLM answers suffer positional bias and a tendency toward particular labels. Query both `(x1,x2)` and `(x2,x1)`, then average the probability of “yes” from the original answer with the probability implied by the swapped answer. For original and swapped yes probabilities p12 and p21, the combined yes probability is (p12 + 1 − p21)/2; the no probability is its complement. The paper identifies “Positional bias” and “sycophancy” as the two biases (Section 2, p. 4). Inference: this makes the combined probabilities complementary across argument orders, but tied probabilities still require a decision rule. A Verus integration can log both oracle calls and verify the probability combination and tie policy; that proof does not establish probability calibration.

## technique 3: preserve algorithmic complexity and parallelism

The maximum case compares three designs. A constrained-decoding baseline asks directly for the largest element. “Native” maximum replaces Python's `>` in the ordinary O(n) max reduction with a yes/no comparison. A tournament performs pairwise comparisons in ceil(log2 n) parallel rounds and n−1 total comparisons. For lists of 1,000 integers, the authors write, “The only configuration that solved n = 1000 reliably is the tournament maximum, which was several orders of magnitude faster yet maintained near-zero errors.” (Section 3, pp. 4–5). Thinking increased runtime almost tenfold; symmetrization doubled runtime and reduced error for the 1.7B model. Five runs were used per condition and 20 random lists per n.

## technique 4: sorting, clustering, and greedy selection

Verbalized sorting uses an LLM comparison oracle in Bitonic sorting or KwickSort. Bitonic performs O(n(log n)²) comparisons in O((log n)²) parallel time. KwickSort follows quicksort, allows inconsistent comparisons, and has O(n log n) expected comparisons and O(log n) expected parallel time; recursion stops without sorting when a partition has at most θ elements, with θ ∈ {4,16}. Before the added early stopping, its approximation bound concerns the FAS-Tournament objective under inconsistent pairwise preferences: expected disagreement is at most three times optimal. Sorting accuracy is measured with Kendall-tau (Section 4, pp. 5–7).

Verbalized clustering uses two classical structures. Vanntec recursively partitions strings by triplet comparisons to two randomly chosen pivots, stops a partition when it has at most θ strings and attaches them to its parent, constructs multiple trees, and combines them with Evidence Accumulation Clustering (EAC). KwickCluster repeatedly samples a pivot, collects strings judged to belong to its cluster, and continues with the remaining strings. Vanntec uses O(n log n) LLM calls and O(log n) parallel time; its EAC step uses no LLM calls. KwickCluster has worst-case O(n²) queries and O(n) parallel time (Section 5, p. 7; Algorithm 1, p. 8). Across Medrxiv titles, MD3 dialogue transcripts, and GoEmotions sentences, VAs used more time but outperformed embedding/K-Means baselines in Adjusted Mutual Information; symmetrization sometimes doubled accuracy while thinking cost 10–100 times more runtime (Section 5, pp. 7–8).

Verbalized Greedy Submodular Maximization (VGSM) follows the classical greedy algorithm: at each of k steps, ask the LLM to choose one item from the remaining universe according to a prompt-defined criterion. Classical greedy guarantees 1−1/e only when the objective is monotone submodular. The authors qualify the claim: “In contrast, due to the lack of explicit f , VGSM can only make a much weaker statement, such as if f is indeed submodular, then it can guarantee 1 − 1/e optimality.” (Section 6, p. 9). Inference: applying the classical bound also requires the oracle to select an item with maximum marginal gain for that objective. The paper evaluates WiFi access-point placement on 10 HouseExpo floor plans with exact branch-and-bound optima, and retrieval on HotpotQA and CUAD. The authors report WiFi solutions relatively close to optimal and better RAG answer log-likelihood than embedding retrieval; KwickSelect had worse log-likelihood at similar runtime (Section 6, pp. 9–10). RAG retrieves k=3,6,12 documents, after embedding preselection of 2k or 4k candidates. Retrieval models are Qwen3-4B and Qwen3-32B; answer likelihood is evaluated with Qwen3-32B (Section 6, pp. 9–10). Inference: a Verus agent can prove the greedy invariant and a bound only after separately proving the objective assumptions; an LLM-defined implicit objective is an untrusted specification.

## evidence, trust, and limits

Experiments used SGLang's offline asynchronous engine and repeated every condition five times. Hardware was NVIDIA A100-80GB for maximum/sorting and H100 for clustering/submodular tasks (Appendix E, p. 18). VAs need many model calls, so their constant factor can dominate despite classical asymptotics. The general transfer of guarantees is conditional on oracle accuracy; VGSM additionally requires a monotone submodular objective for the classical approximation bound (Section 2, p. 4; Section 6, p. 9). Free-form baseline outputs violated explicit WiFi constraints, including placing access points in walls or at duplicate positions; thinking reduced but did not eliminate violations (Section 6, p. 9).

## techniques for the catalog

- oracle substitution: replace only atomic classical operations with constrained LLM queries
- symmetrized comparison: query both argument orders and combine probabilities to reduce positional bias
- algorithmic parallelism: retain tournament, sorting, and partition control flow for known complexity
- verbalized greedy selection: use an LLM to choose each next item while inheriting greedy guarantees conditionally
- noisy-oracle robustness: use algorithms designed for erroneous comparisons when the LLM is imperfect
