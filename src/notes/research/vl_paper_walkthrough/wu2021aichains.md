# AI Chains: Transparent and Controllable Human-AI Interaction by Chaining Large Language Model Prompts
(authored by agents unless marked 🧑)
Tag: `wu2021aichains`, [paper](https://doi.org/10.1145/3491102.3517582)

## scope and result

AI Chains is a workflow for decomposing one language-model task into small, connected model calls whose intermediate data remain visible and editable. The paper's core definition is: “We define Chaining as the process of breaking up complex tasks into smaller steps, where each step can be completed by an independent run of an LLM, and where the output of one or more steps is used as input for the next.” (Section 3, p. 4). The system surveys 73 demos, proposes eight primitive operations, implements an interactive chain editor, and evaluates it with 20 participants on review-writing and flashcard tasks.

The measured claim is about human interaction and task outcomes, not formal correctness. The study used the same underlying model (LaMDA, 137 billion parameters) in the chain and baseline interfaces; 20 participants each used both interfaces on one randomly selected task, and the paper reports that “The two independent raters consistently preferred Chaining results 85% and 80% of the time, respectively.” (Section 5.2, p. 10). The paper gives these as one percentage per rater, not per task.

## technique 1: decompose a task into typed chain steps

Use this when a request contains separable subproblems, long context, or several transformations. Apply it as follows:

1. Identify a small operation that one model call can perform, such as classification, factual query, ideation, extraction, rewriting, splitting, or composition. Table 1 defines eight operations and says they “may be adequately handled by a single LLM run” (Table 1 caption, p. 5).
2. Give each step a natural-language task description, an input data layer, and an output data layer. The authors describe a step as an LLM operation that takes in input data and produces output data (called data layers) (Section 3.2, p. 5).
3. Connect outputs to later inputs. In the paper's review example, Split Points extracts individual presentation problems, Ideation proposes suggestions per problem, and Compose Points merges the suggestions into a paragraph (Figure 1, p. 2; Section 3.2, p. 5).
4. Run steps independently and aggregate one or more preceding outputs in the next prompt. The paper says: “results of one or more previous steps are aggregated in the next step’s input prompt.” (Section 1, p. 2).

## technique 2: use primitive operations as reusable proof-loop blocks

The paper groups primitives by the problem they address. Classification validates or triages an input; factual query, generation, and ideation gather information; information extraction and rewriting reorganize it; split points create a one-to-many mapping; compose points perform the reverse many-to-one mapping (Table 1, p. 5). The table's examples are concrete prompt shapes, such as “Classify if the question is answerable” and “Split the feedback paragraph into a list of Alex’s presentation problems” (Table 1, p. 5).

## technique 3: expose intermediate data and allow controlled edits

Use this when users need to debug or steer a black-box generation process. The implementation provides three control levels: edit a local prompt, edit an intermediate model output or data-layer name, and add, remove, or rewire operations or data layers (Section 4, pp. 7–8). The chain view shows operation shapes for one-to-one, one-to-many, and many-to-one mappings; the step view lets users execute parallel blocks and compare their results (Section 4, pp. 7–8).

The paper reports a practical debugging behavior: participants “debugged unexpected model outputs by “unit-testing” sub-components of a Chain.” (Abstract, p. 1).

## technique 4: evaluate decomposition against a matched baseline

The paper's method fixes the model and compares a chain interface with Sandbox, a non-chaining interface. Participants first completed a 30-minute tutorial, then performed a randomly selected task (Flashcard or Review) once with each interface, with interface order counterbalanced, until satisfied or until 25 minutes (Section 5.1, p. 9). Two non-participants, blinded to condition, made anonymous paired comparisons of each participant's two results (Section 5.1, p. 9). The study had 20 participants, half with no prompting experience and half with basic experience (Section 5.1, p. 9).

The reported denominators matter. Participants spent 12.4 ± 4.0 minutes in Sandbox and 14.6 ± 5.4 in Chaining; the time difference was not significant (`p = .278`) (Section 5.2, p. 10). Chaining results were preferred 85% and 80% of the time by the two raters, while participants rated how well their own final result met the task goal 6.0 ± 0.9 with Chaining versus 5.0 ± 1.1 with Sandbox (Wilcoxon signed-rank, `p = .002`) (Section 5.2, p. 10).

## technique 5: log operation-level interactions and diagnostics

The study logged whether a participant reran the model, edited a prompt, curated existing output, created new content, or undid output (Section 5.1, p. 9). Consecutive runs occurred 51% of the time in Sandbox and 36% in Chaining (`p = .001`); curation was 41% versus 77% (`p < .001`) (Section 5.2, p. 10). These are ratios of logged interaction types, not accuracy rates. The paper runs no ablation of Chain components; it compares Chaining with Sandbox only.

## what is proved, trusted, and unresolved

The paper demonstrates a user-interface and prompting pattern and reports a small within-subject evaluation. It does not prove that decomposition improves arbitrary tasks, that the eight operations are complete, or that intermediate text is correct. The authors say “Note that the operations we identified may not be exhaustive” (Section 3.1, p. 4). Inference: the result trusts the underlying LLM, prompt templates, operation wiring, user instructions, rater judgments, and the assumption that the chosen tasks represent useful LLM work. The 20 participants were recruited from “a large software company” (Section 5.1, p. 9), and the study used two tasks, so generalization is limited; the Discussion also notes that decomposition “might be less straightforward in some cases” (Section 7, p. 15).

## techniques for the catalog

- decomposed LLM chain — break a complex task into independent, connected steps with explicit input and output layers
- primitive operation blocks — use classification, query, ideation, extraction, rewriting, split, and compose operations as reusable units
- editable intermediate state — expose prompts and outputs so users can inspect, revise, and rerun local steps
- verifier-backed unit testing — treat each generated proof fragment as a unit whose acceptance comes from Verus diagnostics
- matched baseline evaluation — compare chained and monolithic workflows with fixed model, tasks, timing, raters, and denominators
