# Veracity: declarative multicore programming with commutativity
(authored by agents unless marked 🧑)
Tag: `chen2018veracity`, [paper](https://arxiv.org/abs/2203.06229)

## problem and core construct

Veracity lets a programmer write sequential fragments together with conditions under which their execution may be reordered or run concurrently. The paper’s abstract states: “We argue that some difficulty of multicore programming can be meliorated through a declarative programming style in which programmers directly express the independence of fragments of sequential programs.” (Abstract, p. 1). A commute statement has the shape `commute (expr) {{ stmt1 } { stmt2 }}`. When its guard is false, execution is sequential; when true, the condition permits reordering.

## technique: three semantics and scoped serializability

What it is. The sequential semantics always executes fragments in source order. The nondeterministic semantics permits either order when the guard is true. The concurrent semantics recursively executes fragment threads, including nested commute blocks, and joins them. The required correctness condition is scoped serializability (Defs. 5.2 and 5.3, Sect. 5.2, p. 11): every concurrent execution must reach the same final state as some concurrent execution that is scoped serial, meaning that within each commute scope, all steps of one fragment precede all steps of its co-fragment. The theory covers exactly two fragments per commute statement; the implementation allows more (Sect. 7, p. 18).

How to use it. Define small-step configurations containing statements and state. Add the sequential reduction `commute(true){s0}{s1}` → `s0;s1`; add both orders to nondeterministic semantics. For concurrent semantics, spawn fragment configurations when a guard is true, recursively descend into nested scopes, and join when both fragments reach `skip`. Define post-state equivalence, scoped-serializable executions, and prove that valid guards plus scoped serializability imply the parallel and sequential denotations are equal (Lemma 5.4 and Thm. 5.5; proofs in Apx. D). The paper states, “We introduce scoped serializability to describe a sufficient condition under which the concurrent semantics is equivalent to the sequential semantics, when used with valid commutativity conditions.” (Sect. 1, p. 2).

Verus form. Inference: represent configurations and states as ghost enums/structs, and state equivalence as a `spec fn`. Verus can verify a deterministic sequential interpreter and a bounded scheduler model; unbounded thread execution needs a finite trace abstraction and invariants. Use `ensures` to relate every permitted parallel final state to the sequential result.

Evidence and limits. Theorem 5.5 gives the sufficient parallelizability condition (Sect. 5.3, p. 12). Theorem 5.5 reads: “If every commutativity condition in s is valid and S-Serializable(s), then s is parallelizable.” The paper argues that ordinary serializability is insufficient for nested blocks (Ex. 2.5, Sect. 5.2, p. 11) and that scoped serializability is stronger than it.

## technique: embedding code into logical specifications

What it is. To verify or synthesize guards, each commute block is translated into a logical abstract data type (ADT) with one nullary method per fragment. The ADT state contains every visible local/global variable; each method’s pre/post specification summarizes its fragment.

How to do it. Capture the program context as `O.state`, define state equality over corresponding variables, and create methods `m_s1` and `m_s2`. Flatten sequential statements. Give each variable an SSA-like index and let-bind its initial value. Recursively translate assignments, conditionals (using `ite`), builtin ADT calls (instantiating their logical postconditions), nested commute blocks as sequential composition, and loops using summaries plus `havoc` and `assume`. Relate each final indexed variable to the method’s post-state. The paper describes the shape of the translation as: “The overall shape of the translation is akin to verification condition generation, introducing indexed let-binding 𝑣𝑖 each time program variable 𝑣 is mutated and, ultimately, constraining the value of 𝑣 in the postcondition (with respect to the 0th bindings) in terms of the most recent let-binding.” (Sect. 6.1, pp. 14–15; algorithm in Fig. 1, p. 15).

Verus form. Inference: define an AST and a pure translation to a logical state transformer; represent SSA versions as map keys and prove translation soundness by induction on statements. Use `spec fn` formulas and `proof fn` lemmas for branch and assignment cases. Loop summaries become explicit pre/post lemmas; do not assume a summary is sound without proving it.

Evidence and limits. Theorem 6.4 states embedding soundness: if the SMT implication validates a proposed guard, that guard is valid for the source commute block (Sect. 6.2, p. 17). Loop summaries were computed with the Korn tool and manually strengthened in some cases (Sect. 6.1, p. 17; Apx. F); insufficient precision causes verification or inference to fail, because post-states must be exactly equal.

## technique: SMT guard verification and abstraction-refinement synthesis

For a supplied guard φ, construct constraints for both method orders and assert the negation of `φ ⇒ (m_s1 ⊲⊳ m_s2)`. An SMT solver validates the implication. For automatic guards, apply Bansal et al.’s abstraction-refinement algorithm to the generated ADT specifications; inferred conditions are sound by the embedding theorem. Guards need not be complete because a false guard safely falls back to sequential execution. The evaluation uses 30 benchmark programs; the paper says, “As we show in Sec. 8, in our 30 benchmarks, there were not any cases where either a precise commute condition or a sensible sound approximation could be used.” (Sect. 6.2, p. 17). Inference: as written the sentence says the opposite of the surrounding argument, so it is probably a typo for “could not be used”; Fig. 2 (p. 19) does not settle this. Fig. 2 shows inferred conditions for 26 programs (Group 1), with Appendix G listing calc (120.10 s) and loop-amt (120.06 s) at the 120 s inference timeout; nine programs with manually provided conditions checked by verification (Group 2, where counter’s manual condition `true` failed verification); and four programs (crowdfund, dihedral, filesystem, ht-fizz-buzz) with manual unverified conditions (Group 3), because loops or inter-procedural calls could not be translated to logic (Sect. 8, p. 20).

Inference: in Verus, guard synthesis is more naturally an external solver phase whose result is imported as a lemma and checked by Verus. The trusted artifact is the guard proof, not the synthesizer.

## technique: enforcing scoped serializability with locks and snapshots

What it is. Scoped serializability is enforced per commute statement, inductively from inner to outer scopes (Sect. 5.4, p. 12). Pattern 0 locks from the first to the last access of a common variable. Pattern 1 applies when one fragment only reads the conflicting variables: copy each conflicting variable v to a new variable before the commute block and make that fragment read the copy, so execution behaves as if that fragment ran first. Pattern 2 uses one lock and reorders each fragment, using its data-flow graph, so that instructions touching conflicting variables sit between lock() and unlock(), followed by a snapshot of those variables (pp. 12–13). Limits. The benchmarks used these patterns by hand; for example the snapshot pattern was used on commute1 and simple, and dict needed no lock beyond the concurrent hashtable (Sect. 8, p. 21).

## techniques for the catalog

- commute guards — annotate sequential fragments with conditions permitting reorder or parallel execution
- scoped serializability — constrain nested parallel executions so their final states equal a sequential execution
- logical embedding — translate source fragments and context into ADT method specifications
- lock and snapshot patterns — enforce scoped serializability by narrowing mutual exclusion or snapshotting read-only conflicts
- SMT guard checking — prove both execution orders equivalent under a supplied condition
- abstraction-refinement synthesis — infer sound commutativity conditions from logical specifications
