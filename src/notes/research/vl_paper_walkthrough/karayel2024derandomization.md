# Derandomization with Pseudorandomness
(authored by agents unless marked 🧑)
Tag: `karayel2025derandomization`, [paper](https://doi.org/10.46298/afm.13477)

## scope and result

Karayel develops an Isabelle/HOL library for composable pseudorandom objects and uses it to verify derandomized randomized algorithms. The running example estimates the second frequency moment `F2` of a stream. Replacing a fully random sign function with a 4-wise independent hash family reduces total memory from `O(n + ln m)` to `O(ln n + ln m)` while preserving the expectation and variance bound. Here `n` is the universe size and `m` the stream length; the stored sign-function seed shrinks from `n` bits to `O(ln n)` bits (section 1, pages 59–60). The library formalizes non-prime finite fields, hash families, strongly explicit expander graphs, random-walk tail bounds, and a final composed estimator.

The design principle is abstraction: “This work shows how advanced randomized algorithms can be expressed and verified in Isabelle/HOL [NPW02] (and in general in every proof assistant), through the use of a composable pseudorandom objects library.” (section 1, page 58). The examples are verified in Isabelle, and the supporting libraries exceed 16,300 lines (section 1, page 61).

## technique: represent random objects as composable seeds

What it is: an Isabelle record stores the last seed index and a selector function, so a non-empty finite multiset can be sampled as a probability mass function. Different seeds may select the same value; sampling is uniform over seeds, not necessarily over distinct outputs (section 4, page 67). Primitive objects include lists `L`, finite naturals `N`, and products; combinators build larger objects while preserving a sampling interface.

Steps: (1) define `pseudorandom_object` with `pro_last` and `pro_select`; (2) define `sample_pro P` as a uniform seed mapped through `pro_select`; (3) prove each primitive's distribution; (4) compose objects using products or higher-level constructors; (5) state algorithm theorems over `sample_pro` rather than implementation details. The paper notes, “While we will keep explicitly using the term sample_pro, it is actually defined as a coercion.” (section 4, page 67).

Inference: a possible Verus representation is a struct containing a last seed index and a deterministic selector. Functional lemmas could describe selectors, while a separate probability model would define uniform seed sampling. This is a proposed translation, not a result checked in Verus.

Evidence: the same interface lets the paper lift inner-object theorems to chained objects in sections 5–7. Section 5, page 70, explains that the hash-family theorem is expressed using the inner object's sampling distribution; section 6.4, page 81, does the same for expander walks.

## technique: replace full randomness with k-wise hash families

For the streaming estimator, choose `h:U→{-1,1}` and return `(Σ_i h(x_i))²`. Pairwise independence proves the expectation equals `F2`; 4-wise independence bounds variance by `2F2²`. The paper then uses `H 4 n (L [1,-1])`, whose seed is logarithmic. A Carter–Wegman family samples degree-`<k` polynomials over a finite field; any `k` distinct inputs with prescribed outputs determine exactly one such polynomial, yielding k-wise independence.

Steps: (1) identify the highest product moment in the proof; (2) choose k-wise independence at least that high (4 for the variance proof); (3) construct the family from polynomial coefficients; (4) represent it as a seed-indexed pseudorandom object; (5) restate the algorithm by `sample_pro`; (6) reuse the expectation and variance lemmas. The paper says, “The new algorithm has the same properties as example_1 (i.e., satisfying Eq. 1.1 and 1.2) but requires only O(ln n + ln m) bits of memory.” (section 1, page 60).

Inference: a possible Verus translation would represent coefficients explicitly and prove a counting lemma for evaluations at distinct inputs. A probability model would still be needed to connect that count to uniform seed sampling. The paper does not implement or validate this translation.

Limits: the range's seed-space size must be a prime power for the library's chained hash constructor. Finite-field construction is verified supporting mathematics, not an unproved assumption of the hash-family construction (section 5.1, pages 70–71).

## technique: formalize finite fields and almost-sure sampling

For prime `p`, construct `GF(p^k)` by quotienting `GF(p)[X]` by an irreducible polynomial of degree `k`. The library formalizes Gauss's count, Frobenius, Rabin's test, field operations, Euclidean inversion, and binary exponentiation. It provides a random sampler that repeatedly chooses a polynomial and tests irreducibility. This partial function terminates almost surely, rather than unconditionally: “Note that the algorithm does not terminate unconditionally, but only almost surely, i.e., the probability that it does not terminate is 0.” (section 5.1, page 71).

Steps: sample a monic polynomial of the desired degree over `GF(p)`, run Rabin's divisibility and coprimality test, return on success, otherwise retry in the SPMF monad; prove probabilistic convergence rather than applying ordinary induction to this partial function. Section 5.1, pages 70–72, gives irreducibility probability at least `1/(2k)` for degree `k`, hence expected iteration count `O(k)`. The deterministic `H` chooses the lexicographically smallest irreducible polynomial; the randomized `H P` constructor uses monadic application and retains the asymptotic expected coin-flip count. Inference: a Verus port would need a probability model to state this termination guarantee; imposing a retry bound would change the algorithm.

## technique: expander walks for low-randomness sampling

An expander family here is an infinite sequence of undirected `d`-regular graphs with a common expansion bound and sizes satisfying `|Gi| < |Gi+1| ≤ |Gi|²`. Parallel edges and self-loops are allowed (section 6, page 72). A random walk approximates independent sampling: for marked fraction `μ`, the deviation bound includes an additive `λa(G)` term, while coin flips fall from `O(l ln |G|)` to `O(ln |G| + l ln d)` (section 6, pages 74–75). The formalization uses variational eigenvalue definitions to avoid a type-size precondition and proves Cheeger inequalities and Chernoff bounds.

Steps: (1) define regular graph and expansion condition; (2) represent vectors with finite types so dimensions are checked by the type system; (3) define `λa` and `λ2` variationally; (4) prove their equivalence to spectral definitions; (5) construct strongly explicit Margulis–Gabber–Galil graphs; (6) use vertex identification to cover every size and graph powering to improve the spectral bound; (7) define `E l Λ P` as length-`l` walks over the selected graph; (8) instantiate the expander Chernoff theorem. The paper records, “The approach was developed by Harrison [Har05].” (section 6.1, page 76).

Section 6.2, page 77, handles repeated eigenvalue `1` by simultaneously diagonalizing the stochastic matrix and the uniform averaging matrix. Section 6.3, page 78, verifies the Margulis–Gabber–Galil bound `5√2/8`. Section 6.4, pages 79–80, contracts an `n`-vertex graph to any `m` with `n/2 ≤ m ≤ n`, doubles its degree, and bounds its new spectral parameter by `(λa+1)/2`. Graph powering then gives any positive target spectral bound with `ln d ∈ O(ln(λa⁻¹))` as that target tends to zero.

Inference: a Verus translation could track matrix dimensions explicitly, but the spectral and probability results would need corresponding formal foundations or stated assumptions. An adjacency-matrix representation alone would lose the space advantage of generating neighbors without storing the graph.

## technique: compose objects to improve accuracy and failure probability

The paper builds `example_4` by averaging `s=⌈8/ε²⌉` independent 4-wise estimators, proving failure at most `1/4` with Chebyshev. `example_5` replaces independent seeds with a pairwise-independent outer hash family, reducing space to `O(ln n + ε⁻² ln m)`. `example_6` repeats and takes a median, reducing failure to `δ`; `example_7` replaces those repetitions with an expander walk and states the same `δ` bound, subject to the printed constant mismatch described below. The displayed final theorem is `P(|ω−F2 xs| > ε F2 xs) ≤ δ` and lists `set xs ⊆ {0..<n}` as its assumption (section 7, page 86). The excerpt does not display parameter-range assumptions for `ε` and `δ`.

Steps: define the estimator and interval; prove expectation and variance; apply Chebyshev; replace independent seed products by a k-wise combinator and lift component lemmas; apply the median lemma; substitute the expander Chernoff bound. The paper's proof shape explicitly defines `s`, `t`, the interval `I`, and estimator `R` before rewriting the probability event (section 7, pages 82–87).

There is a printed constant mismatch: `example_7` uses `t = ⌈8*ln(1/δ)⌉`, but its proof defines `t` using `32*ln(1/δ)` (page 86) and bounds failure by `exp(−2*t*(1/8)^2)` (page 87). Inference: this proof requires `t ≥ 32 ln(1/δ)` to conclude the stated `δ` bound; it does not justify the printed constant `8`. The reported asymptotic space bound is `O(ln n + ε⁻² ln(δ⁻¹) ln m)` (page 87).

Inference: a Verus port could verify the deterministic sum, square, average, and median computations, then connect them to separate probability lemmas. It would need explicit parameter ranges as well as the stream-domain assumption.

## techniques for the catalog

- composable pseudorandom object — hide finite sampled data behind a seed selector and reusable sampling lemmas
- k-wise hash derandomization — choose independence matching the algorithm's moment proof to reduce seed space
- finite-field foundation — construct non-prime fields and irreducibility tests as verified library infrastructure
- expander-walk sampling — replace independent draws with strongly explicit walks and a spectral tail bound
- estimator composition — combine averaging, pairwise seeds, medians, and expander bounds while lifting component lemmas
