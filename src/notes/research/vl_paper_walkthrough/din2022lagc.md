# LAGC Semantics of Concurrent Programming Languages
(authored by agents unless marked 🧑)
Tag: `din2022lagc`, [paper](https://doi.org/10.48550/arxiv.2202.12195)

## what the paper proves or measures

LAGC (“locally abstract, globally concrete”) is a modular trace semantics for concurrent imperative languages. Local rules evaluate one construct in a symbolic state, while global composition instantiates symbols and enforces scheduling and communication constraints. The abstract states: “Our semantics separates local evaluation of expressions and statements performed in an abstract, symbolic environment from their composition into global computations, at which point they are concretised.” (Abstract, p. 1). The paper develops a WHILE core, a sound dynamic-logic calculus, shared-variable parallelism, atomic blocks, local memory, procedures, multiprocessors, messages, futures, and case studies for ProMeLa and ABS.

The three-phase recipe is explicit: “1. Declare local evaluation rules for each syntax construct of the target language. 2. Declare composition rules that combine local evaluation and process creation into global traces. Scheduling is expressed declaratively as well-formedness constraints over traces. 3. Define the generation of all global traces with the help of the composition rules from a suitable initial configuration.” (Section 1, p. 1). This is a semantic framework, not an empirical verifier benchmark; its evidence is definitions, soundness propositions/theorems, examples, and instantiated language models.

Inference: VL can use LAGC as a specification architecture for concurrent Rust, but Verus does not implement this semantics. A Verus proof would need explicit ghost state for symbolic inputs, events, task queues, and well-formedness, with executable Rust contracts proved against that model.

## technique 1: local symbolic evaluation and global concretisation

what it is: a symbolic state maps variables to values or starred expressions. A starred value is an unknown parameter; local evaluation can therefore run without knowing the caller or message context. A concretisation mapping assigns values to all symbolic variables and substitutes them through states, path conditions, and events. Proposition 1 states that concretisation produces a concrete, well-formed trace (Section 2.4, p. 6).

when to use it: use this separation when a component’s local behavior is reusable across contexts, especially for input, procedure parameters, receives, and spawned tasks. It avoids evaluating a method separately for every call value.

how to do it:
1. Represent unknown state values with `*` and keep symbolic expressions simplified (Definitions 1–6, pp. 2–4).
2. Evaluate each local statement against the symbolic state, producing a finite conditioned trace and a continuation (Section 2.5, p. 7).
3. At composition time, choose a mapping `ρ` for the symbols in the trace (Definitions 13–16, pp. 6–7).
4. Require the instantiated path condition to be consistent and the extended trace to be well formed.
5. Chop the concretised trace onto the existing global trace (composition rules (13), (23), and (37), pp. 8, 16, and 23).

Verus form (Inference): represent symbolic inputs as ghost/spec values and make a function contract quantify over them with `requires`; prove the concrete implementation’s `ensures` for every supplied value. For a message receive, a proof `fn` can take the received value and establish the post-state relation. Verus has no general symbolic-trace evaluator, so the mapping and substitution must be modeled as executable or ghost data and proved correct.

evidence and limits: Proposition 2 proves that local WHILE evaluation from a concrete, fully initialized state yields exactly one trace with a consistent path condition (Section 3.1, p. 8). Symbolic values are needed when that premise fails; the input rule introduces a fresh `Y` and assigns it to `x` (Section 5.4, p. 16). The approach assumes well-formed symbolic states and a complete mapping at composition; it does not itself solve the underlying first-order constraints.

## technique 2: continuation traces and semantic chop

what it is: local rules stop after a finite prefix and append a continuation marker `K(s′)`. Semantic chop joins a finite first trace to a second trace when the latter’s initial state extends the former’s final state, merging path conditions. This avoids putting recursive evaluation of later statements inside each construct’s rule.

when to use it: use continuations to make one independent rule per syntax construct and to expose scheduling points for parallel execution. Use chop to compose prefixes without requiring states to be textually identical.

how to do it:
1. Define a continuation marker for the remaining code (Definition 17, p. 7).
2. For assignment, emit the old state and an updated state, followed by `K( )`; for conditionals, emit two path-conditioned traces (rules (7)–(8), p. 8).
3. For sequencing, append the second statement to the first statement’s continuation (rule (10), p. 8).
4. At global composition, evaluate the continuation in the final state and apply semantic chop (rule (13), p. 8).
5. Repeat to a maximal finite or infinite trace (Definition 18, p. 9).

Verus form (Inference): a Rust proof can mirror this with a ghost sequence of states and an inductive proof `fn` for each command; each command’s `ensures` states how it extends the sequence. Loop `invariant` clauses carry the inductive relation. This is a modeling pattern, not a Verus runtime continuation.

evidence: Example 12 derives the trace of `x := 1; y := x + 1`, ending with `y = 2` through two applications of the composition rule (Section 3.3, p. 9). The paper’s sound calculus relies on the same correspondence between local rules and composed traces.

limits: chop is undefined for an empty or infinite first trace and when the second initial state cannot extend the first final state (Definition 10, p. 5). The framework therefore needs explicit treatment of nontermination and state-domain initialization.

## technique 3: declarative event well-formedness for scheduling and communication

what it is: events are inserted between identical states, optionally introducing fresh symbols. A well-formedness predicate over the concrete trace constrains event order. Scheduling is therefore a property of traces rather than a fixed local evaluator. The paper says: “Events turn out to be a flexible and intuitive mechanism, which can be used to express a range of dependencies between processes beyond synchronous communication (for example, object generation).” (Section 2, p. 2).

when to use it: use events for input, calls, process creation, sends, receives, and any synchronization point whose legality depends on global history.

how to do it:
1. Define an event descriptor and insert it with the state before and after it (Definitions 7 and event-trace construction, pp. 4–5).
2. Introduce a symbolic value when the event carries an unknown input, receive, or spawn result (rules (22), (35), and (36), pp. 16 and 22).
3. Define a concrete-trace predicate that counts or orders events; for calls, an invocation reaction is allowed only after a matching invocation (Definition 23, p. 18).
4. Add the predicate conjunctively to every global composition rule.
5. Generate only traces satisfying the predicate.

Verus form (Inference): represent events as a ghost enum and the trace as a ghost sequence. Prove each Rust operation appends the required event and preserve a `wf` predicate in a proof `fn`. The event log can be erased from executable code only after the proof establishes that the logged sequence corresponds to actual operations.

evidence and limits: well-formedness is inductive and decidable for the event-counting predicates used in the paper (Section 5.5, p. 18). The authors note that causal ordering is harder because the basic event structure does not record causality; they derive a `Chain` predicate instead (Section 6.2, pp. 24–25). A richer event model would increase expressiveness but also complexity.

## technique 4: a sound dynamic-logic calculus over symbolic traces

what it is: formulas have the form `ψ → τ [s] φ`, where `τ` is a finite symbolic trace and `[s]` quantifies over terminating executions of the continuation. The calculus symbolically executes assignments, conditionals, loops, and skip, producing first-order verification conditions. Theorem 1 states that a derivable sequent is valid (Section 4.2, p. 11). The theorem is titled “Theorem 1 (Soundness).”

when to use it: use this when deriving deductive rules that must be sound for all concretisations and all terminating executions, rather than checking one concrete trace.

how to do it:
1. Initialize the symbolic state with starred values for program variables (Section 4.2, p. 11).
2. Apply the assignment rule to append the symbolic update to `τ`.
3. Split conditionals into `tt` and `ff` path conditions; unfold `while` as a conditional containing its body and recursive loop (Figure 3, p. 11).
4. Eliminate `skip` and empty programs with their identity rules.
5. Discharge the remaining first-order sequent for every concretisation mapping.

Verus form (Inference): each dynamic-logic rule corresponds to a proof `fn` whose `requires` is the antecedent and whose `ensures` is the postcondition after an abstract state transition. Use `assert` for branch path facts and `invariant` for loops. Verus can prove the resulting first-order arithmetic and sequence facts, but it does not provide the paper’s `[s]` modality.

evidence: Theorem 1’s proof is by induction on the formula and explicitly uses the local semantics/composition equations (Section 4.2, pp. 11–12). The paper warns that the calculus is incomplete until a sound calculus for residual first-order sequents is supplied (Section 4.2, p. 11).

## technique 5: model parallel interleavings and atomic blocks

what it is: parallel local evaluation branches on which side executes its next atomic statement. Global composition repeatedly chooses a continuation, generating all interleavings. `atomic(st)` recursively evaluates a loop-free block while removing continuation markers, preventing preemption inside the block (Sections 5.1–5.2, pp. 12–15).

when to use it: use interleaving when shared-memory concurrency permits arbitrary scheduling; use atomic blocks when a language or algorithm promises a non-preemptible region.

how to do it:
1. Define local parallel evaluation as the union of traces that advance the left or right branch (rule (16), p. 12).
2. Rewrite away empty branch continuations (rule (17), p. 12).
3. Let the unchanged global composition rule choose one continuation at each scheduling point.
4. For `atomic`, recursively evaluate its body and chop the internal prefixes before returning control (rule (19), p. 14).
5. Prove properties over the resulting set of traces.

Verus form (Inference): model each thread’s state and a scheduler choice in ghost state; prove an atomic operation’s contract over its complete body and preserve a shared-state invariant at scheduler boundaries. Verus’s concurrency/state-machine APIs may encode the invariant, but the paper’s arbitrary interleaving generator is not automatic.

evidence and limits: Example 13 yields three interleavings for `x := 1; y := x + 1 || x := 2` (Section 5.1, p. 12). With the first statement atomic, Example 15 reports exactly two traces and no final `y = 3` trace (Section 5.2, p. 15). The calculus rules for parallelism are sound relative to LAGC but “quickly lead to path explosion” (Section 5.1, p. 14); atomic blocks exclude loops in the presented rule because nonterminating atomic evaluation is undefined (Section 5.2, p. 14).

## technique 6: procedure calls, tasks, and message semantics

what it is: a call emits an invocation event and returns immediately; a composition rule later activates the method, creates a fresh parameter variable, and adds its continuation to a multiset of tasks. For multiprocessors, continuations are grouped by process identifier, and send/receive/spawn use symbolic values until global matching occurs (Sections 5.5 and 6.1, pp. 17–23).

when to use it: use this for asynchronous calls, task pools, process creation, and communication where local code cannot know the eventual argument or receiver.

how to do it:
1. Emit `invEv(m,v)` at the call site (rule (24), p. 17).
2. Permit composition to add the matching invocation-reaction event and a fresh-parameter method continuation only when the trace is well formed (rule (26), p. 17).
3. For each process, maintain a task multiset `Ω(p)` and choose one continuation for the next step (rules (37)–(38), p. 23).
4. Emit send, receive, and spawn events; bind unknown values to fresh symbols in local evaluation (rules (34)–(36), pp. 22–23).
5. Concretise and check well-formedness before extending the global trace.

Verus form (Inference): represent task queues and process IDs in ghost/spec sequences, and prove each Rust API operation’s contract against queue and event updates. A function `ensures` clause can state message payload preservation; a proof `fn` can show that a receive corresponds to a prior send. External scheduler behavior remains a modeled assumption unless verified.

evidence and limits: Definition 27 generates traces from an initial main-process spawn and rules (37)–(38) (Section 6.1, pp. 23–24). The paper’s constraints prevent duplicate message IDs, duplicate receives, and duplicate process IDs (Definition 26, p. 23). The semantics does not choose a single scheduler; it denotes all traces satisfying the selected constraints.

## technique 7: specify communication patterns as trace predicates

what it is: asynchronous, FIFO, bounded FIFO, causally ordered, and strict synchronous communication are obtained by adding predicates to the same base well-formedness relation. The paper emphasizes modularity: “Imposing such patterns in the LAGC semantics is modular in the sense that all other rules are unaffected by the enforced patterns.” (Section 6.2, p. 24).

when to use it: use this when the same local program semantics must support several channel models or when the product’s proof should make ordering assumptions explicit.

how to do it:
1. Add asynchronous well-formedness requiring every receive to have a prior matching send (Definition 28, p. 24).
2. Add FIFO ordering requiring earlier sends on a channel to have been received before a later one (Definition 29, p. 24).
3. Add a channel-capacity check for bounded FIFO (Definition 31, p. 24).
4. Define `Chain` for causal message dependencies and require chained messages to be received in order (Definitions 32–33, pp. 24–25).
5. For rendezvous communication, require the matching send immediately before the receive (Definition 34, p. 25).

Verus form (Inference): encode each channel’s queue as a ghost sequence and prove send/receive contracts preserve queue order, capacity, and causality. Inference: a state-machine invariant can express that all receives have a prior send; assertions at each operation establish the local transition. Do not treat the predicate as an executable scheduler guarantee unless the scheduler is part of the verified system.

evidence and limits: the predicates are mathematical constraints on traces, not benchmarked performance. Causal order requires a chain definition because the base events omit direct causal edges (Section 6.2, p. 24). Strict synchronous communication is intentionally strong; the authors note more liberal notions would require a global, non-inductive criterion (Section 6.2, p. 25).

## technique 8: actor isolation and future-based active objects

what it is: the paper instantiates LAGC for actors with private object memory and run-to-completion method calls, then for active objects with futures, `await`, `return`, and `get`. Actor calls are asynchronous events; each object has a task queue. Active-object tasks may suspend at guards, allowing another task to run, while a future completion event makes a returned value available. The paper states: “With active objects, there is no data-race among concurrent tasks, because each data item belongs to one single active object and there is at most a single active task for each active object.” (Section 7.3, p. 32).

when to use it: use actor isolation when shared mutable state should be confined to an owner object; use futures when asynchronous calls return values and tasks must release a processor while waiting.

how to do it:
1. parameterize local evaluation by a symbolic object identity so method code is independent of its caller (Section 7.2, pp. 28–29).
2. emit object-creation and asynchronous-invocation events, and use well-formedness to match each reaction to a prior invocation (Section 7.2, pp. 28–30).
3. for futures, parameterize evaluation by the task’s destiny future and emit invocation, completion, and completion-reaction events (Section 7.3, pp. 31–32).
4. let `await e` suspend when its guard is false or when a future is unresolved; permit a task to resume only when the guard/event is enabled (Section 7.3, pp. 31–32).
5. maintain a mapping from each object to suspended continuations plus at most one active continuation; apply the composition rules to preserve this invariant (Section 7.3, p. 32).
6. use the event-ordering predicate to prevent duplicate object creation, premature invocation reactions, and `get` before future completion (Section 7.3, pp. 32–33).

Verus form (Inference): model each actor’s owned state and task queue in a Verus state machine. Prove that methods can mutate only their owner’s state and that at most one active task exists per owner. Represent a future as a ghost record with a resolved flag and value; `ensures` on return sets it, and `get` requires the flag. Verus cannot enforce scheduler fairness or run-to-completion automatically, so those are explicit assumptions or verified scheduler contracts.

evidence and limits: Proposition 3 proves that the at-most-one-active-task property is preserved by the active-object composition rules (Section 7.3, p. 32). The actor model excludes loops inside atomic method bodies but permits unbounded recursion (Section 7.2, p. 28). Active-object `await` introduces finer-grained interleaving; future well-formedness prevents a value from being retrieved before completion (Section 7.3, p. 33).

## technique 9: guarded communication and language-specific constraints

what it is: the ProMeLa instantiation reuses LAGC events and adds guarded-command selection, blocking atomic guards, channel visibility, consumption, and channel-specific synchronous or bounded-FIFO predicates (Section 7.1, pp. 25–27). A blocked send or receive needs no special evaluator: well-formedness prevents an illegal communication order.

when to use it: use this when a language has side-effecting guards, rendezvous channels, bounded buffers, or dynamically visible local channels.

how to do it:
1. map language values to finite integer types and initialize every declared process continuation (Section 7.1, pp. 25–26).
2. represent each guarded choice as a path-conditioned branch; if several guards hold, retain every enabled choice (Section 7.1, p. 26).
3. for a guarded atomic block, re-evaluate a false guard later and execute the body atomically when it is true (rule (41), p. 27).
4. constrain channel events with visibility, single-consumption, strict-synchronous, or bounded-FIFO predicates (Section 7.1, pp. 27–28).

Verus form (Inference): represent channel buffers and visibility capabilities as ghost state and prove send/receive transitions against the selected state-machine invariant. A blocked operation should return a proved error or await a verified scheduler condition; an unconstrained `assume` would bypass the channel proof.

evidence and limits: the ProMeLa model supports globally visible channels and local channels whose identifiers must have been declared or received (Section 7.1, p. 27). The paper does not provide a separate completeness or performance measurement for this instantiation; it demonstrates that the same local rules and trace predicates can express the language’s semantics.

## trusted boundary, contradictions, and scope

The paper proves soundness of the WHILE dynamic-logic calculus relative to its trace semantics and proves local properties such as concrete-trace preservation. It does not prove the correctness of a Rust compiler, a Verus encoding, external schedulers, or hardware (Inference). The semantic framework assumes well-formed states, consistent path conditions, and that the chosen communication predicates describe the intended concurrency model. The calculus is explicitly incomplete for residual first-order obligations, and parallel proof search can suffer path explosion.

No experimental denominators, success rates, or timing numbers are reported. The evidence is formal: Proposition 1 (concretisation), Proposition 2 (concrete local evaluation), Theorem 1 (calculus soundness), and concrete trace examples. Case studies show expressiveness rather than measured coverage.

Inference: LAGC poses a high design threat to any VL concurrency feature that relies on an implicit scheduler or informal message assumptions. VL should make task, event, and channel invariants explicit and retain independent Verus proofs for implementation contracts. Rebuilding a generic trace semantics is unnecessary if Verus state-machine specifications already cover a target API; the reusable contribution is the separation of local symbolic contracts from global well-formedness constraints.

## techniques for the catalog

- local abstract/global concrete traces — evaluate constructs symbolically, then instantiate values when composing global executions
- continuation and chop composition — stop local rules at continuations and join finite prefixes by state extension
- event well-formedness — encode scheduling, calls, sends, receives, and causal constraints as predicates over traces
- sound dynamic-logic calculus — symbolically execute traces and prove sequents for all concretisations
- interleaving and atomic semantics — generate scheduler interleavings while recursively removing preemption inside atomic blocks
- task and message composition — model calls, processes, sends, receives, and spawns with event matching and symbolic payloads
- declarative channel models — obtain asynchronous, FIFO, bounded, causal, and synchronous semantics by adding trace predicates
- actor isolation and futures — preserve owner-local state, match asynchronous calls, and gate future reads on completion
- guarded language instantiation — express ProMeLa guards, channel visibility, blocking, and consumption through events and well-formedness
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
