# When Helping Hurts and How to Fix It: Multi-Agent Debate for Data Cleaning
(authored by agents unless marked 🧑)
Tag: `parmar2026helping`, [paper](https://arxiv.org/abs/2606.02866)

## what the paper establishes

This paper tests a two-agent Generator–Critic debate on data-cleaning workflows, table understanding, and error detection. The conclusion states: "Multi-agent debate is not a universal improvement for LLM-based data cleaning" (Section 8.5, PDF p. 15). Its central empirical claim is conditional: debate helps when a Critic can verify each proposed item and the Generator can repair it, but harms open-ended generation when Critic objections are hallucinated. The abstract reports over 6,000 task-condition pairs across four model families: generation changes −1.6 to −15.5 percentage points, while detection improves +27.4 points F1. The strongest grounded configuration, a separate code-executing Critic plus evidence-gated Generator, improves workflow factual consistency by +5.3 points (p<0.05) (Abstract, PDF p. 1).

The main AutoDCWorkflow experiment uses 50 tasks for Claude, Qwen3, and DeepSeek and 20 exploratory Gemini tasks; MaTElDa uses 100 tables per model; MMTU uses 200 questions for three models (Section 3, PDF pp. 3–4). On Claude's MaTElDa n=100, F1 rises from 0.191 to 0.465 (+0.273, p<0.001, d=1.00), with debate winning 80/100 tables (Table 2, PDF p. 5). On AutoDCWorkflow, Qwen3 factual consistency falls 0.912 to 0.785 (−12.7 points), and DeepSeek falls 0.800 to 0.645 (−15.5 points); these are fractions over the stated 50-task sets (Table 1 and Section 4.1, PDF pp. 4–5).

The authors' formal decision rule is: debate helps when `(pc/(1−pc)) × pr > pg/(1−pg)`, where pg is Generator baseline accuracy, pc Critic verification accuracy, and pr probability of a correct repair after a caught error (Section 5, PDF p. 8). Inference: for VeruLaw, use debate only around independently checkable proof obligations; a Critic that cannot run Verus or inspect concrete counterexamples can damage correct proof code.

## technique 1: Generator–Critic debate with structured outputs

The Generator emits a JSON workflow; the Critic checks each operation against the source table and returns accept/reject/revise with evidence, for up to three rounds (Section 3, PDF p. 4). Apply it by serializing the full table, requiring a structured operation list, asking a separate Critic to challenge each operation, and letting the Generator revise only after feedback. The paper anonymizes roles as Agent A and Agent B to reduce identity bias and tests task isolation separately.

In Verus form, inference: the Generator proposes Rust code or proof annotations; the Critic receives the candidate, verifier diagnostics, and a bounded source slice; the revised candidate must still pass `cargo verus`. A Critic's textual approval is not a proof. Keep proof checking external and reject any candidate that has not been re-verified.

Evidence and failure. On AutoDCWorkflow Claude, single-agent FC is 0.871 and debate 0.855; cell accuracy is 0.894 versus 0.899, but execution rate drops 0.716 to 0.628 and complete failures rise from 0/50 to 2/50 (Table 1, PDF p. 4). Qwen3 and DeepSeek suffer larger FC drops. The paper names this “critique-induced confusion (CIC)” (Section 4.1, PDF p. 5): a Critic's hallucinated objection causes the Generator to retract a correct operation.

## technique 2: per-item evidence gating

Evidence gating makes the Generator accept Critic feedback only when it cites specific data evidence. In transcript analysis, default C1×G1 compliance is 95.3% (95% CI 93.0–97.5, n=50 tasks); 51.9% of added operations are hallucinated. G2 reduces compliance to 60.3% and operations from 13.3 to 9.4 (Section 6.3, PDF p. 10).

How to apply it:
1. Require the Critic to name the exact row, column, value, or executable observation supporting each objection.
2. Reject feedback lacking such evidence.
3. Revise only the cited operation; preserve uncited operations.
4. Re-run deterministic execution and score the revised result.

Verus form. Inference: require a Critic repair to include a concrete Verus diagnostic, counterexample state, or a proof obligation that can be replayed. A proof function can establish a lemma, but it cannot be called at runtime; runtime checks and specifications must remain distinct. Use `requires`, `ensures`, loop invariants, and executable tests in their valid roles.

## technique 3: code-execution grounding and factorial isolation

Text-only debate remains harmful across six Critic prompts. The paper therefore gives the Critic a Python/pandas sandbox with AST safety checks, a 30-second timeout, and 2 GB memory limit. It compares four factorial conditions: single agent (SA), SA plus the same sandbox (SA+Code), text-only debate (D-Text), and code-grounded debate with G2 evidence gating (D-Code+G2) (Sections 6.2 and 7.1, PDF pp. 9–11).

Results for Claude on common AutoDCWorkflow tasks (n=84): SA FC 0.814; D-Text 0.743 (−7.0, significant); D-Code 0.817 (+0.3); D-Code+G2 0.867 (+5.3, p<0.05). Qwen3's D-Code is 0.930 versus SA 0.907 (n=47) (Table 9, PDF p. 11). Self-verification with the same sandbox is not enough: SA+Code FC=0.801, −1.3 points and not significant (n=78), because pc≈pg (Section 7.2, PDF p. 11). The paper reports: "Tools alone do not help" (Section 7.2, PDF p. 11). The interaction, not either component alone, produces the gain.

Verus form. Inference: let the Critic run Verus and test commands in an isolated workspace, return exact diagnostics and failing states, and require the Generator to cite those artifacts. Compare with a single agent running the same tools to measure whether adversarial separation adds value. Keep the verifier executable and independent; an LLM judge alone cannot establish `ensures`.

## technique 4: formal rescue–damage condition and routing

Estimate pg from single-agent correctness, pc from independently checked Critic decisions, and pr from the fraction of repairs that become correct. Use debate only when rescue exceeds damage. The paper gives approximate pr values: ≈1.0 for binary detection, ≈0.5 for repair, and ≈0.2 for open-ended generation (Section 5, PDF p. 8). For dependent workflows, the task-level model adds output dependence ρ and cascade severity β; the authors measure β≈1.3 for AutoDCWorkflow and β≈0 for MaTElDa (Section 5, PDF p. 8).

The condition predicts all nine task types in Table 7. MaTElDa detection (pg=0.19, high pc, pr≈1) helps with d=1.00; AutoDCWorkflow generation (pg=0.87, low pc, pr≈0.2) harms; Rep multi-output repair benefits because each output is independently verifiable (d=0.93). The paper's 2×2 cardinality ablation shows Rep F1 0.206→0.467 (+0.261, 76/100 wins), while single-output profiling drops 0.920→0.770 (Table 6, PDF p. 7).

Inference: route Verus tasks by per-obligation verifiability, not by broad labels such as “generation.” Independent postconditions with concrete counterexamples may benefit from debate; a proof requiring an unformalized design judgment has low pc and should use a single verifier or human review.

## technique 5: controls, scale, and audit boundaries

Self-consistency is a control for extra sampling. On MaTElDa Claude n=100, SC-5 F1=0.176 versus SA=0.191, while debate reaches 0.465 (Table 8, PDF p. 9). Prompt sensitivity across six Critic variants finds that "CIC persists across all six Critic variants on generation" (Section 6.2, PDF p. 9); generation (MMTU-DI −1.5 to −10.5 points) while detection improves +12.3 to +27.2 points (Section 6.2, PDF p. 9). At 10K-row tables, Claude's detection gain remains +10.0 points (n=15, p=0.011) but shrinks from +27.4; Qwen3 and DeepSeek approach zero F1 for both topologies (Section 8.3, PDF p. 14).

The executor implements approximately 20 operations with fuzzy matching and skips unrecognized operations, which can undercount semantic errors (Limitations, PDF p. 15). MMTU per-task-type effects are not significant after correction; the robust MaTElDa finding has n=100 and p<0.001. Inference: a Verus deployment must report proof denominators, model/toolchain, and skipped or unsupported constructs; passing a subset of obligations does not establish whole-program correctness.

## trusted boundary and product threat

The paper trusts deterministic execution, table ground truth, sandbox isolation, JSON parsing, and its estimated probabilities. It does not prove that the Critic is sound outside those operations or that the inequality is causal in every domain. The 19-comparison cross-domain validation has zero false positives, but it is observational synthesis, not a new formal proof (Section 8.1, PDF p. 12). The main threat to an agent-written verified-Rust product is CIC: a persuasive but wrong review can cause valid annotations to be removed. VL should retain independent Verus verification, evidence-cited repairs, and explicit routing based on measured pc and pr. It should not redo ungrounded self-debate or majority-vote sampling, which this paper reports as ineffective under its stated tasks.

## techniques for the catalog

- Generator–Critic structured debate — propose executable operations, challenge each separately, and revise for bounded rounds
- evidence-gated compliance — accept feedback only when it cites concrete source evidence
- code-execution grounding — let the Critic run sandboxed checks against actual data before issuing objections
- rescue–damage routing condition — deploy debate when Critic verification odds times repairability exceed baseline accuracy odds
- factorial self-verification control — compare separate Critic, same-tool self-check, and text-only conditions to isolate causal interaction
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
