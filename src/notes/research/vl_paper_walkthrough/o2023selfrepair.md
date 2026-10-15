# Is Self-Repair a Silver Bullet for Code Generation?
(authored by agents unless marked 🧑)
Tag: `o2023selfrepair`, [paper](https://arxiv.org/abs/2306.09896)

## claim and evaluation
Olausson et al. evaluate self-repair for Python programming tasks with CodeLlama-13b-instruct, GPT-3.5, and GPT-4 on HumanEval and APPS. Their comparison counts repair calls in the same budget as independent samples. The abstract's conclusion is direct: “Self-repair is not a silver bullet: when the cost of repair is taken into account, we find several instances in which pass rates are higher or equally high with i.i.d. sampling (without repair), especially when the budget is small.” APPS uses a randomly chosen 300-task set: 180 interview, 60 competition, and 60 introductory problems (footnote 6, page 5). HumanEval is evaluated in the stated model subsets; pass rates are fractions of tasks solved under the corresponding sampling budget.

The authors report a budget allocation effect. “For example, for GPT-4 on APPS, drawing 10 samples up front and then 1 repair candidate each (up to 20 samples total) leads to a pass rate 1.05× higher than pass@20 from the same model without repair; drawing 2 samples up front and then drawing 10 repair candidates each (up to 22 samples total) leads to a pass rate which is lower than the baseline pass@22 (0.97×).” These ratios compare equal-budget pass rates, not percentages of all generated programs.

## technique 1: executable self-repair loop
Use this when executable tests or a verifier can return concrete failures. The paper's four stages (section 3.1, pages 3–4) are:

1. Given specification ψ, sample `np` programs independently from programming model MP.
2. Execute each against the full test bed. Stop if any program satisfies ψ (`p |= ψ`); otherwise retain error messages `ei`.
3. Feed ψ, the wrong program `pi`, and `ei` to feedback model MF and sample `nf` explanations `fij`.
4. Feed ψ, `pi`, `ei`, and `fij` back to MP and sample `nr` repaired programs `rijk`.

The authors call the resulting interleaved specification/program/feedback structure a repair tree. When MP=MF, feedback and repair can be jointly sampled in one interaction. Their motivating example shows a modulo bug: a failing test says SUN returned 0 instead of 7, feedback identifies the modulo operation, and repair removes it (Figure 1, page 2). The paper states: “First, a program is sampled from a code generation model; this program is then run on a suite of unit tests provided as part of the specification.”

Inference: In Verus, replace execution with `verus` compilation and proof checking. A failed verification diagnostic is `ei`; a model proposes an explanation and revised Rust proof. A valid `ensures` proof terminates the loop. Verus does not guarantee that a diagnostic is complete or that a textual explanation is sound, so only successful checking is trusted. Use actual Verus constructs (`requires`, `ensures`, `invariant`, `assert`, `proof fn`) and keep proof functions out of runtime calls.

## technique 2: compare repair against equal-cost iid sampling
Self-repair must be evaluated with the number of initial and repaired programs counted. The paper defines tree size as `np + np·nf·nr` (or `np + np·nfr` for joint feedback-repair) and compares against that many independent samples (section 3.2, page 4). It generates one large frozen tree per task (`Np=50`, `Nf=25`, `Nr=nr=1`) and bootstraps 1,000 subtrees (`Nt=1000`) for each hyperparameter setting. This reuse reduces computation but makes estimates conditional on the frozen pool.

The study varies `np` in {1,2,5,10,25} and feedback-repair count in {1,3,5,10}. It finds gains when more budget is spent on diverse initial programs; GPT-4 on APPS gains up to 8% in the tested settings, while GPT-3.5 gains up to 34% relative to baseline on competition-level problems (section 4.1, pages 5–6). These are relative pass-rate changes for the named model/task subset, not universal improvements.

## technique 3: strengthen feedback instead of repair sampling
The paper replaces a model's feedback with a stronger model's feedback while keeping the repairing model fixed. “Artificially boosting the quality of the feedback significantly improves the efficacy of self-repair.” Every boosted configuration beats both its iid baseline and the same-model self-repair configuration at all budgets reported. For GPT-4, replacing its explanations with human programmer feedback raises the fraction of repaired programs that pass tests from 33.3% to 52.6%, a 1.58× factor (abstract, page 1). The denominator is repaired programs in that human-feedback experiment.

## techniques for the catalog
- executable repair tree: generate, check, explain diagnostics, and sample repairs as a branching search
- equal-budget evaluation: compare repair trees with iid samples using the same program count or token cost
- boosted feedback: substitute a stronger critic or human explanation and measure repaired-program pass rates
