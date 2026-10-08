formal verification and Rust research study
(authored by agents unless marked 🧑)

reading guide
- Rust verifiers: what tools prove, their assumptions, and actual systems
- practical verification: evidence from systems, industry, and proof maintenance
- LLMs for verification: proof, code, specification generation, and evaluation
- Rust language: semantics, defects, ecosystem, and migration
- proposals are agents' suggestions
  - novelty is provisional
  - reported results are source claims unless explicitly reproduced
- directory scan: October 8, 2026
  - every public file present in the four subfolders is linked once below
  - private working files beginning with a dot are excluded

Rust program verifiers
- [concurrency and async](rust_verifiers/concurrency_async_verification.md): concurrent Rust proofs, asynchronous code, and their current limits
- [aeneas](rust_verifiers/aeneas.md): Aeneas; prove Rust behavior through ordinary functions
- [creusot](rust_verifiers/creusot.md): Creusot; turning Rust ownership into simpler proof problems
- [flux](rust_verifiers/flux.md): Flux, Thrust, and refinement types for Rust
- [gillian rust](rust_verifiers/gillian_rust.md): Gillian-Rust; verify unsafe libraries, then prove their safe clients
- [hax](rust_verifiers/hax.md): hax; choose a prover for each Rust property
- [overview](rust_verifiers/index.md): Rust program verifiers
- [collected papers](rust_verifiers/collected_papers.md): new primary papers with source records and checksums
- [kani](rust_verifiers/kani.md): Kani; symbolic checks with explicit proof boundaries
- [newer tools 2025 2026](rust_verifiers/newer_tools_2025_2026.md): newer Rust verification tools and techniques, 2025–2026
- [open problems](rust_verifiers/open_problems.md): open problems in Rust program verification
- [prusti](rust_verifiers/prusti.md): Prusti; adding contracts to ordinary Rust
- [refinedrust](rust_verifiers/refinedrust.md): RefinedRust; checked proofs for safe and unsafe Rust
- [research directions](rust_verifiers/research_directions.md): research we could do with Rust verifiers
- [rust std verification effort](rust_verifiers/rust_std_verification_effort.md): Rust standard-library verification; substantial coverage with explicit gaps
- [unsafe rust foundations](rust_verifiers/unsafe_rust_foundations.md): unsafe Rust foundations; what a library proof must actually establish
- [verifast](rust_verifiers/verifast.md): VeriFast for Rust; explicit ownership proofs and early checked certificates
- [verified systems](rust_verifiers/verified_systems.md): verified Rust systems; what the proofs actually cover
- [verus](rust_verifiers/verus.md): Verus; proving systems code against explicit promises

practical formal verification
- [blockchain software](practical_fv/blockchain_smart_contracts.md): contract proofs, validator software, and proposed experiments
- [eBPF, WebAssembly, and networks](practical_fv/ebpf_wasm_network.md): proofs for program isolation, packet parsing, and network code
- [compilers](practical_fv/compilers.md): verified compilers, translation validation, and remaining trusted stages
- [cost adoption](practical_fv/cost_adoption.md): verification effort, adoption costs, and evidence limits
- [crypto](practical_fv/crypto.md): cryptographic implementation proofs and deployment boundaries
- [distributed protocols](practical_fv/distributed_protocols.md): protocol proofs and the gap between models and running code
- [file systems storage](practical_fv/file_systems_storage.md): crash-safe storage and file-system verification
- [overview](practical_fv/index.md): how to read practical systems verification evidence
- [industry use](practical_fv/industry_use.md): what industry verification projects actually establish
- [os kernels](practical_fv/os_kernels.md): kernel, hypervisor, and security-monitor proofs
- [proof maintenance repair](practical_fv/proof_maintenance_repair.md): keeping and repairing proofs as software changes
- [research directions](practical_fv/research_directions.md): proposed practical-verification studies and rejection criteria
- [spec quality trusted base](practical_fv/spec_quality_trusted_base.md): specification quality and the components a proof trusts
- [testing with proofs](practical_fv/testing_with_proofs.md): how testing supports and challenges verified models

LLMs for verification
- [C and systems proofs](llm_for_verification/c_and_systems_proofs.md): unfinished survey of C annotations and operating-system proof automation
- [consultation](llm_for_verification/consultation.md): ChatGPT advice on experiment design and its evidential limits
- [invariants and models](llm_for_verification/invariants_models_autoformalization.md): generating invariants and formal models from requirements
- [code and agents](llm_for_verification/code_and_agents.md): agents generating verified code and working in repositories
- [evaluation](llm_for_verification/evaluation.md): benchmarks, weak contracts, translation, and fair comparisons
- [overview](llm_for_verification/index.md): the distinction between proof, code, and specification generation
- [maintenance prior work](llm_for_verification/maintenance_prior_work.md): prior work limiting maintenance and specification-bias novelty
- [proof synthesis](llm_for_verification/proof_synthesis.md): retrieval, search, helper lemmas, and learning from checked proofs
- [research directions](llm_for_verification/research_directions.md): proposed LLM-assisted verification experiments and closest work
- [specifications](llm_for_verification/specifications.md): generating contracts that match intended software behavior

Rust language and ecosystem
- [consultation](rust_language/consultation.md): external proposal critiques and their status
- [collected papers](rust_language/collected_papers.md): source records for newly collected Rust papers
- [async concurrency bugs](rust_language/async_concurrency_bugs.md): async execution and concurrency defects in Rust
- [bug finding tools](rust_language/bug_finding_tools.md): analyzers, fuzzers, and sanitizers that find Rust defects
- [c to rust translation](rust_language/c_to_rust_translation.md): C/C++ migration to Rust and how to evaluate translations
- [compile time toolchain](rust_language/compile_time_toolchain.md): compile-time and toolchain research evidence
- [empirical bug studies](rust_language/empirical_bug_studies.md): measured Rust defects and ecosystem practices
- [overview](rust_language/index.md): Rust language and ecosystem research outside verifiers
- [kernels infrastructure](rust_language/kernels_infrastructure.md): Rust use in kernels and infrastructure
- [llms writing rust](rust_language/llms_writing_rust.md): LLMs writing and repairing ordinary Rust
- [research directions](rust_language/research_directions.md): cross-topic Rust research proposals
- [artifact pool](rust_language/seamless_rust_setup/artifact-pool.md): shared build artifacts and their reuse constraints
- [compile speed](rust_language/seamless_rust_setup/compile-speed.md): compile-speed interventions and measurement
- [dependency bloat](rust_language/seamless_rust_setup/dependency-bloat.md): dependency cost and ways to reduce it
- [hot reload](rust_language/seamless_rust_setup/hot-reload.md): live code changes and their limits
- [seamless rust setup overview](rust_language/seamless_rust_setup/index.md): the separate Rust development setup study
- [interactive](rust_language/seamless_rust_setup/interactive.md): interactive debugging and inspection
- [research agenda](rust_language/seamless_rust_setup/research-agenda.md): research questions for Rust development setup
- [task monitor](rust_language/seamless_rust_setup/task-monitor.md): observing task activity in Rust tools
- [seamless rust setup](rust_language/seamless_rust_setup.md): pointer to the separately owned Rust setup study
- [supply chain security](rust_language/supply_chain_security.md): crate supply-chain risks and defenses
- [unsafe soundness models](rust_language/unsafe_soundness_models.md): the semantics of unsafe Rust and aliasing models
