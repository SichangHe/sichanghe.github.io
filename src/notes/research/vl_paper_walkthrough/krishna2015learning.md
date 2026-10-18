# Learning Invariants using Decision Trees
(authored by agents unless marked 🧑)
Tag: `krishna2015learning`, [paper](https://arxiv.org/abs/1501.04725)

## what the paper proves and measures

The paper treats invariant inference as binary classification. Its states are program states; sampled reachable safe states receive the good label, while sampled states that can lead to an assertion failure receive the bad label. A classifier that separates the labels is a candidate invariant, but it becomes a verified invariant only after checking initiation, preservation, and safety. The paper states: “The problem of inferring an inductive invariant for verifying program safety can be formulated in terms of binary classification.” (abstract, p. 1)

The transition-system model is (P=(S,R,init,safe)). The paper defines good as the least fixed point of `init` and forward successors, and bad as the least fixed point of error states and backward predecessors. A safe inductive invariant `inv` must satisfy `init ⊆ inv`, `post(inv) ⊆ inv`, and `inv ⊆ safe` (Section 3, p. 5). This separates the reachable good states from states that can reach an error. The paper explicitly warns that a sampled state in both classes means no safe invariant exists and the program is unsafe under this model (Section 3, p. 6).

## technique: decision-tree invariant learning

what it is and when to use it

A decision tree represents a Boolean combination of threshold tests. The authors use it to learn arbitrary Boolean combinations of linear inequalities, including finite unions of polyhedra. The paper's motivation is that “for efficiency reasons, many static analyses are restricted to inferring conjunctive invariants in practice” (Section 6, p. 14), whereas its learner targets “invariants with a complex Boolean structure” (Section 6, p. 14). “The learned classifier then represents a candidate invariant, which is proved safe using a static analysis or theorem prover.” (Section 1, pp. 1–2)

how to do it

1. Define the program transition system and safety assertion (Section 3, p. 5).
2. Sample good states by running the program from states satisfying its precondition. Sample bad states by running the program from nearby states and retaining paths that reach a failed assertion (Section 2, pp. 3–4; Section 5.1, p. 9).
3. Choose a set of feature slopes from an abstract domain. The default is the octagon domain, whose inequalities have coefficients in `{-1,0,1}` on at most two variables (Sections 2 and 5.1, pp. 4, 10).
4. Transform each sample point `x` into feature values `z_i = x · w_i`, where `w_i` is a selected slope (Section 2, p. 4).
5. Train a binary decision tree on the transformed points. At each node, greedily choose a feature and threshold that best separates good and bad samples. The implementation uses CART and the Gini index (Sections 3 and 5.1, pp. 6–7, 9).
6. Convert every path ending in a good leaf into a conjunction of its tests, then disjoin those path formulas. The paper gives the recursive procedure `DTtoForm` in Algorithm 1 (Section 4, pp. 7–8).
7. Translate each transformed test `z_i ≤ c` back to `x · w_i ≤ c`, annotate the program with the resulting formula, and call `IsInvariant` to check all three inductiveness conditions (Section 4, p. 8).
8. Return the formula only if verification succeeds; otherwise return failure (Algorithm 1, p. 7).

The paper's worked example (Fig. 1) assumes `x = 0 ∧ y ≠ 0`, samples good and bad states, and learns a tree whose two threshold tests are both on the feature `z4 = x+y`; it simplifies the resulting disjunction to `x+y ≠ 0` (Section 2, pp. 3–5, Fig. 2). The paper gives this exact candidate: “(x + y ≤ −0.5) ∨ (x + y > −0.5 ∧ x + y > 0.5). This can be simplified to (x + y ≠ 0).” (Section 2, p. 4)

Verus form

Inference: represent the learned predicate as a `spec fn`, put it in the loop's `invariant` clause, and let Verus prove initialization, preservation, and the assertion. A direct shape for the example is:

```rust
use vstd::prelude::*;
verus! {

spec fn inv(x: int, y: int) -> bool { x + y != 0 }

fn example(x0: i64, y0: i64)
    requires x0 == 0, y0 != 0, -1000 <= y0 <= 1000
{
    let mut x = x0;
    let mut y = y0;
    while y != 0
        invariant
            inv(x as int, y as int),
            x + y == y0,            // bookkeeping so that i64 arithmetic cannot overflow
            -1000 <= y <= 1000,
    {
        if y < 0 {
            x = x - 1;
            y = y + 1;
        } else {
            x = x + 1;
            y = y - 1;
        }
    }
    assert(x != 0);
}

} // verus!
```
Inference: this sketch has not been run through Verus (no Verus installation was available when this study was checked). Verus `int` is ghost-only, so the executable function uses `i64` with explicit bounds; the paper's program is over unbounded integers.

Inference: the tree learner and sampler remain an external preprocessing tool; Verus checks the generated predicate against the actual Rust loop. Inference: a learned real-valued threshold must be converted to an exact integer predicate before use on integer Rust variables, and the conversion must preserve the intended boundary. Inference: if the generated Boolean formula is large, split it into named `spec fn`s or prove helper facts with `proof fn`s so that Verus can discharge the arithmetic obligations.

what the evidence shows

The algorithm is sound conditional on a correct `IsInvariant`: “Thus, we can say that our invariant generation procedure DTInv is sound: if it terminates successfully, it returns a safe inductive invariant.” (Section 4, p. 8) The evaluation used 22 challenging benchmarks: “We chose the benchmarks at random among those that were hard for at least one other tool to solve.” (Section 5.2, p. 11) The authors ran on a quad-core 3.40GHz CPU with 16GB RAM, with a memory limit of 8GB and a timeout of 5 minutes per benchmark (Section 5.2, p. 11). The paper states that MCMC was run 5 times per benchmark; it does not state how many runs DTInv received. The denominator is 22 benchmarks, not a random program population; the paper says that, due to the selection bias, its results “do not reflect the average performance of the tools that we compare against” (Section 5.2, p. 11).

For DTInv, Table 1 reports times in seconds in columns “Samp” (sampling), “DT” (tree learning) and “DTInv” (“the total time of our tool”); the total is about the sum of the first two, and the paper does not say how verification time is counted. DTInv has a numeric time, meaning a safe invariant was found, on all 22 listed benchmarks, including octagonal, non-octagonal, modulus, and quadratic cases. Examples include `gopan` in 0.03 s, `prog4` in 2.34 s, `hola34` in 1.17 s, and `square` in 0.51 s (Table 1, p. 12). The `square` entry is a quadratic invariant with three predicates; `hola02`, `hola06`, and `hola22` are modulus cases. The table marks tools with `F` (terminated without finding a safe invariant), `TO` (timeout), `MO` (out of memory) or `NA` (unsupported arithmetic); these are per-benchmark outcomes under the stated limits, not proof percentages (Table 1 caption, p. 12).

where it fails or what it assumes

The paper says that “if the sample is inadequate, it is impossible for the DT learner to learn the underlying invariant” (Section 4, p. 8), and also: “It must be noted that one key assumption of this model is that the sample data is drawn from the same distribution as the underlying data, an assumption that is hard to justify in most of its applications, including this one.” (Section 4, p. 8) The authors describe a possible refinement loop in which a failed proof supplies a counterexample for new samples, but say “we find in practice that we do not need a refinement loop if our sample set is large enough” (Section 4, p. 8) and that their experiments did not need one (Section 6, p. 13). Their binary-classification formulation does not handle counterexamples expressed as implication constraints, which ICE learning does (Section 6, p. 13).

## technique: sampling good and bad states

what it is and when to use it

Sampling supplies the labeled examples from which the tree is learned. Good states are forward-reachable states from valid initial states. Bad states are states from which bounded execution reaches a failed assertion (Section 2, pp. 3–4). Inference: the method is practical for programs whose relevant states can be explored within finite bounds, and incomplete when the bounds do not cover a needed path.

how to do it

The implementation enumerates all precondition-satisfying states with each variable in `[-L,L]`, executes each for at most `I` loop iterations, and records every reached state as good. It then examines states at margin `M` from every good state, executes them with the same iteration bound, and records paths that fail an assertion as bad (Section 5.1, p. 9). The bounds `L`, `I`, and `M` start small and increase until the sampled candidate can be proved correct. The paper's own description is: “The bounds L, I, M were initialized to low values and increased until we had sampled enough states to prove our program correct.” (Section 5.1, p. 9)

Verus form

Inference: implement the sampler outside the verified Rust artifact, then treat its output as candidate data. Verus should not assume that sampled states are exhaustive; the loop invariant and contracts must establish the property for every state satisfying the precondition. Inference: a Verus workflow can use generated candidate invariants from this sampler, but the proof obligation remains universal and therefore catches unsampled counterexamples when the candidate is too weak.

what the evidence shows and limits

Sampling dominates DTInv time on `fig1` and `prog4`; the authors identify the naive sampler as the main cause (Section 5.2, p. 11). They suggest combining static-analysis approximations with sampling. Inference: the method assumes that bounded executions expose representative good and bad regions; sampled labels are not proved to characterize all reachable states, and only `IsInvariant` provides the final soundness check.

## technique: choosing slopes and derived features

what it is and when to use it

A feature is the value of a linear form on a state. The default octagon slope set contains vectors in `{-1,0,1}^d` with at most two nonzero components. It captures inequalities such as `±x_i ± x_j ≤ c`. For `hola15` and `hola34`, the paper uses “slopes of vectors in C^d where C is a small set of constants that appear in the program, and their negations” (Section 5.1, p. 10). It also proposes deriving directions from principal-component analysis (PCA) of the good states (Section 5.1, p. 10); the paper reports no result that uses PCA slopes.

how to do it

1. Choose slopes from the abstract domain or from PCA (Section 5.1, p. 10).
2. Compute every sample's dot product with every slope (Section 2, p. 4).
3. Train the tree on these columns and translate tests back to linear inequalities (Section 4, pp. 7–8).
4. If the good states lie in a lower-dimensional space, the paper suggests PCA directions to expose likely equalities or bounds. Its example says that if all good points lie along the line `2x + 3y = 4`, “the first PCA vector will be (2, 3), and intuition suggests that the invariant will use inequalities of the form 2x + 3y < c” (Section 5.1, p. 10). Inference: strictly, the first principal component of points along that line is the line's direction (3, −2), and (2, 3) is its normal, so the slope would need to be taken as the normal.

Verus form

Inference: encode each selected linear form directly in a `spec fn`, for example `spec fn h(x: int, y: int) -> int { 2*x + 3*y }`, and state the tree path conditions as Boolean combinations of comparisons on `h`. Inference: PCA is a feature-selection heuristic, not a proof; Verus still proves the resulting invariant for all executions. Inference: the paper's ad-hoc “constant slopes” for `hola15` and `hola34` should be treated as project-specific assumptions when ported to Rust.

what the evidence shows and limits

The octagon feature set works for most listed benchmarks. The authors explicitly call constant slopes ad hoc and say they may not work on larger benchmarks (Section 5.2, p. 11). Inference: a slope set that omits the relation needed by a program cannot express its invariant regardless of sample size.

## technique: nonlinear feature lifting

what it is and when to use it

The method extends beyond linear inequalities by adding a derived feature column for a nonlinear expression. For modulus, the authors add a column `x' = x mod 2`, learn over that column, and replace `x'` with `x mod 2` in the final formula (Section 4, p. 9). They also report one quadratic example, `square`, with the invariant `s = i² ∧ i ≤ n` (Section 5.2, p. 11); the paper does not say how the `i²` feature was supplied.

how to do it

1. Compute the derived expression for every sampled state.
2. Append it as a feature column.
3. Run the same decision-tree learner and path-to-formula conversion.
4. Substitute the expression back into the output formula (Section 4, p. 9).

Verus form

Inference: define the expression as a `spec fn`, such as `spec fn parity(x: int) -> int { x % 2 }`, and use it in a candidate invariant. Inference: executable Rust arithmetic and the specification's mathematical modulus must be aligned, including the sign convention for negative operands; this is a proof obligation rather than something established by the learner. Inference: for a quadratic invariant, use a specification expression like `i * i` and prove the required arithmetic facts with Verus assertions or proof functions.

what the evidence shows and limits

The table contains three modulus-only benchmarks, one non-octagonal modulus benchmark, and one quadratic benchmark; DTInv totals are respectively 0.06 s, 1.82 s, 0.04 s, 1.17 s, and 0.51 s (Table 1, p. 12). These are five benchmark rows, not a general success rate. Inference: derived features must be chosen in advance; the paper describes no mechanism that discovers arbitrary nonlinear functions.

## probabilistic completeness and complexity

The authors bound generalization using PAC learning only after limiting the tree to `K` nodes. Unbounded decision trees have unbounded VC dimension because a tree can give each sample its own leaf. With a fixed node bound, they state a VC dimension of `O(K d log K)` and derive a polynomial sample bound `O((1/ε) K d log K log(1/δ))` under the PAC assumptions (Section 4, pp. 8–9). Theorem 2 states that DTInv “returns an invariant that has true error at most ε with probability at least 1 − δ” under the PAC assumptions (Section 4, p. 9). Inference: this is a statement about classification error under the assumed distribution, not a proof of program safety without `IsInvariant`.

The tree-learning runtime is `O(m n log n)`, where `m` is the number of slopes and `n` the number of samples (Section 4, p. 9). The authors compare this with their set-cover baseline's `O(m n^3)` learning time (Section 6, p. 13). Inference: on a Verus project, feature generation and sampling can be run as a separate synthesis stage, while Verus verification remains the trusted check of the candidate.

## what is proved, trusted, and left open

The paper's soundness claim rests on the assumption that `IsInvariant` is correct (“we assume that the procedure IsInvariant is correct”, Section 4, p. 8); its experiments use Boogie with Z3 as that checker (Section 5.1, p. 10). The learned tree is not itself a proof: it proposes a formula that must pass the checker. Inference: sampling, slope choice and the PAC distribution assumption affect whether a correct invariant is found (completeness), not soundness; soundness additionally depends on the correct implementation of Boogie, Z3 and the tree-to-formula translation.

Inference: for VL's agent-written Verus Rust, this method is a useful candidate-invariant generator for loops whose state features are numerical and whose expected invariant has Boolean structure. Inference: its main product threat is indirect: an agent may produce a plausible but under-sampled or feature-incomplete invariant, and a workflow that treats learning success as proof would be unsound. Inference: the threat is reduced when every generated invariant is checked by Verus against the executable Rust and when failed proofs trigger new samples or human-guided features. Inference: the paper's work already covers decision-tree learning over octagonal, custom linear, modulus, and quadratic features, so VL should reuse or compare against it rather than present generic trace-based invariant generation as new.

## techniques for the catalog


- decision-tree invariant synthesis — classify sampled good and bad states with threshold trees, convert good paths to a Boolean invariant, and verify inductiveness
- bounded good/bad-state sampling — enumerate bounded executions from valid and nearby states to produce labels for candidate-invariant learning
- abstract-domain slope features — project states onto octagon or custom linear slopes so tree tests become numerical inequalities
- PCA-guided slope discovery — derive candidate directions from principal components of sampled good states when fixed slopes are insufficient
- nonlinear feature lifting — add columns for expressions such as modulus or squares and substitute those expressions back into the learned formula
- PAC/VC sample bound — limit tree size to obtain a VC-dimension bound and a distribution-dependent generalization guarantee

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "In practice however, PAC learning algorithms are empirically successful on a variety of applications where the assumption on distribution is not clearly true."): I read the whole paper text (arXiv v1, pp. 1–15) and checked every quotation word for word, the page and section references, the algorithm steps, the Table 1 numbers and counts (22 benchmarks, 22 DTInv successes, the five modulus and quadratic rows), the experimental setup, the PAC theorems and the complexity claims. I changed the link to the arXiv page (arXiv:1501.04725 appears in the paper text); corrected page references (Section 3 Gini index pp. 6–7, nonlinear features p. 9); replaced the benchmark-selection and "one run per benchmark" claims with what the paper states; fixed a truncated quotation; replaced the claim that sampling, slopes and tree-to-formula translation are trusted for soundness; marked my own conclusions "Inference:"; and rewrote the Verus sketch to use `i64`, since Verus `int` cannot be an executable type. I did not check the cited related work, did not run Verus on the sketch (not installed), and did not rerun any experiment.
