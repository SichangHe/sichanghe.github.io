# Self-Spec Verifiable Code Generation
(authored by agents unless marked 🧑)
Tag: `qian2026selfspec`, [paper](https://arxiv.org/abs/2609.39568)

Audit: audited 2026-10-13 against the paper; checked every number in Tables 3 to 5 and the quoted sums (recomputed all 16 cells per configuration), page and section references, the quotations, the CEF and VGCR steps against Section 3 and Appendices A, B, D, E, and the Verus snippets; changed an over-general enforcement step (C relies on the prompt), CEF step 6 (only exceptional constructs), one unsound Verus index (a@[..] for a Vec), Python problem 57 wrongly listed as a split, and marked four statements as inference; the table sums that disagree with the text (44.1%, 12.4 points, a printed gain of 25) were already noted in the study and are the paper's own.

source: Qian, Dong, Li, Zhu, Gu, Li; arXiv:2609.39568v1, 30 Sep 2026; 21 pages with appendices A to E. Page numbers below are the PDF's.

## what the paper is and what it measures

The paper has two parts. VeriCodeBench is a benchmark of 400 problems (100 each for C with ACSL and Frama-C/WP, Java with JML and OpenJML, Rust with Verus, Python with Nagini) in which the model writes the specification and then the code, and the code is verified against that same specification. CodeNova is a pipeline with two stages, Constraint-Guided Specification (CGS) and Verifier-Guided Candidate Repair (VGCR).

Nothing is proved about either part. What is measured, per model and language (Table 3, p.8): mean requirement coverage of the generated specification, the count of verifier-accepted implementations, and the count of problems where both hold. The reason for the split is stated in §3.2.2, p.5: “Verifier acceptance establishes that code satisfies a specification, not that the specification faithfully captures the requirement.”

What stays trusted (Inference: the study's reading of the paper's pipeline, not a list the paper gives):
- the curated target obligations of each problem, written by hand (Appendix A.1, p.12)
- the canonicalization rules and SMT encoding inside the coverage checker (Appendix A.3, p.13)
- the four verifiers and their solvers
- Inference: the natural-language requirement itself; no step checks that the curated targets match what a user would mean by it.

## technique 1: frozen self-written specification

What it is: the specification the model writes is the only one the code is checked against, and nothing downstream may edit it.

When to use: whenever an agent goes from a natural-language request to verified code with no human-written contract. §3.2.1, p.5: “It reflects the information boundary of autonomous use: after receiving a natural-language request, the system cannot assume access to a human-written formalization that corrects its own interpretation.”

How it is done:
1. give the model only the requirement and the fixed signature plus public type context (§3.1, p.4; Appendix A.1, p.12)
2. generate the specification and store it in a canonical form; for Rust this is structured signature clauses (Appendix A.4, p.13)
3. generate code conditioned on the stored specification (§3.1, Equation 3, p.4)
4. during repair, allow changes only to bodies, helper proof code and loop annotations (Appendix A.4, p.13)
5. enforce step 4 mechanically where the adapter does so (Java, Python, Rust; C relies on the prompt, see below). Appendix A.4, p.13: “The Java and Python adapters reinsert the canonical specification after generation and repair, while the Rust adapter derives the signature from its stored structured clauses; the C pipeline passes the same stored ACSL block to every downstream prompt.”

Why freezing matters, Appendix A.2, p.13: “This prevents a system from obtaining an easier proof by silently deleting a postcondition, strengthening a precondition, or substituting the benchmark’s target specification.”

Verus form: the paper's Rust track already does this. The `requires` and `ensures` clauses of the function are stored as data and the signature is derived from the stored clauses (Appendix A.4, p.13). Inference: this means whatever signature the model returned is discarded; the paper does not say so. Loop `invariant` and `decreases` clauses and proof code inside the body stay editable. Inference: for C the paper describes only passing the same block to each prompt, with no reinsertion step, so the C track's freeze rests on the prompt; the paper does not say whether a C candidate with an altered contract is rejected.

Where it fails: a frozen specification that is wrong stays wrong. §4.2, p.8 to 9, gives the case: with DeepSeek V3.2 on C, repair raised valid implementations from 34 to 60 of 100 while joint successes rose from 8 to 11 of 100.

## technique 2: joint success as the conjunction of coverage and validity

What it is: a problem counts only if the specification covers every curated target and the verifier accepts the code under that specification.

How it is done (§3.2.2, p.5):
1. compute coverage A as the fraction of the problem's curated targets that the generated specification covers (Equation 6)
2. compute validity C as 1 when the native verifier returns valid for the generated code and generated specification (Equation 7); p.5: “Syntax errors, failed proof obligations, verifier errors, and timeouts are not counted as valid.”
3. joint success J is 1 only when C = 1 and A = 1 on the same problem (Equation 8)
4. keep the denominator fixed so a failed generation cannot shrink it. p.5: “The denominator Mi is fixed, so missing, unparsable, or unsupported specifications receive zero credit for affected targets.”

Verus form: run Verus on the file for C; for A, see technique 3. Nothing Verus-specific changes.

Evidence that the two conditions differ: Table 5, p.18, Kimi-K2.7-Code, Direct, Rust, 100 problems: validity is 91 under both the self-written and the oracle specification, coverage is 0.697 against 1.000, joint success 57 against 91. Appendix D.4, p.18, explains the equal totals: “The unchanged total of 91 therefore hides both directions of specification sensitivity, while the 34-point joint-success gap exposes the missing requirement coverage in the self-generated contracts.”

Where it fails: the metric rewards coverage of the curated targets only. §4.2, p.8: “Coverage alone does not establish specification complexity or rule out over-constraint.” Inference: a specification can cover all targets and add a false extra postcondition; the code would then fail to verify, which shows up as a validity failure, not as a specification failure.

## technique 3: Constraint Entailment Framework (CEF), a deterministic coverage check

What it is: a scorer that decides, without an LLM, whether each hand-written target clause is covered by some conjunction of the generated clauses, using SMT entailment whose direction depends on the clause type.

When to use: to grade a generated contract against a reference list of obligations when the generated contract may split or merge clauses.

How it is done:
1. curate, per problem, a set of atomic targets, each with identifier, clause type, formal expression, gloss and provenance (Appendix A.1, p.12)
2. canonicalize generated clauses with language-specific rules. Appendix A.3, p.13: “Canonicalization removes superficial differences such as parameter names and supported Boolean rewrites while preserving pre/post-state distinctions.”
3. for each target g, search nonempty subsets U of compatible generated clauses, smallest first, and stop at the first witness (Appendix A.3, p.13)
4. direction (Equation 5, p.5): if g is a precondition, require g to entail the conjunction of U; if g is a post-, frame- or exceptional condition, require the conjunction of U to entail g
5. decide each entailment L entails R by asking an SMT solver whether L and not-R is unsatisfiable (Appendix A.3, p.13)
6. exceptional constructs outside the shared Boolean fragment are matched by conservative type-aware rules (Appendix A.3, p.13)
7. score = covered targets divided by all targets (Equation 6, p.5)

Why the precondition direction is reversed, §3.2.2, p.5: “The reversed direction for preconditions prevents credit for an unnecessarily restrictive domain; guarantees must imply the target behavior.” Inference, in words: a generated `requires` that is stronger than the target is not entailed by the target, so it earns nothing; a generated `ensures` set that is weaker than the target does not entail it, so it earns nothing.

Limits the paper gives: Appendix A.3, p.13: “In our implementation, we set N = 5 and limits the maximum search attempts to 2, 000.” N is not defined beyond the bound of 2^N − 1 checks per target. Inference: with N = 5 one target needs at most 31 checks, so a cap of 2,000 attempts can only bind if it counts across targets or if N is not the number of clauses searched; the paper does not say which.

Verus form (inference, built from the paper's Rust case in Appendix D.1): store each target as one `requires` or `ensures` expression. To test a postcondition target in Verus itself, without a separate SMT encoding, write a `proof fn` whose `requires` holds the chosen generated `ensures` clauses and whose `ensures` holds the target; Verus accepting it with an empty body is the entailment witness. For a precondition target, swap the two sides. What does not carry over: the paper's canonicalizer is not described in enough detail to rebuild, and it reports no error rate for it.

Evidence: none for the scorer itself. The paper reports no agreement study between CEF and human judgment, and no count of targets it scored as unsupported. Inference: every coverage number in Table 3 inherits the checker's unmeasured false-negative rate, since a correct clause written in a form the canonicalizer does not handle scores zero.

## technique 4: curating target obligations separately from proof annotations

What it is: the grading targets are the requirement-level clauses, not every annotation in the reference solution.

How it is done (Appendix A.1, p.12, four stages):
1. write a concise requirement and a fixed signature
2. hand-curate atomic targets from the intended behavior, leaving out conditions that exist only to make a particular proof go through. p.12: “The target set is not obtained by blindly extracting every annotation from a reference file.”
3. write a reference implementation with a full native specification and check it with the same verifier, which shows the task can be done under the fixed interface
4. run automated checks that identifiers, paths, signatures, clause schemas and target counts line up

Verus form (inference): unchanged. For a Rust task, targets are the `requires`/`ensures` a caller relies on; overflow guards and loop `invariant` clauses used only by the reference proof are left out unless the requirement means them.

Where it fails: the paper admits the curators decide what the requirement means when it is silent. p.12: “Conversely, when a concise requirement leaves a verification-relevant detail implicit, the reference specification is used to resolve the instance’s operational meaning.” Inference: a model that reads the silent detail differently is scored as missing coverage though the requirement text allowed its reading. Appendix D.4, p.18, shows two Rust problems (SquareBounded, SafeMulSmall) where the oracle contract demands overflow safety that the self-written contracts lacked.

## technique 5: Constraint-Guided Specification (CGS)

What it is: specification writing split into reading the requirement into atomic constraints, translating them into the specification language, and a self-review loop.

When to use: when a directly generated contract drops cases, such as the false branch, the unchanged region after a mutation, or a length change.

How it is done:
1. extract atomic constraints Q from requirement and interface, grouped by role: admissible inputs, return-value behavior, state changes, invariants; for Rust also mutation and panic freedom (§3.3.1, p.7; Appendix B.1, p.14)
2. translate Q into a specification, with the requirement and interface still in view (Equation 9, p.7; Appendix B.1, p.14)
3. have the model review the specification against the requirement and Q; it returns an alignment judgment, missing constraints, inconsistencies and refinement hints (Equation 10, p.7; Appendix B.1, p.14)
4. refine from those findings; repeat 3 and 4
5. stop when the model reports alignment, lists no issues, or the review budget runs out (§3.3.1, p.7)
6. validate the representation and apply supported-syntax checks and fallback rules before saving (Appendix B.1, p.14)
7. keep loop invariants, loop frames and termination measures as separate, mutable hints, not as part of the contract (Appendix B.1, p.14)

The rule that drives step 1, Appendix B.1, p.14: “For example, updating one array element while preserving the others requires both an updated-value relation and an unchanged-region condition.”

The paper's Verus example (Appendix D.1, p.16, Rust problem 36, vector mutation): the direct specification used one subrange equation and covered 2 of 3 targets; CGS wrote the length change and the unchanged prefix as two clauses,
`ensures v.len() == old(v).len() - 1` and `ensures forall|i: int| 0 <= i < v.len() ==> v[i] == old(v)[i]`, giving 3 of 3.

The Verus prompts (Appendix E.3, p.20) constrain vocabulary: “Use named returns, old/final for mutable references, and v@ sequence views.” and “Do not invent null, validity, ownership, wf, or panics predicates.” The self-check prompt for Rust (p.20): “Check functional coverage and reject invented sequence members, dropped return cases, or dropped mutation/frame constraints.”

Evidence (Table 3, p.8; four models, four languages, 100 problems each, self-spec):
- coverage rose in all 16 model-language settings; mean 0.7162 to 0.7761 (§4.2, p.8; both means match the table)
- validity fell: summing Table 3, Direct has 1136 valid of 1600 (71.0%) and CGS alone 1049 of 1600 (65.6%)
- joint success: CGS alone 730 of 1600 (45.6%)
- largest drop, §4.2, p.8: “For Kimi-K2.7-Code on Rust, coverage rises from 0.6965 to 0.7562 while valid implementations drop from 91 to 60.”
- on Rust, CGS alone lowered joint success for two of four models: DeepSeek V3.2 33 to 30, Kimi-K2.7-Code 57 to 43; it raised Qwen3.6-plus 38 to 42 and Claude-Sonnet-5 68 to 71 (all of 100)

Where it fails:
- the review is the model checking itself. §3.3.1, p.7: “This self-check is a generation heuristic: Q is model-generated, and CEF independently evaluates ŝ without external hints.” Appendix B.1, p.14: “Budget exhaustion does not establish alignment.”
- a more complete contract can be harder to prove. Appendix D.2, p.16, C problem 5: CGS added a postcondition that the read pointer's target is unchanged; nothing excluded aliasing of the two pointers, and Frama-C/WP timed out on the new goal at 10 seconds.
- the review budget is not stated anywhere in the paper.

## technique 6: Verifier-Guided Candidate Repair (VGCR)

What it is: after a failed verification, the model first turns diagnostics into a plan of typed subgoals, then writes several whole-program candidates, each steered by a different focus; the first one the verifier accepts wins.

How it is done (§3.3.2, p.7; Appendix B.2, p.14 to 15):
1. generate initial code from requirement, interface and frozen specification; verify
2. on failure, build a plan from the diagnostics: failure summary, subgoals, overall strategy, semantic risks; each subgoal has an issue type, the diagnostic evidence, and a proposed code or annotation change
3. issue types listed: syntax and specification placement, postconditions, memory or permission safety, bounds and overflow, loop invariant establishment or preservation, frames, termination; timeouts and unclassified failures also trigger planning
4. produce up to K candidates from the same code and plan, each with a focus. Appendix B.2, p.14: “For each plan, the focus schedule first integrates all subgoal hints, then prioritizes individual subgoals in order, and finally requests an alternative implementation if the candidate budget reaches that focus.”
5. run language-subset prechecks, then verify each candidate as a complete program, one after another
6. return the first accepted candidate
7. if none is accepted, the last candidate that reached the verifier and its diagnostics start the next round; candidates rejected by prechecks never replace the current code
8. on budget exhaustion record a failure

Selection rule, Appendix B.2, p.15: “Selection uses verifier acceptance, without an LLM score or an assumption that unproved obligations decrease monotonically.”

What the plan is not, Appendix B.2, p.14: “These subgoals are LLM interpretations of diagnostics, not independently proved lemmas; a failed or timed-out proof attempt is not treated as a concrete counterexample.”

The Rust repair prompt (Appendix E.3, p.21) allows: “Change only body, helper proof code, and loop annotations; use safe Rust and preserve the verus! wrapper and main.”

Verus form: as in the paper. A candidate may change the body, loop `invariant` and `decreases` clauses, and `proof { }` blocks; `requires`/`ensures` are rebuilt from the store (technique 1). Inference: step 7 carries forward the last candidate, not the one with the fewest errors, so a round can end on a worse program than it started with; a VL loop could keep the candidate with the fewest Verus errors, but the paper did not test that.

Evidence (Table 3, p.8, sums over 16 settings of 100 problems):
- on Direct specifications: valid 1136 to 1284 of 1600 (71.0% to 80.3%); joint 703 to 749 of 1600 (43.9% to 46.8%). These two VGCR sums are computed here from the table; the paper states no VGCR aggregate.
- on CGS specifications, §4.2, p.8: “combining two stages raises validity from 65.6% to 75.7% and joint success from 45.6% to 49.1%.” The table sums agree: 1049 to 1211 valid, 730 to 786 joint, of 1600.
- Rust, valid of 100, Direct then with VGCR: DeepSeek V3.2 44 to 68; Kimi-K2.7-Code 91 to 92; Qwen3.6-plus 56 to 76; Claude-Sonnet-5 96 to 98
- Kimi-K2.7-Code on Rust with CGS: 60 valid before and after VGCR, so repair recovered none of the 31 lost to CGS

Where it fails: it cannot add coverage. §4.2, p.9: “Even verifier-accepted code cannot achieve joint success without an adequate initial specification.” K, the number of rounds and the verifier timeouts are not stated in the paper.

## technique 7: repair moves seen in the case studies

These are single examples from Claude-Sonnet-5 runs (Appendix D, p.15 to 18), not measured techniques.

- replace an existential loop invariant with a witness variable (Java problem 16, Appendix D.2 to D.3, p.16 to 17). The failing invariant said some earlier index holds the minimum; OpenJML could not show it preserved. The repair added a variable `minIdx` updated with the minimum and invariants `0 <= minIdx && minIdx < i` and `a[minIdx] == min`. Verus form (inference): keep an index variable beside the running value and state `0 <= min_idx < i` and `a@[min_idx as int] == min` (for `a: Vec<i32>`) in the loop `invariant`, in place of an `exists` clause.
- split one compound postcondition into one clause per target (C problem 13, Rust problem 36; Appendix D.1, p.15 to 16); Python problem 57 instead adds the missing false-branch postcondition (Appendix D.1, p.16)
- make exceptional cases explicit in code before the indexed read (Java problem 3, Appendix D.3, p.17)
- fix reference mutability to match a frame postcondition (Rust problem 23, Appendix D.3, p.17): CGS added `ensures *v == *old(v)` while the signature had an immutable reference. p.17: “This is a code/interface repair, not a specification weakening.” Inference: this repair changes the function signature, which the freeze of technique 1 is said to protect; the paper does not reconcile the two.
- for a mutable-reference postcondition in Verus, name pre- and post-state (Rust problem 42, Appendix D.4, p.17 to 18). The self-written `ensures dst.len() == old(dst).len()` was rejected; the oracle form was `ensures final(dst).len() == old(dst).len()`. p.18: “Verus rejects the self-generated form because a mutable-reference postcondition must disambiguate the pre- and post-state with old/final; the oracle-conditioned Direct implementation verifies.”

## technique 8: paired runs and the oracle-specification control

What it is: two experimental controls that separate specification effects from repair effects.

How it is done:
1. paired repair runs (Appendix B.3, p.15): “Each repair run reuses the exact specification and initial code from its corresponding run without repair.” Coverage is therefore identical inside each pair, and any change in validity is due to repair.
2. oracle control (§4.3, p.9): swap the model's specification for the curated one, still require the model to write code and loop annotations, and compare validity.

How to read the oracle gap, §4.3, p.9: “However, the gap should not be interpreted as a direct measurement of specification errors, because replacing a self-generated specification with an oracle specification changes both the information available to the model and the verification obligations.”

Evidence (Table 4, p.9, valid of 100 per cell). Rust, self then oracle: DeepSeek V3.2 Direct 44, 70; CodeNova 58, 91. Kimi-K2.7-Code Direct 91, 91; CodeNova 60, 93. Qwen3.6-plus Direct 56, 74; CodeNova 69, 80. Claude-Sonnet-5 Direct 96, 98; CodeNova 97, 100.

Verus form: unchanged; both are harness design.

## numbers that do not add up

- Direct joint success. §4.2, p.8: “Under direct setting, code validity averages 71.0% across the 16 model–language settings, but joint success reaches only 44.1%.” The 16 Direct joint cells of Table 3 sum to 703 of 1600, which is 43.9%. Validity (1136 of 1600) does match 71.0%.
- Claude-Sonnet-5 Direct. The text gives 60.3% average joint success across the four tracks; the table cells 30, 65, 68, 76 average 59.75%.
- oracle gap. §4.3, p.9: “Even with VGCR, C ODE N OVA using self-generated specifications remains 12.4 percentage points lower than the oracle setting in aggregate validity.” Table 4's CodeNova cells sum to 1211 self and 1483 oracle of 1600, a gap of 17.0 points; the 16 printed arrows also sum to 272, that is 17.0 per setting.
- Table 4, DeepSeek V3.2, C, Direct: self 34, oracle 69, printed gain 25; 69 − 34 is 35.
- Appendix D.1's Rust problem 36 shows a mutable-vector postcondition written with `v.len()` and `old(v)` and says it kept verifier acceptance; Appendix D.4 says Verus rejects a mutable-reference postcondition that does not use old/final. Inference: either problem 36's parameter is not a mutable reference in the way problem 42's is, or the printed clause is abbreviated; the paper does not say.
- pass@k (Appendix C, p.15) was run on a fifth model, DeepSeek V4.1 Flash (§4.1, p.7), and is reported only as curves in Figure 2 (p.9) with no table, so no pass@k number can be cited.

## what is already done, so VL need not redo it

- a 100-problem Rust/Verus set with hidden curated targets, reference solutions and a deterministic coverage scorer exists; the code link is in the abstract (p.1). Its families: scalar arithmetic, Option/Result, immutable vectors, vector mutation, ownership/slice (§3.2.3, p.6).
- the measurement that verifier acceptance overstates end-to-end success on Rust: Direct, Claude-Sonnet-5, 96 valid against 68 joint of 100; Kimi-K2.7-Code 91 against 57 (Table 3, p.8).
- the finding that a self-review loop for specifications raises coverage and can lower provability, with repair needed to win it back (§4.2, p.8; Appendix D.5, p.18).

## threat to a product of agent-written verified Rust

Inference: low as a competitor, high as a warning. CodeNova is a prompt pipeline over single functions of the size of textbook exercises; the Rust problems have no multi-function or multi-file structure described. Its best Rust result is 73 joint successes of 100 (Claude-Sonnet-5, CodeNova, Table 3), so about a quarter of small tasks still end with a verified program whose contract misses part of the request or with no verified program. The warning is the gap itself: a product that reports only that Verus accepted the code would have counted 97 of those 100 as done. A product needs its own answer to who checks the contract, and this paper's answer (hand-written hidden targets plus an entailment scorer) only works where someone has already written the targets.

## techniques for the catalog

- frozen self-spec: store the generated contract as data and rebuild the function signature from it after every repair, so repair cannot weaken it
- joint success metric: count a task only when the contract covers all reference obligations and the verifier accepts the code under that same contract
- directional entailment coverage: a reference precondition must entail the generated ones and generated postconditions must entail the reference one, checked by SMT over small clause subsets
- requirement-level target curation: grade against hand-picked atomic obligations, leaving out annotations that exist only for the reference proof
- constraint-guided specification: extract atomic constraints by role, translate, then self-review and refine, keeping loop hints outside the contract
- unchanged-region rule: every mutation contract states the changed value, the length change and the unchanged elements as separate clauses
- plan-then-focused-candidates repair: turn diagnostics into typed subgoals, write several whole-program candidates each with a different focus, accept the first the verifier passes
- witness-variable invariant: replace an existential loop invariant with a tracked index variable and two plain invariants about it
- paired repair runs: reuse the exact contract and first code attempt when measuring a repair stage, so coverage is held fixed
- oracle-contract control: swap in a curated contract to see how much validity depends on the contract's proof interface, read as sensitivity and not as an error count
