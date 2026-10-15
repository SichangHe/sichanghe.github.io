# Beyond k-induction: Learning from Counterexamples to Bidirectionally Explore the State Space
(authored by agents unless marked 🧑)
Tag: `gadelha2019beyond`, [paper](http://arxiv.org/abs/1904.02501v1)

## result
The paper extends k-induction with bidirectional bug search (bkind). The forward base-case search explores reachable states from the initial state; the inductive step supplies a backward partial counterexample from an error state; the next forward search checks whether it reaches that partial path. An interval invariant generator constrains the backward search. The paper’s abstract claims bkind “only requires half the number of steps to find a given safety property violation in an unsafe program.”

## technique 1: baseline k-induction
Model a program as a transition system with `initP`, transition relation `trP`, safety predicate `φ`, completeness threshold `ψ`, and error state `ϵ` (Section 2, p. 2). For each bound `k`:

1. unwind the program k times
2. base case: solve `initP(s1) ∧ ∧ trP(si,si+1) ∧ ∨ ¬φ(si)`; a satisfying path is a concrete counterexample
3. forward condition: solve the same path constraints with `¬ψ(sj)`; if unsatisfiable, all loops are fully unwound and safety follows
4. inductive step: solve `∃n. ∧_{i=n}^{n+j−1}(φ(si) ∧ trP(si,si+1)) ∧ ¬φ(sn+j)`; unsatisfiability proves safety for the over-approximation
5. increase k until a result or `kmax`, then return unknown

Algorithm 1.4 gives this control flow; Theorem 1 states that a returned path is non-spurious, empty path means safe, and unknown means safe up to `kmax`. The paper cautions that the inductive state space contains unreachable regions: “these sequences often include large unreachable regions of the state space.” (Section 2.1, p. 4).

Verus form (Inference): write the loop body in executable Rust with an `invariant` clause and use `assert`/`assert forall` proof facts for the induction step. A `requires` precondition supplies `initP`, while `ensures` states `φ`; Verus does not expose an explicit `k`-unwinding API, so this is a conceptual mapping to bounded proof lemmas.

## technique 2: bidirectional counterexample learning
Use the inductive step’s path instead of discarding it.

1. initialize `πback = ∅`, `k = 1`
2. unwind to `Pk`
3. run `bkind_base_case(Pk, πback)`: first search for a real violation; otherwise check whether any forward-reachable state belongs to `πback`, and concatenate the prefix with `πback`
4. run the completeness condition
5. run the ordinary inductive step; if it finds `[si,…,ϵ]`, retain it as `πback`
6. recurse with `k+1`

Algorithm 1.5 defines `starts_counterexample(s,π)` as true when `s ∈ π`; line 14 returns `[s1,…,si−1] · πback`. Lemma 4 proves the concatenation is a real counterexample. The paper says: “The novel contribution in the new bkind algorithm is the bidirectional bug-finding technique.” (Section 3.1, p. 7).

Theorem 3 gives partial completeness: if the shortest counterexample has length k and the inductive step returns the same non-spurious partial path each time, bkind finds it in exactly `floor(k/2)+1` iterations. That assumption is essential; the authors discuss only partial guarantees for it. The method reduces bug-finding depth, not the cost of proving a safe program.

Verus form (Inference): a verified Rust proof can encode the backward suffix as a ghost sequence of states and prove a lemma that a reachable prefix concatenates with a valid suffix. Use `seq`, `ghost` variables, `requires`, and `ensures` from the project’s Verus conventions. Solver-discovered counterexamples and the transition-system search remain external automation; they do not become executable proof functions.

## technique 3: interval invariants as a backward filter
Before unwinding, run interval abstract interpretation. The paper represents each variable’s interval as a map to bounds in `[-2^128,2^128]` (Section 3.2, p. 8). Add the resulting invariant `ϕ(sn)` to the inductive-step satisfiability query:

`∃n. ϕ(sn) ∧ ∧_{i=n}^{n+j−1}(φ(si) ∧ trP(si,si+1)) ∧ ¬φ(sn+j)`

This removes unreachable error states and reduces spurious partial paths. In the ECA example, intervals `input ≥ 0`, `input ≤ UINT_MAX`, `s ≥ 1`, `s ≤ 5` prove the safe program with two unwindings; for the unsafe variant, the backward state becomes `input = 5 ∧ s = 5`, which the next base case reaches (Section 3.3, pp. 9–10). The paper says: “An invariant is a filter of states.” (Section 3.2, p. 9).

Verus form (Inference): state interval facts as loop invariants or ghost bounds and prove them at initialization and after each assignment. For a variable `s`, use arithmetic invariants such as `1 <= s <= 5`; then assert the error predecessor is reachable. Verus can prove the bounds but does not automatically generate interval maps for arbitrary Rust pointers.

## evaluation and trust
The experiments use 5,591 SV-COMP’18 benchmarks: 4,134 safe and 1,457 unsafe, excluding termination, recursion, and concurrency categories. ESBMC uses Boolector, 900-second and 15GB limits, on 2.6GHz Intel Sandybridge nodes with 24GB RAM (Section 4.1, pp. 10–11). Figure 3 counts, across all benchmarks, bkind+invariants at 2,305 correct proofs, 832 correct alarms, 38 incorrect proofs, and 11 incorrect alarms; naïve k-induction has 2,148, 836, 10, and 8 respectively. These are counts over the 5,591-benchmark set, not percentages. The paper reports total times of 1,504,208 seconds for bkind+invariants versus 1,654,147 for naïve k-induction, about 17.4 versus 19.1 days (Section 4.2, p. 12). Against 2LS, bkind+invariants has 2,305 correct proofs, 832 correct alarms, 38 incorrect proofs, 11 incorrect alarms; 2LS has 1,031, 615, 3, and 4 (Figure 4, Section 4.3, p. 13). The comparison is not a controlled proof of universal superiority: categories unsupported by 2LS and implementation defects affect counts.

The paper identifies concrete failures: incorrect invariants caused incorrect counterexamples; arrays produced incomplete partial counterexamples; pointer interval dependencies were not tracked. It states that wrong alarms were 0.1% of the 4,134 correct benchmarks for k-induction approaches, while incorrect proofs with invariants were about 2.5% of the 1,457 incorrect benchmarks. These denominators differ and should not be combined.

What is proved/trusted: theorems prove soundness assuming transition relations and invariants are correct. Trusted components include ESBMC front-end, interval analysis, unwinding, Boolector, and benchmark classifications. Inference: Verus adds Rust compiler/erasure and specification trust.

Threat to VeruLaw (Inference): bkind suggests a useful tactic for agent-written verified Rust: retain solver counterexamples as ghost predecessor obligations and use them to guide the next invariant. It threatens little directly because Verus already asks for explicit loop invariants and does not use ESBMC’s C unwinding. VL should not duplicate the benchmark claim; a Rust/Verus experiment would need to measure proof repair time and soundness under pointer/array invariants.

## techniques for the catalog
- k-induction — combine bounded base, completeness, and inductive checks over increasing loop depth
- bidirectional counterexample learning — concatenate reachable prefixes with inductive backward suffixes
- interval invariant filtering — constrain inductive queries with statically inferred variable bounds
Checked 2026-10-14 against the paper by a Codex agent: audit record gadelha2019beyond; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
