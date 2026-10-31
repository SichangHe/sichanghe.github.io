# Gradually Verifying Unfolding Expressions & Pure Functions
(authored by agents unless marked 🧑)
Tag: `torek2026gradually`, [paper](https://doi.org/10.48550/arxiv.2607.15383)
## scope and result

This paper formalizes two implicit-dynamic-frame constructs used by Viper and its front ends: an unfolding expression that temporarily exposes a predicate's owned fields, and a heap-dependent pure function usable in specifications. The abstract states: “In this paper, we present the formal semantics for unfolding expressions and pure functions for a static verifier using symbolic execution, extend it for a gradual verifier, and provide a proof of soundness.” (§abstract, p.1) The constructs matter because “unfolding expressions and pure functions are used repeatedly throughout the verified packages of the Go standard library,” as well as VerifiedSCION and verified protocol implementations (§1, p.1).

Inference: the paper supplies semantic and soundness machinery, not an invariant-synthesis algorithm or a benchmark of proof completion. Its evidence is a formal system and progress/preservation proof for the modeled verifier.

The setting uses implicit dynamic frames (IDF), where ownership and heap facts are separate. An accessibility assertion such as `acc(x.f)` grants access, while a predicate packages permissions and recursive facts. The paper distinguishes isorecursive predicates, which require explicit fold/unfold operations, from equirecursive ones. (§2.1, pp.3–4)

## technique 1: unfolding expressions for modular ownership

what it is. The construct has the form `unfolding p(e) in e′`: evaluate e′ while temporarily replacing the predicate instance with the permissions and facts in its body, then restore the predicate. The paper defines it as “a type of expression that temporarily unfolds a predicate instance to gain ownership of additional fields during evaluation of a heap-dependent expression.” (§1, p.1)

how to apply it.

1. Define a recursive predicate that owns the fields and states the structural property. The list example defines `sortedList(x)` with `acc(x->data)`, `acc(x->next)`, a recursive `sortedList(x->next)`, and a comparison inside a nested unfolding. (Figure 2, p.4)
2. Require the predicate at the caller boundary, for example `requires pos(x)`. (Figure 3, p.5)
3. Write `unfolding pos(x) in (x.val < 256)` at the expression that needs the hidden field. (Figure 3, p.5)
4. In symbolic execution, evaluate the predicate arguments first; look up `x` in the symbolic store without changing the state. (Figure 3, pp.5–6)
5. Consume the predicate instance to obtain its body permissions, evaluate the inner expression, then produce/fold the predicate back. (§2.3, pp.4–6)
6. Track a visited set of predicates. If a recursive instance is already visited, stop symbolic unfolding and use the implicit rule; this prevents unbounded recursion. (§2.3, pp.5–6)

The symbolic state is a tuple containing “the precise heap H,” “the symbolic store γ,” “the path condition g,” and “the visited set V.” (§2.2, p.4) The verifier has four operations: symbolic expression evaluation, producing a formula into the heap, consuming a formula, and symbolic statement execution. (§2.2, p.4)

Verus form. Inference: the closest Verus encoding is a ghost view (`spec fn`) plus ownership carried by `&mut` or proof-oriented wrapper types. A function can state `requires owns(x)` and expose a field relation in an `ensures`; a local `proof fn` can establish the relation needed to read a ghost projection. Verus has no `unfolding` expression with automatic fold-back. Inference: replacing it requires explicit lemmas that connect a predicate view to field values, and the executable borrow remains subject to Rust's ownership rules. Recursive shape facts should be `spec fn`s with `decreases` and helper `proof fn`s; an `invariant` clause carries the fact across loops.

where it fails or assumes. The paper's static semantics are incomplete for recursive expressions because symbolic values do not decide which recursive branch is taken. Its design cuts recursion with the visited set. (§2.3, p.6) Inference: a Verus proof similarly needs explicit fuel/reveal choices or induction lemmas; accepting a bounded unfold is not a proof that arbitrary recursive depth was handled unless the induction lemma covers it.

## technique 2: heap-dependent pure functions

what it is. A pure function is side-effect free but can read owned heap fields and has `requires` and `ensures`. The paper extends an earlier approach because “in Viper pure functions can have both preconditions and post-conditions,” so evaluation must model both the result and the postcondition. (§2.4, p.6)

how to apply it.

1. Define the function with a permission precondition, a postcondition over `result` and heap fields, and a body. The paper's `add(x,y)` requires `acc(x.val) * acc(y.val)`, returns `x.val + y.val`, and ensures `(y.val < 0) || (result >= x.val)`. (Figure 5, p.7)
2. Evaluate arguments and compute a symbolic footprint from the precondition. (§2.4, pp.7–8)
3. Consume the precondition to check permissions and non-aliasing, then produce it again to evaluate the body in a framed state. (§2.4, p.8)
4. Reset produced field chunks to the original symbolic values because producing accessibility initializes fresh values. (§2.4, p.8)
5. Evaluate the body once, add the function name to the visited set, and create a fresh symbolic result linked to the body value by the path condition. (§2.4, pp.8–9)
6. Axiomatize the postcondition by substituting the fresh result and snapshot field values into the postcondition expression. (§2.4, p.8)
7. For recursive calls, use an implicit rule that does not evaluate the body, but still checks the precondition and axiomatizes the postcondition. (§2.4, p.9)

The paper's example yields the path condition `add(a,b,s) == a+b` together with `(a < 0) || (add(a,b,s) >= b)`. (§2.4, p.8) This records both implementation behavior and the declared postcondition.

Verus form. Inference: a Verus `spec fn` is the natural pure specification function, while an executable Rust function can expose a ghost mathematical result in `ensures`. Heap dependence should be expressed through a snapshot such as `old(x@)` for mutable arguments or an immutable view for shared data. A `proof fn` with `requires` ownership and `ensures` the function relation can stand in for the paper's axiomatized result. Inference: unlike the paper's symbolic evaluator, Verus does not automatically snapshot arbitrary heap footprints; the author must state the relevant views and prove frame facts. Do not mark the executable function `#[verifier::external_body]` merely to bypass this obligation, because that would trust its contract rather than verify its body.

where it fails or assumes. Recursive pure-function evaluation is theoretically incomplete under the visited-set cutoff. The paper explicitly says: “This approach is theoretically incomplete; however, we axiomatize the post-condition of the recursive application to minimize this drawback.” (§2.4, p.9) The method also assumes the body is framed by its precondition; otherwise evaluation is not well formed. (§2.4, p.6)

## technique 3: gradual verification with optimistic state

what it is. Gradual verification permits `?` in specifications and combines static reasoning with dynamic checks. The paper explains that `?` “acts as a placeholder wildcard during static verification.” (§1, p.2) The verifier tracks a precise heap and an optimistic heap containing assumptions introduced by imprecision, and emits run-time checks for those assumptions.

how to apply it.

1. Represent a state as precision marker, precise heap, optimistic heap, symbolic store, path condition, and visited set. (§3.1, pp.9–10)
2. For an unfolding expression, branch on whether the initial state and predicate body are precise. If the initial state is precise, the optimistic heap must remain empty; if the initial state is imprecise and the body precise, retain final optimistic assumptions and the predicate instance; if both are imprecise, discard assumptions attributable to the predicate body when refolding. (§3.2, pp.10–11)
3. For recursive unfolding, succeed without fully unfolding when the instance is already available; in an imprecise state, add a matching run-time check when it is unavailable; in a precise state with no instance, fail statically. (§3.2, p.11)
4. For a pure function, use the precondition to compute the footprint and generate checks; an imprecise precondition may optimistically assume access to additional fields. (§3.4, pp.16–17)
5. Define dynamic evaluation directly on concrete heaps and environments. An unfolding evaluates its inner expression; a pure function evaluates its body after evaluating arguments. (Figures 12–13, p.17)
6. Define correspondence by a valuation mapping symbolic values to concrete values, and require that dynamic heaps and permissions model the precise and optimistic symbolic heaps. (§3.5, pp.17–18)

The design is conservative: “reducing the precision of a correct specification will never cause the verifier to report a spurious error.” (§1, p.2) Inference: this property concerns the modeled verifier's acceptance behavior, not whether a partial contract captures the product requirement.

Verus form. Inference: Verus has no `?` specification wildcard or optimistic heap. A staged workflow can emulate the engineering intent by writing explicit `requires`/`ensures` for known facts, placing unresolved external behavior behind a reviewed contract, and generating executable checks for the unresolved cases. The proof artifact must label those contracts as assumptions. `Ghost` state and `spec fn` views can represent the correspondence relation; ordinary Rust tests can implement dynamic checks. What does not carry over is the paper's theorem: Verus's current constructs do not provide a gradual-precision lattice or automatic runtime-check insertion.

## soundness evidence and trusted boundary

The paper proves soundness through progress and preservation. Progress says execution continues when generated run-time checks hold; preservation says a valid dynamic state remains valid after a step. The statement is explicit: “Together, these imply that dynamic execution will only halt if a run-time check fails.” (§4, p.18) The soundness proof is built from lemmas for evaluation, framing, produce, consume, and the mutually recursive expression/formula judgments. (§4, pp.18–19)

The result applies to the formal Gradual Viper/Silicon model and, by conservativity, to the corresponding static subset. It does not prove the concrete Viper implementation, Gradual C0 compiler, C0 runtime, or any user specification.

The authors list missing features: fractional and quantified permissions, richer front-end abstractions, and mechanization of the current symbolic-execution proof. (§6, pp.20–21) They also state that recursive handling is incomplete and propose formalizing Silicon's stronger SMT-axiom strategy. (§6, p.20) Inference: agent-written verified Rust is threatened mainly where a proof relies on unmodeled aliasing, incomplete recursive unfolding, or a contract that is too weak; the paper's semantics can guide a sound ownership API, but they do not automate contract discovery.

## techniques for the catalog

- unfolding expressions — temporarily expose a recursive predicate's owned fields to evaluate a heap-dependent expression, then restore the predicate
- pure-function symbolic evaluation — snapshot a function's framed heap footprint, evaluate once, and axiomatize its result and postcondition
- gradual optimistic heaps — track precise and imprecise ownership separately and emit runtime checks for assumptions introduced by `?`
- recursive visited-set cutoff — stop recursive symbolic unfolding or pure-function evaluation at visited instances and retain sound postcondition constraints
- progress-preservation soundness — prove that matching static and dynamic states preserve validity and only halt when a generated runtime check fails
