# Contextual Drag: How Errors in the Context Affect LLM Reasoning
(authored by agents unless marked 🧑)
Tag: `cheng2026contextual`, [paper](https://doi.org/10.1016/j.socec.2010.10)

## phenomenon and measurement
Cheng et al. study whether failed attempts left in a model's context improve later attempts. They define contextual drag as a performance drop and structural bias caused by incorrect drafts. The abstract reports that “contextual drag induces 10–20% performance drops” across 11 models and eight tasks (Abstract, p. 1). Their controlled comparison is Direct (clean slate) versus 1F or 2F (one or two incorrect drafts in context), with the model explicitly told to verify drafts before solving (§2.1, p. 3). Problems are filtered so anchor models have both successes and failures, and correctness is checked by parsing final answers against a symbolic verifier (§2.1, p. 3).

## technique: measure context drag before trusting refinement
Use this whenever a proof-repair loop feeds failed candidates back to a model. Build an evaluation set with mixed-quality drafts, then:

1. generate clean-slate answers and select top-three open-weight models as anchor sources (§2.1, p. 3)
2. retain questions where anchors have at least two correct and two incorrect responses, avoiding trivial or impossible items (§2.1, p. 3)
3. evaluate Direct, 1F, and 2F; in 1F/2F explicitly ask the model to verify each draft before producing a new answer (§2.1, p. 3)
4. parse final answers and compare them with ground truth using a symbolic verifier (§2.1, p. 3)
5. report performance change and, for structured tasks, compare reasoning trees with tree edit distance (§2.3, pp. 4–5)

Table 1 uses 16 generations per question. For example, GPT-OSS-20B on AIME24 falls from 51.88% Direct to 17.50% with one incorrect draft and 21.25% with two; the AIME24 subset denominator is 10/30 (§2.1, Table 1, pp. 2–3). The denominator is the filtered subset and 16 generations per question, not all benchmark questions. In iterative refinement, GPT-OSS-20B's accuracy declines across 16 iterations while majority voting improves (§2.2, Figure 2, p. 4). The authors warn: “without mechanisms to detect, filter, or reset from low-quality drafts in the context, the model can become increasingly biased toward the erroneous context.” (§2.2, p. 4)

Inference: VL should benchmark proof repair with clean, failed, and mixed diagnostics. A rising verification rate after feeding failures back can conceal structural copying of a bad invariant or contract; compare independent retries and a clean-slate baseline.

## technique: quantify structural copying with tree edit distance
Use this when solutions have a parseable tree. Game of 24 expressions use four integers exactly once and binary operations; each expression is an operation tree (§2.3, p. 4). For each incorrect draft, generate Direct and 1F/2F responses, compute tree edit distance (TED) to the draft, and compare the means. Lower TED indicates structural similarity, not correctness (§2.3, p. 5). Conditioned responses remain closer to the erroneous draft than Direct responses across models (Figure 3, p. 5).

Inference: a Verus analogue can parse candidate proof syntax or normalized verifier obligations, then compute structural similarity of failed and subsequent proof states. This is an analysis signal only: Verus's AST and solver traces are not the paper's expression trees, and similarity cannot establish semantic copying or unsoundness.

## technique: test external and self-detected error signals separately
To test whether drag is merely failure to notice an error, the authors add an external prompt warning that the draft is incorrect and instructing the model not to copy it (§3.1, p. 5). Performance still drops and Game-of-24 outputs remain structurally close to the draft; “External error signals alone are insufficient to mitigate contextual drag.” (§3.1, p. 6) They then retain only 1F trajectories whose structured verdict correctly says the draft is incorrect (§3.2, p. 6). This post-hoc subset is an oracle-filtered analysis and is not comparable to the full 1F population. Nemotron models partially recover or exceed Direct, while GPT-OSS-20B remains strongly degraded (Figure 5, p. 6).

Inference: in a Verus repair system, a compiler error or failed proof should be represented explicitly, but the orchestration must test whether the next candidate changes its proof structure rather than merely repeating the failed invariant. Do not interpret a model's “incorrect” label as evidence that it actually escaped the failed proof path.

## technique: denoise context or train a conditional fallback
The paper evaluates two test-time denoisers (§4.1, p. 6): Revise asks the model to improve each draft; Filter asks it to keep only correct/useful intermediate steps using a clean-slate high-level strategy. Both improve over 1F but fail to restore Direct; Filter is more robust, and denoising costs at least 2× inference (§4.1.1–4.1.2, pp. 6–7). Table 2 gives denominators as the same benchmark subsets. For GPT-OSS-20B on HMMT25, Direct is 58.63%, Revise 62.20%, Filter 45.83%, and 1F 20.54% (§4.1.2, Table 2, p. 7).

The targeted fallback trains GPT-OSS-20B on 40,000 correct-draft and 40,000 incorrect-draft pairs (§4.2, p. 7). Each incorrect example concatenates a verification trajectory that says “Incorrect” with a clean-slate trajectory; each correct example trains conditional reuse. Table 3 reports 1F gains: AIME24 rises from 17.5% baseline to 40.6% after fine-tuning, but remains below Direct (§4.2.1, Table 3, p. 7). Appendix Table 15 exposes a tradeoff: on 1T (correct drafts), fine-tuned pass@1 falls from 73.12% to 50.63% on AIME24 (Appendix F.6, p. 34).

Inference: a VL fallback should drop failed proof context and regenerate from source/specification state, while retaining verified lemmas selectively. Training must include correct-context cases so the model does not learn to discard useful proof facts. The paper's method is a prompting/training policy; it does not prove Rust properties.

## trust, limits, and product threat
Symbolic answer checkers and benchmark ground truth are trusted for evaluation; model verdicts, denoising, TED, and generated explanations are not proofs. The paper's 10–20% drops are averages across tasks and models, with severe variation; external feedback and self-verification do not uniformly remove drag. Appendix F's 40k/40k synthesis relies on math-verify and model-generated verification traces, so the training labels depend on an external checker and curation pipeline.

Inference: the threat to VL is high for iterative agent workflows that retain failed Verus diagnostics indefinitely. A failed proof can bias retries toward the same invariant or contract mistake even when the model acknowledges failure. The paper's strongest reusable safeguard is empirical: measure clean-slate versus failure-conditioned repair, bound retries, and reset or filter context when structural repetition appears. Existing work already covers context denoising and fallback fine-tuning; VL should not redo those as novelty claims without a Verus-specific benchmark.

## techniques for the catalog
- drag benchmark — compare clean-slate and failed-draft-conditioned generations on matched filtered problems
- structural similarity audit — use parsed proof trees and edit distance to detect repeated failed patterns
- independent error-signal test — distinguish external warnings from model self-verification with separate conditions
- context denoising — revise or filter drafts before reuse, measuring cost and residual degradation
- conditional fallback training — train incorrect-draft verification followed by clean-slate regeneration and correct-draft reuse
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
