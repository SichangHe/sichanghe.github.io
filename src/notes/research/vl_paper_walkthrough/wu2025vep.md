# VEP: A Two-stage Verification Toolchain for Full eBPF Programmability
(authored by agents unless marked 🧑)
Tag: `wu2025vep`, [paper](https://www.usenix.org/conference/nsdi25/presentation/wu-xiwei)

## purpose and result

VEP is an annotation-guided toolchain for eBPF programs. It keeps SMT solving in user space, compiles source annotations and proofs into annotated eBPF bytecode, and leaves a small proof checker in kernel space. The three components are VEP-C, VEP-compiler, and VEP-eBPF (abstract, p. 277). The authors state: “VEP consists of three components: VEP-C, a verifier for annotated eBPF-C programs; VEP-compiler, a compiler targeting annotated eBPF bytecode; and VEP-eBPF, a lightweight bytecode-level proof checker.” (abstract, p. 277).

The goal is to verify memory safety, termination, kernel-interface compliance (acquire-release ordering, no resource leaks), and user-specified functional properties without rejecting safe programs because loops or data structures are complex (Sections 1–2, pp. 277–282). The key trust claim is: “Therefore, the entire TCB of VEP is effectively reduced to the lightweight proof checker, VEP-eBPF.” (Section 2.1, p. 280).

## technique 1: annotate C with preconditions, postconditions, loop invariants, and separation logic

What it is. VEP-C symbolically executes annotated C and represents memory with separation logic. A function has `With`, `Require`, and `Ensure` clauses; loops have invariants. The example `memset` requires `chars(p1,n,l1)` and ensures `∃ l2, chars(p1,n,l2)` (Figure 4, p. 283). The paper describes the purpose directly: “The Require clause indicates the function precondition; the Ensure clause indicates the function postcondition; and the With clause indicates the list of logical variables mentioned in precondition which will be used in the whole program assertions.” (Section 3.1, p. 283).

When to use it. Add a function contract for entry and exit state, a loop invariant that holds at the beginning and end of each iteration, and separating conjunctions when pointers refer to disjoint memory. Use existential logical variables to name unknown new heap contents, as `l2` and `l3` do in Figure 4. The paper's `strncpy` example shows why a first-order contract is insufficient when source and destination may overlap (Section 3.2, pp. 283–284).

How to apply it.
1. Declare logical variables in `With`; the paper says they are “sometimes essential to relate the program state at the function exit point to the one at the function entry.” (Appendix A.1, p. 293).
2. State memory shape and initial contents in `Require`, such as `chars(p1,n,l1)` (Figure 4, p. 283).
3. State the final contents in `Ensure`, such as `∃ l2, chars(p1,n,l2)`, or the stronger `chars(p1,n,repeat(v,n))` (Figure 4, p. 283; Figure 9, p. 285).
4. Initialize variables; VEP-C computes the assertion before the loop (Figure 4, lines 5–6, p. 283).
5. State a loop invariant with bounds and heap ownership, for example `∃ l2, 0 ≤ i ≤ n && chars(p1,n,l2)` (Figure 4, line 7, p. 283).
6. Symbolically execute each statement and check that the resulting assertion entails the loop invariant and then the function postcondition (Section 3.1, pp. 282–283).

Evidence and assumptions. VEP-C computes strongest postconditions and uses an entailment solver to check each derivation (Section 2.1, p. 279; Section 3, p. 282). The authors' `x = x + 1` example uses precondition `0 ≤ x < 100`, postcondition `0 ≤ x ≤ 100`, and the built-in SMT solver “produces a ‘YES’ with a 138-line proof” (Section 2.1, p. 279). Inference: separation logic facts and helper specifications must be correct; a contract can prove the wrong behavior if it states the wrong property.

Verus form. Inference: write the function precondition as `requires`, postcondition as `ensures`, and loop fact as `invariant`. Represent disjoint memory with ownership and proof-oriented types or a Verus data-structure invariant; use `old(...)` in specifications to relate pre-state values. Use `spec fn` for pure predicates and `proof fn` for derivations. This translation is an inference because the paper's assertion syntax and C memory model are not Verus syntax.

## technique 2: generate proof-carrying bytecode through an annotation-aware compiler

What it is. VEP-compiler translates verified C, annotations, strongest postconditions, and proof terms into annotated eBPF bytecode (Section 2.1, p. 279). It transforms assertions during IR generation, calling-convention changes, register allocation, and frame layout (Sections 4.1–4.4, pp. 286–287). Figure 10 presents nanopass-style passes in this order: front end, remove compound expression, impose calling conventions, spill addressed variables, instruction selection, live analysis, graph coloring (on failure: spill variables, then live analysis again), assign registers, finalize frame layout, optimize unnecessary jumps, generate bytecode (Figure 10, p. 286).

How to apply it.
1. Replace structure-member access by address-plus-offset expressions in the IR, and apply the same transformation to assertions (Section 4.1, p. 286).
2. Replace `__return` by `R0` and parameters by `R1`–`R5`, and state that `R6`–`R9` are preserved (Section 4.2, p. 286).
3. During register allocation, substitute variables with their registers or stack locations; substitute a variable that is not live with an existentially quantified logic variable (Section 4.3, p. 286).
4. Put the frame layout into the precondition so the bytecode symbolic executor knows valid addresses and stack consumption (Section 4.4, p. 287).
5. Modify assertions and proofs throughout the compilation passes (Section 4, p. 285).

The paper illustrates register allocation with a source assertion `y == x + 1 && p != q` and a bytecode assertion using `R1`, `*(R10-4)`, and existential `_p`, `_q` (Figure 13, p. 287). It also says: “the compiler introduces auxiliary logic variables _Ri-s to relate the register values at function entry and those at the return point.” (Section 4.2, p. 286).

Verus form.

## technique 3: check proofs again with a small bytecode checker

What it is. VEP-eBPF symbolically executes annotated bytecode but does not invoke an SMT solver (Section 5, p. 287). It “only checks the proofs based on basic logic rules, using a minimal proof checker” (Section 2.1, pp. 279–280), checks the alignment between bytecode and proofs, and rejects bytecode with incorrect or inconsistent proofs (Section 2.3, pp. 281–282). The paper summarizes: “If all entailments can be validated through their corresponding proofs, it indicates that the bytecode is safe, allowing the program to be loaded into the kernel.” (Section 5, p. 287). Spatial proofs are syntactic transformations using separation logic properties “formalized and proved within the Coq proof assistant”; pure proofs use a proof language inspired by cvc5 (Section 5, p. 287).

How to apply it.
1. Read annotated bytecode and its proofs (Section 5, p. 287).
2. Symbolically execute each instruction and derive the required assertion entailments (Section 5, p. 287).
3. For each proof step, check the rule name, parameters, premises, conclusion, and side condition (Section 2.1, p. 279; Section 5, p. 287).
4. Check the safety properties of Section 2.2: memory access permissions, termination, acquire-release ordering, and no resource leaks (Section 2.2, p. 280).
5. Load the program only if every entailment is validated (Section 5, p. 287).

Evidence. The evaluation used 41 programs in four categories (Section 6, p. 287). All tools rejected 10/10 unsafe programs, while VEP accepted 10/10 properly annotated safe programs in each category (Section 6.2, p. 288). On Linux samples, VEP-eBPF averaged 8.42 ms with a maximum of 8,034 KB, versus VEP-C's 39.46 ms average and 32,569 KB maximum (Table 3, p. 289). Each acceptance row has ten programs except Key_Connection, which has one (Table 3, p. 289). For Key_Connection, the text reports “350 lines of annotated bytecode and 5,800 lines of proof” (Section 6.4, p. 288); Table 3 lists 5,819 proof lines (p. 289).

Limits and trust. Functional correctness still depends on user-supplied specifications: the authors say “the tool will not automatically verify that the modified code behaves as desired” (Section 2.3, p. 282). Inference: the trusted base excludes VEP-C and the compiler, but the checker still trusts its proof rules, bytecode semantics, and helper specifications; for functional properties, the user also relies on the compiler translating the specification faithfully. The checker is smaller than an SMT-enabled verifier but cannot detect a specification that is too weak.

Verus form. Inference: a Verus proof checker analogue would expose executable validation and proof-only lemmas separately, prove that each checked proof step preserves an assertion, and use `requires`/`ensures` on checker functions. Do not put `external_body` on the function whose safety is being verified; an external body would make that behavior trusted rather than checked. The paper's bytecode proof steps can guide a proof-carrying artifact format, but they do not establish Verus soundness.

## appendix technique: normalize and validate assertion syntax

The appendix makes the source-to-internal assertion pipeline explicit. First, normalize user assertions into disjunctive normal form; second, convert expressions while generating auxiliary `Local` and `Sep` facts; third, run a scope check that rejects assertions such as `forall i, 0 <= i && i < 4 => a[i] == 0`, because “every logic variable appearing in S should be bound by existential variables introduced in exists x, S.” (Appendix B, p. 295). Internal assertions use `Exist`, `Local`, `Prop`, and `Sep` parts, which gives symbolic execution a canonical representation (Appendix A.2, p. 293). Inference: this is a useful Verus front end pattern: elaborate ergonomic source predicates into canonical proof-state facts, then reject ill-scoped specifications before solver calls.

## techniques for the catalog

- annotated contracts: specify function preconditions, postconditions, loop invariants, and disjoint heap ownership
- proof-carrying compilation: transform code, assertions, and proof terms together through lowering and register allocation
- lightweight final checking: recheck bytecode entailments with a small proof checker rather than an SMT solver
- explicit trusted boundary: isolate the final checker while recording compiler, semantics, and specification assumptions
