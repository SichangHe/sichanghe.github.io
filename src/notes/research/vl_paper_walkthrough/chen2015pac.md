# PAC Learning-Based Verification and Model Synthesis
(authored by agents unless marked 🧑)
Tag: `chen2015pac`, [paper](http://arxiv.org/abs/1511.00754v1)

## problem and guarantee
The paper learns a regular approximation of feasible control-flow decision vectors, then checks whether the learned automaton intersects an automaton of error paths. It targets programs with assertions and uses PAC learning because exact equivalence of feasible paths is generally undecidable. The paper states: “The use of PAC learning provides us with statistical guarantees about the correctness of C”. Its central claim is statistical: “Our learning-based approach finds a balance between formal analysis and testing.” A result is PAC (epsilon, delta)-correct under a stated sampling distribution; it is not an exact proof that all executions are safe.

## technique: PAC automata verification

when to use it

Represent a single-procedure program as a control-flow graph (CFG). Label each branch choice 0 or 1; sequential edges are silent. A decision vector is feasible when its path formula is satisfiable, and an error vector reaches an assertion-error node. Use the technique when exact feasible-path language construction is too hard but a distribution over paths and an acceptable error probability are available.

how to do it

1. Build the CFG G, the feasible language `decision(Pi)`, and a finite error automaton B accepting error decision vectors (Sections 2 and 3)
2. Run an online regular-language learner. Answer `Mem(d)` by unfolding d into a CFG path and asking an SMT/model checker whether its path formula is satisfiable (Section 6)
3. For each candidate automaton C, run batched sampling from a concolic tester. If any sampled feasible vector is outside C, return it as an equivalence counterexample; if a sampled vector is also in B, report a feasible bug (Sections 4.2 and 5)
4. If no sampled vector refines C, use `q_i = ceil((1/epsilon)(ln(1/(1-delta)) + i ln 2))` batched samples for the i-th equivalence query. Accept C as PAC-correct with confidence delta when all samples agree (Section 4.3 and Eq. 1)
5. Check language intersection `L(C) intersect L(B)`. If empty, return the PAC correctness claim and the regular model C; otherwise test the witness for feasibility and either report the bug or refine C (Section 8)

The paper's modified learner distinguishes three cases: a candidate language containing an infeasible bad vector gets a refinement counterexample; a feasible bad vector is returned to the user; and an empty candidate/error intersection triggers an equivalence query. The guarantee depends on IID batches from the feasible-path distribution. The authors warn that uniform input sampling can miss rare paths, such as a branch requiring two 64-bit values both to be zero, whose probability is 2^-128.

## technique: concolic batched sampling

Start with randomly selected inputs, execute the program to obtain a decision vector, then flip a branch decision and solve for inputs reaching the new path. Crest is restarted after each batch of k paths so batches are IID under the paper's assumption. This gives a distribution over `(Sigma*)^k`; accepting a candidate after q_i batches bounds the probability that any vector in a batch differs between the target and C by epsilon with confidence delta. The batch construction is the paper's adaptation needed because ordinary random input values do not approximate path coverage.

## Verus form (inference)

Inference: encode each CFG transition as a Rust function or state-machine step with `requires` for transition feasibility and `ensures` for state updates. Use a `spec fn` to map a path word to its abstract branch sequence, and `proof fn` lemmas to show local concatenation and assertion preservation. A Verus loop can carry the learned automaton state with `invariant` clauses; use `assert` for membership and intersection facts. The PAC bound remains an external probabilistic argument: Verus can prove the deterministic checker and contracts, but it cannot turn finite samples into an exact universal guarantee. Inference: store the learned automaton as ghost/spec data and keep executable concolic sampling outside the verified kernel.

## evidence, assumptions, and limits

The Pac-Man prototype used SV-COMP 2015 recursive benchmarks: 24 examples, eight containing errors, three runs per example, epsilon=0.1, confidence delta=0.9, batch size k=10, and a 900-second timeout (Section 11). Among five learners, KV verified 15 bug-free examples and found six bugs through the bad automaton, with two additional bugs found by Crest; it had two false negatives and one timeout, for 21 of 24 examples solved. The table's denominator is 24 examples; values are averages of three runs unless stated otherwise. Membership queries consumed 30% of KV's 2406 seconds (2896 membership and 548 equivalence queries). With RBS, 1487 of 1500 tested batches were accepted (99.13%) under restart; without restart, 14,977 of 15,000 vectors were accepted (99.86%). These are coverage checks against generated Crest samples, not proof of all paths.

The method assumes a fixed IID path distribution, correct membership answers, a trustworthy SMT/model checker, and that the chosen epsilon and delta are meaningful for deployment. Its own equivalence step is “While generally unsound, the technique still provides statistical guarantee about the correctness of the inferred model”. What remains untrusted includes the program model, assertion meaning, sampler distribution, learner implementation, solver, and probability assumptions. Inference: threat to agent-written verified Rust is high if PAC acceptance is presented as a universal Verus proof, and moderate if it is used only to prioritize paths before exact contracts. VL should not redo the paper's PAC learner, batched concolic distribution, or error-automaton intersection; it should preserve the explicit distinction between statistical coverage and deductive proof.

## techniques for the catalog
- PAC regular-path learning: infer a regular approximation of feasible branch vectors with epsilon/delta guarantees
- batched concolic equivalence: generate IID batches by branch flipping and use the sample bound for approximate equivalence
- error automaton intersection: intersect the learned model with bad-path language and check witnesses with an SMT solver
- statistical model reuse: reuse a PAC automaton for new assertion/error automata while retaining its distributional guarantee

Checked 2026-10-15 against the paper by a Codex agent for pac_learning_based_verification_and_mode_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
