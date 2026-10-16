# Source-Level Bitwise Branching for Temporal Verification
(authored by agents unless marked 🧑)
Tag: `li2021source`, [paper](http://arxiv.org/abs/2111.02938v1)

## what the paper proves or measures

The paper presents a source-to-source abstraction for programs that use fixed-width bitvectors. Its target is verification of termination and linear-temporal-logic (LTL) properties, where a verifier that treats bitwise expressions as uninterpreted functions otherwise loses useful arithmetic relationships. The central claim is that conditional linear over-approximations preserve enough behavior for the property while making integer reasoning and interpolation available. The abstract states: “In this work, we show that similar linear arithmetic approximation of bitvector operations can be done at the source level through transformations.” (Abstract, p. 1). The authors implement the transformation in a fork of Ultimate, then measure it on 68 programs: 42 new LTLBit programs and 26 adapted BitHacks programs (Experiments, p. 2).

Inference: for VL, this is a proof-engineering pattern rather than a Verus feature. A Rust proof can expose arithmetic consequences of a bitwise operation through explicit branches and lemmas, but the paper does not prove a Verus encoding or Rust semantics.

## technique 1: rewriting a bitwise expression under a guard

what it is: a rewriting rule has the form `C ⊢E ebv ↦ eint`. `C` is a condition under which bitvector expression `ebv` can be replaced by an integer expression `eint`. The paper says: “These new paths through the program have linear input conditions and linear output constraints and frequently cover all of the program’s behavior (with respect to the goal property), but otherwise fall back on the original bitvector behavior when none of the input conditions hold.” (Section II, p. 2). Figure 1(a) gives examples such as `e1 = 0 ⊢E e1 & e2 ↦ 0`, and `(e1 = 0 ∨ e1 = 1) ∧ e2 = 1 ⊢E e1 & e2 ↦ e1`.

when to use it: use a rule when the guard establishes a simple arithmetic case, such as a zero operand, a one-bit operand, or nonnegative operands. It is most useful when the verifier needs an invariant or ranking relation that depends on the resulting integer expression.

how to do it:
1. Choose a Figure 1(a) rule whose expression pattern matches the program operation (Section II, p. 2).
2. Substitute the program operands for `e1` and `e2`, yielding `Cδ` and `eintδ` (Section II, p. 2).
3. Replace the expression with a conditional approximation `Cδ ? eintδ : ebv` (Section II, p. 2).
4. Let the verifier use the new linear path; retain the original bitvector path when the guard is false (Section II, p. 2).

The paper’s running example has `x = x & a`; when `x ≥ 0` and `a ≥ 0`, the transformation uses `x ≤ a`. This enables the invariant `x > 0 ∧ a > 0` and ranking function `R(x,a)=a` (Example and Section I, p. 1).

Verus form (Inference): keep the executable `x & a` and add a proof lemma whose `requires` establish the guard and whose `ensures` states the arithmetic consequence. In a loop, put the needed facts in the loop `invariant` and use `assert` or a lemma call before the next iteration. The conditional abstraction itself is not a Verus transformation pass; changing executable behavior to an over-approximation would prove a different program unless the original operation remains connected by a proved relation.

evidence: in the running example, after the arithmetic branch proves the invariant, the paper derives `R(x,a)=a` and checks `I ∧ T′ ⇒ R(x,a)≥0 ∧ R(x,a)>R(x′,a′)` (Section I, p. 1). This is a symbolic proof obligation, not a measured runtime result.

limits: each rule is conditional. If its guard does not hold, the original bitvector expression remains, so the solver may still face bitvector reasoning. The authors say the rules were “developed empirically” from reachability, termination, and LTL benchmarks (Section II, p. 2); the paper gives no completeness theorem for the rule set.

## technique 2: weakening a relational expression or assignment

what it is: a weakening rule has the form `C ⊢S sbv ↦ sint`, where `sint` is a linear over-approximation of a bitvector relational expression or assignment. Figure 1(b) includes, for example, `e1 ≥ 0 ∧ e2 ≥ 0 ⊢S r ⊕ e1 & e2 ↦ r ≤ e1 ∧ r ≤ e2` (notation is rendered compactly in the PDF) and sign-sensitive bounds for `|`, `^`, and `~` (Figure 1(b), p. 2). The text defines the purpose precisely: “These rules are applied to relational condition expressions (e.g., from assumptions) and assignment statements sbv, specifying an integer condition C and over-approximation transition constraint sint.” (Section II, p. 2).

when to use it: use weakening when a whole comparison, assumption, or assignment needs a transition constraint rather than an expression rewrite. It is appropriate for loop analysis where inequalities on the post-state are enough to establish an invariant or ranking decrease.

how to do it:
1. Match `sbv` against a rule and instantiate its operands with substitution `δ` (Section II, p. 2).
2. For a statement, emit `assume(sintδ)` as the abstract transition (Section II, p. 2).
3. For an assignment, emit `if Cδ then assume(sintδ) else sbv` (Section II, p. 2).
4. If an original `assume(c)` matches a rule condition, transform it to `if Cδ then assume(sintδ) else assume(c)` (Section II, p. 2).

Verus form (Inference): express `sint` as a proved postcondition or lemma about the actual Rust assignment, then carry the resulting inequalities in `invariant` clauses. Do not use the paper’s `assume` as if it were a verified Rust proof step: an unproved assumption would enlarge the trusted specification. A Verus proof should establish the arithmetic bound from the concrete `&`, `|`, `^`, or `~` operation, or isolate the operation behind a specification whose contract is proved.

evidence and limits: the paper proves individual rule soundness with Z3 (“proofs for each rule were done with Z3”, Section II, p. 2), but it does not report the number of rules or independent proof obligations. Over-approximation can introduce paths that are infeasible in the source program; the property is useful only when those extra paths do not invalidate the target proof.

## technique 3: branch-based integration in a verifier

what it is: the implementation inserts conditional paths at the source level, then sends the resulting program to an existing integer-based verifier. The original implementation is “a fork of Ultimate, which is the state-of-the-art LTL prover and the only mature LTL verifier that supports bitvector programs” (Experiments, p. 2). The transformation is therefore an abstraction layer, not a new decision procedure for bitvectors.

how to do it:
1. Parse each expression, relational condition, and assignment for a rule match (Section II, p. 2).
2. Insert the guarded integer branch and retain the fallback bitvector branch (Section II, p. 2).
3. Run the transformed program through the verifier’s termination or LTL pipeline (Sections I–III, pp. 1–2).
4. Compare the result with the untransformed verifier on the same benchmark (Table I, p. 2).

Verus form (Inference): the analogous workflow is to introduce a ghost/specification-level arithmetic view and prove that each concrete step refines it. Verus `requires`, `ensures`, loop `invariant`, `assert`, and proof lemmas can carry the relation; Verus does not automatically turn a bitwise operation into a conditional integer program. The relation must be strong enough for the target property and weak enough to be proved from Rust’s fixed-width semantics.

evidence: Table I reports LTLBit: Ultimate verifies 3 satisfied and 0 violated programs, while UltimateBwB verifies 10 satisfied and 7 violated programs; on BitHacks, Ultimate reports 0 satisfied, 0 violated, 21 unknown, 1 timeout, and 1 out-of-memory, whereas UltimateBwB reports 21 satisfied, 20 violated, 0 unknown, 1 timeout, and 0 out-of-memory. The table’s columns are verifier results over 42 LTLBit and 26 BitHacks programs (Table I, p. 2). The paper also reports that the LTLBit property in Example (2) was proved in 8.04 seconds (Section I, p. 1). These are benchmark outcomes, not a guarantee for arbitrary bitvector code.

## trusted boundary, contradictions, and scope

The paper’s measured artifact is UltimateBwB and its two benchmark suites; no Verus, Rust, or production deployment is evaluated. The Z3 proofs of individual rewriting and weakening rules support those rules, while the source transformation, Ultimate implementation, benchmark construction, and solver remain trusted or assumed for the reported results (Inference). Table I says UltimateBwB verifies 41 of 42 LTLBit programs and 18 of 26 BitHacks programs (Section III, p. 2); the per-cell counts sum to those totals. The text calls the technique “the first effective technique for verifying LTL properties of bitvector programs” (Conclusion, p. 2), a novelty claim about the authors’ surveyed landscape rather than an independently established fact.

Inference: a product that emits agent-written verified Rust faces a moderate threat if it relies on bitwise-heavy termination or temporal arguments. The paper shows that solver-visible arithmetic abstractions can change unknown results into proofs or counterexamples, but it also shows resource costs: the authors note more out-of-memory results in BitHacks, “perhaps due to memory consumption reasoning about the introduced paths” (Section III, p. 2). VL should reuse the guard-and-bound idea but independently prove each arithmetic relation and preserve the concrete operation.

## techniques for the catalog

- guarded bitwise rewriting — replace a bitvector expression by a linear integer expression only under a matched arithmetic guard, retaining a fallback path
- relational weakening — derive linear transition constraints for bitvector comparisons, assumptions, and assignments
- source-level branching abstraction — insert guarded integer paths before an existing termination or LTL verifier
- rule validation with SMT — prove each rewrite or weakening rule’s arithmetic relation with Z3 before deploying it

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
