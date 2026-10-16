# Mathesis: Towards Formal Theorem Proving from Natural Languages
(authored by agents unless marked 🧑)
Tag: `yu2025mathesis`, [paper](http://arxiv.org/abs/2506.07047v1)

## scope and result

Mathesis is an end-to-end Lean 4 pipeline that translates a natural-language (NL) problem into candidate formal statements, validates syntax and meaning, and sends the selected statement to a prover. The paper states: “The task begins with a given natural language (NL) problem statement and entails its automatic translation into formal language (FL), followed by the generation of a formal proof.” (Sec. 1, p. 2). Its components are Mathesis-Autoformalizer, LeanScorer, Mathesis-Prover, and the 488-problem Gaokao-Formal benchmark. The paper reports that the full system reaches 64.3% on MiniF2F-Test and 18.0% on Gaokao-Formal with 32 proof attempts (Table 5, p. 10).

The paper later says that autoformalizer enhancements improve Gaokao-Formal by “nearly double performance with an 11.2% improvement (7.2% to 18.4%).” (Sec. 5.4, p. 10).
Inference: Table 5 reports 18.0% for Mathesis-Prover with Mathesis-HPO and 7.2% for the compared Herald configuration, so the displayed table and the prose do not agree; the denominator is the same 32-attempt search budget, but the paper does not explain the 18.4% value.

Inference: For VeruLaw (VL), the relevant design is a staged NL-to-Rust-to-Verus pipeline in which compilation, semantic checks, and proof search are separate gates. Lean results do not establish Verus performance because the languages, libraries, and proof obligations differ.

## technique: compile and semantically score candidate formalizations

What it is: generate several Lean statements for one NL problem, reject statements that fail Lean syntax/type checking, and rank the remaining statements with a semantic checker. Figure 3 and Section 3 describe this as autoformalization, validation, and proving. The paper says: “The formal statement that passes the Lean compiler and receives the highest semantic assessment score is then passed to an automated theorem prover and generates a complete, machine-verifiable proof in Lean.” (Sec. 3, p. 4).

Inference: When to use it: use this when an informal requirement can have multiple plausible formal encodings and a prover would otherwise spend effort proving an incorrect or circular statement. The paper's Figure 2 gives two failures: one adds the desired conclusion as an assumption; another changes a summation range.

How to do it:

1. Give the autoformalizer the NL statement and sample several Lean 4 candidates. Section 3.1 defines a group of `G` outputs `{o1, ..., oG}` from policy `πθ(·|x)`.
2. Run each candidate through Lean. The verification reward is one if `Vlean(oi)` succeeds, where the generated theorem is checked up to `:= by sorry` (Sec. 3.1.1, p. 4).
3. Run LeanScorer on candidates that compile. The highest-scoring candidate is sent to the prover (Sec. 3, p. 4).
4. Ask the prover for a complete proof and run Lean again; only a Lean-checked proof counts as successful.

Inference: In Verus, the analogous loop can generate a Rust/Verus function with `requires` and `ensures`, compile it with Verus, then use a separate semantic checker to compare the contract with the NL requirement. The proof stage should use Verus `spec fn`, `requires`, `ensures`, loop `invariant`, and proof functions, rather than Lean syntax. The semantic checker cannot replace Verus's proof check.

Evidence: On Gaokao-Formal, Table 4 reports the Mathesis-Autoformalizer-HPO LC+LSC@6 as 71%, versus Kimina-7B at 49%; on MiniF2F-Test the corresponding values are 96% and 91% (Table 4, p. 9). End-to-end success with Mathesis-Prover and Mathesis-HPO is 64.3% on MiniF2F-Test and 18.0% on Gaokao-Formal at search budget 32 (Table 5, p. 10). These denominators are the benchmark problems and a maximum of 32 proof attempts per problem; the paper does not provide the raw problem count for every percentage in Table 5.

Limits and assumptions: Lean compilation checks syntax and typing, not that the NL meaning was preserved. The paper explicitly notes that “improper formalization can yield misleading proof successes or render problems unprovable.” (Sec. 1, p. 2). The semantic checker is itself an LLM-based procedure and can produce false positives. The authors report that statements ending in `: True := by sorry` sometimes passed syntax and LeanScorer but were excluded from end-to-end metrics (Sec. 5.4, p. 10).

## technique: train autoformalization with composite RL rewards

What it is: optimize a translator with two binary rewards: semantic equivalence to the NL statement and Lean syntactic/type validity. The paper defines `Rsem(x, oi)=1` when an auxiliary LLM judge labels the candidate “Appropriate,” and `Rver(oi)=1` when the Lean verifier succeeds (Sec. 3.1.1, p. 4). It sums them as `ri = Rsem + Rver` and updates the policy with Group Relative Policy Optimization (GRPO).

Inference: When to use it: use this training pattern when paired NL/formal examples are insufficient and executable feedback is available for each candidate. It makes the model optimize the properties that can be checked during training.

How to do it:

1. Initialize `πθ` from an SFT model and keep a reference policy `πref` (Sec. 3.1.1).
2. For each NL input `x`, sample `G` candidate statements.
3. Ask a semantic judge whether each candidate preserves the NL meaning, producing `Rsem`.
4. Run Lean on each candidate, producing `Rver`.
5. Add the rewards and apply GRPO so higher-reward outputs are preferred within the group while KL regularization limits drift from `πref`.
6. Curate training inputs with BERTopic embeddings, dimensionality reduction, clustering, and mapping to mathematical categories. Roll out `k=14` candidates per problem and retain problems with reward variance; combine them with 8,000 randomly sampled Lean Workbook problems. The final training set is approximately 32,000 problems (Sec. 3.1.1, p. 4).

The appendix gives concrete settings: `G=14`, KL coefficient `β=0.04`, one policy update per group (`μ=1`), LoRA rank 16 with `α=32`, AdamW learning rate `1×10^-6`, and parallel reward computation with Python `asyncio` (App. A.1, p. 16).

Inference: A VL implementation could use Verus success as the verification reward and a requirement-to-contract judge as the semantic reward. The reward should include contract soundness checks and reject vacuous specifications; the paper's binary semantic reward alone does not establish either property.

Evidence: The paper reports Mathesis-Autoformalizer LC+LSC@6 of 71% on Gaokao-Formal, a 22 percentage-point absolute improvement over Kimina-7B (Table 4 and Sec. 5.3, p. 9). It attributes the gain to “dynamic learning from semantic and syntactic feedback” (Sec. 5.3, p. 9).

Limits: `Rsem` is a binary LLM judgment, and `Rver` checks a statement containing `sorry`, so neither reward proves a complete theorem. The training-data size is approximate (“approximately 32k problems”), and the paper does not report a contamination audit for those sources.

## technique: hierarchical preference optimization using downstream proof success

What it is: first optimize local formalization quality with GRPO, then optimize global usefulness with Direct Preference Optimization (DPO). The paper calls this combined method Hierarchical Preference Optimization (HPO) (Sec. 3.1.2, p. 5).

How to do it:

1. Use the GRPO model to sample formal candidates `yi` for each NL statement `x`.
2. Apply syntactic and semantic validation.
3. Send passing candidates to a prover to generate proofs `zi`.
4. Label successful candidates as preferred tuples `{x, yw, zw}` and failed attempts as rejected tuples `{x, yl, zl}`.
5. Fine-tune with one DPO epoch, learning rate `1×10^-5`, KL coefficient `β=0.1`, warmup ratio 0.05, full-parameter optimization, and DeepSpeed ZeRO-3 offload (Sec. 3.1.2, p. 5).

Inference: For VL, downstream success can mean that Verus proves the generated Rust contract and that generated tests or a trusted specification checker accept the behavior. This aligns synthesis with a proof that is actually useful, while preserving a separate semantic gate.

Evidence: HPO raises Gaokao-Formal LC+LSC@6 from 67% for Mathesis-Autoformalizer to 71% for Mathesis-Autoformalizer-HPO, and MiniF2F-Test LC+LSC@6 from 95% to 96% (Table 4, p. 9). In Table 5, Mathesis-Prover with HPO reaches 18.0% on Gaokao-Formal and 64.3% on MiniF2F-Test at search budget 32 (p. 10).

Limits: DPO relies on a strong base model to produce meaningful candidates; the paper states that its effectiveness “heavily relies on a strong base model to generate meaningful candidate outputs and better exploit preference signals.” (Sec. 3.1.2, p. 5). A successful downstream proof can still prove a wrong or too-weak contract.

## technique: LeanScorer for structured semantic evaluation

What it is: decompose an NL problem into premises and conclusions, classify each formalized subtask as Perfectly Match (A), Minor Inconsistency (B), or Major Inconsistency (C), then aggregate the ratings with a Sugeno Fuzzy Integral into a score from 0 to 1 (Sec. 3.2, pp. 5–6). The paper says: “LeanScorer employs a two-stage process (as shown in Figure 4):” (Sec. 3.2, p. 5).

How to do it:

1. Ask an LLM to list the conditions and conclusion as discrete mathematical subtasks.
2. Ask another LLM to compare each subtask's NL expression with the corresponding Lean expression and assign A, B, or C.
3. Use `f(A)=1.0`, `f(B)=0.5`, and `f(C)=0`.
4. Compute the fuzzy measure: a major inconsistency vetoes the score; one minor inconsistency applies a `0.1` penalty; two or more apply a progressive `0.2` penalty; all-perfect subtasks score 1 (Eq. 3, p. 6).
5. Compute the Sugeno integral and apply a threshold `α` when a binary decision is needed.

Evidence: On a Gaokao subset with human labels, LeanScorer at `α=0.6` has precision 94%, recall 89%, and F1 0.92; LLM-as-a-Judge has 73%, 100%, and 0.85; re-informalization has 93%, 50%, and 0.65 (Table 3, p. 8). The denominator is the paper's human-annotated Gaokao subset; its size is not stated in the table or surrounding text.

Inference: VL could decompose a requirement into safety, functional, and resource obligations, score each generated Verus contract, and veto any missing safety obligation. This is a review aid, not a proof: Verus must still establish the accepted obligations.

Limits: LLM classifications and the fuzzy measure are trusted as evaluation heuristics. A high score can coexist with a wrong formal statement, and a low score can reflect harmless syntactic differences.

## technique: expert-iteration prover with verified data

What it is: train a prover by repeatedly generating candidate proofs, retaining proofs that Lean verifies, and adding them to later supervised training. Section 3.3 says the first round uses DeepSeek-Prover-V2-7B and selects problems that Goedel-Prover cannot solve within pass@4 but the trained prover solves and Lean verifies (p. 6). Appendix A.2 reports two SFT epochs, learning rate `5×10^-5`, and Huawei Atlas 800T A2 hardware.

Inference: When to use it: use verified expert iteration when a prover can produce some correct proofs and those proofs can provide progressively harder training examples.

Inference: A Verus prover could retain only proofs accepted by Verus, then retrain on the Rust/Verus source and proof context. The same bootstrapping risk remains: if no seed proofs solve a class, iteration cannot create evidence for it.

Evidence: In Table 5, Mathesis-Prover with Mathesis-HPO is 64.3% on MiniF2F-Test and 18.0% on Gaokao-Formal, each with 32 attempts per problem (p. 10). The model sometimes exceeds human formalizations on Gaokao; the authors attribute this partly to prover training-data bias toward less explicit LLM formalizations and partly to LeanScorer false positives (Sec. 5.4, p. 10).

Limits: The reported accuracy is benchmark-specific and does not show that every retained proof is mathematically faithful to the original NL statement. The paper also excludes proof attempts ending in `apply?` because they were technically verifiable but lacked substantive reasoning (Sec. 5.4, p. 10).

## what is proved, measured, and trusted

Lean's kernel checks accepted formal proofs. Lean compilation checks candidate statement syntax and types. LeanScorer measures agreement with human semantic labels, and Table 3 reports precision, recall, and F1. Table 4 measures LC and LC+LSC success rates at sample budgets 1 and 6. Table 5 measures downstream proof accuracy at search budget 32. The Gaokao benchmark contains 488 problems across functions (167), sequences and series (150), inequality (28), trigonometry (22), analytic geometry (71), probability/combinatorics (4), and comprehensive questions (46) (Table 1, p. 7).

Inference: VL must keep separate trust boundaries for Verus's verifier, the generated specification, semantic scoring, external libraries, and the Rust compiler/runtime. A proof only establishes the stated Verus contract under the verifier's assumptions.

## implications for VeruLaw and threat assessment

Inference: The largest product threat is semantic error before proof search: an agent can produce a well-typed, provable contract that omits a requirement, just as the paper's Figure 2 shows. A second threat is prover weakness on complex requirements: Gaokao-Formal falls to 18.0% end-to-end success even after HPO. A third is evaluation gaming through vacuous `True` goals or placeholder tactics; the paper found both and removed them from metrics.

Inference: VL should reuse the staged architecture, explicit semantic subtask decomposition, downstream-proof preference data, and verifier-feedback training. It should add Verus-specific contract mutation tests, checks against vacuous `ensures`, and raw denominators for every metric. VL should not redo a generic Lean benchmark; the paper already supplies that pattern and its failure modes.

## techniques for the catalog

- staged formalization and proving — sample formal statements, compile them, semantically rank them, then prove the selected statement
- composite verification rewards — train a translator with semantic-equivalence and compiler/type-check rewards
- hierarchical preference optimization — use GRPO for local correctness and DPO preferences from downstream verified proofs
- structured semantic scoring — decompose requirements, classify each subtask, and aggregate with a veto-capable Sugeno integral
- verified expert iteration — retrain a prover on proof attempts accepted by the proof assistant
- benchmark and metric separation — report syntax, semantic agreement, and end-to-end proof success with their distinct sample/search budgets

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
