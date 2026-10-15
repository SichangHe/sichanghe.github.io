# MathAtlas: A Benchmark for Autoformalization in the Wild
(authored by agents unless marked 🧑)
Tag: `patel2026mathatlas`, [paper](http://arxiv.org/abs/2605.14061v1)

## what the benchmark contains

Patel et al. introduce MathAtlas, a benchmark for converting graduate-level textbook mathematics into Lean 4. It contains definitions, theorem statements, exercises, examples, and proofs extracted from 103 textbooks in 87 areas. The abstract reports “∼ 52k theorems, definitions, exercises, examples, and proofs extracted from 103 graduate mathematics textbooks” and “a mathematical dependency graph containing ∼ 178k relations.” (Abstract, p. 1) The introduction also says the collection contains “∼ 51k informal entities”. (Section 1, p. 2) The paper does not reconcile the rounded 51k and 52k counts; the precise Section 2 count is 52,052 entities.

The benchmark's key design is dependency-aware evaluation. An entity can refer to other textbook entities, mathematical objects, and local variables. An object-reference edge points to the entity that defines that object, forming a dependency tree. Dependency depth is the maximum tree height; dependency mass is the number of unique nodes. The motivating example is a theorem that refers to Dedekind rings, prime ideals, and principal ideal rings: a system may need to retrieve or synthesize those definitions before formalizing the target (Figure 1, pp. 2–3).

The benchmark separates syntactic compilation from semantic faithfulness. A generated Lean term counts as correct only if it compiles and preserves the informal meaning. The paper states: “A formal statement must both compile and be faithful to the informal statement for it to be considered correct.” (Section 3, p. 5) This distinction is essential for verified Rust generation: compiling Rust and passing Verus are necessary checks, but they do not show that the specification expresses the intended requirement.

## technique 1: build a dependency-aware corpus

what it is

The construction pipeline converts textbook PDFs to mathematical Markdown, extracts entities, extracts references and definition names, retrieves relation candidates, and creates a directed dependency graph. Entities are definitions, theorems, proofs, examples, or exercises. The relation types are entity references, object references, local-variable references, and proof-to-theorem “proves” edges.

how to do it

1. Collect PDFs from multiple mathematical fields and convert them to MMD with Nougat (Appendix A, p. 14).
2. Run a few-shot, prompt-engineered `gpt-oss-120b` entity extractor. Require JSON objects with `type`, optional `identifier`, and exact `text`, using structured decoding and temperature 0.3 (Appendix A, p. 14).
3. Run a reference extractor on each entity. Require JSON objects with `term` and one of `object_reference`, `entity_reference`, or `local_variable_reference` (Appendix A, p. 14).
4. Run a name extractor on definitions to list the objects being defined, again with schema-constrained JSON and temperature 0.3 (Appendix A, p. 14).
5. Embed each entity and metadata in ChromaDB with Mistral E5. Retrieve candidate matching entities, then ask `gpt-oss-120b` to select a correct relation while considering context and preferring the same textbook when scores tie (Appendix A, p. 15).
6. For definitions, query LeanSearch for ten Mathlib candidates and use a prompted model to select a match; release all ten candidates as well as the selected one (Appendix A, p. 15).
7. Add relations from references to their target entities and from proofs to the theorem they prove (Section 2.2, p. 4).

The paper gives a concrete extractor example: for `M is compact iff G is abelian`, it labels `M` and `G` as local-variable references and `compact` and `abelian` as object references (Figure 6, p. 14). Its Appendix B prompt requires exact contiguous text, explicit labels when present, and no invented entities.

evidence and limits

On a human-annotated random sample of 250 entities, 90.4% were valid overall. The type-specific validity denominators are 50 each: definitions 49/50 (98.0%), theorems 47/50 (94.0%), proofs 40/50 (80.0%), examples 43/50 (86.0%), and exercises 47/50 (94.0%) (Table 1b, p. 5). On 100 sampled references, 96% were correctly extracted. Relation retrieval and selection reached overall F1 94.8%, with 99% recall and 91% precision; entity-reference F1 was 94.7% (100% recall, 90% precision) and object-reference F1 94.9% (98% recall, 92% precision) (Table 1a, p. 5). These are small human-annotated samples, not all 52,052 entities.

Inference: A VL analogue would index Rust APIs, specification definitions, imported contracts, and lemma dependencies, with source spans and exact identifiers. The graph could route a generated proof to missing contracts before invoking Verus. Inference: relation extraction errors would create either missing proof prerequisites or false dependencies, so every automatically retrieved dependency should be checked by compilation or a proof obligation.

## technique 2: evaluate compilation and semantic faithfulness separately

what it is

MathAtlas reports compile rate, faithfulness among compiling outputs, and correctness as their conjunction. MA-Align is a 200-item benchmark of syntactically correct statements and definitions labeled aligned or misaligned by humans. The paper evaluates CriticLean and LLM-as-judge prompts on MA-Align, ConsistencyCheck, and CriticLeanBench.

how to do it

1. Generate a Lean 4 formalization for each informal entity.
2. Run Lean v4.24.0 and record whether it compiles. The authors use `blv` for compile rate (Section 3, p. 5).
3. For compiling outputs, evaluate semantic alignment against the informal entity with a faithfulness judge.
4. Report `Compiles`, `Faithful` (the percentage of compiling outputs judged faithful), and `Correct` (the percentage of all inputs that both compile and are faithful), preserving denominators and split labels (Table 3, p. 7).
5. Evaluate the judge itself on MA-Align's 200 balanced examples, rather than treating an LLM judge as ground truth (Section 3.1, p. 5).

Table 2 shows that the engineered gpt-5.2 prompt scores 86.0 on MA-Align definitions and 80.0 on statements, while CriticLean 32B scores 80.0 and 75.0, respectively. The table reports percentages over the benchmark's labeled examples; the paper does not state separate per-column denominators beyond the 200 total.

Verus form (inference)

Inference: Apply the same three-way accounting to Rust/Verus: parsing and Rust compilation, Verus proof checking, and semantic/specification faithfulness. A model-generated `ensures` clause can compile and verify while omitting a requirement. A faithfulness review can flag this but remains a heuristic unless tied to an executable reference model or human review. Inference: a VL benchmark should publish the number of targets in each split, the number that compile, the number that verify, and the number whose specifications pass an independent intent check.

evidence and limits

The authors find judge performance drops on the graduate-level MA-Align benchmark. They choose CriticLean 32B as the primary metric because gpt-5.2 is proprietary and expensive, while CriticLean is open source and still correlated with human evaluations (Section 3.2, p. 6). The conclusion warns that both CriticLean and strong LLM judges have room to improve. Inference: no judge score should be treated as a formal proof of semantic equivalence.

## technique 3: dependency-aware autoformalization experiments

what it is

The benchmark has a statement split combining theorems, examples, and exercises, and a definition split. It deliberately evaluates statements without requiring complete proofs, because many entities lack prerequisite theory. The paper also tests whether Mathlib grounding, local context, dependency depth, and dependency mass affect success.

how to apply the experimental protocol

1. Split entities into definitions and statements; leave proof and full-theorem formalization for future work (Section 4.1, p. 6).
2. For prompted systems, run zero-shot and few-shot conditions with `gpt-oss-20b` and `gpt-oss-120b`. Add an engineered prompt, graduate-level examples, or the preceding 500 tokens as local context (Section 4.2, p. 7).
3. For statements, compare fine-tuned systems including ReForm 8B and other released baselines (Section 4.2, p. 7).
4. Evaluate the approximately 700 deepest dependency-tree entities as MA-Hard, mostly approximately 600 statements and 100 definitions across 14 subjects (Section 4.1, p. 6).
5. Compare correctness against maximum dependency depth and whether a definition is grounded in Mathlib (Section 4.3, pp. 8–9).
6. Report every compile, faithfulness, and correctness percentage with the model and split.

The strongest definition system is gpt-oss-120b with tuned examples: 28.5% compile, 58.5% faithful among compiling outputs, and 16.7% correct overall (Table 3a, p. 7). The strongest statement system is ReForm 8B with 19.0% compile, 48.4% faithful, and 9.8% correct (Table 3b, p. 7). The denominator for each percentage is its full split; `Faithful` uses compiling outputs as its denominator, while `Correct` uses all examples. The paper explicitly illustrates the gap with Kimina 7B: 27.3% compile but 2.3% correct (Section 4.3, p. 8).

MA-Hard exposes dependency difficulty. gpt-oss-20b reaches 14.3% compile, 14.7% faithful among compiling outputs, and 2.1% correct; gpt-oss-120b reaches 14.6%, 17.8%, and 2.6%, respectively (Table 4, p. 9). The paper reports a statistically significant difference in dependency-depth distributions for correct and incorrect examples, with two-sample Kolmogorov–Smirnov `p < 0.001` (Section 4.3, p. 8). Mathlib-grounded definitions are correct at 27.9%, versus 16.8% for missing definitions, with chi-square `p < 0.001` (Section 4.3, p. 8).

The local-context ablation is negative for the best prompted system: adding 300 tokens reduces definitions from 20.3% to 17.4% and statements from 10.5% to 8.6% (Section 4.3, p. 8). The paper's earlier setup describes a 500-token context window, while this result says 300 tokens; it does not explain the discrepancy. Inference: context length and model condition must be recorded exactly before reproducing the result.

Verus form (inference)

Inference: Build VL splits by specification complexity and dependency depth: standalone functions, functions requiring imported contracts, and functions whose proofs depend on long lemma chains. For each generated Rust item, record Rust compile, Verus verify, and independent requirement-faithfulness labels. Dependency depth can be the maximum imported-contract/lemma path; dependency mass can be the number of unique specifications required. Inference: a Verus benchmark should include definitions of ghost state and APIs, not only theorem-like postconditions, because missing definitions are a central failure mode in MathAtlas. Inference: add a “VL-Hard” split selected by deepest dependency paths and report degradation separately.

evidence and product boundary

MathAtlas tests autoformalization, not complete theorem proving. It leaves proof entities and full theorem proofs for future work. Approximately 30% of entities come from Springer textbooks; the public open split contains the remaining 70%, while all MA-Hard examples are open (Section 4.1, p. 6). Copyright exclusions may bias coverage, and the conclusion says research mathematics is left for future work. No implementation or model weights have been released for some cited prior systems, and the authors state their reimplementation failed to match reported numbers (footnote 9, p. 10).

Proved or measured: extraction validity and relation F1 on annotated samples; compilation, faithfulness, and correctness rates under named Lean models; depth and Mathlib-grounding correlations. Trusted: PDF-to-MMD conversion, prompted extractors, retrieved relation candidates, Lean and `blv`, faithfulness judges, human labels, and the informal-to-formal specification of each entity. Inference: for agent-written verified Rust, the threat is high for specification drift and long dependency chains. A proof that Verus accepts can still encode a weaker property, and a retrieved contract can be wrong even if downstream proofs pass. MathAtlas already supplies the benchmark pattern VL needs: preserve dependency metadata, separate compile/prove from semantic faithfulness, and stress the deepest dependency trees. VL should not redo a benchmark that reports only compile success.

## techniques for the catalog

- dependency-aware corpus construction: extract entities, references, names, and graph relations from mathematical texts
- schema-constrained extraction: use structured JSON outputs and exact spans for entities and references
- dependency retrieval and grounding: retrieve candidate definitions, select matches with context, and expose all candidates
- compile-plus-faithfulness metric: count correctness only when syntax compiles and meaning aligns
- dependency-depth stress testing: evaluate a deepest-tree subset separately from average examples
- context and grounding ablations: measure local-context and existing-library effects with model, split, and denominator
- judge calibration: test semantic-faithfulness metrics on a labeled benchmark instead of assuming judge scores are truth

Checked 2026-10-15 against the paper by a Codex agent for mathatlas_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
