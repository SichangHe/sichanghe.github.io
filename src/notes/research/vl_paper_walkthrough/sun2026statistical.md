# Statistical Proof as a Window into Human-AI Collaboration: Practical Insights and a Community Agenda
(authored by agents unless marked 🧑)
Tag: `sun2026statistical`, [paper](https://www.semanticscholar.org/paper/eda76f68770b98d2f7375603787848f51341a88d)

## scope and evidence
The paper evaluates AI assistance through “four paired case studies that together cover eight research-level proof problems.” The pairs cover high-dimensional inference, extreme value theory, transfer learning, and differential privacy (section 2, p. 4). Each pair contrasts a useful-proof setting with a failure setting from the same research context. The paper reports qualitative proof outcomes from prompts and model responses rather than a benchmark accuracy denominator. It does not name all model versions in the extracted main text, so model-specific generalization is limited.

Its central finding is: “Current general-purpose LLMs perform considerably better at executing a suitable proof strategy than at identifying one on their own” (section 2, p. 4). The authors also state that “The bottleneck was not mathematical execution but strategy identification” in the copula example (section 3.2, p. 9). Inference: a VL pipeline should separate strategy selection from proof execution and require machine checking before accepting generated Rust.

## technique 1: make the proof task precise and bounded
What it is: state the exact claim, definitions, assumptions, and a manageable reasoning scope. The successful cases share that “AI assistance works best when the proof task is precisely scoped, the modeling assumptions are made explicit, and the reasoning chain is kept at a manageable scale” (section 3, p. 6).

When to use: use this before asking for any research proof, especially when a theorem depends on a newly introduced model. The paper’s LDSC example asks for the exact finite-sample variance of an oracle estimator, with LD scores treated as known (section 3.1, pp. 6–7).

How to apply:
1. Define the estimator and all symbols in the prompt (paper section 3.1).
2. State assumptions and the desired end formula, rather than asking for an open-ended result (sections 3.1 and 5.1).
3. Keep the requested derivation to one sub-problem; defer asymptotic normality, which adds denominator concentration, ratio linearization, and normal approximation (section 4.1, p. 14).

Verus form: Inference: encode the data structure and claimed postcondition as Rust types and `requires`/`ensures`; use `spec fn` for mathematical definitions and `proof fn` lemmas for algebraic steps. The paper does not discuss Verus or Rust, so this translation is an inference. A Verus checker can validate the bounded lemma, but statistical assumptions such as independence remain explicit preconditions or trusted axioms.

Evidence and limits: the paper says the model produced a complete derivation whose final variance formula agreed with the target (section 3.1). This is one case, not a measured success rate. The authors warn that underspecified setups make models introduce additional assumptions (section 3.1); therefore every assumption must be reviewed.

## technique 2: provide a short proof-strategy hint
What it is: supply the missing mathematical route instead of only repeating the theorem. In the copula scaling-invariance case, the authors give two hints: compare limits for arbitrary γ and γ̃, then use a triangle-inequality decomposition with regularity conditions (section 3.2, pp. 8–9).

When to use: use when a zero-shot response is plausible but non-rigorous, or when the task requires domain-specific strategy selection. The zero-shot prompt produced “a lengthy and seemingly well-structured derivation” but omitted necessary regularity conditions (section 3.2, p. 9).

How to apply:
1. Identify the two quantities whose equality establishes the target invariance (paper guidance prompt 1, section 3.2).
2. Require an ε proof: choose u0 so the pre-limit difference is at most ε for every ε>0 (guidance prompt 1).
3. Tell the model to add and subtract terms and bound each by ε/3 using stated convergence assumptions (guidance prompt 1).
4. Request a complete proof and explicit assumptions (user line following guidance prompt 1).

Verus form: Inference: represent each bound as a lemma with `requires` for convergence/regularity and `ensures` for the ε bound; chain lemmas with `assert` and arithmetic proof blocks. Verus has no built-in limit theory corresponding to the paper’s statistical notation, so foundational analysis lemmas would need formal libraries or trusted specifications.

Evidence: with these hints, “the model produced a correct and rigorous proof, decomposing the difference into three terms and bounding each by ε/3” (section 3.2, p. 9). The paper gives no independent checker or numeric pass rate; correctness was judged by the authors.

## technique 3: decompose long proofs and iterate
What it is: split a research argument into tractable sub-problems, use guidance, inspect outputs, and revise prompts. The paper’s workflow recommendation is to “specify the problem precisely, provide targeted guidance when the strategy is not obvious, decompose complex arguments into manageable problems, and treat the whole process as iterative rather than a single exchange” (section 5.1, p. 23).

When to use: use for proofs with long dependency chains or several technical components. Failure cases show that reliability decreases for open-ended tasks and long chains (section 4, pp. 14–21).

How to apply:
1. Ask for a local result such as finite-sample variance before asymptotic normality (sections 3.1 and 4.1).
2. Check each intermediate claim and assumptions, then feed targeted corrections or literature references (sections 3.2–3.4).
3. Recombine verified sub-results only after their interfaces match; this recombination requirement is an inference from the decomposition workflow, not a stated paper algorithm.

Verus form: Inference: make each sub-result a separately verified `proof fn` or lemma; expose only proved facts to the next lemma. Use executable Rust only for computational parts, keeping specifications ghost-only. Verus verification addresses consistency of encoded claims, not whether the statistical model is scientifically appropriate.

## what is proved, trusted, and still missing
The paper’s evidence is human assessment of eight paired proof attempts; it does not report a fixed model list, token budget, inter-rater agreement, or machine-checked proof count in the main text. Thus claims are about observed workflows, not universal capability. The trusted elements are problem formulation, modeling assumptions, cited strategy, and human judgment of correctness. Inference: for VL, the main product threat is unsound acceptance of a plausible proof when strategy or assumptions are wrong; Verus can reduce implementation bugs after the specification is correct but cannot select or validate the statistical model. Existing work already points to Lean as machine-checkable support: “formal proof assistants such as Lean can provide machine-checkable verification of mathematical arguments” (section 5.3, p. 24). VL should reuse this human-guided, checker-backed division rather than redo generic proof-generation claims.

## techniques for the catalog
- precise bounded formulation — state definitions, assumptions, target, and a manageable sub-problem
- targeted strategy hint — provide the domain proof route, decomposition, and regularity conditions
- iterative decomposition — solve and inspect smaller lemmas before recombining a long proof

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
