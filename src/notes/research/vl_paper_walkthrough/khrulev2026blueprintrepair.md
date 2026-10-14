# BlueprintRepair: Typed Local Edits for Failed Lean Proof Blueprints
(authored by agents unless marked 🧑)
Tag: `khrulev2026blueprintrepair`, [paper](https://arxiv.org/abs/2607.28110)
## what the paper proves and builds

BlueprintRepair treats a Lean proof plan as a declaration-level directed acyclic graph (DAG). A node is a formal statement; an edge records a declared proof dependency. The repair interface lets a model change one typed graph object at a time while Lean checks the resulting module. The target theorem's statement is immutable. Acceptance is graph-aware: the module must elaborate, every node on the target closure must be proved, the original target hash must remain, no forbidden shortcut or stored refutation may appear, and every blueprint lemma reached from compiled proof terms must be declared as an incoming dependency.

The paper's acceptance definition is explicit:

> “A state is accepted only when (i) the full module elaborates, (ii) every node in C is proved, (iii) the target statement is unchanged and contains no forbidden proof shortcut, (iv) no node is a stored kernel-refuted statement, and (v) the compiled proofs agree with the declared graph.” (Section 2)

Section 2 defines the dependency condition as Actual(v) ⊆ Declared(v). Equality is deliberately unnecessary: a harmless declared edge may remain unused. Nodes outside the target closure still have to elaborate and not be refuted, but they may remain deferred; strict all-node completion is measured separately.

The benchmark contains 142 failed blueprints over 141 miniF2F targets: 91 edit-shaped failures, 39 proof-authoring failures, and 12 compound states. The edit families are false or too-strong statements, missing hypotheses, missing dependencies, redundant dependencies, dead nodes, monolithic nodes, and inconvenient representations. The controlled construction validates false statements with Lean refutations, preserves target statements, and checks dependency defects against compiled proof terms (Section 2, Table 1). The interface exposes ten operations: weaken_node, strengthen_hypotheses, rewrite_node_statement, split_node, add_dependency, drop_dependency, drop_false_node, drop_dead_node, set_node_proof, and stop_unrepairable (Section 3, Table 3).

## technique 1: typed local graph repair

what it is and when to use it

Use typed repair when a blueprint is mostly correct and the defect is local: a statement can be weakened or strengthened, an edge can be added or removed, a node can be split or deleted, or one node needs proof text. The operation names an existing node and the harness preserves source outside the requested edit. A JSON schema rejects unknown names, cycles, forbidden constructs, target changes, and inconsistent proof dependencies (Section 3).

how to do it

1. Represent the Lean development as a DAG with node statements, proofs, and explicit proofUses edges (Section 2)
2. Give the model the current blueprint, normalized Lean source, typed statuses, and verifier feedback (Section 3, Figure 2)
3. Emit exactly one schema-valid operation referring to an existing node (Section 3)
4. Apply it mechanically; elaborate the module, run the fixed node prover on deferred nodes, and compare actual compiled dependencies with declared edges (Section 3)
5. Feed the accepted or rejected result and its structured reason into the next turn; store every action and result in BlueprintTrace (Section 3 and Section 5)
6. Stop only at a terminal module satisfying the five acceptance checks (Section 2 and Appendix B.1)

The paper gives a complete induction example. A monolithic node states 12 ∣ 4n+1 + 20. The five-call trajectory is: split_node (first proposal refused because it uses native_decide); split_node (applied, base case closes, step proof does not elaborate); rewrite_node_statement on step; set_node_proof on step with omega; set_node_proof on the target, which then closes by induction (Appendix A.1, Figure 4). This shows how structural decomposition and local proof writing compose. The paper states: “The split is structurally correct, but the induction step still needs a proof.” (Appendix A.1)

evidence and limits

With DeepSeek-V4-Flash, typed repair solves 79/91 edit-shaped, 16/39 proof-authoring, 9/12 compound, and 104/142 total states (Table 5, Section 4.1). The denominator is the 142 controlled states, with the strata shown above; these are one episode per state and interface. The same run's later dependency audit passes 104/104 typed endpoints. Within 10,000 completion tokens per task it reaches 103 solves, versus 90 patch and 87 rewrite; patching eventually reaches 109/142, while typed and rewrite reach 104/142 (Figure 3, Section 4.2). Typed repair's all-in provider cost per accepted solve is the baseline: patching is 1.30× and rewriting 2.06× as expensive. With Qwen3.6-Flash, typed solves 70/91 edit-shaped, 10/39 proof-authoring, 4/12 compound, 84/142 total, and all 84/84 pass the later dependency audit (Table 5).

The paper's own caution is material: the benchmark has graphs of only 1–8 nodes and target depth at most 3; one episode per state does not estimate repeated-sampling performance; and the ten-operation vocabulary is not claimed complete (Section 8). Patching solves 11 states typed repair misses, but a hand translation expresses all 11 as typed calls, so the observed gap is model action choice rather than reachability; this is a paper experiment, not evidence that a model would choose those calls (Section 4.3). The authors warn: “The ten operations are one practical vocabulary, not a proof that no better granularity exists.” (Section 8)

## technique 2: kernel-backed dependency auditing

what it is and when to use it

Kernel acceptance of the target theorem is insufficient when the blueprint itself promises dependencies. Use a second audit whenever proofs are generated or an edge is changed. Extract blueprint nodes reached from each elaborated proof term, stopping at another blueprint declaration, and reject any Actual(v) node absent from Declared(v) (Sections 1–2, Appendix B.1).

how to do it

1. Compile the candidate in a fresh Lean process (Appendix B.1)
2. Check each target-closure node is proved and splice fixed-prover proofs into the assembled module (Appendix B.1)
3. Hash the target statement and inspect its axiom certificate for sorryAx, native_decide, or a nonstandard axiom (Appendix B.1)
4. Traverse each real proof term through ordinary helper constants, stopping at blueprint declarations, to compute Actual(v) (Section 2)
5. Compare Actual(v) to incoming proofUses edges and require Actual(v) ⊆ Declared(v); retain unused edges only as a quality signal (Section 2, Appendix B.1)
6. Repeat the audit on stored final files, not only online candidates (Section 4.1)

Evidence is unusually concrete. During runs the gate rejected two typed, five patch, and one rewrite candidates for inconsistent graph use; among stored results, 104/104 typed, 109/109 patch, and 104/104 rewrite passed the repeated audit (Section 4.3 and Appendix B.1). The inequality is intentionally one-way: on the DeepSeek run, harmless unused edges remain on 10 typed, 28 patch, and 6 rewrite results; all accepted endpoints are nevertheless valid (Appendix B.1). The authors also preserve rejected actions, diagnostics, token counts, costs, and dependency scans in BlueprintTrace so a final success label does not erase failed decisions (Section 5, Table 6). The paper says: “We report unused edges as a quality measure and require only that no dependency stays hidden.” (Appendix B.1)

Inference: In Verus, the same discipline would require checking the compiled verification artifact or a trusted verifier's dependency metadata against a declared proof-plan graph. Verus constructs that carry over are theorem/proof functions, `requires`, `ensures`, and `assert`; the paper's Lean kernel and LeanArchitect graph attributes do not carry over. An implementation should keep the target specification immutable, run `verus` after every candidate, and reject a candidate whose proof relies on an undeclared proof lemma; the exact dependency extractor is a new engineering component, not a claim made by this paper.

## technique 3: controlled interface and cost evaluation

The paper isolates interface effects by giving typed edits, atomic exact search-and-replace patches, and complete-module rewrites the same normalized source, typed diagnostics, verifier feedback, model, output cap, and eight-step (twelve for compound) budget (Section 3). Patches apply atomically; rewrites pass the same parser, import, namespace, forbidden-token, target-signature, Lean, and dependency checks (Section 3). The benchmark artifact pins Lean/mathlib, records input/cache/reasoning/output tokens and provider prices, and retains exact prompts and schemas (Table 6, Appendix C).

Inference: VL can use this as an evaluation pattern for proof repair: hold the Rust/Verus state, diagnostics, model, and stopping budget fixed; compare typed proof-plan actions, local source patches, and whole-file rewrites; count success only after a fresh Verus run and any declared-dependency audit. The paper does not measure Verus, Rust, or production-sized graphs, so transfer is an inference.

## what remains trusted, contradictions, and product threat

The trusted core is Lean's kernel and the independent graph/dependency checker; the model, prompts, operation schema, node prover, benchmark construction, and one-episode policy remain experimental machinery. The fixed node prover is rfl, simp, omega (with norm_num on six states), each at 200,000 heartbeats; on 39 proof-authoring states, aesop closes 2 and nlinarith 1, while ring, linarith, and norm_num close none, with six modules requiring an import (Appendix B.2). This confirms that the proof-authoring label depends on the fixed prover and budget.

The reported totals are internally consistent: Table 5 sums 104, 109, and 104 over 142; Table 7's family rows also sum to 142 and the None column to 24. The paper says no pairwise coverage difference is clear of zero and gives typed-versus-patch −2.2 points on 91 edit-shaped states, 95% interval [−6.6,+2.2], exact McNemar p=0.63 (Section 4.1). Its percentages and cost ratios use different denominators, so 103/142 at the 10k budget must not be read as the final 104/142 coverage.

Inference: For a product that lets agents write verified Rust, the threat is moderate and localized. Typed operations reduce accidental edits and make repair traces auditable, while kernel checking blocks unsound proofs; however, a dependency graph can be semantically incomplete even when Verus accepts a function, and the small miniF2F benchmark says little about long-lived Rust modules. VL should adopt immutable target specifications, schema-checked local edits, fresh verifier rechecks, and retained rejected trajectories before trusting automated repair.

## techniques for the catalog

- typed local blueprint repair — expose one schema-checked operation at a time for statement, node, edge, or proof edits while preserving untouched source
- graph-aware acceptance — require elaboration, target immutability, proof completion, no forbidden shortcut, and Actual(v) ⊆ Declared(v)
- post-run dependency audit — repeat compiled-proof dependency extraction on stored endpoints and record unused edges separately
- typed-versus-free-form evaluation — compare typed edits, atomic patches, and rewrites under matched source, feedback, model, and token/cost budgets
- trajectory artifact — retain accepted and rejected actions, diagnostics, graphs, tokens, costs, and final certificates for reproducibility
Checked 2026-10-13: audit record khrulev2026blueprintrepair; paper-study comparison complete; gate executed; experiments not rerun
