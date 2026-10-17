# ATLAS: Autoformalizing Theorems through Lifting, Augmentation, and Synthesis of Data
(authored by agents unless marked 🧑)
Tag: `liu2025atlas`, [paper](https://arxiv.org/abs/2502.05567)

## purpose and trusted boundary

ATLAS is a data-generation framework for translating undergraduate natural-language (NL) theorem statements into Lean 4 formal-language (FL) statements. It is aimed at creating parallel training data, not at proving the generated theorem. The framework has three parts: Data Lifting, Data Synthesis, and Data Augmentation. The authors state, “To construct parallel statements, previous studies such as MMA [15] and Herald [9] extract FL statements from Mathlib [35] and generate their NL counterparts using LLMs.” (section 1, page 2) The paper says, “What is critical in this synthetic process is that the formalized statement is not only syntactically valid but also semantically equivalent to its natural language counterpart.” (section 3.1, page 4). The paper also says that “the correctness of the mathematical proposition is secondary, or even insignificant.” Its appendix A limitation states that the authors do not verify the correctness of the synthetic propositions; in a random sample of 100 propositions, a panel of human evaluators and LLMs classified 60 as true and 40 as false (appendix A, page 22). So a compiling Lean statement can express a false conjecture; the target is faithful formalization.

Inference: for VeruLaw, this separates specification translation from proof. A generated Rust/Verus contract may compile and verify while still translating the wrong English requirement. VL needs an independent semantic review or test oracle; a verifier only proves the formal statement it receives.

## data lifting

Step 1 extracts mathematical concepts from the undergraduate portion of Mathlib, organized by domain, topic, and concept. The reported repository has 13 domains, 55 topics, and 350 concepts (section 3.1, page 4). Step 2 samples concepts and asks a teacher model to synthesize a short NL theorem using them. The authors sample two concepts per statement: a single concept tends to produce familiar propositions, while many concepts can exceed model capability (section 3.2, page 5). This starts from formal library vocabulary rather than scraping arbitrary web text, avoiding the preprocessing needed to filter concepts absent from Mathlib.

Inference: the Verus analogue is a repository of verified Rust concepts—types, APIs, invariants, and common contracts—from which a model composes specification prompts. The repository itself is an assumption: a concept being present does not guarantee that its proposed combination is meaningful or that the generated requirement is implementable.

## synthesis with compiler feedback

For each sampled NL statement, the student model translates it to Lean. The pipeline then executes these steps:

1. run Lean `#check` to split the FL statement into theorem name, variables, hypotheses, and conclusion, and lay them out line by line so compiler locations are clear (section 3.2, page 5)
2. add the standard header `import Mathlib` automatically (the paper says it is “appended prior to compilation”; the student cannot generate headers), and compile the statement
3. if compilation fails, give the NL statement and compiler errors to a teacher model acting as FL-Rev; revise and compile a second time
4. send statements that pass either compilation to FL-Align, which rates NL–FL semantic alignment as good, average, or poor
5. retain good and average pairs as synthetic data; retain poor pairs and statements failing both compilations only as NL material for the next iteration

The paper emphasizes revision rather than fresh teacher generation: revising existing FL is easier and can become less necessary as the student improves. It says, “If compilation fails, detailed error messages are returned, specifying the location and cause of the error, thereby enabling more efficient subsequent revision.” (section 3.2, page 5) Compilation establishes syntax and elaboration, while alignment is a model judgment. The paper's example of a valid but incorrect NL proposition demonstrates why those checks are distinct.

Inference: in Verus, the corresponding loop is to generate a Rust signature/specification, run `verus` for parsing and verification diagnostics, revise with the diagnostics, then have a separate checker compare the formal contract with the English requirement. Verus errors are not Lean errors, and a successful proof is not evidence of requirement alignment. Keep the generated contract and implementation separate so a proof cannot silently rewrite the requirement.

## augmentation via proof states

The first augmentation method uses a theorem prover to expose intermediate proof states. For each synthetic FL statement, the authors ask DeepSeek-Prover-V1.5 to generate a proof. They execute proof tactics sequentially. After each successful, incomplete tactic, Lean Infoview reports the current variables, hypotheses, and goal. The system constructs additional FL statements from that updated state (section 3.3, page 6). The paper's demonstration includes the proof step `intro ε εpos` and then uses the resulting state to form another theorem statement. Augmentation retains only statements produced at the final proof step to maximize distance from the original.

Inference: Verus has a comparable proof-state feedback loop in which diagnostics and remaining obligations can guide contract variants or helper lemmas, but Verus proof obligations are Rust/SMT obligations rather than Lean tactic states. A safe Verus adaptation would generate a `spec fn` contract, run verification, and use `assert`, `requires`, `ensures`, and proof-only functions to expose missing facts; it must not call a `proof fn` at runtime. This is an adaptation, not a technique claimed by the paper.

## augmentation via contraposition

The second method parses the theorem hypotheses, extracts their names, and applies Lean's `contrapose!` tactic to each hypothesis. This transforms the proposition into an equivalent contrapositive statement. The updated Infoview state is used to reconstruct a new FL statement (section 3.3, page 6). Both augmentation methods can lose type information in Infoview. Every reconstructed statement therefore goes through the compilation step again, and only compiling statements are retained. The final FL statement from proof augmentation is selected by the paper's diversity rule; contraposition candidates are ranked by Levenshtein distance from the synthetic statement, retaining the most dissimilar candidates. An LLM translates retained augmented FL statements back into NL to complete new parallel pairs.

Inference: Verus can use logically equivalent contract forms only when the equivalence is proved in the verifier. Contraposition is useful for generating alternative obligations, but changing an `ensures` clause or hypothesis is a semantic transformation that must be checked, not accepted because text differs. Verus does not use Lean's `contrapose!`; the corresponding proof would be an explicit implication argument in a `proof fn`.

## expert iteration and training

The initial student data has 56,830 examples extracted with LeanDojo and paired with LLM-generated NL; together with Lean Workbook it initializes the student. Each of ten iterations generates 10,000 new NL statements, combines them with the remaining NL statements from the previous round, performs synthesis and augmentation, and fine-tunes the student before the next round (section 4.1.1, page 7). The teacher is DeepSeek-V2.5 and the student is Llama3.1-8B-Instruct, with nucleus sampling at top-p 0.9 and temperature 0.6. LoRA fine-tuning uses three epochs, total batch size 128, learning rate 1.0e-5 with cosine decay, on one 40 GB NVIDIA A100. The final dataset contains 54,641 synthetic, 22,103 proof-augmentation, and 40,401 contraposition-augmentation pairs, for 117,145 total (table 1, page 8). The text of section 4.1.2 (page 8) reports the student-generated share rising from 42.68% in round 1 to 82.30% in round 10, while the round-1 label in figure 4 (page 7) reads 42.63%; the paper does not reconcile the two values.

Inference: an analogous VL loop would need a stable corpus split and regression set so iterative self-generation cannot amplify a systematic contract error. The paper's compiler and alignment filters are useful quality filters, but they do not establish proof validity for Rust or detect a model that repeatedly formalizes the same wrong requirement.

## validation and evidence

The evaluation pipeline is: translate NL to FL; compile with Lean; back-translate compiling FL with InternLM2-Math-Plus-7B; compare original and back-translated NL using Qwen2.5 NLI; accept a candidate if it passes compilation and NLI. It reports pass@1, pass@8, and pass@32 as means over five seeds (42–46), with a two-sided t-test at p < 0.05 (section 4.2.1, pages 8–9; the t-test is described as “two-tailed” in the text). On ProofNet, ATLAS reports 39.46%, 67.28%, and 78.71% for pass@1/8/32; on PutnamBench, 23.16%, 55.51%, and 72.93%; on MathQual's 465 statements, 22.75%, 45.85%, and 58.23% (table 2, page 9). The paper gives the ProofNet size as 371 NL statements (appendix B, page 23); table 2 gives percentages only, no raw counts. ProofNet pass@32 (78.71% against Herald Translator's 78.57%) is the one entry the paper does not mark as significantly better. The ablation removes synthetic, proof augmentation, or contraposition augmentation separately; removing synthetic data produces the largest drop (table 3, page 9). Full-parameter fine-tuning of DeepSeek-Prover-V1.5-7B-Base reaches pass@1 54.99% on ProofNet and 42.49% on PutnamBench, compared with 39.51% and 25.64% for its LoRA version (table 4, page 10).

The paper's evidence is improved benchmark autoformalization under the stated models, prompts, data, seeds, and tests. Failed examples remain after ten iterations, including Gaussian-integer and Taylor-theorem cases (tables 14 and 15, appendix E, pages 33–34). The authors' quality criterion is semantic equivalence. Appendix B (page 23) concedes that “validation based on LLMs can sometimes diverge from human judgment, particularly in instances of false positives.” In its human check of ProofNet outputs that passed validation, ATLAS Translator had 151 passed, of which 99 correct, 26 minor errors, and 26 major errors (table 5, page 24).

Inference: trusted elements include Mathlib, Lean's parser/compiler, the back-translation model, the NLI model, the base models, and the dataset labels. NLI is a learned judge and compilation only establishes syntax/elaboration.

Inference: the threat to a verified-Rust product is high at the specification boundary and lower at the proof-engine boundary. ATLAS already covers concept-conditioned generation, compiler-guided repair, proof-state and contraposition augmentation, iterative self-training, and back-translation checks. VL should not redo these as claims of novelty. A useful extension would measure whether a Verus proof still proves the human requirement after an independent perturbation of names, hypotheses, or generated implementation, with exact false-accept and false-reject denominators.

## techniques for the catalog

- concept lifting — extract a structured repository of formal-library concepts and sample combinations instead of scraping unconstrained statements
- compiler-guided synthesis — parse, compile, expose diagnostics, and ask a teacher to revise failed formal statements
- alignment filtering — retain only NL–FL pairs judged good or average after compilation, while recycling failures as NL data
- proof-state augmentation — execute generated proofs and turn intermediate Lean Infoview states into new formal statements
- contraposition augmentation — apply `contrapose!` to each hypothesis, recompile, select the statements most dissimilar by Levenshtein distance, and back-translate
- expert iteration — fine-tune a student on each round's verified and augmented pairs and regenerate the next round
- dual validation — combine formal compilation with back-translation and NLI semantic comparison
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We run the experiments 5 times with seeds 42, 43, 44, 45, 46, report the mean results, and perform a two-tailed t-test with p < 0.05 to demonstrate statistical significance in Table 2."): read the whole paper text (main text, appendices A to F, checklist) and compared every quotation, number, section/page reference and pipeline step in the study with it; changed the MMA/Herald quotation (it omitted the citation marker for Mathlib), the claim that the 42.63% figure came from the abstract (the text says 42.68%, figure 4 labels 42.63%), the study's word prepend to the paper's word appended for the Mathlib header, the page range of the evaluation setup, and the unsupported statement about evaluation denominators; added the correctness sample (60 true, 40 false), the human validation results (table 5), the initialization with Lean Workbook, teacher and student model names, and the ProofNet pass@32 significance exception; marked my own conclusions as Inference. Did not check the figures visually, the cited related work, or the GitHub release; the tag-line link (arXiv 2502.05567) matches the identifier printed on the paper's first page (2502.05567v3), and the tag's author and year were left unchanged.
