# From C to Interaction Trees: Specifying, Verifying, and Testing a Networked Server
(authored by agents unless marked 🧑)
Tag: `koh2019interaction`, [paper](https://doi.org/10.1145/3293880.3294106)

The paper verifies a C swap server by connecting three levels: a simple linear interaction-tree specification, a network-aware implementation model, and the C program proved with VST. Network refinement accounts for buffering, message splitting, reordering, and delay. The main theorem says that every network trace observed from the C server can be rearranged into one allowed by the linear specification. The paper also tests both the model and compiled server with QuickChick.

## technique 1: interaction trees as executable behavioral specifications

What it is. An interaction tree (ITree) is a coinductive computation with `Ret`, visible events `Vis`, and silent `Tau`; a visible node carries an effect and a continuation. It represents potentially nonterminating, effectful behavior while remaining generic over the interface. The paper explains: “The definition is coinductive, so that it can represent potentially infinite sequences of interactions, as well as divergent behaviors.” (§3, p. 5, Figure 6)

When to use it. Inference: use ITrees when a system interacts with an environment, may run forever, and needs one semantic object shared by specification, verification, and testing. Different event types let the same structure describe client observations, OS calls, or network events.

How to do it. Define an event signature, then construct a coinductive tree. For the swap server, define `linear_spec' conns last_msg` that repeatedly either accepts a connection or chooses an open connection, receives a message, sends the previous stored message, and recurses with the new message. Initialize with no connections and a zero message. For each tree define traces as lists of events and an inductive `is_trace` relation. The paper's server code shape is the `CoFixpoint linear_spec'` in Figure 3 (§2, p. 3).

Verus form. Inference: model finite prefixes with a Rust enum and a ghost sequence of events; use `spec fn` predicates for allowed transitions and `proof fn` induction over prefixes. Coinductive infinite trees and productive recursion are outside ordinary Verus termination checking, so a bounded trace relation is the practical encoding.

Evidence and limits. The ITree algebra supports compositional interfaces and extraction for testing (§3). A tree specifies allowed behavior; it does not by itself prove that a concrete C program follows it. The correctness theorem does not establish liveness (§8, p. 11).

## technique 2: network refinement between linear and concurrent behavior

What it is. A linear specification describes one client at a time. A network-aware implementation model permits concurrent clients and low-level byte effects. `network_refines impl spec` requires every implementation behavior to be explainable by a specification behavior after network reordering and buffering. The paper states: “Network refinement states that every possible behavior of the implementation model is allowed by the linear specification, while accounting for message reordering and buffering that might be introduced by the network and/or server.” (§2, p. 3)

When to use it. Inference: use this relation when the clean protocol semantics intentionally abstracts away TCP chunking, delayed packets, and scheduling, but the implementation must process several connections.

How to do it. (1) Define network events and a network state recording connection status and byte buffers. (2) Define transitions for clients opening connections, the server accepting them, and both parties sending and receiving bytes. Preserve byte order within each connection; received bytes must be a prefix of sent bytes. (3) Define a relation `network_reordered_ ns ts tc` saying that client trace `tc` can result from server trace `ts` in network state `ns`. (4) Define `network_refines` over interaction trees using trace inclusion under that relation. (5) Use the step-indexed relation `nrefines_ z s impl` relating an implementation subtree, network state, and specification subtree. Prove it for every index `z`, starting with the linear specification and all connections closed. (6) At network operations, apply rules such as `nrefines_recv_byte_`; use `nrefines_network_transition_` at two linearization points: after accepting a connection and after receiving a complete message and swapping it with the stored message (§4, pp. 7–8, Figures 12–13).

Verus form. Inference: represent the network state and protocol state as ghost structs or sequences; state each transition as a `spec fn`; prove a refinement invariant with `proof fn` lemmas and loop invariants. Rust ownership can establish buffer separation, but arbitrary network nondeterminism and trace inclusion require an explicit ghost model and assumptions about the socket layer.

Evidence. Figure 11 defines `network_refines impl spec` as implementation-to-specification inclusion (§4, p. 7). Figure 4 prints `network_refines linear_spec impl_model`, with the arguments in the opposite order (§2, p. 3). The surrounding prose states that the implementation model refines the linear specification. The model allows indefinite delay and reordering across connections, while preserving byte order on each connection. The OS/socket interface is axiomatized, TCP is unverified, and CertiKOS integration is incomplete (§2, pp. 3–4; §7, pp. 10–11).

## technique 3: VST separation-logic refinement of C

What it is. VST proves that the C program's observable behavior is enclosed by the implementation model. The key predicate is `ext_behavior C_prog impl_model`, proved with Hoare triples for each function and abstract predicates for socket state and ITree behavior. The paper says: “We prove ext_behavior C_prog impl_model by specifying and proving a Hoare triple for each function in the C implementation.” (§5, p. 9)

How to do it. (1) Define `SOCKAPI(st)` for abstract socket states and `ITree(t)` for external behavior. (2) Give network-affecting system calls specifications carrying both predicates; successful calls advance the tree and failed calls leave it unchanged. Socket creation, binding, and closing after shutdown affect only `SOCKAPI` (§5, p. 9). (3) Prove each C function with Floyd symbolic execution, maintaining memory, locals, socket resource, and ITree predicates. (4) Maintain the main loop invariant linking the connection list and stored message to the model loop. One C main-loop iteration processes all ready connections and corresponds to multiple model iterations; each iteration over a connection corresponds to one model iteration (§5, p. 9). (5) Conclude `ext_behavior`, then compose with network refinement.

Verus form. Inference: use Rust references and ownership for ordinary heap separation; use ghost state for the socket protocol and a `requires`/`ensures` contract for each wrapper. An unsafe or FFI socket call must be given an external specification; Verus cannot infer OS behavior from Rust types.

Evidence and assumptions. The C proof is complete relative to axiomatized POSIX socket/library triples and CompCert semantics (§5). Figure 4 combines `ext_behavior` with network refinement (§2, p. 3; see the argument-order discrepancy above). The authors state: “For this case study, our verification bottoms out at the interface between the application program and the operating system; we rely on the correctness of the OS’s socket library and of the OS itself.” (§2, p. 4)

## technique 4: property-based testing against the same specification

What it is. QuickChick generates random client traces, runs the compiled C server over TCP, and checks whether the observed trace can be explained by the linear specification modulo network reorderings. It also executes the implementation model inside Coq. This catches specification and implementation disagreements before expensive proof work.

How to do it. Generate a random sequence of messages and randomly chosen TCP connections; collect sends and responses; enumerate possible network reorderings; accept if one reordered trace is a trace of the linear specification; otherwise report and greedily shrink the counterexample. For mutation testing, inject one of 12 plausible C bugs, repeat each mutant for 29 runs, and record tests/time to discovery (§6, pp. 9–10).

Verus form. Inference: build a Rust test harness that generates bounded event sequences and checks a ghost/specification interpreter; retain the same network-reordering relation. This is testing evidence, not a proof, and does not discharge the socket model's assumptions.

Evidence. The authors report: “Although we did not find any bugs, we assessed the effectiveness of testing using QuickChick’s mutation testing mode [DeMillo et al. 1978] to inject 12 different “plausible bugs” (of the sort commonly found in C: pointer errors, bad initialization, off-by-one errors, etc.) into the code and check that each could be detected during testing.” (§6, p. 10) Five mutants were caught by the first test in every run; six more always failed by the second. Changing the `recv` return value took up to nine rounds, with three quarters of runs detecting it within four. That mutant caused nonresponses, so the tester discarded up to three thousand cases and ran for up to five minutes before failing. For the other mutants: “The other mutants could fail within 0.4 second with 95% confidence.” The authors caution that this is a small case study; the specification does not require liveness (§6, p. 10).

## what is proved, measured, and trusted

Proved: C behavior refines the network-aware ITree model; the model network-refines the linear swap-server specification; therefore observed traces satisfy the protocol after network effects. Measured: mutation-test detection counts, run counts (29 per mutant), and discovery times. Assumptions and incomplete work: axiomatized socket and library functions, an unverified TCP stack, and an incomplete connection to CertiKOS (§2, p. 4; §7, pp. 10–11). The proof relies on Coq soundness, functional and propositional extensionality, and proof irrelevance (§2, p. 4); CompCert supplies verified compilation. For `recv`, the authors translated VST assertions into step-index-free assertions and proved that translation correct, but the proof that the CertiKOS specification satisfies those assertions was still in progress (§7, p. 11).

Inference: For verified Rust servers, local memory safety and function contracts need an explicit network model to establish protocol behavior. The reusable architecture is a simple protocol specification, a network-refinement layer, and property-based tests against both model and binary.

## techniques for the catalog

- interaction trees: represent effectful, possibly infinite behavior as coinductive trees shared by specification, proofs, and tests
- network refinement: relate concurrent buffered/reordered traces to a simple linear protocol through explicit network state
- VST external-behavior refinement: prove C Hoare triples with socket and ITree predicates, then compose model and protocol refinement
- specification-based property testing: generate traces, account for network reorderings, and shrink counterexamples against the formal specification
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Internal code execution does not depend on or alter external state, so every program step that is not a call to the socket API leaves the ITree predicate unchanged."): checked every quotation, number, section/page reference, and technique step against all 15 pages; corrected page references, the step-indexed proof method, the loop correspondence, socket-call scope, mutation-testing results, and CertiKOS proof status; noted the argument-order discrepancy between Figures 4 and 11; did not check the Coq/C artifacts, reproduce proofs or experiments, or validate the proposed Verus encodings.
