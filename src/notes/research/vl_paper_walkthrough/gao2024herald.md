# Herald: A Natural Language Annotated Lean 4 Dataset
(authored by agents unless marked 🧑)
Tag: `gao2024herald`, [paper](http://arxiv.org/abs/2410.10878v2)

## scope and result

Herald is a dataset and autoformalization pipeline built from Mathlib4. It uses Lean-Jixia to extract theorem structure, generates natural-language/formal-language (NL-FL) pairs with retrieval-augmented prompts, augments them with tactic states and paraphrases, and fine-tunes a translator. The authors describe the contribution as “a structural-information-aware pipeline for augmenting NL-FL datasets from any Lean project.” (introduction, p. 2). The pipeline validates generated Lean statements with the compiler and checks meaning with back-translation and natural-language inference (NLI).

Inference: the direct lesson for VL is a specification-data pipeline: mine structured context from a codebase, generate candidate Rust/Verus contracts, and reject candidates that do not verify. Herald does not verify Rust, memory safety, concurrency, or product behavior.

## technique 1: dependency-aware NL-FL generation

What it is. Lean-Jixia parses Lean files for theorem declarations, proof structures, and dependency relationships. The pipeline supplies the model with five context components: head statements, kind, docstrings, neighboring statements, and dependent theorems (section 3.1.1, p. 4). It builds a dependency DAG, stratifies statements by distance from roots, and translates lower levels before dependent targets. The paper says: “By translating statements in the level order, we ensure that the natural language translations of dependent theorems are available during the translation process.” (section 3.1.1, p. 4).

Inference: When to use it. Use this when a formal statement relies on definitions or lemmas whose meaning cannot be inferred from the target text alone. Dependency order reduces fabricated explanations of hidden prerequisites.

Inference: How to do it. (1) Parse the project and extract declarations, theorem kinds, docstrings, neighboring statements, and dependencies (section 3.1.1). (2) Build a DAG with edges from a statement to the declarations it depends on. (3) Assign dependency levels from roots. (4) For each target, include already translated dependencies and relevant neighboring context in the LLM prompt. (5) Retrieve the closest example from 1,000 manually annotated theorems by embedding formal statements and add it as a contextual anchor (section 3.1.1, p. 4). (6) Generate NL descriptions and retain their formal counterparts.

Verus form. Inference: construct a dependency graph from Rust modules, `spec fn`s, traits, and proof lemmas. Generate contracts only after their referenced definitions have descriptions and verified signatures. Verus’s `requires` and `ensures` can express the resulting contract; dependency ordering and embedding retrieval are external orchestration. A compiler-accepted contract can still state the wrong property.

Evidence and limits. The dataset section reports 580k NL-FL statement pairs and 45k proof pairs (section 3.1, p. 4), while Table 1 reports 291k original statements, 580k augmented statements, and 44k proof pairs (p. 7). The paper does not explain the 45k versus 44k difference; it is an internal count inconsistency. The context strategy is evaluated through translator accuracy and case studies, not an isolated dependency-order ablation in the main text.

## technique 2: tactic-state augmentation

What it is. A Lean proof contains a sequence of tactic states, each with local conditions and a goal. Herald turns each state into a smaller formal statement, then produces an informal counterpart. The authors state: “This augmentation strategy (Figure 3) ensures that each generated informal statement is aligned with a concrete, localized mathematical goal, making it both provable and semantically valid.” (section 3.2.1, p. 6).

Inference: When to use it. Use this when whole theorem proofs are too complex for a translator and when intermediate proof obligations are individually checkable.

Inference: How to do it. (1) Replay each Mathlib4 proof and capture every prove/tactic state (section 3.2.1). (2) Convert the state’s hypotheses and goal into a formal statement. (3) Generate an NL description for that local statement. (4) Validate the statement with Lean. (5) Deduplicate near-identical consecutive states by randomly sampling a subset equal in number to the original theorem set (section 3.2.1). The paper reports 580k valid statements generated from 110k original theorems (introduction, p. 2).

Verus form. Inference: instrument proof development to emit intermediate postconditions as separate lemmas, each with `ensures` describing the local transformation. Use `assert` and lemma calls to compose them into the top-level proof. Verus has no Lean tactic-state replay; a Rust harness or trace extractor must supply the states. Each retained lemma must compile and verify independently.

Evidence and assumptions. Tactic states are valid relative to the original Lean proof and environment; the method assumes replayable proofs and sound state extraction. Random deduplication preserves corpus size but may drop useful variants. The paper gives counts but no denominator for the fraction of all Mathlib proofs successfully replayed.

## technique 3: LLM informal augmentation

What it is. A mathematics-pretrained LLM generates equivalent NL statements for each formal statement to diversify phrasing. Four transformations are used: logical-equivalence rewriting, abstract concept substitution, omission of implicit conditions, and multilingual translation into Chinese, French, and Russian (section 3.2.2, p. 6).

Inference: How to do it. (1) Keep the formal statement fixed. (2) Ask the LLM for several logically equivalent phrasings. (3) Optionally replace a detailed description with an abstract concept, omit conditions that are conventional in context, or translate to another language (section 3.2.2). (4) Sample as many augmented statements as original theorems to avoid over-representing one style. (5) Pair each NL variant with the same formal target.

Verus form. Inference: ask an LLM for contract paraphrases while preserving the exact Rust/Verus target, then run a verifier plus a semantic review check. Omitted conditions are dangerous for systems contracts: a missing ownership, lifetime, panic, or environment precondition can change the claim. Therefore a paraphrase must never replace the executable specification.

Evidence and limits. The training mix uses original, tactic-augmented, and informal-augmented data in a 1:2:1 ratio, then combines NL→FL, FL→NL, and OpenHermes examples in a 2:2:1 ratio (section 4.1.1, p. 8). These are dataset proportions, not accuracy denominators. The paper’s own quality examination notes that abstract and diagram-based theorems remain difficult (section 4.2, p. 9).

## technique 4: compiler, back-translation, and NLI validation

The validation pipeline has four steps: translate NL to Lean; use a REPL/compiler check; back-translate accepted Lean with InternLM2-Math-Plus-7B; and compare the back-translation with the original using DeepSeek Chat v2.5 NLI (section 4.1.2, p. 8). The paper states: “We perform 128 parallel translations and consider the translation successful if any of these passes both the compiler check and the nil check.” (section 4.1.2, p. 8; the paper writes “nil check” although the method is described as NLI).

Inference: When to use it. Use this as a scalable filter when one generated formalization may be wrong but a set of independent samples can contain a correct one. Keep compiler acceptance and semantic alignment as separate gates.

Inference: How to do it. (1) Generate 128 candidate formal statements. (2) Reject candidates that fail Lean syntax/type/compiler checks. (3) Back-translate each survivor. (4) Run NLI against the original NL statement. (5) Count the input successful if any candidate passes both checks (section 4.1.2). For full proof formalization, pass accepted statements to a theorem prover; in their Stack case they used DeepSeek-Prover-V1.5.

Verus form. Inference: compile each candidate in a Verus harness, then use a second model or human review to compare the candidate contract with the NL requirement. A passing Verus proof establishes only the encoded contract. A back-translation check should be treated as a heuristic review signal, not proof. The 128-sample “any pass” rule raises false-positive risk when semantic checks are imperfect.

Evidence. Table 2 reports Herald at 96.7% on miniF2F-test, 96.3% on miniF2F-valid, 23.5% on Extract Theorem, and 16.0% on College CoT; the last two datasets contain 200 samples each (table 2, p. 9). The abstract instead reports 93.2% on miniF2F-test and 22.5% on the internal graduate-level dataset (abstract, p. 1), conflicting with the main table and introduction’s 96.7%/23.5%. These denominators and split descriptions must be preserved when comparing results. The authors acknowledge that the pipeline is not perfectly accurate for informal-to-formal alignment and that human evaluation was also performed on ProofNet (section 4.1.2, p. 8).

The Stack Project case formalized a Normal Extensions section into runnable Lean, with two theorem-conclusion corrections and one removed condition after human checks (section 4.3, p. 10). DeepSeek-Prover-V1.5-RL plus RMaxTS (4×512 sample budget) proved only one two-line theorem using an existing Mathlib lemma (section 4.3, p. 10). Thus translation success did not imply proof completion.

## what is proved, trusted, and missing

Lean compilation proves that accepted formal statements are syntactically and type correct; the later prover establishes only the theorems it can prove. Trusted components include Mathlib, Lean-Jixia extraction, all LLM-generated NL text, the embedding retrieval set, back-translation/NLI models, and the judgment that NL and FL preserve meaning. Human corrections in the Stack case show that these checks miss semantic errors.

Inference: this creates a moderate threat to agent-written verified Rust. Herald’s structural context and local-goal decomposition could reduce hallucinated contracts, but the “any of 128 passes” metric and imperfect NLI can select a formally valid statement that narrows or changes the intended requirement. VL should preserve the original requirement, compile and prove the Verus contract, and require semantic review for omitted conditions.

Inference: Already done that VL should not redo: dependency-aware retrieval, tactic-state decomposition, paraphrase augmentation, compiler filtering, back-translation/NLI checks, and section-level translation. A new VL result should add Rust/Verus contracts, executable semantics, or measured detection of contract drift.

## techniques for the catalog

- dependency-aware context: translate formal declarations in DAG order with dependent statements and retrieved analogues
- tactic-state augmentation: turn each replayed Lean proof state into a localized, compiler-checked NL-FL pair
- semantic paraphrase augmentation: generate equivalent, abstract, implicit-condition, and multilingual NL variants
- compiler plus NLI validation: require Lean compilation and back-translation agreement for at least one sampled candidate
- section-level autoformalization: translate a project section, then use a theorem prover and human checks to repair remaining errors
Checked 2026-10-15 against paper gao2024herald: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
