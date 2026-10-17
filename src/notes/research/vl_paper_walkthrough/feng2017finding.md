# Finding Polynomial Loop Invariants for Probabilistic Programs
(authored by agents unless marked 🧑)
Tag: `feng2017finding`, [paper](http://arxiv.org/abs/1707.02690v1)

Page numbers below are pages of the arXiv v1 PDF (24 pages; references on pp. 14–16, Tables 1–3 on pp. 17–18, appendices A–D on pp. 19–24).

## scope and claimed result
The paper synthesizes quantitative polynomial loop invariants for probabilistic programs. Its abstract gives the pipeline: “First, we fix a polynomial template as a candidate of a loop invariant. Using Stengle’s Positivstellensatz and a transformation to a sum-of-squares problem, we find sufficient conditions on the coefficients. Then, we solve a semidefinite programming feasibility problem to synthesize the loop invariants.” (Abstract, p. 1) If the SDP is infeasible, the method increases template degree; the abstract calls the result semi-complete, conditional on small numerical errors (Abstract, p. 1).

## technique 1: quantitative loop-invariant obligations
what it is
For a probabilistic loop `while(G){body}`, the paper uses weakest pre-expectation `wp` and an expectation-valued invariant I. Theorem 5 (attributed to [15], Prinsys, not proved in this paper) states three obligations: boundary (`preE ≤ I` and `I·(1−χG) ≤ postE`), invariant (`I·χG ≤ wp(body,I)`), and soundness (the loop terminates with probability 1 from any state satisfying G, and one of: finite iterations, I bounded above by a constant, or expected value of `I·χG` tending to zero) (Section 3, p. 6). The body must be a loop-free probabilistic program (Section 3, p. 6).

when to use it
Inference: use this decomposition when the specification compares expected pre- and post-values. The paper focuses on boundary and invariant conditions and says of soundness: “The soundness property is left to be verified manually in case studies.” (Section 3, p. 7)

steps
1. Express the loop's pre-expectation, post-expectation and guard as polynomial constraints and compute `wp` for the loop-free body using the transformer equations (Section 2.2, pp. 4–5). The paper then rewrites expectations into disjoint normal form (a sum of `[Fi]·fi` with disjoint `Fi`), and Lemma 6 (from [21]) turns `f ≤ g` into the implications (3) (Section 3, pp. 7–8).
2. Choose an expectation template I of bounded polynomial degree d; Algorithm 1 starts at d = 2 and the template contains all monomials of degree ≤ d (Section 4.1, pp. 9–10).
3. Generate the boundary and guarded-body inequalities from Theorem 5; for the paper's random-walk example these become constraints (4)–(8), including `I ≤ 0.5 I(x+1,y,z+1)+0.5 I(x−1,y,z+1)` under `0<x<y` (Example 7, pp. 7–8).
4. Discharge almost-sure termination and boundedness separately. The paper does not check them in its algorithm (Section 3, p. 7; proof of Lemma 12, p. 21: “The verification of soundness is not a part of our algorithm.”). Inference: they cannot be read off an SDP solution.

verus form
Inference: In Verus, encode deterministic expectations as ghost `spec fn`s over a state and represent probabilistic choices by a ghost distribution or weighted relation. State boundary and preservation as `ensures` on proof functions. Verus does not provide a probabilistic `wp` primitive, so the transition expectation and almost-sure termination argument must be modeled explicitly or remain outside the Rust proof.

evidence and limits
Theorem 5 is a sufficient proof rule (“it suffices to find a loop invariant”), not a synthesis result. It assumes loop-free bodies and separately supplied soundness conditions.

## technique 2: Stengle-to-SOS-to-SDP synthesis
what it is
Each implication `F ⇒ G` from the invariant obligations is converted into emptiness of a semialgebraic set. Stengle's Positivstellensatz (Theorem 4) says the set is empty iff there exist f in the positive cone, g in the multiplicative monoid and h in the ideal with `f + g² + h = 0` (Section 2.3, pp. 5–6). The paper then uses Lemma 8 (from [26,10]) to convert emptiness to SDP feasibility, or the simpler sufficient SOS multipliers of Lemma 9 (Section 4.1, pp. 8–10). The paper says Lemma 9 is often used in practice “for efficiency” (Section 4.1, p. 10).

when to use it
Inference: use it for polynomial guards and expectations over real-valued variables, including nonlinear programs. Lemma 9 is a sufficient relaxation (the paper: “a simpler yet sufficient procedure”, p. 9; Item (3) is “one of the possible sufficient relaxations”, p. 9). Inference: it can therefore reject a valid invariant even when a more general certificate exists.

steps
1. Normalize each implication by De Morgan's laws and split disjunctive antecedents, obtaining `∧i(fi Di 0) ⇒ g ≥ 0` with `Di` either `≥` or `=` (Section 4.1, pp. 8–9).
2. Encode validity as emptiness of the set satisfying all antecedent constraints, `−g≥0`, and `g≠0` (Section 4.1, p. 9).
3. Apply Lemma 8 for the SDP reduction (proof in Appendix C.1, pp. 19–20), or Lemma 9's multipliers: for `f≥0⇒g≥0`, require `g−u f` SOS with `u≥0`; for `f=0⇒g≥0`, require `g−v f` SOS with `v∈R`; for conjunctions of two constraints, require `g−r1 f1−r2 f2` SOS, with `ri≥0` where `Di` is `≥` (Lemma 9, p. 9; Appendix C.2, p. 20).
4. Translate SOS constraints to a semidefinite program using the Gram-matrix construction (Appendices A and B, pp. 19–20; Section 4.1, p. 10).
5. Solve the SDP, extract template coefficients and round them to rationals (Algorithm 1, lines 7–8, p. 10). The paper's symbolic check of the result is described in Section 4.3: ignore coefficients below about 10^-6 and verify the invariant with CAD (p. 12). Algorithm 1 itself only says “if I satisfies the boundary and invariant conditions” (line 9).

verus form
Inference: Verus can consume a candidate polynomial as a ghost `spec fn` and prove each SOS-derived inequality with arithmetic lemmas and `assert` statements. SDP solving and Gram decomposition are not Verus constructs; they are an external candidate generator. The final proof must recheck the exact rational coefficients, so floating-point multipliers cannot be trusted as proof facts.

evidence and limits
The random-walk example uses a quadratic template with ten coefficients (c0, c1, c2, c3, c11, c12, c13, c22, c23, c33) and obtains `I = z − x² + xy` after ignoring amounts below 10^-6 in the SeDuMi output; the paper then states this I “satisfies all constraints including (6) and (8)” (Example 11, pp. 10–11). The paper cautions: “we cannot be sure whether the resulting invariant is correct if the remaining coefficients are approximate.” (Section 4.3, p. 12) It therefore proposes symbolic checking with Cylindrical Algebraic Decomposition (CAD), run manually in Maple for the experiments (Section 4.3, p. 12; Section 5, p. 13).

## technique 3: refinement and degree backtracking
what it is
Algorithm 1 searches degree d templates, refines constraints after an invalid rounded candidate, and raises d by 2 after SDP infeasibility. The algorithm's explicit steps are: `d := 2`, choose `I∈R≤d[Xn]`, create an SDP, repeatedly assign and round coefficients, validate, refine if invalid, and set `d := d + 2` when constraints are no longer feasible (Section 4.1, Algorithm 1, p. 10). As printed, line 2 (`d := 2`) is inside the outer `loop`, so d would be reset on every pass. Inference: the intended initialization is before the loop.

when and how
Inference: use refinement when numerical rounding gives a false or trivial candidate; use degree increase when the current monomial basis cannot express an invariant. In Example 11, constraint (4) is refined with the initial condition `z = 0` (becoming `I − (xy − x²) − v·z ≥ 0`, with free multiplier v) before the SOS problem is sent to SeDuMi (Section 4.1, pp. 10–11). Section 4.3 turns `x≠0` into `xy≥1` with a fresh variable y, and equality `x=0` into `x≥0∧x≤0`, to fit polynomial-inequality machinery (p. 12). It also suggests strengthening a constraint (for example `x ≥ 0` to `x ≥ 0.1`) if the invariant still violates some constraint (p. 12). The authors caution: “Constraint refinement cannot be handled automatically in the current version, but we plan to add it together with projection for rounding solutions in a future version.” (Section 5, p. 13)

verus form
Inference: A Verus workflow can iterate candidate ghost lemmas externally, then check each candidate in a fixed proof module. Degree changes alter only the candidate expression; the program and its representation invariant stay fixed. Constraint strengthening must be justified as a logical consequence of the guard, not copied blindly from floating-point output.

evidence and limits
The paper says Algorithm 1 “is semi-complete in the sense that it will generate an invariant if there exists one” (Section 4.1, p. 9), with termination “guaranteed in principle by Theorem 4 and the equivalence between SOS and” SDP (Lemma 8) (p. 9), and adds that “due to numerical errors, the algorithm may fail to find I in practice” (p. 10). The abstract adds the condition “if one exists and numerical errors are small”. Inference: this claim is for the Lemma 8 version; the practical Lemma 9 relaxation is only sufficient, and the search is bounded by the template degree reached. The paper gives no formal proof of semi-completeness beyond this argument. Constraint refinement is manual in the prototype (Section 5, p. 13). The experiments use a Python prototype calling YALMIP with SeDuMi, Maple for CAD, an Intel Core i7-4710HQ with 16 GiB RAM and Windows 7 (32 bit) (Section 5, p. 13).

## technique 4: nested-loop compositional synthesis
what it is
For a program with a single terminating inner loop, the paper fixes outer template I and inner template `Iinn` (both of degree d), computes `I˜ := wp(body2,I)`, uses `I˜` as the inner post-expectation, and couples the outer and inner constraints in (9) (Section 4.2, pp. 11–12). Lemma 12 states that an invariant satisfying (9) also satisfies (2); its proof (Appendix C.3, p. 21) assumes the inner loop terminates.

steps
1. Write the program as `while(G){body1; while(Ginn){bodyinn}; body2}` with loop-free fragments; an inner loop inside an `if` is handled by strengthening G (Section 4.2, p. 11).
2. Fix templates I and `Iinn` of equal degree; `I˜ := wp(body2,I)` is easy to obtain since body2 is loop-free (p. 11).
3. Set `preEinn=Iinn` and `postEinn=wp(body2,I)`; solve the six (in)equalities in (9) together, where the inner loop's `preEinn ≤ Iinn` is required as an equality (pp. 11–12).
4. Inference: apply the same SOS/SDP and validation process to the coupled constraints; the paper does not spell this out for nested loops beyond the one example in Appendix D.4 (p. 24), where `postE = k`, `preE = 20(m − x)` and `I = k + 20(m − x)`.

verus form
Inference: In Verus, this corresponds to separate outer and inner loop invariants, with the inner postcondition linked to the outer continuation by a ghost lemma. The coupling must be proved compositionally; an SDP candidate does not prove termination of the inner loop.

evidence and limits
The Introduction says the technique “usually solves the problem within one second, which is about one tenth of the time taken by the tool described in [6]” (pp. 2–3), and Section 5.1 says LIP “is always about 10 times slower than our tool” (p. 13). The paper gives no per-program LIP times, only these aggregate statements. Section 5 says “the running time of our method is within one second” (p. 13), but Table 1 (p. 17) lists the nested-loop row at 1.6 s total (1.1 s in SeDuMi); all other rows are 0.2–0.7 s. Section 5 says the first eleven programs come from [6] and three further case studies were added (perceptron, airplane delay, nested loop); Table 1 has 15 rows because it also lists a second airplane-delay program. Section 5.1 reports that Prinsys fails on the non-linear examples, LIP fails on continuous variables or degree above 3, and TM fails on ruin, bin3 and geo directly, on the perceptron, and on nested loops (p. 13; feature comparison in Table 2, p. 17). Inference: reported speedups are not evidence of Verus proof throughput.

## what is proved, measured, and trusted
The paper proves the SOS sufficient conditions (Lemma 9, Appendix C.2), the nested-loop reduction (Lemma 12, Appendix C.3, assuming inner-loop termination), and sketches the Lemma 8 reduction (Appendix C.1). The loop-invariant rule (Theorem 5) is cited from [15], not proved here. Semi-completeness is argued informally (see technique 3). Measurements concern prototype runtime and tool feature coverage; they do not measure proof-kernel assurance. Inference: trusted components include SDP solvers, floating-point rounding, Maple CAD validation, probability semantics, and manually supplied termination arguments. Inference: threat to agent-written verified Rust is medium to high when numerical candidates are accepted without exact rechecking; low after rationalization and independent Verus proof of every obligation.

## techniques for the catalog
- quantitative probabilistic loop invariant: prove boundary, guarded-body preservation and a separate termination/soundness condition for an expectation-valued invariant
- Stengle-to-SOS synthesis: reduce polynomial implication obligations to semialgebraic emptiness, SOS multipliers and SDP feasibility
- candidate refinement and degree backtracking: round and validate coefficients, refine failed constraints, then increase template degree by two
- nested-loop composition: couple outer and inner polynomial templates through a verified inner pre-expectation
