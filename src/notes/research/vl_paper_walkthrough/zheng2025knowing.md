# Is “Knowing It’s Malicious” Enough? Evaluating LLMs for Fine-Grained Malware Behavior Auditing
(authored by agents unless marked 🧑)
Tag: `zheng2025knowing`, [paper](https://doi.org/10.1145/3832187)

## problem and evidence standard
The paper (MalEval, ISSTA 2026) evaluates whether LLMs can audit Android malware at fine granularity: identify behaviors and support each behavior claim with code-level evidence. Its abstract says, “Automated malware classifiers achieve strong detection performance, but auditing requires more than flagging a sample: analysts must explain malicious behaviors and justify them with concrete code evidence, a requirement that traditional signature-based methods and learning-based XAI often fail to satisfy in a human-interpretable manner.” (Abstract, p. 1.) MalEval is an evaluation framework, not an auditing system; the paper says, “Rather than proposing a new auditing system, MalEval provides an evidence-verifiable way to assess whether LLMs can perform malware auditing as human analysts do.” (Section 1, p. 2.) The technique that carries over is evidence-linked auditing rather than a binary malicious/benign label.

The paper defines four stage-wise tasks: “T1: Function Prioritization, prioritizing suspicious functions in large codebases; T2: Evidence Attribution, attributing low-level indicators to malicious capabilities with explicit evidence; T3: Behavioral Synthesis, integrating grounded evidence into behavior-level conclusions; and T4: Sample Discrimination, aggregating evidence and behaviors from T1-T3 to reassess samples and distinguish genuine threats from hard-to-separate benign applications.” (Section 1, p. 3.)

## technique 1: atomic evidence triplets linked to behaviors
Use this when an analyst needs an explanation that can be compared against a reference. The paper maps both model output and expert reports into a shared space: “The core unit of this representation is an atomic evidence triplet, ⟨action, asset, target⟩, which captures a minimal malicious operation in a code-grounded and semantically comparable form.” (Section 3.4, p. 9.) The vocabularies are controlled (Table 2, p. 8): 16 actions, 20 assets, 13 targets, and behavior labels from the MalRadar taxonomy. The paper says the design “makes the audit traceable by requiring each behavior claim to be supported by atomic evidence and each evidence item to be linked to concrete code units” (Section 3.4, p. 9). The report therefore holds triplets with support functions, normalized behavior labels, and a verdict/category (Section 3.5, p. 10).

## technique 2: separate evidence extraction, behavior synthesis, and verdict
The paper’s constrained reasoning has three internal stages: “(1) extracting atomic evidence from the top-𝑘 sensitive CIRs; (2) mapping evidence to normalized behavior categories with explicit support links; and (3) synthesizing a final malware verdict and category, followed by a self-review that checks structural validity, evidence coverage, and schema compliance.” (Section 3.4, p. 9.) Evaluation then scores each level separately: evidence (AE-F1), behavior (B-F1, Report Quality), and sample (FPCR, TPMR, category F1) (Section 3.6.1, pp. 10-11).

Pipeline as described (Section 3.5, p. 10): identify entrypoints, run BFS reachability over the Androguard call graph, have the evaluated LLM summarize one-hop callers and callees, build CIRs, rank CIRs by sensitivity score, send the top-ranked CIRs to the same LLM to produce the structured report, and compare against the normalized expert report.

## technique 3: checking cited evidence, and comparing input representations
The paper checks cited evidence in two ways: “Syntax Authenticity Score (SAS), which verifies that all cited functions exist in the input, and Evidence Authenticity Score (EAS), which evaluates whether those functions semantically support the claimed evidence.” (Section 3.6.1, p. 11.) SAS is a mechanical check; EAS uses an LLM-as-a-judge (three judges: GPT-5, Gemini-2.5-Flash, DeepSeek-V3), and the paper reports 8 mismatches (2.3%) between manual inspection and judge scoring for Report Quality on 350 sample-model pairs (Section 4.1.2, p. 13).

The paper compares seven LLMs and three input representations (CIR, CIR-decompile, LAMD-slice) under the same benchmark (Tables 3-4, p. 14). It also perturbs the CIR by removing caller-callee context (Table 5) and by adding app metadata (Table 6) (Section 4.3, p. 14). It does not compare against signature-based or learning-based XAI baselines on this benchmark; those are criticized only in the introduction and background.

Observation 2 of Section 4.2 (p. 14): all models score higher on EAS (58-92%) than on AE-F1 (7-30%); the paper reads this as models recognizing related functions but failing to compose them into correct evidence triplets.

## techniques for the catalog
- atomic evidence triplets — a controlled-vocabulary ⟨action, asset, target⟩ unit linked to support functions and then to behaviors
- three-stage constrained reasoning — extract evidence, map to behaviors, then verdict, with self-review
- cited-evidence checks — SAS (cited function exists) and EAS (cited function supports the claim)
- contract evidence checking —

## MalEval construction techniques
The benchmark contains 255 Android applications (230 malware and 25 benign), 654,188 reachable functions (reduced from ∼3M total functions), and 62 expert reports for the 230 malware samples (Section 3.2, pp. 5-7). The paper later gives 801,065 analyzed functions including 654,188 reachable, reduced by 78.92% from 3,800,163 (Section 3.3.1, p. 8). Reachable code is extracted from entrypoints (lifecycle and framework callbacks) with breadth-first search over the call graph (Section 3.3.1, p. 7).

The context-driven intermediate representation (CIR) of a function f is ⟨N(f), Dc(f), ρ(f)⟩: its signature, an LLM-written description of its role given one-hop caller and callee descriptions and its decompiled code, and a sensitivity score that is “not a vulnerability verdict, but a coarse-grained risk prior” (Section 3.3.2, p. 8). Inputs are capped at 300 CIRs ranked by sensitivity (Section 4.1.2, p. 12).

The constrained structural chain of thought is described under technique 2. The four tasks are scored by: T1 the Sensitivity Index ΔS (AE-F1 drop after removing the top 10% most sensitive CIRs), T2 AE-F1 with EAS and SAS, T3 B-F1 and Report Quality, T4 FPCR, TPMR and category F1 (Section 3.6.2, pp. 11-12). The paper reports that decisive-evidence missing and attack-chain composition failure “together account for over 58% of auditing errors” (Section 1, p. 3; FM-1 34.48% plus FM-3 23.56%, Table 8, p. 17), and that the best category-level F1 is 32.93% (Claude-3.7-Sonnet, Table 3, p. 14). Removing inter-procedural structure degrades evidence attribution by up to 25% (Section 1, p. 3; Claude-3.7-Sonnet AE-F1 down 25.04% relative, Table 5, p. 15).
