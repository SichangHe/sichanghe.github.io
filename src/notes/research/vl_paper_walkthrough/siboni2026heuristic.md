# LLM-Driven Heuristic Synthesis for Industrial Process Control: Lessons from Hot Steel Rolling
(authored by agents unless marked 🧑)
Tag: `siboni2026heuristic`, [paper](https://arxiv.org/abs/2603.20537)

## what the paper measures

The paper studies Gemini 2.5 Pro generating readable Python controllers for a PyRoll hot-steel simulator. A controller receives a ten-dimensional physical state and an action mask, and chooses height reduction, interpass time, and rolling velocity. The search has 52 independent runs and 730 iterations in total (mean 14.0, range 1–30), with eight feedback scenarios; a held-out grid has 81 scenarios (Sections 2–3, pp. 1–2). The authors call this a case study, not a comprehensive comparison.

The four-step search is strategic ideation (three natural-language proposals), idea selection, executable implementation, and evaluation with per-component feedback; compile/runtime failures get up to three repair attempts (Section 2.2, p. 2). The feedback reports reward, step count, completion, final-state errors, reward components, and action-mask violations. Exploration, refinement, and radical-exploration modes react to whether an incumbent exists and whether progress stagnates.

The hand-coded baseline scores 41.0 mean reward on the eight search scenarios with 100% completion and 46.7 on the 81-case grid; its mean thickness error is 0.04 mm, grain-size error 7.8 μm, temperature error 38.8 K, and it has four violations (three force, one torque) across 81 cases (Section 4.1, p. 3). The best LLM heuristic scores 55.5 on eight scenarios and 60.9 on 81, with temperature error 7.7 K and grain error 6.3 μm. These denominators and settings matter: the 55.5 and 60.9 scores are on different sets and are not directly comparable (Section 4.5, p. 5).

The central formal result is an audit of the best heuristic: 65 checks, 61/65 passing and zero errors; 29 AST checks (27/29 plus two warnings), nine interval checks (8/9), ten Z3 checks (9/10, with five proved universally and four deferred), and 17 property-test checks (17/17 on 207 inputs) (Table 4, p. 7). Z3 proves five specifications for all valid inputs: three safety properties and two monotonicity properties. SPEC-006 has a Z3 counterexample at a degenerate near-zero-force boundary, although testing passes realistic ranges (Section 4.8, p. 7). The paper explicitly says, “The Z3 verification layer translates the heuristic’s Python AST into Z3 SMT constraints and proves that domain specifications hold for all valid inputs—not just sampled ones” (Appendix B.3, p. 10).

What stays trusted is the Python-to-Z3 translator, the simulator and physical model, the specifications and input ranges, Hypothesis/property-test implementation, and the LLM-generated code.

## technique 1: strategic decomposition and rich behavioral feedback

What it is and when to use it. Separate strategy generation from code and feed the model a vector of behavior diagnostics rather than one scalar reward. This helps when several objectives conflict and the model must identify which component fails. The paper says, “This rich behavioral feedback—rather than a single scalar fitness—enables the LLM to diagnose which reward components underperform and in which operating conditions” (Section 2.2, p. 2).

How to do it. (1) Define the state, action mask, simulator, and component rewards. (2) Ask for three distinct strategies covering reduction, timing, velocity, grain management, and roughing-to-finishing transition. (3) Select one with a justification tied to the multi-objective reward. (4) Generate a sandboxed function through a tool call. (5) Repair up to three failed compilations or crashes. (6) Execute it on all eight scenarios and return component breakdowns, final state, completion, and mask violations. (7) Choose Exploration, Refinement, or Radical Exploration based on incumbent and stagnation, then repeat (Section 2.2, p. 2).

Verus form. Inference: represent each component as a separate postcondition or lemma over a Rust controller. Use `requires` for physical input ranges and valid masks, `ensures` for bounds and safety, and `assert`/`proof fn` steps for decomposition. Keep the executable controller independent from proof-only code. The action mask can be a specification predicate over allowed indices; array operations that Verus cannot reason about need a proved abstraction or a trusted external contract.

Evidence and limits. Most reward gains occur early: half of runs find their best heuristic by iteration 4 (mean iteration 8; Section 4.2, p. 3). Radical exploration can crash with rewards −79 to −88, and conversation compaction repeatedly loses useful micro-modifications (Section 4.8, p. 7). Inference: feedback improves targeted repair but does not prevent distribution shift or specification gaming.

## technique 2: diversified budgets and Luby restarts

What it is and when to use it. Allocate a fixed search budget among independent short runs instead of one long conversation. Retrospective analysis of 52 runs found five-to-ten-iteration runs a practical sweet spot. For an unseen task, use the universal Luby schedule `[1, 1, 2, 1, 1, 2, 4, ...]` scaled by a unit; with unit five, the paper runs `[5, 5, 10, 5, 5, 10, 20, 5, 5, 10, 5, 5, 10, 20, 40]` for 160 iterations (Section 4.4, p. 4).

How to do it. (1) Reset the conversation for each sub-run. (2) Run the Luby sequence; optionally expose the top three previous heuristics as information, without forcing refinement. (3) Keep each candidate and its audit result. (4) Compare the best candidate across runs. In Table 2, ad-hoc search is 52 runs/730 iterations, best 55.5, median 33.5, about 36 hours; unseeded Luby is 15 runs/160 iterations, best 51.6, median 35.1, 4.1 hours; seeded Luby is also 15/160, best 48.3, median 41.7, 4.1 hours (Table 2, p. 4). The paper says, “Diversified restarts consistently outperform both single long runs and many short ones” (Figure 3 caption, p. 4).

Verus form. Inference: apply restarts to agent proof synthesis, not to the Verus checker. Each run proposes contracts and lemmas independently; compile every candidate and retain only candidates whose Verus proofs pass. A portfolio can specialize on different input regions, but all members must satisfy the same `ensures` clauses. Luby scheduling controls agent calls and does not weaken proof obligations.

Evidence and limits. Luby's best 51.6 did not match the 55.5 outlier; the authors attribute this to high variance. On the 81-case grid, greedy portfolios reach oracle 64.5 for Luby versus 65.1 ad-hoc, with 90% of gain at K=5 and K=4 respectively (Section 4.5, p. 5). The runs are not a controlled estimate of universal optimality.

## technique 3: AST static and interval analysis

What it is and when to use it. Before expensive semantic checks, inspect generated code without executing it. The first layer has 29 checks in eight categories: structure, sandbox/security, action-mask use, output bounds, division safety, required state keys, complete returns, and control-logic quality (Appendix B.1, p. 10). The second layer propagates intervals through arithmetic to prove output bounds for every input in declared ranges (Appendix B.2, p. 10).

How to do it. (1) Parse the function AST. (2) Reject wrong signatures, missing returns, imports, `exec`/`eval`, file I/O, dunder access, unguarded divisions, absent mask checks, and dead paths. (3) Initialize intervals from Table 7's ranges (for example current thickness 5–110 mm, target 5–15 mm, force −100 to 4×10^6 N). (4) Propagate addition, subtraction, multiplication, division with zero-crossing checks, clipping, min/max, integer conversion, and branch unions. (5) Verify HR, interpass, and velocity output intervals against their action bounds. A failed translation defers that dimension rather than claiming a proof.

Verus form. Inference: Rust's type and ownership checks cover some structural/security classes; encode numeric bounds as `requires` and `ensures`, and use `assert` to expose interval facts. For loops, write a loop invariant clause in the `while` construct. Verus does not automatically prove arbitrary dynamic indexing or foreign calls; provide specifications and lemmas for those abstractions.

Evidence and limits. The best candidate's AST layer reports 27/29 pass and two warnings; interval layer 8/9. Interval analysis is sound only for supported operations and supplied ranges. Inference: a range that excludes a real deployment value creates a false sense of safety.

## technique 4: two-translation relational Z3 proofs

What it is and when to use it. To prove monotonicity, symbolically evaluate the same AST twice under independent prefixed variables, equalize all non-varied inputs, constrain the varied input ordering, and ask Z3 whether the negation of the desired output relation is satisfiable. The paper reports, “If unsatisfiable (UNSAT), the property is proved for all valid inputs” (Appendix B.3, p. 10).

How to do it. (1) Create translators with `a_` and `b_` variables. (2) Translate both return expressions. (3) Assert equality for every shared input. (4) Assert `a_k > b_k` for the varied input. (5) Assert the desired relation, such as `out_a >= out_b`, and check the negation. UNSAT proves the relation for all constrained inputs; SAT yields a counterexample. If one branch translates and the other does not, discard branch-only variables from the merged environment to avoid a one-sided false proof (Appendix B.3, p. 10).

Verus form. Inference: state relational properties as a `proof fn` over two input values with preconditions linking all unchanged fields and ordering the varied field; its `ensures` states the output relation. Prove the implementation's contract twice by calling the function specification, or expose a pure `spec fn` model. This is an inference because the paper uses Python AST-to-Z3, not Verus.

Evidence and limits. The technique proves SPEC-006 in under 0.1 seconds and proves SPEC-004 for simpler heuristics; `np.argmin` causes deferral to Hypothesis (Appendix B.3, p. 10). SPEC-006's degenerate counterexample shows why universal claims must report domains and counterexamples.

## technique 5: property-based testing as explicit deferral

What it is and when to use it. Execute the real function for properties that static translation cannot express, while recording exactly what was deferred. The pipeline uses 200 uniform random inputs plus seven deterministic edge cases: near target, maximum/minimum states, tight mask, force sentinel, equal grain sizes, and equal temperatures (Appendix B.4, p. 11).

How to do it. (1) Sample inputs from Table 7, constraining current thickness ≥ target. (2) Build a physically consistent action mask. (3) For each input, check no exception, return type, output bounds, and mask compliance (PBT-001–006). (4) Run every spec deferred by Z3. (5) Report deferred IDs in both Z3 and testing sections for traceability. The best candidate passes all 17 property checks on 207 inputs (Table 4, p. 7).

Verus form. Inference: use Verus proofs for universal properties and Rust tests for behavior outside the modeled fragment. Tests are evidence, not proof; retain explicit assumptions and report which properties lack Verus lemmas. A Verus `external_body` marks an unverified function and must not be placed on the function whose implementation is the target of verification.

Evidence and limits. Seven edge cases encode domain knowledge, but 207 tests cannot establish universal continuity or responsiveness. The paper itself defers four specs involving responsiveness or epsilon-delta continuity to testing (Section 4.8, p. 7).

## techniques for the catalog

- behavioral-feedback heuristic synthesis — separate strategy, implementation, and evaluation while returning per-component rewards over diverse scenarios
- AST security and structure audit — reject unsafe imports, stateful tricks, missing returns, mask violations, and malformed generated functions before execution
- interval range analysis — propagate declared input intervals through supported arithmetic and prove output bounds without running code
- two-translation relational verification — compare two symbolic executions to prove monotonicity and emit counterexamples when the relation fails
- staged Z3/property audit — prove translatable universal properties with SMT and explicitly defer unsupported properties to randomized edge-case testing
- Luby universal restarts — use a fixed restart schedule to diversify LLM search without retrospective budget tuning
