# Verifying Numerical Methods with Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `bryant2025verifying`, [paper](https://arxiv.org/abs/2511.20550v4)

## scope and workflow

Bryant, Huerta y Munive, and Foster evaluate Isabelle/ITrees for total correctness of bisection, fixed-point iteration, perceptron, and gradient descent. The supplied paper is arXiv:2511.20550v4, dated 22 September 2026 (page 1). Their workflow is: “(1) model the algorithm in Isabelle/ITrees, (2) experiment with the algorithm by executing it, (3) write its correctness specifications, (4) pose a suitable set of invariants and variants, (5) use the VCG automation to produce proof obligations, (6) if required, prove theorems from Analysis to aid in discharging the proof goals and (7) repeat from step 4 until the postcondition is proved.” (section 1, page 2).

Inference: a corresponding Verus development would use `requires`/`ensures`, loop `invariant`, and `decreases`, but would need its own numerical lemmas. This paper does not evaluate Verus.

## technique: executable imperative model plus Hoare contract

“The library provides an abstract imperative programming notation, mechanisms for total-correctness specifications, (in)variant annotations, and a verification-condition generator.” (section 2, page 2). An `alphabet` declares state and `program` defines commands. The `execute` command compiles a program to an ITree, generates SML, and executes it. Its arithmetic limitation is explicit: “Execution is feasible only when the real number inputs are rational, and so supported by multi-precision arithmetic.” (section 2, page 3).

Steps: declare finite-dimensional vector state; write the scalar-vector multiplication loop; execute a rational instance; state a total-correctness Hoare triple; add an invariant describing the processed indices and a variant counting remaining indices; invoke `vcg`; discharge the resulting vector-extensionality obligation with Sledgehammer (section 2, page 3). Inference: a Verus analogue could use an indexed sequence, a processed-prefix invariant, and a remaining-length `decreases` expression; any finite-precision implementation would need a separate arithmetic argument.

## technique: bisection with bracket and exact iteration bound

“The chosen half of the bracket depends on the sign agreement of f at the left endpoint and midpoint (fa*ymid > 0).” (section 3, page 4). The program caches endpoint values, halves `[l,u]`, and exits when `u-l ≤ tol`. Listing 1.2 assumes `0<tol`, `tol<b-a`, continuity on `[a,b]`, and opposite endpoint signs. It ensures a root `c` in `(a,b)`, error at most both `tol` and `(b-a)/2^iter`, and `iter = ⌈log₂((b-a)/tol)⌉` (pages 4–5).

Steps: initialize endpoint caches and bracket; evaluate the midpoint; retain the half with nonpositive endpoint sign product; maintain correct caches, a nonempty subinterval of `[a,b]`, `fa*fb≤0`, exact halving `u-l=(b-a)/2^iter`, and `2*(u-l)>tol`; use variant `nat(⌈log₂((b-a)/tol)⌉)-iter`. The paper reports 15 VCs, 13 automated, and 195 Isabelle lines (section 3, page 5; table 1, page 14).

The paper says, “Notably, our implementation of the method does not terminate if f(xmid)=0.” (page 5). Inference: this means finding an exact root does not trigger an early exit; Listing 1.1 still halves the bracket, and the total-correctness theorem guarantees termination under its assumptions. Inference: a Verus version would need a formal root-existence lemma, such as Bolzano's theorem, as well as the bracket and termination proofs.

## technique: fixed-point contraction and Taylor strengthening

“The loop exits when the latest distance falls below the tolerance.” (section 4, page 6). Listing 1.4 assumes a fixed point `r`, positive tolerance and neighborhood radius, an initial point in that neighborhood, and `0≤c<1` with contractivity there. The invariants include `x=(f^^iter)x0`, `x_new=f x`, and `|x_new-x|≤c^iter|f x0-x0|`. The variant subtracts `iter` from the bound `1+nat⌈ln(max 1 (|f x0-x0|/tol))/ln(1/c)⌉` (pages 6–7).

Steps: supply the contraction data as ghost parameters to an auxiliary program; prove it equal to the original program; prove geometric step-size decay, the logarithmic iteration bound, and error decay toward `r`. A C¹ function with `|f'(r)|<1` supplies a local contractive neighborhood (Listing 1.5, page 7). With C¹ regularity, twice differentiability at `r`, and `f'(r)=0`, Taylor's Peano remainder yields the quadratic error bound in Listing 1.6 (page 8).

The fixed-point development spans 1,111 lines, excluding 4,754 lines of analysis extensions covering higher-order differentiability, Taylor's Peano theorem, and further vector-calculus concepts (section 4, page 8). Table 1 reports four VCs for each of the local and quadratic proofs, with one and two closing directly, respectively (page 14). Inference: a Verus adaptation would need separately formalized contraction and calculus lemmas before these loop arguments could be reused.

## technique: perceptron convergence invariants

The perceptron repeats passes until one makes no updates. Listing 1.9 assumes labels in `{-1,+1}`, margin `γ>0`, a separating pair normalized by `||θ||²+b²=1`, and augmented data bound `||x_i||²+1≤R²`. It ensures correct labels and at most `(R/γ)²` updates (section 5, page 9). Auxiliary programs receive ghost `θ,b,γ,R` and are proved equal to the original programs (page 10).

Steps: update whenever `y_i*(x_i·theta+bias)≤0`, including points on the separating plane; maintain `updates*γ ≤ θ·theta+b*bias` and `||theta||²+bias²≤updates*R²`; record update-count changes; when `changed` is false, require correct classification of the processed prefix. The outer loop also maintains `updates≤nat⌈(R/γ)²⌉`. The pass variant is `length D-i`; the outer variant is `nat⌈(R/γ)²⌉-updates+(if changed then 1 else 0)`, accounting for the final pass without updates (Listings 1.10–1.11, page 10).

The framework's `old` operator describes a variable's state before its most recent assignment (page 10). Table 1 reports 11 VCs, eight automated, and 208 lines (page 14). Inference: a Verus adaptation could use ghost separator data and explicit snapshots for the same margin and norm arguments; this paper does not establish that Verus's `old` has the same meaning.

## technique: gradient descent under progressively stronger assumptions

The loop updates `x := x-α(x)*grad(x)` while `grad(x)·grad(x)>ε²`. All three theorems ensure `||grad(x)||≤ε` and an iteration bound. The first assumes a positive tolerance, a globally L-Lipschitz gradient, a global minimizer, and constant step `1/L`; its iteration bound is `nat⌈2L*(f(x0)-f(x_min))/ε²⌉` (Listing 1.13, pages 11–12). The second adds the Polyak–Łojasiewicz inequality with `0<μ<L` to obtain linear objective-value convergence and a logarithmic iteration bound (Listing 1.14, page 12). The third assumes a strongly convex quadratic with a supplied orthogonal diagonalization and positive eigenvalue bounds, and uses exact line search to obtain the Kantorovich rate `((A-a)/(A+a))²` (Listing 1.16, pages 13).

Steps: choose the theorem's objective, gradient, and step assumptions; supply proof data through an equivalent auxiliary program; apply descent, PL, or Kantorovich lemmas to bound progress and iterations. For the PL proof, maintain the geometric objective-gap bound, the iteration bound, and the fact that an active guard leaves room for another iteration; use the remaining iteration budget as variant (Listing 1.15, page 12).

Table 1 reports 8/12/8 VCs for the general/PL/quadratic variants, with 6/9/4 closed directly (75%/75%/50%), and 1,085 lines overall (page 14). Inference: a Verus version would need formal objective and gradient laws plus reusable descent and convergence lemmas.

## evidence, trust, and relevance to vl

“Across the seven VCG invocations in Table 1, 43 of 62 obligations close directly, an aggregate rate of 69%.” (section 7, page 14). Direct automation counts direct prover calls or one-line simplification, excluding structured Isar arguments even when intermediate steps are automated. LOC excludes comments, blank lines, and `text`, `section`, and `subsection` commands (section 7, page 14). These measurements assume library dependencies are available.

Section 8 says, “The execute command only performs arbitrary precision operations.” and discusses stability and rounding-error support as future work (page 15). However, the conclusion also says, “The accompanying Isabelle theories now also contain floating-point variants and Refinement Framework counterparts, which strengthens the evidence that the approach is not limited to idealised real-arithmetic models.” (section 9, page 16). Inference: the paper's displayed contracts and reported VCG counts do not specify a rounding-error guarantee for those floating-point variants; the study should not imply either comprehensive floating-point verification or the absence of all floating-point work.

Inference: for VL, the transferable technique is to package mathematical lemmas and ghost parameters so that a small imperative loop exposes the convergence proof. The numerical assumptions must remain explicit when adapting these examples to verified Rust.

## techniques for the catalog

- executable imperative Hoare model — execute rational instances, state total correctness, and discharge VCs from invariants and variants
- bisection bracket invariant — preserve a nonpositive sign product and exact interval halving for root and iteration bounds
- contraction fixed-point proof — use ghost contraction data, geometric decay, and calculus lemmas
- perceptron margin proof — combine margin growth and norm bounds to derive an update limit
- gradient-descent regimes — reuse one loop with smoothness, PL, or quadratic assumptions and matching convergence lemmas

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The separation of the programs enables us to carry only the necessary invariants from the inner loop to the outer one."): checked all paper text, study quotations, numerical counts, references, assumptions, and technique steps; corrected page references, gradient-descent VC counts, bisection early-exit interpretation, perceptron conditions, and floating-point scope; marked Verus adaptations and other conclusions as Inference; did not inspect or run the accompanying Isabelle theories or verify Verus adaptations.
