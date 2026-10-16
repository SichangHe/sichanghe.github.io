# The reach of a verification tool decides its value: A controlled study of verification surface, artifact quality, and cost in AI coding agents
(authored by agents unless marked 🧑)
Tag: `mehta2026reach`, [paper](http://arxiv.org/abs/2608.28795v2)

## question and contribution

Mehta isolates the tool surface of a coding agent: six models receive identical prompts and specifications while the available checking tools change. The corpus is 1,116 web applications, seven application specifications, and eight configurations. The paper's central claim is explicitly bounded: “A verification tool improves the output artifact only where its reach covers the way the application actually fails.” The outcomes are launch survival, API-probed behavior, human interface score, token cost, and variance; the artifact, rather than the agent transcript, is graded.

The design keeps prompt text, environment briefing, task text, and model-task pairing fixed; each run's assembled prompt is fingerprinted. The conditions are no_verification, static (linter/type checker), boot_check, execution (unrestricted shell), visual (shell plus screenshot), visual_no_shell, delayed_verification (shell unlocked after finish), and behavioral (a command to run tests written by the model). This is a controlled comparison, not evidence that these exact tools dominate all coding workflows.

## technique: match observation to failure

what it is and when to use it

Choose a checker whose observable signal can expose the failure class you care about. A boot probe observes whether the server listens, so it addresses launch failures. A screenshot observes pixels, so it can expose layout and placement errors. A still image cannot expose scrolling latency. Use the paper's negative control to reject a tool that cannot see the target failure.

how the paper does it

1. Write each application specification with acceptance criteria aimed at a named failure family (Section II-B). The log explorer requires smooth scrolling over 100,000 rows; calendar and dashboard target geometry; API tasks target races, restart persistence, and convergence.
2. Provide a ladder of capabilities while keeping the prompt and task unchanged (Sections II-A and II-F).
3. Pair targeted configurations only with tasks they can measure. `visual_no_shell` is run on visually hard tasks and on the log explorer as a negative control; `behavioral` is run on seat-booking because tests can exercise race and expiry behavior (Section II-F).
4. Compare within each model-task cell, then take a run-weighted mean across cells. The six primary contrasts use 10,000 stratified permutations and Holm correction; 95% intervals use 5,000 stratified bootstrap rebuilds (Section III).

The paper reports: “A photo of a laggy list and a photo of a smooth one look the same.” Its log-explorer visual-versus-execution contrast is −2.17 human points, 95% CI [−12.50, +7.33], permutation p=.8571 (Table III), supporting the planned negative control. On visually hard tasks, pooled human scores are 72.8 (no tool), 89.5 (boot probe), 89.2 (shell), and 96.1 (screenshots); visual versus execution is +6.88, CI [+0.83,+13.41], but Holm-corrected p=.0826, so P4 is not supported (Table II and Figure 3).

Verus form (inference)

Inference: model a server component with a `spec fn` describing an abstract state and an executable Rust transition with `ensures` connecting the returned state to that specification. Use `assert` and proof lemmas for invariants; use `invariant` as a loop invariant declaration inside a `while` loop, not as a function call. A boot probe's process-start fact remains an external assumption in Verus unless the process model and OS contract are formalized. A screenshot and pixel-layout judgment are outside the usual Verus functional model; encode only measurable layout predicates or API behavior. The paper's reach principle therefore becomes a Verus modeling rule: prove the property represented by the contract, and separately validate that the contract observes the product failure.

## technique: start with the cheapest useful check

what it is and when to use it

Add a one-bit boot check before paying for a general shell. It installs dependencies, starts the server, and reports whether it listens. Use it when startup failures are common and the check's signal reaches those failures.

how it works and evidence

The five core conditions contain 192 runs each for no_verification, static, boot_check, and execution; visual has 174. Survival is 166/192 (86.5%) with no tools, 162/192 (84.4%) static, 191/192 (99.5%) boot_check, 190/192 (99.0%) execution, and 173/174 (99.4%) visual (Figure 1). The primary boot effect is +0.13 survival, CI [+0.10,+0.16], corrected p=.0006 (Table II). The paper states: “A single boot probe removes nearly all of these failures at roughly 35 percent of a full shell's token cost.” Functional means on the API-probed applications are 81.9, 78.3, 91.7, 94.2, and 92.6 for those same conditions. Execution adds only +2.41 over boot_check, CI [−0.38,+5.21], p=.1427 (secondary S1, Table III).

Inference: in Verus, a boot check can be represented as a trusted boundary predicate such as `ensures result == true ==> server_state.listening`; proving the predicate requires a model of startup, dependencies, and the environment. It does not prove UI or concurrency properties that the probe never exercises.

## technique: separate granted capability from use and cost

The authors grade by assigned condition (intention-to-treat) even if a model ignores a tool. They record every tool call, token count, and prompt hash. They expose passive screenshots through Playwright so each observation is countable and does not mix looking with clicking. A full shell costs 2.35 times the no-tools token cost; the boot probe is cheaper than every other condition. This prevents attributing quality to only runs that chose to verify. The paper cautions: “Granting a screenshot tool, or any other tool, does not guarantee that a model will use it.”

Inference: VL should log capability grants, actual calls, observed feedback, and repair actions separately. A Verus proof's trusted assumptions and erased proof code should likewise be listed separately from executable checks; a successful proof does not establish that the specification captures visual or deployment failures.

## what is proved, trusted, and left open

The evidence supports these controlled comparisons: execution versus no_verification functional score +12.26 (CI [+7.04,+17.47], Holm p=.0006); boot survival +13 percentage points; and increased token cost, execution minus no_verification log tokens +0.80 (CI [+0.73,+0.87], Holm p=.0006). Static versus no_verification is −3.60 functional points (CI [−11.36,+3.61], p=.3886), a null result. Behavioral self-authored tests versus execution is −16.07 (CI [−31.67,−1.70], p=.0425 uncorrected secondary S5), so parity is not shown. The six-model and seven-task sample, passive screenshots, fixed applications, and human grading limit generalization. The authors report 45/1,116 builds (4%) with a wiring problem; 5 of 10 frontend parse-error cases occurred in the static condition, showing that granting a linter did not ensure repeated use or repair.

Inference: threat to a product that lets agents write verified Rust is moderate. A capability ladder can remove build failures and target specific contract-visible defects, but Verus cannot automatically observe deployment, pixels, timing, or unspecified behavior. VL should map each intended guarantee to an executable or proof-visible observation, measure cost and non-use, and retain negative controls for failures that a checker cannot reach. Existing work has already measured shell, boot, screenshot, linter, delayed, and self-test surfaces; VL should not repeat a generic “more tools help” experiment without a new failure class or proof obligation.

## techniques for the catalog

- failure-matched verification surface — choose a checker whose observable signal reaches the product failure, and include a negative-control task where it cannot
- boot-probe-first ladder — measure a one-bit startup check before paying for a full shell, preserving within-model comparisons and token denominators
- intention-to-treat tool evaluation — score assigned capabilities while logging actual use, feedback, repair, and cost separately
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
