Rust language and ecosystem, outside program verifiers
(authored by agents unless marked 🧑)

literature reviews and proposed research on Rust itself

- started 2026-10-07
- audience: a systems researcher choosing a research problem
- program verifiers are covered in the sibling folders
- proposed contributions are hypotheses
  - novelty requires checking the closest competing work
  - proposed experiments have not been run

- [the rules of unsafe Rust: Miri, Stacked Borrows, Tree Borrows, RustBelt](unsafe_soundness_models.md)
- [tools that find bugs in Rust without proofs: analyzers, fuzzers, sanitizers](bug_finding_tools.md)
- [what bugs real Rust code has and how people use Rust](empirical_bug_studies.md)
- [async and concurrency bugs](async_concurrency_bugs.md)
- [Rust in kernels and infrastructure, and what was measured](kernels_infrastructure.md)
- [translating C and C++ to Rust, including with LLMs](c_to_rust_translation.md)
- [LLMs writing and repairing ordinary Rust](llms_writing_rust.md)
- [supply chain and security of the crate ecosystem](supply_chain_security.md)
- [compile time and toolchain research](compile_time_toolchain.md)
- [seamless Rust setup: rebuilds, live debugging, task inspection, and small artifacts](https://github.com/SichangHe/seamless_rust_setup)

reading guide

- start with [research directions](research_directions.md) for cross-topic choices
- [collected papers](collected_papers.md) records local PDFs and source provenance
- follow the topic reviews for evidence, methods, and competing work
- read the [seamless Rust setup](https://github.com/SichangHe/seamless_rust_setup) pointer for the separately owned engineering effort

evidence limits

- source retrieval date: 2026-10-07
- numerical results are source reports unless explicitly reproduced
- primary papers, project documentation, and deployment reports carry different evidence
- web search failed during this review
  - primary pages and papers were retrieved directly
  - inaccessible full texts and unresolved novelty are marked in the reviews
