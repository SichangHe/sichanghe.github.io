verifying the code between untrusted programs and the system: eBPF, WebAssembly, network code
(authored by agents unless marked 🧑)

short version
- the eBPF verifier is mostly not verified; people verify slices of it, test it, or replace it
  - the slices proved so far: range analysis (Agni), the bit-tracking domain (tnum), JITs (Jitterbug)
  - path pruning and the remaining verifier stages are outside the reviewed component proofs
    - path pruning skips executions judged already covered by an earlier analysis state
  - inference: the "verified verifier" is a patchwork of unrelated proofs, with no map of what remains
- testing found verifier bugs despite existing proofs of selected components
  - Sun and Su found 15 new verifier bugs in one month; Agni found 27 in older kernels
- the Wasm sandbox has verified pieces but no verified chain
  - pieces: mechanized semantics, verified instruction selection (Crocus, Arrival), binary checkers (VeriWasm, the LFI verifier), a verified runtime boundary (WaVe)
  - this review did not find an end-to-end proof joining them
- verified parsing is the most mature part of network verification
  - EverParse runs in Hyper-V; Vest, Verdict, VUPER are newer
  - the new pattern: use the verified parser as a test oracle against other implementations (VUPER found 20 kinds of mismatch)
- verified full network stacks are thin
  - last full-NF proof work I found is Vigor (SOSP 2019)
  - QUIC work I found is spec-based testing (Ivy), not proof of the implementation
- ideas worth trying, best first
  - classify every eBPF verifier bug fix by which proof would have covered it
  - check hand-written XDP/eBPF packet parsers against EverParse/Vest formats
  - extend a WaVe-style runtime proof to threads, in Verus

what the topic is, in plain words
- some code runs between untrusted code and the machine
  - the eBPF verifier decides if a user program may run inside the Linux kernel
  - a JIT compiler turns the accepted program into machine code
  - a Wasm runtime or compiler keeps a Wasm module inside its own memory
  - a packet parser decides what bytes from the network mean
- if this code is wrong, the attacker gets the kernel or the host
- so it is a good place to spend proof effort
  - the inputs are hostile and the code is small compared to the system
  - but the specs are hard: "safe" must be defined, and the verifier is usually a static analyzer, not a simple function
- network configuration verification (Batfish and friends) checks router configs, not code
  - section (d) below covers where it touches implementation proofs

scope notes
- already covered, so only pointed to here
  - OS kernels: [os_kernels.md](os_kernels.md)
  - compiler checking in general: [compilers.md](compilers.md)
  - crypto and secure protocol code: [crypto.md](crypto.md)
  - distributed protocols: [distributed_protocols.md](distributed_protocols.md)
  - Vest, Verdict, OwlC, WaVe (one paragraph each): [verified_systems.md](../rust_verifiers/verified_systems.md)
- the human's notes on static analysis: [static_analysis.md](../../../static_analysis.md)
- labels: fact = from the source text I opened; claim = authors say so; inference = mine
- "opened" means I read the paper text or its official abstract page; "search only" means I saw it in a search result and did not open it
  - I copied the PDFs I opened into the paper collection

(a) eBPF: verifier, JITs, replacements

proofs about the JIT
- Jitterbug, Nelson, Van Geffen, Torlak, Wang, OSDI 2020, peer reviewed, opened full text
  - [usenix page](https://www.usenix.org/conference/osdi20/presentation/nelson)
  - fact: a spec of JIT correctness plus an automated proof strategy; a new verified RV32 JIT; 16 new bugs found in five deployed JITs; all upstreamed
  - fact: the authors counted "41 commits that fixed 82 JIT correctness bugs" in the kernel history, and their spec catches all but two (both in offset-table construction)
  - claim: "it is possible to build a verified component within a large, unverified system with careful design of specification and proof strategy"
  - limits, fact from §4.4
    - "focuses on the JIT and cannot rule out bugs in the BPF checker, memory management for code images, or how the kernel uses the JIT"
    - assumptions about the JIT context are trusted; no instruction cache or timing model
    - the spec admits a "null" JIT that rejects everything, so test suites still check feature coverage
  - inference: the proof ends exactly where the verifier begins; the two proofs do not compose into "an accepted program is safe"
- rBPF JIT in Coq, Yuan, Talpin and others, CAV 2024, search only
  - claim, from a search summary: a "fully verified JIT implementation for RIOT's rBPF"
  - targets a microcontroller VM, not Linux eBPF

proofs about the verifier's numeric reasoning
- Agni, Vishwanathan, Shachnai, Narayana, Nagarakatte, CAV 2023, peer reviewed, opened full text
  - [project page](https://people.cs.rutgers.edu/~sn349/agni/)
  - fact: builds proof conditions from the kernel's C code and checks them with an SMT solver
  - fact: checks 16 kernel versions (4.14 to 5.19), found 27 previously unknown bugs, and proved range analysis sound in the latest version it checked
  - fact: makes small eBPF programs (at most three instructions, about 97% of cases) that show where verifier and real behavior differ
  - limits, fact from §7
    - "Only Range Analysis is Considered"
    - multiplication is left out at 64 bits because the solver times out; it was only checked at 8 bits
    - the C-to-SMT translation, LLVM and Z3 are trusted
- follow-ups from the same group (Rutgers), listed on the project page
  - SAS 2024: fixing latent unsound operators; patches upstreamed
  - SAS 2025, "Comparing the Precision of Abstract Operators", opened abstract: a framework to compare operators and a more precise `bpf_mul` that was upstreamed
  - eBPF workshop 2025: automatic synthesis of abstract operators (listed only; not opened)
  - CGO 2022 tnum paper (Distinguished Paper): proofs for the bit-tracking domain (listed only; not opened)
  - claim: the project aims at "strong proofs of correctness guarantees for the entire eBPF verifier"
- Formalizing the Linux eBPF Core ISA, Yuan, Tang, Cao, Besson, Talpin, Chen, OOPSLA 2026, peer reviewed, opened official page (presented 6 Oct 2026)
  - [paper](https://doi.org/10.1145/3839449)
  - fact: a small-step semantics in Rocq for "all 153 sequential in-kernel instructions"
  - fact: validated against the Linux test suite, which exposed inconsistencies
  - claim: proves the bit-level abstract domain sound; found new bugs; verifier optimizations merged upstream
  - inference: this gives a base that Agni's SMT-only approach lacks, because the semantics is in a proof assistant
- DPDK eBPF verifier, Khalili and Cauli (Huawei), DPDK Summit talk slides, 12-13 May 2026, not peer reviewed, opened slides
  - fact: an LLM agent wrote harnesses for CBMC and ESBMC, and used Frama-C/WP for proofs; one property checked, "Range Invariant Preservation"
  - fact: slides report "15+ bugs, 27 functions" and "~3 hours to first results"
  - fact: the model checkers "Timed out on bitvector mul/div", the same wall Agni hit; Frama-C/WP converged on `eval_mul` and `divmod`
  - slide: "Bug-finding ≠ Proof"
  - inference: LLM-driven verification of an eBPF verifier is already happening, but one property at a time and on the smaller DPDK verifier, not Linux's

testing as the practical competitor
- Validating the eBPF Verifier via State Embedding (SEV), Sun and Su, OSDI 2024, peer reviewed, opened
  - fact: embeds concrete values from a run into the program as checks; if the verifier accepts the program yet a check fails, the verifier's own tracking was wrong
  - fact: "within one month, uncovered 15 previously unknown logic bugs, 10 of which have already been fixed"; two let a local user gain privilege
  - fact: they say they still found bugs "in the verified range analysis", so proofs of a slice do not clear the rest
  - inference: running SEV on proved components can expose mismatches between proof scope and the implementation
    - the reported bug counts do not establish an equal-effort comparison with proofs
- bpfix, Zheng and others, arXiv July 2026, preprint, opened abstract
  - fact: 235 reproduced rejections, "47% of rejections return only EINVAL", one error string maps to up to nine causes
  - fact: LLM repair gets 0 to 37% one-shot success on 75 tasks; with bpfix localization it gains 11 to 21 points
  - this is about usability of the verifier, not soundness; it shows the cost of false rejections

- [Sun and Su, Approximation Enforced Execution of Untrusted Linux Kernel Extensions, USENIX Security 2025](https://www.usenix.org/conference/usenixsecurity25/presentation/sun-hao)
  - primary-source depth: official abstract checked; full paper and artifact not inspected in this follow-up
  - method: insert runtime checks that stop an extension when its actual state leaves the states predicted by the verifier
    - the complicated state prediction can then be wrong without silently allowing an unchecked memory access
    - simpler verifier safety checks and the inserted enforcement remain trusted
  - authors claim spatial memory safety under this smaller trusted boundary
    - abstract: “formally prove its soundness”
    - spatial memory safety concerns accesses staying inside permitted memory regions
  - authors report 4.5× smaller trusted code, 1.2% average runtime overhead, and 4.8% average binary growth
    - measurements describe their prototype and workloads
    - results were not reproduced here
  - limit: this is not a proof of the entire Linux verifier or of every property an eBPF program should satisfy
  - implication: runtime enforcement is another direct alternative to proving or replacing the whole verifier
    - inspect this paper before proposing a new way to reduce trust in verifier state prediction

replacing or moving the checker
- Rex, Jia and others, USENIX ATC 2025, peer reviewed, opened abstract and TCB section
  - [paper](https://arxiv.org/abs/2502.18832)
  - fact: extensions written in safe Rust, no in-kernel verifier; a small runtime handles exceptions, stack, termination
  - fact: the TCB becomes "the Rust toolchain, the Rex kernel crate" and more
  - claim: closes the "language-verifier gap", where a safe program is rejected by the verifier
  - inference: this changes the trusted boundary to a compiler and runtime; the paper does not prove Rex's own safety
- Heimdall, Dasu, Santra and others (Gang Tan's group), arXiv May 2026 (v2 August), preprint, opened abstract and limits
  - [paper](https://arxiv.org/abs/2605.25411)
  - fact: translates C eBPF to Rust (Aya); "109 formally proven-equivalent translations (94.8%)" of 115 programs, using symbolic execution and Z3
  - fact: "nine classes of source-level bugs that compile, pass the kernel verifier, and can silently corrupt data, leak kernel memory"; nine real bugs found, eight acknowledged and fixed
  - limits, fact from §7: path cap of 50,000; 56 helper stubs; 6 of 115 time out; atomicity check is "a coarse heuristic"
  - it says the verifier is not enough for program-level bugs: a program can be memory-safe and still leak
- Kops, Zheng and others, arXiv June 2026, preprint, opened abstract
  - fact: adds native operations to the eBPF pipeline; Lean 4 proofs that each native instruction sequence matches its eBPF "proof sequence"
  - claim: "the native emit is the only per-operation addition to the TCB"
  - fact: up to 24% faster in microbenchmarks, up to 12% in applications
  - inference: this is the first design I found where the JIT-side proof (Lean, in Jitterbug's style) is tied to a change in what the verifier checks
- Proof-Carrying Verification for eBPF, Martin Fink (TU Munich), Linux Plumbers Conference, 5 Oct 2026, talk abstract only, opened
  - [page](https://lpc.events/event/20/contributions/2440/)
  - claim: "an untrusted userspace proof generator analyzes the program, discovers invariants, and uses an SMT solver to discharge safety obligations"; kernel checks with "a restricted set of eBPF-specific reasoning rules"
  - the speakers ask whether "maintaining a shared safety policy between generator and checker is practical long-term"
  - inference: this is PREVAIL's ancestor idea (below) with certificates; no paper yet that I could find
- PREVAIL, Gershuni and others, PLDI 2019, peer reviewed, search only
  - claim, from the search summary: a static analyzer using the Zone domain that "generates no more false alarms than the existing Linux verifier", supports loops, and has better complexity
  - it is not a proof of the analyzer; a competing analyzer in the same sense as the kernel's

(b) WebAssembly and software sandboxes

the runtime boundary
- WaVe, Johnson, Laufer, Zhao, Gohman, Narayan, Savage, Stefan, Brown, IEEE S&P 2023, peer reviewed, opened full text
  - already summarized in [verified_systems.md](../rust_verifiers/verified_systems.md); here only the numbers I checked
  - fact: runtime is "7264 lines", with 4646 runtime lines and 1261 proof lines checked by Prusti
  - fact: the trusted part is 1357 lines: safety policy 43, OS spec 567 (Linux and macOS), verifier definitions 227, and 548 lines of Prusti extensions
  - fact: hostcalls cost 1.1x to 4.07x (mean 2.16x) over raw syscalls, against 1.61x to 3.69x for Wasmtime
  - claim: "completely removing the runtime from the trusted computing base"
  - limits, fact from §9: no safety "if a single sandbox is running multiple threads"; the loader is outside the proof
  - fact: the OS spec is checked by fuzzing, not by proof, so it is trusted
- WAW 2025 talk, Deian Stefan, "Removing the runtime from the TCB and other adventures in making Wasm fast and more secure", POPL workshop, talk abstract only
  - [page](https://popl25.sigplan.org/details/waw-2025-papers/11/Removing-the-runtime-from-the-TCB-and-other-adventures-in-making-Wasm-fast-and-more-s)
  - claim: shows the TCB shrinking with WaVe plus "simple hardware extensions"

checking compiled code
- VeriWasm, Johnson, Thien, Alhessi, Narayan, Brown, Lerner, Savage, Stefan, McMullen, NDSS 2021, peer reviewed, opened official page
  - fact: a static offline verifier for x86-64 binaries compiled from Wasm
  - claim: "detects isolation breaches without false positives"; deployed at Fastly
  - inference: it checks compiler output after the fact, so a compiler bug is caught only for the binaries you check
- Automated Formal Verification of a Software Fault Isolation System, Sotoudeh and Yedidia, FMCAD 2025 short paper, opened abstract and method
  - [paper](https://arxiv.org/abs/2508.15898)
  - fact: proves "programs accepted by the LFI verifier never read or write to memory outside of a designated sandbox region"
  - fact: the only manual input is an SFI invariant of about 20 lines of SMT-LIB2
  - fact: covers only the LFI verifier; the paper assumes a memory layout set by the LFI runtime
  - LFI (Yedidia, ASPLOS 2024, search only) reports 7% overhead on a SPEC 2017 subset; I did not open it
  - inference: verifying this small checker could complement compiler proofs
    - Jitterbug instead proves JIT correctness

checking the compiler's instruction selection
- Crocus, VanHattum and others, ASPLOS 2024, peer reviewed, search only
  - claim, from the search summary: verifies Cranelift's ISLE rules for Wasm 1.0 integer ops on AArch64 with an SMT solver; "reproducing 3 known bugs (including a 9.9/10 severity CVE)" and finding 2 new bugs
  - I did not open the paper
- Arrival, McLoughlin, Sheng, Fallin, Parno, Brown, VanHattum, OOPSLA 2025, peer reviewed, opened official page
  - [paper](https://doi.org/10.1145/3764383)
  - claim: "2.6X fewer hand-written specifications than prior approaches"; finds new Cranelift bugs; derives machine code specs automatically
  - I only saw the summary; limits unknown
- real CVEs, from search results (advisories, not opened): Cranelift CVE-2023-26489 computed a 35-bit address where Wasm requires 33 bits, so a Wasm load could reach outside linear memory
  - inference: this is the exact kind of bug Crocus and Arrival target, which is why they are the best-motivated work here

semantics and program logics
- WasmCert-Isabelle and WasmCert-Coq (Watt and others, CPP 2021); WasmRef-Isabelle (PLDI 2023), search only
  - claim, from search summary: a verified interpreter in Isabelle used as a fuzzing oracle in Wasmtime's CI
  - this is the Wasm version of "proof as test oracle"
- Iris-WasmFX, Legoupil, Pedersen, Birkedal, Lindley, Pichon-Pharabod, PLDI 2026, peer reviewed, opened abstract
  - fact: a Rocq mechanization of the stack-switching proposal (WasmFX) with a type soundness proof, and a program logic proved sound against it
  - fact: used on a coroutine library and a generator
  - this is about the language, not a sandbox runtime
- CHC-based Automated Verification of WebAssembly Programs, Yagi, Sakayori, Kobayashi, HCVS 2026 workshop, arXiv July 2026, opened abstract
  - fact: verifies Wasm programs with constrained Horn clauses; the abstract says only "preliminary experiments"
  - no numbers; I would not rely on it yet

what I did not find
- a verified Wasm runtime for Linux that proves the JIT output matches the Wasm spec, plus the sandbox boundary
  - Wasmtime relies on Cranelift checks (fuzzing and Crocus-style rule checks), not a whole-pipeline proof (inference)

(c) network functions, parsers, stacks, protocols

verified parsers
- EverParse in Hyper-V, Microsoft Research blog, opened
  - [post](https://www.microsoft.com/en-us/research/blog/everparse-hardening-critical-attack-surfaces-with-formally-proven-message-parsers/)
  - fact: about 30,000 lines of verified C for "over a hundred different message types" across four layers of the virtual switch
  - claim: the generated parsers are memory safe, correct, and free of double fetches (reading the same packet byte twice and getting different values)
  - [industry_use.md](industry_use.md) mentions EverParse; I did not open the 2019 EverParse paper itself
  - not peer reviewed (company blog); the peer-reviewed sources are the EverParse papers
- Vest and Verdict: see [verified_systems.md](../rust_verifiers/verified_systems.md)
- VUPER, Zhou, Tu, Ranjbar, Dong, Tan, Hussain, CCS 2026 (extended version on arXiv, August 2026), opened
  - [paper](https://arxiv.org/abs/2608.09094)
  - fact: a verified ASN.1 UPER parser in Rocq, extracted to OCaml, plus a compiler from ASN.1 definitions and a test framework
  - fact: tested 11 parsers (7 open source, 4 commercial) on 5G and V2X; found "20 types of inconsistencies in popular parsers" and built attacks
  - limit: the proof trusts Rocq's extraction
  - inference: the new thing is not the proof, it is the oracle use; one verified parser turned into a bug finder for the rest
- Access Control as Verified Parse Constraints, Iammongkol, Huang, Eyers, arXiv September 2026, preprint, opened abstract
  - [paper](https://arxiv.org/abs/2609.12488)
  - claim: "a forward-only, backtrack-free EverParse validator is a verified recognizer for a bounded, finite-state class"; the policy check becomes parsing
  - limit: assumes the C compiler; only "bounded policy languages with fixed-offset fields and bounded disjunction"; does not check the policy itself
  - runs on seL4
  - inference: an unusual use of a parser verifier as a policy enforcer; useful as a pattern for an eBPF or Wasm host-call filter

verified network functions and stacks
- Vigor, Zaostrovnykh, Pirelli, Iyer, Rizzo, Pedrosa, Argyraki, Candea, SOSP 2019, peer reviewed, opened abstract only (EPFL record)
  - fact: NFs written in C on a packet framework with a verified data-structure library; specs in Python; "push-button" proof
  - fact: five NFs (NAT, Maglev load balancer, MAC-learning bridge, firewall, traffic policer) shown to meet standards-derived specs, be memory safe, not crash or hang
  - claim: "the entire software stack is verified, down to the hardware"
  - note: the first Vigor results are sometimes dated 2017; the EPFL record I opened says SOSP 2019
  - I did not read the trusted-base section, so what is assumed (drivers, hardware model) is unchecked
- Verifying QUIC implementations using Ivy, Crochet, Rousseaux, Sambon, Piraux, Legay, arXiv March 2025, preprint, opened abstract
  - [paper](https://arxiv.org/abs/2503.01374)
  - fact: extends a formal spec from QUIC draft-18 to draft-29 and tests seven implementations
  - fact: the work found ambiguities in the spec
  - this is testing against a formal spec, not a proof of an implementation
- Rust network stacks: LwRustIP and smoltcp appeared in search results; I found no proof work on either
  - the Kani report on s2n-quic is covered in [verified_systems.md](../rust_verifiers/verified_systems.md)

other items near this
- cryptographic protocol Rust code with Hax and F*: [crypto.md](crypto.md)
- distributed protocols and the proof-to-code gap: [distributed_protocols.md](distributed_protocols.md)

(d) network configuration and control plane

- CB-Ver, Zhang, Alberdingk Thijm, Walker, Gupta, FMCAD 2026, peer reviewed, opened abstract
  - [paper](https://arxiv.org/abs/2604.03539)
  - fact: modular verification of properties that "eventually stabilize"; it "checks the necessary component-by-component requirements in parallel using an SMT solver"
  - fact: the verification algorithm is formalized and proved sound in Lean
  - this checks network configurations; Agni instead verifies range-analysis properties through a trusted C-to-SMT translation
  - not implementation verification: the router software is outside the model
- Batfish, Minesweeper, Lightyear, Hoyan: seen in search results only, not opened
  - [Lightyear on arXiv](https://arxiv.org/abs/2204.09635) (search result)
- inference: the connection to this study is that config checkers assume the router implements BGP as modeled; no work I found checks that assumption against code

what is missing

- no map of eBPF verifier coverage
  - evidence: Agni says it covers "Only Range Analysis"; Sun and Su found bugs even in the proved range analysis; Jitterbug leaves out the checker; I found no paper that sorts verifier bugs by which proof would have caught them
- path pruning, pointer typing, and the verifier's treatment of helper functions have no proofs I could find
  - evidence: the Rutgers page says the group looks at "path-exploration logic" but lists no finished paper on it
- this review did not find an end-to-end Wasm proof from specification to machine code
  - evidence: pieces exist (WasmCert, Crocus, Arrival, VeriWasm, LFI proof, WaVe), and WaVe says multi-thread sandboxes are out of scope
- no study of the cost of false rejections against the cost of unsound acceptance, in proof terms
  - evidence: bpfix measures rejections; the proofs measure soundness; the inspected sources do not join them
- I did not find a production TCP, QUIC, or TLS implementation proof within the searches listed below
  - evidence: in my search, QUIC work was spec-based testing (Ivy); Vigor is the latest full-NF proof I found
  - caveat: broad search was patchy; I did not search for seL4 network stacks or HACL-style TLS beyond [crypto.md](crypto.md)
- proofs about program bugs that the verifier accepts
  - evidence: Heimdall's nine bug classes pass the verifier

research we can do

1. a verifier-bug coverage map
- question: of all fixed Linux eBPF verifier bugs, which would a proof of range analysis, of tnum, of path pruning, or of the JIT have prevented?
- builds on
  - [Agni](https://people.cs.rutgers.edu/~sn349/agni/) (what its proofs cover)
  - [Sun and Su](https://www.usenix.org/system/files/osdi24-sun-hao.pdf) (bugs found anyway)
  - [Jitterbug](https://www.usenix.org/conference/osdi20/presentation/nelson) (its own count of 82 JIT bugs)
- what is new: a bug corpus labeled by the proof that would cover it, over 2019 to 2026
- why it may matter: it tells proof teams where the remaining risk is, and whether the next proof should be path pruning or something else
- first experiment: mine "bpf: fix" commits with a verifier or JIT tag; label 200 by component; ask two people to label independently and measure agreement
- convincing result: a table such that one unproved component holds a large share (say over a third) of the fixes that look like soundness problems
- cost: about two weeks of one person; labeling is the work
- scoop risk: the Rutgers group, or any kernel-security survey; I have not seen this exact study
- inference: a label like "soundness bug" will be argued over; keep the rule written down

2. generated packet parsers that the kernel verifier accepts
- question: can EverParse or Vest formats generate XDP/eBPF parsing code that passes the verifier, and does it catch bugs in hand-written eBPF parsers?
- builds on
  - [Vest in verified_systems.md](../rust_verifiers/verified_systems.md)
  - [EverParse](https://www.microsoft.com/en-us/research/blog/everparse-hardening-critical-attack-surfaces-with-formally-proven-message-parsers/)
  - [Heimdall](https://arxiv.org/abs/2605.25411) (program-level bugs that pass the verifier)
  - [VUPER](https://arxiv.org/abs/2608.09094) (parser as oracle)
- what is new: the verified parser is used both as the generated code and as the oracle against hand-written eBPF
  - EverParse emits C; the verifier wants bounded loops and checked offsets, so there is a real compile-to-verifier step to design
- why it may matter: packet parsing is where many eBPF programs spend their code, and the verifier only checks safety, not whether the parse is right
- first experiment: take 20 open-source XDP programs that parse IPv4/IPv6/TCP/TLS headers; write the formats once; run differential tests of each program against the verified parser on a fuzz corpus; count mismatches
- convincing result: real disagreements in programs that the verifier accepted, and a generated parser that loads and runs at near the same speed
- cost: about 4 to 6 weeks
- scoop risk: Heimdall's group (Gang Tan also co-wrote VUPER) is close; so are Vest authors
- inference: I did not check how many XDP programs hand-parse; that count decides if the experiment is worth it

3. WaVe-style runtime proof with threads, in Verus
- question: can the hostcall boundary of a Wasm runtime be proved safe when one sandbox runs several threads?
- builds on
  - [WaVe](https://par.nsf.gov/servlets/purl/10442363) (the single-thread proof and its stated limit)
  - [Verus systems work](../rust_verifiers/verified_systems.md)
  - the Wasm threads proposal
- what is new: the thread case, which WaVe lists as outside the proof, and a time-of-check to time-of-use argument (a bug where state changes between a check and its use)
- why it may matter: threaded runtimes need guarantees beyond the reviewed single-thread proof
- first experiment: port the hostcalls that touch paths (`path_open`, `fd_read`) to Verus; add a second thread that races on file descriptors; see which WaVe invariants break
- convincing result: a proof of the fd-table invariants under races, with overhead below WaVe's mean of 2.16x on hostcalls
- cost: 2 to 3 months; the OS specification is the hard part
- scoop risk: the original WaVe group (UCSD, CMU)
- caveat: WaVe's fd-table and path-translation code are the parts the paper says are tricky; I have not read the code

4. certificates for eBPF checked by a small verified checker
- question: how small can a checker be, if an untrusted prover supplies the invariants, and can the checker be proved against a real ISA semantics?
- builds on
  - [Fink's talk](https://lpc.events/event/20/contributions/2440/) (the design)
  - [Yuan and others' Rocq semantics](https://doi.org/10.1145/3839449) (the spec to prove against)
  - [Kops](https://arxiv.org/abs/2606.24213) (Lean proofs tied to the verifier)
  - [PREVAIL](https://www.academia.edu/53339524/Simple_and_precise_static_analysis_of_untrusted_Linux_kernel_extensions) (the analyzer that can serve as prover)
- what is new: a checker with a soundness proof, with LLM-written or PREVAIL-written invariants as the untrusted input
- why it may matter: it turns the "verifier is large and unproved" problem into "checker is small and proved", the move that worked for LFI
- first experiment: a checker for straight-line plus bounded-loop programs only, in Rocq or Lean, proved against the 153-instruction semantics; check the 200 smallest programs in the kernel selftests
- convincing result: the checker accepts at least what the kernel accepts on the selftests and rejects all known verifier-bypass proof-of-concept programs
- cost: 4 to 6 months; the semantics for helper calls and maps is the cost
- scoop risk: high, from the TU Munich group and the Zhejiang/Inria group
- inference: I would only do this with a partner from the Rocq semantics group

what I would try first
- idea 1, because it costs two weeks and gives targets for ideas 2 and 4; then idea 2

what I searched
- queries (web search and page fetch; arXiv, USENIX, ACM, SPLASH, LPC, DPDK, project pages)
  - "eBPF verifier formal verification 2026"
  - "WebAssembly formally verified runtime compiler sandbox 2025 2026"
  - "verified network function packet parser formal verification 2025 2026 Verus EverParse Vigor"
  - Agni, Jitterbug, Crocus, Arrival, VeriWasm, WaVe, PREVAIL, Rex, Heimdall, Vigor by name
  - "formally verified TCP stack or QUIC", "verified Rust network stack smoltcp", "network configuration verification 2025 2026", "WebAssembly mechanized semantics Isabelle Rocq 2025 2026", "LLM eBPF program synthesis verifier", "Lightweight Fault Isolation"
- sources opened: Jitterbug, Agni CAV, SEV (OSDI 2024), SAS 2025 precision paper, WaVe, Iris-WasmFX, LFI verification paper, Rex, Heimdall, VUPER, Access Control paper, Kops, bpfix, CB-Ver, Ivy QUIC (abstract), eBPF ISA formalization (official page), Arrival (official page), VeriWasm (official page), Vigor (abstract), EverParse (blog), CHC Wasm (abstract), DPDK slides, LPC talk page
  - that is about 24 sources; about 14 were read beyond the abstract (Jitterbug, Agni, SEV, SAS 2025, WaVe, Heimdall, VUPER, LFI verification, Rex, DPDK slides, Iris-WasmFX, and parts of others)
- seen in search results only (not opened): PREVAIL, Crocus, CAV 2024 rBPF JIT, WasmRef-Isabelle and WasmCert, LFI (ASPLOS 2024), Lightyear, Batfish, Minesweeper, Hoyan, Cranelift CVE advisories, LwRustIP, smoltcp, SOSP 2025 "Prove It to the Kernel"
  - the ACM page for "Prove It to the Kernel" returned 403; I know only its title and venue (SOSP 2025), so it is a gap in this review
- not covered
  - the newest (2026) work on Cranelift register allocation checking, TLS/QUIC parsers in the Everest line beyond the EverParse blog, P4 and SmartNIC verification (only Petr4 appeared), seL4-based network stacks, DNS and BGP implementation proofs, Windows eBPF verifier work beyond PREVAIL, the eBPF "Serval" line (mentioned in Heimdall's related work, not opened)
  - proofs and benchmark numbers were not reproduced
- paper collection
  - added opened PDFs: Jitterbug, Agni (CAV), SEV, SAS 2025 precision, Iris-WasmFX, LFI verification, Kops, bpfix, Heimdall, VUPER, Access Control, CB-Ver, Rex, Ivy QUIC; WaVe was already there
  - not added: papers I did not open
