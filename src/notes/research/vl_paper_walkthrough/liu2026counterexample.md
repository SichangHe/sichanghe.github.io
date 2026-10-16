# Counterexample Guided Learning in the Large using Reasoning Agents
(authored by agents unless marked 🧑)
Tag: `liu2026counterexample`, [paper](https://doi.org/10.1016/0890-5401(87)

## what is proved or measured

The paper studies regular-expression induction by a language model (LLM) that receives verifier-generated counterexamples. The target is a regular language L⋆ and the learner proposes a regex r̂. A teacher checks equivalence and returns strings in the symmetric difference. The paper's central claim is empirical: structured counterexample feedback, especially clustered counterexamples, improves success and sample efficiency; reflection and repair improve the use of that feedback at additional token cost. The formal learning setup is in Section 3 (pp. 3–4), and the workflow is in Section 4 (pp. 4–6).

The paper states: "We construct the teacher by sampling from the symmetric difference L(r̂)△L⋆." (Section 3, p. 4). Equivalence is decidable for the regular languages used, through finite automata and the pyformlang library (Section 3, p. 4; Appendix D, p. 15). The experiments use Simple Regex (alphabet {a,b,c}, concatenation, union, Kleene star, epsilon) and Extended Regex (character classes, +, ?, counted repetition, intersection, negation) (Section 5, p. 6; Appendix D, pp. 14–15).

## technique: oracle-guided counterexample refinement

what it is and when to use it

Use an equivalence oracle when examples alone underdetermine a symbolic hypothesis. The oracle checks the whole candidate language and supplies labeled witnesses that expose over-acceptance or under-acceptance. This is applicable whenever a checker can decide the candidate property and return concrete violating inputs; the paper explicitly notes that the teacher can instead check test cases, constraints, or other known properties (Section 3, p. 4).

how to do it

1. Define the instance domain X and target language L⋆ (Section 3, p. 3).
2. Give the learner an initial finite set D₀ of labeled strings and ask for a candidate regex r̂ (Section 4, p. 4; Algorithm 1, Appendix B, p. 23).
3. Check whether L(r̂)=L⋆. If equal, stop; otherwise compute witnesses C ⊆ L(r̂)△L⋆ and label each witness by the target (Section 3, p. 4; Appendix A, p. 14).
4. Add the witnesses to the aggregate training set C and ask for a revised candidate. Repeat for a fixed epoch bound (Section 4, p. 5; Algorithm 1, pp. 23–24).

The paper's own description is: "The learning proceeds in several rounds. In each round, the learner proposes a candidate regular expression. The teacher analyzes it, and determines if it is equivalent to the target language." (Section 4, p. 5). In the concrete regex implementation, construct minimal DFAs for r̂ and r⋆, build their difference automata, and sample positive strings from A⋆\\A and negative strings from A\\A⋆ (Section 4, p. 5).

Verus form (inference)

Inference: In Verus, represent the candidate checker as a `spec fn` over a finite string model and state a postcondition that every returned counterexample is a disagreement. A verified loop can maintain an accumulated sequence/set of examples with `invariant` clauses and use `ensures` on proof functions to establish that each accepted candidate satisfies the checked property. The LLM-generated regex remains untrusted input; parsing and evaluation must be executable Rust, while the proof layer verifies the checker and the refinement-state invariants. Verus has no direct equivalence-oracle primitive, so the automata equivalence algorithm and its finite-domain assumptions must be implemented or abstracted with an explicitly trusted boundary.

evidence, limits, and assumptions

Table 1 (p. 7) aggregates 21 regexes and three runs per regex (63 runs per cell). On Simple Regex at StarDepth 4, Standard succeeds in 3.2%, Single in 23.8%, and Agentic in 38.1%; on Extended Regex at StarDepth 2, the corresponding values are 38.9%, 68.5%, and 74.1%. The denominator and aggregation are stated in the table caption. Appendix D (p. 15) says counterexample settings start with at most eight labeled examples, run at most 12 epochs, add at most 250 counterexamples per round, and use a repair budget of three. The method assumes the checker can construct informative witnesses; it does not establish that arbitrary program properties have decidable or cheap equivalence checks. It also evaluates regexes of bounded length (training strings have maximum length 32), so generalization beyond that regime is not measured (Appendix D, p. 15).

## technique: clustered counterexamples

what it is and when to use it

Use clustering when the difference automaton has many paths or loops and literal witnesses would be redundant. Clustering groups symbols that produce the same transition, yielding a symbolic witness that represents many concrete strings. This is intended to expose a region of disagreement compactly while keeping feedback bounded (Section 4, p. 5).

how to do it

1. Minimize the difference DFA (Section 4, p. 5).
2. At each state q, group outgoing symbols by destination q′ using Γ(q,q′)={a∈Σ:δ(q,a)=q′} (Section 4, p. 5).
3. Replace each group with a super-character, such as `[A-Za-z]`; use a negated class when convenient (Section 4, p. 5).
4. Enumerate loop-free accepting paths, applying a finite frontier and expansion budget (Section 4, p. 5).
5. Present the path as a universally interpreted clustered example: every concrete string represented by it must receive the indicated label (Section 4, p. 5).

The paper gives the concrete shape: "For example, S[0-9]#run represents strings such as S2#run and S8#run." (Section 4, p. 5). A learner therefore must treat a cluster as a universal constraint, rather than as one randomly selected string.

Verus form (inference)

Inference: Model a cluster as a finite path of character predicates and define a `spec fn` saying that all strings matching those predicates have the expected label. Prove the cluster predicate implies the concrete checker result with `requires`/`ensures`; use `seq`, `set`, and loop `invariant` clauses for bounded path enumeration. Character-class parsing and conversion to executable predicates need ordinary Rust code plus proofs of correspondence. The paper's universal interpretation is stronger than checking one witness, so a Verus proof must quantify over every represented character choice or use a finite alphabet lemma.

evidence, limits, and assumptions

Table 3 (p. 9) compares one run per regex over 21 regexes per StarDepth column. With the full agentic workflow and regularization, clustered versus non-clustered success is 100.0% versus 90.5% (Simple SD=1), 85.7% versus 47.6% (Simple SD=2), 76.2% versus 52.4% (Simple SD=3), and 77.8% versus 61.1% (Extended SD=2). The table's denominator is 21 runs per column. Clusters can still grow large; the finite frontier and expansion budget are engineering bounds, and universal interpretation can make a cluster harder for the model to satisfy. The paper does not prove that its sampling is complete for all disagreement paths.

## technique: reflection over previous reasoning

what it is and when to use it

Reflection supplies the model's previous regex and reasoning trace together with newly generated counterexamples, then asks it to identify the conceptual error and revise the hypothesis. Use it when a model can articulate why a prior symbolic hypothesis failed and when iterative context is affordable (Section 4, p. 5).

how to do it

1. Request both a regex and a short reasoning trace from the learner (Section 4, p. 5).
2. After teacher feedback, construct a reflection prompt containing the prior hypothesis, its trace, and the new counterexamples (Section 4, p. 5; Algorithm 1, p. 23).
3. Ask for the failure explanation and a revised regex; merge the new counterexamples into the aggregate set (Algorithm 1, p. 23).

The paper says: "We then provide this reasoning trace back to the model along with counterexamples generated by the teacher." (Section 4, p. 5).

Verus form (inference)

Inference: Reflection is a generation policy, not a proof rule. In Verus, keep only a verified record of the candidate, checker diagnostics, and accumulated examples; treat the textual reasoning trace as untrusted metadata. Prove that the next candidate is checked against all stored examples before it is accepted. Do not rely on the trace to establish a postcondition.

evidence, limits, and assumptions

Table 4 (p. 9) gives the Simple Regex component ablation, 21 runs per StarDepth column. Removing reflection yields 95.2%, 76.2%, and 76.2% at SD=1,2,3, while the full Agentic setting yields 100.0%, 85.7%, and 76.2%. The authors report that reflection contributes, but less than repair loops. Reflection consumes context and tokens and may preserve an incorrect explanation; no independent correctness guarantee is attached to the reasoning trace.

## technique: syntax-and-satisfaction repair loop

what it is and when to use it

Use a repair loop when candidate generations are syntactically invalid or fail to fit already known examples, yet contain useful partial structure. The loop repeatedly queries the model with compiler diagnostics and misclassified examples, selecting the highest-scoring candidate if no exact solution is found (Section 4, pp. 5–6; Algorithm 2, Appendix B, p. 24).

how to do it

1. Query the model for a regex and reasoning trace (Algorithm 2, p. 24).
2. Compile the regex and record the syntax-error message (Section 4, p. 6).
3. Check equivalence with the teacher and collect all misclassified examples in C (Algorithm 2, p. 24).
4. Return immediately if equivalent; otherwise compute `RepairScore = 1/2 Compiles(m) + 1/2(1−|e|/|C|)` and retain the best candidate (Section 4, p. 6).
5. Build the next prompt from the prior candidate, trace, compiler message, and errors; retry up to the repair budget (Section 4, p. 6; Algorithm 2, p. 24).

The paper requires two conditions: "Syntax Check: the expression must be syntactically valid;" and "Satisfaction Check: the regex must correctly label all counterexamples seen so far (C)." (Section 4, p. 6). Appendix D fixes the repair budget at three retries.

Verus form (inference)

Inference: Implement parsing as executable Rust returning `Result`, and prove a `spec fn` evaluator's agreement with the parser's semantic representation. Encode the score as an integer/rational specification and prove loop invariants that the retained candidate has maximal score among tried candidates. Use `requires` for a nonempty C when dividing by its size, or define the empty-set score explicitly. The proof should establish checker soundness, not trust a proof function called at runtime.

evidence, limits, and assumptions

Table 4 shows the effect on Simple Regex: the No Repair-loop variant reaches 85.7%, 66.7%, and 66.7% at SD=1,2,3; Agentic with repair reaches 100.0%, 85.7%, and 76.2% (21 runs per column). The paper reports repair as the larger contributor. The score can select a compilable but semantically poor candidate when C is small; equivalence remains the stopping condition. Additional retries raise token cost. A multi-candidate repair variant (Section 5.6, p. 10) reached only 81.0%, 61.9%, and 61.9% versus Single's 85.7%, 71.4%, and 61.9% at SD=1,2,3, showing that generating more candidates alone did not help.

## technique: prompt-level regularization

what it is and when to use it

Use regularization when few examples permit overly specific regexes. The learner is instructed to prefer short, general expressions; inference additionally bounds expression length, operator nesting, and alphabet symbols (Section 4, p. 6; Appendix F, p. 18).

how to do it

1. Add a prompt constraint favoring concise, general expressions (Appendix F, p. 18).
2. Reject or discourage expressions beyond the length and nesting limits and outside the task alphabet (Section 4, p. 6).
3. Continue checking every candidate against all examples and the teacher; regularization never replaces verification (Sections 4–5).

Verus form (inference)

Inference: Represent length and nesting as recursive measures in `spec fn`s and prove generated syntax satisfies bounds before evaluation. These bounds constrain search; they do not prove language equivalence. Keep them as explicit preconditions for synthesis and as postconditions for accepted syntax.

evidence, limits, and assumptions

The authors observe in Section 5.6 (p. 10) that removing regularization can leave final success similar because later counterexamples reduce overfitting. Table 4's No Reg row is 100.0%, 85.7%, 71.4% at SD=1,2,3, compared with Agentic's 100.0%, 85.7%, 76.2% (21 runs per column). Thus regularization mainly affects early trajectories, not a proof of correctness. Fixed bounds may exclude a correct target expression, and the paper does not optimize those bounds formally.

## what remains trusted and product threat (inference)

The measured success is run-level exact recovery of target regexes, not verified Rust programs. The checker, regex parser/library, target generator, sampling procedure, model API, and evaluation scripts are trusted to produce the reported labels. Appendix D reports three trials per regex for the main results, one trial for RQ3–RQ5, 65,536 context tokens, 32,768 output tokens, temperature 0, and pyformlang; these setup choices constrain reproducibility and cost (Appendix D, p. 15). The paper's numbers are internally tied to their stated denominators; no formal proof of the LLM's reasoning is claimed.

Inference: For VeruLaw, the strongest reusable pattern is a closed loop in which an executable verifier emits compact, typed counterexamples and Verus proves the verifier and state-update invariants. The threat from agent-written verified Rust is moderate: counterexamples can expose specification or implementation mismatches, but this paper does not address Rust ownership, unsafe code, solver soundness, or specification adequacy. A product should therefore gate generated code on independently verified specifications and machine-checked postconditions; reflection text and model confidence are evidence for search, not trust anchors.

## what VL should not redo

The paper already supplies a complete regex benchmark, clustered-difference construction, reflection/repair architecture, prompt templates, ablations, and cost-versus-success comparisons. Repeating those experiments for regexes would add little. The open transfer question is whether the same verifier-feedback loop works for Rust/Verus specifications with sound counterexamples and meaningful proof obligations; that requires new benchmarks and trusted-kernel accounting.

## techniques for the catalog

- oracle-guided refinement — iterate candidate generation, equivalence checking, and symmetric-difference counterexamples until the candidate is correct or the epoch bound is reached

- clustered counterexamples — group equivalent DFA transitions into universally interpreted symbolic character-class paths to compress disagreement feedback

- reflection — feed the previous hypothesis, reasoning trace, and new counterexamples back to the model to explain and revise conceptual errors

- syntax-and-satisfaction repair — compile, check examples, score, and retry candidates with compiler and misclassification feedback

- prompt regularization — constrain expression length, operator nesting, and alphabet to discourage early overfitting while preserving verifier checks
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
