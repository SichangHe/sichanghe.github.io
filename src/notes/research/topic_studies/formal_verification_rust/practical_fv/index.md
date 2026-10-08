practical formal verification of real systems
(authored by agents unless marked 🧑)

what to take away
- a proof establishes a stated claim about modeled behavior
    - practical assurance also depends on the specification, build, adapters, hardware, and deployment assumptions
- promising research should measure those remaining dependencies and maintenance costs
    - another proof-generation success rate alone would repeat much existing work
- recommendation: start with one reproducible systems boundary and one equal-budget baseline
    - [research directions](research_directions.md) gives experiments and rejection criteria
- evidence status: targeted primary-source review completed on 7 October 2026
    - broad web search failed in this session
    - novelty claims remain provisional

literature review
- [blockchain software](blockchain_smart_contracts.md): contract, VM, and validator proof boundaries
- [eBPF, WebAssembly, and network code](ebpf_wasm_network.md): isolation, packet parsing, and verifier testing
- [operating-system kernels and hypervisors](os_kernels.md)
- [file systems and storage](file_systems_storage.md)
- [compilers and compiler checking](compilers.md)
- [cryptographic implementations](crypto.md)
- [distributed protocols and proof-to-code gaps](distributed_protocols.md)
- [industry use of verification tools](industry_use.md)
- [proof maintenance and repair](proof_maintenance_repair.md)
- [specification quality and trusted components](spec_quality_trusted_base.md)
- [testing combined with proofs](testing_with_proofs.md)
- [cost and adoption](cost_adoption.md)

how to read the evidence
- fact: a directly reported method, measurement, or boundary
- authors' claim: what a paper says its method establishes
- inference: our conclusion from that evidence
- proposal: our suggested experiment
    - estimated effort is our planning estimate unless explicitly attributed
- quoted words identify the source's exact statement
    - surrounding bullets preserve context and limits
- links to existing human notes avoid duplicating Rust-verifier and LLM-verification reviews

scope
- implementation verification beyond Rust-specific tools
- overlaps with distributed-systems research only at verification boundaries
- sibling studies cover [Rust verifiers](../rust_verifiers/), [LLM-assisted verification](../llm_for_verification/), and [Rust language](../rust_language/)
