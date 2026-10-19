# NL2SpaTiaL: Generating Geometric Spatio-Temporal Logic Specifications from Natural Language for Manipulation Tasks
(authored by agents unless marked 🧑)
Tag: `luo2026nl2spatial`, [paper](https://arxiv.org/abs/2512.13670)

## what the paper proves and builds

The paper builds NL2SpaTiaL, a translator from manipulation instructions to executable Spatio-Temporal Logic (SpaTiaL). Its formal object is a Hierarchical Logical Tree (HLT), whose internal nodes are temporal or Boolean operators and whose leaves are geometric predicates over objects. The paper’s central claim is that separating semantic tree prediction from deterministic syntax rendering makes nested specifications more accurate and more sample-efficient than emitting a flat logic string. The paper measures translation accuracy and demonstrates runtime trajectory monitoring and filtering with vision-language-action (VLA) policies. Inference: these demonstrations do not establish robot safety in all environments.

## technique 1: quantitative SpaTiaL monitoring

What it is: SpaTiaL extends signal temporal logic with geometric atoms. For a trajectory ξ, object poses are extracted as p_i(t)=h_i(x_t), and each predicate returns a signed robustness margin ρ. Positive margin means satisfaction, negative margin violation. The paper gives concrete atoms: closeToε uses ε_c−||p_i−p_j||; enclIn uses (r_j−δ)−(||p_i−p_j||+r_i); LeftOf uses (x_j−r_j)−(x_i+r_i+κ) (section III-B, PDF pp. 2–3).

When to use it: Inference: use it when a manipulation requirement depends on object geometry over time, such as staying left of another object, entering a container, or maintaining clearance. A signed margin is useful for ranking candidate trajectories, rather than only returning pass/fail.

How to do it: (1) represent each time step and relevant object pose; (2) choose geometric predicates and margins/tolerances; (3) compose atoms with temporal operators G, F, U over intervals and Boolean operators ¬, ∧, ∨, →; (4) evaluate the resulting robustness on ξ. The paper’s example instruction “Between time 0 and 10, the red block is always left of the blue block.” becomes `G[0,10] LeftOf(obj r, obj b)` (section IV-B, p. 4). Section III-B (p. 3) states: “Evaluating the pose sequence induced by ξ against φ yields the robustness value ρ(ξ , φ , 0), which summarizes the satisfaction margin of the entire execution.”

Verus form: Inference: define geometric state and predicate formulas as `spec fn`s, and prove lemmas connecting discrete pose updates to predicate inequalities; use `requires` for valid object indices and radii and `ensures` for robustness sign properties. A runtime monitor should be an executable Rust function whose result is checked against a `spec fn`; do not put executable logic in a proof function. Verus does not provide SpaTiaL operators automatically, so the temporal fold and geometric arithmetic must be encoded and proved by the VL implementation.

Evidence and limits: Section III-B (p. 3) states: “Once these geometric predicates are composed through the STL operators in Eq. (1), they induce a trajectory-level robustness measure that evaluates not only whether a manipulation task is satisfied, but also how strongly it is satisfied or violated over time.” Inference: correctness assumes poses and object radii supplied by the system are accurate and that the chosen margins model the physical safety requirement; collision dynamics and VLA behavior remain outside the translation proof.

## technique 2: hierarchical tree plus deterministic rendering

What it is: HLT separates global logical routing from leaf-level geometric grounding. The model predicts nested JSON, then a validator checks operator arity, required temporal intervals, and `a ≤ b`; a deterministic recursive projection Π renders the final SpaTiaL string. The paper states, “We therefore decouple generation into a semantic parsing stage and a deterministic syntax projection stage.” (section IV-B, p. 3).

When to use it: Inference: use this pipeline when nested temporal/Boolean scope causes flat sequence generation to produce malformed brackets, wrong intervals, or incorrect child order. It is especially aimed at depth and breadth that make autoregressive syntax fragile.

How to do it: (1) define internal operators `{G,F,U,∧,∨,¬,→}` and a leaf predicate vocabulary; (2) train the LLM on serialized trees; (3) emit an internal node with interval when required, recursively emit children, and emit predicate plus arguments at leaves; (4) parse JSON and reject malformed trees; (5) recursively render unary, binary, and temporal nodes. The system prompt requires: “Temporal operators require explicit intervals. Arity bounds: G/F/Not(=1 child), U/Implies(=2), And/Or(≥2). Output ONLY valid JSON.” The worked target for “Ensure the red block stays above the blue block and touches the green block throughout time steps 5 to 20.” is a G node containing an And node with Above and Touch leaves (section IV-B, p. 4).

Verus form: Inference: represent a validated tree with Rust enums and vectors, and write a pure executable renderer plus a `spec fn` describing its output. Prove that validation implies arity and interval invariants and that rendering preserves tree order. Rust enum matching and `requires`/`ensures` carry over; JSON parsing, strings, and unbounded vectors need an explicit trusted boundary or finite representation. A Verus proof cannot establish that an LLM selected the intended tree; it establishes only the validator/renderer contract.

Evidence: With five demonstrations for GPT-5.2, flat accuracy falls from 73.9% at D2 B4 to 18.0% at D4 B3, while HLT is 96.6% and 42.0%, respectively (section VI-B, Fig. 5, p. 6). Each evaluation set has 150 instances: 30 unique logical skeletons with five paraphrases each (section VI-A, p. 5). Table I reports D4 B3 Llama-3 (8B) HLT 70.4 ± 0.8% versus Qwen-2.5 (14B) flat 58.7 ± 1.5% under the same Aug=5 setting (p. 6). Supervised results average three runs with seeds {0, 42, 123}; the metric is Correct Match (CM), and training uses QLoRA (section VI-A, pp. 5–6). Inference: these translation scores do not measure proof rates for the downstream robot.

## technique 3: logic-first synthetic data with controlled complexity

What it is: sample valid formula trees first, then deterministically back-translate each node to canonical controlled English and ask an LLM for paraphrases conditioned on the exact formula. The paper describes the process: “We first specify structural complexity bounds (maximum depth D and maximum breadth B), then sample concrete logical tree structures within these bounds.” Each dataset item stores the root, canonical text, paraphrases, and analogous tuples for internal nodes and leaves (section V, p. 5).

When to use it: Inference: use it when formal-methods annotations are scarce but a grammar and deterministic renderer exist. Control D and B to create depth/breadth evaluation splits; vary paraphrases to test linguistic robustness.

How to do it: (1) sample an HLT within D and B; (2) instantiate spatial predicates and arguments; (3) render every node to canonical text using deterministic templates; (4) generate paraphrases ν∼p_LLM(·|τ(φ_i),φ_i), retaining the formula as conditioning context; (5) serialize compact nested JSON for SFT while retaining layer annotations for analysis. Appendix A (p. 8) gives templates such as `G[a,b] φ` → “Throughout [a,b], τ(φ ) holds.” and `LeftOf(i,j)` → “i is strictly to the left of j (margin κ).”

Verus form: Inference: encode the grammar as constructors and prove renderer round trips (`parse(render(tree))` equals the tree) for the finite predicate/operator set. Treat LLM paraphrases as untrusted inputs; only the parsed tree and validator enter verified code.

Evidence and limits: HLT trained with 600 pairs reaches 64.0% on D4 B3 versus flat trained with 3,000 pairs at 52.7% (section VI-E, p. 6; 600 and 3,000 are training-pair counts; accuracy is reported CM on the 150-instance evaluation set). HLT with 200 unique skeletons × 5 paraphrases reaches 70.4%, versus 1,000 skeletons × 1 paraphrase at 70.0%; flat rises from 48.9% to 59.3% on D4 B3 when formula diversity is increased. Section VII (p. 8) states: “A current limitation is that training primarily supervises the final nested JSON output, while richer hierarchical annotations—such as node-level descriptions and aligned intermediate subformulas—remain underutilized.”

## deployment, trust, and VL implications

For passive monitoring, the paper deploys generated formulas on LIBERO trajectories from π0.5 and reports stage-wise robustness, including failed grasp attempts (section VI-F, p. 7). For active filtering, π0 proposes short-horizon rollouts; the system scores each against the formula, rejects violating trajectories, and selects the highest robustness. Section VI-F (p. 7) states: “This confirms that our one-shot HLT translations successfully serve as executable, interpretable trajectory verifiers for reliable downstream deployment.” Inference: the verifier depends on perception, predicate definitions, renderer implementation, and VLA rollout state. For VL, the transferable pattern is a typed intermediate representation plus a small verified interpreter; the threat from agent-written verified Rust is semantic mismatch in the generated specification and unmodeled physical state, rather than merely Rust memory unsafety.

## techniques for the catalog

- quantitative SpaTiaL robustness: evaluate signed geometric and temporal margins over trajectories
- HLT semantic parsing: predict nested JSON for logical scope and object predicates
- deterministic rendering: validate tree arity and intervals, then recursively emit executable logic
- logic-first synthesis: sample valid formulas, render canonical language, and diversify with formula-conditioned paraphrases
- runtime generate-and-test: score VLA rollouts and reject candidates with negative robustness
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "To reduce template bias and improve robustness to natural-language variation, we generate paraphrased variants of each canonical description."): checked the full text including references and Appendix A, quotations, numerical comparisons, section/page references, and technique steps; corrected the reversed HLT data-allocation results, quotations, metric descriptions, and inference labels; did not reproduce experiments, inspect code, or validate the proposed Verus encodings.
