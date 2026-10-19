# ESBMC-PLC: Formal Verification of IEC 61131-3 Ladder Diagram Programs Using SMT-Based Model Checking
(authored by agents unless marked 🧑)
Tag: `dantas2026esbmcplc`, [paper](https://arxiv.org/abs/2606.15461)

## system and guarantees

ESBMC-PLC is an open-source frontend that accepts IEC 61131-3 Ladder Diagram (LD) programs in PLCopen XML, translates them to ESBMC's GOTO intermediate representation, injects YAML safety properties, and checks them with SMT-based bounded model checking (BMC) or k-induction. The paper's abstract reports 13 benchmarks, 8 bugs with actionable counterexamples, 7 unbounded safety proofs by k-induction, and all runs under 60 ms on Apple Silicon. These are the authors' reported results, qualified by the graphical-conversion limitation in §11.1 (p. 21), discussed below. The experimental protocol uses a 300-second timeout and the median of three repetitions (§8.3, pp. 13–14).

Inference: the architecture transfers to VeruLaw when a Rust program has a cyclic or state-machine model and properties can be compiled to assertions. The transfer is an inference because ESBMC-PLC verifies a translated PLC model, whereas Verus verifies supported Rust/specification code.

## technique: five-stage translation pipeline

The implementation is an ESBMC frontend with an `ENABLE_LD_FRONTEND=On` build and an `ld-verify` wrapper. The method (§7.1, p. 8) is operational:

1. parse PLCopen XML into an in-memory rung graph
2. parse the YAML property file into a property set
3. translate the rung graph to ESBMC GOTO-IR, including the scan-cycle loop
4. compile properties into `assert()` and `assume()` statements in that IR
5. run ESBMC with incremental BMC or k-induction and Z3

Section 7.2 (p. 9) describes reconstruction of graphical topology through `refLocalId` edges. However, §11.1 (p. 21) says graphical parsing does not yet produce rung assignments. Table 5 (p. 9) maps BOOL to `bool`, SINT/INT/DINT/LINT to signed 8/16/32/64-bit integers, UINT/UDINT to unsigned 16/32-bit integers, and TIME to `uint32_t`. Although that table also lists REAL and LREAL mappings, §§1.2 and 9.4 and Table 16 (pp. 3, 18–19) explicitly exclude REAL/FLOAT support. Timer presets use scan counts despite the table's millisecond label (§7.3.4, p. 11).

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

Nondeterministic inputs model arbitrary sensor sequences; BMC explores only its bound, while convergent k-induction can establish invariants for all scan counts (§7.5, p. 12). Persistent state retains outputs and memory until rewritten. The paper claims that sequential assignments to one coil are OR-combined by symbolic execution, and requires the concrete interpreter to OR-combine them (§7.3.2, p. 10). Inference: this needs independent validation because ordinary sequential assignments retain the last value; an interpreter modified to OR-combine them does not establish equivalence with that assignment behavior. The stated translation rules also require set-priority OTL/OTU latches and rising-edge CTU increments (§7.3.3, pp. 10–11).

Verus form. Inference: represent persistent PLC state as a Rust struct and a transition function `next(state, input)`. State invariants are `invariant` clauses on loops that repeatedly apply `next`; input unconstrainedness is a `requires`/quantification condition. Prove that each rung transition preserves the invariant in a `proof fn`. `old` values in `ensures` can relate pre-state and post-state; they are specification expressions, not runtime calls. Verus does not automatically quantify all hardware inputs, so the agent must state the input domain precisely.

## technique: property language that compiles to safety checks

The YAML language avoids requiring automation engineers to write temporal logic. It supports five kinds (§7.4, p. 11): `mutual_exclusion` (a set of variables never all true), `invariant` (an expression true every scan), `absence` (an expression never true), `response` (a response within N scans of a trigger), and `reachability` (an expression is reachable). A response and reachability property requires a `justification` field to document its timing assumption. Listing 3 (p. 12) specifies, for example, mutual exclusion of forward/reverse motors, an emergency-stop invariant, and a one-scan response:

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

ESBMC's incremental BMC explores increasing unwind depths until finding a counterexample or exhausting a bound. The paper recommends it for expected violations because it finds bugs without a manual unwind bound. `--k-induction --unlimited-k-steps` combines a base case with an inductive step for invariant-class properties and proves them for all input sequences and scan counts when induction converges. Reachability always uses incremental BMC and therefore has a bounded guarantee. The commands described in §7.5 (p. 12), with the proof option normalized from its typesetting, are:

```text
ld-verify program.ld --ld-props props.yaml --incremental-bmc
ld-verify program.ld --ld-props props.yaml --k-induction --unlimited-k-steps
```

The tool returns CI-friendly codes: 0 SAFE, 10 VIOLATION with a counterexample, 1 UNKNOWN, and 2 ERROR. “When ESBMC reports a violation, the counterexample trace uses the original LD variable names from the PLCopen XML file (not mangled IR names).” (Counterexample Presentation, §7.5.2, p. 12.) It identifies the scan cycle and violated property, making a trace actionable to an engineer.

Verus form. Inference: use Verus loop invariants for the inductive step and explicit preconditions for the base state. BMC-like bounded exploration can be an external test harness that runs the Rust transition function over generated inputs; it is evidence, not a Verus proof. Preserve source-level variable names in diagnostics so repair agents can connect a failed assertion to the original requirement.

## evidence from the benchmark

The paper reports 13 programs, 61 properties, and six domains: three original examples, six synthetic programs in three unsafe/safe pairs, and four vendor-derived programs (Table 8, p. 13). The latter comprise two CONTROLLINO programs and two variants derived from the MathWorks tank-level example (§8.6, p. 15). Runs used Apple M-series ARM64 (8 cores), 16 GB RAM, macOS 26, ESBMC v7.6.0, Z3 4.13.0, a 300-second timeout, and three repetitions with median reporting (Table 9, p. 14). Table 10 (p. 16) reports 13/13 correct classifications, seven SAFE outcomes at k=2, six VIOLATION outcomes at k=1, zero false positives/negatives, and runtimes of 0.03–0.05 s. Inference: the listed property counts in Tables 8 and 10 sum to 62, conflicting with their stated total of 61. Table 11 (p. 16) counts eight bugs: six initial findings and two additional defects found during fix-verification runs. The graphical-format limitation prevents treating all seven SAFE outcomes as genuine safety proofs.

The reported examples illustrate persistent state and rung ordering (§§8.4–8.5, pp. 14–15). Motor interlock proves three properties by k-induction at k=2 in 0.05 s. Conveyor sequencing finds a timer-reset defect: after emergency stop release, a previously accumulated timer enables indexing; adding a normally-closed emergency-stop contact fixes it. Elevator verification finds a one-scan race where `Motor_Up=1` but `Motor_Running=0` before later rungs execute, allowing a door to open in the motor's start scan. Inference: these examples motivate careful state modeling; they do not establish translation correctness.

## trust boundaries and contradictions

The paper states that its rung rules follow an existing LD formalization but “no formal equivalence proof exists” (§7.3.3, p. 10). Timer presets count scans, not milliseconds: `T#5s` at a 10 ms scan period becomes 500 cycles (§7.3.4, p. 11). That section bounds rounding error by one scan period. Inference: a verified model can misrepresent the source program or its timing. The reported sub-60 ms runtimes and the 300-second timeout are compatible: one is an observed runtime, the other a run limit.

The strongest qualification appears in §11.1 (p. 21): “As a result, the GOTO IR for water_control and stairs_light contains only property assertions over zero-initialized variables, making the verification trivially safe rather than genuinely sound.” This contradicts treating CS10 and CS11 as successful vendor-program safety proofs in §8.6, Table 10, and the headline seven-proof count.

The conformance experiment covers four safe textual-format benchmarks, with 50 random sequences of 10 scans each: 2,000 scans total, seed 42, zero property violations (Table 12 and §8.9.2, p. 17). The two graphical benchmarks are excluded. Its input generator constrains tank sensors never to be simultaneously true, whereas the SMT model finds the tank defect under simultaneous sensor activation (§8.6, p. 15). Inference: checking properties of a re-executed IR on constrained random traces is limited evidence; it is not a source-versus-translation equivalence test or a check of arbitrary sensor faults. Section 8.9.1's wording about every benchmark is narrower in Table 12 and §11 (pp. 16–17, 21).

Inference: for agent-written verified Rust, the threat is medium. A typed property language, explicit transition model, counterexamples, and induction strategy are directly useful. The main untrusted surface moves to the translator, specification author, external libraries, and hardware assumptions. Verus's `external_body` contracts and unsupported Rust remain trusted assumptions; a proof of the wrong transition function does not prove the PLC or product. VL should not redo the basic BMC/k-induction split or the five-stage frontend pattern. A useful next experiment is a verified translation relation between a Rust state machine and the source control language, including timer-unit and latch semantics.

## techniques for the catalog

- LD-to-IR frontend: parse PLCopen XML, build a rung graph, translate to an intermediate representation, inject properties, and invoke an SMT checker
- nondeterministic scan-cycle model: re-sample inputs each scan while preserving coil and memory state in an unbounded loop
- YAML safety properties: express mutual exclusion, invariants, absence, bounded response, and reachability with explicit timing justification
- BMC and k-induction: use incremental bounded search for counterexamples and induction for unbounded invariant proofs
- source-level counterexamples: report original LD names, scan cycles, and violated properties so fixes are actionable
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "When ESBMC reports a violation, the counterexample trace uses the original LD variable names from the PLCopen XML file (not mangled IR names)."): checked the full paper, quotations, counts, section/page references, translation steps, property guarantees, and experimental limitations; corrected page references and synthetic-pair counts, distinguished proposed type mappings from supported types, and added the graphical-conversion, property-total, and conformance-test qualifications; did not run ESBMC-PLC, inspect its implementation or artifact, or independently validate Verus transfer proposals.
