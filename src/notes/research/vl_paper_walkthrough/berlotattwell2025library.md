# LLM Library Learning Fails: A LEGO-Prover Case Study
(authored by agents unless marked 🧑)
Tag: `berlotattwell2025library`, [paper](https://arxiv.org/abs/2504.03048)

This paper audits LEGO-Prover, an LLM system that proposes Isabelle lemmas, stores them, retrieves them, and verifies generated proofs. Its main result is a warning about evaluation: apparent accuracy gains disappear when the baseline receives the same computational budget. The abstract states, “We find no evidence of the direct reuse of learned lemmas,” and that “the improvements in task accuracy vanish once computational cost is accounted for” (Abstract, p. 1).

## technique: concurrent prover/evolver library loop

What it is. LEGO-Prover has a PROVER and EVOLVER sharing a database. PROVER decomposes each natural-language proof into lemma requests, rewrites it as a step-by-step proof, retrieves lemmas, formalizes the proof, and asks Isabelle to verify it. EVOLVER tries to prove requested lemmas and evolve existing ones for pending tasks (Section 2, p. 2).

Steps. For each pending task, request potentially useful Isabelle lemma statements without proofs; produce an English proof; retrieve candidate lemmas using Ada embeddings; convert the augmented proof to Isabelle; accept only a proof verified by Isabelle. In parallel, prove requests and add successful lemmas to the shared database. Cycle through the pool of unsolved problems; the maximum number of attempts per problem is a hyperparameter (Section 2, p. 2).

Verus form. Inference: the database can store proved `spec fn` lemmas and their statements, while a Rust `proof fn` invokes them. Verus requires the caller’s preconditions and postconditions to match; retrieval and LLM rewriting remain untrusted proposal mechanisms. A verified lemma is reusable only if its specification is sufficiently general and its proof is retained.

## technique: measuring direct and soft use

What it is. Direct use is checked by searching whether a retrieved lemma or its name appears in the PROVER’s output (Section 4.2, p. 4; the name check is described as a generous way of accounting for whitespace or comment changes). Soft use is quantified with a normalized token-level Levenshtein score: deletions and substitutions convert the lemma into a fragment of the solution, while insertions have zero weight (Section 4.1, p. 3).

Steps. Record each retrieved lemma and final proof; check verbatim lemma and name; compute the minimum deletion/substitution count divided by lemma length; compare survival curves for retrieved lemmas, non-retrieved model-written lemmas, and unrelated Archive of Formal Proofs lemmas. At high similarity thresholds the retrieved lemmas keep a larger population than the non-retrieved lemmas, which the authors take as evidence of soft use; the curve for unrelated AFP lemmas drops fastest (Sections 4.1–4.2, pp. 3–4). Inference: this shows use within a task, not reuse across tasks.

Evidence. Table 2 (sums over 3 runs) gives verbatim and name use in 2/43 and 9/43 GPT-4o found solutions (20% test subset), 4/21 and 6/21 (10% subset), 0/20 and 5/20 o3-mini solutions (10% subset), and 13/189 and 47/189 4o-mini solutions on the full test set (p. 4). Table 3 finds no verbatim reuse for any model (zero lemmas reused once or more) and no name reuse except one 4o-mini lemma name reused once; the text says that reuse was part of an erroneous proof step later replaced by the human-written proof correction heuristics, so it is not in the final verified proof (pp. 4–5).

Verus form. Inference: use a proof-dependency graph rather than token similarity: record which `proof fn` each verified theorem invokes, then count reuse across distinct client proofs. Text similarity can miss semantic reuse and can reward copied but irrelevant statements; Verus’s checked call graph is stronger evidence.

## technique: equal-compute baseline accounting

What it is. The paper compares LEGO-Prover (LP) with Draft-Sketch-Prove (DSP). At a fixed number of PROVER attempts (Table 1, p. 3), LP is below DSP with 4o-mini on the full test set (25.8 ± 1.6% vs 35.9 ± 0.9%) but above it on the gpt-4o and o3-mini subsets. The paper then adjusts the number of attempts so cost is comparable. The EVOLVER (the default runs more EVOLVER than PROVER processes: 8 vs 3 in Table 6) and the two-stage PROVER consume more compute; using cost as a proxy for GPU compute, the authors estimate per-attempt ratios of 5.84 for gpt-4o-mini, 5.94 for gpt-4o, and 14.23 for o3-mini (Section 5, p. 5; Table 4, p. 7).

Steps. Record total token usage per run; divide total cost by total attempts to get the average cost per attempt; reduce LEGO-Prover attempts to the DSP budget (Table 5 uses 17, 9, 8, 6, 4 and 3 LP attempts across its six columns); compare accuracy and standard deviation over 3 trials (Appendix D, p. 22; Table 5, p. 7). Table 5 reports DSP 35.9 ± 0.9% versus cost-matched LEGO-Prover 17.5 ± 0.9% for 4o-mini on the full miniF2F test set; on the other columns the paper says DSP outperforms LEGO-Prover or is within one standard deviation. A follow-up extends the DSP runs to roughly match LEGO-Prover’s full cost and again finds DSP within one standard deviation or better (Figure 3, p. 8). Costs exclude Ada embedding usage (Appendix B, p. 14).

Verus form. Inference: evaluate a VL repair or lemma-learning system against a baseline with equal verifier calls, solver time, model tokens, and proof-search budget. A system that adds an uncounted synthesis pass may look better while merely spending more. Verus proof checking gives a measurable verifier cost, but model generation and failed proof attempts must also be recorded.

## technique: reuse-aware library diagnosis

A library learner must both use a tool and reuse it across tasks. The authors distinguish single-task soft use from soft reuse in at least two solutions. Their bottom-row survival curves (Figure 1, p. 6; Section 4.3, p. 5) show no significant difference between retrieved and non-retrieved lemmas, which they read as LEGO-Prover learning overly specific lemmas that are not reused in other problems; Figure 2 shows soft-reuse curves reaching zero while 30–40% of tasks still show soft use. The paper’s conclusion is categorical: “LEGO-Prover does not exhibit reuse behaviour – therefore, it does not perform library learning” (Section 7, p. 9).

Inference: for VL, catalog entries should record theorem names, clients, and proof dependency edges, then require reuse on held-out tasks before claiming a learned library. Existing projects with hand-written Verus lemmas already provide real reuse; a generated lemma that is never called is only cached text.

## what is proved, measured, and trusted

Isabelle verifies each accepted formal proof, so accepted theorems are evidence of theorem correctness under Isabelle’s environment. The paper measures miniF2F accuracy, token-cost estimates, direct/name use, soft-use curves, and reuse counts. It does not prove that its soft-use metric detects all paraphrased reuse; the limitations state that substantial paraphrasing or structural imitation may be missed (Appendix B, pp. 13–15). Experiments are also constrained: gpt-4o and o3-mini run only on random 5%, 10% or 20% subsets of the test set (gpt-4o on 5%, 10% and 20%; o3-mini on 5% and 10%), while 4o-mini runs on the full set (Table 1, p. 3; Appendix A, p. 12). The released LEGO-Prover code forcibly initializes the EVOLVER with a database of all test queries, so the EVOLVER has access to information about other tasks; this affects the gpt-4o, o3-mini and prompt-stability experiments, and the paper says the impact is unclear (Appendix B, p. 14).

Inference: the threat to agent-written verified Rust is methodological rather than a direct correctness failure. VL should not claim automatic lemma learning from higher pass rates unless it reports proof-call and model budgets, direct dependency reuse, and held-out reuse. The paper claims the improvements arise from increased compute (Section 5, p. 5), says it is possible that the benefits of library learning “are simply due to a hidden form of inference-time scaling” (Section 7, p. 9), and recommends behavioural analysis plus equal-budget baselines (Abstract, p. 1).

## techniques for the catalog

- concurrent prover/evolver loop — generate, retrieve, verify, and evolve formal lemmas through shared state
- direct and soft-use audit — detect copied or lightly modified retrieved lemmas with token and name checks
- equal-compute evaluation — normalize baseline and library-learner attempts by measured token/GPU cost
- reuse diagnosis — distinguish one-task tool use from reuse in multiple independently solved tasks
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Furthermore, given our focus on library learning specifically, we also go into the details of whether the system internally behaves as expected, as opposed to studying the general trends of cost and accuracy."): read the whole paper including appendices; checked every quotation, number (Tables 1-5 and 8 values, GPU ratios, attempt counts), section and page reference and technique step against it; changed the paper link (the old DOI was the DeepSeek-R1 reference, now the arXiv page from the paper text stamp), corrected the Table 3 reuse description, the subset description for gpt-4o and o3-mini, the evolver leak scope, and removed an unsupported rerun claim in the equal-compute steps, adding Table 1, Figure 3 and Appendix D context; did not check the Verus-form inferences against any external source, the cited works, the released code, or the figure data beyond the captions and text.
