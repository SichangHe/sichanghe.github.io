# Andy: A Mathematical Agent for Rigorous Proof and Autonomous Research
(authored by agents unless marked 🧑)
Tag: `wang2026andy`, [paper](https://arxiv.org/abs/2608.15052)

## what the paper proves or measures

The paper evaluates one small efficiency comparison and reports a detailed research trace. For studying the zeros and monotonicity of `x^3 − x`, the ordinary process took 1 hour 22 minutes 12 seconds and the DAG process about 37 minutes 59.7 seconds, a reported 53.8% decrease (Section 2.4, p.5). The authors caution that “The entire time difference cannot be attributed to the DAG.” (Section 2.4, p.5). In the larger case study, nine proposal versions (eight revisions), seven explored proof routes, nineteen immutable node revisions, seven frozen nodes, one failed node, and four invalidated nodes are recorded (Appendix A, pp.17–20).

## technique 1: independent solver–evaluator separation

what it is: use one model to solve, formulate, and revise, and another model to check premises, calculations, and logical completeness. The evaluator returns structured errors and suggestions but cannot modify the proof, preventing self-approval.

when to use: use this whenever generated proof text is long enough that the generator can overlook a false premise or arithmetic step. It is especially useful when a final theorem must be auditable by someone other than the generating model.

how to do it:
1. give the original problem, and optionally a supplied solution, to the solver
2. have the solver produce a solution or proof; if a solution was supplied, have it verify that answer
3. submit the result to an evaluator that checks premises, calculations, and logic
4. feed only the evaluator’s locations and revision suggestions back to the solver
5. repeat until the proof passes the evaluator and the later final verification

The paper states: “The evaluator cannot directly modify a proof. It can only provide structured verification conclusions, error locations, and revision suggestions.” (Section 2.1, p.2). It used DeepSeek V4 Pro as solver and Claude Sonnet 5 as evaluator; Codex running GPT-5.6 Sol acted as an external monitor in this study (Remark 2.1, p.2).

evidence and limits: the reported time comparison uses two runs and different random generations; it does not isolate evaluator separation. The evaluator’s correctness is itself an assumption, and the paper’s mathematical case study does not establish that the workflow catches all errors. Inference: for agent-written verified Rust, this architecture reduces correlated model error only when the final verifier and specifications are independently trustworthy.

## technique 2: research-value gate with targeted revision

what it is: score each proposed new problem on importance, originality, feasibility, and coherence, optionally adding literature support. Hard gates reject pure restatements, multiple disconnected subproblems, or proposals without a concrete proof method.

how to do it:
1. formulate a candidate from a verified starting result, references, and user direction
2. score every dimension from 0 to 10 and compare with the selected difficulty threshold
3. record scores and hard-gate verdicts in an audit record
4. if any threshold fails, issue a targeted revision specifying the defect, mathematical change, and acceptance criterion
5. repeat evaluation of the revised candidate until every threshold and hard gate passes

Algorithm 1 gives `Q0 ← FORMULATE(R,L,U)`, `EVALUATE`, `TARGETEDREVISION`, and `REVISE` (Section 2.3, p.3). Research-level tasks require total score at least 7.5 and every dimension at least 6.0; standard tasks require 7.0 and 5.5; easy tasks require 6.0 and 4.5 (Section 2.3, p.3). The paper says: “The user’s choice of difficulty changes only the threshold for research value and the research cost. It does not reduce the correctness requirements for the final proof.” (Section 2.3, p.3).

Verus form (Inference): before asking an agent to write verified Rust, score whether the intended property matters, is distinct from existing specifications, has a feasible Verus model, and has one coherent objective. Keep the score as metadata; it cannot substitute for Verus proof obligations. A failed feasibility gate should trigger a concrete contract or lemma revision rather than relaxed `ensures`.

evidence and limits: in the case trace, Version 1 scored 6, 5, 3, and 4 and total 4.65; Version 4 onward scored 8, 8, 7, and 8 and total 7.75 (Table 2, p.18). The final acceptance criterion also required one principal conclusion (Appendix A.1, p.18). These are scores for one control problem, not predictive validity for software projects.

## technique 3: versioned proof DAG and certificate-bound execution

what it is: represent every lemma or proof step as a node containing a statement, assumptions, dependencies, proof, and certificate. Execute ready nodes in topological order, independently verify each, bind its certificate to the exact node version and execution metadata, and freeze it when valid.

how to do it:
1. build a DAG and reject cycles, missing dependencies, and unreachable targets
2. select a ready node whose predecessors are frozen
3. execute its proof from its statement, assumptions, and dependencies
4. independently verify the result
5. bind the certificate to the node version and metadata, then freeze the node
6. if a route is mathematically infeasible, activate the highest-ranked unused backup route
7. assemble frozen nodes and run an independent final verification

The node record is `v = (S_v, A_v, D_v, Π_v, C_v)` with interface `I_v = (S_v,A_v,D_v)` and fingerprint `h_v = H(I_v)` (Section 2.4, p.4). Algorithm 2 explicitly requires every dependency to be frozen before execution (p.4). The paper says: “A node becomes available only after all its predecessors have been certified.” (Introduction, p.2)

Verus form (Inference): map a node to a Rust module or proof function with explicit `requires` and `ensures`; represent dependencies as imported lemmas and record a hash of the statement, assumptions, dependency names, Verus version, and source. Run Verus on each node before allowing downstream proofs to compile. Certificates and fingerprints are orchestration metadata, not Verus language constructs. Keep proof functions ghost/proof-only so they are erased from executable code.

evidence and limits: the case study’s final chain was `N1-r2 → {N2-r1,N3-r1,N4-r1} → N5-r5 → N11-r2 → N12-r4`; seven nodes were frozen and four invalidated (Appendix A.3–A.4, pp.19–20). The DAG comparison’s 53.8% reduction is based on two runs and explicitly not wholly attributable to DAG execution. Inference: certificate binding makes stale proof reuse detectable, but it does not prove that the node’s specification captures the product requirement.

## technique 4: interface-sensitive local repair and route fallback

what it is: on a failed node, revoke only that node and descendants whose dependency interface changed; retain certified siblings and unchanged-interface descendants. If the active proof route fails mathematically, switch to a backup route, then reassemble from frozen nodes only.

how to do it:
1. compare old and new interface fingerprints after a node revision
2. set the invalidation set to `{v}` when unchanged, or `{v} ∪ Desc_G(v)` when changed
3. revoke frozen state and certificates for that set
4. re-execute affected nodes topologically
5. create and verify a new node for any bridging proposition introduced during assembly
6. independently verify the assembled proof and bind the final record to cited versions

Algorithm 3 gives this contract and four system invariants: dependencies are verified nodes, certificates bind to statement/proof/context/model/prompt/code, bridge propositions become nodes, and the final proof cites no invalidated node (Section 2.5, pp.5–6). The paper reports that replacing the interface factor in `N5` changed its fingerprint and invalidated downstream `N6–N8`, while unrelated verified prefix nodes remained usable (Appendix A.4, p.20).

Verus form (Inference): organize proofs so a changed `requires`/`ensures` interface invalidates dependent proof modules, while a proof-body-only edit can be rechecked locally. A build orchestrator can enforce dependency hashes and rerun Verus on the invalidation set. Do not treat a cached certificate as proof after a specification or dependency change.

evidence and limits: one backup branch failed at `N9` after three revisions; a second branch succeeded through `N11` and `N12` (Appendix A.4, p.20). This demonstrates traceability in one theorem, not a measured repair-success rate across tasks.

## trusted boundary and product relevance

The paper proves the final control theorem only under its stated assumptions and reports one numerical illustration; it does not prove the correctness of DeepSeek, Claude, Codex, the memory store, or route-selection heuristics.

## techniques for the catalog

- research-value gating — score importance, originality, feasibility, and coherence and revise failed proposals against explicit criteria
- certificate-bound proof DAG — execute verified dependency nodes topologically and bind certificates to exact versions
- interface-sensitive repair — revoke only changed nodes and descendants, preserve unchanged certified work, and switch to backup proof routes
