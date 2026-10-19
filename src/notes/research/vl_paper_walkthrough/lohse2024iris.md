# An Iris for Expected Cost Analysis
(authored by agents unless marked 🧑)
Tag: `lohse2024iris`, [paper](https://arxiv.org/abs/2406.00884)

## scope and contribution

ExpIris extends the Iris separation logic with expected-cost reasoning for probabilistic programs. The report says: “We present ExpIris, a separation logic framework for the (amortized) expected cost analysis of probabilistic programs.” (Abstract, p. 1) It is parameterized by language and cost model and supports imperative and functional programs, concurrency, higher-order functions, and higher-order state (Abstract and Section 1, pp. 1–2). The mechanization is in Coq and adapts Iris Proof Mode with tactics for potential manipulation (Section 1, p. 2).

The central device is expected potential: “Potential can be seen as a ghost “currency” that pays for operations that induce cost.” (Section 1, p. 1) At a probabilistic branch, potential can be distributed among outcomes provided its expected value does not increase. For a fair coin and potential 2, the heads case may receive 1 and tails 3 because the expectation remains 2 (Section 1, p. 2).

Inference: this paper is about probabilistic cost logic, not Rust or Verus. Its useful VL lesson is a resource accounting pattern for randomized or cost-sensitive code; a Verus encoding would be a mathematical ghost model and contract proof, not a direct port of Iris modalities.

## technique 1: potential-based expected-cost proof

What it proves. ExpIris’s weakest precondition has initial potential `p` and a potential-valued postcondition. The notation `$p wp e {P, Φ}` means that `p` covers expected cost and, on termination with value `v`, at least potential `P(v)` remains while postcondition `Φ(v)` holds (Section 4, p. 8). The adequacy theorem then connects the logic to execution: “Adequacy states, amongst others, that proving a weakest precondition in ExpIris ensures that the expected cost does indeed not exceed the stated bound after n steps of program execution (for any n).” (Section 3.1, p. 5)

How to apply it.

1. Define the probabilistic language’s states, values, reductions, nonnegative step costs, and finite-support distributions (Definitions 3.1–3.2, p. 5)
2. Pick an initial potential large enough to pay expected costs and a postcondition potential for modular composition (Section 4, p. 8)
3. Prove the weakest precondition using Iris resource ownership and program rules (Section 4, pp. 8–10)
4. Deduct the step’s expected cost, then assign potential to each outcome so its expected value does not exceed the remainder. Within each outcome, divide its potential between the continuing thread and any forked threads, with total allocation no greater than that outcome’s potential (Section 4.2, pp. 11–12)
5. Establish the initial state interpretation and apply adequacy to obtain the main thread’s postcondition, progress for all threads, and the expected-cost bound after up to any finite number of steps (Theorem 5.2, p. 15)

The coin-toss example starts with two units, spends one on `tick`, then gives heads potential 0 and tails 2. Its proof leaves two goals, one trivial and one discharged by Löb induction (Section 1.1, pp. 2–3). The Coq proof body is three lines (Section 4.3, p. 14):

```coq
  wp_pures. iLob as "IH". wp_tick. iNext. wp_pures.
  wp_choose_uniform (fun v, match v with | #true => 2 | _ => 0 end).
  repeat iSplit; (auto || by wp_pures).
```

Inference: for Verus, define an executable cost counter and ghost potential in a mathematical sequence or state model. Use `spec fn` predicates for the accounting relation, `requires` for probability and state assumptions, `ensures` for a bound after one step or a bounded run, and loop `invariant` clauses for preservation. Use `proof fn` lemmas for expectation algebra. This proves a deterministic contract over a chosen finite model; it does not make Verus a probabilistic separation logic.

## technique 2: expected potential at probabilistic choices

For uniform choice from a nonempty list `l`, ExpIris requires a potential `P(v)` for every list entry and the inequality `Σv P(v) ≤ p · length(l)` (Section 4, p. 9). For weighted choice, it requires a nonempty list of pairs, each with positive weight and the normalized condition `Σ r·P(v) / Σr ≤ p` (Section 4, p. 9). The paper explains: “Moreover, we have to show the postcondition for each value in the list.” (Section 4, p. 9)

How to use it is direct: enumerate the finite support, assign each branch a post-choice potential, prove each branch’s postcondition, and discharge the weighted inequality. Inference: a VL agent handling randomized Rust should expose the branch probabilities and denominator explicitly, check that probabilities sum to one, and record the potential allocation as a proof artifact. Inference: Verus arithmetic can prove finite sums over sequences or maps when the model and bounds are explicit, but external random APIs and floating-point behavior must be modeled or left as trusted assumptions.

## technique 3: modular composition with postcondition potential

ExpIris uses `wp-bind` to connect a first computation’s remaining potential to a continuation. The paper states: “The rule wp-bind allows us to reason about a composed expression by reasoning about both parts sequentially.” (Section 4, p. 8) In the toss-and-tick example, the first call returns a value `v` and leaves potential `v`; the continuation spends exactly that potential on `tick v` (Section 4, p. 8).

Inference: the Verus analogue is a chain of `ensures` facts: a function’s postcondition provides the numeric budget required by a subsequent function’s `requires`. A `proof fn` can establish the composition lemma, while executable Rust carries only the actual state and cost. A specification-only potential must remain in ghost/specification code and must not be called at runtime.

## technique 4: amortized data-structure accounting

Each attempted bit flip costs 1 and succeeds with probability `p`: “Each bit flip is repeated until it succeeds.” (Section 6.1, p. 15) The expected cost per completed bit flip is bounded by `1/p`. The proof maintains potential `1/p` for every set bit. A 0-to-1 flip uses an additional `2/p`: half covers its expected cost and half is stored on the new set bit. A 1-to-0 flip uses that bit’s stored potential (Section 6.1, p. 16). For a counter created by `init_counter n` with positive width `n`, `m ∈ N`, and `0 < p < 1`, Theorem 6.1 bounds the expected cost of `m` increments by `2m/p` (p. 16). Lemma 6.2 formalizes the counter relation and says that the post-increment potential is `B(incr vs)/p`, where `B` counts one bits (Section 6.1, p. 16).

Inference: a Verus version can represent bits as a mathematical sequence, define `spec fn bit_count`, and prove an `ensures` relation that updates potential by the change in bit count. A loop `invariant` should state the representation relation between the concrete array and ghost sequence. The probability `0 < p < 1` belongs in `requires`; the expected bound is a theorem over a bounded number of increments.

## technique 5: good/bad pivot decomposition for randomized quicksort

ExpIris proves an expected comparison bound `cost(n) = 2n · (1 + log_{4/3}(n))` for in-place quicksort with distinct values (Theorem 6.3, p. 17). The proof classifies pivots as good when the larger sublist is at most three quarters of the input, and bad otherwise. For `n > 0` and `n/4 ≤ k ≤ 3n/4`, good splits satisfy `cost(k)+cost(n−k) ≤ cost(n)−3n`. For `0 < k ≤ n`, every split satisfies `cost(k)+cost(n−k) ≤ cost(n)` (Lemmas 6.4–6.5, p. 17). At least `floor(n/2)` pivots are good; for `n ≥ 2`, this is at least `n/3`. The proof allocates `n + cost(k) + cost(n−k)` to pivot rank `k`: `n` pays for partition and the other terms pay for the recursive calls. The average allocation is at most `cost(n)` (Section 6.2, p. 18). Theorem 6.3 has postcondition `True`; it states a comparison-cost bound rather than a sorting postcondition.

Inference: in Verus, encode `cost` and list-length facts as `spec fn`s and prove the two split lemmas as `proof fn`s. The executable partition function needs a functional `ensures` relation connecting output segments to the input permutation and pivot ordering; a loop `invariant` carries segment bounds. Random pivot selection cannot be proved as a distribution without an explicit probabilistic model, so the expected theorem remains a ghost theorem over the finite pivot set.

## adequacy, limitations, and trust

For execution of the initial expression through up to any finite number of steps, Theorem 5.2 gives three claims: the main thread satisfies its postcondition if it has terminated in a value, no thread gets stuck, and expected accumulated cost plus the main thread’s postcondition potential (when it has terminated) is at most initial potential plus initial cost (p. 15). Section 5 clarifies: “Note that the potential postcondition only applies to the main thread” (p. 14). The proof relies on Coq, Iris’s base logic, the operational semantics, finite-support distributions, and the chosen cost model. It excludes Iris prophecy variables and later credits (Section 4.2, p. 11).

A stated limitation is that potential is a parameter of the weakest precondition rather than a logic resource: “it is impossible to make the postcondition potential depend on the final state that the program terminates in while adhering to standard Iris convention.” (Section 7, p. 18) The authors’ example needs final potential equal to a heap value and cannot be expressed; they are exploring probabilistic resources in the base logic (Section 7, p. 18).

Inference: for VL, the threat is conceptual overclaiming. A Verus proof of a cost contract does not establish that a runtime random source follows the modeled distribution, that floating-point probabilities are exact, or that the cost model matches product latency. The paper’s separation between operational semantics, logic proof, and adequacy theorem should be preserved. VL should not redo generic expected-potential reasoning; it should focus on a sound Rust model, explicit random-source assumptions, and measurable correspondence between ghost cost and deployed behavior.

## techniques for the catalog

- expected-potential accounting — attach ghost potential to a weakest precondition and spend it on expected costs
- branch-wise potential distribution — assign outcome potentials whose probability-weighted average stays within budget
- modular potential composition — pass remaining potential from one computation to the next with a bind rule
- binary-counter amortization — store `1/p` potential per set bit to pay probabilistic flips
- good/bad pivot decomposition — bound randomized quicksort by averaging stronger good-split and weaker bad-split inequalities
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This can be done in any way, as long as the expected value does not exceed the remaining potential."): checked every quotation, number, section and page reference, technique step, and the scope of the stated theorems; corrected the paper link, quotations, page references, potential-allocation steps, counter assumptions, and main-thread adequacy claim; did not check the Coq artifact or validate the proposed Verus adaptations.
