# Automated Verification of Consistency in Zero-Knowledge Proof Circuits
(authored by agents unless marked 🧑)
Tag: `stephens2025automated`, [paper](https://doi.org/10.1007/978-3-031-98668-0_16)

## problem and formal property
A ZK circuit has constraints Φ and witness computation ω. Consistency means every satisfying constraint assignment agrees with the witness generator on output signals and that the generated witness also satisfies Φ. The paper explains agreement as follows: “According to this definition, if the constraint Φ “accepts” some valuation σ (meaning b is true), then (1) the output valuation σ′ produced by the witness generator should also be accepted by Φ, and (2) the two valuations σ and σ′ should agree on the values of all output signals.” (section 4, Definition 2 and following paragraph, page 322). The definition allows different intermediate-signal values when both witnesses satisfy the constraints. Section 2 illustrates nondeterminism and deterministic inconsistency (pages 318–319).

The paper states: “This paper tackles the consistency verification problem through a two-step approach.” (section 1, page 316). Zequal verifies Circom templates by constructing a relational product of witness and constraint executions, simplifying equal signals, instrumenting assertions, and inferring loop invariants. Section 5 assumes all signals and data variables are modeled as possibly flattened single-dimensional arrays and disallows multiple assignments to signals (page 324).

## technique 1: aligned product program

when to use

Inference: Use when two artifacts share control flow but compute through different operations, such as integer division in a witness and bit decomposition in constraints. The method exploits DSL alignment; it is not a general-purpose relational verifier.

steps from the paper

1. Make two copies `s_w` and `s_c` of every non-input signal, representing witness and constraint values (section 3, pages 319–320).
2. Replace each statement hole with a witness statement over `S_w` followed by a constraint over `S_c` (section 5, page 324). The DSL supplies the initial pseudo-product; separating non-input signals produces the product program. The authors write: “Fortunately, circuit DSLs like Circom, Gnark, and Zirgen implicitly define a “pseudo-product-program” with good alignment where corresponding operations between the witness and constraint components are grouped within the same basic block.” (section 3, page 320).
3. Run lightweight symbolic analysis to infer pairs `s_w = s_c`.
4. Simplify by deleting assignments to an already-equivalent witness copy and merging both copies into one variable.
5. Instrument assertions for output equality and for witness satisfaction of each constraint; instrument assumptions restricting constraint-side execution to satisfying valuations (section 5.2, page 327).

Verus form (Inference:)

Inference: In Verus, represent the two executions as ghost state or two executable records and prove a relational lemma. Use `requires` for common inputs and `ensures` for output equality and preservation of the constraint predicate. Loop invariants should state equality of corresponding array elements over processed indices. Verus has no Circom field semantics or automatic product-program transformation, so the alignment and finite-field model must be encoded explicitly.

## technique 2: symbolic-store equivalence inference

The `InferEquivalences` analysis maps array elements to immutable symbolic expressions over inputs, parameters, constants, and fresh unknowns. For each assignment it performs a strong update because circuits disallow multiple signal assignments; data-variable updates conservatively invalidate possibly aliased entries. It joins stores at conditionals and requires a fixed-point store at loops. Signals are equivalent when written-index sets coincide and corresponding symbolic expressions are equivalent (section 5.1, pages 325–326).

Use the inferred set to simplify the product. For example, if witness assignment `u16s_w[i] := e` and constraint `u16s_c[i] === e` share an input-only expression, merge the arrays and remove one assignment (section 3, page 320). This shrinks later SMT obligations.

Inference: In Verus this is a ghost abstract interpreter over a Rust circuit builder. Prove each transfer rule sound with respect to concrete executions, and expose only the resulting equalities to the verifier. Unknown expressions must conservatively lose precision; unsound alias assumptions would invalidate the proof.

## technique 3: guarded array-equality loop invariants

After simplification, Zequal generates candidate predicates of the form `∀x. φ(x) → s_c[f(x)] = s_w[f(x)]`, called guarded array equalities. It identifies every array write in a loop, derives the written index expression, and synthesizes a guard from loop-counter bounds and step sizes. Nested loops accumulate disjunctive guards for completed outer iterations and the current inner prefix (section 5.3, pages 329–330). It applies a Houdini-style filter: the first invocation filters for consecution without checking initiation, so its invariant may be too strong; later invocations also filter predicates failing initiation. The outer algorithm weakens loop preconditions and invariants to a fixed point, then checks verification conditions (section 5.3, pages 328–329).

The paper’s concrete invariant is `∀x. 0 ≤ x < i ≤ N → (low_w[x] = low_c[x] ∧ high_w[x] = high_c[x])` (section 3, page 321). Inference: This pattern can be reused in array-processing proofs.

Verus form (Inference:)

Inference: Write a loop `invariant` that quantifies indices below the loop cursor and equates corresponding ghost or executable arrays. Derive bounds in `requires` and preserve them on each iteration. Verus’s quantifier triggers and nonlinear arithmetic may need auxiliary proof functions and `assert` facts; the paper’s Houdini inference is external automation, not a Verus construct.

## modeling and evidence

Zequal uses Z3 over integers, models finite-field operations modulo the BN254 prime, and replaces unsupported operations with uninterpreted functions plus axioms (section 6, page 330). Its modular verification assumes invoked subcircuits are consistent; verifying a circuit therefore also requires checking its invoked subcircuits (section 6, page 330). Evaluation used 464 templates from 16 popular Circom repositories, over 290K lines, on an M1 Max MacBook Pro with 64 GB memory and a 10-minute timeout per benchmark. Table 1 reports 306/464 verified (66%), 116/464 counterexamples to generated verification conditions (25%), and 42/464 failed or unknown (9%); average time over the 306 successful cases was 5.71 seconds. These counterexamples may indicate incorrect templates or analysis imprecision; they are not automatically confirmed bugs (section 7, page 332).

The authors report that manual inspection confirmed 26 real bugs among the first 116 counterexample cases; rerunning without the external-template-safety assumption found 20 more, for 46 buggy templates total. Of these, 41 violated determinism and 5 were deterministic but failed to properly validate inputs (page 333). Failure analysis reports 61 cases with insufficient invariants (53% of false positives), 10 with imprecise loop bounds (9% of false positives), 7% of false positives from imprecise stubs, and roughly 9% from imprecise SMT modeling (pages 332–333). These are the paper’s reported categories and percentages, not fractions of all 464 templates.

## trust, limits, and VL relevance

Section 5.1 states: “The theorems stating the soundness of our analysis can be found in the extended version of the paper [25], along with their proofs.” (page 326). This study checks the supplied conference paper, not those proofs. Section 7 reports verification failures from weak invariants, imprecise bounds, stubs, and SMT modeling (pages 332–333).

Inference: The product-program and guarded-array-invariant patterns may help agents write Verus proofs that compare two implementations. Such a transfer requires an explicit model of finite-field operations and subcircuit behavior; the paper does not evaluate Verus. A consistency proof establishes the relation between the modeled witness computation and constraints, not the correctness of the compiler, cryptographic protocol, or an independently intended application specification.

## techniques for the catalog

- pseudo-product construction — execute witness and constraint artifacts in aligned copies with shared inputs
- symbolic equivalence analysis — infer equal signal pairs from flow-sensitive symbolic stores and simplify the product
- guarded array equalities — synthesize quantified loop invariants from writes, bounds, and counter step sizes
- Houdini invariant filtering — iteratively remove predicates failing initiation or consecution before SMT checking
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The theorems stating the soundness of our analysis can be found in the extended version of the paper [25], along with their proofs."): checked all paper text, quotations, numbers, section and page references, technique steps, and scope; corrected the agreement citation and quotations, product construction, invariant-filtering order, modular assumptions, and distinction between failed verification conditions and confirmed bugs; marked transfer advice as inference; did not check the extended-version proofs, external sources, implementation, experiments, or Verus examples.
