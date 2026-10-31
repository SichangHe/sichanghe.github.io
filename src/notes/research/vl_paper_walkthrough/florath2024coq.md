# Enhancing Formal Theorem Proving: A Comprehensive Dataset for Training AI Models on Coq Code
(authored by agents unless marked 🧑)
Tag: `florath2024coq`, [paper](https://arxiv.org/abs/2403.12627v2)

## scope and contribution

Florath presents `coq-facts-props-proofs`, a dataset intended to train language models to generate Coq definitions, propositions, and proofs. Inference: its contribution is corpus construction with an illustrative fine-tuning experiment. The paper describes extracting Coq facts and proposition/proof pairs while preserving imports and provenance, then checking selected generated proofs with `coqc` or `coqide`. It does not report feeding those checking results back into training. The dataset contains 103,446 facts and 166,035 proposition/proof rows; the paper reports 142 repositories and records each repository's URL, commit SHA, and SPDX license identifier (§§6–7, p. 4).

The paper presents selected examples as evidence of the dataset's usefulness. It states: “This exercise is meant to serve as an illustration of the dataset’s potential rather than a comprehensive or central focus of the paper.” (§8, p. 5) Inference: these examples do not establish improvement on a representative theorem-proving benchmark. The experiment is illustrative, runs on one Mistral-7b model for about seven days on one NVIDIA A30, and evaluates selected prompts at temperature 0.4 (§8, p. 5).

## technique 1: sentence-level extraction with provenance

What it is. The parser separates Coq sentences; the dataset stores a definition or notation in each fact row and a proposition with its proof in each proposition/proof row (§6, p. 4). Inference: these units offer more compact training examples than entire files. The authors collect `.v` files, use a customized OCaml parser to split Coq sentences, remove comments and directives such as `#global`, collapse repeated whitespace, and deduplicate by fact or proposition/proof content (§6, p. 4). Fact and proposition/proof rows retain imports, filename, and symbolic name. The `info` table links that symbolic name to repository URL, checkout SHA, and SPDX license identifier (§6, p. 4).

When to use it. Inference: use sentence-level extraction when a proof model needs compact examples with imports and identifiers, or when source files are too large for context windows. Retain imports because a tactic or notation may depend on imported modules. Retain a commit SHA so an example can be reproduced against the exact source snapshot.

How to do it. The paper's procedure is:

1. gather Coq repositories covering foundational libraries, mathematics, algorithms, and verified systems (§4, p. 3)
2. inspect README and LICENSE files; keep only repositories with an explicit redistributable open-source license (§§5–6, pp. 3–4)
3. include original license files and, where available, author files; retain the individual source licenses (§5, p. 3)
4. parse `.v` files with the customized OCaml parser; remove comments and directives, normalize whitespace, and split sentences (§6, p. 4)
5. deduplicate on fact or proposition/proof content, not file origin (§6, p. 4)
6. write `facts.parquet`, `props-proof.parquet`, and `info.parquet`, with imports, filenames, symbolic names, URLs, SHAs, and SPDX IDs (§6, p. 4)

The paper states: “The dataset exclusively features Coq source code files (.v files), which were pre-processed using a customized OCaml parser to separate Coq sentences, remove comments, and eliminate directives like #global.” (§6, p. 4)

Evidence and limits. The facts table has 103,446 rows, mean length 132.26 characters, and maximum length 37,630. The proposition table has 166,035 rows, mean proposition length 104.05, mean proof length 347.88, and maximum proof length 177,585 (§7, p. 4). The authors explicitly did no semantic evaluation during preprocessing: “The preprocessing was purely done on parsing level, no evluation of the Coq source code was done.” (§6, p. 4; spelling reproduced). They warn that some code may not evaluate or may not be compatible with the latest Coq version. Inference: a Verus corpus intended to contain checked proofs should run Verus after extraction; parsing alone cannot establish verification success.

Verus form. Inference: store one Rust/Verus item per row while retaining module imports and source revision. A row can contain an executable function, its `requires`/`ensures`, loop `invariant` and `decreases` clauses, and proof functions or `assert` blocks. Inference: preserve imports and trait bounds when deduplicating, since a proof may depend on that context. Inference: preserve source and commit metadata so a failed verification can be replayed against the exact dependency set.

## technique 2: training on facts, propositions, and proofs

What it is. The dataset separates definitions/notations from theorem statements and proof bodies (§6, p. 4). Inference: these provide training examples of vocabulary and proof tactics. The paper's examples include induction (`induction n`), rewriting (`rewrite`), simplification (`simpl`), arithmetic automation (`auto with arith`), reflexivity, and ring normalization. Appendix 12.1 lists 141 validated proof scripts for `plus_n_O : forall n:nat, n = n + 0`, demonstrating that one proposition can have many verifier-accepted proof scripts.

When to use it. Inference: use fact rows for vocabulary and API context, proposition/proof pairs for supervised proof generation, and multiple proofs per proposition when the goal is tactic diversity rather than one canonical script. Include held-out propositions to test whether a model composes learned tactics instead of copying text.

How to do it. The paper's demonstration pipeline is:

1. fine-tune Mistral-7b on the complete dataset (§8, p. 5)
2. save snapshots every three hours during approximately seven days of training (§8, p. 5)
3. generate responses across snapshots at temperature 0.4 (§8, p. 5)
4. curate output for readability, truncating at logical endpoints such as `Qed.`, and evaluate using `coqc` or `coqide` (§8, p. 5)
5. report valid responses and illustrate tactic diversity (§8.1, p. 5); Appendix 12.1 specifies `coqc` 8.19.1 and a validation file containing imports and notations (p. 8)

The paper reports: “Among the 563 responses generated that began with Proof., 141 were identified as valid (see section 12.1), demonstrating the model’s adeptness not only in understanding Coq syntax but also in navigating its semantic landscape to reach valid conclusions through various methods.” (§8.1.2, p. 5)

Evidence and limits. For `n = n + 0`, 141/563 responses beginning with `Proof.` were accepted (§8.1.2, p. 5). Inference: this is approximately 25.0% of that subset, whose denominator excludes outputs that did not begin with `Proof.`. The paper does not give the total number of generations or an exact count of evaluated snapshots. Inference: this fraction should not be treated as a single-attempt success rate. In Experiment 2, the model generated `reflexivity` for `7 + 3 = 10`, a lemma absent from the training data; ChatGPT 4, Google Gemini, and Starcoder2-15b also succeeded, while Mistral-7b-Instruct failed (§8.2, p. 6). In Experiment 3, the intentionally false `S (m * n) = m * n + n` caused every tested model to attempt a proof instead of flagging the false premise (§8.3, p. 6). The paper states: “Despite the intrinsic fallacy in the lemma, all tested models, including Mistral-7b-Instruct, ChatGPT 4, Google Gemini, Starcoder2, and CoqLLM-FineTuned, endeavored to construct a proof without indicating any recognition of the proposition’s incorrectness.” (§8.3.2, p. 6)

Verus form. Inference: replace Coq's `Proof ... Qed.` with a Verus proof-bearing function whose executable behavior and contracts are fixed. A training target may contain `assert`, `assert forall`, loop `invariant`, `decreases`, proof functions (`proof fn`), and `broadcast` facts; only code accepted by Verus should count as valid. Inference: include negative examples in which the requested `ensures` clause is inconsistent or too strong, and train the agent to report an unprovable specification instead of adding `assume`, `admit`, `external_body`, or weakening the contract. Inference: measure proof acceptance with a denominator of all attempted generations, and separately report syntax failures, verifier failures, and invalid-specification detections.

## technique 3: license and reproducibility metadata as part of proof data

What it is. The dataset treats legal provenance and reproducibility as data fields rather than afterthoughts. The `info.parquet` table has 142 repository rows. License counts include MIT 43, LGPL-2.1-only 29, LGPL-2.1-or-later 12, CECILL-B 9, and other licenses (§7.1, p. 4). The paper omits files without an explicit open-source license or under a commercial license (§5, p. 3).

When to use it. Inference: use this procedure when assembling training data from public proof repositories. It makes rows traceable and permits filtering by recorded license; metadata alone does not establish license compatibility.

How to do it. Identify licenses manually, prioritizing README hints over LICENSE contents; include only repositories permitting redistribution (§6, p. 4). Keep filename and symbolic name in example rows, with URL, SHA, and SPDX identifier in the repository table. Include original license files and available author files (§§5–6, pp. 3–4). Inference: preserve the example-to-repository relation after deduplication. The paper states: “The compilation strictly omits libraries or files that lack an explicit open-source license or are under a commercial license, thereby ensuring that the dataset comprises only data that is legally redistributable.” (§5, p. 3)

Verus form. Inference: attach crate, commit, license, and dependency metadata to each Verus training item. A proof accepted against one crate revision may fail after an API or specification change; provenance enables replay and exposes that dependency boundary. Inference: metadata enables tracing a proof to its source; checking the proof still requires Verus and the appropriate dependencies.

## what is measured and what remains trusted

The paper reports dataset sizes, license distribution, character lengths, and validity of selected generated Coq scripts (§§7–8, pp. 4–6). Inference: the validity results depend on the checker and the validation context, including imported assumptions. They do not certify the dataset parser, deduplication, or evaluation design. Experiment 3 reports that every model attempted the false proposition; it does not test training on checker feedback (§8.3, p. 6).

Inference: the paper offers a pattern for constructing proof corpora with provenance and checking generated proofs, but gives no evidence about Verus proofs for systems code. A Verus extension could record accepted proofs, rejected attempts, and dependency revisions, evaluate all attempted generations, and separately test responses to invalid specifications. These are proposed extensions, not results of this paper.

## techniques for the catalog

- sentence parsing and proof-pair extraction — parse source files into facts and proposition/proof rows while retaining imports and provenance
- proof-assistant validation — check selected model outputs using `coqc` or `coqide`; retain imports and notations needed for validation
- proof diversity sampling — generate and validate multiple proof scripts for one proposition; compare their tactics and induction forms
- license-aware corpus construction — filter repositories by explicit redistributable licenses and preserve SPDX, URL, and commit metadata
- false-proposition probing — prompt models with an intentionally erroneous proposition and inspect whether they recognize the error; all tested models attempted a proof
