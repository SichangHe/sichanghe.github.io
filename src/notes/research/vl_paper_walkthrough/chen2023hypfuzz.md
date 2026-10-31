# HyPFuzz: Formal-Assisted Processor Fuzzing
(authored by agents unless marked 🧑)
Tag: `chen2023hypfuzz`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/chen-chen)

## scope and result
HyPFuzz combines hardware formal verification with processor fuzzing. JasperGold generates input assignments that reach hard-to-cover RTL coverage points; a converter turns those assignments into ISA instruction seeds; a fuzzer mutates the seeds and checks architectural mismatches against a golden model. The paper reports five open-source processors, all 11 vulnerabilities previously found by TheHuzz, and three new vulnerabilities (§5.5, p. 1371). Its abstract states, “HyPFuzz detected all the vulnerabilities detected by the most recent processor fuzzer and found three new vulnerabilities that were missed by previous extensive fuzzing and formal verification.” Inference: this workflow tests processor behavior; it does not prove that the processor satisfies its ISA.

## technique 1: cover properties as reachability witnesses
What it is: JasperGold accepts SystemVerilog Assertion (SVA) cover properties. A cover property asks for one path from an initial DUT state to a state satisfying a target expression, unlike an assert property that must hold on all paths. The paper says formal tools can “efficiently verify larger DUTs since the tools only need to find the existence of one path that satisfies the property” (§2.1, p. 1363).

How to apply it: (1) instrument RTL with coverage points; (2) select an uncovered point; (3) generate an SVA cover property for the point; (4) run JasperGold with a time limit; (5) classify the result as unreachable, reachable, or undetermined; (6) when reachable, export Boolean input assignments for every clock cycle. Inference: the assignments describe a witness path, not a universal proof; this can expose state-space regions that random mutation struggles to reach, without requiring the formal engine to enumerate all paths to the target.

Verus form: Inference: the corresponding Rust technique is a ghost reachability lemma over a transition relation, with `requires` for reset and input constraints and `ensures` that a witness sequence reaches a target state. A Verus lemma can validate a supplied witness, but it does not replace the symbolic search performed by JasperGold; keep the witness generator outside the verified kernel unless it is separately verified.

Evidence and limits: JasperGold uses SAT/BDD-based engines (§2.1, p. 1363). On CVA6, the formal-only workflow reached 94.51% branch coverage after eight days; the time per point includes formal verification and simulation of the converted test case (§3.3, pp. 1364–1365). An undetermined property means no path was found within the time limit, not unreachable behavior. Inference: these results do not establish complete coverage.

## technique 2: dynamic scheduler from coverage rates
HyPFuzz switches from fuzzing to the formal tool when the recent fuzzing coverage rate falls below the estimated formal rate. The formal tool runs until it generates assignments reaching the selected point (§4.3, pp. 1366–1367); §5.1 also imposes a per-property time limit. The formal rate uses accumulated results: r_fml=|C|/Σt_fml(c), where C is the set of formally verified points. The fuzzer rate is new points over runtime in a rolling window w. The paper states, “The scheduler computes r_fuzz and r_fml in real-time” (§4.3, p. 1367).

How to apply it: (1) maintain recent fuzzer cases and their new-coverage counts; (2) compute r_fuzz over a rolling window; (3) maintain cumulative formal points and their solve times; (4) run fuzzing while r_fuzz≥r_fml; (5) switch to formal when r_fuzz<r_fml; (6) return to fuzzing when the formal witness is converted. The authors choose w=100 after evaluating the tradeoff (§5.2, p. 1370).

Verus form: Inference: prove arithmetic invariants for a scheduler state: rate denominators are positive when division occurs, cumulative coverage never decreases, and switching preserves the target-point set. Use `requires` for positive elapsed time and `ensures` for rate-update bounds; do not treat empirical rate estimates as a functional-correctness theorem.

Evidence and limits: On CVA6, accumulated formal rate converged after about 24 switches, with the subsequent mean difference from the final rate under 5% (§5.2, p. 1370). Inference: this measured convergence does not establish a probabilistic guarantee for other designs or point distributions.

## technique 3: coverage-point selection
The authors select points at module level using three strategies. BotTop chooses modules far from DUT inputs; MaxUncovd chooses modules with the most uncovered points; ModDep chooses modules that drive more logic. RandSel is the baseline. The paper records the observations motivating these strategies (§4.4, p. 1367).

How to apply it: (1) rank modules by distance from inputs for BotTop, current uncovered-point count for MaxUncovd, or fanout cone of influence (the logic driven by module outputs) for ModDep; (2) choose a prioritized module and randomly select an uncovered point within it, or use RandSel to select an uncovered point directly at random; (3) recompute module priorities on each selection for MaxUncovd; (4) generate a cover property; (5) use its witness as a seed and measure neighboring coverage. HyPFuzz chooses MaxUncovd for later experiments because it is fastest on four of five processors (§5.3, p. 1370).

Verus form: Inference: point selection is a heuristic, not a proof obligation. Verify only data-structure properties such as no duplicate point removal and preservation of the uncovered set. Use a pure `spec fn` for score computation and `proof fn` lemmas for ordering; keep randomized selection explicit.

Evidence and limits: The four selection strategies differ by less than 0.5% coverage on each processor except CVA6, where the difference is 1.31%; MaxUncovd is fastest except on OR1200, where RandSel is fastest (§5.3, p. 1370). Inference: these five-processor, 72-hour experiments do not establish optimality.

## technique 4: convert formal assignments into executable seeds
The formal tool emits per-cycle Boolean assignments, while processor fuzzers consume binary programs. HyPFuzz parses RTL conditions, generates a cover property, obtains assignments, then maps instruction signals through the processor ISA to a sequence of instructions. The executable contains INIT, TEST, and EXIT instruction sequences (§3.4, p. 1365; §4.5–§4.6, pp. 1368–1369).

How to apply it: (1) identify instruction-related signals in the assignments and extract their values from the initial state to the target state; (2) map these values to an instruction sequence using the DUT’s ISA; (3) create an executable template with initialization, NOP-filled TEST, and termination sequences; (4) locate TEST from its disassembly and replace its NOPs with the extracted instructions; (5) simulate and mutate the seed; (6) compare architectural states, including GPRs, CSRs, committed instructions, and exceptions, with a golden reference model. The paper uses Spike for RISC-V and or1ksim for OpenRISC (§3.4, p. 1365; §5.5, p. 1371).

Verus form: Inference: verify the converter’s parser and ISA encoder with `ensures` that decoding(encoding(i))=i for valid instructions. Prove that initialization establishes the simulator precondition and that the generated sequence is finite. The RTL-to-ISA correspondence and golden model remain external assumptions.

Evidence and limits: HyPFuzz obtains 94.78% CVA6 coverage in 72 hours and reaches JasperGold’s 94.51% in 50.71 hours (§3.4, p. 1366). Across five processors and the same 72-hour budget it achieves 1.72% more coverage than TheHuzz and 11.68× faster coverage (§5.4, p. 1370). These aggregate results cover five processors; coverage percentages here refer to branch coverage. The authors report three new CVA6 vulnerabilities; V2 and V3 resulted in CVE-2022-33021 and CVE-2022-33023 (§5.5, p. 1371). Inference: these differential-testing results do not prove the absence of other vulnerabilities.

## what is proved, measured, and trusted
Formal-engine results: selected cover properties can be reachable, unreachable, or undetermined; reachable results include Boolean witness assignments (§2.1, p. 1363). Measured: coverage, scheduler rates, fuzzing speed, and differential mismatches. Each experiment ran for 72 hours and was repeated three times (§5.1, pp. 1369–1370). Inference: the workflow relies on JasperGold/SAT/BDD semantics, RTL instrumentation, converter correctness, ISA specifications, simulators, and golden models. Inference: agent-written verified Rust is threatened mainly at the boundary between specification and implementation: high coverage and differential agreement do not prove absence of bugs, and an incorrect golden model can make every result misleading.

## techniques for the catalog
- cover reachability: turn uncovered RTL behavior into a formal path witness
- rate scheduler: switch between formal solving and fuzzing using rolling coverage rates
- point selection: prioritize deep, uncovered, or dependency-heavy modules
- witness conversion: map per-cycle Boolean assignments into ISA instruction seeds
- differential checking: compare DUT architectural state with an ISA golden model
