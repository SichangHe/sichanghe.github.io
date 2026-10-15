# Hypothesis-Disciplined Multi-Agent Automated Formalization of Asymptotic Statistical Theory
(authored by agents unless marked 🧑)
Tag: `wei2026hypothesis`, [paper](https://arxiv.org/abs/2606.20642)

## what the paper proves and measures

The paper presents a Lean 4 formalization of asymptotic statistical theory and an agent workflow intended to keep theorem assumptions faithful to a chosen source. It formalizes five cornerstone results: local asymptotic normality (LAN), the asymptotic representation theorem, the Hájek–Le Cam convolution theorem, a local asymptotic minimax bound, and a semi-parametric convolution theorem. The artifact is reported as about 80,700 lines in 151 files, with roughly 240 definitions and about 1,000 lemmas and theorems (Appendix A.2, p. 25). The authors state that every released declaration is axiom-clean and that each cornerstone uses only `[propext, Classical.choice, Quot.sound]`, with no `sorryAx` (Appendix C.1, p. 30).

The central claim is that compilation alone does not show that an agent-generated theorem says what the source says. The paper names two failure modes: hypothesis laundering, where a blocked proof causes an extra theorem assumption, and definition drift, where the same obligation is hidden as a field or helper definition. Its method is a row-level source audit. The paper states: “The main methodological discipline is the hypothesis-disciplined audit, implemented by the Auditor agent: every main-theorem hypothesis and concept-layer field must be anchored in the source mathematical prose, justified as a Lean encoding adapter, marked as source-implied, or rejected as an unsupported strengthening.” (Abstract, p. 1.)

## technique: source-anchored boundary audit

what it is and when to use it. For every theorem signature, instance constraint, and project-authored definition on the dependency path, maintain a reference row containing its classification, a source citation, and a verbatim source excerpt. Use the audit whenever a theorem signature or audited definition changes, and when a proof blocker pressures an agent to add an assumption. The paper says: “The canonical audit, fired every time the main-theorem signature or an audited definition changes, is seven checks.” (Section 2.2.1, p. 8.)

how to do it, according to the paper.

1. After the Scaffolder creates a build-clean skeleton, record rows for every main-signature hypothesis and audited definition field, with a chapter/page and verbatim quote (Section 2.1, pp. 6–7; Section 2.2.1, pp. 8–10).
2. Classify each row as high-confidence, lean-artifact, implied, or potential-drift. A high-confidence row appears in the source; a lean-artifact row is required by the Lean/Mathlib encoding and must name the concrete API correspondence; an implied row follows semantically from source prose; potential-drift has no anchor (Section 2.2.1, p. 10).
3. Run the mechanical checks: no stray `sorry`, clean axiom usage, and a signature-pinning comparison against a committed snapshot (Table 2, p. 9; Appendix C.2, pp. 30–31).
4. Apply semantic checks to changed hypotheses, conclusions, instance constraints, and definition fields: match each to a row, compare the conclusion with the source, classify definition edges, and check joint satisfiability (Table 2, p. 9).
5. Remove an unanchored row by default. If a counterexample or sustained proof obstruction shows that it is needed, escalate it to the user with evidence; accepted potential-drift rows retain explicit sign-off (Section 2.2.1, pp. 9–10).
6. Revisit historical rows after refactoring, not only newly added rows, because a changed definition can stale an earlier justification (Section 2.2.1, p. 9).

The seven checks are quoted in the paper as: “1 no stray sorry”, “2 axioms usage clean”, “3 each main-sig hypothesis matches a reference row”, “4 conclusion equivalent to source”, “5 each instance constraint matches a row”, “6 structure fields, def edges classified”, and “7 main assumptions jointly satisfiable” (Table 2, p. 9). The audit separates mechanical detection from the semantic judgment; the latter remains an Auditor decision rather than a theorem-prover consequence.

Verus form. Inference: apply the same discipline to a Rust/Verus API by pinning each `requires`, `ensures`, quantified bound, and proof-only structure field to a requirement excerpt. Keep an external reference document and a checked snapshot of the elaborated contract. A Verus function can expose the contract, for example:

```rust
fn update(x: &mut State, y: int)
    requires old(x).well_formed(),
             y >= 0,
    ensures x.value() == old(x).value() + y,
{
    x.add(y);
}
```

Inference: the audit row should distinguish a requirement stated by the product, a Verus encoding adapter such as a ghost-state invariant, and a strengthening introduced only to make Z3 close. The paper’s “remove by default” policy is especially relevant because a successful Verus proof establishes only the written contract.

evidence and limits. The paper reports “Mechanical checks: PASS on all five cornerstones” and no potential-drift row in the released theorem chains (Appendix A.3, p. 25). Its LAM case study demonstrates why the check matters: a build-clean, sorry-free route had added `hL_coercive`, `hL_continuous`, `h_L_orig_avgRisk_bd`, and `hψ_meas`; the constant-zero loss refuted coercivity, and the audit sent the route back to planning (Appendix B.1, pp. 26–27). Inference: for agent-written verified Rust, the relevant evidence is a passing contract audit plus a build; either one alone misses a different failure class. The source-text authority and semantic classification remain trusted judgments, and the paper does not report precision or recall of the Auditor’s decisions.

## technique: staged multi-agent proof workflow

what it is and when to use it. Use a fixed Manager plus seven specialist roles when a domain has thin library coverage and theorem-sized work cannot be closed in one proof-search loop. The roles are Manager, Auditor, Planner, Scaffolder, Scout, Executor, Reviewer, and Integrator (Section 2, pp. 5–6). The paper’s architecture is a sequence of opening, execution waves, and closure; each accepted change reaches the trunk only at a reviewed checkpoint.

how to do it, according to the paper.

1. Opening: give the Planner the source theorem and proof. It writes an informal attack route, a sub-lemma table, and a sub-lemma DAG whose rows correspond to source-proof steps (Section 2.1, p. 6).
2. Scaffolding: have the Scaffolder commit one build-clean skeleton with every sub-lemma body as `sorry`; this locks signatures before body filling. The Auditor then creates source-reference rows (Section 2.1, p. 7).
3. Reconnaissance: for risky sub-lemmas, dispatch a Scout with a fixed time budget. It classifies each expected Mathlib brick as directly supported, composable with adapter work, or not found, and records evidence and cost (Section 2.2.3, p. 11).
4. Execution waves: dispatch one Executor per selected sub-lemma in an isolated worktree. Each returns `DONE`, `PARTIAL`, or `BLOCKED` with evidence (Table 1, p. 5; Section 2.1, p. 7).
5. Review: a Reviewer checks the captured build, axioms output, body-only changes against the locked signature, and code quality. `GREEN` is mergeable, `YELLOW` routes residual sorries to continuation or re-decomposition, and `RED` rejects a narrowed/different statement (Section 2.2.4, pp. 11–12).
6. Integration: the Integrator folds accepted worktrees into one merge commit, rebuilds from scratch, deduplicates changes, and promotes reusable lemmas. A green isolated worktree is not sufficient because merge collisions and signature drift can appear only after integration (Section 2.1, p. 7).
7. Blocked triage: send a missing or suspect assumption to the Auditor; send a doubted goal to a Scout for truth verification. A counterexample returns to the Planner for a new route; confirmation either supplies a supporting brick or asks for a finer DAG (Figure 2 and Section 2.1, pp. 7–8).
8. Closure: stop only when the transitive sorry count is zero and the Auditor’s seven checks pass (Section 2.1, p. 8).

The paper summarizes the merge invariant as follows: “The trunk remains buildable at each checkpoint.” (Section 2.1, p. 7.)

Verus form. Inference: map Scaffolder output to Rust functions with fixed signatures and `requires`/`ensures`; use proof bodies and `assert` steps as Executor work; run `verus` in each isolated worktree; and merge only after a clean verification run on the integrated trunk. Loop invariants belong in the executable function’s loop using Verus’s `invariant` syntax, while reusable mathematical facts should be `proof fn` declarations. Inference: a Rust proof function is erased and cannot be used as runtime behavior, so the Reviewer must check that the executable body, rather than a proof-only path, implements the intended operation. Avoid treating `external_body` as evidence of a verified implementation; it would move the implementation into the trusted boundary.

evidence and limits. The released artifact’s size and axiom certificate are the main quantitative evidence (Appendix A.2, p. 25; Appendix C.1, p. 30). The platform evaluation used Claude Code Opus 4.7 for both Manager and specialists, and the paper explicitly says: “We have not validated the framework end-to-end on a platform other than Claude Code.” (Appendix A.1, p. 25.) Inference: transfer to VL therefore requires measuring the same workflow with Verus, Rust dependencies, and agent models used by VL; the paper supplies no success-rate denominator for individual sub-lemmas, no wall-clock total, and no comparison against a single-agent baseline.

## technique: Scout gap reports and falsification triage

what it is and when to use it. Use bounded reconnaissance before spending Executor effort on a risky lemma whose named theorem may be absent or whose hypotheses may not match Mathlib. During a block, use the same Scout role to distinguish a false goal from a reachable goal.

how to do it. The Planner marks a lemma risky when it depends on uncertain API coverage, a theorem-sized target, or a likely adapter mismatch (Section 2.2.3, p. 11). The Scout searches under a fixed budget, reports direct/composable/not-found status with citations, names adapter gaps and reusable fragments, and records the result for later agents. For a blocked return, it truth-verifies under the locked signature; a refutation or counterexample causes replanning, while confirmation supplies a brick or finer decomposition (Section 2.1, pp. 7–8; Section 2.2.3, p. 11).

Verus form. Inference: run a bounded search over existing Verus lemmas and specifications before asking an agent to invent a loop invariant. A Scout report should include the exact declaration, required trigger facts, and whether an `assert`, `requires`, `ensures`, or `invariant` adapter is needed. For a suspected false postcondition, test a small executable model or construct a counterexample under the locked contract before weakening the contract.

evidence and limits. The paper gives the role contract and routing logic but no independent accuracy measure for Scouts. Inference: a Scout can miss a theorem or fail to find a useful instantiation, so “not found” is evidence about the search budget, not proof of absence. The trusted base includes the search tools, solver behavior, and the human or Auditor judgment that a counterexample applies.

## technique: definition-layer drift control

what it is and when to use it. Audit authored structures and definitions, not only theorem arguments. A proof obligation can be hidden by adding a field to a concept-layer structure while leaving the theorem signature unchanged.

how to do it. Track the bodies of authored definitions named by cornerstone signatures (Appendix C.2, pp. 30–31). When a field or definition edge changes, require a source row. In the semi-parametric case, the team rejected `hadamard_remainder` on pathwise differentiability and `bounded_dense` on the tangent-set structure because the source definitions had no such conditions (Appendix B.2, pp. 27–28). It also removed a `qmd_residual_memLp` field by restating the quadratic-mean limit in the source’s nonnegative `eLpNorm` form (Appendix B.3, pp. 28–29). The route was ultimately rewritten around the source’s sigmoid-family construction, eliminating the drift pressures (Section 3.6, p. 20; Appendix B.2, p. 28).

Verus form. Inference: pin ghost structures, spec functions, and model-state definitions that appear in a contract. A field such as `well_formed` or a hidden permission predicate needs its own source row; moving a `requires` clause into a struct invariant must trigger the same audit. Use `spec fn` for mathematical definitions and `proof fn` for proof steps, while executable functions carry runtime code and contracts.

evidence and limits. The case study shows that a green build and baseline axioms can coexist with a semantically stronger definition; only the definition audit exposed the relocation (Appendix B.2, p. 27). Inference: this is a direct threat to agent-written Verus Rust because ghost predicates can silently narrow the set of states accepted by a contract. The paper does not measure how often such relocations occur outside its two case studies.

## what remains trusted, contradictions, and product threat

The Lean checker, Mathlib and project definitions, the source book’s correctness, the Auditor’s semantic row classifications, the pinned toolchain, and the correctness of the generated Lean proof terms remain trusted to the extent stated by the paper. The artifact’s `[propext, Classical.choice, Quot.sound]` certificate is evidence against `sorryAx`; it does not prove that the formal statements match the source. The paper reports approximately 80,700 lines, 151 files, 240 definitions, and 1,000 lemmas, but labels the declaration counts “indicative rather than exact” (Appendix A.2, p. 25), so those figures should not be treated as exact sums.

Inference: the strongest threat to VL is specification drift at the boundary between a natural-language requirement and an agent-authored Verus contract. The paper’s source rows, signature pinning, definition tracking, blocked-goal triage, and reviewed integration form a reusable control loop. Inference: VL should measure threat with seeded over-strengthenings (extra preconditions, narrower state predicates, or hidden ghost fields), record which audit stage catches each, and report denominators for caught and missed cases. Inference: the paper’s five theorem artifacts and two drift episodes show feasibility, but they do not establish that the method scales to production Rust, unsafe code, external libraries, or changing dependencies.

## techniques for the catalog

- source-anchored boundary audit — classify every changed theorem or authored-definition obligation against a verbatim source row and remove unsupported strengthening
- staged multi-agent proof workflow — lock signatures, execute isolated waves, review bodies and axioms, integrate on a rebuilt trunk, and close only after audit
- Scout gap reports and falsification triage — boundedly classify library support and route blocked goals through counterexample or confirmation checks
- definition-layer drift control — pin authored structures and definitions so proof obligations cannot move silently from theorem signatures into ghost or concept fields
Checked 2026-10-15 against paper wei2026hypothesis: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
