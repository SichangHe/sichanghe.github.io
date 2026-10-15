# A Datalog Hammer for Supervisor Verification Conditions Modulo Simple Linear Arithmetic
(authored by agents unless marked 🧑)
Tag: `bromberger2021dataloghammer`, [paper](http://arxiv.org/abs/2107.03189v1)

## scope and result
This paper gives a decision procedure for a restricted first-order logic used to specify runtime supervisors. The setting is BS(SLR), the Bernays–Schönfinkel fragment with simple linear real arithmetic: arithmetic atoms are simple bounds on one variable, rather than general relations between variables. The paper’s central claim is: “Our first contribution is decidability of BS(SLR) with respect to universally quantified conjectures, Section 3, Lemma 12.” (Section 1, p. 2.) It then translates Horn instances to Datalog so a finite rule engine can decide both universal and existential conjectures. The paper states: “This hammer constitutes a decision procedure for both universal and existential conjectures.” (Section 1, p. 3.)

The motivating architecture runs certified and newly updated variants in parallel. A small supervisor compares their suggestions and explanations; agreement over a long enough period can dynamically certify an updated variant. The paper says: “The supervisor itself consists of a rather small set of rules that can be automatically verified and run by a reasoner.” (Section 1, p. 2.) The Datalog hammer is therefore a verification-condition compiler, not a monitor that proves arbitrary Rust.

Inference: the useful lesson for VL is to isolate a decidable verification-condition fragment and compile it to a complete backend. This is a possible specialized path for small, relational supervisor policies, but it does not replace Verus’s contract and ownership proofs.

## technique: finite test-point abstraction for quantified BS(SLR)

when to use it
Use the grounding hammer when clauses and the conjecture are in BS(SLR), and the conjecture is universal or existential. The theory relies on simple bounds such as `x < c`, `x ≥ c`, `x = c`, and their negations. The paper warns that allowing difference constraints such as `x − y ≤ c` would make the counterexample search undecidable (Section 3, p. 9). The method is complete only for the stated fragment.

how the paper constructs it
1. Rewrite a universal consequence `N |= ∀ȳ.φ` as the absence of an interpretation satisfying `N ∧ ∃ȳ.¬φ` (Section 3.0.1, p. 8). A counterexample to the conjecture is therefore the object to search for.
2. Collect every arithmetic bound from the clause set and conjecture, including the bound and its negation. Sort these endpoints into intervals in which all simple bounds have the same truth value (Section 3.0.1, pp. 8–9).
3. Let `m = max(1, |vars(φ)|)`. Choose one test point for each singleton interval and `m` distinct test points for every non-singleton interval. The paper explains that any assignment to the conjecture uses at most `m` different points per interval (Section 3.0.1, p. 9).
4. Add interval-membership lower and upper bounds for each chosen point, substitute those constants for the quantified variables, and form a finite ground BS(SLR) abstraction (Section 3.0.1, pp. 9–10).
5. Decide the ground formula with a satisfiability procedure. Unsatisfiability of the abstraction means no counterexample exists, hence the universal conjecture follows; satisfiability yields a concrete counterexample assignment (Lemma 12, pp. 10–11).

The paper summarizes the reason for the reduction: “This means we reduce a quantified problem over an infinite domain into a ground problem over a finite domain.” (Section 3, p. 7.) It also states the cost: “The size of the ground problem grows worst-case exponentially in the number of variables and the number of numeric constants in N and the conjecture.” (Section 3, p. 7.)

Verus form
Inference: represent each relational clause as a Verus predicate or executable relation over explicitly bounded scalar types, and represent a conjecture as a `forall`-style specification only where the Verus subset and solver support it. More robustly, generate the finite test points outside Verus, instantiate a Verus lemma or `assert` for each point, and prove that the finite abstraction covers the desired bound partition. The interval-completeness argument is a new lemma that must itself be proved; Verus will not infer it from a set of examples. The source paper’s first-order predicates, substitutions, and satisfiability formulas are not Verus syntax.

## technique: Datalog hammer for Horn clauses

what it is
The Datalog hammer specializes the finite abstraction to HBS(SLR), the Horn fragment. Instead of eagerly grounding every rule over every test point, it keeps the original rules and adds finite facts for theory atoms. The paper contrasts the two methods: “It keeps the original clauses almost one-to-one instead of greedily computing all ground instances of those clauses over the test points.” (Section 3, p. 7.) It then explains the replacement: “The Datalog hammer adds instead a finite set of Datalog facts that correspond to all theory atoms over the given set of test points.” (Section 3, p. 7.)

step-by-step
1. Check that the supervisor is a Horn BS(SLR) clause set and that positive universal or existential conjectures can be flattened to the supported form (Section 5, p. 20).
2. Compute the same interval partition and test-point set as the grounding hammer (Section 3, pp. 7–10).
3. Generate facts for all relevant theory atoms over those points. Keep the Horn rules nearly unchanged, adding facts rather than a huge set of grounded rules (Section 3, p. 7).
4. Run a Datalog engine to derive consequences. Groundings that produce no new facts are skipped, avoiding work on trivially satisfied rules (Section 3, p. 7).
5. Encode the query and inspect whether the expected goal is derivable. For universal queries, the implementation adds `expected` facts for each grounding and uses stratified negation to derive `missing` when an expected atom is not entailed (Section 5, pp. 20–21).
6. Return the entailment result. The transformation is equisatisfiability-preserving for the supported fragment (Section 3, p. 7; Lemma 14, p. 13).

The paper identifies the practical advantage: “Therefore, the Datalog approach is much faster in practice because the Datalog reasoner wastes no time (and space) on trivially satisfied ground rules that would have been part of the greedily computed ground HBS(SLR) clause set.” (Section 3, p. 7.)

Verus form
Inference: a Verus implementation would encode each rule as a lemma over an abstract state or a pure relation, then use a finite ghost set of test-point facts. Use `proof fn` and `lemma` for derivation; do not call proof code at runtime. A state-machine `invariant` can express that every derived fact respects the rule relation, but `invariant` is a declaration inside the state-machine proof, not a function call. The Datalog engine and stratified negation remain external unless VL builds a verified interpreter. The paper’s Horn restriction should be retained as an explicit precondition on the compiler.

## technique: supervisor verification conditions as executable rule specifications

The lane-change case study models variant suggestions, lane safety, vehicle positions, and speed explanations as predicates. A rule says an action is excluded when an updated variant’s suggestion is disproven or the action is declared unsafe; another propagates an unsafe action from the certified variant to all variants (List 1, p. 18). The paper explains: “To select a safe action, the supervisor must exclude all unsafe actions.” (Section 4, p. 19.) It also gives an ECU case where the properties include forbidden actuator values and existence and uniqueness of outputs for all sensor data (Section 4, p. 19).

how to apply it
1. Identify each input, explanation, and candidate action as a predicate argument.
2. Write Horn clauses for local safety checks and cross-variant propagation.
3. Express safety as existential conjectures (for example, whether a forbidden output can occur) and totality or uniqueness as universal conjectures (Section 5, pp. 20–21).
4. Run the hammer; retain the status (`true` if the conjecture is a consequence, `false` otherwise) and the generated finite abstraction as an audit artifact.

Inference: in VL, this technique fits policy code around a verified component. Verus can prove the component’s Rust contract, while a separate rule compiler checks consistency among multiple implementations or explanations. The two proofs have different trusted bases and should not be conflated.

## evidence and limits

The implementation is SPASS-SPL plus Rulewerk/VLog. The paper calls it “the first implementation of a decision procedure for HBS(SLR) with positive conjectures.” (Section 5, p. 20.) Experiments use two real-world supervisor encodings: a lane-change assistant and an engine-control unit. The machine had 32 Intel Xeon Gold 6144 processors and 754 GB RAM; tools ran without parallel reasoning and each problem had a 40-minute limit (Section 5, p. 21).

The benchmark table contains 8 lane-change and 6 ECU problems, 14 total. The hammer solves every listed problem. Its total times range from 0.2 seconds to 22.6 seconds: for example, `lc_e1` is existential/true at 0.2 s, `ecu_u4` is universal/true at 12.4 s, and `ecu_u5` is universal/true at 22.6 s (Figure 2, p. 21). The denominator is 14 benchmark rows, not all possible supervisor conditions. The table’s `B` column is the number of introduced test points/constants; it ranges from 15 to 1,609 in these rows. The paper reports time components separately for hammering, parsing, and reasoning (Figure 2, p. 21).

The comparison tools are cvc4-1.8, z3-4.8.10, spacer, and vampire-4.5.1. Several timeout at the 40-minute limit, especially ECU universal problems; for example, z3 times out on `ecu_u2`, `ecu_u5`, and `ecu_u6`, while the hammer takes 1.1, 22.6, and 11.6 seconds respectively (Figure 2, p. 21). The paper’s claim is bounded to this benchmark and configuration: “The experiments show that only our toolchain solves all the problems in reasonable time.” (Section 5, p. 22.) Inference: the fraction is 14/14 for the listed rows, but “reasonable” is qualitative and the benchmarks are prototypical rather than a random sample.

The paper states a complexity tradeoff: grounding grows exponentially in the maximum variables per clause, while the Datalog hammer’s growth is exponential in the number of variables in a universal conjecture (Section 6, p. 22). Its implementation is expressly limited: it cannot handle positively grounded theory atoms beyond simple bounds except variable comparisons, and positive universal conjectures must be flattened to `Λ ∧ P(x̄)` (Section 5, p. 20). It also says future work includes producing explanations that prove translation correctness and improving test-point selection (Section 6, p. 23). These are unresolved trust and scalability boundaries.

## trusted boundary, contradictions, and threat to VL

The mathematical soundness argument assumes the BS(SLR) syntax restrictions, the interval abstraction lemmas, and correct implementation of SPASS-SPL, Rulewerk, and VLog. The supervisor’s rule model, sensor abstraction, and conjectures are also trusted inputs. A decision procedure proves the encoded conjecture; it does not show that the predicates capture a real vehicle or engine.

The paper’s “first implementation” claim is scoped to HBS(SLR) with positive conjectures, while the experiments include both existential and universal rows; no contradiction follows because both are within the stated fragment. The table has 14 rows, but the text does not report independent repetitions, variance, or failed runs outside the listed instances. Inference: performance percentages beyond 14/14 would be unsupported.

Inference: the threat to agent-written verified Rust is low for general code and moderate for a narrow supervisor layer. This work does not verify Rust, memory safety, ownership, concurrency implementation, or solver translation into Verus. It could nevertheless make a product’s policy layer easier to audit by compiling a restricted rule language to a complete finite backend. The added trusted compiler and model of the environment would be a new attack surface. VL should measure whether the restriction captures useful policies and whether generated explanations can be checked independently.

## what VL should not redo

Inference: VL should not present finite test-point abstraction, Horn-to-Datalog compilation, or universal/existential supervisor-condition checking as new general verification ideas. A new contribution would need a Verus-specific, independently checked translation, a broader fragment with a proof of completeness, or measured maintenance and explanation benefits in real Rust systems.

## techniques for the catalog

- test-point abstraction: partition simple-arithmetic bounds into intervals and decide quantified consequences using finitely many representative constants
- Horn Datalog hammer: preserve Horn rules, add theory facts over test points, and use a Datalog engine for complete entailment in HBS(SLR)
- stratified-negation query encoding: represent missing expected groundings with `expected` and `missing` facts to check universal claims efficiently
- supervisor rule verification: encode cross-variant safety, lane, and actuator conditions as Horn clauses and classify existential or universal conjectures
Checked 2026-10-14 against the paper by a Codex agent: audit record bromberger2021dataloghammer; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
