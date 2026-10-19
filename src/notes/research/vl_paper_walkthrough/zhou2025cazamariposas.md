# Cazamariposas: Automated Instability Debugging in SMT-Based Program Verification
(authored by agents unless marked 🧑)
Tag: `zhou2025cazamariposas`, [paper](https://doi.org/10.1007/978-3-031-99984-0_5)

## problem and evidence
SMT-backed verifiers including Dafny, F*, and Verus can fail after semantically irrelevant edits such as variable renaming. The paper calls this proof instability and introduces Cazamariposas, which diagnoses and repairs individual unstable queries. Its key observation is: “for 61% the queries in our study, there is only a single quantified formula to blame!” (Introduction, p. 76.) The tool compares a passing and failing semantic mutant of the same query, mines quantifier instantiations, ranks edits, and tests repairs with Mariposa.

“We introduce a differential analysis to identify such problematic formulas.” (Introduction, p. 76.) The evaluation contains 615 unstable queries: 545 from five Dafny/F* projects and 70 from ten Verus projects (Section 5.2, p. 89). Cazamariposas repairs 431/615, approximately 70%; 375/615, approximately 61%, are stabilized with one edit, and another 56 are repaired with doubleton edits (Section 5.4, p. 90). Of the 70 Verus queries, 77% are repaired; Mariposa queries are repaired at 69% (p. 90). These are unstable-query denominators, not all verification queries.

## technique 1: create semantic mutants and differential profiles
Mariposa generates semantically equivalent mutants by reordering assertions, alpha-renaming variables, or changing the random seed (Section 2.2, p. 77). An unstable query has at least one passing mutant and one failing mutant. Cazamariposas obtains a solver proof log from the passing mutant and a trace log from the failing mutant, then compares the instantiation sets for each quantified formula (Section 4, pp. 80–81).

Steps:
1. Run Mariposa to determine whether the original query is stable (Section 4, p. 80).
2. Select a passing mutant and failing mutant of the same query (Section 4).
3. Collect a proof log from the passing mutant and a trace log from the failing mutant (Section 4).
4. Match corresponding quantified formulas across mutants and compute their instantiation differences (Section 2.2, p. 77; Section 4.3, p. 84).

Inference: VL could retain mutant pairs in CI and flag Verus proofs whose success depends on assertion order or solver seed.

## technique 2: edit-and-test repair
Cazamariposas treats each quantified axiom as a hypothesis and applies a query edit intended to reduce the solver’s reasoning obligations, then tests the edited query for stability. “Cazamariposas follows an “edit-and-test” scheme to identify stabilizing repair strategies.” (Section 4, p. 80.) The procedure is:
1. Hypothesize that reasoning over quantified axiom ϕ is causal (Section 4, p. 80).
2. Choose an edit that deletes, instantiates, replaces, or Skolemizes ϕ (Section 4.1, p. 81).
3. Construct candidate query Φ* and run Mariposa’s stability test (Section 4, p. 80).
4. Report ϕ and the edit if Φ* is stable; otherwise dismiss it temporarily (Section 4, p. 80).

The four singleton actions are `del` (remove an axiom), `inst` (add proof instantiations), `inst-del` (replace the quantified axiom by those instantiations), and `sk` (Skolemize an existential) (Table 1, p. 81). For `del`, `inst`, and `inst-del`, soundness follows because the axiom context is no stronger and the verification goal is unchanged. The only action allowed on the goal is `sk`, which preserves satisfiability (Section 4.1, p. 82). Search is limited to singleton and doubleton edits; the evaluation first tests k=10 singleton candidates, then 10 doubleton candidates only if no singleton succeeds (Section 4.1, p. 83; Section 5.4, p. 90).

The paper states that “del corresponds to source-level visibility control mechanisms” and “inst corresponds to quantifier instantiations as source-level annotations” (Section 4.1, p. 82). It relates `sk` to Hilbert’s choice, which selects a value satisfying a predicate. Inference: VL could present these SMT edits alongside the Verus examples below, while checking whether each edit has a source-level equivalent.

## technique 3: triage quick unknown versus timeout
The tool distinguishes quick-unknown (QU) failures, where the solver returns `unknown` quickly, from slow-timeout (TO) failures, where it exhausts its budget (Section 4.2, p. 83). The authors hypothesize that QU indicates missing key instantiations and TO indicates excessive irrelevant instantiations. These are hypotheses, not a definitive diagnosis from elapsed time alone. In the benchmark, approximately 43% of Verus failures occur within one second, barely any between one and ten seconds, and the rest at the 10-second timeout; Mariposa has approximately 19% within 10 seconds and 78% at 60 seconds (Section 5.3, p. 89). Median instantiation counts are 4,587 for Mariposa QU and 270,396 for Mariposa TO (p. 90).

Inference: VL can classify verifier failures by elapsed time and log profile before proposing a fix. The timeout budget is benchmark-specific: Verus artifacts use 10 seconds, while Mariposa uses 60 seconds (Section 5.1, p. 88).

## technique 4: differential metrics and dependency graphs
For each quantified formula, Deficit counts instantiations present in the passing proof but absent from the failing trace; Excess counts trace instantiations absent from the proof (Section 4.3, p. 84). For QU, singleton edits use `inst`, ranked by Deficit first and negative Excess second; a candidate is dropped if none of its proof instantiations can be materialized without additional Skolemization. Existential formulas have zero Deficit and Excess; Contingency counts proof instantiations containing their Skolem constant. QU doubleton edits first Skolemize an existential, then instantiate a dependent universal, ranked by Contingency first and Deficit second (Sections 4.3–4.4, pp. 84–85).

For TO, the tool builds an instantiation graph with nodes `(instantiation, formula)`. Edges represent pattern-trigger dependencies and equational rewrites; it adds Skolemizing and nesting dependencies, collapses the graph to formula nodes, counts the parallel edges, and divides each edge count by the total incoming edge count of its destination. It estimates transitive impact by fixed-point iterations and ranks edits by the sum of Excess weighted by that impact. The implementation considers an increment of at most 10⁻⁴ converged; the authors give no theoretical convergence guarantee. It chooses `del` when deletion preserves the proof, otherwise `inst-del`, falling back to `inst` when Skolem dependencies block full instantiation, and finally `sk` if necessary. Doubleton ranking initializes both target formulas’ impact ratios to one and uses the same scoring and action heuristic (Section 4.4, pp. 86–88). Inference: this graph is a useful Verus diagnostic artifact for identifying which quantified invariant or imported function triggers solver blow-up, but implementing it requires Z3 trace access.

## technique 5: targeted repairs for Verus examples
In a Verus `lemma_from_after`, Cazamariposas identified an unrelated imported `make_stateful_set` definition as the instability cause and recommended hiding it, yielding a stable query (Section 3.1, p. 79). In `entry_alive_wraps`, the solver lacked an instantiation bridging Verus’s guarded `Euc_Div` and SMT-LIB division. Cazamariposas Skolemized the negated universal, searched for dependent quantifiers, and found an instantiation that stabilized the proof (Section 3.2, pp. 79–80). Inference: these examples suggest debugging imported axioms and arithmetic encoding before rewriting the verified algorithm.

## evidence, trust, and limits
Cazamariposas is 4,730 lines of Python. Stability tests use 180 mutants per query; Z3 is version 4.13.0. Proof-production workarounds included first finding an unsatisfiable core and producing a proof from that core, trying four Z3 versions, extending the timeout to one hour, and trying up to 256 mutants; four Mariposa and three Verus proof-production failures were counted as unfixed (Section 5.1, p. 88). Inference: the 70% result includes proof-production failures and should be interpreted under the reported solver and timeout settings.

The repair is sound relative to the SMT verification goal, but deleting or replacing quantified axioms can sacrifice broader completeness (Section 4.1, p. 82). Source-level translation remains future work. The authors warn that “del on an axiom for higher-order functions has no direct source-level equivalent” and that adding many instantiations can be impractical (Section 4.1, p. 82). Inference: VL should retain the original query, edited query, and verification goal so developers can inspect a proposed repair and its source-level applicability.

## techniques for the catalog
- semantic-mutant diagnosis: compare passing and failing equivalent SMT mutants to expose instability
- edit-and-test repair: reduce reasoning obligations over a quantified formula, rerun stability testing, and report edits that stabilize
- failure-mode triage: distinguish quick unknown from timeout to choose missing- versus excessive-instantiation fixes
- differential quantifier metrics: rank axioms with Deficit, Excess, and existential Contingency
- instantiation dependency graph: trace pattern, rewrite, Skolem, and nesting causes to rank interacting edits
- bounded singleton/doubleton search: test the top ten one- and two-axiom edits before giving up
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Our notion of causality extends the instantiation graph from the SmtScope (formerly the Axiom Profiler) [4], a tool to analyze instantiation loops and other sources of poor performance in pattern-based SMT solvers."): checked all quotations, numbers, section and page references, technique steps, and the DOI link; corrected the doubleton repair count, goal-edit soundness explanation, candidate-limit reference, QU and TO ranking details, and proof-production workarounds; removed unsupported source-edit suggestions and marked interpretations as Inference; did not reproduce experiments, inspect the implementation, or verify external Verus documentation.
