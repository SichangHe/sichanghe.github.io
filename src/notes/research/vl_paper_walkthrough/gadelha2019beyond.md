# Beyond k-induction: Learning from Counterexamples to Bidirectionally Explore the State Space
(authored by agents unless marked 🧑)
Tag: `gadelha2019beyond`, [paper](http://arxiv.org/abs/1904.02501v1)

Page numbers below are PDF page numbers of the arXiv v1 file (title page = 1).

## result
The paper extends k-induction with bidirectional bug search (bkind). The forward base-case search explores reachable states from the initial state; the inductive step supplies a backward partial counterexample from an error state; the next forward search checks whether it reaches that partial path. An interval invariant generator constrains the backward search. The abstract claims bkind “only requires half the number of steps to find a given safety property violation in an unsafe program.” Inference: in the experiments the time savings come mainly from the invariants, not from bkind itself (see evaluation).

## technique 1: baseline k-induction
Model a program as a transition system with `initP`, transition relation `trP`, safety predicate `φ`, completeness threshold `ψ`, and error state `ϵ` (Section 2, pp. 2–3). For each bound `k`:

1. unwind the program k times
2. base case: solve `initP(s1) ∧ ∧ trP(si,si+1) ∧ ∨ ¬φ(si)`; a satisfying path is a concrete counterexample
3. forward condition: solve the same path constraints with `¬ψ(sj)` (no safety property); if this returns no path, all loops are fully unwound, and since the base case found no bug, the program is safe
4. inductive step: solve `∃n. ∧_{i=n}^{n+j−1}(φ(si) ∧ trP(si,si+1)) ∧ ¬φ(sn+j)`; if it returns no path, the program is safe (the paper states this as Lemma 3, resting on the inductive step over-approximating the state space and on the base case having run first)
5. increase k until a result or `kmax`, then return unknown

Algorithm 1.4 (p. 4) gives this control flow. Theorem 1 (p. 4) states: a returned sequence is a non-spurious counterexample, an empty sequence means safe, and unknown means safe up to `kmax`. The paper cautions that the inductive state space contains unreachable regions: “these sequences often include large unreachable regions of the state space.” (Section 2.1, p. 5). It also says that, as presented, Algorithm 1.4 “assumes that all counterexamples produced by the inductive step are spurious, even if they are not.” (Section 2.1, p. 5).

Verus form (Inference): write the loop body in executable Rust with an `invariant` clause and use `assert`/`assert forall` proof facts for the induction step. A `requires` precondition supplies `initP`, while `ensures` states `φ`; I know of no explicit `k`-unwinding facility in Verus, so this is a conceptual mapping to bounded proof lemmas. The paper says nothing about Verus.

## technique 2: bidirectional counterexample learning
Use the inductive step’s path instead of discarding it.

1. initialize `πback = ∅`, `k = 1` (the paper’s stated pre-conditions of Algorithm 1.6)
2. unwind to `Pk`
3. run `bkind_base_case(Pk, πback)`: first search for a real violation (same condition as the original base case); otherwise check whether any forward-reachable state `si` satisfies `starts_counterexample(si, πback)`, and if so return `[s1,…,si−1] · πback`; otherwise return the empty sequence
4. run the forward condition; if it returns an empty sequence, return safe
5. run the ordinary inductive step; if it returns an empty sequence, return safe; otherwise pass the returned path `[si,…,ϵ]` as the new `πback`
6. recurse with `k+1`, up to `kmax`

Algorithm 1.5 (p. 7) defines `starts_counterexample(s,π)` as true when `π ≠ ∅` and `s ∈ π`; line 14 returns `[s1,…,si − 1] · πback` (as printed). Lemma 4 (p. 7) argues the concatenation is a real counterexample, citing “the partial order property of the state space”. Algorithm 1.6 is on p. 8. The paper says: “The novel contribution in the new bkind algorithm is the bidirectional bug-finding technique.” (Section 3.1, p. 8).

Theorem 3 (p. 8) says the counterexample is found “in at least” ⌊k/2⌋ + 1 iterations (it says “k-induction proof rule” where bkind is meant); the proof concludes that bkind finds the counterexample in exactly ⌊k/2⌋ + 1 iterations (formulas are garbled in the text extraction, so these are not quoted). The proof assumes “the inductive step always returns the same non-spurious partial counterexample for every k” and says it will “show how to give partial guarantees to this assumption in Sec. 3.2”. Inference: Section 3.2 (invariants) does not itself prove that assumption, so the half-the-steps result is conditional on it. Inference: the technique shortens the depth of bug finding; the paper gives nothing on cost for proving a safe program, and its experiment shows bkind alone slightly slower than naive k-induction.

Verus form (Inference): a verified Rust proof can encode the backward suffix as a ghost sequence of states and prove a lemma that a reachable prefix concatenates with a valid suffix. Use `seq`, `ghost` variables, `requires`, and `ensures` from the project’s Verus conventions. Solver-discovered counterexamples and the transition-system search remain external automation; they do not become executable proof functions.

## technique 3: interval invariants as a backward filter
Before unwinding, run interval abstract interpretation, using the abstract interpretation component of CProver (Section 3.2, p. 9). The paper writes the abstract domain as a map `var → 2^128 × 2^128` that maps interval constraints to every variable (as printed; it gives no further explanation). Add the resulting invariant `ϕ(sn)` to the inductive-step query (Algorithm 1.7, p. 9):

`∃n. ϕ(sn) ∧ ∧_{i=n}^{n+j−1}(φ(si) ∧ trP(si,si+1)) ∧ ¬φ(sn+j)`

This is meant to rule out unreachable error states and reduce spurious paths. In the ECA example (Fig. 1), intervals `input ≥ 0`, `input ≤ UINT_MAX`, `s ≥ 1`, `s ≤ 5` suffice to prove the safe program with two loop unwindings; for the unsafe variant the inductive step finds `input = 5 ∧ s = 5`, the state prior to the error state, whose reachability “is introduced in the program as a new property and checked in the base case” (Section 3.3, p. 11). The paper says: “An invariant is a filter of states” (Fig. 2 caption, p. 10).

Verus form (Inference): state interval facts as loop invariants or ghost bounds and prove them at initialization and after each assignment. For a variable `s`, use arithmetic invariants such as `1 <= s <= 5`; then assert the error predecessor is reachable. Verus can prove the bounds but does not automatically generate interval maps for arbitrary Rust pointers.

## evaluation and trust
The experiments use 5,591 SV-COMP’18 benchmarks: 4,134 safe and 1,457 unsafe, from the subcategories Arrays, BitVectors, ControlFlow, ECA, Floats, Heap, Loops, ProductLines, Sequentialized and Systems DeviceDriversLinux64, excluding categories needing termination, recursion, or concurrency (Section 4.1, p. 11). ESBMC uses Boolector, 900-second and 15GB limits, on 2.6GHz Intel Sandybridge nodes with 24GB RAM (Section 4.1, p. 11).

Figure 3 (p. 12) shows five configurations; bar order is original naive, naive, naive+invariants, bkind, bkind+invariants. Correct proofs: 1630, 2158, 2311, 2148, 2305. Correct alarms: 684, 841, 827, 836, 832. Incorrect proofs: 118, 10, 38, 10, 38. Incorrect alarms: 57, 5, 5, 8, 11. So the current naive k-induction has 2,158 / 841 / 10 / 5 and bkind+invariants has 2,305 / 832 / 38 / 11 (an earlier version of this study gave the plain-bkind numbers for naive k-induction). These are counts over the 5,591-benchmark set, not percentages. Inference: the figure values for “original naive” do not match the text’s “25% and 20%” increases exactly (1630 to 2158 is about 32%, 684 to 841 about 23%); I did not resolve this.

The paper reports total times of 1,253,015s (original naive), 1,654,147s (naive), 1,522,851s (naive+invariants), 1,664,357s (bkind), and 1,504,208s (bkind+invariants) (Section 4.2, p. 13). It says bkind without invariants is “slightly slower (0.6%)” than naive k-induction, and that invariants make both algorithms about 10% faster. Naive (1,654,147s) versus bkind+invariants (1,504,208s) is 19.1 versus 17.4 days, “almost two full days”. Inference (my arithmetic): the comparison with naive+invariants (1,522,851s) is only about 1.2% in favor of bkind+invariants, so most of the saving is from invariants.

Against 2LS v0.6.0 (Section 4.3, pp. 13–14, Figure 4 on p. 14): bkind+invariants has 2,305 correct proofs, 832 correct alarms, 38 incorrect proofs, 11 incorrect alarms; 2LS has 1,031, 615, 3, and 4. The paper’s claims are “more than two times the number of correct proofs and about 35% more correct alarms”. 2LS aborts many Systems DeviceDriversLinux64 benchmarks with “Irreducible control flow not supported”, where ESBMC proves 1249. 2LS total time is 1,266,890s versus 1,504,208s for ESBMC, and the paper says 2LS is “about 15% faster” even without that category. Inference: the comparison is not a controlled proof of general superiority; the 2LS aborts and ESBMC implementation defects affect the counts.

The paper identifies concrete failures: when invariants are incorrect bkind finds an incorrect counterexample; programs with arrays give incomplete partial counterexamples; the invariant generator “does not track intervals of variables changed through pointers and neither if the intervals are defined in terms of other variables”. It states “we only report incorrect proofs in about 2.5% of the 1457 incorrect benchmarks” (here “incorrect” means the unsafe programs), and that wrong alarms “only amount to 0.1% of the 4134 correct benchmarks” (the safe programs). The denominators differ and should not be combined. Inference: 11 incorrect alarms over 4,134 is about 0.27%, not 0.1% (5 would give 0.12%); I did not resolve this.

What is proved/trusted: Inference: the soundness theorems hold only assuming correct transition relations and invariants; the paper itself blames implementation bugs and incorrect invariants for the wrong results. Trusted components include ESBMC front-end, interval analysis, unwinding, Boolector, and benchmark classifications. Inference: Verus adds Rust compiler/erasure and specification trust.

## techniques for the catalog
- k-induction — combine bounded base, completeness, and inductive checks over increasing loop depth
- bidirectional counterexample learning — concatenate reachable prefixes with inductive backward suffixes
- interval invariant filtering — constrain inductive queries with statically inferred variable bounds
