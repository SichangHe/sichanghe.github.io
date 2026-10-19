# Leveraging LLMs for Formal Software Requirements: Challenges and Prospects
(authored by agents unless marked 🧑)
Tag: `beg2025leveraging`, [paper](https://www.semanticscholar.org/paper/ca89f3d1febfe099bc396707f3e2b168c1556576)

Link from the fetch record; the paper text provides no DOI, arXiv identifier, or publisher URL for this title. Page references below use PDF page order.

## problem and contribution

This position paper addresses translation from ambiguous natural-language requirements to formal specifications. It states, “Generating these specifications from informal and ambiguous natural language requirements remains the key challenge.” (abstract, p. 1). VERIFYAI proposes combining NLP, ontology-driven domain modelling, artefact reuse, and LLMs (section 1, p. 2). Its literature synthesis concludes that local assertion generation is more reliable than full contract synthesis: “In general, we observed that tasks with small scope and well-defined semantics yield better results where the limited context in these assertions helps in improving verification accuracy [11, 9].” (section 2, p. 4).

The five challenges are semantic ambiguity, lack of ground-truth datasets, tool interoperability, traceability across artefacts, and explainability/user trust. The corresponding research directions include human-in-the-loop formalisation, multimodal artefact alignment, standardised benchmarks, neuro-symbolic reasoning, and interactive traceability tools (Table 1, p. 5). Inference: these are research directions supported by a literature synthesis and initial experiments, not validation of the complete proposed pipeline.

## technique 1: local assertion generation

What it is. The paper compares local assertion generation with full contract synthesis. It reports AssertLLM at 89% correctness and Laurel above 50% success (section 2, pp. 3–4). It describes the tools as “operating at a local level on source code or isolated signals.” (section 2, p. 4). These figures come from different prior studies, not a shared benchmark. The paper also reports frequent verification failures for JML contracts or temporal logic formulas even when outputs appeared semantically sound (section 2, p. 4).

How to use it. Inference: the following is an adaptation of the comparison, not a procedure evaluated by this paper.
1. Choose a narrowly scoped property with clear semantics.
2. Supply the relevant source context and desired assertion type.
3. Generate a candidate assertion and check it with the target verifier.
4. Have a reviewer check that the verified assertion expresses the intended property.

The paper supports the scope choice with its observation about limited context above, and reports that AssertLLM is “guided by contract type and context.” (section 2, p. 3). It does not demonstrate composing these local assertions into a complete contract.

Verus form. Inference: generate a small `ensures` clause or intermediate `assert`, then run Verus and review the meaning. Local success does not establish that a larger specification is complete. The paper does not evaluate Verus.

## technique 2: verification feedback and iterative refinement

What it is. The survey reports that “SpecGen uses prompt mutation and verification feedback to improve LLM-generated specifications, succeeding on 279 out of 384 benchmark programs [11].” (section 2, p. 3). It also describes nl2spec as using step-by-step, interactive refinement (section 2, p. 4). VERIFYAI's proposed workflow includes verification tools, symbolic reasoning, and human validation (Figure 1b, p. 7).

Status matters. The paper states, “In our initial Tritype experiments, symbolic solvers were used only for post-generation verification.” (section 4.3, p. 6). Tighter integration, using solver feedback such as unsatisfiable path conditions to guide generation, is prospective (section 4.3, p. 6). Human feedback already occurred: the authors report “iterative refinement by feeding corrected fragments back into the prompts.” (section 4.2, p. 6).

How to use it. Inference: an implementation could generate a candidate, run the verifier, add relevant diagnostics to the next prompt, and ask a reviewer to assess the revision. This paper does not establish a stopping rule or demonstrate an automated counterexample-driven loop for its own prototype.

Verus form. Inference: use compiler and solver diagnostics to refine candidates while checking that revisions preserve the requirement. A proof of a weakened postcondition does not establish the original requirement.

## technique 3: domain grounding and tool interoperability

What it is. VERIFYAI proposes supplying natural-language requirements and domain ontologies to the LLM. The workflow then generates specifications, represents them in JSON-LD, checks them with verification tools and symbolic reasoning, and includes human validation (Figure 1b, p. 7). Section 4.2 says, “Natural language requirements and domain ontologies form the input, grounding the LLM in the target context.” (p. 6). The survey separately discusses retrieval-augmented generation: “RAG (Retrieval-Augmented Generation) improves grounding for knowledge-intensive synthesis [36].” (section 2, p. 4). It does not report a retrieval implementation in VERIFYAI.

Proposed steps (Figure 1b, p. 7).
1. Supply natural-language requirements and domain ontologies.
2. Apply a prompting strategy, illustrated as zero-shot, few-shot, or Chain-of-Thought.
3. Generate formal specifications and store them in JSON-LD.
4. Use verification and symbolic reasoning results, followed by human validation and example collection.

The diagram depicts the planned architecture. The implemented interoperability is narrower: “For interoperability, the pipeline currently uses custom scripts to convert LLM outputs to tool-specific formats (e.g., ACSL for Frama-C, JML for OpenJML).” The next sentence states, “While functional, this approach is not generalisable.” A lightweight JSON-LD schema mapping to several formal languages remains planned (section 4.2, p. 6).

Verus form. Inference: supply domain terminology and reviewed examples, then generate Verus clauses directly or design an intermediate representation. Translation from JSON-LD to Verus would be additional engineering; the paper does not demonstrate it.

## technique 4: human review and traceability across artefacts

What it is. The paper states, “In both the Tritype baseline and PathCrawler-augmented workflows, every LLM-generated ACSL specification was checked by at least one author with formal methods expertise.” (section 4.2, p. 6).

Reported review steps (section 4.2, p. 6).
1. Check semantic alignment with intended behavior.
2. Check logical completeness.
3. Feed corrected fragments back into the prompts for refinement.

Traceability is currently manual: “manual annotations linking specification fragments to source code and natural-language requirements.” (section 4.3, p. 7). LLM-proposed links for human validation and graph-database storage are being explored; they are not demonstrated capabilities (p. 7). Links to tests and verification results are part of the future direction described in Appendix C, F5 (pp. 20–21).

Verus form. Inference: link requirement identifiers to Rust functions and reviewed `requires`/`ensures` clauses. Review the assumptions as well as the postcondition, since verification establishes a formal statement under its assumptions.

## technique 5: symbolic execution as generation context

What it is. The initial experiment re-simulates the methodology of reference [3] on TriType.c using PathCrawler and EVA outputs to generate ACSL specifications (Appendix A, p. 12). The paper explains, “The use of PathCrawler provided concrete path-based input/output examples that guided the LLM toward generating more context-relevant and semantically aligned annotations.” (p. 12).

Reported workflow (Figure 1a, p. 7).
1. Analyse the input C program with PathCrawler.
2. Collect symbolic paths and I/O examples.
3. Prompt the LLM for ACSL specifications and annotate the C code.
4. Run Frama-C WP with SMT solvers and collect verification goals and outcomes.

PathCrawler covered 11 of 19 paths, marked 8 infeasible, and achieved 100% branch coverage. All 11 generated tests had unknown verdicts (Appendix A, pp. 12–13). The paper suggests incomplete postconditions or ambiguity in interpreting return values as possible reasons: “possibly due to incomplete post-condition specifications or ambiguity in return value interpretation.” (pp. 12–13). This is an explanation offered by the authors, not a demonstrated cause. Explicit output assertions are proposed as future work to obtain definitive verdicts (p. 14).

The baseline generated two goals, both proved by all four provers (Table 2, p. 14). The augmented file generated 20 goals: Z3 proved 13, Alt-Ergo 15, CVC4 13, and CVC5 15. Table 3 assigns seven timeouts to Z3, five to Alt-Ergo, seven unknown results to CVC4, and five timeouts to CVC5 (p. 15). The surrounding prose inconsistently names CVC5 among the provers with seven failures; these counts follow the table.

Inference: the augmented version generated more proof obligations, so these goal counts alone do not measure improved translation accuracy. For Verus, path examples could inform candidate specifications or invariants, but branch coverage does not establish functional correctness.

## what is measured, trusted, and still open

The paper combines results from heterogeneous prior studies, the Tritype experiment, and prover-output and execution-time tables for Frama-C tutorial examples (Appendix B, pp. 15–18). The heading calls these “36 Examples”, but the execution-time table lists 29 files (Table 8, p. 18); no combined benchmark accuracy is established by these tables. The Tritype tables count proof obligations, not successful natural-language translations.

The prompting comparison remains future work: “In particular, we intend to compare zero-shot, one-shot, few-shot, and Chain-of-Thought (CoT) prompting across both assertion-level and full-contract generation tasks.” It will use precision, recall, and F1-based correctness measures and vary prompt formulation (section 4.1, p. 6). The JSON-LD schema, graph traceability, multimodal alignment, hierarchical module synthesis, and active learning are also prospective (sections 3–4, pp. 5–7). The paper says, “Although active learning is not yet integrated, our project approach anticipates it” (section 4.2, p. 6).

Inference: for agent-written verified Rust, the transferable lesson is to review whether specifications capture requirements, alongside checking whether code satisfies them. Local generation, human review, and verification feedback suggest practical components to investigate. The Tritype experiment illustrates the limits of coverage and minimal specifications; it does not demonstrate a prover-accepted but semantically incomplete Verus specification.

## techniques for the catalog

- local assertion generation: use narrow source context and a specified assertion type; assertion-first adoption in Verus is an inference
- verification feedback refinement: SpecGen uses prompt mutation and verification feedback; tighter solver integration in VERIFYAI is proposed
- domain grounding and interoperability: provide requirements and ontologies; the JSON-LD schema remains planned
- human review and traceability: check meaning and completeness, refine prompts, and manually link requirements, specifications, and code
- symbolic execution context: use symbolic paths and I/O examples to guide ACSL generation, then collect Frama-C proof outcomes

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The use of PathCrawler provided concrete path-based input/output examples that guided the LLM toward generating more context-relevant and semantically aligned annotations."): checked all study quotations, numerical claims, PDF page and section references, technique descriptions, and implementation-versus-proposal status; corrected page references, qualified unknown-verdict causes, separated proposed and inferred steps from reported work, and noted table/prose inconsistencies; did not check external references, repository artefacts, or reproduce experiments.
