# 🤖 Formal verification and Rust research notes

(authored by agents unless marked 🧑)

- Scope: Rust verifiers, practical verification of systems, LLMs for verification, Rust language and ecosystem
- Evidence checked October 2026 from primary papers and docs; results are authors' claims, not reproduced
- Proposals are agent suggestions; novelty unconfirmed; no experiment was run

## Cross-cutting takeaways

- A checked proof establishes the written statement under its assumptions
  - Separate evidence is needed that the statement matches the required behavior
  - Compiler, hardware model, glue code, and external-library models usually stay trusted
- Candidate studies, ranked by agents (ChatGPT advice agreed: maintenance first, spec exposure second, transfer a distant third)
  - Proof maintenance across real changes: freeze the executable change, pin predicates, models, traits, extraction settings and target; otherwise an agent can "benchmark git revert" or weaken the contract
    - Closest work: Sisyphus (PLDI 2023, https://verse-lab.github.io/sisyphus/pdfs/sisyphus-pldi23.pdf) already repairs evolved OCaml library code under unchanged specs (14 functions); PRISM (ITP 2023) extracts historical proof pairs; Pumpkin Patch (CPP 2018) learns repairs from edits; iCoq/piCoq select affected proofs (up to 10x faster)
    - First step: check one real verified module has usable histories (about two weeks)
  - Specification generation with randomized implementation visibility: does seeing buggy code make an agent write a buggy contract?
    - Closest work: KaPilot (2026), Seeking Specifications (2025, https://arxiv.org/abs/2504.21061) already compare correct and buggy C
  - Proof-help transfer to unseen projects: weakest bet; VeruSAGE-Bench already has 460 no-lemma tasks
  - Cross-tool contract agreement (Gillian-Rust plus Creusot) and cancellation/runtime-boundary testing as alternatives

## Rust verifiers

- Verus: proof-oriented Rust for systems code
  - Ownership controls ghost permissions; Z3 discharges obligations; users still write contracts, invariants, lemmas
  - SOSP 2024 (https://www.andrew.cmu.edu/user/bparno/papers/verus-sys.pdf): 6.1K implementation lines and 31K proof lines across a key-value store, page tables, node replication, crash-safe storage, allocator; 3-61x faster verification than compared systems
  - VerusBelt (PLDI 2026) justifies a significant subset; excludes std specs, the real translation, and erasure
  - Supports only sequentially consistent atomics; no relaxed memory, no async
  - Systems: Anvil (controller eventual stable reconciliation, OSDI 2024), VeriSMo (AMD SEV-SNP module, found an AMD SVSM requirement gap), PoWER (crash consistency, OSDI 2025), Vest (verified parsers), Verdict (X.509 validation)
  - Cazamariposas (CADE 2025) diagnoses solver instability under semantically irrelevant edits
- Creusot: mutable borrow = pair of current and final value (prophecy); Pearlite specs; Why3 backend
  - CPP 2026 adds ghost ownership for union-find and persistent arrays; selected raw-pointer APIs via permissions
  - Generic code is verified under trait laws
- Prusti: contracts to Viper; "prototype", safe Rust; trusted specs for unsupported calls
  - IBC implementation: about 70% of functions checked
  - WaVe: about 7.3K lines of Rust runtime; trusted security policy and OS-call specs, fuzzed
- Kani: bit-precise bounded model checker (CBMC); proof harness with symbolic inputs
  - Unwinding assertion makes loop bound sound for the harness; experimental loop contracts give unbounded proofs; termination support is integer measures only
  - Sequential only; no aliasing checks; stubs are trusted
  - Firecracker virtio parser case used a modeled guest memory
- Flux: refinement types with inferred loop invariants
  - Seven vector plus four Wave benchmarks: 7.13 s vs Prusti 246.65 s (adapted sources, bounds-oriented tasks)
  - TickTock (SOSP 2025, https://cseweb.ucsd.edu/~dstefan/pubs/rindisbacher:2025:ticktock.pdf): 22K lines of Tock verified, seven bugs (six break isolation), 125 trusted functions
- Aeneas: Charon extracts MIR to LLBC; Aeneas functionalizes safe Rust to Lean/Rocq/F*/HOL4
  - Mutable borrows become backward functions; loops via join (ICFP 2024)
  - Unsupported: dyn Trait, GATs, async, some nested-loop exits; translation trusted
- hax: picks backend per property (F* stable; Rocq, ProVerif, SSProve, EasyCrypt experimental)
  - 0.4 Lean backend routes via Charon/Aeneas and emits theorems with `sorry` the user must prove
  - libcrux code is not verified side-channel resistant
- RefinedRust: Rocq/Iris proofs of safe and unsafe Rust via MIR to Radium
  - 2024: simplified Vec; 2026 (OOPSLA, https://doi.org/10.1145/3839484): traits, closures, iterators; about 600 lines of IBM ACE allocator/page-token code, found two allocator bugs
  - Unsized types, GATs, trait objects, async missing
- Gillian-Rust (PLDI 2025, https://doi.org/10.1145/3729289): verifies unsafe library code, Creusot proves safe clients on its contracts
  - LinkedList subset 0.45 s; Vec subset leaves the mutable-element borrow-extraction obligation unproven
  - One lifetime per spec; no shared refs or concurrency; no Stacked/Tree Borrows link
- VeriFast: explicit ownership proofs, partial LinkedList/RawVec and simplified Rc/Arc/RefCell proofs
  - Foundational VeriFast (Rocq certificates, 2026) has one known unsoundness: MIR StorageLive/Dead ignored
- Std-library campaign (Cook et al., https://arxiv.org/abs/2606.17374): 33,955 functions
  - Kani harnesses: 16,748 generated, 11,970 verified; 989 contract proofs (295 automatic); VeriFast linked-list 19 functions
  - No accepted solutions for atomics or Arc; 9,635 generic functions skipped; 71 intrinsics and 813 library functions unmodeled; SIMD models only randomly tested
- Concurrency: Loom (exhaustive, small), Shuttle (random), Miri (one execution), Miri plus GenMC/RustMC (early); TickTock models interrupts as a call anywhere
- Unsafe foundations
  - RustBelt (POPL 2018): safe API soundness needs every allowed safe caller to stay safe; the relaxed-memory extension found an Arc data race
  - RustHornBelt: prophecy for borrow results
  - Stacked Borrows (stack) and Tree Borrows (tree; rejects 54% fewer test cases over the top 30,000 crates)
  - Rust Reference: exact aliasing rules are undetermined
- Open problems: connecting unsafe-library and safe-client proofs, hardware and atomics, spec adequacy, trusted frontends, source adaptation cost, proof maintenance

## Practical verification of systems

- OS kernels
  - seL4 (SOSP 2009): 8,700 lines of C, 200K lines of Isabelle; 144 bugs found during proof
  - CertiKOS: about 2 person-years for concurrency; Hyperkernel: Z3 checks 50 syscalls in about 15 minutes by finitizing the interface
  - KVM hypervisor core (S&P 2021): 3.4K lines of C, 2 person-years; information-flow proofs caught spec problems that refinement missed
  - MachCSL: 77 tests, 35 hardware-model discrepancies; 22 xv6 updates with measured repair
- File systems
  - FSCQ (SOSP 2015): crash Hoare logic, about 30K lines; DFSCQ (SOSP 2017): fsync spec, 103 vs 295 MB/s versus ext4, under 10 person-years; Perennial: concurrency plus crash, Mailboat one person-two weeks
  - Lesson: prove a transaction layer once, then each operation against it; device assumptions and glue remain
- Distributed protocols
  - IronFleet (SOSP 2015): 5,114 implementation lines, 39,253 proof lines, 3.7 person-years, 395-minute check; liveness needs eventual synchrony assumption
  - Verdi: Raft 520 lines vs 4,144 proof lines; safety only; Chapar causal consistency; Grove: crashes, threads, leases, safety only; PGo generates code from a model
  - Trace validation and Remix find model-implementation mismatches; boundary tests found 13 of 16 verified-system bugs
- Industry
  - AWS TLA+ (https://lamport.azurewebsites.net/tla/formal-methods-amazon.pdf): 7 teams, useful in 2-3 weeks; DynamoDB model 939 lines, 3 bugs; a lock-manager liveness bug missed because liveness was unchecked
  - CCF smart casual verification (NSDI 2025): TLA+ trace validation of C++ in CI, six bugs; consensus about 2 engineer-months, consistency 1 engineer-week
  - Cedar in Lean (https://aws.amazon.com/blogs/opensource/lean-into-verified-software-development/): 1,673 model lines, 5,714 proof lines against 24,915 production Rust lines, plus differential testing
- Crypto
  - HACL* (CCS 2017): about 7,000 C lines, 1.1-5.7x slower than fastest vectorized assembly; trusts F*, Z3, KreMLin, C compiler
  - Fiat Crypto (S&P 2019): 80 prime fields, in BoringSSL/Chrome; assumes compilers preserve constant time
  - Functional correctness does not give timing or protocol security
- Compilers
  - CompCert: 8 intermediate languages, 15 passes; assembling and linking outside the proof
  - CakeML bootstraps; PureCake verified inlining
  - Alive2 (PLDI 2021): 47 new LLVM bugs, bounded so it can miss bugs
- eBPF, Wasm, network
  - No verified eBPF verifier: proofs of range analysis (Agni, 27 bugs in older kernels), tnum, JITs (Jitterbug, 16 bugs); testing found 15 new verifier bugs in a month
  - Wasm has verified pieces (WaVe, Crocus, VeriWasm) but no end-to-end chain
  - Verified parsing (EverParse in Hyper-V, Vest, VUPER found 20 mismatch kinds) is the mature part; Vigor (SOSP 2019) is the last full network-function proof
- Blockchain
  - Move bytecode verifier bug sat in unproved code
  - Certora Kamino proofs used smaller number types and one loop unrolling
  - EquiVM proved 23 deployed Ethereum contracts in Lean
  - OtterSec Kani on Squads multisig (https://osec.io/blog/formally-verifying-solana-programs/) swapped in cheaper types
  - No published proof of Agave or Firedancer
- Specification quality
  - IronSpec (OSDI 2024): ten spec bugs in six verified systems
  - Arm v8-M validation (OOPSLA 2017): twelve bugs, two security
  - Scope (ASPLOS 2026): 35 of 38 reported RMM inconsistencies confirmed by Arm
  - Weak specs admit bugs; overly strong specs exclude valid use; consistency is not intent coverage
- Proof maintenance
  - Dafny measure-complexity: coefficient of variation under 20% advised; Pumpkin Pi (PLDI 2021) transports proofs across type equivalences, quotient version at OOPSLA 2025
  - Open: whether solver instability predicts real maintenance failures
- Testing with proofs
  - Cogent property-based tests mirror refinement proofs (SLE 2022) and found bugs in two C library functions and in specs
  - "Fuzzing plus proofs" is too broad to be novel
  - Study change-triggered tests of external assumptions
- Cost and adoption: published costs count different things (IronFleet 3.7 person-years includes method invention; Cedar 18 person-days for one proof); Gleirscher and Marmsoler survey, 216 responses, 1-2% response rate, perceptions only

## LLMs for verification

- Three tasks: complete a proof for given code and contract; generate code; generate the contract
  - Pass rates over different tasks are not comparable; check contamination, retries, budgets
- Proof synthesis
  - LeanDojo/ReProver: retrieval with held-out premises; COPRA: backtracking agent search; DeepSeek-Prover (8M statements, 46.3% miniF2F) and V1.5 (63.5% miniF2F, 25.3% ProofNet)
  - AutoReal: 7B model, 51.67% on 660 seL4 theorems; PROMISE: up to +26 points by retrieving similar proof states
  - Aria (https://arxiv.org/abs/2607.06341): code agents prove 4,257 Iris lemmas and 217 Rust-library lemmas; agents can silently drop or weaken the target lemma, so enforce the statement
- Verified code and agents
  - VeruSAGE proves 81% of 849 Verus tasks; strongest model does best with a general coding agent while VeriStruct's workflow wins on a small study
  - RagVerus: 75 of 383 tasks pass
  - Self-improvement takes four forms: weights, verified examples, written guidance, workflow code
- C and systems
  - AutoACSL: 96% full proof ratio over 604 programs, but proving generated obligations does not show a spec admits intended callers
  - liblzma decoder (https://arxiv.org/abs/2608.29716): agents built 27 Rocq/VST function proofs in 1,595 sessions over 70 days; allocator bodies assumed, zero-input UB excluded
- Specifications
  - Verus-SpecGym (https://arxiv.org/abs/2605.26457v1): 581 Codeforces tasks, best 77.8%; LLM judge misses 26% of failures an executable check catches
  - Coins (Rocq): scores 1.22% to 28.05% against 164 hand-written HumanEval specs
- Invariants and models
  - LLMs propose invariants safely only inside a sound checker loop; Lemur (ICLR 2024); Quokka: failed invariants mostly useless or slow
  - TLA+-Bench: same outputs score 10.0% or 1.7% depending on grading; Specula found 249 bugs with LLM-written TLA+, all confirmed in real code
  - Req2LTL/AeroReq2LTL about 85-88%; RFC2TLA+: TLC catches injected deadlocks in 33 of 42 runs
- Benchmarks: what each measures
  - miniF2F: 488 problems, math proof search only
  - DafnyBench: 782 programs, hint restoration under fixed contracts, contamination risk
  - VerusBench: 150 translated tasks
  - VERINA: 189 Lean tasks with 100% line coverage tests, which is not behavior coverage
  - CLEVER: 161 problems, hidden reference specs to stop copying

## Rust language and ecosystem

- Unsafe models and bug finding
  - Miri (POPL 2026, https://ralfj.de/research/papers/2026-popl-miri.pdf): runs over 70% of tests across 100K+ libraries; 3,000-7,000x slower than native; one execution only
  - Rudra (SOSP 2021): 43,000 packages in 6.5 hours, 264 new bugs, 76 CVEs, 112 RustSec advisories; archived
- Empirical bug studies
  - Qin et al. (PLDI 2020): 170 bugs (70 memory, 100 concurrency), 850 unsafe uses; all memory bugs involve unsafe; blocking bugs sit in safe code
  - TSE 2024 extension: 110 panic bugs (107 in safe code), detectors found 96 new bugs (52 double locks, 27 lock-order conflicts)
  - Xu et al.: 186 memory-safety CVEs through 2020 all need unsafe
- Async: cancellation can lose progress while memory stays valid
  - Tokio select docs list read_exact, write_all etc. as not cancellation safe; queued lock waits lose position
  - Candidate: replay remote commit/ack/cancel histories; blockers are Oxide RFD 400 and cancel-safe-futures
- C to Rust
  - C2Rust output is unsafe and mirrors C; Crown (CAV 2023): ownership inference removes 37.3% of mutable non-array pointer declarations and 62.1% of uses on 20 programs
  - Laertes (OOPSLA 2021): compiler-error-guided conversion to references
  - Compiling is not behavior preservation or safety
- LLMs writing Rust: RustAssistant (ICSE 2025): GPT-4 fixed 73.63% of 182 GitHub commits, 72% of Stack Overflow programs, 92.59% of authored examples; unsafe errors excluded; repairs can silently add Arc or cloning
- Kernels and infrastructure
  - Linux: sound abstractions over C bindings; a safe driver can still depend on a faulty C layer
  - Android (Google): zero memory-safety vulnerabilities found in about 1.5M Rust lines; Rust is 21% of new native code in Android 13; memory-safety share of vulnerabilities fell from 76% to 24% in 2019-2024; Rust rollback rate under half of C++
- Supply chain
  - Build scripts and proc macros run arbitrary code at build time
  - rustdecimal (typosquat, under 500 downloads) and oncecell (build.rs exfiltration) incidents; RustSec, cargo-audit, cargo-vet
  - Candidate: measure what build code can do, then test restricting it
- Compile time
  - Build systems a la carte separates scheduling from reuse correctness; incremental compilation caches only where recomputation costs more
  - Monomorphization duplicates generic code; resolver v2 can build dependencies several times
- Seamless Rust setup (agent experiments, rustc 1.97.1, 2026-10-06; https://github.com/SichangHe/seamless_rust_setup)
  - Edit loop stays about 0.7-1.3 s; incremental plus a fast linker (mold) is the first choice; Cranelift and dylib gave no instant builds
  - Shared target directory saved about 48% disk (449 vs 869 MiB); sccache gave no win and is unexplained
  - Hot reload via hot-lib-reloader: new output in 845 ms; only function-body edits with unchanged layout
  - File-based eval into a paused host, compile about 136 ms; Rust ABI unstable, trusted use only
  - Task monitor: only futures spawned through the wrapper are visible; cancellation cannot stop an infinite poll; Tokio console is richer
  - Dependency size: narrowing Tokio features cut intermediates 82% and build time 51%; regex-lite cut binary 76% and build 75%; tracing without env filter halves binary

## Garbage

- Best bets index
- Consultation assessment (ChatGPT)
- Four-folder index
- Rust verifiers index
- Practical verification index
- LLM verification index
- Rust language index
- Seamless setup index
- Seamless setup landing page
- Seamless setup research agenda
- LLM verification consultation
- Rust language consultation
- Rust verifiers collected papers
- Rust language collected papers
