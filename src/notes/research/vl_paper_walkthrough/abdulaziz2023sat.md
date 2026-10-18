# Formally Verified SAT-Based AI Planning
(authored by agents unless marked 🧑)
Tag: `abdulaziz2023sat`, [paper](https://arxiv.org/abs/2010.14648)

This paper verifies an executable SAT encoding for bounded-length classical planning in Isabelle/HOL. Its architecture is deliberately layered so the verified component consumes and emits abstract syntax trees (ASTs), while a SAT solver remains untrusted. The abstract states the aim: “We present an executable formally verified SAT encoding of ground classical AI planning problems.” (Abstract, PDF p.1.) For a horizon h, satisfiability must correspond exactly to existence of a plan of length at most h.

## technique: minimize the trusted boundary with AST interfaces

Use this when file parsing, pretty printing, and external solvers would otherwise enlarge the trusted computing base. The paper’s pipeline is:

1. Parse Fast Downward translator input into an FD-AST.
2. Verify an encoder from FD-AST to a DIMACS-CNF AST.
3. Pass the CNF AST to an unverified SAT solver.
4. If SAT, pass the model AST and original FD-AST to a verified decoder; emit a plan only when the model entails the encoding.
5. If UNSAT, the design passes the solver’s unsatisfiability certificate and the DIMACS-CNF encoding to the existing formally verified checker GRAT (Lammich 2017). This is a design claim in Approach Overview; the experiments report only Kissat runs and say nothing about running a certificate checker.
6. Pretty-print only after the verified AST-level result exists.

The authors explain the trust boundary: “The encoder takes as input an AST of Fast-Downward’s translator format ... and produces an AST of the standard DIMACS-CNF format.” (Approach Overview, p.2.) They further state: “If the SAT solver finds a model for the encoded formula, our verified decoder takes the AST of the DIMACS model and the FD-AST and produces a plan only if the model entails the CNF encoding of the FD-AST.” (p.2.)

Verus form (Inference:): define Rust enums/structs for each AST and verified conversion functions with `ensures` relating source and target semantics. Keep parsing and printing outside the proof boundary or verify them separately. Treat the SAT solver as an external body only at the interface that supplies a model/certificate; verify the checker’s relation to the AST. Do not claim the external solver is verified.

## technique: stepwise refinement through semantic representations

Use this when a direct proof from a file format to SAT is too entangled. The paper’s refinement chain is FD-AST → FDR → STRIPS → structured propositional formula → DIMACS-CNF. Each step has a correctness theorem and a decoder.

1. FD-AST models variables, initial state, goal, and operators with prevail/effect preconditions. Restrict inputs to well-formed problems without conditional effects and with consistent preconditions (Definitions 1–4, p.3).
2. Encode to FDR (Encoding 1, p.4): each variable v with domain size n gets the range {0..n−1}, and each operator’s precondition is its prevail precondition plus the old value of every variable it assigns. Decode FDR operators back to original operator names using a choice function (Decoding 1, p.4).
3. Prove Theorem 1: plans map in both directions between a valid FD-AST problem and its FDR encoding (p.4). Because FDR execution is a total function but FD-AST execution is not, operators whose preconditions are unsatisfied are removed when decoding an FDR plan.
4. Encode FDR to STRIPS (Encoding 2, p.4) by turning each variable/value pair into Boolean atoms; prove Theorem 2 that solutions correspond both ways.
5. For horizon h, unroll the parallel transition relation into a propositional formula with initial and goal clauses, operator precondition/effect clauses, frame axioms, and non-interference clauses (Encoding 3, p.5).
6. Decode a satisfying model into a sequence of operators and prove Theorem 3: every model decodes to a plan and every plan of length ≤h yields a model (p.6).
7. Simplify structured formulas to integer-indexed DIMACS clauses (Encoding 4) and prove model preservation in Theorem 4 (p.6).
8. Compose Theorems 1–4 into Theorem 5: a DIMACS model gives a plan for the original FD-AST, and every bounded plan gives a DIMACS model (p.6).

The paper notes why this engineering matters: “The rest of the paper is structured s.t. there is a section describing every intermediate representation and translation step, with the associated correctness theorem.” (Background, p.3.)

Verus form (Inference:): make each representation a datatype and each translation a pure/spec function plus an executable wrapper. State semantic preservation as `ensures` over an `executes` predicate. Use separate lemmas for well-formedness preservation and plan/model correspondence, then compose them in a final theorem. A Rust implementation can stream clauses, but the proof must establish equivalence to the mathematical formula.

## technique: parallel ∀-step SAT encoding

Use this when several non-interfering actions may execute in one time step and compact horizons matter. For each state atom v^t and operator op^t, the paper adds:

1. initial-state and horizon-goal constraints
2. operator implication to preconditions and effects
3. frame axioms forcing a changed fluent to have a supporting add/delete action
4. interference constraints forbidding two operators whose precondition/effect sets conflict

The paper defines two STRIPS operators as interfering when the atoms required true by one operator’s precondition overlap the atoms made false by the other’s effect (Definition 7, p.5). It emphasizes: “such a parallel encoding constitutes an unrolling of the transition relation underlying the STRIPS problem, which allows more than one operator to execute in one time step, as long as those operators are non-interfering.” (p.5.)

Verus form (Inference:): define a bounded `step` relation over Boolean states and action sets, prove that non-interference makes action order irrelevant, and prove induction over horizon h. Generate CNF clauses from the relation and prove each clause family sound and complete. The paper’s restrictions—no conditional effects, total initial state, conjunctive preconditions/goals—must remain explicit preconditions.

## technique: verified decoding and reference checking

Use the verified encoder as a reference oracle for an unverified planner. Generate encodings with both tools for competition domains at horizons 2, 5, 10, 20, 50, 100 and at bounds from the algorithm of Abdulaziz 2019, feed them to the SAT solver Kissat, and compare results. The setup has a stated weakness: Madagascar takes the PDDL domain (with invariant generation disabled) while the verified encoder takes the grounded output of Fast Downward’s translator. The paper reports that Madagascar “produces unsatisfiable formulae for instances and horizons, despite those instances having ∀-step plans bounded by the horizon,” in at least 24 instances of variants of the Rovers and PARCPrinter domains, because it “adds incorrect action mutex constraints which rule out valid ∀-step plans” (Experimental Evaluation, PDF p.7).

The paper’s exact claim is: “Using it as a reference, we discover bugs in the state-of-the-art SAT-based planner Madagascar.” (Introduction, p.1.) This is evidence that a verified reference can expose incompleteness even when the competing tool is established.

Verus form (Inference:): expose a function `decode_model` with a postcondition that the returned plan executes and reaches the goal. A differential harness can compare an agent’s planner against the verified reference on bounded instances. The harness itself is evidence-producing infrastructure; its findings do not prove the unverified planner correct.

## evidence, trusted parts, and limits

All theorems were proved in Isabelle/HOL; the verified Standard ML program is about 1.2K lines and the proof scripts about 17.5K lines (Discussion, PDF p.7). Experiments use a 30-minute timeout and 8 GB memory limit for encoding and solving, horizons 2, 5, 10, 20, 50, 100, and algorithm-generated bounds. Table 1 reports the number of satisfiable and unsatisfiable formulae solved by Kissat, per domain; for example, `newopen` has 2897 SAT and 2205 UNSAT solved by the verified encoding versus Madagascar’s 3128 and 2214, while `logistics` has 358 and 452 versus 986 and 1031 (Table 1, p.7). These are counts under the stated timeout/memory setting, not percentages. On cost, the paper reports that Kissat solves the verified encoding in significantly shorter time for most instances, but that total time (grounding, encoding, solving) is worse because the purely functional Standard ML implementation uses balanced trees instead of arrays, and that the encoder “frequently runs out of memory” because it builds the whole encoding in memory before output. The Introduction says the encoder “is an order of magnitude slower than Madagascar.” The paper notes Madagascar’s ∀-step encoding is linear in size via auxiliary variables while the verified one is quadratic.

What is proved: semantic preservation of every translation, SAT model/plan equivalence, and the composed end-to-end theorem for valid FD-AST inputs. What remains trusted per the paper: the parsing and pretty-printing components (“we only trust parsing and pretty printing components”), Isabelle’s small kernel, and the unverified SAT solver (its unsatisfiability certificates are meant to go to the GRAT checker). Inference: the Isabelle code generator and the Standard ML toolchain are also trusted, though the paper does not discuss them. The paper explicitly says the input is already grounded FD-AST; converting PDDL, grounding, and invariant computation would enlarge the trusted code base. Conditional effects are excluded, and no cost-optimality proof is included.

Inference: the threat to agent-written verified Rust is high where a planner or synthesizer silently drops cases during translation. A layered AST proof gives VL a practical pattern: verify each compiler-like transformation, check external solver output, and retain a small trusted boundary. VL could reuse the paper’s architecture rather than build an unstructured monolithic proof. Inference: the same pattern applies to agent-generated Rust transformations whose outputs are later checked by Verus.

## techniques for the catalog

- AST trust boundary — verify encoder/decoder over syntax trees and isolate parsers, printers, and external solvers
- stepwise refinement — prove FD-AST→FDR→STRIPS→formula→DIMACS preservation one translation at a time
- parallel SAT encoding — unroll bounded planning with frame and non-interference clauses
- verified model decoding — turn a SAT model into a plan only under a proved entailment relation
- reference-oracle testing — compare an unverified planner with the verified encoder to expose false UNSAT claims
- certificate checking — in the paper’s design, pass UNSAT certificates to a separately verified checker so both SAT and UNSAT outputs carry guarantees (not exercised in the reported experiments)
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "A bigger problem is that, as Standard ML does not support lazy evaluation and has poor memory management in general, our encoding frequently runs out of memory as it computes the entire encoding in memory before producing any output"): read the whole paper text and the PDF pages; checked every quotation, theorem/encoding/definition number, PDF page reference, Table 1 numbers (newopen, logistics), the experiment setup and the technique steps against it; changed the link to the arXiv ID printed on the paper (arXiv:2010.14648), corrected page references (Definitions 1–4 p.3, Encoding 1 p.4, Encoding 3 and Definition 7 p.5, Theorems 3–5 and Encoding 4 p.6, Discussion p.7), corrected the description of Encoding 1 (it adds the old value of each assigned variable to the precondition), stated that the certificate checker is the existing GRAT and is not exercised in the experiments, added the Madagascar comparison setup, the cost and memory findings, and the trusted-base wording, and labelled own conclusions Inference; did not check the appendix Isabelle listings line by line, the cited works, the Isabelle proofs, or the figures (Figures .2–.6 are plots).
