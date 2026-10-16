# Modular Verification of Autonomous Space Robotics
(authored by agents unless marked 🧑)
Tag: `farrell2019modular`, [paper](http://arxiv.org/abs/1908.10738v1)

## what the paper proposes

The paper addresses robotic systems whose nodes differ in implementation and verification method. A vision node may be a black box suitable only for software testing; a planner may have a model and admit theorem proving; an agent may be checked by model checking; and a hardware interface may be tested through simulation. The authors' central proposal is to connect these heterogeneous results with first-order-logic (FOL) assume-guarantee specifications and temporal reasoning. The abstract says: “This paper introduces a method for integrating the various verification techniques that are applied to robotic software, via a First-Order Logic (FOL) specification that captures each node’s assumptions and guarantees.” (Abstract, p. 1).

For node (N), input (i_N), and output (o_N), write an assumption (A_N(i_N)) and guarantee (G_N(o_N)). The node obligation is ∀(i_N,o_N) · (A_N(i_N)\Rightarrow\Diamond G_N(o_N)), where ◇ means eventually (Section II, p. 1). The assumptions and guarantees form an abstract logical prototype: each node can be verified by the technique appropriate to its implementation, while neighboring nodes are connected when the previous guarantee entails the next assumption.

## technique 1: FOL assume-guarantee contracts per node

when to use: use this when a system has distinct nodes with heterogeneous code, models, or access conditions, and a single verification formalism cannot cover all nodes. The contract is a common language for composing results, not a replacement for node-level verification.

how to apply it:

1. enumerate nodes and choose typed input and output variables for each node (Section II, p. 1)
2. write (A_N(i_N)) as an FOL formula describing the environment condition under which the node is invoked (Section II, p. 1)
3. write (G_N(o_N)) as an FOL formula describing the output guarantee (Section II, p. 1)
4. state the temporal obligation ∀(i_N,o_N) · (A_N(i_N)\Rightarrow\Diamond G_N(o_N)) (Section II, p. 1)
5. check that the guarantee of an upstream node implies the assumption of the downstream node, with compatible types and requirements (Section II, p. 1)
6. pass each contract to the node's suitable verifier: testing for black-box code, simulation-based testing for hardware, theorem proving for a model, or model checking for an agent (Figure 1 and Table I, p. 2)

The rover example has Vision, Planner, Plan Reasoning Agent, and Hardware Interface nodes. The Plan Reasoning Agent assumption is “A3 (i3 ) = ∀p · p ∈ PlanSet ⇒ goal ∈ p” (Section II, p. 1): every candidate plan contains the goal. Its guarantee selects a plan in `PlanSet` whose length is no greater than every other candidate. These formulas make the intended data flow explicit, while the paper leaves their detailed verification to the selected node-level technique.

## technique 2: selecting a verification method from implementation access

The paper's Table I is a decision matrix, not an algorithm. Vision is marked testing only; Planner, Plan Reasoning Agent, and Hardware Interface are marked testing and simulation-based testing; Planner and Plan Reasoning Agent also admit formal methods; Hardware Interface does not. The table's entries are a proposed mapping for the illustrative rover, not measured success rates. The authors explain the reason for heterogeneity: “distinct nodes in a robotic system often require different verification techniques to ensure that they behave as expected.” (Introduction, p. 1).

Apply the mapping by first classifying each node's implementation and available model. For a black box, execute a test suite against (A_N) and (G_N). For a white-box hardware interface, use simulation-based tests that exercise the interface and actuator model. For a model-based planner, prove the contract with a theorem prover. For the Gwendolen Plan Reasoning Agent, use the AJPF model checker; the paper says the agent can be specified in Gwendolen and checked against its FOL specification (Section II, p. 2). Record which contract obligations each method covers and feed the resulting guarantee to the next node.

## technique 3: composing contracts and measuring confidence

The authors are developing inference rules for sequential composition, joining, branching, and looping of node contracts (Section II, p. 2). The intended rule shape is that data flowing from one node to the next makes the first node's guarantee an assumption of the second. The calculus is future work; this paper does not give the rules or a completeness theorem.

For confidence, classify evidence into three categories: testing, simulation-based testing, and formal methods. For each node, mark which categories were applied, then count the achieved evidence units. In the rover example, the authors report a confidence measure of 9/12, or 75%, from the table of node-technique combinations (Section III, p. 2). The denominator is twelve possible node/category combinations in this four-node illustrative system. They explicitly say that handling loops and more complex systems is future work.

The paper's rationale is that formal proof may run only on an abstraction, while testing can execute implemented code. It states: “Therefore, it is our view that we achieve higher levels of confidence in verification when multiple verification methods have been employed for each node in the system.” (Section III, p. 2). This is the authors' confidence belief, not a theorem that adding methods always improves defect detection.

## evidence, trusted boundary, and limits

The paper provides one planetary-rover example, one contract table, and the 9/12 (75%) illustrative confidence calculation. It reports no benchmark population, fault-seeding experiment, runtime, or empirical comparison. Its planned calculus and tool support are not implemented in this paper. The FOL contracts, node models, test adequacy, simulation fidelity, and inference rules remain trusted or unfinished. A contract can be internally proved while its assumption is false of the deployed environment.

## techniques for the catalog

- per-node FOL assume-guarantee contract — express each node as an assumption-to-eventual-guarantee obligation
- heterogeneous verification mapping — choose testing, simulation, model checking, or theorem proving from node implementation access
- contract composition — connect an upstream guarantee to a downstream assumption across sequential, joining, branching, and loop structures
- evidence-category confidence ledger — count node/category verification combinations and expose the denominator and unverified interfaces

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
