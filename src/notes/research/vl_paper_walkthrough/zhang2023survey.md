# A Survey of Learning-based Automated Program Repair
(authored by agents unless marked 🧑)
Tag: `zhang2023survey`, [paper](https://arxiv.org/abs/2301.03270v3)


## what the survey contributes

This survey reviews 112 learning-based automated program-repair papers collected through November 2022 (Section 2, pp.4–5), with a separate discussion of selected 2023 advances (Section 7.4, pp.50–52). It organizes repair into localization, preprocessing, generation, ranking, validation, and correctness assessment.

Inference: for VL, producing a candidate proof or patch and establishing its correctness are different stages. Test-passing patches are only plausible; semantic correctness needs stronger evidence (Sections 3.1 and 4.7, pp.6 and 20).

The survey defines the pipeline as follows: “The framework can be generally divided into six phases: fault localization, data pre-processing, input encoding, output decoding, patch ranking, patch validation, and patch correctness assessment.” (Section 4.1, p.8). The sentence lists seven items but calls them six phases. The subsequent six numbered steps combine encoding and decoding under patch generation (pp.8–9).

## technique 1: fault localization before repair

what it is: rank statements, methods, or syntax-tree elements by suspiciousness before asking a model to generate a fix. Spectrum-based fault localization (SBFL) uses passing and failing test coverage; mutation, slicing, and learned localizers are alternatives.

Inference: use localization when many edit sites are possible or a proof failure does not identify the faulty invariant or lemma.

how to do it:

1. execute the available passing and failing tests
2. compute a suspiciousness score for each covered program element
3. rank elements descending by score (Section 4.2, pp.9–10)
4. provide the top-ranked line, method, or subtree to the repair model
5. Inference: record whether localization was normal or perfect and disclose differences when comparing systems

The survey states: “the program elements executed by more failing test suites and fewer passing test suites are likely to be faulty” (Section 4.2.1, p.9). It also warns that fault localization can bias evaluation and that perfect localization assumes the genuine buggy element is known (Section 4.2.1, p.10).

Inference: Verus adaptation: map a failing Verus diagnostic, counterexample, or unsatisfied postcondition to candidate `assert`, invariant, `requires`, `ensures`, or `proof fn` sites. Rank sites using repeated verifier failures across generated tests or proof obligations, then ask the agent to edit only the selected scope. The survey does not define Verus localization; this is an inference. A wrong location cannot yield a correct repair even if generation is strong, so report localization recall separately.

## technique 2: context, abstraction, and tokenization

what it is: convert the localized buggy code into a model input while balancing semantic context against sequence length and vocabulary. The survey groups preprocessing into code context, abstraction, and tokenization.

how to do it:

1. choose context-free, statement-level, method-level, or class-level context; method-level is common because it includes variables and function behavior (Section 4.3.1, pp.11–12)
2. abstract identifiers, numbers, and strings to placeholders when vocabulary reduction helps, preserving a mapping back to the original code (Section 4.3.2, pp.12–13)
3. tokenize at word or subword level; subword options include BPE, BBPE, and SentencePiece; convert tokens to IDs (Section 4.3.3, pp.13–14)
4. Inference: keep preprocessing consistent between training and evaluation and report context granularity

The survey says: “There seems to be a trade-off relationship between vocabulary size and context size.” (Section 4.3.1, p.11). Figure 6 shows raw and abstracted versions of both a buggy method ending in `return n` and its fixed version ending in `return m` (p.12).

Inference: Verus adaptation: preserve the full contract and relevant invariants as context; abstract only alpha-renamable local names, never specification predicates or type bounds. Tokenization should keep Verus tokens such as `requires`, `ensures`, `invariant`, `assert`, and quantifier triggers intact enough for parsing. A round-trip parser and Verus compilation must reject mappings that change the contract.

## technique 3: sequence, tree, and graph patch generation

what it is: generate candidate repairs using sequence-to-sequence decoding, AST/tree edits, or graph representations of syntax and data flow.

how to do it:

1. train on supervised bug/fix pairs or self-supervised examples; SelfAPR generates perturbed programs with compilation and execution diagnostics (Section 4.8.1, pp.26–27)
2. at inference time, encode the preprocessed buggy snippet
3. generate candidate replacement tokens, edits, subtrees, or graph transformations
4. rank alternatives, commonly using beam search (Section 4.5, pp.17–19)
5. validate candidates by compilation and test execution (Section 4.6, pp.19–20)

The survey explains that an encoder produces hidden states and a decoder returns a vocabulary distribution over generated tokens (Section 4.1, p.9). It notes that sequence models can miss long-range dependencies, while tree and graph models encode syntax or relations more directly (Sections 4.4.1–4.4.3, pp.15–17).

Inference: Verus adaptation: generate complete Rust/Verus snippets or localized AST edits, but make every candidate pass parsing and Verus checking. Tree edits are useful for changing an invariant expression without altering unrelated code; graph context can encode ownership/data-flow dependencies. The model output is untrusted search, and no generated proof is accepted until the verifier checks it.

## technique 4: beam-search patch ranking

what it is: retain the k highest-probability token sequences or patches and validate them in ranked order.

how to do it:

1. decode token probabilities from the trained model
2. at each position keep the top-k partial sequences
3. for code-aware ranking, apply valid-identifier checks and length control, as in CURE (Section 4.5, p.18)
4. complete candidates, rank them, and send them to validation
5. stop validation when a plausible patch is found, as in CIRCLE, or apply a time limit, as in DEAR and DLFix (Section 4.6, p.19)

The paper says beam search “provides a great trade-off between repair accuracy versus inference cost via its flexible choice of beam size.” (Section 4.5, p.18). Ranking criteria include coverage of the correct patch, retrieval speed, and prioritization using code information (Section 4.5, p.19).

Inference: Verus adaptation: rank by syntactic validity, changed-contract diff size, proof-obligation reduction, and prior Verus success, then run Verus in that order. Probability ranking cannot establish correctness; it only schedules verifier calls.

## technique 5: patch validation with executable specifications

what it is: execute available tests or static analysis on each generated candidate and retain patches that pass. Such a patch is plausible, not necessarily correct.

how to do it:

1. compile the candidate
2. run the existing test suite or static analyzer
3. discard failing candidates and continue through the ranked list
4. Inference: record compilable and plausible candidate counts and the test configuration
5. pass surviving candidates to correctness assessment and human review

The survey states: “the generated candidate patches are then verified by the available program specification, such as functional test suites or static analysis tools [14], detailed in Section 4.6.” (Section 4.1, p.9). Its metric definitions distinguish a compilable patch, a plausible patch that passes all available tests, and a correct patch that generalizes the potential test suite (Section 6.2.1, p.40).

Inference: Verus adaptation: substitute a pinned Verus invocation and repository build for test execution. A candidate is mechanically verified only when Verus proves the unchanged intended contract; keep tests as an additional dynamic check. Never call a proof that uses `assume` or an altered specification “correct” solely because the command exits successfully.

## technique 6: automated patch correctness assessment (APCA)

what it is: classify or rank plausible patches as likely correct or overfitting using static representations, dynamic traces, historical patches, or learned classifiers.

how to do it:

1. assemble labeled patches for supervised approaches, or historical patches with failing tests for a similarity approach such as BATS (Section 4.7, pp.22–23)
2. extract static syntax/change features and/or dynamic execution traces
3. train a classifier or compute similarity to historical patches
4. Inference: evaluate precision/recall across projects and datasets, including subjects outside training, following the cross-dataset concern in Section 6.3 (p.43)
5. manually review surviving patches before deployment

The survey warns: “the test suite is an incomplete specification as it only describes a part of the program’s behavioral space.” (Section 4.7, p.20). It describes PATCH-SIM as comparing test execution traces and ODS as reaching 71.9% accuracy in detecting overfitting patches from 26 projects (Section 4.7, pp.21–22). The survey does not state the number of classified patches underlying that percentage in this passage.

Inference: Verus adaptation: APCA features should include changed pre/postconditions, added assumptions, removed invariants, verifier version, and proof-obligation coverage. A second classifier may prioritize review, but only an independent Verus run against a frozen specification can provide mechanical evidence. Human contract review remains necessary because a vacuous contract may verify.

## what is measured, trusted, and already done

The survey reports execution metrics (compilable, plausible, correct) and match metrics such as Accuracy@K and BLEU. It cautions that token matching ignores semantically equivalent alternatives and that BLEU was designed for natural language (Section 6.2.2, p.41). Inference: correctness labels, developer patches, test suites, localization assumptions, data splits, and learned classifiers are assumptions or evidence to audit; none proves arbitrary program semantics.

Inference: VL should not redo generic NMT patch generation, beam search, test-only validation, or token-match metrics as if they establish verified Rust correctness. Those components are established baselines. VL’s new work should focus on contract-preserving repair, Verus-specific localization, independent specification review, and denominator-correct reporting of verifier success. The product threat is overfitting: an agent can make tests or a weak specification pass while deleting behavior. The survey cites 105 C bugs for which many overfitting patches were equivalent to deleting buggy functionality (Section 4.7, p.20), illustrating why a green test suite is insufficient.

## techniques for the catalog

- spectrum-based localization — rank suspicious code from passing/failing execution coverage before generation
- contract-aware preprocessing (Inference: Verus adaptation) — choose context, abstraction, and tokenization without dropping specifications
- multi-representation generation — generate sequence, AST, or graph edits and decode candidates to source
- beam-search scheduling — retain top-k candidates and spend validation budget in probability order
- executable patch validation — compile and run tests or static analysis to identify plausible patches
- automated patch correctness assessment — classify overfitting with static/dynamic features, similarity, or learned models
- execution-versus-match metrics — report compilable, plausible, correct, Accuracy@K, and BLEU separately
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The application of existing pre-trained models to program repair is usually divided into two categories: universal and specific pre-trained model-based APR techniques."): checked all study quotations, counts, section/page references, technique steps, and the paper link after reading the full text including references; corrected 87 papers to 112, the placeholder DOI to the paper’s arXiv identifier, page references, preprocessing and training descriptions, and unsupported denominator detail; marked VL/Verus recommendations as inferences; did not reproduce cited experiments, inspect underlying tools/datasets, or verify external links.
