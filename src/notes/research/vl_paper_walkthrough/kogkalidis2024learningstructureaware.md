# Learning Structure-Aware Representations of Dependent Types
(authored by agents unless marked 🧑)
Tag: `kogkalidis2024learningstructureaware`, [paper](https://arxiv.org/abs/2402.02104v2)

## problem and contributions

The paper targets premise selection for dependently typed proof assistants. Given a goal (a proof hole) and all lemmas in scope, a model ranks lemmas likely to help fill the hole. Its first contribution is AGDA2TRAIN, an Agda compiler backend that extracts type-checked proof states as structured JSON. Its second is QUILL, a neural encoder that represents dependent-type ASTs using structure rather than symbol names. The abstract says the dataset “details proof states at the sub-type level” and that the architecture is “targeted at faithfully representing dependently-typed programs on the basis of structural rather than nominal principles.” (Abstract, p. 1.)

Inference: the direct VL lesson is retrieval of relevant lemmas and facts from a Verus proof context. This paper does not generate Rust or prove Verus properties; it learns a ranking that can reduce proof-search candidates while leaving the proof assistant to check the resulting proof.

## technique 1: type-safe, subterm-level proof-state extraction

What it is. AGDA2TRAIN first lets Agda type-check source files, then queries Agda's internal representation and emits JSON. It walks every definition and pauses at every possible proof subterm, not merely textual prefixes. At each hole it records the missing term and full typing context (Section 3.2).

The paper's running example is commutativity of Peano addition. Four pattern-matching cases are extracted, including reflexivity for two zeros, recursive calls for one successor, and a helper lemma `+-suc` before recursion when both arguments are successors (Section 3, Figure 1). The authors emphasize, “Each extracted JSON file mirrors Agda’s internal compilation state for a given file.” (Section 3.2, p. 4.)

How to do it.
1. Run the proof assistant's type checker on each file (Section 3).
2. Traverse definitions and stop at each syntactic subterm that can be a hole, including nested terms (Section 3.2).
3. Record the goal type, antecedent definitions in scope, local variable bindings, names, types, and proof terms.
4. Serialize the full internal term grammar and also provide a pretty-printed AST for readability (Section 3.2).
5. Associate each hole with the lemmas occurring in its recorded filling term; these become premise-selection labels (Appendix A.1 and B.3). The paper calls occurrence “an imperfect proxy for the lemma’s relevance” (Appendix B.3, p. 16).

Verus form. Inference: a Verus data extractor could run after successful verification, recording each `assert`, lemma invocation, `requires` fact, and remaining proof obligation together with the Rust/Verus AST. A generated dataset should preserve the verifier's typed terms and source locations, while treating pretty-printed text as a secondary view. Inference: adapting this extraction would require a Verus-specific interface; the paper provides no Verus integration.

Evidence and limits. The extractor was developed for Agda 2.6.3 and applied to standard library version 1.7.2 (Appendix A). Extraction can show exponential behavior because of repeated type-checker calls, making some complex modules impossible to process (Appendix A). The dataset currently considers only terms appearing in functions/proofs and omits structured decompositions of literals, sorts, and universe levels (Appendix A.3, p. 14).

## technique 2: structural, α-equivalent representation

The modeling problem is that dependent types contain binders, references to local variables, and references to other lemmas. A fixed token vocabulary makes renamed variables appear different and unknown symbols collapse to generic entries. QUILL therefore uses AST structure, reference links, and name-independent variable resolution. The authors require representations to be “complete, in the sense of allowing the representation of any item in the object language” and “respectful of α-equivalence, in the sense of being invariant to variable renaming and substitution.” (Section 2.2, p. 3.)

How to do it.
1. Use binarized type ASTs as model inputs; ignore proof-level definitions (Appendix B.1, p. 14). Fold a hole’s local context into nested dependent functions around its goal so holes and lemmas share one encoder (Section 4.1, footnote 2, p. 5). The broader extraction grammar also retains proof terms, datatypes, records, and patterns (Section 3.2).
2. Resolve each local variable’s de Bruijn index to its binder node. Compose the variable’s and binder’s positional matrices and apply the resulting relative-position matrix to a trainable embedding (Section 4.3, “Variable Representations”, p. 7).
3. Encode cross-lemma references using a dynamic table of representations, processing lemmas in topological dependency levels (Section 4.3, “Reference Representations”).
4. Use a fixed embedding table for four operators (dependent function, simple function, lambda, application), three terminal classes (sorts, levels, literals), and two meta-symbols (start-of-sequence and out-of-scope) (Section 4.3, p. 7).

Verus form. Inference: represent Rust variables by binder identities or de Bruijn-like indices in an analysis IR, and represent lemma calls by stable definition IDs. An adaptation would need to specify which Rust/Verus structures and references it preserves; this paper does not establish correctness of such an adaptation. The current QUILL experiment rejects 18 files containing mutual inductions because cyclic reference structures are unsupported (Appendix B.2, p. 14).

## technique 3: efficient structured self-attention

QUILL modifies a Transformer to capture AST structure and avoid quadratic scaling. It uses linearized attention with a second-degree Taylor feature map, binary-tree positional encodings built from left/right branch primitives, RMSNorm, residual connections, and SwiGLU blocks (Section 4.3). Position-dependent orthogonal matrices rotate and reflect queries and keys before Taylor expansion, making attention depend on relative AST paths. Lemma representations are populated level by level so references can retrieve earlier embeddings while preserving parallelism within a level.

The paper explains the motivation: “As an alternative, Transformer-based encoders implementing full self-attention allow concurrent pairwise interactions between all nodes, regardless of their relative placements.” (Section 4.2, p. 6.) It then adds structural bias because a vanilla Transformer lacks the bias to perceive an Agda file's inductive structure.

Verus form. Inference: use the model to rank lemma suggestions from structured proof states, then verify the resulting proof with Verus. Retrieval accuracy alone does not establish proof correctness.

Evidence and limits. The model is trained with InfoNCE on 481 standard-library training files (15,244 holes) and evaluated on 92 files (4,120 holes), with 5 large files isolated as stdlib:OOD (Section 5.1). Additional zero-shot sets contain 137 Unimath files/5,247 holes and 28 TypeTopology files/1,983 holes. Section 5.2 describes Table 1 as means and 95% confidence intervals over four training repetitions. Appendix B.3 instead says five training iterations, and checklist item 7 says 68% confidence intervals; the paper is inconsistent. QUILL average precision is 50.2±0.5 in-distribution, 38.7±0.7 stdlib:OOD, 27.0±0.4 Unimath, and 22.5±0.3 TypeTopology. Corresponding R-precision values are 40.3±0.4, 31.1±0.9, 17.4±0.3, and 15.4±0.5 (Table 1, p. 9); the relevant-lemma ratio is below 1.5% in-distribution and about 2‰ in stdlib:OOD (Section 5.2). These metrics measure lemma retrieval for holes, not completed proofs (Section 5.2).

## technique 4: premise selection and ablation diagnostics

QUILL encodes lemma and hole types and outputs a weighted dot-product relevance score for each hole-lemma pair. Training excludes causally illegal pairs, where the lemma has not yet been defined. Its modified InfoNCE loss handles multiple positives: for each positive pair, the denominator contains that pair and all negatives for the same hole; per-hole losses are aggregated (Appendix B.3, p. 16). Evaluation ranks lemmas and reports average precision and R-precision (Section 5.2). End-to-end proof completion with Agda automation is proposed future work (Section 6, p. 10).

Ablations remove Taylor expansion, tree positional encoding, or structural de Bruijn resolution one at a time. Table 1 shows in-distribution average precision falling from 50.2 to 47.0 without Taylor expansion, 44.5 without tree positional encoding, and 35.8 without variable resolution. Combining all three ablations yields a linear Transformer baseline that reaches 10.9. The replacements are an offset-by-one ELU feature map, additive sequential sinusoidal positions, and a shared embedding for all variables (Section 5.2, p. 9). The authors say, “The baseline Transformer collapses, utterly and completely failing at capturing the task.” (Section 5.2, p. 9.)

Verus form. Inference: a Verus-assisted pipeline can rank candidate lemmas, instantiate the top-k, and run `cargo verus`; collect successes and failed obligations as labels for a similar contrastive model. The model should never be allowed to bypass a failed proof. Inference: evaluate both retrieval metrics and end-to-end proof completion, because premise relevance is not proof sufficiency.

## trusted boundary and VL implications

The paper confines guidance within a proof assistant: “the model’s predictions are made safe by virtue of being confined within (and verified by) a trustworthy white box: the proof assistant.” (Section 1, p. 1.) Its current pipeline is offline and unidirectional; interactive proof completion remains future work (Section 6, p. 10). Inference: when suggestions receive a final proof check, neural weights, extraction, and relevance labels affect usefulness but need not be trusted for proof validity. The verifier and its assumptions determine that validity. Inference: VL could test this approach on a Verus corpus with stable lemma IDs, measuring retrieval and proof completion under dependency and naming changes; subterm extraction, binder-relative encoding, and premise ranking already have precedent here.

## techniques for the catalog
- subterm-level proof-state extraction — compile type-checked files and record every typed hole with its full context
- alpha-equivalent variable resolution — replace names and raw de Bruijn indices with binder-relative structural references
- dependency-level reference encoding — build lemma representations in topological order and reuse them for cross-lemma links
- structure-aware efficient attention — combine linear attention with binary-tree positional bias for dependent-type ASTs
- premise ranking with InfoNCE — train relevance scores and use top-ranked lemmas to shrink proof search

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Finally, the dataset does not currently contain structured decompositions for literals, sorts (i.e., kinds of types), and universe levels."): checked all paper text, quotations, numbers, section/page references, and technique steps; corrected retrieval metrics, model inputs, static embeddings, loss and baseline descriptions, limitations, and proof-validity claims; replaced the link with the paper’s arXiv identifier and noted conflicting repetition/confidence-interval reports; did not inspect external code or data, reproduce experiments, or validate proposed Verus adaptations.
