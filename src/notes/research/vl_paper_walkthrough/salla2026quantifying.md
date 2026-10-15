# Quantifying Cross-Query Contradictions in Multi-Query LLM Reasoning
(authored by agents unless marked 🧑)
Tag: `salla2026quantifying`, [paper](https://www.semanticscholar.org/paper/ec874ffaa3afa4ec4538e2d38f635374a0acb34a)

## paper's problem and contribution
The paper treats a case file as shared premises plus several related questions. Its target failure is an answer set that looks locally plausible but is jointly inconsistent. The abstract defines the objective as “maintaining a globally satisfiable belief state across interdependent queries.” (§Abstract, PDF p. 1). It contributes a 390-case-file benchmark, set-level metrics, and a solver-augmented checker/repair method

The output label for each query is Entailed, Contradicted, or Unknown (§2, PDF p. 2). Unknown represents an underdetermined statement and prevents an unsupported commitment. The paper reports a headline change in SetCons from 0.56 to 0.94 (§Abstract and §5, PDF pp. 1, 9)

## technique 1: extract symbolic commitments and maintain a belief state

what it is

Each model answer is converted into a logical commitment. The case-file premises are represented by φ(P), and the commitment for query qi and answer ai by ψ(qi, ai). The accumulated state is Bt = φ(P) ∧ ψ(q1,a1) ∧ … ∧ ψ(qt,at) (§2, PDF p. 2). A bundle is consistent exactly when Bt is satisfiable; a contradiction is a transition from satisfiable Bt−1 to unsatisfiable Bt (§2, PDF p. 2)

The extractor is prompted to emit canonical CNF or SMT-LIB and then normalizes entity names and polarity. The paper states: “We keep the extraction language lightweight (no higher-order constructs) to preserve solver reliability and reduce parsing failures.” (§3.2.1, PDF p. 3)

when to use it

Use this when outputs share entities, variables, or premises and correctness must hold across the whole interaction. The benchmark includes relational SAT, temporal SMT, policy/rules, and underspecified/abductive cases (§4.1, PDF p. 6)

how to do it

1. Formalize the case file P as φ(P) in propositional logic, a decidable SMT fragment, or grounded finite-domain rules (§2 and §4, PDF pp. 2, 6)
2. Ask the model for a label and raw output yt for query qt (§3.2.1, PDF p. 3)
3. Apply ψt = fext(P, qt, yt) and normalize entities and polarity (§3.2.1, PDF p. 3)
4. Encode Entailed as χ(qt), Contradicted as ¬χ(qt), and Unknown as no polarity commitment (§3.2.1, PDF p. 3)
5. Conjoin ψt with Bt−1 to form Bt (§3.2.2, PDF p. 3)
6. Call SAT or SMT; accept the answer if Bt is satisfiable and continue otherwise (§3.2.2, PDF p. 3)

what transfers to Verus

Inference: In Verus, `spec fn` definitions can model φ, ψ, and the conjunction over a finite query history; a proof function can establish that an accepted history satisfies a satisfiability predicate. Inference: A Rust implementation would need a bounded representation of formulas or a trusted external solver interface, because the paper's CaDiCaL and Z3 calls are outside Verus's proof semantics. Inference: The Unknown label corresponds naturally to an explicit option whose contract forbids adding a polarity fact

evidence and limits

The benchmark has 390 case files and 2,450 query bundles: Relational/SAT 120, Temporal/SMT 100, Policy/Rules 80, and Underspecified/Abductive 90 (§4.1, PDF p. 6). Labels were independently assigned by three annotators; Fleiss' κ is 0.82. Solver validation covered 50 of 390 cases (13%), and solver output agreed with consensus for all 50 (§4.1, PDF p. 6). Inference: the remaining 340 cases rely on annotator agreement rather than direct solver validation

## technique 2: unsat-core localization and counterexample-guided repair

what it is

When Bt is unsatisfiable, the method requests an unsat core Ct, a subset of commitments that is itself inconsistent (§3.2.3, PDF p. 4). If the solver has no core support, deletion-based minimization removes constraints until the remaining set becomes satisfiable (§3.2.3, PDF p. 4). The core is used as a counterexample to global coherence

Repair considers the current commitment and, optionally, prior commitments in the core. The three actions are local flip, local soften, and selective retraction (§3.2.4, PDF p. 4). The paper says: “In practice, we prioritize minimal disruption by first attempting local flip or soften and only then retract prior commitments if the contradiction cannot be resolved otherwise.” (§3.2.4, PDF p. 4)

how to do it

1. On UNSAT, obtain Ct from the solver or compute it by deletion minimization (§3.2.3, PDF p. 4)
2. First try changing the current label, such as Entailed to Unknown (§3.2.4, PDF p. 4)
3. If needed, weaken the current commitment by dropping derived atoms (§3.2.4, PDF p. 4)
4. If still inconsistent, retract or weaken a bounded subset of earlier commitments in Ct (§3.2.4, PDF p. 4)
5. Prompt the LLM with P, qt, the conflicting commitments, and the diagnostic core or counterexample assignment (§3.2.4, PDF p. 4)
6. Accept a candidate only when the retained history plus the revised commitment is satisfiable (§3.2.4, PDF p. 4)
7. Select the candidate minimizing prior retractions, then label changes, then commitment size (§3.2.4, PDF p. 4)
8. Cap repair at one to three attempts (§3.2.4, PDF p. 4)

what transfers to Verus

Inference: A Verus checker can expose a proof obligation that a repaired history preserves a `satisfies` predicate, with a proof function establishing that a local flip or weakening removes the contradiction. Inference: Unsat cores and solver counterexamples would be ghost data or external diagnostics; the paper does not provide a Verus encoding of core extraction. Inference: Minimality is an optimization policy and would require an explicit finite measure and proof that the selected repair minimizes it

evidence

On the five-model deep subset, DeepSeek-R1 improves SetCons from 0.56 No-CoT to 0.88 Check and 0.94 Check+Repair, while RevisionCost falls from 1.9 to 0.6 and 0.3; these are bundle-level averages in Table 1 (§4.4, PDF p. 8). For gpt-oss-120b, SetCons is 0.52, 0.85, and 0.92 and RevisionCost is 2.1, 0.8, and 0.4 for the same three methods (Table 1, PDF p. 8). Table 3's deep-subset averages attribute an additional SetCons increase from 0.84 Check-only to 0.91 core-guided repair, with RevisionCost 0.8 to 0.4 (§4.6, PDF p. 8)

## technique 3: logic-filtered self-consistency

The optional variant samples K candidate answers, extracts commitments for each, discards candidates that make Bt unsatisfiable, and votes among the remainder (§3.3, PDF p. 5). This retains the per-query majority-vote idea while enforcing set-level satisfiability. The baseline uses K=20; its normalized overhead is 2.55–2.75×, compared with 1.44–1.58× for Check+Repair (§4.8, PDF p. 8). Inference: this is useful when sampling diversity is valuable but every candidate must pass a global consistency gate

## what is proved, measured, and trusted

The experiments use CaDiCaL for SAT and Z3 for SMT, with decidable fragments; the paper says these solvers “provide hard guarantees on satisfiability” (§4, PDF p. 6). Measured outcomes include Accuracy, Macro-F1, Unknown-F1, SetCons, prefix AUC, RevisionCost, ContradictionDensity, wall-clock overhead, and tool failures (§3.5, PDF p. 5). The method does not prove the natural-language extractor correct. The paper explicitly lists extraction noise and solver sensitivity as limitations and reports extraction accuracy of 91–95% across domains (§6, PDF p. 9)

Inference: For agent-written verified Rust, the closest reusable idea is to maintain a proof-visible state of commitments and reject any transition that violates a global invariant. Inference: The product threat is moderate for specification consistency and repair orchestration, not a replacement for Verus's memory-safety proofs. Inference: A generated proof can preserve a satisfiable formal state while the extractor omitted an operational requirement, so semantic coverage remains trusted

The headline 0.56→0.94 compares DeepSeek-R1 No-CoT with Check+Repair in Table 1, while Table 2 gives a breadth example of 0.62→0.97 for DeepSeek-R1; these are different subsets and must not be combined (§4.4–4.5, PDF pp. 8–9). This distinction resolves an apparent numerical mismatch in the abstract

## techniques for the catalog

- symbolic commitment extraction — translate each model answer into a normalized CNF or SMT-LIB commitment
- incremental satisfiability checking — conjoin commitments with the case file and reject transitions that make the state UNSAT
- unsat-core localization — identify a small inconsistent subset or approximate it by deletion minimization
- counterexample-guided minimal repair — flip, soften, or retract commitments and select the least disruptive satisfiable repair
- logic-filtered self-consistency — sample answers, remove globally inconsistent candidates, then vote

Checked 2026-10-15 against the paper by a Codex agent for quantifying_cross_query_contradictions_i_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
