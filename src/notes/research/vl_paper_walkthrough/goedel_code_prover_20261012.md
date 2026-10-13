# Goedel-Code-Prover: Hierarchical Proof Search for Open State-of-the-Art Code Verification
(authored by agents unless marked 🧑)

## scope and result
The paper presents an automated Lean 4 proof search system for code verification. Its central claim is that decomposing a verification goal into auxiliary lemmas makes search tractable. The task is to prove Hoare-style postconditions for executable code. The system is evaluated on Verina, Clever and AlgoVeri. The authors report 62% pass@1 on the combined benchmark (exact denominator and per-benchmark table should be copied when reproducing experiments); generated proofs average 8–17 auxiliary lemmas and 130–167 lines.

## technique: hierarchical proof search
What it is: a controller first predicts a high-level proof plan, then recursively solves subgoals and finally synthesizes Lean code. The paper says, “we propose a hierarchical proof search framework for automated code verification.”

When to use it: use it when a monolithic tactic or language model cannot close long verification goals, especially when the theorem naturally splits into invariants, arithmetic facts, and calls to library lemmas.

How to apply: (1) encode the program and specification in Lean 4; (2) run a decomposition model that proposes intermediate lemmas; (3) create child goals for each lemma; (4) search each child with the proof generator and Lean checker; (5) feed proved lemmas back as context; (6) assemble the parent proof and check the complete file. The implementation uses an 8B parameter model and supervised initialization followed by refinement. Before expensive search, it performs filtering and attempts cheap proofs; the text notes that “before expensive proof search is attempted” candidate goals are screened.

Evidence: three benchmarks cover different algorithmic distributions. The reported setup includes 77 classical algorithms in AlgoVeri and project-level examples in Verina and Clever. The main result is a 62% success rate, while refinement gives a modest but consistent improvement over supervised initialization. Evidence is executable Lean checking, so accepted proofs are kernel-checked rather than judged by text similarity.

Limits and trust: success depends on Lean specifications and imported libraries; the language model, decomposition policy, and search budget remain heuristic. Results do not establish transfer to Verus. Benchmark contamination and denominator differences must be checked against the tables before using the percentages.

## what is proved and what remains trusted
Lean's kernel checks each generated theorem. The benchmark specifications, compiler/model implementation, training data, and hardware are trusted assumptions. The paper measures proof completion, not semantic adequacy of the specifications. A wrong specification can receive a valid proof.

## implications for VL (inference)
A Verus agent could use the same plan/subgoal/check loop: ask an LLM for invariants, verify each with Verus, and only then synthesize the enclosing proof. The paper is a design precedent, not evidence that an 8B Lean model works unchanged for Rust/Verus. VL should measure per-goal success, repair cost, and proof size with fixed denominators. Reimplementing generic hierarchical decomposition is unnecessary; the missing work is a Verus adapter and a contamination-controlled benchmark.

## techniques for the catalog
- hierarchical lemma decomposition — recursively split a verification theorem into auxiliary lemmas, check children, then compose
- verifier-gated proof search — accept generated proof text only after the native kernel/compiler checks it
- cheap-first filtering — reject impossible or trivial candidates before spending full search budget
- iterative refinement — train or search from supervised proofs and retain consistent improvements

The paper also reports “modest but consistent refinement over supervised initialization” and describes “8–17 auxiliary lemmas and 130–167 lines of proof code across benchmarks”. These figures indicate that decomposition trades one long proof for many smaller obligations; an agent must therefore manage context and lemma naming. The authors evaluate “three Lean 4 code verification benchmarks”, so a deployment should preserve benchmark diversity instead of tuning to one dataset. In practice, a Verus port should begin with arithmetic and loop-invariant subgoals, cache successful lemmas, and expose failed child goals to the repair model. This operational detail matters because proof search can fail from missing context even when each individual lemma is easy. A reproducible report must include model checkpoint, decoding parameters, timeout, and exact task denominator; otherwise the 62% headline cannot be compared fairly.
