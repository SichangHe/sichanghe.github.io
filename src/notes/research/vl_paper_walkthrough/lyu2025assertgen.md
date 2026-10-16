# AssertGen: Enhancement of LLM-aided Assertion Generation through Cross-Layer Signal Bridging
(authored by agents unless marked 🧑)
Tag: `lyu2025assertgen`, [paper](http://arxiv.org/abs/2509.23674v1)

AssertGen generates SystemVerilog assertions from specification documents and RTL by bridging information across hierarchy levels. The abstract states, “AssertGen first extracts verification objectives from specifications using a chain-of-thought (CoT) reasoning strategy, then bridges corresponding signals between these objectives and the RTL code to construct a cross-layer signal chain, and finally generates SVAs based on the LLM” (Abstract, p. 1). Verus mappings below are inferences because this paper targets hardware assertions, not Rust.

## techniques

### incremental contextual-entity extraction with retrieval

What it is: specification PDFs are chunked and stored in a vector hub. Starting from a signal, retrieval-augmented generation (RAG) asks “What is the description of {signal}?” and extracts target entities plus external contextual entities. The method removes overlap using `E_final = E_context − (E_target ∩ E_context)` and iterates until no new entities remain (III-B, pp. 2–3).

How to do it: (1) preprocess specification chunks into a searchable collection; (2) choose an initial signal; (3) retrieve relevant chunks with the uniform query; (4) extract entities directly describing the signal; (5) extract associated external entities; (6) remove entities overlapping the target set; (7) query each remaining entity and persist retrieved chunks; (8) stop when `E_final` is empty. The paper says, “This iterative expansion continues until no new entities are produced, i.e., Efinal = ∅” (III-B, p. 3).

Inference: for Verus, apply the same expansion to API contracts, design requirements, and Rust symbols. RAG should supply context to an agent, but requirements still need explicit `requires` and `ensures`; retrieval cannot establish their truth. The paper’s entity sets and vector database do not carry over as Verus constructs.

### CoT verification-objective generation

What it is: a second LLM receives the accumulated entity descriptions and a structured prompt. It identifies behavioral descriptors, gathers signal information, and returns assertion-oriented verification objectives without changing the design (III-C, Fig. 4, p. 3). The paper’s example includes reset behavior, enable-bit behavior, and an I2C core hang-prevention objective.

How to do it: provide the target signal and retrieved specification chunks; instruct the model to identify direct and indirect behavioral descriptors; gather bit-width, functionality, interconnections, and related signals; emit a complete list of objectives; keep objectives tied to observable behavior. Inference: for Verus, emit candidate function contracts and loop invariants as structured obligations, then have an engineer or checker confirm that each obligation matches the requirement before coding.

Evidence and limit: this stage produces natural-language objectives, not machine-checked properties. Its success is evaluated indirectly by downstream SVA metrics, so the paper does not isolate objective-generation accuracy.

### recursive cross-layer signal-chain extraction

What it is: AssertGen defines a signal chain `SC(s0) = {s0, s1, …, sn}` across modules, requiring each adjacent pair to have a semantic propagation relation (III-D, p. 4). A recursive CoT prompt traces each objective’s signal through hierarchical RTL.

How to do it: (1) read the objective and target signal; (2) locate the target in RTL; (3) follow the signal into downstream modules; (4) record each semantically derived signal and its defining file; (5) repeat until the behavior reaches the relevant leaf logic. The paper’s worked response traces `ctr` to `ena` in two modules and lists the chain “ctr → ena → ena” (Fig. 5, p. 4).

Inference: for Verus, construct a dependency map from a specification field to Rust functions, struct fields, and state-machine transitions. Use it to select which functions’ contracts and invariants must be checked. A signal-chain document is auxiliary evidence; Verus does not infer semantic chains from prose.

### objective-to-code reverse bridging

What it is: a second structured stage maps objectives, signal chain, and design files to relevant Verilog segments. It explicitly asks for FSM logic, assignments, register operations, conditionals, and other code tied to each objective (III-D, Fig. 6, p. 4).

How to do it: feed `(V, SC, D)` to the mapper; for every objective, inspect the chain and files; collect all potentially relevant segments; retain a per-objective traceability mapping. Inference: for Verus, map each contract clause to function bodies, state updates, and proof lemmas, then use that map to audit coverage. Mapping is not a proof that the implementation satisfies the clause.

### constrained assertion generation

What it is: GPT-4o receives objectives, RTL segments, and signal-chain context. To address inconsistent output, prompts bind each signal as `source_module_name.signal_name` and require a unified `assert property @(posedge {source_module_name}.{signal_name})` format (III-E, p. 4). The paper states, “By adopting this format, we effectively constrain the LLM’s generation behavior to enhance the reliability of GPT-4o’s assertion outputs” (III-E, p. 4).

Inference: in Verus, constrain generated patches to compile as Rust and to place contracts on the intended function. Use `requires`, `ensures`, `assert`, and loop `invariant` clauses supported by Verus; rerun Verus after every candidate. Do not treat generated text as evidence until the verifier accepts it.

## evidence, denominators, and failures

Experiments use five open-source designs and Cadence JasperGold v21.12.002 on an Intel Xeon Gold 6148 at 2.40 GHz; all generated SVAs are used without post-processing (IV-A–B, p. 5). Table III reports FPR (SVA properties passing formal verification), COI, and proof-core percentages per design. AssertGen FPR is 84.85% for I2C, 76.92% ECG, 75.96% Pairing, 82.61% SHA3, and 81.44% PicoRV32; each denominator is the generated assertions for that design, though the paper does not print raw counts (Table III, p. 5). Its proof-core coverage is 98.35%, 23.55%, 5.32%, 60.79%, and 32.21% in the same order.

Mutation testing evaluates bug detection. AssertGen reports 31.14% on I2C, 15.35% on SHA3, 23.20% on PicoRV32, and 8.12% on ECG; Pairing is excluded because estimated runtime exceeds 120 hours (IV-E, p. 5). The exclusion and the paper’s statement that some assertions target only selected properties limit claims of broad bug detection. The paper also says timeouts after five hours are conservatively treated as passes (IV-B, p. 5), which can inflate FPR.

## evidence boundary and product implications

JasperGold proves or refutes each SVA under the supplied RTL and property; COI and proof core measure structural coverage, and mutation testing measures injected-fault detection. Trusted elements include the specification text, LLM-generated objectives, RAG retrieval, RTL model, JasperGold, and timeout policy. Inference: a Verus pipeline similarly trusts requirements, contracts, Verus, Z3, Rust compilation, and external-library specifications. VL should reuse incremental context gathering, explicit requirement-to-code traceability, and mutation-style negative tests. It should not redo RTL-specific signal-chain engineering or JasperGold benchmarks. Inference: threat to agent-written verified Rust is high for requirement omission and medium for mechanical proof failure: an agent can generate a valid but irrelevant contract, while Verus catches type and proof errors. Cross-layer maps and mutation tests can expose missing obligations, but they do not establish that the requirement itself is complete.

## techniques for the catalog

- incremental entity RAG — iteratively retrieve signal descriptions and expand contextual entities until convergence
- CoT objective extraction — turn scattered specifications into explicit verification objectives
- cross-layer signal chains — recursively trace semantic signal propagation through module hierarchy
- objective-to-code bridging — map each objective and chain to relevant implementation segments
- constrained property generation — bind names and enforce a fixed assertion format before formal checking
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
