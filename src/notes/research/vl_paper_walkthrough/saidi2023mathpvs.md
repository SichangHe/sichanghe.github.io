# math-PVS: A Large Language Model Framework to Map Scientific Publications to PVS Theories
(authored by agents unless marked 🧑)
Tag: `saidi2023mathpvs`, [paper](https://arxiv.org/abs/2310.17064)

math-PVS combines document conversion, LLM abstraction and PVS checking to turn mathematical papers into machine-checkable theories. The paper's stated aim is “to extract and formalize mathematical theorems from research papers” (Abstract, p. 1). Its workflow ingests PDF with Nougat, converts recovered LaTeX to PVS with GPT-4, and lets a human iterate with the LLM and PVS prover (Introduction, pp. 1–2).

## technique: pdf-to-latex ingestion before formalization

What it is: use Meta's Nougat visual transformer OCR to recover mathematical content as LaTeX, then feed that representation to the language model. The authors say, “Nougat is a Visual Transformer model that performs an Optical Character Recognition (OCR) task for processing scientific documents into a markup language such as LATEX.” (Section 4, p. 4)

Steps from the paper: (1) provide the source PDF; (2) run Nougat; (3) extract definitions, theorems and proof text from the recovered LaTeX; (4) summarize the core theory before code generation (Sections 1 and 4). This separates document recognition from theorem formalization and makes equations available as structured prompt text.

Verus form (Inference): an equivalent VL intake stage can parse a paper into a specification checklist, but OCR output is untrusted input. Store the source fragment and require each generated Rust/Verus declaration to be reviewed against it. Verus verifies Rust specifications, not the correctness of Nougat's transcription.

Evidence and limits: the paper demonstrates the pipeline on one symbolic-dynamics paper and additional definitions from lecture notes and Wikipedia/Scholarpedia (Section 2). No corpus-level accuracy denominator is reported. OCR errors or lost notation can silently alter the theorem before PVS sees it.

## technique: abstraction of definitions and theorems

What it is: ask an LLM to simplify the paper's mathematical definitions into basic constructs, such as sets and mappings, while preserving the main concepts. The paper explains that “the abstraction step is required here to map mathematical concepts described in the paper of interest, to concepts grounded in basic mathematical constructs such as set theory.” (Section 3, p. 3)

How to apply: give the model the extracted definitions and theorem; explicitly request a self-contained abstraction without unnecessary details; use the resulting definitions as the next prompt. In the demonstration, effective symbolic spaces, Cantor spaces, symbolic spaces, and a homeomorphic mapping are reduced to definitions of sets, injective maps and binary sequences (Section 4, pp. 4–5; Figure 2).

Verus form (Inference): write the abstraction as `spec fn` predicates and datatypes, then state the target theorem with `requires` and `ensures` or a `proof fn`. Preserve domain assumptions as preconditions. Any omitted topological or computability condition is an assumption and must be recorded; a proof of the abstraction does not prove the original theorem if the abstraction is weaker.

Evidence and limits: the authors explicitly say their definitions “are not entirely complete, however, they capture the central concepts associated with the proof” (Section 4, p. 5). Therefore the formal result is a simplified theorem, not a complete formalization of the source paper.

## technique: prompt LLM-generated PVS theories and proofs

What it is: paste the summarized definitions and theorem into ChatGPT-4, request PVS theories, then use PVS parsing, typechecking and interactive proving. The paper's PVS environment provides a typed higher-order specification language, predefined theories, a type checker and an interactive prover (Introduction, p. 2).

Steps: (1) prompt for a theory encoding mappings, Cantor space and symbolic spaces; (2) parse and typecheck the result; (3) edit syntax and merge generated theories; (4) add lemmas needed by the target theorem; (5) invoke PVS's `grind` or interactive rules; (6) inspect the proof transcript. The appendix records that generated theories were manually merged, syntax errors fixed, a surjective claim changed to a bijective one, and two lemmas added (Appendix, pp. 13–16). The final proof composes two bijections and applies `composition_bijective` (Appendix proof transcript, pp. 17–18).

Verus form (Inference): replace PVS theory declarations with Verus `struct`, `spec fn`, `requires`, `ensures`, `invariant` declarations and `proof fn` lemmas. Keep proof functions out of runtime call paths. A generated lemma must compile and be checked by Verus; textual plausibility is not evidence. The PVS interactive transcript does not transfer directly because tactics and libraries differ.

Evidence: the reported artifact was “very close to a valid PVS theory that is syntactically correct (can be parsed) and semantically correct (can be typechecked)” but still had errors (Section 4, p. 5). The only worked theorem is the simplified mapping theorem, so no success rate over many papers is given.

## technique: human-in-the-loop repair and proof checking

The framework deliberately keeps a user in the loop. The authors write, “both the transformer-based PVS theory generation and its use in PVS presently requires human intervention.” (Section 2, p. 3) The user simplifies theories, fixes parser/type errors, chooses the intended theorem, adds lemmas and runs the prover. This is a formal verification technique because each model output is treated as a draft whose acceptance depends on the proof assistant.

Failure examples are concrete: the generated theory placed `THEORY` incorrectly, imported `set_theory` although sets are in the PVS prelude, and initially stated surjectivity rather than bijectivity (Section 4, p. 5; Appendix, p. 13). The paper proposes fine-tuning on the PVS prelude and NASA library and combining with CoProver, but these are future work, not evaluated methods.

Verus form (Inference): retain an explicit review gate for specification meaning, then run `cargo verus verify`. Keep trusted axioms or `external_body` declarations visible and minimal; do not attach `external_body` to the function whose implementation is the verification target. The checker proves the supplied model, so human review must establish that the model matches the paper.

## what is proved, measured, and trusted

The paper demonstrates an abstracted theorem about effective symbolic spaces and a PVS proof assembled from generated definitions and lemmas. It measures no benchmark accuracy, runtime, or number of successful formalizations. Trusted components include Nougat transcription, the LLM's abstraction and code, manually edited theories, PVS libraries, and the user's interpretation of the source theorem. The paper itself says LLM autoformalization “is not perfect and without errors” (Section 4, p. 5).

Inference: for VL, math-PVS is a useful specification-writing precedent but a weak correctness benchmark. It shows a practical decomposition—extract, abstract, generate, check, repair—that can guide agent-written Verus Rust. Its threat is specification drift: a concise abstraction can omit safety conditions while still admitting an easy proof. VL should preserve source quotations, assumptions, and a mapping from each Verus postcondition back to the paper before treating a checked proof as product evidence. Existing work means VL should not redo the basic idea of LLM-to-proof-assistant translation; its differentiator must be Rust/Verus semantics, trustworthy specifications, and measured end-to-end coverage.

## techniques for the catalog
- document-to-theory ingestion — convert PDF mathematics to LaTeX, then expose definitions and theorems to formalization
- abstraction before proving — reduce complex statements to explicit set-theoretic concepts while recording omitted assumptions
- llm-generated pvs with checker — generate theories and lemmas, parse/typecheck them, and finish proofs interactively
- human repair loop — manually correct syntax and theorem meaning, add lemmas, and accept only proof-assistant-checked results
Checked 2026-10-15 against paper saidi2023mathpvs: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
