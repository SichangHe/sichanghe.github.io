# Modular Verification of Autonomous Space Robotics
(authored by agents unless marked 🧑)
Tag: `farrell2019modular`, [paper](http://arxiv.org/abs/1908.10738v1)

## what the paper proposes

The paper addresses robotic systems whose nodes differ in implementation and verification method. In its Figure 1 (p. 2), the Vision node is a black-box implementation paired with software testing, the Planner a model-based specification paired with theorem proving, the Plan Reasoning Agent a logical/algebraic specification paired with program model checking, and the Hardware Interface a white-box implementation paired with simulation-based testing. The authors' central proposal is to connect these heterogeneous results with first-order-logic (FOL) assume-guarantee specifications and temporal reasoning. The abstract says: “This paper introduces a method for integrating the various verification techniques that are applied to robotic software, via a First-Order Logic (FOL) specification that captures each node’s assumptions and guarantees.” (Abstract, p. 1).

For node (N), input (i_N), and output (o_N), write an assumption (A_N(i_N)) and guarantee (G_N(o_N)). The node obligation is ∀(i_N,o_N) · (A_N(i_N)\Rightarrow\Diamond G_N(o_N)), where ◇ means eventually (Section II, p. 1). The paper calls this abstract specification "a logical prototype for individual nodes and thus the entire robotic system" (Introduction, p. 1). The specifications then guide the verification of each node by the technique suited to it, and the Figure 1 caption says "the assumptions of the next node should follow from the guarantee of the previous" (p. 2).

## technique 1: FOL assume-guarantee contracts per node

when to use: the paper motivates it for systems where nodes need different verification techniques and where "in some cases we may only have access to the black-box or white-box implementation of a node" (Introduction, p. 1). Inference: the contract is a common language for linking results, not a replacement for node-level verification; the paper says the FOL specifications "are then used to guide the more detailed verification of each node" (Section IV, p. 2).

how to apply it:

1. for each node N, take a variable i_N for its input and a variable o_N for its output (Section II, p. 1)
2. write (A_N(i_N)) as an FOL formula describing the node's assumptions (Section II, p. 1)
3. write (G_N(o_N)) as an FOL formula describing the node's guarantees (Section II, p. 1)
4. state the temporal obligation ∀(i_N,o_N) · (A_N(i_N)\Rightarrow\Diamond G_N(o_N)) (Section II, p. 1)
5. arrange that the assumptions of the next node follow from the guarantee of the previous node (Figure 1 caption, p. 2); the paper notes that nodes "transmit data between them so long as their types/requirements match" (Section II, p. 2), but gives no procedure for checking this
6. use each contract as the property to verify of its node, with the technique suited to the node: software testing for the black-box Vision node, theorem proving for the model-based Planner, program model checking for the Plan Reasoning Agent, and simulation-based testing for the white-box Hardware Interface (Figure 1, p. 2)

The rover example has Vision, Planner, Plan Reasoning Agent, and Hardware Interface nodes. The Plan Reasoning Agent assumption is “A3 (i3 ) = ∀p · p ∈ PlanSet ⇒ goal ∈ p” (Section II, p. 1): every candidate plan contains the goal. Its guarantee selects a plan in `PlanSet` whose length is no greater than every other candidate. The paper gives only these two example formulas (Section II, p. 1) and leaves their verification to the selected node-level technique.

Inference: in Verus, encode (A_N) and (G_N) as `spec fn`s over Rust input/output datatypes, then expose node functions with `requires` and `ensures`. A caller proof can establish that its output satisfies the callee's `requires`; a callee proof establishes its `ensures`. Temporal eventuality is not a direct Verus postcondition, so a bounded one-step contract or a state-machine progress invariant is needed. Inference: the contract boundary is useful for VL because agent-written Rust can be verified per module, while composition checks whether generated outputs satisfy the next module's preconditions.

## technique 2: selecting a verification method from implementation access

The paper's Table I (p. 2) marks, per node, which of three categories (testing, simulation-based testing, formal methods) apply. Vision has only testing; Planner and Plan Reasoning Agent have all three; Hardware Interface has testing and simulation-based testing but not formal methods. The paper introduces the table as showing which techniques "might be employed for each node in our simple example" (Section III, p. 2), so the entries are a proposed assignment for the illustrative rover, not measured results. Inference: the table is a lookup of available techniques, not a selection algorithm. The authors give the reason for heterogeneity in the abstract: “distinct nodes in a robotic system often require different verification techniques to ensure that they behave as expected.” (Abstract, p. 1).

Per Figure 1 (p. 2), the Vision node is a black-box implementation verified by software testing, the Planner a model-based specification verified by theorem proving, the Plan Reasoning Agent verified by program model checking, and the Hardware Interface a white-box implementation verified by simulation-based testing. For the Plan Reasoning Agent, the paper says: "we can specify the node using the GWENDOLEN agent programming language and then use the AJPF model-checker to verify that it behaves as specified [1]" (Section II, p. 2). The paper does not describe the test suites, the theorem prover, or the simulation set-up.

Inference: a Verus system can make this choice more uniform for Rust nodes, but black-box dependencies and hardware still require testing or simulation evidence. Verus proof of a wrapper does not prove an external device obeys the wrapper's assumed contract. VL should preserve the distinction between implementation-level proof and environment-level evidence.

## technique 3: composing contracts and measuring confidence

The authors write: "we are working towards a calculus of inference rules" and "we are developing rules for sequentially composing, joining, branching and looping between nodes" (Section II, p. 2). The conclusion calls this "current work" (Section IV, p. 2). This paper does not give the rules or any soundness or completeness result.

For confidence, the paper "broadly partitioned current verification techniques into three categories: testing, simulation-based testing and formal methods" (Section III, p. 2). It marks which categories apply to each node (Table I) and then says: "We then provide a score for our level of confidence in the verification of the whole system as 9/12, resulting in a confidence measure of 75%." (Section III, p. 2). Inference: the score is the 9 check marks in Table I over its 12 cells (4 nodes times 3 categories); the paper does not spell out this computation. The paper says that "Examining how this metric can be calculated for more complex systems with loops is a future direction" (Section III, p. 2).

The paper's rationale is that "formal verification is usually only feasible on an abstraction of the system whereas testing can be carried out on the implemented code" (Section III, p. 2). It concludes: “Therefore, it is our view that we achieve higher levels of confidence in verification when multiple verification methods have been employed for each node in the system” [5] (Section III, p. 2). Inference: this is the authors' stated view, supported in the paper by a citation and no experiment, not a theorem that adding methods always improves defect detection.

Inference: in Verus, a practical confidence record could distinguish proof obligations discharged by Verus, contract assumptions trusted about libraries or hardware, and runtime tests over concrete Rust. A simple percentage should not be presented as probability of correctness; it counts covered evidence categories. Inference: VL should use the paper's accounting idea to expose unverified interfaces, while retaining explicit threat models and denominators.

## evidence, trusted boundary, and limits

The paper provides one planetary-rover example (Figure 1), one table of verification techniques per node (Table I), and the 9/12 (75%) confidence score. It reports no benchmark population, fault-seeding experiment, runtime, or empirical comparison. The calculus is still being developed, and the authors "plan to provide tool support for this and to evaluate it using a set of more complex robotic space missions" (Section IV, p. 2). Inference: the FOL contracts, node models, test adequacy, simulation fidelity, and inference rules are therefore trusted or unfinished, and a contract can be internally proved while its assumption is false of the deployed environment.

Inference: threat to a product that generates verified Rust is primarily compositional omission. Agent-generated modules may each pass Verus while a downstream precondition is not implied, or while a hardware/test assumption is undocumented. The transferable work is the explicit per-node assumption/guarantee boundary and evidence ledger. VL should not redo the paper's illustrative 9/12 score as a correctness metric; it should implement checked contract entailment and report each denominator and trusted assumption.

## techniques for the catalog

- per-node FOL assume-guarantee contract — express each node as an assumption-to-eventual-guarantee obligation
- heterogeneous verification mapping — pair each node with testing, simulation-based testing, model checking, or theorem proving according to its implementation (black box, white box, or model-based specification)
- contract composition — connect an upstream guarantee to a downstream assumption across sequential, joining, branching, and loop structures
- evidence-category confidence ledger — score a system by the node/category combinations covered (9/12 in the paper); Inference: also record the denominator and the unverified interfaces

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Note that our use of temporal operators here is motivated by the temporal nature of robotic systems and will be of use in later extensions of this work."): I read the whole two-page paper (text and page images, including Figure 1 and Table I) and checked every quotation, the node/technique assignments, the 9/12 = 75% score, the FOL formulas, and the section and page references. I changed: the abstract quote was misattributed to the Introduction (now Abstract); step 1, 2, 3 and 5 wording that the paper does not support (typed variables, environment condition, entailment check) was replaced with the paper's wording; unsupported statements (actuator model, recording obligations, rule shape of the calculus, "decision matrix") were removed or marked Inference; the 9/12 derivation is now marked Inference. I did not check the cited works [1]-[5], or the Verus and VL inferences beyond marking them as inferences.
