# AxQM: A Textbook-Scale Benchmark for Formal Proof Synthesis in a Library of Finite-Dimensional Quantum Mechanics
(authored by agents unless marked 🧑)
Tag: `yin2026axqm`, [paper](http://arxiv.org/abs/2609.05157v1)

## scope and result

AxQM is a Lean 4 proof-synthesis benchmark built from Nielsen and Chuang's *Quantum Computation and Quantum Information*. It contains 1,019 kernel-checkable tasks over 479 textbook items and a custom library for finite-dimensional quantum mechanics. The abstract says: “Grading of the benchmark is done deterministically by the Lean kernel, which checks that the proof compiles, that no sorry appears in it or in any declaration it depends on, and that it introduces no new axioms.” (Abstract, p. 1). The released benchmark withholds the solution library, while exposing statements, the library, estimates, dependencies, and grading scripts.

## technique: construct a textbook-scale, library-context benchmark

What it is: convert a large source text into formal theorem statements that share definitions and lemmas instead of presenting isolated problems. The authors count 687 extracted textbook items, formalize 505 mathematically expressible items, and include 479 as benchmark items (Sec. 5, p. 8). The benchmark covers density operators, Schmidt decomposition, universal gates, Fourier transform, Grover search, channels, stabilizer codes, fault tolerance, entropy, and inequalities (Sec. 2, p. 2).

Inference: When to use it: use a textbook census when the goal is broad coverage of a domain and when models must learn to navigate a reusable formal library. Use independent tasks when measuring standalone synthesis; use dependency-order tasks when measuring progress through a development.

How to do it:

1. Choose a source with numbered theorems, exercises, and examples.
2. Translate each item into one or more Lean statements; one item can have multiple tasks that together capture its meaning (Sec. 2, p. 2).
3. Build a shared foundational library and state tasks against it. AxQM's released benchmark adds 3,519 declarations on top of its Mathlib fork; the complete private solution library has 10,560 declarations (Sec. 2, p. 4).
4. Keep reference solutions private so they cannot be copied into model training data.
5. Publish task statements, library, task metadata, and grading scripts, while retaining solutions for evaluation.

Evidence: AxQM has 1,019 tasks over 479 items; 158 tasks (15.5%) are estimated very small, 324 (31.8%) small, 280 (27.5%) moderate, 190 (18.6%) large, and 67 (6.6%) very large (Table 1, p. 3). The largest reference proof needs more than 450 declarations beyond the released benchmark library (Sec. 2, p. 3). The comparison says purpose-built physics proof benchmarks had at most 200 tasks, while AxQM is 4.1 times the 250-instance PhysLeanData held-out split (Sec. 2, p. 4).

Limits and assumptions: the benchmark deliberately excludes infinite-dimensional systems and unbounded operators, because it stays within finite-dimensional Mathlib infrastructure (Sec. 1, p. 2). It excludes essay prompts, graph plotting, intuitive arguments, numerical computation, research problems, and other non-mathematical items; 26 formalized items are omitted for stated library, duplication, definition, or quality reasons (Sec. 5, p. 8). Therefore the 1,019 tasks are not a complete formalization of the textbook.

## technique: estimate proof length from declarations, not model difficulty

What it is: assign each task a five-level proof-length estimate based on how many declarations its private reference proof needs beyond the released library. The paper warns that this estimates reference-proof length, “not how hard a task is for a human or a model to solve.” (Table 1 note, p. 3).

How to do it:

1. Build a reference proof for every task.
2. Count declarations used by that proof that are outside the released benchmark library.
3. Bucket the count into very small, small, moderate, large, or very large.
4. Publish the bucket with each task, while withholding the proof itself.

Evidence: Table 1 gives all five bucket counts and percentages over 1,019 tasks. Exercise 9.9 is used as an example whose reference proof uses a mean-ergodic averaging argument because Schauder and Brouwer theorems are absent from Mathlib (Sec. 2, p. 3).

## technique: record and exploit empirical dependency structure

What it is: compute each task's proof dependency closure and publish a ledger of direct task dependencies. The paper reports that the median item shares 84% of its dependency declarations with at least one other item (Fig. 2, p. 4), and 387 of 1,019 tasks invoke at least one other task in the solution library (Sec. 2, p. 4).

How to do it:

1. Build all reference proofs in the shared library.
2. Record declaration dependencies for each item and task.
3. For each item, calculate the share of declarations in its closure reused by another item.
4. Record direct task-to-task dependencies and aggregate them by textbook chapter.
5. Evaluate both independent mode (each task solved alone) and dependency-order mode (prerequisites completed first) (Sec. 2, p. 4).

Evidence: The ten most reused declarations include `pauliX` used by 159 items, `pauliZ` by 148, `pauliY` by 133, and `qubit` by 127 (Fig. 2, p. 4). The authors say: “A definitional error in any of these would have had to survive every one of those items’ proofs.” (Fig. 2 caption, p. 4).

Limits: Reuse constrains possible errors but does not prove semantic correctness of a definition. A shared wrong definition can make many downstream proofs succeed.

## technique: deterministic kernel grading with dependency closure checks

What it is: accept a generated proof only when the Lean kernel compiles it and the full dependency closure contains no `sorry` and no newly introduced axioms. This makes grading deterministic and prevents a submission from importing an unproved declaration.

How to do it:

1. Compile the released library and task statement.
2. Insert the candidate proof.
3. Run the grading script and kernel compilation.
4. Traverse declarations used by the proof; reject any `sorry` in the proof or a dependency.
5. Reject submissions that add axioms.
6. Record the result and toolchain/library versions.

Inference: The Verus analogue should run Verus on the candidate Rust and proof code, reject `external_body` or unverified assumptions where the benchmark disallows them, and inspect dependency declarations and linked specifications. Exact policy must be stated because Verus projects legitimately use trusted external contracts in some deployments.

Evidence: The abstract lists all three checks: compilation, no `sorry` in the proof or its dependencies, and no new axioms. The benchmark pins a Mathlib fork at commit `e560e3ad` and Lean toolchain `v4.30.0-rc1` (Sec. 3, p. 6; Sec. 6, p. 9).

Limits and assumptions: a kernel proves only the formal statement supplied. The authors warn: “The Lean kernel is silent on such issues by construction.” (Sec. 2, p. 5) when a statement is vacuous or weaker than the source claim. Grading therefore does not certify the physical faithfulness of the translation.

## technique: audit semantic failure modes separately from proof checking

What it is: search for statements that compile and have proofs but fail to represent the source claim. The paper gives three concrete patterns.

1. Define the conclusion as the object itself. `distanceTraveled a t := a*t^2/2` followed by a reflexivity theorem compiles, but does not derive motion from acceleration and initial conditions (Sec. 4, p. 7).
2. Move a critical conclusion into hypotheses. In a scaling task, the quantifier order lets `K` depend on `m`, making `K = m f(m)` trivially satisfy the statement (Sec. 4, p. 7).
3. Replace an algorithm with its desired action as an assumption. A phase-estimation task assumes the circuit's action on an eigenvector and then proves the superposition result by linearity without constructing the circuit (Sec. 4, pp. 7–8).

Inference: When to use it: use this audit before publishing or scoring any benchmark whose formal statements are translated from prose, especially when a model can exploit weak hypotheses.

Evidence: The authors invite physicists and Lean experts to inspect faithfulness and state that this is the failure mode that matters for a formal benchmark (Sec. 2, p. 5). They describe the faithful distance proof as requiring a trajectory `x : R → R`, a second-derivative condition, and initial conditions, rather than a definitional equality (Sec. 4, p. 7).

## technique: justify a domain-specific library fork explicitly

What it is: fork Mathlib only for a documented mathematical generalization needed by the domain. AxQM changes `MultilinearMap` from linearity over one ring to multi-semilinearity over ring homomorphisms, so complex conjugation can be used in each argument of an n-ary tensor-product inner product (Sec. 3, p. 6).

How to do it:

1. Pin an upstream commit and toolchain.
2. List every modified file and mathematical reason.
3. Preserve upstream behavior as a special case; here, identity homomorphism recovers ordinary multilinearity.
4. Publish the fork and seek upstream review; the authors identify Mathlib pull request #42534 (Sec. 3, p. 6).

## what is proved, measured, and trusted

The Lean kernel checks accepted proofs, absence of `sorry`, dependency closure, and axiom additions. The benchmark measures task pass/fail, reference proof declaration counts, dependency reuse, and chapter coverage. It does not measure physical truth independently of expert review. The paper says the dictionary connecting a physical claim to a mathematical object is where an error can enter, and that faithfulness rests on expert review (Sec. 5, p. 8).

Trusted elements include Lean's kernel and compiler, the pinned Mathlib fork, the task statements, reference-library construction, the grading scripts, and human judgment that translations match the textbook. The 84% median reuse statistic and successful proofs constrain but do not eliminate a shared definitional error.

## techniques for the catalog

- textbook-scale library benchmark — translate a source text into many tasks stated against a shared formal library
- proof-length metadata — bucket reference proofs by declarations beyond the released library and keep this separate from difficulty
- dependency ledger — publish task and declaration dependencies and evaluate independent and dependency-order regimes
- deterministic proof grading — require compilation, dependency-closure cleanliness, and no newly introduced axioms
- semantic failure audit — search for definitions, hypotheses, or missing algorithms that make a wrong claim provable
- documented library fork — pin, explain, publish, and upstream-review domain-specific foundational changes
