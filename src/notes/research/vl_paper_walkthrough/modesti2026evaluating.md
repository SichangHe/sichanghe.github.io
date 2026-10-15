# Evaluating Large Language Models for Symbolic Security Protocol Analysis
(authored by agents unless marked 🧑)
Tag: `modesti2026evaluating`, [paper](https://doi.org/10.1145/3821416)

## task and formal baseline
This paper tests whether LLMs can classify attacks in AnB/AnBx security protocols. It compares model verdicts with ProVerif and OFMC under the Dolev–Yao attacker model. The formal tools are materially different: “ProVerif translates protocol specifications into Horn clauses and can prove security for an unbounded number of sessions, whereas OFMC” explores bounded sessions (section 1, p. 2). The benchmark has 130 protocols and 388 security goals: 112 secrecy, 144 authentication, 65 weak-authentication, and 67 channel goals (section 3.3, Table 1, p. 9).

## technique 1: formal-tool waterfall ground truth

What it is and when to use it. Build a reference verdict by preferring the strongest terminating formal result, then use bounded OFMC only where ProVerif cannot decide. This gives an explicit denominator and avoids treating an LLM’s confidence as truth.

How to do it. (1) Run ProVerif 2.05 on each goal. (2) Where ProVerif has no query or returns inconclusive, run OFMC at two sessions, then one session as needed. (3) Record attack/safe/no-query per tool. (4) Resolve disagreements by the stated priority. The paper says: “ProVerif 2.05 served as the primary benchmark” (section 3.3, p. 9) because it analyses unbounded sessions. The abstract states: “Security protocol verification relies on formal tools such as ProVerif and OFMC.” (abstract, p. 1) ProVerif covered 377 goals, OFMC one session 388, and OFMC two sessions 245 (Table 2, p. 10). The final class distribution has 22.9% attack goals.

Verus form. Inference: this is a regression oracle for an agent-writing Verus Rust: compile and verify with the current Verus toolchain first, and use bounded tests only for obligations outside the tool’s scope. A waterfall must record exactly which checker established each result. A passing bounded execution cannot replace an `ensures` proof.

Evidence and limits. ProVerif and one-session OFMC agree on 348/370 jointly resolved goals (94.1%); ProVerif and two-session OFMC agree on 226/231 (97.8%). One-versus-two-session OFMC differs on 20/245, all attacks visible only at two sessions (section 3.3, p. 10). The authors note three one-session and four two-session attacks that OFMC flags while ProVerif proves absent, likely translation differences. Thus the waterfall is an assumption and a potential source of label error, not a mathematical proof of equivalence.

## technique 2: obfuscation and structured zero-shot analysis

What it is and when to use it. Obfuscate identifiers to reduce protocol-name memorization, then ask an LLM to return one machine-parseable verdict per goal. Use this when evaluating reasoning rather than retrieval.

How to do it. (1) Replace user-defined agents, nonces, and keys with fresh type-prefixed names (`A`, `N`, `K` plus an index); replace filenames with `PROTO_0001`; leave function symbols and Diffie–Hellman `g` unchanged. (2) Send each protocol independently with one zero-shot prompt. (3) Prompt components are: Dolev–Yao role, AnB/AnBx notation and operators, goal definitions, and strict JSON output. (4) Require `goal_id`, status restricted to “attack found” or “no attack”, confidence 1–100, justification, and optional `two_session_trace`. (5) Parse JSON and compare status to the formal label.

Verus form. Inference: anonymization is useful for testing whether an agent understands a Rust proof rather than memorized names. A structured result can select a proof-debugging branch, but status and confidence remain untrusted text; only Verus diagnostics and proof checking establish correctness.

Evidence and limits. Renaming removes lexical cues but not structural memorization: a three-message Needham–Schroeder pattern remains recognizable (section 3.3, p. 10). The paper uses one fixed prompt, two providers, and no few-shot examples, so results are conditional on this prompt and may change with prompt design.

## technique 3: multi-run classification and protocol-cluster uncertainty

What it is and when to use it. Run each model configuration three times, compute confusion-matrix metrics, inspect confidence calibration, and bootstrap whole protocols rather than individual goals. This measures stochastic instability and avoids pseudo-replication from correlated goals.

How to do it. (1) For every goal, label TP, TN, FP, or FN against the waterfall ground truth. (2) Compute precision `TP/(TP+FP)`, recall `TP/(TP+FN)`, F1, and accuracy. Treat recall as primary because missed attacks are costlier than manual-review false positives. (3) Group self-reported confidence into bands and check whether correctness increases. (4) Mark unanimous versus split verdicts across the three runs and calculate majority vote. (5) For a 95% interval, sample 130 protocols with replacement, preserve all their goals, pool the three runs, and take the 2.5th and 97.5th percentiles.

Evidence. Chat GPT achieved 72.7% recall but 27.3% precision; DeepSeek chat 69.3% and 27.2% (three runs, all 388 goals; sections 5.2, Tables 5–6, pp. 17–18). Reasoning GPT against ProVerif achieved 66.5% precision, 54.5% recall, F1 59.9%; DeepSeek reasoning achieved 45.4%, 57.3%, F1 50.6% (three runs; 370 ProVerif-resolved goals, section 5.3, Table 8, p. 20). The definitive waterfall figures are GPT 64.8% precision, 53.2% recall, 82.6% accuracy and DeepSeek 44.4%, 55.1%, 73.9% (all 388 goals, 18 ProVerif gaps filled by OFMC). Protocol-cluster intervals are GPT precision 64.8% [49.1,78.1], recall 53.2% [39.3,66.3]; DeepSeek precision 44.4% [30.7,58.5], recall 55.1% [41.6,67.4] (section 5.3, p. 20).

The always-safe baseline is 77.1% accuracy and 0% recall over 388 goals; always-attack is 22.9% precision and 100% recall (Table 3, p. 12). Accuracy alone therefore hides missed attacks. Confidentiality was easiest for reasoning GPT (F1 95.7%, perfect recall, precision 91.7%), while injective-agreement recall was only 38.5% for GPT and 40.2% for DeepSeek over 39 attack goals in 27 protocols (section 5.4, pp. 20–21). Several attacks were missed by both models in all runs, including multi-session and trusted-third-party cases (section 5.5, p. 22).

Verus form. Inference: apply the same protocol-level bootstrap to proof-generation evaluations: resample complete programs or tasks, not individual assertions from one program. Track false negatives as unproved obligations, and never report only aggregate pass rate.

## what is proved, measured, and trusted

The study measures classification performance, stability, confidence calibration, cost, and category-specific blind spots. It does not prove that an LLM can verify protocols. Formal checkers, their translations, the selected waterfall, obfuscation pass, prompt, API outputs, and benchmark labels are trusted or assumed. Inference: an LLM-as-verifier in VL is a triage tool with dangerous false negatives and false positives; it must not discharge a Verus obligation. What VL should not redo is treating accuracy on imbalanced goals as evidence of soundness or claiming reasoning mode is generally safer without category and protocol-level analysis.

## techniques for the catalog

- formal waterfall labeling — prioritize unbounded formal verification and fill undecided cases with bounded checkers while recording provenance
- type-aware protocol obfuscation — rename identifiers while preserving declared types to reduce lexical memorization
- structured zero-shot verdicts — require one parseable attack/no-attack result, confidence, and justification per security goal
- protocol-cluster evaluation — run stochastic models repeatedly and bootstrap complete protocols to obtain honest uncertainty
Checked 2026-10-15 against paper modesti2026evaluating: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
