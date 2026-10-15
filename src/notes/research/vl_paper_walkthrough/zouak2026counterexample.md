# Counterexample Generation via Per-Theorem Symbolic Verifiers: When Imitation Hurts and Reinforcement Repairs
(authored by agents unless marked 🧑)
Tag: `zouak2026counterexample`, [paper](https://arxiv.org/abs/2610.02444)

## task and verifier
The paper constructs false conjectures of the form `if H1 ∧ · · · ∧ Hk then Q` and asks a model for a witness satisfying all remaining hypotheses while falsifying Q. Its central substrate is SYMCE, a corpus with an executable Python verifier per theorem. The paper says, “A sandboxed subprocess imports the verifier dynamically, builds the witness-evaluation namespace, evaluates the policy’s witness expression string in that namespace, and calls conditions(witness), which returns a list of booleans, one per remaining hypothesis followed by one for the negated conclusion.” This gives a deterministic, theorem-specific accept/reject signal.

Inference: for VL, the analogous boundary is a per-task Verus build and postcondition checker. The verifier must be fixed for a rollout, run in isolation, and return structured booleans that cannot be replaced by a model’s prose claim.

## technique 1: generate verifier-backed false statements
Steps in the paper:
1. Collect 6,748 structured undergraduate theorems with explicit hypotheses and conclusions across six domains (Section 3.1).
2. Drop one hypothesis at a time, producing 18,262 candidates.
3. Ask Gemini 3.1 Pro to retain candidates that are well-posed and non-trivial, emit a valid Python verifier, and propose a witness that executes without errors; allow up to five retries with error feedback.
4. Gate the candidates by executing the generated verifier and witness; retain 4,707 verifier-backed records over 3,485 unique theorems, with 4,700 carrying witness schemas.
5. Stratify into SFT n=1,000, held-out test n=201, and RLVR prompt n=3,506 using seed 42. Table 1 reports the strict pool denominator as 2,389 records and the final allocation as 1,000 + 201 + 3,506 = 4,707.

A schema is generated from the verifier and canonical witness and merged into the prompt. The paper calls it “a structural prior on the output shape” and says it enables practical RLVR without changing either verifier or reward function. Inference: for Verus, schemas can describe the expected Rust module, theorem signature, and proof artifact shape, but must not be treated as evidence that the artifact verifies.

## technique 2: per-theorem symbolic reward
The verifier returns one boolean for each remaining hypothesis and one for the negated conclusion. The dense reward is
`r = α·(s_hyp/n_hyp) + β·q¬ + γ·1[format ok] − δ·1[gave up on false] − ε·(1−1[parse ok])`, with dense weights α=.25, β=.65, γ=.10, δ=.30, ε=1.00. Sparse reward sets α=γ=δ=0 and β=ε=1, giving −1, 0, or +1. The paper derives the key bound: “any successful, formatting-compliant rollout ... that falls into the ‘hypothesis-only’ failure mode ... is strictly dominated by any valid rollout that successfully negates the conclusion.”

Steps: execute the witness in the theorem’s sandbox; compute hypothesis satisfaction, negated-conclusion success, parsing, format, and NONE sentinel flags; aggregate either dense or sparse reward; use that reward in GRPO. The structured booleans make it possible to attribute behavior to one reward term rather than to a learned judge.

Inference: a Verus reward can similarly award only a terminal success for a proof that compiles and satisfies the requested contract. Partial rewards for “some lemmas compile” risk teaching locally plausible but globally invalid proofs; any shaping must be tested against abstention and false-positive behavior.

## technique 3: SFT imitation trap and verifier-grounded repair
Training is Qwen3-4B SFT followed by GRPO, LoRA rank 16, bfloat16; RLVR samples G=4 rollouts per prompt, with KL penalty 0.02 against the SFT reference. On a theorem-truth probe of 347 true theorems, counterexample-only SFT drives truth recognition from 0.27 to 0.00 under the SYMCE prompt and from 0.36 to 0.21 under explicit classification. The paper reports that the model “actively asserts that 70 % of true theorems are false.”

Sparse outcome-only RLVR repairs calibration: on the same reference seed, SYMCE truth recognition reaches 0.65 and explicit truth classification 0.84; dense RLVR reaches 0.34 and 0.73. In-domain counterexample success is similar (dense 0.502 versus sparse 0.497), so equal task success hides different failure modes. Across four Qwen seeds, SYMCE Pass@1 is 0.49 ± 0.02 dense and 0.46 ± 0.03 sparse; the truth-prompt metric is 0.33 ± 0.04 dense and 0.66 ± 0.04 sparse. The paper explains the mechanism: dense partial credit makes a parsed, hypothesis-only witness worth α+γ=.35, while abstention is penalized −.20; sparse reward removes that incentive.

Inference: VL should test whether proof-only SFT causes an agent to emit unsound-looking proof scaffolds for unprovable goals. Include an explicit abstain or “cannot prove” action and evaluate theorem truth or contract satisfiability separately from proof-format success.

## technique 4: verifier audit and transfer checks
The authors audit 177 held-out witnesses: 101 verifier-accepted and 76 rejected. Human review confirms 99/101 accepted (false-accept 2.0%) and 74/76 rejected, for 97.7% decision accuracy; no case was traced to an incorrect verifier. Median oracle time is 132 ms, p95 145 ms, maximum 326 ms. These numbers use the 177-decision audit and held-out test records, not all 4,707 records.

They also evaluate unchanged prompts on GSM8K (n=1,319), MATH-500 (n=500), MMLU-college-math (n=100), and AIME-2024 (n=30). Sparse RLVR scores .88, .65, .72, and .08 respectively; SFT scores .82, .55, .54, and .07. Inference: for VL, transfer must be measured on unseen Rust APIs and specifications, with denominators and prompt formats stated; a higher Verus compile rate on the training corpus is insufficient evidence of robust verification.

## trust, limitations, and product threat
The paper’s checker is deterministic and symbolic for its selected Python/SymPy/Z3 domains, but teacher-generated verifiers are audited rather than proved complete. It says, “Its scope is bounded by what is decidable in Python with SymPy/Z3.” The benchmark therefore does not establish correctness for undecidable or unmodeled mathematics. Inference: Verus adds trust in the Verus verifier, solver, Rust compiler/erasure, and external library specifications; a passing proof still proves only its stated contract.

Inference: threat to VL is high for naive imitation-based proof training and moderate for a verifier-grounded pipeline. The imitation trap shows that optimizing surface proof witnesses can destroy calibration even while in-domain success stays unchanged. What VL should not redo is an LLM-as-judge reward for decidable proof outcomes; this paper already supplies a faster, audited per-instance oracle pattern. Contradiction to watch: the abstract claims RLVR “0.49 ± 0.02 Pass@1” while Table 5 gives 0.49 ± 0.02 for dense and 0.46 ± 0.03 for sparse; these are distinct reward variants, not one universal score.

## techniques for the catalog
- per-theorem executable verifier — compile one deterministic symbolic checker per generated claim and reuse it for filtering, reward, and evaluation
- witness-schema interface — derive a concise expected output shape from the checker and canonical witness, then include it in the prompt
- sparse outcome RLVR — reward only a verifier-confirmed terminal counterexample to preserve calibration and abstention
- verifier audit and transfer — independently audit accept/reject decisions and test unchanged-prompt transfer on held-out benchmarks
Checked 2026-10-15 against paper zouak2026counterexample: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
