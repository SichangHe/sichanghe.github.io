# Enhancing Formal Theorem Proving: A Comprehensive Dataset for Training AI Models on Coq Code
(authored by agents unless marked 🧑)
Tag: `florath2024coq`, [paper](https://doi.org/10.48550/arxiv.2403.12627)

## scope and contribution

Florath presents `coq-facts-props-proofs`, a dataset intended to train language models to generate Coq definitions, propositions, and proofs. It is a data-engineering and small demonstration paper rather than a new proof calculus. Its formal-verification techniques are therefore (1) extracting prover-language units while preserving imports and provenance, (2) validating generated proof text with `coqc` or `coqide`, and (3) using proof diversity and verifier acceptance as training feedback. The dataset contains 103,446 facts and 166,035 proposition/proof rows; the paper reports 142 repositories and records each repository's URL, commit SHA, and SPDX license identifier (§§6–7, pp. 4–5).

The paper's central claim is that a curated, license-aware corpus improves a model's ability to produce Coq code. It does not prove that fine-tuning improves theorem-proving performance on a representative benchmark. The experiment is illustrative, runs on one Mistral-7b model for about seven days on one NVIDIA A30, and evaluates selected prompts at temperature 0.4 (§8, p. 5).

## technique 1: sentence-level extraction with provenance

What it is. The source is more useful for training when each Coq sentence is a row rather than an entire multi-million-character file. The authors collect `.v` files, use a customized OCaml parser to split Coq sentences, remove comments and directives such as `#global`, collapse repeated whitespace, and deduplicate by fact or proposition/proof content (§6, p. 4). Facts are definitions or notations. Proposition rows pair a proposition with its proof. The `info` table links a symbolic name to repository URL, checkout SHA, filename context, and license information.

When to use it. Use sentence-level extraction when a proof model needs compact examples with imports and identifiers, or when source files are too large for context windows. Retain imports because a tactic or notation may depend on imported modules. Retain a commit SHA so an example can be reproduced against the exact source snapshot.

How to do it. The paper's procedure is:

1. gather Coq repositories covering foundational libraries, mathematics, algorithms, and verified systems (§4, p. 3)
2. inspect README and LICENSE files; keep only repositories with an explicit redistributable open-source license (§5, p. 3)
3. copy original license and author files when required, rather than applying one license to the entire aggregate (§5, p. 3)
4. parse `.v` files with the customized OCaml parser; remove comments and directives, normalize whitespace, and split sentences (§6, p. 4)
5. deduplicate on fact or proposition/proof content, not file origin (§6, p. 4)
6. write `facts.parquet`, `props-proof.parquet`, and `info.parquet`, with imports, filenames, symbolic names, URLs, SHAs, and SPDX IDs (§6, pp. 4–5)

The paper states: “The dataset exclusively features Coq source code files (.v files), which were pre-processed using a customized OCaml parser to separate Coq sentences, remove comments, and eliminate directives like #global.” (§6, p. 4)

Evidence and limits. The facts table has 103,446 rows, mean length 132.26 characters, and maximum length 37,630. The proposition table has 166,035 rows, mean proposition length 104.05, mean proof length 347.88, and maximum proof length 177,585 (§7, pp. 4–5). The authors explicitly did no semantic evaluation during preprocessing: “The preprocessing was purely done on parsing level, no evluation of the Coq source code was done.” (§6, p. 4; spelling reproduced). They warn that some code may not evaluate or may not be compatible with the latest Coq version. Inference: a Verus analogue must run Verus after extraction; syntax-level parsing cannot certify a proof or even guarantee compatibility.

Verus form. Inference: store one Rust/Verus item per row while retaining module imports and source revision. A row can contain an executable function, its `requires`/`ensures`, loop `invariant` and `decreases` clauses, and proof functions or `assert` blocks. Inference: deduplicate only after canonicalizing syntax, because dropping import context or a trait bound can make a previously valid Verus item unusable. Inference: preserve source and commit metadata so a failed verification can be replayed against the exact dependency set.

## technique 2: training on facts, propositions, and proofs

What it is. The dataset separates definitions/notations from theorem statements and proof bodies, permitting models to learn both vocabulary and proof tactics. The paper's examples include induction (`induction n`), rewriting (`rewrite`), simplification (`simpl`), arithmetic automation (`auto with arith`), reflexivity, and ring normalization. Appendix 12.1 lists 141 distinct valid proofs for `plus_n_O : forall n:nat, n = n + 0`, demonstrating that one proposition can have many verifier-accepted proof scripts.

When to use it. Use fact rows for vocabulary and API context, proposition/proof pairs for supervised proof generation, and multiple proofs per proposition when the goal is tactic diversity rather than one canonical script. Include held-out propositions to test whether a model composes learned tactics instead of copying text.

How to do it. The paper's demonstration pipeline is:

1. fine-tune Mistral-7b on the complete dataset (§8, p. 5)
2. save snapshots every three hours during approximately seven days of training (§8, p. 5)
3. prompt snapshots with a lemma and truncate output at `Qed.` (§8, p. 5)
4. run each candidate through `coqc` or `coqide` at temperature 0.4 (§8, p. 5)
5. count only proofs accepted by the Coq checker; inspect the tactic and induction forms in the accepted set (§8.1, p. 5)

The paper reports: “Among the 563 responses generated that began with Proof., 141 were identified as valid (see section 12.1), demonstrating the model’s adeptness not only in understanding Coq syntax but also in navigating its semantic landscape to reach valid conclusions through various methods.” (§8.1.2, p. 5)

Evidence and limits. For `n = n + 0`, 141/563 responses beginning with `Proof.` were accepted, approximately 25.0%; the denominator excludes outputs that did not begin with `Proof.`. The paper does not report the number of prompts, snapshots, or total generations, so this is not a pass@1 estimate. In Experiment 2, the model generated `reflexivity` for `7 + 3 = 10`, a lemma absent from the training data; other models also succeeded. In Experiment 3, the intentionally false `S (m * n) = m * n + n` caused every tested model to attempt a proof instead of flagging the false premise (§8.3, p. 6). The paper states: “Despite the intrinsic fallacy in the lemma, all tested models, including Mistral-7b-Instruct, ChatGPT 4, Google Gemini, Starcoder2, and CoqLLM-FineTuned, endeavored to construct a proof without indicating any recognition of the proposition’s incorrectness.” (§8.3.2, p. 6)

Verus form. Inference: replace Coq's `Proof ... Qed.` with a Verus proof-bearing function whose executable behavior and contracts are fixed. A training target may contain `assert`, `assert forall`, loop `invariant`, `decreases`, `lemma` functions, and `broadcast` facts; only code accepted by Verus should count as valid. Inference: include negative examples in which the requested `ensures` clause is inconsistent or too strong, and train the agent to report an unprovable specification instead of adding `assume`, `admit`, `external_body`, or weakening the contract. Inference: measure proof acceptance with a denominator of all attempted generations, and separately report syntax failures, verifier failures, and invalid-specification detections.

## technique 3: license and reproducibility metadata as part of proof data

What it is. The dataset treats legal provenance and reproducibility as data fields rather than afterthoughts. The `info.parquet` table has 142 repository rows. License counts include MIT 43, LGPL-2.1-only 29, LGPL-2.1-or-later 12, CECILL-B 9, and other licenses (§7.1, p. 4). The paper omits files without an explicit open-source license or under a commercial license (§5, p. 3).

When to use it. Use this procedure for any model trained on public proof repositories. It makes a row traceable to its source, allows license filtering, and prevents a model checkpoint from silently mixing incompatible redistribution terms.

How to do it. Record repository URL, checkout SHA, filename, symbolic name, SPDX identifier, and copied license/author files. Filter before parsing and preserve the row-to-repository relation after deduplication. The paper states: “The compilation strictly omits libraries or files that lack an explicit open-source license or are under a commercial license, thereby ensuring that the dataset comprises only data that is legally redistributable.” (§5, p. 3)

Verus form. Inference: attach crate, commit, license, and dependency metadata to each Verus training item. A proof accepted against one crate revision may fail after an API or specification change; provenance enables replay and exposes that dependency boundary. Inference: this metadata does not strengthen a proof, but it identifies what remains trusted outside the Verus checker.

## what is measured and what remains trusted

Measured evidence is parser output size, license distribution, proof-string lengths, and acceptance of selected generated Coq scripts. The Coq kernel and its imported libraries remain trusted for the reported valid proofs; the dataset parser, deduplication, prompt truncation, model checkpoint, and human selection remain outside the formal result. The false-lemma experiment shows that checker acceptance alone does not teach specification criticism.

Inference: threat to VL is moderate for data quality and high for specification errors. The paper supplies a reusable pattern for provenance-preserving proof corpora and verifier-gated generation, but it does not establish that a model can discover useful Verus proofs on systems code. VL should not redo a generic Coq-style dataset exercise without Verus execution, anti-cheating checks, negative specifications, and denominator-complete evaluation. The paper's useful gap is an empirical Verus corpus with accepted proofs, rejected repairs, and explicit dependency revisions.

## techniques for the catalog

- sentence-level proof extraction — parse source files into facts and proposition/proof rows while retaining imports and provenance
- verifier-gated proof generation — run model outputs through the proof assistant and count only accepted scripts
- proof diversity sampling — collect multiple accepted tactic and induction strategies for one proposition
- license-aware corpus construction — filter repositories by explicit redistributable licenses and preserve SPDX, URL, and commit metadata
- false-specification detection — include invalid propositions and measure whether models report impossibility instead of fabricating proofs
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
