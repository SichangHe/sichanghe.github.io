# Formalizing Memory Accesses and Interrupts
(authored by agents unless marked 🧑)
Tag: `achermann2017formalizing`, [paper](https://www.semanticscholar.org/paper/32b159fd56dc1a5c3f62e064fd53d5c1e113f33a)

## what the paper proves and builds

The paper gives a formal, static model of how memory addresses and interrupt vectors travel through heterogeneous hardware. Its central claim is that ordinary virtual-to-physical-address reasoning is inadequate for modern systems. The authors define a decoding net, formalize it in Isabelle/HOL, instantiate it for OMAP4460 and x86 systems, and prove termination and semantics-preserving transformations. They state: “The model gives an unambiguous interpretation of memory accesses and interrupts, its applications include a foundation for system software verification, identifying problematic hardware designs, and generating correct-by-construction OS code.” (Section 1, PDF p. 66).

## technique 1: decoding-net model of hardware

what it is and when to use it

Represent hardware as a directed graph of nodes. A node has an accepted-address set and a translation relation from an input address to output names. A name is `(nodeid, addr)`, so the same numeric address in different address spaces remains distinct. The same graph represents memory accesses and interrupt delivery; accepting nodes are resources or CPUs, while translating nodes are MMUs, interconnects, caches, or interrupt controllers. Use this model whenever software correctness depends on address aliases, remapping, multicast interrupts, or topology.

how to apply it

1. Enumerate software-visible hardware components as node identifiers (Section 2, PDF p. 68).
2. For each node, define `accept` and `translate`; a translation maps an input address to one or more names (Section 2).
3. Write the net in the concrete syntax: accepting and mapping blocks, optional overlays, and named nodes (Section 2, PDF pp. 68–69).
4. Define `decode`, `accepted`, and recursive `resolve`; resolution returns accepting names reachable from the starting name (Section 2, PDF p. 68).
5. Model platform-specific aliases and interrupt fan-out explicitly. For OMAP4460, GPTIMER5 resolves to multiple names including `(PA9, 0x40138000)` and `(L3, 0x49038000)`, and SDMA interrupt 2 is multicast before masking and delivery (Section 3.1, PDF p. 69–70).

The paper emphasizes that “All definitions are formalized in Isabelle/HOL, and all results we present are proven in the accompanying Isabelle theories.” (Section 2, PDF p. 68).

Verus form

Inference: Use Rust structs for node identifiers, address blocks, and translation maps, with a ghost model of the net. Define a recursive or iterative spec function for `resolve` only when termination is proved. Use `requires`/`ensures` on executable lookup routines and proof functions for graph invariants. Verus can verify the data-structure algorithm, but hardware behavior, device register effects, and interrupt delivery remain trusted unless represented as an explicit state machine. The paper's Isabelle syntax and total-function logic do not carry over directly.

evidence, assumptions, limits

The model is static: the paper says “Dynamic aspects such as concurrency and caching can be modeled on top of the decoding net, something we plan to tackle in the future.” (Section 2, PDF p. 68). It therefore does not establish cache coherence, races, access permissions that change at runtime, or read/write-specific paths. Its examples cover three real systems and additional appendix models, but their fidelity depends on hardware documentation.

## technique 2: ranking-function proof of resolution termination

what it is and when to use it

`resolve` recursively follows the decode relation, which may contain graph loops. Termination is characterized by a well-founded ranking function from names to natural numbers that decreases on every reachable decode step. Use this before implementing recursive resolution or claiming that a hardware topology has a total view function.

how to apply it

1. Define `wf_rank(f,n,net)` so every decode step reachable from `n` strictly decreases `f` (Section 4.1, PDF p. 74).
2. Prove `f` is bounded below by zero; then no infinite path exists.
3. Establish the equivalence `∃ f. wf_rank(f,n,net) ↔ dom(net,n)`, where `dom` means resolution terminates (Section 4.1).
4. Use the resulting theorem to replace graph reachability with the operational `resolve` result. The paper states: “The result of any well-defined resolution is the set of names reachable via the decode relation ... that refer to actual resources.” (Section 4.1, PDF p. 74).

Verus form

Inference: encode the rank as a ghost `spec fn` returning `nat`, require a rank-decrease lemma for each transition, and prove loop termination with a decreasing measure. Use `decreases` on recursive proof or executable functions where appropriate; do not make a runtime proof function part of the executable path. If a real platform has a cycle with no decreasing address or configuration measure, Verus should expose that as an unproved precondition rather than silently accepting recursion.

evidence, assumptions, limits

The termination and equivalence results are Isabelle/HOL theorems backed by the accompanying theories (Section 4). A platform model can still be wrong, and dynamic cache behavior is outside the theorem's assumptions.

## technique 3: view-equivalent normalization and refinement

what it is and when to use it

The graph is expressive but expensive to query. Normalize it into a flatter representation while preserving every observer's visible resources. The paper splits nodes into resource-only and mapping-only nodes, then merges mapping nodes. Two nets are view-equivalent when all observers in a set obtain the same `resolve` result modulo renaming.

how to apply it

1. Define observer set `S` and the view-equivalence relation using `resolve` (Section 4.2, PDF p. 74).
2. Choose a fresh offset `c`; replace accepting node `nd` with a mapping node `nd` and resource node `nd+c`, moving accepted addresses to the latter (Section 4.2).
3. Prove the semantic equation `(nd ↦ nd+c, net) ∼S (0, split(net))`, which says the split net preserves views (Section 4.2, PDF p. 74).
4. Implement the corresponding syntactic transformation `splitC` on concrete declarations.
5. Prove refinement by commutation with parsing: `split(parse(s)) = parse(splitC(s))` (Section 4.2, PDF p. 75).
6. Combine semantic equivalence and commutation to show the concrete transformed model preserves every physical view.

Verus form

Inference: represent parsed syntax and semantic nets as separate Rust types, define a ghost `parse` and `view`, and prove `view(parse(splitC(s))) == view(split(parse(s)))`. Use `ensures` on the transformation and proof functions for the commutation lemma. Verus can check finite-map and sequence transformations; it does not inherit Isabelle's existing net theorems or prove that undocumented hardware matches the parsed input.

evidence, assumptions, limits

The paper reports verified equivalence-preserving transformations and says the same approach covers flattening in the Isabelle sources. It does not provide a performance measurement for the normalizer. The transformation preserves views only for the modeled observers and assumes fresh node labels and a correct parser.

## what is measured, trusted, and still missing

The paper is primarily a formal-model and proof contribution, not a throughput evaluation. It proves model properties and transformations in Isabelle/HOL; it does not report denominated runtime benchmarks, bug counts, or end-to-end OS verification. Trusted elements include Isabelle/HOL, the parser and hardware descriptions, and the assumption that static `accept`/`translate` relations capture the relevant behavior. The roadmap explicitly leaves dynamic caches, changing page tables and interrupt-controller configuration, transaction type differences, safe reconfiguration sequences, and performance annotations for future work (Section 6, PDF pp. 76–77).

Inference: the threat to VL is high for low-level Rust that configures MMUs, IOMMUs, interrupt controllers, or DMA. A Verus contract over a numeric physical address alone can be unsound when aliases and topology are omitted. VL should reuse this graph-and-view abstraction and prove configuration transformations, rather than inventing an address model limited to one core. Inference: the product gap is a reusable Verus encoding plus concrete models for supported platforms and dynamic reconfiguration; the paper already covers the core static semantics and should not be redone as a generic literature contribution.

## techniques for the catalog

- decoding net — model address and interrupt routing as node acceptance and translation over qualified names
- ranking termination — prove recursive resolution total with a natural-valued rank that decreases on every decode step
- view-equivalent normalization — flatten or split a hardware graph while preserving every observer's resolved resources
- concrete refinement — prove syntax-level transformations commute with parsing and preserve semantic views
Checked 2026-10-15 against paper achermann2017formalizing: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
