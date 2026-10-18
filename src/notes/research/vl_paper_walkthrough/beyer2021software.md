# Software Verification: 10th Comparative Evaluation (SV-COMP 2021)
(authored by agents unless marked 🧑)
Tag: `beyer2021software`, [paper](https://doi.org/10.1007/978-3-030-72013-1_24)

## scope and result
SV-COMP 2021 is a reproducible comparative evaluation rather than a new verifier. It evaluates fully automatic C and Java verifiers, standardizes task and witness formats, validates results independently, and reports quality, time, energy, and error rates. The abstract gives the scale: "The competition was based on 15 201 verification tasks for C programs and 473 verification tasks for Java programs." (Abstract, p.401) There were 30 systems from 27 teams in 11 countries (Abstract, p.401).

The paper's reusable formal-verification techniques are benchmark construction, witness-based validation, resource-controlled execution, scoring with explicit denominators, and artifact publication. Inference: these are directly applicable to evaluating agent-written verified Rust, even though the task corpus is C and Java.

## technique: public benchmark and task/property separation

Use this when comparing verifiers or proof-producing agents. Steps from §§1–2 (pp.401–406):

1. Publish a repository of programs and a property specification for each task (§1 objectives 2–3, p.401–402; properties are files in `c/properties/`, §2, p.404)
2. Partition tasks into property categories such as reachability, memory safety, overflow, termination, and concurrency (§1–2)
3. Make all tasks known before verifier submissions; the paper calls this an open competition and says it is "necessary due to the complexity of the C language" (§2, p.402)
4. Define a procedure with benchmark submission, training, and evaluation phases (§2)
5. Version task definitions (format 2.0, §2, pp.403–404) and remove special helper semantics that confuse tool behavior (§2, pp.404–406)

SV-COMP 2021 increased C tasks from 11,052 to 15,201 and used 473 Java tasks (§2, p.404; Abstract, p.401). It removed `__VERIFIER_error` and `__VERIFIER_assume`, replacing them with ordinary C implementations such as `reach_error(); abort();` and `assume_cycle_if_not(p)` (§2, pp.404–406). The report explains why the old assume semantics conflicted with memory-cleanup and termination properties: a failing assume should not terminate the program for memory-cleanup but should terminate it for termination (§2, p.406).

Inference: for Verus, publish Rust source, the exact Verus specification, expected result (proved, counterexample, or unknown), and category labels such as memory safety, functional correctness, concurrency, and termination. Fix a versioned task corpus before agents are tuned (the paper's task sets are versioned as `svcomp21`, Table 3, p.408). Inference: avoid product-specific ghost helpers whose semantics differ across properties; use ordinary Rust or documented Verus APIs.

## technique: witness-producing verification and independent validation

Use this when a verifier's claim must be checked by a second implementation. Steps from §2 and §4 (pp.403, 415–416):

1. Require each verifier to emit a correctness or violation witness with its True or False result (§4)
2. Add a syntax linter; WitnessLint checks that a witness is a proper XML/GraphML file and has the required meta data, so validators can assume a syntactically valid witness (§2, p.403)
3. Run several validators on the witnesses; the paper uses six independently developed witness-based result validators (§2, p.403; §4, p.415)
4. Count a result as confirmed only when a validator accepts it; ignore validator answers when the witness is syntactically invalid (§2)
5. Report total, confirmed, and unconfirmed outcomes by verifier and result kind (§4, Table 11, p.415)

The paper states: "All SV-COMP verifiers are required to justify the result (True or False) by producing a verification witness (except for those categories for which no witness validator is available)." (§4, p.415) Seven validators were used: six witness-based validators and WitnessLint (§2, p.403; §4, p.415). Table 11 gives denominators per verifier and result kind; for CPAchecker, 5,992 True results had 5,646 confirmed (94.2%), while 4,357 False results had 4,189 confirmed (96.1%) (§4, Table 11, p.415).

Inference: a Verus pipeline should archive proof diagnostics, specifications, and a replayable verification command, then have an independent checker or clean environment replay the proof. A Verus proof artifact is not automatically an SV-COMP witness, so the witness format and validator must be designed for Rust. Inference: confirmation rates should be reported separately for proved and refuted properties, with the exact attempt denominator.

## technique: resource-controlled and reproducible execution

Use this when timing or energy comparisons matter. Steps from §3–§4 (pp.407, 409–411):

1. Run every verifier on a dedicated otherwise unloaded machine (§4, p.409)
2. Fix limits: eight processing units, 15 GB memory, and 15 minutes CPU time per verification run; validation gets two processing units, 7 GB, and 1.5 or 15 minutes depending on witness type (§4, p.409)
3. Measure CPU time, memory, and CPU energy with BenchExec and CPU Energy Meter (§4, pp.409–411)
4. Record runs, logs, witnesses, and hashes in public artifacts (§3, pp.407–408)
5. Execute each tool several times, including preruns, "to make sure no installation issues occur during the execution" (§4, p.411)

The complete verification execution had 163,177 verifier-task runs, 470 CPU-days, and 126 kWh without validation; validation added 961,919 runs and 274 CPU-days (§4, p.411). Including preruns, the infrastructure managed 1.33 million verification runs and 7.31 million validation runs (§4, p.411; the paper gives 4.16 and 3.84 CPU-years for these). These denominators are infrastructure runs, not unique tasks.

Inference: for agent-generated Verus Rust, record wall time and solver time separately, pin compiler, Verus, and dependency versions, and isolate each run. Apply timeouts and memory limits to both proof generation and proof replay. Inference: energy is useful for product cost, but a Rust benchmark must state whether solver subprocess energy is included.

## technique: scoring that penalizes unsound results

Use this when a single ranking must combine solved tasks and correctness. The SV-COMP 2021 schema gives +2 for a validator-confirmed True-correct result, +1 for a confirmed False-correct result, −16 for a false alarm, and −32 for a wrong proof; unknown or unconfirmed results score zero (Table 2, p.406). The paper notes: "Now score points are only assigned if the results got validated (or no validator was available)." (§2, p.407)

Steps: define the expected property, classify the verifier answer, require confirmation where available, assign the table's points, sum per category, normalize meta-categories, and use successful CPU time as a tie-breaker (§2, p.407). Report alternative rankings as well: Table 9 ranks Correct Verifiers by errors per score point and Green Verifiers by joules per score point (§4, pp.413–415). Inference: VL should publish separate quality, proof-cost, failure-rate, and energy rankings rather than hiding unsoundness behind aggregate pass counts.

## what is proved, trusted, and already done
SV-COMP proves or records only the tested property outcomes and confirmed witnesses under fixed resource limits. It trusts task specifications, expected labels, each verifier, each validator, BenchExec, the hardware energy meter, and the underlying language semantics. The report publishes repositories for tasks, definitions, tool-info modules, verifier archives, BenchExec, and witness format (Table 3, p.408), plus Zenodo artifacts for tasks, results, witnesses, and BenchExec (Table 4, p.408).

The paper reports that the top three C-Overall verifiers had fewer than 2 per mille wrong results and that the Java-Overall winners had no wrong answers (§4, Correct Verifiers, p.414). Table 8's Overall ranking is CPAchecker 12,217 points with 9,835 solved tasks and 18 false alarms (no wrong proofs), PeSCo 12,208 with 9,743 solved and 19 false alarms, and UAutomizer 11,769 with 5,980 solved, one false alarm and one wrong proof (§4, Table 8, p.413). The figures are category-specific and must not be generalized to Rust.

Inference: threat to a product of agent-written verified Rust is medium. The paper does not provide a Rust proof technique, but it makes unsoundness, reproducibility, independent replay, and denominator discipline unavoidable. VL should reuse witness validation, fixed-resource benchmarking, and artifact hashes; it should not redo the general competition protocol without adding Rust/Verus-specific task and witness semantics.

## techniques for the catalog

- versioned benchmark tasks — freeze programs, properties, categories, and task-format versions before evaluation
- witness linter — reject malformed proof artifacts before semantic validation
- independent witness validation — confirm verifier results with multiple replay tools and report denominators
- reproducible resource control — pin machines, limits, versions, logs, hashes, and energy measurement
- penalized scoring — reward confirmed results, penalize false alarms and wrong proofs, and score unknowns as zero
- alternative rankings — expose correctness rate and energy per score point alongside aggregate quality

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Each tool was executed several times, in order to make sure no installation issues occur during the execution."): read the whole paper text (references only skimmed); checked every quotation, number, table value (Tables 2, 8, 9, 11 against the PDF page image for Table 8), section and page reference, and technique step; changed the false-alarm/wrong-proof attribution in Table 8, page references for the assume semantics and the 2 per mille claim, the "freeze" and "linter before validators" wording that the paper does not state, the prerun step, and the link (DOI from the paper text); did not check the cited earlier reports or the competition web site.
