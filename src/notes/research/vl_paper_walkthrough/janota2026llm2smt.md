# LLM2SMT: Building an SMT Solver with Zero Human-Written Code
(authored by agents unless marked 🧑)
Tag: `janota2026llm2smt`, [paper](http://arxiv.org/abs/2603.06931v2)

## scope and result
This case study asks whether an LLM coding agent can build an automated reasoning tool. It uses Claude Sonnet 4.6 through Claude Code to implement a C++20 DPLL(T)-style SMT solver for quantifier-free uninterpreted functions (QF-UF). The abstract says, “We present a case study in which an LLM coding agent builds a complete DPLL(T)-style SMT solver for QF_UF with zero human-written code” (Abstract, PDF p. 1). The implementation integrates CaDiCaL through IPASIR-UP, Nieuwenhuis–Oliveras congruence closure, preprocessing, model validation, and Lean proof output for unsatisfiable instances.

The result is qualified: on SMT-LIB QF-UF non-incremental benchmarks, `llm2smt` solves 7,468 instances versus z3’s 7,500 and cvc5’s 7,494, under 180-second timeouts with 100 instances run in parallel (Table 1 and Section 4, PDF pp. 6–7). Proof certification is much weaker: with preprocessing, 285 instances are certified, 2,244 fail in `grind`, 1,314 time out, 240 exceed Lean heartbeats, and 86 overflow the stack (Table 2, PDF p. 6).

## technique 1: constrain an agent with a precise interface and staged scaffolding

what it is

Give the coding agent a narrow input language, named algorithms, build instructions, tests, and explicit resource limits. The initial prompt requested a parser, SAT solver through IPASIR-UP, hash-consing, arbitrary precision, CMake, ANTLR, and QF-EUF congruence closure (Section 3, PDF p. 2). The first version missed Boolean connectives and implemented its own SAT solver despite the request; explicit follow-up prompts corrected both.

how to apply

1. State the exact input theory and implementation boundaries. The paper warns, “The input language must be very carefully specified (SMT2 in our case)” (Section 5, PDF p. 7).
2. Name trusted interfaces and require the agent to use them; here, an explicit prompt integrated CaDiCaL via IPASIR-UP after the agent wrote a rudimentary SAT solver (Section 3, PDF p. 2).
3. Put build and test commands in the project and permanent instructions. The agent initially left solvers running without a timeout, so the authors required every run to use `timeout` (Section 3, PDF p. 3).
4. Require a regression test and frequent commit for each bug fix, allowing history-based bisecting (Section 5, PDF p. 7).

verus form

Inference: For Verus agents, specify the supported Rust subset, exact contract style, and verification command before generation. Require each function to carry `requires`/`ensures` where applicable, use `invariant` clauses on loops, and put mathematical lemmas in `proof fn`. Keep trusted external APIs behind explicit specifications. A staged prompt can ask for one module and its proof obligations at a time; this is an orchestration method, not a Verus theorem.

## technique 2: fuzzing, differential testing, and delta-debugging

what it is

Use a random formula generator and a differential script that compares the generated solver with a reference solver. When a wrong answer appears, reduce the failure to a small input with delta-debugging, then present the concrete counterexample to the agent. The paper reports, “The model handles bug fixing well, but—like human developers—benefits from structured debugging support: fuzzing and delta-debugging” (Section 3.1, PDF p. 3).

how to apply

1. Generate random SMT2 formulas across the supported theory, including Boolean terms and function applications.
2. Run the candidate and a trusted solver on each formula; flag answer mismatches.
3. Minimize a failing formula while preserving the mismatch; show the minimized input and expected result to the agent.
4. Make the fix a regression test and commit it. Repeat until the differential corpus is clean.

verus form

Inference: Generate bounded Rust inputs and compare a Verus-verified reference function with the agent implementation. Use executable test harnesses for differential results; use Verus `assert` and `proof fn` to prove the minimized counterexample’s mathematical fact when useful. Fuzzing finds behavioral mismatches but does not prove all inputs; the reference implementation and generated input distribution remain trusted.

## technique 3: theory-aware preprocessing

what it is

Add simplifications before DPLL(T) to avoid exponential search. The paper handles unit propagation and short-circuit conjunction/disjunction simplifications, then derives shared equalities for equational-diamond formulas. For each disjunction, compute EUF closure in each branch and add equalities common to all branches as unit formulas (Section 3.2, PDF pp. 3–4).

how to apply

1. Normalize formulas and simplify units and Boolean constants; include identities such as `t = t` becoming true and `if C then t else t` becoming `t` (Section 3.2, PDF p. 3).
2. For each branch of a disjunction, compute congruence closure of its equalities.
3. Intersect the closure consequences across branches.
4. Add shared equalities as unit formulas before invoking the SAT/theory loop. For `(x=y ∧ y=z) ∨ (x=w ∧ w=z)`, both branches imply `x=z`, so add `x=z` (Section 3.2, PDF p. 4).
5. Compare with preprocessing disabled. On the benchmark table, preprocessing increases solved instances from 7,355 to 7,468 relative to the no-preprocessing variant (Table 1, PDF p. 6), though the paper’s main comparison also varies theory propagation.

verus form

Inference: Implement normalization as executable Rust and state semantic preservation with `ensures` relating the original and normalized formula. Prove closure-intersection lemmas in `proof fn`; use `invariant` for worklist traversal. The exact SMT AST and congruence-closure semantics must be modeled in Verus, and no SMT solver speed result follows from a Verus proof.

## technique 4: certify models and export unsatisfiability proofs

what it is

For SAT results, validate the produced model by encoding it back into an SMT problem and checking it with a reference solver. For UNSAT results, emit Lean declarations and proofs: theory lemmas are discharged by `grind`, while the propositional combination is closed with `bv_decide` (Section 3.3, PDF p. 4). The authors changed the architecture after large theorem hypotheses made Lean parsing infeasible: SMT types, constants, and assumptions become Lean axioms; each theory lemma is a separate theorem; a final theorem gathers them and invokes `bv_decide` (Section 3.3, PDF p. 4).

how to apply

1. When the solver returns SAT, serialize its model into the input and call an independent solver to check satisfiability (Section 3.3, PDF p. 4).
2. When it returns UNSAT, translate equality primitives to Lean equality and emit theory lemmas for congruence closure.
3. Keep theory lemmas simple enough for `grind`; encode the remaining propositional structure for `bv_decide`.
4. Assemble a final `False` theorem from the assumptions and lemmas. The paper’s Listing 1 uses `axiom` declarations, separate `theorem eq_bridge_* := by grind`, and `theorem contradiction : False := by ... bv_decide` (Listing 1, PDF p. 5).
5. Fuzz and repair proof export. The authors had to provide a concrete equational-diamond proof before the agent could incorporate it (Section 3.3, PDF p. 5).

verus form

Inference: In Verus, represent a solver result with a datatype and prove a model-validation lemma using `requires` and `ensures`; use `proof fn` for congruence lemmas and `assert` to expose intermediate equalities. A `spec fn` can describe formula semantics, but proof functions are erased and cannot run as the solver. Verus does not accept Lean’s `axiom`, `grind`, or `bv_decide` syntax; external parser, solver, and machine arithmetic assumptions must be specified explicitly.

## what is proved, measured, and trusted

The benchmark measures solved-instance counts and timeout-bounded runtime, not a formal proof that the C++ solver is correct. The certification experiment reports no erroneous Lean proofs among 285 certified cases, but the table lists 2,244 `grind` failures, 1,314 timeouts, 240 heartbeat limits, and 86 stack overflows; it does not state a single certification-attempt denominator beyond those row counts. The paper itself concludes, “Proof-generation capabilities appeared to be rather hard to achieve for the agent” (Section 5, PDF p. 7). It trusts the SMT-LIB benchmarks, CaDiCaL and reference solver, C++ compiler, Lean kernel and tactics, generated tests, and the QF-UF semantic model.

## techniques for the catalog

- specification-first agent scaffolding: constrain language, interfaces, builds, tests, and resource limits before coding
- differential fuzzing: compare candidate and reference solvers on generated inputs
- delta-debugging: minimize a mismatch and feed the concrete counterexample to repair
- theory-aware preprocessing: derive shared congruence consequences before DPLL(T) search
- model certification: re-encode SAT models and validate them with an independent solver
- proof-certificate export: split theory lemmas from propositional closure and check each in a proof assistant
- regression discipline: commit each fix with a reproducing test and bisect later changes
