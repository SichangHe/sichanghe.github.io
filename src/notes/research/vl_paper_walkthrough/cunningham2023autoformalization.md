# Towards Autoformalization of Mathematics and Code Correctness: Experiments with Elementary Proofs
(authored by agents unless marked 🧑)
Tag: `cunningham2023autoformalization`, [paper](https://arxiv.org/abs/2301.02195)
## scope and result

The paper trains a Universal Transformer encoder-decoder to translate LaTeX theorem-and-proof text into Coq theorem-and-proof text. It uses grammar-generated arithmetic and Hoare-logic datasets, then tests exact token sequence agreement and semantic validity by running Coq. It also builds a code-correctness dataset, POLY, in which short Imp programs with Hoare-triple proofs are translated into Coq proofs. The paper suggests pre-trained language models, or pre-training new models on mathematical corpora, as a way to address its handwritten-example errors (section 4.3, p. 7).

The paper states: “In contrast to prior work, we address the autoformalization of both theorems and their proofs, and extend the scope to proofs of code correctness.” (section 1, p. 2). The strongest result is narrow: on generated examples, intermediate expression or program lengths can generalize, but performance collapses beyond the training range; on 45 handwritten examples, semantic accuracy is 53.3% for EVEN-ODD and COMPOSITES and 73.3% for POWERS (section 4.3, p. 7). The paper does not verify Rust or establish that generated proofs express a useful system requirement.

## technique 1: generate aligned theorem, proof, and Coq data from a controlled grammar

what it is

The authors manually write seed examples, define a grammar for each arithmetic class and POLY, and generate paired natural-language/Coq sequences quasi-synchronously. The arithmetic classes are EVEN-ODD, COMPOSITES, and POWERS; POLY contains polynomial-evaluation programs. The paper requires the Coq proof structure to match the overall structure of the natural-language proof, while allowing "some simple re-orderings in order to improve generalization performance, e.g. swapping arguments of commutative operations" (section 2, p. 2).

The paper says: “First, a random seed is sampled that controls the overall structure of the theorem, proof, and definition, if any.” (section 2, p. 2). It then says: “Then, the skeleton structure of the proof is completed with phrases that are sampled from a separate context-free grammar.” (section 2, p. 2). The method deliberately includes “sublemmas, forward or backward proof direction, coreference, or additional conditions for the theorem” (section 2, p. 2).

when to use it

Use this when aligned formal and informal training pairs are scarce and the target domain has a grammar that can enumerate meaningful proof shapes. It is suitable for measuring systematic generalization because length, variable count, and proof structure can be controlled independently.

how to do it

1. Define a grammar for theorem statements, definitions, proof skeletons, and explanatory phrases. The paper uses separate grammars for EVEN-ODD, COMPOSITES, POWERS, and POLY (section 2, pp. 2–4).
2. Handwrite a few examples per class to guide the grammar (section 2, p. 2). Separately, the paper reports 45 human-written LaTeX theorem-proof pairs, 15 per arithmetic proof type, distinct from the guiding examples, used only to evaluate outside the generated grammar (section 2.1.1, p. 4). There is no handwritten POLY set.
3. Sample a random seed for the theorem, proof, and optional definitions (section 2, p. 2).
4. Fill the proof skeleton from a context-free phrase grammar (section 2, p. 2).
5. Emit the LaTeX theorem/proof and the structurally corresponding Coq theorem/proof together. For a composite number, the paper emits a definition with existential factors, then proves `composite 35` by supplying 7 and 5 and closing arithmetic with `lia` (Figure 3, p. 4).
6. For POLY, generate a sequence of Imp assignments and the matching sequence of intermediate assertions. The paper says proofs are written "as either fully decorated programs or as sequences of Hoare triples with natural language justifying steps in between" (section 2.2, p. 4). In Figure 5 (p. 5) the Coq proof applies `hoare_seq` once per intermediate assertion, then closes the obligations with `eapply hoare_consequence_pre` and `try (apply hoare_asgn || assn_auto'')`.

Verus form

Inference: In Verus, the analogous data generator would emit Rust functions with `requires` and `ensures`, plus proof functions whose assertions follow the generated proof skeleton. Definitions such as “composite” or “square” would be `spec fn` predicates; executable code would remain separate from proof code. Verus does not consume Coq syntax or Hoare triples directly, so the generated intermediate assertions must become `assert`, `requires`, `ensures`, loop invariants, or lemma calls. The grammar and paired-generation idea carries over; the exact Coq commands (`Theorem`, `Proof`, `hoare_seq`, `lia`) do not.

evidence

The generator can theoretically produce “over 283 million unique arithmetic examples and over 491,000 unique code examples” before phrase variation (section 2, p. 3). The paper generates "5,000 even-odd, 5,000 composites, and 2,000 powers examples respectively" and 5,000 POLY examples "for both training and testing" (sections 2.1 and 2.2, pp. 3–4). Arithmetic trains on n in {2, 3, 5, 7, 9} and tests on n in {2, ..., 12}, where n is the number of variables, factors, or the power (section 2.1, p. 4). POLY trains on programs of 2, 3, 5, 7, 9, and 11 lines and tests 2 to 14 lines (section 2.2, p. 4). These are dataset counts, not independently checked real programs.

limits and assumptions

The grammar constrains language and proof shape, so success may measure grammar recognition. The paper notes "the wide variability in the level of detail of mathematical proofs, and the frequent mismatch between what is considered an acceptable inference step in NL proofs vs. an inference step in Coq" (section 2, p. 2). The 45 handwritten examples cover only the arithmetic classes, not POLY. It does not show coverage of idiomatic Rust, aliasing, concurrency, unsafe code, or specifications written by users.

## technique 2: preserve arbitrary identifiers with per-literal copy tokens

what it is

Numbers, variable names, and definitions are replaced by distinct generic placeholders, such as `<nat1>` and `<var1>`, and a CopyNet-style decoder either generates a vocabulary token or copies an input token. Distinct placeholders preserve coreference: each literal in a theorem/proof pair receives its own index, rather than collapsing all numbers into `<nat>`.

The paper says: “a different generic token is introduced for each unique numerical constant or variable literal in the theorem and its proof, and the corresponding generic token is used in the Coq version.” (section 3.1, p. 5). It also reports: “Preliminary experiments validated the utility of encoding these distinctions while maintaining the correct coreference in both LaTeX and Coq statements.” (section 3.1, p. 5).

when to use it

Use this when identifiers are open-vocabulary and exact copying matters more than learning each identifier from a fixed vocabulary. The technique is especially relevant to generated code, where variable renaming should preserve binding and repeated occurrences.

how to do it

1. Scan the paired theorem and proof for unique numbers, variables, and definitions. The paper replaces these with generic forms such as `<var1>` up to `<varN>`, `<nat1>` up to `<natN>`, or `<def>` (section 3.1, p. 5).
2. Assign an indexed placeholder to every distinct numeric constant or variable literal. In Figure 3, constants 2, 35, 7, and 5 become `<nat1>`–`<nat4>`, while `w`, `R`, and `Q` become `<var1>`–`<var3>` (section 3.1, p. 5).
3. Replace each occurrence consistently in both LaTeX and Coq sequences.
4. At each decoder step, score vocabulary generation and copying from the input. The paper defines `p(y_t,g)` for vocabulary tokens and `p(y_t,c)` for copied tokens, normalized by `Z_t` over both sets (section 3.1, p. 5).
5. Inference: decode the Coq sequence and map the placeholders back to the original literals; the paper does not describe this step explicitly.

Verus form

Inference: A Verus-oriented version would tokenize or abstract identifiers before generation, then restore the original Rust names and binders before verification. The emitted names must be consistent in `requires`, `ensures`, `assert`, and lemma bodies. Copying preserves syntax-level identity; Verus still checks binding, types, ownership, and the specification. This technique therefore helps generate names but supplies no proof of semantic correctness by itself.

evidence

The paper states that with generic tokens and copying "the model has the ability to generalize to unseen numbers or variable and definition names" (section 3.1, p. 5). Inference: I found no ablation or separate experiment of the copy mechanism in the paper, so this ability is claimed by design and supported only indirectly by the Table 1 and handwritten results. The paper attributes many handwritten-example errors to “mis-copying a variable within a definition or the omission of an assertion in the proof tied to a term” (section 4.3, p. 7), showing both the value and the failure mode of copying.

limits and assumptions

Inference: the copy mechanism assumes the input contains the needed literal and that placeholder alignment is correct. It does not solve out-of-vocabulary syntax whose structure is not represented in the grammar. In the handwritten set, mistakes correlate with examples that deviate from the artificial grammar (section 4.3, p. 7).

## technique 3: remove absolute positions and use relative self-attention with recurrent passes

what it is

The architecture adds recurrent passes to encoder and decoder blocks, removes absolute positional encodings, and uses relative positional representations in self-attention. The authors retain the remaining Transformer components and add the copy probability described above.

The paper lists three changes: “Absolute positional encodings are removed”; “Self-attention uses relative positional representations as in Shaw et al. (2018)”; and “Stacks of N encoder/decoder blocks have T recurrent passes.” (section 3.2, p. 6). It reports that “Preliminary evaluations on the EVEN-ODD dataset showed that Transformer models that use absolute positional encodings obtain 0% sequence-level accuracy on expression lengths that are not seen at training time” (section 3.2, p. 6). It adds that this agrees with the findings of Csordás et al. (2021).

when to use it

Inference: use relative positions when the model must generalize to sequences of lengths not seen in training and absolute indices would bind learned behavior to fixed locations. Recurrent passes add computation depth without changing the token interface. The paper says relative positional encodings were "essential for achieving stronger systematic generalization" (section 3.2, p. 6).

how to do it

1. Start with a Transformer encoder-decoder.
2. Delete absolute positional encodings (section 3.2, p. 6).
3. Add relative positional representations to self-attention (section 3.2, p. 6).
4. Apply `T` recurrent passes through stacks of `N` encoder and decoder blocks (section 3.2, p. 6).
5. Train on selected lengths and evaluate on held-out intermediate and longer lengths.

Verus form

Inference: This is a model-training technique, so it has no direct Verus construct. A Verus pipeline could use this architecture to propose Rust and proof text, then invoke Verus as the semantic checker. Relative positions do not change the generated Rust contract; only Verus verification determines whether the candidate compiles and proves its obligations.

evidence

For arithmetic, the reported model has embedding/state size 32, feed-forward width 256, four encoder and decoder blocks, four recurrent passes, four attention heads, clipping value 2, minibatch size 20, Adam, and initial learning rate 0.001 (section 4.1, p. 6). The table reports sequence and semantic accuracy by expression length. EVEN-ODD semantic accuracy is 99.4% at length 4, 98.8% at 6, 94.0% at 8, 7.0% at 10, and 0.0% at 11 and 12+; COMPOSITES semantic accuracy is 93.9%, 94.3%, 88.3%, 1.6%, 0.0%, and 0.0% at those rows (Table 1, p. 6). Thus intermediate lengths generalize, while longer lengths fail. For COMPOSITES, sequence-level accuracy at the unseen intermediate lengths is only 56.1, 57.1, and 53.5% (n = 4, 6, 8) against semantic accuracy of 93.9, 94.3, and 88.3%, so most of the semantic accuracy there comes from Coq-valid outputs that differ from the reference. POWERS reports a single row, Seq = 100.0 and Sem = 100, not split by length. POLY uses a deeper model (8 blocks, 8 recurrent passes, 8 heads, clipping value 8, minibatch size 1, Adam, patience 3) and reaches 82.1, 45.1, 15.7, and 35.6% at the unseen lengths 4, 6, 8, and 10, and 0.0% at 12+ (Table 1, p. 6; section 4.2, pp. 6–7). The paper describes this as "diminishing returns as the program length grows", but the numbers are not monotone (15.7% at 8, 35.6% at 10).

limits and assumptions

The paper studies only its generated domains and a small handwritten set. Relative position removes one failure mode but does not prevent the sharp accuracy drop at lengths beyond training. The authors say increasing depth "significantly improved generalization" for POLY, that an arithmetic-sized model gave "less then half the sequence-level accuracy for intermediate program lengths", and that further depth would come "at the cost of significantly more computing resources" (section 4.2, p. 7).

## technique 4: score semantic validity separately from exact sequence match

what it is

Sequence-level accuracy requires the generated Coq theorem and proof to exactly match the reference tokens. Semantic-level accuracy requires the theorem sequence to match and then runs Coq to check that the generated proof proves that theorem, even if the proof differs from the reference proof.

The paper defines semantic evaluation as follows: “the generated Coq theorem needs to attains a perfect sequence-level accuracy and the Coq engine verifies that the generated Coq proof truly proves the generated Coq theorm, regardless of whether it matches the ground truth version of the proof.” (section 4, p. 6). Inference: this separates proof validity from string identity.

when to use it

Inference: use semantic checking whenever multiple proof scripts can establish the same proposition. Keep exact-match accuracy as a reproducibility measure, but do not treat it as the only correctness measure.

how to do it

1. Generate a Coq theorem and proof from the input theorem/proof pair.
2. Compare the theorem tokens with the reference theorem; reject semantic scoring if the theorem differs.
3. Submit the generated proof and theorem to Coq.
4. Count the example as semantically correct only if Coq accepts the proof.
5. Report sequence and semantic rates separately by expression or program length (section 4, p. 6; Table 1, p. 6).

Verus form

Inference: For Verus, the analogue is to compile the generated Rust and run Verus on its `requires`, `ensures`, invariants, and proof functions. Exact text match can be measured against a reference proof, but semantic success should mean that Verus accepts the generated specification and proof. Because Verus specifications can be changed while retaining a valid proof, an evaluation must separately record the specification text and its intended behavior; verifier acceptance alone does not establish requirement adequacy.

evidence

On handwritten examples, the fully trained model obtains 53.3% semantic accuracy for EVEN-ODD and COMPOSITES, and 73.3% for POWERS (section 4.3, p. 7). For this set the paper checks "manually" that "the generated Coq theorem corresponds to the LaTeX version and that the subsequent proof is correct according to the Coq interpreter", so theorem correctness there is a human judgment, not an exact token match. The POLY table reports one “Both” column because semantic and sequence accuracy are identical: copying errors compromise proof validity (section 4.2, p. 7). The paper's arithmetic table has an apparent presentation ambiguity: its caption says “with the exception of POWERS,” while the POWERS row reports `Seq = 100.0` and `Sem = 100`; Inference: these are percentages over the POWERS test set (2,000 generated examples, section 2.1, p. 3); the paper does not say whether this includes the unseen values of n.

limits and assumptions

On the generated test sets, semantic scoring still requires exact theorem tokens, so a semantically equivalent theorem written differently is counted wrong. Inference: Coq's checked proof establishes the generated proposition, not that the natural-language statement was translated faithfully; the handwritten evaluation relies on manual checking of the theorem for that reason. The paper reports that almost all handwritten errors are out-of-vocabulary copying or omitted assertions (section 4.3, p. 7).

## what is proved, measured, and trusted

Coq checks the generated proof scripts for generated statements. The measured outcomes are token-level and Coq semantic accuracy under one NVIDIA RTX-A6000 setup (section 4, p. 6). The grammar, data generator, tokenizer, neural weights, theorem statement, and intended meaning remain outside the Coq proof. The paper does not report a proof that the generator is complete, that every input theorem has a faithful formalization, or that the model's output preserves a system-level requirement.

Inference: For agent-written verified Rust, the direct threat is specification translation failure and identifier/coreference errors. A model can produce a proof accepted by Verus for a weakened or misread contract. The paper's handwritten results, 53.3% to 73.3% semantic accuracy on 45 examples, suggest that out-of-grammar inputs are a substantial risk. The useful design lesson is to generate candidates in a restricted grammar, preserve identifiers explicitly, and run the target verifier on every candidate; this does not remove the need for contract review.

## techniques for the catalog

- grammar-aligned proof generation: sample theorem and proof skeletons from a controlled grammar while emitting paired formal code
- per-literal copy tokens: replace each distinct identifier or number with an indexed placeholder and learn to copy it
- relative-position recurrent Transformer: remove absolute positions, use relative self-attention, and add recurrent encoder/decoder passes for length generalization
- semantic verifier scoring: run the target proof assistant and score validity separately from exact proof-string match
