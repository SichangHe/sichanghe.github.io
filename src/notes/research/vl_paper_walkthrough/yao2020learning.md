# Learning Nonlinear Loop Invariants with Gated Continuous Logic Networks
(authored by agents unless marked 🧑)
Tag: `yao2020learning`, [paper](https://doi.org/10.1145/3385412.3385986)

## what the paper proves and measures

Yao, Ryan, Wong, Jana, and Gu learn SMT loop invariants from execution traces with a neural architecture called the Gated Continuous Logic Network (G-CLN). The target is a loop invariant I satisfying precondition implication (P ⇒ I), inductiveness ({I ∧ LC} C {I}), and postcondition implication (I ∧ ¬LC ⇒ Q) (Section 2.1, p. 3). The paper’s workflow is trace collection, G-CLN training, invariant extraction, and checking with Z3 (Section 3 and Figure 3, p. 5). The abstract reports 26 of 27 nonlinear benchmark problems solved (“3 more than prior work”), an average runtime of 53.3 seconds, “all 124 problems in the linear Code2Inv benchmark”, and a convergence rate of 97.5% on quadratic problems, “a 39.2% improvement over CLN models” (Abstract, p. 1). The paper also says, “We use G-CLNs with Fractional Sampling and PBQUs to develop a unified approach for general nonlinear loop invariant inference.” (Section 1, p. 3)

The method generates candidate invariants; a solver checks them. The paper says so in Section 2.1: “our work focuses on inferring likely candidate invariant as validating a candidate can be done efficiently.” (p. 3) The abstract states the aim: “we introduce a new neural architecture for general SMT learning, the Gated Continuous Logic Network (G-CLN), and apply it to nonlinear loop invariant learning.” (Abstract, p. 1) A neural model fits finite data; Z3 checks the extracted formula and, on failure, a counterexample goes back into the training data (Section 3, p. 5). The paper warns, “Since the samples represent only a subset of reachable states from the program, encouraging a tighter bound may potentially lead to overfitting.” (Section 4.2, p. 7) Inference: a Verus integration should treat G-CLN output as an untrusted invariant candidate and require Verus to prove initialization, preservation, and exit postconditions. Inference: the trusted boundary remains Verus, its solver, Rust compilation/erasure, and the specification; the neural weights and trace generator are search components.

## technique 1: trace-driven invariant learning with solver checking

what it is: instrument a loop to record all variables at each iteration, execute it on inputs satisfying the precondition, expand each state into candidate terms, train a differentiable logic model, extract an SMT formula, and check it against the formal loop specification (Figure 3, Section 3, and Figure 4, p. 5).

when to use: use it when invariants contain nonlinear equalities or inequalities and hand-written templates are difficult. The benchmark programs range “from modular division and greatest common denominator (gcd) to computing geometric and power series”, with “up to triply nested loops and sequential loops” (Section 6.1, p. 11).

how to do it:
1. instrument the source loop to log the variables inside the loop body (Figure 4a logs at the start of each iteration) and once after the loop exits; execute with input values in a set range that satisfy the precondition (Section 3, p. 5)
2. enumerate all monomials over program variables up to a given degree `maxDeg`; “Our system can be configured to consider other non-linear terms like xy” (Section 3, p. 5)
3. build and train a G-CLN over the samples, using normalization, weight regularization, term dropout, and PBQUs as appropriate (Section 5, pp. 9–11)
4. recursively extract an SMT formula by descending through the model and keeping clauses whose gating parameters are above 0.5 (Algorithm 1, p. 6); scale the coefficients so the maximum is 1, round to the nearest rational with a bounded denominator, and discard rounded invariants that do not fit all the training data (Section 4.1, p. 6)
5. check the candidate with Z3; if it returns a counterexample, incorporate it into the training data and rerun the three stages with more generated samples, until a valid invariant is learned or the run times out (Section 3, p. 5; Section 5.2.2, p. 11)

For the square-root example the paper prints the learned invariant as `a² ≤ n ∧ (t = 2a + 1) ∧ su = (a + 1)²` (Section 3, p. 5). Inference: `su` is presumably the program variable `s` (the loop in Figure 4a has variables a, s, t, n). Inference: in Verus, the candidate would be written as a loop `invariant` clause using arithmetic expressions over Rust variables, then checked with `requires`/`ensures`; the extraction stage must translate neural coefficients to legal Verus syntax and may need `assert` lemmas for nonlinear arithmetic. Verus’s loop invariant syntax and solver obligations would replace Z3’s direct standalone check.

limits: traces cover only sampled executions, so validation is mandatory. The one benchmark failure, `knuth`, has 165 potential terms of degree at most 3 even without counting the `mod` call, which the paper says makes it “difficult to learn a precise invariant with gradient based optimization” (Section 6.1, pp. 11–12). Inference: a candidate that fits all traces is not evidence of inductiveness until solver checking succeeds.

## technique 2: gated continuous logic networks and formula extraction

what it is: a CLN relaxes Boolean SMT formulas to differentiable values in [0,1]. The original CLN needs a user-supplied formula template; the G-CLN replaces fixed conjunction/disjunction templates with learnable gated t-norms and t-conorms. A gating parameter near one activates a subformula; one near zero discards it. This lets the model discover logical structure while learning coefficients (Sections 2.3 and 4.1, pp. 4–7).

how to do it:
1. map `∧`, `∨`, and `¬` to a continuous t-norm, t-conorm, and `1 − t`; map comparisons such as `>` and `≥` to smooth parameterized functions; the implementation uses the product t-norm (Section 2.2, p. 4)
2. replace each binary t-norm with `TG(x,y;g1,g2) = (1+g1(x−1)) ⊗ (1+g2(y−1))`; the gated t-conorm is `TG′(x,y;g1,g2) = 1 − (1−g1x) ⊗ (1−g2y)` (Section 4.1, pp. 5–6)
3. make the gating parameters learnable alongside the linear weights. The loss is `Σ(1 − M(x))` plus `λ1 Σ(1 − gi)` over t-norm gating parameters and `λ2 Σ gi` over t-conorm gating parameters, so t-norm parameters are pushed toward 1 and t-conorm parameters toward 0. Use a layer of gated t-conorms (OR) followed by a layer of gated t-norms (AND), which yields conjunctive normal form (Section 5.2.1, p. 10)
4. after convergence, descend through the model (Algorithm 1, p. 6): for a gated t-norm, conjoin the formulas of children whose gating parameter exceeds 0.5; for a gated t-conorm, disjoin them; negate at negation nodes; build an atomic formula at leaves
5. scale coefficients, round them to rationals with a bounded denominator, and retain only formulas that fit the training set (Section 4.1, p. 6)

The paper proves a correspondence with discrete logic when the gating parameters are exactly 0 or 1: “Theorem 4.1 guarantees the soundness of the gating methodology with regard to discrete logic.” (Section 4.1, p. 7) More precisely, Theorem 4.1 says the extracted formula holds at an input exactly when the limiting CLN output is 1 (and fails exactly when it is 0), for every real input, as long as the t-norm satisfies Property 1 (p. 7; proof in Appendix A, p. 15). Inference: a Verus agent could use the same architecture to propose a conjunction of invariant clauses, but each clause must become a concrete Verus expression; this theorem does not prove the resulting Rust loop invariant.

limits: “Gating parameters between 0 and 1 are acceptable during model fitting but should be eliminated when the model converges” (Section 4.1, p. 7); the theorem assumes all final gating parameters are 0 or 1. The evaluation uses a conjunction of ten clauses, each with up to two literals (m=10, n=2; Section 5.2.1, p. 10; Section 6, p. 11). Inference: the learnable structure is therefore bounded by the chosen term set and these clause and literal counts.

## technique 3: PBQU activation for tight inequalities

what it is: the Piecewise Biased Quadratic Unit (PBQU) is the paper’s piecewise quadratic relaxation of `t ≥ u`. It penalizes points far from the learned boundary, unlike the sigmoid used by earlier CLNs, encouraging tight inequalities useful for verification (Section 4.2, pp. 7–8).

how to do it:
1. replace the sigmoid comparison with the PBQU function parameterized by constants `c1` and `c2` (Equation 3, p. 7); the evaluation sets σ = 0.1, c1 = 1, c2 = 50 (Section 6, p. 11)
2. train the model so that every sample satisfies the inequality and at least one sample lies on its boundary; the paper formalizes this as the “desired” inequality (Equation 4, p. 8)
3. constrain the weight vector to unit L2 norm to avoid the trivial all-zero solution (Section 5.1.2, p. 9)
4. for inequality learning, structure term dropout over all combinations of variables up to a set number of terms and degree (up to 3 terms and 2nd degree in the evaluation), train as for equalities, and remove bounds with PBQU activations below a threshold; then check against the loop specification and remove unsound constraints (Section 5.2.2, pp. 10–11)
5. if the resulting invariant is insufficient to prove the postcondition, retrain with the counterexamples from the specification check (Section 5.2.2, p. 11)

Theorem 4.2 (p. 8): for n k-dimensional samples with maximum L2-norm l, if `c1 ≤ 2l` and `c1·c2 ≥ 8√n·l²`, and the weights satisfy Σ wᵢ² = 1, then when the model converges “the learned inequality has distance at most c1/√3 from a ‘desired’ inequality”. The proof is in Appendix B (p. 16); the paper notes it proves the guarantee only for a single inequality. Inference: from the proof sketch, the bound says no sample can lie farther than c1/√3 outside the learned inequality and at least one sample is on or beyond the boundary; it concerns fit to the samples, not verification success. Inference: a Verus pipeline can use PBQU-generated inequalities as candidate arithmetic invariants, but nonlinear arithmetic may require explicit helper lemmas or solver-supported fragments.

## technique 4: fractional sampling as a sound semantic relaxation

what it is: when the samples of the original program are insufficient (“dominating growth of some terms (higher-order terms in particular) or limited number of loop iterations”), Fractional Sampling varies the initial values of program variables over the reals. The paper’s argument (Equations 5 to 7, p. 8): treat the initial values V0 as input variables VI, learn an invariant I′ over V ∪ VI for the loop started from arbitrary VI, then set VI = V0 to obtain a valid invariant of the original program (Section 4.3, pp. 8–9). The introduction states the soundness property: “any invariant for the continuous relaxation of the program must be an invariant for the discrete program” (Section 1, p. 2).

when to use: apply it per program, when the model cannot learn the correct polynomial from the initial samples; the implementation samples at 0.5 intervals, then 0.25, and so on until a correct invariant is learned (Section 5.4, p. 11).

how to do it (the `ps4` example, Figure 8, p. 8):
1. pick the variables whose initial values are to be relaxed; the paper does not apply fractional sampling to variables involved in predicates or external function calls such as gcd (Section 5.4, p. 11)
2. treat their initial values (x0, y0 in Figure 8c) as extra input variables and execute the loop from fractional initial values, collecting more samples with all terms at a comparable scale
3. train the G-CLN on these samples; for `ps4` it learns the relaxed invariant `4x − y⁴ − 2y³ − y² − 4x0 + y0⁴ + 2y0³ + y0² = 0` (Section 4.3, p. 9)
4. substitute the exact initial values x0 = 0, y0 = 0 to obtain the invariant `4x = y⁴ + 2y³ + y²` of the original program (Section 4.3, p. 9)
5. check the extracted invariant against the original program with Z3 (Section 3, p. 5)

Only two programs in the evaluation, `ps5` and `ps6`, require fractional sampling; sampling on 0.5 intervals is sufficient for both, and “The cost associated with fractional sampling is small (< 5s)” (Section 5.4, p. 11). Inference: Verus cannot execute a real-valued relaxation of arbitrary Rust code inside verification; the relaxation would have to be an offline candidate-generation model, followed by proof on the original integer program.

## technique 5: stabilize nonlinear training with normalization, dropout, and gating regularization

what it is: nonlinear monomials vary greatly in magnitude and count. The system rescales each sample to a fixed L2 norm, filters terms by a growth-rate heuristic, randomly drops terms before training, and regularizes the gating parameters. The paper’s stated aims are to prevent high-order terms from dominating training, to reduce the number of terms per neuron, and to encourage simpler, separate clauses (Sections 5.1 and 6.2, pp. 9–12).

how to do it:
1. normalize each sample (each row of expanded terms) to L2 norm l = 10 in the implementation (Section 5.1.1, p. 9)
2. constrain learned weights to unit L2 norm (Section 5.1.2, p. 9)
3. filter terms with the growth-rate-based heuristic of [33] (Sharma et al., the Guess-and-Check paper), then drop each remaining input term to a neuron with probability p before training; the default rate is 0.3 and decreases by 0.1 after each failed attempt until 0 (Section 5.1.3, pp. 9–10; Section 6, p. 11)
4. regularize the gating parameters as in the loss of technique 2 (Section 5.2.1, p. 10); the implementation uses adaptive regularization, with λ1 set to (1.0, 0.999, 0.1) and λ2 to (0.001, 1.001, 0.1) (Section 6, p. 11)
5. train with Adam (learning rate 0.01, decay 0.9996, max 5000 epochs), try three maximum denominators (10, 15, 30) for coefficient extraction, extract, and check with Z3 (Section 6, p. 11)

Ablation (Table 3 and Section 6.2, p. 12; the table has 27 rows, the NLA problems): without data normalization only `ps2` is solved (the paper says normalization “is crucial for nearly all the problems”); without weight regularization “the problems which involve inequalities over multiple variables cannot be solved”; “7 of the 27 problems cannot be solved without dropouts”; fractional sampling is needed for `ps5` and `ps6`, and the paper says it helps solve 5th and 6th order polynomials. The full method fails only on `knuth`. Inference: these are engineering aids for candidate generation, not proof evidence; Verus should accept only candidates that verify.

## technique 6: include external function calls by sampled terms

what it is: when loop code calls a function whose body is unavailable, the signature is given, and the system samples the function “with all combinations of variables in scope during sampling that match its call signature”, then includes the resulting call terms in the candidate invariant (Section 5.3, p. 11).

how to do it:
1. identify external calls and their signatures; the system is restricted to binary functions
2. execute the external function on combinations of in-scope variables during trace generation
3. add call expressions as terms in the G-CLN input
4. train and validate as for ordinary terms

The evaluation handles the binary function `mod` in `fermat1` and `fermat2`, and incorporates `gcd` in `egcd2`, `egcd3`, `lcm1`, and `lcm2` (Section 6.1, p. 12; Section 5.3, p. 11). For the four gcd programs the authors “manually check the validity of the learned invariant since gcd is not supported by z3” (Section 6, p. 11). Inference: Verus would instead need a trusted or proved `spec fn` contract for the external function; sampled behavior cannot replace that contract.

## techniques for the catalog

- trace-to-invariant workflow — instrument loops, expand terms, train a differentiable logic model, extract a formula, and solver-check it
- G-CLN structure learning — learn conjunction/disjunction structure with near-binary gating parameters and extract an SMT formula recursively
- PBQU tight inequalities — use piecewise quadratic activations and unit-norm weights to learn informative bounds
- fractional sampling — relax initial values to the reals for denser samples, then recover the invariant of the original program
- stabilized nonlinear training — combine feature normalization, term dropout, and gating-parameter/weight regularization
- external-call sampling — add sampled external-call terms when loop bodies invoke unavailable functions
