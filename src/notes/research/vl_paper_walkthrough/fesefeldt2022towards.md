# Towards Concurrent Quantitative Separation Logic
(authored by agents unless marked 🧑)
Tag: `fesefeldt2022towards`, [paper](http://arxiv.org/abs/2207.02822v3)

## scope
This paper combines separation logic for heaps, concurrent ownership, and probabilistic weakest-preexpectation reasoning. Its target is a lower bound on the probability that a concurrent pointer program reaches a postcondition, including programs that may not terminate almost surely. The authors state: “In this paper, we develop a novel verification technique to reason about programs featuring concurrency, pointers and randomization.” (Abstract, p. 1). The result is a guarded command language (chpGCL), Markov Decision Process semantics, weakest resource-safe liberal preexpectations (wrlp), and sound backward proof rules.

## technique: model concurrent probabilistic heap programs
Use chpGCL for assignments, probabilistic choice `{C}[ep]{C}`, sequencing, conditionals, loops, atomic regions, parallel composition, allocation, disposal, lookup, and mutation (Sec. 3, pp. 6–7). A state is a program plus stack and finite heap; an MDP supplies nondeterministic actions for thread interleavings and probabilities for random commands. Atomic regions must be tame: no allocation or concurrency, although probabilistic choice is allowed (Sec. 3, p. 6). The paper explains the reason: “The reason to restrict the program fragment within atomic regions is that non-tame statements introduce non-determinism (as addresses to be allocated and schedulings of concurrent programs are chosen non-deterministically)” (Sec. 3, p. 6).

How to apply it: (1) write the heap-manipulating program in the grammar; (2) identify each stack/heap state and every enabled interleaving action; (3) give each probabilistic command its distribution; (4) model the resulting transitions as an MDP, with abort transitions for invalid lookup or mutation (Secs. 3.1–3.3, pp. 6–9); (5) select a qualitative resource invariant describing every shared heap fragment reachable between thread steps.

Verus form. Inference: executable Rust can represent stack variables, `Box`/owned heap cells, and thread state, while ghost predicates describe ownership and disjoint heap regions. Verus has no MDP or probabilistic expectation primitive in the cited Verus reference; probabilities and scheduler choices therefore belong in ghost/spec mathematics or an external model, with Rust proofs checking each transition's safety conditions.

## technique: weakest resource-safe liberal preexpectation
QSL expectations map stack/heap pairs to nonnegative values rather than booleans. The paper defines `wrlpⁿ⟦C⟧(X | ξ)` recursively for a postexpectation `X` and resource invariant `ξ`, then takes the limit over `n` steps (Sec. 4, pp. 9–10). For zero steps it is one; a terminated command yields `X`; otherwise it combines one-step transitions while framing and re-establishing `ξ`. The special invariant `[emp]` makes wrlp coincide with wlp, allowing lower bounds on probabilities of qualitative postconditions (Sec. 4, p. 10).

Apply it backward: choose a postexpectation `Y`, a candidate lower bound `X`, and `ξ`; prove `X ≤ wrlp⟦C⟧(Y | ξ)` by rules. Keep `ξ` covering all shared-memory states between inter-thread inferences; it may be temporarily violated inside an atomic region (Sec. 4, p. 10). The conservative-extension theorem states: “For a framing-enabled non-probabilistic program C and qualitative expectations φ, ψ and ξ, we have φ ≤ wrlpJCK (ψ | ξ) iff ξ |= {φ} C {ψ}.” (Theorem 4.1, p. 10).

Verus form. Inference: encode `ξ`, `X`, and `Y` as ghost predicates/spec functions and prove the inequality as lemmas over an explicit transition relation. Use `requires` for the resource invariant and `ensures` for preservation; use loop `invariant` clauses for bounded approximations. The expectation algebra and limit remain an inferred mathematical layer, not a Verus library feature.

## technique: sound proof-rule calculus
The basic rules (Fig. 5, p. 11) handle assignment, lookup, mutation, allocation, and disposal. Control-flow rules (Fig. 6, pp. 11–12) compose sequence, conditionals, loops, divergence, probabilistic choice, atomic regions, sharing, and concurrency. The concurrency rule separates postexpectations `X1 ⋆ X2` and requires each thread's writes to avoid the other thread's variables and the invariant. Auxiliary rules (Fig. 7, p. 12) include superlinearity, framing, atomic, monotonicity, max/min, and convexity; min and convex require a precise resource invariant. The paper proves: “For every proof rule in Figures 5–7 it holds that if their premises hold, the conclusion holds as well.” (Theorem 4.2, p. 12).

Step-by-step use: (1) annotate each command with pre/post expectations and `ξ`; (2) read the annotation bottom-to-top; (3) apply basic rules to atomic commands; (4) use sequence and branch rules; (5) supply a loop invariant; (6) split concurrent postexpectations and discharge write-set side conditions; (7) use share to move from a strengthened `ξ` to `[emp]`; (8) use wlp-wrlp and monotonicity to obtain the desired probability bound (Sec. 4, pp. 11–13).

The worked two-thread example initializes `r=-1`, randomly sets `r` to 0 or 1 with probability 0.5, and repeatedly reads it. The authors choose `ξ = max{[r↦0],[r↦−1]}` and establish `0.5 ≤ wrlp⟦C⟧([y=0] | ξ)` before sharing and converting to a wlp lower bound (Example 4.2, pp. 12–13). Inference: this pattern maps to Verus ghost ownership plus a loop invariant connecting the read variable to permitted heap values; each probability claim needs an independently formalized expectation model.

## producer-consumer case, evidence, and trust
Section 5 applies the rules to a producer, consumer, and lossy channel, where data are randomly generated and may be dropped. The example is a template for a shared data structure; the full derivation is in the appendices (Sec. 5, pp. 13–15 and Appendix F). No benchmark count, runtime percentage, or denominator is reported: the evidence is soundness theorems and worked derivations, not an implementation evaluation.

Trusted elements are the MDP operational semantics, expectation algebra, resource-invariant side conditions, and the proof of every rule in Appendix E. Inference: threat to a product that emits agent-written verified Rust is medium for concurrency and high for quantitative probability: the ownership decomposition is directly useful, but scheduler fairness, random sampling, and expectation limits are outside ordinary Verus checking. Existing QSL and CSL work already covers sequential quantitative heaps and qualitative concurrency; VL should reuse their ownership/resource-invariant discipline rather than reimplement the logic without a concrete probabilistic requirement.

## techniques for the catalog
- chpGCL-to-MDP semantics — model heap commands, probabilistic choices, and nondeterministic thread interleavings as an MDP
- resource-safe liberal preexpectation — bound postcondition probability while framing a shared heap invariant and allowing nontermination
- backward wrlp proof rules — compose assignment, heap, control-flow, atomic, probabilistic, and concurrent rules bottom-to-top
- quantitative frame and share — split local heap resources and enrich or discharge the resource invariant
- precise-invariant side conditions — require at most one nonzero heap for min and convex expectation rules

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
