# Towards Reliable AI-Assisted Analog Design: Template-Constrained LLM Agents for SAR ADC Generation
(authored by agents unless marked 🧑)
Tag: `kochar2026reliable`, [paper](https://arxiv.org/abs/2607.14165)

## what is proved or measured
The paper presents ATLAS, an agentic flow for generating schematic-level successive-approximation-register (SAR) ADCs. It measures whether generated circuits satisfy electrical targets in Cadence Spectre. The central claim is that grounding, templates, rule checks, and simulation feedback reduce failures seen with direct prompting. The abstract states: “Instead, we propose an end-to-end, multi-step LLM agentic framework ATLAS, capable of generating a functional Successive Approximation Register (SAR) Analog-to-Digital Converter (ADC) that successfully passes simulation validation.” (Abstract, p. 1)

Inference: this is an engineering validation workflow rather than a formal proof of circuit correctness. The trusted base includes Cadence Spectre, the human expert who curates templates and rectifies the testbench, the heuristic checker, the optimizer, and the LLM implementations. The paper explicitly says the experiments are schematic-based and omit layout (Sec. 4, p. 4).

## technique: ground generation with retrieved expert knowledge
Use this when an LLM must synthesize a component in a domain with costly physical constraints. The method has two paper-defined steps (Sec. 4.1, p. 4):

1. Build a database of open scientific papers and circuit metrics; a human filters entries for SAR ADCs. Ask an LLM to summarize each filtered paper's circuit findings. The paper says: “Overall, this aggregation of expert information serves as the main source of expert-grounded knowledge for the next steps in ATLAS.” (Sec. 4.1.1, p. 4)
2. Given user specifications, retrieve the top k similar circuits by metric distance. Their summaries and the target specs are supplied to a Planner LLM, which produces a component-level SAR plan. The experimental retriever is k-nearest neighbors with Euclidean distance in min-max normalized features and k=5 (Sec. 5.1, p. 5).

Verus form (Inference): represent each retrieved design as a Rust record with numeric specifications and a `spec fn` distance; prove that the selected result has no larger distance than every database candidate using `ensures` and a loop invariant. Retrieval itself is ordinary runtime Rust; the proof establishes selection, not analog quality. The paper's RAG plan does not carry over as a Verus primitive.

Evidence is the four-design experiment: one 8-bit design on GPDK-45nm, then transfers to TSMC 65nm, a 4-bit input, and a 10-bit input (Introduction, p. 2; Sec. 6, pp. 6–7). The denominator is four generated ADCs, but the paper gives detailed target/achieved metrics for the main 8-bit case only. Assumptions include representative open papers and correct human filtering; no ablation isolates retrieval from the other stages.

## technique: checker-in-the-loop grounded zero-shot generation
Use this when templates are insufficient and a model must write a component from scratch. Prompt a Generator LLM with the retrieved knowledge, target specs, and component information. Run a rule checker for parameter mismatches across connections and singular-node warnings. Feed violations back to the Generator, update the netlist, and repeat for a fixed number of iterations (Sec. 4.2.1, p. 5). The paper states: “The Generator then updates the netlist based on the feedback provided from the rule-based verification engine, and the loop continues for a fixed number of iterations.” (Sec. 4.2.1, p. 5)

Verus form (Inference): parse generated netlist data into a typed Rust representation, make checker predicates `spec fn`s, and prove a `proof fn` that a repaired netlist satisfies structural predicates. Keep parser and simulator behind explicit trusted boundaries; Verus cannot prove SPICE's analog equations from these predicates. A loop invariant can state that each iteration preserves well-formed connections; an iteration bound is a normal integer precondition.

Failure: the authors show direct prompts produce shorted gates, wrong terminals, missing connections, and cross-coupling errors (Sec. 3, pp. 3–4). Rule heuristics detect only listed structural violations, so physical behavior still requires simulation.

## technique: template-constrained generation with fallback
Use this as the reliable fallback when open generation fails. Curate comparator, SAR-logic, and capacitor-DAC templates, each with a textual summary and pros/cons. A Selector LLM receives templates plus grounded knowledge and chooses one matching the input; it may make minor edits. The paper reports: “The meta-information about the templates proves crucial for the selection, especially for complex circuits where it is difficult for the LLM to directly understand the code.” (Sec. 4.2.2, p. 5)

Verus form (Inference): model each template as a fixed Rust constructor whose postconditions establish connection and parameter invariants. Prove selector choice by a finite case split over an enum; permit edits only through functions whose `requires` constrain legal node and parameter changes. Generated SPICE text remains an external artifact, so the proof covers the structural model that the serializer is assumed to preserve.

## technique: integration, sizing, simulation, and debugging loop
After component generation, an Integrator LLM connects components and adds high-level gates. A Bit-Modifier adjusts a template to the requested bit count. A Testbench Creator modifies a grounded testbench template. Simulation errors go to a Debugger LLM, and the netlist/testbench loop repeats until simulation completes without errors (Sec. 4.2.3, p. 5). This is a concrete execution gate, not a proof of intended behavior.

Stage 3 extracts shared transistor and capacitor parameters, writes an optimization script, and calls multi-objective Bayesian optimization; returned logs update ranges and parameters for several rounds (Sec. 4.3, p. 5). The main experiment used GPT-4o, Spectre on GPDK-45nm, and Sobol-initialized Gaussian-process BoTorch optimization (Sec. 5.1, p. 5). Table 1's 8-bit target versus achieved values are ENOB 7.5→7.59, SINAD 45→47.5 dB, SFDR 50→55.6 dB, THD −50→−51.5 dB, and power 8→6 µW; denominator is one ADC in one 45-nm setting. The paper reports that the 10-bit bit-modified circuit misses its target while reaching close to 9 ENOB (Sec. 6, p. 7), so generalization is partial.

Verus form (Inference): prove only parameter-range and structural invariants around the optimizer interface; treat Bayesian optimization and Spectre as trusted external functions and record their returned metrics. A postcondition can require reported power and ENOB fields to be internally consistent, but cannot establish transistor physics without a formal circuit model.

## what VL should reuse and threat
Inference: VeruLaw can reuse the staged architecture: retrieve verified specification patterns, select constrained Rust templates, run compile-time/proof checks, then execute only artifacts whose proof certificates pass. The paper's explicit checker and simulation feedback are analogous to Verus diagnostics and test execution. It does not provide a method for proving generated Rust semantics, memory safety, or refinement, so VL must supply those proofs and trusted-base accounting. Existing template and verifier studies should provide the Rust proof details; redoing the analog-specific ADC workflow would not help VL. Product threat is medium: unconstrained agent output can be structurally invalid, while a template-plus-proof gate can reject it, but the paper shows that external simulation and human testbench correction remain trusted.

## techniques for the catalog
- retrieval-grounded planning: select similar expert designs and summarize them before planning generation
- checker-in-the-loop repair: iterate generation using rule violations as feedback
- template-constrained fallback: choose and minimally edit curated component templates
- staged integration and simulation: connect components, size parameters, simulate, and debug until execution succeeds
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
