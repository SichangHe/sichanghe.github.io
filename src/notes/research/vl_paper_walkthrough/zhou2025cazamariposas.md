# Cazamariposas: Automated Instability Debugging in SMT-Based Program Verification
(authored by agents unless marked 🧑)
Tag: `zhou2025cazamariposas`, [paper](https://doi.org/10.1007/978-3-031-99984-0_5)

## problem and evidence
SMT-backed verifiers including Dafny, F*, and Verus can fail after semantically irrelevant edits such as variable renaming. The paper calls this proof instability and introduces Cazamariposas, which diagnoses and repairs individual unstable queries. Its key observation is: “for 61% the queries in our study, there is only a single quantified formula to blame!” (Introduction, p. 76.) The tool compares a passing and failing semantic mutant of the same query, mines quantifier instantiations, ranks edits, and tests repairs with Mariposa.

“We introduce a differential analysis to identify such problematic formulas.” (Introduction, p. 76.) The evaluation contains 615 unstable queries: 545 from five Dafny/F* projects and 70 from ten Verus projects (Section 5.2, p. 89). Cazamariposas repairs 431/615, approximately 70%; 375/615, approximately 61%, need one edit, and the remainder benefit from doubleton edits (Section 5.4, p. 90). Of the 70 Verus queries, 77% are repaired; Mariposa queries are repaired at 69% (p. 90). These are unstable-query denominators, not all verification queries.

## technique 1: create semantic mutants and differential profiles
Mariposa generates semantically equivalent mutants by reordering assertions, alpha-renaming variables, or changing the random seed (Section 2.2, p. 77). An unstable query has at least one passing mutant and one failing mutant. Cazamariposas obtains a solver proof log from the passing mutant and a trace log from the failing mutant, then compares the instantiation sets for each quantified formula (Section 4, pp. 80–81).

Steps:
1. Run Mariposa to determine whether the original query is stable (Section 4, p. 80).
2. Select a passing mutant and failing mutant of the same query (Section 4).
3. Collect a proof log from the passing mutant and a trace log from the failing mutant (Section 4).
4. Match corresponding quantified formulas across mutants and compute their instantiation differences (Section 2.2, p. 77; Section 4.3, p. 84).

Inference: this directly applies to Verus because the benchmark includes Verus SMT queries. VL could retain mutant pairs in CI and flag proofs whose success depends on assertion order or solver seed. The paper does not claim that a stable query proves semantic correctness; stability only addresses reproducibility.

## technique 2: edit-and-test repair
Cazamariposas treats each quantified axiom as a hypothesis and applies a query edit that weakens its reasoning, then tests the edited query for stability. “Cazamariposas follows an ‘edit-and-test’ scheme to identify stabilizing repair strategies.” (Section 4, p. 80.) The procedure is:
1. Hypothesize that reasoning over quantified axiom ϕ is causal (Section 4, p. 80).
2. Choose an edit that deletes, instantiates, replaces, or Skolemizes ϕ (Section 4.1, p. 81).
3. Construct candidate query Φ* and run Mariposa’s stability test (Section 4, p. 80).
4. Report ϕ and the edit if Φ* is stable; otherwise dismiss it temporarily (Section 4, p. 80).

The four singleton actions are `del` (remove an axiom), `inst` (add proof instantiations), `inst-del` (replace the quantified axiom by those instantiations), and `sk` (Skolemize an existential) (Table 1, p. 81). The authors prove soundness because edits preserve or weaken the context while leaving the verification goal unchanged (Section 4.1, p. 82). They limit search to singleton and doubleton edits and test at most k=10 candidates of each class (Section 4.1, p. 83).

Inference: a Verus source-level analogue is to hide an unrelated function, add targeted quantifier triggers/instantiations, or restructure an existential witness. The paper explicitly notes that `del` corresponds to Dafny opaque visibility and that `inst` corresponds to source-level quantifier annotations; exact Verus syntax must come from Verus documentation, not this paper.

## technique 3: triage quick unknown versus timeout
The tool distinguishes quick-unknown (QU) failures, where the solver returns `unknown` quickly, from slow-timeout (TO) failures, where it exhausts its budget (Section 4.2, p. 83). QU suggests missing instantiations; TO suggests excessive irrelevant instantiations. In the benchmark, approximately 43% of Verus failures occur within one second and the rest at the 10-second timeout; Mariposa has approximately 19% within 10 seconds and 78% at 60 seconds (Section 5.3, p. 89). Median instantiation counts are 4,587 for Mariposa QU and 270,396 for Mariposa TO (p. 90).

Inference: VL can classify verifier failures by elapsed time and log profile before proposing a fix. The threshold is benchmark-specific: Verus artifacts use 10 seconds, while Mariposa uses 60 seconds (Section 5.1, p. 88).

## technique 4: differential metrics and dependency graphs
For each quantified formula, Deficit counts instantiations present in the passing proof but absent from the failing trace; Excess counts trace instantiations absent from the proof (Section 4.3, p. 84). High Deficit prioritizes `inst` for QU. High Excess prioritizes `inst-del` or `del` for TO, subject to preserving completeness. Existential formulas use Contingency, counting proof instantiations that depend on their Skolem constant (Section 4.3).

For TO, the tool builds an instantiation graph with nodes `(instantiation, formula)`. Edges represent pattern-trigger dependencies and equational rewrites; it adds Skolemizing and nesting dependencies, collapses the graph to formula nodes, and normalizes edge weights by incoming impact (Section 4.4, pp. 86–87). It then ranks singleton and doubleton edits. Inference: this graph is a useful Verus diagnostic artifact for identifying which quantified invariant or imported function triggers solver blow-up, but implementing it requires Z3 trace access.

## technique 5: targeted repairs for Verus examples
In a Verus `lemma_from_after`, Cazamariposas identified an unrelated imported `make_stateful_set` definition as the instability cause and recommended hiding it, yielding a stable query (Section 3.1, p. 79). In `entry_alive_wraps`, the solver lacked an instantiation bridging Verus’s guarded `Euc_Div` and SMT-LIB division. Cazamariposas Skolemized the negated universal, searched for dependent quantifiers, and found an instantiation that stabilized the proof (Section 3.2, pp. 79–80). Inference: these examples suggest debugging imported axioms and arithmetic encoding before rewriting the verified algorithm.

## evidence, trust, and limits
Cazamariposas is 4,730 lines of Python. Stability tests use 180 mutants per query; Z3 is version 4.13.0. Proof-log production required four Z3 versions, a one-hour timeout, and up to 256 mutants; four Mariposa and three Verus proof-production failures were counted as unfixed (Section 5.1, p. 88). Thus the 70% repair result includes tool failures and depends on Z3-specific logs and timeouts.

The repair is sound relative to the SMT verification goal, but deleting or replacing quantified axioms can sacrifice broader completeness (Section 4.1, p. 82). Source-level translation is not automatic, and higher-order axioms may have no direct source equivalent (Section 4.1, p. 82). Inference: for VL, instability threatens developer time and CI reproducibility rather than the mathematical soundness of a successful proof; however, an engineer could accidentally apply a repair that weakens useful context. VL should record the original query, edit, and proof obligation and require review when an edit changes axioms. Prior work already covers preemptive normalization and context pruning; VL should not redo those generic mitigations without measuring the Verus-specific repair benefit.

## techniques for the catalog
- semantic-mutant diagnosis: compare passing and failing equivalent SMT mutants to expose instability
- edit-and-test repair: weaken one quantified axiom, rerun stability testing, and report edits that stabilize
- failure-mode triage: distinguish quick unknown from timeout to choose missing- versus excessive-instantiation fixes
- differential quantifier metrics: rank axioms with Deficit, Excess, and existential Contingency
- instantiation dependency graph: trace pattern, rewrite, Skolem, and nesting causes to rank interacting edits
- bounded singleton/doubleton search: test the top ten one- and two-axiom edits before giving up
Checked 2026-10-14 against the paper by a Codex agent: audit record zhou2025cazamariposas; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
