# MoVer: Motion Verification for Motion Graphics Animations
(authored by agents unless marked 🧑)
Tag: `ma2025mover`, [paper](https://doi.org/10.1145/3731209)

## scope and result

MoVer is a first-order-logic DSL and interpreter for checking whether an SVG animation contains the spatial, temporal, and motion properties stated in a prompt. An LLM writes both the animation program and a MoVer program; the interpreter reports each predicate as true or false; the report is fed back to the animation generator for another iteration. The paper's abstract says: “Executing the verification program on the animation yields a report of the predicates that failed and the report can be automatically fed back to LLM to iteratively correct the animation.” (Abstract, p. 1)

## technique 1: design a property DSL from an explicit vocabulary

What it is. MoVer models objects `o_i`, motions `m_j`, logical operators, object attributes, motion attributes, and relative spatial/temporal predicates. The seven atomic motion attributes are agent, type, direction, magnitude, origin, duration, and postcondition (§3.1, p. 3). Motion types include translation, rotation, and scale. A representative expression is `∃m.type(m,"trn") ∧ dir(m,[0,1]) ∧ mag(m,100) ∧ agt(m,ιo.clr(o,"black") ∧ shp(o,"square"))`, which checks an upward 100-pixel translation by a black square (§3.1, p. 3).

The relative vocabulary is based on Allen's 13 interval relations and a 2D rectangle algebra with 169 relations. MoVer aggregates these into `before`, `while`, and `after` for time, and `top`, `bottom`, `left`, `right`, `border`, `intersect`, and border variants for space (§3.1, pp. 3–4). The paper explains: “MoVer includes predicates that can check for all of them.” (§3.1, p. 4) Here “them” refers to the 13 temporal and 169 spatial relations introduced at the end of p. 3. Table 1 lists the predicate categories.

Inference: when to use it. Use a vocabulary when free-form visual comparison is too weak: a product requirement with two object motions needs named postconditions and ordering relations. Keep the vocabulary at the level that the executor can measure from the artifact.

Inference: how to apply it.

1. Define a scene schema with object identity and static attributes such as color, shape, and bounding box.
2. Represent each requested atomic motion using the applicable attributes; a prompt may specify up to seven.
3. Translate each natural-language requirement into predicates over an object or motion variable; use `ι` to select an object or motion satisfying a description (§3.1, p. 3).
4. Express sequencing and overlap with `before`, `while`, or `after`, and final spatial relations with rectangle predicates.
5. Keep the generated DSL program alongside the artifact so every check is inspectable.

Inference: proposed Verus form. A Rust API can define an abstract state and predicates for object identity, motion status, and postconditions. Use `requires` to state the input state, `ensures` for the final relation, and `invariant` on loops over frames or events. A `spec fn` can define pure predicates such as `top(a,b)`, and a `proof fn` can establish compositions such as `before(m1,m2)`. For this proposed encoding, represent object selection with sequences, maps, or indices. The main reuse is the explicit vocabulary and predicates; the paper does not evaluate this Verus adaptation.

## technique 2: execute predicates over a normalized artifact

What it is. The engine consumes a generic per-frame SVG motion representation. It builds an animation matrix whose rows are objects and columns are frames. Each cell stores atomic motion attributes except `post`, computed by factoring each object's per-frame transform into translation, rotation, and scale and then deriving direction, magnitude, and origin; static color, shape, and local-coordinate bounding boxes are stored separately (§3.2, p. 4). The paper states: “We execute each logical predicate in the verification program on each cell of the animation matrix.” (§3.2, p. 4)

How to apply it.

1. Render the high-level animation program to per-frame SVG nodes (§3.2, p. 4).
2. Factor each frame's transform into translation, rotation, and scale; derive direction, magnitude, and origin for that frame (§3.2, p. 4).
3. Evaluate atomic predicates per matrix cell, producing a Boolean matrix.
4. Combine predicates element-wise with Boolean operators and aggregate rows/frames for quantifiers (§3.2, p. 4).
5. Evaluate interval and rectangle relations by comparing motion start/end frames and bounding-box positions. The implementation uses an interval tree for efficient execution (§3.2, p. 4).
6. Emit a report identifying the failed expression and its failed subpredicates, rather than only a single pass/fail bit.

Figure 3 illustrates why subpredicate reports matter: `left_border()` can be true at an intermediate frame while `post()` is false because the object continues moving, which then makes `before()` false. (Figure 3, p. 5)

Inference: proposed Verus form. Normalize the target Rust behavior to an abstract trace or state transition sequence. Use a ghost sequence for events and prove frame/step invariants with `invariant`; use `ensures` to connect the final state to the requested postcondition. Keep the trace as a proof-only sequence when runtime storage is unnecessary. This adaptation would require a semantic model of the relevant Rust operations; the paper evaluates SVG transforms.

Evidence and boundary. The interpreter checks the chosen representation, not the user's unstated intention. Figure 7 reports a motion as valid when “Rotate the blue square to intersect with the black square” is implemented as rotation plus straight translation; the user revises the prompt to “rotation-only” after seeing the valid report (Figure 7, p. 9). Inference: a passing Verus contract likewise cannot establish that the contract captures the product requirement.

## technique 3: LLM synthesis with predicate-level iterative correction

What it is. Given a text prompt and static SVG scene, two GPT-4o synthesis roles generate an animation program using GSAP and a verification program using MoVer. The animation is rendered, the MoVer program runs, and its report is fed back to the animation synthesizer with DSL documentation and previous attempts in chat history (§4, p. 5; Appendix A.3, p. 15). The correction prompt is explicit: “Please correct errors in the animation program as indicated by the report” (Appendix A.3, p. 15)

How to apply it.

1. Provide the prompt and static SVG scene, with annotated API documentation and examples for animation synthesis and DSL documentation and examples for MoVer synthesis (§4, p. 5).
2. Generate the artifact and its checker program.
3. Render the artifact to the normalized representation and execute every checker predicate.
4. Feed the detailed report, checker program, and prior attempts back to the artifact synthesizer.
5. Repeat correction when verification fails. The evaluation allows up to 49 correction iterations after the initial generation (Table 3, p. 8).

The examples show correction at the failing granularity. In Figure 4, iteration 1 fixes Y's final position but leaves Y and S overlapping in time; iteration 2 changes the schedule to Y frames 1–60 and S frames 61–120, making `before(m1,m2)` true (Figure 4, p. 5). Figure 5 records a failure mode in which iterations 2–7 repeat the same animation before iteration 8 corrects the scaling of the yellow H and blue A, and iteration 9 changes the sign of the scale factor of the two bottom letters and passes all checks (Figure 5, p. 6).

Inference: proposed Verus form. Prompt an LLM with the Rust source, the Verus error, relevant contracts, and the last compiling prefix. Ask for a patch, run `verus`, and iterate. Require a successful Verus verification run before accepting a patch. A repair controller can limit attempts and preserve the last compiling version. Distinguish executable-code changes from proof-only changes when requesting repairs. This is a proposed Rust workflow, not a result measured by MoVer.

Evidence. The test set has 5,600 prompt/program pairs: 1,200 single-atomic, 1,400 spatially relative, 1,200 temporally relative, and 1,800 spatio-temporally relative (§6, p. 8). Exact string-match success for LLM-generated MoVer programs is 95.1% overall (Table 2, p. 8); the criterion is exact program-string equality. The caption states: “We note that requiring a perfect string match is a stringent test for success as the underlying semantics of the two programs may match even without an exact string match.” With GPT-4o animation synthesis and ground-truth checkers, pass@0 is 3,292/5,600 = 58.8%, pass@1+ is 1,950/5,600 = 34.8%, and failure after 49 corrections is 358/5,600 = 6.4%; pass@1+ cases use 5.8 iterations on average, range 1–38 (Table 3a, p. 8). No-feedback pass@1+ is 674/5,600 = 12.1% with 1,626/5,600 = 29.0% failures; minimal whole-program feedback is 1,074/5,600 = 19.2% pass@1+ and 1,238/5,600 = 22.1% failures (Tables 3b–c, p. 8). Inference: predicate-level feedback improves this benchmark, but this does not establish performance on arbitrary prompts. Appendix B (p. 15) specifies 56 scene graphs and 56 ground-truth MoVer programs underlying the 5,600 prompt variations: 80% use synonyms and reordering, and 20% use GPT-4o rewrites.

The evaluation also examines incorrect generated checkers. The LLM generates incorrect MoVer programs for 272/5,600 = 4.9% of test prompts. On those, 70/272 = 25.7% pass immediately, 134/272 = 49.3% pass after correction, 20/272 = 7.4% fail, and 48/272 = 17.6% produce a program that does not execute (p. 9). The authors state: “In other words, running our full pipeline on these prompts would falsely report that it produced correct animations for 204 (75%) of the prompts and that it produced incorrect animations for the remaining 68 (25%) prompts.” (§6, p. 9) Inference: this exposes the risk of accepting an animation using an incorrect generated specification.

## techniques for the catalog

- vocabulary-first verification DSL: define object, motion, spatial, temporal, and postcondition predicates that correspond to requirements
- normalized trace execution: convert an artifact into per-step attributes, evaluate predicate matrices, and report failing subexpressions
- predicate-level repair loop: feed detailed checker failures and the DSL contract back to the generator for bounded iterative correction
- synthetic checker benchmark: construct ground-truth specifications from structured scenes and report pass@0, repaired pass, and failure denominators
