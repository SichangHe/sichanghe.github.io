# Progress on Software Verification: SV-COMP 2022
(authored by agents unless marked 🧑)
Tag: `beyer2022progress`, [paper](https://www.semanticscholar.org/paper/2122a73af4368baabd41875b07d86d32f830ec3d)

## scope
Beyer reports SV-COMP 2022, a comparative evaluation of automatic C and Java verifiers. The abstract gives the scale: “The competition consisted of 15 648 verification tasks for C programs and 586 verification tasks for Java programs.” (Abstract, p. 375). Inference: the report is a practical specification for reproducible verifier benchmarking, witness-based validation, resource accounting, and failure analysis.

Inference: SV-COMP does not prove that any verifier is sound for arbitrary Rust or Verus programs. Its methods can nevertheless define how VL should measure a verifier and how to require independently checkable evidence for each result.

## technique 1: fixed benchmark tasks and explicit property categories

The report defines the setup as follows: “The competition is an open competition (also known as comparative evaluation), where all verification tasks are known before the submission of the participating verifiers.” (§2, p. 376).

What it is. SV-COMP publishes a task as a program plus a property, with categories for reachability, memory safety, overflows, termination, and a demonstration category for data races (§1, p. 375; §2, pp. 377–379). Every task is known before submissions because C's complexity makes a closed benchmark necessary (§2, p. 376).

How to use it. (1) Maintain a versioned repository of programs and property files. (2) Partition tasks into categories and subcategories with explicit semantics. (3) Freeze the task set before evaluating tools. (4) Record opt-outs and category membership. (5) Publish the task definitions and expected-result metadata. SV-COMP 2022 grew from 15,201 to 15,648 C tasks and from 473 to 586 Java tasks (§1, p. 376).

Verus form. Inference: build a versioned corpus of Rust/Verus crates and task files, where each task names a function, contract, safety property, or bug-finding target. Keep functional correctness, memory safety, concurrency, and termination as separate categories. Freeze the corpus before an agent or verifier is scored. Rust compiler and Verus version must be part of the task definition because solver and language changes affect results.

Evidence and limits. The benchmark measures performance on the selected tasks, not all software. Inference: VL should report denominators per category and avoid claiming coverage of arbitrary Rust from a curated suite.

## technique 2: witness-based validation of verifier results

What it is. A verifier must justify True or False with a machine-readable witness, and independently developed validators replay that witness. SV-COMP 2022 used eleven validators and a witness linter (§2, pp. 377–378). The scoring table awards +2 for a True result and +1 for a False result only when a validator confirms the witness; wrong True and wrong False receive −32 and −16, respectively (Table 2, p. 378).

How to use it. (1) Define a witness format for each property. (2) Require the verifier to emit a witness with its result. (3) Run independent validators, not only the producing verifier. (4) Run a syntax linter on every witness. (5) Score confirmed results separately from unknown and unconfirmed results. The report lists validators for C violation witnesses, concurrency safety, memory safety, overflows, and Java reachability (Table 1, p. 378).

Evidence. Table 14 records totals and confirmation rates. For example, 2ls had 2,394 True answers, of which 2,388 (99.7%) were confirmed, and 1,648 False answers, of which 1,363 (82.7%) were confirmed (§5, Table 14, p. 394). Symbiotic had 4,878 True answers with 4,798 confirmed (98.4%) and 4,081 False answers with 2,632 confirmed (64.5%) (same table). The denominator is each verifier's reported answers in that category, not all benchmark tasks.

Verus form. Inference: require a Verus proof artifact or verifier trace that a second process can check from the same source snapshot. For a safety bug, emit a concrete counterexample input and execution trace; for a proof, emit the checked Verus source, compiler version, and assumptions. A separate checker should rerun Verus or a small certificate checker and reject a result whose witness is malformed or does not establish the claimed contract.

Where it fails. Some categories lacked a validator, and SV-COMP reports unconfirmed results. Inference: a witness format can be incomplete or validate only an abstraction; a “confirmed” result still depends on the validator's trusted implementation and the specification encoded in the task.

## technique 3: reproducible archives, containers, and resource control

The run budget is explicit: “Each verification run was limited to 8 processing units (cores), 15 GB of memory, and 15 min of CPU time.” (§5, p. 387).

What it is. SV-COMP publishes all major components: verification tasks, benchmark definitions, tool-info modules, verifier archives, BenchExec, and witness format (Table 3, p. 381). Artifacts are also deposited at Zenodo with immutable identifiers (Table 4, p. 381). BenchExec controls CPU time, memory, and energy on dedicated machines.

How to reproduce a run. The troubleshooting section gives a concrete sequence (§3, pp. 381–382). First submit a public verifier archive with a version string and a checked BenchExec interface. Then run it locally and on competition machines through CoVeriTeam or VerifierCloud. Ensure dependencies are declared, hardware assumptions are removed or documented, and logs expose what the verifier did. Finally inspect prerun results, validation outcomes, witness files, and witness-linter output; report benchmark defects through a repository merge request.

The paper states: “SV-COMP results must be reproducible, and consequently, all major components are maintained in public version-control repositories.” (§2, p. 380). It also reports hard limits: each verification run had 8 cores, 15 GB memory, and 15 minutes CPU; violation-witness validation had 2 cores, 7 GB, and 1.5 minutes (§5, p. 387). Runs used 167 otherwise unloaded machines with Intel Xeon E3-1230 v5 CPUs and Ubuntu 20.04, while BenchExec measured CPU time, memory, and energy (§5, pp. 389–390).

Verus form. Inference: package each VL task with the Rust toolchain, Verus commit, dependency lockfile, solver versions, generated proof source, and an invocation script. Run on dedicated workers with fixed CPU, memory, and wall-clock limits. Capture logs and solver seeds. Re-run locally and in a clean container before accepting a result. Record whether external specifications, `assume`, or `external_body` declarations are present.

Evidence and scale. The regular evaluation comprised 309,081 verification runs, 937 CPU-days, and 249 kWh before validation. Witness validation added 1.43 million runs and 708 CPU-days; including preruns, the infrastructure reached 2.85 million verification and 16.3 million validation runs, totaling 19 and 11 CPU-years respectively (§5, pp. 389–390). Inference: validation can cost more than the original verification and must be budgeted as a first-class product operation.

## technique 4: scoring effectiveness, correctness, and efficiency separately

What it is. SV-COMP reports score, solved tasks, CPU time, CPU energy, unconfirmed tasks, false alarms, and wrong proofs. The scoring distinguishes True, False, Unknown, and incorrect answers (Table 2, p. 378). It also gives alternative rankings for low error rate and low energy (Table 12, pp. 393–394).

How to use it. (1) For every category, count correct results and validator-confirmed results. (2) Penalize incorrect answers more heavily than Unknown. (3) Measure CPU time and energy only over successfully solved tasks, as Table 10 specifies (§5, p. 391). (4) Report score and raw counts together. (5) Add product-specific rankings, such as errors per score point or joules per score point.

Evidence. In the overall category, Symbiotic scored 12,249, CPAchecker 11,904, and UAutomizer 11,802 (Table 10, p. 391). The alternative ranking puts Goblint first for error rate with 1,951 points, 1,574 solved tasks, and zero wrong results; Symbiotic had 12,249 points, 7,430 solved, and three wrong results (Table 12, p. 393). The paper notes that all top three C-Overall verifiers had fewer than 2 per mille wrong results, while the worst error-per-score measure was 0.042 (§5, p. 393).

Verus form. Inference: report pass rate over named proof obligations, wrong-proof or unsound-specification findings, verification time, solver time, and energy. Treat Unknown or timeout separately from a failed proof. A proof that passes only after weakening `ensures` should be counted as a specification change, not a successful repair. Include denominators and category definitions with every percentage.

## technique 5: use a competition workflow to troubleshoot failures

The paper's workflow treats logs, dependencies, machine assumptions, and witnesses as observable causes rather than silently aggregating failures. Typical problems include missing packages, insufficient logs, and hardware assumptions (§3, pp. 381–382). Inference: this is directly applicable to agent-written verified Rust, where failures can arise from a changed Verus binary, solver version, crate feature, or undeclared external specification. Preserve the complete failure artifact so a maintainer can replay it.

## what is proved, trusted, and already done

The report establishes comparative measurements under its rules; it does not prove the semantic correctness of every validator or benchmark property. Trusted elements include task specifications, verifier implementations, witness formats, validators, BenchExec, compiler and solver behavior, and hardware measurements. Inference: VL must expose the same trust boundary. Existing SV-COMP already provides the benchmark, witness, reproducibility, and resource-accounting patterns; VL should adapt them to Verus rather than invent another opaque leaderboard. The threat to agent-written verified Rust is high if VL reports only “Verus completed” without checking specifications and artifacts, and lower when an independent checker replays a pinned source and witness. The remaining threat is specification error, unsupported Rust/FFI, and assumptions about libraries or hardware.

## techniques for the catalog
- versioned benchmark tasks — freeze programs plus explicit properties in a public, reproducible task repository
- witness validation — require independently checked proof or violation witnesses and lint every artifact
- reproducible execution — pin archives, dependencies, machines, containers, logs, and resource limits
- multidimensional scoring — report correctness, unknowns, time, energy, and errors with task denominators
- troubleshooting workflow — reproduce locally and remotely, inspect logs and validators, and report benchmark defects through version control

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
