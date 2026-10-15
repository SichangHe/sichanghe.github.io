# Learning Structure-Aware Representations of Dependent Types
(authored by agents unless marked 🧑)
Tag: `kogkalidis2024learningstructureaware`, [paper](https://www.semanticscholar.org/paper/f2285146fd02caefbfa9180217f1c7162246ea9e)

## problem and contributions

The paper targets premise selection for dependently typed proof assistants. Given a goal (a proof hole) and all lemmas in scope, a model ranks lemmas likely to help fill the hole. Its first contribution is AGDA2TRAIN, an Agda compiler backend that extracts type-checked proof states as structured JSON. Its second is QUILL, a neural encoder that represents dependent-type ASTs using structure rather than symbol names. The abstract says the dataset “details proof states at the sub-type level” and that the architecture is “targeted at faithfully representing dependently-typed programs on the basis of structural rather than nominal principles.” (Abstract, p. 1.)

Inference: the direct VL lesson is retrieval of relevant lemmas and facts from a Verus proof context. This paper does not generate Rust or prove Verus properties; it learns a ranking that can reduce proof-search candidates while leaving the proof assistant as the acceptance gate.

## technique 1: type-safe, subterm-level proof-state extraction

What it is. AGDA2TRAIN first lets Agda type-check source files, then queries Agda's internal representation and emits JSON. It walks every definition and pauses at every possible proof subterm, not merely textual prefixes. At each hole it records the missing term and full typing context (Section 3.2).

The paper's running example is commutativity of Peano addition. Four pattern-matching cases are extracted, including reflexivity for two zeros, recursive calls for one successor, and a helper lemma `+-suc` before recursion when both arguments are successors (Section 3, Figure 1). The authors emphasize, “Each extracted JSON file mirrors Agda’s internal compilation state for a given file.” (Section 3.2, p. 4.)

How to do it.
1. Run the proof assistant's type checker on each file (Section 3).
2. Traverse definitions and stop at each syntactic subterm that can be a hole, including nested terms (Section 3.2).
3. Record the goal type, antecedent definitions in scope, local variable bindings, names, types, and proof terms.
4. Serialize the full internal term grammar and also provide a pretty-printed AST for readability (Section 3.2).
5. Associate each hole with the lemmas actually used in its completed proof; these become premise-selection labels (Appendix A and Section 5.1).

Verus form. Inference: a Verus data extractor could run after successful verification, recording each `assert`, lemma invocation, `requires` fact, and remaining proof obligation together with the Rust/Verus AST. A generated dataset should preserve the verifier's typed terms and source locations, while treating pretty-printed text as a secondary view. Inference: Verus does not expose Agda's backend API, so this requires instrumentation of verifier diagnostics or proof traces; the paper does not provide that integration.

Evidence and limits. The extractor was developed for Agda 2.6.3 and applied to standard library version 1.7.2 (Appendix A). Extraction can show exponential behavior because of repeated type-checker calls, making some complex modules impossible to process (Appendix A). The dataset currently considers terms appearing in functions/proofs and has stated coverage limitations (Appendix A).

## technique 2: structural, α-equivalent representation

The modeling problem is that dependent types contain binders, references to local variables, and references to other lemmas. A fixed token vocabulary makes renamed variables appear different and unknown symbols collapse to generic entries. QUILL therefore uses AST structure, reference links, and name-independent variable resolution. The authors require representations to be “complete, in the sense of allowing the representation of any item in the object language” and “respectful of α-equivalence, in the sense of being invariant to variable renaming and substitution.” (Section 2.2, p. 3.)

How to do it.
1. Represent type and proof terms as AST nodes, retaining dependent function, function, lambda, application, datatype, record, and pattern constructs (Section 3.2).
2. Encode local variables with de Bruijn indices, then resolve each index to a pointer to its binder node rather than learning an embedding for an unbounded integer (Section 4.3, “Variable Representations”).
3. Encode cross-lemma references using a dynamic table of representations, processing lemmas in topological dependency levels (Section 4.3, “Reference Representations”).
4. Use static embeddings only for operators and meta-symbols such as start-of-sequence and out-of-scope (Section 4.3).

Verus form. Inference: represent Rust variables by binder identities or de Bruijn-like indices in an analysis IR, and represent lemma calls by stable definition IDs. A Verus proof can state that alpha-renaming preserves the extracted semantic representation, but the paper's neural encoder itself is outside Verus's proof language. Inference: preserving ownership regions, lifetime parameters, and specification/executable distinctions would be necessary additions for Verus; Agda's dependent-type AST does not encode all Rust borrow semantics.

## technique 3: efficient structured self-attention

QUILL modifies a Transformer to capture AST structure and avoid quadratic scaling. It uses linearized attention with a second-degree Taylor feature map, binary-tree positional encodings built from left/right branch primitives, RMSNorm, residual connections, and SwiGLU blocks (Section 4.3). Tree rotations make attention depend on relative AST paths. Lemma representations are populated level by level so references can retrieve earlier embeddings while preserving parallelism within a level.

The paper explains the motivation: “As an alternative, Transformer-based encoders implementing full self-attention allow concurrent pairwise interactions between all nodes, regardless of their relative placements.” (Section 4.2, p. 6.) It then adds structural bias because a vanilla Transformer lacks the bias to perceive an Agda file's inductive structure.

Verus form. Inference: this is a candidate retrieval model outside the trusted Verus kernel. Feed it serialized proof states and use its scores only to order lemma suggestions. The Verus verifier must check every selected lemma application. Inference: no Verus construct can make a neural attention score trustworthy; the security boundary is the later proof check.

Evidence and limits. The model is trained with InfoNCE on 481 standard-library training files (15,244 holes) and evaluated on 92 files (4,120 holes), with 5 large files isolated as stdlib:OOD (Section 5.1). Additional zero-shot sets contain 137 Unimath files/5,247 holes and 28 TypeTopology files/1,983 holes. Table 1 reports mean and 95% confidence intervals over four training repetitions. QUILL average precision is 50.2±0.5 in-distribution, 31.1±0.9 stdlib:OOD, 17.4±0.3 Unimath, and 15.4±0.5 TypeTopology; the relevant-lemma ratio is below 1.5% in-distribution and about 2‰ in stdlib:OOD (Section 5.2). Denominators are the hole-lemma pair rankings in each evaluation set, not completed proofs.

## technique 4: premise selection and ablation diagnostics

QUILL takes all ASTs in scope and outputs a scalar relevance score for each hole-lemma pair. Training uses InfoNCE; evaluation ranks lemmas and reports average precision and R-precision (Section 5.1). This is a practical way to reduce a combinatorial proof-search space before invoking Agda automation.

Ablations remove Taylor expansion, tree positional encoding, or structural de Bruijn resolution one at a time. Table 1 shows in-distribution average precision falling from 50.2 to 47.0 without Taylor expansion, 44.5 without tree positional encoding, and 35.8 without variable resolution. A vanilla Transformer reaches 10.9. The authors say, “The baseline Transformer collapses, utterly and completely failing at capturing the task.” (Section 5.2, p. 9.)

Verus form. Inference: a Verus-assisted pipeline can rank candidate lemmas, instantiate the top-k, and run `cargo verus`; collect successes and failed obligations as labels for a similar contrastive model. The model should never be allowed to bypass a failed proof. A meaningful Verus evaluation must report both retrieval metrics and end-to-end proof completion, because premise relevance is not proof sufficiency.

## trusted boundary and VL implications

Agda's type checker supplies type safety for extracted records; QUILL's scores are statistical. The paper does not prove QUILL's ranking or any generated proof. Trusted components include the Agda implementation, extractor, AST schema, labels derived from completed proofs, neural weights, and the train/test split. Inference: agent-written verified Rust benefits mainly through lower search cost, with little direct threat reduction unless the final Verus check remains mandatory. The paper already covers high-resolution proof-state extraction, alpha-equivalent structural encoding, and premise ranking; VL should not present those as new generic ideas. A relevant open experiment is a Verus corpus with stable lemma IDs and measured top-k proof completion under dependency and naming changes.

## techniques for the catalog
- subterm-level proof-state extraction — compile type-checked files and record every typed hole with its full context
- alpha-equivalent variable resolution — replace names and raw de Bruijn indices with binder-relative structural references
- dependency-level reference encoding — build lemma representations in topological order and reuse them for cross-lemma links
- structure-aware efficient attention — combine linear attention with binary-tree positional bias for dependent-type ASTs
- premise ranking with InfoNCE — train relevance scores and use top-ranked lemmas to shrink proof search

Checked 2026-10-15 against the paper by a Codex agent for learning_structure_aware_representations_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
