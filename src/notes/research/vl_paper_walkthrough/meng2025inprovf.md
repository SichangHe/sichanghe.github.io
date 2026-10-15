# INPROVF: Leveraging Large Language Models to Repair High-level Robot Controllers from Assumption Violations
(authored by agents unless marked 🧑)
Tag: `meng2025inprovf`, [paper](http://arxiv.org/abs/2503.13660v1)

## what the paper does

INPROVF repairs a synthesized high-level robot controller after an environment assumption is violated. It combines natural-language prompting with formal syntax and GR(1) realizability checks. The paper states: “This paper presents INPROVF, an automatic framework that combines large language models (LLMs) and formal methods to speed up the repair process of high-level robot controllers.” (Abstract, p. 1.) The controller is a finite automaton synthesized from a GR(1) specification. At runtime, a violation is a transition `(σX, σY, σX′)` that breaks an environment safety assumption. The task is to generate new skills that make the updated specification realizable while preserving the user's task sub-specification.

The pipeline has four stages: informalize the abstraction and strategy, generate candidate skills, verify syntax and realizability, and feed formal failures back to the LLM. The authors summarize the loop: “If a candidate fails the verification, INPROVF provides feedback to the LLMs and iteratively prompts LLMs to generate improved solutions.” (Abstract, p. 1.)

## technique: abstraction and strategy informalization

Use this when the formal automaton and propositions are too difficult for an LLM to manipulate directly. First provide the environment inputs and grounding function `G` and ask for concise physical meanings. The paper's example maps propositions such as `p_{o_r}` to an object's location and explains an `empty` cup proposition (Section V-A, Fig. 4A–B, pp. 4–5). Next supply the synthesized finite automaton, its variables, ranks, and transitions, together with the informalized abstraction. One-shot prompting includes an example translation, then asks for only a behavior description. The example describes initial location, skill transitions, and repeatedly satisfied liveness goals (Fig. 4C–D and Fig. 6, pp. 5, 7). The authors say: “We use one-shot prompting–including one example translation in the prompt–to help steer LLMs towards generating accurate strategy behavior.” (Section V-A, p. 5.)

Inference: for Verus proof repair, this is analogous to translating Rust state-machine variables, contracts, and a failing proof obligation into a compact explanation before asking an LLM for a lemma or invariant. The translation is not a paper result and must be checked against the actual Verus state; the paper's formal object is GR(1), not Rust.

## technique: constrained candidate generation

Use this when generated repairs must be machine-checkable. The repair prompt includes the abstraction, existing skills, task specification, strategy behavior, violation, and violated assumptions. It asks for new skills in a domain-specific grammar and JSON only. The implementation extracts the JSON and rejects other output. The grammar is a list of skills, each with one or more transitions `[precondition, [postcondition+]]`; preconditions and postconditions contain controllable inputs (Section V-B, Fig. 4E, pp. 5–6). This narrows the LLM's output space before formal checking.

Inference: a Verus analogue would request a patch containing only allowed Rust proof constructs or a structured lemma candidate, parse it, and reject syntax outside the permitted subset. It would still need compilation and verification; JSON or a grammar cannot establish semantic correctness.

## technique: syntax and realizability as a two-stage verifier

After generation, parse each candidate into abstract syntax trees. Check grammar, then recursively check every AST node against its expected type. Only syntactically valid candidates are passed to a compiler that adds the skills to the GR(1) specification and relaxes the assumptions violated by `t`, producing `φ′`. Run Slugs realizability checking; a realizable `φ′` is the paper's sufficiency criterion (Section V-C, p. 6). The paper states: “We verify the candidates through syntax and realizability checking, ensuring that Ynew indeed repairs the violation.” (Section V, p. 4.)

Inference: Verus should similarly separate parsing/type checking from `cargo verus` verification. A candidate is accepted only if the generated Rust compiles and the requested `requires`/`ensures` and state-machine invariants verify. The paper's realizability check proves a game property under its GR(1) model; it does not prove physical robot execution or Rust memory safety.

## technique: counterstrategy feedback

Use this when a candidate parses but leaves the updated specification unrealizable. For safety, identify transitions entering sink states in the environment counterstrategy, test each system safety constraint with the labels of the source and destination, and emit a concise message naming the violating skill and constraint. Algorithm 1 has this sequence and runs in `O(|Σ|²)` (Section V-D, Algorithm 1, p. 6). For liveness, compute strongly connected components with Tarjan's algorithm, retain sinking components with transitions, determine which cyclic liveness goals are satisfied and which cannot be reached, and report the latter (Algorithm 2, p. 6). The paper explains: “We then only consider the sinking ones, i.e. there is no outgoing edge towards other components, and are not singletons without transitions.” (Section V-D, p. 6.)

Inference: a Verus repair loop could classify a failed proof trace by violated postcondition, invariant, or trigger condition and feed a minimal counterexample back to the model. Verus diagnostics are not GR(1) counterstrategies, so the classification and trace extraction would be new engineering.

## evidence, limits, and trust

The evaluation covers 12 violations in four workspaces, with state spaces from 37 to 79 variables. The setup used OpenAI `o1-preview-2024-09-12`, a 2.3 GHz eight-core Ryzen 7 CPU, a 3,000-second limit, five baseline trials, and three INPROVF/ablation trials per violation; feedback was capped at five iterations (Section VI, pp. 7–8). INPROVF succeeded in 97.22% of runs, compared with 55.56% for no-informalization and 72.22% for no-feedback; these denominators are the ablation runs in Fig. 7, not 12 unique violations. The paper reports that the baseline timed out on the three larger examples while INPROVF repaired every larger violation except one laundry-fold run within five iterations (Section VI, p. 8). It also reports 7.43% higher average successful runtime for no-inform than INPROVF. Table I's informalization runtimes are averages over three trials per example, with standard deviations in seconds.

The authors explicitly limit the claims: “we currently assess the quality of informalization indirectly through the final repair correctness, which is neither sound nor complete.” (Limitations, p. 8.) They also note hardware unfairness because formal repair ran on CPUs while LLM components used GPU optimizations. Inference: Trusted components include the LLM, parser, DSL type checker, GR(1) compiler, Slugs solver, and the correctness of the abstraction and task specification. Inference: for agent-written verified Rust, this is a medium-to-high threat at the proof-generation workflow level: a generate-check-feedback loop is directly reusable, but formal acceptance remains the decisive gate and the paper does not establish that LLM text preserves Rust semantics.

## what Inference: VL should reuse

Inference: Inference: VL should reuse constrained output, a strict parser/type checker before solver calls, counterexample-derived feedback, bounded retries, and denominators that separate violations from trials. It should not present informalization quality as sound or complete. The prior formal repair baseline and this LLM loop already cover the general idea of generate then formally check; new VL work should measure proof repair time, failed-proof categories, and whether counterexamples improve Verus verification rather than merely changing text.

## techniques for the catalog

- abstraction informalization — translate formal environment and automaton behavior into checked natural-language context
- constrained repair generation — request machine-parseable candidate skills in a fixed DSL and reject malformed output
- syntax plus realizability checking — type-check ASTs before testing the updated formal specification
- counterstrategy feedback — analyze sink safety states and sinking SCCs to produce targeted repair prompts
Checked 2026-10-15 against paper meng2025inprovf: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
