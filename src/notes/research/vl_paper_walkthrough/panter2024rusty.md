# Rusty Linux: Advances in Rust for Linux Kernel Development
(authored by agents unless marked 🧑)
Tag: `panter2024rusty`, [paper](http://arxiv.org/abs/2407.18431v2)

## scope and evidence

This paper is a systematic literature review of Rust kernel development, not a new verifier. It searches ACM, IEEE, Scopus, and Springer Link between January 1, 2019 and April 1, 2024; title-and-abstract screening leaves 22 papers for in-depth reading; forward and backward snowballing adds 6 more, for 28 papers in total (§2.3–2.4, PDF pp.2–3). The first author reviewed all 28 and the second author verified the data and results (§2.4). Its four research questions ask about existing approaches, performance implications, challenges and limitations, and lessons learned (§2.2). The paper’s abstract states: “Our findings suggest that while the initial implementations of Rust in the kernel show promising results in terms of safety and stability, significant challenges remain.” (Abstract, PDF p.1)

The formal-verification material is concentrated in the review of Atmosphere and Theseus. The paper reports that Atmosphere combines Rust’s linear type system with an SMT solver and has a 7.5:1 proof-to-code ratio, compared with 19:1 for seL4 and 20:1 for CeriKOS (§3.1, PDF p.4). It also reports that Theseus uses compiler-enforced ownership and isolation, while acknowledging that invariants enforced by the type system alone are limited (§3.1 and §3.4, PDF pp.4–6). Note that the paper calls 7.5:1 “higher than” the 19:1 and 20:1 of the other kernels, although 7.5 is numerically smaller; the paper does not say which direction is better. These figures are reported by the reviewed studies; this review does not re-run their proofs.

## technique 1: compiler-enforced ownership and cell isolation

What it is. Theseus is a greenfield operating system designed around Rust’s language abstractions. The review says: “The design of Theseus uses a novel cell-based structure where ownership of memory and resources is enforced by the compiler, thus avoiding these checks during runtime to get improved performance.” (§3.1, PDF p.4) The review says Theseus “operates in a single address space and single privilege level and uses properties of the Rust programming language to realize isolation instead of relying on hardware,” which “pushes some of the roles that a traditional operating system would take onto the compiler.” (§3.1, PDF p.4) Theseus also aims at the state spill problem: a single service can harbor a state change induced by interacting with other services, which can later cause a crash or instability far from where the problem occurred (§3.1, PDF p.4).

When to use it. Use this approach when designing a new kernel or subsystem whose APIs can be shaped around Rust ownership and where isolation boundaries can be represented as types. It is less directly applicable to an existing C interface whose aliasing and ownership are implicit.

How to apply it. The paper gives no step-by-step procedure; it states only that ownership of memory and resources is enforced by the compiler (§3.1, PDF p.4). Inference: a practical recipe would be to define cells as the units that own memory or other resources, expose operations through typed references so borrowing rules reject invalid aliasing, keep service state with its owning cell, transfer ownership explicitly across service boundaries, and let the compiler reject violations before execution. The paper does not state these steps.

Verus form. Inference: A Verus implementation can model each cell as a Rust struct and state ownership or non-aliasing conditions in `requires` and `ensures` clauses. A `proof fn` can establish that a transfer preserves an invariant over the resource owner; executable functions perform the transfer. Inference: Rust’s ordinary borrow checker already enforces many local ownership facts, while Verus is useful for cross-cell functional, isolation, and state-transition properties that the type system cannot express.

Evidence and limits. The paper presents Theseus as a design reported by Boos et al.; it gives no new proof count or benchmark for the cell mechanism. It reports a key limit from Klimt et al.’s lessons on Theseus: “One of the most important lessons learned was the insight that a linear type system itself cannot guarantee the uniqueness of the resource represented, such as when a memory resource may overlap.” (§3.4, PDF p.6) The same section says Theseus cannot be written in 100% safe Rust because, for example, a memory management system must use raw pointers to modify the hardware (§3.4, PDF p.5). Inference: A type-level owner does not by itself prove that two resource descriptions refer to disjoint physical regions. Hardware mappings, unsafe code, and external interfaces remain assumptions unless separately modeled and proved.

## technique 2: hybrid linear types plus SMT proofs

What it is. Atmosphere is a Rust microkernel reviewed as a formally verified kernel. The paper states: “Chen X et al. [5] took their implementation one step further by formally verifying their new micro-kernel named Atmosphere by using both the liner type system of Rust in combination with an SMT solver.” (§3.1, PDF p.4) Inference: the linear type system handles resource-use discipline and the SMT solver covers properties the type rules cannot express; the paper does not describe this division for Atmosphere. In §3.4 it says of Klimt et al. that “The authors introduce the idea of using a hybrid approach of verification where they leverage both the linear type system and an SMT solver” (PDF p.6).

When to use it. Use a hybrid when ownership and linearity cover local resource correctness but the kernel also needs arithmetic, state-transition, or global invariants. The reviewed architecture is a microkernel, which limits the amount of kernel functionality that needs to be proved; the paper says that pushing functionality to user space “limited the surface area that needs to be proved.” (§3.1, PDF p.4)

How to apply it. The paper gives no procedure beyond naming the combination of Rust’s linear type system and an SMT solver and reporting a 7.5:1 proof-to-code ratio for Atmosphere against 19:1 and 20:1 for seL4 and CeriKOS (§3.1, PDF p.4). Inference: a practical recipe would encode kernel resources and ownership in Rust’s type discipline, state the remaining invariants in a solver-supported specification language, discharge the proof obligations with the SMT solver, keep user-space drivers outside the verified kernel boundary unless they get their own proof, and compare implementation and proof lines with a declared counting rule.

Verus form. Inference: This maps naturally to Verus’s executable Rust plus specifications and proof functions. Use Rust types and ownership for memory discipline, `requires`/`ensures` for function contracts, loop invariants for iterative kernel code, and proof functions for SMT-dischargeable lemmas. Inference: this paper does not name the SMT-based tool or encoding that Atmosphere used, so its proof ratio and kernel encoding should not be assumed to transfer to a Verus project. A Verus study should report implementation and proof lines with an explicit denominator and should separate verified kernel code from unverified drivers.

Evidence and limits. The review reports only the ratio and architecture, and I found no number of verified properties, solver version, proof time, or kernel coverage in it. It explicitly says that drivers running in user space “are still not formally verified and don’t have to be written in Rust.” (§3.1, PDF p.4) Inference: The ratio is an effort indicator, not evidence that all kernel behavior is proved. The unverified driver boundary can reintroduce safety and functional threats through interfaces.

## technique 3: minimize the proof boundary by kernel architecture

The review groups approaches into monolithic, microkernel, embedded, unikernel, and exokernel architectures (Table 2, PDF p.3). The formal technique is architectural: place less code in the trusted kernel and move services or drivers outside the proof boundary. Atmosphere uses a microkernel; Theseus uses compiler-enforced isolation in a single address space and privilege level; RustyHermit, a rewrite of the C unikernel HermitCore by Lankes et al., “consists of only 3.27% unsafe Rust” (§3.1, PDF p.4).

## technique 4: preserve safety while integrating C

The review identifies C interoperability as a core challenge. Table 4 lists that “Kernel interfaces, while designed for extensibility, are not designed for type safety” and that “The Rust compiler can not track ownership when switching between modules written in C and Rust.” (Table 4, PDF p.5) The paper also reports a 0.7% overhead for a non-encapsulated Rust replacement of Linux’s out-of-memory component and 3% for an encapsulated replacement, but these are performance measurements from the cited study (§3.2, PDF p.4).

How to apply it. The paper gives no integration procedure. Its Table 4 lists soundness concerns: unsynchronized global state, C-style abstractions (advice to use Rust-style abstractions that encapsulate internal unsafe use of raw pointers), aliasing mutable references, and re-implementing memory access (§3.3, Table 4, PDF p.5). Inference: a practical recipe would keep the C/Rust boundary narrow, define explicit ABI and ownership contracts, encapsulate unsafe pointers in Rust abstractions, and measure both non-encapsulated and encapsulated variants as the OOM study did.

Verus form. Inference: Mark foreign calls and hardware accesses as explicit trusted boundaries, then specify preconditions and postconditions for wrappers. Use proof functions to show that wrapper contracts preserve ownership and validity, while recording the foreign implementation as an assumption. Inference: Verus cannot prove a C implementation merely because a Rust wrapper has a contract.

## what is proved, trusted, and already done

This review proves no new theorem. Its formal evidence is reported by the cited Atmosphere work; its other numbers summarize cited performance and code-composition studies. Trusted assumptions include each source paper’s methodology, the review’s inclusion criteria, and the comparability of proof-to-code ratios across systems. The authors themselves list threats: study quality varies, selection may favor successful integrations, contexts are heterogeneous, and Rust and Linux change rapidly (§4, PDF p.6).

## techniques for the catalog

- cell-based compiler isolation: design resource-owning cells and let Rust’s ownership and borrow checks enforce local isolation at compile time
- hybrid type-and-SMT verification: combine linear resource typing with SMT proofs for invariants beyond the type system
- proof-boundary reduction: choose microkernel or unikernel boundaries to reduce code that must be formally verified while specifying interfaces
- explicit C/Rust contracts: narrow foreign boundaries and state ownership, ABI, and memory assumptions for unsafe interoperability
