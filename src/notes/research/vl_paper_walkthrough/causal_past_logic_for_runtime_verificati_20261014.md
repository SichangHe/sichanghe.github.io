# Causal Past Logic for Runtime Verification of Distributed LLM Agent Workflows
(authored by agents unless marked 🧑)
Tag: `bollig2026causalpast`, [paper](http://arxiv.org/abs/2605.20923v2)

## scope and claims
This paper adds Causal Past Logic (CPL) guards to ZipperGen workflows. A guard is evaluated by the lifeline that owns a branch or loop, using only events causally visible there. The paper formalizes message sequence charts (MSCs), CPL satisfaction, local evaluation, latest-value monitor state, event updates, and a monitor-correctness theorem in Lean 4. It explicitly states: “We prove that the monitor used here agrees with the denotational semantics of CPL, implement the construction in ZipperGen … and measure its runtime and metadata costs” (abstract, page 1).

The central verified results are Lemma 1 (local evaluator equals CPL semantics), Lemma 2 (monitor-state invariants), and Theorem 1 (monitor correctness), sections 5, pages 11–14. Theorem 1 quantifies over any linear extension of the causal order and every formula in the finite guard set. Lean kernel-checks the formalization without `sorry` or custom axioms (conclusion, page 17). The mechanization excludes finite-table refinement, executable Boolean evaluation, and size bounds (introduction, page 1), so those remain trusted implementation layers.

## technique 1: model executions as causally ordered message sequence charts

what it is and when to use it
Use an MSC when distributed agents communicate asynchronously and arrival order differs from causal order. An MSC is a finite event set with local successor edges, message matching, event kinds, lifeline identifiers, and valuations (Definition 1, page 6). Local edges form a linear order per lifeline; message edges are a partial matching; the combined graph is acyclic. This model makes “what the owner knows now” precise.

how to do it
1. Create event set `E`, local relation `→`, message relation `◁`, kind, lifeline map `pid`, and valuation `val` (Definition 1).
2. Require local successor edges to be immediate successors of finite linear orders and require every receive to have one matching send; sends may remain unmatched in transit (page 6).
3. Define causal order as the reflexive transitive closure of local and message edges; latest visible event of lifeline B is the maximum B-event below the current event in that order (page 6).
4. Evaluate branch guards on the owner’s valuation at its choice event. The paper’s code-review example checks candidate identity plus past status conditions on TestRunner and Security (section 2, pages 2–4).

Verus form (inference)
Represent events and lifelines with `struct`/`enum` datatypes and causal edges with specification sequences or finite maps. State acyclicity and local-order properties as `requires`; prove latest-visible uniqueness with `proof fn` lemmas. A Verus state-machine model can connect executable message handling to the abstract MSC. These are mappings, not claims by the paper.

## technique 2: causal past logic for guards

CPL syntax is atoms, remote formula `@A(φ)`, previous `Yφ`, since `φ1 S φ2`, Boolean connectives, and remote field terms `@A.x` (Definition 2, page 7). `@A(φ)` evaluates at A’s latest causally visible event; `@A.x` reads a field there. `Y` and `S` follow the current lifeline’s local history. Missing remote events make atoms and remote formulas false. The paper says: “The operator @A(φ) is the causal part: it evaluates φ at the latest visible event of lifeline A.”

Apply it by writing the guard over the owner’s current store and remote latest-visible views. In Listing 1 (page 4), `review_ok` uses `since((status != bad) & not_pending, status == good)`. The merge guard compares remote candidate fields with the owner’s candidate and requires both reviewer episodes to have a valid pass/clear witness. A pending event delimits episodes; a later failure falsifies the since condition until another pass.

Verus form (inference)
Define a recursive `spec fn` for formula satisfaction over an abstract event history, with datatypes for atoms and formulas. Prove recursive evaluator lemmas for `Y`, `S`, and remote lookup. Keep formula evaluation ghost/spec-only; executable guards can use a verified monitor state. Use only the project’s documented Verus constructs (`spec fn`, `proof fn`, `requires`, `ensures`, loop invariants), not unsupported keywords.

## technique 3: knowledge-vector online monitor

what it is
Each lifeline stores a full vector clock, latest Boolean values for all guard subformulas on each lifeline, selected remote variable values, and a local store (Definition 4, page 8). A temporary `old` table stores previous-local formula values. For a fixed finite formula set Φ, Boolean state is O(|L|·|sub(Φ)|) per lifeline and selected data add O(|L|·|vars(Φ)|) (page 8).

how to update it
1. On receive, merge each incoming clock row by componentwise maximum; copy a remote formula/value row only when the incoming clock is ahead (Algorithm 1, page 10).
2. Save the owner’s previous-local values in `old`.
3. Increment the owner clock and apply the event’s local store effect.
4. Record selected local fields and recursively evaluate every subformula (Algorithm 2, page 11).
5. Store current results as the owner’s latest row and attach clock, formula views, and selected fields to outgoing messages (Algorithm 1, page 10).
6. Evaluate `Y` from `old`, `@B` from the latest row (false if clock component is zero), and `S` from the recurrence `θ2 ∨ (θ1 ∧ previous-S)` (Algorithm 2, page 11).

The paper emphasizes causal rather than send-time order: “The prefix processed before an event is therefore causally closed” (section 5, page 9). The proof uses this fact to show that merged rows describe exactly the latest visible event.

Verus form (inference)
Use a Verus `struct Monitor` with ghost maps for clocks and views plus executable fields for selected values. Prove a state invariant after each event: clock components equal visible-event counts, zero components have absent rows, positive components point to the corresponding latest event, and `old` equals the previous local truth value. A `proof fn` for receive merge establishes monotonicity and row freshness; a loop invariant can express the same facts for a message-processing loop.

## evidence, limits, and measurements
Lemma 1 is proved by structural induction over formulas; Lemma 2 is proved by induction over a linear extension of the causal order; Theorem 1 then follows from the invariant (pages 11–14). The implementation is Python in ZipperGen. The complete four-lifeline code-review guard has 16 subformulas and one selected variable, takes 0.047 ms local, 0.069 ms send, and 0.072 ms receive per event, and carries 1.2 KB per message (Table 1, page 16). Measurements are medians of means from nine batches of 300 after 50 warmups, on CPython 3.12 and an Intel Core i9-9880H; message size is UTF-8 JSON with KB = 1,000 bytes (page 15). With 128 atoms on eight lifelines, receive time is 1.448 ms and data 27.3 KB for one variable, rising to 2.903 ms and 58.0 KB for 128 variables (Table 1, page 16). Increasing lifelines from 2 to 32 raises data from 1.1 to 17.0 KB for the 16-atom, four-variable scaling case (page 15).

Generated-workflow tests had three runs per task. Remote-field access succeeded for both coin outcomes. A temporal task covered all 27 three-update histories after the agent corrected a wrong operator name and a wrong placement of `S`; episode identity was not tested (section 6, page 17). These denominators and omissions limit the evidence.

## threat and reuse for VL

Inference: CPL is a runtime monitor, so it detects violations only at observed decision points and does not prove Rust code correct. For VL, it can guard agent workflow actions such as merge, deployment, or proof publication using causal evidence, while Verus proves the implementation and monitor invariants. The paper’s untrusted layers—finite-table refinement, executable evaluator, message encoding, and application payload semantics—are direct integration risks.

Inference: VL should preserve causal metadata with proof-review messages and require guards to compare artifact identity (candidate hash) before accepting test or proof results. The paper’s candidate equality is a concrete pattern for preventing stale evidence from authorizing a new artifact.

## techniques for the catalog
- MSC causal model — represent asynchronous executions with local order, message edges, valuations, and a partial causal order
- CPL guards — combine previous/since history with latest causally visible remote formulas and fields
- knowledge-vector monitor — propagate vector clocks, latest subformula values, and selected fields on every message
- coherence invariant — relate each clock row and cached value to the exact latest visible event
- structural monitor proof — prove evaluator correctness by formula induction and state invariants by causal-order induction
Checked 2026-10-14 against the paper by a Codex agent: audit record bollig2026causalpast; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
