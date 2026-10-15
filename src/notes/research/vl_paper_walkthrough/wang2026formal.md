# Formal Model Construction Guided by Model-Based Proof Sketches
(authored by agents unless marked 🧑)
Tag: `wang2026formal`, [paper](https://doi.org/10.48550/arxiv.2609.29870)

## paper's problem and contribution

The paper studies automatic construction and repair of Event-B state-based formal models from natural-language requirements. A model is an environment Γ plus state-transition events. Γ contains constants, sets, axioms, variables, invariants, and variants; each event has a guard and an action over before and after states (§2.1.1, PDF p.3). The target properties include deadlock-freeness and invariant preservation. The paper's central claim is that a flat collection of generated events gives poor repair granularity: a local event repair can break a global property or create a deadlock (§1, PDF pp.2–3).

The proposed Proof-Sketch-Guided Formal Model Synthesis (ProGS) introduces a model-based proof sketch as a tree between requirements and executable formal events. Internal nodes encode case splits or induction conditions; leaves contain guards and actions and become state-transition events. Verification failures are mapped from event leaves back to subtrees, so related events are repaired together (§1, PDF p.2; §3.3–3.4, PDF pp.7–9). The paper reports experiments on 27 systems and compares ProGS with Basic Modeling Agent, PAT-Agent, and Event-B Agent (§4.1–4.3, PDF pp.10–11).

## technique 1: construct and validate the environment model

Inference: Use this first whenever requirements must be translated into a state-based model. The environment is the fixed semantic foundation for later sketch checks and event proof obligations.

Steps from the paper:

1. Prompt an LLM with the requirements document to generate Γ, including constants, variables, invariants, and variants (§3.2, PDF p.6). The requirements use invariants of the form `condition ⇒ property`; a condition of `TRUE` expresses a global invariant, while a nontrivial condition expresses a loop or postcondition context (§3.2, PDF p.6).
2. Repeatedly compile and type-check Γ, asking the LLM to repair compilation and typing errors until Γ is well formed (§3.2, PDF p.6).
3. Ask an LLM to identify dependencies among invariants and variants, then validate each proposed dependency with formal obligations (§3.2, PDF pp.6–7).
4. For equivalence, check `P ⇔ Q`; for implication, check `P ⇒ Q ∧ ¬(Q ⇒ P)`; for a case split, check `P ⇔ ⋁ Case_i` (§3.2, PDF p.7).
5. For induction, check that an induction hypothesis `P` helps establish conclusion `Q` at variant value zero using `¬(P ⇒ Q) ∧ ¬(var = 0 ⇒ Q) ∧ (P ∧ var = 0 ⇒ Q)` (§3.2, PDF p.7).

The selection-sort example identifies `n − k` as a variant linking prefix-sortedness to final sortedness, and `r − l` as a variant linking the minimum-search invariants (§3.2, PDF p.7). Table 1 gives concrete invariant formalizations, including SAF-5's sorted-prefix relation (§2.3, PDF p.4).

Inference: In Verus, encode Γ as Rust types and executable state, with `spec fn` predicates for invariants and `requires`/`ensures` contracts on transitions. Use `decreases` for a variant and `assert` or proof functions for dependency lemmas. This is a translation of the paper's obligations, not a claim that ProGS emits Verus.

## technique 2: represent proof structure as a model-based proof sketch

Inference: Use a proof sketch when several events jointly implement a case analysis or induction and independent repairs could become inconsistent.

The paper defines a sketch as a finite directed tree `P = (N, E)`. The paper states, "A model-based proof sketch represents the proof structure of the target formal system as a tree." A leaf `n_l = (grd, act)` has a guard and action and corresponds to one concrete event. An internal node `n_i = (grd, {})` has a guard but no action and represents an intermediate proof or case-splitting condition (§3.3, PDF p.7). The construction procedure is:

1. Give an LLM the requirements, Γ, and validated invariant dependencies; ask for an initial sketch `P` (§3.3, PDF p.7).
2. Deterministically clean the generated tree (§3.3.1, PDF pp.7–8).
3. Check edge-level coverage and guard consistency (§3.3.2, PDF p.8).
4. Translate each validated leaf into an event and combine all events with Γ (§3.4.1, PDF p.9).

Cleaning has three concrete rules. Remove actionless leaves unless they are explicitly terminal, observational, or skip events. Merge a unary internal branch into its parent, conjoining the guards. Factor guards shared by sibling nodes into an abstract parent, leaving branch-specific guards in the children (§3.3.1, PDF pp.7–8).

Inference: The closest Verus representation is a proof-oriented module whose executable transition functions correspond to leaves, while internal nodes become `proof fn` lemmas about a disjunction of guards. Rust `match` branches can mirror case splits, but a Verus proof tree is not automatically derived from the control-flow tree; the correspondence must be stated and proved.

## technique 3: enforce structural deadlock and refinement checks

Inference: Apply these checks before synthesizing events. They make a parent case split both covering and semantically nested.

For every internal parent `n_i`, ProGS checks that its guard implies the disjunction of all child guards: `Γ ⊢ ⋀ (n_i.grd ⇒ ⋁ n_c.grd)` over parent-child edges (§3.3.2, PDF p.8). This is the sketch deadlock-freeness check. Because it is a conjunction over nodes, each edge-level obligation can be checked separately. For every edge `(n_p, n_c)`, it checks `n_c.grd ⇒ n_p.grd` (§3.3.2, PDF p.8). The first condition prevents an uncovered case; the second prevents a child from accepting a state outside its parent.

The selection-sort example checks the root case `fs = TRUE ⇒ k < n ∨ k = n`; since Γ includes `k ≤ n`, the two child guards `fs = TRUE ∧ k < n` and `fs = TRUE ∧ k = n` satisfy coverage and parent-child validity (§3.3.2, PDF p.8).

Inference: In Verus, state the parent and child conditions as `spec fn`s and prove coverage with `assert forall |s| parent(s) ==> child1(s) || child2(s)` (or a corresponding finite disjunction), then prove each child implies the parent. Use these facts as preconditions for leaf transition proofs. Verus syntax and solver behavior may require quantified-trigger adjustments; the paper does not evaluate this encoding.

## technique 4: rank sketches and repair the best candidate

Inference: Use structural cost to select among nondeterministic LLM sketches. ProGS computes `scost = 1/3 × (|structural_check_fails|/|N| + 1/depth + 1/leaf_nodes)` (§3.3.3, PDF p.9). Lower is preferred: fewer failures, greater depth for localization, and more leaves for finer proof decomposition. It generates three candidates (`n = 3`) and selects the lowest-cost sketch, then gives that sketch and failed checks to the LLM for iterative repair until checks pass or a trial limit is reached (§3.3.3, PDF p.9).

Inference: A Verus implementation can use an external orchestration script to generate candidate Rust/proof modules, run `cargo verus`, count failed assertions or diagnostics, and retain the lowest-cost candidate. The scoring policy is an inference because ProGS's exact Event-B diagnostics and depth calculation do not transfer directly.

## technique 5: synthesize leaves and localize failed proof obligations to subtrees

Inference: After structural validation, translate each leaf `(guard, action)` into an Event-B event (§3.4.1, PDF p.9). The paper states, "The validated sketch can then be deterministically translated into a set of state-transition events that avoid unexpected deadlocks and satisfy the user-defined properties encoded as invariants." Generate event-level obligations for guard well-definedness, invariant preservation, and variant decrease; run automated provers and SMT solvers (§3.4.2, PDF p.9). Map every failed invariant or variant obligation back to its leaf. If all descendant leaves of a subtree fail the same obligation, select that subtree as the repair group and ask the LLM to repair it as a unit (§3.4.2, PDF p.9).

The paper's selection-sort walk-through starts with one incomplete `place_minimum` node. Failure of prefix-sortedness causes a case split; when both resulting leaves still fail, the whole `place_minimum` subtree is repaired. The final repair covers successful swap, abnormal cases, and termination, and adds the critical guard `k = 0 ∨ g(k − 1) < g(l)` while retaining cases where its negation holds (§2.3, PDF pp.5–6; §3.4.2, PDF p.9).

Inference: In Verus, map failed verification diagnostics to transition functions and a manually maintained tree of related functions. Repair the shared precondition or invariant lemma before changing individual functions. Use `requires`, `ensures`, `invariant` clauses on loops, `decreases`, and `proof fn` lemmas; do not treat `proof fn` as runtime code. The subtree mapping and repair policy are not implemented by Verus itself.

## technique 6: evaluate proof quality, semantics, and repair effort together

The paper measures Syntax Correctness, Proof Discharge Rate (PDR), Requirement Fulfillment (RF), Runtime Coverage, and Trace Conformance (§4.4, PDF p.11). It evaluates 27 Event-B examples spanning sequential, concurrent, and distributed systems; each system has three concrete constant assignments and traces from ground-truth models (§4.2, PDF pp.10–11). All methods use GPT 5.4 mini, Rodin provers/SMT solvers, and ProB under the common Event-B language (§4.1, PDF p.10).

Table 2 reports ProGS scores of Syntax 0.944, PDR 0.967, RF 0.903, Runtime 0.777, and Trace 0.697, each averaged over the 27 systems (§4.5, PDF p.11). The baselines' corresponding rows are Basic Modeling Agent 0.944/0.952/0.778/0.804/0.629, PAT-Agent 0.981/0.946/0.757/0.623/0.302, and Event-B Agent 0.863/0.956/0.941/0.617/0.487 (Table 2, PDF p.11). ProGS has the highest PDR and Trace score, second-highest RF, and the highest or second-highest value on every metric except Syntax (§4.5, PDF pp.11–12).

Table 3 gives average runtime and LLM calls over the 27 systems: ProGS 18.43 minutes and 21.59 calls, versus Event-B Agent 25.98 minutes and 29.93 calls (§4.6, PDF p.13). Table 4 sums undischarged proof obligations over all 27 systems: Event-B Agent has 132 before and 71 after repair, at 7.148 calls per obligation; ProGS has 120 before and 38 after, at 2.366 calls per obligation (§4.6, PDF pp.13–14). The paper also reports per-system averages of 4.89 and 4.44 undischarged obligations, respectively (§4.6, PDF p.13).

The ablation table removes both features, subtree repair, or structural checks. Full ProGS is 0.944/0.967/0.903/0.777/0.697; without both is 0.947/0.958/0.872/0.725/0.555; without subtree repair is 0.948/0.953/0.860/0.761/0.608; without structural checks is 0.956/0.982/0.962/0.715/0.600 (Syntax/PDR/RF/Runtime/Trace, Table 5, PDF p.14). The authors conclude that structural checks improve runtime behavior and subtree repair improves proof and runtime performance (§4.7, PDF pp.14–15).

## what the evidence proves and what remains trusted

The measured evidence supports the claim that this implementation and prompt pipeline improved the listed metrics on this 27-system Event-B benchmark. It does not prove that every generated model is correct: PDR counts discharged obligations, and RF is requirement-level aggregation. The paper states, “The correctness guarantees provided by ProGS are bounded by the capabilities of the underlying verification tools.” (§5.1.1, PDF p.15). It also states, “an unproven obligation does not necessarily indicate an incorrect model.” (§5.1.1, PDF p.15). Trusted elements therefore include the requirements and their formalization, the Rodin provers and SMT solvers, ProB traces, the Event-B-to-metric tooling, the GPT 5.4 mini behavior, and the ground-truth models used for traces (§4.1–4.2; §5.1.1, PDF pp.10–11, 15).

The paper notes a numerical interpretation issue: ProGS's RF 0.903 is below Event-B Agent's 0.941 even though ProGS has higher PDR, because ProGS fixes Γ and does not add auxiliary lemmas; Event-B Agent may add over-restrictive components (§4.5, PDF pp.12–13). Runtime Coverage uses only three traces per system, so correctly modeled but unvisited cases can lower the score (§4.5, PDF p.13). The table values are proportions rather than explicitly stated counts of systems or obligations; the denominators for PDR and RF are the generated proof obligations and requirements, respectively, while Runtime and Trace are based on the three traces per system (§4.2, §4.4, PDF pp.10–11).

Inference: The main product threat for agent-written verified Rust is semantic overfitting: a subtree repair can satisfy local proof obligations while changing intended behavior, just as the paper reports Event-B proof-oriented repairs causing unexpected deadlocks. A second threat is specification error: ProGS verifies the formalized requirements, not whether those requirements capture VeruLaw's user intent. A third is solver incompleteness and nondeterministic LLM repairs. VL should reuse the paper's repair-group and coverage ideas, but should not redo the Event-B benchmark comparison; it should test Rust/Verus transitions, real dependency assumptions, and behavior-preserving repairs.

Inference: For VeruLaw, the practical adaptation is an explicit proof-sketch artifact alongside Rust code. Internal nodes hold case predicates and coverage lemmas; leaves hold transition functions and contracts. A CI loop can run Verus, group diagnostics by invariant and subtree, request a coordinated repair, then rerun structural and leaf obligations. This preserves the paper's essential method while making the Rust-specific translation and trusted boundary visible.

## techniques for the catalog

- environment-model construction: generate typed state, invariants, variants, and validated dependency relations before event synthesis
- hierarchical proof sketches: represent case splits and induction as trees whose leaves become concrete transition events
- structural coverage checking: prove every parent guard is covered by child guards and every child implies its parent
- sketch cleaning and cost selection: normalize trees, score structural quality, and repair the best of three candidates
- subtree-based repair: map failed leaf obligations to a common subtree and repair related events together
- joint evaluation: measure proof discharge, requirement fulfillment, runtime coverage, trace conformance, runtime, and LLM calls
Checked 2026-10-15 against paper wang2026formal: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
