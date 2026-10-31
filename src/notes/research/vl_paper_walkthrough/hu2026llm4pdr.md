# Enhancing Word-Level Property Directed Reachability with LLM-Driven Semantic Guidance
(authored by agents unless marked 🧑)
Tag: `hu2026llm4pdr`, [paper](http://arxiv.org/abs/2609.30131v1)

## scope and result

LLM4PDR adds language-model-generated semantic hints to word-level Property Directed Reachability (PDR/IC3) for hardware model checking. Bit-blasting can hide arithmetic relations such as equal counter offsets, so a SAT-based engine may learn many local clauses instead of one useful word-level invariant. LLM4PDR asks an LLM to propose predicates, frame clauses, or temporary assertions in restricted SMT-LIB2. Pono's verifier parses, type-checks, and checks every proposal before it can influence search. The abstract describes the soundness boundary: “However, these suggestions must not be trusted as proofs.” (Abstract, p. 1)

The three mechanisms enter different PDR phases. Predicate helpers enlarge the atom vocabulary used by inductive generalization. Clause helpers are candidate first-frame lemmas and must satisfy initiation and one-step consecution. Assertion helpers temporarily strengthen the target property and are removed when counterexamples falsify them. The implementation uses OpenAI GPT o3 with a fixed prompt template and up to five declarations per request (§IV-B, p. 7; §V-A, p. 10).

## technique 1: restricted helper interface and soundness pipeline

What it is. Each generated helper is an SMT-LIB2 `define-fun` whose reserved prefix selects its role: `predicate.*`, `clause.*`, or `assertion.*` (Fig. 4, p. 5). The verifier performs three checks before consumption: syntax parsing, elaboration that binds arguments and checks bit-vector widths, and dispatch to the role-specific validation path (§IV-A, pp. 5–6).

When to use it. Use a restricted interface when an LLM must communicate structured suggestions to a proof engine without being able to modify the transition system or insert unchecked invariants. The interface should make malformed terms rejectable and should encode enough typing information for the verifier to validate every symbol.

How to do it.

1. Provide the LLM with the RTL or BTOR2 transition system and target property (§IV-B, p. 6).
2. Require typed SMT-LIB2 declarations with one reserved role prefix (Fig. 4, p. 5).
3. Parse the helper file as SMT-LIB2 and reject syntax errors (§IV-A, p. 6).
4. Bind every formal argument to a transition-system variable and check exact bit-vector widths (§IV-A, p. 6).
5. Dispatch predicates to the MIC pool, clauses to frame validation, and assertions to counterexample-guided refinement (§IV-A, pp. 5–6).
6. Let ordinary PDR proof obligations decide whether a helper affects the final proof (§IV-A, p. 6).

Evidence. The paper's final conclusion states that the verifier “parses, type-checks, validates, and refines those artifacts through ordinary PDR proof obligations.” (§VI, p. 13) The LLM cannot directly add a fact to a frame or alter a property; those operations occur only after checks described below. The paper does not provide a formal theorem about the LLM or the parser implementation. Inference: the trusted base still includes Pono, its SMT solvers, parser, and transition-system encoding.

## technique 2: COI-aware prompt construction

What it is. Before helper synthesis, LLM4PDR computes a cone of influence (COI) for the target property and includes only state variables and transition fragments that can affect it. The prompt combines a fixed system role, a few-shot helper example, the mode-specific task, exact variable names and widths, and strict output constraints (Fig. 5, p. 6).

When to use it. Use COI filtering when a design is too large for a useful prompt or when irrelevant signals would cause the LLM to generate distracting facts. Filtering is property-directed context reduction; it does not change the transition system or proof obligations.

How to do it.

1. Start from the RTL fragment, or BTOR2 when RTL is unavailable (§IV-B, p. 6).
2. Compute the target property's fan-in and retain its relevant state variables and transition fragments (§IV-B, p. 6).
3. Build the fixed prompt with a system role, few-shot declaration example, mode, and strict SMT-LIB2 output rules (§IV-B, p. 6).
4. Ask for up to five declarations with the selected prefix (§IV-B, p. 7).
5. Parse and validate the returned declarations through the helper pipeline (§IV-A–B, pp. 5–7).

The authors report that, on representative HWMCC instances, COI pruning removes 52.35% to 82.49% of state variables from the prompt (§IV-B, p. 6). These percentages describe state-variable removal on those instances, not proof success or a universal reduction. Inference: a Verus prompt builder could slice the call graph and ghost-state dependencies around one postcondition, but Rust ownership, trait bounds, and external calls require a language-specific dependency analysis.

## technique 3: LLM-guided predicate generation and two-phase MIC

What it is. Predicate helpers add word-level atoms to the candidate cube used by minimal inductive clause (MIC) generalization. In the motivating `xp2` circuit, the useful relation is `y = x + 2`; ordinary bit-level MIC sees extracts such as `y[j]=1` and `x[1]=1`. LLM4PDR adds predicates including `y=x+2`, `x<y`, and `x≤61` (§IV-C, pp. 7–8).

When to use it. Use predicate guidance when the CTI's bit literals hide a compact arithmetic or relational invariant. Use two phases so the solver cannot discard useful word-level predicates while minimizing low-level clutter.

How to do it.

1. Ask the LLM to generate candidate predicates from the COI-filtered design (§IV-C, p. 7).
2. Filter out trivial predicates that are always true or always false (Algorithm 3, p. 7).
3. Evaluate each predicate on the CTI; retain p or ¬p only when its value is fixed by that CTI (Algorithm 3, pp. 7–8).
4. Form the expanded cube from bit literals and matched helper predicates (§IV-C, p. 8).
5. Phase 1: freeze helper predicates and let MIC drop only bit-level literals, using initiation and consecution checks (Algorithm 3, p. 7; Fig. 7, p. 8).
6. Phase 2: try dropping each helper; retain it when removing it would violate initiation or inductiveness, and discard it when both checks remain UNSAT (Algorithm 3, p. 7).
7. Add the resulting compact clause to the frame only through ordinary PDR checks (§IV-C, p. 8).

The paper says: “The LLM never gets to add a fact directly to a frame.” (§IV-C, p. 8) Inference: for Verus, candidate invariants should first be frozen while bit-level or implementation-level obligations are minimized, then tested for redundancy against the current proof context. Verus does not expose PDR frames, so this two-phase policy would need an analogous notion of candidate lemma and proof-context preservation.

## technique 4: helper clause side-loading

What it is. Clause helpers are complete candidate frame lemmas injected into the first frame F1 before the main blocking loop. A clause passes only if the initial state implies it and every one-step successor of an initial state satisfies its primed form. The paper's checks are `UNSAT(Init ∧ ¬c)` and `UNSAT(Init ∧ T ∧ ¬c′)` (§IV-D, pp. 8–9).

When to use it. Use side-loading when a useful invariant is apparent from design semantics and should guide the entire PDR proof from its first frame, especially for deep pipelines. Unlike a predicate, a clause can be a disjunction combining arithmetic and bit-level conditions.

How to do it.

1. Ask the LLM for complete clause declarations (§IV-D, p. 8).
2. Parse and type-check each declaration (§IV-A, p. 6).
3. Check initiation: reject c if `Init ∧ ¬c` is satisfiable (§IV-D, p. 9).
4. Check one-step consecution from the initial frame: reject c if `Init ∧ T ∧ ¬c′` is satisfiable (§IV-D, p. 9).
5. Insert passing clauses into F1 (§IV-D, p. 9).
6. Let normal PDR propagation retain or drop the clause at later frames (§IV-D, p. 9).

In the `xp2` example, side-loading `y=x+2` exposes the proof idea immediately; irrelevant clauses may pass first-frame checks but fail later propagation (§IV-D, pp. 8–9). Inference: in Verus, a generated lemma should be required to hold in the initial abstract state and after one allowed transition before it is made available to later proofs. This is a proposed analogy, not a Verus feature reported by the paper.

## technique 5: counterexample-guided helper assertions

What it is. Assertion helpers tentatively strengthen the target property from P to `P* = P ∧ ∧a∈V a`, where V is the set of assertions not yet invalidated. If a counterexample to P* appears, the verifier evaluates the original P on that state. If P is false, the design is genuinely unsafe; otherwise only assertions falsified by the counterexample are removed and PDR restarts with the weaker P* (Algorithm 5, pp. 9–10).

When to use it. Use assertions when a semantic relation explains the target property but is not suitable as a frame clause or MIC atom. Keep them tentative because an LLM may suggest a false relation.

How to do it.

1. Generate assertion declarations and initialize the active set V (§IV-E, p. 9).
2. Conjoin active assertions with P to form P* (§IV-E, p. 9).
3. Run ordinary PDR on P* and obtain a bad cube when one exists (Algorithm 5, p. 9).
4. Block the cube if possible; otherwise evaluate the original P on it (Algorithm 5, p. 9).
5. If P is false, return an unsafe result with a real counterexample (§IV-E, p. 10).
6. If P is true, remove exactly the assertions falsified by the cube and restart (§IV-E, p. 10).
7. If all assertions are removed, ordinary PDR on P remains the fallback (§IV-E, p. 10).

For `xp2`, the assertion `(y−x)=2` strengthens `x<y` and is true on all reachable states; a wrong assertion such as `(y−x)=3` is removed by the first counterexample satisfying P but violating that assertion (§IV-E, pp. 9–10). Inference: a Verus agent could use candidate postcondition lemmas as temporary strengthening facts, but every failed proof obligation must fall back to the original contract. Never encode an LLM assertion as an unchecked `assume`.

## evidence and limitations

On 33 arithmetic micro-benchmarks, vanilla Pono solves 13/33, AVR 11/33, and LLM4PDR's assertion mode solves 28/33; predicate and clause modes each solve 23/33 (§V-B, p. 10). The denominator is 33 arithmetic cases. On twelve HWMCC instances, results are per-instance runtimes with a timeout of at least one hour; for `intersymbol_conv`, Pono, AVR, and DreamMiner time out, the unguided IC3ng ablation takes 613.64 seconds, and predicate guidance takes 3.06 seconds (Table II, p. 11). These are instance-specific times, not averages. On HLS Kalman3 and Kalman4, baseline tools time out while LLM modes complete; clause mode is fastest on both hard kernels (Table III, p. 11). On six open-source RTL cases, predicate guidance is best on five (Table IV, p. 12).

The ablation retains the IC3ng engine but disables helpers. The paper reports that IC3ng without helpers sometimes improves and sometimes regresses against IC3bits, so engine changes alone do not explain the gains (§V-F, p. 12). Inference: the evidence supports complementary benefits by design class, not a universally best helper type. The LLM, prompts, parser, Pono implementation, SMT solvers, and RTL/BTOR2 models remain trusted infrastructure; generated helpers are not trusted proofs.

## techniques for the catalog

- restricted helper interface — route typed LLM suggestions through parser, binding, and role-specific verifier checks
- COI-aware prompting — filter design context to property-relevant variables before helper synthesis
- two-phase predicate MIC — preserve candidate word-level predicates while pruning low-level literals, then remove redundant helpers
- clause side-loading — inject only initiation- and consecution-checked lemmas into the first PDR frame
- assertion refinement — strengthen a property temporarily and remove only assertions falsified by counterexamples
- soundness separation — keep the LLM as a hint generator while the model checker makes every proof decision
