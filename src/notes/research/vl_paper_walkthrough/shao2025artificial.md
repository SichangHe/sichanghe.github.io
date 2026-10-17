# Artificial Intelligence in Software Engineering: Integration and Key Challenges
(authored by agents unless marked 🧑)
Tag: `shao2025artificial`, [paper](https://doi.org/10.5121/csit.2025.150412)

## purpose and result
Shao, Shibasaki, and Shibasaki survey how large-language-model AI can support requirements, design, coding, testing, deployment, system-level agents, knowledge management, and project management. The abstract lists “the need to ensure the accuracy and reliability of AI-generated code, complex task decomposition and verification, multi-agent collaboration, external knowledge utilization, and AI integration within project management workflows.” (Abstract, p. 123). This is a position and integration survey; it reports no new formal-verification implementation or controlled benchmark.

## technique 1: requirements extraction and clarification
Use this at project start. AI analyzes customer requirement documents, extracts functional requirements, performance specifications, and interface preferences, and converts them into a structured requirements list (Section 3, p. 126). It also identifies ambiguous statements and prompts developers to clarify or refine them (p. 126).

Inference: the paper gives two bullets, not an ordered procedure; read as steps: provide requirement documents; extract and organize requirement elements; produce a structured list; flag vague statements; obtain human clarification. Inference: represent requirements as Rust data and use Verus predicates for consistency and implication checks before code generation. Natural-language extraction and the human interpretation remain trusted; the paper supplies no proof procedure.

## technique 2: staged development-agent workflow
Use this to organize AI assistance across a software lifecycle. The paper's four stages are requirements, system design, module code/document generation, and deployment/testing (Figure 1 and Section 3, pp. 125–127). In design, AI proposes architectures, predicts workload bottlenecks, and assesses risks and contradictions (p. 126). In implementation, it generates function/module code, performs code review, and updates API documentation (p. 127). In deployment/testing, it generates behavioral test cases, automates deployment, and diagnoses faults from collected information (p. 127).

Inference: a Verus-based pipeline can make each stage output an explicit contract artifact: requirements become `requires`/`ensures`, module code must satisfy those contracts, and deployment accepts only proof and test artifacts. The paper's suggested code review and tests are validation aids, not formal guarantees. It warns that “programming demands extreme precision.” (Section 4, p. 128).

## technique 3: module-level correctness checklist
Inference: Use this when an agent implements a complete module rather than one isolated function. The paper lists five primary tasks of the development agent (this reading as a checklist is the inference): implement every stated requirement; handle varied inputs and boundary conditions robustly; conform to functional/design specifications including formats, resources, and error handling; optimize data structures and algorithms; and generate normal, boundary, exceptional, and error test cases (Section 4.1, pp. 128–129).

Inference: map the first three properties to Verus contracts and invariants, optimization to separately measured complexity bounds, and the fifth to executable regression tests plus proof obligations. Do not claim that generated tests establish completeness. The survey reports a cited Pass@1 result of 98.2% for GPT-4o with a language-model debugger, but this is a result from reference [11], not an experiment in this paper (Section 4.1, p. 129).

## technique 4: core-agent decomposition and validation
Use this for system-level tasks. The core agent breaks a complex task into multiple subtasks (the Minecraft example it cites decomposes "obtaining diamond" into dependent subtasks), validates each subtask's result, designs module tests, and performs integration testing (Section 4.2, p. 129). It also promotes modular architecture, assigns components to development agents, monitors runtime status, diagnoses bottlenecks, and maintains a feedback loop for iterative improvement (p. 129). Multi-agent collaboration requires explicit workflows, protocols, and interfaces; MetaGPT is cited as an example using roles and standardized communication protocols (p. 130).

Inference: in Verus, encode a dependency DAG and prove that a subtask cannot be consumed before its predecessor's postcondition is established. Use loop `invariant` annotations for scheduler state and `ensures` for module results; protocol messages need typed enums and validity predicates. LLM decomposition, scheduling choices, and runtime monitoring remain trusted unless separately checked.

## technique 5: retrieval-augmented knowledge management
Use RAG when external knowledge changes frequently. The knowledge agent retrieves relevant records from an external repository before generation, allowing updates without full model retraining; fine-tuning instead trains on a domain dataset and requires substantial labeled data and retraining when knowledge changes (Section 4.3, p. 130). Separately, the knowledge management agent needs data manipulation capabilities over external data: creation, deletion, modification, and retrieval (p. 130). Note the paper numbers both the knowledge-management and the project-management sections 4.3.

Inference: Verus can specify authorization, record-identity, and version invariants for a retrieval index and prove that returned records satisfy a query predicate. It cannot prove that retrieved text is truthful or that an LLM uses it correctly. The paper gives no formal evidence for either RAG accuracy or fine-tuning quality.

## techniques for the catalog
- requirement extraction: convert prose requirements to structured items and flag ambiguity for clarification
- lifecycle AI assistance: apply AI separately to requirements, design, module implementation, testing, deployment, and diagnosis
- module correctness checklist: require completeness, robustness, specification conformance, optimization, and broad test generation
- verified task decomposition: split system work into dependent subtasks and validate module and integration results
- retrieval-augmented knowledge: retrieve changing external records instead of retraining, with explicit data-management operations
