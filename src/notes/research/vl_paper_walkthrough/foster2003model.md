# Model-based verification of Web service compositions
(authored by agents unless marked 🧑)
Tag: `foster2003model`, [paper](https://doi.org/10.1109/ase.2003.1240303) (link from the fetch record)

Page references below are PDF pages (1–10) of the fetched copy; the paper text shows no proceedings page numbers.

## purpose and result

The paper presents a model-based process for checking a web-service workflow before deployment. The design is written as UML Message Sequence Charts (MSCs), mechanically compiled to Finite State Process (FSP) notation, while a BPEL4WS implementation is translated to FSP. The two FSP models are compared by trace inclusion/equivalence in LTSA. The authors state that the approach “supports verification against specification models and assigns semantics to the behavior of implementation models so as to confirm expected results for both the designer and implementer” (Abstract, PDF p. 1).

The worked marketplace has buyer and seller roles. A product is offered or requested, the service matches opposite roles, initial prices are exchanged, and the parties iterate over agreement or termination. The scenarios the authors say they may want to verify include requiring both initial prices before negotiation, preventing a seller from changing price before receiving the buyer's price, and restricting agreement/disagreement behavior (Section 2.3, PDF pp. 3–4). Inference: The paper's evidence is a model and two counterexample traces, rather than measurements over a corpus or a claim about deployed services.

## technique 1: layered workflow model and scenario synthesis

Inference: Use this when a workflow must be specified independently of a technical implementation, especially when concurrency and ordering are central. The paper separates four layers: model verification tool, workflow-independent notation, web service composition notation, and web service workflow engine (Figure 1, Section 2.1, PDF p. 2). LTSA-MSC is used to draw scenarios and synthesize an FSP model. The authors explain: “The tool implements a framework for synthesizing implementation models for scenario-based specifications” (Section 3, PDF p. 4). They also state: “By using this tool, we can guarantee that the resulting model is a model that implements the least unwanted behaviors.” (Section 3, PDF p. 4)

Steps described by the paper:

1. Define a high-level specification diagram for the composition (Section 3, Figure 5, PDF p. 4); a context diagram of the roles and messages is shown in Figure 4 (Section 2.3, PDF p. 4).
2. Compose individual MSC scenarios “for each possible sequence of our service”, such as requesting or selling a product and seller and buyer agreements (Section 3, Figures 6–7, PDF p. 4).
3. Use LTSA's FSP translation mechanism to convert the scenarios into a complete FSP specification (Section 3, PDF p. 4).
4. Compile the FSP into a state machine and build an architecture model that shows the possible state sequences (Section 3, PDF p. 4; Figure 8, PDF p. 5).
5. Check implied behaviors: the paper's step list includes detecting “possible additional (implied) scenarios that the model supports but that were left unspecified or undefined by the user” (Section 2.1, PDF p. 3; Section 3, PDF p. 4).

In the initial scenario, “either a seller can offer a product, or a buyer can request a product”, and the first requestor waits for the other before negotiation (Section 3, PDF p. 4); the corresponding MSC labels `offerproduct` and `requireproduct` appear in the relabeling of Section 6.1 (PDF p. 8). The specification model is intentionally abstract: the paper says a UML design lets designers evaluate transitional state and behavior “before deploying any parts of the workflow” (Section 2, PDF p. 2).

Inference: In Verus, the MSC would become a ghost state machine or a set of transition predicates, while executable Rust would implement the workflow state. A suitable shape is an enum for phases and a `spec fn` describing allowed transitions, with `requires` and `ensures` on transition functions. Verus does not provide MSC-LTSA synthesis, so scenario-to-state-machine generation would remain an external preprocessing step or an agent-generated artifact. The useful part that carries over is separating an abstract state model from implementation details; the LTSA-specific notation does not carry over.

Inference: Evidence is qualitative: the tool generates a model and supports animation and implied-behavior checks. No run count, state count, or failure rate is reported. Inference: The method assumes scenarios are complete enough to represent intended behavior; omitted scenarios can make the specification too weak.

## technique 2: translating BPEL4WS constructs into FSP

Inference: Use this when an implementation language contains structured, concurrent, and primitive workflow operations that must be analyzed by a finite-state model checker. The paper groups BPEL4WS tokens into structured (`sequence`, `switch`, `while`, `pick`), concurrent (`flow`), primitive (`receive`, `reply`, `invoke`, `throw`, `empty`, `terminate`, `wait`, `assign`), and recovery (`scope`, `compensate`, `faultHandler`) categories (Section 5, Table 2, PDF p. 6). The paper states: “We represent the first two of these construct groups in the FSP specification” (Section 5, PDF p. 6). Inference: Its example translation also uses receive and assign actions as FSP labels.

The translation procedure is:

1. Define process and partner names corresponding to the MSC instances (Section 4.1, PDF p. 5).
2. Represent message data with containers and message dependencies with correlation sets (Section 4.2, PDF p. 5).
3. Map sequential activities to FSP action prefix and sequential composition. The paper gives `ACT1 = (action1 -> END)` and `SEQUENCE = ACT1;ACT2;END` (Table 3, PDF p. 6).
4. Map conditional branches to FSP choice. The paper gives `SWITCH = if cond1-true then ACT1;END else if cond2-true then ACT2;END else END` (Table 3, PDF p. 6).
5. Map loops to a conditional recursive process: `WHILE = If condition-true then ACT1;WHILE else END` (Table 3, PDF p. 6).
6. Map `flow` to parallel composition. The formal rule is “IF P and Q are process then (P || Q) represents the concurrent execution of P and Q” (Section 5.6, PDF p. 7).
7. Encode containers as parameterized processes. The paper's container form is `CONTA [i:IntRange] = (write[j : IntR] -> CONTA[j] | read[i]->CONTA[i])` (Section 5.1, PDF p. 7). Inference: receives and replies become labeled actions such as `receive.submit.buyerrequest` (Section 5.6, PDF p. 7).
8. Compile the resulting FSP in LTSA to produce a graphical architecture model (Section 5.7, PDF p. 7; Figure 9, PDF p. 8).

The paper gives a BPEL fragment with the concurrent seller and buyer agreement receives under `<flow>` (Section 4.7, PDF p. 6), then translates the initial price request as `BR =(receive.submit.buyerrequest -> END)`, `SR = (receive.submit.selleroffer -> END)`, and `||MarketPlaceItemFlow = (BR || SR)` (Section 5.6, PDF p. 7). It notes that its translation “is just one possible representation of several” and that it replaced conditional variables and converted the BPEL4WS Switch “to a series of Pick representations” (Section 5.7, PDF p. 7).

Inference: In Verus, structured sequencing and branching can be executable Rust control flow constrained by `requires`/`ensures`; loop translation becomes a Rust `while` with an `invariant` clause; and the BPEL container becomes a Rust value whose updates are proved by postconditions. FSP parallel composition has no direct sequential Verus equivalent. For a concurrent implementation, a Verus state-machine protocol can encode each participant's transition and prove that interleavings preserve an invariant. Verus syntax does not use FSP's `->`, `|`, or `||` operators.

Inference: The translation abstracts away service locations and other deployment details (the paper says these specifics can be removed, Section 5.7, PDF p. 7). Inference: Its assumptions are finite-state representability, faithful action labels, and a manual correspondence between technical actions and abstract actions. Fault and compensation tokens are listed but not translated or evaluated in the example.

## technique 3: abstraction mapping, hiding, and trace inclusion

Inference: Use this when specification and implementation use different action names or contain implementation-only actions. The paper's overall process is: capture MSC behavior, translate BPEL4WS to FSP, apply an abstraction mapping, perform trace-equivalence checks, then inspect traces and iterate (Section 2.1, PDF p. 3). The paper states: “If any actions have been included in the BPEL4WS specification that are dependent on actions undertaken for BPEL4WS implementation specifics, then these must be hidden as a secondary step” (Section 6, PDF p. 8).

Apply it as follows:

1. Identify labels with the same semantics in both models (Section 6, PDF p. 8).
2. Relabel implementation actions to the specification vocabulary. The marketplace mapping includes `requireproduct/receive.submit.buyerrequest` and `offerproduct/receive.submit.selleroffer` (Section 6.1, PDF p. 8).
3. Hide implementation-only actions, “typically” those concerned with “assignments, switch conditions, end actions and initiators”, with FSP's `\` operator (Section 6.1, PDF p. 8). The paper's hidden set is `receive.submit.buyerdisagree`, `receive.submit.sellerdisagree`, `assign.negotiation.false`, `assign.seller.price`, `assign.buyer.price`, `reply.seller.buyerprice`, `reply.buyer.sellerprice`, and `transaction`.
4. Make the reference model B deterministic with LTSA's “deterministic” keyword while preserving trace equivalence (Section 6.2, PDF p. 9).
5. Declare the deterministic model as a property. This adds an error state and transitions so that actions not enabled in a state go to the error state (Section 6.2, PDF p. 9).
6. Compose the checked model A with the property and perform reachability analysis. A reachable error state means A can perform traces that B cannot (Section 6.2, PDF p. 9).
7. Run the check in both directions (Section 6.2, PDF p. 9).

The paper performs two checks: “The first checks if the BPEL4WS FSP provides possible traces that the MSC FSP cannot. The second checks if the MSC FSP provides possible traces that the BPEL4WS FSP cannot.” (Section 6.2, PDF p. 9) This bidirectional check is the paper's operational meaning of trace equivalence. Its listed FSP code shows only the first direction (`CheckBPEL`).

Inference: In Verus, relabeling and hiding are modeling choices rather than verifier operators. They can be represented by a ghost projection function from concrete events to abstract events, with a postcondition that each implementation step maps to an allowed abstract step. A transition function can carry `requires` for the abstract precondition and `ensures` for the projected post-state. Verus does not provide an LTSA-style automatic error state, so the agent must state and prove an invariant such as a projected-event invariant requiring every event to belong to the specification trace relation.

Inference: The method depends critically on the abstraction map. The authors report that relabeling limits automation “as it is anticipated that designer and implementer may use different conventions” (Section 6.1, PDF p. 8), and that automation is limited “by the manual requirement of the abstract mapping between BPEL4WS actions and MSC labels” (Section 6.4, PDF pp. 9–10). Inference: Thus a wrong map can produce a convincing but irrelevant proof.

## technique 4: counterexample-guided workflow repair

Inference: Use this when a model check reports a trace that violates the intended workflow. LTSA's “safety check” performs a reachability analysis, and on a violation the engineer can “follow through the transitions and determine how the violation occurred” (Section 6.3, PDF p. 9). The paper says: “This counter example represents a possibility that cannot occur in our MSC but could occur in the BPEL4WS FSP specification.” (Section 6.3, PDF p. 9)

The marketplace check produced two traces (Table 4, PDF p. 9). The first was `offerProduct`, `requireProduct`, `buyerRequirePrice`; the second was `offerProduct`, `requireProduct`, `sellerRequirePrice`, `buyerRequirePrice`, `buyAgreed`, `recieve.submit.sellerDisagree`. The first trace arose because the BPEL used a `FLOW` for price requests, so either party could request first; the authors changed it to a `SEQUENCE` “so that the seller price must be received before buyer price can be received”. The second trace showed a seller disagreement after buyer agreement; they changed the BPEL “to reflect the buyeragreed action can only transition to a successful outcome of a negotiation” (Section 6.3, PDF p. 9).

Inference: The paper's repair loop is therefore: run a safety check, follow the violating transitions, identify the implementation construct responsible, change BPEL or revise the MSC if the behavior is intended, regenerate FSP, and rerun checks. The paper calls this a “trace and fix” iterative process and says a violation needing user validation “may be something which is subsequently corrected in the MSC specification” (Section 6.3, PDF p. 9).

Inference: In Verus, a failed proof obligation or counterexample trace can guide insertion or correction of a loop invariant, transition precondition, or state-machine transition. The repair must change executable Rust or its explicit specification; adding `external_body` to the function under verification would not establish the behavior. A Verus proof can show that the repaired implementation preserves the intended relation, but it will not automatically enumerate all alternative traces as LTSA does.

Inference: The evidence consists of two reported counterexamples and the corresponding design changes; there is no quantitative repair-time study. Inference: The process assumes that engineers can decide whether a trace is genuinely forbidden or reveals an error in the MSC.

## what is proved, measured, and trusted

The paper reports finite-state trace-inclusion checks after translation. It shows that the marketplace BPEL model admits two traces forbidden by the MSC and describes the BPEL changes (`FLOW` to `SEQUENCE`; constraining behavior after buyer agreement) made in response. Inference: The paper does not report rerunning the check after these changes. Inference: It does not prove the deployed BPEL engine, network, partner services, XML parser, or business meaning. Inference: It also does not report a soundness theorem for the BPEL-to-FSP translator, coverage of all BPEL constructs, state-space size, run time, or a denominator for defects.

Inference: The LTSA tool, FSP semantics, translation code (an LTSA plug-in, Section 6.4, PDF p. 9), manually supplied abstraction map, and correctness of the MSC specification remain trusted. The paper says automation is limited by “the manual requirement of the abstract mapping between BPEL4WS actions and MSC labels” (Section 6.4, PDF pp. 9–10). Recovery and compensation constructs are listed in Table 2 and named as future scope in the conclusions (Section 7, PDF p. 10), but are not evaluated in the marketplace result.

Inference: For VeruLaw, this is a moderate threat to agent-written verified Rust at the workflow-model boundary. An agent could generate an abstract protocol and prove that Rust transitions preserve it, but the paper's main automation—scenario synthesis, label mapping, deterministic trace inclusion, and counterexample extraction—would need new tooling around Verus. The paper already supplies a mature pattern for separating implementation behavior from an abstract protocol; VL should reuse that pattern rather than rediscovering layered models. The unmeasured manual mapping and untrusted translation are direct risks if an agent generates them without review.

## what VL should not redo

Inference: The paper already demonstrates the following established ideas: scenario-based workflow specifications; compilation of MSCs to FSP; translation of structured and concurrent workflow constructs to a finite-state notation; abstraction by relabeling and hiding; bidirectional trace inclusion; deterministic error-state checking; and counterexample-guided repair of workflow code. Inference: A new VL experiment should focus on translating these ideas into Verus state-machine specifications, measuring agent generation and repair, or checking that the generated abstraction map matches Rust behavior. Inference: It should not present model-based workflow checking or trace-equivalence checking as new concepts.

## techniques for the catalog

- scenario-based workflow synthesis — Inference: compose MSC scenarios with LTSA-MSC and compile them to an FSP model whose allowed behavior can be inspected
- BPEL-to-FSP translation — Inference: encode sequence, choice, loops, receives, assignments, and concurrent flow as finite-state process expressions
- abstraction mapping — Inference: relabel implementation actions and hide implementation-only events before comparison
- bidirectional trace inclusion — Inference: determinize each side in turn and check for reachable error states under composition
- counterexample-guided repair — Inference: follow a violating trace to the responsible workflow construct, modify the model or implementation, and rerun the checks
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The sequence construct is used wherever a series of activities need to occur sequentially, although they may be contained one or more times within looping or concurrent construct activities."): read all 10 PDF pages of the text and checked every quotation, code fragment, trace, section and figure/table reference against it; changed all page references from "p. 1527–1533" (taken from the ISSN 1527-1366) to PDF pages 1–10, corrected two misquoted words ("specification", "IF") and the container code spacing, corrected the hidden-action set, the Section 2 location of "before deploying any parts of the workflow", and the sources of the manual-mapping claim, and removed the unsupported claim that the BPEL changes were shown to remove the violations; did not check the figures' graphical content (Figures 5–10 are images), the DOI link, or the proceedings page numbers.
