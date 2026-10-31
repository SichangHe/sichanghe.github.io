# SpecFirst: Behavioral Specification Elicitation as a First-Class Step in Agent-Based Program Synthesis from Scratch
(authored by agents unless marked 🧑)
Tag: `chen2026specfirst`, [paper](https://arxiv.org/abs/2607.27167)

## problem and method

SpecFirst separates behavioral discovery from implementation. The target is a deterministic command-line program exposed through documentation (D) and an execute-only binary (B). A spec agent probes (B), records a structured `SPEC.md`, and then a code-synthesis agent receives (D), (B), and that artifact. The baseline, Direct-Synthesis, gives one agent (D) and (B) and lets it alternate probing and coding. The paper's motivation is that a long run loses discoveries and compounds early mistakes when no persistent specification exists. “We present S PEC F IRST, a two-stage framework that forces the specification elicitation before code synthesis.” (abstract, p. 1)

The study evaluates all 200 ProgramBench instances, four models (Qwen3.5-397B-A17B, Qwen3.6-35B-A3B, GPT-5.5-high, and GPT-5.4-mini), and the same mini-SWE-agent scaffold for both conditions. ProgramBench contains 248,853 hidden test functions across 200 tasks, with a median of 770 tests per task and average 79.7% line coverage (§IV-B). The primary score is the mean of per-instance fractions (k_p/n_p), where (k_p) is passed hidden tests and (n_p) is the instance's total; it therefore gives partial credit (§IV-C).

## technique 1: dedicated black-box elicitation

Inference: when to use it: use a separate elicitation phase when documentation omits edge cases, output formats, error behavior, or flag interactions, and a runnable reference is available. The paper's agent cannot inspect source and must learn through the normal interface.

Steps in the paper:

1. Give the spec agent documentation and an execute-only binary; initialize a behavioral skeleton from the documentation (§II-A, §III).
2. At every turn choose a probe, invoke the binary with arguments, flags, or stdin, and observe stdout, stderr, and exit status (§III-A).
3. Select probes adaptively from what has been learned. The paper names boundary probing (empty, maximum-length, special-character inputs), error-path elicitation (malformed input, missing arguments, conflicting flags), combinatorial flag testing, and output-format refinement (§III-A).
4. For interactive programs, use the provided terminal tooling to send keystrokes and capture screen state (§III-A).
5. Prohibit recovering the target source through registries, GitHub, or web search; binary introspection through disassemblers, tracers, or decompilers; and wrapping or shimming the provided binary. An automated judge inspects command history; a detected violation disqualifies the run and records zero (§III-B).
6. Terminate on self-declared completion, the 1,000-turn limit, or the six-hour limit, in that priority order. A prerequisite check rejects a submission without `SPEC.md` and asks the agent to write it, with at most eight rejections before failure (§III-D).

The specification agent's output must contain six named sections: Overview; Flags; Input & stdin; Output format; Error patterns; Edge cases (§III-C). “At each turn, the spec agent selects a probe, i.e., an invocation of B with arguments, flags, or stdin chosen from what it has inferred so far, and observes the run time results from triple channels (stdout, stderr, exit).” (§III-A, p. 3) SpecFirst's probing coverage is the union of instrumented lines reached by probes divided by all executable lines in (B), expressed as (|C_{probed}|/|C|\times100\%) (§IV-C).

Results support more exploration: coverage is 58.3–60.3% for SpecFirst versus 49.2–55.1% for Direct-Synthesis, a 9.4–18.5% relative improvement depending on model (Table V, §V-C). The spec agent alone covers 54.9–58.3%, while the synthesis agent covers 31.2–51.3%; the union adds only marginally beyond the spec agent (Table V). The denominator is executable lines of the corresponding binary, not hidden tests.

Inference: Verus form: use a reference implementation or executable oracle to elicit requirements before writing Rust proof code. Store the resulting behavioral contract in a reviewable specification file, then translate it into Verus `requires`, `ensures`, datatype invariants, and transition properties. Probing itself is testing and does not prove universal behavior; Verus proof must cover inputs beyond the probes. A Rust oracle can guide contract discovery, but its behavior must be independently judged before becoming a trusted specification.

## technique 2: persistent structured contract and context compression

Inference: when to use it: use a persistent artifact when the agent may run for many turns or when context compression can discard earlier findings. Pass the compact artifact to synthesis and discard verbose exploratory traces.

Steps in the paper:

1. Convert observations into the six-section `SPEC.md`, recording behavior rather than a raw transcript (§III-C).
2. Save the file outside the model's conversational context (§III).
3. Start a fresh code-synthesis context with (D), (B), and `SPEC.md`; discard the spec agent's reasoning and tool-call outputs (§III-E, §IV-F).
4. Allow the synthesis agent to probe (B) if it encounters an ambiguity or gap in the artifact (§III).
5. Write, test, and refine source code, then submit source and a build file. The evaluation harness builds the executable and scores it against hidden tests unavailable to the synthesis agent (§II-A, §IV-B).

The authors state that external storage means the artifact survives context growth and compression (§III). Their `gomplate` example records function namespaces, flags, and edge cases, including mutually exclusive `--in` and `--file`/`--input-dir` options (Listing 2, §V-A). The code-synthesis phase then has a stable map instead of relying on a turn-4 observation that may never be repeated.

Inference: Verus form: maintain a versioned contract file beside Rust code and require every generated function to cite the contract clauses it implements. Use small `spec fn` definitions and `requires`/`ensures` clauses as the machine-readable layer, with prose and examples for reviewers. Context compression can preserve contract statements while dropping exploratory chatter, but a human review must detect an incorrect or incomplete contract before proofs are accepted.

## technique 3: strict phase separation with an escape hatch

Inference: when to use it: use phase separation to prevent probing and implementation from competing for the same turn budget, but retain a controlled probe escape hatch for unresolved requirements. The paper's design intentionally prevents the usual probe-then-build loop from deciding that it knows enough too early.

Steps in the paper:

1. Run the spec agent until one of the explicit termination conditions fires (§III-D).
2. Launch the synthesis agent with the generated artifact and the same binary and documentation (§I, §III-E).
3. During synthesis, permit further probing if an ambiguity or gap is encountered in the specification (§III).
4. Track codebase size over normalized run progress to compare when implementation starts and how long it continues (§V-D).

Across all four models, SpecFirst improves mean test pass rate by 6.9–21.3% relative to Direct-Synthesis (Table II, §V-A). The raw means are 33.66→40.84% for Qwen3.5-397B-A17B, 27.51→31.40% for Qwen3.6-35B-A3B, 59.02→65.14% for GPT-5.5-high, and 39.09→41.78% for GPT-5.4-mini, each over 200 instances. Paired Wilcoxon tests report (p<0.01). Win/loss/tie counts are 130/58/12, 121/67/12, 150/38/12, and 119/69/12 respectively (Table II). The paper reports that code starts earlier and remains in a sustained building phase when a prior specification is present (Fig. 2, §V-D).

## technique 4: format and failure analysis

Inference: when to use it: use structured headings to make behavioral artifacts actionable, then inspect failures by separating omission, wrong description, insufficient precision, implementation faults, and environment noise.

The paper compares three formats on a random 50-instance subset using GPT-5.4-mini: freeform, OpenSpec with RFC 2119 requirement blocks and GIVEN/WHEN/THEN scenarios, and the six-section format. All improve over the no-spec baseline; pass rates are 55.9% baseline, 60.7% freeform, 61.7% OpenSpec, and 62.6% Sections (Table VI, §VII-B). The 50-instance subset is explicitly budget-limited and is not the 200-instance RQ1 evaluation.

For 50 sampled failing cases, manual labels are F1 spec omission 10%, F2 wrong description 4%, F3 inaccurate description 26%, F4 execution fault 52%, and F5 environment-dependent error 8% (§VII-A). These percentages sum to 100% of the sampled failures. “The dominant failure mode (F4, 52%) indicates that closing the remaining gap requires stronger execution-stage reasoning (e.g., better instruction following, self-consistency checking against Spec.md, and test-driven repair loops), rather than improvements to spec elicitation alone.” (§VII-A, p. 10)

Inference: Verus form: classify failed verified-Rust generations similarly. Distinguish missing requirements, wrong contracts, underspecified contracts, implementation/proof defects, and build or dependency faults. A passing proof belongs to the implementation category only after a reviewer checks the contract. This taxonomy directs repair effort toward contract elicitation or proof/code repair instead of indiscriminately adding lemmas.

## cost, trust, and boundaries

SpecFirst costs more API work because it adds an inference phase. Mean per-instance totals increase 48–130% over Direct-Synthesis: $3.79 vs $2.56 for Qwen3.5-397B-A17B, $3.17 vs $2.03 for Qwen3.6-35B-A3B, $0.53 vs $0.35 for GPT-5.4-mini, and $5.85 vs $2.54 for GPT-5.5-high (Table VII, §VII-C). The evaluation uses deterministic command-line programs, one scaffold, and four models, so results may not generalize to nondeterministic, graphical, or multi-process systems (§VII-D). All baseline runs terminated voluntarily before the 1,000-turn cap, so the paper argues that extra budget alone would not explain the gains (§VII-D).

The paper's failure analysis shows that `SPEC.md` can omit or misstate behavior (§VII-A). Inference: hidden tests measure agreement on tested inputs, not universal semantic equivalence. “There is no semantic oracle for specification completeness: no external judge can assess whether SPEC.md captures all of P’s observable behavior.” (§III-D, p. 5)

## techniques for the catalog

- black-box behavioral elicitation: probe a reference executable through stdout, stderr, and exit status using targeted edge-case classes
- persistent structured specification: externalize observations in a six-section artifact and pass only the distilled contract to synthesis
- phase-separated synthesis: complete elicitation before implementation while allowing targeted probes for unresolved gaps
- specification format comparison: evaluate freeform and requirement templates with the same agent and benchmark conditions
- failure taxonomy: separate omission, wrong or inaccurate contracts, execution faults, and environment-dependent failures
