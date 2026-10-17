# Verifying Procedural Programs via Constrained Rewriting Induction
(authored by agents unless marked 🧑)
Tag: `fuhs2017verifying` , [paper](http://arxiv.org/abs/1409.0166v6)

## scope and result

The paper translates procedural programs into Logically Constrained Term Rewriting Systems (LCTRSs), then proves equivalence, memory safety, and selected correctness properties by rewriting induction. The abstract states: “We show that we can automatically verify memory safety and prove correctness of realistic functions.” (abstract, p. A:1) The specification can be a reference implementation in the same representation, so a separate specification language is unnecessary. The paper's aim is explicit: “Our approach proves equivalence between two implementations, so in contrast to other works, we do not require an explicit specification in a separate specification language.” (abstract, p. A:1) Properties can also be stated directly as constrained equations over SMT theories, for example for `strlen` (section 1.2.4, p. A:5).

The work is a method and tool evaluation. The soundness of the rewriting induction rules is proved (Theorem 4.4, sketched in section 4.4 and proved in Appendix B, pp. A:26, A:40–A:45). The translation from C is not proved correct. The translation section says: “Given the extensiveness of the C specification, we will not attempt to prove that the result of our transformation corresponds to the origin.” (section 3, p. A:10) Ctrl delegates satisfiability and validity queries to a small internal reasoner and the external SMT solver Z3 (section 6, p. A:29). The paper proves total equivalence: on all inputs both programs terminate and return the same values (section 4.2, p. A:16; section 7.2, p. A:35).

Inference: VL could use this as a reference-implementation and equivalence pipeline for Rust functions, but a Verus proof still needs an explicit abstraction relation between Rust state and the LCTRS state. The paper's unproved translation correspondence is a major trust boundary.

## technique: translate statements into constrained rewrite rules

For a simple integer function, create one LCTRS symbol for every statement (including declarations), operating on the variables in scope. Encode each statement transition as a rewrite rule; encode branch conditions as constraints; encode return as a constructor such as `return_f(e)`. The paper's factorial example maps initialization, loop test, multiplication, increment, and return into rules (Example 3.1, section 3.1, p. A:10). Its optimized form (Example 3.2, p. A:11) is:

`fact(x) → u2(x,1,1)`

`u2(x,z,i) → u2(x,z*i,i+1) [i ≤ x]`

`u2(x,z,i) → return_fact(z) [i > x]`

Apply the translation as follows:

1. identify variables in scope at each statement (section 3.1, p. A:10)
2. create a symbol whose arguments carry those variables (section 3.1, p. A:10)
3. create one rule per control-flow edge, putting the guard in brackets (section 3.1, p. A:10)
4. represent assignments by updated right-hand arguments (section 3.1, p. A:10)
5. represent returns with a result constructor (section 3.1, p. A:10)
6. optimize by combining rules where possible, removing unused arguments, and simplifying constraints (section 3.1, p. A:11; details in Appendix A.1, p. A:37)

The paper notes that argument removal is dangerous if time complexity is measured, because it may remove calculations (section 3.1, p. A:11).

Inference: the Verus form is a ghost transition relation over a state struct, with `spec fn` expressions for guards and next state. Rust execution remains ordinary code; a proof function establishes that each branch follows the transition relation. Verus does not automatically derive this relation from arbitrary Rust, so an agent must supply it.

## technique: model types, globals, calls, and arrays

LCTRS theory symbols are not limited to integers. The only requirement is that a suitable theory signature, and an SMT solver if the system is to be analyzed automatically, is available (section 3.2, p. A:11). The paper names real numbers or double-precision floating point for `double` (section 3.2, p. A:11), bitvectors for machine integers (section 3.3, p. A:12), and finite arrays (section 3.6, p. A:13). Casts must be made explicit and separate symbols such as `+.` are used for double addition (section 3.2, p. A:11). An undefined return value can be modeled by a fresh variable that may take any value, as in the `halfsum` example (Example 3.3, section 3.2, pp. A:11–A:12).

Global variables are passed as extra input arguments and returned when modified. In the `best` example, `up(b,x)` returns both the new global value and the function result (Example 3.5, section 3.4, pp. A:12–A:13). Function calls nested inside expressions are first split into temporary assignments. For `ncr`, the calls `fact(x)`, `fact(y)` and `fact(x-y)` each get their own temporary; each call result is matched against either `return_fact(k)` or `error_fact` before continuing (Example 3.6, section 3.5, p. A:13).

Finite arrays are modeled as sequences with `size`, `select`, and `store`. Out-of-range `select` returns a default element; out-of-range `store` leaves the array unchanged. Reads become `select(a,i)`, writes become `store(a,i,e)`, and explicit boundary checks branch to an error constructor (section 3.6, pp. A:13–A:14). The `strcpy` rules illustrate preserving the modified destination array in the return value (Example 3.7, section 3.6, p. A:14).

The translation does not support aliasing in the basic form. The paper warns: “As a result, properties we prove about strcpy from Ex. 3.7 might fail to hold for a call like strcpy(a, a).” (section 3.7, p. A:14) For dynamically allocated arrays and aliasing the paper says the memory can be encoded as a list of arrays passed along as a variable, explored in Appendix A.2 (section 3.7, p. A:14; Appendix A.2, pp. A:38–A:40). The paper's own implementation c2lctrs handles only functions on integers and one-dimensional statically allocated integer arrays (section 6, p. A:29).

Inference: Verus `Seq` or `Map` specifications can model the logical array, while executable slices and ownership proofs establish correspondence. Aliasing and raw pointers require Verus permissions and a stronger memory abstraction than this paper's sequence model.

## technique: encode safety and undefined behavior as error transitions

For every rule that may fail under condition `τ`, split it into a normal rule guarded by `φ ∧ ¬τ` and an error rule guarded by `φ ∧ τ`. Integer overflow, division by zero, a missing return statement, assertions, and exceptions can be treated this way (section 3.3, p. A:12). For factorial, the normal multiplication rule includes bounds on `z*i` and `i+1`; the complementary condition reduces to `error_fact` (Example 3.4, section 3.3, p. A:12).

The paper says error transitions can be added before or after the simplification step, and the choice matters: “when simplifying, calculations which do not contribute to the final result are thrown away.” For overflow errors the post-simplification rules “may seem reasonable”; for division by zero the errors should be added to the pre-simplification rules (section 3.3, p. A:12). To prove safety, add `errorfree(return(a,n)) → true` and `errorfree(error) → false`, then prove `errorfree(f(args)) ≈ true [φ]` by induction (section 1.2.3, p. A:5). The paper's implementation chooses real integers and does not test for overflow (section 3.8, p. A:15).

Inference: in Verus, put the safety condition in `requires` when it is an environmental precondition, and use `ensures` plus proof lemmas for absence of overflow or invalid indexing. A ghost error state can support whole-program safety checks, but a Verus `requires` alone does not prove callers satisfy it.

## technique: prove equivalence with rewriting induction

An equation `s ≈ t [φ]` is an inductive theorem when `sγ ↔*_R tγ` (convertible under the rewrite relation) for every ground constructor substitution `γ` that respects the equation (Definition 4.3, p. A:16). The method requires four LCTRS restrictions: all core theory symbols are present, termination, quasi-reductivity (every ground term is a ground constructor term or reduces), and ground terms of every sort (Definition 4.1, p. A:15). Termination is essential because the method uses induction on an extension of the rewrite relation; quasi-reductivity makes exhaustive case analysis on applicable rules possible (section 4.1, p. A:15). The paper states that quasi-reductivity always holds for systems from the translation of section 3 (section 4.1, p. A:16).

A proof state is `(E,H,b)`, where `E` is the set of pending equations, `H` is a set of rules serving as induction hypotheses (induction rules), and `b` is COMPLETE or INCOMPLETE; the flag says whether the state can be used to refute that the initial equation is an inductive theorem (section 4.2, p. A:16). The theorem is two-sided: “If (E, ∅, flag) ⊢∗ri (∅, H, flag ′ ) for some H, flag ′ , then every equation in E is an inductive theorem of R. If (E, ∅, flag) ⊢∗ri ⊥, then there is some equation in E that is not an inductive theorem of R.” (Theorem 4.4, p. A:16) In the theorem, flag is COMPLETE only if R is confluent; so a disproof is only guaranteed for systems shown confluent.

The nine rules are:

1. simplification reduces one side of an equation with a constrained rewrite step using rules in R or H, or with a calculation step (section 4.2.1, p. A:17)
2. expansion case-splits on every rule unifying with a selected basic subterm and, if R ∪ H ∪ {s → t [φ]} is terminating, also adds the current equation as an induction rule (section 4.2.2, pp. A:17–A:19)
3. deletion removes an equation if both sides are identical or its constraint is unsatisfiable (section 4.2.3, p. A:19)
4. postulate adds arbitrary lemma equations and sets the flag to INCOMPLETE (section 4.2.4, p. A:19)
5. generalization replaces an equation by one whose instances cover all instances of the original, and sets the flag to INCOMPLETE (section 4.2.5, p. A:20)
6. equation-deletion, for an equation whose two sides differ only in theory subterms, adds the negation of the equality of those subterms to the constraint, so the cases solved by calculation are excluded (section 4.2.6, pp. A:20–A:21)
7. constructor decomposes `f(s1..sn) ≈ f(t1..tn)` for a constructor `f` into the equations `si ≈ ti` (section 4.2.7, p. A:21)
8. disprove derives ⊥ from a COMPLETE state when, for example, two theory terms can differ under a satisfiable constraint, or two distinct constructors meet under a satisfiable constraint (section 4.2.8, p. A:22)
9. completeness restores the COMPLETE flag when a derivation from `(E,H,COMPLETE)` reaches `(E',H',INCOMPLETE)` with `E' ⊆ E`, that is, once the postulated or generalized equations have been removed (section 4.2.9, p. A:22)

The recursive-versus-iterative factorial proof under `n ≥ 1` (FCT.A) demonstrates simplification, expansion, induction-rule reuse, postulate of a lemma, equation-deletion, deletion, and completeness (Examples 4.5–4.25, pp. A:17–A:22). Constructor decomposition and disprove are illustrated on a deliberately wrong equation, `factiter(x) ≈ factrec(x − 1)` (Examples 4.21 and 4.23, p. A:22). Further examples are strlen, array sum, strcpy, Fibonacci, and a pair of recursive sum functions from Godlin and Strichman (Examples 4.26–4.30, pp. A:23–A:25).

Inference: Verus can express the equation as a `spec fn` equality and each induction rule as a `proof fn` lemma with `requires` and `ensures`; loop invariants play the role of induction hypotheses. However, Verus does not use LCTRS rewriting as its native proof calculus, so the translation and induction search would be an external proof-producing tool.

## technique: generalize loop equations

The first dedicated generalization method (section 5.1, pp. A:27–A:28) moves the constants used to initialize loop variables into the constraint (rules of the form `iter(x,v1,v2) [v1 = 1 ∧ v2 = 1]`), keeps them through simplification and expansion, and, when the proof diverges, applies generalization after dropping every clause `v = value` for an initialization variable. The paper describes this as: “at its core, the generalization just drops a part of the constraint”. In the factorial example the equations of the divergent sequence have the same left- and right-hand sides modulo renaming while the constraint grows; the generalized lemma `mul(n, iter(m, z1, i1)) ≈ iter(n, z2, i2)` (FCT.M′) then closes the proof (Example 5.1, p. A:27). The hand-chosen lemma (FCT.M) in the postulate example has the same shape (section 4.2.4, p. A:20).

The method is most likely to work for tail-recursive functions with accumulators, including mutually recursive ones; it is not suitable for systems with only non-tail recursion (section 5.3, p. A:28). It can lose relations between variables: the paper reports that when two variables are both initialized to 0 and increased by 1 per iteration, “after generalizing, the information that they are equal is lost” (section 6.2, p. A:33).

The second method, recursion-abstraction (section 5.2, p. A:28), identifies recursive calls that occur on both sides of an equation and are equal under the constraint, and replaces them by fresh variables. Equality of each pair is checked by equation-deletion plus deletion, that is, by unsatisfiability of the constraint conjoined with the disequality. The paper does not claim the technique is very powerful (section 5.3, p. A:28). It handles Example 4.30 and several benchmarks where no initialization variable exists to generalize (section 6.2, p. A:33).

Inference: a Verus proof generator can synthesize candidate loop invariants by abstracting initialization constants and recursive-call arguments, then validate them with `invariant` clauses and `decreases`. The paper's failure modes imply that VL must preserve equalities between correlated counters instead of independently generalizing them.

## technique: automate rule choice and backtracking

Ctrl always selects the first applicable rule (combination) from this list: (1) equation-deletion immediately followed by deletion; (2) disprove, without the COMPLETE restriction; (3) constructor; (4) simplification; (5) a limited form of expansion; (6) generalization using a recursion-abstraction; (7) generalization of all initialization variables at once; (8) the full form of expansion (section 6.1.1, p. A:29). Every proof state keeps its ancestors on which generalization was applied; a state counts as COMPLETE if it has no such ancestors. When disprove succeeds on an incomplete state, the prover does not conclude failure but backtracks to the most recent ancestor and continues without generalizing immediately (section 6.1.2, pp. A:29–A:30). If disprove succeeds with an empty ancestor list, the output is NO if the system is confluent and MAYBE otherwise (section 6.1.2, p. A:30). A second backtracking mechanism is an evaluation limit: a path with more than N expansions is aborted and the prover backtracks to a direct parent; Ctrl starts with N = 2 and increases the limit if no proof or disproof results (section 6.1.2, p. A:30).

For simplification, Ctrl chooses the leftmost innermost position where a rule matches, tries rules in H before rules in R, and instantiates fresh variables of a rule by variables of the equation where possible (section 6.1.3, pp. A:30–A:31). For expansion, it splits symbols into constructors, calculation symbols, non-recursive defined symbols, tail-recursive symbols, and non-tail-recursive symbols. In the restricted case it tries first non-tail-recursive symbols, then non-recursive defined symbols, then tail-recursive ones; the unrestricted case is leftmost innermost. After an expansion it processes first the new equations whose multiset of new symbols is smallest in the recursion order (section 6.1.4, p. A:31). Constraint modification removes clauses implied by the others (except definition clauses) and introduces ranged quantification `∀x ∈ {k1,…,kn}` whenever possible provided n ≥ 3; at present only clauses where `b = a+1` and `c = b+1` are considered (section 6.1.5, p. A:32).

Inference: this is a search-policy lesson for VL. A proof agent should try cheap normalization and constructor decomposition before inventing invariants, retain ancestor states for rollback, and expose quantifier introduction only when a measured loop pattern supports it.

## evidence, limits, and trust

The evaluation uses five assignments from first-year students in Nagoya (`sum`, `fib`, `sumfrom`, `strlen`, `strcpy`), two of the authors' own implementations (`fact`, `arrsum`), 25 function comparisons from the literature, and 12 memory-safety benchmarks from SV-COMP, on an Intel i7-5600U CPU at 2.6 GHz under Linux (section 6.2, p. A:32). The paper says the benchmarks “are typically fairly small”: the largest has 70 lines of C code and 55 rewrite rules (section 6.2, p. A:32). Figure 1 (p. A:33) gives results before the slash for the initial test and after the slash for the test with obvious mistakes in the specification fixed. Totals: YES 29 initially and 39 after the fix; NO 12 and 5; MAYBE 44 and 41. Per Figure 1, YES is a found proof, NO a disproof, and MAYBE means no proof or disproof was found, more than 60 seconds were used, or termination of the LCTRS could not be proved. The time column is the average runtime on YES and NO results only. Per-row times range from 1.8 / 2.1 seconds (`sumfrom`) to 22.3 / 22.3 seconds (`safety`) (Figure 1, p. A:33). The paper gives no aggregate time.

The `fib` automatic translation was not used: the authors manually translated it because the automatic one splits the two recursive calls and was impractical (footnote 6, p. A:32). The paper lists five classes of recurring failure (section 6.2, p. A:33). First, wrong functions for which Ctrl could not answer NO because it could not prove confluence: six MAYBEs in the initial test and two in the second. Second, the termination requirement (“six failures in either table”): termination independent of the starting symbol is often not satisfied or cannot be proved by the limited termination module. The remaining three classes are weaknesses of the method: generalization drops a relation between two variables, the primary generalization does not apply because there are no variables to generalize (for example counting down loops), and nested loops whose counters are generalized at the same time. Appendix D (pp. A:45–A:46) gives examples of these last three.

What is proved is conditional equivalence or error-freedom of the generated LCTRS under its theory and constraints. The paper itself says its translation correspondence is not proved (section 3, p. A:10), does not support aliasing in the basic encoding (section 3.7, p. A:14), and leaves several C features informal (section 3.8, pp. A:14–A:15).

Inference: trusted elements include the source-to-LCTRS translation, theory interpretations, termination and confluence checks, Ctrl's inference implementation, the internal reasoner, Z3, and the assumption that the abstract array model matches the program.

Inference: threat to VL is high for products that rely on one-pass generation of verified Rust because reference implementations and automatic invariant generalization can cover substantial loop-equivalence work, though the benchmarks are small (largest: 70 lines of C). The threat is lower for ownership, aliasing, concurrency, and Rust-specific unsafe code, which this paper does not verify. VL should reuse the error-transition encoding, reference-function comparison, counterexample disproof, initialization generalization, and explicit failure accounting. It should not reuse the paper's array abstraction as a substitute for Rust ownership or pointer semantics.

## techniques for the catalog

- statement-to-LCTRS translation — encode each procedural statement as a guarded rewrite rule carrying live variables
- rich data and state modeling — represent globals, calls, finite arrays, casts, and modified memory with explicit theory symbols
- error-transition safety checking — split potentially failing transitions and prove an `errorfree` result under preconditions
- constrained rewriting induction — prove equivalence with simplification, expansion, induction rules, decomposition, deletion, and disproof
- initialization generalization — abstract loop constants when repeated equations diverge while preserving generated constraints
- recursion-abstraction generalization — replace semantically equivalent recursive-call arguments with a stronger relation
- solver search strategy — prioritize rules, bound expansion, backtrack from incomplete disproofs, and introduce quantified constraints

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The key idea is to identify equivalent occurrences of a recursive call on both sides of an equation and to replace them by a variable."): read the whole paper text including appendices A to D, and checked the study's quotations, section and page references, technique steps, rule list, Ctrl strategy and Figure 1 numbers against it (column sums recomputed); changed a wrong comma in the abstract quote, the Figure 1 totals (29/39, 12/5, 44/41 are initial/fixed values, not 39/39 and 5/5), many page references, the claim that constructor decomposition belongs to the factorial proof, the descriptions of equation-deletion, disprove, completeness and recursion-abstraction, the attribution of the initialization generalization to Example 5.1 instead of the postulate example, the footnote 6 page, and marked the trusted-elements list as inference; added the soundness proof, confluence condition and benchmark size; did not check the PDF page layout beyond the text extraction, the Verus-related inferences (my own, not from the paper), the cited external works, or the proofs in Appendix B step by step.
