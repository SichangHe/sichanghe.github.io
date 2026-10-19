# LLM-based Satisfiability Checking of String Requirements by Consistent Data and Checker Generation
(authored by agents unless marked 🧑)
Tag: `chen2025satisfiability`, [paper](https://arxiv.org/abs/2506.16639)

## approach

This paper combines natural-language interpretation with executable validation for string requirements. An LLM proposes a verification outcome: either UNSAT or SAT plus a concrete string. A second LLM-generated artifact checks that outcome. Declarative SMT checkers can establish unsatisfiability and validate a candidate string; imperative Python checkers can validate a concrete string but cannot prove that no string exists. The authors summarize the goal: “Our approach uses LLMs (1) to derive a satisfiability outcome, and (2) to generate checkers used to ensure the correctness of the satisfiability outcome derived in (1).” (section I, p. 2).

The system has three outcomes: UNSAT, SAT with data, and UNKNOWN. If retries exhaust their budget without a sound answer, it returns the closest-to-sound saved result as UNKNOWN. Inference: the central engineering lesson is to make generated reasoning produce a checkable artifact and to keep the checker's limitations explicit.

## technique 1: divide-and-conquer checker generation

Use for a large conjunction of natural-language requirements. Split the requirements into batches; complete splitting creates one requirement per batch, while no splitting sends the whole set at once. Ask an LLM to convert each batch into either an SMT expression or a Python predicate. For Python, provide a function signature and docstring containing the requirement. For SMT, provide one example pair and request exactly one expression per requirement. Parse each generated checker for syntax. Semantic evaluation is optional: test with valid and invalid labeled strings, or formally compare SMT checkers with ground truth when available. Feed failed checker identities and evaluation feedback back to the LLM converter; merge batches after the configured checks succeed. In RQ1, generation feedback uses syntax checks; testing and formal equivalence are evaluation metrics (sections IV and VI-B, pp. 4 and 7).

The paper explains the tradeoff: splitting increases LLM calls but can lower checker-generation complexity. Its experiment found independent generation (IND) consistently better than batched generation (BATCH), especially for smaller models (section VI-B, p. 8). In that experiment, BATCH uses two batches, one containing positive requirements and one containing negated requirements; IND uses one batch per requirement (p. 7).

Inference: a possible Verus adaptation is to encode each requirement as a `spec fn` over `&str`-like sequences and prove conjunction/negation lemmas. Keep executable parsers separate from proof functions; use `requires` for UTF/character representation assumptions. This can certify a Rust checker against a formal predicate, but Verus cannot infer the predicate from English, and SMT string features may exceed the modeled domain.

The evaluation uses 340 requirement sets across 12 categories (section VI-A, p. 6). Python checker testing accuracy was 100% for GPT-4o, GPT-4o-mini, and DeepSeek-V3; Llama3.1-8b achieved 100% in BATCH and 98% in IND (Table II, p. 7). SMT testing accuracy exceeded 75% for GPT-4o and DeepSeek-V3 in IND and was below 20% for Llama3.1-8b in IND (section VI-B, p. 7). Testing accuracy is the fraction of generated checkers matching ground truth on all ten manually constructed samples per requirement, five satisfying and five violating. It does not establish correctness for every string (section VI-B, p. 7).

## technique 2: declarative and imperative checker complementarity

Generate declarative SMT checkers to decide unsatisfiability and optionally validate candidate strings by adding the string as a constraint. Generate imperative Python functions that return a boolean for a particular string. For example, the requirement that an email address contain exactly one @ character becomes an SMT expression constraining string membership and an imperative function `return s.count("@") == 1` (Figure 5, p. 6).

When the LLM outputs UNSAT, use declarative checkers because an imperative checker has no candidate string to test. When it outputs SAT plus data, either checker type can validate the string. The Hybrid configuration uses Python for strings and SMT for UNSAT decisions (sections V and VI-C, pp. 4 and 8). A checker-confirmed result is returned as SAT or UNSAT; an unconfirmed candidate may instead accompany UNKNOWN. The authors explicitly note: “imperative checkers have an intrinsic limitation: they can only confirm that a specific string conforms to requirements while they are unable to determine if the requirements themselves are unsatisfiable.” (section VI-A, p. 6).

Inference: a possible Verus adaptation is to prove that an executable Rust checker returning true implies that all formal requirement predicates hold for its SAT witness. For UNSAT, prove an implication from the conjunction to `false` using Verus lemmas; this is a proof of the formalized requirements, not of the English text. Use executable Rust for runtime validation and proof functions for its correctness argument.

## technique 3: checker-based feedback loop

First prompt an LLM with the NL requirements to produce an LVO (UNSAT or SAT plus realistic data). Validate the LVO with generated checkers. If a SAT string fails, report the violated requirements; if an UNSAT claim is contradicted by an SMT checker, assign that LVO a fixed quality value. The paper does not return SMT-generated data directly, because it may lack realism and the generated SMT checker may itself be incorrect (section V, p. 4). Save the current LVO and feedback. If budget remains, include prior counterexamples and optionally explanations in the next prompt. Stop and return a verified answer when a checker confirms it. If the checker returns unknown, leave the feedback loop and return the best saved outcome. If the budget runs out, likewise return UNKNOWN with the best saved outcome: more saved UNSAT outcomes than SAT outcomes gives approximately-UNSAT; otherwise choose the SAT string satisfying the highest ratio of requirements and return approximately-SAT/UNKNOWN.

The prompt template explicitly asks the model to summarize counterexample violations, analyze constraints, and determine feasibility (Figure 3, p. 5). The approach's failure mode is agreement between a flawed LLM output and a flawed checker; the authors state: “While feedback helps, it cannot fully eliminate the risk.” (section V, p. 5).

Inference: a possible Verus adaptation is to implement the loop as ordinary Rust state plus a verified transition invariant: every saved SAT candidate has its checker results recorded, and every returned SAT candidate satisfies all formal predicates. Represent the retry budget explicitly and decrement it on each retry. Represent UNKNOWN and its approximate outcome separately from confirmed SAT or UNSAT claims.

## technique 4: hybrid checker and feedback strength

Use Python to validate concrete strings and SMT to decide UNSAT. Compare direct generation, validation only (+V), counterexample feedback (+VF), and counterexample plus explanations (+VFE). Ground-truth-checker experiments show that +VFE generally gives the best F1, while counterexamples without explanations can reduce generation success. For Hybrid+VFE with ground-truth checkers, GSR ranges from 57.24% to 92.23%, and F1 ranges from 82.59% to 94.64% across the four LLMs (Table III, p. 9). The GPT-4o row gives “92.23 96.36 92.98 94.64” for GSR, precision, recall, and F1. The answer-to-RQ2 prose gives an inconsistent F1 upper endpoint of 93.04%; the range here follows the table. Hybrid+VFE has the highest F1 for every model, but GPT-4o-mini has a higher GSR with Hybrid+VF (78.09%) than Hybrid+VFE (77.74%).

In the end-to-end experiment, IND-generated checkers were combined with the Hybrid+VFE verifier. Relative to the corresponding metrics with ground-truth checkers, which the paper treats as upper bounds, feedback systems achieved over 95% GSR ratio in three verifiers and over 60% F1 ratio in all verifiers (RQ3, p. 10). These are ratios to upper-bound metrics, not raw accuracy.

Inference: a possible Verus adaptation is to treat Python/SMT as external checker backends with explicit result contracts. Prove that a SAT result is accepted only after a trusted backend says every predicate holds; keep backend soundness assumptions in the trusted base. A hybrid strategy maps naturally to a Rust orchestrator but does not remove the need to validate generated predicates.

## evidence and limits

The dataset contains 340 manually formalized requirement sets: the initial CVC5 run labeled 230 SAT, 54 UNSAT, and 56 UNKNOWN; manual inspection of UNKNOWN cases yielded 53 SAT and 3 UNSAT, giving final 283 SAT and 57 UNSAT (section VI-A, p. 6). CVC5 used a five-second timeout, so the final labels include manual resolution of solver unknowns. Temperatures were zero for open-source models and 0.01 for GPT models; retries without feedback used 0.1. The maximum retry budget was two LLM calls for the checker generator and five for the checker-based verifier (section VI-A, pp. 6–7).

The authors identify possible errors in manually created checkers and samples, dataset imbalance, selection bias, and possible overlap between common programming exercises and LLM training data (section VI-E, pp. 10–11). They cross-check manual artifacts for consistency and evaluate SAT and UNSAT metrics separately. Generalization to complex industrial requirements remains future work. Inference: checker agreement alone does not guarantee that the formalized predicates capture the English requirements.

Inference: for VeruLaw, this is a practical specification pipeline: turn prose requirements into executable predicates, generate witnesses, cross-check with independent mechanisms, and return UNKNOWN when checker evaluation is unknown or the retry budget expires. The threat is checker agreement on the same wrong interpretation. A Verus proof can make the Rust predicate and witness validation reliable only after a human or trusted parser fixes the formal meaning; it cannot prove that an LLM translated the natural-language requirement correctly. VL should preserve the paper's explicit separation between SAT witness evidence, UNSAT proof evidence, and UNKNOWN.

## techniques for the catalog

- divide-and-conquer checker synthesis — split NL requirements, generate per-batch SMT/Python checkers, check syntax, optionally assess semantics, and merge batches that pass the configured checks
- declarative/imperative complement — use SMT for UNSAT and either checker type for concrete SAT witnesses
- feedback verification loop — validate each LLM outcome, feed counterexamples and explanations back, and bound retries
- hybrid checker — combine imperative witness checking with declarative inconsistency checking

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Checkers are considered formally correct only if equivalence is explicitly proven; all solver results that yield timeout or unknown outcomes are disregarded."): checked all quotations, numbers, section/page references, and technique steps against the full paper; corrected the link, quotation, page references, semantic-check scope, feedback behavior, and F1 range, removed the unsupported reviewer-session claim, and marked adaptations as inferences; did not run the artifact or independently validate the Verus adaptations.
