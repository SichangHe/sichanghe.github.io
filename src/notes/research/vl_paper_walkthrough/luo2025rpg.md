# RPG: A Repository Planning Graph for Unified and Scalable Codebase Generation
(authored by agents unless marked 🧑)
Tag: `luo2025rpg`, [paper](https://arxiv.org/abs/2509.16198)

RPG replaces free-form planning text with a persistent graph connecting functionality, files, data flows, and functions. The paper states: “RPG encodes functional goals and designs in a single graph: nodes capture hierarchical capabilities with files, classes, and functions, while edges specify semantic relations and data flows.” (§1, p. 2) ZeroRepo builds the graph, then generates code in graph order with tests. RepoCraft contains six paraphrased real projects and 1,052 tasks. With o3-mini, ZeroRepo reached 81.5% functional coverage and 69.7% test pass rate; Claude Code reached 54.2% and 33.9% respectively (Table 2, p. 7). Coverage counts reference categories; pass rate counts tasks with successful adapted tests (Appendix E.3.1, p. 44). Inference: neither percentage measures formal proof coverage.

## technique: repository planning graph

Inference: Use RPG when a project has many modules and dependencies that natural-language plans lose over long horizons. Nodes have dual meaning: high-level capability roots, file-level intermediate nodes, and function/class leaves. Edges encode hierarchy, inter-module data flow, and intra-module ordering (§3.1, pp. 3–4). The abstract says: “By replacing free-form natural language with an explicit blueprint, RPG enables consistent long-horizon planning for repository generation.” (abstract, p. 1) The abstract also states: “The process requires planning at two levels: deciding what features and modules to build (proposal stage) and defining their implementation details (implementation stage).” (abstract, p. 1)

Steps:

1. Select and refactor capabilities into a hierarchical functionality graph (§3.2, p. 4)
2. Attach folders to root nodes and files to intermediate nodes (§3.3.1, pp. 4–5)
3. Add typed input–output edges between modules and ordering edges within modules (§3.3.2, p. 5)
4. Abstract recurring interfaces as shared data structures or base classes (§3.3.2, p. 5)
5. Assign leaf capabilities to concrete functions or classes (§3.3.2, p. 5)

Inference: In Verus, a graph node can correspond to a Rust module, executable function, or proof module; edges can carry contract dependencies and refinement obligations. A proof-oriented build should reject a node until its `requires`/`ensures` contracts and dependent lemmas are available. This is an inference: RPG itself does not model Rust ownership or Verus proofs.

## technique: explore–exploit proposal construction

Inference: Use this when a specification may omit relevant capabilities. ZeroRepo uses the EpiCoder Feature Tree as a structured knowledge base, described as “an ontology of 1.5M software capabilities” (§3.2, p. 4). Table 7 (p. 15) lists seven level counts totaling 784,524. Inference: this conflicts with the stated ontology size. Each iteration retrieves top-k paths aligned with the repository description, samples unvisited regions, and asks an LLM to propose missing features. The LLM filters candidates and checks batches before inserting accepted paths. Finally, it extracts feature groups, merges or moves related branches, and refines names and hierarchy into cohesive modules (Appendix B.1, Algorithms 1–2, pp. 14–15). This combines both search strategies within iterations rather than alternating them.

## technique: graph-guided generation and localization

Inference: Use this when implementing or repairing one part of a large repository. ZeroRepo traverses RPG in topological order. At each leaf it derives tests from the specification, implements the function/class, and revises failures until tests pass or the iteration limit is reached. The paper states: “Only functions that pass all tests are committed, enabling incremental expansion while preserving stability.” (§4, p. 5) For repairs, it localizes before editing; localization tools support functionality fuzzy search, interface-body retrieval, and dependency exploration without prescribing a fixed order for those tools (§4, p. 5; Appendix D.1, pp. 33–34).

Validation is staged: unit tests for each component, regression tests when a component changes, and integration tests for subgraph data flows and contracts. Five-round majority voting attributes failures to implementation, test, or environment issues. Implementation errors return for code repair; test/environment errors allow up to 20 remediation attempts. Each function allows up to eight debugging iterations with 20 localization attempts (§4, p. 5; §5.3, p. 7).

Inference: Replace test-only acceptance with Verus verification at each leaf, then run executable tests. Keep graph edges for proof dependencies and use a topological order that verifies foundational lemmas before clients. Runtime tests remain complementary evidence; they do not establish universal Rust correctness.

## technique: benchmark and evidence discipline

RepoCraft selects scikit-learn, pandas, sympy, statsmodels, requests, and django, paraphrases names/descriptions to reduce pretraining leakage, extracts non-trivial tests, and evaluates localization, semantic validation, and execution testing (§5.1, pp. 6–7). Coverage is the fraction of documented functional categories represented; pass rate is the fraction of tasks whose adapted ground-truth tests pass; voting rate is the fraction of tasks where the evaluator confirms algorithm presence (§5.1.2, p. 6; Appendix E.3.1, p. 44). The detailed evaluation retries localization and five-vote validation up to three times before adapting and executing reference tests (Appendix E.3, pp. 43–44). Section 5.1.3 describes semantic validation as “applying majority-vote checks over two rounds” (p. 7); it does not explain how this relates to the detailed procedure.

ZeroRepo with o3-mini averaged 271.5 files, 23,977 LOC, and 260,761 tokens; with Qwen3-Coder it averaged 389 files, 36,941 LOC, and 445,512 tokens (Table 2, p. 7). Inference: larger repositories do not establish correctness. Human gold projects scored 81.0% pass and 92.0% voting rate under the same harness (Table 2, p. 7). The authors describe this as “establishing the ceiling under our test harness” (§6, p. 8). Inference: these scores calibrate the evaluation pipeline; they do not establish a mathematical upper bound or formal correctness.

Graph-guided localization reduced mean steps from 13.3 to 6.2 for integration testing, 10.8 to 6.8 for incremental development, and 8.5 to 5.8 for debugging on MLKit-Py (Table 4, p. 9). The EpiCoder Feature Tree ablation reached 87.2% coverage without the tree at iteration 30, versus 95.7% with it (Table 6, p. 10). The EFT-free run reached 97.9% at iteration 40; the authors state: “Removing EFT introduces a temporal delay rather than a performance ceiling” (§8, p. 10). The same section reports linear fits R²=0.98 and 0.97 for LOC growth without and with the tree. These are measured results on MLKit-Py with o3-mini, not guarantees for other repositories.

## techniques for the catalog

- repository planning graph — encode capabilities, files, functions, interfaces, and data flows as a persistent dependency graph
- explore–exploit capability planning — combine retrieval of aligned ontology paths, exploration of unvisited capabilities, and missing-feature proposals, then refactor by goal alignment
- graph-guided generation — traverse dependencies topologically, generate leaf code with tests, and commit only passing components
- graph-guided localization — use functionality search, repository code views, and dependency exploration before edits
- staged test validation — combine unit, regression, integration, and majority-vote diagnosis across graph subtrees
