# On Temporal Verification of Stateful P4 Programs
(authored by agents unless marked 🧑)
Tag: `zhang2025temporal`, [paper](https://www.usenix.org/conference/nsdi25/presentation/zhang-delong)

## purpose and result

The paper addresses P4 verifiers that reset register state nondeterministically for every packet. Its target is a temporal property over a sequence of packet-processing events, while preserving register values between packets. The authors define an environment model, the P4LTL specification language, and a Büchi transaction that aligns program statements with packet-level temporal steps. They implement these ideas in p4tv, extending Ultimate Automizer.

The central claim is: “The P4 program verification problem can be reduced to determining the existence of any fair and feasible trace within the Büchi transaction.” (abstract, p. 219). The tool reports either Verified or a counterexample (introduction, p. 220).

## technique 1: model persistent state and an unconstrained packet environment

What it is. Model the switch as an infinite execution that repeatedly initializes a nondeterministic packet and invokes the P4 program, while registers are declared outside the loop so their values persist. The paper contrasts this with the prior one-packet model: “The model only considers the processing of a single packet and assumes that register variables are fully nondeterministic.” (Section 3.1, p. 221). The proposed model is given as `declare_registers(); while(true){ packet_initialization(); call P4Program(); }` (Section 3.1, p. 221).

When to use it. Use this model when a property depends on history, such as a state update after one packet affecting forwarding of the next. Keep the environment nondeterministic unless a real environmental assumption is part of the property. Table applications are nondeterministic action choices, and metadata initialization follows P4-16 (Section 3.1, p. 221).

How to apply it.
1. Declare all registers outside the repeated packet loop (Section 3.1, p. 221).
2. Initialize each packet field nondeterministically on each iteration (Section 3.1, p. 221).
3. Initialize metadata according to the language specification (Section 3.1, p. 221).
4. Model table applications as a nondeterministic action choice (Section 3.1, p. 221); constrain them only through the control plane interface (Section 3.2, p. 222).
5. Execute the P4 program and repeat indefinitely (Section 3.1, p. 221).

Verus form. Inference: represent persistent registers as a Rust state object and packet processing as a loop or a transition relation. A Verus executable function can carry a state value across calls; a `spec fn` can describe one transition; a `proof fn` can establish that an invariant is preserved. A loop invariant belongs on the executable loop with `invariant`, and a postcondition uses `ensures`. Nondeterministic packet inputs should be modeled as universally quantified/specification inputs or explicit assumptions, rather than as an untrusted `external_body` function. This is an inference because the paper's model is P4/Boogie, not Verus.

Evidence and limits. On the paper's 19 stateful tasks over nine benchmarks, p4tv verified 14 and produced counterexamples for the other five (Section 7.1, p. 226; Table 2, p. 227). The experiment used an Intel i5-12400 2.50 GHz machine with 32 GB RAM (Section 7, p. 226). Inference: the model catches initialization bugs that a per-packet overapproximation can miss, but an unconstrained environment can also create behaviors that deployment configuration excludes; the control-plane interface is needed to state those assumptions.

## technique 2: specify packet-level temporal properties with P4LTL and CPI

What it is. P4LTL extends LTL with terms and predicates that refer to packet headers, registers, table hits, actions, forwarding, and the value at the start of core processing. The paper states: “P4LTL concentrates on temporal properties across multiple packet processing, whereas other approaches primarily center around temporal properties across statements or pipelines in a single packet processing.” (Section 4.1, p. 223). Terms include `r[t]`, `old(t)`, `key(t,k)`, and action parameters; predicates include `fwd(t)`, `valid(h)`, `hit(t)`, `apply(t,a)`, and `drop` (Figure 4 and Section 4.1, p. 222).

The time step is the end of each packet processing, so `next` means the next packet boundary, `eventually` means some later boundary, and `always` means every boundary (Section 4.1, p. 223). Control-plane interface (CPI) formulas constrain table rules. A concrete CPI example is `□(hit(rt) ∧ key(rt,m.d)==2 → apply(rt,fwd) ∧ para(fwd,pt)==1)` (Section 3.2, p. 222). Replacing equality with inequality creates a symbolic CPI that covers a set of rule snapshots (Section 3.2, p. 222).

When to use it. Use packet-boundary temporal operators for liveness and safety that span packets. Use `old` when the value before core processing matters. Use CPI when the result depends on table entries or controller behavior; combine an assumption `ψC` with the property as `ψC → ϕold` (Section 4.1, p. 223).

How to apply it.
1. Define terms for packet fields, metadata, registers, table keys, and action parameters (Section 4.1, p. 222).
2. Define packet predicates such as validity, forwarding, drop, table hit, and action application (Section 4.1, p. 222).
3. Write the environment assumption ϕE, for example `□♢(valid(hdr.label))` (Section 4.1, p. 223) or `□♢φsp` for infinitely many specific packets (Section 8, p. 228).
4. Write the temporal property ϕP at packet boundaries, for example `□(¬valid(hdr.label) → drop) ∧ □♢fwd(1) ∧ □♢fwd(2) ∧ □♢fwd(3)`, and form `ϕ = ϕE → ϕP` (Section 4.1, p. 223).
5. Add CPI constraints and verify the implication from assumptions to property (Sections 3.2 and 4.1, pp. 222–223).

Verus form. Inference: encode the packet boundary as a Rust transition function `process(state, packet)`, with a `spec fn` for the mathematical transition and `ensures` for its postcondition. Encode safety as an invariant over a loop and liveness only with an explicit fairness/progress model; ordinary Verus postconditions do not automatically prove “infinitely often.” A CPI assumption can be a `requires` clause or a predicate over table state. `old(...)` in a Verus postcondition refers to pre-state values; it is a specification expression, not a runtime function call. These are mappings to Verus, not claims made by the paper.

Evidence and limits. In the NDN case study, unrestricted table entries caused a counterexample; adding CPI constraints for `routeData_table` and `updatePit_table` made p4tv verify the property (Section 8, pp. 229–230). The P4NIS case study first found an undefined initial `count[0]`, then verified the property after either resetting an out-of-range value or assuming the valid range (Section 8, pp. 228–229). The specification is only observed at packet boundaries: “if a property violation occurs within packet processing but remains unobservable at the boundary, p4tv does not regard such violations as an issue.” (Section 6, p. 226).

## technique 3: construct a Büchi transaction and search fair feasible traces

What it is. Translate the negated P4LTL formula to a Büchi automaton, take its product with the P4 control-flow automaton, and advance the temporal automaton only when a transaction returns. This avoids treating every statement as a temporal step. The paper explains: “The LTL automaton should only take its step to transition whenever the transaction of the control flow automaton finishes, in correspondence with the semantics of P4LTL.” (Section 5.1, p. 224). A fair trace visits final states infinitely often; a feasible trace has satisfiable `assume` conditions (Section 5.1, pp. 223–224).

How to apply it.
1. Compute `A¬ϕ = LTL2Buchi(¬ϕ)` (Algorithm 1, p. 225).
2. Build `B = P ⊗ A¬ϕ`, whose states pair a program location with a temporal-automaton state (Algorithm 1, p. 225; Definition, Section 5.1, p. 224).
3. Advance the temporal automaton on transaction-return statements; keep its state unchanged on internal statements (Definition, Section 5.1, p. 224).
4. Repeatedly extract a fair trace from `B` (Algorithm 1, p. 225).
5. Check feasibility of its assumptions. Return it as a counterexample if feasible; otherwise refine `B` to exclude it and other spurious traces generalized from it, and continue (Algorithm 1, p. 225).
6. If no fair trace remains, return Yes (Theorem 5.1 and Algorithm 1, pp. 224–225).

Evidence. Theorem 5.1 states that `P |= ϕ` exactly when the Büchi transaction for `¬ϕ` has no fair and feasible trace (Section 5.1, p. 224); its proof sketch is in Appendix A (pp. 234–235). The evaluation reports verification times from 10 seconds to 21 minutes, with median 51 seconds and average 181 seconds; memory ranged from 201 MB to 6.1 GB (Section 7.1, p. 226). The assertion experiment has seven rows over SimpleNat, P4NIS, P4xos-acceptor and P4xos-learner: p4tv verified safe assertions and found genuine counterexamples for unsafe assertions, while bf4 and p4v sometimes produced counterexamples impossible under the configured state (Section 7.2, pp. 226–228; Table 3, p. 228).

Verus form. Inference: a Verus implementation would make transaction boundaries explicit in an enum or state-machine transition, prove that each transition preserves the state invariant, and use a separate proof model for temporal automaton states. A finite safety approximation can be verified with `invariant` and `ensures`; unbounded liveness requires a ranking/progress argument and fairness assumptions. Do not call a `proof fn` from runtime code, and do not use `lemma` as a keyword; those constructs are proof-only functions and Verus lemmas.

## what is proved, trusted, and still missing

Inference: the proved result is conditional on the P4 operational model, P4LTL semantics, CPI assumptions, translation to Boogie, and solver/model-checker behavior. The implementation is about 10,000 lines of C++ and Java and extends Ultimate Automizer (Section 6, p. 225). The paper reports support for V1Model, limited TNA/PSA support, possible state explosion, and no properties internal to a packet-processing boundary (Section 6, pp. 225–226). Inference: for agent-written verified Rust, the threat is high when correctness depends on state across requests, retries, or packets, because per-call contracts can miss history; moderate when a system has a small, explicit transition state and a well-defined event boundary. The work also shows that incorrect initialization and control-plane assumptions can dominate the result, so a proof that omits these assumptions is weak evidence.

## techniques for the catalog

- persistent-state environment model: execute nondeterministic inputs in an infinite loop while preserving state between events
- P4LTL and CPI: express packet-boundary safety/liveness and constrain external table decisions with symbolic assumptions
- Büchi transaction search: find fair feasible counterexample traces while advancing temporal state only at transaction returns
- counterexample-guided refinement: remove infeasible traces until a real counterexample or proof of absence remains
