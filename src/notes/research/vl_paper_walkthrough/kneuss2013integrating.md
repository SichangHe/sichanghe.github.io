# On Integrating Deductive Synthesis and Verification Systems
(authored by agents unless marked 🧑)
Tag: `kneuss2013integrating`, [paper](http://arxiv.org/abs/1304.5661v1)

## scope and result

The paper presents Leon, an integrated verifier and synthesizer for recursive functional programs over unbounded integers and algebraic data types. The abstract states: “We describe techniques for synthesis and verification of recursive functional programs over unbounded domains.” (Abstract, p. 1). Its central design is to express a synthesis problem as a relational postcondition, apply independently validated deduction rules, and use counterexamples from the verifier to guide search. The authors report that successful synthesis is guaranteed correct for every input under the verifier's model, while scalability and missing inductive invariants remain limits (Introduction, pp. 1–2; Conclusions, p. 14).

Inference: for Verus, the transferable idea is to generate Rust bodies from `requires`/`ensures`-like relations and use verifier counterexamples to refine candidates. Verus still needs valid Rust syntax, executable code, termination arguments, and proof obligations in its supported subset; Leon's Scala `choose` and Scala compiler are not Verus constructs.

## technique 1: relational specifications and validated deduction rules

What it is. A synthesis problem is a path condition Π, a relation φ over inputs and outputs, and output variables. A solution is a precondition P plus a program term T. The two obligations are relation refinement, `Π ∧ P |= φ[x̄ ↦ T̄]`, and domain preservation, `Π ∧ (∃x̄:φ) |= P` (Sections 4.1–4.2, pp. 5–6). The paper says, “The validity of each rule can be established independently from its instantiations, or from the context in which they it is used.” (Section 4.3, p. 6).

When to use it. Use this when a desired behavior is easier to state as a relation than as an implementation, especially with several orthogonal constraints such as sortedness, content, and size.

How to apply it.
1. Write the path condition and relational predicate, leaving the body as `choose` (Section 4.1, p. 5).
2. Apply one-point substitution for equalities, ground solving when no input occurs, and case-split for disjunctions (Section 4.3, pp. 6–7).
3. Apply a recursion schema when an input has a recursive algebraic type. The list rule creates a base subproblem and a tail subproblem, and requires an inductive precondition for recursive calls (Section 4.3, pp. 6–7).
4. Reconstruct the program from solved subproblems; each rule preserves correctness by construction (Section 4.3, p. 6).

Inference: in Verus, write a Rust function with a `requires` precondition and `ensures` relation, then use proof functions and loop invariants to justify each generated branch. Verus has no Leon `choose` synthesis primitive in the referenced Verus material, so candidate generation would be external; the resulting Rust body and its proof remain in Verus.

Evidence and limits. The `add` example over unary numerals is specified by `value(r) == value(x)+value(y)` and synthesized recursively; the paper reports, “Both functions are generated within three seconds.” (Section 2, p. 3). The authors note that fully automated proof can fail when inductive invariants are absent (Section 8.1, p. 13). The trusted core includes the verifier, Z3, compiler, and the specification itself; inference: no experiment establishes that a relational specification captures the programmer's intended behavior beyond the stated predicates.

## technique 2: symbolic term exploration (STE)

What it is. STE represents many candidate terms by a nondeterministic generator, encodes choices into SMT, and alternates candidate discovery with counterexample elimination. The paper defines the core idea as: “The core idea behind STE is to symbolically represent many possible terms (programs), and to iteratively prune them out using counterexamples and test case generation.” (Section 6, p. 9).

How to apply it.
1. Build typed recursive generators from constructors, selectors, in-scope variables, and existing functions (Section 6, pp. 9–10).
2. Choose an instantiation depth and encode each nondeterministic choice with Boolean selector variables and equalities for generated values (Section 6, pp. 9–10).
3. Solve `φ ∧ B(ā,b̄,c̄) ∧ C(c̄,x̄)` to obtain a candidate selector valuation (Equation 2, p. 10).
4. Freeze those selectors and solve `¬φ ∧ B(ā,b̄₀,c̄) ∧ C(c̄,x̄)`; a model is a concrete input counterexample (Equation 3, p. 10).
5. If a counterexample exists, assert the candidate's selector assignment is forbidden and repeat. If none exists, the candidate satisfies the relation at that depth; increase depth when necessary (Section 6, pp. 10–11).
6. Run generated candidates concretely on model inputs to discard hundreds or thousands before invoking SMT (Section 6, p. 11).

Inference: a Verus implementation could generate candidate Rust expressions outside Verus, compile each candidate with a verification harness, and feed failed `ensures` checks back as counterexamples. Verus proof functions can discharge the final candidate, but the Boolean-generator encoding and candidate compiler are additional infrastructure.

Evidence and limits. Concrete execution is reported to rule out all candidates “in a fraction of a second” in many unsolved cases (Section 6, p. 11). Candidate spaces grow exponentially with depth and the paper explicitly says this causes solver difficulty (Section 6, p. 11). The depth bound means failure to find a program is not proof of impossibility.

## technique 3: type-driven counterexample-guided synthesis with condition abduction

What it is. This rule enumerates well-typed expressions, ranks them on accumulated examples, and abduces guards under which a partially correct expression is valid. The paper describes the distinctive mechanism as: “The most distinctive aspect of this rule is the handling of conditional expressions.” (Section 1.1, p. 2).

How to apply it.
1. Initialize the uncovered partition `p′` to true, the partial solution to identity, and sample models M from the path condition (Algorithm 1, p. 11).
2. Enumerate a batch E of typed expressions and count, for each expression, how many models satisfy the specification; choose the highest-ranked expression (Algorithm 1, lines 1–10).
3. Verify that expression on the current partition. If valid, compose it with the partial solution and return (Algorithm 1, lines 9–10).
4. If invalid, obtain a counterexample model and call branch synthesis (Algorithm 1, lines 11–14).
5. Enumerate candidate conditions c; reject any c that does not exclude every accumulated counterexample, then verify `Π ∧ c | r̄`. On success, add the branch and refine `p′ := p′ ∧ ¬c` (Algorithm 2, pp. 11–12).
6. Continue until the partition is covered or the expression collection is exhausted (Algorithms 1–2, pp. 11–12).

Inference: Verus can express each branch guard as ordinary Rust control flow and prove branch-specific postconditions. The abduction loop and ranking remain an external synthesizer; Verus supplies the final proof, including loop invariants and termination.

Evidence. The search uses 50 expressions per batch for Algorithm 1 and 20 for Algorithm 2, doubling the first batch size each iteration (Section 7.3, p. 12). This is a configuration, not a universal performance guarantee. The paper's list, sorted-list, and unary-number benchmarks include synthesis times from 0.3 to 87.7 seconds; the table's “Proved” column counts cases automatically proven, while other synthesized cases were only manually inspected (Figure 3, p. 13).

## interactive anytime synthesis and evaluation

The AND/OR search treats rule applications as AND nodes and problems as OR nodes, assigning branch-size costs and maintaining the best partial derivation (Section 5, pp. 7–9). A user may interrupt and receive a program containing remaining `choose` calls. The paper says, “Because we maintain the search tree and know the current minimal solution at all times, we can stop the synthesis at any time and obtain a partial program that is likely to be good.” (Section 5, p. 9).

The benchmark table contains 19 operations over lists, sorted lists, strict sorted lists, and unary numerals. It marks a problem synthesized when the program is correct after manual inspection; “Proved” marks automatic proof, and verification stops after a three-second timeout (Figure 3 caption, p. 13). Thus the denominator for the proved marks is the 19 listed benchmark rows, while synthesis success includes manually inspected rows. The paper reports no comparison against Verus or Rust.

Inference: the product threat to agent-written verified Rust is moderate. A generator that searches relational specifications could reduce proof-writing for routine data structures, but its external candidate search, depth limits, and dependence on complete specifications leave substantial work for Verus proofs. The paper has already implemented counterexample-guided recursive synthesis, typed enumeration, branch abduction, and interactive partial results; VL should not redo these as if they were new algorithms.

## what is proved, measured, and trusted

The proved claim is conditional: a generated term satisfies the supplied relational specification under Leon's verifier. Measurements are Leon synthesis and proof times on 19 benchmark operations, with a three-second verification timeout (Figure 3, p. 13). Trusted components include Scala execution, the Leon verifier, Z3, the compilation-based evaluator, and the correctness of abstraction functions such as `value`, `content`, and `isSorted` (Sections 2–3, pp. 3–5). Inference: the paper does not provide a formal end-to-end theorem about generated machine code or about specifications matching external requirements.

## techniques for the catalog

- validated relational deduction: decompose relational synthesis problems with one-point, ground, case-split, and recursion rules whose validity composes
- symbolic term exploration: encode typed nondeterministic term generators in SMT and eliminate candidates with verifier counterexamples and concrete execution
- condition-abducting CEGIS: rank typed expressions on examples, abduce branch guards that exclude counterexamples, and grow a correct partition
- anytime AND/OR synthesis: cost-guided search maintains the best partial derivation and can return code with unresolved synthesis holes
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
