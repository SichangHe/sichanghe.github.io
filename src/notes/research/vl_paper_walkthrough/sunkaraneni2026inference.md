# Inference-Time Amplification of Weak Reasoning Models
(authored by agents unless marked 🧑)
Tag: `sunkaraneni2026inference`, [paper](https://doi.org/10.1007/BF00058655)

## what the paper establishes

The paper studies how repeated proposal generation and imperfect selection turn intermittent model capability into usable solutions. Its abstract states: “We study this problem as inference-time amplification, separating coverage—whether a useful candidate is generated—from identifiability—whether it can be recognized among the alternatives.” More proposals increase the chance that a useful candidate appears; they do not by themselves reveal which candidate is useful.

The theory models search over valid partial states. A progressing-sound action preserves validity and strictly decreases an integer rank, so a trajectory of such actions reaches a terminal state within at most `L_x` steps. A committee protocol draws `k` candidate actions, makes `m` critic calls per candidate, removes critic-rejected candidates, gives each survivor `r` pairwise comparator votes, selects a Copeland winner, and repeats. Assumption 1 gives per-state useful proposal probability at least `α_0`; Assumption 2 requires a critic that rejects unsound actions with probability at least `β_0` and a comparator that chooses a sound action over an unsound one with probability at least `1/2+σ_0`.

The central impossibility result is coverage without identifiability. The paper constructs a one-step family with actions `{1,…,M}` and hidden parameter θ where a uniformly sampled action is sound with probability `1−1/M`, but all proposal distributions are identical across worlds. Even arbitrarily many samples cannot give a selector a uniform positive edge without information about θ. Its positive results separate three errors: no useful proposal, critic/comparator selection error, and accumulation across trajectory depth.

Empirically, SWE-bench Verified has 500 tasks. Eight independent GPT-5.4 nano Mini-SWE-agent trajectories per task give 67.0% for one trajectory, 79.0% oracle best-of-8, and 76.4% for critic–comparator selection. The selector recovers 78.3% of the oracle-exposed gain. Among tasks the system misses, 89.0% have no passing patch in the pool and 11.0% are oracle-reachable selection misses. These denominators are the 500-task SWE-bench headline setting. On MATH L4–5 and GSM-Plus, selection recovers 85% and 77% of oracle gaps; on a held-fixed Qwen3.6-27B SWE pool, repository context raises comparator edge from 0.04 to 0.09 and recovery from 24% to 40%.

## technique: separate proposal coverage from local identifiability

What it is: treat candidate presence and selector recognition as distinct measurable resources. The paper says, “More samples can increase coverage without providing any information about which sample is useful.”

When to use it: use this decomposition when evaluating best-of-k, verifier-backed search, or multiple LLM-generated Verus proofs. It identifies whether additional calls should go to proposal generation, judging, or richer evidence.

How to do it:

1. Define a valid-state system with state space, valid and terminal states, action sets, transitions, outputs, and final verifier `R_x` (Definition 1, Section 3).
2. Choose a rank `d_x` that is zero for terminal states and positive for valid nonterminal states; define `Sound_x(s)` as actions preserving validity and strictly lowering rank (Section 3).
3. Estimate proposal coverage: the probability that the candidate pool contains at least one progressing-sound action (Assumption 1 and Theorem 1).
4. Estimate local identifiability: critic rejection probability and pairwise comparator advantage on sound–unsound pairs (Assumption 2 and Section 4).
5. Report one-shot success, oracle best-of-k, selector success, and oracle-gap recovery `Rec=(p_system−p_1)/(p_oracle−p_1)` (Section 6).

Inference: In Verus, represent a proof candidate as a typed state carrying the Rust code, specification context, and verifier result. Define a `spec fn` for valid states and a rank, then prove each accepted transition decreases rank and preserves validity. Proposal coverage is an empirical property of the model; Verus can prove the local state-machine obligations only for the formalized candidate semantics.

Evidence: the headline values are 67.0% pass@1, 79.0% oracle@8, and 76.4% selected success, yielding 78.3% recovery of the exposed gain. The paper emphasizes that oracle best-of-k is hindsight only and is never available to the selector.

Failure and assumptions: the final verifier is hidden from the selector; terminal selection experiments primarily measure single-step terminal choice rather than full multi-step composition. Finite-k oracle failure does not directly estimate the asymptotic blind-spot mass.

## technique: amplify a weak critic and comparator with repetition

What it is: use repeated independent critic calls and odd-numbered pairwise comparator votes to amplify a small positive local edge. The paper states, “The selection signal need not be strong.”

When to use it: use this when no perfect verifier exists but a local signal is better than chance on useful versus harmful candidates.

How to do it:

1. Draw `k` proposals at a state and apply `m` independent critic calls to each (committee protocol, Section 3).
2. Remove candidates rejected by any critic; if none survives, fail (Section 3).
3. For each surviving pair, run `r` independent comparator votes with odd `r`; orient the pair by majority (Section 3).
4. Select a Copeland winner and apply it; repeat until terminal or failure (Section 3).
5. Under local critic edge `β` and comparator edge `σ`, use Theorem 2's bound: local error is at most proposal miss plus `k²(1−β)^m e^(−2rσ)`, and, with independent proposals of sound probability at least `α`, proposal miss is at most `(1−α)^k` (Section 5).
6. For adaptive trajectories, apply Lemma 1: if step-t local failure is at most `ε_t`, total failure is at most the expected sum of `ε_t`; uniform `ε` gives `L_x ε` (Section 5).

Inference: In Verus, make each critic/comparator result an input to a proof-oriented admission function. A proof function can establish that a candidate accepted by a formal executable checker satisfies a local predicate; learned critic probabilities cannot be proved without a model of the critic. Use loop `invariant` clauses to preserve state validity and a decreasing rank, and `ensures` on the transition function to state the accepted-state relation.

Evidence: on GSM-Plus, pairwise selection recovers roughly 77–80% of the oracle-exposed gain for k=2,4,8, while critic-only recovery falls as top-score ties rise from 56% to 93%. On the fixed SWE pool, one comparator vote reaches 75.48% at $0.97/task and three votes 76.16% at $1.10/task; these costs are provider-specific and not a controlled comparison.

Failure and assumptions: the theory assumes fresh independent critic and comparator randomness and uniformly positive local edges. It allows false rejections only in an appendix extension. A misaligned comparator can reduce performance below simpler selection rules.

## technique: use local verification as an identifiability signal

What it is: a one-sided local verifier accepts every sound action almost surely and rejects an unsound action with probability at least `1−ν`. It can serve directly as a critic and induce a comparator by choosing the unrejected candidate when exactly one is rejected, otherwise breaking ties uniformly.

When to use it: use direct execution, tests, type checks, proof checking, or constraints when they reveal information about intermediate candidates rather than only completed outputs.

How to do it:

1. Define `V_x(s,a)` over a reachable valid nonterminal state and candidate action (Assumption 3, Section 4).
2. Require acceptance for every sound action and rejection probability at least `1−ν` for every unsound action (Assumption 3).
3. Use `V` as the critic; for pairwise comparison, verify both candidates and select the sole unrejected candidate or tie-break (Corollary 1).
4. Set the induced critic edge to `β_0=1−ν` and comparator edge to `σ_0=(1−ν)/2` (Corollary 1).

Inference: A Verus proof checker can be this local verifier for proof candidates: reject candidates whose `verify` invocation fails, and carry the checker result with the exact source hash. The paper's theorem applies only to a verifier whose local predicate is sound for progressing actions; Verus does not make a checker's specification complete automatically.

Evidence: the paper's Corollary 1 derives the comparator edge algebraically from `ν`; this is a formal sufficient condition, not an empirical estimate. In SWE-bench, visible tests and repository context are examples of local information, while hidden tests are reserved for final evaluation.

Failure and assumptions: a verifier that checks only completed outputs may not distinguish intermediate actions. The paper explicitly says a verifier of completed outputs is “not automatically useful for choosing among intermediate candidates.”

## technique: decompose oracle failure into blind spots and finite width

What it is: model shared latent heterogeneity in proposal quality. Conditional on latent `Z`, k calls independently produce a useful action with probability `q_s(Z)`. The miss probability decomposes as `B_s + R_k(s)`, where `B_s=P(q_s(Z)=0)` is a support-level blind spot and `R_k` is finite-sampling error that vanishes as k grows.

When to use it: use this before spending more judgment or proposal budget on a plateau; it distinguishes no-support cases from ordinary sampling misses.

How to do it:

1. Define the latent variable Z and conditional useful probability `q_s(Z)` (Lemma 2, Section 6).
2. Estimate or bound `ε_prop(k;s)=E[(1−q_s(Z))^k]`.
3. Separate `B_s=P(q_s(Z)=0)` from `R_k(s)=E[(1−q_s(Z))^k 1{q_s(Z)>0}]` (Lemma 2).
4. Combine with the global error bound: trajectory failure is bounded by `L_x[B+R_k+k²e^(−βm−2rσ)]` (Section 6).
5. Use oracle best-of-k as a finite-k upper-bound diagnostic, not as a direct estimate of B (Section 6).

Evidence: in SWE-bench, increasing k from 8 to 16 raises oracle coverage only from 79.0% to 79.2%, showing diminishing finite-width returns in this setting. The paper does not infer that 20.8% is the asymptotic blind-spot floor.

Failure and assumptions: latent heterogeneity and conditional independence are modeling assumptions. The decomposition is an upper-bound framework, not a direct estimator of each term from one finite pool.

## technique: improve identifiability by adding task-relevant context

What it is: hold proposal candidates and oracle coverage fixed while changing only the information given to the comparator. Repository access makes candidates more distinguishable without changing proposal generation.

When to use it: use this when proposals are already adequate but selection lacks context such as repository files, type environments, specifications, or proof diagnostics.

How to do it:

1. Freeze the Qwen3.6-27B SWE-bench proposal pool and its 79.2% oracle coverage (Section 7.3).
2. Run the comparator with patch-only input and with repository context.
3. Measure pairwise edge `σ̂`, solve rate, and oracle-gap recovery; estimate `σ̂=(1−τ)(a−1/2)` from tie rate τ and decisive accuracy a (Section 7.3).

Evidence: repository access raises `σ̂` from 0.04 to 0.09, solve rate from 67.0% to 69.6% (+2.6 points), and oracle-gap recovery from 24% to 40%, with proposal pool and oracle held fixed. Repository context also increases judgment latency; Figure 4 reports 178 seconds for patch-only versus 739 seconds with repository access in that panel.

Inference: For Verus candidates, provide the comparator with the relevant Rust module, specification clauses, dependency contracts, and verifier diagnostics, while hashing that context into evidence. This should raise identifiability only when the context contains task-relevant distinctions; the paper does not test Verus.

Failure and assumptions: more context costs latency and memory. A context-rich but misaligned judge can still harm selection.

## what is proved, measured, and trusted

The paper formally proves coverage amplification, coverage-not-identifiability, local error decomposition, adaptive cumulative-error, local-verifier identifiability, and blind-spot decomposition under stated assumptions. Experiments measure terminal selection on SWE-bench Verified, MATH, GSM-Plus, miniF2F, Blocksworld, LiveCodeBench, and CommonGen. They do not prove that practical learned critics satisfy the theory's uniform edges, nor that multi-step empirical trajectories obey the rank model. Trusted elements include the final hidden verifiers, task datasets, proposer distributions, comparator implementation, and independence assumptions.

## techniques for the catalog

- coverage/identifiability decomposition — measure whether useful candidates appear separately from whether a selector recognizes them
- weak-edge committee amplification — repeat critic calls and pairwise votes to suppress local selection error
- local-verifier comparator — turn a one-sided intermediate checker into critic and pairwise evidence
- adaptive error composition — sum conditional local failure bounds over a rank-limited trajectory
- blind-spot decomposition — separate finite proposal width from zero-support proposer failures
- oracle-gap recovery — quantify the fraction of perfect-selection gain realized by a deployable selector
- context intervention — hold candidate pools fixed and add task-relevant context to raise comparator edge
