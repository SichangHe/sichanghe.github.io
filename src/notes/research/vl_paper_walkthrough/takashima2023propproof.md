# PropProof: Free Model-Checking Harnesses from PBT
(authored by agents unless marked 🧑)
Tag: `takashima2023propproof`, [paper](https://doi.org/10.1145/3611643.3613863)

## purpose and result

PropProof converts Rust property-based testing (PBT) harnesses written for `proptest` into Kani model-checking harnesses. PBT samples random values; Kani checks symbolic values across the bounded input space. The paper's goal is to let existing tests become formal checks without changing library code or writing Kani-specific harnesses. It reports 42 harnesses from 10 popular crates, two defects found in the AWS PROST protocol-buffer library, and deployment in PROST's continuous integration. “propproof allows a smooth transition from testing to formal verification by not requiring any code changes or annotations.” (Introduction, p. 1)

Kani uses bounded loop unrolling and inserts a poison expression on paths that exceed the bound; if poison is reachable, Kani refuses verification (Background §2.2, p. 3). Inference: a passing harness is a formal result only for the inputs the harness's strategies allow and for the supported language features and data structures, not evidence that unsupported or unbounded behavior was checked.

## technique: symbolic translation of PBT strategies

What it is. PropProof forks `proptest` while retaining its API (§4, p. 5). It replaces random sources with Kani symbolic values and removes the ValueTree mutation loop. Primitive integers therefore become calls to Kani's symbolic-value API. User-defined composite strategies continue to work when their input strategies become symbolic. The paper summarizes the architecture: “Compared with the original proptest, value mutation loop from Fig. 2 is eliminated in favor of running with symbolic inputs.” (PropProof §3, p. 4)

How to apply the paper's method.

1. Keep the existing `proptest!` harness and its assertion. A harness such as `vector_even_sums` generates a vector of length 0–2, maps arbitrary `i32` values by left shift to make even elements, calls `sum`, and asserts `sum % 2 == 0` (Fig. 1, p. 2).
2. Replace each primitive random source with a symbolic source. In the equivalent Kani example, `let len: usize = kani::any();` is constrained with `kani::assume(0..3.contains(len))`; each element is a symbolic `i32` left-shifted by one (Fig. 3, p. 3).
3. Preserve the body under test and the assertion; the paper says “The rest of the body remains identical to the PBT harness.” Kani runs the harness with symbolic inputs covering the whole input space at once (§2.2, p. 3).
4. For weighted choices (`Union`), use a symbolic index to pick the strategy, with one index per strategy, and filter out zero-probability strategies. The paper says this “maintains soundness as any strategy that had a nonzero probability of being picked will still be picked by the symbolic index.” (§3.1, p. 4)
5. For `prop_filter`, replace the generator's retry loop, which Kani cannot verify, with `kani::assume` of the filter condition (§3.1, p. 4).
6. For composite strategies, including user strategies from `prop_compose!`, make the input strategies symbolic; the composing code then needs no change (§3.1, p. 4).

Verus form. Inference: Verus does not use Kani's symbolic execution API, so the direct conversion does not carry over. A Verus harness would write a specification or proof function that quantifies over bounded mathematical values, call the executable function, and use `assert` to state the property. Inference: use `requires` to impose the same input bounds and `ensures` to state the property; use `invariant` on bounded loops when Verus needs a loop fact. Inference: the executable function remains ordinary Rust, while specifications and proof functions are erased or proof-only; do not call a proof function at run time. Inference: unlike Kani's automatic path exploration, Verus requires contracts and invariants that make the symbolic obligations solvable.

Evidence and limits. The evaluation ran Kani 0.20.0 with CBMC 5.75.0 and CaDiCaL on an Intel-10980XE (36 cores, 256 GB RAM), with a 1200-second timeout per target (§4, pp. 5–6). The benchmark has 42 harnesses from crates with at least 1 million downloads, in data-structure, encoding, and cryptography categories, after filtering out features not supported by PropProof or Kani (Experimental Setup §5.1, p. 6). Most verified; two `metered` harnesses timed out because “a symbolic value whose maximum value is 4090 was used as the loop limit” (§5.2, p. 6), and BTreeSet benchmark 22 took 1028.172 seconds (Table 1, p. 7). The paper states that RQ1's conclusion assumes the sampled libraries and harnesses are representative (Threats to Validity §6, p. 9).

## technique: data-structure models that remove symbolic loops

Why it is needed. Naive models of `Vec` and `BTreeSet` create redundant loops, repeated growth, and copying. Kani's loop unrolling can make verification states grow exponentially (§3.2, p. 4). The paper reports that without optimization, two of three selected harnesses ran out of memory even with 230 GB available; the third took roughly 15 times longer and four times the memory (§5.3, p. 9).

How to apply it.

1. Replace the loop that initializes a vector of ValueTrees up to the maximum size with one loop that initializes the data structure with symbolic values, whose iteration count is a symbolic integer inside the requested range (§3.2, p. 5).
2. Pre-allocate a growing data structure to its maximum requested size, avoiding repeated growth and copying (§3.2, p. 5).
3. For BTreeSet, require during the insertion loop that the next element is bigger than the current one. This removes redundant inserts and constrains insertion to ordered paths (§3.2, p. 5).
4. Build the BTreeSet once at initialization and return it directly, rather than repeatedly inserting into an empty set on each `current` call (Fig. 7, p. 6).
5. Inference: for vectors, the same symbolic-size and pre-allocation steps apply, since the paper says the first two apply to all (growing) data structures it supports (§3.2, p. 5).

Evidence. Table 3 reports five-run means and standard deviations. For harness 22, optimized PropProof takes 1021.082 s (σ=4.572) and 27.596 GB (σ=0.051), while the unoptimized version runs out of memory. Harness 28 takes 10.694 s (σ=0.061) and 2.346 GB (σ<0.001), while unoptimized again runs out of memory. Harness 39 takes 14.392 s (σ=0.063) and 4.094 GB (σ<0.001), compared with 232.648 s (σ=34.130) and 18.901 GB (σ=0.917) unoptimized (Table 3, p. 10). For harnesses 22 and 28, Kani logs showed out-of-memory in the pre-processing step of generating verification conditions; for harness 39 verification conditions grew from 9 million to 89 million (§6, p. 9).

Verus form. Inference: Verus proofs should avoid introducing loops solely to enumerate symbolic sizes. Represent a bounded collection with a mathematical sequence or set in the specification and prove the executable loop with an `invariant` relating the prefix to that sequence. Inference: pre-allocation is an implementation optimization, whereas the Verus contract should describe the resulting collection and its ordering. Inference: a BTreeSet-style uniqueness invariant can be expressed as a quantified property in a `spec fn` and established with proof steps, but the paper does not provide Verus code or a direct encoding.

## technique: model-checking-driven bug discovery and patch validation

The author ran unchanged harnesses through PropProof and found two PROST defects although the library is “well-tested with fuzzing and PBT running in CI” (§5.2, p. 7). One timestamp conversion negated `timestamp.seconds`; `i64::MIN` overflows on negation, and since the bug occurs for one `i64` value, uniform random testing is “not practical” for finding it. The patch makes the function return an error (§5.2, p. 9; code in Table 2, p. 8). The second defect failed to check for a negative nanoseconds component when seconds was 0, creating an invalid `std::Duration`; the author filed a report and a patch, which was merged (§5.2, p. 9).

The workflow is: run the existing PBT harness with PropProof; use Kani's concrete crash-inducing inputs to locate the issue; patch the conversion; rerun the same harness; then add PropProof and Kani to CI. The paper reports zero library-side code changes for deployment and 20 lines of CI script for GitHub Actions (§5.4, p. 9). “Kani verified the patch to be formally correct using the same harness, giving us confidence in our fix.” (§5.4, p. 9)

Verus form. Inference: translate the PBT property into a Verus contract such as a round-trip `ensures`, add `requires` excluding invalid representations where the API intentionally rejects them, and prove error behavior for invalid inputs. Inference: Verus's counterexample and failed assertion diagnostics can guide repair, but Verus does not automatically enumerate all bounded bit patterns in the manner of Kani. Inference: keep the harness in CI and rerun Verus after each patch; the accepted contract and any assumptions about standard-library conversions remain trusted inputs.

## what is proved, measured, and trusted

Kani/CBMC checks the generated harness against symbolic inputs within its bounds. The evaluation measures completion time, memory, timeout behavior, discovered defects, and deployment effort. The paper says “Like Kani, propproof has a large Trusted Computing Base, including the library implementation, Kani, CBMC, and the entire CProver toolchain.” (Limitations §6, p. 9) Kani lacks Rust features like async; PropProof does not implement hash-based data structures, arbitrary strings, regex, and string patterns expressing bitstrings and integers (§6, p. 9). Inference: the paper does not show that PBT harness properties capture all requirements, that sampled crates represent all Rust code, or that external dependencies and compiler behavior are correct.

## techniques for the catalog

- symbolic PBT-to-model-checking translation — replace random generators with symbolic values while preserving the test body and assertion
- bounded choice and filter modeling — encode choices with one symbolic index per nonzero-probability strategy and filters with assumptions instead of retry loops
- loop-minimal data-structure models — symbolic size in one loop, pre-allocate, and require ordered BTreeSet insertions to remove redundant inserts
- unchanged-harness verification — run existing PBT properties through a formal backend without library-side edits
- counterexample-guided repair — use concrete model-checker failures to patch code and rerun the same property
- CI integration — add the verifier action beside existing tests with a 20-line CI script
