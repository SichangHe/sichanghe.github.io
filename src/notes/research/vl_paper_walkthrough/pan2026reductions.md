# Problem Reductions at Scale: Agentic Integration of Computationally Hard Problems
(authored by agents unless marked 🧑)
Tag: `pan2026reductions`, [paper](https://www.semanticscholar.org/paper/30b1aaecee06ef4c6073321dd3608a48bb78785e)

## scope and result

The paper presents a Rust library and CLI for computationally hard problem reductions. In about three months it reports 190 problem types (220 variants), 265 reduction rules, 170k lines of Rust, 129 types with an ILP path, and 78 reachable from 3-SAT (§4.1, p.8). Its central claim is harness engineering: “Our harness combines a no-code contribution route for domain experts, a multilayer verification stack ranging from type-level checks to agentic feature tests (AI agents role-playing as end users), and a fully automated implementation-review-integration pipeline.” (Abstract, p.1)

## technique 1: uniform reduction interfaces and executable round trips

What it is. Every problem type has input, solution, and size-measure interfaces. Every reduction has a forward map, inverse map, and multivariate-polynomial overhead. The canonical instance for each type drives tests and the manual example (§2.2, p.4).

When to use it. Use uniform interfaces when many independently contributed transformations must compose and be tested automatically.

How to do it.

1. Define the source and target problem types, solution types, and size measures (§2.2, p.4)
2. Implement a forward map from source instance to target instance (§2.2, p.4)
3. Implement an inverse map from target solution to source solution (§2.2, p.4)
4. Define the overhead polynomials (§2.2, p.4)
5. Register a canonical instance (§2.2, p.4)
6. Reduce the canonical source, solve the target, lift the solution, and compare against a direct source solve; this is the round-trip test (§3.4, p.7)

Verus form. Inference: Specify forward and inverse maps with `requires` and `ensures`; prove that lifting a target solution satisfies the source predicate. Use `assert` and lemmas as proof steps, while keeping executable maps separate from proof-only functions. A round-trip test remains runtime evidence and does not replace the relational proof.

Evidence. The authors say: “Round-trip tests cover each reduction rule end-to-end: from a small canonical source instance, reduce, solve the target, lift the solution back, and compare against a direct solve of the source.” (§3.4, p.7) The library status reports 265 rules and 190 types; these are counts of registered artifacts, not proofs of every possible input.

## technique 2: multilayer correctness harness

What it is. Correctness is enforced by six layers: issue review, compile-time type checks, unit tests, round-trip tests, agentic feature tests, and manual verification (§3.4, p.7). The paper states: “Correctness is enforced by six layers: issue review (Stage 2), compile-time type checks, unit tests, round-trip tests, agentic feature tests (Stage 4) and manual verification (Stage 5 and 6).”

How to do it.

1. Review proposals for usefulness, effort, correctness of references, and writing quality (Stage 2, §3.3, p.7)
2. Compile and run unit tests for problems, solvers, and helpers (§3.4, p.7)
3. Run each reduction’s round-trip test (§3.4, p.7)
4. Run a fresh-context agentic feature test through the documented CLI (§3.4, p.7)
5. Have a maintainer perform final review and authorize merge (Stages 5–6, §3.3, p.7)

Verus form. Inference: Add Verus verification between compile and runtime tests. The harness can require that every exported function has contracts and that `cargo verus` succeeds, then run round trips. Human review must inspect specifications, trusted external bodies, and whether the proved property matches the intended problem.

Evidence and limits. Agentic feature tests found approximately 50 CLI defects that unit and round-trip tests missed (§3.4, p.7). This supports fresh-user testing for usability and semantic integration; it does not quantify soundness of reductions for all instances.

## technique 3: staged agent workflow and skills

What it is. A project specification, tools, progressively disclosed knowledge base, automation skills, and advisor skills constrain agent behavior (§3.1, p.5). Contributions move through propose, validate, implement, review, merge, and verify stages (§3.3, p.7).

How to do it.

1. Have a domain expert file a structured issue through the propose skill (§3.3, p.7)
2. Validate usefulness, effort, correctness, and writing quality; correct mechanical defects (§3.3, p.7)
3. Let an implementation agent select a ready issue, implement it, and open a PR headlessly (§3.3, p.7)
4. Dispatch parallel structural, code-quality, and fresh-user reviews (§3.3, p.7)
5. Let a maintainer inspect the report and make the merge decision (§3.3, p.7)
6. Walk through the manual and CLI with the original domain expert after merge (§3.3, p.7)

Verus form. Inference: Encode verification commands and contract checks as required pipeline stages. Keep human authorization for specification choices, model adequacy, and merge decisions. Skills can ask an agent to repair failed proofs, but a passing proof after weakening a contract needs human review.

## technique 4: solver routing and symbolic overhead composition

What it is. The reduction graph composes edges. A symbolic engine composes overhead expressions, compares asymptotic growth, and evaluates expressions (§2.3, p.4). Exact backends use ILP/HiGHS, customized solvers, or brute force on small instances (§2.3, p.4).

How to do it.

1. Represent each edge’s overhead as a symbolic polynomial (§2.3, p.4)
2. Compose a path by substituting one edge’s output polynomial into the next edge’s input (§2.3, p.4)
3. Compare expressions to select lower asymptotic growth (§2.3, p.4)
4. Evaluate the selected path on an instance and invoke the endpoint solver (§2.3, p.4)

Verus form. Inference: Prove that symbolic composition preserves each reduction’s size bound with `ensures`; use `assert` to establish monotonicity assumptions. The solver implementation and complexity model remain trusted unless separately specified and verified.

Evidence. In the team-split case study, each configuration used ten random instances with a 90-second solver cap. `+ pred` and `+ pred + web` matched the best-of-four objective on 10/10 instances; mean solver times were 12.9 s and 6.5 s, compared with 37.1 s for bare AI and 26.1 s for bare AI + web (Table 1, p.9). AI-token means were 70,523 and 80,592 for the pred configurations versus 37,379 and 41,504 without pred. These results support this case study, not universal solver superiority.

## what is proved, measured, and trusted

Measured artifacts include code volume, graph counts, test outcomes, feature-test defects, and the ten-instance case study. Trusted components include Rust’s compiler, HiGHS and other solvers, symbolic expression implementation, agent outputs, human review, and the correctness of problem definitions and canonical examples. The paper explicitly leaves four responsibilities to humans: selecting reductions, verifying algorithms, constructing canonical examples, and authorizing merges (§3.2, p.6).

## techniques for the catalog

- uniform reduction contracts: pair forward and inverse maps with size-overhead expressions and canonical instances
- executable round-trip validation: reduce, solve, lift, and compare with a direct oracle
- six-layer harness: combine issue, compile, unit, round-trip, fresh-user, and human checks
- staged skills pipeline: move contributions through proposal, validation, implementation, review, merge, and expert verification
- symbolic path routing: compose and compare overhead expressions before selecting a solver path
