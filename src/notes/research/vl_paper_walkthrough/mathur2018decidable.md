# Decidable Verification of Uninterpreted Programs
(authored by agents unless marked 🧑)
Tag: `mathur2018decidable`, [paper](http://arxiv.org/abs/1811.00192v4)

## scope and result
The paper studies imperative programs whose assignments use uninterpreted functions and whose tests use equality or disequality. A program must be correct for every interpretation of those symbols and every feasible terminating execution. The unrestricted problem is undecidable: “The verification problem for uninterpreted programs is undecidable.” The useful restriction is coherence, requiring memoizing executions and early equality assumptions. For coherent programs, verification is PSPACE-complete; coherence itself is decidable in PSPACE. A bounded-ghost-variable extension, k-coherence, can make some non-coherent programs coherent. Recursive coherent programs are handled with visibly pushdown automata (VPA), with EXPTIME-complete verification.

## technique: term and execution abstraction

when to use it

Use this method when data values are opaque and only equality, disequality, and applications of uninterpreted functions matter. The program grammar has assignment, sequencing, conditionals, while loops, and `assume`; its postcondition is a quantifier-free Boolean combination of equalities. The paper's example P1 models list traversal with uninterpreted `n` and `key`; it can prove a relation such as `b=T => key(r)=k` without assuming list representation.

how to do it

1. Convert a program to its regular language of syntactic executions. `Exec` maps sequencing to concatenation, conditionals to guarded union, and loops to a Kleene-star expression (Section 2.2). The paper states: “It is easy to see that an NFA accepting Exec(s) (as well as for PExec(s)) of size linear in s, for any program s, can be easily constructed in polynomial time from s”
2. For each execution prefix rho and variable x, compute a symbolic term `Comp(rho,x)` from initial constants, copies, and function applications (Definition 3)
3. Collect equality assumptions alpha(rho) and disequality assumptions beta(rho), then compute congruence closure of alpha. An execution is feasible exactly when the closure has no disequality pair; equivalently, the canonical initial term model suffices (Section 3.2)
4. For coherent executions, stream the execution with a finite automaton state `(equivalence, disequalities, partial function interpretation)`. Update this state on copy, function assignment, equality assume (local congruence closure), and disequality assume (Section 3.2)
5. Intersect that feasibility automaton with the NFA of program executions and search for an accepting path. A path is a feasible counterexample; no path proves the postcondition (Theorem 8)

The paper emphasizes the trust boundary of the abstraction: “The set of terms computed by an execution are independent of the assume statements in the execution and depend only on the assignment statements.” Assumptions constrain feasibility, not symbolic term construction.

## technique: coherence and automatic recognition

Memoizing means that when an assignment recomputes a term equivalent to an earlier term, some variable still stores an equivalent term. Early assumes means an `assume(x=y)` happens before any superterm of x or y has been dropped. The paper's P2 fails memoizing when `n(x)` is recomputed after its old value was overwritten; P1 and P3 satisfy both conditions.

Apply it by building a second deterministic automaton. Track the feasibility state plus a Boolean table E recording whether each function has ever been computed on each tuple of current equivalence classes. On `x := f(z)`, mark E; if E says the tuple was computed but the partial interpretation no longer stores its result, reject as non-memoizing. On `assume(x=y)`, inspect stored superterms and reject if an already-computed superterm was dropped; otherwise merge classes and perform local congruence closure (Section 3.3). Intersect the program NFA with the automaton for non-coherent words. Empty intersection proves the program coherent. The result is PSPACE because states are exponential in variables but can be explored on the fly.

## technique: k-coherence and recursion

If a program is not coherent, add up to k ghost variables that are written but never read, preserving terms that would otherwise be dropped. Decide whether such assignments exist, construct the augmented automaton, and verify the resulting coherent program (Section 5). The paper explicitly says: “These ghost variables are only written and never read, and therefore, play no role in the actual computation.” For recursive calls, replace finite-word automata with VPAs that respect call, return, and internal actions; intersect the VPA for executions with the VPA accepting coherent executions and check emptiness (Section 6).

## Verus form (inference)

Inference: model each uninterpreted function as a `spec fn` over mathematical values and model the finite program state with Rust-like datatypes. Use `requires` and `ensures` for the postcondition and `assert` or `proof fn` lemmas for congruence facts. Represent ghost variables as proof-only state or ghost fields whose values are never read by executable code; preserve ownership and invariants with Verus `invariant` statements in loops. Inference: Verus can prove a supplied finite execution invariant, but it does not automatically construct the paper's NFA, feasibility automaton, or VPA; those are an external analysis that can generate contracts and proof obligations. Use only supported `spec fn`, `proof fn`, `requires`, `ensures`, `assert`, and loop `invariant` constructs.

## evidence, assumptions, and product relevance

The paper proves coherent non-recursive verification PSPACE-complete (Theorem 8), coherent-language regularity with a DFA of size exponential in the variable count (Theorem 9), and PSPACE decidability of coherence (Theorem 10). It proves unrestricted undecidability by reduction from the halting problem for 2-counter machines (Theorem 11), and states that either memoizing alone or early-assumes alone remains undecidable (Theorems 12 and 13). Recursive coherent verification is decidable and EXPTIME-complete (Theorem 17). These are complexity theorems, not runtime measurements; the paper supplies no benchmark denominator or wall-clock evaluation. Trusted assumptions include the uninterpreted-function semantics, syntactic terminating-execution model, correctness of automata constructions, and the postcondition itself.

Inference: the direct threat to agent-written verified Rust is low for ordinary concrete data structures because Rust and Verus provide more operational detail than an uninterpreted model. The paper's boundary is valuable: automation cannot bypass an undecidable unrestricted class, so VL should detect when generated proofs rely on a coherence-like bounded-memory abstraction. What is already done here and should not be redone is the core term-model, congruence-closure, coherent-automaton, and bounded-ghost framework. A VL integration could instead classify generated code by memoizing/early-assume conditions and select a finite-state proof strategy when the conditions hold.

## techniques for the catalog
- initial term model: reduce all feasible uninterpreted executions to congruence closure in a canonical term model
- coherent execution automaton: stream variable equivalence, disequalities, and partial function interpretations with finite memory
- coherence checker: track recomputation table E and superterms to reject non-memoizing or late-equality executions
- k-coherence: add bounded write-only ghost variables to retain dropped terms and recover decidability
- recursive VPA verification: intersect execution and coherence visibly pushdown automata and test emptiness
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
