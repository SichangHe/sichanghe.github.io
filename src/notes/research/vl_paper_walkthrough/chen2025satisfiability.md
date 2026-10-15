# LLM-based Satisfiability Checking of String Requirements by Consistent Data and Checker Generation
(authored by agents unless marked 🧑)
Tag: `chen2025satisfiability`, [paper](https://www.semanticscholar.org/paper/92a34ceb52de7c49e1988764343887c01a5bec85)

## approach

This paper combines natural-language interpretation with executable validation for string requirements. An LLM proposes a verification outcome: either UNSAT or SAT plus a concrete string. A second LLM-generated artifact checks that outcome. Declarative SMT checkers can establish unsatisfiability and validate a candidate string; imperative Python checkers can validate a concrete string but cannot prove that no string exists. The authors summarize the goal: “Our approach uses LLMs (1) to derive a satisfiability outcome, and (2) to generate checkers used to ensure the correctness of the satisfiability outcome.” (section I, p. 2).

The system has three outcomes: UNSAT, SAT with data, and UNKNOWN. If retries exhaust their budget without a sound answer, it returns the closest-to-sound saved result as UNKNOWN. The central engineering lesson is to make generated reasoning produce a checkable artifact and to keep the checker's limitations explicit.

## technique 1: divide-and-conquer checker generation

Use for a large conjunction of natural-language requirements. Split the requirements into batches; complete splitting creates one requirement per batch, while no splitting sends the whole set at once. Ask an LLM to convert each batch into either an SMT expression or a Python predicate. For Python, provide a function signature and docstring containing the requirement. For SMT, provide one example pair and request exactly one expression per requirement. Parse each generated checker for syntax. Then test semantic soundness where possible using valid and invalid labeled strings, or compare to a formal ground truth. Feed unsound checker identities and feedback back to the LLM converter; merge only sound batches.

The paper explains the tradeoff: splitting increases LLM calls but can lower checker-generation complexity. Its experiment found independent generation (IND) consistently better than batched generation (BATCH), especially for smaller models (section VI-B, p. 7).

Verus form (Inference): encode each requirement as a `spec fn` over `&str`-like sequences and prove conjunction/negation lemmas. Keep executable parsers separate from proof functions; use `requires` for UTF/character representation assumptions. This can certify a Rust checker against a formal predicate, but Verus cannot infer the predicate from English, and SMT string features may exceed the modeled domain.

Evidence on 340 requirement sets across 12 categories: Python checker testing accuracy was 100% for three LLMs and at least 98% for Llama3.1-8b; SMT testing accuracy exceeded 75% for larger DeepSeek-V3 but was below 20% for Llama3.1-8b (RQ1, Table II, p. 7). These percentages are over generated checkers, with syntax and testing accuracy denominators defined by the table.

## technique 2: declarative and imperative checker complementarity

Generate declarative SMT checkers to decide unsatisfiability and optionally validate candidate strings by adding the string as a constraint. Generate imperative Python functions that return a boolean for a particular string. For example, the requirement “exactly one @” becomes an SMT expression constraining string membership and an imperative function `return s.count("@") == 1` (Figure 5, p. 6).

When the LLM outputs UNSAT, use declarative checkers because an imperative checker has no candidate string to test. When it outputs SAT plus data, run both declarative and imperative checkers; return the data only when it satisfies all applicable checks. The authors explicitly note: “imperative checkers have an intrinsic limitation: they can only confirm that a specific string conforms to requirements while they are unable to determine if the requirements themselves are unsatisfiable.” (section VI-A, p. 6).

Verus form (Inference): a Rust predicate over a string can be proved sound for SAT witnesses with `ensures` that true means all requirement predicates hold. For UNSAT, prove an implication from the conjunction to `false` using Verus lemmas; this is a proof of the formalized requirements, not of the English text. Avoid treating a runtime `proof fn` as executable validation.

## technique 3: checker-based feedback loop

First prompt an LLM with the NL requirements to produce an LVO (UNSAT or SAT plus realistic data). Validate the LVO with generated checkers. If a SAT string fails, report the violated requirements; if UNSAT is contradicted by an SMT checker, record the SAT witness. Save the current LVO and feedback. If budget remains, include prior counterexamples and optionally explanations in the next prompt. Stop and return a verified answer when a checker confirms it. If budget runs out, choose the best saved outcome: majority UNSAT becomes approximately-UNSAT; otherwise choose the SAT string satisfying the highest ratio of requirements and return approximately-SAT/UNKNOWN.

The prompt template explicitly asks the model to summarize counterexample violations, analyze constraints, and determine feasibility (Figure 3, p. 5). The approach's failure mode is agreement between a flawed LLM output and a flawed checker; the paper says feedback “cannot fully eliminate the risk.” (section V, p. 6).

Verus form (Inference): implement the loop as ordinary Rust state plus a verified transition invariant: every saved SAT candidate has its checker results recorded, and every returned SAT candidate satisfies all formal predicates. Bound retries with a `requires` budget and prove termination by decrementing it. Unknown and approximate outcomes must be distinct enum variants; Verus should not prove them as exact satisfiability claims.

## technique 4: hybrid checker and feedback strength

Use Python to validate concrete strings and SMT to decide UNSAT. Compare direct generation, validation only (+V), counterexample feedback (+VF), and counterexample plus explanations (+VFE). Ground-truth-checker experiments show that +VFE generally gives the best F1, while counterexamples without explanations can reduce generation success. The hybrid checker with +VFE achieved the best generation success and F1 ranges: GSR 57.24%–92.23% and F1 82.59%–93.04% across the four LLMs (Table III, p. 8; each range is across LLMs, not one denominator).

In the end-to-end experiment, LLM-generated checkers were combined with the verifier. Relative to ground-truth checker upper bounds, feedback systems achieved over 95% GSR ratio in three verifiers and over 60% F1 ratio in all verifiers (RQ3, p. 9). These are ratios to upper-bound metrics, not raw accuracy.

Verus form (Inference): treat Python/SMT as external checker backends with explicit result contracts. Prove that a SAT result is accepted only after a trusted backend says every predicate holds; keep backend soundness assumptions in the trusted base. A hybrid strategy maps naturally to a Rust orchestrator but does not remove the need to validate generated predicates.

## evidence and limits

The dataset contains 340 manually formalized requirement sets: the initial CVC5 run labeled 230 SAT, 54 UNSAT, and 56 UNKNOWN; manual inspection of UNKNOWN cases yielded 53 SAT and 3 UNSAT, giving final 283 SAT and 57 UNSAT (section VI-A, p. 6). CVC5 used a five-second timeout, so the final labels include manual resolution of solver unknowns. Temperatures were zero for open-source models and 0.01 for GPT models, with retries capped at two checker calls and five verifier calls.

The results show substantial gains but no soundness guarantee for English requirements. Manual formalization, checker generation, model choice, solver timeout, and dataset category selection are trusted. The authors note an imbalanced dataset with more SAT than UNSAT cases and that ten reviewer sessions in related experiments may not be independent.

Inference: for VeruLaw, this is a practical specification pipeline: turn prose requirements into executable predicates, generate witnesses, cross-check with independent mechanisms, and return UNKNOWN when checks disagree or budgets expire. The threat is checker agreement on the same wrong interpretation. A Verus proof can make the Rust predicate and witness validation reliable only after a human or trusted parser fixes the formal meaning; it cannot prove that an LLM translated the natural-language requirement correctly. VL should preserve the paper's explicit separation between SAT witness evidence, UNSAT proof evidence, and UNKNOWN.

## techniques for the catalog

- divide-and-conquer checker synthesis — split NL requirements, generate per-batch SMT/Python checkers, test soundness, and merge only sound batches
- declarative/imperative complement — use SMT for UNSAT and Python plus SMT for concrete SAT witnesses
- feedback verification loop — validate each LLM outcome, feed counterexamples and explanations back, and bound retries
- hybrid checker — combine imperative witness checking with declarative inconsistency checking

Checked 2026-10-15 against the paper by a Codex agent for llm_based_satisfiability_checking_of_str_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
