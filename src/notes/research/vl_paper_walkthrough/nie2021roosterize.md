# Roosterize: Suggesting Lemma Names for Coq Verification Projects Using Deep Learning
(authored by agents unless marked 🧑)
Tag: `nie2021roosterize`, [paper](https://www.semanticscholar.org/paper/e94f4d49a7fad880514fc3553062556df02dd4a6)

## what the paper builds

ROOSTERIZE predicts names for newly written Coq lemmas from the lemma statement and Coq's internal representations. It combines an OCaml extraction toolchain with a PyTorch/OpenNMT neural model and exposes suggestions through a command line and a Visual Studio Code extension. The paper's abstract says: “ROOSTERIZE learns naming conventions by leveraging neural networks trained on existing Coq code.” (Abstract, p. 1.)

Inference: This is a developer-assistance technique rather than a proof checker. A suggested name can improve searchability and consistency, but Coq still checks the statement and proof. Inference: The transferable object for Verus is a learned naming and retrieval aid for lemmas/specifications, not a soundness argument.

## technique: extract source, syntax, and kernel trees

### what it is

The tool obtains three views of each lemma: token text, a syntax tree from parsing, and an elaborated kernel tree from proof checking. The paper states: “Syntax trees are Coq’s internal representations of source code elements, including lemmas, during the parsing phase. Kernel trees are Coq’s internal representations of statements and functions during proof checking, and contain rich information relevant for lemma naming.” (Section II-A, p. 2.) DataMiner invokes SerAPI's `sertok`, `sercomp`, and `sername`, and stores each view with the original lemma name.

### when to use it

Inference: Use multiple representations when surface source names hide the semantic structure that naming should describe. Kernel terms are useful when notation, implicit arguments, and elaboration change the statement's meaning. A single representation is cheaper but may omit precisely the type and operator information that distinguishes lemmas.

### steps from the paper

1. Parse and compile the Coq project so SerAPI can inspect it (Section IV-A, p. 3).
2. Run `sertok` to extract tokens, `sercomp` for syntax trees, and `sername` for kernel trees (Section II-A, p. 2).
3. Let DataMiner collect every lemma statement, its name, and all three extracted views (Section II-A, p. 2).
4. Feed selected views to the neural model and retain the original names as training targets (Section II-B, p. 2).

### Verus form

Inference: A Verus analogue would parse Rust/Verus source and collect the function signature, `requires`/`ensures` clauses, `spec fn` bodies, and normalized proof obligations after Verus elaboration. The paper's Coq-specific SerAPI calls do not carry over; the replacement extractor must be implemented against Verus's available output. Use the extracted semantic view as model input while keeping the original Verus declaration as the generated name target. The name has no effect on proof soundness, and the proof must still verify with Verus.

## technique: sub-tokenization and tree chopping

### what it is

Names in mathematical libraries mix abbreviations, underscores, and case conventions. ROOSTERIZE splits names and tree tokens into sub-tokens; for example, `extprod_mulgA` becomes `extprod`, `mul`, `g`, and `A` (Section II-B, p. 2). Large syntax and kernel trees are reduced before encoding. The paper gives three chopping rules: “(1) replace the fully qualified name sub-trees with only the last component of the name; (2) remove the line number information from sub-trees; (3) extract the singletons, i.e., non-leaf nodes that have only one child.” (Section II-B, p. 2.)

### steps and use

1. Apply a project naming tokenizer to each target name and to input tree labels (Section II-B, p. 2).
2. Replace fully qualified names by their final component (Section II-B, p. 2).
3. Delete line-number metadata (Section II-B, p. 2).
4. Collapse singleton nodes and pass the chopped sequences to the encoder (Section II-B, p. 2).

Inference: For Verus, tokenize snake-case and camel-case lemma names, type names, operators, and common specification words. Remove source locations and crate-qualified paths that vary across checkouts, but retain type and trait information. This is an inference because the paper has no Rust or Verus tokenizer. Over-aggressive chopping can erase the ownership or generic information needed to distinguish two obligations.

## technique: multi-input sequence-to-sequence name generation

### what it is

ROOSTERIZE uses an encoder-decoder architecture. Separate recurrent neural-network encoders consume the statement, chopped syntax tree, and chopped kernel tree. Their representations are combined, then a recurrent decoder generates a sequence of name sub-tokens. Attention and a copy mechanism improve generation. The paper says: “The decoder is another RNN that generates the descriptive lemma name based on the input deep semantic representation.” (Section II-B, p. 2.) It adds: “We equipped the decoder RNN with attention mechanism [14] and copy mechanism [15] to improve the generation accuracy.” (Section II-B, p. 2.)

### steps from the paper

1. Select one or more of statement, chopped syntax tree, and chopped kernel tree as encoder inputs (Section II-B, p. 2).
2. Encode each input sequence with an RNN and combine the encoded representations (Section II-B, p. 2).
3. Decode name sub-tokens with an RNN using attention over encoder states and copying of useful input tokens (Section II-B, p. 2).
4. Concatenate generated sub-tokens into a candidate lemma name (Section II-B, p. 2).
5. Generate the top `k` candidates; the command-line default is `k=5` (Section IV-A, p. 3).

### Verus form

Inference: Train the same pattern with Verus contract and proof-context encoders, and decode names such as `lemma_sorted_push` or `ensures_len_nonzero`. Candidate names can be inserted into a draft crate, after which Verus checks that references and proofs still compile. A Verus-specific model may need a transformer rather than the paper's RNN, but that is an implementation choice outside the paper. The generated name cannot change the specification's semantics; it only changes the identifier.

## technique: project and editor integration

The command-line workflow requires a `CoqProject` file and compiled source. A project can set `compile_cmd` in `.roosterizerc`; then `roosterize suggest_naming --file=$PWD/finmap/finmap.v` parses one file, generates top-k names, compares them with existing names, and prints a report (Section IV-A, p. 3). The authors connect the server to VSCode using Language Server Protocol. In the editor, nonconforming names are underlined and suggestions appear in tooltips or the Problems tab (Section IV-B, p. 3).

Inference: A Verus plugin could run after a successful `cargo verus` check, send the current module and proof context to a local name service, and underline names whose model-ranked alternatives better match the learned crate convention. LSP is an integration mechanism, not a verification technique; deployment must avoid sending proprietary code to an external model.

## evidence and measured limits

The quantitative corpus contains four MathComp projects: 164,000 lines, 187 files, and 11,266 lemmas. Files are split 80%/10%/10% into training, validation, and test sets, yielding 8,861, 1,085, and 1,320 lemmas (Section V-A, p. 3). The paper evaluates BLEU, fragment accuracy, top-1, and top-5 accuracy. The strongest single-input configuration, `Stmt+ChopKnlTree`, scores BLEU 47.2, fragment accuracy 24.9%, top-1 9.6%, and top-5 18.0%; the retrieval baseline scores 28.3, 10.0%, 0.2%, and 0.3% (Table I, p. 4). The denominator for top-1 and top-5 is the 1,320-lemma test set; the paper reports percentages but does not give integer hit counts.

The three-input model scores BLEU 45.4, fragment accuracy 22.2%, top-1 7.5%, and top-5 16.5%. Thus adding every representation is not best on these metrics; the kernel tree plus statement is better. The authors report ablations in an earlier IJCAR paper, so this article's table does not independently quantify each attention or copy ablation (Section V-A, p. 4).

The qualitative case study uses FCSL PCM, a 690-lemma project. Thirty-six suggestions (5% of 690) exactly match existing names. A maintainer judged 20% of inspected remaining suggestions to be good quality, with more than half of those high quality (Section V-B, p. 4). The inspected denominator is not stated as all 654 nonexact suggestions; the wording says “suggested names he inspected,” so the 20% must not be treated as a whole-project acceptance rate.

The approach assumes representative training projects, stable naming conventions, successful compilation, and a tokenizer that preserves meaningful terms. It does not prove that names are semantically correct, that a maintainer accepts a suggestion, or that names improve proof search. Retrieval and exact-match metrics reward agreement with the developers' names, not necessarily better names.

## Verus transfer, trusted parts, and product threat

Inference: For VL, the strongest direct transfer is a local model that names generated `proof fn`s and lemmas consistently, then feeds those names into future premise retrieval. A second transfer is multi-view encoding: surface Rust plus elaborated Verus contracts may help distinguish obligations that look similar as text. The paper's Coq parser, SerAPI, RNN choice, and MathComp conventions are already done work and should not be presented as new VL contributions.

Inference: The checker, parser, model code, training corpus, and specification remain trusted or operational dependencies. A name suggestion does not enlarge the trusted computing base for proof validity if Verus rechecks the unchanged code. Inference: The threat to an agent-written verified-Rust product is low to medium. Naming can reduce retrieval errors and make generated code maintainable, but it cannot repair a weak specification, prove unsafe behavior, or establish that a generated lemma statement matches user intent. The small exact-match rate (9.6% top-1 on the test denominator) also warns against treating model output as authoritative.

## techniques for the catalog

- semantic proof-artifact extraction — collect source tokens, parsed trees, and elaborated kernel terms before learning a lemma name
- sub-token and tree chopping — split naming units and remove unstable qualified-name, location, and singleton-tree detail
- multi-input seq2seq generation — encode statement and internal trees, then decode candidate names with attention and copying
- top-k naming assistance — return several ranked names and compare them with existing declarations
- LSP verification-editor integration — surface model suggestions beside source names through command line and editor tooling

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
