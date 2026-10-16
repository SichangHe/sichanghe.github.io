# Reducing False Positives in Static Bug Detection with LLMs: An Empirical Study in Industry
(authored by agents unless marked 🧑)
Tag: `du2026reducingfalsepositives`, [paper](https://www.semanticscholar.org/paper/0786deddbebc8d5c8d9a93acb31e951c52dc2a)

## scope and evidence

This industrial study evaluates large-language-model methods for triaging static-analysis alarms. Tencent’s BkCheck analyzer scans Advertising and Marketing Services repositories; developers and reviewers then label each warning. The final dataset has 433 alarms: 328 false positives and 105 real bugs, covering null-pointer dereference (NPD), divide-by-zero (DBZ), and out-of-bounds (OOB). The paper reports that “false alarms are not only prevalent (i.e., over 76%), but also require massive manual inspection effort (i.e., on average 10 - 20 minutes per alarm)” (section 1, p. 2). The denominator for 76% is 328/433; 328 ÷ 433 = 75.8%, so the rounded claim is consistent.

The contribution is empirical rather than a new sound verifier. The paper compares basic prompts, chain-of-thought (CoT), few-shot examples, bug-type augmentation, and two static-analysis hybrids (LLM4SA and LLM4PFA). It also compares four learned vulnerability detectors. The abstract’s headline is: “hybrid techniques of LLM and static analysis eliminate 94–98% of false positives with high recall.” This is false-positive recall on the 328 false alarms, not proof of bug absence and not overall accuracy.

## technique 1: build a reviewed industrial alarm set

What it is. Collect warnings from a deployed analyzer, label them through independent human rounds, filter unreliable records, and retain the reviewed code context and decision.

How to do it. (1) Run BkCheck over all AMS projects (section 3.1, p. 3). (2) In round one, developers inspect each warning and classify false positive or real bug, recording a reason or analyzer root cause. (3) In round two, different professional reviewers re-examine the warning, code, and annotations. (4) Consolidate both outcomes into bug-report forms. (5) Remove deprecated code, incomplete context, unresolved cases, and duplicates. (6) Select frequent categories; the paper retained NPD, DBZ, and OOB, accounting for about 52%, 10%, and 24% of all warnings respectively (86% combined, before the final filtering).

Evidence. Table 1 gives category denominators: NPD 107 false and 29 real (136 total), DBZ 139 false and 19 real (158), OOB 82 false and 57 real (139), totaling 328 false and 105 real (433). The paper says, “The final outcomes from both rounds were consolidated into specialized bug report forms, which recorded the code snippet, bug category, and final review decision” (section 3.1, p. 4).

Verus form. Inference: VL can retain each Verus diagnostic, source span, path conditions, and reviewer disposition as an immutable triage record. A Rust wrapper can serialize this record; a `spec fn` can classify a disposition, and a proof function can establish bookkeeping properties such as one final label per alarm. Human labels remain trusted evidence, not a proof that the alarm is false. The study assumes reviewers are correct and representative of Tencent; the proprietary corpus cannot be released, limiting replication.

## technique 2: prompt-only LLM triage

What it is. Give an LLM a warning and source context and ask whether it is a false positive or real bug. Evaluate multiple backbone models (GPT-4o, Claude-Opus-4, Qwen-3-Coder, DeepSeek-R1) on the same 433 reviewed alarms.

How to do it. (1) Extract the warning, sink, and surrounding code. (2) Use a basic binary classification prompt. (3) Record label, explanation, and latency/cost. (4) Compute accuracy, precision, recall, F1, false-positive recall (FPR_P), and real-bug recall (FPR_R) against the two-round labels. (5) Keep the denominator explicit: all metrics in Table 2 are over the 433 alarms, with class-specific recalls over their corresponding 328 or 105 examples.

Evidence. Basic prompts produce accuracy from 0.40 to 0.55 and real-bug recall from 0.26 to 0.84 across the four models (Table 2, p. 7). This spread shows why accuracy alone is unsafe under class imbalance. Inference: For VL, an LLM should suggest which Verus alarm to inspect, while the verifier and a conservative policy decide whether a proof obligation is discharged.

## technique 3: domain prompting (CoT, few-shot, bug-type augmentation)

What it is. CoT requests step-by-step reasoning; few-shot supplies labeled false-positive and true-bug examples; bug-type augmentation supplies structured descriptions of NPD, OOB, or DBZ.

How to do it. (1) Keep warning and code context fixed. (2) For CoT, append an instruction to reason through path feasibility. (3) For few-shot, prepend representative examples of both classes. (4) For bug-type augmentation, prepend a concise semantic description and common patterns for the warning category. (5) Evaluate each prompt/model pair on the same 433 alarms and report all confusion-matrix metrics.

Evidence. The paper states, “Both few-shot learning and bug-type augmentation can be regarded as forms of domain knowledge enhancement.” (section 3.2, p. 5). Table 2 shows few-shot accuracy of 0.72 (Claude), 0.71 (Qwen), and 0.69 (DeepSeek), while CoT reaches at most 0.49; the denominator is all 433 alarms. The authors caution that CoT “delivers the weakest performance, even underperforming basic prompts in some cases” (section 4.3.1, p. 8). Inference: Few-shot examples could teach VL an organization’s recurring invariant patterns, but examples must be checked for specification correctness; Verus can check the resulting proof, not the model’s explanation.

## technique 4: hybrid LLM4SA and LLM4PFA

What it is. Couple model judgment to facts extracted by static analysis. LLM4SA gives the model broad context around the sink, including callers and callees. LLM4PFA gives path constraints and asks an agent to reason about source-to-sink reachability, targeting infeasible paths.

How to do it. (1) Obtain the analyzer warning and sink. (2) For LLM4SA, retrieve surrounding call context and hundreds of relevant lines. (3) For LLM4PFA, extract path constraints from static analysis, then run context-aware reasoning over each path. (4) Ask the LLM to classify reachability and explain the decision. (5) Compare with the reviewed label and track both false-positive and real-bug recall.

Evidence. The paper reports LLM4SA accuracy 0.86–0.92 and LLM4PFA 0.93–0.94 across backbones (Table 2, denominator 433 alarms). LLM4PFA’s rows have false-positive recall 0.94–0.98 and real-bug recall 0.89–0.98; these are class denominators, not percentages of all alarms. DeepSeek with LLM4PFA has accuracy 0.93 and recall 0.86 (real-bug recall), while Claude has recall 0.88 (section 4.3.1). The paper says, “LLM4PFA exhibits strong generalization across all models, achieving accuracy above 0.93 in every case.”

Verus form. Inference: Replace “path constraints” with Verus proof-state facts: preconditions, branch conditions, map-domain facts, and lemmas. Generate a triage explanation from those facts, then require a Verus proof function to establish reachability or impossibility. `requires`, `ensures`, loop `invariant`, and `assert`/lemma steps are available constructs; an LLM explanation alone is not evidence. The approach assumes static constraints are sound and sufficiently complete; long contexts, cascaded conditions, and missing semantic understanding remain failure modes.

## technique 5: cost and category-aware deployment

The authors measure average per-alarm latency and API price. Table 4 reports 2.1–109.5 seconds and $0.0011–$0.12 per alarm, versus roughly 10–20 minutes of manual inspection. For example, LLM4PFA costs 12.6 s/$0.020 (GPT-4o), 16.7 s/$0.120 (Claude), 16.1 s/$0.0056 (Qwen), and 58.3 s/$0.0025 (DeepSeek). Category breakdown finds DBZ easiest and NPD hardest because NPD false positives often contain intricate conditional constraints. The paper reports, “In contrast, Null Pointer Dereference (NPD) bugs exhibit more complex and diverse patterns.”

## trust, limitations, and VL threat

The checker, human labels, source extraction, model APIs, and scoring code are trusted. The study does not prove that an alarm is absent; it measures agreement with reviewers. Confidentiality prevents releasing code, and five interviewees (two developers, three reviewers) are a narrow sample. LineVul illustrates class-imbalance danger: its 0.76 accuracy came from labeling all warnings false, with precision and recall for real bugs both 0.00 (Table 3, denominator 433).

Inference: For a product that emits agent-written verified Rust, the operational risk is moderate: LLM triage can reduce review load, but an incorrect or omitted Verus specification remains outside the theorem prover’s guarantee. Existing hybrid static-analysis/LLM methods already address alarm triage; VL should reuse their separation of machine facts, model explanation, and final checked evidence rather than build a prompt-only judge.

## techniques for the catalog

- reviewed industrial alarm corpus: collect analyzer warnings, double-review labels, filter unreliable records, and preserve context
- prompt-only triage: classify each warning with an LLM and score class-aware metrics over reviewed alarms
- domain prompting: add chain-of-thought, few-shot examples, or structured bug-type knowledge
- static-analysis hybrid triage: feed sink context or path constraints to an LLM for reachability decisions
- cost/category evaluation: report per-alarm latency and price, then stratify performance by bug category

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
