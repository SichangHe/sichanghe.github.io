# Proof-Carrying Cognition: Closing the Verification Gap with Reality-Settled Reward
(authored by agents unless marked 🧑)
Tag: `reddy2026proofcarrying`, [paper](http://arxiv.org/abs/2609.09776v1)

## verifier model and claim ledger
The paper defines a verifier as sound, cheap, and robust under optimization pressure. It reports: “The verification gap is the observation that such oracles exist today only for formally grounded domains (proof kernels, program execution, game rules).” (§2.1, p.2). Its proposed Proof-Carrying Cognition (PCC) emits typed claims with predictions, gives dense near-term proper-scoring reward, and settles claims later against execution or reality. The ledger is versioned and stores claims, outcomes, and settlement handles.

Algorithm 1 steps are: for each task batch, have the reasoner emit traces with typed claims; score predictions against the world model for near-term reward; update the reasoner by reinforcement learning; enqueue claims; when a claim settles, train the world model only on the settled outcome, pay or charge the stake under the scoring rule, compute mean absolute drift, and raise the settlement rate while downweighting proxy reward if drift exceeds a threshold (§5, Algorithm 1). The paper states: “Reward for reasoning is expected score under proper scoring rules, not judge approval.” (§5, p.5).

Inference: Verus can represent typed claims as Rust data plus `spec fn` predicates, and executable tests can settle claims. `ensures` should connect a function to a measured postcondition; `proof fn` lemmas can establish local consequences. This is an inference because PCC is not a Verus implementation. The settlement executor, scheduler, scoring rule, and world model remain trusted.

## technique: pressure-aware soundness measurement
For a formal or executable verifier V and gold G, sample N candidates, select by V, and measure whether the selected candidate is actually correct under G. The paper calls this Soundness-under-Pressure and studies best-of-N. It proves a Gaussian exchange-rate proposition linking verifier–gold correlation ρ to compute scaling (§3, Proposition 1). The real-model result says the weak judge loses soundness under best-of-N on MBPP and HumanEval with p < 10−3, while the stronger judge is more robust (§8, abstract and Table 3).

Apply it step by step: (1) freeze candidate generator and verifier; (2) draw repeated candidate sets at N=2…256; (3) select the verifier winner; (4) execute the gold unit test or kernel; (5) report soundness with the task and model denominator. Inference: for agent-written Rust, run Verus or compiled tests as G and compare any LLM review score V under increasing candidate pools. A high single-sample score is insufficient evidence.

## evidence, trust, and limits
The scaled replication measured a weak-judge MBPP copula error of 0.041 within the registered ±0.10 band, but falsified the closed-form Gaussian penalty outside its model class; realized value was about 0.32 at measured ρ≈0.50 (§10). The drift alarm failed in the registered seed-0 test (ρs=0.06), so the paper explicitly rejects universality of that signal (§10). Experiments use synthetic six- and ten-token DSLs, small verifiers, and a single CPU; the authors say these are proxies, “not instances of” frontier systems (§11).

The paper cautions: “Settlement does not eliminate trust; it relocates it.” (§11, p.16). PCC's trusted computing base is the executor/measurement apparatus, settlement scheduler, staking rules, sandbox, compiler, and any formal kernel. Inference: VL should adopt pressure testing and gold execution before using an LLM judge, and should report denominator, model, and setting for every soundness number. The paper's settlement pattern is new guidance; generic unit-test execution and proof kernels already exist and should not be rediscovered.

## techniques for the catalog
- soundness-under-pressure — evaluate verifier-selected candidates against an independent gold executor as best-of-N grows
- claim ledger — emit typed, versioned claims and settle them later against immutable outcomes
- drift-controlled reward — reduce proxy reward and increase settlement when prediction error exceeds a threshold
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
