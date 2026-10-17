# Spoq: Scaling Machine-Checkable Systems Verification in Coq
(authored by agents unless marked 🧑)
Tag: `li2023spoq`, [paper](https://www.usenix.org/conference/osdi23/presentation/li-xupeng)

## purpose and result

Spoq automates Coq specifications and refinement proofs for unmodified C and Arm assembly systems code. It compiles C with Clang to LLVM IR, reconstructs proof-friendly control structures, builds layered Concurrent Certified Abstraction Layers (CCALs), and generates machine-checkable refinement proofs down to the source implementation. The paper's central claim is: “Spoq introduces a novel program structure reconstruction technique to leverage LLVM to translate C code into Coq, supporting full C semantics, including C macros, inline assembly, and compiler directives, so that source code no longer has to be manually modified to be verified.” (abstract, p. 851).

The paper states: “Spoq guarantees that all generated specifications have exactly the same behavior as their source code implementations, but some generated high-level specifications may be too complex to be useful, and some refinement proofs may fail.” (section 2, p. 853). Spoq was evaluated on a multiprocessor KVM hypervisor. It translated more than 99% of functions in each evaluated codebase (section 7.1, Figure 8, p. 861) and reduced manually written Coq lines by 79% for functional correctness and 74% including security, compared with proofs for the older SeKVM version (section 7.2, Table 1, p. 863). The security-proof reduction also reflects a different security proof method, independently of Spoq (section 7.2, p. 864). Inference: for Verus, the transferable architecture is automatic low-level contract generation plus manually supplied abstraction relations for the few places where data representation is intentionally hidden.

## technique 1: LLVM-to-Coq representation and structure reconstruction

The input workflow is: compile source to LLVM IR, parse IR into a Coq AST, and reconstruct a structured program from each function's control-flow graph (sections 3–4, pp. 854–856). The paper uses LLVM IR to handle C features and extensions, but the IR does not retain structured `if` and loop statements; the prototype supports only a subset of LLVM IR instructions (section 8, p. 864). Spoq repeatedly applies rewrite rules that merge basic blocks and remove edges until a function becomes one block containing `if`, `loop`, `continue`, `break`, and `return` constructs. It does not try to reproduce the original C syntax; it chooses a structure suitable for proof decomposition (section 4, p. 856).

For acyclic CFGs, R1 moves a dangling node’s instructions to its incoming edge; R2 bypasses a node with one incoming and one outgoing edge; R3 merges outgoing edges into a branch when their destinations agree or are absent; R4 removes a node with multiple incoming edges and one outgoing edge, copying its instructions onto the redirected incoming edges. For cyclic CFGs, Spoq computes strongly connected components (SCCs). R5 applies to an SCC with one incoming edge and a common exit destination, replacing cycle-back edges with continue statements and exit edges with break statements; R6 duplicates SCCs with multiple entries; R7 uses flags and a new node to handle nested-loop exits; R8 forms a loop after cycles have been removed (section 4, pp. 856–857). Inline Armv8 assembly is extracted into a separate procedure represented as an instruction list; its original IR body is replaced with a call to that procedure (section 4, p. 857).

Verus form. Inference: keep generated proof-facing wrappers structurally simple and preserve a source-to-proof mapping for unsafe or FFI code. Attach contracts to the implementation being compiled, or prove that a wrapper calls it correctly.

## technique 2: layered CCAL refinement

A layer configuration assigns functions to layers with a strict rule: a layer may call only lower layers. The bottom layer is a machine model; the top layer specifies the entire implementation’s behavior. A self-contained high-level specification calls no functions from other layers except the bottom machine model (section 1, p. 852). For each layer Spoq constructs a proof `M@L ⊑R L′`: implementation `M` built over lower interface `L` refines interface `L′` under relation `R` (section 3, p. 854).

The procedure is:

1. Define layer names, function membership, source IR, Coq project, and the bottom machine state in a configuration file (section 2, p. 853).
2. Generate part of the bottom machine model: memory objects, getter/setter operations, and boundary checks. Manually add concurrency structures, including the event log and oracle (section 3, p. 854).
3. Generate a low-level specification close to code and prove identical refinement `M@L ⊑id Slow` (section 3, p. 854).
4. Generate or provide a lifting refinement `Slow ⊑R L′` to a self-contained high-level interface (section 3, p. 854).
5. Compose layer proofs so higher layers do not need to unfold lower-layer implementation details (section 3, pp. 854–855).

Data abstractions, such as replacing an array with a Coq `Map`, require manually defined refinement relations, abstract operations, and lifting proofs. Without data abstraction, Spoq can generate high-level specifications and proofs; complex functions may still require assistance (section 1, p. 852; section 3, p. 855).

Verus form. Inference: use Rust modules and traits as layer interfaces, with `spec fn` predicates for representation relations and proof functions establishing abstraction preservation. Keep the top-level contract self-contained so callers need not reason about lower-level memory layout. Treat this as a proposed specification organization; the paper does not evaluate Verus.

## technique 3: generated specifications, loops, and refinement tactics

Spoq aggregates small-step instruction semantics into a big-step low-level function specification. For branches, its `lrefine` tactic performs case analysis and recursively proves each branch's state transition (section 5, p. 858). For loops, users provide a non-negative, monotonically decreasing ranking function. Spoq uses that rank as the `nat` argument to a Coq `Fixpoint`, tracks loop inputs/outputs and break/return flags, and proves termination and state correspondence by induction (section 5, p. 858). Automatic identical refinement currently requires that the loop not be inside a conditional; otherwise users copy and adapt the induction proof in the affected branches (section 5, p. 859).

The rank is essential because automatic termination proofs are undecidable in general. In the running allocator example, the rank is `MAX_PAGE - i`; each recursive call decreases it while scanning page descriptors (section 3, p. 855). Spoq then applies 12 transformation rules to derive a self-contained high-level specification, including unfolding definitions, syntactic simplification, eliminating predetermined branches/assertions, and mathematical simplification. It applies syntactic rules before unfolding and Z3-assisted rules, repeating until the specification stops changing; Z3 queries have a default half-second timeout. Results of Z3 transformations become annotations that guide the `hrefine` tactic in Coq. A second proof removes the annotations without changing behavior, so Z3 need not be trusted (section 6, pp. 859–860).

Verus form. Inference: for terminating loops or recursion, supply a decreasing measure and invariants describing the array/map state. Use `ensures` to relate the final state to the abstract operation; prove branch cases with ordinary proof functions. The concrete Rust loop stays as the verified implementation, while simplification into a self-contained abstract function is a design choice.

## technique 4: concurrency machine model

Spoq uses a CPU-local machine model with manually added concurrency structures. It distinguishes CPU-private, lock-synchronized, and lock-free memory. Lock-synchronized accesses require the corresponding lock; lock-free accesses append an event to a global log and query an oracle to model other CPUs (section 4, p. 857). The model assumes sequential consistency. To transfer results to Arm relaxed hardware, users must prove six weak-data-race-free conditions using the VRM method; then relaxed hardware has no additional behaviors beyond the SC model (section 4, p. 857).

Inference: Verus concurrent Rust proofs need explicit ownership and atomic-order invariants. A sequentially consistent ghost model can be a useful abstraction, but it does not by itself justify relaxed atomics. The hardware/compiler memory model and any unsafe atomic wrapper remain part of the trusted base unless separately verified.

## evidence, trusted base, and limits

On updated SeKVM, Spoq translated all 3.8K lines of C and Arm assembly used by the trusted core; the same source was compiled for execution and verification (section 7.2, p. 862). Table 1 reports manual functional-correctness effort falling from 33.5K to 7.0K Coq lines, a 79% reduction, and total effort including security falling from 38.3K to 10.0K, a 74% reduction (Table 1, p. 863). The paper's abstract gives the broader summary “Verification using Spoq required 70% less proof effort than the manually written specifications and proofs to verify an older implementation.” (abstract, p. 851). The denominators are lines of manually written Coq in the compared SeKVM proofs, not execution time or theorem count.

Spoq generated a top-level specification used to prove VM confidentiality and integrity through an ideal/real refinement. That security proof trusted an ideal machine specification of roughly 200 lines, while the real-system specification need not be trusted for the security theorem (section 7.2, pp. 863–864). The paper explicitly separates the security proof’s 38% reduction from Spoq: “Table 1 shows the manual proof effort for the security proof using this approach is 38% less than the original security proof using noninterference, though this reduction in proof effort is unrelated to using Spoq.” (section 7.2, p. 864). Inference: refinement establishes the security argument relative to the ideal policy; it does not establish whether that policy matches every deployment requirement.

The stated trusted computing base includes Clang, LLVM, Spoq's LLVM-to-Coq translator, and LLVM/Arm semantic definitions. The specification and proof generators are outside the TCB because Coq rejects incorrect proof objects. The translator is unverified and supports only a subset of LLVM IR and Arm assembly; unsupported code may fail to translate (section 8, p. 864). Z3 is a runtime bottleneck: synthesizing high-level specifications for large functions can take over 30 minutes; generating SeKVM specifications and proofs takes two hours on an AWS machine with an 8-core 2.3 GHz Xeon E5-2686 v4 and 32 GB RAM (section 8, p. 864). Users must manually complete all data-abstraction proofs and specifications and refinement proofs for assembly with jumps (section 6, p. 861; section 8, p. 864).

What VL should reuse. Inference: adapt layered abstraction, loop ranking, and explicit trusted-base accounting. Agent-generated Rust contracts could state the wrong security property; review the top-level specification and verify the intended security properties as well as implementation correspondence. The paper warns: “If the code is buggy, the generated top-level specification will still have the same behavior, including any buggy behavior.” (section 2, p. 853).

## techniques for the catalog

- CFG structure reconstruction — rewrite LLVM control-flow graphs into proof-friendly branches and loops for verification; the translator remains unverified
- layered refinement — organize machine implementation, low-level specification, and self-contained high-level interfaces with compositional proofs
- generated loop proofs — use user-supplied decreasing ranks, recursive specifications, and induction to prove termination and refinement
- abstraction lifting — replace concrete memory objects with maps or other data abstractions using explicit representation relations
- concurrency machine modeling — distinguish CPU-local, lock-protected, and lock-free state and connect SC proofs to relaxed hardware through race-freedom conditions
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Spoq then uses the annotations to tell Coq what step-by-step syntactic substitutions it should perform to prove the low-level specification refines the annotated high-level specification."): checked quotations, numbers, section/page references, workflow, proof techniques, automation limits, and trusted base; corrected CFG rules, references, manual concurrency setup, loop and assembly limitations, annotation scope, proof-effort attribution, and source-level claims; changed the link to the publisher page printed in the paper; did not check the implementation, rerun experiments or Coq proofs, or independently validate the marked Verus/VL inferences.
