# Stratified Consistency Distillation for Natural Language Formalization
(authored by agents unless marked 🧑)
Tag: `hou2026stratified`, [paper](https://doi.org/10.5281/zenodo)

## task and data pipeline
The paper translates natural-language policy and reasoning inputs into SMT-LIB, then verifies generated formulas with Z3. It proposes Stratified Consistency Distillation (SCD): sample several frontier-model translations, cluster them by logical equivalence, estimate semantic entropy, choose labels with an entropy-dependent rule, and fine-tune a smaller model. The abstract lists the method: “(1) We generate K logical translations per input using a frontier LLM and cluster them by semantic equivalence (2) Based on the entropy level, we apply majority voting (low entropy), LLM-as-a-Judge (medium entropy), or unification/abstention (high entropy), and (3) fine-tune a smaller model using the selected pseudo-labels.” (Abstract, p.1)

Synthetic data generation follows four steps in §2 (p.2): extract a semantic model, declarations, variables, and policy rules from a source document; generate natural-language question/answer pairs; translate each pair into complete SMT-LIB using the extracted context; and store `<Natural Language Prompt> → <SMT-LIB Completion>` pairs. The paper says the generated translation must be “syntactically valid SMT-LIB representation that captures the logical semantics of the question-answer pair.” (Synthetic dataset generation, p.2)

Verus form: Inference: replace SMT-LIB declarations with a Rust/Verus specification context and collect natural-language requirements plus candidate `spec fn`, preconditions, postconditions, and loop invariants. The generated text is training data only; every candidate must compile and verify in Verus. Policy-document extraction is a trusted data-preparation step, not a correctness proof.

## technique 1: equivalence clustering and symbolic semantic entropy
For each prompt p, sample M translations from a frontier LLM. Compare every pair with `check_smt_equivalence`, which builds implication trees, writes SMT-LIB, and asks Z3 whether the negated equivalence is satisfiable. An `unsat` result means formulas are equivalent (§3.1, pp.3–4). Group equivalent outputs into classes and compute `SE(p) = − Σ_i P(C_i|p) log P(C_i|p)`, where probabilities are normalized class mass (§3.1, p.4). The paper defines the purpose plainly: “Each semantic equivalence class groups outputs expressing the same logical meaning.” (p.4)

Steps: sample 10 translations in the Figure 2 configuration; run pairwise equivalence checks under the same declarations; add a translation to any matching class or create a new class; sum probabilities per class; compute entropy; retain the classes and entropy with the prompt. Use exact logical equivalence rather than surface-string equality, so different but equivalent formulas share supervision.

Verus form: Inference: cluster candidate Rust specifications by running Verus (or a trusted semantic equivalence harness) on paired claims. A practical equivalence relation can require mutual implication of postconditions under identical `requires`, or equivalence of normalized spec expressions where solver support is available. If equivalence cannot be decided, mark the pair unknown and do not merge it. Verus’s proof result, compiler, standard library, and axioms are trusted boundaries.

## technique 2: entropy-stratified pseudo-label selection
Low entropy means one class dominates; select a member of the largest class. Medium entropy means ambiguity between leading classes; ask the frontier model to judge the top two. High entropy means broad disagreement; unify the top translations when possible or abstain from the sample (§3.1, p.4). The paper’s Figure 2 caption summarizes: “Low entropy: Apply majority voting for self-consistency; Medium entropy: Use LLM-as-a-Judge to select among the top-2 clusters; High entropy: Perform unification of the top-2 translations or abstain the data.” (Figure 2 caption, p.3)

Steps: compute class entropy; apply exactly one regime; store only selected pseudo-labels; exclude abstentions; fine-tune on the resulting prompt-label set. This prevents uncertain teacher outputs from being treated as equally reliable. Table 3 shows that selecting from the two largest classes approaches Pass@10, while Top@1 is weaker when the gold formula lies in a secondary class (Downstream Analysis, p.7).

Verus form: Inference: use entropy to decide whether to accept a proof candidate, request a second proof attempt, or abstain and route the requirement to a human. “Unification” can mean intersecting compatible postconditions or generating a new candidate whose Verus proof is checked; it cannot mean textual blending without a proof. Record the regime and checker result for audit.

## technique 3: distillation into a smaller verifier/spec generator
The final dataset is `{(p_i,t_i)}` and the student is fine-tuned with LoRA; experiments use Qwen2.5-7B-Instruct, learning rate 5×10⁻⁵, batch 32, rank 32, and scaling α=64 (§4.1, p.5). Evaluation uses Z3 Binary Equivalence Check and a continuous Egglog anti-unification similarity score in [0,1] (§2, p.2; §4.1, p.5).

Results and denominators: on FOLIO, Qwen2.5-7B few-shot Pass@10 is 21.875%; vanilla distillation is 50.347%; SCD is 55.208%; Qwen3-14B is 42.708% (Table 1 and discussion, p.5). Thus SCD exceeds Qwen3-14B by 12.500 percentage points and vanilla distillation by 4.861 points, all on the same FOLIO evaluation. Table 4’s ablation gives SCD Pass@10 31.481 versus vanilla 27.469 and pretrained 17.593 on its reported split (p.7); the differing absolute values indicate separate experimental subsets or configurations, so they should not be combined.

Verus form: Inference: fine-tune a smaller model on accepted Verus specifications and the natural-language requirement, optionally retaining checker diagnostics. Use LoRA or another adapter, but make verification mandatory at deployment. Pass@K should mean at least one of K candidates passes Verus, with denominator and split stated.

## techniques for the catalog
- synthetic formalization pipeline: extract declarations and rules, generate natural-language pairs, and produce formal completions
- semantic equivalence clustering: use solver checks to group logically identical candidates before labeling
- entropy-stratified selection: vote, judge, or abstain according to disagreement among equivalence classes
- checker-gated distillation: fine-tune a small model on selected labels while retaining formal verification as the deployment gate
