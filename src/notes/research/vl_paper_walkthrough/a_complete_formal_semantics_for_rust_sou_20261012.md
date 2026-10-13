# A Complete, Formal Semantics for Rust Source Code
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

source: Daniel Drodt, “A Complete, Formal Semantics for Rust Source Code,” arXiv:2610.06003v1, 5 October 2026; 67-page ACM-format manuscript and its appendices. The study uses the full extracted text and PDF. A search of the walkthrough notes found no earlier study of this title.

## purpose and result

The paper supplies a source-near operational semantics for most safe Rust high-level intermediate representation (HIR), then extends the same machinery to asynchronous Rust and Tokio’s current-thread scheduler. Its central engineering choice is the locally abstract, globally concrete (LAGC) trace framework of earlier work (the paper's reference [17]), applied here to Rust. A local rule evaluates one expression without knowing the surrounding program; global rules compose those fragments into concrete executions, while a well-formedness predicate rejects impossible traces. The paper then (a) proves quiescent and Tokio fairness for the modeled current-thread runtime and (b) uses the semantics to prove soundness of core rules of the RustyDL dynamic-logic calculus.

The paper states the design target explicitly: “Ideally, such a semantics should (1) be highly flexible and compositional to accommodate future language extensions; (2) formalize Rust at the source code level (or close to it); (3) allow the formalization of asynchronous Rust code; (4) permit modeling of and reasoning about asynchronous runtimes; and (5) ease deductive verification of Rust programs.” (Section 1, p. 2.) The contribution is a semantics and metatheory, not a verified Rust implementation. It assumes input programs are well-typed safe Rust in the modeled fragment; typing, borrow checking, memory layout, unsafe code, and compiler translation are outside the model.

## technique 1: the four-layer LAGC construction

what it is

LAGC represents one execution as a hybrid trace alternating states and event markers. A program denotes the set of all well-formed traces from an initial state. The framework separates expression-local behavior from global concerns such as call stacks, task scheduling, and runtime queues. This makes a new language construct primarily a new local rule, rather than a rewrite of existing rules.

The paper gives an executable recipe: “Building an LAGC semantics consists of four steps: (1) the local evaluation, mapping expressions to (abstract) continuation traces, without knowledge of the surrounding context; (2) a well-formedness predicate, restricting the set of allowed traces and enforcing, e.g., proper ordering of events; (3) trace composition rules, defining how the local traces are stitched together to concrete traces; and (4) global program semantics, defining the initial state and allowed end states.” (Section 2, p. 3.)

when to use it

Use this decomposition when adding or verifying a language feature while preserving existing rules, especially when there are concurrent tasks or runtime scheduling choices. Keep local expression behavior independent of scheduler policy; put policy in global composition. For a sequential verifier, it supplies a precise execution relation and intermediate events. For an asynchronous verifier, it supplies a superset of possible schedules against which a concrete runtime can be compared.

how to do it

1. Choose semantic values and a state representation. This paper maps machine integers to mathematical integers, booleans to mathematical truth values, and compound values to mathematical structures.
2. Define symbolic states as partial maps from variables to either concrete values or `*` (unknown symbolic values). Define places recursively as variables, array indices, and fields.
3. Define traces as sequences of states and events, with continuation markers `K(e)` for unevaluated expressions.
4. Define a partial “chop” operation that joins two traces when the final state of the first agrees with the initial state of the second.
5. Define concretization maps from symbolic variables to concrete values, and lift concretization from states to traces.
6. Give one local evaluation function `val_sigma(e)` per expression form. It returns symbolic continuation traces.
7. Define `wf(trace)` to enforce event order, variable domains, and state-extension conditions.
8. Define transition rules over a concrete trace plus continuation stack (or task queues for async programs). Each step picks a local result, concretizes it, chops it onto the current trace, and checks `wf`.
9. Define program semantics as all finite maximal traces and limits of infinite derivations from the initial state.

Verus form (inference)

Verus does not require an operational semantics to verify ordinary functions, but this design is a useful specification layer for an agent-generated Rust subset. Represent a symbolic state as a ghost map from variable identifiers to an enum of concrete/symbolic values; represent traces as ghost `Seq` values; and define `wf`, `chop`, and concretization as `spec fn`s. A local rule can be a relation from pre-state and expression syntax to a post-state plus event sequence. Scheduler-specific rules should remain separate from expression lemmas. This is an inference: the paper proves properties of a mathematical semantics, not a Verus encoding.

evidence, assumptions, and failure modes

The paper demonstrates the decomposition across synchronous Rust (Sections 3.1–3.4), async Rust (Section 4), Tokio scheduling (Section 5), and RustyDL soundness (Section 6). The abstraction deliberately omits memory layout and type/borrow checking. Its values “map to mathematical domains,” and all programs are assumed well-typed (Section 2.1 and Section 3, pp. 3, 7). An unsafe operation, aliasing violation, or compiler lowering is not represented. A semantic rule can be locally correct while the omitted type/borrow assumptions are false in an actual program.

## technique 2: symbolic states, traces, concretization, and well-formedness

what it is

A semantic state `sigma : Var ⇀ SVal` maps variables to concrete values or `*`. A place identifies a memory location abstractly (`x`, `p[n]`, or `p.field`); updating a nested place is defined by rebuilding the containing value. A trace is `epsilon` or a sequence extension by a state or event. Events do not change state. Continuation markers mark the remaining expression. The model requires events to be surrounded by states.

A symbolic trace is made concrete with a partial map `rho` that, on each state, defines exactly that state's symbolic variables (Definition 2.6). The paper proves that concretizing a well-formed trace yields a well-formed shining (concrete) trace (Proposition 2.12, p. 6). Well-formedness enforces three useful invariants: non-symbolic variables do not become symbolic later, event parameters use only symbolic variables in the trace, and the state after an event extends the state before it. The extension condition means events can introduce variables but cannot silently mutate existing state.

when to use it

Use symbolic values while describing a function call before its arguments are known, or while defining a local rule independent of caller state. Concretize at composition time, when the caller’s concrete arguments and current state are available. Use `wf` as a semantic firewall: every global transition must preserve it, so impossible invocation/return/panic sequences cannot enter the program trace set.

how to do it

1. Build an initial symbolic state with `*` for parameters or fresh locals.
2. Emit event markers for semantically significant actions (invocation, return, panic, async create/spawn/evaluate, scheduling).
3. Surround each event with a state; update the state only through explicit local rules.
4. At composition, choose a mapping `rho` for all symbolic variables in the local fragment.
5. Apply `rho` to every state and event parameter, then use chop to merge with the existing shining trace.
6. Accept the step only if the merged trace satisfies `wf`.
7. For a final property, quantify over every finite maximal trace and over the limit trace of an infinite run.

The paper’s concrete illustration starts with a symbolic `X` and concretizes it to `3`, obtaining an event `ev0(3)` and an updated final state (Example 2.9, p. 6). This is a practical pattern for separating a reusable function summary from a caller’s concrete context.

Verus form (inference)

A Verus library can encode state snapshots as immutable ghost structs and events as an enum. `wf` can be proved as a preservation lemma over trace extension; `chop` can require an equality lemma for the shared boundary state. `old(...)` and `Seq` provide the usual pre/post snapshots, but Verus proofs must explicitly establish domain and freshness properties that the paper obtains from mathematical definitions. The event log can support audit or scheduler proofs without becoming executable state.

evidence and limits

The model’s final-state reasoning relies on determinism of the safe synchronous fragment modulo fresh names. Lemma 3.23 proves one trace modulo renaming of fresh variables and borrow IDs, and proves that all traces are either finite or all infinite. The result does not prove memory safety: it presumes type and borrow-checker guarantees. Fresh-name generation yields infinitely many syntactically different traces, so equality modulo renaming is needed before claiming determinism.

## technique 3: context-sensitive `next` and hole expressions

what it is

Rust expressions are evaluated in contexts: an expression used as an ordinary value may need a different sub-expression than the same syntax used as an assignment target. The paper introduces `HoleExp` with one hole `•`, and a recursive `next(e, M)` function returning the next sub-expression and a hole context. Filling the hole reconstructs the original expression. `M` is normally `Val`, but assignments use `AssignVal` so a place is accepted without reading its value.

The paper’s example is `a[1 + 1] = 4 / 2`: it evaluates the right side to a value first, then computes the index in the left side, and leaves `a[•]` as the hole context. The stated correctness condition is that whenever `next(e,M) = (e',he)`, filling `he` with `e'` returns `e` (Section 3.1.1, p. 8).

when to use it

Use this technique when a source language mixes value expressions and l-values/places, has overloaded operators, or has order-sensitive side effects. It prevents a generic child-evaluation rule from accidentally dereferencing an assignment target or evaluating an untaken branch.

how to do it

1. Define the expression grammar with a hole base case and require exactly one hole.
2. Define terminal cases (`Val`, variables, `continue`, loops, panic) as their own next expression.
3. For each constructor, recurse into the first not-yet-acceptable child and wrap the returned hole in the constructor.
4. For conditionals, recurse only into the condition; branches are not sub-expressions until selected.
5. For assignments, recurse into the right-hand side under `Val`, then into the left-hand side under `AssignVal`; in an index target, preserve a place base while evaluating the index.
6. Define the local lifting rule `val_sigma(e)` by evaluating one step of `e'`, then rebuilding `e` with the continuation in the hole.
7. Prove or test the reconstruction property and evaluation-order examples.

Verus form (inference)

For a Verus executable interpreter or proof-producing frontend, represent syntax as a ghost AST and `HoleExp` as an inductive ghost type. Prove a reconstruction lemma for `fill(next(e,M))`. The same AST can drive a verified symbolic executor, but Verus termination proofs require a decreasing measure for recursive `next`. This is an inference; the paper’s `next` function is mathematical and not implemented in Verus.

evidence and limits

Appendix A gives additional rules for unary operators, blocks, operators, assignments, arrays, tuples, calls, fields, and references (pp. 47–48). The model assumes normalized HIR: loops are singular loop expressions, `if` has an `else`, and every function has an explicit return expression (Section 3, p. 6). Macros are expanded. Closures are excluded from the core syntax, with a claim that they can be translated to normal functions. Any mismatch between compiler HIR and these normalizations is an unmodeled translation obligation.

## technique 4: modular local rules for Rust expressions and control flow

what it is

After `next` reduces an expression to values or assignee values, each construct receives a local rule. Integer arithmetic uses mathematical operations plus explicit bounds checks that produce `panic!()` on overflow. Traits handle overloaded operations. References carry a shared/mutable tag, place, and fresh borrow identifier. Assignments update variables, fields, arrays (with bounds checks), dereferenced mutable places, or destructure compound values into a block of assignments. Function calls emit invocation events and use a call identifier; returns emit return events; blocks, loops, `break`, `continue`, conditionals, and panic are represented with event-aware continuations.

when to use it

Use one local rule per syntax form when building a semantics that must grow without global-rule rewrites. For a verifier, this gives a direct correspondence between a proof-calculus rule and a semantic case. For agent-written Rust, the rule inventory exposes obligations that a type checker alone hides: overflow behavior, array bounds, return control flow, mutable-place updates, and trait dispatch.

how to do it

1. Start with value and variable rules: values produce no local trace; a variable produces `K(sigma(x))`.
2. Apply the `next` lifting rule until the top-level constructor has evaluated children.
3. Define primitive operations by type. For `u8` addition, return the mathematical sum if it is at most 255; otherwise return a panic continuation.
4. For `&p` and `&mut p`, return a reference to the place with a fresh borrow ID; do not read the place’s value.
5. For `*Ref_mut_p(b) = v`, update place `p`; reject immutable references by the typed-program assumption.
6. Emit `invEv(foo,i,args)` when entering a synchronous function and `retEv(v)` on return. Evaluating the waiting `?i` continuation emits `compREv(i,X)`, which passes the result back to the caller.
7. Define well-formed event rules: an invocation reaction follows its invocation, a computation reaction follows its computation, and panic terminates the trace.
8. Compose with the call stack, using `K(?i)` below a called function to ensure return control goes to the right caller.

The running factorial/array example (Listing 1, p. 7) exercises recursive calls, mutable array references, loops with `break`, boolean negation, and assignment. Example 3.15 (p. 19) shows a conditional assignment whose final state has `y = 4` and `x = 5`; Example 3.17 (p. 20) shows that after a panic event only one state may follow, so evaluation stops.

Verus form (inference)

Map each semantic case to a Verus lemma over a function’s pre/post view. Overflow checks become `requires` bounds or explicit branches returning `Result`; place updates become view-update lemmas; mutable references use `&mut` ownership and a ghost place identity. For call/return events, a ghost call-ID stack can connect summaries to callers. Trait dispatch requires per-implementation proof lemmas. These are design mappings, not claims that the paper’s rules compile as Verus code.

evidence and limits

The model covers “almost all of safe Rust,” with closures translated away, but it abstracts type checking, borrow checking, and memory layout (Section 3, p. 7). It does not cover unsafe Rust. Arrays and integer operations explicitly panic on invalid indices/overflow, but panic behavior is only an event-level terminal condition; unwinding, destructors, I/O, and allocation are absent. The deterministic claim applies only to the normalized synchronous subset and is modulo fresh names and borrow IDs (Lemma 3.23, p. 21).

## technique 5: concrete trace composition and program semantics

what it is

A synchronous configuration is a shining trace plus a stack of continuation markers. Rule 50 evaluates the top marker one local step, concretizes the resulting symbolic trace, chops it to the existing trace, and keeps the replacement continuation. Rule 51 pushes a called function body after an invocation; rule 52 pops a completed call when the caller’s `?i` continuation can consume its computation reaction. The global semantics is the set `Tr(e,sigma)` of all finite maximal traces or infinite limits.

when to use it

Use this when local rules are independently defined but the program needs a complete execution relation. The stack form is appropriate for synchronous calls and ensures that an event sequence cannot spuriously execute a function or return to the wrong caller.

how to do it

1. Initialize `sh = <sigma>` and stack `[K(e)]`.
2. Read the last state of `sh` and evaluate the stack’s top expression locally.
3. Pick a local continuation trace, concretize symbolic parameters, and require `wf(sh ** rho(tau))`.
4. Replace the top marker with the local continuation.
5. If the trace ends in an invocation, push the matching function body with fresh parameter bindings.
6. If the caller below waits on `?i` and the callee has returned, pop the callee and emit `compREv(i,v)`.
7. Stop when the last event is a panic or the top expression is a value (rule 50 no longer applies); for an infinite sequence use the trace limit.
8. Define the whole program as `Tr(main(), empty-state)`.

Verus form (inference)

Use a ghost stack of continuation summaries and prove a preservation lemma for each transition. A product verifier can use this as a reference interpreter to validate generated contracts, but executable Rust should use ordinary function contracts rather than carrying an event stack. To prove termination, add a variant; the paper intentionally permits infinite traces.

evidence and limits

Examples 3.10–3.12 (pp. 17–19) show a recursive `fac` call and return value 24. Example 3.18 (p. 20) models an infinite loop as either a singleton trace when state never changes or an infinite state sequence when `x += 1`. The paper proves determinism modulo renaming, not termination. Resource use and destructors are outside this source-level operational model.

## technique 6: maximally permissive asynchronous semantics

what it is

Async Rust is modeled with future IDs and handle IDs. Calling an async function emits `createEv`; `spawn(v)` emits `spawnEv` and creates a handle; evaluating a future body emits `evalEv`; return emits `compEv`; awaiting a local future emits `localAwEv` and pushes a nested continuation; awaiting a spawned handle emits `compREv` when the task has completed. Configurations contain one active task and a bag of suspended task stacks. Rule 69 suspends an active task at an await whose result is unavailable; rules 70–71 choose any ready spawned task or any suspended task when idle.

The resulting scheduler is deliberately permissive: “This semantics for asynchronous programs now gives meaning to programs with Rust’s async features. It provides a highly non-deterministic scheduler that is maximally permissive: Any possible scheduling of futures in a program 𝑟 is covered by the semantics and included in the set Tr(𝑟 ).” (Section 4.5, p. 27.)

when to use it

Use this semantics as a reference superset for checking a concrete runtime: a runtime’s traces should be a subset of the model’s traces. It is useful for properties that must hold under every legal interleaving, and as the base for proving scheduler-specific fairness. It is not itself a model of Tokio policy until Section 5’s composition rules are substituted.

how to do it

1. Desugar `async fn` conceptually to a function returning a `Future`; model `await` as the only suspension mechanism in the chosen abstraction.
2. On async call, allocate fresh future ID `F` and emit `createEv(foo,F,args)`.
3. On `spawn(F)`, allocate handle `H`, emit `spawnEv(F,H)`, and mark `F` as scheduled.
4. On first execution of a future, emit `evalEv(foo,F,args)` and push its body tagged with `F`.
5. On `return v`, emit `compEv(F,v)`.
6. For local await, emit `localAwEv(F)` and execute the awaited future on the same task stack.
7. For handle await, leave a continuation waiting for `compREv(H,V)`; `wf` prevents consuming it before completion.
8. When the active expression is suspended, move its stack into the bag and set the active task to `Idle`.
9. When idle, choose any scheduled task or bag entry and continue; define finite/infinite traces as in the synchronous semantics.

Verus form (inference)

Represent each async task as a ghost state machine with a phase, future ID, handle ID, and continuation summary. An `await` proof should establish that suspension preserves the task invariant and that completion supplies the awaited result. To verify all schedules, quantify over scheduler choices or prove commutativity/independence lemmas; to verify Tokio specifically, use the queue rules below. Verus’s async support and executable futures are separate implementation concerns, so this is an inferred ghost model.

evidence and limits

Listing 4 and Examples 4.2–4.9 (pp. 23–27) cover recursive local futures, spawned handles, and suspension. `wf` enforces uniqueness and ordering for create, spawn, await, evaluate, and computation events. The paper abstracts away direct `poll` calls and other suspension points such as locks (Section 4.1, p. 22 and its footnote 2), and models a concurrent but not parallel setting (Section 4, p. 21); it says this focus on `await` is a “design decision and potential limitation” (Section 4.1, p. 23). The model permits schedules no practical runtime would choose, so a property proved only under one scheduler cannot be inferred from this superset without a trace relation.

## technique 7: formalizing Tokio’s current-thread scheduler

what it is

Tokio scheduling is encoded by replacing the async bag with a configuration `(active,t,qG,q)`: active continuation stack or `Idle`, tick counter `t`, global FIFO queue `qG`, and local FIFO queue `q`. A schedule event couples each spawn to one enqueue. Rules 74–79 execute an active task, call functions, await locals, pop completed continuations, idle an empty worker, or enqueue a suspended stack. Rules 80–83 and Appendix C rules 89–90 choose the next task: at a tick divisible by `IG`, prefer the global queue; if the local queue is empty, use global; otherwise use local. Every queue operation is specified by axioms (Appendix B).

when to use it

Use a queue-and-tick state when a runtime’s policy—not merely legal async behavior—matters. The explicit configuration allows proofs of determinism, fairness, and trace inclusion. For another runtime, retain Section 4 local rules and replace only composition and scheduler state.

how to do it

1. Add `schedEv(foo,F)` after every `spawnEv(F,H)` and enqueue `(foo,F)`.
2. Keep the active stack running until it returns, invokes a local future, or reaches an unavailable handle await.
3. On suspension, append the stack to the local queue.
4. On `Idle`, increment `t` and choose from `qG` when `t mod IG = 0` or `q` is empty; otherwise pop `q`.
5. Start a task marker by evaluating the corresponding async function and checking `wf`.
6. Define queue `pop`/enqueue axioms and task-marker cases (89–90).
7. Prove rule mutual exclusion; Proposition 5.6 says the rules form a deterministic, well-defined scheduler.

Verus form (inference)

Model queues as ghost `Seq<Task>` and ticks as `nat`; prove each scheduler branch’s guard is disjoint and its queue update preserves task uniqueness. A Verus `spec fn choose_next` plus an executable queue implementation can establish a refinement theorem. Treat `IG` as an immutable runtime parameter. This is an inferred translation; the paper does not mechanize the full scheduler in Verus.

evidence and limits

The scheduler rules are illustrated by Examples 5.1–5.5 (pp. 30–33). The paper only formalizes the current-thread runtime. It explicitly leaves Tokio’s multi-threaded runtime, stealing, and parallel workers out of scope (Section 5.6, p. 34) and ignores Tokio’s I/O timers and events (Section 5.1, p. 28). Thus queue fairness results do not transfer to the multi-thread runtime without additional rules and proof measures.

## technique 8: quiescent and Tokio fairness proofs

what it is

Weak fairness is inadequate for cooperative schedulers because a task is not continuously schedulable while another task runs. The paper uses quiescent fairness: a task that remains schedulable whenever the worker is idle is eventually selected. It assumes no locally infinite computation, so a quiescent state eventually recurs. The proof translates a Tokio configuration to the generic async configuration while dropping scheduling events and defines a well-founded scheduling-distance tuple for an enabled continuation: its queue position, idle status, unscheduled count, and a counter.

The paper then states a bounded Tokio fairness property. If the number of tasks is bounded by `Tmax` and each poll finishes within `Pmax`, there is a bound `Dmax` such that every task enabled at all later quiescent states is scheduled within `Dmax` transitions. Theorem 5.9 derives this from quiescent fairness plus the distance bound.

when to use it

Use quiescent fairness for cooperative async runtimes where active tasks may run until an await. Use the stronger bounded definition when a product needs a time/step bound, but only after proving finite task count and bounded poll time. For an agent-generated scheduler proof, a well-founded distance is a practical termination witness: each scheduler step either executes the target or decreases the distance.

how to do it

1. Define `quiescent(C)` as no active task.
2. Define `enabled(C)` from continuation markers reachable in one transition and `newConts(C,C')` as newly reachable markers.
3. Translate current-thread states to generic async states by projecting out `schedEv` and converting global/local queues to a task set.
4. Define a lexicographic distance using active/queue position, idle status, unscheduled markers, and a natural counter.
5. Show each current-thread rule either executes an enabled marker or decreases its distance in a well-founded order.
6. Conclude quiescent fairness under the no-local-infinite-computation assumption (Theorem 5.7).
7. Add `Tmax` and `Pmax`; convert the finite queue/task distance to a bound `Dmax` and conclude Tokio fairness (Theorem 5.9).

Verus form (inference)

Encode the distance tuple as a ghost `nat` or lexicographic tuple and use a `decreases` clause in a scheduler proof lemma. Prove task-count and per-poll bounds separately; then prove a bounded-selection lemma. Verus can check arithmetic and sequence-length decreases, but obtaining `Pmax` for arbitrary Rust futures requires a cost model and nontermination assumptions not supplied by this paper.

evidence and limits

Theorem 5.7 (p. 33) proves quiescent fairness for programs with no locally infinite computations. Definition 5.8 and Theorem 5.9 (pp. 33–34) add task and poll bounds. The theorem’s `Dmax` is existential and derived from proof measures; no numeric bound is evaluated for a concrete Tokio version or workload. Cooperative tasks that never await violate the assumption; unbounded spawning, unbounded poll cost, multi-thread stealing, and I/O are not covered.

## technique 9: RustyDL dynamic logic and semantic soundness

what it is

RustyDL extends first-order dynamic logic with Rust program fragments in diamond and box modalities. Updates describe variable assignments, mutable-reference writes, skip, sequential/parallel composition, and nested updates. A Kripke structure has a domain, interpretations, an infinite set of states, and a partial program transition function `rho`. The paper defines `rho` from LAGC traces: a normally terminating trace determines the final state; panic and nontermination are undefined transitions.

The calculus uses symbolic-execution rules that replace an active source expression with an update and simpler program. For example, `copy` turns `x = se` into `{x := se}` followed by `()`, and `ifElseSplit` branches on a side-effect-free condition. Soundness is proved by showing that the two program fragments generate trace sets related by a finite prefix/suffix relation. Lemma 6.11 transfers validity across that relation; Theorem 6.12 proves `copy`, and Theorem 6.13 states that the RustyDL calculus is sound.

when to use it

Use this pattern when a source-level deductive verifier has a symbolic-execution calculus and needs a semantic soundness argument. Define the source transition relation from a formal operational semantics, then prove each calculus rule by matching the rule’s transformed program to the original trace suffix. The proof avoids re-proving arbitrary final formulas; it only proves trace correspondence and uses the logic’s modality semantics.

how to do it

1. Define dynamic-logic terms/formulas, modalities, and updates.
2. Define a Kripke structure and a correspondence relation between logic states and LAGC states; account for borrow IDs being invisible on the logic side.
3. Define program transition from a normal terminating LAGC trace, excluding panic.
4. Define update evaluation, including mutable-place updates and parallel updates.
5. Define a suffix relation: `T1` is a suffix set of `T2` when all traces in `T2` share a finite prefix before a trace in `T1`.
6. For each calculus rule, identify the active source expression and show its local LAGC rule produces exactly the update/simplified-program prefix.
7. Apply the suffix lemma to transfer modality validity from the premise to the conclusion.
8. Handle loops with an invariant, an anonymizing update for variables written/mutated by the body, and loop-scope events for break/continue.

The paper’s `copy` proof explicitly splits `se` into a value or variable. For a value, the source trace updates `x` and leaves `()`. For a variable, one extra local evaluation reads its value before the same update. In Appendix G, `borrowMut` maps `&mut y` to a mutable-reference update, `mutate` maps `*x = se` to a place update, and `loopScopeInvBox` proves invariant preservation by induction over iterations (pp. 62–66).

Verus form (inference)

Verus contracts can play the role of update formulas and post-state predicates, while a ghost transition relation supplies the trace semantics. A source-level proof-producing translator could emit a Verus lemma per calculus rule, with `ensures` expressing suffix-state correspondence. Mutable-reference updates map naturally to `&mut` postconditions but require explicit framing for unaffected fields. Dynamic-logic modality semantics and Kripke structures are an inferred adaptation; the paper itself uses mathematical definitions and KeY implementation context.

evidence and limits

The paper proves core rules and says remaining rules are straightforward but time-consuming; the complete calculus theorem is stated with “considerable confidence,” while mechanization is future work. The semantics is sequential in Section 6; concurrent dynamic logic is left aside. It relies on deterministic safe Rust traces, excludes panic from normal transition, and treats borrow IDs as an abstraction. A Verus product should not treat Theorem 6.13 as a mechanized kernel proof: the paper’s proofs are presented on paper, with Section 2 largely mechanized in Lean and Section 3 in progress (Section 8.1, p. 43).

## what is proved, measured, and trusted

proved

- LAGC definitions generate well-formed concrete traces; concretization preserves well-formedness (Proposition 2.12)
- the normalized synchronous fragment is deterministic modulo fresh variable and borrow-ID renaming, and is uniformly finite or infinite (Lemma 3.23)
- async composition covers all schedules allowed by the abstract task rules
- Tokio current-thread rules are mutually exclusive and deterministic (Proposition 5.6)
- current-thread scheduling is quiescent fair under no locally infinite computations (Theorem 5.7)
- bounded-task/bounded-poll assumptions imply the stated Tokio fairness property (Theorem 5.9)
- core RustyDL rules, including `copy`, reference and mutation rules, and loop rules, are sound; Theorem 6.13 states RustyDL calculus soundness

measured or demonstrated

The evidence is formal derivations and worked traces, not a benchmark. Examples cover factorial, mutable arrays, async recursion, spawned futures, queue decisions, and symbolic execution. No success denominator, runtime measurement, or tested Tokio version is reported. Lean mechanization covers much of Section 2; Section 3 was in progress, and the full semantics/Tokio/DL proofs were future work (Section 8.1, p. 43).

trusted or assumed

- the input is well-typed safe Rust in the normalized HIR subset
- Rust’s type and borrow-checker guarantees are assumed, not proved
- the mathematical definitions, proof arguments, and any Lean/KeY/SMT implementation are trusted according to their own foundations
- closures can be translated to ordinary functions; direct poll, locks, I/O, destructors, allocation, unsafe code, and compiler HIR-to-MIR translation are omitted
- fairness requires no locally infinite computation and, for Tokio’s bounded form, finite `Tmax` and `Pmax`

## contradictions, omissions, and prior work

The paper calls the semantics “complete” in the title but explicitly limits it to most safe Rust HIR, omits unsafe code, type/borrow checking, memory layout, I/O, and multi-thread Tokio. “Complete” therefore means complete for the declared source-level subset and applications, not complete Rust language coverage. The abstract says the semantics models “Rust’s most popular async runtime, Tokio,” while Section 5.6 formalizes only the current-thread runtime and leaves the multi-thread runtime for future work. The paper’s fairness theorem is qualitative/existential; it supplies no concrete `Dmax`, `Tmax`, or `Pmax` measurements.

The related-work table (Section 7.1, pp. 40–41) says RustBelt, MiniRust, LLBC, and Featherweight Rust target MIR/source subsets with varying ownership, borrow checking, unsafe, and async support. This paper’s distinguishing choice is high-level HIR plus async and current-thread scheduling, while leaving borrow checking aside. VL should not redo a source-level LAGC formulation, the generic queue axioms, or the existing RustyDL trace-suffix proof pattern. It would need new work for Verus-native encoding, borrow/ownership proofs, unsafe code, compiler refinement, and Tokio multi-thread fairness.

## threat to agent-written verified Rust (inference)

The threat is high for claims about async scheduling, fairness, and source-level control flow. A verifier that checks only sequential postconditions can miss suspension, task starvation, or panic/overflow paths that this semantics makes explicit. The threat is moderate for ordinary safe synchronous functions because Verus already reasons about ownership and postconditions, but generated proofs still need explicit bounds, branch, loop, and mutable-place obligations. The threat is low for code that is neither async nor runtime-facing and whose contracts do not depend on scheduler behavior.

A practical VL response is to retain independent Verus checking, add generated ghost event/state summaries for async APIs, require explicit assumptions for no-local-infinite-computation and bounded polling, and use a scheduler model when proving fairness. Treat source-to-MIR translation, borrow-checker soundness, unsafe blocks, and runtime implementation as separate trusted boundaries. These product recommendations are inferences from the paper’s omissions and assumptions.

## techniques for the catalog

- four-layer LAGC construction — separate local evaluation, trace well-formedness, global trace composition, and initial/final program semantics
- symbolic trace concretization — use symbolic states and events locally, then concretize and chop them into shining traces under a well-formedness predicate
- context-sensitive `next` with holes — compute the next sub-expression under value/place context and rebuild the enclosing expression through a single hole
- modular Rust expression rules — model arithmetic overflow, references, assignments, calls, returns, loops, and panic as independent local rules with explicit events
- continuation-stack composition — compose local traces with call-stack rules and define finite maximal or infinite-limit program traces
- maximally permissive async semantics — represent futures, handles, await suspension, and arbitrary task selection as event-constrained task-stack transitions
- queue-and-tick Tokio model — add schedule events, local/global queues, ticks, and mutually exclusive composition rules for current-thread Tokio
- quiescent fairness by distance — prove that an enabled task executes or decreases a well-founded scheduling-distance measure at quiescent states
- bounded Tokio fairness — derive a finite scheduling bound from task-count and poll-time bounds
- trace-suffix soundness for dynamic logic — prove symbolic-execution calculus rules by showing transformed programs’ traces share a finite prefix and suffix
- loop-scope invariant proof — encode break/continue with a loop-scope flag and use anonymizing updates plus induction to preserve invariants

Audited 2026-10-12 against the paper: checked the quoted passages, theorem, lemma, example and rule numbers, the next-function, composition, async, Tokio, fairness-distance and RustyDL descriptions, and the Verus forms (all marked as inference; none is Verus code). Corrected: page of Proposition 2.12 and Example 2.9 (p. 6, not p. 5); page of Lemma 3.23 (p. 21, not p. 20); page of the almost-all-of-safe-Rust statement (p. 7); the page for the well-typed assumption (p. 7); the concretization map description (Definition 2.6 requires dom(rho) intersect dom(sigma) equal to symb(sigma)); the sync call-return event step (rule 36 emits only compREv); an invented stop condition (empty stack) in the composition recipe; unsupported cancellation and wakeups in the async omissions, and the I/O page; LAGC now attributed to earlier work [17]. Not checked: appendix proofs (Appendices D to G) line by line, and the related-work table cell values.
