# Teaching LLMs to Plan: Logical Chain-of-Thought Instruction Tuning for Symbolic Planning
(authored by agents unless marked 🧑)
Tag: `verma2025plan`, [paper](https://arxiv.org/abs/2509.13351)

## scope and contribution
PDDL-INSTRUCT trains language models to generate symbolic plans while exposing each state transition and checking it with the VAL planner validator. The paper’s central claim is: “The framework systematically builds verification skills by decomposing the planning process into explicit reasoning chains about precondition satisfaction, effect application, and invariant preservation.” (abstract, p. 1) It evaluates Llama-3-8B and GPT-4 on Blocksworld, Mystery Blocksworld, and Logistics.

Inference: The transferable VL idea is verifier-guided decomposition: have a model propose small state transitions, use an external checker to identify exact failed obligations, and train or prompt on those obligations. The model’s chain is evidence of a proposed proof, not a proof itself.

## technique 1: represent planning as explicit state-action-state triples

What it is. A planning instance is a PDDL domain, problem, initial state, goals, and action sequence. Each action has preconditions, additions, and deletions. A valid plan has transitions `s(i+1) = (s(i) \ del(a(i))) ∪ add(a(i))` and ends in a goal state (Section 3, pp. 3–4).

When to use it. Inference: use explicit triples whenever an agent must reason about a sequence whose global validity depends on local preconditions and effects. The representation makes each error local and checkable.

How it is done. Encode domains and problems in PDDL; provide valid and invalid grounded plans with explanations; make the model emit `⟨s0,a1,s1⟩, …, ⟨sn−1,an,sn⟩`; validate every action against the current state; verify the final state against the goal (Sections 4, 5.1 and 5.3, pp. 4–7).

Verus form. Inference: Represent state as a verified map or set, actions as Rust data with precondition and effect specifications, and transitions as a pure `spec fn`. Use `requires` to state precondition satisfaction and `ensures` to state that the resulting state removes deleted facts and adds new facts. Prove an invariant across a loop or recursive plan fold. This is a translation of the paper’s state semantics, not a claim that PDDL syntax itself is supported by Verus.

Evidence and limits. The paper assumes domains without conditional effects or durative actions (Section 4, p. 5). That restriction simplifies the reasoning chain. Inference: VL should begin with a similarly explicit transition model and add richer effects only after the corresponding specifications and proofs exist.

## technique 2: initial instruction tuning with valid and invalid plans

What it is. Phase 1 teaches the model planning syntax and explanations using both successful and deliberately faulty plans. The faults include unsatisfied preconditions, incorrect effects, frame-axiom violations, and failure to reach the goal (Section 5.1, p. 5).

When to use it. Inference: use contrastive valid/invalid examples when a model must learn what constitutes a proof obligation and how failures differ.

How it is done. Partition data into D1, D2, and Dtest. For D1, pair domain/problem inputs with plans and explanations; add incorrect plans; train the model by minimizing the negative log-likelihood of the plan and its explanation given the domain and problem, with learning rate 2e-5 for 5 epochs (Sections 4 and 5.1, Algorithm 1 and Table 2, pp. 5, 15, 19). Save the Phase 1 model for Phase 2.

Verus form. Inference: Build training examples from verified Rust functions and mutated implementations. Label each mutation with the failed precondition, postcondition, invariant, or frame condition. Keep the verifier’s diagnostic as the ground-truth label, while treating model-generated explanations as untrusted text. This can teach proof repair patterns without weakening the acceptance criterion.

Evidence and limits. Phase 1 alone raises Llama-3 Blocksworld accuracy from 28% baseline to 78%, but Mystery Blocksworld only reaches 32% (Table 1, 100 test tasks per domain, p. 8). Inference: Basic examples help syntax and common patterns but do not ensure transfer to obfuscated or unfamiliar predicates.

## technique 3: external verifier feedback in CoT tuning

What it is. In Phase 2 the model emits a chain of state-action-state triples, and VAL checks each transition. The paper emphasizes: “These reasoning chains are then passed through a verification module implemented using VAL.” (Section 5.1, p. 5)

When to use it. Inference: use external feedback when self-critique is unreliable and the domain has an executable validator.

How it is done. Generate a candidate chain; run VAL on the complete plan; collect either binary valid/invalid feedback or detailed failed-precondition/effect feedback; also run VAL step-by-step; place the resulting records in reasoning and final datasets; repeat for η iterations (Section 5.1 and Algorithm 1, pp. 5–6, 19).

Verus form. Inference: Replace VAL with Verus compilation and verification. Capture diagnostics for each failed obligation, but accept only code whose Verus verification succeeds. A model may suggest a patch or lemma; the verifier independently checks it. Do not treat an LLM’s stated invariant as established until Verus proves it.

Evidence and limits. The authors contrast their method with self-reflection, citing prior work that “LLMs do not possess sufficient self-correction capabilities in terms of reasoning” (Section 5.1, p. 5, citing Huang et al. 2024 and Stechly et al. 2025). Detailed feedback consistently beats binary feedback: with Llama-3 and η=15, gains over binary are 5 points in Blocksworld, 15 in Mystery Blocksworld, and 7 in Logistics (Section 7, p. 8). Inference: Diagnostics should name the failed predicate or source location, not merely say “verification failed.”

## technique 4: two-stage optimization of reasoning and final plans

What it is. Stage 1 optimizes individual reasoning triples and their feedback. Stage 2 optimizes complete plans and validity labels. The paper says the Stage 1 objective encourages reasoning that “checks all necessary preconditions” before applying actions, tracks state changes, verifies that invariants are maintained, and detects logical inconsistencies (Section 5.2, p. 6).

When to use it. Inference: use separate objectives when local reasoning quality and end-task success can diverge.

How it is done. For each iteration, construct `Dreasoning` from state-action-state steps and `Dfinal` from complete plans with validity labels. Minimize `Lreasoning` over triples and update θ to θr. Then minimize `Lfinal` over complete plans and update θr to θ(t+1) (Section 5.2, p. 6; Algorithm 1, p. 19). Repeat η times. The appendix gives the losses: Lreasoning is the symmetric-difference distance between the predicted and deterministically computed next state plus 0.1 times a VAL-error penalty; Lfinal is a fixed penalty of 2.0 for an invalid plan plus 0.5 times a binary cross-entropy between the VAL label and the model’s predicted validity; the learning rates are δ1 = 1e-5 and δ2 = 5e-6 (Appendix A.1–A.2, pp. 15, 17–18).

Verus form. Inference: Separate VL training or prompting into lemma-level repairs and function-level verification. First teach or retrieve local proof patterns for one obligation; then evaluate the complete function and module. Keep a proof dependency graph so local success cannot hide a failed global invariant.

Evidence and limits. For Llama-3 with detailed feedback and η=15, plan validity is 94% Blocksworld, 64% Mystery Blocksworld, and 79% Logistics; each denominator is 100 test tasks per domain (Table 1, p. 8). GPT-4 reaches 91%, 59%, and 78% under the same settings. The paper states the method does not ensure “progressive refinement” because it targets satisficing, not shortest plans (Section 5.1, p. 6). Inference: A verified Rust function may satisfy safety while remaining inefficient; performance properties require separate specifications.

## technique 5: use detailed feedback and iteration as hyperparameters

What it is. The framework varies feedback granularity (binary or detailed) and the number of feedback iterations η∈{10,15}. Detailed feedback identifies failed preconditions or effects instead of only returning validity.

When to use it. Inference: tune these parameters when verifier calls are expensive and the system must balance correction quality against compute cost.

How it is done. Run both feedback modes with the same domains and models; compare η=10 and η=15; report per-domain accuracy and absolute differences (Section 7, p. 8). The paper reports that increasing η from 10 to 15 improves all configurations, and states that the gain is larger for detailed feedback (averaging 4.3 percentage points) than for binary feedback (averaging 3.3). Inference: Table 1 does not support that ordering. Recomputing from its six model-domain pairs gives a mean gain of 4.5 points for detailed feedback (3, 5, 4 for Llama-3; 4, 5, 6 for GPT-4) and 5.5 points for binary feedback (5, 2, 11 for Llama-3; 5, 5, 5 for GPT-4). Do not rely on the claim that detailed feedback uses extra iterations better.

Verus form. Inference: Define a bounded proof-repair loop; each iteration runs Verus and records diagnostics. Stop when all obligations pass or the budget is exhausted. Keep the final acceptance independent of the iteration count.

Evidence and limits. The authors caution that “future experiments with varying η are needed to confirm” that the model may converge on valid plans with more iterations (Section 7, p. 8). Inference: More repair attempts can overfit to diagnostics or consume unbounded resources; report timeout and failure rates.

## what is proved, trusted, and product threat

The paper measures plan validity using VAL; it does not prove LLM internal reasoning or Rust correctness. Inference: trusted components include PDDL parsers, VAL, generated training labels, model weights, and the assumption that the three domains represent planning generally. The evaluation uses 100 test tasks per domain, two models, and two GPUs (Section 6, p. 7; Table 3, p. 20). The paper reports a 66% absolute improvement over Llama-3 baseline averaged across domains (SD=3%), but this is an average over three 100-task domain results, not a proof of generalization. Inference: the paper describes Dtest as “new, unseen planning domains and problems” (Section 5.3, p. 7), but I found no description of which domains go into D1, D2 and Dtest, and Table 1 reports only per-domain accuracy on the same three PlanBench domains, so the “cross-domain generalization” result (RQ3) is a comparison of per-domain accuracy, not evidence of transfer to a held-out domain. I also found no description of how GPT-4 was tuned, although the paper says all experiments used 2 RTX 3080 GPUs (Section 6, p. 7) while Table 3 lists 24 GB per GPU.

Inference: Threat to VL is moderate: verifier-guided decomposition is useful, but allowing an agent to self-report invariants without an independent Verus check would recreate the failure the paper avoids. The paper’s limited PDDL subset and three domains mean VL should test cross-module state, resource invariants, and adversarial specifications before claiming broad reliability.

## techniques for the catalog

- explicit transition triples: represent each step as state, action, next state, then check preconditions, effects, and goals
- contrastive instruction tuning: train on valid and invalid plans with explanations of each failure type
- external verifier feedback: use a sound checker to produce binary or detailed diagnostics instead of trusting self-critique
- two-stage optimization: improve local reasoning chains, then optimize complete task outcomes
- feedback iteration tuning: compare diagnostic granularity and bounded correction iterations with per-domain denominators
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Phase 2 reduces the batch size to 8 to accommodate the significantly longer chain-of-thought sequences and the additional memory overhead introduced by VAL feedback processing."): read the whole paper text including the appendix; checked every quotation, the Table 1 numbers and the Llama-3 and GPT-4 averages (they match), section and page references, and the technique steps against Sections 3–7, Algorithm 1 and Appendix A; changed the tag link (the DOI was cut off; now the arXiv page 2509.13351 taken from the paper text), several page references, the Phase 1 loss description, the self-correction quotation context, and the Stage 1 wording; added the appendix losses and learning rates; replaced the paper’s 4.3 versus 3.3 iteration-gain claim with a flagged recomputation from Table 1 (4.5 versus 5.5); marked the “When to use it” lines as inference; added caveats on the unseen-domain and GPT-4 tuning descriptions. I did not check the cited related work, the PDF figure layout, or the prompt appendix beyond reading it.
