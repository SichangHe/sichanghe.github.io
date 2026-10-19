# AssertGen: Enhancement of LLM-aided Assertion Generation through Cross-Layer Signal Bridging
(authored by agents unless marked 🧑)
Tag: `lyu2025assertgen`, [paper](http://arxiv.org/abs/2509.23674v1)

AssertGen generates SystemVerilog assertions from specification documents and RTL by bridging information across hierarchy levels. The abstract states, “AssertGen first extracts verification objectives from specifications using a chain-of-thought (CoT) reasoning strategy, then bridges corresponding signals between these objectives and the RTL code to construct a cross-layer signal chain, and finally generates SVAs based on the LLM.” (Abstract, p. 1). Inference: the Verus mappings below adapt a hardware-assertion method to Rust.

## techniques

### incremental contextual-entity extraction with retrieval

What it is: specification text is preprocessed into chunks for retrieval from a vector database. Starting from a signal, retrieval-augmented generation (RAG) asks “What is the description of {signal}?” and extracts target entities plus external contextual entities. The method removes overlap using `E_final = E_context − (E_target ∩ E_context)` and iterates until no new entities remain (III-B, pp. 2–3).

How to do it: (1) preprocess specification chunks into a searchable collection; (2) arbitrarily choose an initial signal from the specification at the first invocation; (3) retrieve relevant chunks with the uniform query; (4) extract entities directly describing the signal; (5) extract associated external entities; (6) remove entities overlapping the target set; (7) query each remaining entity and persist retrieved chunks; (8) stop when `E_final` is empty. The paper says, “This iterative expansion continues until no new entities are produced, i.e., Efinal = ∅, marking the convergence of the entity set.” (III-B, p. 3).

Inference: for Verus, apply the same expansion to API contracts, design requirements, and Rust symbols. RAG should supply context to an agent, but requirements still need explicit `requires` and `ensures`; retrieval cannot establish their truth. The paper’s entity sets and vector database do not carry over as Verus constructs.

### CoT verification-objective generation

What it is: a second LLM receives the accumulated entity descriptions and a structured prompt. It identifies behavioral descriptors, gathers signal information, and returns assertion-oriented verification objectives without changing the design (III-C, Fig. 4, p. 3). The paper’s example includes reset behavior, enable-bit behavior, and an I2C core hang-prevention objective.

How to do it: provide the target signal and retrieved specification chunks; instruct the model to identify direct and indirect behavioral descriptors; gather bit-width, functionality, interconnections, and related signals; return the final list of assertion-based objectives without modifying the design. Inference: for Verus, emit candidate function contracts and loop invariants as structured obligations, then have an engineer or checker confirm that each obligation matches the requirement before coding.

Fig. 4 shows natural-language objectives. Inference: their accuracy is evaluated indirectly through downstream SVA metrics; the experiments do not isolate objective-generation accuracy.

### recursive cross-layer signal-chain extraction

What it is: AssertGen defines a signal chain `SC(s0) = {s0, s1, …, sn}` across modules, requiring each adjacent pair to have a semantic propagation relation (III-D, p. 4). A recursive CoT prompt traces each objective’s signal through hierarchical RTL.

How to do it: (1) read the objective and target signal; (2) identify the highest-level module where the objective’s signal appears; (3) recursively trace signals across modules, requiring each signal to be semantically derived from its predecessor; (4) record the signals and their locations. Fig. 5 lists `ctr` in `i2c_master_top.v` and `ena` in both `i2c_master_byte_ctrl.v` and `i2c_master_bit_ctrl.v` (p. 4). The paper does not specify a leaf-logic stopping rule.

Inference: for Verus, construct a dependency map from a specification field to Rust functions, struct fields, and state-machine transitions. Use it to select which functions’ contracts and invariants must be checked. A signal-chain document is auxiliary evidence; Verus does not infer semantic chains from prose.

### objective-to-code reverse bridging

What it is: a second structured stage maps objectives, signal chain, and design files to relevant Verilog segments. It explicitly asks for FSM logic, assignments, register operations, conditionals, and other code tied to each objective (III-D, Fig. 6, p. 4).

How to do it: feed `(V, SC, D)` to the mapper; for every objective, inspect the chain and files; collect all potentially relevant segments; retain a per-objective traceability mapping. Inference: for Verus, map each contract clause to function bodies, state updates, and proof lemmas, then use that map to audit coverage. Mapping is not a proof that the implementation satisfies the clause.

### constrained assertion generation

What it is: GPT-4o receives objectives, RTL segments, and signal-chain context. To address inconsistent output, prompts bind each signal as `source_module_name.signal_name` and require a unified `assert property @(posedge {source_module_name}.{signal_name})` format (III-E, p. 4). The paper states, “By adopting this format, we effectively constrain the LLM’s generation behavior to enhance the reliability of GPT-4o’s assertion outputs.” (III-E, p. 4).

Inference: in Verus, constrain generated patches to compile as Rust and to place contracts on the intended function. Use `requires`, `ensures`, `assert`, and loop `invariant` clauses supported by Verus; rerun Verus after every candidate. Do not treat generated text as evidence until the verifier accepts it.

## evidence, denominators, and failures

Experiments use five open-source designs and Cadence JasperGold v21.12.002 on an Intel Xeon Gold 6148 at 2.40 GHz; all generated SVAs are used without post-processing (IV-A–B, p. 5). Table III (p. 6) reports FPR (the rate of SVAs passing formal verification), COI, and proof-core percentages per design. AssertGen FPR is 84.85% for I2C, 76.92% ECG, 75.96% Pairing, 82.61% SHA3, and 81.44% PicoRV32. Its proof-core coverage is 98.35%, 23.55%, 5.32%, 60.79%, and 32.21% in the same order (Table III, p. 6). Inference: FPR uses the generated SVAs for each framework and design as its denominator; raw assertion counts are not reported.

Mutation testing evaluates bug detection. AssertGen reports 31.14% on I2C, 15.35% on SHA3, 23.20% on PicoRV32, and 8.12% on ECG; Pairing is excluded because estimated runtime exceeds 120 hours (IV-E, pp. 5–6; Fig. 7, p. 6). Inference: the exclusion and the paper’s statement that assertions target selected properties limit claims of broad bug detection. The paper says, “In line with the methodology from [10], our protocol for determining metrics like F P R conservatively treated any proof that timed out after 5 hours as a pass.” (IV-B, p. 5). Inference: counting timeouts as passes can inflate FPR relative to the fraction of assertions actually proved. AssertGen’s FPR also falls below AssertLLM’s on Pairing: 75.96% versus 76.67% (Table III, p. 6).

## evidence boundary and product implications

Table I (p. 5) describes COI as “All logic driving a property” and proof core as “Minimal logic to prove property”; IV-E uses mutation testing to assess injected-error detection. Inference: formal checking of generated properties does not establish that they capture all intended requirements, especially when timed-out proofs count as passes. For VL, reuse incremental context gathering, requirement-to-code mappings, and mutation-style negative tests as aids to finding missing obligations. Adapt these ideas to Rust contracts and invariants rather than copying RTL signal chains. A passing Verus proof would establish a contract’s obligations under the verifier’s assumptions, not the completeness of the requirements.

## techniques for the catalog

- incremental entity RAG — iteratively retrieve signal descriptions and expand contextual entities until convergence
- CoT objective extraction — turn scattered specifications into explicit verification objectives
- cross-layer signal chains — recursively trace semantic signal propagation through module hierarchy
- objective-to-code bridging — map each objective and chain to relevant implementation segments
- constrained property generation — bind names and enforce a fixed assertion format before formal checking
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This approach incrementally bridges each signal in a verification intent to its definition in the RTL hierarchy."): checked quotations, numerical results, section and page references, technique steps, tag, and arXiv identifier; corrected result-page references, completed quotations, removed an unsupported signal-chain stopping rule and unsupported risk rankings, and marked interpretations as inferences; did not reproduce experiments, inspect implementation code, or independently validate Verus adaptations.
