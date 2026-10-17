# Diversifying to Verify: When Task-Equivalent Programs Differ in Verifiability
(authored by agents unless marked 🧑)
Tag: `yu2026diversifying`, [paper](https://arxiv.org/abs/2607.09366)

source: Shirley Yu (Stanford), Ruben Martins (CMU), arXiv:2607.09366v1 (10 Jul 2026), 20 pages, no appendix. Artifacts: https://github.com/forge-lab/Diversify2Verify

## the claim and how it is tested

Claim: for one task, programs that differ in data representation (array or list) and control structure (recursion or loop) differ in whether an automatic verifier can prove them, so generating several structurally different programs raises the chance that one verifies.

Test: a scripted pipeline, Diversify2Verify, takes 73 LeetCode-style tasks, writes a Why3 contract per representation, writes four WhyML implementations per task (array-recursive, array-imperative, list-recursive, list-imperative), and tries to verify each of the 292 with at most two repair rounds. Models: Codex as the agent, GPT-5.5 with high reasoning for contracts and proofs, GPT-5.4 with medium reasoning for implementations (Section 6, p.11; Table 4, p.12).

Headline numbers, in the paper's words: "Repair increases artifact-level verification from 96 of 292 artifacts, or 32.9%, to 154 of 292 artifacts, or 52.7%." and "At the task level, using all four variants yields at least one verified artifact for 49 of 73 tasks, or 67.1%, compared with 44 tasks for the strongest individual family." (Section 7.4, p.16)

What is proved: for each of the 154 artifacts, Why3 with three SMT solvers discharged every verification condition of safety, termination and the contract. What stays trusted: that each LLM-written contract means what the task says. The paper is explicit: "Deductive verification proves that a Stage 3 implementation satisfies its contract, not that the contract fully captures the natural-language benchmark description." (Section 7.4, p.16) Also unproved: that the array contract and the list contract of one task say the same thing: "We do not prove, as an additional theorem, that the array and list contracts are equivalent to each other." (Section 1, p.2)

## technique 1: three stages with a frozen contract and per-stage repair boundaries

what it is: split verified-code generation into contract, implementation, proof, and give each stage a list of what it may change. After Stage 1 the contract is frozen. The problem it addresses: "When verification fails, feedback is often ambiguous, and unconstrained repair may change the specification rather than the implementation or proof, yielding a program that verifies for the wrong reason." (Section 1, p.2)

when to use it (inference): any agent that writes both the specification and the proof, where a failing proof tempts it to weaken the specification.

steps (Table 2, p.7; Sections 4.1 to 4.3, pp.7–9):
1. Stage 1, contract. Input: task text, target signature, examples, target representation. Output: target declaration, `requires`, `ensures`, helper predicates and logical functions. May repair syntax, types, helper definitions, example lemmas and semantic mistakes. Then freeze
2. Stage 2, implementation. May repair or regenerate code "only within the same representation and control-structure family" (Table 2, p.7); may not touch the contract
3. Stage 3, proof. May add invariants, variants, assertions, ghost code, internal helper contracts, lemmas. The forbidden list is one sentence: "Stage 3 may not weaken the Stage 1 contract, add stronger preconditions to the target entry point, change the target signature, switch between array and list representations, or replace a recursive implementation with an imperative one or vice versa to make verification easier." (Section 4.3, p.9)
4. Stage 3 may edit code only as "semantics-preserving refactorings or proof-enabling local changes that preserve the implementation family and executable behavior on valid inputs" (Section 4.3, p.9)
5. check afterwards that the contract survived, because the prompt cannot enforce it: "These restrictions are imposed by the Stage 3 prompts and repair driver, but the LLM is not a trusted enforcement mechanism." (Section 4.3, p.9)

How step 5 was done: an LLM judge (GPT-5.5, high reasoning) read all 292 final artifacts for two things, whether the contract matches the task and whether Stage 3 kept the contract (Section 7.4, p.16). No mechanical comparison of contract text is described.

evidence: the judge flagged one artifact out of 292 for breaking the freeze: "Here, Stage 3 added preconditions that were implied by the benchmark description but absent from the frozen Stage 1 contract—a clear violation of our strict Stage 3 policy." (Section 7.4, p.16) There is no ablation without the freeze, so the paper does not measure how often an unconstrained agent would have weakened a contract.

Verus form (inference; the paper uses Why3 and names Verus only as related and future work):
- the contract of a Verus function is its signature, its `requires` and `ensures`, and every `spec fn` those clauses mention, transitively
- Stage 3's allowed additions map to `invariant` and `decreases` clauses, `assert`, `proof { }` blocks, ghost variables, and `proof fn` helpers with their own `requires`/`ensures`
- the freeze can be checked mechanically instead of by a judge: extract signature, `requires`, `ensures` and the reachable `spec fn` bodies before Stage 3 and compare token-for-token after it; also reject any new `assume` or `#[verifier::external_body]`. This check is not in the paper
- preservation of executable behavior has no cheap mechanical check; rerunning the Stage 2 tests on the final code is the obvious partial one, and the paper does not say it does this

limits: the judge found a single violation, an added precondition. Inference: that is the kind a judge can see; a judge that misses a subtle change leaves a verified artifact counted against a contract that is not the frozen one; the paper does not say whether the flagged artifact is among the 154.

## technique 2: example-derived test lemmas as the acceptance test of a contract

what it is: turn each input/output example of the task into a lemma stating that the contract's postcondition holds of that input and that output, and require the prover to discharge these lemmas before the contract is accepted.

when to use it (inference): the specification is generated from natural language and examples exist. It catches contracts that contradict the examples.

steps (Section 4.1, pp.7–8; Section 6, p.11):
1. parse and type-check the Stage 1 file with Why3
2. run a separate validation pass that tries to prove the example lemmas; "the validation pass attempts to prove seven example-derived lemmas" per representation-specific contract (Section 6, p.11)
3. on a syntax or type error, fix directly; on unproved lemmas, pass the diagnostics to "at most one Stage 1 repair call", which "may add assertions, unfold helper definitions, or simplify logically equivalent helper predicates" (Section 4.1, p.8)
4. change the meaning of the contract only before freezing "and only when the contract is inconsistent with the task statement or examples" (Section 4.1, p.8)
5. accept and freeze once the file is well formed and the lemmas are proved

The paper defines its own term: "We therefore use accepted contract to mean a representation-specific contract that is well formed in Why3 and whose example-derived test lemmas are discharged by the Stage 1 validation procedure, possibly after one repair attempt." (Section 4.1, p.8)

evidence: of the 146 accepted contracts (73 tasks, two representations), "85 required no repair and 61 required one contract-repair attempt"; arrays 45 and 28, lists 40 and 33 (Section 7, p.12). Inference: 61/146 = 41.8% of the contracts that ended up accepted needed the repair. The acceptance rate itself is not reported as a result: the benchmark was built by keeping only tasks whose contracts were accepted for both representations, which cut "around 150" triaged tasks to 73 (Section 5, p.10), and the paper says this filter is "part of the benchmark construction process rather than an independent Stage 1 success result" (Section 5, p.10). Inference: roughly half of triaged tasks did not get two accepted contracts within one repair.

How good are accepted contracts: the judge "flagged 10 potential mismatches"; on manual inspection "Only one case corresponded to a specification that was genuinely too weak and could potentially accept incorrect programs."; seven lacked input-bound constraints without effect on valid inputs; two involved tests inconsistent with stated input constraints (Section 7.4, p.16). 1 + 7 + 2 = 10.

Verus form (inference): one `proof fn` per example, with no `requires` and an `ensures` that applies the contract's top-level `spec fn` to the concrete input, written as a `Seq` value, and the expected output. Recursive `spec fn`s need unfolding on concrete data, by `reveal_with_fuel` or proof by computation; an existential postcondition needs the witness named in an `assert`. Those needs correspond to the paper's permitted repairs (add assertions, unfold helper definitions).

limits:
- the paper says acceptance is weak evidence: "Acceptance is not a proof of full semantic correctness with respect to the natural-language task." (Section 4.1, p.8)
- inference: a lemma of this form only shows that the expected output is allowed. A contract that allows every output passes all of them. A lemma that a wrong output is rejected would test the other direction; no such lemma is described in the paper, and the one too-weak specification found by the audit is the failure this would target
- the audit of meaning is an LLM screen plus manual reading of flagged cases only; the paper reports manual reading only for the flagged cases

## technique 3: contract shapes that say what, not how

what it is: write postconditions as direct mathematical characterizations built from small named predicates, in the vocabulary of the representation.

steps (Section 4.1, pp.7–8; listing in Section 3, p.6):
1. separate input assumptions from output requirements: "Input assumptions become requires clauses or explicit validity predicates, while output requirements become ensures clauses." (p.7)
2. for optimization tasks, split feasibility from optimality: "the result must be achieved by a valid witness, and no valid witness may have a better value" (p.8)
3. for Boolean, counting and transformation tasks, state the exact relation between inputs and result
4. array contracts use lengths, explicit bounds and bounded quantifiers over indices; list contracts use structural definitions over `Nil` and `Cons` or library notions
5. name each piece. The running example (maximum `j − i` over index pairs with `i ≤ j` and `nums1[i] <= nums2[j]`) has `valid_pair`, `has_pair_distance` (an existential), `distance_upper_bound` (a universal), and `maximum_distance_spec`, which is the zero case or the positive case with witness and bound

The stated preference: "Stage 1 favors direct mathematical characterizations over executable-looking specifications." (Section 4.1, p.8)

Verus form (inference, not run through Verus): the same four predicates as `spec fn`s over the `Seq` views of two `Vec`s.

```rust
spec fn valid_pair(a: Seq<i32>, b: Seq<i32>, i: int, j: int) -> bool {
    0 <= i < a.len() && 0 <= j < b.len() && i <= j && a[i] <= b[j]
}
spec fn has_pair_distance(a: Seq<i32>, b: Seq<i32>, d: int) -> bool {
    exists|i: int, j: int| valid_pair(a, b, i, j) && d == j - i
}
spec fn distance_upper_bound(a: Seq<i32>, b: Seq<i32>, d: int) -> bool {
    forall|i: int, j: int| valid_pair(a, b, i, j) ==> j - i <= d
}
spec fn maximum_distance_spec(a: Seq<i32>, b: Seq<i32>, res: int) -> bool {
    (res == 0 && distance_upper_bound(a, b, 0))
    || (0 < res && has_pair_distance(a, b, res) && distance_upper_bound(a, b, res))
}
```

The zero case here replaces the paper's `no_positive_distance_pair`, whose definition the paper does not print. What changes in Verus: quantifiers need usable triggers (here the `valid_pair` application serves), and results are machine integers, so the contract must relate `res as int` to the mathematical bound.

evidence: none isolated; the paper does not compare contract styles.

## technique 4: generate one implementation per (representation, control) family and keep any that verifies

what it is: deliberate structural diversity, as opposed to resampling. The paper's distinction: "Thus, our use of diversity is different from pass@k-style sampling: we study whether alternative representations and control structures lead to verification conditions that are easier or harder for SMT-backed deductive verification." (Section 8, p.17)

when to use it (inference): the task leaves the implementation free, and a verified implementation of any structure is acceptable.

why structure matters (Table 1, p.4; Section 2.2, pp.3–4):
- array + imperative: bounds, index arithmetic, quantified range facts; needs loop invariants over processed prefixes, suffixes or windows
- array + recursive: bounds remain, but helper contracts expose smaller subproblems that line up with recursive calls
- list + recursive: structural reasoning over `Nil`/`Cons`; needs recursive predicates and helper lemmas
- list + imperative: mutable traversal plus structural reasoning; needs invariants and ghost code relating visited and remaining elements

steps (Section 4.2, pp.8–9; Section 6, p.11):
1. for each task and each of the four families, generate a WhyML candidate; inside a family the algorithm, traversal order, helper decomposition and accumulators are free
2. filter: type checking plus "20 executable tests selected from the benchmark test suite" (Section 6, p.11)
3. on failure, repair or regenerate inside the same family, "within a bounded budget of five attempts" (Section 4.2, p.9)
4. send each passing candidate to the proof stage (technique 5); count the task solved if at least one family verifies

evidence, per family (Table 7, p.14; 73 artifacts each; verified initially + after repair 1 + after repair 2 = total):
- array recursive: 28 + 11 + 5 = 44 of 73, 60.3%
- array imperative: 21 + 7 + 7 = 35 of 73, 47.9%
- list recursive: 30 + 7 + 3 = 40 of 73, 54.8%
- list imperative: 17 + 10 + 8 = 35 of 73, 47.9%
- by control: "Across both representations, 84 of 146 recursive artifacts verify, compared with 70 of 146 imperative artifacts." (Section 7.2, p.14) Inference: 57.5% vs 47.9%
- by representation: 79 of 146 array, 75 of 146 list (Section 7.2, p.14)
- inference, before any repair: recursive 58 of 146 (39.7%), imperative 38 of 146 (26.0%); repair then added 26 recursive and 32 imperative, the two numbers the paper gives on p.15

evidence, per task (Table 6, p.14; 73 tasks): no variant verified 24 (32.9%); exactly one 5 (6.8%); exactly two 7 (9.6%); exactly three 13 (17.8%); all four 24 (32.9%); at least one 49 (67.1%). The counts sum to 73, and 5·1 + 7·2 + 13·3 + 24·4 = 154, matching the artifact total. The paper's reading: "Among these 49 solved tasks, 25 are solved by only a subset of the variants, showing that different implementations make different tasks amenable to verification." (Section 7.2, p.14)

Stage 2 ended with a passing implementation for every variant inside its budget (the paper does not say how many needed repair or regeneration): "Within the five-attempt Stage 2 budget, Diversify2Verify obtains one type-checked, test-passing implementation for each variant, yielding 292 candidates for Stage 3." (Section 7, p.13)

The paper's explanation of the recursive advantage: contracts are often written with recursive logical functions, and "Recursive implementations often follow the same structure, so the proof can proceed by exposing the contract of each recursive call." (Section 7.2, p.14)

how large the gain is: 49 tasks with four families against 44 with array-recursive alone, i.e. 5 more tasks of 73. The introduction calls this "a modest but measurable increase in task coverage" (Section 1, p.2). Inference: the four-family arm spends four times the generation and proof budget of the single-family arm. The control that would separate structural diversity from extra attempts, four independent array-recursive samples per task, was not run, so the 5-task gain is an upper bound on what structure alone contributes. With one run per configuration and no variance reported, 5 of 73 is also not shown to be beyond run-to-run noise.

Verus form (inference):
- the control axis carries over directly: a recursive `fn` with `decreases` and a contract that mirrors a recursive `spec fn`, against a `while` loop with `invariant` clauses
- the representation axis mostly does not: verified Rust works on `Vec` and slices whose specifications are `Seq` views; a cons list is not the usual Rust structure. A Verus analogue of the second axis would be index-based specifications against `Seq`-operation specifications (subrange, push, drop-first style reasoning). That substitution is this study's, not the paper's
- a cost that Why3 does not show: an executable recursive Rust function consumes stack per element, so the easier-to-verify recursive variant can be a worse program. A product would have to either accept loops as the target and use the recursive variant only as a stepping stone, or prove the loop equivalent to the verified recursive function. Not in the paper
- the paper asks for this replication: "Applying this approach to other systems, such as Verus, would help distinguish Why3-specific engineering effects from a broader principle: implementation diversity is a powerful, practical tool for LLM-assisted verified programming." (Section 9, p.18)

limits: the benchmark is filtered toward tasks that have both an array and a list contract and that "admitted multiple plausible implementation strategies" (Section 5, p.10); the authors say it is "not as a representative sample of arbitrary LeetCode tasks" and "intentionally biased toward SMT-friendly data types, tractable specifications, and tasks with accepted Stage 1 contracts" (Section 5, pp.10–11). Tasks come from public LeetCode problems and the paper makes no contamination-free claim (Section 5, p.10).

## technique 5: proof-only annotation with two diagnostics-driven repair rounds

what it is: combine frozen contract and tested implementation, drop the tests, add proof scaffolding, run the verifier, and on failure give the verifier log back to the agent at most twice.

steps (Section 4.3, p.9; Section 6, pp.11–12):
1. merge the Stage 1 contract and Stage 2 code and remove "the executable tests, which are no longer part of the final proof artifact"
2. add internal helper contracts, loop invariants, variants, assertions, ghost code, auxiliary lemmas
3. the artifact must parse and type-check before the full verifier runs
4. run the full verifier outside the agent (technique 6)
5. on failure, the repair prompt holds "the failing Why3 file, the verifier log, the benchmark description, the frozen Stage 1 specification, and the tested Stage 2 implementation" (Section 6, p.12)
6. "The first repair attempt addresses the initial failure. Later attempts use the updated diagnostics to focus on the remaining unproved goals." (Section 6, p.12)
7. stop after two repairs; a failed run keeps "the best unverified artifact together with verifier diagnostics and repair traces" (Section 4.3, p.10)

The purpose of the annotations, as the paper frames it: "The main proof obligation is to bridge local program state to the semantic contract generated in Stage 1." (Section 4.3, p.9)

worked example, the two-pointer loop of the array-imperative variant (listing, Section 3, p.6). Six invariants and a variant:
- range of each index: `0 ≤ !i ≤ length nums1`, `0 ≤ !j ≤ length nums2`
- `0 ≤ !best`
- witness: `!best = 0 ∨ has_pair_distance nums1 nums2 !best`
- `processed_j_upper_bound nums1 nums2 !j !best`: all valid pairs whose right index is already processed have distance at most `best`
- `left_future_excluded nums1 nums2 !i !j`: left indices already passed cannot give better future pairs
- variant `(length nums1 - !i) + (length nums2 - !j)`

The pattern, in the paper's sentence: "Together, these annotations connect the local state of the two-pointer scan to the global maximality condition in the postcondition." (Section 3, p.7) Inference, stated generally: for a scan that returns an optimum, one invariant gives a witness for the current best, one bounds everything already scanned by the current best, and one states why the part skipped by the scan cannot beat it; at exit the second and third together give the universal half of the postcondition.

evidence (Table 5, p.13; 292 artifacts): initially 96 verified (32.9%); repair 1 adds 35, cumulative 131 (44.9%); repair 2 adds 23, cumulative 154 (52.7%); 138 remain. "Among the 154 verified artifacts, 58 require at least one repair pass." (Section 7.1, p.13) Inference: repair success per attempted artifact is 35/196 = 17.9% in round 1 and 23/161 = 14.3% in round 2, so the yield had not collapsed when the budget ended; a third round was not tried.

what is left (Section 7.3, p.15): "Among the 138 unverified artifacts, 62 have only one remaining unproved root goal, and 110 have at most three." The average is 2.5 remaining root goals. Failure kinds named: insufficient loop invariants, missing helper contracts, array bounds or index arithmetic, structural list reasoning, and counting, cardinality or optimality reasoning.

one failure followed by hand (Section 7.3, p.15): Longest Turbulent Subarray, array-imperative. The scan tracks the current alternating suffix and the best length. The unproved goal is the step that extends the suffix. The missing fact: any turbulent interval ending at `i+1` can be shortened to one ending at `i`, and the earlier maximality invariant then bounds its length by `old_current + 1`. Adding two proof-only helper lemmas (suffix shortening; lifting the previous bound to all intervals ending at `i+1`) closed the goal "without changing the executable code or weakening the specification". The paper adds: "This repair was not included in the reported results, but it shows that at least some failures are due to missing proof structure rather than incorrect artifacts." (Section 7.3, p.15)

Verus form (inference): the loop above becomes a `while` with `invariant` clauses for the same six facts and a `decreases` with the same sum; the two bridge predicates become `spec fn`s; the turbulent-subarray lemmas become `proof fn`s called from a `proof { }` block inside the loop body. Verus reports failures per function and per assertion, not as a tree of root goals, so the closeness measure would be the count of distinct failing obligations in the output. The repair prompt contents carry over unchanged in kind.

limits: the paper says the authors confirmed one diagnosis by hand, not a sample; the paper's sentence "Many of these failures are close to verification" rests on goal counts. Inference: one remaining root goal can still be an unprovable one if the implementation is wrong on inputs the 20 tests did not cover; the paper notes that "Passing these tests does not establish correctness" (Section 4.2, p.9).

## technique 6: verifier ladder — solver portfolio, then split, then inline

what it is: a fixed verification strategy that escalates only for goals that remain open.

steps (Section 6, pp.11–12):
1. run all goals against three solvers, Z3 4.8.6, Alt-Ergo 2.4.0 and CVC4 1.8 under Why3 1.8.2, "using a 10-second timeout per solver call"
2. for goals still open, split large verification conditions into parts
3. then inline helper definitions
4. count as verified only when every verification condition is discharged

evidence: "Among the 154 verified artifacts, 133 are proved directly, 13 require splitting verification conditions, and 8 require both splitting and inlining helper definitions." (Section 7.1, p.13) 133 + 13 + 8 = 154. Inference: 21 of 154 (13.6%) would have been counted as failures with direct proving only.

Verus form (inference): Verus normally uses one solver, so the portfolio step has no direct counterpart. The other two steps have manual counterparts that an agent can apply when a function times out or fails: isolate a goal in its own `assert ... by` block or `proof fn` (the split), and `reveal` a hidden definition or raise unfolding with `reveal_with_fuel` at the point of use (the inline). In Why3 these are driver transformations applied without editing the file; in Verus they are edits to the proof text.

limits: the paper suspects the portfolio itself caps the result: "Furthermore, some remaining failures likely reflect limitations of the SMT portfolio rather than fundamentally unprovable implementations." (Section 7.4, p.16) Inference, from my knowledge of release dates and not from the paper: these solver versions date from about 2019 to 2020, old relative to the 2026 date of the paper; the paper does not explain the choice.

## technique 7: post-hoc audit of specifications by a judge model plus manual reading of flags

steps (Section 7.4, p.16): run a judge (GPT-5.5, high reasoning) over the 292 final artifacts on two questions, specification matches task and Stage 3 preserved specification; manually inspect what it flags and find the root cause in the 146 shared contracts.

evidence: 10 flags on match (1 genuinely too weak, 7 missing input bounds, 2 test/constraint inconsistencies); 1 flag on preservation. The paper's summary: "Overall, this 291-of-292 success rate demonstrates that the pipeline reliably preserves the boundary between specification generation and proof repair." (Section 7.4, p.16)

limits, the paper's own first threat: "First, the LLM judge is an audit mechanism, not a formal guarantee; subtle specification errors may persist." (Section 7.4, p.16) Inference: the judge's miss rate is unmeasured, the judge is the same model family that wrote the contracts, and 291 of 292 is the judge's verdict, not a verified property; "demonstrates" is stronger than the method supports.

Verus form (inference): the preservation question should be answered by the mechanical comparison under technique 1; the match question is the one that needs a judge or a human.

## where the paper is unclear or its numbers leave gaps

All totals check: Table 5, Table 6, Table 7, the 85 + 61 = 146 contracts, the 133 + 13 + 8 = 154 proof modes, Table 3's arities (30 + 34 + 7 + 2 = 73) and return shapes (58 + 15 = 73). The gaps are of another kind:
- the paper does not say whether the artifact with added preconditions, or the artifacts under the one too-weak contract, are counted among the 154 verified
- the unit of the 10 match flags is not stated (artifacts of 292 or contracts of 146)
- Section 4.3 promises that contract preservation is "a property to be checked after generation"; the only check reported is the LLM judge
- the abstract says the pipeline "infers representation-specific contracts"; Stage 1's success rate is unknowable from the paper, because failures were removed while building the benchmark
- the two audit cases with tests inconsistent with stated input constraints are said to have been "preemptively excluded before Stage 2 testing", yet they were flagged by an audit of final artifacts; the sequence of events is not explained
- cost (tokens, time, money) is not reported anywhere

## done here, not to be repeated

- the frozen-contract, three-stage discipline with explicit repair boundaries, for Why3: done, artifacts and logs public
- the measurement that recursive variants verify more often than loop variants under an LLM prover on LeetCode-style integer and sequence tasks: done for Why3 with GPT-5.5
- not done: the same-budget control (several samples of one family); any cost accounting; Verus or Rust; strings, trees, heap structures, floating point, concurrency, libraries (the paper's last limitation, p.16); a mechanical freeze check; equivalence of the two contracts of a task

## bearing on a product of agent-written verified Rust

Inference: a moderate signal, not a competitor. It is a recent (July 2026) end-to-end pipeline from natural language to verified code with current models, and on tasks pre-filtered to be tractable it fully verifies about half of its artifacts and two thirds of its tasks, with a contract-meaning audit done by an LLM. That places the state of the practice for this approach below what a product needs, on textbook tasks, in a language other than Rust. The reusable parts are the stage boundaries, the example lemmas, the ladder, and the finding that the proof agent should be free to choose (or be handed) the structure that proves most easily.

## techniques for the catalog

- frozen-contract staging: write and validate the contract first, freeze it, and let later stages change only code within a family and then only proof scaffolding
- stage repair boundaries: give each stage an explicit list of what repair may and may not alter, and check afterwards that the contract was untouched
- example-derived test lemmas: accept a generated contract only when the prover shows it holds on the task's concrete input/output examples
- witness-plus-bound postcondition: for an optimum, require that some valid witness achieves the result and that no valid witness beats it
- representation-specific contract vocabulary: index bounds and bounded quantifiers for arrays, structural recursive definitions for lists
- structural implementation diversity: generate one program per representation and control-structure family and keep whichever verifies
- tests as a pre-proof filter: admit an implementation to the proof stage only after type checking and a fixed set of executable tests
- scan-optimum invariant triple: witness for the current best, upper bound over the processed part, and exclusion of the skipped part
- bounded diagnostics-driven proof repair: return the verifier log with the frozen contract and tested code for at most two proof-only repair rounds
- suffix-shortening bridge lemma: prove that an interval property ending at the next index restricts to one ending at the current index, to lift a maximality invariant across a step
- verifier ladder: direct solver portfolio first, then split verification conditions, then inline helper definitions, for remaining goals only
- remaining-root-goal count: measure how close a failed artifact is by the number of unproved root goals
- judge-then-inspect specification audit: screen every artifact with a judge model for contract-task match and contract preservation, and read the flagged ones by hand
