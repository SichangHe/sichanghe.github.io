# Reliable Reasoning with Large Language Models via Preference-Based Maximum Satisfiability
(authored by agents unless marked 🧑)
Tag: `orvalho2026reliable`, [paper](https://www.semanticscholar.org/paper/293a57fc62960672d0136a5e8c48fa8edf214748)

## paper's problem and contribution
The paper studies preference-aware optimisation from natural-language problem descriptions. Its abstract states: “Large Language Models (LLMs) excel at understanding natural language but struggle with optimisation tasks involving multiple constraints and user-defined preferences, which commonly arise in domains such as robotics.” (§Abstract, PDF p. 1). The proposed division of labour is that an LLM interprets the description and emits Python, while a weighted partial MaxSAT solver performs exact optimisation. The abstract describes the core construction: “Given a natural language problem description, an LLM generates Python code that encodes user-defined constraints and preferences as a preference-based Maximum Satisfiability (MaxSAT) problem, which is then solved by an exact MaxSAT solver.” (§Abstract, PDF p. 1)

The paper evaluates three families: maximum independent set (MIS), scheduling, and set cover. Each family has 25 instances and four preference variants, giving 300 instances (§5.2, PDF p. 6). The acceptance metric requires both feasibility and optimality under a canonical encoding: “A solution is counted as accepted if and only if it satisfies all hard constraints and achieves an optimal objective value under the canonical encoding.” (§5.4, PDF p. 8)

## technique 1: translate natural language into weighted partial MaxSAT

what it is

The model represents mandatory requirements as hard CNF clauses and user preferences as weighted soft clauses. In weighted partial MaxSAT, every soft clause has a weight and the objective is to minimise the weight of falsified soft clauses (§3, PDF p. 4). The paper's example uses variables, hard clauses, soft clauses, and weights to distinguish a feasible but cost-1 assignment from a feasible but cost-3 assignment (§3, PDF p. 4)

when to use it

Use this technique when a task has Boolean or Boolean-encodable decisions, mandatory constraints, and a weighted preference objective. The evaluated scheduling example has one start time per job, non-overlap, precedence, and weighted deadlines (§2, PDF pp. 2–3)

how to do it

1. Extract decision variables from the natural-language description (§4.2, PDF p. 4)
2. Encode each mandatory condition as a hard clause (§4.2, PDF p. 4). The implementation must ensure that all hard clauses are satisfiable
3. Encode each preference as a weighted soft clause; a violated clause contributes its weight to the objective (§4.2, PDF p. 4)
4. Build a weighted CNF with the PySAT `WCNF` API and call the RC2 solver. The paper gives the solver contract: “The call rc2.compute() returns the model (a list of integer literals).” (Appendix A.2, PDF p. 13)
5. Read the returned signed literals as the assignment and `rc2.cost` as the sum of falsified soft-clause weights (Appendix A.2, PDF p. 13)
6. Emit the required JSON solution schema (§4.2 and Appendix A.3, PDF pp. 5, 14)

what transfers to Verus

Inference: In Verus, a Rust implementation can represent the assignment and objective with executable functions, and `spec fn` definitions can state the mathematical interpretation of each hard and soft constraint. A `proof fn` can establish that the returned assignment satisfies a predicate and has no larger cost than a specified optimum, using `requires` and `ensures`; this is a translation of the paper's post-solver checking idea, not a technique evaluated by the paper. Inference: The MaxSAT solver itself would remain an external trusted component unless its result is reimplemented or checked by a Verus proof; Verus can prove properties of a checker and of the encoding, but it does not automatically prove that natural language was encoded with the user's intended meaning

evidence and limits

The strongest overall evidence is Table 1 (§5.4, PDF p. 7). Acceptance is the fraction of 25 instances per family and model across all four preference variants. For example, GPT-5.5 with MaxSAT and planning accepts 51% (about 13 of 25) on MIS, 56% (14 of 25) on scheduling, and 82% (about 21 of 25) on set cover; the table caption identifies these as “acceptance rate (%)”. Direct-answer is 0% for every model on MIS and scheduling, while set-cover direct-answer ranges from 14% to 34% (§5.4, PDF p. 7). Inference: these are benchmark results rather than a guarantee for arbitrary user specifications

The authors explicitly limit the guarantee: “In practical settings, the MaxSAT solver guarantees optimality only with respect to the constraints and preferences encoded by the LLM.” (§B, PDF p. 16). They also state that canonical encodings are offline evaluation references and are unavailable in deployment (§4.2, PDF p. 5; §B, PDF p. 16). Thus a solver proves the generated formula's optimum, while semantic translation remains exposed

## technique 2: independently verify feasibility and optimality against a canonical encoding

what it is

The evaluation constructs a second, canonical MaxSAT encoding for each instance. The generated program's solution is checked against that reference, allowing equivalent encodings and multiple optimal models. The paper says: “To ensure correctness, solutions returned by the model-generated code are independently verified for feasibility and optimality against a canonical MaxSAT encoding, allowing for different encodings and multiple optimal solutions.” (§Abstract, PDF p. 1)

how to do it

1. Construct a canonical encoding containing the intended hard clauses, weighted soft clauses, and an exact optimal solution (§5.2, PDF p. 6)
2. Execute the LLM-generated code and parse its assignment (§4.2, PDF p. 5)
3. Check feasibility by testing the assignment against every canonical hard clause (§4.2, PDF p. 5)
4. Check optimality by comparing its canonical objective value with the canonical optimum (§4.2, PDF p. 5)
5. Accept only assignments passing both checks; do not trust a model-reported objective (§5.4, PDF p. 8)

what transfers to Verus

Inference: This maps directly to a verified Rust checker: define a canonical specification predicate over an assignment, prove that the checker returns true only when all hard constraints hold, and compute the weighted cost in a ghost or specification function. Inference: The reference encoding is analogous to a trusted specification artifact, so it reduces implementation errors but cannot show that the specification captures a user's unstated intent

## technique 3: intermediate symbolic planning and bounded repair

what it is

Before code generation, the model may produce a structured plan of variables, hard constraints, soft preferences, objective, and output schema. The paper states: “Before generating code, the LLM is asked to produce a structured, symbolic description of the variables, constraints, and preferences.” (§4.2, PDF p. 4). If generated code fails to run or violates the output format, the controller returns an error and requests a revision for at most five attempts (§4.2, PDF p. 5; Appendix A.8, PDF p. 16)

how to do it

1. Give only the natural-language problem to the planning prompt (§Appendix A.1, PDF p. 13)
2. Require sections for variables, hard constraints, soft constraints/preferences, objective, and output schema (§Appendix A.1, PDF p. 13)
3. Pass the plan verbatim with the original description to the code-generation prompt (§Appendix A.3, PDF p. 14)
4. Execute the resulting program and return syntax, API, or output-format errors when present (§4.2, PDF p. 5)
5. Repeat correction up to five attempts or until a time limit (§4.2, PDF p. 5)

The measured planning effect is not uniform. For Gemini-3.1-Pro, planning changes acceptance from 36% to 56% on MIS, 44% to 59% on scheduling, and 79% to 87% on set cover; these are each over 25 instances per family (§5.4, Table 1, PDF p. 7). For Qwen3-Coder, planning changes scheduling from 22% to 4% and set cover from 49% to 29% (§5.4, Table 1, PDF p. 7). The authors attribute such regressions to error propagation (§5.4, PDF p. 8)

what transfers to Verus

Inference: A Verus workflow can mirror the plan/code separation by first writing a specification plan, then implementing executable Rust and proof functions, then compiling with Verus and feeding diagnostics into a bounded repair loop. Inference: Verus diagnostics are not the paper's feedback channel, and the paper provides no evidence that five proof-repair attempts suffice for Rust verification

## what is proved, measured, and trusted

The solver proves feasibility and optimality only for the generated MaxSAT encoding; the canonical checker measures correspondence to the benchmark reference. The paper's hardware and setup are NVIDIA A100-SXM4 80 GB, 256 GB RAM, RC2, and a five-minute limit (§5.1, PDF p. 6). Trusted elements include the LLM's semantic translation, PySAT/RC2, the canonical reference used for evaluation, and the benchmark annotations. The paper itself says real inputs may be ambiguous or inconsistent and may require clarification or human oversight (§B, PDF p. 16)

Inference: A product that lets an agent write verified Rust faces a similar semantic bottleneck: a successful proof can establish the encoded contract while the contract is wrong or incomplete. Inference: The paper therefore threatens the product's specification-generation and solver-orchestration layer more than Verus's proof kernel; it demonstrates a practical pattern for coupling generation to independent checking, but does not generate Rust proofs or establish memory safety

No numerical contradiction is apparent in Table 1: percentages are multiples of 4%, matching 25 instances per family. The abstract's “in some cases exceeding 80%” is consistent with the 82% and 87% entries (§Abstract, Table 1, PDF pp. 1, 7)

## techniques for the catalog

- weighted partial MaxSAT encoding — map hard constraints to hard clauses and weighted preferences to soft clauses, then solve with RC2
- canonical independent checking — test generated solutions for feasibility and optimality against a separate reference encoding
- intermediate symbolic planning — make the model list variables, constraints, preferences, objective, and output schema before code generation
- bounded execution-feedback repair — return runtime, API, and schema errors and allow up to five corrected generations

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
