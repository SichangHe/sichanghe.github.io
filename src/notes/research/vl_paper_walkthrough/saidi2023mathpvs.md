# math-PVS: A Large Language Model Framework to Map Scientific Publications to PVS Theories
(authored by agents unless marked 🧑)
Tag: `saidi2023mathpvs`, [paper](https://arxiv.org/abs/2310.17064)

math-PVS combines document conversion, LLM abstraction and PVS checking to turn mathematical papers into machine-checkable theories. The paper's stated aim is “to extract and formalize mathematical theorems from research papers” (Abstract, p. 1). Its workflow ingests PDF with Nougat, converts recovered LaTeX to PVS with GPT-4, and lets a human iterate with the LLM and PVS prover (Introduction, pp. 1–2).

## technique: pdf-to-latex ingestion before formalization

What it is: use Meta's Nougat visual transformer OCR to recover mathematical content as LaTeX, then feed that representation to the language model. The authors say, “Nougat is a Visual Transformer model that performs an Optical Character Recognition (OCR) task for processing scientific documents into a markup language such as LATEX.” (Section 4, p. 4)

Steps from the paper: (1) provide the source PDF; (2) run Nougat to produce LaTeX; (3) extract and summarize the definitions and theorems from the recovered LaTeX (Section 4, p. 4: “The next step is to extract and summarize the definitions and theorems from the recovered Latex.”); (4) paste the summary as prompts to the LLM to get PVS theories (Section 4, p. 5). The paper says Nougat “makes the mathematical knowledge accessible”. Inference: this separates document recognition from theorem formalization and makes equations available as prompt text. The paper does not extract proof text in its summary, which contains only Definitions 3–6 and the theorem (Section 4, p. 4).

Evidence and limits: the paper demonstrates the pipeline on one symbolic-dynamics paper and additional definitions from lecture notes and Wikipedia/Scholarpedia (Section 2). No corpus-level accuracy denominator is reported, and no Nougat error rate is given. Inference: OCR errors or lost notation could silently alter the theorem before PVS sees it; the paper does not report such a case.

## technique: abstraction of definitions and theorems

What it is: ask an LLM to simplify the paper's mathematical definitions into basic constructs, such as sets and mappings, while preserving the main concepts. The human also edits the abstraction: the authors wrote Definitions 3–6 as their own summary and asked ChatGPT4 whether it was accurate (Appendix, p. 12), and in the figure image ChatGPT4 replied that the abstraction captures the general ideas but “misses some nuances”. The paper explains that “the abstraction step is required here to map mathematical concepts described in the paper of interest, to concepts grounded in basic mathematical constructs such as set theory.” (Section 3, p. 3)

How to apply: give the model the extracted definitions and theorem; explicitly request an abstraction without specific details; use the resulting definitions as the next prompt. The paper says the Figure 2 prompt “explicitly requests the LLM to generate an abstraction that captures the main concepts without the inclusion of specific details” (Section 3, pp. 3–4); the prompt shown in the Figure 2 image (p. 3) asks for a concise, abstract summary of the main concepts without delving into the specific details and computability properties. In the demonstration, the effective-symbolic-space definitions are reduced to Definitions 3–6 (one-to-one mapping, Cantor space as binary sequences, symbolic space as a set with a one-to-one map into positive integers, and effective symbolic space as a pair with a one-to-one map into the power set) (Section 4, p. 4). The conversation is in the Appendix (pp. 7–12).

Verus form (Inference): write the abstraction as `spec fn` predicates and datatypes, then state the target theorem with `requires` and `ensures` or a `proof fn`. Preserve domain assumptions as preconditions. Any omitted topological or computability condition is an assumption and must be recorded; a proof of the abstraction does not prove the original theorem if the abstraction is weaker.

Evidence and limits: the authors explicitly say their definitions “are not entirely complete, however, they capture the central concepts associated with the proof” (Section 4, p. 5). Inference: the formal result is a simplified theorem, not a complete formalization of the source paper. Section 2 itself says the aim was “to prove a simplified version of the first proposition in [15]”, and the appendix (p. 13) records changing the theorem from a surjective to a bijective mapping.

## technique: prompt LLM-generated PVS theories and proofs

What it is: paste the summarized definitions and theorem into ChatGPT-4, request PVS theories, then use PVS parsing, typechecking and interactive proving. The paper's PVS environment provides a typed higher-order specification language, predefined theories, a type checker and an interactive prover (Introduction, p. 2).

Steps: (1) prompt for a theory encoding mappings, Cantor space and symbolic spaces; (2) parse and typecheck the result; (3) edit syntax and merge generated theories; (4) add lemmas needed by the target theorem; (5) invoke PVS's `grind` or interactive rules; (6) inspect the proof transcript. The appendix records that generated theories were manually merged, syntax errors fixed, the theorem changed from proving a surjective mapping to a bijective mapping, and two lemmas added (Appendix, p. 13); the generated theories are on pp. 14–16 and the final edited theory on pp. 17–18. The final proof uses `MapLemma1` and `MapLemma2`, instantiates `f o f!1`, and ends with `composition_bijective[symbolic_space,nat,Binary_Sequence]` (Appendix, pp. 19–20). Section 2 says the user also applied the `grind` tactic, but the printed transcript uses `skeep`, `inst`, `assert` and `use`, not `grind`.

Verus form (Inference): replace PVS theory declarations with Verus `struct`, `spec fn`, `requires`, `ensures`, `invariant` declarations and `proof fn` lemmas. Keep proof functions out of runtime call paths. A generated lemma must compile and be checked by Verus; textual plausibility is not evidence. The PVS interactive transcript does not transfer directly because tactics and libraries differ.

Evidence: the reported artifact was “very close to a valid PVS theory that is syntactically correct (can be parsed) and semantically correct (can be typechecked)” but still had errors (Section 4, p. 5). The only worked theorem is the simplified mapping theorem, so no success rate over many papers is given. In the final theory, `MapLemma1` and `MapLemma2` are stated as `lemma` (not proved in the printed pages), and the theory also contains axioms such as `injective_map_axiom` (Appendix, pp. 17–18). Inference: the proof therefore rests on the unproved lemmas and axioms.

## technique: human-in-the-loop repair and proof checking

The framework deliberately keeps a user in the loop. The authors write, “both the transformer-based PVS theory generation and its use in PVS presently requires human intervention.” (Section 2, p. 3) Per the paper, the user simplifies theories for PVS parsing and typechecking and applies `grind` (Section 2, p. 3), fixes syntax errors, changes the theorem from surjective to bijective, and adds two lemmas (Appendix, p. 13). Inference: this is a formal verification technique in the sense that each model output is treated as a draft whose acceptance depends on the proof assistant; the paper does not state it this way.

Failure examples are concrete: the paper says “theory Mappings should be Mappings: THEORY. The importing statement should be after begin. Also, set_theory in PVS is simply sets defined in the prelude.” (Section 4, p. 5). The appendix separately records that the theorem was changed from a surjective to a bijective mapping (Appendix, p. 13). The paper says these errors “are easily fixed by providing ChatGPT4 with a few examples of PVS syntax”, but does not report doing so. The paper proposes fine-tuning on the PVS prelude and NASA library and combining with CoProver, but these are future work, not evaluated methods.

Verus form (Inference): retain an explicit human review step for specification meaning, then run `cargo verus verify`. Keep trusted axioms or `external_body` declarations visible and minimal; do not attach `external_body` to the function whose implementation is the verification target. The checker proves the supplied model, so human review must establish that the model matches the paper.

## what is proved, measured, and trusted

The paper demonstrates an abstracted theorem about effective symbolic spaces and a PVS proof assembled from generated definitions and lemmas. It measures no benchmark accuracy, runtime, or number of successful formalizations. Inference: the trusted components include Nougat transcription, the LLM's abstraction and code, manually edited theories, PVS libraries, and the user's interpretation of the source theorem. The paper itself says LLM autoformalization “is not perfect and without errors” (Section 4, p. 5).

## techniques for the catalog
- document-to-theory ingestion — convert PDF mathematics to LaTeX, then expose definitions and theorems to formalization
- abstraction before proving — reduce complex statements to basic set-theoretic concepts (the paper does not record omitted assumptions; that is this study's addition)
- llm-generated pvs with checker — generate theories and lemmas, parse/typecheck them, and finish proofs interactively
- human repair loop — manually correct syntax and theorem statement, add lemmas, and run the proof in PVS
