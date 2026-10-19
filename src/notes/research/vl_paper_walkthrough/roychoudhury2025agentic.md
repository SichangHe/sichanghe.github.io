# Agentic AI for Software: thoughts from Software Engineering community
(authored by agents unless marked 🧑)
Tag: `roychoudhury2025agentic`, [paper](https://arxiv.org/abs/2508.17343)

## thesis and scope
Abhik Roychoudhury's 2025 position paper argues that software agents should infer developer intent, work on program representations, and support verification and validation as code generation grows. It distinguishes code tasks, including generation, testing, and repair, from design tasks, including architecture exploration and requirements understanding and enforcement. The abstract states: “Specification inference, or deciphering the intent, thus lies at the heart of many software tasks, including software maintenance and program repair.” This four-page article discusses existing systems and future directions; it presents no new experimental evaluation, benchmark results, or Verus implementation. The paper identifier is arXiv:2508.17343v4, dated 22 September 2025 (p. 1).

## technique 1: agent plus program representations and analysis
The paper recommends that agents interpret program representations and use program analysis to make decisions. It states: “By making the agents interpret program representations and make micro-decisions about software related tasks, we can have the agent conduct program analysis to make decisions.” (Resolving Software Issues, p. 2.) Analysis can be an external tool or be embedded in the agent's actions while it interprets and navigates the representation. Figure 2 illustrates this relationship at a high level. The discussion separately attributes agent-computer interfaces for interacting with external tools to SWE-agent (pp. 2–3); it does not establish that such interfaces alone provide intent inference.

## technique 2: intent inference by code search (AutoCodeRover)
The AutoCodeRover discussion states: “Given a software issue, its core intuition is to extract specifications (of intended behavior) from the program structure. This is achieved via code search.” (Intent Inference from Code, p. 3.) The described sequence is: start with classes, methods, or APIs mentioned in the issue; progressively search other code elements to find where changes are needed; then generate a patch using knowledge or specifications gained during that search. Figure 3 illustrates searching the `ModelChoiceField` class, inspecting its signature, and examining method implementations. The agent refines its understanding of intended behavior as it searches. SpecRover makes the intent inference more explicit by inferring intended behavior for functions or code units identified by fault localization, the search for where changes are needed.

Inference: a Verus adaptation could search existing `requires` and `ensures` clauses and related functions before proposing a patch. An inferred contract remains a hypothesis about intent; existing code may contain the defect being investigated. The paper does not evaluate this adaptation.

## technique 3: symbolic-execution intent inference to reduce overfitting
The program-repair discussion distinguishes passing supplied tests from satisfying intended behavior. A generated patch can pass those tests yet fail others. The paper says: “Trying to generalize the given tests to infer intended behavior is found to be a solution to combat the overfitting problem. This lesson forms the heart of semantic program repair approaches, which use symbolic program analysis (specifically symbolic execution) for intent inference.” (Intent Inference from Code, p. 3.) This is a lesson drawn from prior automated program repair, not a new symbolic-execution algorithm. The article supplies no path-exploration procedure, test-generation recipe, or measured reduction in overfitting. It also distinguishes issue resolution, where desired behavior is described in natural language, from repair with a supplied test criterion.

## technique 4: agentic verification and validation
The abstract proposes AI-based verification and validation of AI-generated code. The Verification and Validation section (p. 4) also considers agents that clarify natural-language requirements, inspect their implementation, and support security audits. It proposes going beyond audits by identifying policy violations and fixing them through an issue-resolution agent, illustrated in Figure 4. These are prospective uses, not evaluated results in this article.

For formal verification, the paper proposes agents that “interpret formal proof representations, analyze them, and communicate with a theorem prover” through iterative proof refinement (Verification and Validation, p. 4). It further suggests using program structure, such as classes and methods, to organize proofs and intermediate lemmas. The paragraph ends: “This remains an attractive future direction.” It does not prescribe a detailed proof-state parser, failure-handling algorithm, or stopping rule.

Inference: a Verus agent could propose proof or lemma changes, invoke Verus, inspect diagnostics, and iterate. Changes to contracts would also require checking that the intended requirement is preserved. This proposed workflow is an application of the paper's direction, not an implementation or success rate reported by its author.

## techniques for the catalog
- program-representation analysis — let agents interpret structured code and use external or embedded analysis for decisions
- code-search intent inference — search issue-relevant code elements, localize changes, and use inferred specifications in patch generation
- symbolic intent inference — generalize supplied tests through symbolic program analysis to address repair overfitting
- policy enforcement through issue resolution — identify policy violations and use an issue-resolution agent to fix them, a proposed direction
- iterative proof refinement — analyze proof representations, interact with a theorem prover, and structure proofs around program elements, a proposed direction
