# Neuro-Symbolic Integration Brings Causal and Reliable Reasoning Proofs
(authored by agents unless marked 🧑)
Tag: `yang2025caring`, [paper](https://arxiv.org/abs/2311.09802)

## what the paper does

C A R ING (Causal and Reliable Reasoning) separates translation from reasoning. An LLM translates a natural-language problem into Prolog; an LLM-free Prolog engine executes that representation and records a proof trace. The abstract states: “As long as LLMs correctly translate problem descriptions into Prolog representations, the corresponding reasoning proofs are ensured to be causal and reliable.” (abstract, p. 1). The paper evaluates ProofWriter and PrOntoQA logical reasoning and GSM8K arithmetic reasoning.

The target problems have multi-step, multi-premise reasoning naturally represented as a directed acyclic graph (DAG). C A R ING has two modules: S YM G EN, the LLM symbolic-representation generator, and S YM I NFER, the LLM-free symbolic inference engine (section 3, p. 3). Inference: This separates responsibility for translating the problem from responsibility for deriving and explaining the answer.

## technique: translate natural language to a declarative representation

what it is

S YM G EN uses few-shot in-context learning to translate problem descriptions into Prolog representations. Prolog expresses logic as relations, so the model need not generate the inference chain itself (section 3.1, p. 4). A table example maps “Fiona is green.” to `green(fiona).` and an overtime statement to a rule containing `W is 1.5 * W1` (Table 1, p. 4).

when to use it

Inference: Use it when the problem can be represented with relations, rules, and queries that a symbolic interpreter can execute. It is less suitable when ambiguity cannot be resolved in translation. The authors state: “The generalization ability of C A R ING is restricted by the expressiveness of the concerning symbolic representations.” (limitations, pp. 8–9).

how to do it

1. Represent problem knowledge as Prolog facts and rules (section 3.1, p. 4; Table 1, p. 4).
2. Few-shot prompt the LLM with human-written problem-to-Prolog demonstrations; each contains a question and Prolog code (section 3.1, p. 4; section 4.1.1, p. 5).
3. Generate the new problem’s Prolog representation, leaving inference to S YM I NFER (sections 3.1–3.2, p. 4).

Verus form

Inference: A Verus version could translate a natural-language specification into Rust data, specification functions, and contracts, then let Verus check a supplied proof. Prolog relations do not map one-to-one to Rust ownership or executable state. Translation must preserve quantification, negation, and arithmetic meaning. Verifying an implementation against a generated contract would not establish that the contract captures the intended specification.

what evidence shows it works

The authors use Code-LLaMA models with pure few-shot prompting and no detailed human-written instructions (section 4.1.1, p. 5). On the 600-instance depth-5 ProofWriter subset, Code-LLaMA-34B reaches 96.50% answer accuracy and 81.02% proof similarity over all instances; similarity on correctly answered instances is 86.12% (Table 2, p. 6). On the 500-pair depth-5 PrOntoQA fictional-character subset, Code-LLaMA-13B reaches 99.4% answer accuracy and 98.8% proof accuracy on all instances (Table 4, p. 7). On GSM8K’s 270-question structured-proof subset, Code-LLaMA-34B reaches 42.22% answer accuracy, 22.91% proof similarity on all questions, and 54.25% similarity on correctly answered questions (Table 5, p. 7). Inference: These are results for the complete pipeline, not an isolated test of translation.

what fails or is assumed

The abstract’s guarantee assumes correct translation. Inference: A Prolog interpreter can faithfully execute an incorrect fact or rule. Program execution alone cannot validate translation against the original description. Verus has the same specification problem: a proof of a wrong `ensures` clause is still a proof of the wrong claim.

## technique: proof-producing symbolic inference

what it is

S YM I NFER executes the generated Prolog with SWI-Prolog and customized meta-interpreters. The default SWI-Prolog depth-first search does not emit proofs, so the custom interpreter constructs a proof tree (section 3.2, p. 4). The paper says: “With customized Prolog meta-interpreters, S YM I NFER supports (i) causal and reliable tracing of the reasoning process (§3.2.1); (ii) various search strategies, such as Depth-First Search (DFS) and Iterative Deepening Search (IDS) (§3.2.2).” (section 3, p. 3).

when to use it

Inference: Use a proof-producing interpreter when the answer must come with inspectable premises and inference steps, including when ordinary solver execution hides the search.

how to do it

1. Execute the generated Prolog facts and rules using the symbolic inference engine (section 3.2, p. 4).
2. Use the `mi_tree` meta-interpreter to construct the proof (section 3.2.1, pp. 4–5).
3. Represent conjunctions as paired proof trees, built-ins as `builtin(G)`, and a rule application as `TBody => G` (the code listing in section 3.2.1, pp. 4–5).
4. Issue a query through `mi_tree`; it returns bindings and a nested proof term (section 3.2.1, p. 5).
5. Interpret the trace as human-readable reasoning steps (abstract, p. 1; Figure 1, p. 2).

The paper’s worked query asks `grandparent_of(morty, Who)` and returns `Who = rick` with premises `mother_of(morty, beth)` and `father_of(beth, rick)` linked through `parent_of` rules to the final conclusion (section 3.2.1, p. 5).

Verus form

Inference: The closest Verus analogue is a proof function whose `assert` steps and calls to proved lemmas expose the dependency chain, with Verus checking each step. A generated trace could be stored as structured metadata, but Verus does not turn arbitrary execution logs into a proof. The trusted checker is Verus, and the trace is explanatory evidence only unless every edge corresponds to a verified lemma application.

what evidence shows it works

The two datasets use different proof metrics. On ProofWriter with Code-LLaMA-34B, proof similarity is 86.12% on correctly answered instances (Table 2, p. 6). On PrOntoQA depth-5 with Code-LLaMA-13B, exact proof accuracy is 99.4% on correctly answered instances (Table 4, p. 7). Proof similarity uses graph edit distance, normalized to [0, 1]; an incorrect answer receives zero similarity (section 4.1.3, p. 6). Exact proof accuracy checks graph structure and textual content and is reported only for PrOntoQA (section 4.1.3, pp. 6–7).

what fails or is assumed

The paper notes that Prolog’s default DFS “may lead to infinite loops” and illustrates mutually recursive rules (section 3.2.2, p. 5). Inference: A trace can correctly derive a conclusion from a mistranslated program. Deterministic execution does not establish termination or completeness. Verus proof functions use a different proof mechanism; this Prolog example does not establish their behavior.

## technique: controlled search with iterative deepening

what it is

The interpreter supports DFS and Iterative Deepening Search (IDS). IDS performs depth-limited searches with increasing limits (section 3.2.2, p. 5). The implementation uses SWI-Prolog and PySwip. The authors state: “We set the maximum depth to be 20 for Iterative Deepening Search and the number of generated reasoning paths to 20.” (section 4.1.1, p. 5).

when to use it

Inference: Use IDS when recursive rules can trap DFS or when seeking a shallow proof. Report depth and path settings as resource limits.

how to do it

1. Run a depth-limited backtracking search (section 3.2.2, p. 5).
2. Repeat with increasing depth limits (section 3.2.2, p. 5).
3. Use the reported settings: maximum depth 20 and number of generated reasoning paths 20 (section 4.1.1, p. 5). The paper does not specify how to select among returned paths.

Verus form

Inference: In Verus, bounded search would be an external algorithm that calls verified transition functions; the bound must be represented in the function’s state or input. Verus does not provide Prolog-style backtracking. A verified loop can establish an invariant for bounded exploration, but the search policy and any completeness claim must be specified separately.

what evidence shows it works

The complexity experiment compares maximum reasoning depths 0, 1, 2, 3, and 5, and statement counts at most 20 versus greater than 20. The authors report that C A R ING’s answer accuracy remains steady while chain-of-thought accuracy decreases (section 4.3 and Figure 4, p. 8). Inference: This supports robustness of the complete pipeline under those comparisons, not an isolated benefit of IDS over DFS. The paper supplies no such search-strategy comparison.

what fails or is assumed

Inference: Bounded search can miss a proof beyond its limits and cannot correct mistranslated knowledge. The authors also identify dependence on powerful LLMs for symbolic representation generation as a possible obstacle to production use (limitations, p. 9).

## what is proved, measured, and trusted

The interpreter derives answers and proof trees from generated Prolog. The evaluation measures answer accuracy on all three datasets, graph proof similarity on ProofWriter and GSM8K, and exact proof accuracy on PrOntoQA (section 4.1.3, pp. 6–7).

## techniques for the catalog

- declarative translation: use few-shot LLM prompting to map natural language into facts and rules without asking it to infer the proof
- proof-producing interpretation: execute symbolic code with a custom meta-interpreter that records each premise and inference edge
- iterative-deepening search: bound recursive symbolic search with repeated depth-limited runs and explicit path limits
- proof metrics: report answer accuracy, graph-edit proof similarity, and exact proof accuracy with their distinct denominators
