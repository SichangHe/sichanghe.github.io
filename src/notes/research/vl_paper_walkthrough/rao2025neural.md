# Neural Theorem Proving: Generating and Structuring Proofs for Formal Verification
(authored by agents unless marked 🧑)
Tag: `rao2025neural`, [paper](https://arxiv.org/abs/2504.17017v2)

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

Evidence and limits. The paper's SFT and RL sets are derived from one Isabelle corpus, and the filtering excludes correct proofs requiring extra dependencies. Inference: the 0/1 verifier reward establishes acceptance of a candidate, not specification quality or proof maintainability. Verus training would inherit the same danger if weak or incorrect contracts were used as labels.

## technique 2: staged autoformalization

What it is. ProofSeek uses four stages: natural-language input, an informal description, an informal proof, and a formal statement in prover syntax. The formal representation explicitly contains datatype definitions, record definitions, logical functions, and a quantified implication theorem (Algorithm 1, lines 3–6; Section 3.2.2, pp. 6–7). Section 3.2.2 states: “We employ stepwise prompting to sequentially construct the theorem statement:” (p. 7), followed by the four stages above.

How to apply it.
1. Give the model natural-language input `s`.
2. Generate an informal description `d` that clarifies entities and semantics (Section 3.2.1, p. 7).
3. Generate an informal proof `p` as a reasoning skeleton (Section 3.2.1, p. 7).
4. Generate datatype set `D`, record set `R`, and logical functions `F` from that skeleton (Section 3.2.2, p. 7).
5. Emit an Isabelle/HOL theorem statement of the form `∀x ∈ X, P(x) ⇒ Q(x)` (Algorithm 1, lines 3–6).

The AWS example extracts `Actions`, `Resources`, `Effects`, and `Conditions` from each S3 policy and turns them into Isabelle logic types (Section 4.1.2, p. 9). In the generated-policy scenario, GPT-4o formalizes policies iteratively, using manually curated pairs as few-shot examples (Section 4.1.2, p. 9).

Verus form. Inference: map datatype and record stages to Rust types and ghost/spec data; map `F` to `spec fn` definitions; map the final implication to a function contract with `requires` and `ensures`. A generated informal proof is guidance only. Verus must check the concrete contract and proof. The paper's Isabelle record syntax and quantified theorem syntax cannot be copied directly.

Evidence and limits. The 25-policy curated dataset is manually formalized, while the generated dataset has 243 policies (Section 4.1.2, p. 9). Inference: the curated set measures proving of prepared statements rather than independently validating natural-language translation. The paper reports no independent check that GPT-4o's formal statements preserve every policy intent; a Verus product would need separate review or testing of contract adequacy.

## technique 3: checker-guided proof construction

What it is. ProofSeek represents proof search as a state transition system `(A, S, T)`, where `A` is a finite action set, `S` a finite set of proof states, and `T : S × A → S` the inference transition (Algorithm 1, lines 7–10, p. 6; Section 3.3, p. 7). A model proposes a step; an automated theorem prover (ATP) validates it; failed steps are repaired by efficient recursive proving (ERP), then by heuristic tactics; if all fail, the algorithm backtracks to the innermost valid block. The method section states: “Each generated proof step is validated using ATPs.” It then qualifies when the ATP evaluation is invoked: “If a proof step is not trivially correct and has sorry proofs the system invokes an ATP-based evaluation:” (Section 3.3, p. 8).

How to apply it.
1. Encode the current theorem and proof state, and define the available proof actions (Algorithm 1, lines 7–10).
2. Select `a* = arg max_a P(a|S)` from the fine-tuned model (Algorithm 1, line 12).
3. Validate each step with ATP; the paper uses PISA and Isabelle 2022 (Section 4.1, p. 8).
4. If validation fails, sample a corrected step with ERP; if ERP fails, run `FailedTactics2ATP` heuristics (Algorithm 1, lines 15–18).
5. If no valid step exists, reset to `InnermostBlock(i,a)` and retry (Algorithm 1, lines 19–21).
6. Return a complete verified proof or the failure state (Algorithm 1, lines 21–22).

Verus form. Inference: represent `S` as the current Verus source plus failed `assert`, `ensures`, or `invariant` obligations. Actions can add an `assert`, call a `proof fn`, reveal an opaque definition, or strengthen a loop invariant. Run Verus after each action; use a proof-block backtrack when all candidates fail. Verus does not expose the paper's retained Isabelle state transition API, so this is an external orchestration layer.

Evidence and limits. Section 4.1 reports “8 Isabelle proof methods” plus Sledgehammer, but its parenthesized list contains ten entries, including `auto` twice (p. 8). It specifies 10-second per-step and 40-second Sledgehammer timeouts and four PISA instances (p. 8). Inference: the method count is internally inconsistent; the listed methods and settings should be retained when interpreting the measurements. Inference: a Verus comparison must report verifier version, solver settings, timeout, and whether retries share cached state.

## evidence and contradictions

The benchmark table labels miniF2F as “MiniF2F Dataset (245 Problems)” (Table 1, p. 10), while Section 4.1.1 says: “The dataset is split into a validation set and a test set, each containing 244 problems” (p. 9). Inference: the test denominator is internally inconsistent. Table 1 reports ProofSeek success of 41.8% with ERP and 40.1% without ERP; DeepSeek is 42.2% and 41.8%, respectively. For curated Quacky, all four settings are 96.0% over 25 problems. For generated Quacky, ProofSeek is 66.6% with ERP and 69.1% without ERP over 243 problems; DeepSeek is 63.3% and 66.6%, respectively (Table 1, p. 10).

The introduction claims “a 3% improvement in proof success rate” and “a 20% reduction in execution time” (Section 1, p. 2). Inference: Table 1 supports generated-policy success differences of 3.3 percentage points with ERP and 2.5 without ERP; these are not relative percentage increases. Its generated-policy times are 00:20:34 versus 00:26:52 with ERP, and 00:20:27 versus 00:24:36 without ERP, reductions of approximately 23.4% and 16.9%, respectively. ProofSeek's miniF2F success is lower than DeepSeek's in both settings; the introductory claim should not be read as a general accuracy improvement.

The evaluation measures proof success rate, average attempts, and total execution time (Section 4.2, p. 9), with a sample budget of 10, 1-shot prompting, temperature 0.6, and top p 0.95 (Section 4.1, p. 8). The training base is DeepSeek-Math-7B-rl (Section 3.1.2, p. 5), whereas the comparison model is Deepseek-Math-7b-base (Section 4.1, p. 8). Inference: this comparison does not isolate the effects of the new SFT and RL stages from differences between the starting models.

The authors state: “Although our framework demonstrated its practical utility for real-world use cases, our results on benchmark datasets remain behind SOTA approaches.” They describe the training benefit as speculation: “Additionally, we speculate that the fine-tuning process enhanced the theorem-proving capability of the language model, as evidenced by the smaller number of proof attempts required to complete proofs.” (Section 5, p. 10)

Inference: a checked Isabelle proof establishes the generated formal statement, while correspondence to the original policy requires separate evidence. Appendix A's example is an EC2 policy, despite the S3 framing of the case study (Listing 2, pp. 13–14). Its formal resource type omits account and region, and its `policy_allows` definition ignores the action parameter `a` (Listing 5, pp. 14–15). This illustrates why successful proof checking alone cannot establish faithful policy translation. I have not executed this example.

Inference: for agent-written verified Rust, the main unresolved issue is contract translation. The checker loop can filter invalid Rust proofs, but it cannot detect a contract that omits the intended behavior. The generated patch, Verus version, solver, external-library specifications, Rust compiler, and proof erasure must remain auditable trust boundaries.

## techniques for the catalog

- two-stage prover training — teach syntax with SFT, then optimize relative proof-checking rewards with GRPO
- staged autoformalization — pass from natural language through description and informal proof to datatypes, records, functions, and a formal theorem
- checker-guided proof construction — generate a step, validate it, repair with recursive and heuristic methods, and backtrack on failure
- verifier-backed policy proving — extract policy fields into formal types and measure complete checked proofs over curated and generated denominators

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "We use some of the manually curated policy-formal statement pairs as few-shot examples to guide the model along."): checked the entire paper, study quotations, numbers, section and page references, training and proof-construction steps, and limitations; corrected the paper link, autoformalization stages, quotation notation, page references, method-count ambiguity, attribution and interpretation of improvements, and inference labels; added the training/comparison model distinction and the appendix's policy-translation limitation; did not inspect repository artifacts or cited papers, reproduce experiments, or validate the proposed Verus adaptations.
