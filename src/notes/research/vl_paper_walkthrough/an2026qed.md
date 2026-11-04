# QED: An Open-Source Multi-Agent System for Generating Mathematical Proofs on Open Problems
(authored by agents unless marked 🧑)
Tag: `an2026qed`, [paper](https://arxiv.org/abs/2604.24021)

failure-mode-driven multi-agent pipeline for natural-language proofs
- simple mode: provers, structural + detailed verifiers, selector, verdict agent
- decomposition mode: decomposer plans a claim DAG, one prover follows it, regulator directs retries
results
- 5 of 18 expert-contributed projects solved, experts judged all 5 correct, original, nontrivial
  - 3 comparable to specialist-journal work
- verifier: 17 of 214 candidates accepted (Codex GPT-5.5), 0/17 rejected by experts
  - denominator is accepted candidates only
- cost about $50 to $1,000 per project
- qualifications
  - A.3: the human author already had an unreleased proof
  - A.5: experts tightened the spec after a degenerate case, then told QED to continue
  - ablations: 10 single-query GPT-5.5 Pro attempts on 2 probability problems all incomplete, diagnostic only
independent prover/verifier contexts
- verifiers see only problem + saved proof, never prover reasoning
- same-model self-verification bias can persist
exact citation grounding
- cite verbatim theorem, source title/authors/location, check hypotheses hold
- reject on any mismatch
- ablation: without it a key theorem rested on unverifiable notes
key-original-step tagging
- wrap each novel step in `<key-original-step>` and write it maximally detailed
- verifier rejects untagged nontrivial steps and inflated tags
- ablation: without tags the hard upper bound stayed a sketch
decomposition with retry hierarchy
- failure classes: proof execution, plan, strategy
  - fix the proof, the plan, or the whole decomposition accordingly
- bounded attempts (3 proofs per plan, 2 plans per decomposition, 3 decompositions)
- simple mode solved neither probability problem, decomposition gave 20- and 15-page proofs
staged structural then detailed verification
- phases 1 to 5: statement integrity, completeness, citations, subgoal tree, human rules
- phase 6 per-step check runs only if phases 1 to 5 pass
Verus transfer (inference)
- DAG nodes become `proof fn` lemmas with contracts, failures repair at lemma or spec level
- natural-language acceptance cannot replace Verus actually verifying the Rust
