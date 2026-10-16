# Multilingual Mathematical Autoformalization
(authored by agents unless marked 🧑)
Tag: `jiang2023multilingual`, [paper](http://arxiv.org/abs/2311.03755v2)

## what the paper builds

Jiang, Li, and Jamnik build MMA, a dataset of informal-formal mathematical pairs, by translating formal statements into natural language and then training a model in the reverse direction. The paper's abstract says: “In this work, we create MMA, a large, flexible, multilingual, and multi-domain dataset of informal-formal pairs, by using a language model to translate in the reverse direction, that is, from formal mathematical statements into corresponding informal ones.” (abstract, p. 1). The source libraries are Isabelle’s Archive of Formal Proofs and Lean4 mathlib4. The authors extract 244,238 Isabelle and 88,536 Lean4 statements, for 332,774 total pairs (§3, pp. 3–4; Table 2, p. 4).

The key data technique is reverse translation (distilled back-translation). Formal statements already contain precise information, while natural language can omit details. The authors therefore use GPT-4 to generate informal descriptions, then fine-tune LLaMA-33B to map those descriptions back to formal statements. Their prompt is: “Translate the statement in {Isabelle|Lean} to natural language:” (§3, p. 4). They generate at most 512 tokens with greedy sampling, temperature 0.0, remove the mechanical prefix “The lemma states that”, and capitalize the remainder (§3, p. 4).

## technique: construct noisy parallel data from formal libraries

Use this when a verified corpus has formal statements but too few natural-language descriptions. First extract theorem statements from each formal library. Second call a capable language model on each statement with an instruction prompt. Third retain the formal statement and generated natural-language output as a pair. Fourth optionally normalize recurring boilerplate. The authors use Portal to Isabelle and LeanDojo for extraction (§3, p. 4), and deliberately target all available formalized content rather than a small hand-selected benchmark.

The method's own limitation is essential: the generated language is noisy. The paper gives the concrete example that GPT-4 interprets Isabelle `eint` as integers with both positive and negative infinity, although in the p-adic theory it extends integers only with positive infinity (§3, p. 4). Thus MMA is an approximation, not ground truth. The authors write: “Rather than the ground truth, informalisations in MMA should be treated as noisy approximations of it.” (§3, p. 4).

Inference: for Verus, mine existing Rust/Verus specifications, function contracts, and proof lemmas as the formal side. Ask a model to describe each contract, but keep the original Verus text authoritative and attach compilation or verification results. Do not train on generated prose as if it were a specification; preserve a way to reject semantic drift.

## technique: multilingual fine-tuning and human usefulness evaluation

Train one open model on the combined Isabelle and Lean4 pairs, and compare it with models trained on each language separately for the same number of steps (§4, pp. 5–7). Evaluate two distinct outcomes. First, compile generated statements. Second, have experts rate correction effort from 0 (none) to 4 (similar to formalizing from scratch), rather than treating compilation as correctness (§5, pp. 6–7). The paper says, “We define formalisations that have correction effort levels 0 (none) or 1 (trivial) as ‘acceptable with no or minor corrections.’” (§5, p. 7).

The test samples 50 miniF2F and 50 ProofNet problems, 100 per benchmark pair, and uses two expert formal-proof users (§5, p. 6). On the jointly fine-tuned model, 16% of Isabelle and 18% of Lean4 outputs are acceptable with minor corrections (§5, p. 7). The abstract reports the same range: 16–18% acceptable with minimal corrections, versus 0% for the base model. Compilation differs: for the jointly trained model, Isabelle generation compiles on 24% of miniF2F and 18% of ProofNet; Lean4 generation compiles on 20% and 4%, respectively (Table 3, p. 6). These are percentages of 50 sampled problems per benchmark, and compilation is only syntactic legality.

The comparison supports transfer but is not universal. Joint training's final Isabelle token accuracy is 1 percentage point above monolingual training, while Lean4 is 0.7 points lower; the joint model saw fewer tokens from each language (§5, p. 6). Inference: a Verus corpus could mix specification idioms or related verified languages, but the benefit must be measured on held-out Verus tasks and not inferred from cross-language transfer.

## Verus application and limits

A Verus adaptation would use `spec fn`, `requires`, `ensures`, and proof functions as the formal target, then compile and verify generated candidates. A candidate that parses but fails the Verus verifier should be scored separately from one that verifies. The paper's expert correction scale is useful for measuring how much work remains, but its Isabelle and Lean syntax do not carry over. Inference: add counterexample or verifier diagnostics to the evaluation because a legal statement can still encode the wrong theorem.

The authors caution that autoformalization quality is hard to assess automatically: “language models are very capable of generating formal statements that are syntactically correct but do not express the meaning of the informal statements” (§6, p. 8). Their manual evaluation covers 100 random problems for each of six model-inference language pairs, so sampling variance remains. They report one GPT-4 informalization cost of roughly US$3500 and only one description per formal statement (§7, p. 9). Trusted components include GPT-4's semantic fidelity, extraction tools, the fine-tuning implementation, and expert judgments. Inference: threat to a product that emits agent-written verified Rust is high at the specification boundary; a noisy natural-language paraphrase can cause a model to generate a different but compiling contract.

## techniques for the catalog

- distilled reverse translation: generate informal descriptions from formal libraries, then train formalization on the resulting pairs
- multilingual transfer: jointly fine-tune on multiple formal languages and compare against equal-budget monolingual models
- correction-effort evaluation: rate human repair cost separately from compilation and exact correctness
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
