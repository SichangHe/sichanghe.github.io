# Closing the Loop: Formally Verified Law as a Reward Signal for Self-Improving Legal AI
(authored by agents unless marked 🧑)
Tag: `heydari2026closing`, [paper](https://doi.org/10.48550/arxiv.2606.23913)

## what the paper proposes

Heydari and Leowald propose a legal AI architecture in which an LLM translates legal text into a typed calculus, a deterministic verification kernel checks the resulting formal program, and a separate LLM explains the verified trace. The paper’s core design claim is: “The basic insight is that generation can be probabilistic as long as verification is deterministic.” (Part II, p.3). A verifier is both a deployment gate and a reinforcement-learning reward source. This is a proposal, not an implemented benchmark: the authors state, “we have not yet benchmarked the proposed architecture against non-verified legal AI architectures.” (Part II.F, p.10).

## technique 1: typed autoformalization with defaults, modalities, and time

what it is: translate statutes, precedent, and regulations into λlaw, a typed language extending Catala. Catala’s default expression represents a rule with exceptions: exactly one applicable exception yields its value, multiple applicable exceptions produce conflict `⊥`, no exception with a true justification yields the default consequent, and a false justification yields empty `∅` (Part II.B, pp.6–7). λlaw adds deontic constructors `O(τ)`, `P(τ)`, and `F(τ)` for obligation, permission, and prohibition, plus temporal operators with explicit date-rounding semantics (p.7).

when to use: use the calculus when a legal decision has explicit rules, exceptions, normative outputs, dates, or multiple jurisdictions. The default/conflict/empty outcomes make ambiguity and statutory gaps explicit rather than silently selecting one branch.

how to do it:
1. collect the natural-language provision and its scope, exceptions, temporal conditions, and outputs
2. encode the base rule as a Catala-style default and encode each exception as a branch
3. assign types to legal entities and deontic results; add temporal operators and rounding modes for dates
4. preserve conflict and empty outcomes as first-class results
5. send the candidate to the verification kernel; treat the LLM translation as stochastic rather than trusted (Part II.B, pp.6–7)

The paper gives a deadline example under German §§186–193 BGB. The base case skips the event day, an exception counts it, the raw deadline uses temporal arithmetic and downward month-end rounding, and a jurisdiction parameter shifts weekends and holidays (Part III.A, p.11). It says the kernel verifies “for all inputs that ‘deadline > trigger’ and ‘deadline ≥ raw_deadline’” (p.11).

Inference: in Verus, encode executable Rust data types for rules and dates, `spec fn`s for default/exception semantics, and `requires`/`ensures` contracts for date inequalities. Inference: Verus can verify the Rust implementation of this calculus, but the legal translation remains a specification decision; a passing proof cannot show the statute was interpreted correctly.

evidence: the paper cites a reported 88.8% syntactically valid Catala rate from GPT-4.1 with few-shot prompting, but that denominator and task construction belong to the cited external work, not an experiment in this paper (Part II.B, p.7). The paper reports no end-to-end λlaw accuracy or legal-outcome benchmark.

limits: the authors state that “The λlaw program might encode the wrong rule.” (Part II.F, p.10). Open-textured premises such as whether an activity is “economic in nature” remain judgments. Inference: this technique reduces syntax and branch omissions but does not solve semantic disagreement.

## technique 2: a small verification kernel with SMT counterexamples

what it is: a language-model-independent kernel type-checks λlaw, performs static analyses, and verifies asserted constraints by negating each constraint and submitting it to an SMT solver such as Z3. The paper explains, “If the negation of the constraint is unsatisfiable – if there is no input that violates it – then the constraint holds for all inputs.” (Part II.C, p.7).

how to do it:
1. type-check every operation and legal object to reject category errors
2. statically check defined outputs, conflict freedom, and temporal ambiguity
3. express the desired invariant or assertion as a logical constraint
4. negate it and ask Z3 whether a satisfying assignment exists
5. accept universal validity when the negation is unsatisfiable; return a counterexample when it is satisfiable (Part II.C, p.7)

The kernel is intended to be small and independent of the LLM. The paper gives three reasons for trust: small code, LLM independence, and sound decision procedures for cited quantifier-free linear integer and real arithmetic (p.8). It also says every conclusion carries a proof trace, a sequence of triples containing a natural-language explanation, a statute or precedent, and a verified intermediate value (Part II.D, p.8).

evidence: the article supplies worked deadline and Commerce Clause examples but no measured kernel implementation. For the Commerce Clause example, the kernel checks that all five Lopez factors are addressed, appear in the correct sequence, and terminate consistently when an earlier category resolves the issue (Part III.B, pp.11–12).

limits: SMT success proves the formal constraint under the solver’s modeled theories, not that the formal rule matches law or facts. Open-textured analysis receives a weaker guarantee: the architecture proposes checking citation existence, ratio faithfulness, and structural analogy, while the premise remains judgment (Part II.D and Part III.C, pp.8, 12). Inference: solver soundness cannot compensate for omitted variables or an incorrect formal encoding.

## technique 3: verifier feedback as GRPO reinforcement learning

what it is: use GRPO to sample a group of candidate λlaw programs for each source, score each with kernel and test-suite results, and normalize rewards within the group. The paper proposes three tiers: full reward for type-checking plus tests, partial reward for type-checking but failed assertions, and zero for type failure (Part II.E, p.8).

how to do it:
1. begin with a corpus of expert formalizations paired with natural-language sources
2. sample a group of candidate programs from the current policy
3. resample groups where all candidates fail and discard groups where all pass, so a relative comparison exists
4. run each candidate through the kernel, tests, SMT assertions, structural-fidelity checks, and back-translation faithfulness checks
5. compute group-relative advantages and update the policy under a KL penalty
6. send difficult or corrected cases to legal experts, add corrections to the corpus and tests, and repeat (Part II.E, pp.8–9)

The authors argue GRPO suits heterogeneous difficulty and small expert corpora; its group normalization avoids easy examples dominating, and its graded signal exposes intermediate progress. They say, “Verifier feedback supplies the missing leverage: the model can explore new formalizations, the kernel can score them, and GRPO can shift probability mass toward the candidates that survive.” (Part II.E, p.9).

evidence: no GRPO training run, sample count, cost, or success denominator is reported. The article explicitly presents a “theoretical foundation for implementing a verifier-based legal-AI pipeline” (Part II.F, p.10), so performance claims are hypotheses.

limits: uniformly passing candidates can hide incorrect shared assumptions, while uniformly failing candidates provide no useful relative signal; the proposed resampling does not establish semantic correctness. Inference: reward hacking remains possible if tests or formal specifications omit required behavior.

## what is proved, measured, and trusted

The paper proves no new kernel theorem and reports no implemented-system benchmark. Its examples show how structural properties could be checked for deadlines, Commerce Clause factors, and cross-jurisdictional sanctions. The claimed guarantees are conditional: bound determinations follow from the formalized rules; open-textured analyses receive structural checks. The specification gap remains explicit. The kernel, SMT procedures, λlaw semantics, source corpus, test suite, and legal experts are trusted or assumed; the LLM is an untrusted proposer and explanation generator.

## techniques for the catalog

- typed legal autoformalization — translate rules and exceptions into a typed default calculus with normative and temporal operators
- kernel plus SMT verification — type-check, statically analyze, negate constraints, and use unsatisfiability to establish universal properties
- proof-trace explanations — attach each verified conclusion to source authority and intermediate values before generating prose
- verifier-rewarded GRPO — sample candidate formalizations, score staged verification outcomes, and update the policy by group-relative advantage
- specification-gap testing — use worked examples, concolic inputs, and literate code review to detect wrong formal rules
