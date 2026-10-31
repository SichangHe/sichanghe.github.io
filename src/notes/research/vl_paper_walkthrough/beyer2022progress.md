# Progress on Software Verification: SV-COMP 2022
(authored by agents unless marked 🧑)
Tag: `beyer2022progress`, [paper](https://doi.org/10.1007/978-3-030-99527-0_20)

## scope
Beyer reports SV-COMP 2022, a comparative evaluation of automatic C and Java verifiers. The abstract gives the scale: “The competition consisted of 15 648 verification tasks for C programs and 586 verification tasks for Java programs.” (Abstract, p. 375). Inference: the report is a practical specification for reproducible verifier benchmarking, witness-based validation, resource accounting, and failure analysis.

## technique 1: fixed benchmark tasks and explicit property categories

The report defines the setup as follows: “SV-COMP is an open competition (also known as comparative evaluation), where all verification tasks are known before the submission of the participating verifiers, which is necessary due to the complexity of the C language.” (§2, p. 376).

What it is. SV-COMP publishes a task as a program and a property; the abstract names reachability, memory safety, overflows, and termination, and the category structure (Fig. 1, p. 379) also has ConcurrencySafety and SoftwareSystems, plus a new demonstration category on data-race detection (Abstract, p. 375; §1, p. 376; §2, pp. 378–379). Every task is known before submissions, which the paper calls “necessary due to the complexity of the C language” (§2, p. 376). Properties are in the directory c/properties/ of the benchmark repository (§2, p. 378).

How to use it. Inference: these steps are distilled from the report, not listed in it. (1) Maintain a versioned repository of programs and property files (the paper's repository is versioned svcomp22, Table 3, p. 381). (2) Partition tasks into categories and subcategories with explicit semantics. (3) Freeze the task set before evaluating tools. (4) Record opt-outs; the paper says opt-out from categories was done as described in an earlier report (§2, p. 380). (5) Publish the task definitions. SV-COMP 2022 grew from 15,201 to 15,648 C tasks and from 473 to 586 Java tasks (§1, p. 376).

Verus form. Inference: build a versioned corpus of Rust/Verus crates and task files, where each task names a function, contract, safety property, or bug-finding target. Keep functional correctness, memory safety, concurrency, and termination as separate categories. Freeze the corpus before an agent or verifier is scored. Rust compiler and Verus version must be part of the task definition because solver and language changes affect results.

Evidence and limits. The paper says the results “represent the the state of the art of what can be achieved with fully automatic software-verification tools on the given benchmark set” (§5, p. 387).

## technique 2: witness-based validation of verifier results

What it is. A verifier must justify True or False with a machine-readable witness, and independently developed validators replay that witness. SV-COMP 2022 used eleven validation tools, which Table 1 lists as ten validators plus the witness linter WitnessLint (§2, p. 377; Table 1, p. 378; §5, p. 394: “ten independently developed witness-based result validators and one witness linter”). Four validators were new in 2022 (§2, p. 377). The scoring table awards +2 for a True result and +1 for a False result only when a validator confirms the witness; wrong True and wrong False receive −32 and −16, respectively (Table 2, p. 378).

How to use it. Inference: these steps are distilled from the report. (1) Define a witness format for each property. (2) Require the verifier to emit a witness with its result. (3) Run independent validators, not only the producing verifier. (4) Run a syntax linter on every witness. (5) Score confirmed results separately from unknown and unconfirmed results. The text on p. 377 says the new validators cover violation witnesses in ConcurrencySafety-Main (Dartagnan), ReachSafety, MemSafety and NoOverflows (Symbiotic-Witch), and ReachSafety-Java (GWit, Wit4Java); correctness witnesses were validated with a 15 min CPU limit (§5, p. 387).

Evidence. Table 14 records totals and confirmation rates for the verifiers of category C-Overall. For example, 2ls had 2,394 True answers, of which 2,388 (99.7%) were confirmed, and 1,648 False answers, of which 1,363 (82.7%) were confirmed (§5, Table 14, p. 394). Symbiotic had 4,878 True answers with 4,798 confirmed (98.4%) and 4,081 False answers with 2,632 confirmed (64.5%) (same table). The denominator is each verifier's reported answers in that category, not all benchmark tasks.

Verus form. Inference: require a Verus proof artifact or verifier trace that a second process can check from the same source snapshot. For a safety bug, emit a concrete counterexample input and execution trace; for a proof, emit the checked Verus source, compiler version, and assumptions. A separate checker should rerun Verus or a small certificate checker and reject a result whose witness is malformed or does not establish the claimed contract.

Where it fails. The paper requires witnesses “except for those categories for which no result validator is available” (§5, p. 394), and Table 14 reports unconfirmed results. Inference: a witness format can be incomplete or validate only an abstraction; a “confirmed” result still depends on the validator's trusted implementation and the specification encoded in the task.

## technique 3: reproducible archives, containers, and resource control

The run budget is explicit: “Each verification run was limited to 8 processing units (cores), 15 GB of memory, and 15 min of CPU time.” (§5, p. 387).

What it is. SV-COMP publishes all major components: verification tasks, benchmark definitions, tool-info modules, verifier archives, BenchExec, and witness format (Table 3, p. 381). Artifacts are also deposited at Zenodo “to guarantee their long-term availability and immutability” (§2, p. 380; Table 4, p. 381). BenchExec measures and controls CPU time, memory, and CPU energy, and each run was executed on an otherwise unloaded, dedicated machine (§5, p. 389).

How to reproduce a run. The troubleshooting section gives a concrete sequence (§3, pp. 381–382). First submit a public verifier archive with a version string and a checked BenchExec interface. Then run it locally and on competition machines through CoVeriTeam or VerifierCloud. The paper's typical problems are missing log output, uninstalled dependencies (fixed by adding them to the definition file), hardware assumptions such as selecting a specific processing unit (investigated by running in the Docker image and remotely), and it also provides a Docker image and a list of installed packages. Finally inspect prerun results, validation outcomes, witness files, and witness-linter output; for a problem in a verification task, report to the jury by a merge request with a fix or an issue in the SV-Benchmarks repository.

The paper states: “SV-COMP results must be reproducible, and consequently, all major components are maintained in public version-control repositories.” (§2, p. 380). It also reports hard limits: each verification run had 8 cores, 15 GB memory, and 15 minutes CPU; violation-witness validation had 2 cores, 7 GB, and 1.5 minutes (§5, p. 387). Runs used 167 machines, each one otherwise unloaded, with one Intel Xeon E3-1230 v5 CPU and Ubuntu 20.04, while BenchExec measured CPU time, memory, and energy (§5, p. 389).

Verus form.

Evidence and scale. The regular evaluation comprised 309,081 verification runs, 937 CPU-days, and 249 kWh before validation. Witness validation added 1.43 million runs and 708 CPU-days; including preruns, the infrastructure reached 2.85 million verification and 16.3 million validation runs, totaling 19 and 11 CPU-years respectively (§5, pp. 389–391). Inference: validation was a large cost (708 CPU-days against 937 CPU-days for the verification runs, and 11 against 19 CPU-years including preruns), so it must be budgeted as a first-class operation; it was not larger than verification in CPU time.

## technique 4: scoring effectiveness, correctness, and efficiency separately

What it is. SV-COMP reports score, solved tasks, CPU time, CPU energy, unconfirmed tasks, false alarms, and wrong proofs. The scoring distinguishes True, False, Unknown, and incorrect answers (Table 2, p. 378). It also gives alternative rankings for low error rate and low energy (Table 12, p. 393).

How to use it. Inference: these steps are distilled from the report. (1) For every category, count correct results and validator-confirmed results. (2) Penalize incorrect answers more heavily than Unknown. (3) Measure CPU time and energy only over successfully solved tasks, as the text on Table 10 specifies (§5, p. 391). (4) Report score and raw counts together. (5) Add product-specific rankings, such as errors per score point or joules per score point.

Evidence. In the overall category, Symbiotic scored 12,249, CPAchecker 11,904, and UAutomizer 11,802 (Table 10, p. 390). The alternative ranking puts Goblint first for error rate with 1,951 points, 1,574 solved tasks, and zero wrong results; Symbiotic had 12,249 points, 7,430 solved, and three wrong results (Table 12, p. 393). The paper notes that all top three C-Overall verifiers had fewer than 2 per mille wrong results, while the worst error-per-score measure was 0.042 (§5, p. 393).

Verus form. Inference: report pass rate over named proof obligations, wrong-proof or unsound-specification findings, verification time, solver time, and energy. Treat Unknown or timeout separately from a failed proof. A proof that passes only after weakening `ensures` should be counted as a specification change, not a successful repair. Include denominators and category definitions with every percentage.

## technique 5: use a competition workflow to troubleshoot failures

The paper's workflow treats logs, dependencies, machine assumptions, and witnesses as observable causes rather than silently aggregating failures. Typical problems include missing packages, insufficient logs, and hardware assumptions (§3, pp. 381–382). Inference: this is directly applicable to agent-written verified Rust, where failures can arise from a changed Verus binary, solver version, crate feature, or undeclared external specification. Preserve the complete failure artifact so a maintainer can replay it.

## techniques for the catalog
- versioned benchmark tasks — freeze programs plus explicit properties in a public, reproducible task repository
- witness validation — require independently checked proof or violation witnesses and lint every artifact
- reproducible execution — pin archives, dependencies, machines, containers, logs, and resource limits
- multidimensional scoring — report correctness, unknowns, time, energy, and errors with task denominators
- troubleshooting workflow — reproduce locally and remotely, inspect logs and validators, and report benchmark defects through version control
