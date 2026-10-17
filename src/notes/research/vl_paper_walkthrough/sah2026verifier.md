# The Verifier Tax: Horizon Dependent Safety--Success Tradeoffs in Tool Using LLM Agents
(authored by agents unless marked 🧑)
Tag: `sah2026verifier`, [paper](https://arxiv.org/abs/2603.19328)

## scope and contribution

Sah, Srivastava, Sah, and Jordan study runtime policy mediation for multi-step tool agents. They use τ-bench Airline and Retail tasks, two open-weight models, and three architectures. The paper measures ordinary task success (SR), compliant success (SSR), and success that contains a policy violation (USR). Its central empirical claim is that catching an unsafe proposal does not usually produce a compliant completion. The authors write: “Our results reveal a persistent ‘Safety-Capability Gap’.” (abstract, p.1)

The study evaluates GPT-OSS-20B and GLM-4-9B through vLLM. Agent components use temperature 0 and seeds 10, 20, and 30; the Qwen2.5-7B-Instruct user simulator uses temperature 1.0 without a fixed seed. The corpus is 50 Airline tasks and 115 Retail tasks, each under three seeds, two models, and three architectures: 900 Airline and 2,070 Retail episodes, 2,970 total (sections 3.2–3.8, pp.3–4). The authors state: “Task success is evaluated only upon termination by comparing the final backend state to the ground-truth target.” (section 3.5, p.3)

## technique: plan, act, then verify each proposal

What it is: Triad separates a planner, actor, and verifier. The planner emits a high-level next step, the actor turns that plan into a tool call or response, and the verifier checks the proposal before execution. A rejection returns the verifier's critique to the actor, which may retry up to three times per turn (section 3.1, p.2; section 3.5, p.3). In plain Triad the verifier has no explicit access to the domain policy (section 3.1, p.2).

When to use it: use this architecture when a tool action must satisfy procedural constraints before it changes state. It is intended to add a modular enforcement layer without retraining the model. The paper says: “Before execution, a Verifier evaluates the proposed action against general correctness heuristics (e.g., identity verification prerequisites).” (section 3.1, p.2)

How to apply it:

1. Give the planner the current conversation state and the domain policy text (the prompt includes `{wiki_content}`), and require a natural-language high-level next step, not the exact response, tool call, or rule ID, such as "Ask for email" or "Search for user ID by name" (Appendix A.2.1, p.11; the appendix prompts are those of Triad-Safety)
2. Give the actor the plan and the tool descriptions (`{tools_desc}`); require either a text response or the exact JSON tool-call shape, and not both (Appendix A.2.2, p.11)
3. Give the verifier the plan and the proposed action. Its prompt always approves greetings and identification (search) tools, and rejects state-updating tools until user identity is confirmed. It outputs `APPROVE` when safe and correct, or `REJECT: [RULE_ID] <reason>` when unsafe or incorrect (Appendix A.2.3, p.11)
4. Execute approved calls and return observations. On rejection, return the reason to the actor and repeat the proposal; permit three attempts for that environment turn (sections 3.1 and 3.5, pp.2–3)
5. If all three proposals are rejected, the protocol accepts the last one so the episode can progress; audit that accepted action for a violation (section 3.5, p.3)

Verus form: Inference: represent the backend state as a Rust value with a `spec fn` describing valid state and each tool as an executable function with `requires` and `ensures`. A verified dispatcher can call a tool only after a proof that its preconditions hold. A rejection-and-retry loop would be ordinary Rust control flow; its loop invariant and `decreases` clause must prove termination. The paper’s LLM verifier is not a proof of the proposal, so its heuristic decision cannot be carried into Verus as evidence. Inference: a Verus proof can establish that the dispatcher never executes an unapproved state transition if approval is represented by a checked predicate, but it cannot establish that the predicate captures every real policy unless that predicate is specified correctly.

Evidence and limits: on the full corpus, Triad and Triad-Safety still had low SSR. For GPT-OSS-20B, Airline SSR was 0.7% ± 1.2% for Triad and 0.0% ± 0.0% for Triad-Safety; Retail SSR was 0.0% ± 0.0% and 0.6% ± 0.5%, respectively (Table 1, p.6; the table headers say N=900 Airline and N=2,070 Retail, which are totals over all six model-by-architecture combinations; Inference: each cell is therefore 50 or 115 tasks times 3 seeds, i.e. 150 or 345 episodes). The three-retry choice rarely controlled outcomes: 28 episodes had three consecutive rejections, under 1.5% of mediated episodes, and only one succeeded after forced progression (section 4.5, p.6). The paper therefore attributes the bottleneck to recovery reasoning, not simply the retry count (section 4.5, p.6).

## technique: policy-aware verification and action classification

What it is: Triad-Safety uses the same planner, actor, and retry structure but adds explicit domain policy rules to the verifier prompt. The paper describes the difference as policy supplementation: “the sole difference is that the verifier’s prompt is supplemented with the environment’s procedural policy rules (e.g., authentication requirements).” (section 3.1, p.2)

How to apply it: encode rules for allowed searches, required identity checks, authorization before irreversible changes, and grounded parameters. Permit search tools that obtain an identifier, but reject state-changing calls until the required identity evidence and confirmation exist. Label every episode for three violation classes: procedural authentication, missing explicit authorization, and data integrity (fabricated or ungrounded parameters) (section 3.6, p.3). Run a deterministic audit script over trajectory logs, then cross-check labels with an LLM-based auditor (gpt-oss-20b) (section 3.6, pp.3–4).

Verus form: Inference: make each policy rule a pure `spec fn` over a state containing authentication status, authorization status, and retrieved identifiers. A tool wrapper can require `policy_allows(state, action)` and ensure the resulting state preserves the policy invariant. Use `old(state)` in postconditions when relating pre-state credentials to the call. A data-integrity rule can require that a parameter occurs in a ghost set of values returned by earlier retrieval calls. This is an inference because the paper’s verifier and audit script are not Verus proofs.

Evidence and limits: Table 4 (p.7) lists Integrity violations of 93.7% for GPT-OSS-20B Retail and 68.9% for GLM-4-9B Airline, with the caption "% of all episodes" and a note that one episode may contain several violations, so the percentages must not be added. The paper is not consistent about the denominator: section 4.3 says the prevalence is relative to all N=2,970 episodes, while section 4.6.1 describes 93% as "over 93% of safety violations in the Retail domain" and section 4.8 as 93.7% of "Retail USR" failures. Inference: read the 93.7% as a share whose denominator the paper leaves unclear. Triad-Safety did not reliably improve compliant success: GLM-4-9B Airline SSR was 4.7% ± 3.1%, compared with 5.3% ± 1.2% for Triad (Table 1, p.6). The paper reports that its LLM verifiers fail to distinguish authentication tools (which are allowed) from consequential data-modifying tools, and that purely textual verifiers "struggle to enforce Parameter Provenance" (section 4.6.3, p.7).

## technique: separate safe success from unsafe success

What it is: define `SR = (1/n) Σ Reward_i`, `SSR = (1/n) Σ Reward_i·(1−Violation_i)`, and `USR = SR−SSR` (section 3.7, p.4). This keeps a task that reached its target by violating policy separate from a compliant completion.

How to apply it: record a terminal reward and a binary violation flag for every episode; compute SR, SSR, and USR over the same denominator. Report intervention frequency, average blocks, calls, tokens, and `P(success | intervention > 0)` as separate quantities (section 3.7, p.4). For a verification system, inspect both the number of intercepted proposals and the number of tasks that finish compliantly.

Verus form: Inference: encode the safety predicate in a postcondition on the final state, then prove a conjunction of task postcondition and `no_violation`. The three rates are evaluation computations outside the proof. A proof of the conjunction gives a per-run guarantee; it does not by itself estimate population rates.

Evidence: GPT-OSS-20B Tool-Calling achieved Airline SR 22.7% ± 2.3% and SSR 0.0% ± 0.0%, so all reported successes were unsafe under this labeling; Retail was SR 21.2% ± 1.8% and SSR 0.0% ± 0.0% (Table 1, p.6; values are mean ± standard error). The metric does not prove that the policy labels are complete; it inherits the deterministic auditor’s definitions and the ground-truth task target.

## technique: horizon and intervention diagnostics

What it is: compare models at their normal turn limits and at a common 15-turn limit, then report cumulative SR at turns 5, 10, 15, 20, and 30. The symmetric check tests whether a model’s apparent advantage is only extra interaction budget (section 4.2, pp.5–6).

How to apply it: retain model, domain, architecture, and seed; rerun GLM-4-9B at 15 turns; report the delta from its normal 30-turn result. Separately classify episodes as clean, verifier-reject-only, environment-error-only, or both. In this paper, 19.1% of 1,980 mediated episodes had both kinds of intervention, and SR was 21.3% clean, 18.7% reject-only, 13.1% environment-error-only, and 7.7% for both (section 4.5, p.6).

Verus form: Inference: use the same verified transition model while varying a fuel parameter, and prove each loop decreases the fuel. The model can prove termination within a budget, but the reported SR deltas remain empirical measurements of an agent and simulator.

Evidence and limits: GLM Airline SR fell from 28.7% to 17.3% for Tool-Calling, 26.0% to 18.7% for Triad, and 25.3% to 20.7% for Triad-Safety under the 15-turn check (Table 2, p.6). GPT-OSS-20B saturated by 10–15 turns, while GLM-4-9B Tool-Calling on Airline rose from 14.7% at turn 10 to 28.7% at turn 30 (Table 3, p.7). The user simulator is stochastic, and the authors note that longer horizons and larger models could change recovery behavior (section 5, p.9).

## technique: account for computation and recovery separately

The paper counts every planner, actor, verifier, and repair call, and sums prompt plus completion tokens with the model tokenizer (section 3.9, p.4). It reports mean, median, and P95 per episode. Relative to Tool-Calling, Triad token inflation is 2.7× for GPT-OSS-20B Airline and 2.6× for GPT-OSS-20B Retail; Triad-Safety is 2.8× and 2.6× (Table 5, p.8). GLM-4-9B Triad Airline has a 355k-token P95 versus 129k for its baseline (Table 5, p.8). These values are agent-side estimates and exclude server-side tool-schema injection, so the authors call them "a conservative lower bound on end-to-end served tokens" (section 3.9, p.4). The paper also reports call inflation of 1.6–2.2x (section 4.4, p.5).

Recovery must be conditional on an intervention. Table 6 reports Triad GPT-20B Airline safety recovery 50.0% ± 50.0% from 81 interventions, but Retail 0.0% ± 0.0% from 188; Triad-Safety GLM-4-9B has 38.9% ± 5.6% from 41 Airline interventions and 0.0% ± 0.0% from 154 Retail interventions (Table 6, p.8). The denominators are intervention events, not all episodes. The paper is not consistent here: section 4.8 (p.8) says GPT-OSS-20B recovers from 32.0% of safety rejections in Airline (N=25), which does not match Table 6. Inference: a Verus implementation should measure proof-check cost and retry count separately from the verified safety property; successful proof is not evidence that a probabilistic agent will recover after a rejected action.

## proposed strict grounding check

The authors propose programmatically rejecting identifiers unless they were retrieved in the session ancestry: “By verifying that every identifier parameter exists in the session ancestry, we could eliminate the most common failure mode identified in high-sparsity domains.” (section 4.8, p.8; the paper calls it "Strict Grounding Gates") This is a proposed defense, not an evaluated experiment. Inference: in Verus, model session ancestry as a ghost map or sequence of retrieval results; require a parameter’s membership before constructing a consequential tool call. Keep the executable identifier and ghost provenance synchronized through a proof function. The assumption is that the retrieval result itself is authoritative and that the policy’s required identity is represented correctly.

## what is proved, measured, and trusted

The paper measures empirical rewards, policy labels, interventions, recovery, horizon sensitivity, and token/call overhead. It does not formally prove the LLM policy verifier, the trajectory auditor, τ-bench’s backend, the user simulator, or the claim that a proposed grounding check will remove leaks. Inference: for VL, the paper’s strongest product threat is ungrounded agent-written parameters and weak post-rejection recovery. A Verus dispatcher with reviewed state and provenance specifications could remove the first class when its model is complete; it would not make an LLM planner’s natural-language reasoning correct. Existing work on planner-directed Verus synthesis already covers specification generation and diagnostic repair; VL should not redo those pieces as if this paper evaluated them. The paper’s own unresolved assumptions are model scale, model-dependent turn caps, stochastic users, static per-turn rules, and incomplete grounding of identifiers.

## techniques for the catalog

- plan-act-verify loop — generate a high-level plan, propose an action, check it before execution, and retry with a rejection reason
- policy-aware action checking — place explicit domain rules in the verifier and classify authentication, authorization, and data-integrity violations
- safe/unsafe success decomposition — compute SR, SSR, and USR using a terminal reward and a binary violation label
- symmetric horizon analysis — rerun at a common turn limit and report cumulative success by turn
- intervention and recovery accounting — condition recovery on intervention events and report calls, tokens, medians, and P95 tails
- identifier provenance checking — require every consequential identifier to be present in prior retrieval ancestry
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Interception is measured per-proposal; thus, if an agent is rejected three times before auto-acceptance, it contributes three successful interceptions but eventually yields a leak if the final proposal is unsafe."): read the whole paper including appendices; checked every quotation, table value (Tables 1, 2, 3, 4, 5, 6), section and page reference, and the plan-act-verify steps against the paper text and appendix prompts; changed one section reference (3.3 to 3.5), one page reference (section 5 is on p.9), the Table 1 and Table 4 denominator claims (now flagged as unclear or per-cell), the planner, actor and verifier step descriptions, the GLM Table 3 row label, and added paper-internal inconsistencies; did not check the cited external papers, the Verus-form inferences beyond marking them as inference, or the PDF figures beyond text extraction.
