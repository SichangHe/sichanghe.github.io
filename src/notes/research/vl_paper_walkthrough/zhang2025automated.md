# Automated Extraction of Protocol State Machines from 3GPP Specifications with Domain-Informed Prompts and LLM Ensembles
(authored by agents unless marked 🧑)
Tag: `zhang2025automated`, [paper](https://arxiv.org/abs/2510.14348)

## what the paper proves or measures

SpecGPT converts 3GPP prose into a finite-state-machine (FSM) representation. Its input is a cleaned, section-aware specification; its output is JSON containing states and transitions, with a transition's source state, destination state, condition, and action. The paper evaluates Release 17 NAS, NGAP, and PFCP against a manually annotated reference. The reference took “over 210 person-hours of work by multiple domain experts” (Section IV-A, p. 6), including cross-validation and peer review. This is a measured extraction system, not a proof that the extracted FSM is the protocol's true behavior.

The paper reports five individual LLMs (Claude Sonnet 4, DeepSeek V3, Gemini 2.5 Pro, GPT 4o, and Qwen Turbo), all at temperature 0.2, and an ensemble. On NAS transition extraction, the ensemble has 91.86% precision, 90.43% recall, and 91.14% F1 (Table I, p. 7); these denominators are the annotated NAS transitions under the paper's exact-state and 0.75 span-overlap rule. All five models found all 18 NAS states, giving 100% state-extraction F1 over those 18 states (Section IV-B(a), p. 7). PFCP-all is 85.71/90.00/87.80 precision/recall/F1 and NGAP-all is 70.71/67.96/69.31 (Table II, p. 7). A direct, task-unspecialized prompt obtains only 14.87% F1 (Section IV-B(b), p. 7), but the paper does not provide its denominator beyond the same task context. The Release 15 NAS test extracted 142 transitions, about 20% fewer than Release 17 (Section IV-D(b), p. 9), and each run costs about $2.7 for NAS, $1.6 for NGAP, and $1.5 for PFCP (Section IV-D(a), p. 8). These numbers measure agreement with an expert annotation, not formal correctness.

## technique: section-tree preprocessing and paragraph-window merging

What it is: SpecGPT turns a long specification into coherent model inputs by using section hierarchy instead of a fixed character window. The paper says, “we perform section consolidation leveraging the hierarchical section structure of 3GPP specifications to produce semantically coherent input chunks” (Section III-C(b), p. 4).

When to use it: use this when a specification is too long for one model context and paragraph-only splitting would separate a heading from the paragraphs that define it. The method assumes section numbers and paragraph boundaries can be recovered from the source document.

How to do it:

1. Clean the source document (Section III-B, p. 3).
2. Extract section numbers and map each paragraph to its section (Algorithm 1, p. 4).
3. Build a parent/child section tree from the numbering.
4. Starting at leaf sections, merge sibling leaf contents into their parent and continue bottom-up (Algorithm 1).
5. Feed the resulting paragraph windows to the extraction prompts.

Verus form: Inference: represent the cleaned document and section tree with Rust structs, and use executable functions to build windows. A `spec fn` can describe the intended parent-child relation and a `requires`/`ensures` contract can state that every emitted paragraph came from its source section. A Verus proof can establish that the merge preserves paragraph order or that every leaf is included. The LLM and text parser remain outside the proof unless their output is separately checked.

Evidence and limits: Algorithm 1 is an algorithmic description, not a proof of semantic completeness. The authors claim merging reduces truncation and overly fine-grained queries, but do not report an ablation isolating this merge from the other prompt changes. Cross-section references can still be absent from a window; that motivates the separate cross-reference technique below.

## technique: staged chain-of-thought extraction with domain constraints

What it is: split FSM extraction into state extraction, transition extraction, and post-processing. The prompt requires standard protocol names, separates condition from action, quotes source text, and emits a fixed JSON shape. The template explicitly requires “State names must correspond to official protocol state machine nodes” (Figure 3, Section III-D(a), p. 5) and says “For each transition, \"condition\" and \"action\" fields must be distinguished, with content quoted verbatim from the original text” (Figure 3, p. 5).

When to use it: use staged extraction when states are explicit in some protocols but described procedurally in others, and when a single unconstrained generation tends to hallucinate states or merge conditions with actions.

How to do it:

1. Classify the protocol as state-oriented (for example NAS) or procedure-oriented (for example PFCP) and choose the corresponding state prompt (Section III-D(a), p. 4).
2. Extract only official state names; expand abbreviations to qualified names when the specification supplies the qualification.
3. Extract each transition's condition and action as source spans, using few-shot examples to teach the distinction (Section III-D(a), p. 5).
4. Require the model to reason from the original text for implicit relationships, then apply a plausibility recheck (Figure 3, p. 5; Section III-D(b), p. 5).
5. Parse JSON; reject malformed output, remove pseudo-states and empty states with predefined rules (Section III-D(a), p. 5).

Verus form: Inference: define an executable Rust enum or integer state type and a transition record, then a `spec fn` relation such as `valid_transition(from, to, condition, action)`. Contracts with `ensures` can require that a generated transition's states belong to a declared set and that a checked condition/action span is nonempty. `assert` and proof functions can show determinism or closure for a hand-written protocol model. The prompt's natural-language inference does not carry into Verus; only the checked JSON and a reviewed specification do.

Evidence and limits: On the 18-state NAS reference, all models obtained 100% state F1, while transition precision varied from 61.71% (Qwen Turbo) to 80.39% (Claude Sonnet 4) and recall from 77.66% to 92.55% (Table I, p. 7). The authors attribute the precision loss to hallucinated extra transitions. The method therefore produces candidates requiring validation; it does not prove that an inferred transition exists.

## technique: collaborative context, implicit-information integration, and cross-reference retrieval

What it is: each segment receives historical context plus the current paragraph; prompts allow logically implied transitions but require grounding; referenced sections are supplied by a lightweight retrieval mechanism. The template includes “Context paragraph:[prev_paragraph]” and “Current paragraph:[paragraph]” (Figure 3, p. 5). For cross-references, section numbers are used as prefixes and multiple protocol texts are supplied together (Section III-D(b), p. 5).

When to use it: use this when a transition spans segment boundaries or a paragraph points to another section. It assumes section numbers are stable enough to locate the referenced text.

How to do it:

1. Keep the previous paragraph (or other relevant history) with the current segment.
2. Ask for explicit elements and logically implied transitions, but require every inferred result to be grounded in the source and rechecked (Section III-D(b), p. 5).
3. When a cross-reference occurs, retrieve the referenced section by its original number and prepend that section mapping to the model input.
4. Extract and validate the resulting transition as in the staged pipeline.

Verus form: Inference: model references as IDs and require a proof-level invariant that each resolved reference ID exists in a finite map of sections. A `Map` in a `spec fn` can express the lookup; `requires` can require membership and `ensures` can preserve the source ID. Verus can check consistency of a manually defined FSM after retrieval, but cannot establish that the LLM's implicit inference matches unstated protocol intent.

Evidence and limits: The paper reports an overall ensemble result and Release 15 generalization, but no isolated metric for collaborative context, implicit reasoning, or retrieval. It explicitly warns that hallucinations remain and lists retrieval-augmented generation and self-consistency as future ways to reduce them (Section V-A, p. 9).

## technique: multi-model alignment and majority voting

What it is: run identical prompts and parameters on five models, manually align obvious omissions, then merge transitions by exact state equality and at least 0.75 word-span overlap for both action and condition. The formal criterion is “Two transitions Ti and Tj are considered aligned if and only if all of the following hold” (Section III-E, p. 6), followed by equal initial/next states and the two overlap inequalities. The authors set θ=0.75 because it performed best in their evaluation (Section III-E, p. 6).

When to use it: use an ensemble when individual model outputs have high recall but hallucinated false positives. It requires comparable prompts and a deterministic alignment policy.

How to do it:

1. Invoke each model with the same segment, prompt, and temperature 0.2 (Section IV-A, p. 6).
2. Represent each result as `(initial state, action span, condition span, next state)`.
3. Match states exactly; compute word-span intersection divided by the shorter span for actions and conditions.
4. Treat outputs as aligned when both ratios are at least 0.75; aggregate aligned candidates by majority voting (Section III-E, p. 6).
5. Apply the same alignment rule against ground truth for scoring (Section IV-B, p. 7).

Verus form: Inference: encode a transition as a Rust struct with a `spec fn` validity predicate. Use executable code to compute candidate overlap and a proof function to establish that a selected majority transition satisfies the declared threshold. `ensures` can state that selected transitions have matching endpoints and overlap; it cannot prove that majority agreement means protocol truth.

Evidence and limits: the ensemble's NAS F1 of 91.14% is 5.85–22.37 percentage points above the individual models' F1 values (Section IV-B(b), p. 7). The ensemble still has false positives and false negatives (Section V-A, p. 9), and manual alignment is part of the described workflow, so the reported automation is not entirely hands-off.

## what remains trusted and threat to VeruLaw

Inference: the trusted base includes each LLM's output, the manually built Release 17 reference, text cleaning and section parsing, the overlap threshold, and the evaluator's FSM definition. Verus could check a generated FSM's explicit invariants and transition contracts, but it cannot validate that prose extraction captured every requirement. The paper's 91.14% F1 and 14.87% direct-prompt result show a useful candidate-generation front end, not a proof-producing verifier. For VeruLaw, the threat is medium: SpecGPT could accelerate converting protocol prose into a reviewed model, while hallucinated or omitted transitions could become unsound assumptions if generated FSMs are treated as complete. A safe integration would require human review and proof obligations that independently cover protocol properties rather than trusting extraction metrics.

## techniques for the catalog

- section-tree paragraph merging — build hierarchical section windows bottom-up to preserve context in long specifications
- staged domain-informed prompting — extract states, transitions, and post-process JSON with protocol-specific constraints
- collaborative context reasoning — include prior segments when transitions cross chunk boundaries
- cross-reference retrieval — resolve referenced sections by section-number prefixes without an embedding database
- multi-model overlap alignment — align transitions by exact states and 0.75 action/condition span overlap
- majority-vote ensemble — aggregate aligned outputs to reduce individual hallucinated transitions
Checked 2026-10-14 against the paper by a Codex agent: audit record zhang2025automated; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
