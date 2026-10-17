# Sciduction: Combining Induction, Deduction, and Structure for Verification and Synthesis
(authored by agents unless marked 🧑)
Tag: `seshia2012sciduction`, [paper](http://arxiv.org/abs/1201.0979v1)

## purpose and core contract
Sciduction is a method for combining learned candidates with a deductive checker under an explicit structure hypothesis. The paper (a position paper) describes an instance as a triple ⟨H, I, D⟩ (§2.2, p. 5): H is the structure hypothesis, the form of the artifact to be synthesized; I is an inductive inference engine that learns an artifact from examples; D is a lightweight deductive engine that answers queries generated in the synthesis or verification process. Its motivation is that verification and synthesis are hard because of system and environment modeling, creating good specifications, and the complexity of the underlying decision problems (§1, p. 3). The paper's central claim is: “The sciductive approach constrains inductive and deductive reasoning using structure hypotheses, and actively combines inductive and deductive reasoning” (§1, p. 4).

The key guarantee is conditional. H is valid when, if an artifact satisfying the specification exists in the whole class CS, then one exists in the restricted class CH (Eq. 1, §2.3.1, p. 8). The soundness requirement is written as “valid(H) ⇒ sound(P)” (Eq. 2, §2.3.2, p. 8). Without that requirement the paper calls the procedure “a heuristic, best-effort verification or synthesis procedure”. For the program-synthesis application, an invalid H may yield an unrealizability report or a program consistent with all seen examples but incorrect (§4.3, p. 17). Inference: validity of H is an explicit assumption, not something the method checks automatically.

## technique: structure-constrained invariant generation

what it is

This is a related-work example (§2.4.1, p. 10), not one of the paper's three own applications. For verification, the artifact can be an inductive invariant, abstraction, or environment assumption. The paper describes the ABC verification system and Case's thesis as instances of sciduction: “The structure hypothesis H defines the space of candidate invariants as being either constants (literals), equivalences, implications, or in some cases, random clauses or based on k-cuts in the and-inverter graph” (§2.4.1, p. 10). The inductive engine is “very rudimentary: it just keeps all instances of invariants that match H and are consistent with simulation traces”, and the deductive engine is a SAT solver. The paper says that if a suitable inductive invariant is not found, “one may fail to prove the property, but a buggy system will not be deemed correct.”

how to apply it

Steps 1 to 4 follow the paper's description (§2.4.1, p. 10); step 5 is the study's inference.

1. choose a syntactic invariant family H (constants, equivalences, implications, clauses, or k-cut forms)
2. execute or simulate the system to obtain traces
3. retain every candidate matching H and consistent with the traces
4. send retained candidates to a SAT/SMT solver or model checker to prove the survivors
5. Inference: accept only a candidate that the deductive engine discharges, since the paper's soundness argument rests on the deductive check

verus form

Inference: define candidate invariant shapes as Verus predicates over the program state, generate candidates outside the Rust verifier, and insert a selected candidate as a loop `invariant` clause. Use Verus `requires`/`ensures` and `proof fn` lemmas to discharge initialization, preservation, and postcondition obligations. Verus checks the final invariant deductively; traces may rank or filter candidates but cannot establish correctness. Inference: a candidate generator must emit valid Verus syntax and account for ownership and ghost state, which are absent from the paper's SAT examples.

## technique: active sciduction loop

The paper defines the three elements and says it does "not advocate any particular technique of combining inductive and deductive reasoning" (§2.2.4, p. 7), so the loop below is a reading of §2.2, not a procedure given in the paper. H restricts a class of artifacts; I is expected to have one or more of these characteristics: it performs active learning, examples or labels come from oracles (deductive procedures, execution of a model, or a human), and a deductive procedure synthesizes a concept consistent with labeled examples (§2.2.2, p. 6). D must be lightweight relative to the original problem: it may solve a strict special case, run in time o(T(n)) when the original problem is decidable with best known time O(T(n)), or solve a decidable problem when the original is undecidable (§2.2.3, p. 6). The paper lists the queries D can answer: generating examples for the learner, generating labels for examples, and synthesizing candidate artifacts consistent with observed examples (§2.2.3, p. 6).

Inference: one loop built from these pieces is (1) state the system/environment/specification and choose H; (2) ask D for an example satisfying the learner's criterion; (3) label it by execution or a deductive query; (4) update I's candidate; (5) ask D whether a consistent artifact exists; (6) repeat until the artifact is accepted or the procedure reports failure. The paper allows randomization in I and D, so that D may answer “with high probability” (§2.2.4, p. 7), and defines probabilistic analogs of soundness and completeness (§2.3, p. 7).

Verus form

Inference: use a counterexample-guided driver that proposes Verus invariants or lemmas, runs `verus`, parses counterexamples, and refines the candidate. Keep the final proof in ordinary Verus contracts and `proof fn`; do not treat a successful heuristic proposal as proof until Verus checks it. A Verus model can serve as D only for a decidable abstraction of the Rust state; external libraries and unsafe behavior remain assumptions.

## technique: component-library synthesis

Section 4 (p. 16) applies sciduction to malware deobfuscation, viewed as re-synthesis of loop-free fragments, with the obfuscated program as an I/O oracle. H restricts programs to loop-free compositions of components drawn from a finite library L of bit-vector components. I learns a program from distinguishing inputs: each iteration asks the SMT solver for a program consistent with all input-output examples seen so far and for another, semantically different, consistent program plus an input that distinguishes them, stopping when no alternative exists. D is an SMT solver that generates candidate programs and distinguishing inputs. Table 1 (p. 23) lists the three cells as “Loop-free programs from component library” (H), “Learning from distinguishing inputs” (I), and “SMT solving for input/program generation” (D). If the library contains a program equivalent to the obfuscated one, the paper says the approach is sound and the generated program is guaranteed correct (§4.3, p. 17, citing Theorem 4 in [23]). If not, it may report unrealizability or output a program that is consistent with the examples but wrong. The paper says both example benchmarks (Fig. 8) were deobfuscated in less than half a second, and that a range of heuristics is used in practice to compute a sufficient library (§4.3, p. 17). Checking equivalence against the specification is, per §6, expensive.

Inference: for VL, H can be a library of verified Rust combinators, I can select a composition from failing examples, and D can ask Z3 for a distinguishing input. Every component should carry Verus contracts; the composed function still needs a final Verus proof. This suggests a practical synthesis assistant, but does not prove completeness for arbitrary Rust.

## technique: environment and hybrid-control synthesis

Timing analysis (§3, GameTime, pp. 13-15): H is a weight-perturbation model in which the platform picks path-independent weights w and a path-dependent perturbation π on CFG edges, constrained by a bound µmax on mean perturbation along any path and (for worst-case analysis) a unique longest path by margin ρ. I is game-theoretic online learning from end-to-end timings of basis paths chosen uniformly at random. D is an SMT solver that checks basis-path feasibility and generates test cases. Under a valid H, GameTime is probabilistically sound and complete: for any δ > 0, a number of tests polynomial in ln(1/δ), µmax, and the program parameters gives the correct YES/NO answer with probability at least 1 − δ (§3.3, p. 15). As a sample result, the paper predicts the execution-time distribution of a modular exponentiation function with an 8-bit exponent (256 paths) by testing only 9 basis paths, on a StrongARM-1100 simulated with SimIt-ARM, and reports that the distribution is predicted “perfectly” and the WCET test case is exponent 255.

Switching-logic synthesis (§5, pp. 18-22): H requires guards to be n-dimensional hyperboxes with vertices on a known discrete grid, plus a condition that the safe entry states of one transition form a hyperbox when the others are fixed. The paper says this can be proved valid if dynamics are monotonic within a mode and the grid reflects finite precision (§5.2, p. 20). I learns hyperboxes by binary search from labeled points (after Goldman and Kearns [20]); D is an ideal numerical simulator used as a reachability oracle. With valid H and an ideal simulator the approach is sound and complete (§5.3, p. 21); otherwise the synthesized system should be verified separately. A hyperbox is a conjunction of upper and lower bounds on continuous variables (§2.2.1, p. 5). These examples show how a restrictive form makes inference tractable while a deductive or simulation oracle supplies labels.

Inference: a Verus timing or protocol model could similarly restrict environment assumptions to a finite predicate template and use counterexamples to refine it. Simulation is evidence for candidate generation, not a proof of all executions; Verus contracts and a complete model of the relevant environment are still required.

## evidence, trust, and failure boundaries

The paper is a position paper with three demonstrations rather than one uniform benchmark. It reports no common solved/total denominator across the applications. Table 1 names the three configurations but gives no aggregate accuracy or runtime number. Inference: the strongest formal evidence is the conditional soundness form valid(H) ⇒ sound(P) together with per-application guarantees cited from other papers, not an unconditional guarantee. The conclusion admits, “we currently do not have a systematic and general approach for checking the validity of the structure hypothesis” (§6, p. 22). For program synthesis it adds that “testing the structure hypothesis requires checking equivalence of the generated program against the specification” (§6, p. 23).

Trusted elements are the deductive solver, the system/environment model, the specification, and validity of H. The paper notes that I and D may use randomization (§2.2.4). Its argument for restricting CH is that an unbiased learner, quoting Mitchell, “has no rational basis for classifying any unseen instances” (§2.2.4, pp. 6-7). Inference: the threat to agent-written verified Rust is medium to high when H encodes incomplete environment behavior or an insufficient component library. The method is valuable as a search architecture, but conditional soundness must be surfaced in VL's product claims.

what VL should reuse

Inference: reuse explicit candidate classes, oracle-driven counterexamples, lightweight decision procedures, and a machine-checkable final proof. Do not claim that learned invariants or tests establish correctness without checking H and the resulting Verus obligations. The paper already covers the core pattern of SAT/SMT-guided invariant generation; VL should focus on Rust ownership-aware templates and dependency assumptions rather than repeat generic invariant learning.

## techniques for the catalog

- structure-constrained invariant generation — restrict invariant syntax, prune with traces, and prove survivors with SAT/SMT
- active induction–deduction loop — alternate example selection, labeling, candidate learning, and deductive queries
- conditional soundness — require validity of the structure hypothesis before claiming soundness
- component-library synthesis — learn loop-free compositions from distinguishing inputs and SMT consistency checks
- hyperbox guard synthesis — learn interval-conjunction guards from labeled simulation points and reachability queries

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The program-specificity is an important difference from traditional approaches, which seek to manually construct a timing model that works for all programs one might run on the platform."): read the whole paper text and checked every quotation, page and section reference, the Table 1 cells, the GameTime numbers (9 basis paths of 256, exponent 255, 1 − δ bound), the §4 and §5 steps and guarantees, and the arXiv link; changed the Table 1 quote to per-cell quotes, moved invariant generation to related work (§2.4.1), marked the six-step loop and step 5 of invariant generation as Inference because the paper gives no such procedure, corrected pages (§2.2.3 is on p. 6), and added the GameTime, deobfuscation and switching-logic details; did not check the cited external papers [23], [24], [53], [54], the Figure 6 and Figure 10 plots, or the guard values in Eqs. 3 and 4.
