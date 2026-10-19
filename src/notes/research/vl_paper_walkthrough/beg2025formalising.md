# Working Document - Formalising Software Requirements with Large Language Models
(authored by agents unless marked 🧑)
Tag: `beg2025formalising`: [paper](https://arxiv.org/abs/2506.14627v2)

## scope and evidence
This is a structured literature review and working document. The opening describes it as “having a summary of nighty-four (94) papers” (p.1); that is the authors’ stated count, not a count independently established here. It covers requirements formalisation (Section 3), traceability (Section 4), formal methods and testing (Section 5), UTP and institutions (Section 6), and future directions including prompting (Section 7).

The authors state: “In this project, we aim to ease the burden of writing specification, helping to bridge the gap between the need for formal verification techniques and their lack of use in the software industry (due to the fast pace of the industry environment).” (Section 1, p.1). Their method searches IEEE Xplore, ACM Digital Library, Scopus, Springer Link and Google Scholar, and uses Elicit followed by manual relevance review (Section 2, p.2). They report: “For example, IEEE Xplore returns 17 peer-reviewed articles, Scopus lists 20, Springer Link filters to 595, ACM Digital Library provides 1,368 results, and Google Scholar shows 14,800 references since 2021.” These are search-result counts. The authors explain: “Abstracts are first assessed to judge suitability. If the abstract lacks clarity or depth, a further examination of the full text is conducted.”

## technique 1: LLM translation and iterative refinement
The review describes nl2spec as an LLM framework for generating formal specifications from natural language: “Users can iteratively refine translations, making formalization easier.” It adds: “The work [17] provides an open-source implementation with a web-based interface.” (Section 3, pp.2–3). The review does not specify a complete prompt or verification procedure for this interaction.

Inference: to apply this idea in Verus, give the model a requirement and the target contract syntax, inspect its candidate, revise it, and run Verus. Have a human confirm that the resulting contract expresses the intended requirement. Successful verification establishes the encoded contract, so this confirmation remains necessary.

## technique 2: neuro-symbolic checker feedback
Explanation-Refiner combines LLMs and theorem provers for explanatory sentences. The review states: “LLMs and theorem provers are integrated together to formalise explanatory sentences.” It continues: “Theorem prover also provides feedback for further improvements in NLI (Natural Language Inference) model.” (Section 3, p.3). This concerns explanation refinement, rather than a demonstrated Verus workflow.

A separate code-repair example gives an explicit verification loop: “The approach used Bounded Model Checking (BMC) to identify errors and generate counterexamples, which were then fed into LLM to repair the code, followed by re-verification with BMC.” This describes ESBMC-AI (Section 3, p.4).

Inference: an analogous Verus loop could generate a contract or lemma, run Verus, return failed proof obligations to the model, and check the revision. A successful proof would still depend on the adequacy of the encoded requirement.

## technique 3: assertions and specification synthesis
AssertLLM uses three customised LLMs for hardware assertions. The review gives its phases as “first understanding specifications, mapping signal definitions and generating assertions.” It reports: “The results show that AssertLLM produced 89% correct assertions with accurate syntax and function.” (Section 3, p.3). This working document does not supply the assertion count or a detailed correctness-assessment procedure.

For SpecSyn, the review states: “It treats specification generation as a sequence-to-sequence learning task and outperforms previous tools by 21% in accuracy, extracting specifications from both single and multiple sentences.” (Section 3, p.3). The working document does not define the denominator or clarify whether this improvement is relative or in percentage points.

Inference: before generating Verus assertions, identify the corresponding program variables and state. Verify the generated contracts and separately inspect whether they capture the requirement. The reported hardware and configuration-specification results do not establish performance for Verus.

## technique 4: formal testing and model checking
Section 5 discusses model-based, finite-state, process-algebraic and algebraic approaches (pp.8–9). For model-based testing it states: “In this category, testing often involves partitioning the input domain using assumptions about uniform system behaviour within each partition.” (Section 5.1, p.8). For model checking it states: “Model checkers are highlighted as being capable of producing counterexamples when temporal properties are not satisfied, which can subsequently be re-purposed as test cases.” (Section 5.4, p.9).

Inference: a Verus project could use contracts for program properties and a separate finite model for system transitions. Counterexamples from that model could become regression tests after mapping model states and events to executable inputs. The review does not demonstrate this integration.

## technique 5: prompt decomposition and retrieval
The review distinguishes zero-shot prompting from prompting with one or several examples. It cautions: “But improved results are not assured as some studies e.g. [95] show that zero-shot can outperform the few-shot case [96].” (Section 7.1, p.10). It describes CoT as articulating intermediate reasoning steps and warns about missed information in the middle of long contexts (Section 7.1, p.10).

For retrieval, it states: “Retrieval Augmented Generation (RAG) [52] supplements problem information with specifically retrieved information and is often used in knowledge intensive tasks.” (Section 7.1, p.11).

Inference: supply relevant Verus rules and verified examples, generate a candidate contract, and check it with Verus and human review. Compare prompting variants using measured verification and requirement-correctness results. This review supplies no Verus comparison.

## techniques for the catalog
- iterative LLM formalisation — generate formal specifications from natural language and let users refine translations (nl2spec, Section 3, pp.2–3)
- neuro-symbolic explanation feedback — formalise explanatory sentences and use theorem-prover feedback for refinement (Explanation-Refiner, Section 3, p.3)
- verification-guided code repair — detect errors with BMC, supply counterexamples to an LLM, then re-verify repairs (ESBMC-AI, Section 3, p.4)
- assertion synthesis — understand specifications, map signal definitions and generate hardware assertions (AssertLLM, Section 3, p.3)
- model-based testing — partition inputs using assumptions of uniform behavior (Section 5.1, p.8)
- counterexample-to-test reuse — use model-checker counterexamples as test cases (Section 5.4, p.9)
- prompt decomposition and retrieval — articulate intermediate reasoning steps and supply retrieved information (Section 7.1, pp.10–11)
