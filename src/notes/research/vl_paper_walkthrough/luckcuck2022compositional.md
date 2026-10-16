# A Compositional Approach to Verifying Modular Robotic Systems
(authored by agents unless marked 🧑)
Tag: `luckcuck2022compositional`, [paper](http://arxiv.org/abs/2208.05507v4)

## takeaway

The paper's method is a contract pipeline for ROS systems. A user abstracts a ROS graph, writes one first-order assume/guarantee contract per node in the ROS Contract Language (RCL), composes those contracts with four inference rules, verifies each node with whatever suitable method exists, and generates runtime monitors from the guarantees. The composition step exposes a system-level property; static node verification and runtime monitoring provide two independent checks.

"Our verification approach begins with a manual analysis of the ROS program, to abstract it into a more manageable system model." (§3, p. 6)

Inference: the paper is a methodology and prototype evaluation around one simulated rover, not a proof of a general ROS verifier. It reports no aggregate verification-success percentage or statistical test; its concrete evidence is the case-study model, contracts, generated monitors, and a publicly linked artifact.

## technique 1: build a tractable system model from the ROS graph

What it is. Treat each ROS node as a contract-bearing component, but reduce a large graph to nodes relevant to the properties being verified. The authors use `rqt graph`, remove reliable or irrelevant nodes, merge related nodes into compound nodes, and add external components that do not appear in the ROS graph (§3.1, pp. 7–8).

How to do it.
1. Generate the ROS graph with `rqt graph`; keep it unchanged if it is already small (§3.1, p. 7).
2. Remove library nodes demonstrated reliable in the relevant context and nodes with no impact on selected properties (§3.1, p. 7).
3. Merge related nodes into a compound node, preserving all information needed for verification and matching the original implementation (§3.1, p. 7).
4. Add external nodes, such as autonomous agents or machine-learning image processing, with descriptions of their communication (§3.1, p. 7).
5. Check that the abstraction still resembles the implementation; revisit it if verification reveals a troublesome abstraction (§3, p. 7).

Evidence and assumptions. The paper says the model must retain verification-relevant information (§3.1, p. 8). Inference: removing a node is a trust assumption about that node's behavior, so the resulting system property is conditional on the removal being justified. The authors do not quantify abstraction error.

Verus form. Inference: represent each retained component as a Rust module with a public contract; represent a compound node as a wrapper whose `requires`/`ensures` expose the composed behavior. Use ghost state for message streams and explicit specs for omitted or external components. The abstraction is a modeling choice, not a Verus construct, and omitted code remains trusted.

## technique 2: write stream-aware first-order assume/guarantee contracts

What it is. A node contract has an assumption `A(i)` over input variables and a guarantee `G(o)` over outputs. Inputs and outputs are vectors. A stream is represented as `[e | Tail]`; consuming one input eventually prepends one output. The contract uses first-order logic (FOL), set theory, quantifiers, and the temporal eventuality operator `♢`.

"Each contract states that if a node consumes input data i from its input stream (InStream([i | S])) and A(i) holds (i.e., i satisfies the assumption/pre-condition for correct operation of the node) then eventually the node will place some data, o on its output stream that satisfies the node’s guarantee." (§3.2, p. 8)

The formal shape is:

`(InStream([i | S]) ∧ A(i) ∧ OutStream(T)) ⇒ ♢(InStream(S) ∧ G(o) ∧ OutStream([o | T]))`.

How to do it.
1. Define input and output types and stream variables (§3.2, p. 8).
2. State assumptions and guarantees as FOL formulas over those variables (§3.2, p. 8).
3. Use `♢` when internal computation and exact timing are intentionally abstracted; refine it later if real-time bounds matter (§3.2, p. 8).
4. Decide end-of-stream behavior (terminate, suspend, exception handling, or another behavior) (§3.2, p. 8).
5. Record the simplifying one-input/at-most-one-output assumption, or generalize with compound elements or subcontracts when a node consumes multiple values (§3.2, p. 8).

Verus form. Inference: model a stream as `Seq<T>` or an inductive ghost queue and state a function contract that removes the head and eventually appends an output. A deterministic Verus function can prove the data relation, but `eventually` and arbitrary scheduling need a transition-system or environment model. Encode temporal progress as a ghost step relation and prove a liveness theorem separately; do not represent `♢` as an ordinary postcondition without a progress assumption.

Evidence and limits. The paper explicitly says it does not specify global behavior of concurrent streams and assumes one input consumed at a time for clarity (§3.2, pp. 8–9). Inference: races, message loss, queue bounds, and timing are outside the core contract unless added as extra assumptions. There is no runtime experiment establishing that these assumptions hold in general ROS deployments.

## technique 3: encode contracts in RCL and map ROS messages to logical variables

What it is. RCL is a machine-readable DSL containing context/type declarations, node inputs and outputs, topic links, assumptions, and guarantees. Vanda parses RCL and later extracts guarantees for monitor synthesis. The paper gives an EBNF grammar in Table 1 (p. 10).

How to do it.
1. Declare a `context` with built-in or custom types and constants (§3.3, p. 10).
2. For each node, list typed `inputs`, `outputs`, and ROS `topics`; add zero or more `assume` clauses and one or more `guarantee` clauses (Table 1, p. 10).
3. Link each RCL variable to a topic field with `matches` (§3.3, p. 10).
4. Map ROS messages using the Scalar rule for a scalar, Collection for a set/sequence/tuple of constants, and Function for function-valued variables (§3.3, pp. 10–11).
5. Let Vanda parse, extract the node name/topics/guarantees into a `Contract` object, and translate FOL to the monitor language (§3.3, p. 11).

The Collection rule handles a string such as `stop` or `go` by mapping it to a declared finite RCL set; the developer decides what to do when a ROS value is outside that set (§3.3, p. 10). The Function rule maps message fields to function parameters by type and position, ignoring unmatched fields (§3.3, p. 10).

Verus form. Inference: replace RCL with Rust structs and spec functions, then expose message-to-variable mappings as verified conversion functions with `ensures` clauses. A finite Collection maps naturally to an enum; a Function mapping needs explicit length/type lemmas. Parsing and topic binding remain outside Verus and should be treated as trusted integration code or separately verified.

## technique 4: compose node contracts with R1–R4

What it is. The calculus derives system-level assumptions and guarantees from node-level FOL contracts. R1 handles a linear sequence, R2 a branching output, R3 a merging input, and R4 a loop built from R1–R3. The authors omit soundness proofs but require each node to be independently verified against its own contract (§3.4, pp. 11–13).

R1 sequential composition. For nodes `1` through `n`, connect `o1 = i2`, ..., `o(n−1) = in`; prove each intermediate guarantee entails the next assumption (`G1(o1) ⇒ A2(i2)`, etc.); conclude `A1(i1) ⇒ ♢Gn(on)` (§3.4, p. 11).

R2 branching. Set the root output equal to the union of leaf inputs, and show the root guarantee entails every leaf assumption. The conclusion gives the conjunction of all leaf eventual guarantees (§3.4, p. 12).

R3 merging. Set the merge-node input to the union of upstream outputs and show every upstream guarantee entails the merge assumption. The paper assumes outputs persist under `♢` so all inputs can be available together (§3.4, p. 12).

R4 looping. Apply R1, R2, and R3 to the illustrated loop, then simplify the three derived judgments into a root-to-exit property. The paper says fixed-point reasoning or generic loop invariants are future work (§3.4, p. 12).

How to apply the calculus.
1. Write each node's `A` and `G` and verify the node implementation separately (§3.4, p. 13).
2. Draw the data-flow architecture and instantiate R1, R2, R3, or R4 according to its shape (§3.4, pp. 11–12).
3. Check all interface equalities, unions, subset relations, and entailments between guarantees and downstream assumptions (§3.4, pp. 11–12).
4. Check the simplifying assumptions: no circular contract dependencies, persistence for R3, and termination for R4 (§3.4, pp. 12–13).
5. Revisit contracts when the calculus finds a malformed or too-restrictive specification (§3, p. 7).

"Our inference rules describe how node contracts should be interpreted when multiple nodes are combined in various ways." (§3.4, p. 13)

Verus form. Inference: encode each node contract as a Rust function or trait contract; use lemma functions to prove `G1 ⇒ A2` and analogous entailments. For R1, a wrapper's postcondition can call the first node's postcondition lemma before invoking the second. For R2/R3, represent unions and persistent outputs with `Seq`, `Set`, or map predicates and prove inclusion/availability lemmas. For R4, use a loop `invariant` and a termination measure; the paper's `♢` and fixed-point reasoning require an explicit transition model. Verus cannot infer the topology or generate the calculus rules automatically.

Evidence and limits. The paper calls the rules “simple and therefore transparently sound” but explicitly omits soundness proofs (§3.4, p. 13). Inference: the claimed system property is only as strong as the node proofs and the entailment checks; a vacuous implication can pass if assumptions are never established. The authors state the calculus is currently applied manually and future automation may use a first-order prover such as Vampire (§3.4, p. 13).

## technique 5: guide heterogeneous verification with one reusable contract

What it is. Each node may use a different verifier: model checking for an agent, tests for a neural network, or stronger formal verification for safety-critical nodes. The same high-level contract is a target for all methods.

"Crucially, our approach enables a system to be verified using a range of verification techniques without needing to decide beforehand which techniques will be used." (§3.5, p. 13)

How to do it.
1. Write a node-level contract before choosing a verifier (§3.5, p. 13).
2. Select a method suitable for that node and check as much of its FOL guarantee as that method supports (§3.5, p. 13).
3. Refine the high-level contract with concrete properties such as valid map points, deadlock freedom, or plan optimality (§3.5, p. 13).
4. Feed the verified contract back into the R1–R4 composition proof (§3.4–§3.5).

Verus form. Inference: use Verus for Rust nodes where executable behavior and safety properties fit its supported subset; keep model-checked, neural, or external nodes behind explicit contracts. A Rust proof of one node does not prove an unverified node or the ROS transport, so the system theorem must list those assumptions.

Evidence and limits. The paper observes that a formal link from FOL to an implementation can be difficult or impossible (§3.5, p. 13). Inference: “guided verification” is a specification-reuse strategy, not evidence that each heterogeneous method is sound with respect to FOL. The denominator is one contract per modeled node in the case study; no cross-domain success rate is reported.

## technique 6: synthesize runtime monitors as a safety net

What it is. Vanda converts RCL guarantees into Runtime Monitoring Language (RML) specifications, and ROSMonitoring runs distributed publish/subscribe monitors over ROS topics. A monitor compares an execution trace with the contract and reports a violation.

"Each monitor compares a trace of events produced by the system, with a formal model of the intended behaviour." (§3.6, p. 14)

How to do it.
1. Parse RCL, extract guarantees, and generate a ROSMonitoring configuration containing topic names and message types (§3.3, p. 11; §3.6, p. 15).
2. Instrument missing events or representation conversions so the deployed trace contains every event needed by the abstract contract (§3.6, p. 16).
3. Translate each atomic FOL guarantee to an RML event type; translate conjunction/disjunction with RML intersection/union, equality to an event-field match, existential quantification to a parameterised term, and `G(g)` to a repeated term (§3.6, pp. 15–16, Figure 4).
4. Generate one or more monitors; each subscribes to relevant topics and publishes a violation message (§3.6, p. 14).
5. Monitor guarantees by default. Do not duplicate connected-node assumptions already entailed by upstream guarantees; add explicit assumption monitors for environmental inputs when diagnosis requires them (§3.6, pp. 15–16).

The paper's RML term language includes event types, concatenation, intersection, union, variable binding, repetition, and negation (§3.6, pp. 15–16). The current implementation translates guarantees only, because monitoring assumptions that are already compositionally implied would add overhead (§3.6, p. 16).

Verus form. Inference: a Verus-verified Rust monitor can prove that its parser and event predicate implement the RCL-to-RML mapping for a finite specification. Runtime observation is still incomplete: a passing monitor proves only that observed topic traces satisfy the checked guarantees. Topic delivery, instrumentation, monitor scheduling, and unobserved services remain assumptions. Verus `ensures` can state a predicate over each event; a separate ghost trace invariant can establish repeated checking.

Evidence and limits. The paper states that a guarantee violation can still be caused by an unmet environmental assumption and suggests richer verdicts as future work (§3.6, p. 15). ROSMonitoring 1.0 observes topics only, so services and actions are unsupported in this implementation (§3.6, p. 14). Inference: monitor coverage is bounded by visible topics and correct instrumentation; no false-negative or overhead denominator is reported.

## case study evidence: remote inspection rover

The case study is a Jackal rover in a 3D Gazebo simulation inspecting 12 waypoints in a simulated nuclear-waste store (§4, p. 17). The model has four abstracted nodes: Localisation, Navigation, Agent, and Radiation Sensor (§4.1, pp. 18–20). Requirements include inspecting every waypoint unless radiation is red, abandoning the mission on high radiation, and eventually inspecting all waypoints or terminating in failure (§4, p. 17).

The workflow applies Steps 1–4b: abstraction, RCL contracts, manual calculus, heterogeneous node verification, and automatic monitor synthesis (§3, pp. 6–7; §4, pp. 17–20). The paper provides simulation, contracts, and verification assets through Zenodo (§4, p. 17). It does not report a count of generated monitor events, proof obligations, runtime overhead, detected faults, or repeated trials. Inference: the case study demonstrates feasibility and traceability, not statistical effectiveness or completeness.

## what is proved, measured, and trusted

- proved or derived
  - node-level guarantees are composed by R1–R4 when their entailment and structural assumptions hold (§3.4, pp. 11–13)
  - an independently verified node plus valid composition implies the selected system-level property (§3, p. 7)
  - generated monitors check observed guarantees at runtime (§3.6, pp. 14–16)
- measured
  - one remote-inspection simulation with 12 waypoints (§4, p. 17)
  - no denominator for success, faults found, monitor overhead, or verifier coverage is given
- trusted
  - each node's implementation proof or testing method
  - RCL parsing, topic-to-variable mappings, instrumentation, ROS transport, and monitor execution
  - assumptions about termination, output persistence, non-circular contracts, and environmental inputs (§3.2, §3.4)
  - omitted or merged nodes in the abstract model

## contradictions and product implications

Inference: the paper's introduction says the approach combines static and dynamic verification, while §3.6 limits ROSMonitoring 1.0 to topics and leaves services/actions to future work; these statements are compatible because the claimed dynamic coverage is for the supported topic interface. The calculus is described as transparently sound, but its soundness proofs are omitted (§3.4, p. 13), so readers must not treat that phrase as a formal theorem in this paper.

Inference: VL should not redo generic assume/guarantee composition, RCL parsing, or the published rover demonstration. A product-relevant extension is a Verus-backed contract adapter for Rust nodes, with explicit proof obligations for topic serialization, stream ownership, and environment assumptions. The threat to a product of agent-written verified Rust is high at system boundaries: per-node proofs can coexist with wrong contracts, omitted nodes, unobserved services, and monitor-blind environmental failures. The method lowers that risk by making assumptions and guarantees reviewable, but it does not establish that the contract expresses the real mission requirement.

## techniques for the catalog

- ROS graph abstraction — remove reliable/irrelevant nodes, merge related nodes, add external nodes, and preserve verification-relevant behavior
- stream FOL contracts — specify input/output streams with assumptions, guarantees, and eventuality
- RCL contract DSL — encode typed node interfaces, topic links, assumptions, and guarantees for tooling
- contract composition R1–R4 — derive sequence, branch, merge, and loop properties from guarantee-to-assumption entailments
- heterogeneous verification guidance — reuse one high-level contract across model checking, testing, neural-network analysis, and formal proofs
- RCL-to-RML monitor synthesis — translate guarantees into event predicates and deploy ROS topic monitors
- guarantee-only monitoring — avoid duplicate checks for internally entailed assumptions and add environmental assumption monitors when diagnosis needs them
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
