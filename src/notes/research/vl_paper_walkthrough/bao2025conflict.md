# Conflict-Aware Fusion: Mitigating Logic Inertia in Large Language Models via Structured Cognitive Priors
(authored by agents unless marked 🧑)
Tag: `bao2025conflict`, [paper](https://arxiv.org/abs/2512.06393)

## what the paper proves or measures

The paper measures whether language models remain logically reliable when a rule system is structurally changed. Its benchmark starts from one canonical rule system and applies four perturbations: redundant or essential rule deletion, contradictory-fact injection, logic-preserving rewrites, and stacked rewrites. The authors define a conservative semantics: when premises contradict, every query is False and deduction must stop. They report instance exact match, where every query in an instance must be correct.

The central measured failure is that BERT, Qwen2, and TinyLlama score 1.0000 on the base split but 0.250–0.295 on essential-rule deletion and 0.0000 on contradiction. GPT-4o obtains 56.0% on 800 contradiction questions; Gemma-3-4B-IT obtains 43.9% on the same type of test. These denominators and settings matter: the first numbers are instance-level results in Table 1, while the frontier-model percentages are per-question results from a stratified 200-row sample per split (800 questions on the contradiction split). Section 4.1 reports three-seed means; Table 2 specifies 95% bootstrap confidence intervals within ±0.02 (1,000 resamples). The full four-stage system reaches 1.000 on base, Variant 2, and Variant 3 for both Qwen2-1.5B and Qwen3-8B; its Qwen2-1.5B Variant 4-multi score is 0.773, whereas Qwen3-8B is 1.000.

A key measured trade-off is that LIRE alone raises Variant 4-multi from 0.635 to 0.993 for Qwen2, but lowers Variant 2 to 0.590 and Variant 3 to 0.344. RLVF restores both to 1.000, while retaining 0.773 on Qwen2 Variant 4-multi. The paper reports Lean acceptance of 104/105 classically derivable T questions (99.0%) and 30/82 F questions (36.6%) in an 80-row, 187-question translated sample (Table 5, PDF p. 9). The abstract reports 71.7% overall, corresponding to 134/187. The T denominator is therefore 105; the overall denominator is 187. The paper explicitly analyses the T/F asymmetry rather than presenting 99.0% as overall accuracy.

## technique 1: generate controlled structural variants

What it is and when to use it: derive diagnostic or training examples from one rule template while changing only structural properties. This isolates logical robustness from vocabulary or domain shift.

How to do it (paper, §3.1 and Appendix A.2): represent an instance as `(F, R, Q)`, where F is facts, R rules, and Q fixed yes/no queries. Keep surface vocabulary and domain semantics. Variant 2 removes a key rule on the main deduction chain, breaking downstream entailments. Variant 3 injects an explicit contradictory fact. Serialize facts, rules, questions, and answers in one CSV schema. Label contradictory instances False under the stated conservative semantics. The paper says: “Given a base instance (F, R, Q) (facts, rules, and a fixed set of yes/no queries), we construct: Variant 2 by removing a key rule on the main deduction chain, which breaks downstream entailments; and Variant 3 by injecting an explicit contradictory fact, which forces the model to detect inconsistency and halt/reject deduction.” (section 3.1, PDF p. 3)

Verus form (Inference): encode facts and rules as ghost/spec data, define a pure `spec fn` forward-chain result, and prove a Rust implementation’s returned Boolean equals that result with `ensures`. A contradiction check can be a separately specified predicate. Verus can prove the algorithm against this explicit model; it cannot establish that the chosen conservative False-on-contradiction policy is the desired product policy.

Evidence and limits: the benchmark uses 100 base groups (80 train, 20 test), randomized entity mappings, and about 11,200 Stage-2 preference pairs. Section 3.1 claims that compositional variation is “preventing trivial memorisation.” Inference: sharing a canonical template leaves a possible memorization risk; this sentence does not establish its absence for every model.

## technique 2: enforce verification before deduction with four-stage training

What it is and when to use it: make premise checking a mandatory procedural phase before any rule application. Use it when a model can notice a contradiction yet continue reasoning from the inconsistent premises.

Step 1, structural SFT (§3.3): fine-tune on 11,200 canonical, perturbed, and contradictory instances. Every target begins with “Step 1: Verify facts”. The running example is Socrates: facts say Socrates is a man, a rule says all men are mortal, and a new fact says Socrates is NOT mortal. The target checks consistency and halts. Step 2, DPO (§3.3): automatically create preference pairs. The preferred trace detects contradiction and halts; the rejected trace continues deductively. Optimize the stated DPO objective with policy πθ, frozen reference πref, and β=0.1. The paper states: “The four stages progressively address distinct failure modes: (1) SFT establishes the verification-before-deduction structure; (2) DPO sharpens the halt-on-contradiction boundary; (3) LIRE enforces consistency across logically equivalent formulations; (4) RLVF reconciles the invariance–sensitivity trade-off via oracle-grounded reward.” (section 3.3, PDF p. 4)

Verus form (Inference): represent the two phases as functions whose contracts require a successful consistency predicate before the deduction function may return a proof result. A Rust API can return an enum such as `Halted` or `Derived`; a proof can show `Derived` implies consistency. The model-training steps themselves are outside Verus.

Evidence: SFT alone (Fusion-LRA) reaches 0.705 on Variant 3 in Table 2; DPO and later stages are evaluated on the same benchmark. The authors’ GPT-4o error analysis (§4.2, PDF p. 6) reports that GPT-4o sometimes states the contradiction and then concludes “Since A is true and A implies B, then B must be true,” despite the contradiction. Inference: this motivates enforcing a halt after failed verification; the observations do not prove that training prevents every such trace.

## technique 3: LIRE for rewrite invariance

What it is and when to use it: regularize next-token distributions for logically equivalent inputs. Use it for De Morgan, double-negation, and contrapositive rewrites where the answer should remain unchanged.

How to do it (§3.3): let x be the base input, x̃ an equivalent rewrite, and y the same gold trace. Teacher-force y on both branches, then add symmetric KL at every token to cross-entropy: `L_LIRE = L_CE + λ L_inv`, with `L_inv` the average of `KL_t(x||x̃)` and `KL_t(x̃||x)` over T positions. Shared teacher-forced y avoids variable-length rollout mismatch. The paper says: “LIRE penalises divergence between the next-token distributions under the two inputs, evaluated by teacher-forcing the same gold y on both branches (which aligns the distributions token-wise and avoids variable-length rollout mismatch):” (section 3.3, PDF p. 5)

Verus form (Inference): for a deterministic verifier, prove that two syntactic representations normalize to the same semantic rule and therefore produce equal results. Verus does not express neural KL optimization; the reusable part is a normalization function and an equality lemma.

Evidence and limit: Table 3 (§4.4, PDF p. 7) reports Qwen2 Variant 4-multi improving 0.635→0.993 after LIRE, while Variant 2 falls 1.000→0.590 and Variant 3 falls 1.000→0.344. The caption states: “Adding LIRE on top of SFT improves compositional invariance (V4-multi: 0.635→0.993 on Qwen2; 0.006→1.000 on Qwen3) but collapses structural sensitivity on V2/V3, exactly the trade-off motivated in Section 3.3.” Inference: these results argue against using LIRE alone when sensitivity to changed premises matters. Table 3 labels its first row SFT+DPO, but its caption identifies the Qwen3 first row as SFT-only; that stage-label inconsistency remains unresolved in the paper.

## technique 4: RLVF with a deterministic oracle

What it is and when to use it: replace a learned reward model by a symbolic oracle when each training instance has an executable ground-truth checker.

How to do it (§3.3): sample a full trace τ; parse the final `Step N: Answer = ...` with Π(τ), assigning −1 to unparseable traces. Compute `a*` with the forward-chaining oracle and give +1 or −1 according to equality. Train with plain REINFORCE and an exponential moving-average baseline μ=0.99. Use half base samples and half perturbation samples, drawing uniformly from V2∪V3∪V4. The paper states: “RLVF is a verifier-grounded RL reward formulation (not a new optimiser): plain REINFORCE [Williams, 1992] drives the gradient, but the reward is a deterministic symbolic oracle replacing RLHF’s learned reward model, eliminating reward-model bias on the rule-based regime.” (section 3.3, PDF p. 5)

Verus form (Inference): implement the oracle as executable Rust plus a `spec fn` model and prove `oracle(input) == model(input)`. A proof can establish reward correctness for parsed Boolean outputs, but not the stochastic policy-gradient update.

Evidence and deployment limit: RLVF restores Variant 2 and Variant 3 to 1.000 on both backbones (Table 3). The eight-trace Lean pilot reports 8/8 reward agreement and mean CPU latency 0.36 seconds per trace (Appendix A.6, Table 8, PDF p. 14). Section 5.2 proposes per-tactic rewards of +1 for success, −1 for failure or inconsistency, and 0 for incomplete traces; the bridge rejects `sorry`/`admit` despite Lean exiting successfully. It also states: “Our current pipeline implements option (ii), retaining the best of both verifiers.” That option uses the symbolic oracle for F verdicts and Lean for T verdicts. However, Appendix A.1 lists “end-to-end RLVF-Lean training amortised through a persistent LeanDojo server, replacing the current verification-only deployment” as future work. Inference: the reported Lean results establish verification feasibility, not completed end-to-end Lean-reward training. The intended training-time verifier requires no inference-time kernel call (§5). Inference: oracle, parser, translation, training implementation, kernel, and the selected semantics define separate correctness assumptions.

## relevance to VeruLaw

Inference: the paper’s strongest transferable idea is a circuit-breaker contract: no downstream deduction API should execute after a failed premise-consistency proof. RLVF’s deterministic-oracle pattern suggests generating training feedback from executable Verus specifications, while LIRE suggests canonicalizing equivalent rule text before proof search. The product threat is substantial for agent-written verified Rust if an agent can produce a locally valid proof after silently choosing the wrong contradiction policy or omitting a dependency. Verus proves the stated contract, so policy adequacy and external-model fidelity must remain explicit review targets. The paper supplies model-training and benchmark-design techniques; adapting them to Verus would require a separate implementation and evaluation.

## techniques for the catalog

- controlled structural variants — derive deletion, contradiction, rewrite, and stacking cases from one canonical rule system
- verification-before-deduction training — use SFT and DPO traces that require checking premises and halting before rule application
- LIRE — apply symmetric token-level KL to teacher-forced traces for logically equivalent inputs
- RLVF — train with deterministic symbolic rewards on parsed answers; explore per-tactic Lean rewards through the demonstrated verification bridge
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "A hand-crafted pilot on the Socrates example (8 traces; Appendix A.6/A.7) achieves 8/8 kernel agreement at 0.36 s/trace on CPU."): checked all paper text, study claims, quotations, numbers, section/page references, technique steps, and the arXiv link; corrected quotation wording and the LIRE page, clarified statistical and Lean denominators, recorded the conflicting Qwen3 stage labels and verification-only Lean deployment, and removed an unsupported claim about existing VL work; did not inspect released code/data, reproduce experiments, or validate the proposed Verus adaptations.
