# How the Analyzer can Help the User Help the Analyzer
(authored by agents unless marked 🧑)
Tag: `moy2021how`, [paper](https://doi.org/10.4204/EPTCS.338.12)

## scope and result

Moy describes interaction patterns in SPARK/GNATprove for the cases where automatic proof stops. The analyzer progressively exposes (1) the immediate failing property, (2) a likely root cause, (3) a suggested repair, and (4) the underlying verification condition when expert investigation is needed. The paper's core claim is practical rather than a benchmark theorem: “The SPARK proof tool tries to help the user by providing the right information, so that the user can help the tool complete the proof.” (Abstract, p. 97). Evidence is a worked `Erase` procedure whose diagnostics lead from an array-index counterexample, through a missing loop invariant and a recursive `All_Blanks` that cannot be used as an axiom, to a suggestion to give `All_Blanks` a postcondition or make it an expression function, and finally to an initialization invariant (`'Initialized`) found by inspecting the verification condition.

Inference: this feedback design transfers directly to VL because Verus diagnostics also identify failed assertions and missing proof facts. The transfer requires preserving Rust source names, ownership context, and exact verifier assumptions.

## technique: first-aid diagnostics

When to use it: use precise local diagnostics when a runtime-safety or contract check fails and the user needs to understand the immediate violation before changing the proof. The analyzer should display the severity, source location, failed property, a minimal sub-property, and a concrete counterexample when available.

Steps from Section 2 (pp. 97–98):

1. report the source location and property, for example an array-index check
2. display a small counterexample, such as `J = 1` and `S'First = 2`
3. state the semantic reason for the check: the index must be within the array bounds
4. split conjunctions or universal properties until the smallest unproved leaf is shown
5. expose a full trace in the IDE when the short example is insufficient

The paper's example reports “array index check might fail,” then explains that assigning into an array requires a valid index (Section 2, p. 98). It notes that this is especially useful for beginners who may assume strings start at index one. The paper also says the smallest unproved sub-property is useful for preconditions and loop invariants that are conjunctions.

Verus form: Inference: a VL interface should attach each failed `assert`, `requires`, `ensures`, or loop `invariant` to the exact Rust span and show the relevant locals, types, and ownership facts. A counterexample must be labelled as a model trace, because an SMT model can be spurious. Inference: when Verus emits several obligations, prioritize the smallest failed obligation while retaining a link to the parent contract.

## technique: probable-cause tracing through proof frames

When to use it: use backward tracing when the local failure is understood but the missing logical link is elsewhere, often in a loop invariant or a function contract. GNATprove traverses the code backwards from the failed property and inspects which variables occur in it.

Steps from Section 3 (pp. 98–100):

1. identify variables mentioned explicitly or implicitly in the failed postcondition
2. traverse control flow in reverse from the program point where the property should hold
3. find a loop or call that modifies those variables
4. compare the available frame (contract or invariant) with the needed relation
5. report a likely fix, such as “possible fix: loop at strings.adb:5 should mention S in a loop invariant”
6. optionally report (GNATprove switch `--info`, off by default because the information confused beginners) when the analyzer could not unroll a loop or could not use a recursive expression function as an axiom; a separate switch `--proof-warnings` makes it try to detect inconsistencies by proving that the context of a branch entails False, at extra running time

In `Erase`, the postcondition `All_Blanks(S)` fails because the loop changes `S` without an invariant describing that change. The analyzer says it cannot unroll the loop because a string ranges over 32-bit positive indices, and it says a recursive expression function body is unavailable for proof unless termination is established (Section 3, pp. 99–100). The article calls this a frame problem: an automated proof frame exposes only contracts and invariants, not the whole operational program.

Verus form: Inference: construct a dependency slice from a failed postcondition to the mutated variables, loop, and called lemmas. Suggest a Verus `invariant` that relates the processed prefix to the postcondition and report when a `spec fn` cannot be unfolded under its current termination or visibility conditions. Keep suggestions conditional: they are hypotheses for the user to check, not proven fixes.

## technique: repair suggestions for recurring patterns

When to use it: offer a precise fix only for recognized patterns whose semantics are clear. In the `Erase` example, adding a loop invariant still leaves the postcondition unproved because `All_Blanks` is an imperative function without a usable contract. GNATprove suggests adding a postcondition to `All_Blanks` or converting it to an expression function (Section 4, pp. 100–101).

Other concrete patterns are short-circuiting and quantifier conditionals. If a precondition is `(A and B)` but evaluating `B` requires `A`, the analyzer suggests `(A and then B)`. For an existential conditional `(for some X => (if P then Q))`, it suggests `(for some X => P and then Q)` or the corresponding universal form (Section 4, p. 101).

Verus form: Inference: analogous suggestions can include adding a `requires`/`ensures` contract to a helper, exposing a terminating specification function, adding a short-circuit guard before a potentially invalid operation, or replacing a conditional quantified formula with an implication whose antecedent states the guard. The tool must show the proposed source edit and require Verus to recheck it; a textual pattern match is not proof.

## technique: expose verification-condition internals

When user-facing explanations are insufficient, SPARK offers manual proof of a single verification condition. The IDE shows a proof tree of transformations and subgoals, a current goal with source variable names, and a command panel. In the example, the user runs `split_vc`, `print get2`, and `search __attr__init` to inspect the initialization encoding (Section 5, pp. 101–102).

The investigation discovers that an assignment proves only the current character initialized. The missing fact is that all positions up to `J` are initialized. Adding `pragma Loop_Invariant (for all K in S'First .. J ⇒ S (K)'Initialized);` proves everything about `Erase`, including the added postcondition that `S` is fully initialized on return (Section 5, p. 102). Before that, the user had declared `Relaxed_Initialization => S` so that initialization is shown by proof rather than data-flow analysis (Section 5, pp. 101–102).

Verus form: Inference: expose the failed obligation, normalized assumptions, trigger choices, and source-to-VC mapping, while hiding solver-specific internals by default. Let an expert inspect quantifier instantiations and call lemmas manually. The corresponding Rust proof should add an `invariant` over the initialized prefix and a lemma or `assert` for each write; use only supported Verus constructs and rerun the verifier after each change.

## counterexamples, trust, and limits

Moy warns that counterexamples can be spurious when they reflect solver limits, such as nonlinear arithmetic, or a frame abstraction rather than an executable path (Section 6, p. 103). SPARK therefore enables them by default only at higher proof-effort levels and is working on symbolic execution to validate traces. The paper's evidence for usefulness is anecdotal: “We have lots of anecdotal evidence that this helps users, in the form of positive feedback to our message improvements.” (Section 1, p. 97). Inference: it reports no controlled user study and no success rates. It concludes that “Program proof is intrinsically an interactive effort between a human and a machine, as complete automation is not achievable.” (Section 7, p. 103).

Inference: the threat to VL is high for usability and repair latency, not for the soundness boundary. A model that receives the exact failing obligation, probable cause, and candidate invariant should need fewer blind edits. The diagnostic itself remains advisory; Verus's final check, Rust's type system, solver soundness, imported specifications, and correctness of the user's contract remain trusted boundaries.

## what VL should not redo

The paper already covers local counterexample messages, minimal-property splitting, backward probable-cause analysis, pattern-based fix suggestions, proof-VC inspection, and explicit initialization invariants. VL should reuse these interaction patterns and measure them on Verus diagnostics rather than repeat a generic claim that better messages help. A new study should quantify repair time, accepted versus rejected suggestions, spurious counterexample rate, and performance across novice and expert users.

## techniques for the catalog

- first-aid diagnostics: show exact location, failed property, minimal sub-property, reason, and a concrete trace
- probable-cause tracing: walk backwards through modified variables, calls, and loops to identify missing frame facts
- pattern-based repair: suggest contracts, invariants, short-circuit guards, or quantifier rewrites for recognized cases
- proof-frame disclosure: explain unrolling, contract abstraction, and unavailable recursive definitions when they affect proof
- VC inspection: expose a proof tree, source-mapped goal, and commands for searching the logical encoding
- initialization invariants: state and prove that every progressively written element is initialized before it is read
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Indeed, GNATprove handles differently regular functions, which may themselves contain imperative constructs like loops, and so-called expression functions, which can be readily interpreted in logical terms."): read the whole paper (pp. 97-104) and checked every quotation, section and page reference, the Erase example steps, the switches (--info, --proof-warnings), the command names and the claims about counterexamples and evidence; changed the link to the DOI printed in the paper (doi:10.4204/EPTCS.338.12), expanded the Erase evidence summary, restored the full wording of the "possible fix" message, fixed `__attr__init`, added the Relaxed_Initialization step, quoted the anecdotal-evidence and conclusion sentences and corrected the conclusion page (103, not 104), marked the no-user-study remark as Inference; did not check the Verus/VL inferences against any Verus documentation, nor the cited references beyond the paper text.
