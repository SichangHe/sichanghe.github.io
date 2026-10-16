# What Challenges Do Developers Face When Using Verification-Aware Programming Languages?
(authored by agents unless marked 🧑)
Tag: `oliveira2025challenges`, [paper](https://www.semanticscholar.org/paper/afc05477638482783315a16b36766dded00002f0)

## scope and evidence

This is a mixed-methods study of adoption barriers for verification-aware (VA) languages, including Dafny, Frama-C, Eiffel, JML, Spark Ada, Why3, Spec#, and Verus. It asks three questions: what challenges practitioners face, where they first encounter VA languages, and what improvements address the challenges (abstract and section I, PDF pp. 1–2). The authors combine a literature review, topic modeling of Stack Overflow, and a survey. Their contribution is explicitly empirical: “A collection of challenges that affect VA language developers, obtained through a literature review and the analysis of 1,420 questions from Stack Overflow, validated and complemented by a user study with 31 practitioners.” (section I, PDF p. 2)

The study design has three steps. It searches 1,024 papers, removes 723 duplicates, manually screens 600, and analyzes 9 papers; it then models 1,420 developer questions; finally it validates challenges and improvements with 13 experts and 18 beginners (Figure 1, PDF p. 2). Percentages below use the survey's 31 participants unless stated otherwise. The paper is evidence about usability and study method, not a proof that any particular Verus program is correct.

## technique: topic-model developer questions into a challenge taxonomy

What it is and when to use it. Use a corpus of real developer questions to discover recurring verification barriers before designing a tool or training intervention. The authors use Latent Dirichlet Allocation (LDA), then manually inspect and label clusters. Their pipeline first searches and screens literature, collects Stack Overflow questions tagged for VA languages, preprocesses text, fits many LDA configurations, selects a model, and applies open card sorting to name topics (sections II-A–II-D, PDF pp. 2–5). They report 1,420 questions: Dafny 530, Frama-C 474, Eiffel 289, Spark Ada 55, Why3 52, JML 44, and Spec# 16 (section II-B, PDF p. 4).

The implementation details are concrete. They remove stop words, stem nouns, construct bigrams, and remove hand-picked words; they vary topic count, passes, iterations, `alpha`, and `beta`, train 840 configurations, and use coherence and diversity to select the final model (sections II-B–II-C, PDF pp. 3–5). They then assign questions to topics with human review and open-card-sort the clusters into challenge labels. The selected model contained 16 topics; 15 had a representative challenge (section II-C, PDF p. 5).

The resulting challenge classes include proof elaboration, environment setup, memory-model understanding, and language understanding. Proof-elaboration examples are inability to design or complete a proof strategy, choosing a non-ideal strategy, finding or expressing loop invariants, and identifying or expressing termination clauses (section III-B, PDF pp. 6–7). The authors quote the central practical obstacle: “The first challenge is related to creating a proof strategy. In many questions, authors could not even start the proof, not knowing what proof strategy to choose.” (section III-B, PDF p. 6)

Verus form. Inference: apply this pipeline to VL's issue tracker, proof failures, and rejected patches. Stratify by Verus version, solver, and construct before clustering; otherwise one topic can mix unrelated failures. Label clusters with concrete proof actions such as invariant discovery, trigger selection, nonlinear arithmetic, termination, or specification mismatch. Keep human review because the paper's topic labels are manually assigned after LDA.

Evidence and limits. Topic frequencies reveal what developers ask about, not the prevalence of failures in all projects. The authors caution that Stack Overflow may miss relevant posts and that topic modeling can obscure actual challenges; they mitigate this by reviewing topic keywords and question bodies (section VII, PDF p. 37). The corpus also overrepresents languages with more public questions.

## technique: validate discovered challenges with a coded survey

The authors turn challenge labels into 5-point Likert statements, recruit 31 participants (13 experts and 18 beginners), and analyze both quantitative ratings and open answers. They remove “Not Sure” responses for statistical tests, use Wilcoxon signed-rank tests for beginner/expert comparisons, and use a Friedman test plus Bonferroni-corrected pairwise comparisons across the seven proof-elaboration items (section II-D, PDF pp. 5–6). This separates a frequently discussed issue from an issue practitioners actually rate as difficult.

The strongest result concerns proof strategy. “Our results show that most developers struggled with designing proof strategies (P E1 , 64.5%).” (section III-C, PDF p. 8) Difficulty completing a strategy was 48.4% agreement and 22.6% disagreement; searching for a strategy had the same 48.4%/22.6% split. The only beginner/expert difference that was significant was expressing loop or recursion termination clauses, `P E7`, with `p = 0.02666`; the overall Friedman test was chi-square(6) = 27.79, `p = 0.0001`, and the significant Bonferroni comparisons were `P E1` vs `P E7`, `p = 0.023`, and `P E2` vs `P E7`, `p = 0.032` (section III-C, PDF pp. 8–9).

Verus form. Inference: use a short, versioned survey after a Verus onboarding or proof-repair session. Ask separately about designing a proof, completing it, finding invariants, expressing invariants, and proving termination. Report denominator (participants answering each item), remove or report “Not Sure,” and pre-register the comparison. Do not turn a survey percentage into a claim that a Verus construct is objectively hard; it measures perceived difficulty in the sampled population.

## technique: connect challenge evidence to actionable tool changes

The paper converts findings into testable improvements: readable counterexamples, tutorials with common exercises, searchable documentation, broader documentation themes, and teaching VA languages in mandatory courses (section V, PDF pp. 10–11). Most participants, 83.9%, supported user-readable counterexamples; 64.5% supported tutorials; beginners valued documentation search more than experienced participants, 66.7% versus 15.4%, with `p = 0.02822`; 41.9% rated broader documentation themes very important; and 50.1% rated undergraduate inclusion highly impactful (section V, PDF pp. 10–11). Open coding found five requests for better documentation and learning materials, four each for mainstream-tool integration and improved usability, and three each for better error messages, automation, education, and debugging/profiling tools (Table V, PDF p. 11).

Inference: VL should implement these as measurable product requirements: every failed Verus obligation should expose a reproducible counterexample or explain why none is available; documentation should include invariant, `requires`, `ensures`, loop, and termination examples; diagnostics should identify the failing obligation and relevant solver state; and proof search should offer reusable lemmas while retaining kernel checking. The study supports prioritizing strategy guidance and feedback, not replacing verification with automation.

## what is trusted, what VL should reuse, and product threat

The paper measures practitioner reports, question frequencies, model-selection choices, and statistical tests. It does not prove that its taxonomy is complete or that proposed improvements increase adoption. Inference: for a product that emits agent-written verified Rust, the highest threat is usability-driven specification error: a developer or agent can misunderstand the intended invariant while the Verus proof succeeds. Better diagnostics and examples reduce that risk but do not remove the need to review specifications. The study's evidence also argues against assuming that solver success means the workflow is usable; users report difficulty designing proof strategies even when tools can discharge individual goals.

Inference: VL should reuse the paper's mixed-methods loop, but tailor it to Verus artifacts: mine proof logs and issue text, cluster failure modes, validate them with users, and measure whether a concrete intervention changes completion time or correct-specification rate. Existing work already gives this adoption study; VL should not redo a generic survey without collecting Verus-specific evidence.

## techniques for the catalog

- LDA challenge mining — preprocess real verification questions, fit and compare topic models, then manually label recurring proof obstacles
- human-in-the-loop taxonomy — review topic clusters and open-card-sort them into concrete challenge classes
- survey validation — convert challenge classes into Likert items and test ratings with nonparametric comparisons
- evidence-to-tool mapping — validate counterexamples, tutorials, search, diagnostics, automation, and integration as proposed remedies

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
