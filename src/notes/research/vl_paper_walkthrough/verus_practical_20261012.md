# Verus systems foundation: proof architecture, automation, and realistic limits
(authored by agents unless marked 🧑)

## Paper and reading boundary

The [existing overview](../topic_studies/formal_verification_rust/rust_verifiers/verus.md) already records the headline scale and speed result. This study extracts the specific proof decomposition, solver choices, concurrency construction, experiment scope, and implications for agents. All performance and proof-effort results below are author reports, not independent reproductions.

### Check the supported memory operations before translating code

§2, p. 3, says Verus “rejects usage of features outside that subset” of supported unsafe features. For the systems case studies, the authors “extended Verus’s support for raw pointers.” The hybrid_rust_verification paper (arXiv v3, April 2025) says Verus does not support traditional raw pointers and verifies linked lists with ghost PointsTo<T> instead; the two papers do not address each other, and the likely reading, that traditional means unrestricted *mut T without ghost permissions while this paper's extension stays inside Verus's permission discipline, is the study's inference. Agent recommendation: first map the target code's memory operations to supported proof APIs. A proof-oriented rewrite or a separately specified trusted primitive may be necessary; existing unsafe syntax does not itself establish that its behavior is covered. Agent inference: this builds on the earlier Verus unsafe-Rust work the paper cites as [10], and the paper does not claim complete Rust provenance support.

### Keep ordinary proof obligations small

§3.1, pp. 3–4, uses a mathematical view function to relate a concrete data structure to an abstract sequence. Preconditions and postconditions express the API; Floyd-Hoare reasoning generates the obligations. Ownership avoids repeatedly proving that unrelated updates cannot alias.

The encoding uses pure total spec functions without preconditions or direct heap access; removes imported but unreachable definitions; and isolates memory, bitvector, and nonlinear reasoning. §3.1, p. 4: “Verus aggressively prunes the context sent to the SMT solver to eliminate imported but unreachable definitions.” The quantifier policy selects few triggers rather than broad ones. A trigger is the expression pattern that causes a quantified fact to be instantiated. Authors acknowledge extra initial user effort in exchange for scalability.

Agent recommendation: reuse narrow proof contexts, small useful assertions, reveal/hide controls, and relevant definitions. Diagnose excessive instantiation before increasing timeouts. These mechanisms already exist; building an agent around them is a workflow contribution, not a new solver technique.

### Prove an abstraction, then use the best solver on it

§3.2, pp. 4–5, integrates EPR, a restricted first-order fragment designed for predictable automated reasoning. The four steps are: define the unrestricted implementation; create an EPR abstraction; prove its invariant automatically; transport the result back through checked connections. The author says the developer “still writes an inductive invariant” (p. 5). Fully automated checking is not automatic invariant discovery.

In IronKV's delegation map, integer keys are abstracted to a totally ordered set. Verus checks the correspondence. The initial default-mode Verus set proof required about 300 lines and several days; EPR avoids much of the case-splitting proof. EPR excludes direct arithmetic and imposes acyclicity constraints. A caveat matters: “epr_mode queries are not strictly in EPR” because of polymorphic encoding (p. 5); the reported success is empirical for the tested cases.

A small distributed-lock example shows the cost of abstraction can outweigh its benefit: about 25 default proof lines versus about 100 lines to create and use the EPR abstraction (§4.1.3, p. 10). Agent recommendation: select EPR for complex fitting invariants; do not assume every simple proof benefits from a new model.

### Isolate hard arithmetic and computation

§3.3, p. 6, offers separate assertion modes:

- integer_ring proves supported integer-ring congruence equalities, including modular relationships, using specialized algebraic automation
- nonlinear_arith enables nonlinear SMT heuristics in an isolated query; “without implicit context” means premises must be repeated explicitly
- bit_vector checks machine-word identities as bitvectors, then makes the result available to the surrounding integer-level proof; ordinary arithmetic reasoning still requires the relevant bounds and overflow proofs
- proof by computation uses an interpreter to simplify statically computable expressions and sends the remainder to SMT

These are trusted automation components. The paper motivates computation with a hard-coded CRC lookup table whose derivation was difficult to prove by manually directing SMT. It also explains that uncontrolled mixing of integer and bitvector reasoning leads to fragile proofs. Agent recommendation: identify the mathematical fragment, supply its necessary premises, and keep the surrounding context out of specialized queries.

### Generate repeated proofs as ordinary checked code

§3.3, p. 6, uses Rust macros to generate repetitive proof structures. §4.2.1, p. 11, defines a Marshallable trait with serialization, parsing, and supporting lemmas. Base types and Vec have hand-written proofs; structs and enums get derived implementations and proofs. Agent recommendation: use a proved template for repetition, while checking each expansion. The need to write every repetitive lemma from scratch has already been addressed.

### Make concurrent resources follow a state machine

§3.4, pp. 6–8, combines resource algebras with VerusSync. A resource algebra specifies valid ways to combine and update owned proof resources. Instead of manually designing monoid laws, developers state a transition system, choose field-sharding strategies, and prove an inductive invariant. Sharding specifies which pieces a thread owns: one token for a variable, individual entries for a map, or shared agreement for a constant.

The paper says a well-formed VerusSync system “always corresponds to a resource algebra with the necessary properties.” (§3.4, p. 7). The generated API creates, consumes, and updates ghost shards. A transition needs ownership only of the shards it touches; unaffected shards can remain with other threads.

The NR ring-buffer example (§3.4, p. 8) tracks tail, per-thread versions, buffer size, and executor phases. A reader_finish transition consumes evidence of the reader phase and the thread's version entry, then returns the idle phase and updated version. §3.4, figure 6, p. 9, connects shards to physical atomics through invariant predicates. The concrete atomic update and ghost transition must preserve that relationship. Agent recommendation: generate protocol states and ownership movement first, then link them to physical operations. A proof of the abstract transition system alone is insufficient.

### Small comparisons and failure feedback

§4.1, pp. 9–10, compares Verus with Dafny, Low★, Prusti, and Creusot on lists, memory updates, and a distributed lock. The default machine is an EC2 m5.8xlarge with 16 cores, multithreading disabled, and 128 GiB RAM. Figure 7 reports medians of 20 single-threaded runs; the Creusot asterisk denotes a partial result requiring manual intervention. Prusti cannot express the cyclic-pointer doubly linked list.

The other tools took 3–28 times longer on the singly linked list and 24–61 times longer on the doubly linked list. These are selected artifact comparisons. They are not a universal tool ranking or an agent success rate.

Failure-feedback experiments deliberately remove a precondition from pop and index; figure 8 uses median time over 20 runs with eight threads. Verus, Dafny, and Prusti diagnose these failures quickly; Low★ and Creusot slow more. Repeated updates to four lists give roughly linear Verus time, about 1.6 ms per singly linked-list push and 1.8 ms per doubly linked-list push (§4.1.3, p. 10). Agent recommendation: measure useful failure feedback as well as successful checking.

### Five systems, two ports and three new components

Figure 9, p. 10, reports 6,119 executable lines, 31,231 proof lines, and 4,692 lines in its trusted column across five Verus systems. Its categories are not interchangeable: trusted specifications are not proved executable code. Single-core/eight-core whole-project verification times are IronKV 41/18 seconds, NR 17/9, page table 63/34, allocator 262/55, and persistent log 12/6.

**IronKV:** §4.2.1, pp. 10–11, ports the host implementation. The authors explicitly say, “We skip the protocol level” The original protocol-level host description becomes the target specification. Verus has 4,509 proof lines versus Dafny's 8,070; single-core checking is 41 versus 445 seconds; total SMT queries are 17 versus 352 MB. The trusted count is not directly comparable because of the reinterpretation of the original protocol layer. Runtime comparison uses three server processes, 10 client threads, 10,000 keys, 30-second trials, and means over 100 trials; observed performance is comparable. This is not a fresh end-to-end consensus or distributed-liveness proof.

**Node Replication:** §4.2.2, p. 11, proves the concurrent implementation meets its sequential functional specification linearizably. Linearizability means completed operations can be arranged into a valid sequential history while respecting their real-time order. Compared with IronSync's Linear Dafny version, Verus uses 5,237 versus 7,828 proof lines and 17 versus 1,089 seconds for single-core checking. VerusSync simplifies concurrency reasoning. Rust traits and dynamic thread registration also improve fidelity to the unverified Rust original. The four-socket runtime benchmark uses write ratios of 0%, 10%, and 100%; reported throughput matches the unverified original.

**Page table:** §4.2.3, p. 12, verifies x86-64 map/unmap behavior from a process on a single-processor system. A trusted MMU specification defines translation, tied to owned physical page-table memory. There are 400 executable and 5,329 proof lines, a 13.3 ratio. Bitvector, nonlinear, and computation modes are invoked 62, 39, and 11 times. A runtime test measures 100 million operations on 4 KiB frames. Unmap is slower because the verified version reclaims empty directories; disabling reclamation in an unverified variant explains the difference. This scope does not establish arbitrary multiprocessor page-table behavior.

**Allocator:** §4.2.4, pp. 12–13, ports selected mimalloc algorithms into Rust and proves allocations return non-aliased memory. A trusted mmap contract introduces ownership; cross-thread frees transfer permissions through atomic free lists. The implementation has 3,178 executable and 13,703 proof lines; 245 trusted OS/interface lines plus 37 user-facing spec lines make the reported trusted total 282. The paper says: “It can complete 8 out of 19 benchmarks” and does not reach performance parity (p. 13). realloc, aligned allocation, and allocations above 128 KiB are unsupported. The verified subset is about 3.1K executable lines versus roughly 10K in original mimalloc. Do not summarize it as a verified replacement matching all mimalloc features and performance.

**Persistent log:** §4.2.5, p. 13, builds a circular log for persistent memory, with asynchronous append, synchronous head advancement, and multi-log atomic append. The paper reports actual integration: “It is integrated into a production codebase, which incorporates it via Cargo.toml as just another Rust crate.” After ghost erasure, “standard rustc sees only executable code and readily consumes it.” This establishes practical Rust integration for the reported system, not autonomous generation. It refines an abstract infinite log, provides crash atomicity, and detects metadata corruption under CRC assumptions. External crates such as CRC receive trusted specifications. A Serializable trait expresses byte layout and avoids extra copying. Checking takes 12 seconds single-core with a 3.9 proof/code ratio. On 128 GiB Optane, each throughput point represents 8 GiB of appends through a 4 GiB memory-mapped file, with confidence intervals. The improved version has throughput comparable to libpmemlog, but the implementations differ: verified CRC calculation versus a lock in libpmemlog.

## First reading

Read §3.2, p. 5, and §3.4, pp. 7–8. Ask: which part of a target proof needs a better abstraction, and which part only needs the right local permission or solver mode?

## Study status

Checked the material claims and quotations against the saved primary paper text. An independent reviewer checked the drafts against the primary texts. No artifact execution or empirical reproduction was performed.

## ChatGPT cross-check (2026-10-12)

The full ChatGPT answer was checked against `verus_practical.txt`. These additions hold:

- the paper explicitly limits unsafe Rust support to “a subset of unsafe Rust features” (§2, p. 3)
- the IronKV port explicitly says “We skip the protocol level” (§4.2.1, p. 10), so its result is host-level rather than a complete distributed-protocol proof
- the paper reports “does not yet reach performance parity” for the verified allocator (§4.2.4, p. 13), and says “our unmap is much slower” for the page table (§4.2.3, p. 12)

The answer also identified a Figure 9 line-count reconciliation issue; that arithmetic was not independently resolved here. Its threat ratings and recommendations are opinions.

Audited 2026-10-12 against the paper: checked every number in Figures 7-9, 4.1.3, 4.2.1-4.2.5 (line counts, times, ratios, 62/39/11 mode counts, 8 of 19 benchmarks, 128 KiB limit, 25 vs 100 lines, 1.6 and 1.8 ms per push), page and section references, the quoted passages, the EPR four steps, the VerusSync description and the solver-mode descriptions; all matched. Changed two things: original default-mode set proof now reads initial default-mode Verus proof (the paper says initial, and original is the Dafny proof); the unmarked claim that this extends the linear-ghost-types memory model is now marked as inference and tied to the paper's citation [10]. Not resolved: the Figure 9 per-system rows do not sum to its Verus total row (for example proof lines 4509+5237+5329+13703+2913 = 31691 versus 31231), as the earlier cross-check noted; the study reports the total row as printed. No Verus code in the study. Did not check the prior-tool numbers beyond those quoted. Follow-up: added a clause on the raw-pointer statement in hybrid_rust_verification.
