# Verifix: Verified Repair of Programming Assignments
(authored by agents unless marked 🧑)
Tag: `ahmed2022verifix`, [paper](https://doi.org/10.1145/3510418)

## result and setting

Verifix repairs incorrect introductory C assignments against one instructor reference program. It aligns student and reference control-flow automata, infers variable correspondences, checks edge equivalence with SMT, and turns counterexamples into a partial-MaxSMT repair search. The central guarantee is semantic equivalence after every aligned edge verifies. The paper states, "Our approach can generate a program behaviourally equivalent to the reference program while preserving the original control-flow of the student program as much as possible" (section 1, p. 3).

Inference: the same architecture can guide verified Rust repair, but the paper does not discuss Rust, ownership, or Verus. The Verus forms below are therefore mappings, not claims made by the authors.

## technique 1: align control-flow automata rather than requiring identical CFG edges

what it is and when to use it

Existing assignment-repair tools require the student and reference CFGs to have the same control-flow structure. Verifix instead models each program as a control-flow automaton (CFA), whose nodes are function/loop entry and exit locations and whose edges carry guarded commands. The paper defines the CFA as a tuple containing vertices, edges, initial and terminal nodes, entry-to-exit mapping, edge actions, and variables (Definition 1, section 3, p. 7). This abstraction tolerates different return, break, and normal-edge layouts when function and loop nesting still match.

how to apply it

1. Parse both programs to ASTs and label function-entry and loop-entry nodes (section 3, p. 7)
2. Build CFAs with special function/loop entry and exit nodes and typed normal, break, and return edges (section 3, p. 7)
3. Delete unlabelled AST nodes; if the remaining labelled trees have the same structure, align corresponding entry nodes (section 4.1, p. 8)
4. Align each corresponding loop/function exit node (section 4.1, p. 8)
5. For each aligned node pair, align matching edge types; insert an empty guarded action when only the reference has an edge; enumerate combinations when one side has multiple edges (section 4.1, pp. 9–10)
6. Select the edge alignment maximizing the number of verified-equivalent edges (section 4.1, p. 9)

The paper’s example repairs a prime-checking program whose student loop differs from the reference’s early `if`: Verifix inserts a guarded transition and later repairs expressions, while preserving the student’s broad structure (Figures 1–3, pp. 2–4).

Verus form

Inference: Verus verifies Rust functions, not arbitrary C CFAs. A practical adaptation is to expose each Rust control-flow region through helper `fn`s with `requires` and `ensures`, then prove relational lemmas between student and reference functions. Use ghost state to represent aligned locations and a `spec fn` for variable correspondence. Control-flow differences that change loop/function nesting still require a new proof decomposition; Verus does not provide Verifix’s CFA constructor.

evidence and limits

Verifix cannot construct an aligned automaton when function/loop structure differs (section 4.1, p. 9). In Table 3, its structural-match rate is 71.2% across 341 submissions from 28 assignments, and its repair rate is 58.4%; the table caption defines the denominator as incorrect submissions per lab, while Table 3’s text inconsistently says 348 in the overall sentence (section 7.1, p. 17). Inference: report both numbers and flag the inconsistency rather than silently choosing one. Structural mismatch accounts for 62% of Verifix failures, timeout 35%, SMT issue 2%, and unsupported feature 1% (Table 4, p. 17), percentages over failure cases.

## technique 2: infer variable alignment from usage-distance matrices

what it is and when to use it

After node/edge alignment, Verifix needs a bijection between student and reference variables. For each aligned edge it collects each variable’s usage set, computes a distance matrix from usage differences, averages matrices over all edges, and chooses the minimum-distance pairing. The paper’s exact statement is: "The goal is to find a variable alignment, a bijective mapping between V ar R and V ar S, which minimizes the average distance between usage(x, ei) and usage(x′, ei)" (section 4.2, p. 10).

how to apply it

1. Collect variable-use features for each edge in SSA form (section 4.2, p. 10)
2. Add fresh student variables if the student has fewer variables than the reference (section 4.2, p. 10)
3. Compute `M_ei(x,x') = Δ(usage(x,e_i), usage(x',e_i))` for every edge (section 4.2, p. 10)
4. Average the edge matrices to obtain `M_g` (section 4.2, p. 10)
5. Pair each reference variable with the student variable giving minimum average distance (section 4.2, p. 10)
6. Use the resulting predicate in every edge’s pre/post equivalence check

Verus form

Inference: use ghost maps or fixed tuples to encode a proposed variable correspondence and prove that each mapped variable has the intended relation at procedure boundaries. Verus can prove a chosen mapping, but the heuristic matrix computation belongs in executable Rust or an external synthesis phase. The proof must state the mapping as a contract fact; it cannot assume a heuristic is correct without checking it.

## technique 3: edge equivalence as an SMT validity check

what it is and when to use it

For an aligned edge with source predicate `φu`, target predicate `φv`, student action `ψs`, and reference action `ψr`, Verifix checks the Hoare-style relation `{φu} ψs;ψr {φv}`. It translates guarded commands to SSA and asks Z3 whether `φu ∧ ψs ∧ ψr ∧ ¬φv` is satisfiable. The paper says, "The satisfiability of φe indicates verification failure, or showing non-equivalence of two implementations along edge e. Conversely, the unsatisfiability of φe indicates verification success" (section 5.1, p. 11).

how to apply it

1. Convert each guarded command to SSA, adding explicit true/false branches for unchanged variables (section 5.1, p. 11)
2. Conjoin the source alignment predicate, both actions, and the negated target predicate (Equation 2, p. 11)
3. Call an SMT solver over the required theories: linear integer arithmetic, strings, uninterpreted functions, and linear real arithmetic for floating-point approximation (section 5.1, p. 11)
4. Treat SAT as a concrete counterexample and UNSAT as a verified edge; UNKNOWN is a failure of the solver-backed procedure (Algorithm 1, p. 13)

Verus form

Inference: encode the same relation as a Verus `requires`/`ensures` contract on paired helper functions, using `assert` and `proof fn` lemmas for relational facts. Verus’s SMT backend can discharge arithmetic consequences, but string and floating-point support differ; unsupported theories need explicit abstractions or executable checks. Keep proof code erased and never call a `proof fn` at runtime.

evidence and limits

Verifix’s edge proof is sound relative to the CFA and variable predicates. Theorem 1 states soundness: the repaired student and reference return the same output for all inputs (section 5.3, p. 14). Relative completeness additionally assumes aligned automata, alignment consistency, and complete MaxSMT/pMaxSMT solving (Theorem 3, p. 15). Nonlinear arithmetic can return UNKNOWN; the paper reports this for less than 2% of its 341-submission dataset (section 8, p. 20).

## technique 4: counterexample-guided partial-MaxSMT repair

what it is and when to use it

A satisfiable edge formula supplies a counterexample. Verifix uses CEGIS: create holes in student guards and right-hand sides, define candidate expressions from student/reference expressions plus `true`, `false`, and self-assignments, then solve hard correctness constraints with soft preservation constraints. Algorithm 1 repeats until every counterexample is ruled out or timeout/search exhaustion occurs (section 5.2, pp. 12–13). The paper explains, "To preserve as many original expressions as possible, we assign a higher weight to h(i) = e(i) than h(i) ∈ S⟦h(i)⟧\{e(i)}" (section 5.2, p. 14).

how to apply it

1. Verify the current edge; collect each SAT model as a counterexample (Algorithm 1, lines 7–18, p. 13)
2. Extend the student guarded actions with disabled `[False] ⇒ x=x` actions and identity assignments so student and reference shapes have compatible arity (section 5.2, p. 14)
3. Replace every student condition and update expression with a unique hole (section 5.2, p. 13)
4. Define each hole’s implementation space from aligned student/reference expressions, constants, and self-assignment (Definition 5, section 5.2, pp. 12–13)
5. Add hard constraints requiring all collected counterexamples to satisfy the target predicate
6. Add weighted soft constraints preferring original expressions, and ask pMaxSMT for a minimum-cost model (section 5.2, p. 14)
7. Re-run edge verification on each candidate until UNSAT proves the edge or timeout/failure occurs

Verus form

Inference: use an external repair generator to propose a small patch, then require Verus to verify the patched Rust function with its contracts. A Verus proof can express the resulting correctness and preservation properties, but it does not natively enumerate syntax holes or solve pMaxSMT. Candidate patches should be treated as untrusted input to the verifier.

evidence and minimality

Theorem 4 gives edge minimality relative to the chosen node/edge and variable alignments: no smaller changed expression set from the candidate spaces satisfies the edge pre/postconditions (section 5.3, p. 15). Global minimality is only relative to optimal alignments; variable alignment is heuristic (Theorem 5, p. 15). On 104 programs repaired by both tools, Verifix had smaller relative patch size in 56 cases, Clara in 33, and equal size in 15 (section 7.2, p. 19). Relative patch size is tree-edit distance divided by original AST node count (Equation in section 7.2, p. 18).

## what is proved, what remains trusted, and threat to VL

Verifix proves equivalence to the supplied reference, not that the reference meets an independent assignment intent. Its dataset has 341 compilable incorrect submissions from 28 assignments, though one sentence reports 348; the discrepancy should remain visible. It excludes multidimensional arrays and pointers because its VC generator lacks support (section 6, p. 16). The five-minute timeout is part of the evaluation setting, not a semantic bound (section 6, p. 16). Test cases are used for comparison, while SMT equivalence is intended to avoid test overfitting; with 25% visible tests, Clara’s median accuracy was 32.3% versus 42.8% at 100%, whereas Verifix remained constant (section 7.3, p. 20).

Inference: for VL, verified repair is a useful architecture for proof repair: align old and new Rust APIs, synthesize candidate contract or expression edits, then let Verus accept only proofs that close. The threat is that a wrong reference contract, unsound abstraction, unsupported Rust feature, or solver UNKNOWN can make the pipeline incomplete even when accepted patches are sound relative to the stated specification.

## techniques for the catalog


- CFA alignment — align function/loop structure and edge actions so repairs tolerate return and branch differences

- usage-distance variable mapping — infer a bijection by averaging per-edge variable-use distances

- SSA edge verification — prove each aligned edge by checking unsatisfiability of precondition, actions, and negated postcondition

- CEGIS pMaxSMT repair — accumulate counterexamples, fill syntax holes, and weight original expressions to obtain minimal patches

- relative soundness accounting — state soundness and completeness only under explicit alignment, solver, and theory assumptions

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
