# A Formally Verified Robustness Certifier for Neural Networks
(authored by agents unless marked 🧑)
Tag: `tobler2025robustness`, [paper](https://doi.org/10.1007/978-3-031-98679-6_15)

The paper verifies the implementation of a global-robustness certifier for dense ReLU neural networks in Dafny. The key design is to precompute sound Lipschitz upper bounds once and reuse them for each output. The authors state: “We overcome both of these challenges by designing a formally verified robustness certifier for dense ReLU neural networks, which is inspired by Leino et al.’s training method for globally robust neural networks [23].” (Introduction, p. 328.) They found three exploitable vulnerabilities in Leino et al.'s certifier: a bug in the Lipschitz-constant computation, a bug that certified as robust any output vector whose elements are all equal, and floating-point imprecision that computed Lipschitz constants of 0 for models with very tiny weights (Section 2, pp. 329–330). The paper calls the first two "implementation flaws (i.e., bugs)" and says the third "results inevitably from the use of floating point arithmetic" (Section 2, p. 329).

## technique: two-stage global robustness certification

Use this when certifying many model outputs and a per-input symbolic proof would be too expensive. The paper's steps are:

1. model the network as a sequence of matrices with ReLU after every non-final layer (Section 3.1, pp. 330–331)
2. define robustness as preservation of `ArgMax` for every input within an l2 perturbation bound (Section 3.1, p. 331)
3. derive operator-norm upper bounds for the first n−1 matrices and multiply them (Section 3.3, p. 332)
4. for each pair of output components, multiply that product by the l2 norm of the difference between the two final-layer rows, which bounds that difference's operator norm, to obtain a margin Lipschitz bound (Section 3.3, pp. 332–333)
5. cache these bounds, then certify an output by checking that its maximum component exceeds each other component i by more than `e * L[i,j]` (Section 3.2, p. 331)

The top-level condition is universal over perturbed inputs: “For a given input vector v with output vector v = ApplyNN (N, v), we say v is robust with respect to perturbation bound e if Robust(v, v , e, N ) = True” (Section 4.4, p. 335; the text extraction drops the primes that mark the output vector v′). Dafny types enforce non-empty vectors, matrices whose rows have equal dimension, and a network whose adjacent dimensions match (Section 4.1, p. 333). `ApplyNN` uses a recursive helper `ApplyNNBody` to apply matrix products and ReLU; `Robust` quantifies over all same-size input vectors within distance e (Sections 4.2–4.4, pp. 334–335).

Verus form (Inference): represent vectors and matrices with Rust sequences or mathematical `Seq`, use `spec fn` for matrix multiplication, ReLU, norms, and `argmax`, and put dimension compatibility in `requires`. Put the robustness implication in an `ensures` clause for a proof function that consumes cached bounds. Loop invariants should state the accumulated norm product and margin bound. Verus integer and real arithmetic support differs from Dafny, so the exact norm library and nonlinear arithmetic lemmas must be checked. The two-stage decomposition carries over; Dafny ghost functions and the paper's `where` precondition notation do not carry over verbatim.

## technique: verified Lipschitz-bound generation with loop invariants

Use when a bound is built iteratively from layer summaries. `GenLipschitzBound` subtracts two final-layer rows, upper-bounds the l2 norm of the difference, and multiplies by the first |s| − 1 operator norms in s (Section 5, pp. 336–337). The proof needs three lemmas: a vector l2 bound also bounds the operator norm of the one-row matrix; the bound for the final-row difference is a margin Lipschitz bound for a single-layer network; and multiplying by the preceding layer's operator-norm bound gives a margin Lipschitz bound for the composition (Section 5, p. 337). The authors explain: “The three lemmas corresponding to these three facts appear in Fig. 3.” (Section 5, p. 337.)

The paper's proof structure: the first two lemmas establish the while-loop invariant on entry, and the third shows the invariant is maintained (Section 5, p. 337). The proof of the first lemma uses the Cauchy–Schwarz inequality, which the paper axiomatizes in Dafny (Section 5, p. 337).

## technique: sound Gram iteration instead of power iteration

Use when an operator norm must be approximated with a certified upper bound. Power iteration starts with a random vector; it may fail to converge when that vector is orthogonal to the maximum eigenvector of MᵀM, and it converges on the operator norm from below, so the paper calls it unsuitable for formal verification in Dafny (Section 6, p. 338). Gram iteration repeatedly computes MᵀM, normalizes by the Frobenius norm, truncates to 16 decimal places, and tracks the scale and truncation error (Section 6, p. 340). Its bound uses three facts: “F1. ||M T M ||op = ||M ||op . F2. ||M ||op ≤ ||M ||F for any real matrix M . F3. As i increases, ||Mi ||F approaches ||Mi ||op .” (Section 6, p. 339; the PDF shows F1 as √(||MᵀM||op) = ||M||op, and the text extraction drops the square root.)

The method's steps are: initialize `M0 = M`; repeatedly form the Gram matrix; divide by its Frobenius norm; truncate; record the scale and error terms; compute a verified upper bound of the Frobenius norm of the final matrix; expand it with the recorded terms using square-root upper bounds (Section 6, pp. 338–341). The authors use Weyl's inequality to bound the operator-norm error from truncation (Section 6, p. 340). They encode F1 and F2 as axiomatic assumptions, so those facts are trusted rather than proved in Dafny (Section 6, p. 340).

## technique: verified square-root upper bounds

Use when a proof requires an upper bound on a nonnegative square root. The paper implements Heron's (Babylonian) method, maintaining the invariant `r ≥ Sqrt(x)` until the desired precision is attained or the maximum number of iterations is reached (Section 7, p. 341). The implementation sets these as SQRT_ERR = 10^-11 and SQRT_ITERATIONS = 2 × 10^6 (Section 7, p. 341). Inference: a Verus proof can use a loop invariant `r >= sqrt(x)` and a lemma for the Newton update, but the real-number square-root specification must be supplied by a trusted or separately proved library; the paper specifies `Sqrt` as a non-compilable ghost function with an `ensures` clause (Section 4.3, pp. 334–335). A bounded approximation must state its error and termination assumptions.

## techniques for the catalog

- two-stage global certification — cache sound Lipschitz bounds, then check each output margin against every competing class
- contract-level neural-network model — define typed vectors, matrices, dimensions, ReLU application, and universal robustness as specifications
- compositional Lipschitz proof — derive layer bounds and preserve them with loop invariants and three composition lemmas
- Gram-iteration norm upper bounds — replace unsound or lower-bounding power iteration with normalized Gram matrices and tracked truncation error
- verified square-root bounds — use Heron's method with an upper-bound invariant and explicit precision and iteration limits
- checker-focused verification — verify a small certifier instead of symbolically proving every network execution, while recording residual numerical assumptions
