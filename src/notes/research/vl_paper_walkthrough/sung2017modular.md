# Modular Verification of Interrupt-Driven Software
(authored by agents unless marked 🧑)

Tag: `sung2017modular`: [paper](http://arxiv.org/abs/1709.10078v1)

## problem and method

The paper presents IntAbs, an abstract-interpretation framework for C/C++ interrupt handlers with priorities and nested preemption. Its abstract states: “we propose an abstract interpretation framework for static verification of interrupt-driven software that first analyzes each interrupt handler in isolation as if it were a sequential program, and then propagates the result to other interrupt handlers.” (Abstract, p. 1) The design avoids constructing a monolithic global model and instead iterates local analyses until a fixed point.

Interrupt interleavings are a strict subset of thread interleavings: a higher-priority handler may preempt a lower-priority one, equal-priority handlers cannot preempt each other, and nested invocations are possible (Sections I and III.A, pp. 1 and 4). The paper says thread-modular analyses cannot rule out store-to-load flows that priorities make infeasible, "thus causing false alarms" (Section III.B, p. 5).

## technique 1: modular abstract interpretation to a fixed point

What it is. Represent each handler as a control-flow graph with abstract memory states in a lattice (for example intervals), transfer functions, join, and widening/narrowing. Analyze a handler sequentially under an interference map describing values written by other handlers, then propagate writes as new interference and repeat globally until states stabilize.

How to apply it.

1. Build a CFG `T = ⟨N,n0,δ⟩` for every handler and choose an abstract domain with top, bottom, partial order, join, and termination-preserving widening/narrowing (Section III.B, pp. 4–5).
2. For local analysis, initialize a work-list with the entry node and process nodes until the work-list is empty (a fixed point). At a shared-memory read of `v`, apply the transfer function to the join of the local state and interference `I(v)`; local reads use only the local state (Algorithm 1, p. 5).
3. Compute `INTERF(T,S)` by joining abstract states at all writes of each variable (Algorithm 2, p. 5).
4. Initialize all node states to bottom. Reanalyze every handler with interferences from all other handlers, join results with prior iterations, and repeat until `S' = S` (Algorithm 2, p. 5).

The paper states the result "is an over-approximation of the memory states within T assuming interferences I" (Section III.B, p. 5), and that this thread-modular scheme is "potentially less accurate": a load may see a store even when no program path lets it, so it cannot prove the assertions in Figs. 2 and 5 (Section III.B, p. 5). Inference: the proofs are only as sound as the chosen abstract domain and transfer functions.

Verus form. Inference: a Verus model can represent each handler’s abstract state and prove local transfer lemmas, then use a ghost fixed-point iteration with a well-founded bound or finite-height domain. Verus is primarily deductive and does not supply Apron-style abstract domains or widening automatically; those algorithms would be executable Rust with contracts, while their soundness lemmas remain proof obligations. Interrupt scheduling and shared memory must be modeled explicitly, likely with a state-machine abstraction.

## technique 2: Datalog feasibility analysis for store-to-load pairs

What it is. IntAbs computes a conservative `MUST_NOT_READ_FROM(l,s)` relation: if it contains load `l` and store `s`, no concrete execution respecting other known flows can let `l` read the value from `s`. The paper says: “We have developed a Datalog-based declarative program analysis procedure for computing MUST NOT READ FROM.” (Section IV, p. 5)

How to apply it.

1. Extract facts for statement dominance (`DOM`), post-dominance (`POST_DOM`), handler priority (`PRI`), loads, stores, and the given store-to-load pairs (Section IV and IV.A, pp. 5–6).
2. Infer `NO_PREEMPT(s1,s2)` when the handler containing `s1` has priority no higher than the handler containing `s2`: `NO_PREEMPT(s1,s2) ← PRI(s1,p1) ∧ PRI(s2,p2) ∧ (p2 ≥ p1)` (Section IV.A, p. 6).
3. Infer `COVERED_LOAD(l)` when a same-handler store dominates a load: `COVERED_LOAD(l) ← LOAD(l,v) ∧ STORE(s,v) ∧ DOM(s,l)` (Section IV.A, p. 6).
4. Infer `INTERCEPTED_STORE(s1)` when a same-handler later store post-dominates an earlier store: `INTERCEPTED_STORE(s1) ← STORE(s1,v) ∧ STORE(s2,v) ∧ POST_DOM(s2,s1)` (Section IV.A, p. 6).
5. Apply three Datalog rules: a covered load cannot read an intercepted store; a covered load cannot read a store that cannot preempt it; and a load cannot read an intercepted store when the load cannot preempt that store (Section IV.A, p. 6).
6. Submit facts and rules to a fixed-point Datalog engine; the implementation uses µZ (Section IV, p. 5).

The paper calls the relation "an under-approximation" of the infeasible pairs: the paper does not "attempt to identify all the infeasible pairs", only to find some quickly (Section IV.C, p. 7). The theorem states: “Whenever MUST NOT READ FROM(l, s) holds, the load l cannot read from the store s on any concrete execution of the program.” (Theorem 2, Section IV.C, p. 7)

Verus form. Inference: encode statement IDs, priorities, dominance, and candidate pairs as ghost sequences or sets. Prove each inference rule as a lemma from a scheduler model; then filter interference before a handler’s abstract transfer. Verus can verify a finite relation computation with recursive/proof functions and invariants, but Datalog’s least-fixed-point engine and µZ are external components unless reimplemented and proved. The crucial guarantee is one-way: proving infeasibility is safe; failing to prove it must retain the pair.

## technique 3: priority-aware interference filtering

What it is. Integrate `MUST_NOT_READ_FROM` into local analysis without eagerly joining all writes. Algorithm 3 stores each interference as a `(store, abstract-state)` pair. Algorithm 4, at each load `l`, joins only states from stores not classified as impossible for `l`; all other local transfer steps remain unchanged (Section V, p. 7).

How to apply it.

1. During `INTERF`, preserve the identity of every store with its abstract state rather than immediately joining states (Algorithm 3 and Section V, p. 7).
2. At a load of `v`, collect `(st,s)` pairs for `v` with `¬MUST_NOT_READ_FROM(l,st)` and join those states with the local state (Algorithm 4, Line 7, p. 7).
3. Continue the fixed-point iteration from technique 1; "The remainder of the modular analysis remains the same as in Algorithm 2" (Section V, p. 7). The paper does not say the feasibility relation is recomputed during the iteration.
4. For loops, use post-dominance to remove a store overwritten on every path. The paper’s example removes `x=1` before a load when `x=0` post-dominates it in the loop (Section V, p. 8).

Verus form. Inference: represent each interference with a ghost origin and state, and prove a filtering lemma that removed origins cannot occur in any schedule satisfying the priority and dominance assumptions. Keep the retained set over-approximating all possible reads. Verus’s `invariant` clauses can maintain this relation across a loop, but interrupt callbacks and shared memory require an explicit concurrency/state-machine model.

## evidence, trust, and limitations

IntAbs was evaluated on 35 interrupt-driven programs totaling 22,541 lines of C, using Clang/LLVM, Apron, and µZ on an Intel i5-3337U with 8 GB RAM under Ubuntu 14.04 (Section VI, p. 8). Table IV (p. 9) covers 35 programs, 262 assertions, and 136 handlers. IntAbs reported 144 proofs and 118 warnings in 64.21 seconds; iCBMC reported 88 violations and zero proofs in 56.75 seconds; the thread-oriented method reported 8 proofs and 254 warnings in 39.92 seconds. The paper explains that iCBMC is bounded: when it detects a violation "it is guaranteed to be a real violation", but otherwise "the property remains undetermined"; the 254 warnings are marked as containing bogus warnings "because the technique was designed for threads, not for interrupts" (Section VI.A and Table IV footnote, pp. 8–9). The paper reports IntAbs as slower than both baselines (64 s against 39 s and 56 s), which it calls "slightly long" (Section VI.A, p. 9).

Table V (p. 10) reports 5,116 total store-load pairs and 3,560 filtered pairs, a 69% filtered ratio. The denominator is all pairs across the same benchmark set; the paper states that the subsequent analysis "only has to consider the remaining 31%" (Section VI.B, p. 9). Inference: 3,560/5,116 is 69.6%, so the paper's 69% (and per-row ratios such as 2/18 = 11%) are truncated, not rounded.

The soundness of the infeasibility relation (Theorem 2) is not proved in the paper: it gives per-rule intuition and says "A more rigorous proof can be formulated via proof-by-contradiction in a straightforward fashion, which we omit for brevity" (Section IV.C, p. 7). Theorem 1 (thread proofs remain valid for interrupts) is argued informally in Section II (p. 4).

## techniques for the catalog

- fixed-point handler analysis — analyze each interrupt handler with abstract interferences and iterate until all node states stabilize
- Datalog infeasibility relation — infer `MUST_NOT_READ_FROM` from priority, dominance, post-dominance, and load/store facts
- priority-aware filtering — retain store-origin identities and remove only interference pairs proved impossible before joining abstract states
