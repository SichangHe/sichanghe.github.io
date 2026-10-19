# Vibe Coding in Practice: Motivations, Challenges, and a Future Outlook – a Grey Literature Review
(authored by agents unless marked 🧑)
Tag: `fawzy2025vibe`, [paper](https://arxiv.org/abs/2510.00328)

## scope and contribution

The paper is a systematic grey-literature review of how people use AI code-generation tools through “intuition and trial-and-error” with little code understanding or review (Abstract). It asks four questions: motivations, user experience, perceived generated-code quality, and quality-assurance (QA) practices (Section 1). The corpus contains 101 retained sources and 518 extracted behavioral units (Abstract; Section 4). Although the abstract calls them firsthand accounts, Section 3.6 also allows “an author/reporter documenting or commenting on vibe coding practices.” The units are divided into 140 motivation units, 132 experience units, 114 code-quality-perception units, and 132 QA-practice units (Section 4). Inference: This is observational evidence from public reports, not a controlled experiment.

The paper’s central result is a speed–quality trade-off. Its abstract states: “QA practices are frequently overlooked, with many skipping testing, relying on the models’ or tools’ outputs without modification, or delegating checks back to the AI code generation tools.” The review therefore treats verification behavior itself as an object of study.

## technique 1: systematic grey-literature search with iterative saturation

What it is. The authors adapt grey-literature-review guidance to discover firsthand behavior in blogs, forums, media articles, and technical reports rather than only peer-reviewed papers (Sections 3 and 3.1). They use Google and backward snowballing. The final search string contains direct practitioner phrases such as “vibe coding”, “coding with AI”, “AI writes code”, “prompting for code”, and “programming with an AI assistant” (Section 3.2.5).

When to use it. Inference: Use this method when the behavior of interest is new, distributed across practitioner channels, and described with unstable vocabulary. The authors explicitly say their initial technical terms retrieved unrelated or promotional material, so they pivoted to everyday practitioner language (Sections 3.2.2–3.2.3).

How to apply it, as specified by the paper:

1. Frame the behavioral concept and distinguish it from adjacent practices (Section 3.2.1).
2. Try domain-informed candidate terms and screen the first 100 Google results. Section 3.2.2 reports “screened 100, 8% relevant” but also says these results lacked firsthand behavioral evidence and were excluded. The paper does not reconcile those statements.
3. Pivot to phrases practitioners actually use and screen another 100; this stage had approximately 50% relevant results (Section 3.2.3).
4. Expand terms iteratively, testing recall and specificity and retaining a term only if it increases the relevance of retrieved documents. The expansion stage screened 100 results and reported approximately 12% additional relevant hits (Section 3.2.4).
5. Test each search iteration against a quasi-gold set of known relevant examples. With the final string, screen the first 100 results and continue until thematic saturation (Sections 3.2.5–3.2.6).
6. Apply backward snowballing to the first 100 final-search results by tracing hyperlinks and named references (Section 3.2.5).

The final search and backward snowballing produced 154 sources (Section 3.2.5). After screening and quality thresholds, 101 remained; 53 were excluded, including 40 below the quality threshold and 13 failing inclusion or exclusion criteria (Sections 3.3–3.5). The paper’s inclusion requirements were English, 2022–2025 publication, identifiable author or publisher, public full text, relevance to the research questions, and behavioral evidence such as accepting generated code as-is or with light edits, prompting or reprompting, and minimal testing or review. Critical reflections must be based on firsthand experience. Sources describing experienced developers applying critical oversight without skipping QA are excluded (Section 3.3).

Verus form. Inference: This is a literature-harvesting procedure rather than a Verus proof. A VL implementation could represent each candidate source as a Rust record with fields for URL, date, author, query term, and behavioral evidence, then use ordinary Rust code to enforce deterministic inclusion predicates. The Verus-relevant part is proving bookkeeping properties such as the predicate that every retained record has a nonempty author and a quality score at least 10; source credibility and semantic relevance remain trusted inputs.

Evidence and limits. The reported counts have explicit bases: 100 results per pilot stage, 154 collected sources, 101 retained, and 53 excluded (Sections 3.2–3.5). The authors acknowledge search bias and self-selection: the 101 sources are practitioners who chose to publish, so findings are indicative patterns rather than population estimates (Section 6). They cannot claim to have captured all relevant sources (Section 6).

## technique 2: quality scoring and behavioral-unit extraction

What it is. Each source is scored from 0 to 3 on Authority, Evidence, Objectivity, Currency, and Purpose, for a maximum of 15; sources scoring at least 10 are retained (Section 3.4). The review then extracts quote-level behavioral units instead of treating each article as one observation. Every unit records the verbatim quote, attribution, research-question mapping, interpretation, and metadata such as user type and tool (Section 3.6).

How to apply it:

1. Score every candidate on the five dimensions, each 0–3 (Section 3.4).
2. Exclude a source below 10/15 (Sections 3.4–3.5).
3. Extract each distinct behavior separately at quote level; one source can therefore yield multiple units (Section 3.6).
4. Record the exact wording, who expressed it, which question it answers, a short interpretation, and metadata (Section 3.6).
5. Cross-validate a subset with another reviewer (Sections 3.4 and 3.6).

The 518 units split into 140 motivations, 132 experiences, 114 quality perceptions, and 132 QA practices (Section 3.6). Inference: For a verified-code product, this schema can become an evidence ledger: each claim about an agent workflow should carry an exact source span, attribution, and classification, while a Verus predicate can check that required fields are present. Verus cannot establish that a quoted practitioner account is truthful; that remains an external trust assumption.

The paper illustrates familiarization with “I just trust it works.” (attributed to Ramel [51]) and “They’re accepting the responses in a very trusting way.” (attributed to Hodges [22]), which suggest uncritical trust. It illustrates initial coding with “Copy and paste them in. . . usually, that fixes it.”, labeled “Reprompting Instead of Debugging” (Section 3.7). These are source quotations used to illustrate coding, not experiments.

## technique 3: thematic analysis of verification behavior

What it is. The authors follow Braun and Clarke’s thematic-analysis procedure (Section 3.7). They read all units repeatedly, assign initial codes, cluster codes into candidate themes, review and reassign them, define final themes, and report definitions with frequencies and examples (Section 3.7).

How to apply it:

1. Familiarize yourself with every extracted unit (Section 3.7).
2. Assign a potential code to each behavior (Section 3.7).
3. Group related codes into candidate themes (Section 3.7).
4. Review themes against the full dataset, splitting or reassigning units when needed (Section 3.7).
5. Write a definition distinguishing each final theme and report its frequency (Section 3.7).

The QA themes and denominators are: skipped QA 48/132 (36%), manual testing or edits 38/132 (29%), uncritical trust 24/132 (18%), delegated QA to AI 13/132 (10%), reprompting instead of debugging 6/132 (5%), run-and-see validation 2/132 (2%), and QA breakdown or confusion 1/132 (1%) (Table 5). Inference: The percentages sum to 101% because of rounding; the underlying frequencies sum to 132. The quality-perception themes are fast but flawed 78/114 (68%), fragile or error-prone 22/114 (19%), sloppy or low maintainability 5/114 (4%), prototype-ready only 5/114 (4%), high quality and clean 3/114 (3%), and misleading confidence 1/114 (1%) (Table 4); Inference: these rounded percentages sum to 99%.

Verus form. Inference: Thematic coding can guide a VL telemetry taxonomy, but a theme label is not a proof. A Verus model could prove that every event has exactly one QA category and that category frequencies equal the event count; it cannot prove the analyst’s interpretation of a quote. A useful product design is to emit machine-checkable evidence (tests run, specifications discharged, counterexamples) alongside a human-readable theme.

## technique 4: lightweight verification guardrails for AI-generated code

The paper recommends that code-generation tools include “lightweight verification processes and continuously remind users of the QA aspects” (Section 5.1). It specifically proposes static and dynamic analysis, real-time indicators for performance, security, and missing tests, step-by-step explanations, visual diagrams, and inline explanations (Section 5.1). For practitioners, it recommends tests, code review, and traceable decision records containing why a change was accepted, which checks passed, accepted risks, and a prompt/response identifier (Section 5.1).

Inference: A proposed Verus adaptation is to require a specification and a successful verifier run before accepting generated Rust, and to record which obligations were checked and which assumptions remain trusted. This is a design proposal, not a technique evaluated by this paper.

Inference: The paper’s “delegated QA to AI” finding implies that VL should separate generation from checking: an LLM may propose Rust and proof text, but Verus’s verifier and independently recorded diagnostics must decide acceptance. The paper does not test Verus or any formal prover, so no Verus success rate can be claimed from its data.

## what is proved, trusted, and left undone

The study measures coded reports, not software correctness. Its evidence is 101 selected sources and 518 behavioral units, with the four denominators above. The authors use cross-validation and a standardized extraction template, but coding was mainly performed by the first author and remains subjective (Sections 3.4, 3.6, and 6). Inference: These coded reports do not establish program correctness or comparative defect rates; the review contains no controlled defect-rate comparison.

Inference: For VL, the threat is behavioral: a user may accept generated Rust because it runs, ask the same model to review its own output, or become unable to debug a failed proof. The review’s 36% skipped-QA and 18% uncritical-trust units are coded-report frequencies, not prevalence among all developers. Existing work already documents these adoption and QA patterns; VL should avoid redoing a broad motivation survey and instead evaluate whether its verification workflow changes them.

The paper identifies a “new class of vulnerable developers” who can build applications but cannot diagnose failures (Section 5.1). It recommends guided debugging, safe templates, escalation paths, and matching task complexity to skill (Section 5.1). It also says future research should test which review practices work under vibe-coding conditions and how practices vary by experience (Section 5.2). Those questions remain open.

## techniques for the catalog

- iterative grey-literature search: pivot from broad technical terms to practitioner language, validate against a quasi-gold set, screen until thematic saturation, and snowball from the first 100 final-search results
- source quality scoring: score authority, evidence, objectivity, currency, and purpose from 0–3 and retain sources scoring at least 10/15
- behavioral-unit extraction: store verbatim quote, attribution, question mapping, interpretation, and metadata for each distinct behavior
- thematic QA analysis: code units, cluster and review themes, then report frequency with its denominator
- verification guardrails (recommendation, not evaluated): add tests, code review, and decision records before production; provide static or dynamic checks and lightweight verification feedback in tools
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This process highlighted the emergence of prompt engineering skills, where users learned to craft, adapt, and even collect effective prompts as reusable patterns to improve their results."): read the full paper text, including references; checked all study quotations, numbers, section references, and technique steps; corrected the paper link, behavioral-evidence scope, pilot-search description, search and snowballing steps, extraction example, and recommendation scope; marked analytic conclusions as inferences and removed unsupported Verus construct details; did not check the original grey-literature sources, replication dataset, or proposed Verus adaptations experimentally.
