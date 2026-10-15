# Neural Theorem Proving: Generating and Structuring Proofs for Formal Verification
(authored by agents unless marked 🧑)
Tag: `rao2025neural`, [paper](https://www.semanticscholar.org/paper/11ab53416b97f94df7d38df80b01d11a228bc6c3)

## purpose and result

ProofSeek combines natural-language formalization, whole-proof generation, and checker-guided proof construction for Isabelle/HOL. Its model is DeepSeek-Math-7B-rl, first adapted with supervised fine-tuning (SFT) and then with Group Relative Policy Optimization (GRPO) using proof-checking rewards. The abstract describes the design directly: “Our framework includes 3 components: generating natural language statements of the code to be verified, an LLM that generates formal proofs for the given statement, and a module employing heuristics for building the final proof.” (Abstract, p. 1)

Inference: for Verus, the useful architecture is a front end that turns Rust or a policy into explicit specifications, a model that proposes proof code, and a loop that runs Verus after every candidate. Isabelle syntax, PISA, and its ATP methods do not carry over as Verus features.

## technique 1: two-stage proof-model training

What it is. ProofSeek treats complete Isabelle proofs as code completion. SFT teaches syntactically valid proof text from theorem-proof pairs; RL then samples several candidates and ranks them by relative proof rewards. The paper states: “We employ a two-stage fine-tuning process to train the LLM, where we leverage SFT-based training to enable the model to generate syntactically valid Isabelle code, and RL-based training to encourage the model to generate semantically valid Isabelle code.” (Section 1, p. 2)

How to apply it.
1. Start from FVELER's 26,192 statement-proof pairs (Section 3.1.1, p. 5).
2. Use PISA to retain 1,138 self-contained proofs for RL; allocate the remaining 25,054 pairs to SFT (Section 3.1.1, p. 5).
3. Prompt GPT-4o on 2,000 of those statements to create natural-language descriptions; 1,981 resulting triples form the SFT set, while 1,138 natural-language/formal-proof pairs form the RL set (Section 3.1.1, p. 5).
4. Fine-tune DeepSeek-Math-7B-rl with parameter-efficient LoRA and Unsloth's SFTTrainer (Section 3.1.2, p. 5).
5. For RL, sample a group of proofs per prompt and apply GRPO, using correctness comparison and PISA verification rewards. Isabelle-verified candidates receive reward 1; others receive 0 (Section 3.1.3, p. 6).

Verus form. Inference: build a corpus of Rust functions paired with `requires`, `ensures`, loop `invariant` declarations, and checked `proof fn` bodies. SFT can teach source shape; a GRPO-like loop can reward only patches accepted by Verus. Do not use a `proof fn` at runtime, and do not treat model likelihood as evidence. The contract and verifier remain explicit.

Evidence and limits. The paper's SFT and RL sets are derived from one Isabelle corpus, and the filtering excludes correct proofs requiring extra dependencies. The 0/1 verifier reward says only whether PISA accepts a candidate; it does not assess specification quality or proof maintainability. Inference: Verus training would inherit the same danger if weak or incorrect contracts are used as labels.

## technique 2: staged autoformalization

What it is. ProofSeek turns a natural-language statement into a formal theorem through four intermediate representations: an informal description, an informal proof, a formal statement, and finally prover syntax. The formal representation explicitly contains datatype definitions, record definitions, logical functions, and a quantified implication theorem (Algorithm 1, lines 3–6; Section 3.2.2, pp. 6–7). The paper says, “The generated informal proof pi allows the generated formalization S to be more consistent and faithful.” (Section 3.2.2, p. 7)

How to apply it.
1. Give the model natural-language input `s`.
2. Generate an informal description `d` that clarifies entities and semantics (Section 3.2.1, p. 7).
3. Generate an informal proof `p` as a reasoning skeleton (Section 3.2.1, p. 7).
4. Generate datatype set `D`, record set `R`, and logical functions `F` from that skeleton (Section 3.2.2, p. 7).
5. Emit a final theorem of the form `∀x ∈ X, P(x) ⇒ Q(x)` and translate it to Isabelle/HOL (Algorithm 1, lines 3–6).

The AWS example extracts `Actions`, `Resources`, `Effects`, and `Conditions` from each S3 policy and turns them into Isabelle logic types (Section 4.1.2, p. 9). In the generated-policy scenario, GPT-4o formalizes policies iteratively, using manually curated pairs as few-shot examples (Section 4.1.2, p. 9).

Verus form. Inference: map datatype and record stages to Rust types and ghost/spec data; map `F` to `spec fn` definitions; map the final implication to a function contract with `requires` and `ensures`. A generated informal proof is guidance only. Verus must check the concrete contract and proof. The paper's Isabelle record syntax and quantified theorem syntax cannot be copied directly.

Evidence and limits. The 25-policy curated dataset is manually formalized, while the generated dataset has 243 policies (Section 4.1.2, p. 9). The curated set therefore measures proving of prepared statements more than end-to-end natural-language correctness. The paper does not independently establish that GPT-4o's formal statement preserves every policy intent. Inference: a Verus product needs a human or separate semantic test for contract adequacy.

## technique 3: checker-guided proof construction

What it is. ProofSeek represents proof search as a state transition system `(A, S, T)`, where `A` is a finite action set, `S` proof states, and `T : S × A → S` the inference transition (Section 3.3, p. 8). A model proposes a step; an automated theorem prover (ATP) validates it; failed steps are repaired by efficient recursive proving (ERP), then by heuristic tactics; if all fail, the algorithm backtracks to the innermost valid block. The method section gives this explicit sequence: “ATP validation: Each generated proof step is validated using ATPs.” (Section 3.3, p. 8)

How to apply it.
1. Encode the current theorem and proof state, and define the available proof actions (Algorithm 1, lines 7–10).
2. Select `a* = arg max_a P(a|S)` from the fine-tuned model (Algorithm 1, line 12).
3. Validate each step with ATP; the paper uses PISA and Isabelle 2022 (Section 4.1, p. 8).
4. If validation fails, sample a corrected step with ERP; if ERP fails, run `FailedTactics2ATP` heuristics (Algorithm 1, lines 15–18).
5. If no valid step exists, reset to `InnermostBlock(i,a)` and retry (Algorithm 1, lines 19–21).
6. Return a complete verified proof or the failure state (Algorithm 1, lines 21–22).

Verus form. Inference: represent `S` as the current Verus source plus failed `assert`, `ensures`, or `invariant` obligations. Actions can add an `assert`, call a `proof fn`, reveal an opaque definition, or strengthen a loop invariant. Run Verus after each action; use a proof-block backtrack when all candidates fail. Verus does not expose the paper's retained Isabelle state transition API, so this is an external orchestration layer.

Evidence and limits. The experiment uses eight Isabelle methods plus Sledgehammer, with 10-second per-step and 40-second Sledgehammer timeouts and four PISA instances (Section 4.1, p. 8). These settings are part of the measured system. Inference: a Verus comparison must report verifier version, solver settings, timeout, and whether retries share cached state.

## evidence and contradictions

The benchmark table labels the miniF2F dataset as “245 Problems,” although the preceding description says the validation and test sets each contain 244, totaling 488 (Section 4.1.1, p. 9; Table 1, p. 9). This is an internal denominator inconsistency. Table 1 reports ProofSeek success of 41.8% with ERP and 40.1% without ERP on the table's 245-problem label; DeepSeek is 42.2% and 41.8% under the same label. For curated Quacky, all four settings are 96.0% over 25 policies. For generated Quacky, ProofSeek is 66.6% with ERP and 69.1% without ERP over 243 policies; DeepSeek is 63.3% and 66.6%. The paper's discussion claims a 3% improvement, but the generated-policy comparison is 69.1% − 66.6% = 2.5 percentage points, and the miniF2F result is below DeepSeek. These claims should not be merged into a general accuracy claim.

What is proved is whatever Isabelle accepts for the generated formal statement. What is measured is success rate, average attempts, and execution time under the stated hardware and budgets. Trusted components include the natural-language formalization, GPT-4o-generated labels, Isabelle/PISA, ATP implementations, training code, and the correctness of the policy semantics. The paper's own future-work discussion says benchmark results remain behind state of the art and that further fine-tuning is needed (Section 5, p. 10).

Inference: threat to agent-written verified Rust is high for contract translation and moderate for proof search. The checker loop can filter invalid Rust proofs, but it cannot detect a contract that omits the intended behavior. The generated patch, Verus version, solver, external-library specifications, Rust compiler, and proof erasure must remain auditable trust boundaries.

## techniques for the catalog

- two-stage prover training — teach syntax with SFT, then optimize relative proof-checking rewards with GRPO
- staged autoformalization — pass from natural language through description and informal proof to datatypes, records, functions, and a formal theorem
- checker-guided proof construction — generate a step, validate it, repair with recursive and heuristic methods, and backtrack on failure
- verifier-backed policy proving — extract policy fields into formal types and measure complete checked proofs over curated and generated denominators

Checked 2026-10-15 against the paper by a Codex agent for neural_theorem_proving_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
