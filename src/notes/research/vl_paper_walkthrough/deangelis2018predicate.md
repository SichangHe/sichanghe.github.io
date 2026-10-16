# Predicate Pairing for Program Verification
(authored by agents unless marked 🧑)
Tag: `deangelis2018predicate`, [paper](http://arxiv.org/abs/1708.01473v2)

## scope and contribution

De Angelis, Fioravanti, Pettorossi, and Proietti transform constrained Horn clauses (CHCs) before solving them. The target is a solver that searches for models definable in a constraint class A, such as linear integer arithmetic (LIA). Their key observation is that relational verification clauses often require relations between two recursive calls, while predicate-abstraction solvers infer facts about each call separately. The paper introduces Predicate Pairing, which “introduces a new predicate defined by the conjunction of two predicates together with a conjunction of constraints.” (section 1, PDF page 4).

Inference: For VL, this is a solver-preprocessing pattern for relational lemmas: pair calls whose arguments are synchronized, then let the SMT-backed verifier discover cross-call invariants in a simple theory.

## technique: encode program properties as CHCs

What it is. A Hoare triple or relational property is reduced to satisfiability of clauses. For `sum_upto`, the paper encodes the loop relation `su` and a false-headed clause that represents a violation. It explains: “This triple is valid if the following set of clauses, called verification conditions, is satisfiable.” (section 1, PDF page 2).

How to do it.

1. Specialize an interpreter for the imperative language to each program, producing CHCs for its operational semantics (section 1, PDF page 2).
2. Represent loops with recursive predicates and base/step clauses; `su` has a base clause for `X≤0` and a recursive clause for `X>0` (Figure 1, PDF page 2).
3. Encode a property violation as a clause with head `false`, whose body contains precondition, bad postcondition, and program predicates (section 1, PDF page 2).
4. Ask a CHC solver for satisfiability. A model of the clauses proves that no violating state exists under the encoded semantics (section 1, PDF page 2).

Verus form. Inference: represent the program relation as a `spec fn` or proof predicate and encode the property as a lemma with `requires` and `ensures`. For loops, use a `while` invariant rather than recursive CHCs when verifying executable Rust. The false-headed-clause idea maps to assuming a negated postcondition and proving `false` with `assert(false)`; it is an inference because the paper does not use Verus.

Limits. CHC satisfiability is undecidable, and solvers may return no conclusive answer (section 1, PDF page 3). A-definable-model success is therefore a solver capability condition, not a general completeness theorem.

## technique: preserve and improve A-definable models by unfold/fold

What it is. The paper defines transformation rules for introducing definitions, unfolding predicates, folding conjunctions into predicates, and replacing equivalent constraints. The rules preserve ordinary D-satisfiability, and every transformation sequence is A-sound: an A-definable model before transformation implies one after transformation (Theorems 2 and 4, PDF pages 9–10). The authors state: “Every transformation sequence is A-sound.” (Theorem 4, section 3, PDF page 10).

How to do it.

1. Choose a constraint domain D and a solver model class A⊆D (section 3, PDF page 8).
2. Introduce a fresh definition `newp(X) ← c, G` where `c` is in A and `G` is a non-empty conjunction of existing atoms (rule R1, PDF page 8).
3. Unfold an atom by replacing it with the bodies of all matching clauses (R2, PDF page 8).
4. Fold a matching conjunction into a previously introduced definition when the substitution and variable conditions hold (R3, PDF page 9).
5. Replace equivalent disjunctive constraints and delete inconsistent bodies (R4, PDF page 9).
6. Ensure each introduced definition is unfolded at least once; then original and transformed sets are D-satisfiable together (Theorem 2, PDF page 9).

Verus form. Inference: this is analogous to introducing ghost predicates and lemmas that summarize conjunctions of facts, then rewriting proof obligations to use the summary. Use `lemma` functions and `assert` statements in Verus; do not treat `lemma` as a runtime keyword or use CHC rule syntax directly. The semantic preservation proof remains an external metatheory unless implemented in Verus.

A-soundness is one-way. The paper gives additional conditions for A-completeness—no self-unfolding and only reversible folding (Theorem 5, PDF page 11)—but Predicate Pairing deliberately uses non-reversible folding to create an A-model where none existed before. Inference: a transformed solver goal can be easier without preserving the set of all solver-definable explanations.

## technique: choose predicate pairs by shared equalities

What it is. Predicate Pairing creates a fresh predicate for two atoms plus equalities implied by the current constraint. The strategy repeatedly unfolds one atom from each predicate family, then folds the pair that shares the greatest number of cross-argument equalities. Algorithm 1 defines `Eq(d,A,B)` as equalities between variables of A and B entailed by constraint d (section 4, PDF page 14).

How to do it.

1. Start with a false-headed clause `Cinit: false ← cinit, q(X), r(Y)` and disjoint clause sets Q and R defining q and r (Algorithm 1, PDF page 14).
2. While a body contains an atom from Q and one from R, unfold each once (Algorithm 1, PDF page 14).
3. In each unfolded clause, inspect every candidate pair and compute `Eq(d,A,B)` from the body constraint d (Algorithm 1, PDF page 14).
4. Select the pair with maximal equality count among all Q/R atom pairs in that clause (Algorithm 1, PDF page 14).
5. If an existing definition matches, fold with it; otherwise introduce `newp(Z) ← e,A,B`, where Z contains variables from both atoms and e is the equality conjunction (Algorithm 1, PDF page 14).
6. Add the new definition to the input worklist so it is itself unfolded and paired in later iterations (Algorithm 1, PDF page 14).
7. Stop when no mixed Q/R clause remains. The strategy terminates because the number of possible `(e,A,B)` conjunctions is finite (section 4, PDF page 19).

Verus form. Inference: identify synchronized recursive calls in two proof branches, define a ghost predicate over both states and shared indices, and prove recursive relational lemmas using that predicate. The equality-maximization heuristic could guide a lemma generator, but Verus has no CHC transformation phase; it must generate Rust proof functions or assertions.

## worked example: Ackermann program equivalence

The paper compares recursive `ackermann1` and iterative `ackermann2`. Their equivalence is encoded by a clause requiring equal non-negative inputs and unequal outputs. A solver restricted to LIA cannot reason about each Ackermann predicate separately because the function is nonlinear. The first pairing definition is:

`new1(M1,N1,A1,M2,N2,A2) ← M1=M2, N1=N2, ack1(M1,N1,A1), ack2(M2,N2,A2)` (section 4, PDF page 17).

After unfolding, the strategy pairs the recursive calls with the most shared equalities, then introduces `new2` for a second pair. The resulting recursive definitions let Z3 infer output equality without representing the Ackermann function itself. The paper concludes that “the introduction of the new predicate su_sq(M, R0, Sum, N, S0, Sqr), defined in terms of the conjunction of su(M, R0, Sum) and sq(N, Y, S0, Sqr), allows us to discover linear relations between Sum and Sqr without having to deal with nonlinear constraints.” (Example 3, section 3, PDF page 13).

Evidence. Z3 constructs an LIA-definable model for the transformed clauses; by Theorem 2 this proves satisfiability of the original clauses and thus program equivalence (section 4, PDF pages 19–20). The paper does not give a time or denominator for this single example.

## relational properties and security

The same false-headed pattern encodes monotonicity, injectivity, functional dependence, non-interference, loop optimization correctness, and array-program equivalence (section 5, PDF pages 20–27). For non-interference, two executions start with equal public input and arbitrary private input; unequal public outputs form the violating body. The paper gives the clause: “false ← OutL 6= OutL1, L = L1, p(L, H, OutL), p(L1, H1, OutL1)” (section 5.3, PDF page 24). Satisfiability means no violating pair exists; for the shown `HL` program, the clauses are unsatisfiable because the program leaks private state through `low` (section 5.3, PDF page 24).

Inference: in Verus, model two executions as two state values and prove a non-interference lemma requiring equal public fields and concluding equal public outputs. A paired ghost predicate can summarize synchronized loop iterations, but termination and heap framing require explicit Verus invariants.

## experimental evidence

Implementation uses VeriMAP for Algorithm 1 and Z3 4.5.0 with the Duality fixed-point engine; CHCs are translated to SMT-LIB (section 6, PDF page 27). The benchmark contains 163 CHC sets: 153 satisfiable and 10 unsatisfiable; 14 operate on integer arrays (section 6, PDF page 28). It runs on one Intel Core Duo E7300 2.66 GHz core with 4 GB Ubuntu and a 300-second timeout per problem (section 6, PDF page 28).

Before pairing, Z3 solves 31 of 163 problems; after pairing, it solves 135 of 163. The table’s denominators are all 163 benchmark problems, while category rows have their own P counts (Table 2, PDF page 29). Predicate Pairing takes 132.36 seconds total; Z3 takes 144.58 seconds before and 121.42 seconds after. Average Z3 time is 4.66 seconds before and 0.90 seconds after; including pairing, the paper reports 1.88 seconds average for PP plus Z3 (section 6, PDF page 29). The transformed clauses are 2.16 times larger on average. Three problems solved before pairing time out after pairing, despite A-model preservation; on the 28 solved in both runs, PP plus Z3 averages 1.58 seconds versus 1.77 seconds for Z3 alone (section 6, PDF page 30).

These numbers show increased solver coverage, not proof of all 163 properties. The 135/163 figure is 82.8%; the paper does not label it as a percentage. The three regressions demonstrate syntactic sensitivity in Z3 despite semantic preservation.

## trust, limits, and VL implications

Proved claims concern CHC encodings and transformation theorems. Trusted components include the interpreter specialization that generates CHCs, the correctness of the transformation implementation, the constraint theory and SMT solver, and the adequacy of each relational encoding. Inference: for VL, a Verus backend would additionally trust the Verus verifier and SMT solver, while ghost-predicate generation must preserve Rust heap and termination semantics.

The study already covers CHC encoding of relational properties, a terminating equality-based pairing algorithm, A-soundness, and a broad benchmark. VL should not redo these generic ideas. Inference: useful new work is a Verus lemma generator that detects shared equalities between two executions, generates relational ghost predicates, and reports solver regressions when transformed obligations grow.

Inference: threat to agent-written verified Rust is medium to high for relational claims. Pairing can substantially improve automation (31/163 to 135/163), but transformed clauses can become 2.16 times larger, three regressions timed out, and the guarantee is about solver-definable models rather than the correctness of the source-to-CHC translator or Rust implementation.

## techniques for the catalog

- CHC property encoding — represent operational semantics recursively and put a negated relational property in a false-headed clause
- unfold/fold preprocessing — introduce, unfold, fold, and constraint-replace predicates while preserving D-satisfiability
- equality-guided predicate pairing — pair atoms whose arguments share the most entailed equalities and summarize them with a fresh predicate
- relational verification via paired executions — encode equivalence, monotonicity, injectivity, functional dependence, non-interference, and optimization correctness as two-run CHCs
- solver coverage measurement — compare solved counts, time, clause growth, and timeout regressions before and after preprocessing

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
