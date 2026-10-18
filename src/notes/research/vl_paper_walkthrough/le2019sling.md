# SLING: Using Dynamic Analysis to Infer Program Invariants in Separation Logic
(authored by agents unless marked 🧑)
Tag: `le2019sling`, [paper](https://doi.org/10.1145/3314221.3314634)

## what the paper builds

SLING infers separation-logic heap invariants from debugger traces. It targets arbitrary program locations, including function preconditions, postconditions, and loop invariants. The abstract describes the core pipeline: “First, we use a debugger to obtain rich program execution traces at locations of interest on sample inputs.” It then “iteratively analyze[s] separate memory regions related to each pointer variable and search[es] for a formula over predefined heap predicates in separation logic to model these regions.” Finally it combines the formulas into one invariant (Abstract, p. 1).

The tool is dynamic. The authors say dynamic analysis “is generally efficient and can infer expressive invariants because it only analyzes a finite, typically small, set of traces”, but it gives no correctness guarantee for unobserved executions. The authors state this boundary directly: “dynamic analysis focuses on program traces observed from running the program on small sample inputs, and thus provides no correctness guarantee on generated invariants.” (Section 1, p. 1.) The checker validates candidate formulas against observed stack-heap models; it does not prove the C program for all inputs.

## technique: collect stack-heap traces at target locations

### what it is and when to use it

Give SLING a program, target locations, predefined heap predicates, and test inputs. LLDB stops at each location and records stack variables, reachable heap cells, addresses, field values, and a ghost return value at function exits. Inference: Use this when a program manipulates pointer-shaped structures and the user wants candidate preconditions, postconditions, loop invariants, or documentation before writing a static proof.

### steps from the paper

1. Annotate locations of interest, such as function entry, each loop head, and each return statement (Section 5.2, p. 9; the entry/loop/exit locations for preconditions, loop invariants and postconditions are named there).
2. Run the program on supplied sample inputs and set LLDB breakpoints at those locations (Section 5.2, p. 9).
3. At each stop, capture stack values and the heap reachable from stack pointers, including memory addresses and field values (Section 2.2, p. 3).
4. At exits, capture the return value in a ghost variable `res` (Section 2.2, p. 3, footnote 3: the value is captured when LLDB steps out of the function to the call site).
5. Group snapshots by location and use the resulting sequence of stack-heap models as inference input (Algorithm 1, line 1, CollectModels, p. 6).

### Verus form

Inference: Run a verified Rust program under tests and record concrete values at a loop head, function entry, or return. For owned data structures, the trace should include logical contents and pointer/ownership identities exposed by a debug adapter rather than raw addresses alone. A driver can use the traces to propose `requires`, `ensures`, or `invariant` clauses, but the clauses must then be proved by Verus. Verus's proof model is symbolic and ownership-aware; a concrete trace cannot establish a universal contract, and the paper's LLDB extraction does not transfer directly.

### evidence and failure

The evaluation runs 157 C programs, with 4,649 lines of code across 22 data-structure categories (Section 5.1, p. 8). Five buggy programs crash before traces, 15 fail to reach some locations with random inputs, and three time out in loop inference (Section 5.3, p. 10; footnote 5 on that page attributes the three to Z3 time-outs). Inputs in the reported setup are empty and randomly generated data structures of a fixed size of 10 (Section 5.2, p. 9). Inference: trace coverage, not merely program count, controls what can be inferred, and the fixed-size random inputs are a major assumption.

## technique: partition each heap by pointer reachability and boundary variables

### what it is

For a stack pointer `v`, SLING computes the sub-heap reachable from `v` but not also pointed to by another stack pointer. The boundary includes `v`, `nil` when reachable, and stack variables reachable from `v` or aliases. It computes the intersection of the boundary sets over all traces to obtain the variables used to compute predicate arguments (Section 2.3, p. 4). The paper's example analyzes `x`, `tmp`, `y`, and `res` in that order and writes the final location invariant as a separating conjunction of their separate regions.

### steps from the paper

1. Choose the next pointer variable. The paper's heuristic selects the next variable only from those directly reachable from previously considered variables, to avoid orders that give weaker results because propagated residue information affects the boundary variables; it says this gives a fixed order that works well in the experiments (Section 2.3, p. 5).
2. For every trace, depth-first traverse fields from that root until `nil` or a cell pointed to by another stack pointer; call the result the root sub-heap (Section 4.1, p. 7).
3. Record the boundary variables separating that sub-heap from the residual heap (Section 4.1, p. 7).
4. Intersect boundaries across traces and use the common boundary for predicate arguments (Section 2.3, p. 4; Section 4.2, p. 7).
5. Preserve the residual heap and any existential-address mappings for later variables (Algorithm 1, p. 5).

### Verus form

Inference: The closest Verus representation is a ghost view of a collection's reachable nodes, with disjointness facts expressed through ownership and `Set`/sequence abstractions. For `Vec`, tree, or linked-node APIs, define a `spec fn` footprint and prove that separately owned regions are disjoint. Verus does not use SL's `*` connective as a direct syntax in the material consulted here; Rust ownership and explicit footprint predicates replace it. Raw pointer addresses from a debugger are not a sound Verus invariant.

## technique: enumerate predicate instances and check them with an SMT model checker

### what it is

SLING takes user-provided inductive predicates, singleton heap predicates, and `emp`. For each pointer sub-heap, it enumerates predicate parameter subsets from the common boundary, adds fresh existential variables when too few boundary variables are available, and tests each candidate over all observed models. Candidates are checked by an SMT encoding of symbolic-heap separation logic. A successful check returns both a residual heap and an instantiation of existential variables to concrete addresses.

The paper emphasizes why the instantiation matters: it is needed to infer equalities among variables. The checker either refutes a candidate, which is discarded, or accepts it as a formula over the sub-heaps (Section 2.3, p. 4); the instantiation is needed because the earlier model checker of [7] does not return it (Section 3, p. 5). Type checking filters combinations before expensive model checking (Algorithm 2, line 8, p. 7; Section 4.5, p. 8).

### steps from the paper

1. Filter predicates to those with at least one parameter type compatible with the root (Section 4.2, p. 7).
2. Enumerate subsets of the common boundary of size at most the predicate's arity that include the root; add fresh existential variables to fill missing parameters (Algorithm 2, lines 3–6, p. 7).
3. Enumerate type-consistent permutations of those arguments (Algorithm 2, lines 7–8, p. 7).
4. Construct `F = ∃u₁,…,uₘ. p(k₁,…,kₙ)` and ask the symbolic-heap checker whether every root sub-model satisfies it (Algorithm 2, lines 9–10, p. 7).
5. Retain accepted formulas together with residual heaps and existential instantiations. If every sub-model is a single cell, also try a singleton predicate; if nothing succeeds, retain `emp` and the entire residue (Algorithm 2, lines 11–14, p. 7).

### Verus form

Inference: Define a finite library of Verus shape predicates as `spec fn`s over abstract sequences, maps, or sets, and enumerate argument combinations for the current function's ghost variables. Instead of an SL model checker, ask Verus to prove each candidate implication from the traced or symbolic preconditions. Keep only candidates whose `ensures` obligations verify. Existential witnesses can be introduced as ghost values and constrained with `ensures`; do not encode an `invariant(...)` call or use runtime proof functions. This is a transfer of the candidate-and-check pattern, not a claim that Verus can check arbitrary separation logic.

### example from the paper

For doubly linked lists, the predefined predicate is `dll(hd, pr, tl, nx)`, recursively describing an empty list or a head cell separated from the remainder. At location `L3` in `concat`, SLING derives formulas such as `Fₓ = ∃u₁,u₂. dll(x,u₁,u₂,tmp)` and `Ftmp = ∃u₃. dll(tmp,x,u₃,y)`, then combines them. The checker also discovers `res = x` and alias equalities from existential instantiations (Sections 2.1 and 2.3, pp. 2 and 4).

## technique: infer pure equalities from witnesses and combine regions

Heap predicates alone describe shape, but not all aliasing or return-value relations. SLING searches stack variables, existential variables, `nil`, and `res` for equalities true in every model and instantiation. It then combines the atomic formulas with separating conjunction and adds those pure equalities. The paper's final `concat` result at `L3` includes `res = x` and equalities linking the list segments (Section 2.3, p. 4).

### steps

1. Gather all predicate arguments and their model-specific existential instantiations (Section 4.3, pp. 7–8).
2. Test equalities between distinct stack, existential, `nil`, and return variables across every model (Section 4.3, p. 8).
3. Conjoin equalities that hold universally with the shape formulas (Section 4.3, p. 8).
4. Combine disjoint atomic formulas with `*`; discard `emp` components when they add no shape information (Section 2.3, p. 4).

Inference: In Verus, this corresponds to proving equalities such as `result == old(input)` or alias-free footprint relations as part of `ensures`. The equality must be proved for all executions; matching addresses in test traces is only a candidate. Use Verus's ghost state and `old(...)` in contracts where the required before-state relation is expressible.

## technique: validate inferred specifications with the frame rule

### what it is

When a function has several exits, SLING combines entry and exit formulas into a specification. It validates each pair using the separation-logic frame rule: if `{P} C {Q}` holds, then `{R * P} C {R * Q}` holds for untouched memory `R`. Operationally, it checks that the residual heap not modeled by the entry formula is unchanged in the corresponding exit model. If the residuals differ, the inferred pair is spurious (Section 4.4, p. 8).

### steps from the paper

1. Pair each entry model with the corresponding exit model (Section 4.4, p. 8).
2. Compute residual heaps after matching each inferred entry and exit formula (Section 4.4, p. 8).
3. Check that each residual entry heap equals the residual exit heap; reject pairs that change the framed region (Section 4.4, p. 8).
4. For a loop, treat the same inferred formula at loop head before and after the body as the candidate invariant (Section 4.4, p. 8).
5. Combine branch-specific postconditions with disjunction to obtain the complete function specification (Section 2.3, p. 5, for `concat`: “the complete post condition is the disjunction”).

### Verus form

Inference: The Verus analogue is modular framing through ownership: keep an untouched object outside `modifies` effects, prove that the function preserves its abstract footprint, and state the relationship in `ensures`. Verus does not use a frame-rule operator in ordinary contracts; the proof is encoded through borrowed references, ghost footprints, and function specifications. A candidate inferred from traces should be rejected unless Verus proves the contract and loop invariant.

## evidence, uses, and boundaries

Across 149 usable programs (excluding 5 that produced no traces and 3 that caused Z3 timeouts), SLING generated 3,214 invariants at 487 locations: 309 preconditions, 2,442 postconditions, and 463 loop invariants. Total analysis time was 3,866.06 seconds, averaging 25.95 seconds per program and 1.2 seconds per invariant; trace collection itself took about one second for all programs (Section 5.3, p. 10). These are totals for the reported MacBook setup, not a per-input theorem-proving guarantee.

The authors manually checked the generated invariants and found all non-spurious results correct, often stronger than documented ones. Spurious results came from invalid post-`free` traces that LLDB still exposed. Against S2 on 237 documented properties (specifications and loop invariants), 33 were found by both tools, 5 by S2 only, 162 by SLING only, and 37 by neither (Table 2, p. 11). The comparison is manual and treats documented invariants as ground truth (Section 5.5, p. 11, footnote 9). Inference: this does not show that SLING's formulas are complete.

SLING can expose bugs when traces reach them. For `AFWP/dll_fix.c`, the inferred invariant showed `k = nil` where the expected invariant permitted non-null `k`; the authors attribute this to a “(potentially seeded) bug” in which a guard checking for `k = nil` was commented out, and with the guard restored SLING inferred the expected invariant (Section 5.4, p. 11). It can also explain false positives from FBInfer: for a `glist_SLL/sortMerge` warning, SLING showed that `l->next` remained a valid alias, contradicting the reported leak (Section 5.4, p. 11); manual inspection confirmed the program has no leak there. Inference: these are diagnostic uses, not formal bug proofs.

The method is exponential in the number of predicates and parameters, and general heap model checking is EXPTIME (Section 4.5, p. 8). It does not consider general disjunctive invariants or numerical relations (Section 5.3, p. 10), and it does not support concurrency, which is why 2 of the 6 programs from [7] were excluded (Section 5.1, footnote 4, p. 8). The paper reports that missing traces (unreachable branches, bugs) and invalid traces after `free` led to missing or spurious invariants (Section 5.3, p. 10). Inference: sparse traces and freed memory therefore threaten validity or completeness. For future work the authors name an automatic SL verifier to check SLING's invariants and test-input generation for hard-to-reach paths (Section 5.3, p. 10); until then their manual validation is the only correctness check reported.

## what stays trusted and product threat

Inference: the C compiler/runtime, debugger's trace fidelity, user-supplied predicates, test-input generator, Z3 encoding, manual review, and the correctness of documented invariants remain trusted or assumed in this design. Dynamic candidates are not universal proofs. Inference: A Verus product can use this pipeline as a specification and invariant proposal stage, but only Verus's symbolic proof should count as verification evidence.

Inference: VL should not redo dynamic heap-trace mining, predicate-argument enumeration, residual-heap checking, or frame validation as if these were new. The Verus-specific opportunity is to mine failing proof obligations and execution traces into candidate `invariant` clauses for owned Rust collections, then prove or reject them with Verus. The paper's shape-only focus leaves arithmetic, concurrency, unsafe aliasing, and specification intent open.

Inference: The threat to an agent-written verified-Rust product is medium. Candidate loop invariants could reduce manual effort for pointer-like structures, and residual checks could expose inconsistent ownership assumptions. But unsoundly promoting a trace-derived clause would be dangerous, and the paper's C/LLDB results do not establish usefulness for Rust ownership or Verus solver behavior. Product claims should count only candidates that pass independent Verus proofs and should report trace coverage and rejected candidates.

## techniques for the catalog

- debugger trace collection — capture stack, heap, and return-value snapshots at entries, exits, and loop locations
- boundary-based heap splitting — partition each pointer's reachable region and intersect stable boundary variables across traces
- predicate-instance enumeration — instantiate inductive and singleton heap predicates, type-filter arguments, and SMT-check candidates
- residual and witness propagation — retain residual heaps and existential address mappings to refine later variables and infer aliases
- pure-equality inference — derive universally observed equalities and combine them with disjoint shape formulas
- frame-rule validation — compare framed residual heaps across entry and exit models before accepting a specification

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "To improve performance, SLING uses a type-checker (Algorithm 2, line 8) to eliminate variable combinations having inconsistent types to observed traces."): read the whole paper text, pages 1-14 (the PDF page count), and checked the quotations, the numbers in sections 5.1-5.5 and Tables 1 and 2, the Algorithm 1 and 2 steps, the Section 4 and 2.3 steps, and the section, page, and algorithm-line references; changed the paper link to the DOI printed in the paper, corrected about 20 page and section references (e.g. Section 4.4 is on p. 8, Section 5.2 on p. 9, Section 5.3 and Table 2 on pp. 10 and 11), replaced a wrong source for the variable-order heuristic, added the Table 2 count of 37 properties found by neither tool, made the dll_fix bug wording follow the paper ('potentially seeded'), marked own conclusions as Inference, and removed the unsupported claim about overly expressive predicates and the misplaced concurrency citation; not checked: the Verus-form paragraphs, the product-threat paragraphs and the catalog bullets, which are the study's own inference rather than paper claims, and the benchmark names listed in Table 1 and the Table 2 per-category rows beyond the totals.
