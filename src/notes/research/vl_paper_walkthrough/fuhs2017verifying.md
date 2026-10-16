# Verifying Procedural Programs via Constrained Rewriting Induction
(authored by agents unless marked 🧑)
Tag: `fuhs2017verifying` , [paper](http://arxiv.org/abs/1409.0166v6)

## scope and result

The paper translates procedural programs into Logically Constrained Term Rewriting Systems (LCTRSs), then proves equivalence, memory safety, and selected correctness properties by rewriting induction. The abstract states: “We show that we can automatically verify memory safety and prove correctness of realistic functions.” (abstract, p. A:1) The specification can be a reference implementation in the same representation, so a separate specification language is unnecessary. The paper's aim is explicit: “Our approach proves equivalence between two implementations, so, in contrast to other works, we do not require an explicit specification in a separate specification language.” (abstract, p. A:1)

The work is a method and tool evaluation, not a formalization of C semantics. The translation section says: “Given the extensiveness of the C specification, we will not attempt to prove that the result of our transformation corresponds to the origin.” (section 3, p. A:10) Ctrl delegates satisfiability and validity queries to an internal reasoner and Z3 (section 6, p. A:29).

Inference: VL could use this as a reference-implementation and equivalence pipeline for Rust functions, but a Verus proof still needs an explicit abstraction relation between Rust state and the LCTRS state. The paper's unproved translation correspondence is a major trust boundary.

## technique: translate statements into constrained rewrite rules

For a simple integer function, create one LCTRS symbol for every statement and carry all in-scope variables as arguments. Encode each statement transition as a rewrite rule; encode branch conditions as constraints; encode return as a constructor such as `return_f(e)`. The paper's factorial example maps initialization, loop test, multiplication, increment, and return into rules (section 3.1, pp. A:10–A:11). Its optimized form is:

`fact(x) → u2(x,1,1)`

`u2(x,z,i) → u2(x,z*i,i+1) [i ≤ x]`

`u2(x,z,i) → return_fact(z) [i > x]`

Apply the translation as follows:

1. identify variables in scope at each statement (section 3.1, p. A:10)
2. create a symbol whose arguments carry those variables (section 3.1, p. A:10)
3. create one rule per control-flow edge, putting the guard in brackets (section 3.1, p. A:10)
4. represent assignments by updated right-hand arguments (section 3.1, p. A:10)
5. represent returns with a result constructor (section 3.1, p. A:10)
6. optimize by combining administrative rules, removing unused arguments, and simplifying constraints (section 3.1, p. A:11)

Inference: the Verus form is a ghost transition relation over a state struct, with `spec fn` expressions for guards and next state. Rust execution remains ordinary code; a proof function establishes that each branch follows the transition relation. Verus does not automatically derive this relation from arbitrary Rust, so an agent must supply it.

## technique: model types, globals, calls, and arrays

LCTRS theory symbols can use integers, reals, floating point, bit-vectors, or arrays when an SMT theory and solver are available (section 3.2, p. A:11). Casts must be explicit. Undefined expression results can be represented by fresh variables, as in the `halfsum` example (section 3.2, p. A:12).

Global variables are passed as extra input arguments and returned when modified. In the `best` example, `up(best,x)` returns both the new global value and the function result (section 3.4, p. A:12). Function calls nested inside expressions are first split into temporary assignments. For `ncr`, calls to `fact(y)` and `fact(x-y)` become separate temporaries; each call result is matched against either `return_fact(k)` or `error_fact` before continuing (section 3.5, pp. A:12–A:13).

Finite arrays are modeled as sequences with `size`, `select`, and `store`. Out-of-range `select` returns a default element; out-of-range `store` leaves the array unchanged. Reads become `select(a,i)`, writes become `store(a,i,e)`, and explicit boundary checks branch to an error constructor (section 3.6, pp. A:13–A:14). The `strcpy` rules illustrate preserving the modified destination array in the return value (section 3.6, p. A:14).

The translation does not support aliasing in the basic form. The paper warns: “As a result, properties we prove about strcpy from Ex. 3.7 might fail to hold for a call like strcpy(a, a).” (section 3.7, p. A:14) Dynamic allocation and aliasing require a memory-as-list encoding discussed only in Appendix A.2.

Inference: Verus `Seq` or `Map` specifications can model the logical array, while executable slices and ownership proofs establish correspondence. Aliasing and raw pointers require Verus permissions and a stronger memory abstraction than this paper's sequence model.

## technique: encode safety and undefined behavior as error transitions

For every rule that may fail under condition `τ`, split it into a normal rule guarded by `¬τ` and an error rule guarded by `τ`. Integer overflow, division by zero, missing returns, assertions, and exceptions can be treated this way (section 3.3, pp. A:12–A:13). For factorial, the normal multiplication rule includes bounds on `z*i` and `i+1`; the complementary condition reduces to `error_fact` (section 3.3, p. A:12).

Choose whether to add errors before or after simplification. Overflow checks may follow simplification, while division-by-zero checks should precede it because a removed calculation could still fault (section 3.3, p. A:13). To prove safety, add `errorfree(return(...)) → true` and `errorfree(error) → false`, then prove `errorfree(f(args)) ≈ true [φ]` by induction (section 1.2.3, p. A:5).

Inference: in Verus, put the safety condition in `requires` when it is an environmental precondition, and use `ensures` plus proof lemmas for absence of overflow or invalid indexing. A ghost error state can support whole-program safety checks, but a Verus `requires` alone does not prove callers satisfy it.

## technique: prove equivalence with rewriting induction

An equation `s ≈ t [φ]` is an inductive theorem when every ground constructor substitution satisfying `φ` makes `s` and `t` mutually reducible. The method requires four LCTRS restrictions: all core theory symbols are present, termination, quasi-reductivity (ground terms do not get stuck), and at least one ground term per sort (Definition 4.1, p. A:15). Termination is essential because induction follows a reduction extension; quasi-reductivity supports exhaustive rule case analysis (section 4.1, p. A:15).

A proof state is `(E,H,b)`, where `E` is pending equations, `H` is a set of induction rules, and `b` records whether a complete proof can refute non-equivalence. The theorem is two-sided: “If (E, ∅, flag) ⊢∗ri (∅, H, flag′) for some H, flag′, then every equation in E is an inductive theorem of R. If (E, ∅, flag) ⊢∗ri ⊥, then there is some equation in E that is not an inductive theorem of R.” (Theorem 4.4, p. A:16)

The core rules are:

1. simplification reduces either equation side with a constrained rewrite or calculation step (section 4.2.1, pp. A:17–A:18)
2. expansion case-splits on every rule matching a selected subterm and may add the current equation as an induction rule (section 4.2.2, pp. A:18–A:19)
3. deletion removes identical equations or equations whose constraints are unsatisfiable (section 4.2.3, p. A:19)
4. postulate adds a lemma equation, changing the state to incomplete until that lemma is proved (section 4.2.4, pp. A:19–A:20)
5. generalization replaces an equation by a stronger one that covers every original substitution (section 4.2.5, p. A:20)
6. equation-deletion moves equal theory subterms into the constraint and can make the residual constraint unsatisfiable (section 4.2.6, pp. A:20–A:21)
7. constructor decomposes equal constructor applications into component equations (section 4.2.7, p. A:21)
8. disprove searches for a satisfying counterexample to the disequality (section 4.2.8, pp. A:22–A:23)
9. completeness closes a state after all pending equations are discharged (section 4.2.9, pp. A:23–A:24)

The factorial example demonstrates simplification, expansion, induction-rule reuse, generalization, equation-deletion, constructor decomposition, and deletion to prove recursive and iterative factorial equivalent under `n ≥ 1` (sections 4.2.1–4.2.9, pp. A:17–A:24).

Inference: Verus can express the equation as a `spec fn` equality and each induction rule as a `proof fn` lemma with `requires` and `ensures`; loop invariants play the role of induction hypotheses. However, Verus does not use LCTRS rewriting as its native proof calculus, so the translation and induction search would be an external proof-producing tool.

## technique: generalize loop equations

The first dedicated generalization method tracks variables initialized to constants. When repeated expansion creates equations with the same outer shape but changing initialization values, replace those constants by fresh variables and retain the relations generated by the loop. The factorial proof's lemma `mul(n, iter(m,x,y)) ≈ iter(n,x′,y′)` abstracts `x=1,y=2` and records `y′=y+1`, `x′=x*y` (section 4.2.4, pp. A:19–A:20). This lemma then closes the diverging sequence.

The method is strongest for tail-recursive accumulator functions and can lose relations between separately initialized variables. The paper reports that generalizing two counters together may lose the invariant that they remain equal (section 6.2, p. A:33).

The second method, recursion-abstraction, recognizes recursive calls on semantically equivalent arguments and generalizes those calls using the constraint relation (section 5.2, pp. A:27–A:28). It handles cases where the first method has no initialization variables, including some non-tail-recursive examples.

Inference: a Verus proof generator can synthesize candidate loop invariants by abstracting initialization constants and recursive-call arguments, then validate them with `invariant` clauses and `decreases`. The paper's failure modes imply that VL must preserve equalities between correlated counters instead of independently generalizing them.

## technique: automate rule choice and backtracking

Ctrl uses a fixed priority: equation-deletion plus deletion, disprove, constructor, simplification, restricted expansion, recursion-abstraction, initialization generalization, then unrestricted expansion (section 6.1.1, p. A:29). It stores ancestor states whenever generalization is applied. A disproof on an incomplete state causes backtracking rather than a final failure (section 6.1.2, pp. A:29–A:30). An expansion limit starts at two and increases when needed; this bounds divergence during search (section 6.1.2, p. A:30).

For simplification, Ctrl chooses the leftmost innermost match, tries induction rules before original rules, and instantiates fresh variables from existing equation variables where possible (section 6.1.3, pp. A:30–A:31). For expansion, it prioritizes non-tail-recursive symbols, then non-recursive symbols, then tail-recursive symbols, and processes branches with the smallest recursion-order multiset first (section 6.1.4, pp. A:31–A:32). Constraint modification removes implied clauses and introduces bounded universal quantification when three or more consecutive clauses fit a loop-counter pattern (section 6.1.5, p. A:32).

Inference: this is a search-policy lesson for VL. A proof agent should try cheap normalization and constructor decomposition before inventing invariants, retain ancestor states for rollback, and expose quantifier introduction only when a measured loop pattern supports it.

## evidence, limits, and trust

The evaluation uses five student-assignment families (`sum`, `fib`, `sumfrom`, `strlen`, `strcpy`), two author examples (`arrsum`, `fact`), 25 literature comparisons, and 12 SV-COMP memory-safety benchmarks, on an Intel i7-5600U 2.6 GHz CPU under Linux (section 6.2, p. A:32). Figure 1 reports initial versus corrected specifications. Across all rows, Ctrl produced 29/39 versus 39/39 YES results, 12/5 versus 5/5 NO results, and 44/41 MAYBE results; the denominator is the total number of cases across the listed benchmark rows, before and after obvious specification mistakes were fixed (Figure 1, p. A:33). The table reports average runtime only on YES and NO results: for the total, no aggregate time is given; per-row times range from 1.8/2.1 seconds (`sumfrom`) to 22.3/22.3 seconds (`safety`) (Figure 1, p. A:33).

The `fib` automatic translation was not used: the authors manually translated it because the generated form split recursive calls and was impractical (footnote 6, p. A:33). Six initial MAYBEs and two corrected MAYBEs were wrong programs for which confluence could not be proved; six failures in each table were due to termination not being proved (section 6.2, p. A:33). Other failures came from lost variable relations, unavailable initialization generalization, and nested-loop counters generalized together (section 6.2, p. A:33).

What is proved is conditional equivalence or error-freedom of the generated LCTRS under its theory and constraints. Trusted elements include the source-to-LCTRS translation, theory interpretations, termination and confluence checks, Ctrl's inference implementation, the internal reasoner, Z3, and the assumption that the abstract array model matches the program. The paper itself says its translation correspondence is not proved (section 3, p. A:10), does not support aliasing in the basic encoding (section 3.7, p. A:14), and leaves several C features informal (section 3.8, pp. A:14–A:15).

Inference: threat to VL is high for products that rely on one-pass generation of verified Rust because reference implementations and automatic invariant generalization can cover substantial loop-equivalence work. The threat is lower for ownership, aliasing, concurrency, and Rust-specific unsafe code, which this paper does not verify. VL should reuse the error-transition encoding, reference-function comparison, counterexample disproof, initialization generalization, and explicit failure accounting. It should not reuse the paper's array abstraction as a substitute for Rust ownership or pointer semantics.

## techniques for the catalog

- statement-to-LCTRS translation — encode each procedural statement as a guarded rewrite rule carrying live variables
- rich data and state modeling — represent globals, calls, finite arrays, casts, and modified memory with explicit theory symbols
- error-transition safety checking — split potentially failing transitions and prove an `errorfree` result under preconditions
- constrained rewriting induction — prove equivalence with simplification, expansion, induction rules, decomposition, deletion, and disproof
- initialization generalization — abstract loop constants when repeated equations diverge while preserving generated constraints
- recursion-abstraction generalization — replace semantically equivalent recursive-call arguments with a stronger relation
- solver search strategy — prioritize rules, bound expansion, backtrack from incomplete disproofs, and introduce quantified constraints

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
