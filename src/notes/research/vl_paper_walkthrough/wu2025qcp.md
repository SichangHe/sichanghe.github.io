# QCP: A Practical Separation Logic-based C Program Verification Tool
(authored by agents unless marked 🧑)
Tag: `wu2025qcp`, [paper](http://arxiv.org/abs/2505.12878v3)

source: Wu et al. (Shanghai Jiao Tong University, Peking University), arXiv:2505.12878v3 (24 Apr 2026), 29 pages with Appendices A–F. PDF page numbers equal the printed ones.

## what QCP is

QCP verifies C functions against separation-logic contracts written in comments. Separation logic describes the heap as disjoint owned pieces; `P * Q` says P and Q hold on disjoint parts. The tool runs a symbolic executor over the annotated C, turns each step that needs a logical argument into a verification condition (VC), tries each VC with its own solver, and writes the VCs it cannot solve into a Rocq file for a person to prove. Rocq is the proof assistant formerly called Coq. §2, p.3: “QCP takes annotated C code as input and generates verification conditions.”

The paper is a tool description. It has no LLM in it; what it offers VL is a worked design for splitting proof obligations between automation and manual proof, and several specification patterns.

Measured: 155 functions, 2,972 lines of C, 3,876 annotation lines, 1,964 VCs solved automatically and 679 left for manual proof (Table 1, p.12).

## technique 1: three-way split of obligations with a machine-checked ledger

What it is: every VC ends in exactly one of two proof files, and a fourth file makes the proof assistant confirm nothing was dropped.

When to use: any pipeline where a fast, incomplete prover handles most obligations and something slower handles the rest, and one needs a guarantee that every obligation has a proof from one of them.

Steps (§2.2, p.6–7; Appendix B, p.18–20):

1. Symbolically execute the annotated function, computing the strongest postcondition, and emit VCs. §2.2, p.6: “Given an input annotated C function, QCP performs symbolic execution to compute the strongest postcondition and generates corresponding verification conditions (VCs).”
2. Send each VC to the entailment solver (technique 6).
3. Export the rest. §2.2, p.6: “Any remaining VCs are exported to Rocq for manual proof construction.”
4. Write four files:
   - `proof_goal.v`: the statements of all VCs, including those from specification derivation (technique 3)
   - `proof_auto.v`: proofs of the VCs solved automatically
   - `proof_manual.v`: the unsolved VCs as goals, to be completed by hand
   - `proof_check.v`: the cross-check
5. Make the cross-check structural. `proof_goal.v` declares a Rocq `Module Type` named `VC_Correct` with one entry per VC plus the soundness statements of the solver strategies used; `proof_check.v` declares a module of that type which includes the automatic and the manual proof files (Figures 11 and 12, p.19–20). Appendix B, p.19: “This module includes all contents from both sll_free_proof_auto.v and sll_free_proof_manual.v, thereby utilizing Rocq to ensure that every goal has a corresponding proof.”
6. Only `proof_manual.v` is edited by the user; the other three are regenerated (§2.2, p.7).

The paper's example: `sll_free` (free a singly linked list) yields five VCs, named `entail_wit_1..3`, `return_wit_1`, `partial_solve_wit_1` (Figure 11, p.19), and its manual file stays empty.

Verus form. Inference: Verus has one prover (Z3), so there is no second tier to export to. The parts that transfer are the ledger and the isolation. Ledger: a Verus run reports how many functions verified and how many errors; a VL pipeline should additionally fail the build when any `assume(...)`, `admit()` or `#[verifier::external_body]` appears outside an allowed list, which plays the role of `proof_check.v`. Isolation: an obligation Z3 cannot do inline is moved into a separate `proof fn` with its own `requires`/`ensures`, proved there with explicit `assert` steps, `assert ... by (nonlinear_arith)` or `by (bit_vector)`, and called at the use site; that `proof fn` is the counterpart of one entry of `proof_manual.v`. What does not carry over: Rocq's full higher-order logic as a fallback. A fact outside what Z3 can prove with hints has no home in Verus.

Evidence: the split by domain (Table 1, p.12; automatic share computed here from the Auto and Manual columns):

- arithmetic: 84 auto, 39 manual (68.3% of 123)
- typical data structures: 716 auto, 192 manual (78.9% of 908)
- typical algorithms: 214 auto, 101 manual (67.9% of 315)
- QCP implementation components: 859 auto, 287 manual (75.0% of 1,146)
- LiteOS doubly linked lists: 91 auto, 60 manual (60.3% of 151)
- total: 1,964 auto, 679 manual (74.3% of 2,643)

Cost of the manual quarter, where the paper reports it (Table 6, p.22, the seven implementation files): 287 manual VCs took 4,007 lines of Rocq proof (sum of the Manual Proof column, computed here) for 755 lines of C. Inference: about 14 proof lines per manual VC and over 5 per line of C; the 74.3% automation figure counts VCs, not effort, and the remaining quarter dominates the work.

Trusted. Inference: the paper proves nothing about the symbolic executor. If it emits a wrong or missing VC, the ledger is complete with respect to the wrong list. The paper contrasts itself with VST-A, of which it says (§6, p.15) “The entire system is built on CompCert, with corresponding tactics and decomposition operations formally verified for soundness in Rocq.” and makes no such claim for QCP. QCP has its own C memory model in Rocq (§4.3, p.10); a link from that model to a compiler's semantics is not in the paper.

## technique 2: module verification with declared-only functions assumed

What it is: verify every function defined in one C file, taking the specification of each function that is only declared there as given. §2.1, p.3: “In other words, we can verify all functions defined in a C file against their specifications, assuming that any function merely declared in that file — but implemented elsewhere — satisfies its own specification.”

Steps: attach at least one specification to every function, defined or declared; at a call, check the callee's precondition and add its postcondition (§1, p.2, item 3). Contract syntax, from Figure 2 (p.4): a comment `/*@ With d n Require x -> data == d && x -> next == n Ensure emp */` after the prototype, where `With` introduces logical variables shared by pre- and postcondition and `emp` is the empty heap. The file stays compilable C: “The syntax of QCP is designed to make sure that the .c file is still a legal C program that can pass typical compiler checks like gcc.” (§2.1, p.4).

Verus form. Inference: the same boundary is drawn with `#[verifier::external_body]` on a wrapper carrying `requires`/`ensures`, or with `assume_specification` for a function from another crate. Both are trusted exactly as QCP's declared-only specifications are, and belong on the list of assumptions to review. `With` variables correspond to values mentioned in both `requires` and `ensures` through `old(...)` of a `&mut` parameter, or to ghost parameters.

Limit: the result is conditional. The paper says so for its example: if `free_list_node` meets its contract then `sll_free` is correct (§2.1, p.4).

## technique 3: one primitive specification, others derived from it

What it is: a function is verified once, against a low-level contract; more abstract contracts are proved to follow from it and are then usable by callers.

When to use: one routine serves several roles. The paper's case is LiteOS `LOS_ListAdd`, which is both a raw four-pointer splice and the head-insert operation of a circular doubly linked list.

Steps (§2.1, p.4–6; Figure 3, p.5):

1. Name the contract used to verify the body `primitive_spec`. §2.1, p.4: “To handle this, QCP mandates that each function be assigned one primitive function specification, which is used directly in verifying the function itself.”
2. Write each further contract with a derivation mark, e.g. `head_insert_spec <= primitive_spec`, stated with the abstract predicate (`store_dll(list)` before and after).
3. QCP emits a VC that the derived contract follows from the primitive one; prove it (automatically or in Rocq). §2.1, p.6: “QCP then requires the user to prove that head_insert_spec can be derived from primitive_spec, thereby eliminating the need for a separate, redundant verification of LOS_ListAdd against head_insert_spec.”
4. Callers pick the contract that fits: `LOS_ListTailInsert` calls `LOS_ListAdd(list->pstPrev, node)` and is checked with the primitive one (p.6).

For contracts that do not follow from each other (Appendix F, p.28–29, `swap` with equal or different addresses), the workaround is a parameterised umbrella contract `all` with a case parameter, from which `eq` and `neq` are derived; proving `all` needs a manual case split. The paper concedes that here separate, unrelated contracts would be simpler and are planned.

Verus form. Inference: a Verus `fn` has one `requires`/`ensures` contract. The derivation becomes either a thin wrapper `fn` with the abstract contract whose body is the single call, so Verus checks the implication at that call, or a `proof fn` stating that the primitive postcondition under the abstract precondition implies the abstract postcondition. What changes: the wrapper costs a function per view; nothing is lost in strength. The pattern matters for VL because agents tend to write one contract at the abstraction of the caller they are looking at; fixing a primitive contract first avoids re-verifying a body per caller.

Evidence: none separate; LiteOS files are 21 functions with 493 annotation lines for 584 code lines (Table 1).

## technique 4: assertion annotations as the proof skeleton

What it is: the user writes, at chosen program points, the assertion in the shape the next statements need. The tool proves that the current symbolic state entails it and continues from it. This moves predicate unfolding and folding out of proofs and into the program text.

Steps, on `sll_free` (Figure 2, p.4; §2.2, p.6–7):

1. Give the loop an invariant: `/*@ Inv listrep(x) */`.
2. Inside the loop, before reading `x->next`, state the unfolded form: `/*@ exists v n, x -> data == v && x -> next == n && listrep(n) */`. §2.2, p.7: “At line 19, the user introduces a new assertion annotation to unfold the listrep (x) predicate, ensuring that the symbolic execution of the read operation on x→next at line 19 can proceed correctly.”
3. QCP emits the VC that `x != NULL && listrep(x)` entails that assertion, which the solver discharges.
4. Execution continues with the fields as separate owned cells, so the read, the call to `free_list_node(x)` and the assignment go through.

Verus form. Inference: for a recursive `spec fn` that describes a structure, the same step is an `assert` of the one-level unfolding before the access, with `reveal_with_fuel` if the definition is `opaque` or the solver needs more unfolding depth. Loop facts go in the `invariant` clause. What changes: safe Rust needs no ownership assertion for field reads at all, so most of QCP's unfold annotations disappear; they return only for pointer code that uses `PointsTo` permissions, where the permission must be `tracked` and in scope at the dereference.

Evidence and cost: §5.3, p.13 states the trade openly: “It should be noted that QCP requires a larger number of annotations than VST-A.” On the VST-A benchmark QCP has 397 annotation lines against 300 (sums of Table 5, computed here), and fewer proof lines (704 against 1,426).

## technique 5: executing incomplete programs, with a stack of exit-kind assertions

What it is: the front end cuts C text, finished or not, into partial statements and executes them one by one, so feedback arrives after each line.

Steps (§4.1, p.9–10; Figure 8, p.9):

1. Decompose the text into partial statements: singleton statement (assignment, increment, call), annotation, `break`/`continue`, `return`, `if (e)`/`else`, `switch`/`case`/`default`, `while (e)`/`do`/`for`, block begin, block end, variable declaration.
2. Keep a stack of symbolic states, one node per open block. §4.1, p.9: “During execution, QCP maintains a symbolic state stack.”
3. In each node keep up to four assertions by how control leaves: Normal, Break, Continue, Return.
4. At loop exit merge them outward. §4.1, p.10: “Upon loop exit, the four types of inner assertions—Normal, Break, Continue, and Return—are merged with the outer assertion before symbolic execution continues with subsequent instructions.”
5. Show the state after the current statement, and colour the source (§3, p.8): green for text that passed the preliminary checks, red where execution fails, yellow where execution passes but a VC is not solved automatically.

The failure example (Figure 6, p.8): a variant of `sll_free` that reads `x->next` after freeing `x` stops with the message “Cannot derive the precondition of Memory Read.”

Verus form. Inference: Verus needs a file that parses and type-checks, so a prefix is checked by closing the unfinished function with `assume(false)` after the last written statement; everything before it is verified, and the `assume(false)` must be gone at the end. The three colours map to three outcomes an agent should distinguish in Verus output: verified; a precondition or invariant fails (the state is wrong, fix code or annotation); resource limit exceeded (the state may be right, the proof needs help). What does not carry over: a displayed symbolic state. Verus shows no heap state between statements; the nearest probe is a temporary `assert` of the fact one expects.

Evidence: none measured; the claim of faster annotation writing (§3, p.8) has no user study.

## technique 6: entailment solver = prioritised rewrite strategies with proved soundness, then a small SMT core

What it is: two stages. A rule engine removes the heap part of an entailment using pattern-triggered strategies; what remains is pure arithmetic and equality for a small solver.

Steps (§4.2, p.10; Appendices A and B, p.17–21):

1. Write a strategy with four parts (Figure 9, p.18): a priority; patterns that must match formulas on the left (known) and right (to prove) side, with `?x` binding pattern variables; checks, such as `left_absent(p)`, `right_absent(p)` or `infer(p)`, the last of which asks the SMT core whether a pure fact follows from the left side; and an action that adds or erases formulas on either side, introduces fresh variables, or instantiates an existential.
2. For each strategy the framework generates a soundness lemma to be proved in Rocq. Appendix A, p.17: “For each user-defined strategy, the framework automatically generates a corresponding soundness lemma.”
3. Apply strategies by priority until no heap formula remains.
4. Hand the pure residue to the SMT core, which decides linear integer arithmetic and uninterpreted functions, combined by Nelson-Oppen (§4.2, p.10).
5. Anything with a quantifier goes to the user. §4.2, p.10: “Currently, the solver does not support quantified formulas; such cases require manual user intervention.”

The paper's strategy (Appendix B, p.21), which makes `sll_free` fully automatic: if the left side has `listrep(?p)` and `p != NULL`, and the right side asks for the `data` or `next` field of `p`, then erase `listrep(p)` on the left and add fresh `x`, `y`, the two field cells, and `listrep(y)`. The design point is the trigger on the right side. Appendix B, p.21: “This approach ensures that the listrep predicate is expanded only when load/store is required, avoiding unnecessary operations on unrelated predicates, thereby simplifying the assertion.”

Verus form. Inference: the nearest construct is a `broadcast proof fn`: a lemma, proved once, that the solver applies on its own when its `#[trigger]` term appears, enabled per module or function with `broadcast use`. The correspondences: strategy soundness lemma ↔ the body of the broadcast lemma, which Verus verifies; pattern ↔ trigger; demand-driven unfolding ↔ choosing as trigger the term that appears only when the fact is needed (for a list predicate, the field access, not the predicate itself). What changes: Verus's solver handles quantifiers through triggers, which QCP's does not; in return a badly chosen trigger can make Z3 loop or time out, a failure QCP's prioritised, erase-on-use rules avoid by construction. What does not carry over: priorities and the erase action; a broadcast lemma only adds facts.

Evidence: with strategies in place six files verify with no manual VC (Table 2, p.12), among them `avl_insert`: 8 functions, 116 lines of code, 99 of annotation, 250 VCs, 2.84 s of symbolic execution.

## technique 7: the manual proof recipe for a heap entailment

What it is: four tactics that finish most leftover heap VCs (§4.3, p.10–11; Appendix B, p.19–20).

Steps, on the VC from technique 4:

1. `pre_process`: normalise; pure facts move to hypotheses (here `x <> 0`).
2. `sep_apply listrep_nonzero`: rewrite the left side with a lemma; the tactic finds the lemma's left-hand heap pieces in the goal and replaces them with its right-hand side. Here it unfolds a non-null list into two fields plus a tail.
3. `Intros y a. Exists a y.`: name the existentials now on the left; supply witnesses for those on the right.
4. `entailer!`: cancel equal heap pieces on both sides using associativity and commutativity of `*`, and solve what is left.

Verus form. Inference: the same four moves are, in order: state the hypotheses as `requires` of a `proof fn`; call the unfolding lemma (a `proof fn`) or `reveal` the definition; name witnesses with `choose` for the known existential and give them in an `assert(exists ...)` with a trigger for the one to prove; let the solver finish. Frame cancellation has no Verus step because disjointness is carried by Rust ownership and by distinct `PointsTo` values.

## technique 8: refinement proofs by encoding a relational judgment into an ordinary contract

What it is: functional correctness is split in two. Appendix D, p.21: “We decompose the proof of functional correctness into two parts: the correctness of the algorithm itself and the consistency of its implementation.” The algorithm is an abstract program written as a monad in Rocq (with `choice` for nondeterminism and break/continue loops); its correctness is proved in Rocq alone. The C code is then proved to refine it.

Steps (Appendix D, p.21–22; Figures 14–15, p.23):

1. Write the abstract program, e.g. `mergesortrec` built from `split_rel`, a recursive call on each half, and `merge_rel`.
2. State the C contract with a predicate `safeExec(P, prog, X)`, which the paper reads as: there is an initial abstract state satisfying P from which every final state of `prog` satisfies X.
3. Precondition: `safeExec(ATrue, mergesortrec(l), X) && sll(x, l)`. Postcondition: `exists l0, safeExec(ATrue, return(l0), X) && sll(__return, l0)`. In words: the C function has consumed the whole abstract program and left only its result `l0`, which is what the returned list stores.
4. Verify the C function against this contract as usual; the relational logic is encoded in standard Hoare logic by the method of reference [22] (§4.3, p.11).

Verus form. Inference: for deterministic algorithms the standard Verus practice already is this split: a `spec fn` is the abstract program, the exec `fn` has `ensures` relating the view of its result to the `spec fn` applied to the view of its input, and properties (sortedness, permutation) are proved about the `spec fn` in `proof fn`s. What does not carry over: nondeterministic abstract programs (`choice`); a `spec fn` is a function, so a nondeterministic algorithm needs a relation, a `spec fn` returning `bool` over input and output.

Evidence: used for `merge_sort` and for `thm_apply` (Appendix E, p.27–28; 4 functions, 64 code lines, 34 manual VCs, 323 manual proof lines, Table 6).

## specification patterns from the verified components (Appendix E)

These are contract shapes the authors used on seven files of their own tool's C code (Table 7, p.24), useful as templates:

- return-code case split: `lia_deduction` (Fourier–Motzkin elimination) has a three-way disjunctive postcondition, one disjunct per return value −1, 1, 0, each with its own heap and its own logical claim; only the value 1 carries `UNSAT(l1)` (p.25). The property proved is one-directional: “If lia_deduction says a linear arithmetic entailment is correct, it is indeed correct.” (Table 7, p.24). Verus form, inference: an `ensures` with one implication per return variant of an enum; soundness of a checker without completeness is a legitimate and much cheaper contract.
- capacity bounds in the precondition: `prop2cnf` (Tseitin transformation) requires `SmtProp_size(prop) <= 10000` and a clause-list length bound tied to it, and ensures the output grew by at most `4 * SmtProp_size(prop)` (p.28). Verus form, inference: the same bounds as `requires` are what make index and overflow obligations provable for fixed-size buffers.
- unchanged-parameter facts: `den == den@pre && src == src@pre` (p.27), where `@pre` is the value at entry. Verus form, inference: `old(x)` for a `&mut` parameter.
- representation predicate per structure: `store_term(t, term1)` ties address `t` to logical value `term1`, and the result is specified as a pure function of logical values, `__return == term_alpha_eqn(term1, term2)` (p.27). Verus form, inference: a `View` implementation and `ensures r == spec_f(a@, b@)`.

## what is proved and what stays trusted

- Proved, per function: all VCs in `proof_goal.v` have Rocq proofs, including strategy soundness lemmas; so the entailment solver and the SMT core need not be trusted.
- Trusted, inference: the symbolic executor that produces `proof_goal.v`; QCP's Rocq memory model of C as a faithful model of the compiler used; Rocq; the contracts of declared-only functions; the contracts themselves.
- Unsupported C (§5.4, p.14): floating point, function pointers, bit-fields, string literals, the comma operator, compound literals, `goto`. The paper states this as “The only non-supported control flow feature is the goto statement.” for control flow.

## numbers that do not add up

- §5.1, p.11 says QCP automates 74.3% of VCs, “achieving high automation in arithmetic checks”. Table 1 gives arithmetic 84 of 123 (68.3%), below the overall rate and below data structures (78.9%).
- §5.1, p.11 gives the fully automatic examples “an average code-to-annotation ratio of 1:0.5”. Table 2 sums to 539 code and 314 annotation lines, which is 1:0.58; the mean of the six per-file ratios is 1:0.68.
- Table 1 labels its time columns per function. For the implementation components it gives 2.01 s symbolic execution and 16.48 s Rocq time. Table 6's seven files sum to 14.12 s and 193.00 s (computed here): per file that is 2.02 s and 27.57 s, per function (36) it is 0.39 s and 5.36 s. The first figure matches per file, the second matches neither.
- §5.3, p.13 reports proof-line reductions of 52.8% against VST-A (457 vs. 969) and 62.3% against VST (457 vs. 1212). These are the SLL row of Table 5 only; over all four rows the sums are 704 against 1,426 (50.6%) and 1,945 (63.8%).
- The comparison times are not from one machine as far as the text says: §5.3, p.13, “The benchmark data are sourced directly from the original publication [23].” The 95.4% time reduction (16.11 s against 349.75 s) therefore compares QCP's run with VST-A's published figure.
- Against VeriFast (Table 3, p.12) QCP is slower on two of three programs (0.37 s vs 0.10 s; 0.14 s vs 0.10 s) and needs more annotation lines on two (33 vs 31; 31 vs 17); the text's word is comparable.
- The strategy in Appendix B uses the action `left_exist_add`, which the grammar in Figure 9 does not list (it has `forall_add` and `right_exist_add`).
- §2.2 says the store at line 14 and the read at line 19 of Figure 2, where line 19 is the annotation and line 20 the read; the declared function is `free_list_node` in the figure and `free_node_list` in the text. §1, p.2 says quite a few tools support (A) and (B) together where the sentence needs few.

## what VL should not redo

Inference: a second proving tier in a proof assistant is a different product; Verus-based VL should not build one. What is already worked out here and can be adopted: the obligation ledger (every obligation accounted for, mechanically), primitive-plus-derived contracts, demand-triggered unfolding, and the checker-soundness contract shape. The interactive state view is specific to a symbolic executor and has no Verus counterpart to copy.

## threat to a product of agent-written verified Rust

Inference: low and indirect. QCP is for C, needs a person fluent in Rocq for a quarter of the obligations at about 14 proof lines each, and has no agent in the loop. It competes for the same goal (verified systems code) only where the code must stay in C. The numbers are a useful baseline for effort: about 1.3 annotation lines per line of C overall (3,876 / 2,972), and 2.3 for the hardest set, before manual proofs.

## techniques for the catalog

- obligation ledger — list every verification condition in one generated file and make the checker confirm each has an automatic or a manual proof
- auto-then-manual split — try each obligation with fast incomplete automation and export only the leftovers as isolated goals
- assumed declared-only contracts — verify a module against the stated contracts of functions implemented elsewhere, and track those as assumptions
- primitive and derived contracts — verify a body once against a low-level contract and prove each abstract contract follows from it
- annotation-driven unfolding — assert the unfolded form of a predicate just before the statement that needs it, so the prover only checks an entailment
- partial-statement execution — check an unfinished function prefix statement by statement, keeping Normal, Break, Continue and Return assertions per open block
- three-outcome feedback — distinguish verified, state-is-wrong, and state-may-be-right-but-unproved, and react differently to each
- demand-triggered strategy with soundness lemma — a user rewrite rule that fires only when the goal needs a field, each rule backed by a proved lemma
- heap entailment in four moves — normalise, apply an unfolding lemma, introduce and instantiate existentials, cancel the frame
- refinement through an abstract program — prove the algorithm on a pure model and prove the code consumes that model, leaving only its result
- checker soundness contract — for a decision procedure, prove only that a positive answer is correct, with one postcondition case per return code
Checked 2026-10-13: audit record wu2025qcp; paper-study comparison complete; gate executed; experiments not rerun
