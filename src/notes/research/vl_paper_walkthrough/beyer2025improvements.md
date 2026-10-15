# Improvements in Software Verification and Witness Validation: SV-COMP 2025
(authored by agents unless marked 🧑)
Tag: `beyer2025improvements`, [paper](https://doi.org/10.1007/978-3-031-90660-2_9)

## benchmark and workflow
SV-COMP 2025 is a competition and reproducibility protocol for automatic software verifiers and witness validators. The abstract reports 62 verification tools and 18 validation tools, with 35 and 13 actively supported by teams. The verification track contains 33,353 C tasks over six properties, 674 Java assertion-validity tasks, and 673 Java runtime-exception demo tasks; validation additionally includes 103 handcrafted witnesses (Abstract, p. 151). The report says, “The validation track analyzed the witnesses generated in the verification track and newly also 103 handcrafted witnesses.” (Abstract, p. 151)

### technique 1: property- and category-indexed benchmark design
Use this when comparing tools across heterogeneous systems code. Define each task as a program, a property, and an expected result; define validation tasks as a program, property, and correctness or violation witness (§3, p. 154). For C, the properties include reachability, memory safety (valid dereference, free, and memtrack), memory cleanup, overflow, data races, and termination. Java uses assertion validity and runtime exceptions (§3).

Steps:
1. Partition tasks into base categories by language, program features, property, and source.
2. Aggregate base categories into meta categories such as Overall, FalsificationOverall, and JavaOverall.
3. Declare which witness formats (1.0 or 2.0) are supported for each property/category using the support matrix (Table 1, p. 157).
4. Publish benchmark definitions so tools can opt out of unsupported categories.
5. Record void tasks and empty categories explicitly; the 2025 score formula excludes void tasks from denominators (§3.2).

The paper’s objective is “establish a repository of software-verification tasks that is publicly available for free use as a standard benchmark suite for evaluating verification software.” (Introduction, p. 152)

Verus form (Inference): build a Rust/Verus task matrix by property (memory safety, functional contracts, concurrency, crash recovery), data structure, and environment assumptions. Keep the exact contract and expected result with each task. Verus does not emit SV-COMP witness formats automatically; a separate adapter would be needed.

### technique 2: witness-producing verification followed by independent validation
A verifier returns `True` when it claims the property holds and `False` when it claims a violation. A true result is accompanied by a correctness witness and a false result by a violation witness when the format supports it (§3.3, pp. 156–157). C witnesses are first checked by WitnessLint for syntactic validity; suitable validators then confirm or refute each witness. A correctness witness is confirmed by `True`; a violation witness by `False` (§3.3).

Steps:
1. Run each verifier on every task in its declared categories under fixed resource limits.
2. Require a witness for supported property/category combinations.
3. Lint C witnesses; reject syntactically invalid witnesses before semantic validation.
4. Run all suitable validators on each validation task.
5. Treat a result as correct only when it agrees with the expected result and a required witness is confirmed.
6. For tasks without an expected result, use validator voting only when at least two validators solve it and at least 75% agree; otherwise mark the task void (§3.4, p. 159).

Verus form (Inference): treat a Verus proof artifact as a correctness witness and build an independent checker that replays the proof or checks a stable serialized certificate. Keep the verifier and validator separate so a shared bug is less likely to produce confirmation. A Verus proof alone does not validate external-library or environment assumptions.

### technique 3: adversarial scoring and resource control
SV-COMP scores correctness and penalizes unsound answers. Table 2 assigns +2 to a true correct result, −32 to a true incorrect result, +1 to a false correct result, and −16 to a false incorrect result (p. 158). A result is “correct” only if it agrees with the expected result and its required witness is confirmed. Meta-category scores normalize each contained category by its task count and then by the average category size (§3.4).

The experiment controls each verifier to 15 GB memory and 15 minutes cumulative CPU on four processing units; validators receive 7 GB and 1.5 minutes for violation witnesses or 15 minutes for correctness witnesses (§3.3). BenchExec measures resources and BenchCloud distributes and cleans runs. These controls make results reproducible and prevent an unbounded timeout budget from becoming an unreported advantage.

Verus form (Inference): report proof success, false alarms, and unsound certificates with explicit denominators and resource budgets. A VL benchmark should apply a large penalty to a proof that validates a false contract, and should separate timeout from failure. The score should not reward weakening the contract.

## results and boundaries
One complete verifier execution made 942,284 verification runs and consumed 2,312 CPU-days; witness validation made 21.8 million runs and consumed 2,573 CPU-days (§5, p. 169). The conclusion reports 34,700 total C and Java verification tasks and says, “However, even the best verification and validation tools still produce some incorrect results.” (Conclusion, p. 175). Witness format 2.0 adoption improved, but support remains property- and category-specific; many validation outcomes are determined by voting, so wrong confirmations and refutations need interpretation.

What is measured is tool behavior on the published task set under fixed hardware, limits, scoring, and witness protocols. The competition does not prove that a tool is sound on arbitrary programs, that a validated witness captures a product requirement, or that C/Java results transfer to Rust/Verus. The expected result, benchmark definitions, witness parser, validators, and hardware remain trusted infrastructure.

Inference: SV-COMP is directly useful to VeruLaw as a benchmark design rather than as a proof technique. VL should preserve the separation between generation and independent validation, publish reproducible task archives, include crafted counterexamples, and score unsound proofs far more harshly than timeouts. The remaining threat to agent-written verified Rust is an incorrectly stated contract or trusted adapter: a high score can coexist with a product property that was never encoded.

## techniques for the catalog
- indexed verification benchmark: organize tasks by language, property, feature, and category with explicit expected results
- independent witness validation: require a separate validator to confirm correctness or violation certificates after verifier execution
- reproducible scoring and budgets: fix hardware limits, penalize wrong proofs heavily, and normalize category scores by declared denominators
Checked 2026-10-15 against paper beyer2025improvements: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
