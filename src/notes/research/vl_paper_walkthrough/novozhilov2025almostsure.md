# On the Almost-Sure Termination of Probabilistic Counter Programs
(authored by agents unless marked 🧑)
Tag: `novozhilov2025almostsure`, [paper](https://www.semanticscholar.org/paper/4619f2b1c9dc6c5e9b0c33d37efca13cc7226364)

## result and scope

Novozhilov et al. define k-dimensional probabilistic counter programs (k-d PCPs), where counters are integers and updates have the form `x := x + c`. A PCP induces a countably infinite Markov chain. The paper proves universal almost-sure termination (AST) and positive almost-sure termination (PAST) undecidable for general k, but decidable for one-dimensional PCPs and several essentially one-dimensional fragments. The abstract states: “We present an efficient decision procedure for the latter leveraging the technique of Markov chain finitization.” (Abstract, p. 82). It also says the experiments certify programs “without resorting to invariants or supermartingales.” (Abstract, p. 82)

AST means termination with probability 1; PAST means finite expected runtime. The program model allows polynomial and modulo guards, probabilistic choices, sequential composition, conditionals, and nested loops, but only counting updates. The terminal state is made unique by adding deterministic transitions among terminal counter values until `(s⊥,0)` is reached (Section 3, pp. 87–89).

## technique 1: compile PCP syntax to a probabilistic counter transition system

Use this when a probabilistic program has counting updates and needs a semantic representation suitable for graph analysis. The paper’s first step is mechanical: recursively traverse the program syntax tree, producing a finite-state PCTS whose transitions carry a guard, probability, and update vector. The paper says: “Translating PCPs to PCTSs can be done mechanically by recursively traversing the abstract syntax tree; similar procedures are standard in the literature [11].” (Section 3, p. 88).

The PCTS transition `(s,g,p,u,s')` is enabled when `g(x)` is true; it moves from control state `s` to `s'` with probability `p` and updates counters by `u`. Multi-step updates are split into consecutive unit counting steps. Then construct the Markov chain over `S × Z^k`: for every enabled PCTS transition and valuation `x`, add `((s,x),p,(s',x+u))`. The parity-random-walk example first converts its nonlinear-guard program to this PCTS (Section 2, p. 84).

Verus form. Inference: model the executable Rust state as a datatype containing a control-state enum and counter values, and write a `spec fn` transition relation over old and new states. Inference: a `proof fn` can establish that each executable branch satisfies the transition relation; `requires` and `ensures` carry local pre/post conditions. Inference: Verus does not provide a probabilistic Markov-chain semantics, so probability measures and AST/PAST claims require a separate ghost mathematical model or external checker.

Evidence and limits. The semantic conversion is a definition, not an empirical claim. Its assumptions are integer counters, finite control, and valid probability sums on enabled branches. General PCP termination remains undecidable once multiple counters are allowed (Section 4, p. 89; Section 5, pp. 95–96).

## technique 2: guard analysis and regular/irregular decomposition

For a 1-d PCP, analyze every guard as an eventually periodic predicate. Compute thresholds `δ−, δ+` and periods `T−, T+` such that behavior below `δ−` repeats with period `T−` and behavior above `δ+` repeats with period `T+`. The theorem states: “Then, every guard g ∈ G over the counter x ∈ Z is eventually periodic, i.e., there exist computable thresholds δ−, δ+ ∈ Z (with δ− < δ+) and periods T−, T+ ∈ Z>0 such that …” (Theorem 1, p. 90). The proof uses structural induction: polynomial guards use Cauchy root bounds and period 1; nested `÷` and `mod` expressions are eliminated iteratively (Section 4.1, p. 90).

Use the thresholds to split the induced infinite-state Markov chain into a finite irregular middle component and two infinite regular components: `M = Mreg− ⊎ Mirreg ⊎ Mreg+` (Equation 2, p. 91). The regular parts have bounded counter-step changes and periodic transition matrices, so each is a periodic regular Markov chain. For the parity walk, the computed values are `δ−=0`, `δ+=2`, and `T−=T+=2` (Section 4.1, p. 90).

Verus form. Inference: encode a guard’s periodicity as a `spec fn` predicate and prove a lemma that relates `g(x)` to `g(x±T)` under threshold `requires`. Inference: represent the finite middle region with a ghost `Seq` or finite map and the regular tails with an abstract transition relation; no current Verus construct automatically performs polynomial root bounds or periodicity inference. Inference: the executable program can remain unchanged if the proof only establishes the model’s relation.

## technique 3: finitization by recurrence labels and a coupled chain

The regular tails are infinite, but termination depends only on three labels for each boundary state: transient, positive-recurrent, or null-recurrent. A transient walk can remain in the tail with positive probability; a positive-recurrent walk reaches the boundary with probability 1 in finite expected time; a null-recurrent walk reaches it almost surely but with infinite expected time (Figure 4, p. 85). Replace each regular tail by a finite labeled chain and retain only whether a transition is possible, not its probability. The paper explains: “This is because the (P)AST nature of finite-state MCs does not depend on the concrete probabilities thereof.” (Section 4.2, p. 86).

To label a periodic tail without assuming irreducibility, build a coupled finite Markov chain over `S × {−1,0,1}`. The second component records whether the counter step decreases, stays level, or increases. For each bottom strongly connected component, compute its stationary distribution and imbalance `ν̄ = mass(increasing) − mass(decreasing)`. Positive imbalance labels transient, zero labels null-recurrent, and negative labels positive-recurrent (Section 4.2, pp. 92–94). Dangling states inherit the category of reachable bottom SCCs. Two corner cases are handled: detect trappable finite regions as transient, and use a runway of length `3·|S|` before applying asymptotic labels (Section 4.2, pp. 94–95).

Finally truncate at levels 0 and 1. The runway lemma says only finite walks through the first `3·|S|` levels need be considered to identify possible exits (Section 4.2, p. 95). Combine the two finite tail abstractions with `Mirreg` to obtain `Ṁ`.

Verus form. Inference: encode labels and SCC summaries as ghost enums and prove preservation lemmas over a finite abstract graph. Inference: stationary distributions and imbalance are arithmetic facts that can be discharged by `assert`/`lemma` only for concrete finite matrices; scalable computation should remain an external trusted analyzer whose result is imported as a specification assumption. Inference: a Verus loop invariant can express that a concrete counter walk stays related to its abstract labeled state, but it cannot by itself justify the probabilistic measure.

## technique 4: qualitative reachability decision rules

Run graph reachability on `Ṁ`, ignoring nonzero probability magnitudes. Return non-AST if an initial-reachable state can reach a bottom SCC that cannot reach the unique terminal state. Otherwise return AST but non-PAST if a null-recurrent state is reachable. If neither condition holds, return PAST. Algorithm 1 gives the four steps: `PCP2PCTS`; `GuardAnalysis` and `Decompose`; `Label` and `Abstract`; then reachability tests (Section 4, p. 89). The formal rule is: “If ∃(s′, c′) ∈ Ṡ : (s1, c) →∗ (s′, c′) ∧ (s′, c′) ↛∗ (s⊥, 0), then prog is non-AST.” (Theorem 2, p. 95).

The authors prove termination and correctness of Algorithm 1 and give complexity polynomial in transition-system size, thresholds, and periods plus a stationary-distribution oracle (Theorems 3–4, p. 95). Universal (P)AST follows from eventual periodicity of termination behavior over inputs: enumerate the finite interval between computable input thresholds and periods (Section 4.5, p. 95).

Verus form. Inference: this rule can be encoded as a finite-state ghost reachability proof, with `ensures` stating the returned category for a fixed initial input. Inference: universal input claims require a separately proved periodicity lemma and finite enumeration; a Verus postcondition over one call does not establish all integer inputs. Inference: probabilities and expected runtimes remain outside ordinary Verus integer reasoning.

## technique 5: reduce essentially 1-d multidimensional programs

The paper identifies four reducible classes: all but one counters bounded; monotone counters whose guards depend on one variable at a time; conditionally bounded counters lying in a bounded neighborhood of an affine one-dimensional subspace; and constant-probability programs transformable by a linear substitution (Section 5, p. 96). Reduce each class to a 1-d PCP, then apply the preceding pipeline.

The Zeroconf example has three bounded counters `start`, `established`, and `probe`. Encode them as `z = 16·probe + (start+2) + 4·(established+2)` and recover each counter with `mod` and integer division. The paper gives the transformed initial value `z := 10` and the complete one-counter loop (Section 5, pp. 96–97). Termination then follows automatically from the 1-d analysis.

Verus form. Inference: represent the encoding and decoding as `spec fn`s and prove inverse lemmas with `ensures`; preserve each branch’s counter update through an `assert` of the affine relation. Inference: this is a ghost abstraction unless the product actually stores the packed integer; overflow and Rust integer semantics must be specified explicitly. Inference: boundedness checks may require invariant synthesis, which the paper says can use Farkas-lemma reductions but may be incomplete for integer variables (Section 6, p. 97).

## implementation evidence and boundaries

Pastry is a Python prototype using Probably for parsing, SymPy for linear systems, NetworkX for graph analysis, and SciPy sparse matrices, evaluated on an Apple M1 Pro with 16 GB RAM (Section 6, p. 97). Table 1 has 43 benchmark rows. Pastry decides both PAST and AST for all but two; `geometric_gauss` is outside PCPs because it samples continuously, and `polynomial_nast` has nonlinear updates. The table’s timings are total time for both PAST and AST for Pastry, Amber, and KoAT1, but PAST-only for KoAT2 and Absynth (Table 1, p. 98). Pastry is slower on some multidimensional cases because graph construction is unoptimized (Section 6, p. 99). The parameter study reports expected analysis complexity `O(β²)+O(|α·β|)` for a random walk whose step size is β (Section 6, p. 99).

The result proves decidability and algorithmic correctness for the stated classes, not a verified implementation of Pastry or a proof that its Python dependencies are sound. Inference: the threat to agent-written verified Rust is moderate for randomized or probabilistic protocols: the mathematical reduction can classify termination, but it does not prove functional correctness, memory safety, or the probability model of a Rust implementation. Inference: VL should treat Pastry’s output as an external certificate and independently verify the finite abstraction and encoding assumptions.

Prior work already covers supermartingale, invariant, probabilistic pushdown, and expected-runtime techniques (Sections 1 and 7, pp. 82, 99–100). VL should not redo a generic ranking-supermartingale synthesizer; the distinct reusable idea is periodic Markov-chain reduction with explicit treatment of null recurrence.

## techniques for the catalog

- pcp-to-pcts compilation — recursively translate probabilistic counter syntax into guarded finite-control transitions
- guard periodicity analysis — compute thresholds and periods for nonlinear/modulo one-counter guards
- regular-chain finitization — split finite middle and periodic tails, label recurrence, and truncate with a bounded runway
- coupled-chain imbalance — use SCC stationary distributions and increase/decrease imbalance to classify tail recurrence
- qualitative AST/PAST reachability — decide non-AST, AST-only, or PAST from bottom SCC and null-recurrence reachability
- essentially one-dimensional reduction — pack bounded, monotone, affine-bounded, or constant-probability multidimensional counters into one counter

Checked 2026-10-15 against the paper by a Codex agent for on_the_almost_sure_termination_of_probab_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
