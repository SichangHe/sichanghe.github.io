# Verified operating system kernels and hypervisors

(authored by agents unless marked 🧑)

## short version

- a kernel proof says "this code does what this written spec says, if these listed things hold"
    - the listed things are always the same few: hardware, boot code, assembly, compiler, the spec itself
    - most real bugs left in verified kernels sit in those listed things
- cost fell about 10× in 15 years
    - seL4, 2009: 8,700 lines of C, 200,000 lines of proof
    - Atmosphere, 2025: 6K lines of Rust, 20.1K lines of proof, under 2.5 person-years (from the human's notes in `static_analysis.md`)
    - TickTock, 2025: 3.5K lines of annotation for 22K lines of Rust, but only for one property (isolation)
- the newest result changes the game: MIT verified all of xv6 down to the bytes of the compiled image in 93 days using Claude Code
    - 1.5 million lines of proof for 6,593 lines of kernel
    - humans wrote the plan and the specs, agents wrote the proofs
- every project that proved a security property on top of "code matches spec" found bugs in the spec itself
- nobody has verified a kernel people already run in production without rewriting or shrinking it first
    - TickTock forked Tock, SeKVM carved a 3.8K-line core out of KVM
- best research ideas
    - 1: measure what is left unproved across verified kernels, then test exactly those parts (idea 1 below)
    - 2: agent-written proofs that survive kernel updates, measured on real commit history (idea 2)
    - 3: check the hardware model that every proof trusts against real chips (idea 3)

## what the topic is

- a kernel is the code every other program must trust
- "verified" here means a machine-checked proof that the kernel code matches a written description of what it should do (the spec)
- two styles
    - interactive proof: a person writes the proof step by step in Isabelle or Coq (now called Rocq); strong but slow
    - push-button proof: an SMT solver (a program that decides logic formulas automatically) finds the proof; fast but the kernel must be written in a restricted way
- overlap: Rust-specific tools (Verus, Flux, Kani) belong to the sibling folder `rust_verifiers`; here I only say what they changed for kernels

## what existing work shows

### can a whole kernel be proved at all

- [seL4: Formal Verification of an OS Kernel](https://www.sigops.org/s/conferences/sosp/2009/papers/klein-sosp09.pdf), Klein et al., SOSP 2009, peer reviewed
    - fact: a small microkernel, proof in Isabelle that the C code matches an abstract spec
    - fact, numbers: "8,700 lines of C code and 600 lines" of assembly; "The overall size of the proof, including framework, libraries, and generated proofs (not shown in the table) is 200,000 lines of Isabelle script"
    - fact, bugs: testing found 16 defects before the proof; "the formal verification has uncovered another 144 defects and resulted in 54 further changes to the code to aid in the proof"
    - fact, what is assumed: "We assume the correctness of the compiler, assembly code, boot code, management of caches, and the hardware; we prove everything else."
    - fact, effort as retold by a later paper (SeKVM): "took seL4 [4] ten person-years to verify 9K lines of code"
    - the current assumption list is on the [seL4 assumptions page](https://sel4.systems/Verification/assumptions.html)
        - "about 340 lines of ARM assembly" are assumed correct
        - boot code: "This leaves out about 1,200 lines of the code base that a kernel programmer would usually consider to be part of the kernel."
        - virtual memory: "you have to trust us that we got all necessary conditions and that we got them right. Our machine-checked proof doesn't force us to be complete at this point."
        - "DMA: we assume that the CPU and MMU are the only devices that access memory directly."
    - inference: the page is unusually honest, and it is a ready-made list of where to look for bugs
- [CertiKOS: An Extensible Architecture for Building Certified Concurrent OS Kernels](https://www.usenix.org/system/files/conference/osdi16/osdi16-gu.pdf), Gu et al., OSDI 2016, peer reviewed
    - fact: first proved kernel with real multicore locking; proof in Coq, built as a stack of layers
    - fact, numbers: "written in 6500 lines of C and x86 assembly"; "The entire proof effort for supporting concurrency took less than 2 person years."
    - fact, trusted spec size: "943 lines of code used to specify the lowest layer axiomatizing the hardware machine model, and 450 lines of code for the specification of the abstract system call interfaces. These are in our trusted computing base."
    - fact, unproved: "The mC2 kernel also relies on a bootloader, a PreInit module (which initializes the CPUs and the devices), and an ELF loader. Their verification is left for future work."

### can the proof be automatic

- [Hyperkernel: Push-Button Verification of an OS Kernel](https://syslab.cs.washington.edu/papers/nelson-hyperkernel.pdf), Nelson et al., SOSP 2017, peer reviewed
    - fact: redesign the kernel interface so the Z3 solver can prove each system call alone
        - "it finitizes the kernel interface to avoid unbounded loops or recursion"
    - fact, numbers: 50 system calls and trap handlers checked; about "15 minutes on an 8-core machine"
    - fact, limits: "The current prototype of Hyperkernel runs on a uniprocessor system"; interrupts disabled inside the kernel
    - fact, trusted: "The trusted computing base (TCB) includes the specifications, the theorems (including the equivalence function), kernel initialization and glue code, the verifier, and the dependent verification toolchain (i.e., Z3, Python, and LLVM)."
    - inference: automation was bought by changing the kernel, not by a smarter prover
- [TickTock: Verified Isolation in a Production Embedded OS](https://ranjitjhala.github.io/static/sosp25-ticktock.pdf), Rindisbacher et al., SOSP 2025, peer reviewed
    - fact: proved one property, process isolation, for Tock, an embedded OS that ships in real devices; tool is Flux, an SMT-based Rust checker
    - fact, numbers: "about 3.5KLOC of Flux annotations for 22KLOC Rust source"
    - fact, bugs: "five previously unknown bugs in Tock's MPU-configuring code and two in interrupt handling"
    - fact, limit: TickTock is "a redesigned fork of the Tock kernel"; "even specifying isolation proved to be complicated and required code changes"
    - inference: one narrow property on production code is cheaper and finds real bugs; this is the most copyable recipe in this file
- Atmosphere (SOSP 2025) and VeriSMo (OSDI 2024) use Verus; both are already in the human's notes in `static_analysis.md` under "Verus applications"

### can an existing big kernel be retrofitted

- [A Secure and Formally Verified Linux KVM Hypervisor](https://par.nsf.gov/servlets/purl/10311030), Li et al., IEEE S&P 2021, peer reviewed
    - fact: split KVM into a small trusted core and a large untrusted rest, then prove the core protects virtual machine data
    - fact, numbers: the core "KCore ends up consisting of 3.8K LOC (3.4K LOC in C and 400 LOC in assembly)"; KVM with Linux "is more than 2M LOC"; "Verification took two person-years to complete."
    - fact, key lesson: "Most bugs were discovered as part of our noninterference proofs, demonstrating a limitation of verification approaches that only prove functional correctness via refinement alone: the high-level specifications may themselves be insecure."
    - inference: "verified KVM" means a verified 0.2% of KVM that the other 99.8% cannot get around, if the split is right
- [Design and Verification of the Arm Confidential Compute Architecture](https://www.usenix.org/system/files/osdi22-li.pdf), Li et al., OSDI 2022, peer reviewed
    - fact: Coq proof of Arm's firmware that guards confidential virtual machines; "RMM contains 3.2K lines of code (LOC) in C and .3K LOC in assembly"
    - fact: "The verification outcomes, including the discovery of several latent bugs, were confirmed by Arm's development team"
    - related, not opened by me: "Scope: Detecting Inconsistencies in Arm CCA's Formally Verified Specification" (ASPLOS 2026) is in the paper collection; its title says the verified spec itself had inconsistencies
- [Asterinas: A Linux ABI-Compatible, Rust-Based Framekernel OS with a Small and Sound TCB](https://www.usenix.org/system/files/atc25-peng-yuke.pdf), Peng et al., USENIX ATC 2025, peer reviewed
    - fact: a new Linux-compatible kernel where only a small core may use unsafe Rust; "memory-safety TCB of only about 14.0% of the codebase"
    - inference: this is the retrofit idea turned around, design the kernel so the part worth proving is small; the proof of that core is ongoing work, not a finished result

### what agents changed in 2026

- [Extending concurrent separation logic to the hardware level to verify the xv6 OS kernel on RISC-V with AI agents](https://arxiv.org/pdf/2609.04043), Kaashoek and Zeldovich, arXiv, September 2026, preprint
    - fact: proved the xv6 teaching kernel against a detailed model of a RISC-V machine (page tables, interrupts, device memory access, power failure)
    - fact, numbers: kernel is "6,593 lines of C and assembly code"; the proof "comprises about 1.5 million lines of Rocq code"; "The verification effort took us 93 days, including the time to develop the MachCSL framework."
    - fact, bugs: "we uncovered ten bugs in the xv6 implementation, as well as one bug in the Sail RISC-V semantics"
    - fact, how agents were used: "we made extensive use of AI agents (Claude Code) to help us write the proofs and intermediate specs, although we had to lay out the overall plan (MachCSL) in substantial detail"; "our prompts to the agents added up to about 3× as much text as this paper"
    - fact, proof upkeep: the proof is tied to the compiled image, so "small changes to the kernel's source code can lead to pervasive changes throughout the kernel image"; "agents are able to perform these tedious proof updates without substantial developer input"
    - fact, limits: only safety, "do not yet cover liveness properties"; "do not cover non-interference properties"; trusts "the Rocq proof checker and our model of the RISC-V system"
    - fact: at one point the agent "changed the xv6 source" to make a proof go through
    - inference: proof size stopped being the cost; a 230:1 proof-to-code ratio would have been absurd by hand
    - inference: the remaining human work was the plan and the specs, which matches what the human's Verus notes found for agents

## what is missing

- no shared accounting of what is unproved
    - each paper lists its trusted parts in its own words (seL4 page, CertiKOS section, Hyperkernel paragraph)
    - I found no study that puts them side by side and asks how many of the bugs later found fall in each part; the closest is the 2017 study of verified distributed systems covered in `spec_quality_trusted_base.md`
- no verified kernel that tracks an upstream kernel over time
    - TickTock is a fork; SeKVM is a retrofit of one KVM version; evidence: both papers describe one-time efforts
    - the xv6 paper says agents can redo proofs after changes but reports no numbers on it
- hardware models are trusted and rarely tested
    - the xv6 work found a bug in the official RISC-V model; seL4 assumes cache and TLB handling is right
- liveness and information leaks are mostly unproved
    - xv6 2026 says so directly; Hyperkernel is single core
- drivers, boot, and device memory access stay outside almost every proof
    - seL4 leaves out 1,200 lines of boot code and assumes no device writes memory behind its back

## research we can do

### idea 1: map the unproved parts of verified kernels, then attack them

- question: of the bugs found in verified kernels after the proof, how many sit in each trusted part (boot, assembly, hardware model, spec, compiler)
- builds on: the seL4 assumption list, the trusted-base statements quoted above, the bug-study method in `spec_quality_trusted_base.md`
- new: a single table across seL4, CertiKOS, SeKVM, Atmosphere, TickTock, xv6; then fuzz and test exactly the unproved parts
- why it may matter: it tells a team where the next hour of testing pays most once a proof exists
- first experiment: read the public bug trackers of seL4 and Tock, label each post-proof bug by which assumption it broke
- convincing result: more than half the bugs fall in two or three named parts, and a cheap test of those parts finds a new one
- cost: weeks for the study; a few months for the testing tool
- who could scoop it: the seL4 team has the data; the "Scope" ASPLOS 2026 authors work on spec inconsistencies

### idea 2: do agent-written kernel proofs survive real code changes

- question: replay 100 real commits of a verified kernel; how often can an agent fix the proof alone, and what does it cost per commit
- builds on: the xv6 2026 claim about agent proof updates; Atmosphere and TickTock as Rust targets; `proof_maintenance_repair.md`
- new: nobody has reported per-commit repair rates on a kernel; the xv6 paper gives one sentence and no numbers
- why it may matter: upkeep, not the first proof, is what stops adoption
- first experiment: take Atmosphere's or TickTock's git history, break the proof at each commit, let an agent repair, record success, dollars, and whether it touched specs or code
- convincing result: a repair rate with a clear split between "proof only" fixes and fixes where the agent quietly changed the spec or the code
- cost: about a month plus model spend
- who could scoop it: the MIT xv6 authors; Microsoft's Verus agent group

### idea 3: test the hardware model that proofs trust

- question: does the machine model in a kernel proof behave like the real chip for the instructions the kernel uses
- builds on: the bug in the Sail RISC-V model found by the xv6 proof; seL4's cache and TLB assumptions
- new: generate small test programs from the proof's own model for exactly the hardware features the kernel relies on, run them on real boards and emulators, and compare
- why it may matter: every kernel proof ends at this model, and it is checked by almost nobody
- first experiment: for xv6's proof, list which model rules the proof uses, and write tests for the 20 most used
- convincing result: one real mismatch between model and chip that the kernel depends on
- cost: a few months; needs hardware
- who could scoop it: the Sail and Arm spec groups at Cambridge already test their models, but not guided by a kernel proof

## ChatGPT's opinion

- one consult covers all files in this folder; see `research_directions.md`

## what I searched

- web search: verified kernel and hypervisor papers 2025 to 2026, seL4, pKVM, Asterinas, Tock
- opened and quoted: seL4 SOSP 2009, seL4 assumptions page, CertiKOS OSDI 2016, Hyperkernel SOSP 2017, SeKVM S&P 2021, Arm CCA OSDI 2022, TickTock SOSP 2025, Asterinas ATC 2025, xv6 with agents arXiv 2026
- not covered
    - the Cambridge work on testing Android's pKVM hypervisor against a spec (could not get the paper)
    - Serval, Komodo, and other single-property verifiers
    - Microsoft's Hyper-V verification history
    - "Towards a Formal Verification of the Bao Hypervisor" (2026, found, not opened)
