# ESBMC-PLC: Formal Verification of IEC 61131-3 Ladder Diagram Programs Using SMT-Based Model Checking
(authored by agents unless marked 🧑)
Tag: `dantas2026esbmcplc`, [paper](https://doi.org/10.48550/arxiv.2606.15461)

## system and guarantees

ESBMC-PLC is an open-source frontend that accepts IEC 61131-3 Ladder Diagram (LD) programs in PLCopen XML, translates them to ESBMC's GOTO intermediate representation, injects YAML safety properties, and checks them with SMT-based bounded model checking (BMC) or k-induction. The paper's abstract reports 13 benchmarks, 8 bugs with actionable counterexamples, 7 unbounded safety proofs by k-induction, and all runs under 60 ms on Apple Silicon. These are the authors' measurements; the paper later reports a 300-second timeout and median of three repetitions for the full benchmark protocol.

Inference: the architecture transfers to VeruLaw when a Rust program has a cyclic or state-machine model and properties can be compiled to assertions. The transfer is an inference because ESBMC-PLC verifies a translated PLC model, whereas Verus verifies supported Rust/specification code.

## technique: five-stage translation pipeline

The implementation is an ESBMC frontend with an `ENABLE_LD_FRONTEND=On` build and an `ld-verify` wrapper. The method (§7.1, p. 8) is operational:

1. parse PLCopen XML into an in-memory rung graph
2. parse the YAML property file into a property set
3. translate the rung graph to ESBMC GOTO-IR, including the scan-cycle loop
4. compile properties into `assert()` and `assume()` statements in that IR
5. run ESBMC with incremental BMC or k-induction and Z3

The parser reconstructs graphical topology through `refLocalId` edges and accepts textual and graphical PLCopen XML without manual edits (§7.2, p. 8). IEC types map to smallest C equivalents: BOOL to `bool`, SINT to `int8_t`, INT to `int16_t`, DINT to `int32_t`, LINT to `int64_t`, UINT to `uint16_t`, UDINT to `uint32_t`, REAL to `float`, LREAL to `double`, and TIME to a 32-bit millisecond integer (Table 5, p. 8).

Verus form. Inference: define a Rust parser that produces a typed rung/state representation, then a specification function that maps each property to a predicate over that representation. Use `requires` and `ensures` on translation functions, and prove local translation lemmas in `proof fn`s. Keep the parser's external format and any unverified parser code explicitly trusted. Unlike ESBMC's GOTO backend, Verus does not provide an LD frontend; implementing one is new work.

## technique: model cyclic execution with nondeterministic inputs

The central semantic choice is an unbounded scan loop. “The PLC scan cycle is encoded as a GOTO-program loop body called repeatedly from a while(true) top-level loop.” (Scan-Cycle Encoding, §7.3.2, p. 9.) Inputs are re-sampled nondeterministically every iteration; output coils and marker bits persist across iterations; rung logic executes inside `plc_cycle`; properties become assertions. Listing 1's shape is:

```c
static bool Q_OUT1 = false;
static bool M_AUX = false;
void plc_cycle(void) {
    bool I_IN1 = __ESBMC_nondet_bool();
    bool I_IN2 = __ESBMC_nondet_bool();
    /* translated rungs and assertions */
}
int main(void) { while (1) { plc_cycle(); } }
```

The nondeterministic oracle models every sensor reading at every scan, so the checker explores all reachable states rather than one recorded trace. Persistent state captures outputs and memory that remain until rewritten. An unbounded loop enables induction over all future scan counts. Parallel rungs writing one coil are logically OR-combined; a concrete re-execution must not simply take the last assignment. OTL/OTU latches use set-priority semantics, and CTU counters increment only on a rising edge; both details prevent incorrect safety verdicts (§7.3.2–7.3.3, pp. 9–10).

Verus form. Inference: represent persistent PLC state as a Rust struct and a transition function `next(state, input)`. State invariants are `invariant` clauses on loops that repeatedly apply `next`; input unconstrainedness is a `requires`/quantification condition. Prove that each rung transition preserves the invariant in a `proof fn`. `old` values in `ensures` can relate pre-state and post-state; they are specification expressions, not runtime calls. Verus does not automatically quantify all hardware inputs, so the agent must state the input domain precisely.

## technique: property language that compiles to safety checks

The YAML language avoids requiring automation engineers to write temporal logic. It supports five kinds (§7.4, p. 11): `mutual_exclusion` (a set of variables never all true), `invariant` (an expression true every scan), `absence` (an expression never true), `response` (a response within N scans of a trigger), and `reachability` (an expression is reachable). A response and reachability property requires a `justification` field to document its timing assumption. Listing 3 specifies, for example, mutual exclusion of forward/reverse motors, an emergency-stop invariant, and a one-scan response:

```yaml
- id: P3
  kind: response
  trigger: "Emergency_Stop"
  response: "!Motor"
  max_scans: 1
  justification: "Immediate stop required by IEC 62061 clause 6.7.4"
```

The backend compiles mutual exclusion, invariant, and absence to state invariants. It compiles `response(trigger, expr, max_scans=N)` to the safety invariant that after every trigger, `expr` holds within the next N scans. Reachability remains a bounded BMC query (§7.5.1, p. 12).

Verus form. Inference: map each YAML property to a Rust predicate over a state and, for response, a bounded history or countdown field. Encode the safety claim in `ensures` for a transition or in an `invariant` over a loop. A reachability claim should remain explicitly bounded; a successful bounded proof does not imply an unbounded theorem. Require a textual justification as metadata outside the proof, since Verus cannot determine whether the timing requirement is the right one.

## technique: choose BMC or k-induction by purpose

ESBMC's incremental BMC explores increasing unwind depths until finding a counterexample or exhausting a bound. The paper recommends it for expected violations because it finds bugs without a manual unwind bound. `--k-induction --unlimited-k-steps` combines a base case with an inductive step for invariant-class properties and proves them for all input sequences and scan counts when induction converges. Reachability always uses incremental BMC and therefore has a bounded guarantee. Standard invocations are:

```text
ld-verify program.ld --ld-props props.yaml --incremental-bmc
ld-verify program.ld --ld-props props.yaml --k-induction --unlimited-k-steps
```

The tool returns CI-friendly codes: 0 SAFE, 10 VIOLATION with a counterexample, 1 UNKNOWN, and 2 ERROR. “When ESBMC reports a violation, the counterexample trace uses the original LD variable names from the PLCopen XML file (not mangled IR names).” (Counterexample Presentation, §7.5.2, p. 12.) It identifies the scan cycle and violated property, making a trace actionable to an engineer.

Verus form. Inference: use Verus loop invariants for the inductive step and explicit preconditions for the base state. BMC-like bounded exploration can be an external test harness that runs the Rust transition function over generated inputs; it is evidence, not a Verus proof. Preserve source-level variable names in diagnostics so repair agents can connect a failed assertion to the original requirement.

## evidence from the benchmark

The benchmark contains 13 programs and 61 properties across six domains: three original examples, six synthetic unsafe/safe pairs, and four vendor programs. Runs used Apple M-series ARM64, 16 GB RAM, macOS 26, ESBMC v7.6.0, Z3 4.13.0, a 300-second timeout, and three repetitions with median reporting (Tables 8–9, pp. 13–14). The abstract's headline counts are eight bugs found with actionable counterexamples and seven unbounded safety proofs; the denominator is the 13-program benchmark, while 61 is the number of properties.

Concrete examples show why unbounded state matters. Motor interlock proves three properties by k-induction at k=2 in 0.05 s. Conveyor sequencing finds a timer-reset defect: after emergency stop release, a previously accumulated timer enables indexing; adding a normally-closed emergency-stop contact fixes it. Elevator verification finds a one-scan race where `Motor_Up=1` but `Motor_Running=0` before later rungs execute, allowing a door to open in the motor's start scan. These are model findings; the paper does not claim that every physical PLC implementation has exactly these semantics.

## trust boundaries and contradictions

The claimed soundness depends on the LD-to-GOTO translation, the modeled scan semantics, SMT solver behavior, and the property specification. The paper states that rung rules follow an existing LD formalization but “no formal equivalence proof exists” for those rules (§7.3.3, p. 10). Timer presets are scan cycles, not milliseconds; users must convert `T#5s` at a 10 ms scan period to 500 cycles, with at most one scan period of rounding error (§7.3.4, p. 10). A model can therefore prove the translated program while the translation or timing assumption is wrong. The abstract says all runs completed under 60 ms, while the evaluation protocol allows 300 seconds; these refer to different aggregate conditions and should not be conflated.

Inference: for agent-written verified Rust, the threat is medium. A typed property language, explicit transition model, counterexamples, and induction strategy are directly useful. The main untrusted surface moves to the translator, specification author, external libraries, and hardware assumptions. Verus's `external_body` contracts and unsupported Rust remain trusted assumptions; a proof of the wrong transition function does not prove the PLC or product. VL should not redo the basic BMC/k-induction split or the five-stage frontend pattern. A useful next experiment is a verified translation relation between a Rust state machine and the source control language, including timer-unit and latch semantics.

## techniques for the catalog

- LD-to-IR frontend: parse PLCopen XML, build a rung graph, translate to an intermediate representation, inject properties, and invoke an SMT checker
- nondeterministic scan-cycle model: re-sample inputs each scan while preserving coil and memory state in an unbounded loop
- YAML safety properties: express mutual exclusion, invariants, absence, bounded response, and reachability with explicit timing justification
- BMC and k-induction: use incremental bounded search for counterexamples and induction for unbounded invariant proofs
- source-level counterexamples: report original LD names, scan cycles, and violated properties so fixes are actionable
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
