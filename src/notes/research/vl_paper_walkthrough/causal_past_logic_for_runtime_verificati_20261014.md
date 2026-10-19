# Causal Past Logic for Runtime Verification of Distributed LLM Agent Workflows
(authored by agents unless marked 🧑)
Tag: `bollig2026causalpast`, [paper](https://arxiv.org/abs/2605.20923v2)

## scope and claims
This paper adds Causal Past Logic (CPL) guards to ZipperGen workflows. A guard is evaluated by the lifeline that owns a branch or loop, using only events causally visible there. The paper formalizes message sequence charts (MSCs), CPL satisfaction, local evaluation, latest-value monitor state, event updates, and a monitor-correctness theorem in Lean 4. It explicitly states: “We prove that the monitor used here agrees with the denotational semantics of CPL, implement the construction in ZipperGen (https://zippergen.io), and measure its runtime and metadata costs.” (Contributions, page 2).

The central verified results are Lemma 1 (local evaluator equals CPL semantics), Lemma 2 (monitor-state invariants), and Theorem 1 (monitor correctness), sections 5, pages 11–14. Theorem 1 quantifies over any linear extension of the causal order and every formula in the finite guard set. Lean kernel-checks the formalization without `sorry` or custom axioms (conclusion, page 17). The mechanization states: “Finite-table refinement, executable Boolean evaluation, and the size bounds are outside the mechanization.” (Mechanization, page 2). Inference: the theorem does not establish correctness of those implementation refinements or the size bounds.

## technique 1: model executions as causally ordered message sequence charts

what it is and when to use it
Use an MSC to represent asynchronous communication, including non-FIFO delivery. Definition 1 states: “Message delivery may be non-FIFO.” (page 6). An MSC is a finite event set with local successor edges, message matching, event kinds, lifeline identifiers, and valuations (Definition 1, page 6). Local edges form a linear order per lifeline; message edges are a partial matching; the combined graph is acyclic. The model defines which events are causally visible to the owner.

how to do it
1. Create event set `E`, local relation `→`, message relation `◁`, kind, lifeline map `pid`, and valuation `val` (Definition 1).
2. Require local successor edges to be immediate successors of finite linear orders and require every receive to have one matching send; sends may remain unmatched in transit (page 6).
3. Define causal order as the reflexive transitive closure of local and message edges (page 6); the latest visible event of lifeline B is the maximum B-event below or equal to the current event in that order (page 7).
4. Evaluate branch guards on the owner’s valuation at its choice event. The paper’s code-review example checks candidate identity plus past status conditions on TestRunner and Security (section 2, pages 2–4).

Verus form
Inference: Represent events and lifelines with `struct`/`enum` datatypes and causal edges with specification sequences or finite maps. State acyclicity and local-order properties as `requires`; prove latest-visible uniqueness with `proof fn` lemmas. A Verus state-machine model can connect executable message handling to the abstract MSC. These mappings are not evaluated in the paper.

## technique 2: causal past logic for guards

CPL syntax is atoms, remote formula `@A(φ)`, previous `Yφ`, since `φ1 S φ2`, Boolean connectives, and remote field terms `@A.x` (Definition 2, pages 6–7). `@A(φ)` evaluates at A’s latest causally visible event; `@A.x` reads a field there. `Y` and `S` follow the current lifeline’s local history. An absent remote event makes an atom using its field false and makes its remote formula false. The paper says: “The operator @A(φ) is the causal part: it evaluates φ at the latest visible event of lifeline A.” (section 4, page 7).

Apply it by writing the guard over the owner’s current store and remote latest-visible views. In Listing 1 (page 4), `review_ok` uses `since((Here.status != bad) & not_pending, Here.status == good)` under `At[A]` (line breaks omitted). The merge guard compares remote candidate fields with the owner’s candidate and requires both reviewer episodes to have a valid pass/clear witness. An event atomically sets candidate and pending status to start each episode. Pending prevents an earlier episode from supplying the witness. A later failed or critical status invalidates the corresponding condition until a new passed or cleared status.

Verus form
Inference: Define a recursive `spec fn` for formula satisfaction over an abstract event history, with datatypes for atoms and formulas. Prove recursive evaluator lemmas for `Y`, `S`, and remote lookup. Keep formula evaluation ghost/spec-only; executable guards can use a verified monitor state. The paper does not implement or verify these Verus mappings.

## technique 3: knowledge-vector online monitor

what it is
Each lifeline stores a full vector clock, latest Boolean values for all guard subformulas on each lifeline, selected remote variable values, and a local store (Definition 4, page 8). A temporary `old` table stores previous-local formula values. For a fixed finite formula set Φ, Boolean state is O(|L|·|sub(Φ)|) per lifeline and selected data add O(|L|·|vars(Φ)|) stored values (page 9). The paper adds: “The vector-clock components are unbounded counters.” (page 9).

how to update it
1. On receive, copy each formula/value row only when the incoming clock component for that lifeline is greater, then merge the clocks by componentwise maximum (Algorithm 1, page 10).
2. Save the owner’s previous-local values in `old`.
3. Increment the owner clock and apply the event’s local store effect.
4. Record selected local fields and recursively evaluate every subformula (Algorithm 2, page 11).
5. Store current results as the owner’s latest row and attach clock, formula views, and selected fields to outgoing messages (Algorithm 1, page 10).
6. Evaluate `Y` from `old`, returning false at the first local event. For `@B(θ)`, evaluate θ at the current event if B is the owner; otherwise read the latest B row, returning false if its clock component is zero. Evaluate `S` from `θ2 ∨ (θ1 ∧ previous-S)`, with previous-S false at the first event (Algorithm 2, page 11).

The paper emphasizes causal rather than send-time order: “The prefix processed before an event is therefore causally closed: if an event has been processed, all of its causal predecessors have been processed as well.” (section 5, page 9). The proof uses this fact to show that merged rows describe exactly the latest visible event.

Verus form
Inference: Use executable clocks, formula views, and selected-value views in a Verus monitor, with a ghost event history for its specification. Prove a state invariant after each event: clock components equal visible-event counts, zero components have absent rows, positive components point to the corresponding latest event, and `old` equals the previous local truth value. A `proof fn` for receive merge establishes monotonicity and row freshness; a loop invariant can express the same facts for a message-processing loop.

## evidence, limits, and measurements
Lemma 1 is proved by structural induction over formulas; Lemma 2 is proved by induction over a linear extension of the causal order; Theorem 1 then follows from the invariant (pages 11–14). The implementation is Python in ZipperGen (section 6, pages 14–15). The complete four-lifeline code-review guard has 16 subformulas and one selected variable, takes 0.047 ms local, 0.069 ms send, and 0.072 ms receive per event, and carries 1.2 KB per message (Table 1, page 16). The measurement procedure states: “For each operation, we discard 50 warm-up events and report the median of the mean event times in nine batches of 300.” (page 15). It uses CPython 3.12 and an Intel Core i9-9880H running macOS, with garbage collection disabled during measurement; message size is UTF-8 JSON with KB = 1,000 bytes. Timings exclude message encoding and transmission, runtime-state storage, and application-payload processing (page 15). With 128 atoms on eight lifelines, receive time is 1.448 ms and data 27.3 KB for one variable, rising to 2.903 ms and 58.0 KB for 128 variables (Table 1, page 16). Increasing lifelines from 2 to 32 raises data from 1.1 to 17.0 KB for the 16-atom, four-variable scaling case (page 15).

Generated-workflow tests had three runs per task. All three final remote-field workflows passed validation and returned the expected result for both coin outcomes. All three final temporal workflows passed validation and returned the expected result for all 27 three-update histories. In the third temporal run, the agent corrected a wrong operator name and a wrong placement of `S`. The paper states: “Episode identity is not tested.” (section 6, page 16). Inference: these small generated-workflow tests do not establish reliability on other workflows.

## threat and reuse for VL

Inference: VL could apply CPL guards to merge, deployment, or proof-publication decisions and use Verus to verify a monitor implementation. The paper’s Lean theorem alone does not establish correctness of that implementation, message encoding, or application payload handling. These would need separate justification. Causal visibility also permits a decision before a later failure arrives; Figure 2 explicitly illustrates this behavior (page 5).

Inference: VL should preserve causal metadata with proof-review messages and require guards to compare artifact identity (candidate hash) before accepting test or proof results. Candidate equality can reject evidence for a different artifact; it cannot reveal an update still in transit.

## techniques for the catalog
- MSC causal model — represent asynchronous executions with local order, message edges, valuations, and a partial causal order
- CPL guards — combine previous/since history with latest causally visible remote formulas and fields
- knowledge-vector monitor — propagate vector clocks, latest subformula values, and selected fields on every message
- coherence invariant — relate each clock row and cached value to the exact latest visible event
- structural monitor proof — prove evaluator correctness by formula induction and state invariants by causal-order induction
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The prefix processed before an event is therefore causally closed: if an event has been processed, all of its causal predecessors have been processed as well."): checked every quotation, number, section and page reference, technique step, title, author, year, and arXiv identifier; corrected quotations and page references, completed the owner-side evaluator case and episode-reset description, qualified implementation and reuse claims, and marked Verus proposals as inferences; did not inspect artifacts, rerun experiments, kernel-check Lean, or validate the proposed Verus mappings.
