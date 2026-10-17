# Toward Practical Deductive Verification: Insights from a Qualitative Survey in Industry and Academia
(authored by agents unless marked 🧑)
Tag: `brugger2025practical`, [paper](https://arxiv.org/abs/2510.20514)

## paper and prior notes
Brugger, Denis, and Müller report semi-structured interviews with practitioners to identify what makes deductive verification usable in real projects. The PDF is arXiv:2510.20514v2 (23 January 2026). A repository search found only the title in the shortlist, not an existing walkthrough; this study therefore records the paper's techniques in full.

## evidence base and what is measured
The authors contacted 56 practitioners and interviewed 30 from 17 institutions (p. 3). Twenty-seven interviews discussed industrial-context projects; 26 participants used automated deductive verification, 15 interactive theorem proving, and seven model checking or other methods (p. 3). One interview was excluded for lack of relevant experience, leaving 29 observations for most counts (p. 5). The team used recorded one-hour interviews, corrected and anonymized transcripts, open coding, theme construction and review by the second interviewer (pp. 4–6). Their evidence is self-report, not verification benchmarks: no proof time, defect denominator, or success rate is measured. The useful output is a set of observed practices, barriers, and recommendations.

## technique 1: choose where verification pays
What it is: allocate deductive proofs to components whose failure cost or use frequency justifies proof cost, and combine lighter checks elsewhere. Twelve of 29 interviewees reported finding bugs or specification errors as a successful outcome; 22/29 named criticality as a decision criterion and 8/29 mentioned adoption level (p. 7). Requirements should be well-defined (11/29), code relatively stable or self-contained (4/29), realistically verifiable (9/29), and not excessively large or complex (6/29).

How to apply it (the steps are the study's inference from the cited counts and recommendations, not a procedure given by the paper): (1) list components and properties; (2) rank criticality, number of users, requirement clarity, expected evolution, and realizability; (3) isolate high-ranked components and prove their safety, functional-correctness, or security contracts; (4) use testing or static analysis for lower-ranked code; (5) document interfaces and assumptions at every boundary. The authors explicitly recommend “Concentrate verification efforts on critical components” (Table 2, p. 14) and state that “Separating and encapsulating these components can aid in reducing the interactions with unverified code” (p. 15).

Verus form (inference): put `requires`/`ensures` and loop `invariant`s around critical Rust modules, expose narrow `pub` contracts, and permit unverified helpers only behind explicit `assume`/external specifications. Use ordinary tests or linters for the remainder. The ranking and hybrid split transfer; the paper gives no Verus syntax.

Evidence and limits: the denominators above are interview counts, not effectiveness rates. Academic participants dominate (21 public/academic, 9 industry), and the authors warn that self-report, availability, and confirmation biases can skew results (p. 6). Treat this as adoption guidance, not a guarantee that critical-component selection finds all bugs.

## technique 2: verify early, incrementally, and with a stable design
What it is: integrate specification and proof from the beginning so code structure supports verification, while avoiding constant churn that breaks proofs. Three participants emphasized early integration; 11 reported CI use and three code reviews (p. 11). The recommendation is incremental verification in every lifecycle phase, potentially “verification-driven development” in which a specification is formalized before implementation and then code is refactored to satisfy it (p. 15).

How to apply it (the steps are the study's inference from the cited counts and recommendations, not a procedure given by the paper): (1) agree with developers, verification engineers, and testers on a language subset, coding rules, concurrency structure, and testing/proof split; (2) write and validate a contract before or alongside each feature; (3) implement in small increments and run proofs in CI; (4) review proof and code changes together; (5) freeze interfaces where possible before deep proof investment. The paper cautions that early integration conflicts with frequent evolution: “Changes to the codebase can invalidate existing proofs” (p. 12).

Verus form (inference): add `requires`, `ensures`, loop `invariant`s, and small lemma proofs as each Rust function is introduced; run `verus` in CI and review contract diffs. Keep stable module boundaries and avoid giant proof blocks. Verus supports this workflow, but the paper did not test it.

Evidence/limits: reported workflow practices have no controlled comparison. The paper identifies a real contradiction: early verification finds bugs earlier, yet evolving code causes proof maintenance costs (SF2 versus BA5, pp. 12–14).

## technique 3: structure proofs with modularity, context control, abstraction, simplification, and refinement
What it is: break obligations into compositional subproofs and reduce the information each solver query sees. Twelve of 29 valued modular/compositional reasoning; eight reported reducing SMT context to improve performance or stability (p. 8). Methods include isolating a method or code block, hiding implementation details, extracting intermediate lemmas, issuing isolated queries, abstracting slow code, simplifying failing code or models, and chaining refinements.

How to apply it (the steps are the study's inference from the cited counts and recommendations, not a procedure given by the paper): (1) choose top-down or bottom-up proof order according to property and project; (2) split by method, module, thread, property, or refinement step; (3) cut irrelevant facts and hide implementation details; (4) replace a failing implementation with a minimal version, prove it, then restore behavior incrementally; (5) abstract expensive internals behind lemmas/contracts; (6) use successive mathematical-to-executable refinements when implementation/spec matching is uncertain. The paper reports that splitting is “very manual” and requires knowing “where to cut properly the analysis into subanalyses” (p. 8), and that refinement layers hedge against unexpected complexity (p. 8).

Verus form (inference): use small `spec fn`s, lemmas written as `proof fn`, `assert` blocks, `reveal`/`hide`, `broadcast` lemmas only where needed, and function contracts to limit solver context. Encode loop invariants locally; prove abstract models and refinement lemmas before connecting executable Rust. Verus's SMT backend makes context discipline and modular contracts directly relevant; exact APIs are an inference.

Evidence/limits: counts are practitioner reports, not measured speedups. Abstraction can become too weak or too strong; simplification may remove requirements (“reducing our expectations,” p. 8), so every weakened model must be documented.

## technique 4: engineer specifications and validate their meaning
What it is: treat requirement translation and annotation strength as a first-class bottleneck. Four participants found specification volume overwhelming, seven found formal expression difficult, and five struggled to choose strength (p. 8). A successful proof does not establish that the specification captures user intent: “you’re not quite done yet, because you have to know that your specification is good” (p. 9).

How to apply it (the steps are the study's inference from the cited counts and recommendations, not a procedure given by the paper): (1) elicit intent with domain experts; (2) write a precise contract at a feasible abstraction level; (3) check it against documentation and concrete test cases; (4) manually review for vacuity, overconstraint, and missing cases; (5) iterate specification, annotations, and proof together. The interview summary calls intent transcription “the bottleneck” (p. 8).

Verus form (inference): express preconditions/postconditions with `requires`/`ensures`, data invariants with `#[verifier::type_invariant]`, and abstract behavior with `spec fn`; test executable examples separately. Check that `ensures true` or an overstrong `requires` is not silently accepted. Verus can prove the written contract but cannot infer whether it matches user intent.

Evidence/limits: no independent oracle for specification correctness; all evidence is practitioner perception. The paper recommends inference and AI assistance but presents no evaluated system.

## technique 5: balance automation with inspectable control
What it is: automate routine proof and specification work while exposing controls, intermediate states, counterexamples, and solver context. Ten of 29 requested more automation; seven automated-tool users said they must guide automation. Sixteen of 29 cited performance, with personal tolerances ranging from ten to 30 seconds (p. 9). Nine called tools black boxes; eight wanted internal-state information; ten valued counterexamples (p. 10).

How to apply it (the steps are the study's inference from the cited counts and recommendations, not a procedure given by the paper): (1) run default automation; (2) when it fails or slows, inspect logs, proof obligations, quantifier instantiations, intermediate facts, and counterexamples; (3) hide irrelevant context, add a lemma or split the obligation; (4) rerun with a configurable automation level; (5) preserve diagnostics in CI. The authors recommend a “low-entry-high-ceiling approach” with detailed logs and interactive proof exploration (p. 16).

Verus form (inference): use `assert`, `assert forall`, `calc!`, explicit lemmas, `reveal`, `#[trigger]` annotations where supported, and `#[verifier::loop_isolation]` or isolated lemmas as appropriate; retain failing counterexample traces and compile diagnostics. Verus does not provide every visualization proposed by the survey, so tooling would be needed.

Evidence/limits: desired features are qualitative requests. Automation can saturate SMT context or hide unsound assumptions; user-visible diagnostics improve trust but do not replace checking.

## technique 6: maintain proofs as code evolves and across unverified boundaries
What it is: keep proofs small and repair them when definitions, annotations, or unverified dependencies change. Twelve of 29 discussed proof maintenance (p. 10) and eight instability; one participant observed that a slight definition change can produce random CI failures (p. 11). Unverified calls require assumptions that tools cannot validate automatically.

How to apply it (the steps are the study's inference from the cited counts and recommendations, not a procedure given by the paper): (1) run proofs continuously in CI; (2) on failure, repair immediately; (3) keep lemmas and invariants small and modular; (4) use the previous proof as a basis for repair; (5) monitor assumptions about unverified code with tests, static analysis, or runtime checks; (6) regenerate or review contracts when dependencies change. The paper recommends developing proof repair that “can utilize the proof for the prior version of the code” (p. 17).

Verus form (inference): isolate unsafe/external APIs behind `external_body` specifications, track assumptions in `requires`, run Verus and tests on every change, and keep invariants in local lemmas. Proof repair is currently an engineering process; Verus has no automatic repair guarantee.

Evidence/limits: maintenance burden is an interview consensus, with no longitudinal repository metric. The authors explicitly note a contradiction between advice to verify early and a preference for “frozen” code (p. 14).

## technique 7: integrate verification with other assurance and human workflows
What it is: combine deductive proofs with tests, static analysis, model checking, runtime monitoring, code review, and CI; make verified code readable and explainable. Thirteen participants reported combining methods because proving an entire codebase is currently intractable (p. 11). Fifteen found communication with non-experts difficult; concrete counterexamples help (p. 10).

How to apply it (the steps are the study's inference from the cited counts and recommendations, not a procedure given by the paper): (1) define what each method covers; (2) use model checking for concurrency/liveness where deductive proofs are costly; (3) generate tests from assumptions and run runtime monitors at verified/unverified boundaries; (4) enforce proof reproducibility in CI and review; (5) keep annotations and generated code readable; (6) present proof obligations and counterexamples to stakeholders. The paper recommends integrating verification with “other quality assurance techniques” and using failed tests to inform proof repair (p. 15).

Verus form (inference): combine Verus proofs with Rust unit/property tests, Clippy/static analysis, and runtime checks around external calls; document all assumptions and trusted code. This hybrid leaves some properties unproved, so claims must state coverage explicitly.

## techniques for the catalog
- critical-component targeting — rank criticality, adoption, requirement clarity, stability, and realizability, then prove high-value components and use lighter checks elsewhere
- incremental verification — co-develop contracts and code from early design through CI while stabilizing interfaces
- modular proof decomposition — split by code, property, or refinement and restrict solver context with lemmas and abstractions
- specification validation — check formal contracts against intent, documentation, and concrete tests; proof success alone is insufficient
- guided automation — combine default automation with user-controlled context, diagnostics, counterexamples, and intermediate states
- proof maintenance — keep proofs small, repair against prior versions, and monitor assumptions at unverified boundaries
- hybrid assurance — combine deductive verification with testing, static analysis, model checking, runtime monitoring, reviews, and CI
Audited 2026-10-12 against the paper: checked all participant counts, fractions, recommendation IDs and quotations against the text; corrected page references (29 observations p. 5, CI and reviews p. 11, invalidate-proofs quote p. 12, maintenance count pp. 10-11); marked the numbered how-to steps as the study's inference since the paper gives no such procedures; fixed Verus syntax (lemmas are proof fn, data invariants via type_invariant, calc! macro, removed nonexistent show, trigger annotations). Not checked: the repository search claim, and Verus keyword details beyond the local Verus notes.
