# EquivSVA: A Formally Verified Dataset of Behavioral Assertions Across Equivalent RTL Implementations
(authored by agents unless marked 🧑)
Tag: `gupta2026equivsva`, [paper](https://doi.org/10.48550/arxiv.2609.26751)

## what the paper teaches

EquivSVA is a dataset construction and validation method for testing whether generated SystemVerilog Assertions (SVA) express interface behavior or merely fit one RTL implementation. The unit is a behavior family: one machine-readable specification, four structurally different reference RTLs intended to have identical external behavior, shared interface-level gold properties, three behavior-changing mutants, and formal evidence. The authors state, “The core design decision in EquivSVA is to organize data around behavior rather than around isolated RTL files” (Section 3.1, p. 2).

The released v2.0 corpus has 120 families in 12 categories, 480 reference RTLs, 914 gold properties, and 360 mutants. The 12 categories each have ten families; the paper explicitly warns that this balance is not an estimate of industrial frequency (Sections 3.2 and 11, pp. 3, 7).

## technique: specification-driven equivalent implementations

What it is. Start from a machine-readable behavior specification and generate four RTL implementations with controlled structural differences. Variations include state encodings, case versus nested conditionals, factored logic, sequential versus ternary updates, and function-oriented updates. Gold properties mention interface signals only, so they can be checked on every variant.

Steps from the paper.

1. Define behavior `B` in machine-readable form and choose a category generator (FSM, single-register rule, or multi-register rule) (Sections 3.1 and 4.1, pp. 2, 3–4).
2. Emit four implementation styles from the same specification; for FSMs use canonical case, one-hot, nested conditional, and factored forms where appropriate (Section 4.1, p. 4).
3. Write shared properties over externally observable interface signals, avoiding implementation-specific state names (Section 3.3, p. 3).
4. Formally check each alternate implementation against the canonical implementation under the common clock/reset harness (Section 5, p. 4).

The paper's timer example loads `remaining` to seven, decrements on `tick` while nonzero, and asserts `expired` exactly at zero. Its SVA includes `load |=> (remaining == 3'd7);` and `expired == (remaining == (3'd0))` (Section 3.4, p. 3). The paper says, “These examples are interface-level: neither property depends on a particular state encoding, helper signal, or internal register name that differs among the four reference implementations” (Section 3.4, p. 3).

Inference: For Verus, the analogous artifact is a behavior family of Rust implementations with shared public contracts (`requires`, `ensures`, and loop `invariant` clauses) and implementation-specific private state. Verus does not prove RTL equivalence, so a Rust family would need relational specifications or per-implementation proofs plus a common observable model. This mapping is an inference, not a technique claimed by the paper.

## technique: controlled mutants and mutation distinguishability

What it is. Each family gets three localized mutants that intentionally change behavior: dropped transitions, forced exits, ignored conditions, missing updates, altered clear/enable behavior, or incorrect saturation. Mutants are test instruments, not a sample of all industrial bugs.

Steps from the paper.

1. Select a mutation operator fitting the family structure (Section 4.2, p. 4).
2. Generate three behavior-changing mutant RTLs from each family (Sections 3.1 and 4.2, pp. 2, 4).
3. Run each mutant against the family gold-property harness in bounded model-checking mode (Section 5, p. 4).
4. Require an expected assertion failure; count a mutant as passing validation only if at least one gold property produces a counterexample (Section 5, p. 4).

Inference: A Verus analogue is to inject localized changes into verified Rust and require at least one contract to fail. Verus's proof checker supplies counterexamples or failed obligations rather than SVA assertion failures, so the harness and failure metric must change.

## technique: fixed formal-validation suite

Every final family passes 17 jobs: three RTL-equivalence jobs, four gold-property proof jobs, four reachability/cover jobs, three mutant-distinguishability jobs, and three gold-property-on-mutant jobs. The paper reports 360/360 equivalence, 480/480 proof, 480/480 cover, 360/360 distinguishability, and 360/360 mutant checks, totaling 2,040/2,040 jobs (Table 3, p. 5). It clarifies that a job can contain multiple assertions and that 480 proof jobs collectively prove all 914 properties on four implementations; job count is not property count (Section 5, p. 4).

The released flow uses Yosys and SymbiYosys infrastructure, SMT back ends including Bitwuzla, and ABC/PDR for some multi-register equivalence checks (Section 5, p. 4). Validation assumes reset first and then unconstrained inputs; equivalence therefore means equality under the encoded synchronous clock/reset harness (Section 5, p. 4).

Inference: VL can copy the separation between equivalence, contract proofs, reachability, and mutant checks when evaluating agent-written Verus. The trusted base remains the Verus toolchain, solver, harness, and specification; the paper's RTL tools do not establish Rust soundness.

## technique: family-safe splits and robustness metrics

All four variants of a family stay in one split, preventing leakage of an implementation into training while an equivalent implementation appears in test (Section 6, p. 5). Each category contributes six train, two development, and two test families: 72/120 train, 24/120 development, and 24/120 test families (Table 4, p. 5). The public release includes manifests, generators, validation scripts, task export, inference and evaluator code, and case-study results (Section 6, p. 5).

The Qwen2.5-Coder-7B case study uses the 24-family, 96-RTL test split with greedy decoding and interface-only prompts. Of 371 extracted assertions, 357 were supported by lowering and 293 were interface-only; 93/293 (31.7%) were formally sound. Syntax-valid tasks were 68/96 (70.8%), tasks with at least one sound property 45/96 (46.9%), families sound on all four RTLs 8/24 (33.3%), and variant-sensitive families 14/24 (58.3%) (Table 5 and Section 7, p. 6). Mutation detection found 16/279 property-mutant checks (5.7%) covering 11/72 unique test mutants (15.3%). Raw prompt-format compliance was 0/96, so syntax validity was measured after extraction and normalization (Section 7, p. 6).

The paper defines soundness as `|Ppass|/|Pint|` and family sensitivity as an indicator that the four per-variant sound counts are not all equal (Section 7, p. 6). Inference: these denominators should be mandatory in VL evaluations; reporting only a percentage would hide whether it is per proof, task, family, or mutant.

## what is proved, trusted, and limited

Formal validation proves the generated RTL variants agree under the harness, gold properties hold on each reference, covers are reachable, and mutants violate at least one property. It does not prove that the machine-readable specification captures all desired behavior, that generated variants represent industrial code, or that controlled mutants represent real defect distributions. The authors state, “Formal equivalence establishes behavioral agreement under the harness assumptions, but generated variants can still share stylistic regularities not representative of independently authored RTL” (Section 10, p. 7).

The corpus emphasizes small control logic and next-cycle implications/invariants: 131 invariants and 783 next-cycle implications among 914 properties (Section 3.3, p. 3). It omits comprehensive large datapaths, caches, coherency, deeply pipelined arithmetic, full protocol stacks, and richer liveness. The Qwen study is a single-model demonstration, not a leaderboard (Sections 8.2 and 10, pp. 6–7).

Inference: The main threat to a Verus product is evaluation leakage and implementation overfitting: an agent can produce a contract that proves one Rust representation while failing on an equivalent representation or a small semantic mutation. EquivSVA's family grouping, fixed split, and mutant harness directly expose that risk. VL should reuse these controls before claiming that generated proofs capture behavior. VL should not redo a one-implementation benchmark or report soundness without denominators.

## techniques for the catalog

- behavior-family generation — derive multiple structurally different implementations and shared interface properties from one machine-readable behavior
- formal family validation — require equivalence, property proofs, covers, mutant distinguishability, and expected mutant failures
- controlled mutation testing — inject localized semantic changes and measure counterexample detection
- family-safe evaluation splits — keep all equivalent implementations of a behavior in one train, development, or test split
- implementation-robustness metrics — compare sound-property counts across variants with explicit task, family, and mutant denominators
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
