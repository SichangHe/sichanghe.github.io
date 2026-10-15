# Synthesizing Inductive Invariants for Distributed Protocols via IC3 and Large Language Models
(authored by agents unless marked 🧑)
Tag: `cao2026synthesizing`, [paper](https://www.semanticscholar.org/paper/051b782eadefdb2b52f4735555f6a1cfc1fbbc05)

## core technique
IC3Syn combines property-directed reachability with LLM proposals for TLA+ protocol invariants. The paper says: “IC3Syn combines a symbolic IC3 controller, which decomposes invariant synthesis into focused blocking tasks and an LLM which provides protocol-level reasoning that IC3 alone lacks for TLA+ specifications.” (abstract, p. 1) The motivation is that directly asking for a complete invariant is brittle: “the clauses must satisfy initiation, consecution, and safety implication, and any gap in the conjunction invalidates the entire invariant.” (section 1, p. 2)

Inference: For Verus, the transferable idea is to ask an LLM for one local lemma that blocks a concrete counterexample, while Verus checks initiation, loop preservation, and the final safety implication.

## applying IC3Syn

when to use it

Use the method for transition systems with a safety property and a finite executable instance useful for counterexamples. The source language here is TLA+, with `Init`, `Next`, and `Safety`; the final proof is checked for the unbounded protocol in TLAPS. It does not require manually curated predicate templates.

steps from the paper

1. Initialize IC3 frames with the initial condition and safety property. Algorithm 1 gives `F ← [{Init}, {Safety}]` and an empty clause memory.
2. Find a bad state at the frontier of the current frame by the IC3/PDR controller. Search backward through predecessor states in earlier frames.
3. When a predecessor-free state is reached, send the full TLA+ specification and the current batch of bad states to the LLM. Ask for quantified, protocol-level blocking clauses. The paper states: “The LLM module receives the full TLA+ specification along with the current batch of bad states, and proposes candidate blocking clauses expressed as quantified TLA+ predicates over protocol-level variables.” (section 3, p. 7)
4. Validate each candidate against reachable states on the configured finite instance with TLC. Clauses falsified by reachable states are discarded; counterexamples are returned as feedback. Valid clauses are ranked by how many bad states they exclude and admitted to the frame.
5. Add accepted clauses to the current frame and propagate them forward. Repeat frontier blocking and propagation.
6. If repeated LLM attempts fail, add an exact aggregate blocker negating all accumulated bad states. This fallback preserves finite-instance completeness.
7. Stop when two adjacent frames coincide. Extract their conjunction as the candidate invariant, then prove it inductive for the full unbounded protocol in TLAPS. The abstract reports that “the invariants synthesized on finite instances are shown in TLAPS to be inductive for the full unbounded protocol, thereby establishing safety.” (abstract, p. 1)

Verus form

Inference: Treat a Verus function's precondition as `Init`, its transition or loop body as `Next`, and its postcondition as `Safety`. Maintain a set of candidate `ensures` predicates. Use failing Verus assertions or counterexamples to ask for a lemma that excludes the state, then validate with `assert` and proof functions. Replace TLC's finite-state screening with bounded test harnesses only as a heuristic; the sound check remains Verus. Verus has no IC3 frame API, so frame storage and candidate ranking would be an external synthesis driver.

## evidence and limits

The evaluation covers 29 distributed protocols across consensus, reconfiguration, and client-server systems, including MongoLoglessDynamicRaft (MLDR), an industrial-scale Raft reconfiguration protocol. The paper reports discovery for all 29 and highlights MLDR and a complex Paxos variant as cases where compared tools report no solution. These are counts over the 29-protocol benchmark named in the abstract; “all 29” means candidate invariants were discovered, while the unbounded TLAPS claim is the proof condition.

Inference: Finite TLC success alone would not establish an unbounded protocol theorem; the paper's TLAPS induction step is essential. The method assumes the TLA+ model, finite instance, TLC reachability, and translation to TLAPS are faithful. LLM clauses can be irrelevant or overgeneral; the exact blocker guarantees progress but may produce large invariants. The evaluation compares against Endive, IC3PO, SWISS, and DistAI, but benchmark performance is not a probability of correctness.

## what is proved and trusted

IC3's frame invariant and clause validation establish that accepted clauses exclude only states inconsistent with the finite reachable behavior. The final safety claim depends on TLAPS proving initiation, consecution, and implication for the unbounded model. Trusted components therefore include TLC/Apalache semantics, the IC3 controller, clause parser, and TLAPS kernel; the LLM is not trusted because every clause is checked. Inference: In VL, generated Rust lemmas should be retained as source and checked by Verus, with the synthesis driver treated as untrusted.

## threat to VL and prior work

Inference: Product threat is medium to high for distributed-state specifications: a plausible but incomplete invariant can hide a missing transition case, and bounded checks can miss unbounded failures. The IC3 decomposition reduces this risk by making each clause solve a concrete frontier state. VL should reuse counterexample-focused lemma generation and exact fallback blockers. It should not duplicate mature finite-state screening or IC3 frame management unless Rust/Verus-specific extraction is needed.

## techniques for the catalog

- IC3/LLM blocking synthesis: decompose invariant discovery into frontier bad states and validate LLM clauses symbolically
- finite-instance clause screening: reject clauses falsified by reachable TLC states and feed counterexamples back to synthesis
- exact aggregate fallback: negate all accumulated bad states when LLM proposals fail, preserving finite-instance completeness
- unbounded induction handoff: prove the extracted invariant with TLAPS after finite-state search

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
