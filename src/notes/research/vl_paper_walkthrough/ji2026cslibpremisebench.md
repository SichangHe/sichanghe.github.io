# CSLibPremiseBench: Structure-Guided Premise Retrieval and Label Robustness for Lean 4 Computer-Science Theorems
(authored by agents unless marked 🧑)
Tag: `ji2026cslibpremisebench`, [paper](https://arxiv.org/abs/2605.14549)

## scope and result
The paper introduces CSLibPremiseBench, a reproducible retrieval benchmark over Lean 4 computer-science declarations. Its strict import/source-order setting has 801 tasks and 1,875 candidate declarations (section 3.2, p. 3). The benchmark target is deliberately limited: “CSLibPremiseBench uses source-visible CSLib proof-reference proxy labels.” (section 4, p. 4). These labels are names recoverable from proof text, not complete elaborated dependencies.

The benchmark pins CSLib v4.29.0 at commit 0d37cc7fcc985cfc53b155e7eef2453f846c6da2 and Lean 4.29.0; the build uses 1,762 jobs and takes 284.95 seconds (section 3.1, p. 3). A label audit retains 2,666 of 2,845 source-visible links (93.7%); a 300-task expression probe sees 462 of 958 links (48.2%) in value-level constants over 257 found declarations (Table 2, p. 4). Thus the latter is a stronger but partial signal, not a semantic gold dependency set.

## technique 1: construct an auditable premise-retrieval benchmark

What it is. Extract theorem and lemma declarations, their source metadata, and recoverable proof-reference links; define candidate scopes that make accessibility explicit. The strict policy includes imported CSLib declarations and same-module declarations earlier in source order. Family-local and all-earlier-CSLib scopes are sensitivity variants (section 3.3, p. 4).

When to use it. Use this design when evaluating retrieval for a repository where “available premise” depends on imports and source order. It prevents a headline task count from hiding candidate-pool differences.

How to do it.
1. Pin the repository and toolchain, then scan Lean source files for public theorem/lemma declarations with recoverable statements (sections 3.1–3.2, pp. 3–4).
2. Record target name, file, namespace, module, imports, family, statement, candidate count, proxy-gold count, and exclusions; record the same metadata for candidates (section 3.2, p. 3).
3. Build strict, family-local, and all-earlier candidate policies. On the common 781-task subset, mean candidate counts are 152.6, 352.8, and 1,002.2 respectively (section 3.3, p. 4).
4. Resolve CSLib names occurring in source proof text as proxy labels, remove ambiguous short-name matches for the strict audit, and separately probe elaborated value-level expressions (section 4, p. 4).
5. Report retrieval scores with the policy, denominator, and label signal. The paper warns: “The correct interpretation is therefore recall against source-visible CSLib proof-reference proxies.” (section 4, p. 4)

Verus form. Inference: a Verus benchmark can index `proof fn` and `lemma` declarations plus executable function contracts, then define candidate scopes from module visibility and declaration order. Store each target's `requires`/`ensures` text, module, and imported modules; treat references found in proof bodies as proxy labels. Inference: these proxies will miss facts supplied by Z3 triggers, quantified lemmas, and library specifications, so a second audit should inspect elaborated Verus proof obligations or solver traces where available. Verus syntax must follow the project guide: executable functions use `requires`/`ensures`; proof functions and `lemma`s are ghost and erased.

Evidence. The strict extraction yields 801 tasks over 1,875 candidates, while the three policies materially alter candidate counts (Table 1, p. 4). The label audit's 93.7% retention and 48.2% expression-observation rate quantify coverage rather than claiming complete dependency recovery (Table 2, p. 4).

Failure and assumptions. Source-visible labels can omit tactic, simp, typeclass, elaboration, non-CSLib, or erased-proof dependencies; they can overrepresent explicitly named declarations (section 4, p. 4). Candidate policy can encode locality advantages. Inference: a Verus retrieval result should therefore be reported as proxy recall, never as proof completeness.

## technique 2: combine lexical and repository-structure ranking

What it is. Rank candidates with BM25 over names/statements and metadata, symbol/name overlap, namespace and module proximity, import-graph distance, source-order locality, module PageRank (PPR), and fixed hybrids. CSG-Rerank combines these signals with fixed weights: `0.40 BM25 + 0.20 Symbol + 0.12 Namespace + 0.15 ImportGraph + 0.08 SourceOrder + 0.05 ModulePPR` (section 5, p. 5).

How to apply it.
1. Tokenize dotted, snake-case, camel-case, punctuation, and lowercase identifier forms for BM25 (section 5, p. 5).
2. Compute normalized symbol/name overlap and structural scores from namespace, module imports, source order, and the module graph (section 5, p. 5).
3. Keep weights fixed before evaluation; do not tune against the test set (sections 5–6, pp. 5–6).
4. Measure Recall@5/10/20/50, MRR, nDCG, candidate count, runtime, and family-level metrics; use task-level paired bootstrap with 5,000 resamples and seed 17 (section 6, p. 6).

Results. On 801 strict tasks, BM25 has MRR 0.5061 and Recall@10 0.5242; BM25+symbol has MRR 0.5199 and Recall@10 0.5282; CSG-Rerank has MRR 0.5236 and Recall@10 0.5215 (Table 3, p. 6). CSG improves MRR over BM25 by +0.0175, 95% CI [+0.0016,+0.0335], but versus BM25+symbol its +0.0037 MRR CI [-0.0103,+0.0173] crosses zero (Table 4, p. 7). The paper's conclusion is correspondingly narrow: “CSG-Rerank gives a modest MRR gain over BM25, not a reliable win over BM25+symbol.” (section 12, p. 10)

Verus form. Inference: build a premise retriever whose BM25 document fields are Verus item names, module paths, contract text, and proof signatures; add namespace/import graph and declaration-order features. Return a ranked context packet for a target `spec fn`, `proof fn`, or executable function. Inference: preserve a lexical baseline and paired bootstrap because structural locality may improve first-hit rank while reducing broad lemma recall.

Failure and assumptions. CSG's weights are hand-set, not learned; family effects are heterogeneous (Table 6, p. 8). Inference: graph structure should be treated as a ranking feature, not evidence that retrieved lemmas are semantically sufficient.

## technique 3: audit finite context packets instead of rankings alone

What it is. Convert each ranking into top-10/top-20 context packets and measure proxy-gold coverage, density, estimated tokens, gold links per 1,000 tokens, same-module/family share, unique modules, and first-hit behavior (section 8, p. 8).

Evidence. CSG@10 has coverage 0.5215 and 6.3979 gold links/1k tokens versus BM25+symbol@10's 0.5282 and 6.5119, while CSG uses 255.06 versus 250.31 estimated tokens and raises same-module share to 0.8140 from 0.7146 (Table 8, p. 9). Against BM25+symbol, CSG@10 coverage difference is -0.0067 with CI [-0.0191,+0.0055], while token use rises +4.7516 with CI [+2.6292,+6.9951] (Table 9, p. 10). The paper explicitly limits interpretation: “The context-packet audit measures proxy-gold coverage and structural concentration, not proof-generation success.” (section 9, p. 9)

Verus form. Inference: evaluate the exact lemma bundle given to a Verus agent, counting contract/proof facts covered per token and compiling held-out generated proofs. A packet should exclude original proof text and gold names, then require Verus compilation; these isolation and compilation steps are the paper's proposed future protocol (section 11, p. 10), not results.

## what is proved, trusted, and useful to VL
The paper proves benchmark reproducibility and retrieval comparisons, not Lean proof repair. It trusts source extraction, proxy-label resolution, Lean environment probes, metric scripts, and the pinned CSLib/Lean toolchain. The expression audit's 48.2% observation rate shows that proxy links are not complete dependencies. No reported number adds a proof-success denominator.

Inference: for VL, the practical threat is moderate: a structure-biased retriever could supply local but incomplete Verus lemmas, causing missed obligations or misleading confidence. The work VL should not redo is a generic BM25-versus-graph retrieval comparison without a Verus-specific, compiler-checked downstream task. The reusable lesson is to publish candidate-scope metadata, label audits, packet utility, bootstrap intervals, and negative results together.

## techniques for the catalog
- auditable candidate policies: define strict import/source-order and wider fallback scopes, recording candidate counts and exclusions
- proxy-label audits: compare source-visible references with a stronger elaborated-expression probe and report the denominator
- structure-guided reranking: combine BM25, symbol overlap, namespace/import/source-order and module-graph features with fixed weights
- context-packet utility: evaluate finite top-k premise packets by coverage, token cost, density, and locality before claiming proof-assistance benefit
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
