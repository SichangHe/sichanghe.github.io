# miniF2F: a cross-system benchmark for formal Olympiad-level mathematics
(authored by agents unless marked 🧑)
Tag: `zheng2021minif2f`, [paper](https://arxiv.org/abs/2109.00110)

## scope and result

Zheng, Han, and Polu introduce miniF2F as a shared benchmark for neural theorem proving. The abstract states: “We present miniF2F, a dataset of formal Olympiad-level mathematics problems statements intended to provide a unified cross-system benchmark for neural theorem proving.” Version 1 contains 488 statements: 244 test and 244 validation, drawn from IMO, AIME, AMC, MATH, and custom algebra, number-theory, and induction problems (Table 1, p. 3). The systems targeted are Metamath, Lean, Isabelle (partially), and HOL Light (partially).

The benchmark's purpose is comparison across formal systems. The introduction says: “More precisely, the agent must receive IMO problems written in a formal mathematical format, and must produce a formal (i.e. machine-checkable) proof for that problem.” Formal proofs are optionally attached; Table 4's caption says the proof “is optionally attached thus not part of the benchmark”. Inference: the statement is therefore the benchmark item, and a prover generates a proof that the target system checks.

## technique 1: cross-system benchmark construction

The dataset is manually formalized and aligned across systems. The authors select statements whose mathematical theories are broadly expressible, with emphasis on algebra, number theory, and inequalities because geometry and combinatorics were difficult to formalize across available systems (Section 3, p. 3). They stratify the split so test and validation cover each problem type and difficulty equally when available. Table 1 gives exact denominators: each split has 244 statements; each has 20 IMO, 15 AIME, 45 AMC, and corresponding MATH difficulty strata plus custom sets.

Apply the construction as follows:

1. Choose source problems spanning target difficulty and subfields, retaining the source provenance (Section 3).
2. Filter for statements expressible in most target proof systems; the introduction criticizes library lemmas that are “implementation-specific artifacts” without cross-system translations (Section 1 and 3).
3. Manually formalize each statement in the target languages, attempting to preserve its mathematical difficulty (Section 3). Isabelle and HOL Light coverage is partial.
4. Review each formalized statement; the paper reports about 15 minutes per statement for trained practitioners and about half that for review, as averages without a statement count (Section 3, p. 4). The paper does not say who reviews or whether review is independent.
5. Draw a stratified random test/validation split with equal coverage of source type and difficulty (Section 3).
6. Freeze a version; allow later fixes only when errors are discovered; researchers are invited to cite miniF2F indicating the version used (Section 3, p. 3).
7. License each system-specific part consistently with its prover library (Metamath under MIT, Lean and Isabelle under Apache) and encourage researchers to contribute proofs back (Section 3, pp. 3–4).

Formalization has known edge cases. Multiple-choice problems can be made fair by formalizing all answer choices and awarding a point only for proving the correct one. Word problems require explicit mathematical modeling and may be discarded when formalization dominates the original difficulty. “Find all” questions are approximated by stating the supplied witness and proving it, sometimes also proving uniqueness (Section 3, p. 4). Inference: these transformations change the task and should be reported.

Inference: A Verus benchmark should preserve a stable executable Rust statement, its specification, and the proof obligation separately, with a versioned manifest and independent review. A Verus proof can check the resulting obligation, but cross-language alignment and any witness substitution remain benchmark-design assumptions.

## technique 2: deterministic tactic-search baseline

The Lean tidy baseline is a reproducible best-first tactic search. The paper specifies: “Given a list of tactics L with priority, we maintain a priority queue Q of tactic states whose priority is given by the priority of the last applied tactic in L that led to it.” It pops the top state, applies every tactic, reinserts successful successor states, and stops when a proof is found or the iteration budget is exhausted (Section 4.2.1, p. 5).

Apply it step by step:

1. Build an ordered tactic list `L`; miniF2F adds `HL = [nlinarith, linarith, ring_nf, norm_num]` at higher priority (Section 4.2.1).
2. Initialize a priority queue with the initial Lean tactic state (implied; the paper does not state initialization explicitly).
3. Pop the highest-priority state and apply each tactic in `L` (Section 4.2.1).
4. Insert returned states when no error is raised; when the queue size reaches the limit, discard all states to be inserted (Section 4.2.1; the text names the limit `qmax` in this sentence and `ωmax` elsewhere and in Table 2).
5. Stop expanding states beyond depth `dmax`, and stop the outer loop after `imax` iterations (Section 4.2.1).
6. The loop runs until a proof is found or the iteration budget is exhausted (Section 4.2.1).

The reported settings are `ωmax = 128` and `dmax = 8`. Table 2 reports solved counts out of 244 for each split: Lean's built-in tidy solves 12/244 validation and 13/244 test; the custom baseline with `imax=1` solves 21/244 and 23/244; with `imax=8`, 41/244 and 44/244; with `imax=128`, 41/244 and 44/244. The deterministic baseline can still vary because per-tactic application timeouts affect the `imax=32` test count (43/244) (Table 2, p. 6).

Inference: For Verus, the same search shape can drive candidate `proof fn` bodies or lemma invocations, but each candidate must be checked by Verus before counting as solved. Queue limits, depth, and timeout settings must be part of the benchmark record; they are not proof guarantees.

## technique 3: neural proof-search evaluation

The authors evaluate GPT-f on Metamath and GPT-f/PACT on Lean. N is the number of proof search attempts per statement, and “Pass@N is computed by running more attempts per statement, averaged to get an unbiased, low-variance estimate” (Section 4, p. 4). Metamath GPT-f uses a 700M-parameter model, log-probability search, and an updated `set.mm` dump. It obtains Pass@1 1.3% and Pass@8 1.6% on miniF2F-test (Section 4.1.1, p. 5). Lean GPT-f/PACT also uses 700M parameters and obtains Pass@1 24.6% and Pass@8 29.2% on miniF2F-test (Section 4.2.2, p. 6).

Table 3 provides proof lengths and pass rates; the 244-statement size of each split comes from Tables 1 and 2. All proof searches have a 128 expansions budget (Table 3 caption). On miniF2F-test, Metamath GPT-f has average proof length 20.3, Pass@1 1.3%, Pass@8 1.6%; Lean tidy has average length 1.8 and Pass@1 18.0% (a deterministic search, so no Pass@8); Lean GPT-f has average length 2.5, Pass@1 24.6%, Pass@8 29.2%. On miniF2F-valid: Lean GPT-f is 23.9% Pass@1 and 29.3% Pass@8, while Metamath GPT-f is 1.0% and 2.0%.

The paper includes a concrete proof-generation pattern. For `algebra_sqineq_2unitcircatblt1`, GPT-f supplies premises to `nlinarith`: `nlinarith [sq_nonneg a, sq_nonneg b, sq_nonneg (a - b)]` (Section 4.3.1, p. 7). The paper says GPT-f fails in Metamath because the proof “requires a very large number of steps”, and the tidy baseline fails “as nlinarith is not capable of solving the goal without being passed extraneous premises”. The authors “hypothesize that this is mainly explained by the model’s access to high-level tactics when applied to Lean”. Inference: tactic access is part of the measured system, not merely a convenience.

Inference: In Verus, report Pass@N over independently sampled candidate proofs and divide by the exact number of benchmark statements, retaining verifier version and timeout. A candidate that compiles but uses an unauthorized `external_body` or untrusted axiom must be rejected by the benchmark policy; the paper's formal systems accept their own trusted features, so this transfer requires an explicit Verus trust policy.

## evidence, comparisons, and limits

The paper compares formal and informal settings on a uniformly sampled subset of MATH. GPT-3 reports 6.0% algebra and 3.9% number theory in the informal setting; Lean GPT-f reaches 51.4% and 41.7%, while the tidy baseline reaches 31.4% and 30.0% (Section 4.3.2, p. 7). These percentages use the MATH-derived subsets of miniF2F and the cited GPT-3 result from Hendrycks et al. (2021); the paper notes GPT-3 is “a larger model than the GPT-f model” and that the formalized subset is small. The authors say the tidy result demonstrates “the benefit of proof automation alone”. Inference: the comparison uses different models and tasks, so it does not isolate the effect of formal checking.

Difficulty tables provide counts rather than rates. For MATH algebra test, Lean GPT-f solves 8, 7, 10, 7, and 3 statements at difficulty levels 1–5; for number theory test it solves 10, 5, 5, 3, and 2 (Tables 5–6, p. 11). Table 1 gives the cell sizes per split: 14 per level for algebra, and 16 at level 5 and 11 at each of levels 1–4 for number theory (as printed in the layout), so MATH algebra has 70 and number theory 60 test statements. Inference: the number theory test counts reproduce the quoted rates (Lean GPT-f 10+5+5+3+2 = 25 of 60 = 41.7%; tidy 7+4+3+2+2 = 18 of 60 = 30.0%), but the algebra test counts in Table 5 (Lean GPT-f 35 of 70 = 50.0%; tidy 21 of 70 = 30.0%) do not reproduce 51.4% and 31.4%, and I could not find the reason in the paper.

What is proved or measured is machine acceptance of generated proofs, pass counts, proof lengths, and benchmark composition. What remains trusted includes each proof assistant's kernel and libraries, formalization fidelity to the informal problem, model training data, search implementation, timeout behavior, and the cross-system translation. The benchmark underrepresents geometry and combinatorics because those areas were less expressible across systems. The authors warn that this distribution can skew research directions and that expanding coverage requires corresponding library work (Section 4.3.3, p. 7).

Inference: For agent-written verified Rust, miniF2F's main lesson is evaluation discipline rather than a reusable program-verification algorithm. A Verus benchmark should separate statement generation, proof search, verifier acceptance, and trusted-code policy; otherwise a high pass rate can hide trivialized specifications or excessive automation. Threat to a product is medium: the benchmark pattern can expose proof-generation regressions, but its mathematics does not measure memory safety, concurrency, or systems specifications.

## techniques for the catalog

- cross-system benchmark design — Manually align versioned formal statements, stratify by source and difficulty, and publish provenance and denominators
- deterministic tactic search — Explore a priority queue of tactic states with explicit queue, depth, iteration, and timeout bounds
- pass@N proof evaluation — Run N proof-search attempts per statement and report accepted-proof counts over the exact split denominator
- trust-aware baseline comparison — Compare neural and hand-built provers while recording tactic access, proof lengths, system versions, and formalization limits
