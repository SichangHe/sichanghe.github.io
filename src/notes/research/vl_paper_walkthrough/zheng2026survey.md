# A Survey on LLM-Integrated Hardware Design Verification
(authored by agents unless marked 🧑)
Tag: `zheng2026survey`, [paper](http://arxiv.org/abs/2610.10580v1)

## scope and central warning
This survey reviews LLM use across SystemVerilog assertion (SVA) generation, stimulus/testbench generation, bug localization and repair, model checking, equivalence checking, SAT/SMT optimization, and agentic workflows. It states that “LLMs are most effective as semantic reasoning, search, and orchestration components embedded within verification-aware workflows” (Abstract, p.1). Deterministic simulators, formal engines, coverage tools, and solvers remain the evidence-producing components.

The hardware setting combines simulation with formal methods and hardware-assisted techniques. The paper says, “However, tool acceptance alone does not establish verification correctness, since assertions, tests, repairs, or proofs may satisfy available checks without faithfully capturing the complete design intent” (Abstract, p.1). This is a direct warning against equating a passing tool invocation with a correct requirement.

## technique: structured specification-to-SVA generation
What it is: convert natural-language, tables, waveforms, diagrams, formulas, and RTL into intermediate representations before producing temporal assertions. SVA properties encode protocol rules, request/response relations, ordering, and reset behavior. The paper notes that “A useful assertion must be syntactically valid, semantically consistent with the intended requirement, and correctly aligned with implementation signals and cycle-level timing” (Section III.A, p.4).

How to apply it:
1. Extract requirements and verification objectives from every specification modality (Section III.B.2, p.7).
2. Convert diagrams, waveforms, tables, and formulas to structured pseudocode, formal expressions, LaTeX, or JSON (Section III.B.2, p.7).
3. map abstract behavior to implementation signals and timing; use RTL only to resolve signal details, not to replace specification intent (Section III.B, pp.6–7).
4. Generate candidate SVAs with structured prompting or task-specific agents (Table II, pp.5–6).
5. Compile and formally check them, then inspect counterexamples and coverage (Section III.B.3, p.7).

The survey gives concrete families: AssertLLM uses multimodal task decomposition and text/waveform IRs; AssertionForge uses a specification–RTL knowledge graph with retrieval; AssertCoder uses multimodal extraction plus semantic analyzers; Spec2Assertion decomposes properties with chain-of-thought and progressive regularization (Table II, pp.5–6; Section III.B.2, p.7).

Inference: a Verus analogue would parse a natural-language contract into Rust types and `requires`/`ensures`, then map state relations to `invariant` statements and `assert` checks. Verus cannot directly carry over SVA cycle semantics or HDL signal timing; the engineer must define those as explicit state transitions. The survey does not evaluate Verus, so this transfer is inference.

## technique: retrieval and verifier-guided refinement
What it is: retrieve general SVA knowledge and design-specific specifications, RTL relationships, plans, or debug records at inference time, then iteratively regenerate using compiler, simulator, or formal-tool diagnostics. The survey explains, “Retrieval-Augmented Generation (RAG) supplements model knowledge with task-specific information retrieved at inference time” (Section II.C, p.4).

How to apply it:
1. Index specifications, RTL, interfaces, protocol documents, assertions, plans, and prior debug logs (Section II.C, p.4).
2. Retrieve general assertion idioms and design-specific signal/behavior context separately; design-specific retrieval determines what behavior should be expressed (Section III.B.3, p.7).
3. Generate an assertion, invoke the checker, and feed syntax errors, counterexamples, proof results, or coverage back to the model (Section III.B.3, p.7).
4. Repeat for a bounded number of rounds; retain intermediate requirements, signal maps, and candidate assertions for review (Section III.B.4, p.7).
5. Evaluate semantic correctness, non-vacuity, coverage, and realistic fault detection, not only compilation or proof success (Section III.B.5, p.7).

NL2SVA uses model-checking feedback with human-guided refinement; ChiRAAG interprets simulation errors and regenerates failed assertions; ProofLoop uses AST retrieval and JasperGold in three proof-refinement rounds (Table II, pp.5–6; Section III.B.3, p.7). The paper cautions that “a property that successfully compiles or is proven against the RTL may still encode the wrong requirement” (Section III.B.3, p.7).

Inference: in Verus, retrieve relevant Rust definitions and existing lemmas, run `verus`, feed diagnostic locations and failed proof obligations back to a repair step, and review whether the postcondition still states the intended behavior. A successful proof is evidence only for the encoded contract under Verus’s assumptions.

## technique: agentic decomposition and search
What it is: assign specification analysis, signal mapping, assertion generation, tool execution, debugging, and coverage closure to specialized components. ChatSVA, SuperSAGA, SVAgent, Saarthi, and knowledge-graph agents exemplify this progression (Section III.B.4, p.7; Table II, pp.5–6).

How to apply it:
1. Create explicit intermediate artifacts: extracted requirements, verification plan, signal map, and candidate properties (Section III.B.4, p.7).
2. Route each artifact to a specialist role and expose only bounded tool interfaces.
3. Invoke formal tools and counterexample-guided repair; escalate unresolved loops to a human (Table II, pp.5–6).
4. Validate intermediate artifacts independently because final-output checking can miss propagated semantic errors (Section III.B.4, p.7).

SANGAM adds Monte Carlo Tree Self-Refine to search alternative reasoning trajectories. The survey warns that optimizing tool success can select assertions that are “provable but weak, vacuous, or semantically misaligned” (Section III.B.3, p.7). Inference: a Verus agent hierarchy should preserve contract and invariant review between generation and proof repair; blindly optimizing proof success risks weakening specifications.

## technique: training-time adaptation
Fine-tuning teaches SVA syntax, temporal semantics, and recurring property patterns, but usually targets subtasks rather than full specification-to-property generation (Section III.C, p.8). Aditi and Hsiao use back-translation consistency; AssertCraft combines curated/synthetic data with iterative refinement; VERT fine-tunes DeepSeek Coder and LLaMA 3.1 on open-source SVA data (Section III.C.1–3, pp.8–9). VERT shows specialized smaller models can outperform a larger general model on evaluated SVA tasks, but snippet provenance limits full-specification generalization (Section III.C.3, p.9).

Inference: Verus model adaptation could teach recurring proof idioms, but generated proofs still require the verifier and contract review. Training data must preserve the specification context rather than only local proof snippets.

## evidence, trust, and limits
The survey organizes evidence by method, benchmark, and evaluation criterion, including syntax, proof, simulation, mutation, coverage, and fault detection (Tables II–III, pp.5–6). Mutation testing is stronger than syntax/proof alone because it tests injected-fault detection, but the paper says mutation score “does not by itself establish that an assertion faithfully represents the specification” (Section III.B.3, p.7). It also identifies tradeoffs: richer reasoning and multi-agent pipelines add latency, tool calls, cost, and intermediate error opportunities (Section III.B.5, p.7).

## techniques for the catalog
- structured specification grounding — convert heterogeneous requirements into explicit intermediate representations before generating properties
- retrieval and feedback refinement — retrieve design context and iteratively repair with compiler, simulation, formal, counterexample, and coverage feedback
- agentic verification decomposition — separate analysis, generation, checking, debugging, and escalation with independently validated artifacts
- training plus deterministic checking — adapt models to domain idioms while retaining formal tools as the correctness evidence
