# Learning Nonlinear Loop Invariants with Gated Continuous Logic Networks
(authored by agents unless marked 🧑)
Tag: `yao2020learning`, [paper](https://www.semanticscholar.org/paper/5d1fa0c9c9389d8dbea5c7013128d44797aaab0c)

## what the paper proves and measures

Yao, Ryan, Wong, Jana, and Gu learn SMT loop invariants from execution traces with a neural architecture called the Gated Continuous Logic Network (G-CLN). The target is a loop invariant I satisfying precondition implication, inductiveness, and postcondition implication. The paper’s workflow is trace collection, G-CLN training, formula extraction, and Z3 checking (Sections 2.1 and 3, pp. 3–5). The abstract reports 26 of 27 nonlinear benchmark problems solved, 53.3 seconds average runtime, all 124 theoretically solvable Code2Inv problems solved, and 97.5% convergence on quadratic problems. It also says, “We use G-CLNs with Fractional Sampling and PBQUs to develop a unified approach for general nonlinear loop invariant inference.” (Abstract, p. 1)

The method is a candidate generator, not a proof system by itself. The authors describe the goal directly: “We introduce a new neural architecture for general SMT learning, the Gated Continuous Logic Network (G-CLN), and apply it to nonlinear loop invariant learning.” (Introduction, p. 3) A neural model fits finite data; Z3 checks the extracted formula against the loop obligations and supplies counterexamples for retraining. The paper states, “Since the samples represent only a subset of reachable states from the program, encouraging a tighter bound may potentially lead to overfitting.” (Section 4.2, p. 7) Inference: a Verus integration should treat G-CLN output as an untrusted invariant candidate and require Verus to prove initialization, preservation, and exit postconditions. The trusted boundary remains Verus, its solver, Rust compilation/erasure, and the specification; the neural weights and trace generator are search components.

## technique 1: trace-driven invariant learning with solver checking

what it is: instrument a loop to log all variables at each iteration, execute it on inputs satisfying the precondition, expand each state into candidate terms, train a differentiable logic model, extract an SMT formula, and check it against the formal loop specification (Figure 3 and Section 3, pp. 4–5).

when to use: use it when invariants contain nonlinear equalities or inequalities and hand-written templates are difficult. The benchmark includes powers, square roots, modular arithmetic, greatest common divisors, and nested loops (Section 6.1, pp. 10–11).

how to do it:
1. instrument the source loop with logging before and after the body; execute inputs over a chosen range and collect state vectors
2. enumerate monomials over program variables up to `maxDeg`; optional nonlinear terms such as `x*y` may be added (Section 3, p. 5)
3. build and train a G-CLN over the samples, using normalization, gate regularization, dropout, and PBQUs as appropriate (Section 5, pp. 8–10)
4. recursively extract an SMT formula from gates above 0.5; scale and round learned coefficients to rationals, discarding rounded formulas that do not fit training data (Algorithm 1, Section 4.1, pp. 5–6)
5. ask Z3 to check precondition implication, loop preservation, and postcondition implication; if it returns a counterexample, append that state to training data and repeat until success or timeout (Sections 3 and 5.2.2, pp. 4–10)

For the square-root example, the extracted invariant is `a² ≤ n ∧ (t = 2a + 1) ∧ s = (a + 1)²` (Section 3, p. 5). Inference: in Verus, the candidate would be written as a loop `invariant` clause using arithmetic expressions over Rust variables, then checked with `requires`/`ensures`; the extraction stage must translate neural coefficients to legal Verus syntax and may need `assert` lemmas for nonlinear arithmetic. Verus’s loop invariant syntax and solver obligations replace Z3’s direct standalone check.

limits: traces cover only sampled executions, so validation is mandatory. The method can time out or fail when the invariant has too many terms, complex external calls, or poor conditioning. A candidate that fits all traces is not evidence of inductiveness until solver checking succeeds.

## technique 2: gated continuous logic networks and formula extraction

what it is: a CLN relaxes Boolean SMT formulas to differentiable values in [0,1]. G-CLN replaces fixed conjunction/disjunction templates with learnable gated t-norms and t-conorms. A gate near one activates a subformula; a gate near zero discards it. This lets the model discover logical structure while learning coefficients (Section 4.1, pp. 5–7).

how to do it:
1. map `∧`, `∨`, and `¬` to continuous t-norm, t-conorm, and negation operators; map comparisons such as `>` and `≥` to smooth parameterized functions (Section 2.2, pp. 3–4)
2. replace each binary t-norm with `TG(x,y;g1,g2) = (1+g1(x−1)) ⊗ (1+g2(y−1))`; use the De Morgan dual for t-conorms (Section 4.1, p. 5)
3. make gate parameters learnable and regularize them toward 0 or 1; use a gated disjunction layer followed by a gated conjunction layer to obtain conjunctive normal form (Section 5.2.1, pp. 9–10)
4. after convergence, recursively traverse the model: for a gated conjunction retain children with `g>0.5` and conjoin them; for a gated disjunction retain children and disjoin them; negate or build an atomic formula at leaves (Algorithm 1, p. 5)
5. scale coefficients, round them to bounded-denominator rationals, and retain only formulas that fit the training set

The paper proves a discrete-logic correspondence when gates are exactly 0 or 1: “Theorem 4.1 guarantees the soundness of the gating methodology with regard to discrete logic.” (Section 4.1, p. 7) More precisely, the extracted formula equals the limiting CLN semantics for every real input under the t-norm property stated in Theorem 4.1 (p. 6). Inference: a Verus agent could use the same architecture to propose a conjunction of invariant clauses, but each clause must become a concrete Verus expression; gate soundness does not prove the resulting Rust loop invariant.

limits: partial gates are permitted during training but must be eliminated by regularization; the theorem assumes all final gates are 0 or 1. The architecture is limited by the chosen term set and maximum clause/literal counts; the evaluation uses ten conjunction clauses with up to two literals (Section 5.2.1, p. 9).

## technique 3: PBQU activation for tight inequalities

what it is: the Piecewise Biased Quadratic Unit (PBQU) is a smooth, piecewise quadratic relaxation of `t ≥ u`. It penalizes points far from the learned boundary, unlike the sigmoid used by earlier CLNs, encouraging tight inequalities useful for verification (Section 4.2, pp. 7–8).

how to do it:
1. replace the sigmoid comparison with the PBQU function parameterized by `c1` and `c2` (Equation 3, p. 7)
2. train the model so every sample satisfies the relaxed inequality and the boundary remains close to at least one sample
3. constrain the coefficient vector to unit L2 norm to avoid the trivial all-zero inequality (Section 4.2, pp. 8–9)
4. after training, discard bounds with low PBQU activation, extract the remaining rational inequalities, and check them against the loop specification (Section 5.2.2, pp. 9–10)
5. use solver counterexamples to retrain if the resulting invariant is unsound or too weak

The paper proves that for n k-dimensional samples with maximum L2 norm l, if `c1 ≤ √2 l` and `c1*c2 ≥ 8 n l²`, the converged learned inequality is within `c1/√3` of a desired tight inequality (Theorem 4.2, Section 4.2, p. 8). The denominator n is the number of training samples; the bound concerns coefficient-space distance, not verification success. Inference: a Verus pipeline can use PBQU-generated inequalities as candidate arithmetic invariants, but nonlinear arithmetic may require explicit helper lemmas or solver-supported fragments.

## technique 4: fractional sampling as a sound semantic relaxation

what it is: when integer loop executions provide too few distinct samples, Fractional Sampling relaxes selected integer operations to real-valued operations while preserving their discrete behavior relative to inputs. Any invariant of the relaxed program is an invariant of the original discrete program (Section 4.3, pp. 8–9).

when to use: activate it only when ordinary traces do not let the model distinguish the needed polynomial relation. The implementation samples at 0.5 intervals, then 0.25, and so on until a valid invariant is learned (Section 5.4, p. 10).

how to do it:
1. choose initialized variables not used in predicates or unsupported external calls
2. replace integer updates with continuous functions that agree with the original operation at integer inputs
3. execute the relaxed loop on fractional initial values and collect additional states
4. train and validate the invariant on the relaxed samples
5. return to the original integer initial values and check the extracted invariant with Z3

Only two of the 27 nonlinear evaluation programs, `ps5` and `ps6`, require fractional sampling; 0.5 spacing suffices for both, and the additional cost is under five seconds (Section 5.4, p. 10). Inference: Verus cannot execute a real-valued relaxation of arbitrary Rust code inside verification; the relaxation should be an offline candidate-generation model, followed by proof on the original integer program.

## technique 5: stabilize nonlinear training with normalization, dropout, and gate regularization

what it is: nonlinear monomials vary greatly in magnitude and count. The system rescales each feature row to a fixed L2 norm, filters terms by growth rate, randomly drops terms before training, and regularizes gates. These steps prevent high-order terms from dominating and encourage separate human-readable clauses (Section 5.1, pp. 8–9).

how to do it:
1. normalize each sample’s expanded term vector to L2 norm 10 in the implementation (Section 5.1.1, p. 8)
2. constrain learned coefficient weights to unit L2 norm (Section 5.1.2, p. 9)
3. filter high-growth terms, then drop each remaining input term with a configured probability before training (Section 5.1.3, pp. 9–10)
4. penalize gates toward one for t-norm clauses and toward zero for t-conorm clauses using the loss in Section 5.2.1 (p. 10)
5. train, extract, and solver-check; lower dropout after failed attempts and retry as described in the implementation (Section 5.4, p. 10)

The ablation denominator is 27 NLA problems. Without normalization, every listed problem fails; without weight regularization, multi-variable inequality problems fail; seven of 27 cannot be solved without term dropout; fractional sampling helps high-degree cases (Table 3 and Section 6.2, pp. 11–12). Inference: these are engineering aids for candidate generation, not proof evidence; Verus should accept only candidates that verify.

## technique 6: include external function calls by sampled terms

what it is: when loop code calls a function whose body is unavailable, the system samples that function for every in-scope variable combination matching its signature, then includes the resulting call terms in the candidate invariant (Section 5.3, p. 10).

how to do it:
1. identify external calls and their signatures
2. execute the external function on combinations of in-scope variables during trace generation
3. add call expressions as terms in the G-CLN input
4. train and validate as for ordinary terms

The evaluation supports binary external functions and handles `mod` in `fermat1` and `fermat2`; it also includes `gcd` in `egcd2`, `egcd3`, `lcm1`, and `lcm2` (Section 6.1, p. 11). The four gcd cases are checked manually because Z3 does not support gcd in this setup (Section 5.2.2, p. 10). Inference: Verus would instead need a trusted or proved `spec fn` contract for the external function; sampled behavior cannot replace that contract.

## evidence, contradictions, and implications for VL

On the NLA nonlinear benchmark, the denominator is 27 programs: G-CLN solves 26, Numinv 23, and PIE solves fewer listed cases; the reported G-CLN mean is 53.3 seconds (Table 2, Section 6.1, pp. 10–11). The unsolved `knuth` invariant contains a complex degree-three expression and `mod`; the paper attributes failure to the large candidate space (Section 6.1, p. 11). On Code2Inv, the source benchmark has 133 problems, but nine are held out as theoretically unsolvable, so the reported 124/124 success is over the 124 remaining problems (Section 6.4, p. 12). Stability uses 20 randomized runs per problem: the baseline CLN average convergence is 58.3%, versus 97.5% for G-CLN across six problems (Table 4, Section 6.3, pp. 11–12). The six-problem denominator is explicit in the table’s rows; the paper’s 39.2% improvement is the difference between those averages.

The paper’s soundness claims concern gating correspondence, fractional relaxation, and post-training SMT checking. They do not show that finite traces find an invariant when one exists, that the neural optimizer converges globally, or that the chosen term degree contains the needed invariant. Manual gcd checks enlarge the trusted surface. Inference: the strongest VL use is an offline invariant proposal loop with mandatory Verus checking and counterexample feedback. The threat to an agent-written verified-Rust product is low for soundness when Verus remains the acceptance gate, but medium for engineering reliability because unstable or overfit candidates can consume proof-search time and tempt weakening of specifications.

## techniques for the catalog

- trace-to-invariant workflow — instrument loops, expand terms, train a differentiable logic model, extract a formula, and solver-check it
- gated CLN structure learning — learn conjunction/disjunction structure with near-binary gates and extract an SMT formula recursively
- PBQU tight inequalities — use piecewise quadratic activations and coefficient normalization to learn informative bounds
- fractional sampling — relax selected integer semantics to continuous values for denser samples, then validate on the original program
- stabilized nonlinear training — combine feature normalization, term dropout, and gate/weight regularization
- external-call sampling — add sampled uninterpreted-call terms when loop bodies invoke unavailable functions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
