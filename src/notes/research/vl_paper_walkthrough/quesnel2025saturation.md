# Saturation-Driven Dataset Generation for LLM Mathematical Reasoning in the TPTP Ecosystem
(authored by agents unless marked 🧑)
Tag: `quesnel2025saturation`, [paper](https://arxiv.org/abs/2509.06809)

## scope and pipeline

Quesnel and Sileo turn automated theorem proving into a generator of machine-checkable reasoning data. Their abstract states: “Our pipeline is principled and simple: saturate axioms, filter for "interesting" theorems, and generate tasks.” (Abstract, PDF p. 1.) The source is the TPTP library of more than 30,000 axioms in 50+ domains. E-prover runs saturation without a conjecture, AGInTRater scores derived clauses, NetworkX structures the graph, and Vampire validates generated queries. The output is not a fixed theorem list but a parameterized generator for entailment, premise selection, and proof-graph reconstruction.

The authors claim “100% Valid by Construction” (Figure 1, PDF p. 3). Their separate validation claim is qualified: “Its efficiency allows us to rapidly validate the thousands of logical entailment queries needed to generate our benchmark tasks with 100% confidence up to Vampire timeouts .” (Section 3.3, PDF p. 4.) Inference: validity of symbolic derivations and successful completion of every validation query are different claims. The paper does not specify how timed-out queries are labeled or excluded.

## technique 1: exhaustive saturation and proof graphs

what it is and when to use it. Saturation repeatedly applies superposition-calculus inferences such as resolution and paramodulation to explore consequences of an axiom set, subject to computational limits. Use it to derive a broad consequence graph from axioms without selecting one target conjecture. The paper says saturation is “bounded by computational limits, such as a timeout, due to the combinatorial explosion of clauses.” (Section 3.1, PDF p. 3.)

how it is done. (1) Select a TPTP domain and axiom file in clausal normal form. (2) Configure E-prover in pure saturation mode with no conjecture. (3) Run until saturation or timeout. (4) Request the full proof graph, recording every derived clause and its parent or parents. (5) Store the directed acyclic graph (DAG) for downstream filtering and task extraction. The paper’s method section explicitly chooses E because it can run as a generative saturation engine rather than a goal-directed prover.

evidence and limits. The initial benchmark samples five domains—Algebra, Fields, Geometry, Set Theory, and Topology—and generates 3,000 problems, 50 unique instances per configuration (Section 5.1, PDF p. 7). The authors describe the scope as “we exhaustively explore a part of the deductive closure of the axioms, a process limited in practice by a prover timeout.” (Section 2, PDF p. 2.) The authors contrast it with a random linear-resolution generator that does not guarantee complex or diverse exploration (Related Work, PDF p. 2).

Verus form. Inference: use a Verus-checked axiom or contract corpus as the source graph, then generate candidate lemmas or proof obligations externally. Verus does not implement E’s first-order saturation engine, so this is a data-generation layer, not a Verus proof construct. Each generated Rust obligation must still be compiled and verified by Verus; a graph edge from an external prover is not evidence that Verus accepts the corresponding code.

## technique 2: interest filtering with derivation-aware metrics

what it is and when to use it. Saturation produces many trivial, redundant, or unwieldy clauses. AGInTRater scores each non-axiom clause using its formula complexity, surprisingness of symbol co-occurrences, and usefulness as a lemma. Use it to prioritize non-trivial consequences before building tasks (§3.2, PDF pp. 3–4).

how it is done. (1) Give AGInTRater the complete derivation graph, not isolated formulas. (2) Compute a complexity/weight score that penalizes large statements. (3) Compute surprisingness from how rarely function and predicate symbols co-occur in the original axioms. (4) Compute usefulness as the ratio of interesting descendants to total descendants. (5) Retain the top-scoring items for each domain and proof-depth setting. The paper warns that this is a heuristic: “We use it to prioritize non-trivial theorems in a principled way, without claiming alignment with human judgments of mathematical interest.” (Section 3.2, PDF p. 4.)

evidence and limits. The paper reports no evaluation of agreement with human interest judgments.

Verus form. Inference: score candidate Verus lemmas from their dependency graph and verification cost, but keep scoring outside specifications. A score cannot justify a lemma; the final `verus` run and its explicit contracts do that. Avoid turning an untrusted generated clause into a trusted axiom merely because AGInTRater ranks it highly.

## technique 3: independent validation with a second prover

what it is and when to use it. Use a different theorem prover as an oracle to validate each extracted entailment and inference. The paper uses Vampire after E generation, because it reports Vampire as fast and high-performing in CASC competitions.

how it is done. Use Vampire to determine the True/False label for each perturbed entailment query (§4.1, PDF p. 5), support iterative premise pruning (§4.2, PDF pp. 5–6), and check each proposed child clause against its two parents in reconstruction (§4.3, PDF p. 7). The paper gives no detailed solver-status policy for false labels or timeouts. Inference: retain solver status and timeout settings in dataset metadata rather than treating an unresolved query as a negative label.

evidence and limits. The paper says Vampire validates “the thousands of logical entailment queries needed to generate our benchmark tasks with 100% confidence up to Vampire timeouts.” (Section 3.3, PDF p. 4.) This is an author claim with an explicit timeout qualification, not a proof of completeness. Inference: cross-checking with two independent implementations reduces accidental generator errors but does not remove shared assumptions about logic, parser, axioms, or solver soundness.

Verus form. Inference: use Verus itself as the acceptance oracle for generated Rust proof fragments, and optionally replay a mathematical abstraction in another prover. The product prerequisite check should use the exact Verus version and dependency set used to build the artifact; external validation is supplementary evidence.

## technique 4: conjecture entailment task generation

what it is and when to use it. Generate a true/false task that asks whether a perturbed premise set entails a target theorem while showing foundational context for understanding. This isolates deductive validity from domain familiarity.

how it is done. (1) Select an interesting theorem T. (2) Traverse backward to collect all foundational axioms A_context. (3) Traverse only d proof levels to obtain sufficient immediate premises P_correct. (4) Apply k transformations that add, remove, or replace clauses from the original derivation graph, producing P_perturbed. (5) Present A_context as background, P_perturbed as the only allowed proof premises, and T as the query. (6) Use Vampire to determine the True/False label. The paper states: “The ground truth (True or False) for this specific entailment is predetermined by Vampire.” (Section 4.1, PDF p. 5.)

evidence and limits. Entailment and premise selection use four difficulty levels; entailment perturbations k∈{2,3,4,6}. The dataset has 50 instances per configuration and five domains (Section 5.1). Inference: for Verus, analogous tasks can vary available lemmas or contracts while checking the target with Verus; a Rust compile failure is not equivalent to logical falsehood, so labels must distinguish syntax, type, and proof failures.

## technique 5: minimal premise selection

what it is and when to use it. Given a theorem and a noisy pool, identify a minimal sufficient set of premises. It measures relevance selection rather than merely proving from a supplied proof.

how it is done. (1) Select T and its foundational context. (2) Extract a sufficient set P_sufficient by backward traversal to depth d. (3) Apply iterative pruning to P_sufficient using Vampire to obtain P_minimal; the paper does not specify the pruning order or solver-status handling. (4) Add k plausible distractor clauses from the same domain. (5) Shuffle and number the pool, then ask for the indices of P_minimal. The generation steps are in §4.2 (PDF pp. 5–6), the prompt example is in §8.1.2 (PDF pp. 11–12), and k∈{2,4,6,8} is specified for evaluation in §5.1 (PDF p. 7).

evidence and limits. The required output is “the list of indices corresponding to the premises in Pminimal” (§4.2, PDF p. 6), but the paper does not specify an exact-match scoring rule or treatment of alternative sufficient subsets. Its 3,000-problem total covers all three tasks (§5.1, PDF p. 7). The example lists four premises but gives “[1 , 3 , 7]” as expected output (§8.1.2, PDF p. 12). Inference: this example contains an invalid index. Iterative deletion can establish that no retained premise can be removed without losing sufficiency; it does not establish the smallest cardinality among all sufficient subsets. Verus training could apply this pruning pattern to imported lemmas or assumptions.

## technique 6: proof-graph reconstruction

what it is and when to use it. Shuffle clauses from a complete proof DAG and require a model to recover each child’s two parents. This tests global dependency planning rather than local entailment.

how it is done. (1) Select a proof subgraph whose non-axiom nodes each have exactly two parents. (2) Choose a target depth d and retain a graph with node count consistent with that depth and at least one path to axioms of exact length d. (3) Dissociate and shuffle all unique clauses. (4) Ask the model to emit `CHILD_INDEX <- PARENT_1_INDEX, PARENT_2_INDEX`. (5) First check acyclicity and exactly two distinct parents from the supplied list per derived node; structurally invalid outputs score zero. (6) For structurally valid outputs, use Vampire to check each proposed inference and score the proportion of sound steps. The two-stage metric is specified in §4.3 (PDF pp. 6–7).

evidence and limits. Reconstruction uses d∈{1,2,3,4}; the authors say deeper tasks proved intractable (§5.1, PDF p. 7). Table 1 labels its task type “All” and reports average scores (%), not an entailment/selection-only breakdown: gpt-5 93, 68, 54, 44 across Easy–Very Hard; gpt-5-mini 72, 48, 37, 41; gpt-5-nano 65, 38, 29, 35 (§5.2, PDF p. 8). Inference: neither smaller model’s table row decreases monotonically, since both score higher on Very Hard than Hard.

Inference: the high-effort discussion is internally inconsistent. Section 5.2 says “the model consistently failed to produce globally correct proof graphs” for exploratory d=4 reconstruction (PDF p. 8). However, §8.2.4 states: “The model provides a perfect reconstruction of the proof graph, identifying all 18 dependencies correctly without any missing or hallucinated edges.” (GPT-5(high), PDF p. 17.) Section 8.2 describes approximately 15 minutes of reasoning time per model on one topology example (PDF p. 14). Inference: the appendix supplies a counterexample to the main text’s blanket failure claim; this single example does not establish a success rate.

Verus form. Inference: represent a candidate proof as a dependency DAG of Verus lemmas, then validate structure and invoke Verus on each edge or complete module. Verus proofs can use `proof fn`, `requires`, `ensures`, and loop invariants; the external graph format should not be mistaken for executable code. A valid local lemma edge does not guarantee the assembled module’s contracts compose.

## what is proved, measured, and trusted

The experiments measure zero-shot scores for gpt-5-nano, gpt-5-mini, and gpt-5 with low reasoning effort (§5.1, PDF p. 7). The paper works exclusively in CNF (§7, PDF p. 9), describes the 3,000-problem evaluation as a proof of concept (§7), and proposes fine-tuning, iterative saturation, and support for full first-order logic as future work (§6, PDF p. 9). Inference: the symbolic results depend on the input axioms, parsers, prover implementations, and scoring code. They do not demonstrate improvements from training on the generated data.

## techniques for the catalog

- saturation generation: run E-prover without a conjecture to record a consequence DAG
- derivation-aware interest filtering: rank clauses by complexity, surprisingness, and descendant usefulness
- independent prover validation: replay extracted entailments in Vampire with explicit timeouts
- perturbed entailment tasks: vary premises and label whether they entail a target
- minimal premise selection: prune a sufficient set with prover checks, then add distractors
- proof-graph reconstruction: shuffle binary proof DAGs and score structural plus logical validity
