# Spec-Harness: Measuring and Improving Behavioral Adequacy of LLM-Synthesized Formal Specifications
(authored by agents unless marked 🧑)

Audit: audited 2026-10-13 against the paper; checked every number, fraction and page/section reference, the formulas and steps of techniques 1, 2 and 4, and the Verus forms; the numbers matched; changed one widened claim (ceiling, not quickly), one reference (Equation 1 is on p.6), one date-model label, one unattributed novelty claim, and added Inference marks on the trusted list and the Codex remark; the Verus statements are consistent with the Verus references (reveal_with_fuel, old).

source: Misu, Ma, Lopes (UC Irvine), arXiv:2604.00280v2 (8 Sep 2026), 12 pages, IEEE two-column, no appendix; artifacts in the authors' VeriAct GitHub repository (Section X, p.11)

earlier coverage in the notes: `topic_studies/formal_verification_rust/llm_for_verification/specifications.md` has a short entry (the four scores, the 49.2% to 63.3% Claude Code figure, the omitted contract features), and `daily_proposals/2026-10-07/source_review.md` has an entry that says the numbers were not extracted. Neither gives the harness construction, the formulas, the scoring function for prompt search, the agent loop, or the points where the paper's numbers disagree with each other. Those are below.

## the paper's argument

A verifier accepting a contract shows the code agrees with the contract. It does not show the contract says anything. “But passing a verifier only confirms that an implementation is consistent with a specification, not that the specification is meaningful.” (Abstract, p.1). The paper (Java, JML contracts, OpenJML verifier) does four things in order: measures how often existing generators get a contract past the verifier (RQ1); shows that searching for better prompts using verifier feedback reaches a ceiling (RQ2); defines four scores that measure how much a contract says, computed by the verifier itself on concrete values (RQ3); and gives those scores to coding agents as a tool (RQ4).

The motivating case (Figure 1, p.2; Section II-B, pp.2-3) is a `changeCase(char c)` method with five branches. The generated contract is `requires c >= 'A' && c <= 'z'` and an `ensures` saying only that a lowercase input gives a result somewhere in `'A'..'Z'`. OpenJML accepts it. Four branches are unconstrained, the one constrained branch is not pinned to the exact value, and the `requires` rejects inputs the method handles. “In short, this specification is both too weak in what it guarantees about outputs and too strong in what it demands of inputs.” (Section II-B, p.3)

## what is measured and what is taken on trust

measured
- verification rate (VR): share of tasks whose generated contract passes OpenJML 21-0.21 on Java 21.0.4 without errors (Section III-C, p.4)
- benchmarks: SpecGenBench, 120 Java methods; FormalBench, 662 kept of 700 after removing `void` methods and methods with `Object` parameters or results (Section III-B, p.3)
- 136 configurations: 11 prompt configurations × 6 models × 2 benchmarks = 132, plus Houdini and Daikon on 2 benchmarks = 4 (Section III-C, p.4)
- four adequacy scores per accepted contract (technique 1)

nothing is proved. The authors say so: “These are test- and mutation-based approximations, not formal guarantees: they depend on the test pairs and mutants used and do not cover every property, such as frame conditions or exceptional postconditions.” (Section VII, p.10)

trusted (Inference: the paper has no such list; this is the reader's reading of what the scores rest on)
- the benchmark's reference implementation, which is run to produce the valid input-output pairs
- the generated extra inputs and the mutation operators
- OpenJML and its SMT solver, in both directions: a failed check is read as a rejection

## technique 1: score a contract by verifying it against concrete values instead of the code

what it is: replace the method body by assignments of one concrete input and one concrete output, and ask the verifier whether the contract holds for that pair. Do it for true outputs, mutated outputs, valid inputs and invalid inputs. “Spec-Harness instead leaves the code untouched and stubs in concrete input/output assignments, mutating only the values fed to the specification.” (Section V, p.6)

when to use: after a contract has passed the verifier, to decide whether it is worth keeping; or inside a generation loop as a second signal (technique 4).

steps (Section V-A to V-C, pp.6-7; Table IV, p.7)
1. inputs to the procedure: method signature `m(x): y`, generated postcondition φ(x, y), generated precondition ψ(x), and a set T of valid pairs (i, o) from a known-correct run
2. postcondition stub: a body that only does `x := i; y := o`, checked against `{true} x := i; y := o {φ(x, y)}` (Equation 2)
3. precondition stub: a body that only does `x := i`, checked against `{true} x := i {ψ(x)}` (Equation 3)
4. “In both cases the verifier symbolically checks the Hoare triple using an SMT solver, without executing P.” (Section V-A, p.6)
5. PostCorr = share of pairs in T whose postcondition stub verifies (Equation 4). It measures false alarms on true behavior
6. build mutants: for each (i, o), a fixed-size set μ(o) of perturbed outputs by type, for example o ± δ for integers and element insertion or deletion for arrays; T1 is all (i, o′) (Equation 5)
7. PostComp = share of T1 whose stub fails to verify (Equations 6 and 7). It measures whether wrong outputs are rejected
8. PreCorr = share of valid inputs T+ whose precondition stub verifies (Equation 8)
9. PreComp = share of invalid inputs T− whose precondition stub fails to verify (Equation 9)
10. report per approach the share of verifier-accepted contracts whose score reaches a threshold, written Harness@0.25, @0.50, @0.75, @1.0 (Section V-E, p.7; Figure 4 caption, p.8)

why four and not one: each score alone is gamed by a degenerate contract. “Note that a vacuous postcondition (e.g., ensures true) trivially achieves PostCorr = 1.0, motivating the complementary completeness metric below.” (Section V-B, p.7). The mirror case from the results: “Its high PreComp (77% and 46%) is actually a warning sign: Houdini’s templates use guards that reject almost every input, which passes a completeness check for free while failing correctness.” (Section V-E, p.7)

where the test values come from (Section III-B "Benchmark Test Augmentation", p.4)
1. parse the method signature to recover the input format: scalars, arrays, matrices, strings, maps, sets
2. generate type- and shape-compatible inputs seeded by the benchmark's examples
3. run the reference implementation and keep only terminating valid pairs
4. “We also generate two to three invalid inputs by boundary perturbation, such as null, empty, out-of-range, negative-size, or extreme-value cases.”

Verus form (Inference: the paper is about JML; it says prior Dafny and Rust work of this kind looks at postconditions only, Section V, p.6)
- write the function's `requires` and `ensures` bodies as named predicates, `spec fn pre(x) -> bool` and `spec fn post(x, y) -> bool`, so they can be checked apart from the function
- PostCorr stub: a `proof fn` with no parameters whose body is `assert(post(i, o));` for concrete `i`, `o`. It verifies or it does not
- PostComp stub: the paper counts a mutant as rejected when verification fails. In Verus a failure can also mean the solver gave up, for example on a quantifier or a recursive `spec fn`. A stricter stub is `assert(!post(i, o_mut));`: when that verifies, the rejection is certain. Report both, since the gap between them is solver weakness, not contract strength
- PreCorr and PreComp: `assert(pre(i));` and `assert(!pre(i_bad));`
- recursive `spec fn` definitions on concrete values may need `reveal_with_fuel` or a short helper `proof fn`; concrete collections are written as `Seq` values
- what does not carry over: JML's `\result` and nullable references. Rust has no null, so the paper's main source of invalid inputs is absent; invalid inputs in Rust are mostly range, length and aliasing-free shape violations
- what the paper leaves out and Verus needs: contracts over `&mut` arguments, which relate `old(x)` to the final value, are a kind of frame condition, and the paper says frame conditions are not covered (Section VII, p.10)

evidence (Section V-E, pp.7-8; all adequacy figures are the share of verifier-accepted contracts scoring at least 0.75, best configuration per approach, per the Figure 5 caption, p.9)
- FormalBench-paper prompts on SpecGenBench: 64% VR, 50% PostComp, 13% PreComp; on FormalBench: 36% VR, 9% PostComp
- Houdini: “Houdini has the highest VR of all (93% on SpecGenBench, 67% on FormalBench), but its PostComp falls to 24% and 19%, and its PreCorr drops to 0% on both benchmarks.” (Section V-E, p.7)
- Daikon on SpecGenBench: 21% VR, 6% PostComp
- SpecGen on SpecGenBench: 47% PostComp at 67% VR; PreComp between 13% and 20% for the prompt approaches
- on FormalBench PostComp is at or below 9% for all three prompt approaches while VR is 28% to 36%
- the authors' reading: “The specifications really do verify; they are just too loose.” (Section V-E, p.7)

where it fails or what it assumes
- the scores are relative to T, T− and the mutation operators; a contract can score 1.0 everywhere and still be wrong on untested inputs
- Inference: a mutant output can itself be a correct output when the method's result is not unique (any index of a maximum, any valid ordering). The paper's PostComp formula counts accepting such a mutant as a weakness. The paper does not discuss equivalent mutants
- Inference: failure to verify is read as rejection; a solver timeout on a correct-output stub lowers PostCorr and a timeout on a mutant raises PostComp, and the paper gives no timeout counts
- the paper gives no mutant count per pair, no δ, and no number of valid pairs per task

## technique 2: a graded score for verifier outcomes, to drive prompt search

what it is: turn the verifier's pass or fail into four levels so that a search over prompts has something to climb, and give the search the error text as well.

steps (Section IV-A and IV-B, p.5; Equation 1 and Table III are on p.6)
1. classify the verifier result r into syntax errors Es(r) and verification errors Ev(r)
2. score 1.0 if verified; 0.3 if exactly one verification error and no syntax error; 0.1 if two or more verification errors and no syntax error; 0.0 if any syntax error or no output
3. feed score and classified error descriptions to GEPA, a reflective prompt optimizer that reads traces, diagnoses failures in natural language and combines prompts from the Pareto front of its attempts; implemented with DSPy, gpt-4o as both the generating and the reflecting model, budget setting medium
4. seeds: three prompts from RQ1, zero-shot, few-shot least-to-most, few-shot chain-of-thought; the two few-shot seeds carry two SpecGenBench tasks as demonstrations
5. data: FormalBench split 100 / 50 / 512 into train, validation, test, stratified by the five control-flow categories

the rationale: “The intuition is that not all failures are equal: a specification with a single postcondition violation is structurally much closer to a correct one than a specification with a syntax error, and the optimizer should distinguish the two.” (Section IV-B, p.5)

evidence (Table III, p.6; gpt-4o; SpecGenBench 118 tasks after removing the 2 demonstrations, FormalBench test split 512 tasks)
- zero-shot: 39.83% to 46.61% on SpecGenBench, 17.81% to 18.59% on FormalBench
- few-shot least-to-most: 45.66% to 45.70%, and 19.90% to 19.96%
- few-shot chain-of-thought: 44.07% to 46.61%, and 19.18% to 19.77%
- “After optimization, all three prompt types converge to a narrow band (45.70–46.61% on SpecGenBench, 18.59–19.96% on FormalBench), regardless of how far apart their seeds began.” (Section IV-C, p.6)
- under the adequacy scores the optimized prompts reach 39% PostComp on SpecGenBench and 14% on FormalBench (Section V-E item 4, p.8)

Verus form (Inference): the same grading applies to Verus output by splitting compiler and syntax errors from verification errors and counting failed obligations. Inference: the lesson for VL is negative. With gpt-4o-2024-08-06 as generator, prompt search against verifier acceptance moved FormalBench by under one percentage point; and the thing it climbs is the wrong target, as the paper states: “Optimizing against verifier acceptance makes specifications pass more often without making them capture more behavior, because the signal only rewards passing, not adequacy.” (Section V-E, p.8)

where it fails: one model (gpt-4o) is both generator and reflector, which the authors note may limit feedback diversity (Section VII, p.9); no variance over repeated optimizer runs is reported.

## technique 3: remove names before asking a model to specify code

what it is: rename the class and the method to neutral names so that the model must read the body. “To ensure that LLMs rely solely on code reasoning rather than inferring behavior from naming conventions, we normalize all benchmark tasks by renaming class names to Solution and method names to solve().” (Section III-B "Normalization", p.3). The paper's example of the leak is a class `BinarySearch` with a method `search()`.

when to use: when measuring whether a model derives a contract from code, as opposed to recalling the usual contract for a familiar name.

Verus form (Inference): rename the function and its module; keep parameter names or rename those too (the paper does not say what it did with parameter and local names). Inference: for a product the direction reverses. Names are free information the agent should use; the normalization is an evaluation control, and a contract that changes when names are removed was not derived from the code.

evidence: none; the paper applies it everywhere and reports no before-and-after comparison.

## technique 4: give the agent the adequacy score as a tool and gate completion on it

what it is: an agent loop with two measurements instead of one. VeriAct, the authors' agent, has three tools (Section VI-A, p.8): `verify` runs OpenJML and returns errors; `run_spec_harness` returns the Spec-Harness scores on the task's test pairs; `task_complete` may be called only once verification passes and the harness scores clear a set threshold. “The design is deliberately simple: rather than hard-coding a repair strategy, we give the agent the two signals it needs, verification and adequacy, and let it decide how to act on them.” (Section VI-A, p.8)

steps (Section VI-B, pp.8-9)
1. give the same three tools to each agent under test: VeriAct (GPT-5.4), Codex CLI (GPT-5.4), Claude Code CLI (Sonnet-4.6)
2. one isolated directory and one fresh session per task
3. two conditions per agent: without the harness, the loop is draft, verify, observe, submit; with it, draft, verify, run harness, observe, submit
4. budget: 10 steps per agent per task (Section VII, p.9)
5. tasks: all 120 of SpecGenBench and a 120-task stratified sample of FormalBench
6. feedback and reported score use postconditions only: PostCorr ≥ 0.75 and PostComp ≥ 0.75, named Post-Harness@0.75
7. not in the paper: the threshold `task_complete` enforces, the prompt text, and what the agent may do when the budget ends without clearing it

why preconditions were dropped: the authors inspected 350 stubs. “In most cases the method did not need a precondition to verify: the input domain was unconstrained, and OpenJML accepted the specification with no requires clause at all.” (Section VI-B, p.9)

evidence (Section VI-C, p.9, and bar labels of Figure 6, p.10; every percentage matches a whole number of the 120 tasks)
- SpecGenBench, Post-Harness@0.75 without and with the harness: Claude Code 49.2% to 63.3% (59 to 76 of 120); Codex 48.3% to 55.0% (58 to 66); VeriAct 46.7% to 50.0% (56 to 60)
- SpecGenBench, VR from the Figure 6 labels: Claude Code 0.87 to 0.83; Codex 0.93 to 0.78; VeriAct 0.91 to 0.50
- FormalBench sample, VR: Codex 84.2% to 45.8% (101 to 55 of 120); VeriAct 65.0% to 15.8% (78 to 19); Claude Code 0.79 to 0.61 by the figure labels
- FormalBench sample, Post-Harness@0.75: Claude Code 10.0% to 24.2% (12 to 29); VeriAct 10.8% to 15.8% (13 to 19); Codex 0.12 to 0.13 by the figure labels
- the authors' reading: “The drop in verification rate is not a regression, it is the agent refusing to submit a weak specification.” (Section VI-C, p.9)

Verus form (Inference): the loop is tool-independent. For a Verus agent the two tools are the verifier on the real function and the stub checks of technique 1 on its `pre` and `post` predicates. Inference: the result to plan around is the FormalBench one. Without the second signal, 78 of 120 VeriAct contracts verified and 13 were adequate; a product that reports verified counts would have shown 78.

where it fails
- the agent is scored on the same test pairs it receives feedback from; no held-out pairs are used. Inference: an agent can raise the score by writing a postcondition that fits the pairs, and the paper does not test for this
- on the harder benchmark most tasks end with no adequate contract inside 10 steps: VeriAct 101 of 120, Claude Code 91 of 120
- Codex's adequacy on FormalBench is flat (0.12 to 0.13, about one task) while its VR falls by 46 tasks, so Inference: the paper's statement that the effect holds across all three agents is weak for Codex on that benchmark
- the two general agents run on different base models; the authors restrict claims to the within-agent change (Section VI-B, p.9)

## technique 5: read the classical baselines as a warning about refutation-style generators

Houdini starts from many template candidates and deletes whatever the verifier refutes; Daikon infers likely invariants from execution traces (Section III-A, p.3). On verifier acceptance Houdini beats every LLM configuration (Table II, p.4: 104/120 = 86.7% on SpecGenBench and 359/662 = 54.2% on FormalBench, against the best prompt approach at 80/120 = 66.7% and 238/662 = 36.0%). On the adequacy scores it is the worst: PreCorr of 0% on both benchmarks (Section V-E, p.7).

Inference: any generator whose loop proposes many clauses and keeps what the verifier does not refute maximizes acceptance by construction and says nothing about adequacy. Inference: an LLM repair loop that deletes or weakens failing `ensures` clauses until Verus accepts is the same algorithm as Houdini and should be expected to show the same profile.

## numbers and statements that do not agree

- Houdini's VR is 86.7% and 54.2% in Table II (p.4) and in Section III-D (p.4), but 93% and 67% in Section V-E (p.7). Daikon on SpecGenBench is 18.3% in Table II and 21% in Section V-E. The paper does not explain the difference
- Post-Harness@0.75 is defined as a share of verified tasks: “We report Verification Rate and Post-Harness@0.75, the fraction of verified tasks with PostCorr ≥ 0.75 and PostComp ≥ 0.75.” (Section VI-B, p.9). The results use it as a share of all tasks: “VeriAct’s FormalBench run is the clearest case: only 15.8% verify, but all of those are adequate.” (Section VI-C, p.9), with Post-Harness@0.75 also at 15.8%. Under the stated definition that case would read 100%. The fractions above assume the denominator is 120
- the invalid inputs: Section III-B (p.4) says they are generated by boundary perturbation; Section V-C says “The elements of T − are provided explicitly in the test suite, not generated heuristically, ensuring that the domain violations are semantically meaningful by construction.” (p.7)
- Table III: on 118 tasks one task is 0.85 points, so 45.66% and 45.70% are not whole task counts (they would be 53.9 tasks); on 512 tasks 17.81% is 91.2 tasks. The paper does not say these are averages over runs. The least-to-most gain of 0.04 points on SpecGenBench is less than one task
- the seeds are introduced as zero-shot (worst), least-to-most (average), chain-of-thought (best) (Section IV-B, p.5), but in Table III the least-to-most seed (45.66%) is above the chain-of-thought seed (44.07%) on SpecGenBench
- Section V-E says optimized prompts are about the same as unoptimized ones under the harness; on FormalBench it gives 14% PostComp for the optimized prompt and at most 9% for the three prompt approaches. The task sets and models differ (512-task test split with gpt-4o against 662 tasks with the best model), so the two are not directly comparable, and the paper does not give the seed prompts' adequacy on the same split
- Section VI-C says Claude Code's and Codex's verification rates dip only slightly on SpecGenBench; the Figure 6 labels read 0.93 to 0.78 for Codex

## already done, so VL should not redo

- the idea of checking a contract on concrete pairs and mutated outputs through the verifier is prior work for Dafny and Rust by the paper's own account (Section V, p.6, and the acknowledgment, p.11, crediting Lahiri's intent-formalization work). The paper states its addition as bringing this to JML and OpenJML and also scoring preconditions (Section V, p.6). Inference: the use as agent feedback is also new here, but the paper does not say so
- Inference: the finding that verifier acceptance overstates contract quality needs no further demonstration; VL should measure adequacy from the start
- not done: any Rust or Verus measurement; loop invariants, frame conditions, exceptional behavior; held-out pairs for the feedback experiment; multi-function or stateful code (all tasks are single Java methods from LeetCode-style and MBJP sources, Table I, p.4)

## what it means for selling agent-written Verus contracts

Inference: this is a threat to the claim more than a competing product. It is Java and JML with no Rust result, but it supplies a cheap, published test that anyone can point at an agent-written Verus contract, and its headline case (a specialized agent whose verified count falls from 78 to 19 of 120 once adequacy is required) is the number a skeptic will cite. A product that ships agent-written `ensures` clauses without an adequacy measurement is exposed to exactly this evaluation.

## techniques for the catalog

- concrete-pair harness — replace the body by one concrete input and output and let the verifier check the postcondition on it, giving a false-alarm rate over known-correct pairs
- output-mutation completeness — verify the postcondition against perturbed outputs and count how many it rejects, to expose contracts that accept everything
- precondition admit and reject scores — check the precondition on valid inputs and on boundary-violating inputs separately, since a reject-all guard maxes one and zeroes the other
- threshold reporting — report the share of accepted contracts whose adequacy score reaches 0.25, 0.50, 0.75 and 1.0 next to the verification rate
- graded verifier score — map verified, one verification error, several, and syntax error to 1.0, 0.3, 0.1, 0.0 so a prompt optimizer has a slope
- name normalization — rename classes and methods to neutral names so a model cannot read the intended behavior off the identifier
- adequacy-gated completion — give the agent a harness tool beside the verifier and allow it to finish only when both pass
- refutation-generator warning — treat any keep-what-is-not-refuted contract generator as acceptance-maximizing and check its preconditions for reject-all guards
