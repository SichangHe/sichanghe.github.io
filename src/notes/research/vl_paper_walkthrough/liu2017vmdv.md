# VMDV: A 3D Visualization Tool for Modeling, Demonstration, and Verification
(authored by agents unless marked 🧑)

Tag: `liu2017vmdv`, [paper](http://arxiv.org/abs/1702.04478v1)

## problem and result

VMDV (Visualization for Modeling, Demonstration, and Verification) is a standalone 3D viewer for proof trees, model-checking structures, and dynamically changing verification procedures. The paper starts from a practical limitation: theorem provers usually emit text, while proof trees and counterexamples can contain many nodes and change during search. VMDV renders the graph in 3D, keeps detailed labels on demand, supports zooming, rotation, selection, search highlighting, subtree focus, and plug-in operations, and exchanges updates with a proof engine over TCP sockets.

The abstract says: “The output of an automated theorem prover is usually presented by using a text format, they are often too heavy to be understood.” (Abstract, PDF p. 1.) The authors demonstrate VMDV with SCTL, a sequent calculus for CTL over Kripke models, and with a small Coq proof. The paper reports no controlled user study, proof-speed measurement, or accuracy denominator. Its evidence is an implemented interface and qualitative examples in figures. The related-work paragraph asserts that 2D layouts become confusing with hundreds of nodes while 3D can show thousands clearly (Sec. 1, PDF p. 3); no measurement supports this.

## technique 1: decouple proof engines from visualization with a message protocol

Use this when several proof systems should share one inspection interface, or when the viewer must run independently of the prover's language and machine. VMDV does not know the prover's algorithm; the prover does not know the renderer's layout.

Steps assembled from Sec. 3.1 (PDF pp. 5–6); the paper gives the architecture in prose, not as numbered steps:

1. Implement the proof engine so it sends its output to VMDV as data messages (the paper calls them Graph Update Messages). Sec. 1 notes that nodes may be created or deleted during proving, so the engine must be able to report such changes.
2. Implement VMDV as a standalone Java program using JOGL/OpenGL for rendering.
3. Let VMDV send Visualization Messages, which are control messages that request information about the current formula, such as its hypothesis, sub-formulae, or other specific information (for example the related state in an SCTL formula).
4. Let the proof engine reply with Graph Update Messages, which are data messages that respond to the control messages.
5. Wrap both control and data messages in TCP packets. The paper says this lets VMDV communicate with proof systems implemented in different programming languages, or run on different computers in networks.
6. Allow multiple outputs, so that several structures, such as proof trees and Kripke models in SCTL, can be visualized together.

The interface boundary is explicit: “The proof system simply sends output information to the VMDV, and gets the manipulation feedbacks from it.” (Sec. 3.1, PDF p. 6.) The paper compares the VMDV-prover relationship to that of a web browser and a web server; Inference: the analogy describes the protocol separation, not a security guarantee.

Verus form (Inference): define a Rust message enum for control requests and graph updates, with serialized fields for node identifiers, labels, and edge operations. Inference: use `requires` to constrain identifiers and operation order, and `ensures` to state that applying an update preserves graph well-formedness. Inference: a Verus-verified receiver can reject dangling edges or duplicate node IDs before rendering. TCP framing, Java/JOGL, and the prover remain external trusted components unless separately specified. The paper's protocol is a visualization transport, not a proof-carrying format.

## technique 2: represent proof and model structure in navigable 3D views

Use this when a textual or 2D proof graph is too large to inspect. VMDV shows a global view of topology and a local view of selected node details. Data points are encoded as 3D solid spheres and structure as lines between spheres (Sec. 2.1, PDF p. 4). The paper describes zooming in to see details, rotating the tree to locate a subtree of interest, and zooming out to capture the overall shape (Sec. 3.2, PDF p. 7).

Steps assembled from Sec. 1 and Sec. 3.2 (PDF pp. 2–3 and 6–9); the paper describes operations, not an ordered procedure:

1. Encode each proof/model node as a 3D point with a label and each relation as an edge.
2. Render the overall structure in a main panel on top and the details of selected nodes in a panel at the bottom (Fig. 4).
3. Provide zoom and rotation to change the viewport and inspect different angles.
4. Let a user select a node and its children, or a subtree (Fig. 6a, 6b). Focusing on a subtree is done by changing the root node, and nodes not related to it are hidden.
5. Highlight by manual mouse selection or by automatic selection via formula search; Fig. 6 also shows highlighting of a node's ancestors and of similar proof patterns. Footnote 5 defines two formulas as having a similar pattern if the first rules applied in their two bottom-up proofs are the same.
6. Provide a reset operation to recover the entire tree after a focused inspection.
7. Provide plug-in operations, loaded dynamically and triggered from a right-click pop-up menu, for proof-system-specific actions such as controlling the construction of the SCTL proof tree and Kripke model (Fig. 7).

The paper's design claim is: “VMDV allows the observation either from a global perspective or a local one.” (Sec. 1, PDF p. 2.) It argues that 3D uses space more efficiently than 2D for large graphs, but gives no quantitative threshold or human-performance measurement.

Verus form (Inference): retain a typed graph and view state (root, hidden set, highlighted set) in Rust. Inference: specify a `spec fn visible` that includes exactly nodes reachable from the focus root minus hidden nodes, and use `ensures` on selection operations to preserve graph identity. Inference: verification should concern the mapping from proof data to displayed data, not whether a visual layout makes a proof understandable; the latter needs a user study. A verified view can prevent omission of nodes, but cannot prove that a user interpreted a color or 3D perspective correctly.

## technique 3: use force-directed automatic layout in three dimensions

Use this when proof nodes are created, deleted, or hidden during search. The paper says its automatic layout algorithm handles this smoothly (Sec. 1, PDF p. 3). VMDV modifies ForceAtlas2: nodes repel one another like magnets, while edges attract their endpoints like springs. The forces move nodes until the 3D graph reaches a balanced state.

Steps assembled from Sec. 3.3 (PDF p. 9); the paper describes the algorithm in one paragraph and gives no pseudocode, parameters, or complexity:

1. Assign each node a 3D position and each edge an attraction relation.
2. Compute repulsive forces between nodes and attractive forces along edges.
3. Set every node's degree parameter to a constant one, rather than the number of incident edges, because clustering is not VMDV's main concern.
4. Move nodes under these forces until the graph reaches a balanced state. The paper says the algorithm is continuous and homogeneous, as ForceAtlas2 is, so that node movement respects the feeling of a physical system and users comprehend the graph by "playing" with it.
5. Inference: after a graph update, the same simulation places new nodes; the paper does not describe re-running or convergence criteria.

The paper characterizes the method: “ForceAtlas2 is a force-directed algorithm that simulates a physical system, where nodes repulse each other like magnets while edges attract the nodes they connect like springs.” (Sec. 3.3, PDF p. 9.) The paper contrasts its algorithm with OpenOrd, which it says is not continuous and homogeneous, and with Yifan Hu's algorithm, which it calls semi-continuous.

Verus form (Inference): model positions and force updates as fixed-point or rational arithmetic if deterministic replay matters. Inference: prove local invariants such as finite coordinates and preservation of node identity with `invariant` clauses around an update loop. Inference: a force simulation's aesthetic convergence is not a proof obligation in ordinary Verus; specify a bounded iteration count or a termination measure if the executable must guarantee completion. Floating-point stability and perceptual quality remain outside the paper's evidence.

## technique 4: visualize verification procedures together with auxiliary models

Use this when a proof tree's meaning depends on a changing state model, such as a Kripke structure. VMDV accepts multiple synchronized outputs and highlights corresponding proof and model elements.

The SCTL case study (Sec. 4.1, PDF pp. 9–12) uses a river-crossing puzzle. A state has four Boolean variables—farmer, wolf, goat, cabbage—and transitions represent assignments. The property is an EU formula asking for a path from the all-false state S0 to the all-true state S. During proof search, each EU-R2 rule application unfolds one model transition; EU-R1 closes the path when the target condition is reached.

Steps:

1. Encode the transition system as a Kripke model and the desired reachability property as an SCTL EU formula.
2. During proof search, let VMDV send messages to SCTL; VMDV then automatically shows newly constructed nodes in both the proof tree and the Kripke model (Fig. 8). Because SCTL searches on the fly, only the states that need to be explored are shown, which may be a small part of the whole model.
3. Show the proof tree and the Kripke model side by side in 3D (Figs. 9, 10).
4. Highlight all EU-formula nodes in the proof tree; the paper reports that a state path in the Kripke model is also highlighted (Fig. 9).
5. For an AG-formula, where the proof tree and the related part of the model may appear very complicated (Fig. 10), focus on a part of the proof tree each time and track the corresponding state transitions (Fig. 11).

The paper reports the interaction: “This way, when we highlight all the nodes with EU -formulas in the proof search tree, a state path in the Kripke model is also highlighted, certifying this proof.” (Sec. 4.1, PDF p. 10.) Inference: “certifying” here means visual correspondence in the example; the paper does not describe an independently checked certificate.

Verus form (Inference): represent proof nodes and model states with shared stable IDs and specify a relation connecting an EU proof step to one transition. Inference: a checker can use `ensures` to guarantee that every highlighted model edge corresponds to a proof edge and that the endpoint states satisfy the stated predicates. Inference: Verus can prove the correspondence relation but cannot establish that 3D highlighting was rendered or perceived correctly. The SCTL rules and model semantics would need their own formalization.

## technique 5: support interactive proof scripts through goal-tree updates

Use this when a prover such as Coq creates subgoals interactively. Treat each proof goal as a node and its generated subgoals as children. A leaf is a goal with no remaining subgoals. The paper prefers building a wrapper on an existing coqtop interface (coqide or Proof General), adapting its XML protocol and translating the messages into TCP packets that VMDV understands, over building an IDE for coqtop from scratch.

The Coq example in Sec. 4.2 (PDF pp. 12–13) proves `∀ A B C : Prop, (A → (B → C)) → ((A → B) → (A → C))` with `intros`, `apply`, and `assumption`. The paper counts 7 steps in this proof script (the first `assumption` counts as two: finish the current goal and jump to the next goal) and therefore 7 edges in the proof tree (Fig. 12). It notes that building an IDE from scratch would make the developer handle many basic and cumbersome I/O problems of the IDE and coqtop.

Steps (assembled from the Sec. 4.2 description):

1. Receive a goal-state update from Coq.
2. Create a node for the current goal and child nodes for newly opened subgoals.
3. Mark a node as a leaf when the goal has no subgoal.
4. Translate the interface event into a VMDV graph update and send it over TCP.
5. Inference: use focus and rotation to inspect the current branch while retaining the global tree. The paper's conclusion says VMDV could show the overall structure along with dynamic updating of local branches, so users can see whether the current formula was already proved in another branch; this is stated as future work.

The paper states: “Each step of the proof script introduces new proof goals based on the current proof goal.” (Sec. 4.2, PDF p. 12.) The paper says "our interface is now under development"; no completed integration or user evaluation is reported.

Verus form (Inference): a proof-goal tree can be represented as a ghost or executable tree with a `spec fn` stating that child goals are generated by the tactic applied to the parent. Inference: a `proof fn` can verify that a closed leaf satisfies the theorem contract, while `invariant` maintains that open goals partition the remaining proof obligations. Inference: translating Coq XML into Rust updates is an adapter task; the Coq kernel remains the trusted proof checker unless its proof objects are independently verified.

## evidence, trust boundary, and relevance to VL

VMDV demonstrates a useful inspection workflow, but the paper reports no user-study sample, latency, graph-size benchmark, layout-quality metric, or proof-error detection rate. Inference: the proof engine, graph-update messages, TCP transport, Java/JOGL renderer, force simulation, and user's interpretation are trusted. Inference: the visualization can expose topology, search progress, and correspondence between structures; it does not establish that the displayed proof is valid. Inference: the SCTL and Coq examples show feasibility, not general effectiveness. The Coq example in the paper is a tree drawn from a proof script (Fig. 12); the Coq interface is unfinished.

Inference: for VeruLaw, VMDV's highest-value transfer is a verification-debugging interface: display a Verus proof obligation graph, the current invariant/lemma dependencies, and the failing solver branch, with synchronized source locations. Inference: stable graph-update messages could let an agent stream proof attempts while a small verified receiver checks that nodes and edges refer to real obligations. Inference: focus, search, and ancestor highlighting map directly to finding which contract or lemma blocks an agent-generated Rust proof. Inference: a visual layer should remain downstream of a machine-checkable certificate; it can explain rejection but must not turn visual plausibility into acceptance.

Inference: VL should not redo force-directed layout or generic 3D proof-tree rendering as formal-verification research. A worthwhile new experiment would measure repair time and error localization for Verus users with and without synchronized obligation views, reporting task counts and failure denominators. Inference: the paper's protocol architecture could be reused, but its qualitative claims do not establish a product threat by themselves. Inference: the direct threat is low; the indirect risk is that users trust a compelling rendering of an invalid or incomplete proof unless the viewer clearly binds every displayed node to checker output.

## techniques for the catalog

- prover-viewer protocol — decouple proof engines and visualization through control and graph-update messages over TCP
- navigable 3D proof graphs — expose global topology and local labels with zoom, rotation, selection, search, and focus
- force-directed layout — place dynamic proof nodes with repulsive and attractive 3D forces
- synchronized model views — link proof-tree nodes to corresponding Kripke states and transitions
- interactive goal trees — visualize Coq or similar proof-script subgoals as dynamically updated parent-child graphs

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Since the clustering of nodes are not the main concern of VMDV, we set the degree of each node to be constant 1 in our algorithm, not the number of edges that are attached to the node as ForceAtlas2 does."): I read the whole paper text and checked all five quotations, the SCTL river-crossing and Coq examples, the 7-step and 7-edge count, the message types, the Java/JOGL/TCP details, the layout description, and the PDF page numbers of each section. I corrected the section page ranges (Sec. 3.1 is pp. 5-6, Sec. 3.3 is p. 9, Sec. 4.1 is pp. 9-12, Sec. 4.2 is pp. 12-13), replaced "descendants" by "children", removed unsupported claims (re-running the layout after updates, the "streaming" step, "recommends", and the OpenOrd and Yifan Hu characterization), added missing paper details, and marked remaining own conclusions "Inference:". I did not check the cited related work, the SCTL rules in Fig. 2 against the cited SCTL paper, the figure contents beyond their captions, or the Verus design paragraphs, which are my inferences and not in the paper. Tag line and arXiv link (1702.04478v1, from the paper text) unchanged.
