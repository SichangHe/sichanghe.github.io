# INPROVF: Leveraging Large Language Models to Repair High-level Robot Controllers from Assumption Violations
(authored by agents unless marked 🧑)
Tag: `meng2025inprovf`, [paper](http://arxiv.org/abs/2503.13660v1)

## what the paper does

INPROVF repairs a synthesized high-level robot controller after an environment assumption is violated. It combines natural-language prompting with formal syntax and GR(1) realizability checks. The paper states: “This paper presents INPROVF, an automatic framework that combines large language models (LLMs) and formal methods to speed up the repair process of high-level robot controllers.” (Abstract, p. 1.) The controller is a finite automaton synthesized from a GR(1) specification. At runtime, a violation is a transition `(σX, σY, σX′)` that breaks an environment safety assumption. The task is to generate new skills that make the specification realizable under the violation (Section IV, p. 3). Verification adds the skills and relaxes the violated assumptions before checking realizability (Section V-C, p. 4).

The pipeline has four stages: informalize the abstraction and strategy, generate candidate skills, verify syntax and realizability, and feed formal failures back to the LLM. The authors summarize the loop: “If a candidate fails the verification, INPROVF provides feedback on potential unsafe behaviors or unsatisfied tasks, and iteratively prompts LLMs to generate improved solutions.” (Abstract, p. 1.)

## technique: abstraction and strategy informalization

First provide the environment inputs and grounding function `G` and ask for concise physical meanings. The paper's example maps propositions such as `p_{o_r}` to an object's location and explains an `empty` cup proposition (Section V-A, p. 4; Fig. 4A–B, p. 5). Next supply the synthesized finite automaton, its variables, ranks, and transitions, together with the informalized abstraction. One-shot prompting includes an example translation, then asks for only a behavior description. The example describes initial location, skill transitions, and repeatedly satisfied liveness goals (Fig. 4C–D and Fig. 6, pp. 5, 7). The authors say: “So, we use one-shot prompting–including one example translation in the prompt–to help steer LLMs towards generating accurate strategy behavior.” (Section V-A, p. 4.)

Inference: for Verus proof repair, this is analogous to translating Rust state-machine variables, contracts, and a failing proof obligation into a compact explanation before asking an LLM for a lemma or invariant. The translation is not a paper result and must be checked against the actual Verus state; the paper's formal object is GR(1), not Rust.

## technique: constrained candidate generation

The repair prompt includes the abstraction, existing skills, task specification, strategy behavior, violation, and violated assumptions. It asks for new skills in a domain-specific grammar and JSON only. The authors state: “We also require the new skills to be formatted as JSON files only, and we perform regular expression matching to extract Ynew from the responses.” (Section V-B, p. 4.) The JSON object maps each new skill name to a list of one or more transitions `[precondition, [postcondition+]]`; preconditions and postconditions contain controllable inputs (Section V-B, p. 4; Fig. 4E, p. 5). Each precondition and postcondition must be a complete controllable input state; the prompt excludes original skills and comments.

Inference: a Verus analogue would request a patch containing only allowed Rust proof constructs or a structured lemma candidate, parse it, and reject syntax outside the permitted subset. It would still need compilation and verification; JSON or a grammar cannot establish semantic correctness.

## technique: syntax and realizability as a two-stage verifier

After generation, parse each candidate into abstract syntax trees. Check grammar, then recursively check every AST node against its expected type. Only syntactically valid candidates are passed to a compiler that adds the skills to the GR(1) specification and relaxes the assumptions violated by `t`, producing `φ′`. Run Slugs realizability checking; a realizable `φ′` is the paper's sufficiency criterion (Section V-C, p. 4). The paper states: “If parsing is successful, the new skills are in the correct syntax.” (Section V-C, p. 4.)

Inference: Verus should similarly separate parsing/type checking from `cargo verus` verification. A candidate is accepted only if the generated Rust compiles and the requested `requires`/`ensures` and state-machine invariants verify. The paper's realizability check proves a game property under its GR(1) model; it does not prove physical robot execution or Rust memory safety.

## technique: counterstrategy feedback

For syntax failures, feedback identifies AST nodes and violated grammar rules (Section V-D, p. 4). If a candidate passes syntax checking but leaves the specification unrealizable, INPROVF computes a counterstrategy. For safety, identify transitions entering sink states in the environment counterstrategy, test each system safety constraint with the labels of the source and destination using Z3, and emit a concise message naming the violating skill and constraint. Algorithm 1 gives this sequence (Section V-D, pp. 4–6; Algorithm 1, p. 6). For liveness, compute strongly connected components with Tarjan's algorithm, retain sinking components with transitions, determine which cyclic liveness goals are satisfied and which the robot attempts but cannot satisfy, and report both sets (Algorithm 2, p. 6). The paper explains: “We then only consider the sinking ones, i.e. there is no outgoing edge towards other components, and are not singletons without transitions.” (Section V-D, p. 6.) The authors give both analyses complexity `O(|Σ|²)` (Section V-D, p. 6).

Inference: a Verus repair loop could classify a failed proof trace by violated postcondition, invariant, or trigger condition and feed a minimal counterexample back to the model. Verus diagnostics are not GR(1) counterstrategies, so the classification and trace extraction would be new engineering.

## evidence, limits, and trust

The evaluation covers 12 violations in four workspaces and two abstraction types, object-centric and swarm (Section VI, p. 6). The analysis describes 37 variables for Factory and 64–79 for the three larger examples (Section VI, p. 7). The setup used OpenAI `o1-preview-2024-09-12`, a 2.3 GHz eight-core Ryzen 7 CPU, a 3,000-second limit, five baseline trials, and three INPROVF/ablation trials per violation; feedback was capped at five iterations (Section VI, p. 7). The authors report: “Our ablation studies show that INPROVF achieves a higher success rate (97.22%) than no-inform (55.56%) and no-feedback (72.22%).” (Section VI, p. 7.) Inference: with three trials per violation, these percentages correspond to 35/36, 20/36, and 26/36 successful trials, respectively. The paper reports that the baseline timed out on the three larger examples while INPROVF repaired every larger violation except one laundry-fold run within five iterations (Section VI, p. 7). It also reports 7.43% higher average successful runtime for no-inform than INPROVF. Table I's informalization runtimes are averages over three trials per example, with standard deviations in seconds.

The authors explicitly limit the claims: “we currently assess the quality of informalization indirectly through the final repair correctness, which is neither sound nor complete.” (Section VII, p. 7.) They also caution: “Thus, a direct runtime comparison may not be fair.” (Section VII, p. 7.) The preceding passage contrasts an unoptimized CPU repair implementation with LLM components running on GPUs with extensive engineering optimizations. Inference: formal acceptance depends on the abstraction, task specification, parser, type checker, compiler, and Slugs solver. LLM descriptions guide candidate generation but are not themselves formally verified. Inference: the generate-check-feedback loop could inform a Verus repair workflow, but this paper supplies no Verus evaluation.

## techniques for the catalog

- abstraction and strategy informalization — translate formal environment inputs and automaton behavior into natural-language context
- constrained repair generation — request machine-parseable candidate skills in a fixed DSL and reject malformed output
- syntax plus realizability checking — type-check ASTs before testing the updated formal specification
- counterstrategy feedback — analyze sink safety states and sinking SCCs to produce targeted repair prompts
