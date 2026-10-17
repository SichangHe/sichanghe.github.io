# Inference of Properties from Requirements and Automation of Their Formal Verification
(authored by agents unless marked 🧑)
Tag: `reich2019inference`, [paper](https://doi.org/10.1109/ase.2019.00145)

## scope and claimed contribution

This 4-page paper (ASE 2019, pp. 1222–1225) describes a planned PhD project, not a completed evaluation. Its abstract says the objectives are “the automated inference of declarative property specifications from example data specified by the engineer for a function under development and their automated verification on abstract model level and on code level.” (abstract, p. 1222) The project is set in avionics, under DO-178C, DO-331 and DO-333 (section I, p. 1222). The motivating function `mergeLMI`, from a drone-swarm landmark-extraction program, has four textual requirements: it receives two integer arrays, merges them into one array, sorts the merged list ascending, and deletes “numbers that occur more than once” (section I-A, p. 1223). The paper names two problem areas: “(1) property formation and (2) automated proof execution.” (section I-B, p. 1223)

Inference: the pipeline is a research plan. The paper reports no implementation, benchmark, denominator, or measured result.

## technique 1: example-data specification with EDSS/SML

The engineer supplies example data through an Example Data Specification Strategy (EDSS), and Automated Property Formation (APF) mines formal properties from it (section III and Figure 2, p. 1224). The paper states: “For the property formation, we propose a generation of formal properties of the function under development out of example data that is provided by the engineer supplementary to the requirement specification.” (section I-B, p. 1223) A meta-model for the Scenario Modeling Language (SML) “explaining the structure of the data table will be developed”, and “inputs and outputs of the function under specification, e.g., mergeLMI in our example I-A, shall be provided as headings of the table.” (section III-A, RQ1, p. 1224)

The planned EDSS steps, assembled from sections I-B and III-A:
1. give the function’s inputs and outputs as table headings (section III-A, p. 1224);
2. mark the data with characteristics such as the array type, input versus output, intermediate values and exceptions (section I-B, p. 1223); time stamps or data frequencies “have to receive the notion of a sequence”, and SML “will also reflect the possibility to specify intermediate values, e.g., for the generation of invariants, and exceptions.” (section III-A, p. 1224);
3. use “known techniques from testing” to guide the engineer’s choice of example data, so “the coverage of the data shall be increased.” (section III-A, p. 1224);
4. feed the scenario data, domain-specific background knowledge and generic background knowledge to APF (Figure 3, p. 1224).

Inference: in Verus, the closest form is a `spec fn` over `Seq` or mathematical values, with `requires`/`ensures` contracts generated from reviewed examples. Examples cannot prove a universal contract; each inferred contract still needs a proof and a human adequacy review. Intermediate values could seed loop `invariant` clauses.

## technique 2: ILP/ATF-based property generation

The paper says: “ILP [31] is a machine-learning technique that is able to deduce FOL-formulae from a set of example data.” (section II-2, p. 1224) Progol and Automated Theory Formation (ATF) deduce properties from examples given as Horn clauses or numeric series. The paper proposes “to extend the functionality of ATF to be able to deduce properties from example data provided by the engineer”, because current algorithms ignore domain characteristics “such as concurrency, frequency, and timing”; it also needs multidimensional input data and will “investigate whether also HOL properties are achievable.” (section II-2, p. 1224)

Figure 3 (p. 1224) sketches APF in three steps: Step 1 “Grammar” turns scenario data plus domain-specific and generic background knowledge into formal formulas; Step 2 “Validation on data” keeps valid formal formulas; Step 3 “Reduction” outputs a validated and optimized set of properties (figure label; its extracted text is broken across lines). The text says: “The algorithm will implement the inference rules from example data. It will use an appropriate grammar for Step 1 of APF, validate generated formulas in step 2 and apply reductions in step 3.” (section III-A, p. 1224)

Inference: a Verus version could generate candidate `spec fn`, `requires` or `ensures` text from examples, then prove candidates with Verus. The paper’s FOL/HOL target does not carry over directly; translation to Verus’s specification language is extra work. A candidate is a conjecture until proved and reviewed against the requirement.

## technique 3: tailor properties to proof automation

The abstract expects the technique “to produce too many uninteresting properties” and proposes to “tailor the algorithm towards selection of the right properties that facilitate the automation of the proof.” (abstract, p. 1222) The paper notes that one challenge is “to determine the optimal set of axioms”, that interactive provers need parameterization before proof execution, and hypothesizes that this information and the axiom set can be obtained during property generation (section I-B, p. 1223). For RQ2 it claims: “with APF we we will be able to automate the proof by generation of use-case specific lemmata and identification of use-case specific parameter.” (section III-A, p. 1225)

For validation (RQ3), the paper says: “The idea is to execute the proof directly after APF and only publish the failed proofs to the engineer.” The user then identifies “whether the failure was made during provision of example data or on the implementation.” (section III-A, p. 1225)

Inference: the overall loop is generate formulas true on the examples, validate, reduce, derive lemmas and prover parameters, run the prover, and show failures to the engineer. For Verus, the analogue is generating candidate lemmas and solver hints, running `verus`, and returning failures. A lemma the solver proves can still miss the requirement; the paper’s RQ1 measures interestingness by “its match to the requirement itself and whether it contributes to the automation of ATP” (section III-B, p. 1225). Inference: VL should rank by proof success and review requirement adequacy separately.

## proposed evidence and what remains unknown

The paper defines three research questions and a planned evaluation, with no results (sections III-A and III-B, pp. 1224–1225). RQ1 measures match to the requirement and contribution to ATP automation, and will determine the algorithm’s scalability. RQ2 compares the number of manual prover interventions with and without EDSS, and counts how many parameters APF can predetermine. RQ3 injects misleading example data, assesses “the continuation of the process”, and counts false positives the proof produces. The authors say: “We expect to receive false positives, e.i., properties that do not match to requirements, but represent a true information for the given set.” (section III-B, p. 1225) Experiments are to follow Wohlin et al. [36] (footnote 16, p. 1225).

Inference: with no experiment, there is no denominator, model, setting or numeric result to transfer to VL. The SML meta-model, APF algorithm and quality measurements are all still to be developed. The main risk is properties that overfit the examples or are easy to prove but unintended. Trusted inputs include the engineer’s examples, the requirement interpretation, the background knowledge and the grammar.

## what VL should reuse

Inference: reuse the three-step separation (generate from structured examples, validate on data, reduce) and connect generation to Verus proof feedback. Do not claim the paper demonstrates automatic specification or reduced proof effort: it proposes measurements but reports none. Existing Verus contracts and lemma libraries could supply background knowledge; failed proofs could guide example refinement.

## techniques for the catalog

- example-data specification: structure inputs, outputs, types, intermediate values, sequences/timing and exceptions in a scenario table
- ILP/ATF property formation: generate candidate first-order (possibly higher-order) formulas from examples, a grammar and background knowledge
- validation and reduction: check candidates on the examples, keep valid formulas, and reduce them to an optimized property set
- proof-guided tailoring: generate use-case lemmas and prover parameters, run the proof, and show failed proofs to the engineer
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We propose to extend the functionality of ATF to be able to deduce properties from example data provided by the engineer."): read all four pages (pp. 1222–1225, including references) and checked every quotation, section and page reference, the Figure 3 steps, the RQ evaluation plan, and the DOI tag; changed all page numbers from 1–5 to the printed pages 1222–1225, corrected the mergeLMI requirement R4 (“delete numbers that occur more than once”, not deduplicate), the two problem areas, the Figure 3 inputs and output name, the extension target (ATF), removed an altered “[s]” in a quote, and marked the assembled workflows and Verus mappings as Inference; did not check the cited works or the Verus claims.
