# A Formal Proof of PAC Learnability for Decision Stumps
(authored by agents unless marked 🧑)
Tag: `tassarotti2021pac`, [paper](https://doi.org/10.1145/3437992.3439917)

## result and proof architecture
The paper formalizes in Lean (with mathlib) that one-dimensional decision stumps are probably approximately correct (PAC) learnable. A stump labels a real input by comparing it with a threshold: Label(d, x) is 1 if x ≤ d and 0 otherwise (eq. 1, p. 2). The learner picks the maximum training input that has label 1, or 0 if there is none (eq. 2, pp. 2–3). Theorem 2.1 (p. 3) states that for all ε and δ in the open interval (0, 1), if n ≥ ln(δ)/ln(1−ε) − 1 then the probability that the learned classifier has Error ≤ ε is at least 1−δ, for any distribution μ. In the Lean statement `choose_PAC` (section 6.2, p. 9) the hypothesis is `n > complexity ε δ`, where `complexity ε δ = log(δ)/log(1−ε) − 1`, and a vector of type `vec A n` holds n+1 values (section 5, p. 7). The abstract says, “We present a formal proof in Lean of probably approximately correct (PAC) learnability of the concept class of decision stumps.” (abstract, p. 1)

The central engineering technique is a split of the proof into four components: sources of randomness, deterministic properties of the algorithm, measurability, and quantitative probability reasoning (section 4, pp. 5–6). The abstract states, “Our proof is structured so as to separate reasoning about deterministic properties of a learning function from proofs of measurability and analysis of probabilities.” (abstract, p. 1) Section 4 adds that “an analogue of Theorem 2.1 will hold for any other stump learning algorithm with those properties” (p. 6), meaning the two deterministic properties of section 7.

## technique: define the learner as a pure deterministic function
what it is
Given labeled examples, `choose` returns the maximum input among positive examples. It first maps each negative example to 0 and drops labels (`filter`), then takes `max`. The paper formalizes the learner so that it returns a threshold, not a classifier, because there is no standard sigma-algebra on function types (section 5, p. 7).

when to use it
Use this decomposition when an algorithm has a deterministic core but is invoked on random samples. Prove functional properties before introducing probability.

how to do it
1. Define `label target` as a pure function from x to the pair (x, `rle x target`), where `rle x target` is true iff x ≤ target (section 6.2, p. 8).
2. Define `filter` (negative examples become 0, labels dropped) and `choose n` as `max n (filter n data)` over a vector of labeled examples (section 6.2, p. 9).
3. Prove the two deterministic properties (section 7, p. 9). `choose_property_1`: the returned estimate is at most `target`. `choose_property_2`: the returned estimate is at least every positive example.
4. Define the error as the measure of the set where the hypothesis and target labels differ: `error_set h` and `error = λ h, μ (error_set h target)` (section 6.2, p. 8).

Verus form
Inference: Encode labels and threshold selection as executable Rust, with `spec fn` definitions for the classifier and error abstraction. State threshold and positive-example properties in `ensures`; prove them using `proof fn` lemmas. Keep the probability measure ghost/spec-only because Verus does not execute real-valued measure semantics.

evidence and limits
The paper reports, “These proofs are trivial and account for only a very small fraction of the overall proof.” (section 7, p. 9) The theorem assumes a realizable target threshold and an arbitrary probability measure μ on the nonnegative reals. Footnote 1 (p. 3) notes that the operations on real numbers in the algorithm are non-computable. Inference: the result therefore says nothing about floating-point implementations.

## technique: model randomness with the Giry monad
what it is
The Giry monad represents a probability measure as a monadic computation. `ret x` is the measure that returns x with probability 1, and `bind μ f` samples from μ and continues with the measure f(x) (section 6.1, p. 8). The paper defines `map f μ = do x ← μ ; ret (f x)`, and defines the n-fold product measure μⁿ recursively with do-notation (eqs. 15–17, p. 8). The monad laws hold only for measurable f and g.

when to use it
Use a monadic probability model when the algorithm consists of sampling, transforming, and evaluating random values, and you want to avoid carrying an abstract sample space Ω with random variables as functions on it. The paper says that overloading notation for random variables “seems difficult” in a theorem prover (section 6, p. 8).

how to do it
1. Declare the probability measure μ on the thresholds type `H` (nonnegative reals) and the target threshold as Lean section variables (section 6.2, p. 8).
2. Define the n-fold product measure `vec.prob_measure n μ` over dependently typed vectors; the paper omits the Lean definition and gives the recursive do-notation version in eq. 17 (section 6.1, p. 8).
3. Use Giry `map` to push the sample measure through `label_sample target n`, giving a distribution ν on labeled training vectors (section 6.2, p. 9).
4. Use Giry `map` again to push ν through `choose n`, giving the distribution γ on thresholds; `denot` returns γ (section 6.2, p. 9). The Lean definition uses `map` only, not an explicit `bind`.
5. State `choose_PAC` as `(denot μ target n) {h | error μ target h ≤ ε} ≥ 1 − δ` (section 6.2, p. 9).

Verus form
Inference: Represent random sampling by ghost state and a specification relation describing the distribution; use `spec fn` for monadic bind/map laws and `proof fn` lemmas for independence and measurability. Verus can prove algebraic contracts about a sampler but does not provide a probability monad or measure library, so the mathematical library must be built first.

evidence and limits
The paper says, “The Giry monad [18] solves this problem by providing a syntactic sugar to describe stochastic procedures concisely.” (section 6, p. 8) The conclusion says, “We used the Giry monad to keep the formalization simple and close to a pencil-and-paper proof.” (section 11, p. 12) The paper reports no timing and no proof-line total. Inference: the trusted base includes mathlib's measure theory and Lean's kernel; the paper does not discuss its trusted base.

## technique: repair an invalid textbook proof with a supremum interval
what it is
The textbook proof picks θ so that the interval I = [θ, t] “encloses exactly probability ε” under μ. Such a θ may not exist. Counterexample 3.1 (p. 4): μ is Bernoulli with probability .5 of returning 1, t = .5, ε = .25, and Pr(x ∈ [a, t]) is .5 for a ≤ 0 and 0 otherwise. The formal proof instead defines θ as the supremum of the set of d with Pr(x ∈ [d, t]) ≥ ε (eq. 7, p. 5) and shows μ[θ, t] ≥ ε and μ(θ, t] ≤ ε.

when to use it
Use a supremum construction when a probability quantile may not exist because the distribution has atoms (jump discontinuities in its distribution function).

how to do it
1. Split on whether μ(0, target] ≤ ε (section 9, p. 10). In that case `always_succeed` shows the error is at most ε, because the error interval is a subset of (0, target].
2. Otherwise, take θ = sup{x | μ[x, target] ≥ ε}. The set is nonempty because it contains 0, and bounded above by `target` (`extend_to_epsilon_1`, section 9, p. 10).
3. Prove μ[θ, target] ≥ ε using continuity from above of measures on an increasing sequence xₙ → θ. Prove μ(θ, target] ≤ ε by the dual argument using continuity from below (section 9, pp. 10–11).
4. `miss_prob`: if μ[θ, target] ≥ ε, the measure of examples that `choose` maps below θ is at most 1−ε. `all_missed`: if μ(θ, target] ≤ ε, an error above ε implies all training examples map below θ (section 9, p. 11).
5. By independence, the probability that all n+1 examples map below θ is at most (1−ε)^(n+1). `complexity_enough` shows (1−ε)^(n+1) ≤ δ when n > `complexity ε δ`, which concludes the PAC bound (section 9, p. 11).

Verus form
Inference: Model θ as a ghost real satisfying supremum characterization predicates. Prove interval-measure inequalities with `proof fn` lemmas and state the sample-miss bound as a contract parameterized by n, ε, and δ. Verus's arithmetic solver will need explicit monotonicity and continuity lemmas; these are not automatic.

evidence and limits
The paper identifies textbook errors: “In spite of the seeming simplicity of this example, all three of the cited textbooks either give an incorrect proof of this result or omit what we found to be the most technically challenging part of the proof (Section 3).” (section 1, p. 2) Section 3 (p. 4) says that the textbook phrasing “encloses exactly” comes from Kearns and Vazirani, and Shalev-Shwartz and Ben-David say the probability “is exactly” ε; footnote 4 (p. 4) says Mohri et al.'s errata for the first printing pointed out the issue in Kearns and Vazirani's proof. The textbooks treat axis-aligned rectangles, not stumps (footnote 3). The paper calls this “the most difficult part of the whole proof to formalize” (section 3, p. 5). The corrected proof covers arbitrary probability measures, not only continuous ones. No empirical success rate applies; the evidence is a checked theorem in Lean.

## technique: typeclass-driven measurability proofs
what it is
Lean typeclasses attach a default structure, here a sigma-algebra, to a type. mathlib derives `measurable_space` instances automatically, for example the Borel sigma-algebra from a topology and the product sigma-algebra on a product type (section 5, p. 7). The authors write: “with Lean’s typeclass mechanism and other proof automation, we can mostly separate the parts of the proof concerning measurability from the rest of the argument” (section 4, p. 6). The measurability lemmas are `choose_measurable` and `error_measurable`, proved separately from the probability inequalities.

when to use it
Use typeclass inference when many routine side conditions recur and the underlying library has compositional closure lemmas.

how to do it
1. Declare `H := nnreal` with a Borel `measurable_space` instance, and derive instances for `H × bool` and for `vec H n` (section 5, p. 7).
2. Prove `choose_measurable`: `max` is continuous, hence Borel measurable. This depends on the sigma-algebra on `vec H n` being the Borel one. The paper notes that the product sigma-algebra is the same because the nonnegative reals have a countable basis, which resolves a typeclass coherence ambiguity (section 8, p. 10).
3. Prove `error_measurable`: by `error_interval_1` and `error_interval_2`, the error is a difference of values of λx. μ[0, x]. Subtraction and the test of `≤ target` are measurable, and λx. μ[0, x] is Borel measurable because it is monotone (section 8, pp. 9–10).
4. The paper states that the λx. μ[0, x] measurability fact “was missing from mathlib” (section 8, p. 10).

Verus form
Inference: Encode measurable predicates as ghost/spec traits with lemma methods; use `requires` to demand closure facts and `ensures` to return measurable-event predicates. Verus has no Lean typeclass mechanism assumed here, so trait-based specifications or explicit lemma parameters are safer.

evidence and limits
The paper reports, “About a quarter of the formalization consists in proving that various sets and functions are measurable.” (section 8, p. 9) It also says these proofs “can be long but are generally routine, with a few notable exceptions.” The paper gives no line count for the formalization.

## techniques for the catalog
- deterministic/probabilistic split — prove learner facts before measurability and probability
- Giry monad modeling — represent sampling and transformations as measurable monadic computations
- supremum quantile repair — handle atomic distributions without assuming an exact ε-quantile
- typeclass measurability — compose library closure facts to discharge routine measurable-event obligations
