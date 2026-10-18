# Towards Trace-based Deductive Verification (Tech Report)
(authored by agents unless marked 🧑)
Tag: `bubel2022trace`, [paper](http://arxiv.org/abs/2211.09487v2)
## what the paper establishes

The paper replaces ordinary pre/postcondition contracts with trace contracts that can describe events and intermediate states while remaining modular for recursive procedures. Its motivation is that “The fundamental limitation of pre-/postcondition contracts … is the inability to specify events happening during execution of a procedure.” (Section 1, p. 1). The proposed logic uses event markers, semantic trace chop, and least fixed points; a symbolic-execution sequent calculus proves that a recursive program's traces satisfy a contract.

The contributions are a trace specification language, a symbolic-execution calculus with structural induction and trace abstraction, and a soundness proof relative to local trace semantics (Section 1, p. 2). The formal language is intentionally restricted to sequential procedures whose bodies write only locals; the authors say side effects and aliasing are orthogonal and omitted to simplify the technical development (Section 2, p. 3).

## technique 1: local trace semantics with events and semantic chop

What it is: A trace is a sequence of states and event markers. Calls emit `callEv` and `pushEv`, returns emit `retEv` and `popEv`; events do not change state. Sequential composition joins traces at a shared state through semantic chop `∗∗`, which rejects incompatible endpoints.

How to apply it (Section 2, pp. 3–6):

1. Model program states as partial variable maps and use fresh variables for procedure-local declarations.
2. Define event markers for calls, returns, and context changes. Use a call identifier to associate each return with its call.
3. Evaluate each statement locally to a finite small-step trace plus a continuation marker `K(s)` for the remaining code.
4. Compose traces by semantic chop, requiring the final state of the first trace to equal the initial state of the next.
5. On a call, emit the call event, then (Call rule) push a context and inline the callee body with the argument substituted, ahead of the caller's continuation `x = res_id`. A `return e` emits the return event; the Return rule then assigns the returned value to the result variable `res_id` of the current context and emits the pop event, which switches back to the caller's context.
6. Define a program trace as the maximal sequence of composition steps for terminating programs. Restrict specifications to adequate traces whose call/return context switches and fresh identifiers are consistent.

The paper defines semantic chop as follows: “When σ 6= σ ′ the result is undefined.” (Definition 5, Section 2, p. 4). This endpoint condition makes sequential trace composition reflect state passing rather than mere list concatenation.

Verus form: Inference: represent a trace and event sequence as ghost data, and state a `spec fn` predicate for valid event/state transitions. Executable Rust functions can maintain concrete state; proof functions/lemmas can show that each call and return appends the required event. Use `requires` and `ensures` for endpoint relations and loop `invariant` clauses for trace prefixes. Inference: Verus does not provide the paper's trace semantics or semantic chop, so a library or external generator must define them.

Evidence and limits: Example 3 applies the progress and call rules to `x = m(1)` for the first two steps only (Section 2, p. 6); Example 4 and Fig. 3 then show the full semantics of `x = m(1)` with intermediate states σ1 to σ6, fresh local variables and context switches (Section 2, pp. 6–7). The semantics is defined only for terminating programs (Definition 9, p. 6), and side effects/aliasing are omitted from the formal language.

## technique 2: fixed-point trace contracts with event abstraction

What it is: Contracts are formulas over finite traces, built from state predicates, events, conjunction/disjunction, concatenation, semantic chop, and positive least fixed-point recursion. Events expose only the interface behavior needed by a contract; internal state changes can remain abstract.

Procedure (Section 3, pp. 6–10):

1. Write a state predicate `P` as `⌈P⌉`, an event formula such as `startEv(m,e,i)` or `finishEv(m,e,i)`, and combine formulas with `·` or `∗∗`.
2. Use a recursion variable `X(t)` and a least fixed point `(µX(y).Φ)(t)` for cyclic call structure. The paper considers the syntax fragment without negation, “which guarantees that fixed-point formulas indeed denote fixed points of the corresponding sematic transformers”, and uses least fixed-point recursion only (Section 3, p. 6).
3. Define a no-event pattern `Ψm = µX.(NoEv(m) ∨ NoEv(m)·X)` when an interval must contain no event involving procedure m.
4. For a recursive procedure, give a base case for nonrecursive execution and an inductive case containing a recursive `X` call. The pattern `Hm` relates precondition, start event, recursive call, finish event, and return state.
5. Add state predicates after an internal call when the contract must expose an intermediate result, such as `res#(i)=n−1`; otherwise the contract remains independent of implementation details.

The paper states the abstraction goal directly: “Trace formulas (by design) completely abstract away from a specified program, to which they are only connected via events.” (Section 3.3, p. 10). Its running contract (Example 6, p. 9) is for the procedure of Example 1, which returns its argument `k` via `k` recursive calls; it uses `n=0` as the base case and `n>0` with a recursive call at `n−1` as the inductive case.

Verus form:

Evidence and limits: The logic can express procedure scope, recursive calls, and intermediate states, but only finite traces are considered and the paper's current contract patterns assume one formal parameter in their displayed template. No empirical benchmark is reported; evidence is formal definitions and examples.

## technique 3: symbolic execution as a sequent calculus

What it is: The calculus reduces a program to explicit state and event updates preceding the remaining code. A judgment `U s : Φ` means that executing the residual statement s after updates U yields a trace satisfying Φ. A sequent `Γ ⊢ U s : Φ` carries a set Γ of assertions (first-order predicates or judgments) and is reduced by symbolic rules for assignment, conditionals, scopes, returns, variable declarations, prestate predicates, and fixed-point unfolding.

How to apply it (Section 4.1–4.2, pp. 10–13):

1. Represent assignments as updates `{v := e}` and event emissions as `{Ev(e)}`. Apply updates by syntactic substitution from inner to outer.
2. Start with a sequent `Γ ⊢ U s : Φ`, where Γ contains state assumptions and Φ is the target trace formula.
3. Apply `Assign` to replace an assignment with an update, `Scope` to enter a block, `Cond` to split on `e` and `!e`, and `Return` to append a matching finish event and result assignment.
4. Use `Prestate` to establish a state predicate before continuing and `Unfold` to replace a fixed-point formula with its body instantiated at the current arguments.
5. Close the remaining first-order and update-simplification obligations. The paper omits the standard first-order sequent rules for space and gives some update simplification rules in Appendix B (Example 15).

The semantic definition deliberately treats nontermination conservatively: “A judgment U s : Φ is true in σ … when [[U s]]hσi is undefined or [[U s]]hσi ∈ [[Φ]].” (Definition 13, Section 4.2, p. 12). Inference: a nonterminating residual program therefore does not falsify a judgment, which matches the paper's remark that the procedure-contract approach "yields partial correctness" (Section 4.3, p. 13).

Verus form: Inference: represent U as a ghost list of updates and prove each symbolic-execution rule as a lemma transforming a pre-state predicate into a post-state predicate. Executable Rust statements remain ordinary code; proof functions establish the corresponding ghost update. Use `requires`/`ensures` and arithmetic lemmas rather than inventing unsupported Verus syntax. Inference: condition splitting maps to separate proof branches, and `invariant` clauses are used for actual loops rather than as calls.

Evidence: Example 10 symbolically executes a conditional recursive body under `k>0`, applies assignment twice, and appends a finish event (Section 4.2, pp. 12–13). The paper says soundness of the calculus is a "direct consequence of the local soundness of each rule" (Theorem 1, p. 15).

## technique 4: modular recursive contracts and trace abstraction

What it is: A procedure contract is proved once by symbolically executing its body while assuming the contract at recursive calls. A trace-abstraction rule then replaces a recursive call in a caller with the callee's trace formula, its result function, and a precondition proof.

Procedure (Sections 4.3–4.4, pp. 13–15):

1. Define `Cm = ∀n,i.(pre_m(n) → m(n):Φm(n,i) ∗∗ ⌈res_i=fm(n)⌉)`.
2. Apply `ProcedureContract` to inline a fresh call context and symbolically execute the procedure body under `Cm` as an induction hypothesis.
3. At a recursive call, reduce the caller to updates before the call, the callee trace formula, and updates after it.
4. Apply `TrAbs` using three premises: the prefix conforms to its trace formula, the callee precondition holds, and the post-call result assignment plus suffix conforms to the remaining formula.
5. When the program has several procedures, the assumption should be the conjunction of the contracts Cm of all procedures of the program (Section 4.3, p. 13).

The paper motivates modularity with ordinary contracts: “The contract-based approach works for recursive procedures [19,37]. It requires an induction principle [5,26]” (Section 1, p. 1). In the calculus, `ProcedureContract` carries the induction (assuming `Cm` for recursive calls), and `TrAbs` uses `Cm` at the call site while keeping the events around the call in the trace formula.

Verus form: Inference: write each Rust procedure's contract as `requires`/`ensures` plus a ghost trace postcondition, then prove recursive calls using a lemma with a decreasing argument. At a call site, prove the callee `requires`, invoke its verified `ensures`, and establish the caller's suffix invariant. Verus's recursive termination measure supplies the induction well-foundedness; trace abstraction itself remains a ghost proof pattern.

Evidence and limits: Example 12 decomposes the recursive `m(n−1)` call into three sequents; the paper says the first is provable with `Prestate` and a simplification rule, the second is trivial, and the third needs simplification rules from Appendix B (Section 4.4, pp. 14–15). Only the rules are sketched there, not a complete derivation. The authors explicitly omit loop rules: “For space reasons, we do not provide rules for dealing with loops.” (Section 4.4, p. 15). They say adapting contract rules to loops is future work,

## what is proved, measured, and trusted

Theorem 1 states that the presented sequent calculus is sound: each rule preserves validity, and therefore derivable statements are valid (Section 4.5, p. 15). The appendix proves trace adequacy (Lemma 2, Theorem 2) and gives soundness arguments only “for selected rules”: Assign, Cond, Unfold and TrAbs are argued, while ProcedureContract is only sketched by reference to the approach of [37] (Appendix A.2, pp. 20–23). Soundness of Prestate, Scope, Return and VarDecl is not shown in the paper text. No runtime or benchmark measurements are reported; evidence consists of formal definitions, examples, and the theorem. Inference: trusted assumptions include the local operational semantics, first-order predicate reasoning, and the restriction to side-effect-free procedures; program semantics is defined only for terminating programs (Definition 9, p. 6), and judgments are vacuously true when the program trace is undefined (Definition 13).

## techniques for the catalog

- local event trace semantics — model calls, returns, state updates, and context switches as adequate traces joined by state-matching chop
- least-fixed-point trace contracts — specify recursive procedure behavior and intermediate events with positive µ-calculus formulas
- symbolic update calculus — reduce code to substitutions and event updates, splitting paths and unfolding contracts with sequent rules
- recursive trace abstraction — prove procedure contracts by induction and replace recursive calls with their verified trace summaries
- event-level abstraction — expose only selected interface events while keeping implementation states hidden unless a contract names them
