# Herald: A Natural Language Annotated Lean 4 Dataset
(authored by agents unless marked 🧑)
Tag: `gao2024herald`, [paper](http://arxiv.org/abs/2410.10878v2)

## scope and result

Herald is a dataset and autoformalization pipeline built from Mathlib4. It uses Lean-Jixia to extract theorem structure, generates natural-language/formal-language (NL-FL) pairs with retrieval-augmented prompts, augments them with tactic states and paraphrases, and fine-tunes a translator. The authors describe the contribution as “a structural-information-aware pipeline for augmenting NL-FL datasets from any Lean project.” (introduction, p. 2). The pipeline validates generated Lean statements with the compiler and checks meaning with back-translation and natural-language inference (NLI).

Inference: the direct lesson for VL is a specification-data pipeline: mine structured context from a codebase, generate candidate Rust/Verus contracts, and reject candidates that do not verify. Herald does not verify Rust, memory safety, concurrency, or product behavior.

## technique 1: dependency-aware NL-FL generation

What it is. Lean-Jixia parses Lean files for theorem declarations, proof structures, and dependency relationships. The pipeline supplies the model with five context components: head statements, kind, docstrings, neighboring statements, and dependent theorems (section 3.1.1, p. 4). It builds a dependency DAG, stratifies statements by distance from roots, and translates lower levels before dependent targets. The paper says: “By translating statements in the level order, we ensure that the natural language translations of dependent theorems are available during the translation process, thereby providing missing dependent information that does not exist in the formal statements.” (section 3.1.1, p. 4).

Inference: When to use it. Use this when a formal statement relies on definitions or lemmas whose meaning cannot be inferred from the target text alone. Dependency order reduces fabricated explanations of hidden prerequisites.

How to do it. (1) Parse the project and extract declarations, statement kinds, docstrings, neighboring statements, and dependencies. (2) Build a dependency DAG. (3) Assign levels starting with statements having no dependencies. (4) Translate in increasing level order, including already translated dependencies and neighboring context. (5) Retrieve the closest example from 1,000 manually annotated theorems by embedding formal statements and add it to the prompt. (6) Generate NL descriptions and retain their formal counterparts (section 3.1.1, pp. 4–5). Five pure-mathematics PhD students with Lean expertise refined prompts through six feedback rounds, producing over a dozen principles (p. 5).

For proof informalization, extract tactic-based proof lines and provide the formal and informal statements, tactic explanations, and proof states. Translate each line, then combine the translations into a whole informal proof (section 3.1.2, pp. 5–6). The authors explain: “We begin by translating each line of the formal proof into natural language. Once each line is translated, these individual translations are combined to form a complete informal proof.” (p. 5).

Verus form. Inference: construct a dependency graph from Rust modules, `spec fn`s, traits, and proof lemmas. Generate contracts only after their referenced definitions have descriptions and verified signatures. Verus’s `requires` and `ensures` can express the resulting contract; dependency ordering and embedding retrieval are external orchestration. A compiler-accepted contract can still state the wrong property.

Evidence and limits. The dataset section reports 580k NL-FL statement pairs and 45k proof pairs (section 3.1, p. 4), while Table 1 reports 291k original statements, 580k augmented statements, and 44k proof pairs (p. 7). Section 4.1.1 instead starts with 580k total NL-FL pairs (p. 8). Inference: these descriptions do not establish a consistent total dataset size. Appendix C varies augmentation ratios and translation directions, not dependency order (Table 3, p. 14).

## technique 2: tactic-state augmentation

What it is. A Lean proof contains a sequence of tactic states, each with local conditions and a goal. Herald turns each state into a smaller formal statement, then produces an informal counterpart. The authors state: “This augmentation strategy (Figure 3) ensures that each generated informal statement is aligned with a concrete, localized mathematical goal, making it both provable and semantically valid.” (section 3.2.1, p. 6).

Inference: When to use it. Use this when whole theorem proofs are too complex for a translator and when intermediate proof obligations are individually checkable.

How to do it. (1) Extract tactic states from Lean proofs using Lean-Jixia (Appendix E.3.2, pp. 35–37). (2) Convert each state's hypotheses and goal into a formal statement (section 3.2.1, p. 6). (3) Validate the augmented formal statements through the Lean compiler and generate NL counterparts (Figure 1, p. 3). (4) To reduce repetition among similar consecutive states, randomly sample a subset equal in number to the original theorems (section 3.2.1, p. 6). The introduction reports 580k valid statements generated from 110k original theorems (p. 2).

Verus form. Inference: instrument proof development to emit intermediate postconditions as separate lemmas, each with `ensures` describing the local transformation. Use `assert` and lemma calls to compose them into the top-level proof. Verus has no Lean tactic-state replay; a Rust harness or trace extractor must supply the states. Each retained lemma must compile and verify independently.

Evidence and limits. Table 3 reports miniF2F-test/ProofNet-valid/Extract-Theorem results of 86.8%/50.0%/15.0% for original data alone and 95.1%/74.7%/19.0% for a 1:2:0 original:tactic:informal mix (Appendix C, p. 14). The dataset sizes also differ, 145k versus 435k. Inference: this comparison supports the combined benefit of tactic augmentation and additional data, without isolating their contributions. Random sampling can retain similar states and discard useful variants; it does not guarantee uniqueness.

## technique 3: LLM informal augmentation

What it is. A mathematics-pretrained LLM generates equivalent NL statements for each formal statement to diversify phrasing. Four transformations are used: logical-equivalence rewriting, abstract concept substitution, omission of implicit conditions, and multilingual translation into Chinese, French, and Russian (section 3.2.2, pp. 6–7). The authors state: “This allows us to generate multiple equivalent informal statements for each formal statement.” (p. 6).

How to do it. (1) Keep the formal statement fixed. (2) Ask the LLM for several logically equivalent phrasings. (3) Apply abstract concept substitution, omission of implicit conditions, or multilingual translation. (4) Sample as many augmented statements as original theorems. (5) Pair each NL variant with the same formal target (section 3.2.2, pp. 6–7).

Verus form. Inference: ask an LLM for contract paraphrases while preserving the exact Rust/Verus target, then run a verifier plus a semantic review check. Omitted conditions are dangerous for systems contracts: a missing ownership, lifetime, panic, or environment precondition can change the claim. Therefore a paraphrase must never replace the executable specification.

Evidence and limits. The training mix uses original, tactic-augmented, and informal-augmented data in a 1:2:1 ratio, then combines NL→FL, FL→NL, and OpenHermes examples in a 2:2:1 ratio (section 4.1.1, p. 8). These are dataset proportions, not accuracy denominators. The paper’s own quality examination notes that abstract and diagram-based theorems remain difficult (section 4.2, p. 9).

## technique 4: compiler, back-translation, and NLI validation

The validation pipeline has four steps: translate NL to Lean; use a REPL/compiler check; back-translate accepted Lean with InternLM2-Math-Plus-7B; and compare the back-translation with the original using DeepSeek Chat v2.5 NLI (section 4.1.2, p. 8). The paper states: “We perform 128 parallel translations and consider the translation successful if any of these passes both the compiler check and the nil check.” (section 4.1.2, p. 8; the paper writes “nil check” although the method is described as NLI).

Inference: When to use it. Use this as a scalable filter over multiple candidate formalizations. Keep compiler acceptance and semantic alignment as separate checks; the paper does not establish that the samples or their errors are independent.

How to do it. (1) Generate 128 candidate formal statements. (2) Reject candidates that fail Lean compiler checks. (3) Back-translate each survivor. (4) Run NLI against the original NL statement. (5) Count the input successful if any candidate passes both checks (section 4.1.2, p. 8). For proof formalization, pass generated statements to a theorem prover; their Stacks Project case used DeepSeek-Prover-V1.5 (section 4.3, p. 10).

Verus form. Inference: compile each candidate in a Verus harness, then use a second model or human review to compare the candidate contract with the NL requirement. A passing Verus proof establishes only the encoded contract. A back-translation check should be treated as a heuristic review signal, not proof. The 128-sample “any pass” rule raises false-positive risk when semantic checks are imperfect.

Evidence. Table 2 reports Herald at 96.7% on miniF2F-test, 96.3% on miniF2F-valid, 23.5% on Extract Theorem, and 16.0% on College CoT; the last two evaluations use shuffled subsets of 200 samples each (p. 9). The abstract instead reports 93.2% on miniF2F-test and 22.5% on an internal graduate-level textbook dataset (p. 1). The introduction calls its 23.5% result graduate-level, whereas section 4.1.3 describes Extract Theorem as advanced undergraduate-level (p. 9), and Appendix G describes College CoT as graduate-level (p. 41). Inference: preserve these conflicting descriptions and the evaluation protocol when comparing results; neither compiler acceptance nor NLI acceptance establishes correct translation.

The authors explicitly warn: “Therefore, NLI checking is not as reliable as human expert evaluation.” (Appendix D, p. 15). On 185 ProofNet validation statements, they collected the first accepted candidate among 128 attempts per input. Human experts classified Herald's 151 accepted statements as 101 correct, 24 minor errors, and 26 major errors; the baseline's 72 accepted statements comprised 42 correct, 12 minor errors, and 18 major errors (Table 4, p. 16). Appendix D.1.3 even shows an output consisting entirely of comments that passed both checks (pp. 18–19).

The Stacks Project case translated the Normal Extensions section, Tag 09HL, theorem by theorem using 16 passes. Appendix F.2 records three places modified: removing an explicitly supplied algebra argument, correcting one theorem conclusion, and correcting another conclusion while removing an unnecessary finite-dimensionality assumption. Open namespaces were also manually reduced to a feasible subset (pp. 38–39). This is more detailed than section 4.3's account of two theorem modifications (p. 10). DeepSeek-Prover-V1.5-RL plus RMaxTS (4×512 sample budget) proved only one two-line theorem using an existing Mathlib lemma (p. 39); the other displayed proofs use `sorry`. Inference: runnable statements did not imply completed proofs.

## what is proved, trusted, and missing

Inference: compiler acceptance checks Lean validity, but statements using `sorry` have no completed proof, and an empty mathematical output can pass compilation. The semantic conclusions depend on Lean-Jixia extraction, the generated NL text, retrieval examples, back-translation/NLI models, and human judgments of meaning. Appendix D's false positives and Appendix F.2's corrections show why compilation and semantic review must be distinguished.

Inference: this creates a moderate threat to agent-written verified Rust. Herald’s structural context and local-goal decomposition could reduce hallucinated contracts, but the “any of 128 passes” metric and imperfect NLI can select a formally valid statement that narrows or changes the intended requirement. VL should preserve the original requirement, compile and prove the Verus contract, and require semantic review for omitted conditions.

Inference: Already done that VL should not redo: dependency-aware retrieval, tactic-state decomposition, paraphrase augmentation, compiler filtering, back-translation/NLI checks, and section-level translation. A new VL result should add Rust/Verus contracts, executable semantics, or measured detection of contract drift.

## techniques for the catalog

- dependency-aware context: translate formal declarations in DAG order with dependent statements and retrieved analogues
- tactic-state augmentation: turn extracted Lean proof states into localized statements, compiler-check them, and generate NL counterparts
- semantic paraphrase augmentation: generate equivalent, abstract, implicit-condition, and multilingual NL variants
- compiler plus NLI validation: require Lean compilation and back-translation agreement for at least one sampled candidate
- section-level autoformalization: translate a project section, then use a theorem prover and human checks to repair remaining errors
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Please note that in the Herald dataset, the stepwise natural language proof is generated first and then summarized into a natural language whole proof."): checked all paper text, quotations, counts, page and section references, technique steps, validation evidence, and the PDF prompt figures; corrected the truncated dependency quote, augmentation page reference, unsupported replay description, Stacks Project corrections, evaluation subsets, and inference labels; added proof translation and human-evaluation details; did not reproduce experiments, inspect released code or data, or validate Rust/Verus proposals.
