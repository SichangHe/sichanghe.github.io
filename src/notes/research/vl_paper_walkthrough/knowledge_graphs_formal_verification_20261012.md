# Knowledge Graphs, the Missing Link in Agentic AI-based Formal Verification
(authored by agents unless marked 🧑)
Tag: `viswambharan2026knowledge`, [paper](https://arxiv.org/abs/2605.06434)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## identity and scope

Vaisakh Naduvodi Viswambharan, Keerthan Kopparam Radhakrishna, Deepak Narayan Gadde, and Aman Kumar, “Knowledge Graphs, the Missing Link in Agentic AI-based Formal Verification,” arXiv:2605.06434v1 (2026). The paper proposes a verification-centric knowledge graph (KG) for generating SystemVerilog assertions from natural-language requirements and RTL. It is outside Verus, but its evidence and workflow transfer to any agent that must connect specifications, code, diagnostics, and proof obligations.

## problem and threat model

Natural-language requirements are ambiguous, while important micro-architectural facts live in RTL. Treating both as loosely structured text causes semantic mismatch, syntax failures, and properties that do not describe the design. The threat is therefore not only an incorrect proof: an agent may generate a well-formed assertion about the wrong signal or requirement. The authors state that “critical micro-architectural details reside in the Register Transfer Level (RTL).” Tool feedback is another source of evidence that ordinary prompts lose; syntax diagnostics, counterexamples, and coverage reports must be connected to the requirement and design element that produced them.

## workflow and trust boundary

Build structured intermediate representations from requirements, RTL, and formal-tool feedback. Insert requirements, hierarchy, signals, assumptions, properties, diagnostics, counterexamples, and coverage into a KG with trace links. A multi-agent workflow queries the graph for context, generates assertions, and updates it after each tool run. The three loops are syntax repair from diagnostics, counterexample-guided correction through trace links, and coverage-directed property augmentation. The formal tool remains the referee; the KG is context and provenance infrastructure, not a proof engine.

## technique: trace-linked context retrieval

Study's synthesis from Sec. III-A, not the paper's numbered procedure (the paper's trace links are requirement-to-spec, property-to-requirement, property-to-coverage; links to signals and assumptions are this study's extension). Step 1 parse requirements and RTL into stable entities and relations. Step 2 map every generated property to its requirement, signals, assumptions, and hierarchy path. Step 3 store tool feedback as nodes linked to the exact property and design location. Step 4 retrieve only the subgraph relevant to the current obligation. Step 5 preserve the links after edits and repairs. Inference: this reduces the chance that an agent repairs syntax while silently changing the intended behavior. For Verus, graph nodes can represent functions, preconditions, postconditions, invariants, ghost state, lemmas, verifier diagnostics, and counterexample traces.

## technique: separate repair loops by evidence type

Do not ask one agent prompt to solve all failures. First use parser diagnostics to repair syntax and elaboration. Next use a counterexample to identify the violated assumption or missing invariant, preserving the failing execution as evidence. Finally inspect coverage to add properties for unexercised behavior. Each loop has a different objective and stopping condition. This separation makes it possible to tell whether a change fixed parsing, the counterexample, or specification completeness.

## technique: coverage-directed property augmentation

After a property passes, inspect formal coverage rather than declaring completeness. Link uncovered states, signals, or branches back to requirements and generate additional assertions. Record which additions increase coverage and which remain unresolved. The abstract reports formal coverage from 78.5% to 99.4% across seven benchmark designs, but Table II's %Formal coverage row ranges from 82.98 (TTC Counter) to 99.41 (ALU); 78.5 appears nowhere else in the paper. Convergence depends on design complexity; temporal and arithmetic reasoning remain difficult. Coverage is evidence about explored obligations, not a universal correctness guarantee.

## evidence and limitations

The evaluation covers seven designs. The abstract reports that “formal coverage ranging from 78.5% to 99.4%” was achieved across them. and reports consistently compilable assertions with low syntax-repair overhead. The authors acknowledge design dependence and difficult temporal/arithmetic reasoning. Inference, not tested by the paper: the method depends on accurate IR extraction and trace links, so a wrong parser or stale graph could amplify errors. The paper reports no run without the KG, so Table II does not isolate the KG's effect. Coverage metrics depend on the selected properties and tool semantics. The study concerns SystemVerilog assertions rather than Rust or Verus and does not establish that its KG improves theorem truth in every setting.

## relevance to VL

VL can use a provenance graph beside its proof workspace. Every specification fragment should link to the code, assumptions, proof obligation, tool diagnostic, counterexample, and coverage result that justify it. Agent prompts should retrieve this local graph instead of a flat repository window. Separate syntax, counterexample, and completeness repair loops make failures auditable and reduce accidental specification weakening.

## techniques for the catalog

- trace-linked specification context: connect requirements, code locations, assumptions, obligations, and evidence in a queryable graph
- evidence-separated repair loops: handle syntax, counterexamples, and coverage as distinct workflows
- coverage-directed specification growth: use uncovered behavior to generate and track additional obligations
- provenance-preserving retrieval: retain links across edits so repairs remain tied to original intent

## study status

Written from the full PDF and not ChatGPT-checked. Quotes were checked against extracted text.
Audited 2026-10-12 against the paper: checked the authors, venue, three loops, agent roles, the three-attempt cap, the 78.5% to 99.4% figure against Table II, the seven designs, and quotations. Changed: added the authorship line, noted that Table II's formal coverage minimum is 82.98 not 78.5, marked the five-step list and two claims as the study's own inference, and noted the absence of a no-KG baseline.
