# CheckDP: An Automated and Integrated Approach for Proving Differential Privacy or Finding Precise Counterexamples
(authored by agents unless marked 🧑)
Tag: `wang2020checkdp`, [paper](https://doi.org/10.1145/2783258.2783379)

## result and scope

Wang, Ding, Kifer, and Zhang present CheckDP, a static-analysis pipeline that either synthesizes a proof of a claimed differential-privacy bound or returns a counterexample. The abstract says: “CheckDP can find counterexamples for mechanisms with subtle bugs for which prior counterexample generators have failed.” The input is source code plus a claimed privacy level; the output is an alignment proof or a pair of related inputs and a feasible output. The supplied arXiv text is the 2020 paper (23,576 extracted words), and sections and page numbers below refer to its PDF.

## technique: translate randomness into alignment templates

Use this for a probabilistic mechanism whose random draws can be related across adjacent inputs. CheckDP first translates the mechanism into non-probabilistic code (§2.5, p. 3; §3). Replace each sampling command with a read from an instrumented sample array. Add one alignment template per draw. Each template contains unknown holes `θ` and becomes an input to the transformed function. Add a variable `vε` for accumulated privacy cost. Insert assertions whose validity implies the original mechanism is private. The paper states: “the transformed code forms the basis for both proof and counterexample generation in CheckDP” (§2.5, p. 4).

For GapSVT, the template for threshold noise uses `A1 = θ[0]`; the query-noise template is selected only when the noisy query exceeds the noisy threshold and uses six more holes (Figure 1, p. 3). The transformed code increments `vε` only on branches that pay privacy cost and asserts both the true and false branch conditions. For an alignment candidate `θ`, soundness is checked by asking whether all transformed assertions hold for every pair of related inputs and every sampled noise vector (§2.5, pp. 3–4).

The method exploits randomness alignment: find an injective map from one run's random values to the other run's values that equalizes outputs and has bounded likelihood ratio. For GapSVT, the paper gives threshold distance `1` and query distance `1−q̂[i]` only on the true branch; returning false has no extra cost (§2.4, p. 3). Inference: a Verus version would keep two ghost states, express adjacency as a `requires` predicate, and prove output equality and a privacy-cost bound with `ensures`; `proof fn` code could establish arithmetic alignment facts. Verus does not provide CheckDP's probabilistic semantics or automatic template search, so an external synthesizer must propose the constants and Verus can check the resulting deterministic obligations.

## technique: bidirectional verify-invalidate search

CheckDP combines two CEGIS-like loops. The verify sub-loop starts with a candidate alignment, asks symbolic execution for an input and sample that falsify a transformed assertion, and records that invalidating triple. It then solves for a new `θ` satisfying all recorded instances. The paper describes the two phases: “(1) Generating invalidating inputs” and “(2) Generating proof candidates” (§2.5, pp. 4–5). KLEE supplies invalidating inputs when possible; a candidate that survives all inputs found so far is sent to CPAChecker for universal verification.

The invalidate sub-loop works in the opposite direction. Given a candidate counterexample input, it searches for an alignment that repairs it; if no alignment exists, it retains the input as a counterexample candidate. The two loops exchange their newest result. This differs from ordinary one-way CEGIS because old counterexamples guide proof synthesis and old proofs guide counterexample search. CheckDP alternates until the verifier proves the candidate, or the exact probabilistic solver PSI validates a remaining counterexample (§4, pp. 5–9). The algorithm can restart if symbolic execution cannot find a new input; the authors report that this “unknown” state never appeared in their evaluation (§4.2, p. 9).

A Verus adaptation would represent each discovered input as a concrete test case and each candidate alignment as a ghost function over two states. `assert` statements can check the candidate on finite cases, while a final `ensures` proof must establish the universal relation. Inference: finite counterexample accumulation alone is not a Verus proof; it is a search aid, and replacing CPAChecker/PSI requires a sound probability model outside ordinary Rust arithmetic.

## technique: exact counterexample validation

When proof search fails to find an alignment, CheckDP emits a pair of neighboring inputs and a feasible output distribution witness. PSI then performs exact symbolic probability checking. For BadGapSVT, the paper gives `T=0`, `N=1`, `q=[0,0,0,0,0]`, `q'=[1,1,1,1,−1]`, and output `[0,0,0,0,1]` (§2.5, p. 5). The bug releases a noisy answer rather than the gap; that reveals the noisy threshold and makes every later false output costly (§2.4, p. 3).

The same pipeline finds subtle wrong-bound claims. Imprecise SVT is actually `ε=1.1`-private but claims `ε=1`; CheckDP treats the claimed bound as an input and searches for a violating event (§5.1, p. 11). Inference: in Verus, a counterexample can be encoded as a concrete failing `assert`, but the exact probability calculation and neighboring-database semantics remain trusted external mathematics.

## evidence and denominators

Table 1 reports nine incorrect mechanisms. CheckDP found a validated counterexample for all nine. Times ranged from 2.0 seconds (BadSVT2) to 14.2 seconds (BadAdaptiveSVT), with 3–8 search iterations; PSI validation is included in the authors' statement that all were found within 15 seconds and eight iterations (§5.2, p. 11). Several sampling baselines needed manually supplied arguments or failed: DP-Finder reported 3,847.5 seconds for BadSVT1 and 11,611.6 seconds for BadGapSVT, while CheckDP took 3.2 and 5.7 seconds on those rows. The paper warns that cited results use different hardware and settings (§5.2, p. 11).

Table 2 reports ten correct mechanisms, including ReportNoisyMax, PartialSum, SmartSum, SVT, monotone SVT (two variants), GapSVT, NumSVT, and AdaptiveSVT. Every row has an automatically generated alignment; times range from 5.6 seconds (PartialSum) to 69.3 seconds (ReportNoisyMax), and the text says all correct examples verify within 70 seconds (§5.2, p. 11). The evaluation uses an Intel Xeon E5-2620 v4 with 64 GB memory. These are 9 incorrect and 10 correct benchmark mechanisms, not all privacy programs. The benchmark excludes iterative programs built on the mechanisms, such as k-means and k-medians (§5.1, p. 10).

The abstract reports “within 70 seconds without any false positives or false negatives.” That denominator is the 19 evaluated mechanisms (9 incorrect plus 10 correct), not a claim about arbitrary mechanisms. Inference: the paper's result is strong evidence for this benchmark family but cannot establish universal completeness, because KLEE may miss search inputs, CPAChecker supports bounded program features, and the paper's exact solver handles only the modeled probability language.

## what is proved and what stays trusted

The proof side is sound conditional on the transformation, alignment semantics, CPAChecker, and PSI. A successful universal assertion proof implies the claimed privacy bound. A validated PSI witness establishes a real violation for the modeled mechanism. KLEE is used for discovery, not final proof. The transformed C verifier and exact solver remain trusted components, as do the source mechanism, adjacency relation, and claimed interpretation of outputs.

Inference: a Verus implementation should separate three artifacts: executable mechanism code, ghost adjacency/alignment specifications, and proof functions that discharge deterministic assertions. Use `requires` for adjacent inputs and `ensures` for equal outputs plus a cost relation; use `assert` and loop `invariant` for branch-specific cost accounting. This structure can check a supplied alignment but does not reproduce CheckDP's probabilistic solver or its bidirectional synthesis.

## prior work and product threat

The paper positions CheckDP against sampling detectors and language-based verifiers. It reports that sampling may run hundreds of thousands of executions, miss infrequent branches, or require manual input settings. CheckDP's integrated search also handles correct and incorrect mechanisms in one workflow. Inference: VL should not redo a generic proof-or-counterexample loop as if it were new. The direct threat to agent-written verified Rust is moderate: CheckDP automates a domain-specific synthesis and validation problem, but it does not write Rust, infer arbitrary system specifications, or prove ownership and memory safety. Its architecture is a useful design pattern for VL's proof attempt plus concrete-failure feedback.

## techniques for the catalog

- probabilistic-to-deterministic translation — replace samples with symbolic inputs, add alignment holes, track privacy cost, and assert a soundness condition
- bidirectional verify-invalidate loop — alternate symbolic invalidating inputs with proof-candidate synthesis until universal verification or a counterexample remains
- exact witness validation — send a candidate neighboring-input/output witness to an exact probabilistic solver
- alignment-sensitive cost accounting — charge only branches whose noise alignment changes, preserving the mechanism's tight bound
- benchmark-denominator discipline — report correct and incorrect mechanism counts, hardware, iteration limits, and per-row seconds
Checked 2026-10-14 against the paper by a Codex agent: audit record wang2020checkdp; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
