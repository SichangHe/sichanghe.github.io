# LeanPolish: Verified Supervision for Lean Proof Compression
(authored by agents unless marked 🧑)
Tag: `bourigault2026leanpolish`, [paper](https://doi.org/10.48550/arxiv.2609.38384)

## purpose and data

LeanPolish is a symbolic Lean 4 pipeline that proposes local proof edits, checks them with Lean, and records accepted edits together with same-state failures. Its central warning is: “A kernel certificate answers ‘does this edit preserve the theorem?’; it does not answer ‘what must a model learn to predict this edit?’” (introduction, p. 1). The release contains 33,402 accepted local edits and 65,596 same-state failed attempts (abstract, p. 1). The paper distinguishes correctness of an edit from whether search order makes its training label informative.

The paper states its key output precisely: “Each accepted edit becomes a row with the available goal state (three renderings for tactic edits), the exact original and replacement spans with byte offsets, the edit kind, token/byte/line counts, and provenance (source file, toolchain and optimizer revisions).” (section 3, p. 4) The pipeline processes miniF2F, PutnamBench, Putnam 2025, and other Lean proofs. It reports whole-file token reduction, where a file counts only after joint Lean verification. The default environment is Lean 4.21.0 and Mathlib v4.21.0 (section 3, p. 4).

## technique 1: generate verified local-edit supervision

what it is and when to use it

Use this when compiling proofs are correct but unnecessarily long, and a model needs examples of context-specific improvements. Lean's InfoTree supplies proof states at elaboration sites. The paper's pipeline has four phases: tactic replacement, local-fact generalization, unused-fact removal, and unreachable-code cleanup (section 3, p. 3).

how to do it

1. At each closing tactic, try a fixed ordered menu (`rfl`, `ring`, `abel`, `norm_num`, `norm_cast`, `positivity`, `decide`, `linarith`, `omega`, `field_simp`, `contradiction`, `ext`, `gcongr`, `tauto`, and a constrained `simp`) and skip candidates not shorter than the original; expensive tactics have five-second timeouts (section 3, p. 3).
2. Keep a tactic replacement only if it passes the specificity filter; explicit author terms, lemma names, and case structure are protected, and a decision procedure is not replaced by a more general one (section 3, p. 3).
3. Group near-duplicate `have` blocks, anti-unify differing terms into parameters, and retain a generalized fact only when it saves bytes and reduces free-variable dependencies (section 3, p. 4).
4. Remove unused `have` blocks using a usage graph, and remove never-executed or no-op tactics from `<;>` chains after up to three linter rounds (section 3, p. 4).
5. Test candidates at the saved proof state, re-elaborate the edited file, and kernel-check it. For benchmark sources, compile again in a fresh Lake environment; keep a compiling subset if joint verification fails (section 3, p. 4).
6. Record the goal state, exact spans and byte offsets, edit kind, token/byte/line counts, provenance, and failed siblings with error messages (section 3, p. 4).

Verus form

Inference: Apply the same proposal–policy–verification split to Rust/Verus. Save a Verus proof state or obligation, propose a shorter proof body or lemma invocation, splice it, run Verus in a fresh process, and retain only checker-passing edits. Verus syntax and proof obligations differ from Lean, so Lean tactics do not carry over; the reusable idea is checker-gated local edits with exact source spans and failure records.

what evidence supports it and limits

The paper stresses that a timeout is not proof of invalidity and a policy rejection is not a correctness failure (section 3, p. 4). First-success siblings are only candidates tried before the winner; later candidates are unknown, not negatives. The specificity filter is maintainability policy, not a soundness mechanism. Generalization is rare (0.8% of accepted edits) and its ablation shows no aggregate compression benefit (section 3, p. 4).

## technique 2: eliminate first-success ordering leakage with complete menus

what it is and when to use it

Stopping after the first valid tactic makes the “negative” examples depend on fixed menu order. Complete-menu search evaluates every menu candidate and chooses the shortest valid one allowed by policy, recording valid alternatives, failures, timeouts, and rejections separately (section 3, p. 4). Use it whenever training or ranking data comes from search, because otherwise a model can learn the search order without understanding the goal.

how to do it

1. Continue through all 15 menu entries after the first success.
2. Select the shortest successful candidate, breaking equal-length ties by menu order.
3. Label untried, timed-out, and policy-rejected candidates distinctly from verified failures.
4. Build complete candidate pools and evaluate a ranker on the shortest valid, filter-passing candidate (sections 3–4, pp. 4, 7).

On biased first-success groups, a ranker reaches 100% top-1, but simply choosing the latest menu candidate also reaches 100%; the result is therefore a search-order shortcut (section 4.2, p. 7). In complete pools, 2,388 held-out states contain at least one acceptable candidate. The trained ranker reaches 70.1% top-1 (95% file-clustered CI 66.3–73.9, AUROC 0.968), while a frozen DeepSeek model reaches 36.9%; first-success verified search reaches 76.9% (Table 3, p. 7). The ranker recovers 79% of oracle character savings, but this does not establish a speed advantage or eliminate the need to verify its choice.

Verus form

Inference: For VL proof-repair data, enumerate all candidate proof edits in a declared menu or generate a complete candidate pool, then verify each candidate with Verus. Store unknown/timeouts separately. Train rankers only against the shortest or best verified candidate, and include a menu-order baseline to detect leakage.

## technique 3: iterate symbolic compression to a fixed point and verify neural hybrids

A single pass can enable later deletions, so LeanPolish reruns its output until no file changes, with every round freshly verified (section 3, p. 4). On whole files, a clean symbolic run raises PutnamBench reduction from 6.1% to 11.9%; fixed-point iteration reaches 16.1% on PutnamBench and 29.8% on miniF2F-99 (27.5% on all 351 miniF2F files) (section 5.1, p. 8). These are whole-file token reductions, not sums of local edits.

Algorithm 2 then asks a local editor for proposals at remaining tactic sites, verifies each in a fresh Lean process, combines compatible edits, and rechecks the resulting file jointly (section 5, p. 8). On 19 PutnamBench proofs, fine-tuning a rewriter on 7,708 proof pairs raises verified token reduction from 2.8% to 5.5% at 16 samples; on the same 99 miniF2F files, reduction rises from 12.5% frozen to 16.4% trained, with 62% versus 16% of samples yielding a verified shorter file (section 5.2, p. 9). A frozen editor is nearly as strong in several hybrid settings, so these numbers do not isolate training from generation and verification.

Verus form

Inference: Iterate Verus proof simplification to a fixed point, then optionally propose neural edits at remaining proof sites. Verify each edit independently and the combined file, because individually valid edits can interfere. Measure whole-file reduction on identical source files and toolchain versions; never infer it by adding local savings.

## what is trusted, what is learned, and product threat

Lean's kernel and fresh compilation establish that accepted edits preserve theorem statements. The authors caution that “We do not claim that outputs are length-minimal or more readable to humans.” (section 3, p. 4) The method trusts the theorem statements, imported libraries, Lean toolchain, specificity policy, and search menu. It does not prove minimal length, readability, or that learned edits improve beyond the symbolic search space. One self-training round worsens held-out tactic success from 74.9% to 72.9% or 70.7% depending on filtering (section 5.2, p. 9).

Inference: For VL, this is a substantial engineering opportunity for proof compression and repair data, but search-order leakage and unchecked assumptions can make an agent appear better than it is. Product acceptance should run Verus on every candidate and report separate symbolic fixed-point, frozen-model, and trained-model baselines.

## techniques for the catalog

- checker-gated local edits — propose proof-body changes at saved states and retain only fresh compiler/verifier passes
- complete-menu supervision — enumerate candidates and mark timeouts, unknowns, and policy rejects separately
- leakage-resistant ranking — evaluate against complete pools and compare with menu-order controls
- fixed-point compression — rerun symbolic edits until no verified file change remains
- jointly verified hybrids — verify each neural edit and the combined file before counting savings

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numbers, references, techniques, and conclusions against the full paper; corrected nothing; did not independently reproduce experiments or verify external references.
