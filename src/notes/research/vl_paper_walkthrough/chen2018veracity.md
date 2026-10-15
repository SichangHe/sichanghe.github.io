# Veracity: declarative multicore programming with commutativity
(authored by agents unless marked 🧑)
Tag: `chen2018veracity`, [paper](https://www.semanticscholar.org/paper/2d4e6cfd1040bfa8b83d3feeea4acdce0f09a7f2)

## problem and core construct

Veracity lets a programmer write sequential fragments together with conditions under which their execution may be reordered or run concurrently. The paper’s abstract states: “We argue that some difficulty of multicore programming can be meliorated through a declarative programming style in which programmers directly express the independence of fragments of sequential programs.” (Abstract, p. 1). A commute statement has the shape `commute (expr) {{ stmt1 } { stmt2 }}`. When its guard is false, execution is sequential; when true, the condition permits reordering.

## technique: three semantics and scoped serializability

What it is. The sequential semantics always executes fragments in source order. The nondeterministic semantics permits either order when the guard is true. The concurrent semantics recursively executes fragment threads, including nested commute blocks, and joins them. The required correctness condition is scoped serializability: each concurrent execution must be reorderable into a sequential execution within each commute scope.

How to use it. Define small-step configurations containing statements and state. Add the sequential reduction `commute(true){s0}{s1}` → `s0;s1`; add both orders to nondeterministic semantics. For concurrent semantics, spawn fragment configurations when a guard is true, recursively descend into nested scopes, and join when both fragments reach `skip`. Define post-state equivalence, scoped-serializable executions, and prove that valid guards imply parallel and sequential denotations are equal. The paper states, “We introduce scoped serializability to describe a sufficient condition under which the concurrent semantics is equivalent to the sequential semantics.” (Sect. 1, p. 3).

Verus form. Inference: represent configurations and states as ghost enums/structs, and state equivalence as a `spec fn`. Verus can verify a deterministic sequential interpreter and a bounded scheduler model; unbounded thread execution needs a finite trace abstraction and invariants. Use `ensures` to relate every permitted parallel final state to the sequential result.

Evidence and limits. Theorem 5.5 gives the sufficient parallelizability condition (Sect. 5.3, p. 12). The guarantee assumes every commute guard is a sufficient condition and depends on the scoped scheduling definition; ordinary serializability is insufficient for nested blocks.

## technique: embedding code into logical specifications

What it is. To verify or synthesize guards, each commute block is translated into a logical abstract data type (ADT) with one nullary method per fragment. The ADT state contains every visible local/global variable; each method’s pre/post specification summarizes its fragment.

How to do it. Capture the program context as `O.state`, define state equality over corresponding variables, and create methods `m_s1` and `m_s2`. Flatten sequential statements. Give each variable an SSA-like index and let-bind its initial value. Recursively translate assignments, conditionals (using `ite`), builtin ADT calls (instantiating their logical postconditions), nested commute blocks as sequential composition, and loops using summaries plus `havoc` and `assume`. Relate each final indexed variable to the method’s post-state. The algorithm is summarized in the paper’s sentence: “The overall shape of the translation is akin to verification condition generation, introducing indexed let-binding.” (Sect. 6.1, p. 15).

Verus form. Inference: define an AST and a pure translation to a logical state transformer; represent SSA versions as map keys and prove translation soundness by induction on statements. Use `spec fn` formulas and `proof fn` lemmas for branch and assignment cases. Loop summaries become explicit pre/post lemmas; do not assume a summary is sound without proving it.

Evidence and limits. Theorem 6.4 states embedding soundness: if the SMT implication validates a proposed guard, that guard is valid for the source commute block (Sect. 6.2, p. 17). Loop summaries may be manually strengthened; insufficient precision causes verification or inference to fail rather than silently proving an invalid guard.

## technique: SMT guard verification and abstraction-refinement synthesis

For a supplied guard φ, construct constraints for both method orders and assert the negation of `φ ⇒ (m_s1 ⊲⊳ m_s2)`. An SMT solver validates the implication. For automatic guards, apply Bansal et al.’s abstraction-refinement algorithm to the generated ADT specifications; inferred conditions are sound by the embedding theorem. Guards need not be complete because a false guard safely falls back to sequential execution. The evaluation uses 30 benchmark programs; the authors report, “there were not any cases where either a precise commute condition or a sensible sound approximation could be used.” (Sect. 6.2, p. 17), meaning every benchmark had a usable condition under their criterion, not that all conditions were exact.

Inference: in Verus, guard synthesis is more naturally an external solver phase whose result is imported as a lemma and checked by Verus. The trusted artifact is the guard proof, not the synthesizer.

## implementation, evidence, and VL implications

The prototype is an interpreter in Multicore OCaml, spawning threads when guards hold and using libcuckoo for concurrent hash tables. It compares parallel execution with a flag forcing all guards false. The paper reports 30 benchmarks and two adapted case studies, but the abstract does not provide a single aggregate speedup denominator; performance claims must therefore be read from each experiment’s table and setting. Trusted components include the semantics, embedding, SMT solver, abstraction-refinement implementation, thread runtime, and linearizability of the concurrent hash table. Inference: agent-written verified Rust is threatened where a generated guard or loop summary is unsound, and protected when each is accompanied by a Verus-checked post-state equivalence lemma. VL should reuse the embedding-plus-proof pattern rather than attempt to synthesize concurrency schedules directly.

## techniques for the catalog

- commute guards — annotate sequential fragments with conditions permitting reorder or parallel execution
- scoped serializability — constrain nested parallel executions so their final states equal a sequential execution
- logical embedding — translate source fragments and context into ADT method specifications
- SMT guard checking — prove both execution orders equivalent under a supplied condition
- abstraction-refinement synthesis — infer sound commutativity conditions from logical specifications

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
