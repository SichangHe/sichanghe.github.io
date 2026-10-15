# AutoGraphForge: Towards Automated Graph Theory Discovery
(authored by agents unless marked 🧑)
Tag: `pastorek2026autographforge`, [paper](https://arxiv.org/abs/2609.03478)

## generate–refute architecture
AutoGraphForge combines conjecture generation, novelty filtering, counterexample search, Lean formalization, and neural proving. The first three stages run at scale; formalization/proving is implemented and sanity-checked but not evaluated on the survivor set. The architecture keeps a small evolving snapshot T for generation and a much larger refutation corpus. The paper states, “The first two stages are combined into a generate-refute loop” (Introduction, p.3), and Figure 1 shows that counterexamples are fed back into T for later rounds.

To apply the generate–refute method:

1. represent each graph as a row containing computed invariants and class predicates
2. initialize T with expressive TxGraffiti graphs; generate candidate numeric inequalities or Sophie boolean conditions from T (§3.2, p.6)
3. apply Dalmatian dominance, Morgan superclass filtering, and Touch ranking to remove weaker/restricted candidates and prioritize tight ones (§3.3, p.7)
4. reject candidates implied by known relations using the novelty table and a linear-programming certificate
5. test each remaining candidate against the static corpus, parametric families, random graph models, and specialized searchers (§3.4, p.8)
6. when a counterexample is found, add it to T and start another round; after a candidate survives the configured rounds, export it to Lean
7. have a human review survivors and retain the graph, theorem, and proof artifacts

The authors warn that “true on the table” is evidence rather than a general theorem because T is finite (§3.4, p.8). The refutation corpus has 348,207 graphs: 28,859 from House of Graphs, 273,192 connected graphs with 2–9 vertices, and 46,156 special families (§3.4.1, p.8). It stores 59 columns: 45 numeric invariants and 14 booleans; generation uses only the evolving T, never the complete corpus.

## novelty and implication filtering
For a candidate `f ≤ R(g)`, the filter asks whether a convex combination of known bounds implies it. It searches nonnegative weights summing to one, nonnegative invariant slack multipliers, free multipliers for class identities, and a constant slack such that the candidate-minus-aggregate identity holds coefficient-wise (§3.3, pp.7–8). Linear-program feasibility is the certificate: if feasible, the candidate is a known rediscovery and is removed from novelty survivors. The same test handles both directions of equalities, contrapositives for necessary conditions, and class inclusion. The known-relation table has 559 entries, closed under simple transitivity (Introduction, p.3).

Inference: This is a reusable soundness pattern: only admit a theorem or bound when its premises hold for the whole hypothesis class, not merely for the sampled rows. The paper explicitly notes that class identities are admitted only when they “strictly vanish on the whole domain the candidate is quantified over” (§3.3, p.7). The filter still permits trivial or definitional survivors; the authors inspect 100 high-touch candidates and classify 49 as recognized rediscoveries, 2 as subsumed, 1 as decorative, 28 as promising universal, and 20 as promising class-conditioned (Table 2, p.11).

## counterexample-search backends
Every search backend maximizes a margin: for an inequality, `f(G) − R(g)(G)`; for a Sophie condition, the margin is positive when the hypothesis holds but the conclusion fails (§3.4.2, p.9). The techniques are:

- SMT: encode graph edges as Boolean variables and invariant constraints as pseudo-Boolean formulas for Z3
- cross-entropy: sample graphs from per-edge probabilities, keep an elite fraction with largest margin, and nudge probabilities toward elite edge frequencies
- variable-neighborhood search: alternate k-edge shakes with greedy one-edge ascent, resetting k after improvement and increasing it after stagnation
- Monte Carlo tree search: explore edge-addition/deletion actions with an upper-confidence bound and estimate leaves by random rollouts
- simulated annealing: accept some worsening edge changes early, then cool toward greedy improvement
- deep reinforcement learning: train an edge-selection policy with reward equal to refutation margin

The fixed and generated datasets are tried before specialized search. A found counterexample is persisted and changes all subsequent candidate generation. Thus each round is counterexample-guided inductive refinement, while no finite round proves universal truth.

## deterministic Lean export and kernel checking
A surviving conjecture is already a structured relation between named invariants and class predicates, so `pipeline/lean_export.py` maps invariant columns to Lean names, class predicates to hypotheses, and relations to Lean syntax. It emits a theorem skeleton, for example a `zeroForcingNumber ≤ totalZeroForcingNumber` goal, with `sorry` so Lean can check statement elaboration. The paper emphasizes, “The output is a sorry-terminated skeleton that the Lean kernel elaborates to a type-correct goal, not a certified proof” (§3.5, p.10). Proof search then uses DeepSeek-Prover-V2-671B and OProver-32B; every completed proof is kernel-checked against mathlib4 and the GraphInvariants preamble and rechecked from a standalone `.lean` file.

Two trivial inequalities (`δ ≤ Δ` and `ω ≤ n`) passed this independent check. No survivor-wide proof evaluation exists yet. The authors state, “the formalization-and-proving stage is implemented and integrated (§3.5) but has not yet been run on the candidate conjectures” (Discussion, p.15). Custom zero-forcing definitions are in the preamble and outside the provers' training distribution, so proof search is expected to be the hardest stage. The only stated trust assumption in export is that preamble definitions match intended invariants; skipped candidates use unsupported invariant/class names.

## Verus form and implications
Inference: Verus can adopt the same staged architecture for Rust properties. Represent a candidate invariant as a `spec fn` over a ghost or mathematical model, state class assumptions with `requires`, and prove the relation with a `proof fn` and `ensures`. Counterexamples are executable Rust tests or model instances that falsify the postcondition; each surviving candidate must then pass Verus, where loop `invariant` declarations preserve inductive facts. The Lean exporter's deterministic mapping corresponds to generating a Verus theorem signature, but `sorry` cannot be used as evidence: a Verus function with an unproved body or external specification would be an assumption, not a completed proof.

Inference: the LP novelty certificate transfers as a pre-proof redundancy filter over known Verus lemmas, while the six graph searchers transfer as domain-specific counterexample generators. What does not carry over is Lean's kernel, mathlib graph definitions, and the paper's GraphInvariants preamble. Verus's trusted boundary additionally includes Rust/Verus translation, solver behavior, erasure, and external-library contracts. A VL product should persist every counterexample and every accepted proof artifact, as AutoGraphForge does, and should label unsupported models as unknown.

Inference: The threat to agent-written verified Rust is medium-to-high for discovery and specification: generate–refute can expose false conjectures cheaply, but it cannot establish correctness without a complete model and proof. The paper's 6,522 survivors are not 6,522 theorems; 49 of 100 inspected top candidates were already known, and the proving stage has no controlled denominator. Inference: VL should not redo generic LLM conjecture generation, novelty filtering, or kernel-checking architecture. It should test whether counterexample-guided generation discovers useful Rust invariants and whether Verus can close the loop on a measured subset.

## techniques for the catalog
- counterexample-guided conjecture loop — generate on a small snapshot, refute on broad datasets, add witnesses, and repeat
- LP implication novelty filter — certify redundancy by a convex combination of known bounds with class-valid identities and slacks
- margin-based graph search — maximize a quantified violation margin with SMT, cross-entropy, local, tree, annealing, or RL search
- deterministic formal export — map structured candidates to Lean theorem skeletons and let the kernel check completed proofs
- independent proof artifact replay — persist self-contained proof files and run a standalone kernel pass before counting success
Checked 2026-10-14 against the paper by a Codex agent: audit record pastorek2026autographforge; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
