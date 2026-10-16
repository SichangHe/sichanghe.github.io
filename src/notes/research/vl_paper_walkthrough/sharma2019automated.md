# Automated Verification of Integer Overflow
(authored by agents unless marked 🧑)
Tag: `sharma2019automated`, [paper](http://arxiv.org/abs/1909.09324v1)

## what the paper proves and measures
The paper extends separation-logic verification so integer overflow is represented and checked during proof. Its abstract states: “In this paper we present a specification mechanism for expressing integer overflow.” It also reports a prototype run on “over 14k LOC” that found 43 overflow bugs. The benchmark table gives the denominator precisely: 14,237 lines, 106 programs, 43 reported overflows, and one false positive; times are 328.95 seconds without and 393.5 seconds with checking. These are HIPioc measurements across the listed Arrays, HIP/SLEEK, Imm, V Perm, Barriers, SIR, and Sorting benchmarks (Experiments, p. 9).

The property is conditional safety, not termination. The paper says: “If the program has an integer overflow the forward verification with integer overflow checking detects it” (Soundness, p. 8). It assumes the underlying separation-logic entailment checker and verifier are sound, and its proof uses the soundness of the cited error calculus. It explicitly notes that over-approximation can produce false positives; one occurred in the 106-program experiment. Inference: a Verus integration should treat this as an arithmetic safety layer and separately state any assumptions about machine-width arithmetic and termination.

## technique 1: logical infinities in specifications

What it is. Add logical constants ∞ and −∞ to the specification language, standing for values beyond the finite machine range. A precondition can then require that an operation stays below ∞, or explicitly describe an overflow branch with the error status `(true)0_ioc`. The paper’s motivating example changes `requires n≥0` to `requires 0≤n + 1<∞` for a function returning `n+1` (Motivating Examples, pp. 2–3). Intentional overflow is represented as a disjunction: finite result when `n+1<∞`, and the error status when `n+1≥∞`.

When to use it. Use ∞ in method contracts, recursive predicates, and array-domain constraints whenever a value may exceed the target architecture’s range. The linked-list example places `sum<∞` in the list predicate, so a recursive sum is checked through the heap. The array-concatenation example has separate contracts for a safe copy, an ordinary length error, and `len1 + len2 > ∞` producing `(true)0_ioc` (Motivating Examples, p. 3).

How to apply it.
1. Extend pure arithmetic terms with ∞ and −∞; the grammar includes constants, addition, comparison, `min`, and `max` (Specification Language, pp. 4–5).
2. Put finite-range conditions in `requires`/`ensures` or inductive predicates. For a recursive list, carry the sum and assert `sum<∞` in every predicate instance.
3. For intentional overflow, add an alternative postcondition with the error status, preserving the normal result branch.
4. Use the same predicate at callers so entailment propagates the range condition through heap structure and sharing.

Verus form (Inference). Verus has mathematical `int` in specifications, so write a `spec fn` predicate for the bounded domain and require it in `requires`; use `ensures` to return either the normal result or an explicit error value. A runtime `fn` can call a `proof fn` to establish bounds, but the proof function is not a runtime checker. The paper’s logical infinity is an abstraction, so a Verus contract must connect it to a chosen machine type (`u32`, `i32`) with explicit bounds; do not write `invariant(...)` as a call.

Evidence and limits. The paper’s soundness section proves equisatisfiable normalization (Lemma 1) and then overflow detection (Lemma 2), assuming every integer operator has been translated to a checking method. It does not prove absence of false positives or termination. The benchmark’s single false positive demonstrates the precision limit.

## technique 2: normalize infinity, then reuse existing solvers

What it is. The entailment procedure eliminates ∞ before satisfiability checking. The paper gives this sequence: substitute equalities involving ∞, apply normalization rules, then replace any remaining ∞ with a fresh integer variable. Rules simplify comparisons such as `k≤∞` to true, `∞≤v` to `v=∞`, and `max(a,∞)` to ∞ (Specification Language, pp. 5–6).

How to apply it.
1. Receive a pure formula from separation-logic entailment.
2. Substitute equalities of the form `v=∞`.
3. Repeatedly apply the Figure 2 rules for constants, variables, and `min`/`max`; if a rule creates a new infinity equality, substitute and normalize again.
4. Replace remaining ∞ by fresh `v∞` and send the finite formula to an existing Presburger solver such as Omega.
5. Combine the pure result with heap entailment and retain the frame residue.

The paper’s Lemma 1 states that normalization preserves satisfiability in both directions (Soundness, p. 8). Inference: a Verus analogue would encode these cases as proof lemmas over mathematical integers and let the SMT backend discharge the normalized arithmetic; Verus does not expose the paper’s separation-logic heap entailment, so the heap framing must be represented with Verus permissions and predicates.

## technique 3: translate operators into checked contracts

The verifier rewrites primitive arithmetic operations into calls to specifications `uadd` and `add`. For unsigned addition, the two contracts are `k1+k2>∞` with `(true)0_ioc`, and `k1+k2≤∞` with `res=k1+k2`. Signed addition splits positive/negative operand cases and checks both upper and lower bounds. The paper says: “After translation of basic operators into method calls, during forward verification the [FV−[CALL]] rule will ensure that we check each operation for integer overflow” (Verification with Integer Overflow, p. 8).

Use this when the implementation language’s operators lack explicit checked semantics. Define one contract per operator, translate every occurrence before forward verification, and let normal call checking select a satisfiable precondition. A failed precondition means the overflow branch is propagated as an error status. Inference: in Verus, wrap arithmetic in checked runtime functions whose contracts require bounds, and call those wrappers from verified code; do not claim that ordinary Rust arithmetic is automatically rewritten by Verus.

## what remains trusted and product threat
Trusted components are the underlying entailment checker/verifier, the arithmetic solver, the error-calculus soundness result, and the model of machine integers. The prototype and benchmark establish feasibility, not a verified implementation of HIPioc itself. Inference: agent-written verified Rust remains exposed if contracts omit conversion, multiplication, indexing, or allocation-size arithmetic; this technique suggests a systematic operator inventory and explicit checked wrappers. Existing work already covers the core idea, so VL should avoid rediscovering an infinity encoding without measuring precision and false positives.

## techniques for the catalog
- logical-infinity contracts — represent finite, intentional-overflow, and error cases with ∞/−∞ in separation-logic specifications
- infinity normalization — rewrite infinity formulas to equisatisfiable finite formulas before invoking existing arithmetic solvers
- checked-operator translation — replace primitive arithmetic with contract-bearing overflow methods so forward verification checks every operation
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
