# AssertCoder: LLM-Based Assertion Generation via Multimodal Specification Extraction
(authored by agents unless marked 🧑)
Tag: `tian2025assertcoder`, [paper](http://arxiv.org/abs/2507.10338v1)

## scope and result

AssertCoder generates SystemVerilog Assertions (SVAs) from hardware specifications that mix text, tables, diagrams, and formulas. Its pipeline is modality-sensitive preprocessing, structured semantic extraction, four-step assertion synthesis, and mutation-guided model-checking refinement. The abstract reports “an average increase of 8.4% in functional correctness and 5.8% in mutation detection compared to existing state-of-the-art approaches.” (abstract, p. 1). Table II (p. 6) reports average functional correctness of 87.6% versus 79.2% for AssertLLM, and average mutation detection of 85.6% versus 79.8%. Inference: the quoted gains are differences of 8.4 and 5.8 percentage points between the reported averages, rather than relative percentage increases.

## technique 1: modality-sensitive specification extraction

What it is. The document is segmented into blocks, each classified by modality (TEXT, TABLE, FORMULA, or DIAGRAM) and semantic category (for example, Timing Behavior, Control Logic, or Module Interface). LayoutParser supplies content type and position hints; an LLM assigns semantic labels and outputs a unified intermediate representation.

How to do it.

1. Parse the PDF with LayoutParser to obtain paragraphs, tables, diagrams, bounding boxes, and position information (Section III-B, p. 2).
2. Send each block, its layout hints, and few-shot examples to the preprocessing prompt; require modality and semantic category (Listing 1, p. 3).
3. Store `content`, `modality`, `semantic_category`, `page_number`, `bounding_box`, and `layout_hints` for each block (Section III-B, p. 3).
4. Dispatch text blocks to a schema extractor for module name, ports, directions, widths, reset behavior, and output behavior (Listing 2, p. 4).
5. OCR diagrams, classify structural versus timing diagrams, and convert structural edges to pseudocode and timing traces to natural language plus temporal operators F, G, and X (Section III-C.2 and Listing 3, p. 4).
6. Parse formulas and tables into structured expressions and records, then merge all modalities per signal or register while retaining source traceability (Section III-C and Listing 4, pp. 4–5).

The paper says: “The output of this parser ensemble is a flattened token stream composed of content blocks, each enriched with layout-derived information.” (Section III-B, p. 2). The merged `ack_out` example keeps the FSM transition, timing constraint `##[1:2] ack_out[*2]`, temporal formula, natural-language behavior, and pointers to the source section, figure, equation, and table (Listing 4, pp. 4–5).

Verus form. Inference: use the same representation for Rust APIs and specifications: retain source spans, type or protocol category, preconditions, postconditions, and timing or state-machine facts. A Verus `spec fn` can define a pure semantic predicate, while `requires` and `ensures` attach the extracted contract to a function. Generation must preserve ownership and mutation semantics that an SVA signal model does not express. Every generated contract still needs a Verus check and human review of whether the extracted intent is complete.

Failure and assumptions. Listing 2 (p. 4) instructs: “Use only the information present in the paragraph.” and “Do not invent missing fields; leave them blank or as empty lists.” The authors describe assertion generation “without RTL information” (Section II, p. 2); RTL is nevertheless used for model checking and mutation testing (Section IV-A, p. 6). Inference: extraction may invent fields or lose diagram detail despite these instructions. For VL, extraction can miss aliasing, panic, and unsafe or FFI behavior unless represented explicitly.

The authors also state: “This integrated format provides a complete and structured view of each design, making it available for the subsequent assertion generation phase.” (Section III-C.4, p. 5).

## technique 2: four-step semantic assertion synthesis

What it is. Given a structured signal specification, the generator performs Unified Semantic Decomposition, Pattern Selection, Temporal Binding, and SVA Syntax Synthesis. Retrieval augmentation injects relevant SVA and hardware literature into the prompt (Section III-D, p. 5).

How to do it. For each signal, extract a precondition, consequence, and timing window; choose implication, stability, or invariant; translate the window into SystemVerilog operators such as `##[2:4]` and `[*2]`; then assemble a clocked property with the correct implication operator (Listing 5, p. 5). The paper's example turns “read_valid must become high within 2-4 cycles and stay high for >=2 cycles” into `assert property (@(posedge clk)(read_req && !arbiter_grant) |-> ##[2:4]read_valid[*2]);` (Listing 5, p. 5).

Verus form. Inference: map decomposition to a Rust specification predicate over pre-state and post-state, or over a ghost trace for temporal behavior. Pattern selection becomes choosing a `requires`/`ensures` relation, a loop `invariant`, or a transition lemma. Temporal windows require an explicit bounded-history model; Verus does not provide SVA's `##` and `[*]` operators. Use executable state plus ghost sequence and prove each transition with `proof fn` lemmas.

Evidence. The authors evaluate three RTL designs, I2C, AES, and Openmsp430, with approximately 100–300 mutants per DUT, using SymbiYosys for model checking and Mantra for mutation injection (Section IV-A, p. 6). In Table II, AssertCoder's counts are: I2C 81/92 functionally correct (88.0%) and MDR 84.3%; AES 118/134 (88.1%) and 87.2%; Openmsp430 187/215 (86.9%) and 85.4%. Table II's Avg. row reports 147.0 generated SVAs, 128.7 functionally correct (87.6%), and 143.7 syntactically correct (97.8%). These are reported average counts and rates, not pooled counts. Inference: the reported average functional rates are not the simple means of the displayed per-design rates: those give approximately 87.7% for AssertCoder and 79.7% for AssertLLM, whereas the table reports 87.6% and 79.2%. The 8.4-point comparison therefore depends on the paper's reported Avg. row.

## technique 3: mutation-guided iterative refinement

What it is. Generated assertions are tested against injected design mutations. For assertion `a_i` and mutant `m_j`, `detect(a_i,m_j)` is one when the assertion fails on that mutant. The mutation score sums detections per assertion, the average mutation score averages those sums over assertions, and the mutation detection rate (MDR) is the fraction of mutants detected by at least one assertion (Section III-E, Equations 1–4, p. 5).

How to do it.

1. Generate an initial SVA set without mutation feedback (Section III-D, p. 5).
2. Inject bug-derived mutations into the DUT and run model checking for each assertion-mutant pair (Section III-E, p. 5).
3. Record undetected mutation conditions, including affected signal and location; provide them as `mutation_points` in the next prompt (Listing 5, p. 5).
4. Regenerate assertions through the same four-step process, then repeat model checking (Section III-E, p. 5).
5. Remove assertions with zero mutation score (Section III-E, p. 5). Recheck assertions on the unmutated DUT and manually inspect failures to distinguish real DUT bugs from semantically wrong assertions (Section III-E, pp. 5–6).

The paper defines the false positive rate (FPR) using the final assertion set and a semantic-correctness predicate; assertion failures caused by real DUT flaws are not automatically false positives (Section III-E, p. 6).

Verus form. Inference: generate Rust/Verus mutants that alter return values, branches, state transitions, or contract-relevant updates, then require each intended `ensures` or trace lemma to fail on the mutation. Keep mutation testing as external evidence; Verus proves the unmutated implementation under its specification. A mutation that survives may indicate a weak contract, missing invariant, or insufficient test oracle.

## ablation and what works

The ablation disables RAG, chain-of-thought prompting, or mutation-guided refinement. Removing CoT causes the largest drop in correctness assertion count; removing RAG has comparatively minimal impact; removing iterative refinement lowers mutation detection (Section IV-C, pp. 6–7). Inference: these findings support structured reasoning and mutation feedback in this evaluation; the ablation does not separately test multimodal extraction.

## trusted base, contradictions, and product threat

Inference: the formal evidence is bounded by the three DUTs, their specifications, generated mutation operators, SymbiYosys, Mantra, and manual semantic review. The paper does not prove that all specification intent is captured, that mutation operators represent all bugs, or that an SVA passing model checking is complete. The largest threat to agent-written verified Rust is a contract that is syntactically and mechanically valid but omits a required behavior; mutation feedback can expose some omissions, but surviving mutations and sparse mutation models leave residual risk. VL should not redo generic claims that LLM prompting can emit assertions; a useful new result would measure this workflow on Rust/Verus contracts and ownership-sensitive mutations.

## techniques for the catalog

- multimodal semantic extraction — classify document blocks and merge text, tables, diagrams, and formulas into signal-level records
- four-step assertion synthesis — decompose intent, choose a pattern, bind time, and emit formal syntax
- retrieval-augmented prompting — add curated domain passages while generating formal properties
- mutation-guided refinement — inject faults, model-check, feed undetected mutations back, and regenerate
- assertion evaluation — report syntax correctness, functional correctness, average mutation score, MDR, and FPR
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For every signal or register, its relevant content is grouped together by aggregating information from multiple modalities, including structural descriptions from text and tables, behavioral logic from diagrams, and timing constraints from formulas."): checked all paper text, quotations, reported numbers, section and page references, technique steps, author/year tag, and arXiv identifier; corrected page references, clarified RTL use, distinguished reported averages from recomputed means, and marked conclusions as inferences; did not reproduce experiments, inspect implementation code, or validate the proposed Verus adaptations.
