# Heterogeneous Verification of an Autonomous Curiosity Rover
(authored by agents unless marked 🧑)
Tag: `cardoso2020heterogeneous`, [paper](http://arxiv.org/abs/2007.10045v1)

The paper presents a ROS/Gazebo Curiosity-rover simulation with a GWENDOLEN autonomous agent. Its central method is to verify different nodes at different abstraction levels with different formalisms, then use the formal models to drive runtime monitors. The authors state: “This use of heterogeneous verification techniques is essential to provide guarantees about the nodes at different abstraction levels, and allows us to bring together relevant verification evidence to provide overall assurance.” (Abstract, p.1)

## system and assumptions

The mission uses a known topological map with waypoints o, A, B, and C. The rover starts at o, initializes wheels, arm, and mast, and normally follows o→A→B→C→A. A waypoint with high radiation is skipped; arm and mast opening is unsafe in wind. The authors explicitly assume sufficient battery and omit battery modeling (Sect. 2, p.2). The simulation comes from a ROS teaching model with NASA data, runs in Gazebo, and omits some sensors such as MAHLI (Sect. 2, p.2). Three action libraries control wheels, arm, and mast (Sect. 2, p.3). A wheel movement takes direction, speed, and distance, and “After a movement action, the server always calls a stop action that sets the speed of all wheels to zero.” (Sect. 2, p.3)

The GWENDOLEN environment communicates with ROS through rosbridge. The agent uses a BDI model and has four high-level actions: control wheels, move to waypoint, control arm, and control mast (Sect. 2, pp.3–4). The verification architecture is stated directly: “we verify the autonomous agent using the AJPF program model checker; the interface that this agent has with the environment using Dafny; a CSP specification of the action library nodes using FDR4; and we use each of these formal models to guide the generation of runtime monitors.” (Sect. 2, p.4)

## technique 1: model-check the agent with AJPF

What it is. AJPF extends Java PathFinder and checks GWENDOLEN BDI-agent programs with an LTL-based property language. Model checking exhaustively examines the state space; the desired property is written in a logic-based language (Sect. 3, p.5). The paper’s illustrative property, not one of the listed checked formulas, is that “the Curiosity will not move its arm while collecting soil and rock data” (Sect. 3, p.5).

When to use it. Use AJPF for agent-level beliefs, goals, actions, and intentions. The paper warns that the syntax is limited to agent-related properties and that AJPF properties “must be ground (i.e. cannot be parameterised)” (Sect. 3, p.5). It is therefore suitable for the GWENDOLEN decision logic, not the ROS message transport.

Inference: Steps from the paper.

1. Implement the autonomous decision-maker in GWENDOLEN using BDI beliefs, desires, and intentions (Sect. 2, p.3).
2. Express required temporal behavior in AJPF’s LTL-based specification language (Sect. 3, p.5).
3. Run AJPF over the agent program. The paper checks, for example, “✷(Arover move to waypoint (A) → ♦Brover (at (A)))” and analogous formulas for B and C (Sect. 3, p.5).
4. Interpret each formula as: whenever the rover executes the move action, it eventually believes it is at that waypoint (Sect. 3, p.5).

Verus form. Inference: Verus does not model-check GWENDOLEN BDI traces. A Rust implementation can expose a transition function and prove temporal-step obligations with a state-machine specification, `requires`, `ensures`, and loop invariants. Inference: a state machine can represent the rover belief and position; a proof function can show that each permitted move eventually establishes the corresponding postcondition, but liveness over an unbounded scheduler needs an explicit variant or an external progress model. This is an adaptation, not a claim made by the paper.

Evidence and limits. The paper gives three example formulas (it says “some of the properties that we verified”) but no count of explored states, proof time, failed properties, or model coverage. Inference: its evidence is therefore that AJPF accepted those properties for the agent program, which must be ground. Inference: the result excludes behavior absent from the GWENDOLEN agent, ROS/Gazebo implementation mismatches, and parameterized cases.

## technique 2: deductive verification of the agent–environment interface with Dafny

What it is. Dafny supplies preconditions, postconditions, loop invariants, and variants; programs are translated to Boogie and Z3 discharges proof obligations (Sect. 3, p.5). The model focuses on environmental inputs and the actions returned by the agent.

When to use it. Use this technique for functional safety conditions at the boundary where sensor/environment values become agent actions. The paper verifies that no action is returned before all three control modules are initialized, and that wind/radiation values are interpreted correctly.

Inference: Steps from the paper.

1. Model readiness flags `wheelsready`, `armready`, and `mastready`, plus the returned action sequence (Sect. 3, p.5).
2. State the initialization safety postcondition: “ensures (wheelsready && armready && mastready) == false ==> actions ==[];” (Sect. 3, p.5).
3. Provide environment accessors such as `getEnvironment()` and `getWind()` (Sect. 3, p.5).
4. State the environmental classification condition “ensures windspeed < 5 && radiation < 5 ==> e == Fine;” (Sect. 3, p.5).
5. Provide `getRad()`, “a high-level implementation of how the radiation at waypoint B decays over time”, and add a loop invariant in `CuriosityAgent()` that the rover cannot be at waypoint B when the radiation is too high: “invariant !(current == B && env == Radiation);” (Sect. 3, p.6).
6. Run Dafny, Boogie, and Z3 to discharge the generated obligations (Sect. 3, p.5).

Verus form. Inference: Rust/Verus can encode readiness and actions as executable data, use `requires`/`ensures` on functions, and use `invariant` clauses on loops. Inference: the Dafny postcondition maps naturally to an `ensures` clause on a Rust function returning a sequence; the radiation condition maps to a loop invariant. Inference: Verus syntax and types differ, and the paper’s Dafny code cannot be copied directly; the semantic contract can be restated, while the Boogie/Z3 pipeline is replaced by Verus’s verifier.

Evidence and limits. The paper reports verified methods and the stated contracts but no denominator of tests, proof-obligation count, or timing. Inference: the model assumes the environment accessors accurately represent ROS sensors and that readiness flags, which the paper says “are toggled by the associated modules”, are toggled correctly. Inference: a Verus proof would establish only the stated model and its trusted sensor/API contracts unless those implementations are also verified.

## technique 3: CSP/FDR4 verification of action-library communication

What it is. Communicating Sequential Processes models event sequences. The paper constructs one CSP file for each client–server pair and one generic server file from the ROS code (Sect. 3, p.6). FDR4 checks three communication properties: a sent goal starts on the correct server; a sent goal eventually receives a result; and an agent instruction causes readiness followed eventually by a result (Sect. 3, p.6).

When to use it. Use CSP when the risk is protocol ordering and message completion between concurrent client/server nodes, rather than the internal agent decision logic.

Inference: Steps from the paper.

1. Extract program-specific and generic action-library behavior from the ROS implementation (Sect. 3, p.6).
2. Model each arm, mast, and wheels client–server pair as CSP, plus the generic server behavior (Sect. 3, p.6).
3. Encode event sequences with CSP operators; the paper explains `a → b → Skip` as sequential events ending in termination (Sect. 3, p.6).
4. Check the three listed properties in FDR4. The paper’s example is `send goal arm? → executeGoal .arm → SKIP` (as printed), for the property that if the arm client sends a goal then eventually it will receive a result (Sect. 3, p.6).

Verus form. Inference: Verus can represent a protocol state machine and prove that each transition preserves a relation between client state, server state, and pending goals. Inference: `requires` can restrict legal sends, `ensures` can describe the resulting protocol state, and a state-machine invariant can exclude impossible message orders. Inference: Verus proofs do not automatically provide CSP refinement checking; an explicit executable model and correspondence proof are needed.

Evidence and limits. The paper reports the three properties checked but no number of traces, states, or counterexamples. Inference: the model abstracts ROS transport and assumes the CSP extraction faithfully captures the implementation. Inference: it does not cover network faults unless those are modeled.

## technique 4: runtime monitors synthesized from formal models

What it is. Runtime verification checks the current execution against a formal specification. Unlike model checking, it is not exhaustive, but monitors can remain deployed and are efficient (Sect. 3, p.6). ROSMonitoring (ROSMon) inserts monitors into communication gaps between ROS nodes; messages of interest must pass through them, and monitors are automatically synthesized from specifications (Sect. 3, pp.6–7).

When to use it. Use runtime monitoring for assumptions about a live C++/Python system or physical environment that is impractical to verify completely at code level; the paper says that for the C++ or Python implementation “formal verification at code level is not currently feasible/possible” (Sect. 4, p.7). The authors use the Dafny environment model to guide a ROSMon monitor.

Inference: Steps from the paper.

1. Identify a design-time assumption in a formal model, such as the paper’s constraint that wind speed and radiation are always positive (the RML uses `_at_least(0)`) and that the environment is “Fine” when both are less than 5 (Sect. 3, p.7).
2. Express the constraint in Runtime Monitoring Language. The paper gives `Main = (GetEnvironmentConstraints /\ (wind_speed(_) >> wind_speed_at_least(0)*) /\ (radiation_units(_) >> radiation_units_at_least(0)*));` and a partial definition of `GetEnvironmentConstraints` (Sect. 3, p.7).
3. Use ROSMon to synthesize a monitor and bridge the model to the running ROS environment (Sect. 3, p.7).
4. Route the relevant messages through the monitor and check each execution (Sect. 3, p.7).

Verus form. Inference: Verus can prove a monitor’s transition logic against a specification, but it cannot replace observation of external ROS messages or physical sensors. Inference: implement the monitor as verified Rust with a state invariant over observed samples and an `ensures` result that flags violations; retain the ROS transport and sensor assumptions as trusted boundaries.

Evidence and limits. The paper states that monitors check current executions and are not exhaustive. No runtime false-positive/false-negative rate, execution count, or overhead is reported. Inference: a monitor can detect only violations visible in observed messages and cannot establish behavior between samples.

## techniques for the catalog

- AJPF agent model checking — express ground LTL properties over GWENDOLEN beliefs, actions, and intentions and exhaustively check the agent model
- Dafny interface contracts — verify initialization, environmental classification, and loop safety with postconditions and invariants
- CSP/FDR4 protocol checking — model client–server event sequences and check goal routing, completion, and readiness properties
- ROSMon runtime verification — synthesize monitors from formal assumptions and check live ROS messages at deployment
