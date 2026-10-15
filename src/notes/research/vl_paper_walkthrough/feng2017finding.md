# Finding Polynomial Loop Invariants for Probabilistic Programs
(authored by agents unless marked 🧑)
Tag: `feng2017finding`, [paper](http://arxiv.org/abs/1707.02690v1)

## scope and claimed result
The paper synthesizes quantitative polynomial loop invariants for probabilistic programs. Its abstract gives the pipeline: “First, we fix a polynomial template as a candidate of a loop invariant. Using Stengle’s Positivstellensatz and a transformation to a sum-of-squares problem, we find sufficient conditions on the coefficients. Then, we solve a semidefinite programming feasibility problem to synthesize the loop invariants.” (Abstract, p. 1) If the SDP is infeasible, the method increases template degree; the abstract calls the result semi-complete, conditional on small numerical errors (Abstract, p. 1).

## technique 1: quantitative loop-invariant obligations
what it is
For a probabilistic loop `while(G){body}`, the paper uses weakest pre-expectation `wp` and an expectation-valued invariant I. Theorem 5 states three obligations: boundary (`preE ≤ I` and `I·(1−χG) ≤ postE`), invariant (`I·χG ≤ wp(body,I)`), and soundness (almost-sure termination plus one of finite iterations, bounded I, or vanishing expected guarded value) (Section 3, pp. 5–6).

when to use it
Use this decomposition when the desired specification compares expected pre- and post-values. The paper explicitly focuses on boundary and invariant conditions because soundness can be checked separately for the case studies (Section 3, p. 6).

steps
1. Express the loop's pre-expectation, post-expectation and guard as polynomial constraints and compute `wp` for the loop-free body using the transformer equations (Section 2.2, pp. 4–5).
2. Choose an expectation template I of bounded polynomial degree d (Section 3, p. 6).
3. Generate the boundary and guarded-body inequalities from Theorem 5; for the paper's random-walk example these become constraints (4)–(8), including `I ≤ 0.5 I(x+1,y,z+1)+0.5 I(x−1,y,z+1)` under `0<x<y` (Section 3, pp. 7–8).
4. Discharge almost-sure termination and boundedness separately; do not infer them from an SDP solution (Theorem 5, p. 6).

verus form
Inference: In Verus, encode deterministic expectations as ghost `spec fn`s over a state and represent probabilistic choices by a ghost distribution or weighted relation. State boundary and preservation as `ensures` on proof functions. Verus does not provide a probabilistic `wp` primitive, so the transition expectation and almost-sure termination argument must be modeled explicitly or remain outside the Rust proof.

evidence and limits
The theorem is a sufficient proof rule, not a synthesis result. It assumes loop-free bodies and separately supplied soundness conditions. Inference: using this in VL applies naturally to deterministic abstractions only after probability is removed; probabilistic semantics would enlarge the trusted specification.

## technique 2: Stengle-to-SOS-to-SDP synthesis
what it is
Each implication `F ⇒ G` from the invariant obligations is converted into emptiness of a semialgebraic set. Stengle's Positivstellensatz certifies emptiness by finding a positive-cone, monoid and ideal combination equal to zero (Theorem 4, Section 2.3, pp. 5–6). The paper then uses Lemma 8 to convert emptiness to SDP feasibility, or the simpler sufficient SOS multipliers of Lemma 9 (Section 4, pp. 8–10).

when to use it
Inference: use it for polynomial guards and expectations over real-valued variables, including nonlinear programs. Lemma 9 is a sufficient relaxation: it is usually faster but can reject a valid invariant even when a more general Positivstellensatz certificate exists (Section 4.1, p. 10).

steps
1. Normalize each implication by De Morgan's laws and split disjunctive antecedents, obtaining `∧i(fi Di 0) ⇒ g ≥ 0` with `Di` either `≥` or `=` (Section 4.1, p. 9).
2. Encode validity as emptiness of the set satisfying all antecedent constraints, `−g≥0`, and `g≠0` (Section 4.1, p. 9).
3. Apply Lemma 8 for an exact SDP reduction, or Lemma 9's multipliers: for `f≥0⇒g≥0`, require `g−u f` SOS with `u≥0`; for `f=0⇒g≥0`, require `g−v f` SOS; for conjunctions, require a multiplier combination to be SOS (Section 4.1, pp. 9–10).
4. Translate SOS constraints to a semidefinite program using the Gram-matrix construction in Appendix A/B (Section 4, pp. 8–10).
5. Solve the SDP, extract template coefficients, round them to rationals, and symbolically check every original obligation (Algorithm 1, Section 4.1, pp. 10–11).

verus form
Inference: Verus can consume a candidate polynomial as a ghost `spec fn` and prove each SOS-derived inequality with arithmetic lemmas and `assert` statements. SDP solving and Gram decomposition are not Verus constructs; they are an external candidate generator. The final proof must recheck the exact rational coefficients, so floating-point multipliers cannot be trusted as proof facts.

evidence and limits
The random-walk example uses a quadratic template with ten coefficients and obtains `I = z − x² + xy` after dropping terms below 10^-6; the paper then checks all constraints including (6) and (8) (Example 11, pp. 11–12). The paper cautions: “we cannot be sure whether the resulting invariant is correct if the remaining coefficients are approximate.” (Section 4.3, p. 13) It therefore recommends symbolic CAD checking. Inference: this exact recheck is mandatory before importing any generated lemma into VL.

## technique 3: refinement and degree backtracking
what it is
Algorithm 1 searches degree d templates, refines constraints after an invalid rounded candidate, and raises d by 2 after SDP infeasibility. The algorithm's explicit steps are: initialize `d:=2`, choose `I∈R≤d[Xn]`, create an SDP, repeatedly assign and round coefficients, validate, refine if invalid, and increment d by 2 when no feasible candidate remains (Section 4.1, Algorithm 1, p. 10).

when and how
Inference: use refinement when numerical rounding gives a false or trivial candidate; use degree increase when the current monomial basis cannot express an invariant. In Example 11, constraints are strengthened with multipliers and then sent to SeDuMi (Section 4.1, pp. 10–12). Section 4.3 also turns `x≠0` into `xy≥1` with a fresh variable y, and equality `x=0` into `x≥0∧x≤0`, to fit polynomial-inequality machinery (p. 13). The authors caution: “Constraint refinement cannot be handled automatically in the current version, but we plan to add it together with projection for rounding solutions in a future version.” (Section 5, p. 14)

verus form
Inference: A Verus workflow can iterate candidate ghost lemmas externally, then check each candidate in a fixed proof module. Degree changes alter only the candidate expression; the program and its representation invariant stay fixed. Constraint strengthening must be justified as a logical consequence of the guard, not copied blindly from floating-point output.

evidence and limits
The paper calls the procedure semi-complete: theoretically it reaches a feasible solution when one exists and numerical errors are small, but practice may fail because of floating-point SDP results (Abstract, p. 1; Section 4.1, p. 10). Constraint refinement is manual in the prototype (Section 5, p. 14). The experiments use Python, YALMIP and SeDuMi, Maple CAD, Intel i7-4710HQ, 16 GiB RAM and 32-bit Windows 7 (Section 5, p. 14).

## technique 4: nested-loop compositional synthesis
what it is
For one terminating inner loop, the paper fixes outer template I and inner template `Iinn`, computes `I˜ := wp(body2,I)`, uses `I˜` as the inner post-expectation, and couples the outer and inner constraints in (9) (Section 4.2, pp. 12–13). Lemma 12 proves that satisfying these coupled constraints implies the original outer-loop obligations.

steps
1. Write the program as `while(G){body1; while(Ginn){bodyinn}; body2}` with loop-free fragments (Section 4.2, p. 12).
2. Fix equal-degree templates I and `Iinn`; compute `wp(body2,I)` exactly (p. 12).
3. Set `preEinn=Iinn` and `postEinn=wp(body2,I)`; solve the six inequalities in (9) together (pp. 12–13).
4. Apply the same SOS/SDP and validation process to the coupled constraints (Section 4.2, p. 13).

verus form
Inference: In Verus, this corresponds to separate outer and inner loop invariants, with the inner postcondition linked to the outer continuation by a ghost lemma. The coupling must be proved compositionally; an SDP candidate does not prove termination of the inner loop.

evidence and limits
The paper reports that its prototype solved examples within one second and was about one tenth the time of LIP, but these are aggregate claims over its case-study suite, not a per-program denominator (Introduction, p. 3; Section 5.1, pp. 14–15). It compares tools on 14 programs, with failures for nonlinear, continuous or nested cases depending on tool (Section 5.1, pp. 15–16). Inference: reported speedups are not evidence of Verus proof throughput.

## what is proved, measured, and trusted
The paper proves the loop-invariant rule (Theorem 5), SOS sufficient conditions (Lemma 9), nested-loop reduction (Lemma 12), and semi-completeness in the idealized exact-arithmetic setting. Measurements concern prototype runtime and tool feature coverage; they do not measure proof-kernel assurance. Trusted components include SDP solvers, floating-point rounding, Maple CAD validation, probability semantics, and manually supplied termination arguments. Inference: threat to agent-written verified Rust is medium to high when numerical candidates are accepted without exact rechecking; low after rationalization and independent Verus proof of every obligation.

## what VL should reuse
Inference: VL should reuse the boundary/invariant split, SOS certificates as candidate generators, degree backtracking, and symbolic post-validation. It should not treat SDP feasibility or a small coefficient as a proof, and it should not omit almost-sure termination. The paper does not address Rust ownership or Verus syntax.

## techniques for the catalog
- quantitative probabilistic loop invariant: prove boundary, guarded-body preservation and a separate termination/soundness condition for an expectation-valued invariant
- Stengle-to-SOS synthesis: reduce polynomial implication obligations to semialgebraic emptiness, SOS multipliers and SDP feasibility
- candidate refinement and degree backtracking: round and validate coefficients, refine failed constraints, then increase template degree by two
- nested-loop composition: couple outer and inner polynomial templates through a verified inner pre-expectation
Checked 2026-10-15 against paper feng2017finding: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
