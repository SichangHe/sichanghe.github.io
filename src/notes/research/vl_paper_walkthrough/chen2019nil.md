# NIL: Learning Nonlinear Interpolants
(authored by agents unless marked 🧑)

Tag: `chen2019nil` , [paper](http://arxiv.org/abs/1905.11625v5)

## problem and result

NIL synthesizes polynomial Craig interpolants for contradictory formulas in quantifier-free nonlinear arithmetic. Given `φ` and `ψ` with common variables `x`, it seeks a polynomial `I(x)` such that `φ` entails `I` and `I ∧ ψ` is unsatisfiable. It treats models of `φ` as positive classifier examples and models of `ψ` as negative examples, learns a separating support-vector-machine (SVM) classifier in a polynomial feature space, and checks the candidate exactly with quantifier elimination (QE).

The abstract states: “We leverage classification techniques with space transformations and kernel tricks as established in the realm of machine learning, and present a counterexample-guided method named NIL for synthesizing polynomial interpolants” (Abstract, p. 1). The target theory is the real polynomial theory `T_P`; the paper also discusses decidable extensions containing certain exp-log or tame elementary functions (Section 3, p. 6).

Example 1 separates `φ: y ≥ x²` from `ψ: y ≤ −cos(x)+0.8` and reports the single polynomial interpolant `15x² < 4+20y` (Section 1, p. 3). This example matters because the negative formula contains a transcendental function while the returned interpolant is polynomial.

## technique 1: classifier-based polynomial interpolation

What it is. A polynomial kernel maps common-variable points into monomials up to degree `m`; a linear SVM in that feature space is a degree-`m` polynomial inequality in the original variables. The SVM maximizes the functional margin, so the learned separator is generally neither the strongest projection of `φ` nor the weakest separator of `ψ`.

When to use it. Use NIL when formulas are contradictory, their common-variable projections can be separated by a polynomial of bounded degree, and exact QE is available for checking entailment and finding counterexamples. The method is aimed at small to medium interpolation tasks; the implementation's repeated CAD calls are the stated scalability bottleneck (Section 5.2, p. 14).

How to apply it.

1. Check whether `φ ∧ ψ` is satisfiable. If it is, no interpolant exists for the pair (Section 3.1, p. 6; Algorithm NIL, lines 1–2, p. 7)
2. Sample models from `JφK` and `JψK`. Monte Carlo sampling over a bounded box is suggested; QE is used when equalities or rare predicates make random sampling unreliable (Section 3.1, p. 6)
3. Project each model onto common variables by dropping the variables local to the other formula (Section 3.1, p. 6)
4. Train an SVM on positive and negative samples with a polynomial feature degree `m`; the resulting classifier `C` is the candidate polynomial `I` (Algorithm lines 3–9, p. 7)
5. Check the two defining conditions exactly: `φ |= I` and `I ∧ ψ |= ⊥` (Algorithm lines 10–11, p. 7)
6. If either check fails, obtain a model of `φ ∧ ¬I` as a positive counterexample and/or a model of `I ∧ ψ` as a negative counterexample, add them to the sample sets, and repeat (Algorithm lines 12–14, p. 7)

The paper's exact description is: “The basic idea of NIL is to view interpolants as classifiers and use SVMs with the kernel trick to perform effective classification.” (Section 3.1, p. 6.) The SVM itself solves the convex quadratic program `min 1/2 wᵀw` subject to `y_i(wᵀΦ(x_i)+b) ≥ 1` (Equation 1, p. 4).

Evidence. Theorem 1 proves soundness: if NIL terminates and returns `I`, it is an interpolant of degree at most `m` (Section 4, p. 9). Theorem 2 gives conditional completeness when both model sets are bounded and a degree-`m` interpolant has positive feature-space margin (p. 9). The implementation evaluates 20 benchmark cases in four categories (9 cases without/with rounding, 8 cases requiring rounding, 2 beyond polynomial theory, and 1 unbalanced case; Table 1 and Section 5.2, pp. 11–13). The paper reports successful synthesis for all benchmark examples that admit polynomial interpolants; one transcendental case succeeds and one case fails because no finite-dimensional polynomial separator exists (Section 5.2, p. 13). These are 20 hand-selected examples, not a random test-set accuracy denominator.

Verus form. Inference: define the intended polynomial predicate as a `spec fn` over common mathematical variables and state its two implications with `requires` and `ensures` on a proof wrapper. The SVM and sampling can run outside Verus; Verus should check the returned coefficients by `assert` or proof functions that establish the polynomial inequalities. A candidate that has only passed floating-point SVM classification is not a Verus proof until exact coefficients and both entailments are checked.

Limits. A failed SVM at degree `m` means no separator was found for that finite training set; the algorithm reports no interpolant in `R[x]_m` only when the SVM optimization itself fails under its assumptions (Algorithm line 6, p. 7). General QE is doubly exponential in variables in the worst case (Section 3, p. 6), and repeated QE dominates practical cost. The candidate can also be invalid if floating-point coefficients are not repaired.

## technique 2: counterexample-guided refinement and exact checking

What it is. NIL is a counterexample-guided inductive synthesis loop. Finite SVM separation is only a hypothesis. QE checks the universal entailments; every failed check returns a concrete model that refines the training set. Multiple counterexamples may be added per round (Section 3.1, p. 7).

How to apply it.

1. Express entailment as unsatisfiability of projected formulas: `φ(x,y)|x ==> I(x)` and `I(x) ∧ ψ(x,z)|x ==> ⊥` (Section 3.1, p. 7)
2. Ask QE to eliminate universal quantifiers, or equivalently test satisfiability of the negations (p. 7)
3. Extract a violating assignment with `FindInstance` and append it to `X+` or `X−` according to which side failed (Algorithm lines 12–14, p. 7)
4. Retrain the SVM, preserving all earlier counterexamples (Section 3.1, p. 7)
5. Stop only when both exact checks succeed; then the classifier is a mathematical interpolant, rather than merely a separator of samples (Theorem 1, p. 9)

The paper warns: “The correctness of SVM given in Lemma 1 only guarantees that the candidate interpolant separates the finite set of points sampled from JφK and JψK, not necessarily the entirety of the two sets.” (Section 3.1, p. 7.) This distinction is central for a verifier integration.

Evidence. The reported prototype uses Mathematica `REDUCE` for QE and `FINDINSTANCE` for samples and counterexamples, with LIBSVM for classification (Section 5.1, p. 10). The authors state that Z3 failed on their nonlinear entailment tasks when coefficients became large (p. 10), but give no denominator for the number of failed Z3 tasks. The benchmark table gives total interpolation times per case on one 3.6 GHz Intel Core-i7 with 8 GB RAM and Ubuntu 16.04 (Section 5.2, p. 11); these timings are environment-specific.

Verus form. Inference: use an external learner only to propose a contract. Generate exact rational coefficients, then have Verus prove each implication over the same mathematical domain. Counterexamples can become additional `assert` obligations or regression tests, but they do not replace universal proof. If the specification contains transcendental functions unsupported by Verus arithmetic, the learned result must be restricted to a proved abstraction.

Failure modes. QE may return a counterexample almost on the separating hyperplane, causing many iterations or nontermination of the basic algorithm. The method also inherits numerical error from LIBSVM; a tiny coefficient error can invalidate an otherwise correct separator.

## technique 3: tolerance and varying-box variants

What it is. `NIL_δ` changes exact entailment to a tolerance band. For candidate `p(x) ≥ 0`, it checks `φ ∧ (p(x)<−δ)` and `(p(x)≥δ) ∧ ψ`; a counterexample is at least feature-space distance `δ` from the boundary. `NIL*_{δ,B}` decreases `δ` by half and doubles a feature-space bounding box after each iteration, providing a limiting convergence result.

How to apply it.

1. Choose degree `m` and tolerance `δ>0` (Section 3.3, p. 8)
2. Run the core sampling, SVM, and counterexample loop, but reject only violations outside the `δ` band (p. 8)
3. For unbounded sets or a desired limit, initialize a box `B`; after iteration `i`, set `δ_{i+1}=δ_i/2` and `B_{i+1}=2B_i` (Section 3.3, p. 9)
4. Stop at a true interpolant or an application cutoff; interpret intermediate results as tolerance interpolants (p. 8)

Evidence. Theorem 3 proves `NIL_δ` terminates for bounded `JφK` and `JψK` when `δ>0`, returning a tolerance interpolant when one exists (Section 4, p. 9). Theorem 4 says the varying-δ, varying-box sequence converges pointwise on interiors if an interpolant exists, even without boundedness (p. 10). This is a convergence theorem, not a finite-time guarantee.

Verus form. Inference: encode tolerance as an explicit weakened postcondition, with `ensures` allowing a margin `δ`; keep the exact contract as a separate proof target. Do not silently treat a tolerance interpolant as exact safety. A Verus proof can establish the chosen margin for a concrete implementation, while the paper's asymptotic convergence does not provide a finite proof artifact.

Limits. Distance is measured in polynomial feature space, not original variable space (Section 3.3, p. 8). Thus a fixed `δ` has no direct physical meaning unless the feature map and variable scaling are documented. `NIL*` may produce an infinite sequence and requires a cutoff in any implementation.

## technique 4: rational recovery and balanced classification

What it is. LIBSVM computes floating-point coefficients. NIL applies rational recovery from continued fractions to obtain nearby exact rational coefficients, then reruns exact QE. For highly unbalanced positive and negative model sets, it weights the minority class before SVM training.

How to apply it.

1. Solve the SVM numerically (Section 5.1, p. 10)
2. Recover rational coefficients from each floating-point coefficient using continued-fraction approximation (p. 10)
3. Use the rational polynomial for entailment checking and counterexample generation (p. 10)
4. If one side has far fewer samples, set the class weight to the size of the opposite sample set before classification (Section 5.2, p. 12)

Evidence. The authors say rational recovery lets NIL handle exact-boundary cases in benchmark IDs 10–17 and simplifies candidates, which in turn accelerates later checks (Section 5.1, p. 10). The unbalanced category is one case out of 20 (Section 5.2, p. 12). The paper does not separately quantify how many iterations or failures rational recovery prevents.

Verus form. Inference: require exact rational coefficients at the interface to Verus. Floating-point coefficients may guide search but should be erased from the trusted proof path. Use a `spec fn` for rational evaluation and prove denominator nonzero and sign-preservation facts explicitly.

## what is proved, measured, and trusted

Proved: soundness of returned interpolants; conditional termination for positive margin; termination with tolerance on bounded sets; and limiting convergence for the varying-tolerance variant (Theorems 1–4, pp. 9–10). Trusted components in the implementation include Mathematica's CAD/QE, LIBSVM's optimization, rational-recovery arithmetic, and the correctness of the input formulas and common-variable projection. The paper's theorems assume exact arithmetic; floating-point execution is repaired but not itself formally verified.

Measured: 20 benchmark examples, partitioned 9 + 8 + 2 + 1, on one stated workstation and operating system (Section 5.2, p. 11). Table 1 reports per-case seconds; the text does not provide aggregate mean, median, timeout denominator, or a randomized success rate. “Our learning-based technique succeeds in all of the benchmark examples that admit polynomial interpolants” is therefore a claim about this 20-case collection and its polynomial subset, not all nonlinear formulas (Section 5.2, p. 14).

Inference: the threat to VeruLaw is moderate. NIL could propose compact nonlinear invariants or contracts that agents cannot easily invent, but the learner and QE engine become trusted unless Verus checks the exact result. The strongest safe architecture is proposal outside Verus, exact coefficient normalization, and a Verus proof of the two interpolant implications. The paper's work already covers classifier learning, tolerance handling, and rational recovery; VL should not redo those abstractions without a Rust/Verus evaluation. A useful new study would measure proof effort and solver trust when NIL candidates are translated into Verus contracts.

## techniques for the catalog

- svm polynomial interpolation: map common-variable samples to bounded-degree monomials and learn a maximum-margin polynomial separator
- counterexample-guided refinement: verify each candidate with QE, add violating models, and retrain until both entailments hold
- tolerance interpolation: use a feature-space margin δ to force termination on bounded zero-margin problems
- varying tolerance and bounds: halve δ and expand the box to obtain a convergent sequence for unbounded domains
- rational recovery: convert floating-point SVM coefficients to exact rationals before logical checking
- class balancing: weight the sparse side of an unbalanced model sample set before SVM training

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
