# LASA: Enhancing SoC Security Verification with LLM-Aided Property Generation
(authored by agents unless marked 🧑)
Tag: `ankireddy2025lasa`, [paper](http://arxiv.org/abs/2506.17865v1)

## scope and result

LASA generates security properties and SystemVerilog Assertions (SVAs) for bus-based systems-on-chip (SoCs), checks candidate properties for vacuity, and uses formal property verification (FPV) and coverage feedback to refine prompts. The abstract states: “LASA integrates commercial EDA tool for FPV to generate coverage metrics and iteratively refines prompts through a feedback loop to enhance coverage.” (p. 1.) The paper evaluates IP designs from CEP and OpenTitan using Cadence JasperGold 2020.12 (§IV-A, p. 4). It compares GPT4o, Gemini-1.5, and Llama-3.1 and selects GPT-4o: “Hence, we selected GPT-4o as our primary LLM for integration with LASA for automation tasks in different stages.” (§IV-A, p. 4.)

Table II (p. 5) reports eight designs. Its columns are generated properties, correct properties, non-vacuous properties, generated assertions, and correct assertions. AES-192 has 73, 43, 41, 41, and 40; DES3 has 37, 31, 29, 29, and 27; GPS has 108, 98, 93, 93, and 90. The authors describe correct properties as “proven to be relevant” and “semantically correct”, and state that “‘#non-vacuous’ denotes the number of properties that pass vacuity check rules.” (§IV-C, p. 5.) The paper does not report an independent assessment of requirement correctness.

The abstract reports average coverage of approximately 88%, and the conclusion repeats 88% (pp. 1, 7). Table III (p. 6) reports checker, stimuli, and formal coverage separately; its Average row contains percent signs without numerical values. Inference: the study should preserve 88% as the authors' overall claim without assigning it to a particular coverage column. The paper also reports five detected bugs in the buggy OpenTitan benchmark from Hack@DAC’24 (§IV-G, p. 6; Table IV, p. 7).

## technique 1: hierarchical design context and retrieval

What it is. LASA extracts behavioral descriptions from RTL and specification documents, then combines summaries with information retrieved from related documentation. The paper states: “LASA breaks down the code into higher-level abstractions (e.g., modules, functions, or components) and uses the summarized descriptions in the creation of prompts.” (§III-A, p. 3.) It also states: “Additionally, LASA employs Retrieval-Augmented Generation (RAG) techniques to extract and summarize the relevant information from related documentation or manuals at a high level.” (§III-A, p. 3.)

How the paper applies it:

1. Extract behavior from RTL and specifications, including block diagrams and text (§III-A, p. 3)
2. Summarize modules, functions, or components and retrieve relevant documentation (§III-A, p. 3)
3. Formalize design specifications in a JSON-based `<SPEC_FILE>` (§IV-B, pp. 4–5; Listing 1, p. 5). The example includes SoC name, bus, IP count, bus interface, IP operation, and assets
4. Process each IP with its own documentation and specification; evaluate large hierarchical IPs at submodule level (§IV-B, pp. 4–5)
5. Feed enriched prompts sequentially to the LLM for property generation (§IV-B, p. 5). Generate localized properties independently and combine them at the top module (§IV-C, p. 5)

The paper describes this combination explicitly: “The initial prompt includes high-level design specifications extracted from <SPEC_FILE>, either at the module or submodule level, augmented with contextual information retrieved via RAG-based techniques.” (§IV-B, p. 5.) Appendix A, Prompt 7 (p. 8), requests signal names, port declarations, descriptions, functionality, interconnections, assertion information, and microarchitecture information.

Verus form. Inference: a Rust adaptation could summarize one module or function at a time, including signatures, state, security assets, and existing specifications. Retrieved API and Verus documentation could inform candidate `requires`, `ensures`, loop `invariant`, `assert`, and `proof fn` annotations. Cross-module obligations would still need explicit checks. The paper evaluates hardware properties, not this adaptation.

Evidence and limits. The input-token limit motivates decomposition (§III-A, p. 3). The paper does not report a separate RAG ablation or specify a retriever configuration. Inference: summaries can omit relevant dependencies, so retrieved context alone cannot establish that a generated contract captures the full requirement.

## technique 2: generate properties and screen for vacuity

What it is. LASA generates temporal security properties and uses nine vacuity rules/theorems reproduced from prior literature (§II-B, p. 2; §III-B, pp. 3–4). The paper explains: “Vacuous properties usually indicate weak, trivial, or incorrect specifications for a given system or design.” (§II-B, p. 2.) Its example is `G(p → F q)`, which is satisfied vacuously if `p` never occurs. The formal definition requires that the system satisfy the formula and that a subformula not affect its satisfaction (§II-B, p. 2).

How the paper applies it:

1. Generate properties using design context and k-shot examples (§III-B, pp. 3–4)
2. Supply the nine rules/theorems in the prompt for k-shot learning (Appendix A, Prompt 2, p. 8)
3. Ask the model to classify generated properties as vacuous or non-vacuous using those rules (Appendix A, Prompt 3, p. 8)
4. Translate properties that pass the vacuity check to SVAs (§IV-D, p. 5)

The application is described as: “LASA leverages pre-trained LLMs to generate equivalent assertions for all non-vacuous properties that pass the vacuity check.” (§IV-D, p. 5.) Listing 2 (p. 6) illustrates potential vacuity: `validCounter > 1` never holds if the counter is stuck at 1 or 0. Table II (p. 5) reports 43 correct AES-192 properties and 41 non-vacuous ones; the corresponding DES3 counts are 31 and 29, and GPS counts are 98 and 93.

Evidence and limits. The description contains inconsistent wording. Section IV-C (p. 5) says to “discard all non-vacuous properties that violate at least one of nine theorems”; Appendix A, Prompt 3 (p. 8), says: “A property must fail at least one vacuity condition among the 9 theorems to be non-vacuous.” Inference: those statements do not give a consistent operational rule when read alongside the stated goal of retaining non-vacuous properties. The paper provides model prompts and formal definitions, but does not establish that its prompted classification implements a sound, complete formal vacuity decision procedure or report classification error rates. Section IV-H acknowledges: “Incorporating more robust vacuity checking rules or refining existing ones could help filter out vacuous properties.” (p. 7.)

Verus form. Inference: screen Rust contracts for impossible preconditions and unreachable postcondition antecedents. Use separate reachability or mutation checks to test whether a contract constrains relevant behavior. The temporal theorems do not directly establish a correct screening method for Verus contracts.

## technique 3: translate retained properties and repair assertions

What it is. LASA translates retained properties into SVAs using examples and re-prompting. The paper states: “The framework employs re-prompting to correct syntax errors in generated assertions and produce revised versions.” (§III-C, p. 4.) It appends assertions to `.sva` files and generates TCL scripts for JasperGold; model checking produces counterexamples for failures (§III-C, p. 4).

How the paper applies it:

1. Give the model non-vacuous properties and a small set of example assertions (§III-C, p. 4)
2. Generate SVAs, append them to their respective `.sva` files, and generate evaluation scripts (§III-C, p. 4)
3. Run JasperGold and inspect syntax errors and counterexamples (§III-C, p. 4; Appendix A, Prompts 4–5, p. 8)
4. Re-prompt to correct malformed assertions and discard invalid candidates (§III-C, p. 4; §IV-D, pp. 5–6)
5. Distinguish incorrectly formulated assertions from failures that indicate potential design bugs (§III-E, p. 4)

Section IV-D reports problems with hardware behavior, timing, implication semantics, signal scope, and reset constraints (pp. 5–6). Listing 3 (p. 6) gives the DES3 assertion `(!$stable(roundSel)) |=> (K !== $past(K));`; the authors describe it as semantically incorrect because it violates design behavior and yields a counterexample (Fig. 4, p. 6). A failing assertion therefore requires interpretation: “Failed SVAs indicate a potential issue—either due to incorrect formulation by LLM or uncovered design behavior that leads to potential bugs.” (§III-E, p. 4.)

Evidence and limits. Table II (p. 5) reports 40 correct assertions out of 41 generated for AES-192, 27/29 for DES3, and 90/93 for GPS. These denominators are generated assertions, not security vulnerabilities. The authors state: “There were some manual efforts involved for those properties requiring re-prompting for conversion to SVAs.” (§IV-D, p. 5.) Inference: the paper does not demonstrate a wholly autonomous translation-and-repair process.

Verus form. Inference: generate candidate Rust contracts and proof functions, run Verus, and return diagnostics to the model for revision. A failed proof can reflect a code bug, an inadequate proof, or an incorrect specification. The paper's hardware counterexamples do not establish an equivalent Rust counterexample workflow.

## technique 4: use coverage feedback to refine prompts

What it is. LASA collects checker, stimuli, and formal coverage using JasperGold. Checker coverage includes cone of influence (COI) and proof core; stimuli coverage describes input conditions and includes code and functional coverage; formal coverage combines stimuli and checker coverage (§II-C, p. 2). The methodology lists branch, statement, expression, and toggle coverage (§III-D, p. 4).

How the paper applies it:

1. Verify generated SVAs and collect coverage reports (§III-D, p. 4; §IV-E, p. 6)
2. Use a configurable coverage threshold, set to 80% in the experiments (§IV-E, p. 6)
3. When coverage is below the threshold, use reports to refine prompts and generate additional properties and SVAs (§III-E, p. 4; §IV-E/F, p. 6)
4. Add prompts addressing resets, boundary values, sequential behavior, unreachable states, or multi-cycle paths (Listing 4, p. 6)
5. Repeat toward the configured threshold (§III-E, p. 4)

The paper states: “If coverage falls below this threshold, LASA incoprates a feedback loop to generate additional relevant SVAs to improve the coverage.” (§IV-E, p. 6; spelling as printed.) It maintains an additional prompt database (§III-E, p. 4), and Appendix A, Prompt 6 (p. 8), asks for additional assertions based on uncovered cases in coverage reports.

Table III (p. 6) gives AES-192 checker COI 99.02%, checker proof core 83.59%, stimuli 99.93%, formal COI 99.37%, and formal proof core 85.05%. DES3 has 93.97%, 91.70%, 100%, 93.98%, and 91.71%, respectively. These are coverage metrics, rather than assertion pass rates. Appendix B, Table V (p. 9), gives submodule metrics, including values below 80%, such as FIR's left multiply block formal proof core of 71.78%. Inference: the 80% setting does not show that every reported metric at every hierarchy level meets that threshold; the paper does not specify a precise stopping rule across all columns and levels.

Evidence and limits. The discussion proposes custom coverage metrics: “Additionally, adopting custom coverage metrics would offer a more accurate representation of verification completeness, guiding iterative improvements effectively.” (§IV-H, p. 7.) Inference: a high structural coverage value alone does not establish complete security requirements or correct property intent.

Verus form. Inference: use failed proof obligations and explicitly recorded requirement gaps to request focused assertions, invariants, or lemmas. Rust test coverage could offer separate feedback, but LASA's hardware metrics and 80% setting do not define a Verus completeness metric.

## technique 5: add threat context and inspect failures for bugs

What it is. LASA augments prompts for bug detection: “For generating tailored SVAs for detecting bugs, LASA includes additional high-level information into the prompts, including micro-architectural events, threat models, secure assets, etc.” (§IV-G, p. 6.) Verification can then expose violations of intended behavior.

How the paper applies it:

1. Add microarchitectural events, threat models, and secure assets to prompts (§IV-G, p. 6)
2. Generate tailored SVAs and verify them (§IV-G, p. 6)
3. Use assertion failures and counterexamples to identify potential flaws while considering incorrect assertion formulation (§III-C/E, p. 4)
4. Report detected bugs with source references, security impact, and detection SVAs (Table IV, p. 7)

Table IV lists five bugs: UART receiver parity checking independent of parity enable; write data assigned the register value rather than the hardware value; potential OTP word overflow; an HMAC hashing key leaked through `reg_rdata_next`; and incorrect error-detection logic involving unused `error_s` (p. 7). The authors say: “This capability is demonstrated through the detection of five bugs in the buggy OpenTitan SoC from the Hack@DAC’24 competition and tabulated in Table IV.” (§IV-G, p. 6.)

Evidence and limits. The paper provides these examples without a bug-detection recall or precision estimate. It does not report fixing the five bugs and re-verifying the repaired designs. Inference: the count supports a demonstration on that benchmark, rather than a general detection rate or a demonstrated repair workflow.

Verus form. Inference: supply security assets, attacker-controlled inputs, and intended invariants when proposing Rust contracts. Inspect failed checks against code and specification intent before labeling them bugs. This adaptation remains unevaluated by LASA.

## what is proved, measured, and trusted

The paper reproduces vacuity theorems from prior literature (§II-B, p. 2), runs JasperGold on generated assertions, and reports property counts, assertion counts, coverage, and five benchmark bugs (§IV, pp. 4–7). It does not prove that LLM generation captures every security requirement. The discussion acknowledges: “LLMs struggle with complex, specialized tasks and are constrained by a finite set of use cases in generating SVAs, often leading to incomplete or erroneous responses.” (§IV-H, p. 7.) Fine-tuning, stronger vacuity checks, syntax checking, advanced reasoning, and improved coverage metrics are proposed improvements (§IV-H, p. 7).

Inference: a Rust adaptation would depend on specification extraction, retrieved context, candidate contracts, verifier assumptions, and the verification tool. For VeruLaw, the reusable idea is a loop from structured context to candidate specifications, checker feedback, and targeted revision. Record prompts, assumptions, contracts, and verification results so the basis for a passing check can be inspected. The hardware-specific gap is how to assess contract relevance, vacuity, and coverage for Rust/Verus; LASA does not resolve it.

## techniques for the catalog

- hierarchical RAG prompting: summarize design components and retrieve relevant documentation before property generation
- vacuity screening: prompt classification using supplied temporal rules, while recognizing the paper's inconsistent operational wording
- few-shot assertion translation: translate retained properties to SVAs and repair malformed candidates with tool feedback
- coverage-driven refinement: add targeted properties when configured coverage is low
- counterexample bug finding: combine threat context, assertion failures, and source inspection to identify potential flaws

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "There were some manual efforts involved for those properties requiring re-prompting for conversion to SVAs."): read the complete nine-page paper text and study; checked quotations, counts, coverage values, references, and technique steps; corrected page and section references, clarified prompted vacuity screening and its inconsistent wording, removed unsupported repair steps, qualified average coverage and the stopping rule, and marked Rust/Verus adaptations as Inference; did not independently run LASA, JasperGold, or Verus, validate the cited prior work, or inspect benchmark source code.
