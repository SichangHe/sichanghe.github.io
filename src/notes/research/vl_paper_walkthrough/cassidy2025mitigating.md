# Mitigating hallucinations and omissions in LLMs for invertible problems: An application to hardware logic design automation
(authored by agents unless marked 🧑)
Tag: `cassidy2025mitigating`, [paper](https://arxiv.org/abs/2512.03053)

## problem and core idea
The paper treats translation between two representations of the same design as an invertible transform. A human designer writes a Logic Condition Table (LCT), an LLM translates the LCT into Verilog HDL (forward or encode transform), and an LLM translates the HDL back into an LCT (inverse or decode transform). The reconstructed table is compared with the original. The authors describe the flow as: “The closed loop solution using LLMs as an invertible transform to verify the implementation is shown in Fig. 1.” (Section 1, p. 1) In the experiments the forward and inverse transforms used different LLMs (Section 5, p. 4).

An LCT lists input conditions (columns) and the output results or actions (columns) for each case (row), including sequential state and “don’t care” values (Section 3.1, pp. 2–3; Tables 1–3, p. 2). The paper reports that LCTs “were first applied to auditing the logic of a 22B transistor Neural Inference Processor [20, 7] prior to tapeout”; “over 160 LCTs were manually constructed from the Verilog source code, one per process statement on selected logic units”, and “the processor was successful in first pass silicon.” (Section 2, p. 2) Inference: LCTs are a structured source specification rather than an informal prompt; the paper claims “Precise specification using LCTs ensures all design information is completely and correctly defined.” (Section 1, p. 1), which the experiment supports only for one router design.

If the original and reconstructed LCTs do not match, the paper lists three possible causes: an error in the encode/forward transform, an error in the decode/inverse transform, or an inadequate original specification (designer error) (Section 1, p. 2). The authors explicitly limit the claim: “Therefore, formal verification is still necessary.” (Section 1, p. 1) They give two reasons: the encoder and decoder “might introduce self-cancelling hallucinations producing a match”, and “If the designer defines the wrong function with a complete, well-formed input LCT specification, our approach will correctly implement the wrong function.” (Section 1, pp. 1–2) They call the method “a verification method primarily for checking the LLM’s work and only secondarily the LCT specification.” (Section 1, p. 2)

## technique 1: make a complete tabular specification

When to use it: use LCTs for logic blocks whose behavior can be enumerated as input conditions and output actions: combinational, sequential, and finite-state units (Tables 1–3, p. 2). Logic can be partitioned into multiple LCTs, and connectivity tables (Table 4, p. 2) define the port mapping of a hierarchical module (Section 3.1, p. 3). Condition headers may be a signal name or a logical or arithmetic condition; conditions and outputs need not be binary; `X` means don’t care; writing an output signal name into an output cell means the register holds its value (Section 3.1, pp. 2–3). The “Case” and “Comments” columns are optional. The LCT does not specify clocking; the prompt states “clocked” or “combinational”. Clocked LCTs retain state from the prior clock cycle; unclocked ones do not (Section 3.1, p. 3).

Step by step:

1. Enumerate the input-condition columns and output-result columns for one logic unit (Section 3.1, pp. 2–3)
2. Add rows so that all condition cases are enumerated (“All condition cases should be enumerated”, Section 3.1, p. 3); use `X` for don’t-care inputs; the paper’s examples cover reset, backpressure (hold), and state transitions (Tables 2–3, p. 2)
3. Decide whether the table is clocked or combinational, to be stated in the forward prompt, and define the Verilog port map (Sections 3.1 and 3.3, p. 3)
4. Split a larger design into several LCTs (the paper does this by process statement for `reg_stg` and `fifo`, Section 5, p. 4) and represent module wiring with a connectivity table (Section 3.1, p. 3)
5. Be complete and precise before generation: “Anything left unspecified or ambiguously specified is open to misinterpretation and misimplementation.” (Section 6, p. 6) The paper gives this as a lesson learned, not as a review procedure.

Verus form: Inference: use a mathematical sequence or map as the LCT model and a `spec fn` to map input conditions and prior state to output state. Inference: implement the executable Rust function with `requires` for valid rows and `ensures` that its result equals the specification; for sequential units, include the prior state in the function contract. Inference: represent connectivity as typed structs and prove that each source signal maps to the declared destination. Inference: Verus does not automatically infer missing table rows, so completeness needs an explicit predicate and proof or an external table checker.

Evidence and limits: the router design had 13 hierarchical units, 11 logic units and 2 connectivity units (Sections 4 and 5, p. 4). “The size of the LCTs generally comprised tens of table cells (rows × columns), ranging up to several hundred table cells for the merge arbiter.” (Section 6, p. 6) “Separate experiments demonstrated successful logic generation (forward transform, checked by functional simulation) of synthetic FSM LCTs into the range of thousands of table cells.” (Section 6, p. 6) Only forward generation was reported for those synthetic cases. The main closed-loop result covers one router design. Inference: it does not establish that all hardware specifications are easy to enumerate. The paper states breaking designs into small units helped: “The larger the complexity of the design unit, the higher the chance of generation mistakes.” (Section 6, p. 6)

## technique 2: forward LLM transform from LCT to HDL

When to use it: use a forward transform after the LCT and port map are complete. The paper calls the forward prompt “simple” and lists four items (Section 3.3, p. 3).

Step by step:

1. Specify clocked or combinational Verilog (Section 3.3, p. 3)
2. Specify the LCT columns: the number of input-condition columns and the number of output-result columns (Section 3.3, p. 3)
3. List the LCT in CSV format (Section 3.3, p. 3)
4. Define the Verilog port map, including the module input and output signals (Section 3.3, p. 3)
5. Run functional simulation on the generated HDL and record syntax (S) and functional (F) errors; the paper used Pass@1 for syntax and functionality (Section 5, p. 4; Table 6, p. 5)

Verus form: Inference: replace Verilog with Rust functions over the same table model. Inference: use `ensures` to assert that the returned outputs match the selected LCT row and `assert`/proof functions for case partitioning. Inference: preserve the source table as a ghost or specification value so that code generation cannot silently change it; simulation remains useful for integration but is not a substitute for proof.

Evidence: seven off-the-shelf models, used “without retraining, fine tuning, augmentation, or any other modification” (Section 3.5, p. 3), generated the 13 router units (Section 5, p. 4; Table 6, p. 5). Two models (Claude Sonnet-4.5 and Gemini2.5-Pro) correctly designed all 13 units, “100% success”. Two (Gemini2.5-Flash and ChatGPT-5) had only a single compile error each, needing 2 lines of fixes. Two (Llama-4-maverick and Llama-3-405b) had insufficient context length to generate the largest unit (DNF in `rtr_top`). The seventh, ChatGPT-5-mini, had syntax and functional errors (Table 6). “Aside from the insufficient context length, all units were fully functional with less than 15 lines of code modified (out of 1500-2000 lines of code generated, depending on the LLM model).” (Section 5, p. 4) Inference: the denominators are units per model, not independent random samples.

## technique 3: inverse transform and comparison

When to use it: the paper used a different model for the inverse transform than for most forward transforms (Gemini2.5-Pro decoded all units; it was also one of the forward models). The authors say using different LLMs “separates the design and the check, similar to separate human designers and verifiers in traditional logic design and verification methodology” (Section 5, p. 4) and that, for cancelling forward and inverse errors, it “reduces this possibility even further” (Section 5, p. 6). The inverse prompt teaches the LCT format because “LCTs are unknown to LLMs and thus LLMs have not been trained to generate LCTs.” (Section 3.4, p. 3)

Step by step:

1. Give a short natural language definition of an LCT (Section 3.4, p. 3)
2. List a full Verilog example (MUX2 design) (Section 3.4, p. 3)
3. List the corresponding LCT (MUX2 design) (Section 3.4, p. 3)
4. List the Verilog to evaluate (Section 3.4, p. 3)
5. Define the input-condition and output-result column headers of the LCT to be reconstructed (Section 3.4, p. 3)
6. Compare the original and reconstructed LCTs (Section 3.2, p. 3). The paper reports the comparison outcome by classes (technique 4) and notes that the harmless differences it ignored “prevent direct one-to-one comparison of LCTs”; it says automating the equivalence comparison has no “significant technical hurdles” but does not report such an automated comparer (Section 5, p. 6)
7. For a mismatch, decide among forward error, inverse error, and designer error (Section 1, p. 2), fix, and “repeat from 2. if necessary” (Section 3.2, p. 3)

Verus form: Inference: define a canonicalized table in a `spec fn` that sorts or normalizes equivalent rows, then prove equality of canonical forms. Inference: use a separate Rust parser for generated code and make its output an input to a Verus proof; parser correctness and HDL semantics remain trusted unless formalized. Inference: use two independently generated specifications or a manually checked reference to reduce, but not eliminate, self-cancellation.

Evidence: Gemini2.5-Pro performed the inverse transform for every unit and every forward model (Section 5, p. 4). The `req_top` and `rtr_top` connectivity units were not checked (Section 5, p. 5). The paper says: “Comparing the original and reconstructed LCTs successfully detected all five functional errors in the forward transform found by simulation, while also detecting three more forward transform errors, not found by simulation.” (Section 6, p. 6) “The reconstruction step only introduced one inverse transform error for additional review.” (Section 6, p. 6) “The final three functional errors were due to incomplete or ambiguous specification. Our approach cannot be faulted for missing these, as it can only create and reconstruct based on the information that it has.” (Section 6, p. 6) Those three show up as `M SP` in Table 7: the tables matched but simulation failed. Example from the paper: a bitwidth mismatch “not defined by the LCT” (Section 5, p. 5).

## technique 4: classify equivalence instead of requiring text identity

A literal table diff can report harmless changes. The paper therefore classifies each comparison (Section 5, p. 5; Table 7, p. 5): `M` (100% match, correct logic), `M SP` (match, but functional simulation failed because of a specification gap), `X EQ` (mismatch, but logically and functionally equivalent tables; the paper’s case was an unused output specified in the original LCT that the HDL dropped), `X FW` (forward-transform error caught, also found by simulation), `X FW∼S` (forward-transform error not caught by functional simulation because of missing testbench test cases), and `X INV` (inverse-transform error; the case found corresponded to a forward-transform syntax error that may have hindered the inverse). It treats as inconsequential, without annotating them in Table 7 (Section 5, pp. 5–6): row/column permutation, expansion of “don’t care” cases into enumerated cases, minor signal-name differences such as abbreviations or suffixes, equivalent numerical types such as 3′d5 and 3′b101, and default cases the LLM inserted for fully specified case statements. Minor specification gaps such as a missing reset case “did not affect the results.”

Verus form: Inference: prove observational equivalence by applying a canonicalization function or by showing equal outputs for all inputs satisfying the contract. Inference: a Verus postcondition should state semantic equality, not source-text equality; a parser or normalizer is an additional trusted component unless verified.

## what is proved, trusted, and relevant to VL

The paper measures functional simulation, round-trip table comparison, and model pass rates and lines to fix (Tables 6–7). It reports no formal proof. Inference: the source LCT, prompt examples, inverse model, simulation test cases, the (apparently manual) equivalence judgment, and hardware semantics therefore remain trusted. The authors say a forward error could be cancelled by an opposite inverse error: “While unlikely, using different LLM models for the forward and inverse transforms (as done in Table 7) reduces this possibility even further.” (Section 5, p. 6) They state that “functional verification of the input specification and overall design is still necessary” (Section 1, p. 2).

Inference: for VeruLaw, the direct transfer is a specification-to-code-to-specification consistency check. A natural-language contract or Verus specification can be serialized into a canonical form, passed to an agent that writes Rust, and reconstructed from the Rust plus its contracts; mismatches should trigger review before accepting proof results. Inference: unlike the paper’s HDL, Verus provides a proof checker for the written contract, so the round trip should complement `ensures` proofs and executable tests rather than replace them. Inference: this is a material threat to agent-written verified Rust when VL checks only that Verus accepts a potentially incomplete contract: the paper found three specification-induced failures that its round trip could not fault, and says functional verification of the input specification is still necessary.

Inference: the paper already covers structured tabular specifications, inverse reconstruction, semantic equivalence classification, and different forward/inverse models. VL should not claim these as new techniques; a contribution would need to adapt the round trip to Rust/Verus syntax and measure how often it catches contract omissions that ordinary proofs and tests miss.

## techniques for the catalog

- invertible specification round trip: generate code from a structured source specification, reconstruct that specification, and compare the two
- complete LCT modeling: enumerate condition/result rows, state timing, and modular connectivity before generation
- different-model inverse checking: use a different model to decode generated code and reduce the chance of cancelling errors
- semantic table comparison: classify harmless row, column, don't-care, naming, and literal changes separately from real mismatches
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Using different LLMs in the forward and inverse transforms separates the design and the check, similar to separate human designers and verifiers in traditional logic design and verification methodology."): read the whole text (7 pages) and the study; checked every quotation, number, section and page reference, prompt step and experiment result against the text and the PDF page layout; changed page and section references (Results is Section 5, Discussion is Section 6, Discussion is p. 6, prompts are p. 3), the forward prompt (four items, not five; the paper gives column counts, not names), the 160 LCT quote and context, the model-outcome list (added the seventh model), the claim that the comparison was exact or automated (the paper reports no automated comparer), and added the Table 7 classes; deleted the unsupported claims that different models reduce correlated errors and that an equivalence classifier and HDL parser are trusted components; did not check the cited external works, Table 6 and Table 7 cell-by-cell alignment beyond the 5 + 3 + 3 count (Table 7 text columns are misaligned in the extraction), or the figures.
