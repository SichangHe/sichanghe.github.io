# Scenic: a language for scenario specification and scene generation
(authored by agents unless marked 🧑)
Tag: `fremont2019scenic`, [paper](https://doi.org/10.1145/3314221.3314633)

## scope and result
Scenic is a probabilistic, object-oriented language for distributions over physical scenes. The abstract says: “We propose a new probabilistic programming language for the design and analysis of perception systems, especially those based on machine learning.” (Abstract, p. 1) The paper presents specialized test sets, training data emphasizing difficult cases, and generalization of one failure into a retraining scenario (Sections 2 and 8, pp. 3–4, 14). It describes its semantics as follows: “Second, every run where a require statement (the equivalent of an “observation” in other PPLs) is violated gets discarded, and the run probabilities appropriately normalized (see, e.g., [21]).” (Section 5.1, p. 10)

Inference: For verified Rust, Scenic suggests a model-based input generator for finding specification and implementation corner cases. Generated scenes provide evidence about tested cases, not a proof of program correctness.

## technique: declarative constrained scene generation
Scenic combines classes, object specifiers, distributions, and global requirements. For example, `Car on road` assigns a uniformly random road position and, if the region has a preferred orientation, optionally assigns that heading. Explicit heading specifiers override the optional heading. Specifiers are evaluated in dependency order; ambiguous property assignments, missing dependencies, and dependency cycles are errors (Sections 4.3 and 5.1, pp. 8–10; Appendix B.2, pp. 31–32). The main restriction on control flow is that “conditional branching may not depend on random variables.” (Section 4, p. 7)

Steps from the paper: import a domain library defining regions and object properties; declare objects and their relationships; choose distributions; add requirements; sample satisfying scenes. Figure 8 uses `ego = Car with roadDeviation wiggle`, creates a visible car `c`, and places a second car with `Car beyond c by leftRight @ (4, 10)` (p. 12). Built-in requirements enforce workspace containment, nonintersection unless collisions are allowed, and visibility from ego unless disabled (Section 3, p. 6; Figure 25, p. 33).

Hard requirements condition the scene distribution. For soft requirements, the paper states: “The statement require[p] B is interpreted as require B with probability p and as a no-op otherwise: that is, it is interpreted as a hard requirement that is only checked with probability p.” It claims this makes B hold with probability at least p in the induced distribution (Section 5.1, p. 10). This study records the stated rule and claim; it does not independently establish that probability bound.

Inference: A possible Verus adaptation is to encode scenes as Rust data types and generator functions, then prove invariants over generated values or use them as test inputs. This is a proposed application, not a technique evaluated in the paper; a probability model would need a separate formal encoding.

## technique: domain-specific pruning
The sampler restricts geometric sampling regions before rejection sampling. Section 5.2 gives three sound restrictions (pp. 10–11; Algorithms 2–3, p. 34):

- Containment: if an object's position is uniform in `R`, its bounding box must lie in `C`, and `minRadius` bounds its center-to-boundary distance from below, restrict `R` to `R ∩ erode(C, minRadius)`. Erosion removes centers too close to the boundary of `C`.
- Orientation: for two objects oriented relative to a vector field constant on polygonal regions, use their allowed relative headings and maximum distance `M`. For each polygon `P`, retain `P ∩ dilate(∪Q_i, M)`, where `Q_i` satisfy the heading constraint, accounting for allowed heading deviations. Dilation expands a region by distance `M`.
- Size: infer a lower bound on the configuration's width. For each polygon `P` too narrow to contain the configuration, retain `P ∩ dilate(∪Q_i, M)`, where `Q_i` are all other polygons. Leave polygons wide enough unchanged. Narrow polygons can still contain one object when another lies in a nearby polygon.

After these restrictions, generate scenes from the imperative program and reject those violating requirements. The paper says: “While this samples from exactly the desired distribution, it has the drawback that a huge number of samples may be required to yield a single valid scene (in the worst case, when the requirements have probability zero of being satisfied, the algorithm will not even terminate).” It reports samples within a few seconds for the reasonable scenarios tried and pruning reductions by “a factor of 3 or more” (Section 5.2, p. 11). Although that section points to Appendix D for pruning experiments, Appendix D contains detector experiments rather than those measurements; the factor is a main-text report without the promised supporting results in this copy.

Inference: A Verus adaptation should prove that every originally feasible scene remains in the restricted sampling region. This justifies removing impossible samples; it does not establish that every retained sample satisfies the requirements. Continuous geometry and probability would need explicit models.

## technique: failure generalization for testing and retraining
The paper's method encodes one failure, varies selected features while holding others fixed, evaluates the resulting cases, and broadens the scenario around features associated with poor performance. Section 6.4 reports: “For each scenario we generated 150 images and evaluated” the generic model on them (p. 13). Nine variants in Table 7 explore model/color, background, local position/orientation, proximity, and apparent angle. These are controlled feature groups, not exclusively one-feature changes.

The initial image contained one car wrongly classified as three, giving 33.3% precision and 100% recall. Subsequent comparisons implicated model/color, proximity to the camera, and view angle; model mattered less among close-car scenes. For retraining, the authors did not fix the model. They generated close-car scenes and a further specialization requiring a shallow viewing angle (Section 6.4, p. 13).

They replaced 400 one-car images, 10% of the 4,000-image generic training set, and evaluated on an enlarged 400-image generic test set. Table 8 reports precision/recall of 87.4%/91.6% for close-car replacement versus 82.9%/92.7% without replacement. Classical image augmentation yielded 78.7%/92.1%; shallow-angle replacement yielded 84.0%/92.1% (p. 13). These results show the reported precision improvement alongside a recall decrease.

Inference: For VL, this workflow could help explore counterexamples from verified Rust, identify assumptions worth examining, and suggest preconditions or lemmas. Converting those observations into valid universal statements still requires proof.

## evidence, trust, and limits
The GTAV case study used squeezeDet, batch size 20, and 10,000 training iterations unless otherwise noted (Section 6.1, p. 11). Section 6.2 used 4,000 generic training images and a 200-image generic test set. It reports precision/recall of 83.1%/92.6% for generic conditions, 85.7%/94.3% for good conditions, and 72.8%/92.8% for bad conditions (pp. 11–12); it does not state the specialized test-set sizes there.

In Section 6.3, training used 5,000 Matrix images and 5,000 iterations. Replacing 250 images (5%) with overlapping-car images raised overlap precision from 62.8 ± 6.1% to 68.9 ± 3.2%, while Matrix precision changed from 72.9 ± 3.7% to 73.1 ± 2.3%. Table 6 averages eight training runs with random image selections (p. 12). Appendix D also reports average precision and a separate two-car baseline experiment (pp. 40–41).

The scene model itself had errors: “Since the resulting road information was imperfect, some generated scenes placed cars in undesired places such as sidewalks or medians, and we had to manually filter the generated images to remove these.” (Appendix D, p. 40) The authors leave describing 3D scenes and encoding dynamic scenarios to future language extensions (Section 8, p. 14).

Inference: These experiments support the utility of targeted data generation within the tested simulator and detector setup. Applying the method requires trusting or separately validating the scene model, simulator, rendering interface, detector, and metrics. For VL, the useful contribution is the constrained generation and failure-generalization workflow; an incomplete model can still miss behaviors.

## techniques for the catalog
- constrained probabilistic scenarios: describe object distributions plus hard requirements and probabilistically enforced requirements
- geometric pruning: use erosion, dilation, and width bounds to remove impossible sample regions while preserving feasible scenes
- failure generalization: vary selected features around a failing input, identify difficult scenario families, and generate data for testing or retraining

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We also created a second scenario specializing this further by requiring that the car be viewed at a shallow angle."): checked the whole paper including appendices against quotations, numbers, section/page references, and technique steps; corrected page references, size-pruning behavior, the direction of the pruning proof obligation, experiment scope and tradeoffs, and the unsupported Appendix D attribution; retained the DOI printed in the paper and marked proposed Rust/Verus applications as inferences; did not rerun experiments, inspect implementation code, or independently prove the paper's probability and soundness claims.
