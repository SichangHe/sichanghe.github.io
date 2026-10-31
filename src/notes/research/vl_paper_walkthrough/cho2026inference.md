# Inference-Time Code Selection via Symbolic Equivalence Partitioning
(authored by agents unless marked 🧑)
Tag: `cho2026inference`, [paper](https://arxiv.org/abs/2604.06485)

## scope and result

The paper proposes Symbolic Equivalence Partitioning (SEP) for selecting one program from multiple language-model generations. Its abstract states: “SEP then uses symbolic execution to partition the remaining candidate programs into bounded functional equivalence classes and selects from the dominant equivalence class.” (Abstract, p. 1) The method adds no learned verifier, auxiliary test generation, or LLM calls after the initial candidate generation.

The evaluation uses HumanEval+ (164 Python synthesis problems) and 438 filtered LiveCodeBench problems, seven models, and candidate pools N ∈ {5, 10, 20} (§4.1.1, p. 5; §4.2, p. 6). At N=10, average accuracy rises from 0.754 to 0.826 on HumanEval+ and from 0.565 to 0.647 on LiveCodeBench, averaged over seven models (§4.2, p. 6). These are average accuracies over the named benchmark tasks and models, not a formal correctness guarantee.

## technique: public-example filtering

What it is. SEP first executes each candidate on input-output examples included in the problem statement. Candidates that fail or raise an error are removed. The paper says: “Candidates that raise runtime errors or produce outputs inconsistent with the official examples are removed before symbolic partitioning.” (§3.1, p. 3)

When to use it. Use this when a task provides public examples that are trusted as a small validity signal. The examples are intentionally not treated as a complete test suite. They remove candidates already known to violate the specification before a correlated wrong group can dominate the symbolic vote.

How to do it.

1. Generate N candidate programs for the same specification. (§3, p. 3)
2. Run every candidate on each public example. (§3.1, p. 3)
3. Discard candidates with a runtime error or an output inconsistent with an official example. (§3.1, p. 3)
4. Pass the remaining pool P, of size N′ ≤ N, to symbolic partitioning. (§3, p. 3)

Verus form. Inference: make each example an executable test of a Rust function before invoking proof-candidate selection. Inference: a Verus `ensures` clause can formalize an example for a specific input, but example tests alone do not prove the universal postcondition. Inference: retain failed candidates as diagnostics rather than treating filtering as a proof.

Evidence and failure. Removing the filter reduces average representative accuracy by 4.4 points on HumanEval+ and 4.0 on LiveCodeBench. Mostly-wrong dominant partitions rise from 35 to 64 on HumanEval+ and from 78 to 151 on LiveCodeBench (§4.3, p. 8; Tables 13–14, Appendix H). Without public examples, SEP still runs, but correlated wrong solutions are harder to remove (§5, p. 9).

## technique: bounded symbolic equivalence checking

What it is. Two programs are equivalent with respect to explicit domain constraints C when they produce identical outcomes for all valid inputs: `pi ≡C pj ⇔ ∀x ∈ Dom(C), EOi(x) = EOj(x)` (Eq. 1, §3, p. 3). SEP searches for a divergence formula, `∃x such that C(x) ∧ PC(x) ∧ EOi(x) ≠ EOj(x)` (Eq. 2, §3.2, p. 3). A satisfiable formula yields a counterexample. No counterexample within the fixed budget is treated as equivalence for partitioning.

How to do it.

1. Represent each candidate's branch predicates as a symbolic path condition PC(x). (§3.2, p. 3)
2. Include domain constraints C(x), or use a tautology when the problem gives none. (§3.2, p. 3)
3. Ask the SMT solver for an input satisfying both path conditions and unequal execution outcomes. (§3.2, p. 3)
4. If the solver returns an input, record it as a counterexample and mark the pair different. (§3.2, p. 3)
5. If the bounded search finds no counterexample, mark the pair equivalent for this partitioning run. (§3.2, p. 3)
6. Include return values, exceptional termination, and reachable-input mutations in the execution outcome. (§3.2, p. 3)

The implementation uses CrossHair for Python and Z3. The paper fixes a per-condition timeout of 15 seconds and a per-path timeout of √15 seconds (≈ 3.87 s), held fixed across benchmarks, models, and candidate pool sizes (§3.2, p. 4). This is an approximation: “This yields a bounded approximation to functional equivalence, defined by the explored symbolic paths and resource limits.” (§3.2, p. 4)

Verus form. Inference: for Verus candidates, define a shared mathematical `spec fn` for the desired behavior and prove candidate functions' `ensures` clauses against it. Inference: where direct equivalence is unavailable, use a proof function to show both implementations return equal spec values under the same `requires` domain. Inference: use loop invariants for bounded loops and explicit result modeling for exceptional outcomes; do not treat a timeout as proof of equivalence. Verus can establish universal properties for supported code, while SEP's bounded search only supplies evidence up to its symbolic budget.

Evidence and limits. Pairwise equivalence accuracy, measured against benchmark correctness on pairs containing at least one correct program, averages 0.884 over 42 model-budget settings: 0.900 on HumanEval+ and 0.868 on LiveCodeBench (§4.3, p. 7). Among 8,969 consensus-eligible instances, 505 (5.63%) trigger either a mostly-wrong dominant partition or a correct-containing partition with a wrong representative (§4.3, p. 7). The paper's limitations section names bounded search (a semantic difference beyond the search horizon may be missed) and greedy order dependence as sources of error (§5, p. 8). It mentions path explosion only as a general weakness of symbolic execution (§2, p. 3).

## technique: inject domain constraints into the SMT solver

What it is. SMT-Constrained Pruning extracts explicit input bounds from the problem statement, normalizes them into Python AST expressions, and injects them as solver assumptions. It avoids program-level `assert` statements, which would create failure branches and waste symbolic budget (§3.3, p. 4).

How to do it.

1. Extract the explicit constraint block from the natural-language description. (§3.3, p. 4)
2. Parse parameter expressions into ASTs and normalize common forms such as chained comparisons. (§3.3, p. 4)
3. Add the normalized constraints to the Z3 solver preamble for each candidate. (§3.3, p. 4)
4. Let symbolic paths that violate the assumptions become infeasible. (§3.3, p. 4)
5. Run divergence checks only over the resulting valid domain. (§3.3, p. 4)

The walkthrough extracts `1 ≤ |nums| ≤ 13` and `−9 ≤ nums[i] ≤ 9` for `maximum-strength-of-a-group`, then uses them as solver-side assumptions (§3.5, p. 4). In that example, ten candidates produce four partitions; the dominant partition has seven candidates, all correct under benchmark evaluation (§3.5, p. 5).

Verus form. Inference: encode domain constraints in `requires` clauses and pass them as assumptions to proof lemmas. Inference: preserve the distinction between a precondition and an executable assertion; a `requires` clause restricts the theorem's domain, whereas an assertion changes runtime behavior. Inference: use a spec predicate for structured inputs and prove that parser-normalized constraints imply the predicate before invoking candidate equivalence proofs.

Evidence and limits. On LiveCodeBench N=10, constraint injection leaves representative accuracy nearly unchanged, 0.647 versus 0.646, but raises pairwise equivalence accuracy from 0.721 to 0.866 and reduces symbolic work by 17.4% (§4.3, p. 8; Appendix G). The authors caution that constraints only implicitly specified in natural language or embedded in complex problem logic are not reliably recovered, so the engine may still explore unintended inputs and spuriously separate equivalent solutions (§5, p. 9).

## technique: greedy representative-based partitioning

What it is. SEP processes candidates in sequence, compares each with representatives of existing partitions ordered by partition size, joins the first equivalent partition, and otherwise starts a new one. It returns the representative of the largest partition (Algorithm 1, Appendix B, p. 13).

How to do it.

1. Initialize an empty set of partitions after public-example filtering. (Algorithm 1, lines 3–4, p. 13)
2. Sort existing partitions by descending cardinality for each candidate. (Algorithm 1, lines 5–7, p. 13)
3. Compare the candidate with each partition representative using bounded symbolic equivalence. (Algorithm 1, lines 8–14, p. 13)
4. Add it to the first equivalent partition, or create a singleton partition if none matches. (Algorithm 1, lines 10–18, p. 13)
5. Return the representative of the largest partition. (Algorithm 1, line 21, p. 13)

The procedure reduces comparisons from O((N′)²) to O(N′·M), where M is the number of discovered semantic partitions (§3.4, p. 4). The authors treat bounded equivalence as approximately transitive for this purpose, so partition order can matter.

Verus form. Inference: represent a partition as a sequence of candidate identifiers with a representative and a proved relation to the shared specification. Inference: prove the router's selection invariant with a `proof fn` over the sequence, and state the result as an `ensures` property that the selected representative belongs to a maximal observed class. Inference: this proves selection relative to the supplied relation; it does not prove that the maximal class is correct unless each candidate has a verified contract.

Evidence and cost. Across the 42 evaluated settings (7 models, 3 budgets, 2 benchmarks), SEP is best or tied-best against the baselines in 40 (§4.2, p. 6). Inference: at N=10 alone it is not always best; on LiveCodeBench gpt-oss-20b SRank scores 0.885 versus SEP 0.881 (Table 2). Average SEP wall-clock times on HumanEval+ are 539.4s, 1271.1s, and 2722.6s for N=5, 10, and 20; on LiveCodeBench they are 1103.1s, 2583.9s, and 5291.9s (§4.4, p. 8). The authors compare these component-level CPU measurements with CodeT's auxiliary test-generation time, 11,192.4s and 40,986.0s respectively, and caution that this is not a normalized CPU-versus-GPU comparison (§4.4, p. 8; Appendix I). The CodeT figure excludes candidate execution and ranking time, so it is a lower bound on that baseline's cost (Appendix I).

## what is proved, measured, and trusted

Measured: benchmark accuracy, Pass@1 and Pass@N baselines, pairwise equivalence accuracy, partition failure rates, constraint-injection ablations, public-example ablations, and CPU time. The experiments cover seven models from 4B to 20B parameters, two benchmarks, and three sampling budgets (§4.1–4.3, pp. 5–7).

Trusted or unproved: public examples, extracted domain constraints, CrossHair and Z3, bounded path exploration, candidate runtime behavior, benchmark tests and labels, and the assumption that a dominant partition is correct. The authors state that adapting the Python implementation to Rust requires a symbolic execution backend such as KLEE or CBMC (§5, p. 8). Inference: a Verus implementation could replace bounded equivalence evidence with proofs for candidates whose contracts are available, but generated candidates without contracts remain an open verification problem.

## techniques for the catalog

- public-example filter: remove candidates that fail supplied examples before symbolic comparison
- bounded symbolic equivalence: search SMT divergence formulas under path and resource limits
- SMT-constrained pruning: inject normalized input constraints as solver assumptions
- greedy semantic partitioning: compare candidates to largest existing representatives and select the largest class
- proof-backed candidate ranking: inference, use Verus specs and contracts to replace bounded agreement where proofs exist
