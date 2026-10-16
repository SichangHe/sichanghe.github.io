# Simplifying Safety Proofs with Forward-Backward Reasoning and Prophecy
(authored by agents unless marked 🧑)
Tag: `frenkel2026simplifying`, [paper](https://www.semanticscholar.org/paper/0a74f8ed887164e9855d47586508ee740f329655)

## what the paper contributes

The paper defines an incremental proof system for safety problems. Instead of searching for one large safe inductive invariant, it permits a sequence of simpler forward-inductive, backward-inductive, and prophecy steps. It proves every rule sound and gives a translation from an incremental proof back to one safe inductive invariant. The abstract states the core claim precisely: “Our proof system combines rules for (i) forward reasoning using inductive invariants, (ii) backward reasoning using inductive invariants of a time-reversed system, and (iii) prophecy steps that add witnesses for existentially quantified properties.” (abstract, PDF p. 1)

The method targets transition systems with initial formula `ι`, transition relation `τ`, and bad-state formula `β`. A safe inductive invariant holds initially, is preserved by every transition, and implies `¬β` (section 3, PDF p. 6). The authors instantiate the rules in mypyvy, which sends logical queries to Z3, and manually write and mechanically check proofs of Paxos variants and an EPR Raft model (section 6.2, PDF pp. 19–21).

## technique: incremental forward proofs

Use this when a single invariant needs a difficult conjunction or when proving a property becomes easier after assuming an already established auxiliary invariant. A forward invariant `φ` must satisfy `ι ⇒ φ` and `φ ∧ τ ⇒ φ′`. The incremental system adds a previously proved invariant as an assumption for a later subproblem. The paper's soundness theorem says every such proof is safe (Definitions 4.1 and 4.3, Theorems 4.2 and 4.4, PDF pp. 8–9).

How to apply it.

1. State the safety problem `(ι, τ, β)` and select a predicate class `P` (section 4.1, PDF p. 8)
2. Prove a first `φ1` by initial implication and consecution
3. Add `φ1` as an assumption and prove `φ2` for the restricted transition system
4. Continue with `φi`, each checked by the same initial/consecution obligations relative to earlier facts
5. Conclude safety when the accumulated predicates imply `¬β`; the paper constructs a safe invariant as their conjunction (Definition 4.5 and Theorem 4.6, PDF pp. 9–10)

In the dealer/player token example, the required safe invariant has a non-clausal Boolean shape, but two simpler clauses can be proved incrementally (section 2.1, PDF pp. 3–4). This is a search-space reduction: each query can use clauses even though their conjunction is not itself inductive in the original system.

Verus form. Inference: encode each `φi` as a Verus `spec fn` and prove a `proof fn` lemma with `requires` stating earlier predicates and `ensures` stating the next predicate. Use `assert` to establish initial implication and transition consecution. A Verus proof function is verification-time code and cannot be called as runtime computation. Inference: the incremental assumptions become lemma preconditions or explicit `assert` facts in later lemmas; do not write `invariant(...)` as a call, because Verus loop invariants are annotation syntax on loops.

## technique: backward-inductive reasoning by time reversal

A backward-inductive invariant is an invariant of the time-reversed system. It is implied by bad states and preserved by backward transitions, so it holds on every state along a path that ends in a bad state. The paper writes, “Such a formula holds on all backward-reachable states from β, and is therefore an invariant of all error traces of the safety problem.” (section 2.1, PDF p. 4) It also states the rule guarantee directly: “Every safety problem that has an FBI-proof is safe.” (Theorem 4.10, section 4.2, PDF p. 11)

Apply it as follows.

1. Reverse the transition relation and treat `β` as the initial set of the reversed problem (section 4.2, PDF pp. 10–11)
2. Choose a predicate `φ` that `β` implies
3. Prove backward consecution in the reversed system
4. Use `φ` as an assumption in a forward step, or alternate forward and backward steps
5. Combine the steps; the paper's `Inv⇌` construction adds negation for reversed roots and conjunction for incremental roots, yielding a safe inductive invariant (Definitions 4.9 and 4.12, Theorems 4.10 and 4.13, PDF pp. 11–12)

In the token example, `¬a ∨ d` is backward-inductive because it holds on bad states; assuming it disables one transition and makes `¬p1 ∨ ¬p2` forward-inductive (section 2.1, PDF p. 4). The resulting predicates are simpler than the forward-only clauses. Inference: in Verus, represent backward reasoning as a separate lemma over a relation that models predecessor states, then use its `ensures` result in the forward lemma. Verus proves the formulas you state; it does not automatically construct a time-reversed transition system, so that relation and its correspondence to the Rust transition must be specified and trusted as part of the model.

## technique: prophecy witnesses for existential properties

Forward-backward decomposition simplifies Boolean structure but cannot by itself remove quantifier alternation: the reconstructed invariant is a Boolean combination of the auxiliary predicates. Prophecy introduces a fresh constant witness `w` for an existential property `φ(x)`. A prophecy is sound when every original trace can be interpreted with some `w` so that the strengthened trace remains a trace. The paper formalizes this in Definition 5.1 and characterizes soundness as an auxiliary safety problem in Theorem 5.2 (PDF pp. 13–14).

Use the following sequence.

1. Choose `φ(x)` whose witness would make a later invariant simpler
2. Introduce fresh `w` and add `φ(w)` to the initial state, transition assumptions, and bad-state context
3. Prove the prophecy's soundness problem, rather than assuming the witness exists
4. Prove the strengthened problem using forward/backward steps
5. Substitute the strengthened-problem invariant for a predicate over `w`; existentially quantify the witness to recover a safe invariant of the original problem (Definition 5.5 and Theorem 5.6, PDF pp. 14–15)

The worked relation example has a safe invariant `∃x.¬a(x) ∧ ∀y.d(x,y)` with quantifier depth two. A prophecy witness for `¬a(x)` lets the proof use only single-existential predicates, while the reconstructed invariant is equivalent to the original (Example 5.7, PDF pp. 14–15). The Paxos proof uses `Proph-Select` to witness a quorum supporting a decision; this removes an existential quorum from the backward predicate and leaves a universally quantified clause (section 6.1, PDF pp. 18–19).

Verus form. Inference: a prophecy witness can be modeled as an extra ghost/spec variable chosen in a lemma, with a `requires` condition proving its existence and an `ensures` relation tying it to the state. Keep the witness in ghost state or in a `spec fn`; do not add it to runtime Rust unless the algorithm really stores it. Inference: the soundness lemma must quantify over every reachable trace or prove an inductive existence invariant. Verus's `old` expression is available in postconditions for pre-state values; use it where the witness relates pre- and post-state, rather than inventing a different construct.

## technique: prophecy heuristics with explicit verification conditions

General prophecy search can itself be hard. The authors derive restricted patterns whose soundness can be checked by simple formulas. For a forward-preserved `φ(x)`, check `ι ⇒ ∃x.φ(x)` and `φ(x) ∧ τ ⇒ φ′(x)`; then apply `Proph-Fwd` directly (section 5.2, PDF p. 16). A second `Proph-Select` pattern uses a forward-preserved phase predicate `θ`: before `θ`, all elements satisfy `φ`; after `θ`, at least one selected element remains `φ`. Its conditions include initial existence, preservation of existence, `¬θ ⇒ ∀x.φ(x)`, `θ ∧ τ ⇒ θ′`, and preservation of `φ` once `θ` holds (section 5.2, PDF pp. 16–17).

Inference: a Verus proof-search tool should offer these patterns as templates. Generate lemmas for the listed conditions, then let Verus check the instantiated prophecy and the strengthened safety proof. This narrows search without treating an LLM's chosen witness as evidence.

## evidence from Paxos and Raft

The case study covers Paxos, Flexible Paxos, Multi-Paxos, Fast Paxos, a first-order Paxos variant, and an EPR Raft model. All proofs were manually written and mechanically checked by mypyvy/Z3 on a two-core, 16-GB AWS `z1d.large`; each timing is the median of 15 runs (section 6.2, PDF p. 21). Table 1 reports predicate quantifier count `Q`, alternation count `A`, Boolean-connective count `B`, prophecy symbols `p`, clausal status, and time (PDF pp. 20–21).

Forward-backward proofs generally replace mixed conjunction/disjunction formulas with clausal predicates. Prophecy further removes existential quantifiers in round-value Paxos variants. For `raft-epr`, forward uses `Q=7, A=2, B=9` and 3.7 seconds; forward-backward leaves the same complexity in this model, while forward-backward plus prophecy uses steps with `Q=1` and `Q=3`, three prophecy symbols, and 2.8 seconds (Table 1, PDF p. 20). For `fast-paxos-epr-v`, forward takes 1.5 seconds, forward-backward 1 second, and prophecy 0.8 seconds; these are medians of 15 runs on the stated machine. The authors caution that simplification is not guaranteed for other protocols (section 6, PDF p. 17).

## techniques for the catalog

- incremental forward invariants — prove simple predicates one at a time and use earlier predicates as assumptions
- backward-inductive invariants — prove predicates on the time-reversed system from bad states, then combine them with forward steps
- prophecy witnesses — add a sound ghost witness for an existential property and reconstruct a witness-free safe invariant
- prophecy verification conditions — use `Proph-Fwd` or `Proph-Select` side conditions to avoid searching arbitrary soundness proofs
- invariant reconstruction — translate an incremental proof into one safe inductive invariant with bounded Boolean and quantifier complexity
