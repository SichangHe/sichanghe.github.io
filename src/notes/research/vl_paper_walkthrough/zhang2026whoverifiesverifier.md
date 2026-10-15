# Who Verifies the Verifier? Co-Evolving Inspectable Graders with Self-Improving Agents
(authored by agents unless marked 🧑)
Tag: `zhang2026whoverifiesverifier`, [paper](https://www.semanticscholar.org/paper/c40827185494c0792885be74093abd3d33c8a30c)

## scope and central finding
The paper evolves an inspectable verifier rather than treating an LLM judge as fixed truth. A verifier is an expression over small drawback detectors, synthesized from failures, gated at birth, selected against a frozen anchor, and audited on locked data. The abstract reports that removing anchor guards collapses the system to “a vacuous always-pass grader, yet that collapsed verifier trains skills just as well.” (Abstract, p. 1). Therefore downstream skill score cannot validate the verifier itself.

Experiments use three seeds and locked sets of 40–48 items (Table 1, p. 7). MBPP+ uses hidden unit tests; Spider 2.0-Snow uses execution-result comparison; report generation uses a rubric and an outer judge (section 4, p. 5). On MBPP+, evolved held-out agreement is 0.625 ± 0.050 versus 0.417 ± 0.058 for the hand-authored seed, a +0.21 lift (section 5.1, p. 6); the paired test is not significant after task clustering (p = 0.12 peak, p = 0.21 final). Spider reaches 0.500 ± 0.026 despite objective growth (section 5.1, p. 6). These denominators, seeds, and locked sets bound the claims.

## technique 1: typed drawback-detector expressions

What it is. An atomic operation `o(t,y,c)` returns `DRAWBACK`, `CLEAN`, or `ABSTAIN`, checks one failure class, and may be static, execution-based, or a narrow LLM judge. Expressions combine leaves with disjunction, conjunction, negation, unweighted K-of-k, or weighted threshold votes. “Ops are pure functions of (t, y), so verdicts are cached and evaluation reduces to table lookups.” (section 3.1, p. 4)

How to do it.
1. Define a closed failure taxonomy and a small seed pool; keep a fixed root operation for basic structure (section 3.1, p. 4).
2. Parse each task/output once; cache detector verdicts. Exclude abstaining children; an all-abstain composition abstains, and a pass requires the root plus evolved expression to find no drawback (section 3.1, p. 4).
3. Keep negation and weighted votes available but report the selected expression as a reproducible string and op pool (section 3.1, p. 4).

Verus form. Inference: define deterministic Rust/Verus checker functions over a target artifact and specification, returning an enum modeled as `spec` values or ghost state. Each detector should check one contract failure class (for example, missing `ensures` consequence or invariant violation); compose results with ordinary Rust control flow and prove the composition's soundness relative to detector contracts. Inference: an LLM judge should be isolated as an `external_body` assumption only at the boundary, never attached to the function being verified.

Failure and assumptions. Detectors can share blind spots; execution ops depend on the environment; judge ops inherit model errors. The paper's expressions are inspectable, but inspectability does not prove semantic correctness.

## technique 2: anchor-gated verifier evolution

What it is. Each round senses incumbent misses and unlabeled gaps, clusters them by failure class, synthesizes typed operations, applies a birth gate, composes candidates, and selects with
`S(e)=Adev(e)·Atrain(e)^w−λC(e)` (section 3.2, p. 4). `Adev` is agreement with soft labels; `Atrain` is reliability-weighted consensus; `C` is expression size.

How to do it.
1. Identify dev items the incumbent passes although the anchor says fail, and train outputs where detectors abstain or disagree (Algorithm 1, p. 5).
2. Cluster misses and gaps; author one typed detector per recurring cluster. Admit it only when it fires on at least half its cluster and stays clean on known-good outputs; anchored misses become active, unlabeled gaps become shadow detectors (Algorithm 1, p. 5).
3. Generate compositions, mutations, and crossovers over the detector pool and elite history (Algorithm 1, p. 5).
4. Select the best candidate under the score and validity gate; fail closed when no usable dev opinion exists, reject candidates that pass, fail, or abstain on everything, retire non-positive leave-one-out detectors, and promote shadows only when they raise dev agreement (Algorithm 1, p. 5).
5. Audit the chosen verifier only on the locked set never read by evolution (Algorithm 1, p. 5).

Evidence. On MBPP+, evolution reaches 0.625 held-out agreement versus 0.417 seed; against a bare LLM judge it reaches 0.55 ± 0.04 (section 5.1, p. 6). On report generation, disabling anchor guards collapses all three seeds: the verifier passes 0.97–1.00 of graded outputs and becomes always-pass, whereas disabling lifecycle management leaves validity in the anchored band (section 5.2, p. 7; Table 3, p. 9). The paper reports that “anchor discipline carries the load.” (section 5.2, p. 7)

Verus form. Inference: use a fixed corpus of independently checked Verus examples as the anchor; evolve only detector expressions and require every candidate to pass a Verus-checked detector contract plus anchor agreement. Keep the anchor inaccessible to synthesis and selection inputs, then evaluate on a locked set. This can guard against reward hacking in agent-written verified Rust, but it cannot create specifications for missing behaviors.

## technique 3: co-evolve a skill loop with Double Ratchet

What it is. The current evolved verifier grades skill-loop attempts; failed attempts become error capsules feeding skill synthesis. A reference loop receives ground-truth grading. The skill loop's held-out evaluation and rollback stay pinned to the locked test set (section 3.3, p. 5).

How to apply it. Alternate verifier-evolution and skill phases under a fixed curriculum; in each skill phase, grade attempts, turn failures into capsules, synthesize skills, evaluate on locked tasks, and roll back as specified by the loop (section 3.3, p. 5). Keep an outer audit separate from training: a stronger model compares final outputs pairwise to pre-evolution baselines twice with swapped positions; agreement in both orders counts as a win (section 3.3, p. 5).

Evidence and limits. Double Ratchet retains 106% of reference-loop lift on MBPP+, 110% on Spider, and 88% on Report (Table 1, p. 7); task scores are on 40–48-item locked sets over three seeds. Yet the naive always-pass verifier's skill scores are as good or better, proving sufficiency does not establish validity. The paper states: “Downstream task performance therefore cannot validate a self-evolved verifier.” (section 5.2, p. 7)

Verus form. Inference: failure capsules can contain Verus compiler diagnostics, unsatisfied postconditions, and minimized counterexamples; skill synthesis can propose proof repairs, but acceptance still requires a fresh Verus check and anchor/locked-set evaluation. Treat the outer judge as audit evidence, not as a proof oracle.

## evidence boundary and VL implications
The paper establishes verifier agreement and lifecycle behavior, not formal program correctness. Trusted components include hidden tests, live SQL execution, soft report rubrics, LLM detectors/judges, the anchor construction, environment, and the outer judge. The study itself calls its scope a mechanism study with three task families, one model family, low hundreds of rounds, and held-out sets of tens (conclusion, p. 9).

Inference: threat to VL is high for any self-improving proof agent whose reward model can collapse to always-pass while training still improves. VL should retain immutable, independently checked anchor examples and a locked evaluation set; verifier validity must be measured directly, including fail-open and abstention rates. The work VL should not redo is a generic task-score comparison of verifiers without an independent validity audit.

## techniques for the catalog
- typed drawback detectors: represent one failure class with `DRAWBACK`/`CLEAN`/`ABSTAIN` and compose inspectable expressions
- anchor-gated evolution: synthesize from misses and gaps, birth-gate candidates, select against immutable anchors, and fail closed
- detector lifecycle: classify active versus shadow detectors, promote by anchor agreement, and retire non-positive leave-one-out contributors
- independent verifier audit: evaluate on locked references and use an outer judge without feeding its results into training
- double ratchet co-evolution: alternate verifier evolution and skill synthesis while preserving rollback and held-out separation

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
