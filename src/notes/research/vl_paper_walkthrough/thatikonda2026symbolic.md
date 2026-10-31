# Improving Symbolic Translation of Language Models for Logical Reasoning
(authored by agents unless marked 🧑)
Tag: `thatikonda2026symbolic`, [paper](https://doi.org/10.48550/arxiv.2601.09446)

## what the paper builds
The paper makes small language models translate natural language into Prover9 first-order logic (FOL), then delegates logical execution to a theorem prover. It categorizes parser, type, token, and predicate errors; synthesizes ProofWriter data with GPT-4o; fine-tunes four 3–4B models; separates predicate generation from formula generation; and inserts an arity verifier. The central motivation is explicit: “The use of formal language for deductive logical reasoning aligns well with language models (LMs), where translating NL into first-order logic (FOL) and employing an external solver results in a verifiable and therefore reliable reasoning system.” (abstract, p.1) That reliability applies to syntactic execution and the solver's result, not automatically to whether the translation means the source sentence.

## technique: error taxonomy and tool-filtered data synthesis
What it is: classify failures into parsing (missing quantifier, parentheses, completion), NoneType (quantifier location, missing variable), token (special token, unknown operator), and predicate (arity mismatch, subject–predicate conflict). Generate additional passage-level FOL from ProofWriter using GPT-4o, then filter it by format correction, Prover9 parsing, and semantic labels.

Inference: When to use it: use the taxonomy to route repairs and to measure whether a model's improvement is formatting, structural, or semantic. Use filtered data when a small model lacks enough multi-statement symbolic examples.

How: (1) sample 15,000 depth-5 ProofWriter records with balanced True/False/Uncertain labels; (2) prompt GPT-4o to emit predicates and FOL; (3) standardize Prover9 syntax; (4) parse with Prover9 and discard failures; (5) compare solver output with labels; (6) manually inspect a random sample. The appendix reports 10,424 records after filtering and 50 records (1,018 statements) manually checked, with 22 errors (about 2%), half minor.

Inference: Verus form: apply the same staged filter to natural-language requirements before turning them into Verus contracts. A parser or predicate-arity checker can reject malformed generated `spec fn` signatures, but semantic adequacy still needs human or domain review. Verus's `assert` and `ensures` prove the encoded formula, not that it captures the requirement.

Evidence and limits: the paper's 2% manual error rate has denominator 1,018 statements and is conditional on Prover9-confirmed outputs. The dataset inherits ProofWriter's limited diversity; GPT-4o silver labels can contain inconsistencies. The authors explicitly warn that symbolic representations may not capture complete intended meaning.

## technique: supervised fine-tuning for structured translation
What it is: train a model on concatenated natural language, predicate set, and FOL output, `X = S ∥ P ∥ FOL(S)`, using LoRA for three epochs. Four models are Gemma-3-4B-Instruct, Phi-4-mini-Instruct, Qwen2.5-3B-Instruct, and Qwen3-4B-Instruct-2507; inference uses 8-bit quantization, temperature 0.1, and a 1,000-token limit.

Inference: When to use it: use SFT when five-shot prompting leaves high parser or execution errors and symbolic training data is available. Compare in-domain and out-of-distribution (OOD) sets separately.

How: construct the structured training triples; fine-tune each model; generate FOL; run Prover9; report execution rate (valid formulas parsed) and accuracy (correct logical outcome). Table 2 evaluates ProofWriter (600 test records), ProntoQA (500 OOD records), FOLIO (203 development records), and ProverQA (500 hard-test records). Fine-tuning improves both metrics broadly, but Phi-4-mini on the 500-record ProverQA hard test has a reported 12% error-rate increase.

Inference: Verus form: use a model to draft `requires`/`ensures` clauses and proof scaffolding, then run Verus as the independent checker. Preserve the separation between executable Rust, `spec fn`, and `proof fn`; generated proof code is acceptable only after Verus verifies it.

Evidence and limits: Table 2's values are model-and-dataset specific; the authors say direct behavioral comparison is difficult because pretraining data are opaque. OOD gains therefore do not establish general contract-generation reliability.

## technique: incremental inference
What it is: replace one greedy generation with two stages: first generate predicate set `P̂`, then generate `FOL(S)` conditioned on `S ∥ P̂`. The paper explains: “This decomposition allows the model to focus on a single subtask at a time, enables early stopping, and ensures well-formatted outputs.” (sec. 1, p.1) The authors also state: “This incremental procedure reduces error propagation and yields more syntactically and semantically coherent FOL outputs.” (sec. 4.2, p.4)

Inference: When to use it: use it when long outputs loop or a token error cascades through the remainder of a sequence. It is especially useful when predicate consistency across several premises matters.

How: (1) feed premises and conclusion to the model and decode only predicates; (2) stop; (3) append the predicate list to the input; (4) decode premise and conclusion formulas; (5) parse and execute with Prover9. Measure predicate coverage `|P̂∩P†|/|P†|`, usage `|P̂∩P†|/|P̂|`, and validity (format adherence). Table 3 reports coverage/usage/validity. On ProverQA, Phi-4-mini rises from 46/46/53 (standard) to 62/62/76 (incremental); on ProntoQA, Qwen3 rises from 69/73/78 to 75/81/100. These are percentages for the listed dataset/model rows, not pooled scores.

Inference: Verus form: generate a fixed predicate or invariant vocabulary first, then generate Rust/Verus contracts against it. Check each generated declaration with the compiler and Verus before asking for proofs. This reduces cascading syntax errors but cannot ensure the vocabulary expresses the intended property.

Evidence and limits: the paper reports about a 10% additional error reduction relative to standard inference and says incremental decoding itself does not increase latency when token budgets are allocated appropriately. More stages may improve control but add opportunities for inconsistent intermediate state.

## technique: arity verifier in the loop
What it is: after predicate generation, a lightweight verifier checks predicate validity and arity consistency. It returns the original set if valid or a corrected set `Pver` otherwise; the second generation stage conditions on `V(P̂)`.

Inference: When to use it: use a cheap syntactic verifier for errors a parser can decide exactly, before invoking a costly solver or proof checker. The paper uses Gemma-3-4B as a three-shot verifier with arity perturbations.

How: (1) generate `P̂`; (2) check each predicate's argument count and consistency; (3) emit `correct` or a corrected set; (4) generate FOL from the corrected set; (5) run Prover9. Figure 4 reports that this verifier further improves reasoning accuracy over incremental inference, although exact gains vary by dataset and model.

Inference: Verus form: use Rust parsing and Verus compilation as the final verifier; a lightweight pre-check can enforce unique function arities and declaration names. Keep the checker independent from the model that proposes code. A verifier that only checks arity cannot detect a wrong predicate meaning.

## techniques for the catalog
- error taxonomy — classify translation failures so data filters and repairs target concrete causes
- tool-filtered synthesis — generate symbolic training data and retain only parser- and solver-checked records
- structured fine-tuning — train small models on natural language, predicates, and FOL as one structured target
- incremental inference — generate predicates first and formulas second to limit error propagation
- arity verification — check predicate signatures between generation stages before solver execution
