# Invariant Detection with Program Verification Tools
(authored by agents unless marked 🧑)
Tag: `he2019invariant`, [paper](http://arxiv.org/abs/1906.11929v1)

## scope and result

Wei He studies whether SMT and program-verification tools can find invariants that compilers miss, with CVC4 as the detailed modeling target. The paper defines the target as properties that remain unchanged on every path between two program points and motivates it with optimization such as loop-invariant code motion (Introduction, p. 1). It reports modeling experiments from August–November 2014 (footnote, p. 1), rather than a benchmark of invariant-recovery accuracy. The central safety requirement is over-approximation: a positive result must imply the property for all executions. The paper states, “For the purpose of invariant detection, we need the tool to take over-approximation because detected invariants are used by subsequent optimizations that must guarantee the correctness” (Section 2, p. 2).

The paper evaluates four tools conceptually. Cascade and CBMC use under-approximation; CBMC's k-induction adds a base case and step case. 2LS is over-approximating but, at the time, not robust on very large programs. The paper therefore models C in CVC4-language, whose values are immutable and whose uninitialized instances are nondeterministic (Section 2, p. 3). This distinction determines which results are safe to use for optimization.

## technique 1: model C state in CVC4-language

What it is. Translate C values and effects to immutable CVC4 terms. Use CVC4's built-in INT, REAL, BOOLEAN, arrays, tuples, records, and bit-vectors. Represent C structs with records: `Pair : TYPE = [# x : INT, y : REAL #]` (Section 3.1.1, p. 3). Represent memory with one array per basic type, an integer address, and assertions connecting the address to a value. The paper's example uses `Memory_int : TYPE = ARRAY INT OF INT`, `Memory_real : TYPE = ARRAY INT OF REAL`, a record `MEMORY`, and `ASSERT(mem.mem_int[ip] = i)` (Section 3.1.1, p. 3).

When to use it. Use this encoding for scalar and record operations, array accesses, and pointer effects when a single typed memory array is an adequate abstraction. The paper warns that CVC4 instances cannot be updated in place, so state changes must be represented as new terms.

How to do it.

1. Declare each C basic type and each record as a CVC4 type (Section 3.1.1, p. 3).
2. Declare a memory array for each basic type and an integer term for each pointer (Section 3.1.1, p. 3).
3. Add `ASSERT` equalities tying addresses to pointed values (Section 3.1.1, p. 3).
4. Encode an update with `WITH`, for example `Array_new = Array_old WITH [i] := newValue`, or the corresponding record update (Section 3.1.2, p. 4).
5. Encode a C function as a term of type `(T1, ..., Tn, MEMORY) -> [T, MEMORY]`; pass memory in and return the updated memory so effects escape the function (Section 3.1.3, p. 4).
6. Encode branches with `IF ... THEN ... ELSIF ... ENDIF` (Section 3.1.4, p. 5).

Function pointers are encoded by assigning each target a distinct integer address, asserting those addresses are distinct, and dispatching with an `IF` chain. The paper's complete pattern includes `ASSERT DISTINCT (addr_EqualInt4, addr_LessthanInt8)` and returns `(result, mem)` from the selected function (Section 3.1.5, pp. 5–6). CVC4 does not support recursive functions; recursion must be transformed to iteration (Section 3.2.2, p. 7).

Verus form. Inference: model executable state with Rust structs and arrays, and put mathematical state summaries in `spec fn` values. Use `requires` and `ensures` on `fn` or `proof fn` to connect pre-state and post-state, `assert` for the translation facts, and loop `invariant` declarations for preservation. Verus's ownership and borrowing can enforce many alias restrictions directly, but CVC4's explicit memory arrays and integer addresses do not carry over unchanged; raw-pointer behavior needs a supported Verus encoding and explicit ghost facts. Inference: a function-pointer dispatch can become an enum or integer tag with a Rust `match`; prove that the tag selects the intended postcondition rather than treating a runtime `proof fn` as a callback.

Evidence and limits. The evidence is the worked encodings and solver semantics, not a measured success rate. CVC4's immutable terms force the memory-as-return-value convention. The paper's own limitation is explicit: “CVC4-language does not allow an instance to change its value, which makes it inherent difficult to model loop behavior precisely in CVC4-language” (Section 2, p. 3). Inference: a Verus proof still depends on the adequacy of the chosen memory abstraction and on specifications for external code.

## technique 2: inductive one-iteration loop modeling

What it is. Replace a loop by one symbolic iteration containing every possible branch, then prove that a candidate value is unchanged before the loop, at the loop bottom, and after the loop. The paper says, “Therefore, each loop in the C program can be modeled with only one iteration” (Section 3.2.1, p. 6).

How to do it.

1. Identify a variable whose value before the loop is the candidate invariant (Section 3.2.1, p. 6).
2. Encode one loop-body iteration and all possible execution paths (Section 3.2.1, p. 6).
3. Assert that the variable has the same value at the bottom of that iteration (Section 3.2.1, p. 6).
4. Use induction to conclude that the value is unchanged after any number of iterations (Section 3.2.1, p. 6).

The method is incomplete when one iteration lacks information. The paper's example initializes `sum` to zero and accumulates five array elements; `sum` has the same value after the loop as at the earlier full sum, but one iteration cannot expose that fact (Section 3.2.1, p. 6).

Verus form. Inference: write the actual `while` loop and an `invariant` relating the accumulator, index, and processed prefix; add `ensures` for the post-loop relation. A one-iteration abstraction can be a separate `proof fn`, but it does not replace the executable loop proof. Verus needs a `decreases` clause when termination is proved, and the invariant must cover every branch. Inference: the paper's one-iteration method is a sound sufficient test only for properties expressible and preserved by that induction hypothesis; it is not a complete invariant synthesizer.

Evidence and limits. The evidence is the induction argument and the counterexample showing incompleteness. The method assumes all paths in the symbolic iteration are modeled. Unbounded loops, data-dependent bounds, and invariants requiring an accumulated relation defeat the simple encoding.

## technique 3: pollution analysis for partially modeled programs

What it is. If a C structure cannot be modeled accurately, isolate variables whose values depend on it, replace those variables with nondeterministic values, and verify unaffected variables. The paper defines dependence as follows: “We define that a variable vi depends on a variable vj if and only if the change to the value of vj may cause the change to the value of vi” (Section 4.1, p. 9). It calls a variable polluted when accurate modeling requires the unmodelable item.

How to do it.

1. Inline functions and normalize every assignment into `x = op(y1,y2)` or `*x = op(y1,y2)` (Section 4.1.1, p. 10).
2. Create a directed graph with one vertex per variable; add dependency edges from operands to the assigned variable, and for dereference assignments also add an edge from the pointer (Section 4.1.1, p. 10).
3. For each occurrence of the unmodelable item on a right-hand side, label the assigned variable; for a dereference left-hand side, label its base variable (Section 4.1.1, p. 10).
4. Run breadth-first search from labeled vertices and label every reachable vertex (Section 4.1.1, p. 10).
5. Assign nondeterministic values to labeled variables, remove statements dereferencing unknown pointers, and replace control conditions involving unknown variables with nondeterministic booleans (Section 4.1.1, p. 10).
6. Model and query only the remaining variables. The paper proves that reachability in this graph is equivalent to dependence and pollution (Section 4.2, pp. 11–12).

The worked `SequentialScan` example marks `current_predicate` because `&((*predicates)[i])` is unmodelable, then reaches `curr_pred_inst`, `col_id`, and `column_value`; those are replaced by nondeterministic values while unrelated values remain analyzable (Section 4.3, pp. 13–14).

Verus form. Inference: represent the dependency relation as a ghost `Set` or map and state the unmodelable region as a `spec fn` predicate. Use `proof fn` lemmas to show that every reachable dependent variable is unconstrained, then weaken only those contracts; use `requires` to state the assumptions on unaffected state and `ensures` for invariants that do not mention polluted values. Inference: replacing a value by nondeterminism corresponds to an unconstrained ghost value, not to `assume(false)` in the function being verified; an `assume` would enlarge the trusted boundary. Verus's borrow checker may eliminate some pointer aliases, but library and recursive-call semantics still need contracts.

Evidence and limits. The paper's formal proof is the graph-path argument in Section 4.2. The approach fails to inline recursive functions and libraries: the paper's recursive example writes `intArray[index] = 0` and recursively decrements the index, so one inlined call cannot reach all changed elements (Section 4.1.2, pp. 10–11). Graph construction also expands the program and may become impractical after normalization and inlining (Section 4.3, p. 14). Inference: for VL, this is useful as a conservative slicing strategy around unsupported Rust features, but its value depends on sound specifications for every external call.

## what is proved, measured, and trusted

The paper proves the graph dependence and pollution claims and gives modeling arguments for CVC4 encodings. It does not report a corpus size, precision/recall, runtime table, or denominator for recovered invariants. The tools' approximation modes and the CVC4 modeling language are trusted assumptions; the paper does not establish that the prototype scales to production code. It explicitly concludes that the tried C program tools were either under-approximating or insufficiently robust for large programs (Section 5, p. 15).

Inference: the threat to VL is moderate and specific. Agent-written verified Rust could inherit an unsound optimization or proof if an abstraction silently under-approximates memory, aliases, recursion, or external calls. The paper's actionable lesson is to require over-approximation for optimization claims and to make every unsupported feature explicit in the proof model. What VL should not redo is a generic comparison of under- versus over-approximation; the paper already states that distinction and gives the concrete CVC4 failure modes. A useful VL contribution would instead measure how often its Rust encodings preserve the relevant alias and loop facts on a named corpus.

## techniques for the catalog

- over-approximation gate: use only analyses whose positive result proves the invariant for all executions
- immutable SMT memory encoding: represent C state with typed arrays, records, and memory-in/memory-out function terms
- inductive one-iteration loop model: encode one complete symbolic iteration and prove preservation by induction
- pollution graph slicing: propagate dependence from an unmodelable item and verify only variables outside its reachable region
- tagged function-pointer dispatch: encode function addresses as distinct integers and select behavior with conditional branches
Checked 2026-10-15 against paper he2019invariant: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
