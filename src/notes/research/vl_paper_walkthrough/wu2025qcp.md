# QCP: A Practical Separation Logic-based C Program Verification Tool
(authored by agents unless marked 🧑)
Tag: `wu2025qcp`, [paper](https://arxiv.org/abs/2505.12878v3)

Source: Wu et al. (Shanghai Jiao Tong University, Peking University), arXiv:2505.12878v3, dated 24 Apr 2026 on the paper, 29 pages including Appendices A–F. References below use printed page numbers, which equal PDF page numbers. The arXiv identifier is printed on p.1.

## what QCP is

QCP verifies C functions against separation-logic specifications written in comments. Separation logic describes disjoint heap regions: `P * Q` asserts that P and Q hold on disjoint regions (§1, p.2). QCP symbolically executes annotated code, generates verification conditions (VCs), discharges some automatically, and exports the remaining conditions to the Rocq proof assistant for manual proof. §2, p.3: “QCP takes annotated C code as input and generates verification conditions.”

Measured: 155 functions, 2,972 lines of C, 3,876 annotation lines, 1,964 automatic VCs and 679 manual VCs (Table 1, p.12).

## technique 1: automatic and manual proofs with a checked list of obligations

QCP generates a file containing all VCs and uses Rocq's module system to check that the automatic and manual proof files together supply their proofs. This checks coverage of the generated goals; the paper does not claim that each goal appears in exactly one proof file.

Steps (§2.2, p.6–7; Appendix B, p.18–20):

1. Symbolically execute the function and generate VCs. §2.2, p.6: “Given an input annotated C function, QCP performs symbolic execution to compute the strongest postcondition and generates corresponding verification conditions (VCs).”
2. Try the entailment solver described in technique 6.
3. Export unsolved conditions. §2.2, p.6: “Any remaining VCs are exported to Rocq for manual proof construction.”
4. Generate four files: `proof_goal.v` contains all VC statements, including specification-derivation obligations; `proof_auto.v` contains automatic proofs; `proof_manual.v` contains goals requiring manual proofs; `proof_check.v` checks their coverage.
5. Express the coverage check through a Rocq `Module Type` named `VC_Correct`. In the example it includes strategy-correctness requirements and the VC statements. A module of this type includes the automatic and manual proof modules (Figures 11–12, p.19–20). Appendix B, p.19: “This module includes all contents from both sll_free_proof_auto.v and sll_free_proof_manual.v, thereby utilizing Rocq to ensure that every goal has a corresponding proof.”
6. Complete `proof_manual.v`; the other three files require no user modification (§2.2, p.7).

Figure 11 lists five VCs for `sll_free`: `entail_wit_1`, `entail_wit_2`, `entail_wit_3`, `return_wit_1`, and `partial_solve_wit_1`, each prefixed by `sll_free_`. Its manual proof file remains empty because the example verifies automatically (Appendix B, p.19).

Table 1 reports the following automatic/manual counts. Inference: the percentages are computed from those counts, rather than separate measurements:

- arithmetic: 84/39, or 68.3% automatic
- typical data structures: 716/192, or 78.9%
- typical algorithms: 214/101, or 67.9%
- QCP implementation components: 859/287, or 75.0%
- LiteOS doubly linked lists: 91/60, or 60.3%
- total: 1,964/679, or 74.3%

Inference: summing Table 6's Manual Proof column gives 4,007 Rocq proof lines for the implementation components' 287 manual VCs and 755 C lines: about 14 proof lines per manual VC and 5.3 per C line. These counts do not measure human time. They cannot establish that the manual quarter of all VCs dominates total effort.

## technique 2: module verification with declared-only functions assumed

QCP verifies the functions implemented in a C file conditionally on the contracts of functions declared there but implemented elsewhere. §2.1, p.3: “In other words, we can verify all functions defined in a C file against their specifications, assuming that any function merely declared in that file — but implemented elsewhere — satisfies its own specification.”

Steps (§1, p.2; §2.1, p.3–4):

1. Attach at least one specification to each function, whether defined or merely declared.
2. At a call, verify the callee's precondition and derive its postcondition for the calling context.
3. Use the callee's specification without verifying its external implementation in this module.

Figure 2 uses `/*@ With d n Require x -> data == d && x -> next == n Ensure emp */` for `free_list_node`. The specification relates the field values to logical variables and requires an empty heap afterward. §2.1, p.4: “The syntax of QCP is designed to make sure that the .c file is still a legal C program that can pass typical compiler checks like gcc.”

## technique 3: one primitive specification, others derived from it

A function body is verified against one primitive specification; other specifications are derived from it and can be used by callers. §2.1, p.4: “To handle this, QCP mandates that each function be assigned one primitive function specification, which is used directly in verifying the function itself.”

Steps (§2.1, p.4–6; Figure 3, p.5):

1. Give `LOS_ListAdd` a low-level `primitive_spec` describing its field updates.
2. Add `head_insert_spec <= primitive_spec`, with the abstract circular-list predicate `store_dll(list)` before and after the call.
3. Prove the generated specification-derivation VC, automatically or manually. §2.1, p.6: “QCP then requires the user to prove that head_insert_spec can be derived from primitive_spec, thereby eliminating the need for a separate, redundant verification of LOS_ListAdd against head_insert_spec.”
4. Use the appropriate specification in a caller. The paper says `LOS_ListTailInsert`, which calls `LOS_ListAdd(list->pstPrev,node)`, uses the primitive specification (p.6).

For independent specifications, Appendix F (p.28–29) uses `swap` with equal or different pointer addresses. Its workaround is a specification `all` with a case parameter, from which `eq` and `neq` are derived. Proving `all` requires manual case analysis. The authors say separate specifications are more convenient here and plan to support them.

## technique 4: assertion annotations as the proof skeleton

The user writes assertions that expose the heap structure needed by the next statement; QCP generates entailment VCs for them.

Steps for `sll_free` (Figure 2, p.4; §2.2, p.6–7):

1. State the loop invariant `/*@ Inv listrep(x) */`.
2. Before reading `x->next`, state `/*@ exists v n, x -> data == v && x -> next == n && listrep(n) */`.
3. Generate the entailment from `x != NULL && listrep(x)` to that assertion. §2.2, p.7: “This verification condition can be automatically discharged by our entailment solver.”
4. Continue with the field read, `free_list_node(x)`, and `x = y`.

The annotation is Figure 2's line 19; the read is line 20. The prose in §2.2 incorrectly refers to a store at line 14 and a read at line 19.

§5.3, p.13 explains the cost: “It should be noted that QCP requires a larger number of annotations than VST-A.” Inference: summing Table 5 gives 397 annotation lines for QCP and 300 for VST-A, with 704 and 1,426 proof lines respectively. Line counts are the paper's effort measure, not measured writing time.

## technique 5: symbolic execution of incomplete programs

The frontend decomposes complete or incomplete C code into partial statements (§4.1, p.9). This supports intermediate-state feedback before a program is finished.

Steps (§3, p.7–8; §4.1, p.9–10):

1. Decompose code into singleton statements, annotations, control-flow statements, returns, conditional and selection statements, loop statements, block boundaries, and variable declarations (Figure 8).
2. Maintain a stack of symbolic states. §4.1, p.9: “During execution, QCP maintains a symbolic state stack.”
3. Track Normal, Break, Continue, and Return assertions. The example shows both a Normal assertion and a Break assertion in the inner block.
4. Merge assertions outward on loop exit. §4.1, p.10: “Upon loop exit, the four types of inner assertions—Normal, Break, Continue, and Return—are merged with the outer assertion before symbolic execution continues with subsequent instructions.”
5. Display symbolic states in the VS Code extension or web interface.

The colours have distinct meanings (§3, p.8). Green marks code that passed preliminary checks and is ready for symbolic execution to generate VCs. Red marks symbolic-execution failure. Yellow marks code that passes symbolic execution but cannot be fully solved automatically. Green alone therefore does not mean fully proved.

Figure 6 reads `x->next` after freeing `x`. Symbolic execution fails because the permission for that read is unavailable, with the message “Cannot derive the precondition of Memory Read.” The example is unfinished, yet QCP reports the error.

## technique 6: separation-logic strategies and a small SMT solver

QCP combines a rule-based engine for spatial constraints with a lightweight SMT solver for pure constraints (§4.2, p.10). The rule engine builds on Stellis.

Steps (§4.2, p.10; Appendix A, p.17–18):

1. Define a strategy with a priority, patterns, checks, and an action (Figure 9). Patterns identify formulas on either side of an entailment; `?x` binds a pattern variable.
2. Check constraints such as `left_absent(p)`, `right_absent(p)`, or `infer(p)`. The last invokes the SMT solver to test whether a pure fact follows from the antecedent.
3. Apply operations that add or erase formulas, introduce variables, or instantiate an existential.
4. Establish strategy soundness. Appendix A, p.17: “For each user-defined strategy, the framework automatically generates a corresponding soundness lemma.” The next sentence says the strategy's validity reduces to proving this lemma.
5. Reduce spatial and pure constraints to pure formulas for the constraint solver. The SMT component implements linear integer arithmetic and uninterpreted functions, combined through the Nelson–Oppen framework.

The quantifier limitation belongs to the SMT component. §4.2, p.10: “Currently, the solver does not support quantified formulas; such cases require manual user intervention.” This does not mean every VC containing an existential needs manual proof: the strategy language can introduce and instantiate existential variables.

Appendix B's example (p.21) matches `listrep(?p)` and `p != NULL` on the left, with a demand for `p->data` or `p->next` on the right. It erases `listrep(p)` and adds fresh variables, the two field cells, and `listrep` for the tail. The authors explain: “This approach ensures that the listrep predicate is expanded only when load/store is required, avoiding unnecessary operations on unrelated predicates, thereby simplifying the assertion.”

Table 2 (p.12) lists six fully automatic examples. Its `avl_insert` row has 8 functions, 116 C lines, 99 annotation lines, 250 automatic VCs, and 2.84 seconds of symbolic-execution time. The table does not isolate the contribution of individual strategies.

## technique 7: a manual heap-entailment proof recipe

Appendix B (p.19–20) demonstrates a manual proof of a VC that QCP can also solve automatically. It is an example, not evidence that these tactics finish most remaining VCs.

Steps:

1. Run `pre_process`; in the displayed goal, `x <> 0` becomes a hypothesis.
2. Run `sep_apply listrep_nonzero` to unfold the non-null list into its data field, next field, and tail list.
3. Run `Intros y a. Exists a y.` to name left-side existential witnesses and instantiate the right-side existentials.
4. Run `entailer!` to finish. §4.3, p.11 describes it: “Automatically cancels common spatial predicates on both sides of the entailment by leveraging the associativity and commutativity of the separating conjunction.”

Inference: the transferable pattern is to expose hypotheses, apply a structural lemma, supply witnesses, and let automation close the remaining goal. The concrete heap tactics are specific to QCP's Rocq library.

## technique 8: refinement through an abstract program

Appendix D, p.21: “We decompose the proof of functional correctness into two parts: the correctness of the algorithm itself and the consistency of its implementation.” The abstract algorithm is written using monads in Rocq; QCP verifies consistency of the C implementation using an encoding of relational Hoare logic into standard Hoare logic (§4.3, p.11).

Steps (Appendix D, p.21–23):

1. Define the abstract merge-sort program `mergesortrec`, using `split_rel`, recursive calls, and `merge_rel` (Figure 14).
2. Establish the algorithm's correctness in Rocq.
3. Give the C function the precondition `safeExec(ATrue, mergesortrec(l), X) && sll(x, l)`.
4. Require the postcondition `exists l0, safeExec(ATrue, return(l0), X) && sll(__return, l0)` (Figure 15).
5. Prove this contract with QCP. The paper explains `safeExec(True, mergesortrec(l), X)` as existence of an initial state satisfying True such that every final state of the abstract computation satisfies X (p.21–22).

Appendix E applies this approach to `thm_apply` (p.27–28). Table 6 reports 4 functions, 64 C lines, 34 manual VCs, and 323 manual proof lines for that component.

## specification patterns from the verified components

Appendix E gives concrete specifications and verification results:

- Return-code cases: `lia_deduction` has separate postcondition cases for −1, 1, and 0; only 1 establishes `UNSAT(l1)` (p.25). Table 7, p.24 states: “If lia_deduction says a linear arithmetic entailment is correct, it is indeed correct.” Inference: this is a useful checker-soundness contract without a completeness requirement.
- Capacity bounds: `prop2cnf` requires `SmtProp_size(prop) <= 10000`, bounds its initial clause count, and bounds the increase by `4 * SmtProp_size(prop)` (p.28). Inference: explicit capacity assumptions can make fixed-buffer obligations manageable.
- Entry values: `subst_term` ensures `den == den@pre && src == src@pre` (p.27). Inference: retaining entry values in a specification can express which pointers remain unchanged.
- Representation predicates: `alpha_equiv` relates stored terms to logical values through `store_term` and ensures `__return == term_alpha_eqn(term1, term2)` (p.27). Inference: this separates memory representation from the pure operation being implemented.

## what is checked and what remains assumed

Appendix B's module construction checks that generated goals, including strategy-correctness requirements, have proofs. §4.3, p.10 says QCP formalizes a C memory model and builds a separation-logic library on it.

Inference: checking proofs of the generated VCs does not establish that the symbolic executor generated every necessary VC. The paper presents no soundness proof of QCP's symbolic executor or correspondence to a compiler's semantics. By contrast, it explicitly describes VST-A's formal soundness in §6, p.15: “The entire system is built on CompCert, with corresponding tactics and decomposition operations formally verified for soundness in Rocq.” External function contracts remain assumptions in module verification.

Unsupported C features (§5.4, p.14) include floating-point types, function pointers, bit-fields, string literals, the comma operator, compound literals, and `goto`. The paper calls compound literals compound operators and gives `(int [ ]){2, 4}` as its example.

## numerical and textual limits

Inference: the following calculations and cautions qualify the reported results:

- §5.1, p.11 reports 74.3% automation overall while “achieving high automation in arithmetic checks”. Arithmetic's 84 of 123 VCs yield 68.3%, below the overall rate and the data-structure rate of 78.9%.
- §5.1 describes the fully automatic examples as having “an average code-to-annotation ratio of 1:0.5”. Table 2 totals 539 code and 314 annotation lines, or 1:0.58; the mean of its six individual annotation/code ratios is approximately 0.68.
- Table 1's caption defines times per function. For QCP implementation components it reports 2.01 seconds symbolic execution and 16.48 seconds Rocq checking. Table 6's times sum to 14.12 and 193.00 seconds. Dividing by seven files gives 2.02 and 27.57; dividing by 36 functions gives 0.39 and 5.36. The tables do not explain the discrepancy.
- §5.3, p.13 reports proof-line reductions of 52.8% versus VST-A (457 versus 969) and 62.3% versus VST (457 versus 1,212). Those are the SLL row alone. All four rows total 704 versus 1,426 and 1,945, giving reductions of 50.6% and 63.8%.
- §5.3 says: “The benchmark data are sourced directly from the original publication [23].” It does not establish whether every comparison time was rerun on the same machine. The quoted SLL time reductions should not be treated as a controlled hardware comparison without that information.
- Table 3 has QCP slower than VeriFast on two of three programs: 0.37 versus 0.10 seconds and 0.14 versus 0.10 seconds. It uses more annotations on those two: 33 versus 31 and 31 versus 17. The paper describes their verification times as comparable (§5.2, p.12).
- Appendix B's strategy uses `left_exist_add`, absent from Figure 9's grammar, which lists `forall_add` and `right_exist_add`.
- §2.2's Figure 2 line references are inconsistent with the code, as noted in technique 4. The prose also uses `free_node_list` where the figure declares `free_list_node`. These are inconsistencies in the paper, not distinct verified routines.

## techniques for the catalog

- checked obligation coverage — require proofs for every goal in the generated VC module type
- automatic then manual proof — try automation and export unresolved conditions to Rocq
- assumed external contracts — verify defined functions conditionally on specifications of declared-only functions
- primitive and derived specifications — verify the body once and prove other specifications follow
- assertion-driven unfolding — state the heap structure required by the next statement
- partial-statement execution — execute incomplete C while tracking Normal, Break, Continue, and Return assertions
- distinct feedback states — distinguish preliminary-check success, symbolic-execution failure, and unresolved proof obligations
- demand-triggered strategies — unfold a structure when a goal requires its field, with strategy soundness proved separately
- heap proof recipe — preprocess, apply a structural lemma, instantiate existentials, and cancel common heap predicates
- refinement through an abstract program — prove the algorithm in Rocq and its implementation's consistency through an encoded relational contract
- checker-soundness contract — require a positive answer to be correct without requiring a conclusive answer on every input
