# MoVer: Motion Verification for Motion Graphics Animations
(authored by agents unless marked 🧑)
Tag: `ma2025mover`, [paper](http://arxiv.org/abs/2502.13372v2)

## scope and result

MoVer is a first-order-logic DSL and interpreter for checking whether an SVG animation contains the spatial, temporal, and motion properties stated in a prompt. An LLM writes both the animation program and a MoVer program; the interpreter reports each predicate as true or false; the report is fed back to the animation generator for another iteration. The paper's abstract says: “Executing the verification program on the animation yields a report of the predicates that failed and the report can be automatically fed back to LLM to iteratively correct the animation.” (Abstract, p. 1)

Inference: the transferable systems pattern is a typed property language plus an executable checker whose failures become repair input. MoVer does not prove Rust behavior, and its geometric predicates are domain-specific. For VL, the analogous checker is Verus compiling a Rust specification and returning diagnostics, while the generated artifact is Rust proof code rather than SVG.

## technique 1: design a property DSL from an explicit vocabulary

What it is. MoVer models objects `o_i`, motions `m_j`, logical operators, object attributes, motion attributes, and relative spatial/temporal predicates. The seven atomic motion attributes are agent, type, direction, magnitude, origin, duration, and postcondition (§3.1, p. 3). Motion types include translation, rotation, and scale. A representative expression is `∃m.type(m,"trn") ∧ dir(m,[0,1]) ∧ mag(m,100) ∧ agt(m,ιo.clr(o,"black") ∧ shp(o,"square"))`, which checks an upward 100-pixel translation by a black square (§3.1, p. 3).

The relative vocabulary is based on Allen's 13 interval relations and a 2D rectangle algebra with 169 relations. MoVer aggregates these into `before`, `while`, and `after` for time, and `top`, `bottom`, `left`, `right`, `border`, `intersect`, and border variants for space (§3.1, pp. 3–4). The paper explains: “MoVer includes predicates that can check for all of them.” (§3.1, p. 4) Here “them” refers to the atomic attributes introduced immediately before the sentence; the complete predicate list is Table 1.

When to use it. Use a vocabulary when free-form visual comparison is too weak: a product requirement with two object motions needs named postconditions and ordering relations. Keep the vocabulary at the level that the executor can measure from the artifact.

How to apply it.

1. Define a scene schema with object identity and static attributes such as color, shape, and bounding box.
2. Represent each requested atomic motion with the seven attributes.
3. Translate each natural-language requirement into predicates over an object or motion variable; use `ι` to select an object or motion satisfying a description (§3.1, p. 3).
4. Express sequencing and overlap with `before`, `while`, or `after`, and final spatial relations with rectangle predicates.
5. Keep the generated DSL program alongside the artifact so every check is inspectable.

Verus form (Inference). A Rust API can define an abstract state and predicates for object identity, motion status, and postconditions. Use `requires` to state the input state, `ensures` for the final relation, and `invariant` on loops over frames or events. A `spec fn` can define pure predicates such as `top(a,b)`, and a `proof fn` can establish compositions such as `before(m1,m2)`. Verus has no MoVer `ι` selector or runtime first-order interpreter; object selection must be represented with sequences, maps, or indices and proved with sequence/map specifications. Inference: the main reuse is the explicit vocabulary and executable predicates, not MoVer syntax.

## technique 2: execute predicates over a normalized artifact

What it is. The engine consumes a generic per-frame SVG motion representation. It builds an animation matrix whose rows are objects and columns are frames. Each cell stores atomic motion attributes, computed by factoring each object's per-frame transform into translation, rotation, and scale and then deriving direction, magnitude, and origin; static color, shape, and local-coordinate bounding boxes are stored separately (§3.2, p. 4). The paper states: “We execute each logical predicate in the verification program on each cell of the animation matrix.” (§3.2, p. 4)

How to apply it.

1. Render the high-level animation program to per-frame SVG nodes (§3.2, p. 4).
2. Factor each frame's transform into translation, rotation, and scale; derive direction, magnitude, and origin for that frame (§3.2, p. 4).
3. Evaluate atomic predicates per matrix cell, producing a Boolean matrix.
4. Combine predicates element-wise with Boolean operators and aggregate rows/frames for quantifiers (§3.2, p. 4).
5. Evaluate interval and rectangle relations by comparing motion start/end frames and bounding-box positions. The implementation uses an interval tree for efficient execution (§3.2, p. 4).
6. Emit a report identifying the failed expression and its failed subpredicates, rather than only a single pass/fail bit.

Figure 3 illustrates why subpredicate reports matter: `left_border()` can be true at an intermediate frame while `post()` is false because the object continues moving, which then makes `before()` false. (Figure 3, p. 6)

Verus form (Inference). Normalize the target Rust behavior to an abstract trace or state transition sequence. Use a ghost sequence for events and prove frame/step invariants with `invariant`; use `ensures` to connect the final state to the requested postcondition. A Verus proof has no runtime Boolean matrix unless the product itself needs one; proof-only sequences can be ghost/spec values. Inference: this normalization exposes the same intermediate evidence but requires a semantic model of Rust operations, unlike SVG where transforms are directly observable.

Evidence and boundary. The interpreter checks the chosen representation, not the user's unstated intention. Figure 7 reports a motion as valid when “Rotate the blue square to intersect with the black square” is implemented as rotation plus straight translation; the user revises the prompt to “rotation only” after seeing the valid report (Figure 7, p. 9). Inference: a passing Verus contract likewise cannot establish that the contract captures the product requirement.

## technique 3: LLM synthesis with predicate-level iterative correction

What it is. Given a text prompt and static SVG scene, one LLM generates an animation program and another generated program describes the requested properties in MoVer. The animation is rendered, the MoVer program runs, and its report is fed back to the animation synthesizer with DSL documentation and previous attempts in chat history (§4, p. 5; Appendix A.3, p. 15). The correction prompt is explicit: “Please correct errors in the animation program as indicated by the report.” (Appendix A.3, p. 15)

How to apply it.

1. Provide the prompt, static scene, DSL documentation, and annotated examples to the LLM (§4, p. 5).
2. Generate the artifact and its checker program.
3. Render the artifact to the normalized representation and execute every checker predicate.
4. Feed the detailed report, checker program, and prior attempts back to the artifact synthesizer.
5. Repeat until all required checks pass or a fixed iteration limit is reached; retain reports for debugging.

The examples show correction at the failing granularity. In Figure 4, iteration 1 fixes Y's final position but leaves Y and S overlapping in time; iteration 2 changes the schedule to Y frames 1–60 and S frames 61–120, making `before(m1,m2)` true (Figure 4, p. 6). Figure 5 records a failure mode in which iterations 2–7 repeat the same animation before iteration 8 fixes one scale direction and iteration 9 passes all checks (Figure 5, p. 7).

Verus form (Inference). Prompt an LLM with the Rust source, the Verus error, relevant contracts, and the last compiling prefix. Ask for a patch, run `verus`, and iterate. Keep compilation as the acceptance condition; a textual “true” report is not sufficient. A repair controller can limit attempts and preserve the last compiling version. Inference: unlike MoVer's checker, Verus diagnostics include proof obligations and type/borrow errors, so the prompt should distinguish executable-code changes from proof-only changes.

Evidence. The test set has 5,600 prompt/program pairs: 1,200 single-atomic, 1,400 spatially relative, 1,200 temporally relative, and 1,800 spatio-temporally relative (§6, p. 7). Exact string-match success for LLM-generated MoVer programs is 95.1% overall (Table 2, p. 8); this is a strict syntactic denominator, and the authors warn that semantically equivalent programs can fail the string test. With GPT-4o animation synthesis and ground-truth checkers, pass@0 is 3,292/5,600 = 58.8%, pass@1+ is 1,950/5,600 = 34.8%, and failure after 49 corrections is 358/5,600 = 6.4%; pass@1+ cases use 5.8 iterations on average, range 1–38 (Table 3a, p. 8). No-feedback pass@1+ is 674/5,600 = 12.1% with 1,626/5,600 = 29.0% failures; minimal whole-program feedback is 1,074/5,600 = 19.2% pass@1+ and 1,238/5,600 = 22.1% failures (Tables 3b–c, p. 8). Predicate-level feedback therefore improves this benchmark, but the denominator and synthetic prompt distribution matter.

The realistic checker-generation case is weaker. The LLM generates incorrect MoVer programs for 272/5,600 = 4.9% of test prompts. On those, 70/272 = 25.7% pass immediately, 134/272 = 49.3% pass after correction, 20/272 = 7.4% fail, and 48/272 = 17.6% produce a program that does not execute (p. 9). The authors calculate that a full pipeline would falsely report correct animations for 204/272 = 75% of these prompts, a critical trust-boundary result.

## limitations, trusted parts, and VL threat

The authors state: “Prompts that describe complex motion paths (e.g., ‘Move the triangle on a figure eight path,’ ‘Make the rectangle dance.’) are challenging for the LLM to convert into the low-level MoVer predicates.” (§7, p. 10) They also note self-contradictory prompts, ambiguity, and a passive report that cannot itself invent higher-level constraints (§7, p. 10). Inference: the product risk for agent-written verified Rust is high if an LLM can choose a weak specification or if a checker-generation error is silently accepted. The realistic 75% false-correct rate on the 272 mis-specified-checker cases is direct evidence for that risk in this domain; Verus compilation removes one class of checker-execution error but does not solve specification omission.

What is proved or measured is predicate satisfaction in the normalized SVG representation and iterative success on the synthetic benchmark. Trusted components include the DSL semantics, transform factoring, renderer, LLM-generated checker, prompt interpretation, and the mapping from product intent to predicates. Inference: VL should reuse detailed diagnostic feedback and explicit postconditions, but must require an independently reviewed Verus specification and compilation before merging generated Rust. MoVer's benchmark and correction loop are already evidence for generic LLM feedback iteration; VL should measure Rust-specific compile success, contract coverage, and failures caused by omitted properties rather than repeat the same animation study.

## techniques for the catalog

- vocabulary-first verification DSL: define object, motion, spatial, temporal, and postcondition predicates that correspond to requirements
- normalized trace execution: convert an artifact into per-step attributes, evaluate predicate matrices, and report failing subexpressions
- predicate-level repair loop: feed detailed checker failures and the DSL contract back to the generator for bounded iterative correction
- synthetic checker benchmark: construct ground-truth specifications from structured scenes and report pass@0, repaired pass, and failure denominators

Checked 2026-10-15 against the paper by a Codex agent for mover_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
