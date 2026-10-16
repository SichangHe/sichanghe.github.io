# ProofVerifier: A Scalable, Diversity-Driven Framework for Natural-Language Proof Verification
(authored by agents unless marked 🧑)
Tag: `yang2026proofverifier`, [paper](https://doi.org/10.48550/arxiv.2602.02377)

## purpose

ProofVerifier builds a training corpus and reinforcement-learning recipe for models that judge complete natural-language proofs. The paper identifies the data bottleneck: “training such verifiers requires diverse and trustworthy question-proof-check (QPC) examples at scale, which are scarce.” (Abstract, p. 1) Its framework varies problem source, proof-generation method, and generator model; filters labels with five-model agreement; audits generation regimes with humans; then trains generative verifiers with balanced token weighting and a fluency filter.

Inference: this is a learned informal verifier, not a formal checker. For VeruLaw, it can rank or triage candidate Rust/Verus proofs, but only Verus can establish the encoded contracts.

## technique 1: three-axis QPC data construction

What it is. Construct question-proof pairs across (a) problem sources, (b) proof-generation prompts, and (c) generator LLMs. The paper calls a source-method-model combination a “slice” (§3.1, p. 3). Sources include OlympiadBench, USAMO, and Putnam; methods include reference-proof rephrasing, independent proof construction, masked completion, and augmentation; models include DeepSeek-R1, DeepSeek-V3.1, GPT-5-mini, and Gemini-2.5-Flash.

How to apply it. (1) Select heterogeneous question sources and retain their reference solutions. (2) For each question, generate positives by rephrasing references and negatives by independent attempts, masked-step completion, and controlled augmentation. (3) Repeat each method with several generator models. (4) Add boundary negatives such as refusals, vacuous outputs, and short-answer mismatches. (5) Record each source-method-model slice so later auditing can reject a whole regime. Table 1 reports the intended behaviors: masking “may introduce local step-level flaws,” while independent proof attempts commonly produce “case-analysis errors or hallucinated lemmas.”

Verus form. Inference: substitute Rust specifications, implementations, and proof scripts for question-proof pairs; vary task families (ownership, arithmetic, concurrency), mutation operators, and generator models. A valid negative must contain a real contract or proof error, not merely fail to compile. Inference: keep source, model, prompt, and Verus version as slice metadata so a verifier's apparent accuracy cannot hide a distribution shift.

Evidence and limits. The final corpus has 27 combinations and 20,904 QPC triples (§3.2, p. 4). The authors explicitly say that removing any diversity axis lowers accuracy: Table 7 gives full 76.8%, no diverse prompt method 69.9% (32.2% data retained), no multi-source data 72.9% (44.0% retained), and no extended LLM usage 74.1% (38.7% retained), all on the held-out test set. Inference: these percentages have the held-out set as denominator; they do not show that every source or model is necessary outside this construction.

## technique 2: unanimity labels plus slice-level human audit

What it is. Each candidate proof receives five LLM judgments: DeepSeek-R1 three times, GPT-5-mini once, and Gemini-2.5-Flash once. Keep only unanimous labels, then audit each generation slice rather than every item. The paper states: “We keep a sample only if all five judgments agree.” (§3.2, p. 4)

How to apply it. (1) Generate a pilot pool using 5% of a slice's source questions. (2) Human-audit cumulative samples of approximately 0.5%, 1%, and 2.5%. (3) Require LLM-human agreement of 75%, 80%, and 90% in the three rounds and at least 30 checked proofs per slice. (4) Discard a slice if any round fails. (5) If it passes, generate the full slice and use unanimous LLM labels as audited silver labels. The paper reports a Clopper-Pearson lower-bound calculation: at the minimum threshold, 90% confidence gives average consistency above 79.1% (§3.2).

Verus form. Inference: use independent Verus runs, mutation tests, and human review of a sampled task regime to audit generated Rust proof labels. Preserve rejected slices; never silently relabel them. A Verus pass is stronger than an LLM agreement, but a human audit is still needed to check that the specification expresses the intended behavior.

Evidence and limits. Thirty slices were audited and 18 accepted; accepted slices averaged 94.3% agreement with human judgments. Full manual annotation was estimated at at least 1,200 hours, versus under 100 actual hours, “corresponding to more than a 12x reduction in annotation effort” (§3.2, p. 4). Inference: the savings depend on slice homogeneity and on the audit thresholds; regime-wide acceptance can propagate systematic errors within a slice.

## technique 3: balanced token weighting for binary-reward RL

What it is. The verifier generates a long reasoning trace and a binary verdict, but receives reward only for the verdict. GRPO-like weighting over-amplifies short positive traces; DAPO-like weighting over-rewards long traces. The paper interpolates the two with weight `w_bal = η/(G|o_i|) + (1−η)/(Σ_j|o_j|)` and uses η = 0.6 (§4.1, pp. 5–6).

How to apply it. (1) Sample a group of rollout outputs for each question-proof prompt. (2) Compute each output's sequence-level advantage and token length. (3) Weight its clipped policy-gradient terms with the interpolation above. (4) Tune η on held-out stability and accuracy, keeping the reward binary. (5) Track both output length and reward, because high reward with empty or repetitive traces is a failure mode.

Verus form. Inference: if training a Rust-proof proposal model, use the same weighting only for model optimization; reward must include an actual Verus result or independently checked behavioral test. A text verdict alone is not a proof obligation. Do not use generated traces as `assume` facts.

Evidence and limits. The authors report stable training for more than 300 RL steps, over 18k training samples, and 112M generated tokens (§4.2, p. 6). Figures 4–5 show GRPO collapsing toward very short traces and DAPO toward pathological verbosity, while rebalanced weighting stays between them. Inference: the study does not establish η = 0.6 as universal; it is an empirical choice on these models.

## technique 4: auxiliary fluency judge

What it is. A second LLM checks only behavioral pathologies in the generated trace: repetition, loops, malformed meta-commentary, irrelevant insertions, and abrupt unsupported verdicts. An anomalous sample is invalid for reward regardless of its final binary answer. The paper emphasizes: “The judge is not asked to re-solve the proof problem or reassess the mathematical correctness of the verdict.” (§4.2, p. 6)

How to apply it. (1) Run the main verifier and obtain its trace and verdict. (2) Run a no-reasoning auxiliary judge (the paper uses DeepSeek-V3.1-chat). (3) If the judge detects a pathology, suppress the reward for that rollout. (4) Otherwise use the mathematical verdict reward. (5) Monitor anomaly rate and manually sample flagged outputs.

Verus form. Inference: apply this filter to agent-generated proof explanations before using them as training data, while separately requiring Verus success. A fluent trace can still encode a false contract, so fluency is a hygiene signal only.

Evidence and limits. In one sampled interval, the judge flagged 0.6%–2.0% of outputs; manual inspection estimated 96% true-positive and 96% true-negative rates (§4.2, p. 6). It adds about 20% wall-clock overhead (Appendix A.7). Inference: these rates use the manually inspected flagged/unflagged outputs as denominators and are not mathematical soundness rates.

## results, trust, and product threat

The held-out human test has 238 question-proof pairs from 51 questions: 141 positive and 97 negative, all double-labeled (§3.3, p. 4). Accuracy is Avg@8, the average over eight independent rollouts. ProofVerifier-8B/14B/32B obtain 76.8/79.0/82.4%, compared with base 8B/14B/32B 71.6/71.9/72.5% (Table 2). On OPC and ProofBench, ProofVerifier-8B scores 75.7 and 67.5, while 32B scores 81.3 and 69.4 (Table 3). Best-of-k reranking uses 18 problems and 48 candidates each, totaling 864 human-annotated pairs (§5.4).

The paper proves no soundness theorem. Trusted components include LLM labels, human audit judgments, model checkpoints, reward implementation, benchmark annotations, and the question-level split. Inference: a VeruLaw product should use ProofVerifier to choose which candidate to submit to Verus, then record Verus's compiler/solver result as the acceptance evidence. Existing learned proof-verifier datasets and RL recipes already cover this natural-language setting; VL should not claim novelty for reproducing them without a Rust-specific, Verus-grounded benchmark.

## techniques for the catalog

- three-axis QPC diversification — vary source, generation method, and model to cover proof styles and error modes
- unanimity plus slice audit — keep five-way-agreement labels and human-audit generation regimes at escalating sampling rates
- balanced token weighting — interpolate per-response and global normalization to avoid short-trace and long-trace collapse
- fluency reward filter — suppress binary rewards for repetitive, looping, malformed, or unsupported reasoning traces
- best-of-k verifier reranking — sample candidate proofs and select the one with the highest verifier score
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
