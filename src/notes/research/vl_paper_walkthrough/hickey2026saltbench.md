# SaltBench: A Referee-Gated Protocol for Measuring Method Effects in Machine-Checked Software Work
(authored by agents unless marked 🧑)
Tag: `hickey2026saltbench`, [paper](http://arxiv.org/abs/2609.11076v3)

## purpose and scope

SaltBench is a protocol for measuring how a machine-checking method changes an agent's work. The paper studies a working seat, rather than treating the model's own account as evidence. Its central design rule is: “The outcome is decided by a machine referee the agent cannot argue with” (Section 1, p. 1). The referee may be a proof kernel, program verifier, or withheld test suite. The comparison is fixed before execution, and the paper separates a registered cost reading from a later correctness reading.

The v3 report uses five Rust systems components on a pinned Verus toolchain. The abstract reports that the five components were refereed by a withheld test suite and compares a plain arm with a salt-diet arm instructed to specify and verify its code. The abstract also warns that the reported premium is bounded to this population: “a bound of this population and not a promise about larger ones” (Abstract, p. 1). Inference: this bounded interpretation is essential when transferring SaltBench to a product that generates verified Rust.

## technique 1: referee outside the agent's toolchain

What it is. SaltBench makes an external machine referee the outcome authority. The agent cannot grade its own output, and the referee is run outside the agent's elaboration. The paper states: “An agent’s account of its own work is the least reliable evidence about that work.” (Section 1, p. 1).

When to use it. Use this arrangement when the method under test can influence logs, tests, proof scripts, or any other evidence used to claim success. The referee must consume a frozen artifact and produce a machine-readable result.

How to do it.

1. Freeze the implementation, requirements, arm instructions, and toolchain before a scored run (Sections 2.1 and 3.3, pp. 2, 7).
2. Keep the referee and withheld tests outside the agent's writable workspace. In SaltBench, the withheld test suite and mutant set are authored against the frozen systems components (Section 2.1, p. 2).
3. Have the referee build or check the submitted artifact and record its exit status and result line. The protocol says that a passing result requires exit 0 and a parseable results line (Section 3.1, p. 4).
4. Treat the referee's result, rather than the agent's narrative, as the outcome.

Verus form.

Evidence and limits. SaltBench reports a cost experiment in which “No cell of the run carried a correctness verdict at the time it was scored” (Section 4, p. 8). The later correctness pass is explicitly post hoc. Therefore the paper's cost result cannot establish that the method makes code more correct.

## technique 2: measure the isolation fence

What it is. The protocol probes whether the agent can reach network, reference solutions, harness files, or other hidden state before scoring. The paper says: “A wall probed before any scored run isolates the agent from the network, reference solutions and harness” (Abstract, p. 1).

When to use it. Use a pre-run probe when the agent has shell, filesystem, or network access and the benchmark's conclusion depends on isolation.

How to do it.

1. Run a probe before any scored condition. Do not include its result in the treatment outcome (Section 3.2, p. 6).
2. Test each layer through which information or execution could leak. SaltBench records a case where a deny list did not protect a deeper layer and a run root denied the agent its own episode directory (Section 6, pp. 23–24).
3. Record whether the probe reached the network, reference solutions, harness, or referee. If the fence fails, mark the condition rather than silently treating it as isolated.
4. Repeat the probe after changes to the wrapper, toolchain, or filesystem layout.

Verus form. Inference: the analogue is a harness-level isolation test that checks that candidate code cannot read the frozen contract library, mutate the referee crate, or invoke an unpinned Verus executable. Verus specifications cannot prove that the operating system enforced this boundary; retain the probe result and environment digest as trusted harness evidence.

Evidence and limits. The paper reports instrument findings showing why isolation must be measured, not assumed (Section 3.2, p. 6). It does not claim that one successful probe proves all future executions isolated.

## technique 3: pre-registration and dated freeze

What it is. SaltBench fixes the population, random seed where applicable, arm definitions, predictions, and adverse outcomes before running. “The dated freeze commit is the authorization.” (Section 3.3, p. 7).

When to use it. Use a freeze whenever researchers can choose which outcomes to report after seeing runs, or when a correctness reading is likely to be added later.

How to do it.

1. Commit the population rule and seed, arm byte contents, predictions, and adverse outcomes before the first run (Section 3.3, p. 7).
2. Run only the frozen cards and record each condition's status.
3. Append later changes as dated amendments. SaltBench calls its correctness reading “declared post hoc” and registers it after the verdicts existed (Sections 1 and 5.4, pp. 1, 31).
4. Keep the original registered reading unchanged when adding descriptive matrices.

Verus form. Inference: freeze the candidate task set, Verus version, standard-library assumptions, contract files, and scoring script in a commit. A later change to an `ensures` clause or to the withheld probes must be an amendment and a new run, never a silent repair of a failed proof.

Evidence and limits. The paper's pilot matrix has 200 conditions over four models, with 181 results of record, 16 inexpressible conditions, and 3 declared unreached at the cost cap (Abstract, p. 1). These denominators show why an unqualified success percentage is misleading.

## technique 4: budget stops and censoring

What it is. SaltBench defines a budget stop as a halt rather than a failure. The abstract says: “a budget stop is a halt, never a failure.”

When to use it. Use this rule when time, tokens, or dollars cap an agent run and a stopped run does not reveal whether the artifact would eventually pass.

How to do it.

1. Set the budget before the run and record the cap.
2. Stop at the cap and assign a censored or halted status.
3. Exclude the halt from a correctness denominator unless the protocol explicitly defines a separate estimand. SaltBench's post-hoc reading records 10 cells censored at a registered budget and 4 unscorable cells (Abstract, p. 1).
4. Report lower bounds or interval limits when a cap binds one arm more often than another (Sections 5.1–5.3, pp. 18–30).

Verus form.

Evidence and limits. The paper explains that a cap can bind the salt-diet arm more often and that bounded costs are lower bounds (Section 5.1, pp. 18–19). A bound based on surviving cells cannot support a population-wide cost ratio. Inference: this prevents a product claim such as “verification costs 2×” when the numerator is censored.

## technique 5: separate cost from correctness and preserve denominators

What it is. SaltBench first reads token, dollar, and wall-time costs, then performs a declared post-hoc correctness reading. The abstract reports 447 cells passing the withheld suite, 40 failing, 10 censored, 4 unscorable, and 42 read by condition. The paper says the reading is descriptive and “says nothing about whether the method makes code more or less correct” (Abstract, p. 1).

When to use it. Use separate estimands when a method changes both effort and the chance that an artifact passes a referee.

How to do it.

1. Define cost cells and correctness cells separately (Sections 4 and 5.4, pp. 8, 31).
2. State each denominator in the table caption or result sentence. SaltBench reports full passes as k/n per condition in Tables P1–P3 (Section 5.4, pp. 32–34).
3. Keep censored, void, declared, and unscorable cells out of denominators when the protocol says they do not carry the relevant verdict.
4. Compare arms only within the same model, problem, and treatment. SaltBench's registered sign test at k = 4 reached no verdict: 3 of 4, p = 0.3125 (Abstract, p. 1).

Verus form.

Evidence and limits. SaltBench's post-hoc pass-rate intervals lie wholly below plain on 8 greenfield and 5 brownfield rows and wholly above plain on 2 greenfield rows, but the paper calls this descriptive and gives no test of arm effect (Abstract, p. 1). Inference: these intervals are useful diagnostics, not evidence of a general treatment effect.

## what is proved, trusted, and left unresolved

The machine referee decides acceptance for the benchmark's frozen artifacts. The paper measures its authored population, its pinned toolchain, and its recorded conditions. It does not prove that salt-diet improves correctness or that the cost premium generalizes. The referee wrapper, operating-system fence, authored requirements, withheld suite, Verus implementation, and interpretation of censored cells remain trust boundaries.

## techniques for the catalog

- external machine referee — decide outcomes with a proof kernel, verifier, or withheld suite outside the agent's toolchain
- measured isolation fence — probe network, reference, harness, and referee boundaries before scored runs
- pre-registered freeze — commit population, arms, predictions, and adverse outcomes before execution
- budget censoring — treat caps as halts and report lower bounds rather than failures
- separated estimands — report cost and correctness with distinct cells and denominators
