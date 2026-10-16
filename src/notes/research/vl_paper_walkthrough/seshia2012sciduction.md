# Sciduction: Combining Induction, Deduction, and Structure for Verification and Synthesis
(authored by agents unless marked 🧑)
Tag: `seshia2012sciduction`, [paper](http://arxiv.org/abs/1201.0979v1)

## purpose and core contract
Sciduction is a method for combining learned candidates with a deductive checker under an explicit structure hypothesis. The paper defines an instance as a triple “⟨H, I, D⟩”: H is the candidate form, I learns an artifact from examples, and D answers decision queries. Its motivation is that verification needs environment models, specifications, invariants, and abstractions that are often absent or too expensive to search directly. The paper's central claim is: “The sciductive approach constrains inductive and deductive reasoning using structure hypotheses, and actively combines inductive and deductive reasoning.”

The key guarantee is conditional. H is valid when, whenever any artifact satisfying the specification exists, one exists in the restricted class CH. The paper states the requirement as “valid(H) ⇒ sound(P)” (§2.3.2, p. 8). If H is false, the method may miss a proof or synthesize an incorrect artifact; this is an explicit assumption rather than an automatically checked fact.

## technique: structure-constrained invariant generation

what it is

For verification, the artifact can be an inductive invariant, abstraction, or environment assumption. The candidate space is deliberately restricted: “The structure hypothesis H defines the space of candidate invariants as being either constants (literals), equivalences, implications, or in some cases, random clauses or based on k-cuts in the and-inverter graph” (§2.4, p. 10). Simulation traces prune candidates, and a SAT solver proves the survivors inductive. The paper emphasizes that failure to find a suitable invariant causes failure to prove, not a false proof.

how to apply it

1. choose a syntactic invariant family H (constants, equalities, implications, clauses, or k-cut forms) (§2.4)
2. execute or simulate the system to obtain traces (§2.4)
3. retain every candidate matching H and consistent with the traces (§2.4)
4. send retained candidates to a SAT/SMT solver or model checker for inductiveness and the target property (§2.4)
5. accept only a candidate discharged by the deductive engine (§2.2.3)

verus form

Inference: define candidate invariant shapes as Verus predicates over the program state, generate candidates outside the Rust verifier, and insert a selected candidate as a loop `invariant` clause. Use Verus `requires`/`ensures` and `proof fn` lemmas to discharge initialization, preservation, and postcondition obligations. Verus checks the final invariant deductively; traces may rank or filter candidates but cannot establish correctness. Inference: a candidate generator must emit valid Verus syntax and account for ownership and ghost state, which are absent from the paper's SAT examples.

## technique: active sciduction loop

The general procedure alternates inductive inference and deduction. H restricts a class of artifacts; I selects examples, obtains labels from execution or a deductive oracle, and learns h ∈ H; D answers whether examples, labels, or candidate artifacts satisfy a decision query (§2.2). D must be lightweight relative to the original problem: it may solve a strict special case, run asymptotically faster, or solve a decidable abstraction when the original is undecidable (§2.2.3, pp. 6–7).

Steps are: (1) state the system/environment/specification and choose H; (2) ask D for an example satisfying the learner's criterion; (3) label it by execution or a deductive query; (4) update I's candidate; (5) ask D whether a consistent artifact exists; (6) repeat until D proves the artifact or reports failure (§2.2.2–2.2.3). The paper explicitly allows active learning and randomized I or D, but soundness then becomes probabilistic where appropriate.

Verus form

Inference: use a counterexample-guided driver that proposes Verus invariants or lemmas, runs `verus`, parses counterexamples, and refines the candidate. Keep the final proof in ordinary Verus contracts and `proof fn`; do not treat a successful heuristic proposal as proof until Verus checks it. A Verus model can serve as D only for a decidable abstraction of the Rust state; external libraries and unsafe behavior remain assumptions.

## technique: component-library synthesis

Section 4 synthesizes loop-free programs from a component library. H restricts programs to compositions of available components; I learns from distinguishing input/output examples; D uses SMT solving to generate inputs and check consistency. The table gives this exact configuration: “Program synthesis | Loop-free programs from component library | Learning from distinguishing inputs | SMT solving for input/program generation” (Table 1, p. 23). If the library contains a program equivalent to the target, the approach can converge; if not, it may produce a wrong program unless equivalence is checked.

Inference: for VL, H can be a library of verified Rust combinators, I can select a composition from failing examples, and D can ask Z3 for a distinguishing input. Every component should carry Verus contracts; the composed function still needs a final Verus proof. This suggests a practical synthesis assistant, but does not prove completeness for arbitrary Rust.

## technique: environment and hybrid-control synthesis

The paper's timing-analysis example models execution-time environments with a weight-plus-perturbation structure hypothesis and uses game-theoretic online learning with SMT path generation (Table 1, p. 23; §3). Its switching-logic example restricts guards to hyperboxes, learns from labeled simulation points, and uses numerical simulation as a reachability oracle (§5). A hyperbox is a conjunction of upper and lower bounds on continuous variables (§2.2.1, p. 5). These examples show how a restrictive form makes inference tractable while a deductive or simulation oracle supplies informative labels.

Inference: a Verus timing or protocol model could similarly restrict environment assumptions to a finite predicate template and use counterexamples to refine it. Simulation is evidence for candidate generation, not a proof of all executions; Verus contracts and a complete model of the relevant environment are still required.

## evidence, trust, and failure boundaries

The paper is a position paper with three demonstrations rather than one uniform benchmark. It reports no common solved/total denominator across the applications. Table 1 names the three configurations but gives no aggregate accuracy or runtime number. The strongest formal evidence is the conditional theorem schema valid(H) ⇒ sound(P), not an unconditional guarantee. The conclusion admits, “we currently do not have a systematic and general approach for checking the validity of the structure hypothesis” (§6, p. 22). It further warns that “testing the structure hypothesis requires checking equivalence of the generated program against the specification” (§6, p. 23).

Trusted elements are the deductive solver, the system/environment model, the specification, and validity of H. The inductive engine may be randomized and can overfit examples; the paper's own motivation says an unrestricted learner has no basis for unseen instances (§2.2.4). Inference: the threat to agent-written verified Rust is medium to high when H encodes incomplete environment behavior or an insufficient component library. The method is valuable as a search architecture, but conditional soundness must be surfaced in VL's product claims.

what VL should reuse

Inference: reuse explicit candidate classes, oracle-driven counterexamples, lightweight decision procedures, and a machine-checkable final proof. Do not claim that learned invariants or tests establish correctness without checking H and the resulting Verus obligations. The paper already covers the core pattern of SAT/SMT-guided invariant generation; VL should focus on Rust ownership-aware templates and dependency assumptions rather than repeat generic invariant learning.

## techniques for the catalog

- structure-constrained invariant generation — restrict invariant syntax, prune with traces, and prove survivors with SAT/SMT
- active induction–deduction loop — alternate example selection, labeling, candidate learning, and deductive queries
- conditional soundness — require validity of the structure hypothesis before claiming soundness
- component-library synthesis — learn loop-free compositions from distinguishing inputs and SMT consistency checks
- hyperbox guard synthesis — learn interval-conjunction guards from labeled simulation points and reachability queries

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
