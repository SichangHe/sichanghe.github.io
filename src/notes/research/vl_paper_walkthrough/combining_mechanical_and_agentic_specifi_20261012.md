# Combining Mechanical and Agentic Specification Inference for Move
(authored by agents unless marked 🧑)
Tag: `grieskamp2026combining`, [paper](https://arxiv.org/abs/2605.10005)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## what the paper contributes

Grieskamp, Zhang, and Kashyap present an early specification-inference tool for the Move Prover. Its central design is a division of labor: weakest-precondition (WP) analysis mechanically derives contracts that follow from bytecode, while a coding agent proposes the loop invariants and high-level properties that WP cannot derive. The Move Prover checks both streams. The paper states the goal directly: “Our goal is a methodology in which AI, mechanical deduction, and users collaborate on writing and verifying Move specifications.” (Introduction, p. 1)

The problem is practical. Developers want global invariants, conservation, and abort guarantees, but modular verification requires explicit contracts for every function. “This detail is mechanical and tedious to write, dominates the cost of using a verifier, and is a significant barrier to wider adoption.” (Introduction, p. 1) The authors connect the inference service to Claude Code through an MCP server, skills (English instructions), edit hooks, and prover commands. Their examples cover higher-order functions, loops, arithmetic, references, and global resources. The evaluation is qualitative and preliminary: they report application to canonical Move libraries, but no success-rate denominator, timing table, or comparison against pure LLM inference.

## technique 1: mechanical weakest-precondition baseline

what it is and when to use it

Run textbook WP over a reference-free, contract-instrumented representation of each function. Run this after loop invariants have been synthesized (the paper's order, Sec. V-A) to recover consequences that are determined by control flow: abort conditions, modified locations, and postconditions. The authors emphasize that “The WP analysis provides a sound, mechanical baseline for inference.” (Abstract, p. 1) The paper says the mechanical baseline narrows the LLM's search space (Sec. V-B).

how to do it

1. Compile Move references away. Shared `&T` reads become reads of the root value; mutable references become in/out parameters.
2. Inject each `requires`, `aborts_if`, `ensures`, `modifies`, and loop invariant as an `assume` or `assert` at its program point.
3. Replace calls by behavioral predicates (`requires_of`, `aborts_of`, `ensures_of`, `modifies_of`, and `result_of`) so WP can reason about a callee contract without inlining its body.
4. Cut loops at their headers: assert the invariant before and after an iteration, havoc loop-modified locations, and propagate backwards through the resulting acyclic fragment.
5. Read the resulting predicates as Move-level specifications, simplifying them before presenting them to a user.

The paper's concrete `find` example first obtains a mechanically derived postcondition saying that a successful result is the first matching index (the full `ensures` clauses are shown in Sec. II-A, p. 2). Its pipeline uses reference elimination before WP: “At the input to WP, the bytecode therefore looks like a sequence of pure assignments interleaved with assume and assert over plain values.” (Sec. III, p. 4)

Verus form (inference)

Verus has the same useful separation, but the syntax and lowering differ. A Verus implementation would express function contracts with `requires` and `ensures` (Verus has no `modifies` clause; mutation is expressed through `&mut` parameters and `old(...)`), use ghost state or snapshots for reference-dependent values, and prove loop cut points with `invariant` clauses. The Move-specific bytecode pass does not carry over: Rust references are handled by Verus's borrow checker and its SMT encoding, so one should preserve source-level references while exposing explicit old values (`old(...)`) or ghost copies where a postcondition refers to pre-state. The behavioral-predicate idea does carry over: a callee's contract can be used modularly instead of inlining it.

evidence, limits, and trust

The paper gives no aggregate pass rate. Its evidence is successful examples and the Move Prover's proof result. The prover's result is the paper's acceptance test; that the prover, bytecode transformation, WP engine, Boogie, and SMT solver are the trusted components and the agent only a proposal generator is the study's inference. WP cannot invent an inductive loop invariant, and a missing invariant can make every downstream postcondition vacuous. Raw WP output can also be verbose or contain unbounded quantifiers that trigger SMT timeouts.

## technique 2: agent synthesis of loop invariants

what it is and when to use it

Ask the coding agent to inspect loops and supply inductive facts that WP cannot derive. The paper says LLMs are good at spotting that a counter is monotone, that a sum is preserved, or that an element stays in a sorted prefix. Use this before relying on WP for a loop; in one experiment, running WP before invariant synthesis produced “vacuous specifications ... unhelpful and led the model into unfavourable chains of thought.” (Sec. V-A, p. 4)

how to do it

The `find` function starts with an index `i` and bound `n = v.length()`. The agent adds `i ≤ n`, `n = len(v)`, and, for every `j` below `i`, the predicate that `pred(v[j])` is false and does not abort. The paper shows the shape explicitly:

```move
invariant i ≤ n;
invariant n = len(v);
invariant ∀ j in 0..i: !result_of<pred>(v[j]);
invariant ∀ j in 0..i: !aborts_of<pred>(v[j]);
```

For iterative arithmetic, introduce a recursive ghost/specification helper. In `pow`, the agent adds `i ≤ exp` and `result = pow_spec(base, i)`, then defines `pow_spec` recursively with base case `exp = 0` and recursive case `base * pow_spec(base, exp - 1)` (Sec. II-B, pp. 2–3). For resource algorithms, prefer state-level invariants that the prover assumes at every call site, including each loop iteration, over fragile per-loop arguments.

Verus form (inference)

Write the same facts as Verus `while` invariants. A `find` loop would keep `i <= n`, snapshot `n`, and quantify over indices below `i`; predicates over a closure can be represented by a specification function or by a ghost relation whose purity is proved. For `pow`, define a recursive `spec fn pow_spec` and maintain `result == pow_spec(base, i)` in the loop invariant. Rust indexing and closure traits require bounds and termination measures that Move's examples omit. These are inferences because the paper does not implement Verus.

evidence, limits, and trust

For `find`, verification immediately succeeds after inference; `pow` first times out and needs the lemma of technique 4. No count of generated versus rejected invariants is reported. Invariants are agent hypotheses, so the prover's counterexamples and failed verification remain the acceptance test. Study's inference: a wrong invariant is rejected, but an over-strong assumption could hide a bug if inserted as an unchecked `assume`; therefore every generated condition should be compiled into the prover's normal assertion/invariant mechanism.

## technique 3: simplify inferred specifications

WP output is semantically valid but often unreadable. Ask the agent to discard vacuous conditions, replace unbounded quantifiers with bounded or closed forms, and add triggers to quantifiers that remain. In `find`, the agent rewrites the baseline into the compact contract `result ≤ len(v)`, all earlier elements fail the predicate, and `result < len(v) ⇒ pred(v[result])`; the authors say, “This specification is more compact than the WP baseline.” (Sec. II-A, p. 2)

Apply simplification only after loop invariants and WP facts exist, then rerun verification. The paper says the tasks operate on independent snapshots of the package and each step is transactional; that a failed rewrite can therefore be discarded is the study's inference. In Verus (inference), this means replacing solver-hostile quantified postconditions with bounded `forall` forms, sequence lemmas, or a named `spec fn`, while preserving logical equivalence and checking every rewrite with Verus. Simplification is not a license to weaken a property: the skill prohibits dropping abort or postconditions merely to obtain a successful run.

## technique 4: resolve timeouts with a fixed escalation

For nonlinear arithmetic or large quantified formulas, run full-scope verification and classify a timeout as a proof-engineering problem. Escalate in this order: strengthen state-level invariants; add specification helper functions; add lemmas; finally use explicit proof scripts. In `pow`, the agent adds a monotonicity lemma over unbounded `num` values and invokes it with a trigger so the prover can establish the overflow abort condition. The paper's rule is explicit: “The lemma is required for the aborts_if condition.” (Sec. II-B, p. 3)

Verus has analogous `proof fn` lemmas, `reveal`/`broadcast` patterns, and trigger-aware quantified assertions. The Move proof-hint syntax itself does not transfer, but the escalation order does. Never weaken a contract to silence a timeout; the authors call that trading “a real property for the appearance of progress.” (Sec. IV, p. 4)

## technique 5: state-dependent resource specifications

For functions that mutate resources at multiple addresses, infer frame and state-transition clauses. The `split_balance` example derives `modifies` for the source and both destinations, a result equal to half the old source balance, and state-labeled postconditions describing removal and publication between intermediate states `S1` and `S2` (Sec. II-C, pp. 2–3). State modalities (`..S1 |~ e`, `S1..S2 |~ e`, `S2.. |~ e`) let the contract describe a sequence of global-memory effects rather than only the final state.

In Verus (inference), model the resource map as a ghost map or a mutable object with an explicit frame. Use `old(map[src])` for the pre-state and intermediate ghost snapshots for each transfer; prove ownership and disjointness with Rust borrow discipline. The exact Move resource operators (`publish`, `remove`, `∃<R>`) have no direct Verus equivalent.

## technique 6: make the agent workflow enforceable

The plugin registers a fixed task sequence: synthesize invariants, run WP, simplify, verify, fix logical errors, and resolve timeouts. Every emitted condition carries an `[inferred]` marker so reruns are idempotent and do not overwrite user specifications. A `PostToolUse` hook runs after every edit or write to a `.move` file, performs offline AST checks and formatting, and returns diagnostics in the agent transcript. The MCP server exposes narrow, cached commands for one function or module with configurable timeouts. “The advantage of MCP over a CLI is a long-lived cache for the active package.” (Sec. IV, p. 4)

The authors' skill-design lessons are operational techniques: minimize context; put the task list first and reference material below it; repeat prohibitions against weakening contracts; and test skills through extended manual application because nondeterministic agent choices make ordinary CI difficult. For a Verus agent, equivalent hooks can run `rustfmt`, parser checks, and targeted `verus` commands after each edit, while retaining user-written annotations through markers or generated files.

## what is proved, measured, and trusted

The Move Prover proves each accepted contract against the transformed bytecode. The paper demonstrates examples spanning higher-order functions, arithmetic, loops, references, and global state, but reports no denominators, baseline comparison, token cost, or scalability measurement. Open questions include hybrid versus pure-LLM success rate, token cost, sample representativeness, model-version effects, and performance on larger systems. The trusted base includes Move's compiler and reference-elimination transformation, the WP implementation, Boogie, SMT solving, and the user's interpretation of high-level properties. The agent, its skills, and simplifier are not trusted for correctness; their output must pass the prover.

## implications for VeruLaw (inference)

The paper directly suggests a VL architecture: mechanically derive routine contracts from a normalized Rust/Verus intermediate form, reserve agent effort for loop invariants and domain properties, and feed verifier counterexamples into an iterative propose-observe-refine loop. This could reduce agent search and prevent boilerplate errors. The product threat is substantial if competitors package the same workflow into an interactive coding agent, but the evidence here is preliminary and Move-specific; there is no measured advantage over a pure LLM and no demonstrated large-system deployment. VL should reuse the separation and escalation discipline while measuring pass rates, time, token cost, and human edits on its own corpus before claiming benefit.

## techniques for the catalog

- mechanical WP baseline — lower contracts to a reference-free, instrumented form and derive aborts, frames, and postconditions by backward propagation
- agent loop-invariant synthesis — infer inductive counter, sequence, arithmetic, and resource facts, then let the prover reject invalid proposals
- contract simplification — replace vacuous or solver-hostile WP formulas with bounded, readable equivalents and checked triggers
- timeout escalation — strengthen invariants, add helpers, add lemmas, and use proof scripts without weakening properties
- state-transition resource specs — use frames, old-state values, and intermediate snapshots to specify multi-address global updates
- enforceable agent plugin — combine ordered skills, inferred markers, edit hooks, cached MCP tools, and prover feedback in an idempotent workflow
Audited 2026-10-12 against the paper: checked the quotations and their pages, the find, pow and split_balance examples, the WP pipeline steps, the skill, hook and MCP descriptions, and the Verus forms. Corrected: page references for the two Sec. IV and V-A quotations (p. 4) and the pow and split_balance examples (pp. 2 to 3); the order contradiction (the paper runs invariants before WP); the invariant-pattern sentence that was credited to the skill but is the paper's intro on LLMs; the claim that the examples verify after invariants (pow times out); a Verus form that used a nonexistent modifies clause; and marked the trusted-base list, the discard-a-failed-rewrite remark and the assume caveat as the study's inference. The paper gives no numbers, so none could be checked.
