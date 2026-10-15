# Saturation-Driven Dataset Generation for LLM Mathematical Reasoning in the TPTP Ecosystem
(authored by agents unless marked 🧑)
Tag: `quesnel2025saturation`, [paper](https://www.semanticscholar.org/paper/be48834ba66a0c2081dfa37f6f57b4f7853a9450)

## scope and pipeline

Quesnel and Sileo turn automated theorem proving into a generator of machine-checkable reasoning data. Their abstract states: “Our pipeline is principled and simple: saturate axioms, filter for \"interesting\" theorems, and generate tasks.” (Abstract, PDF p. 1.) The source is the TPTP library of more than 30,000 axioms in 50+ domains. E-prover runs saturation without a conjecture, AGInTRater scores derived clauses, NetworkX structures the graph, and Vampire validates generated queries. The output is not a fixed theorem list but a parameterized generator for entailment, premise selection, and proof-graph reconstruction.

The main soundness claim is conditional: every retained theorem is a consequence of the selected axioms under the prover’s logic and timeout behavior. The figure describes the result as “100% Valid by Construction” (Figure 1, PDF p. 3), while the text qualifies Vampire validation as confidence “up to Vampire timeouts” (Section 3.3, PDF p. 4). Those are different guarantees: prover acceptance supports the generated instance, but timeout or an incorrect axiom/library remains outside the experiment.

## technique 1: exhaustive saturation and proof graphs

what it is and when to use it. Saturation repeatedly applies superposition-calculus inferences such as resolution and paramodulation to a clause set until no further useful clause is found or a computational limit intervenes. Use it to derive a broad consequence graph from axioms without selecting one target conjecture. The paper says saturation is “bounded by computational limits, such as a timeout, due to the combinatorial explosion of clauses.” (Section 3.1, PDF p. 3.)

how it is done. (1) Select a TPTP domain and axiom file in clausal normal form. (2) Configure E-prover in pure saturation mode with no conjecture. (3) Run until saturation or timeout. (4) Request the full proof graph, recording every derived clause and its parent or parents. (5) Store the DAG for downstream filtering and task extraction. The paper’s method section explicitly chooses E because it can run as a generative saturation engine rather than a goal-directed prover.

evidence and limits. The initial benchmark samples five domains—Algebra, Fields, Geometry, Set Theory, and Topology—and generates 3,000 problems, 50 unique instances per configuration (Section 5.1, PDF p. 7). Saturation is exhaustive only within its timeout and configured calculus; it does not enumerate an infinite deductive closure. The authors contrast it with a random linear-resolution generator that does not guarantee complex or diverse exploration (Related Work, PDF p. 2).

Verus form. Inference: use a Verus-checked axiom or contract corpus as the source graph, then generate candidate lemmas or proof obligations externally. Verus does not implement E’s first-order saturation engine, so this is a data-generation layer, not a Verus proof construct. Each generated Rust obligation must still be compiled and verified by Verus; a graph edge from an external prover is not evidence that Verus accepts the corresponding code.

## technique 2: interest filtering with derivation-aware metrics

what it is and when to use it. Saturation produces many trivial, redundant, or unwieldy clauses. AGInTRater scores each non-axiom clause using its formula complexity, surprisingness of symbol co-occurrences, and usefulness as a lemma. Use it to select challenging but interpretable consequences before building tasks.

how it is done. (1) Give AGInTRater the complete derivation graph, not isolated formulas. (2) Compute a complexity/weight score that penalizes large statements. (3) Compute surprisingness from how rarely function and predicate symbols co-occur in the original axioms. (4) Compute usefulness as the ratio of interesting descendants to total descendants. (5) Retain the top-scoring items for each domain and proof-depth setting. The paper warns that this is a heuristic: “We use it to prioritize non-trivial theorems in a principled way, without claiming alignment with human judgments of mathematical interest.” (Section 3.2, PDF p. 4.)

evidence and limits. No human-interest accuracy denominator is reported; the metric is a curation device. High scores can select statements that are surprising but irrelevant to a product. Inference: for VeruLaw, replace or supplement generic scores with proof length, solver time, API coverage, and human review, then report the filtering threshold and retained/removed counts.

Verus form. Inference: score candidate Verus lemmas from their dependency graph and verification cost, but keep scoring outside specifications. A score cannot justify a lemma; the final `verus` run and its explicit contracts do that. Avoid turning an untrusted generated clause into a trusted axiom merely because AGInTRater ranks it highly.

## technique 3: independent validation with a second prover

what it is and when to use it. Use a different theorem prover as an oracle to validate each extracted entailment and inference. The paper uses Vampire after E generation, because it reports Vampire as fast and high-performing in CASC competitions.

how it is done. (1) Extract a candidate theorem, premises, or parent pair from the E graph. (2) Encode the entailment query for Vampire. (3) Run Vampire with a timeout. (4) Mark the item valid only when Vampire proves the query; retain the timeout boundary in the dataset metadata. For reconstructed graphs, validate each proposed child from its two parents.

evidence and limits. The paper says Vampire validates “the thousands of logical entailment queries needed to generate our benchmark tasks with 100% confidence up to Vampire timeouts.” (Section 3.3, PDF p. 4.) This is an author claim with an explicit timeout qualification, not a proof of completeness. Inference: cross-checking with two independent implementations reduces accidental generator errors but does not remove shared assumptions about logic, parser, axioms, or solver soundness.

Verus form. Inference: use Verus itself as the acceptance oracle for generated Rust proof fragments, and optionally replay a mathematical abstraction in another prover. The authoritative product gate should be the exact Verus version and dependency set used to build the artifact; external validation is supplementary evidence.

## technique 4: conjecture entailment task generation

what it is and when to use it. Generate a true/false task that asks whether a perturbed premise set entails a target theorem while showing foundational context for understanding. This isolates deductive validity from domain familiarity.

how it is done. (1) Select an interesting theorem T. (2) Traverse backward to collect all foundational axioms A_context. (3) Traverse only d proof levels to obtain sufficient immediate premises P_correct. (4) Perturb P_correct by adding, removing, or replacing k clauses, producing P_perturbed. (5) Present A_context as background, P_perturbed as the only allowed proof premises, and T as the query. (6) Use Vampire to determine the True/False label. The paper states that “the entailment question—\"Does this specific set of premises entail the theorem?\"—must be answered using only the statements in P_perturbed.” (Section 4.1, PDF p. 5.)

evidence and limits. Entailment and premise selection use four difficulty levels; entailment perturbations k∈{2,3,4,6}. The dataset has 50 instances per configuration and five domains (Section 5.1). Inference: for Verus, analogous tasks can vary available lemmas or contracts while checking the target with Verus; a Rust compile failure is not equivalent to logical falsehood, so labels must distinguish syntax, type, and proof failures.

## technique 5: minimal premise selection

what it is and when to use it. Given a theorem and a noisy pool, identify the smallest sufficient set of premises. It measures relevance selection rather than merely proving from a supplied proof.

how it is done. (1) Select T and its foundational context. (2) Extract a sufficient set P_sufficient by backward traversal to depth d. (3) Iteratively prune premises, querying Vampire after each removal, until P_minimal remains necessary and sufficient. (4) Add k plausible distractor clauses from the same domain. (5) Shuffle and number the pool, then ask for the indices of P_minimal. The paper’s generation steps and example are in §4.2 (PDF p. 6), with k∈{2,4,6,8} for evaluation.

evidence and limits. The metric is exact identification of the minimal index set; the denominator is the 3,000 generated problems split by configuration. Minimality is relative to the selected clause language and prover, and multiple equivalent minimal sets could exist. Inference: Verus training can retrieve a minimal subset of imported lemmas or assumptions, but a syntactically minimal set may be less maintainable than a documented contract.

## technique 6: proof-graph reconstruction

what it is and when to use it. Shuffle clauses from a complete proof DAG and require a model to recover each child’s two parents. This tests global dependency planning rather than local entailment.

how it is done. (1) Select a proof subgraph whose non-axiom nodes each have exactly two parents. (2) Choose a target depth d and retain a graph with node count consistent with that depth and at least one path of exact length d. (3) Dissociate and shuffle all unique clauses. (4) Ask the model to emit `CHILD_INDEX <- PARENT_1_INDEX, PARENT_2_INDEX`. (5) First check acyclicity and exactly two distinct parents per derived node. (6) For structurally valid outputs, use Vampire to check each proposed inference and score the proportion of sound steps. The two-stage metric is specified in §4.3 (PDF pp. 6–7).

evidence and limits. Reconstruction uses d∈{1,2,3,4}; deeper tasks were intractable. Table 1 reports average scores (%) on the entailment/selection benchmark: gpt-5 93, 68, 54, 44 across Easy–Very Hard; gpt-5-mini 72, 48, 37, 41; gpt-5-nano 65, 38, 29, 35 (Section 5.2, PDF p. 8). These are averages over the generated configurations, not per-item accuracy, and the table’s non-monotone gpt-5-mini Very Hard value is retained as reported. The paper says reconstruction is substantially harder and that even high-effort frontier models failed globally at d=4 (Section 5.2).

Verus form. Inference: represent a candidate proof as a dependency DAG of Verus lemmas, then validate structure and invoke Verus on each edge or complete module. Verus proofs can use `proof fn`, `requires`, `ensures`, and loop invariants; the external graph format should not be mistaken for executable code. A valid local lemma edge does not guarantee the assembled module’s contracts compose.

## what is proved, measured, and trusted

The pipeline measures zero-shot model scores under gpt-5-nano, gpt-5-mini, and gpt-5 with low reasoning effort (Section 5.1). It proves or validates generated logical relationships only through E/Vampire and their axiom files. Trusted elements include TPTP axioms, CNF translation, parser correctness, prover implementations, timeout semantics, and task-format scoring. The authors deliberately keep the first release at 3,000 problems as a proof of concept and plan iterative saturation and full first-order logic (Conclusion, PDF p. 9).

Inference: the threat to VeruLaw is beneficial and limited. Saturation can provide large, machine-checked training and regression sets for premise selection and proof-graph planning, but it does not generate Rust/Verus specifications or test environmental assumptions. VL should not redo generic TPTP saturation; it should adapt the extraction/validation pattern to Verus dependency graphs and publish denominators, solver versions, and timeouts. Existing work already covers symbolic data generation, so a new VL contribution would need evidence that Verus-specific graphs improve verified Rust proof completion or maintenance.

## techniques for the catalog

- saturation generation: run E-prover without a conjecture to record a consequence DAG
- derivation-aware interest filtering: rank clauses by complexity, surprisingness, and descendant usefulness
- independent prover validation: replay extracted entailments in Vampire with explicit timeouts
- perturbed entailment tasks: vary premises and label whether they entail a target
- minimal premise selection: prune a sufficient set with prover checks, then add distractors
- proof-graph reconstruction: shuffle binary proof DAGs and score structural plus logical validity

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
