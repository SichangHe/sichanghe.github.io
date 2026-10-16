# CSLib: The Lean Computer Science Library
(authored by agents unless marked 🧑)
Tag: `barrett2026cslibb`, [paper](https://doi.org/10.48550/arxiv.2602.04846)

## scope and result

CSLib is a proposed open-source Lean library for computer-science models, algorithms, data structures, specifications, and verified imperative code. The paper is a white paper and roadmap; it does not report a completed benchmark or a finished Rust translator. Its goal is to make Lean-based formalization reusable in the way Mathlib made mathematical formalization reusable. The abstract describes “writing formally verified code in the Lean proof assistant.” (Abstract, p.1)

The project has two pillars. Pillar 1 formalizes models and logics, algorithms and data structures, complexity, concurrency, programming-language foundations, and related mathematics. Pillar 2 introduces Boole, an intermediate verification language in which imperative code is interspersed with Lean specifications; Boole code is translated into Lean verification conditions (VCs), which are proved by Lean tactics, SMT-backed hammers, or AI provers. The authors envision front ends for Rust, Python, C/C++, and Java (Figure 5, p.9). These are plans, not demonstrated translators.

## technique: reusable formal library of computer-science abstractions

what it is

Pillar 1 organizes definitions and theorems into one coherent Lean framework. Planned content includes deterministic, nondeterministic, probabilistic, and quantum computation; lambda calculi; temporal, Hoare, separation, and linear logics; transition systems, bisimulation, process calculi, Petri nets; data structures; algorithms; and complexity classes. Figure 2 (p.5) defines a labeled transition system and bisimulation and displays a proof that the inverse of a bisimulation is a bisimulation. The authors describe the goal as “a coherent and integrated framework rather than a collection of unrelated modules” (§2.1, p.3).

when to use it

Use shared definitions and lemmas when several verified systems need the same mathematical or algorithmic fact. A system proof should import and compose existing theorems instead of duplicating an ad hoc encoding.

how to do it (Inference: a checklist derived from the proposal, not a prescribed procedure)

1. Choose a computer-science concept or algorithm and define its mathematical object in Lean.
2. Define the relevant relations, semantics, specifications, and cost model.
3. State correctness, equivalence, safety, or complexity theorems over those definitions.
4. Prove the theorems in Lean and commit definitions and proofs to the library.
5. Reuse the exported abstractions in later algorithms and system models, keeping the framework coherent with Mathlib.

Verus form

evidence for reusable abstractions

The paper gives concrete Lean examples but no completion percentage, theorem count, or independent defect study. Its contribution is an architecture and initial codebase, not evidence that all planned abstractions are correct or easy to maintain.

## technique: cost semantics with a monadic API

what it is

CSLib proposes a `TimeM α` type containing a return value and a natural-number cost. `pure` has zero cost, `bind` adds the costs of two computations, and `tick` increments cost. A check-mark notation inserts ticks into algorithm code. Mergesort returns a sorted list and a comparison count; separate theorems state functional correctness and an upper bound on the count. The paper says “Treating time complexity as a computational effect makes correctness and complexity analysis orthogonal.” (§2.1, p.8; API and mergesort in Figures 3–4, pp.6–7)

when to use it

Use this lightweight model when an algorithm’s cost can be represented by explicit operation annotations and you need correctness and a cost theorem in one formal development.

how to do it (Inference: a checklist derived from the proposal, not a prescribed procedure)

1. Wrap an algorithm’s result in `TimeM α`.
2. Define `pure`, `bind`, and `tick` so costs compose additively.
3. Place ticks at operations whose cost model you want to count.
4. Prove simplification lemmas for return values and costs.
5. Prove a functional theorem, such as sortedness and permutation for mergesort.
6. Prove a cost theorem over the returned `time` field.

Verus form

Inference: Represent a cost-annotated computation as a Rust ghost/specification pair, for example a result value plus a mathematical natural-number cost. Prove cost composition with `ensures` and lemmas, while the executable function returns only the value if the cost is proof-only. If cost is observable, retain it in the executable type. Do not claim that a tick count equals machine time without a separate cost model.

evidence for cost accounting

The paper’s mergesort example states correctness and a `n * clog2 n` comparison bound, but the proof bodies are omitted. The authors acknowledge that the approach “it relies on manual tick annotations that a user could accidentally get wrong rather than automated verification of execution costs” (§2.1, p.8) and cannot directly prove lower bounds such as no algorithm solving a problem faster than a given function. It is therefore a starting API, not an automated complexity verifier.

## technique: Boole intermediate language and Lean VC generation

what it is

Boole is an imperative intermediate language embedded in Lean. Programs use pseudocode-like assignments, `requires` preconditions, `invariant` loop annotations, and `assert` statements. A VC generator translates code and specifications into Lean goals for loop-free paths. The paper’s loop example computes a sum, and `#prove_vcs` produces entry, invariant-maintenance, and assertion goals. Lean-SMT can discharge the goals and replay proof certificates in Lean.

when to use it

Use an IVL when mainstream source languages need a common deductive-verification target and when generated obligations should remain readable and connected to source code. Boole is intended to support front ends for Rust, Python, C/C++, and Java (Figure 5, p.9).

how to do it (Inference: a checklist derived from the proposal, not a prescribed procedure)

1. Write imperative code in Boole or translate a source-language program into Boole.
2. Add a `requires` precondition.
3. Add loop `invariant` clauses that hold on entry and after every iteration.
4. Add named `assert`s for desired results.
5. Invoke the VC generator, which assigns Lean semantics and generates goals for paths and loop boundaries.
6. Prove goals manually or invoke `smt`, `grind`, Lean Hammer, or another prover.
7. Review the generated goals and their links to the originating statements.

Verus form

Inference: This maps directly to Verus contracts and loop invariants: put preconditions in `requires`, postconditions in `ensures`, and preservation facts in loop `invariant` clauses. Use Verus proof functions or lemmas for goals that automation cannot solve. The paper proposes mainstream-language-to-Boole translation, not Boole-to-Verus translation. Its Rust front end remains future work (§2.2, pp.10–11).

evidence for Boole verification

The paper shows generated Lean goals for the summation loop (Figures 6–7, pp.10–11) and reports: “For our example, a tactic called smt can solve all of them” (§2.2, pp.9–10). The displayed code sums integers from 0 through n−1 and asserts `n * (n-1) / 2`; the caption’s description as the first n positive integers does not match that code. It does not report soundness or completeness results for the VC generator, performance over real programs, or a finished translation from Rust. The roadmap says Boole is initially built on Strata and that low-level pointers and concurrency are future extensions.

## technique: trusted-base minimization and proof-producing automation

what it is

CSLib aims to minimize its trusted computing base by embedding Boole and its transformations in Lean. Verification conditions become Lean goals, and Lean-SMT obtains a solver certificate and replays it in Lean. The paper explains: “This tactic uses the Lean-SMT tool [30] to translate a goal into an SMT formula, call a solver, get a proof certificate, and then replay the proof step-by-step in Lean” (§2.2, p.10). The paper’s design principles require that generated goals be intuitive and connected to source code, and that specifications can use the large CSLib and Mathlib universe.

when to use it

Use proof-producing automation when a fast external solver is useful but its answer must be checked by a small trusted kernel. Keep translation and VC-generation code within the formal environment where practical.

how to do it (Inference: a checklist derived from the proposal, not a prescribed procedure)

1. Define the intermediate language semantics in Lean.
2. Implement source-to-Boole translation with a trust-minimizing design.
3. Implement VC generation so each obligation is a Lean proposition linked to source code.
4. Use Lean-SMT to obtain and replay an SMT certificate, or use another Lean tactic or AI prover to construct a Lean proof.
5. Check the resulting proof in Lean. Certificate replay is specifically the Lean-SMT path, not a specified protocol for every AI prover.
6. Inference: audit language semantics and any unverified translation, VC-generation, or compilation step alongside the kernel. The proposal aims to verify translations; it does not establish that all these steps are already verified.

Verus form

evidence for trusted automation

The paper states a design goal rather than a completed foundation. It does not quantify the size of the Boole TCB or prove the planned transpilers sound. A future front end for Rust is explicitly a project goal, not an evaluated result.

## technique: AI advisory workflow with mandatory human review

what it is

CSLib treats AI tools as assistants for formalization and theorem proving and as users of the library’s training data. The governance rule is that AI-generated formalizations and proofs must undergo manual GitHub-based code review before commit. The paper warns that a proof can be sound while incomprehensible. Its stated policy is that “all formalizations and proofs that are committed to CSLib are subject to a manual, Github-based code review process” (§3, p.12).

when to use it

Use this workflow when an agent proposes definitions, specifications, or proofs. Require a human review of the statement, dependencies, proof, and generated code before adding it to a shared library.

how to do it (Inference: a checklist derived from the proposal, not a prescribed procedure)

1. Let an AI tool propose a formalization or proof.
2. Run the Lean checker and inspect all imported definitions and assumptions.
3. Ask a human reviewer to check the statement, semantic fit, and readability.
4. Record review discussion and changes in version control.
5. Merge only after manual approval; reuse the reviewed theorem as future training and proof-search data.

Verus form

Inference: Treat agent-generated Verus contracts and proof functions as pull requests requiring review. The reviewer must inspect the contract’s relation to requirements, external specifications, and proof-only code, then run Verus and relevant regression tests. A passing verifier run is necessary but does not replace review.

evidence for review governance

This is a proposed governance policy. The paper gives no inter-reviewer agreement, review defect rate, or evidence that manual review catches all AI errors.

## what is proved, measured, and trusted

CSLib’s examples prove Lean theorems when their proof bodies are present, and the Boole prototype generates Lean obligations for a loop. The paper measures neither a completed library nor end-to-end verified systems. Planned 2026 and 2027 milestones include many undergraduate algorithms, complexity and concurrency, low-level separation logic, and one substantially sized real-world system; these are roadmap goals. Figure 5 (p.9) labels “Semantics of PL” and “Lean Kernel” as the trusted computing base and depicts verified transpilation. This is the intended architecture. Inference: until translations and VC generation are proved correct, their implementations also require trust; kernel-checked solver certificates avoid having to trust the solver’s unsupported answer. Matching the formal semantics and specifications to the intended system remains a separate obligation. The roadmap calls itself “tentative” because the project is “currently only a few months old” (§6, p.13).

## techniques for the catalog

- reusable formal CS library: organize models, algorithms, specifications, and proofs into composable Lean modules
- monadic complexity accounting: return values with explicit costs and prove correctness and cost separately
- Boole intermediate verification language: translate imperative code with preconditions and invariants into Lean verification conditions
- proof-producing automation: replay Lean-SMT certificates in Lean and check proofs produced by other tactics
- advisory AI with review: permit generated formalizations while requiring machine checking and manual code review before commit
