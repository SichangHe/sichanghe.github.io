# Direct Optimization of Generators for Search in Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `ousherovitch2026direct`, [paper](https://doi.org/10.1007/978-3-0)

## problem and setup

The paper asks how to train a language-model tactic generator when deployment uses tree search. Standard supervised fine-tuning (SFT) with cross-entropy (CE) optimizes the probability of a demonstrated tactic sequence, while deployed search succeeds if any proof is found within a finite expansion budget. A tactic that is unlikely on the demonstrated trace may still lead to another proof, and a valid off-trace tactic may consume budget before search recovers. CE therefore need not align with proof discovery under search.

The paper states, “We extend Compute-Aligned Training (CAT) to this setting through an abstraction of policy-guided search, deriving tractable, trace-supported losses.” (Abstract, PDF p.1). It contributes search-aware CAT losses and a search-agnostic uniform-allocation (UA) loss. The paper states, “Both induce scalar weights on per-tactic cross-entropy gradients.” (Abstract, PDF p.1) Both are weighted sums of ordinary per-tactic CE gradients. The evaluation uses Lean 4 through LeanDojo, Qwen2.5-Math-7B-Instruct with LoRA, and a held-out pool of 458 theorems whose reference proofs have 2–5 steps (§5, PDF p.7).

Inference: The direct product implication for VeruLaw is training an agent's Verus-proof tactic or edit generator against the actual verifier-search procedure, rather than treating each successful proof trace as an independent language-model target. The paper studies Lean and does not establish transfer to Verus.

## technique 1: formalize policy-guided proof search

Inference: Use this as the objective's foundation. Let X be proof states, Y tactics, and `T : X × Y → X ∪ {xerr}` the transition that either applies a tactic or returns an error state. The model is a stochastic policy `πθ(y | x)`. A demonstrated proof trace is `τ* = (x0, y1*, x1, …, yL*, xL)` with `xL = xQED`; write `pt = πθ(yt* | xt−1)` (§2.1, PDF p.3).

Represent the deployed search algorithm A as a configuration `c = ⟨F, M⟩`, where F is the scored frontier and M contains policy, budget, and unavailable nodes. A selects a frontier node, samples a tactic, executes T, and updates the configuration. Let `J^A(c)` be the probability that search finds a proof before the budget is exhausted. The paper gives the exact Bellman-style recurrence over node-selection probabilities, tactic probabilities, and successor configurations (Eq. 2, §2.2, PDF p.3).

Apply the model as follows:

1. Define what counts as one expansion or rollout and decrement the budget in every update (§2.2, PDF p.3).
2. Specify the node-selection rule and memory update for the deployed search (§2.2, PDF p.3).
3. Define success as any valid trajectory reaching `xQED`, not only the demonstrated trace (§2.2, PDF p.3).
4. Use `J^A(c0)` as the quantity training should increase (§2.2, PDF p.3).

Inference: In Verus, X can be a verification state containing Rust source, ghost state, and pending proof obligations; Y can be a proof step, lemma invocation, or source edit; T runs Verus and either returns a new state or a diagnostic. A product must define whether a successful proof means one module verifies, the whole crate verifies, or a specified property is discharged.

## technique 2: trace-supported Compute-Aligned Training (CAT)

The exact recurrence cannot be learned from a single demonstrated trace because the data has no probabilities or continuations for off-trace tactics. CAT makes a tractable surrogate by restricting configurations to demonstrated states `x0 … xL`. Replace T at a demonstrated state with the demonstrated tactic `yt*`; every other tactic, whether invalid or valid-but-off-trace, becomes one trace-miss event `⊥τ` (§2.3, PDF pp.3–4).

For each trace state, the surrogate advances with probability `pt` and follows a negative update with probability `1 − pt`. The resulting recurrence `Ĵ^A_τ*(c; p)` is finite for finite budgets. CAT minimizes `L_CAT(θ) = −log Ĵ^A_τ*(θ)` (Eq. 6, §2.3, PDF p.4). Proposition 1 shows the gradient is a scalar-weighted sum of per-step CE gradients: `∇θ L_CAT = Σ_t w_t^A ∇θ L_CE^(t)` where each weight is `pt / Ĵ × ∂Ĵ/∂pt` (Eq. 7, §2.4, PDF p.4).

Steps to implement:

1. Collect successful proof traces with every tactic state and verified transition (§2.1, PDF p.3).
2. Implement the deployed search's selection rule and positive/negative trace updates (§2.3, PDF pp.3–4).
3. Solve the finite recurrence for surrogate success and differentiate it with respect to each demonstrated tactic probability (§2.3–2.4, PDF p.4).
4. Multiply each CE gradient by its scalar weight and perform the SFT update (§2.4, PDF p.4).
5. Recompute weights when changing the deployed search strategy or budget (§3, PDF pp.4–5).

Inference: For Verus, a CAT training example needs a verifier-confirmed transition after each generated proof action. A failed compile or proof obligation can be the negative update, but collapsing all off-trace failures and alternative valid proofs into one miss risks mis-training agents that routinely discover different valid lemmas.

## technique 3: search-agnostic uniform-allocation (UA)

Use UA when one generator must serve several search algorithms or the deployment strategy is not fixed. UA assigns a uniform local compute budget to every demonstrated step and accounts for repeated sampling without modeling a particular frontier policy (§2, PDF pp.2–3). Its objective also produces scalar weights on per-tactic CE gradients, but one shared UA adapter can be reused across strategies.

The paper contrasts this with strategy-specific CAT: CAT preserves selected details of node selection and budget allocation, while UA is deliberately search agnostic. In the experiments, the same UA adapter is used for Pass@N, BFS, DFS variants, and MCTS (Table 1 caption, PDF p.8).

Inference: In Verus, UA is suitable for a general proof generator used by different CI search modes. It weights each proof-state action according to a common expansion budget, while CAT should be used when VL standardizes on one search engine. The choice is an engineering inference; no Verus experiment appears in the paper.

## technique 4: specialize objectives to Pass@N and best-first search

Inference: For Pass@N, the search samples N independent complete rollouts. If `πproof = Π_t pt` is the probability of the demonstrated proof, the trace-supported success is `1 − (1 − πproof)^N` (Eq. 11, §3.1, PDF p.5). Differentiation gives the same scalar weight to every step of the trace. This is simple because every rollout has the same path structure.

Inference: For policy-guided best-first search, a node reached by tactics `y1 … yk` receives score `s_BFS = (Π_j πθ(yj | xj−1))^(1/k)` (Eq. 12, §3.2, PDF p.5). The paper's trace-supported surrogate keeps one live trace node, retries until the demonstrated tactic is sampled or budget ends, and models each miss as one expansion. If `Tt ~ Geom(pt)` counts samples needed at step t, success is `P(Σ_t Tt ≤ N)` (Eq. 14, §3.2, PDF p.6).

Inference: A Verus search implementation must derive its own recurrence for the actual scheduler, proof-state scoring, and retry behavior. Reusing the Pass@N formula for best-first or beam search would be incorrect because their budgets and frontier updates differ.

## technique 5: audit trace approximation error

A demonstrated trace omits alternative proofs and the cost of off-trace exploration. The paper separates two effects (§4, PDF pp.6–7). The bypass channel is a valid alternative proof, which makes the demonstrated tactic less important than the surrogate weight suggests. The trap channel is a valid but unhelpful off-trace branch that consumes multiple expansions before returning, making the demonstrated tactic more important than the one-expansion surrogate suggests.

The paper proves that for Pass@N with N > 1, the true weight is no greater than the CAT weight and the CAT weight is below the CE weight (Theorem 1, §4.1, PDF p.6). Under bounded deterministic excursion costs, the true trap weight lies between the one-expansion surrogate and a reduced-effective-budget weight (Theorem 2, §4.1, PDF pp.6–7). It also proves non-identifiability: two environments can agree on every demonstrated transition and policy probability yet have different deployed weights because their off-trace consequences differ (Proposition 4, §4.1, PDF p.7).

With increasing Pass@N budget, the paper states, “More compute can compensate for a delay, but not for permanent loss of the opportunity to recover.” (§4.2, PDF p.7). In the all-recoverable model, true and surrogate weights tend toward zero; if a miss can permanently absorb the search, the true weight remains positive while the surrogate misses that risk (§4.2, PDF p.7).

Inference: For VeruLaw, record one-step deviations and their repair cost instead of assuming every failed proof step costs one expansion. Train with CAT only after measuring whether off-trace lemmas rejoin the demonstrated proof, lead to an alternative proof, or consume the entire budget. The paper's non-identifiability result means no trace-only loss can recover these facts without additional exploration data.

## evidence and denominators

At budget N = 256, Table 1 evaluates six strategies on 458 held-out theorems. CE proof-found percentages are Pass@N 21.2, BFS 23.8, DFS 19.2, RDFS 20.7, VDFS 21.2, and MCTS 20.3. Search-aware CAT gives 26.6, 25.1, 20.7, 23.6, 23.8, and 22.5; shared UA gives 25.1, 26.9, 23.6, 25.3, 24.5, and 25.1 (Table 1, PDF p.8). Each percentage uses the same denominator of 458 theorems and counts any kernel-verified proof as success (§5, PDF p.7). Capped runs without a proof count as failures (§5.1, PDF p.7).

Budget-matched paired comparisons in Table 2 use n = 458 at Pass@N budgets 16 and 64, n = 408 at 256; BFS uses n = 458 at 16 and 64 and n = 407 at 256. Search-aware CAT gains over CE are +2.0, +4.4, and +4.2 percentage points for Pass@N, and +4.4, +4.6, and +6.9 for BFS (Table 2, PDF p.8). The table reports paired CAT-only/CE-only successes and exact two-sided McNemar p-values; the changing n means the plotted lines are not a common-cohort comparison.

Trusted elements include Lean's kernel, LeanDojo's environment, the theorem statements and reference traces, the proof-search implementation, and the assumption that the finite expansion budget reflects deployment cost. The experiments use one base model, short proofs, and offline SFT. The paper states, “Both remain trace-only.” (Conclusion, PDF p.9), referring to UA and search-aware CAT. It leaves one-step deviation sampling, deeper local-tree exploration, and allocation of training compute for future work (§6, PDF p.9).

Inference: The product threat is objective mismatch: an agent can become better at following recorded proof traces while becoming worse at discovering valid alternative Verus proofs or recovering from a bad edit. A second threat is cost-model mismatch when Verus verification time varies dramatically by lemma. VL should reuse search-aware weighting and explicit off-trace audits, but should not claim universal gains from the 458-theorem Lean benchmark.

## techniques for the catalog

- search-aligned objective: optimize proof-found probability under the deployed finite-budget search
- trace-supported CAT: collapse deviations from a demonstrated proof into a finite negative event and differentiate the recurrence
- uniform-allocation loss: train one generator with equal local compute allocation across search strategies
- strategy-specific recurrences: derive separate objectives for Pass@N, best-first, and other frontier policies
- off-trace error analysis: account for alternative proofs and the recovery cost of exploratory branches
- paired proof-search evaluation: report proof-found rates with theorem, expansion-budget, and paired-cohort denominators
Checked 2026-10-15 against paper ousherovitch2026direct: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
