# VMDV: A 3D Visualization Tool for Modeling, Demonstration, and Verification
(authored by agents unless marked 🧑)

Tag: `liu2017vmdv`, [paper](http://arxiv.org/abs/1702.04478v1)

## problem and result

VMDV (Visualization for Modeling, Demonstration, and Verification) is a standalone 3D viewer for proof trees, model-checking structures, and dynamically changing verification procedures. The paper starts from a practical limitation: theorem provers usually emit text, while proof trees and counterexamples can contain many nodes and change during search. VMDV renders the graph in 3D, keeps detailed labels on demand, supports zooming, rotation, selection, search highlighting, subtree focus, and plug-in operations, and exchanges updates with a proof engine over TCP sockets.

The abstract says: “The output of an automated theorem prover is usually presented by using a text format, they are often too heavy to be understood.” (Abstract, PDF p. 1.) The authors demonstrate VMDV with SCTL, a sequent calculus for CTL over Kripke models, and with a small Coq proof. The paper reports no controlled user study, proof-speed measurement, or accuracy denominator. Its evidence is an implemented interface and qualitative examples in figures.

## technique 1: decouple proof engines from visualization with a message protocol

Use this when several proof systems should share one inspection interface, or when the viewer must run independently of the prover's language and machine. VMDV does not know the prover's algorithm; the prover does not know the renderer's layout.

Steps from Sec. 3.1 (PDF pp. 6–7):

1. Implement the proof engine so it emits graph-update data for created, deleted, or changed nodes and edges.
2. Implement VMDV as a standalone Java program using JOGL/OpenGL for rendering.
3. Let VMDV send visualization messages requesting information about the current formula, hypotheses, subformulas, or related model state.
4. Let the proof engine reply with graph-update messages containing the requested details and current structure.
5. Wrap both control and data messages in TCP packets. This permits different programming languages and computers on a network.
6. Allow several concurrent outputs so proof trees and auxiliary structures, such as Kripke models, can be visualized together.

The interface boundary is explicit: “The proof system simply sends output information to the VMDV, and gets the manipulation feedbacks from it.” (Sec. 3.1, PDF p. 6.) VMDV is compared to a web browser and a proof engine to a web server; the analogy describes the protocol separation, not a security guarantee.

Verus form (Inference): define a Rust message enum for control requests and graph updates, with serialized fields for node identifiers, labels, and edge operations. Inference: use `requires` to constrain identifiers and operation order, and `ensures` to state that applying an update preserves graph well-formedness. Inference: a Verus-verified receiver can reject dangling edges or duplicate node IDs before rendering. TCP framing, Java/JOGL, and the prover remain external trusted components unless separately specified. The paper's protocol is a visualization transport, not a proof-carrying format.

## technique 2: represent proof and model structure in navigable 3D views

Use this when a textual or 2D proof graph is too large to inspect. VMDV shows a global view of topology and a local view of selected node details. Nodes are 3D spheres and edges are lines; labels appear in the detail panel or on the 3D graph. Users can zoom in for labels, rotate to expose subtrees, and zoom out to recover global shape.

Steps from Sec. 1 and Sec. 3.2 (PDF pp. 2 and 7–8):

1. Encode each proof/model node as a 3D point with a label and each relation as an edge.
2. Render the overall graph in a main panel and selected-node details in a lower panel.
3. Provide zoom and rotation to change the viewport and inspect different angles.
4. Let a user select a node, its descendants, or a subtree; hide unrelated nodes when focusing.
5. Search formulas or labels and highlight every matching node or proof pattern.
6. Reset the root to restore the complete graph after a focused inspection.

The paper's design claim is: “VMDV allows the observation either from a global perspective or a local one.” (Sec. 1, PDF p. 2.) It argues that 3D uses space more efficiently than 2D for large graphs, but gives no quantitative threshold or human-performance measurement.

Verus form (Inference): retain a typed graph and view state (root, hidden set, highlighted set) in Rust. Inference: specify a `spec fn visible` that includes exactly nodes reachable from the focus root minus hidden nodes, and use `ensures` on selection operations to preserve graph identity. Inference: verification should concern the mapping from proof data to displayed data, not whether a visual layout makes a proof understandable; the latter needs a user study. A verified view can prevent omission of nodes, but cannot prove that a user interpreted a color or 3D perspective correctly.

## technique 3: use force-directed automatic layout in three dimensions

Use this when proof nodes are created or deleted during search and a fixed hand-authored layout would become stale. VMDV modifies ForceAtlas2: nodes repel one another like magnets, while edges attract their endpoints like springs. The simulation moves nodes until the graph reaches a balanced state.

Steps from Sec. 3.3 (PDF p. 8):

1. Assign each node a 3D position and each edge an attraction relation.
2. Compute repulsive forces between nodes and attractive forces along edges.
3. Set every node's degree parameter to a constant one, rather than the number of incident edges, because clustering is not VMDV's main concern.
4. Integrate the forces continuously and homogeneously until movement stabilizes.
5. Re-run the simulation after graph updates so newly created, deleted, or hidden nodes settle into the same space.

The paper characterizes the method: “ForceAtlas2 is a force-directed algorithm that simulates a physical system, where nodes repulse each other like magnets while edges attract the nodes they connect like springs.” (Sec. 3.3, PDF p. 8.) The authors choose continuity and homogeneity over OpenOrd's non-continuous and Yifan Hu's semi-continuous algorithms.

Verus form (Inference): model positions and force updates as fixed-point or rational arithmetic if deterministic replay matters. Inference: prove local invariants such as finite coordinates and preservation of node identity with `invariant` clauses around an update loop. Inference: a force simulation's aesthetic convergence is not a proof obligation in ordinary Verus; specify a bounded iteration count or a termination measure if the executable must guarantee completion. Floating-point stability and perceptual quality remain outside the paper's evidence.

## technique 4: visualize verification procedures together with auxiliary models

Use this when a proof tree's meaning depends on a changing state model, such as a Kripke structure. VMDV accepts multiple synchronized outputs and highlights corresponding proof and model elements.

The SCTL case study (Sec. 4.1, PDF pp. 9–11) uses a river-crossing puzzle. A state has four Boolean variables—farmer, wolf, goat, cabbage—and transitions represent assignments. The property is an EU formula asking for a path from the all-false state S0 to the all-true state S. During proof search, each EU-R2 rule application unfolds one model transition; EU-R1 closes the path when the target condition is reached.

Steps:

1. Encode the transition system as a Kripke model and the desired reachability property as an SCTL EU formula.
2. Stream each newly created proof node and each explored model state to VMDV.
3. Add both structures to the 3D scene as separate but linked graphs.
4. Highlight EU-formula nodes in the proof tree; VMDV highlights the corresponding state path in the model.
5. For complex AG proofs, focus on one subtree and inspect its related state transitions before returning to the global view.

The paper reports the interaction: “This way, when we highlight all the nodes with EU -formulas in the proof search tree, a state path in the Kripke model is also highlighted, certifying this proof.” (Sec. 4.1, PDF p. 10.) “Certifying” here means visual correspondence in the example; it is not an independently checked certificate.

Verus form (Inference): represent proof nodes and model states with shared stable IDs and specify a relation connecting an EU proof step to one transition. Inference: a checker can use `ensures` to guarantee that every highlighted model edge corresponds to a proof edge and that the endpoint states satisfy the stated predicates. Inference: Verus can prove the correspondence relation but cannot establish that 3D highlighting was rendered or perceived correctly. The SCTL rules and model semantics would need their own formalization.

## technique 5: support interactive proof scripts through goal-tree updates

Use this when a prover such as Coq creates subgoals interactively. Treat each proof goal as a node and its generated subgoals as children. A leaf is a goal with no remaining subgoals. Adapt an existing Coq XML interface (coqide or Proof General) rather than building a new IDE, then translate protocol events into VMDV TCP packets.

The Coq example in Sec. 4.2 (PDF pp. 11–12) proves `∀ A B C : Prop, (A → (B → C)) → ((A → B) → (A → C))` with `intros`, `apply`, and `assumption`. The paper counts seven proof-script steps and therefore seven edges in the displayed proof tree. It recommends wrapping existing coqtop interfaces because this avoids basic I/O work.

Steps:

1. Receive a goal-state update from Coq.
2. Create a node for the current goal and child nodes for newly opened subgoals.
3. Mark a node as a leaf when the goal has no subgoal.
4. Translate the interface event into a VMDV graph update and send it over TCP.
5. Use focus and rotation to inspect the current branch while retaining the global tree.

The paper states: “Each step of the proof script introduces new proof goals based on the current proof goal.” (Sec. 4.2, PDF p. 11.) The proposed Coq interface was under development; no completed integration or user evaluation is reported.

Verus form (Inference): a proof-goal tree can be represented as a ghost or executable tree with a `spec fn` stating that child goals are generated by the tactic applied to the parent. Inference: a `proof fn` can verify that a closed leaf satisfies the theorem contract, while `invariant` maintains that open goals partition the remaining proof obligations. Inference: translating Coq XML into Rust updates is an adapter task; the Coq kernel remains the trusted proof checker unless its proof objects are independently verified.

## evidence, trust boundary, and relevance to VL

VMDV demonstrates a useful inspection workflow, but the paper reports no user-study sample, latency, graph-size benchmark, layout-quality metric, or proof-error detection rate. The proof engine, graph-update messages, TCP transport, Java/JOGL renderer, force simulation, and user's interpretation are trusted. The visualization can expose topology, search progress, and correspondence between structures; it does not establish that the displayed proof is valid. The SCTL and Coq examples show feasibility, not general effectiveness.

Inference: for VeruLaw, VMDV's highest-value transfer is a verification-debugging interface: display a Verus proof obligation graph, the current invariant/lemma dependencies, and the failing solver branch, with synchronized source locations. Inference: stable graph-update messages could let an agent stream proof attempts while a small verified receiver checks that nodes and edges refer to real obligations. Inference: focus, search, and ancestor highlighting map directly to finding which contract or lemma blocks an agent-generated Rust proof. Inference: a visual layer should remain downstream of a machine-checkable certificate; it can explain rejection but must not turn visual plausibility into acceptance.

Inference: VL should not redo force-directed layout or generic 3D proof-tree rendering as formal-verification research. A worthwhile new experiment would measure repair time and error localization for Verus users with and without synchronized obligation views, reporting task counts and failure denominators. The paper's protocol architecture could be reused, but its qualitative claims do not establish a product threat by themselves. The direct threat is low; the indirect risk is that users trust a compelling rendering of an invalid or incomplete proof unless the viewer clearly binds every displayed node to checker output.

## techniques for the catalog

- prover-viewer protocol — decouple proof engines and visualization through control and graph-update messages over TCP
- navigable 3D proof graphs — expose global topology and local labels with zoom, rotation, selection, search, and focus
- force-directed layout — place dynamic proof nodes with repulsive and attractive 3D forces
- synchronized model views — link proof-tree nodes to corresponding Kripke states and transitions
- interactive goal trees — visualize Coq or similar proof-script subgoals as dynamically updated parent-child graphs

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
