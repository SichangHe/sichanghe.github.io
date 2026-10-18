# Roosterize: Suggesting Lemma Names for Coq Verification Projects Using Deep Learning
(authored by agents unless marked 🧑)
Tag: `nie2021roosterize`, [paper](https://arxiv.org/abs/2103.01346)

## what the paper builds

ROOSTERIZE suggests names for the lemmas in Coq files from the lemma statement and Coq's internal representations; the command-line tool compares the generated names with the existing ones and reports possible renames. It combines an OCaml extraction toolchain with a PyTorch/OpenNMT neural model and exposes suggestions through a command line and a Visual Studio Code extension. The paper's abstract says: “ROOSTERIZE learns naming conventions by leveraging neural networks trained on existing Coq code.” (Section I, p. 1.)

Inference: This is a developer-assistance technique rather than a proof checker. A suggested name can improve searchability and consistency, but Coq still checks the statement and proof. Inference: The transferable object for Verus is a learned naming and retrieval aid for lemmas/specifications, not a soundness argument.

## technique: extract source, syntax, and kernel trees

### what it is

The tool obtains three views of each lemma: token text, a syntax tree from parsing, and an elaborated kernel tree from proof checking. The paper states: “Syntax trees are Coq’s internal representations of source code elements, including lemmas, during the parsing phase. Kernel trees are Coq’s internal representations of statements and functions during proof checking, and contain rich information relevant for lemma naming.” (Section II-A, p. 2.) DataMiner invokes SerAPI's `sertok`, `sercomp`, and `sername`, and extracts from the Coq files all lemmas with their names, statements, and syntax and kernel trees.

### when to use it

Inference: Use multiple representations when surface source names hide the semantic structure that naming should describe. Kernel terms are useful when notation, implicit arguments, and elaboration change the statement's meaning. A single representation is cheaper but may omit precisely the type and operator information that distinguishes lemmas.

### steps from the paper

1. Provide a `_CoqProject` file in the project root and compile the project source code before suggesting names (Section IV-A, p. 3).
2. Run `sertok` to extract tokens, `sercomp` for syntax trees, and `sername` for kernel trees (Section II-A, p. 2).
3. Let DataMiner orchestrate these programs to obtain all lemmas in the given Coq files and their names, lemma statements, and syntax and kernel trees (Section II-A, p. 2).
4. Feed the sub-tokenized inputs to the neural model, which generates the lemma name as output (Section II-B, p. 2). The model is trained on existing Coq code (Section I, p. 1).

### Verus form

Inference: A Verus analogue would parse Rust/Verus source and collect the function signature, `requires`/`ensures` clauses, `spec fn` bodies, and normalized proof obligations after Verus elaboration. The paper's Coq-specific SerAPI calls do not carry over; the replacement extractor must be implemented against Verus's available output. Use the extracted semantic view as model input and the existing Verus lemma name as the generated-name target. The name has no effect on proof soundness, and the proof must still verify with Verus.

## technique: sub-tokenization and tree chopping

### what it is

Names in mathematical libraries mix abbreviations, underscores, and case conventions. In ROOSTERIZE, all inputs and the output are sequences of sub-tokens, produced by a sub-tokenizer based on the MathComp conventions; the paper's example sub-tokenizes `extprod_mulgA` to extprod, a separator, mul, g, and A (Section II-B, p. 2; the separator symbol is lost in the text extraction, and Section I decomposes the same name into `extprod`, `mul`, `g`, and `A`). Large syntax and kernel trees are reduced before encoding. The paper gives three chopping rules: “(1) replace the fully qualified name sub-trees with only the last component of the name; (2) remove the line number information from sub-trees; (3) extract the singletons, i.e., non-leaf nodes that have only one child.” (Section II-B, p. 2.)

### steps and use

1. Apply the sub-tokenizer to the inputs and the output name; the output sub-tokens are concatenated to form the generated name (Section II-B, p. 2).
2. Before feeding syntax and kernel trees to the encoders, replace fully qualified name sub-trees with only the last component of the name (Section II-B, p. 2).
3. Delete line-number metadata (Section II-B, p. 2).
4. Extract the singletons, i.e. non-leaf nodes that have only one child, and feed the chopped trees to the encoders (Section II-B, p. 2).

Inference: For Verus, tokenize snake-case and camel-case lemma names, type names, operators, and common specification words. Remove source locations and crate-qualified paths that vary across checkouts, but retain type and trait information. This is an inference because the paper has no Rust or Verus tokenizer. Over-aggressive chopping can erase the ownership or generic information needed to distinguish two obligations.

## technique: multi-input sequence-to-sequence name generation

### what it is

ROOSTERIZE uses an encoder-decoder architecture. Separate recurrent neural-network encoders consume the statement, chopped syntax tree, and chopped kernel tree. Per Fig. 2, the encoders feed a fully connected layer, and a recurrent decoder generates a sequence of name sub-tokens; the model can use any combination of the three encoders (Section II-B, p. 2). Attention and a copy mechanism are added to improve generation accuracy. The paper says: “The decoder is another RNN that generates the descriptive lemma name based on the input deep semantic representation.” (Section II-B, p. 2.) It adds: “We equipped the decoder RNN with attention mechanism [14] and copy mechanism [15] to improve the generation accuracy.” (Section II-B, p. 2.)

### steps from the paper

1. Select one or more of statement, chopped syntax tree, and chopped kernel tree as encoder inputs (Section II-B, p. 2).
2. Encode each input with its RNN encoder; the paper says the encoders learn a deep semantic representation of the lemma statement from its tokens, syntax tree, and kernel tree (Section II-B, p. 2).
3. Decode name sub-tokens with an RNN decoder equipped with attention and copy mechanisms (Section II-B, p. 2).
4. Concatenate generated sub-tokens into a candidate lemma name (Section II-B, p. 2).
5. In the command-line tool, generate the top `k` likely names for each lemma; the default is `k = 5` (Section IV-A, p. 3).

### Verus form

Inference: Train the same pattern with Verus contract and proof-context encoders, and decode names such as `lemma_sorted_push` or `ensures_len_nonzero`. Candidate names can be inserted into a draft crate, after which Verus checks that references and proofs still compile. A Verus-specific model may need a transformer rather than the paper's RNN, but that is an implementation choice outside the paper. The generated name cannot change the specification's semantics; it only changes the identifier.

## technique: project and editor integration

The command-line workflow requires a `_CoqProject` file in the format used by `coq_makefile` and compiled source. A project can set `compile_cmd` in `.roosterizerc`; ROOSTERIZE then compiles automatically before suggesting; it suggests names for one Coq file at a time. `roosterize suggest_naming --file=$PWD/finmap/finmap.v` parses the file, generates top-k names, compares them with the original names, and prints a report (Section IV-A, p. 3). The authors use the Language Server Protocol to connect the server to the VSCode client (Section II-A, p. 2). In the editor, names that do not conform to the conventions are underlined, the suggestion appears in a tooltip on hover, and all suggestions are listed in the Problems tab (Section IV-B, p. 3).

Inference: A Verus plugin could run after a successful `cargo verus` check, send the current module and proof context to a local name service, and underline names whose model-ranked alternatives better match the learned crate convention. LSP is an integration mechanism, not a verification technique; deployment must avoid sending proprietary code to an external model.

## evidence and measured limits

The quantitative corpus contains four MathComp projects: 164,000 lines, 187 files, and 11,266 lemmas. Files are split 80%/10%/10% into training, validation, and test sets, yielding 8,861, 1,085, and 1,320 lemmas (Section V-A, p. 3). The paper evaluates BLEU, fragment accuracy, top-1, and top-5 accuracy. The best-scoring configuration in Table I, `Stmt+ChopKnlTree` (statement plus chopped kernel tree), scores BLEU 47.2, fragment accuracy 24.9%, top-1 9.6%, and top-5 18.0%; the retrieval baseline scores 28.3, 10.0%, 0.2%, and 0.3% (Table I, p. 4). The paper reports percentages but no integer hit counts; Inference: the denominator is the 1,320-lemma test set, since models are applied to the testing set.

The three-input model scores BLEU 45.4, fragment accuracy 22.2%, top-1 7.5%, and top-5 16.5%. Thus adding every representation is not best on these metrics; the kernel tree plus statement is better. The authors report ablations in an earlier IJCAR paper, so this article's table does not quantify the attention or copy ablations. The paper also cites a generalization study (Appendix D.3 of the IJCAR paper) showing ROOSTERIZE "can perform well on a new project with little additional training" (Section V-A, p. 4).

The qualitative case study uses FCSL PCM, a 690-lemma project. Thirty-six suggestions (5% of 690) exactly match existing names. The maintainer was asked to comment on the remaining suggestions and "found that 20% of the suggested names he inspected were of good quality, out of which more than half were of high quality"; the analysis was of top-1 suggestions (Section V-B, p. 4). The Introduction says the maintainer manually evaluated "over 150 name suggestions" (Section I, p. 1), so the inspected set is not all 654 nonexact suggestions (690 minus 36, Inference: arithmetic), and the 20% must not be treated as a whole-project acceptance rate.

The paper's limitations section says suggestion quality "is highly dependent on the quality of the pre-trained neural networks", that building a model needs careful curation of Coq training data, and that other datasets are needed for conventions other than MathComp's; the VSCode extension cannot give suggestions in real time while a lemma is edited (Section VI, p. 4). Inference: the approach also assumes stable naming conventions, successful compilation, and a sub-tokenizer that preserves meaningful terms. Inference: it does not show that names are semantically correct or that names improve proof search, and metrics that compare with developer names reward agreement, not necessarily better names.

## Verus transfer, trusted parts, and product threat

Inference: For VL, the strongest direct transfer is a local model that names generated `proof fn`s and lemmas consistently, then feeds those names into future premise retrieval. A second transfer is multi-view encoding: surface Rust plus elaborated Verus contracts may help distinguish obligations that look similar as text. The paper's Coq parser, SerAPI, RNN choice, and MathComp conventions are already done work and should not be presented as new VL contributions.

Inference: The checker, parser, model code, training corpus, and specification remain trusted or operational dependencies. A name suggestion does not enlarge the trusted computing base for proof validity if Verus rechecks the unchanged code. Inference: The threat to an agent-written verified-Rust product is low to medium. Naming can reduce retrieval errors and make generated code maintainable, but it cannot repair a weak specification, prove unsafe behavior, or establish that a generated lemma statement matches user intent. The small exact-match rate (9.6% top-1 on the test denominator) also warns against treating model output as authoritative.

## techniques for the catalog

- semantic proof-artifact extraction — collect source tokens, parsed trees, and elaborated kernel terms before learning a lemma name
- sub-token and tree chopping — split naming units and remove unstable qualified-name, location, and singleton-tree detail
- multi-input seq2seq generation — encode statement and internal trees, then decode candidate names with attention and copying
- top-k naming assistance — return several ranked names and compare them with existing declarations
- LSP verification-editor integration — surface model suggestions beside source names through command line and editor tooling

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "In the last command, ROOSTERIZE uses SerAPI to parse finmap.v and extracts all lemmas, then uses the lemma names suggestion model to generate top k (default k = 5) likely lemma names for each lemma"): read the whole paper text (4 pages) and the whole study; checked every quotation, the corpus and split numbers, Table I figures, the case-study numbers, step descriptions and section/page references. Changed: the abstract quote now cites Section I; names are suggested for existing lemmas, not only newly written ones; `Stmt+ChopKnlTree` is the best configuration, not a single-input one; sub-tokenization, chopping and model steps now follow the paper wording (singletons are extracted, not collapsed; encoders feed a fully connected layer); the 20% case-study figure now notes the "over 150" inspected suggestions; LSP is cited to Section II-A; added the limitations section; marked own conclusions "Inference:". Not checked: the IJCAR 2020 paper, the PDF figures beyond reading Fig. 2 text, the linked tool or demo video, and the Verus transfer ideas, which are inferences. Link changed to the arXiv id printed in the paper text (arXiv:2103.01346v2).
