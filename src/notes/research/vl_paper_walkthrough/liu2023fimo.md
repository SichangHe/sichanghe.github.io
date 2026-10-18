# FIMO: A Challenge Formal Dataset for Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `liu2023fimo`, [paper](https://arxiv.org/abs/2309.04295)

## purpose and evidence

FIMO is a benchmark and construction pipeline for 149 International Mathematical Olympiad (IMO) Shortlisted Problems formalized in Lean, each paired with an informal statement and proof. The authors state: “We present FIMO, an innovative dataset comprising formal mathematical problem statements sourced from the International Mathematical Olympiad (IMO) Shortlisted Problems.” The source pool contains 245 Algebra and Number Theory problems from 2006–2021; 149 passed formalization (60.8% overall: 89/124 Algebra = 71.8%; 60/121 Number Theory = 49.6%; Table 4, p. 5). The denominator is the category’s shortlisted problems, with subquestions treated independently. Note: the body text (p. 5) says “121 Algebra problems and 124 Number Theory problems”, but Table 4 gives Algebra 124 and Number Theory 121; this study follows Table 4 and Table 6, which agree with each other.

Inference: the benchmark matters because the formal checker decides whether a statement/proof is well-typed and provable, while the natural-language proof supplies guidance. The authors emphasize that “Each formal statement undergoes thorough manual examination to ensure a faithful alignment with the original informal version” (Introduction, p. 1). GPT-4 (gpt-4-0314) solved no FIMO theorem in their baseline: Pass@1 and Pass@8 were both 0.0% (Table 9, p. 7; Pass@N counts N attempts at generating the whole proof), while miniF2F-valid had Pass@8 16.0% with human informal proofs and 21.3% without. The denominators are benchmark statements (149 for FIMO), not generated-proof counts.

## technique 1: OCR followed by semantic checking

What it is. Convert PDF-only IMO Shortlisted Problems to editable LaTeX with Mathpix, then manually check the conversion. The paper says, “Specifically, the Mathpix snipping tool, an image-to-LATEX converter, is utilized.”

Steps from the OCR paragraph of §Dataset Construction (p. 3; the manual check is restated under §Manual Verification, p. 4):

1. Run Mathpix on the PDF-only IMO Shortlisted Problems to produce LaTeX.
2. Manually verify the generated LaTeX to avoid minor errors that could compromise mathematical semantics.
3. Assemble each problem with its solution; retain the first solution when several exist.
4. Split multi-subquestion problems into independent problems.
5. Restrict the conversion pool to Algebra and Number Theory; the paper cites Zheng, Han, and Polu (2022) for the “formidable challenge of formalization in the Combinatorics and Geometry categories due to the nascent state of formalization efforts” in formal systems such as Lean.

Verus form. Inference: OCR text can be treated as untrusted input and manually reviewed before translating it to a Rust specification. The equivalent Verus obligation is a reviewed `spec fn` whose predicates match the source statement; OCR itself cannot establish semantic equivalence. The paper uses Lean, so no Verus syntax or automation result is demonstrated.

Evidence and limits. Manual review is the paper’s only stated safeguard for the OCR text; the paper does not report an OCR error rate. Coverage excludes problems before 2006 and the Combinatorics and Geometry categories, so FIMO is not a uniform IMO sample. The authors acknowledge: “Despite our best efforts, there may still be a very small number of errors.” (Limitation section, p. 7).

## technique 2: auto-formalization with proof-assistant and human feedback

What it is. Few-shot prompt an LLM to translate natural-language mathematics into Lean, let Lean return syntax/type errors, and iteratively refine the result with those errors plus human semantic feedback. The pipeline is explicitly OCR → Auto-Formalization → Lean Check → (error messages or human feedback) → reflection, with a maximum of five iterations (Figure 1; §Dataset Construction, p. 4).

Steps in the paper:

1. Rewrite Isabelle few-shot examples into Lean statements (Table 2, p. 4).
2. Prompt GPT-4 with the informal problem and Lean examples to produce a formal statement.
3. Run Lean. If it fails syntactically, pass Lean’s error message back to GPT-4.
4. Ask the model to reflect and regenerate; repeat up to five iterations.
5. After Lean accepts the statement, have a human check semantic alignment with the informal problem (Figure 1 and §Manual Verification, p. 4).
6. Keep only statements passing both Lean and human checks.

For non-proof tasks, they append the answer to make a proposition. Table 1 turns “Find all pairs (k, n) of positive integers for which 7k − 3n divides k 4 + n2 .” into a statement ending “The final answer is (2, 4).” This makes an answer checkable by a prover.

Verus form. Inference: use a Verus `spec fn` for the formalized proposition, compile-check generated Rust, and feed compiler/Verus diagnostics back to the generator. A verified wrapper should state the intended `ensures`; semantic review remains necessary because a satisfiable but mis-modeled predicate can pass the checker. Do not treat diagnostics as a proof of correspondence to the natural-language requirement.

Evidence. With reflective feedback, success was 149/245 = 60.8%; without it, 80/245 = 32.6% (Table 4 versus Table 6, p. 5). Algebra without feedback was 52/124 = 41.9%, Number Theory 28/121 = 23.1%. The paper notes: “We found that GPT-4 is able to figure out how to fix syntax errors under the guidance of high-level error messages in most cases” (p. 5), and says the method keeps “the need for human intervention comparable”. Inference: the gains are conditional on human checks and Lean acceptance; they do not show that the generated theorem is mathematically useful without those checks.

## technique 3: informal-proof-guided formal proof generation

What it is. Give the model the formal statement, informal statement, and an informal proof, then ask it to produce a formally verifiable proof. The authors divide this into acquiring an informal proof and generating the formal proof (§GPT-4 Guided by Informal Proofs, p. 6).

Steps: (1) two setups: the informal proof is either the human solution provided by the IMO problem selection committee (treated as “ground-truth”) or is generated by GPT-4; (2) in the GPT-4 setup, the informal proof is regenerated every time a formal proof is generated; (3) prompt GPT-4 with the formal statement, the informal statement, and the informal proof; (4) Pass@N counts attempts at generating the whole proof; the paper does not spell out the acceptance procedure, so Inference: a proof counts only when Lean accepts it. The paper says it is “Inspired by the DSP framework” (Draft, Sketch, and Prove, which targets Isabelle with Sledgehammer) and that DSP cannot be applied directly to Lean; it does not describe sketch generation.

Verus form. Inference: use an informal proof as search context for a candidate Verus proof, then require Verus to verify the final Rust proof. The text can suggest lemmas and invariants but cannot be trusted as evidence. A failed proof obligation should trigger another candidate, while the accepted `ensures` remains the authority.

Evidence and failure. On miniF2F, GPT-4 with human proofs achieved Pass@1 11.5% and Pass@8 16.0% on validation (denominator: validation problems), while without human proofs it achieved 9.4% and 21.3%; test Pass@8 was 14.3% versus 20.9% (Table 9). On FIMO, both settings were 0/149 at Pass@1 and Pass@8. The paper reports that the model can follow a solution but “fails to apply tactics properly” (Error Analysis, p. 7). The Error Analysis says “most of the informal proofs synthesized by the language model are mathematically incorrect”, so the LLMs may be misled when generating formal proofs (this refers to model-generated informal proofs, not the committee solutions). The paper attributes the better Pass@8 without human proofs to the “increased diversity and ability to explore various directions exhibited in informal proofs generated by language models”.

## what is trusted and threat to VeruLaw

Inference: Lean (as the checker of syntax/type errors and proofs), manual review of statement alignment, OCR review, problem selection, and GPT-4/API behavior are trusted in the dataset process. The dataset measures formalization success and proof pass rates; it does not show that GPT-4 can solve IMO-level theorems, and it says nothing about Verus. For VeruLaw, the useful transfer is a feedback loop where compiler/prover diagnostics guide generation, combined with a human semantic review for specification fidelity and a machine proof check for implementation correctness. My assessment is that the threat from agent-written verified Rust is medium: incorrect informal requirements can be encoded into a perfectly proved but wrong specification, while verifier feedback can improve syntax without repairing that semantic mismatch. FIMO already supplies a benchmark pattern and reports that GPT-4 guided by informal proofs reached 0% on its statements; VL should not redo a benchmark-only pipeline without adapting tasks to Rust APIs and Verus proof obligations.

## techniques for the catalog

- reviewed OCR formalization — convert source PDFs to LaTeX, then manually check equations before formal translation
- reflective auto-formalization — iterate LLM translation using Lean diagnostics and human semantic feedback for at most five rounds
- answer-to-proposition conversion — append a supplied answer to non-proof questions so the result is a proposition a prover can check
- informal-proof guidance — condition formal proof generation on a natural-language proof, then accept only checker-verified proofs
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Hence, we introduce multiple manual checks to ensure the formal statements are semantically aligned with the informal ones."): read the whole paper text (pp. 1-8) and the whole study; checked every quotation, the counts and percentages in Tables 4, 6 and 9, the pipeline steps, the five-iteration limit, the Table 1 example, and page references against the PDF page breaks; confirmed the arXiv link and tag. Changed: the “thorough manual examination” quote is from the Introduction (p. 1), not the abstract; the Limitations quote is on p. 7, not p. 8, and now ends with the paper's period; technique 3 steps rewritten (two setups instead of “when absent”, no claim of adaptation from Isabelle, the incorrect-informal-proof finding now limited to model-generated proofs); the OCR and Geometry/Combinatorics statements reworded to match the paper; added the paper's own Algebra/Number Theory count inconsistency; marked own conclusions “Inference:”; pass-rate wording clarified. Not checked: the cited external works, the GitHub dataset, and the Lean statements in Tables 2, 3 and 8 beyond the Table 1 example.
