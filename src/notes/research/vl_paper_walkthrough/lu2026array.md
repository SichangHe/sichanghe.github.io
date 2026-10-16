# Array-Carrying Symbolic Execution for Function Contract Generation
(authored by agents unless marked 🧑)
Tag: `lu2026array`, [paper](https://doi.org/10.1007/978-3-031-37709-9_14)

## what is proved and measured

The paper introduces symbolic execution that carries quantified invariants and contiguous array segments to synthesize ACSL `requires`, `ensures`, and `assigns` contracts for C functions. It generates annotations, then sends them to Frama-C WP; success means every generated verification goal is proved. The authors define the target: “A function contract characterizes the intended behavior of a function by a precondition restricting admissible input program states, a postcondition describing the property that must hold upon termination, and an assigns information indicating possible memory locations whose content may be modified during function execution.” (Section 3, PDF p. 6)

## technique 1: queue-based symbolic execution

Use this for path-sensitive contract synthesis when loops and memory operations must be summarized. Steps from Algorithm 1 (PDF pp. 9–11):

1. Extract variables and initialize each with a fresh symbolic address and value; substitute these values into the input ACSL precondition
2. Maintain each path as symbolic state `(M,A)`, path conditions, and active segments
3. For `if`, fork paths with the symbolic condition and its negation
4. For assignments, evaluate expressions under the state and update the memory map; for address-of, store the symbolic address; for writes, update the addressed location
5. For each `while`, call an external loop analyzer with the current state and path conditions, conjoin returned invariants and loop-exit conditions, and introduce fresh exit symbols where necessary
6. At function exit, compare final and initial memory maps for `assigns`, project away intermediate symbols, and translate path conditions and segment facts into source-level ACSL

The paper states: “The main workflow is an enumeration of all feasible execution paths under a program in the syntax of S.” (Section 3.1, PDF p. 9) Inference: a Verus analogue would use ghost state and `requires`/`ensures` to represent symbolic values, while executable Rust remains unchanged; path enumeration itself is an analysis outside Verus and the final contract must be proved by Verus.

## technique 2: carrying array segments and invariants

Represent a segment as base address, offset, length, and content summary. Use direct index functions for patterns such as `arr[i] = i+2`, aggregate expressions for sums or maxima, and explicit quantified constraints for loop domains. On an array read, find overlapping segments and substitute the read offset into each summary; if several are possible, retain a disjunction. On a write, split the containing segment into prefix and suffix segments, propagating summaries. After writes or loop analysis, merge adjacent segments with syntactically equal summaries (Section 3.2, PDF pp. 12–14).

The paper’s concrete invariant for `SearchZero` is “the invariant that all elements scanned so far are zero,” represented as the quantified range `[0,i)` with `data[k] = 0` (Section 3.2, PDF p. 13). Its two loop exits remain disjunctive: one has `data[i] != 0 ∧ i < size`; the other has `i = size` (PDF p. 14). Inference: Verus can encode these as quantified `forall` facts over `Seq` or array models and maintain them with loop `invariant` clauses; the paper’s ACSL segment metadata has no direct Verus construct and would be ghost representation.

## technique 3: external invariant generators and verification

The executor delegates loop invariant and summary generation to plugins, including affine/linear Farkas-lemma reasoning and idiom generators for search and max/min loops. The prototype is about 19,000 lines of C++ on Clang/LLVM and emits ACSL, which Frama-C WP verifies (Section 3.3, PDF p. 14). The external generator is trusted for useful candidates but not for final correctness: Frama-C WP is the checking step.

## evidence and limits

The evaluation uses 281 programs across SyGuS (133), OOPSLA-13 (46), Frama-C (51), SV-Comp (14), X-509 (6), and openHiTLS (31) (Section 4.1, PDF p. 15). The paper reports 68/281 fully verified for the new tool versus 10/281 for AutoDeduct (Table 1, PDF p. 16). It reports 143/281 partial, 1/281 timeout, and 69/281 generation failures for its tool; these counts sum to 281. Average runtime is reported as 0.148 seconds for successful generated cases in the table, while the text separately says weighted average 0.160 seconds; this is an internal reporting discrepancy. AutoDeduct’s table average is 2.703 seconds, while text says 2.706 seconds. The text claims approximately 17.1× speedup from those weighted averages.

Generation fails mainly on unsupported `%`, `<<`, `>>`, nested loops, and recursive-function handling; partial proofs need stronger invariants or have ACSL/WP compatibility issues (Section 4.2, PDF pp. 16–17). The authors state: “Our symbolic execution has limited ability to handle pointers.” (Section 1, PDF p. 3) It supports base-plus-offset array pointers but not linked lists or trees.

## techniques for the catalog

- queue-based symbolic execution — fork paths, update symbolic memory, summarize loops, then project path facts into contracts
- contiguous segment summaries — represent base/offset/length/content and carry quantified array facts across statements
- segment split and merge — split on writes and merge adjacent equal summaries to preserve precision compactly
- external invariant generation — feed affine and idiom-specific loop invariants into symbolic execution, then check ACSL with Frama-C WP
