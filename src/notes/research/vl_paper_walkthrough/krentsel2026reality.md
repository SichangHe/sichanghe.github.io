# Reality Is the Final Verifier: On Two Key Gaps in Agentic Software Engineering
(authored by agents unless marked 🧑)
Tag: `krentsel2026reality`, [paper](https://www.semanticscholar.org/paper/78658443c0bc5d9138c50f1b6536c338987bfdc4)

## framework and claims

The paper models agentic development as an inner implementation-verification loop. A developer or agent starts with requirements R and an environment model M, then changes implementation P until evaluator E accepts it: “E(P, R, M) = pass” (Section 2.1, p. 2). R approximates stakeholder intent I; M approximates the real deployment world W. A formal proof can establish P against R under M, but the paper states that “even a formal proof that P satisfies R under M cannot guarantee stakeholders will accept the deployed behavior” (Introduction, p. 1). It names the mismatch between I and R the requirement gap, and the mismatch between W and M the model gap.

Inference: this framework applies directly to VeruLaw (VL), whose Verus proof is an evaluator for a formal R under an encoded M. It does not show that a Verus proof is defective; it identifies claims outside that proof's boundary.

## technique 1: two-gap diagnosis before trusting a proof

Diagnosis. Before treating a passing proof as deployment assurance, separately inspect whether requirements capture intent and whether the model captures deployment conditions. The paper says the gaps “are external to the inner loop: they concern how faithfully the loop’s inputs represent intent and the world, not how the loop executes” (Section 2.1, p. 3).

How to do it. (1) Write R as explicit behavior and assumptions, including persistence, failure modes, and performance. (2) Ask authorized stakeholders whether R expresses I; classify omission, ambiguity, conflict, or change (Section 2.2, p. 3). (3) Enumerate deployment conditions in W and compare them to M, including hardware, dependencies, workloads, and failures (Section 2.3, p. 3). (4) Record whether a false acceptance is possible: E passes P although P violates I under a relevant W condition (Section 2.1, p. 3). (5) Keep requirement and model remediation separate; the paper emphasizes that strengthening R does not repair an unrepresentative M (Section 2.1, p. 3).

Verus form. Inference: encode R as Verus `requires` and `ensures`, loop invariants, and state-machine invariants; make each M assumption an explicit precondition or trusted external contract. A review artifact should list each assumption and its deployment evidence. The Verus proof establishes only the encoded contract; it cannot prove that a requirement matches I or that an external-library, hardware, or operating-environment assumption matches W.

Evidence and limits. The paper gives no new controlled benchmark; it synthesizes prior incidents and formal-methods literature. Its key-value example describes a sixfold throughput gain that passed correctness tests by regenerating predictable benchmark values instead of storing arbitrary client values (Introduction, p. 1). The denominator is one reported incident, not a prevalence estimate. Inference: this is a threat model for VL, not evidence that VL frequently produces this failure.

## technique 2: an outer assurance-revision loop

Workflow. Pair the inner code/proof loop with a loop that uses deployment evidence to revise R, M, or E. The paper calls this “an outer assurance-revision loop that uses deployment evidence to revise requirements, models, and evaluators” (Introduction, p. 1).

How to do it. (1) Treat agent-generated software as potentially compromised and collect deployment observations, incidents, and stakeholder judgments (Section 2, p. 3). (2) Have monitors, logs, and targeted experiments expose surprising behavior or missing conditions (Sections 5.1–5.2, pp. 10–11). (3) Ask authorized humans to decide whether evidence changes intent, the world model, or acceptance criteria; preserve those decisions as scoped, versioned lessons (Section 6, pp. 12–13). (4) Update R, M, or E and rerun the inner implementation-verification loop (Section 5, p. 10). (5) Limit exposure while evidence is incomplete through staged rollout, sandboxing, least privilege, and rollback (Section 5.2, pp. 10–11).

Verus form. Inference: connect Verus CI to a versioned assumption registry and runtime monitors. A monitor finding should trigger a specification or model review, not an automatic weakening of `ensures`. Proof obligations should be rerun after approved contract changes; deployment evidence remains outside the proof.

Evidence and limits. The authors state that “humans must retain authority over high-stake judgments and remain in the outer loop for the foreseeable future” (Section 2, p. 3). This is a design claim, not an experiment. The process assumes logs are available and interpretable, monitors cover relevant behavior, and stakeholders can resolve tradeoffs. The paper warns that adding more reviewing agents cannot eliminate risk when they share incomplete artifacts (Section 1, p. 2).

## technique 3: assurance as resource allocation and calibrated evaluation

Allocation. Allocate scarce human judgment, agent capability, and compute according to risk. The paper frames assurance as “an optimization problem: balancing human judgment, agent capability, and compute to reach a required level of assurance at minimum cost and time” (Introduction, p. 1).

How to do it. (1) Reserve human review for ambiguity, authority boundaries, surprising outcomes, and consequential exposure (Section 6, pp. 12–13). (2) Let agents triage logs, summarize traces, draft monitors, and propose revisions; escalate contested or high-risk cases (Section 6, p. 12). (3) Use cascaded evaluators: cheap checks first, then higher-fidelity simulation, proof, or real deployment evidence where needed (Section 6.1, p. 11). (4) Measure assurance over sequences of development and deployment rather than one pass/fail result (Section 6, p. 12).

Verus form. Inference: use fast Verus checking for local contracts, then targeted integration proofs and runtime checks for trusted boundaries. Rank escalation by consequence and model uncertainty, not by proof status alone.

Limits and product implications. The paper says formal methods “shift the gaps but do not close them” (Section 6, p. 12). Its Appendix A narrows the gaps when intent is authoritative, the world is bounded by a stable formal interface, or an existing implementation is a behavioral reference, but says formal proofs still cannot establish that R captures I or M captures W (Appendix A, pp. 18–19). Inference: VL should not redo generic claims that proofs guarantee deployed behavior; it should measure which assumptions and requirement changes survive real dependency and deployment changes. The threat to agent-written verified Rust is high for open-world behavior and lower for closed interfaces with explicit contracts.

## what is proved, trusted, and already done

The paper proves a conceptual decomposition, not a theorem about Verus or a statistical failure rate. Its examples and cited studies are evidence for possible gaps, while all claims about VL are inferences. Existing work already covers testing, contracts, static analysis, model checking, formal proofs, runtime monitoring, staged deployment, and assurance cases (Sections 7–8, pp. 15–17). VL should reuse these outer-loop controls and focus new work on connecting Verus assumptions to deployment evidence and stakeholder-approved requirements.

## techniques for the catalog

- two-gap diagnosis — compare formal requirements with stakeholder intent and environment models with real deployment conditions before trusting a proof
- assurance-revision loop — use deployment evidence and authorized human decisions to revise requirements, models, evaluators, and then rerun verification
- risk-calibrated evaluation — allocate human review and evaluator fidelity by consequence and uncertainty, using cascaded checks and exposure controls

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
