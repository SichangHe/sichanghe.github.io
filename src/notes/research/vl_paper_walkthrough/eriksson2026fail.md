# Why does it fail? Explanation of verification failures
(authored by agents unless marked 🧑)
Tag: `eriksson2026fail`, [paper](http://arxiv.org/abs/2603.21788v1)

## problem and method

The paper explains failed SAT-based verification in the vocabulary of a formal application-domain model. Its abstract states: “Failure to show a proof obligation will produce a counterexample or failure trace with typically many thousands or even millions of boolean variables.” (Abstract, p. 1) The proposed method uses predicate relevance (“interest”) to select the parts most likely to explain the failure and uses predicate dependencies to branch into successive explanations (Abstract, p. 1).

The setting is many-sorted first-order predicate logic over finite universes. A verification condition P,D ⊨ R fails when the SAT instance P ∧ D ∧ ¬R has a satisfying interpretation; that interpretation describes a system situation forbidden by R (Sec. 2, pp. 3–4). The method has two alternating phases: explain a formula in one interpretation, then expand defined explanation literals into a tree of further explanations (Sec. 3, pp. 4–7).

Inference: The direct VL value is a diagnostic algorithm for turning a large Verus counterexample model into a small, domain-level explanation. Verus uses SMT and typed Rust specifications rather than this paper’s finite SAT expansion, so the translation below is an adaptation rather than a claim about the paper.

## technique 1: relevance-guided explanation of a formula

What it is. For each formula under a fixed interpretation, the algorithm chooses “interesting” subformulas. An immediate subformula is interesting if changing its truth value changes the whole formula. If no single subformula has that property, an interest measure intr ranks alternatives; the explanation follows the highest-interest subformula in true conjunctions and the least-interest subformula in false conjunctions (Sec. 3, pp. 4–6). The paper defines atom explanations as the atom when true and its negation when false (Definition 1, p. 5).

Why the false-false rule matters. In a conjunction where both operands are false, changing either operand alone may not change the conjunction. The paper therefore chooses the less-interesting operand so that filtering predicates do not crowd out the property that explains the failure. In Example 1, expanding ∀x.(p(x) → q(x)) over {a,b,c} yields the intended explanation {q(a)} rather than {q(a),q(c)} (Sec. 3, pp. 4–6).

How to do it.

1. Fix the counterexample interpretation and evaluate every subformula in it. (Sec. 3, p. 4)
2. Assign initial interest measures to predicates; the paper permits application-dependent values. (Definition 1, p. 5)
3. For an atom A, return {A} if true and {¬A} if false; for negation, explain the underlying formula. (Definition 1, p. 5)
4. For conjunction P ∧ Q, use the truth pair and intr(P) versus intr(Q) in Table 1. Follow the sole causally decisive operand; use both explanations for equal-interest true-true; choose one by the table for false-false. (Table 1, p. 6)
5. Rewrite implication, disjunction, biconditional, and bounded quantifiers into conjunctions and negated conjunctions using Definition 2. (Definition 2, p. 6)
6. Apply expl bottom-up until the formula’s explanation is a set of literals. (Sec. 3, pp. 5–6)

Inference: In Verus, use this ranking over a failed verification condition’s predicates and model values: prioritize user-level predicates, postconditions, loop invariants, and input assumptions over generated arithmetic plumbing. A Verus diagnostic adapter would need to recover predicate dependencies from the verification condition; the paper does not provide such an adapter.

Evidence. The worked railway example starts from the failed condition ∀s.(proceed(s) → ∃r.(entry(s,r) ∧ safe(r))). After dropping tc1 from green21, the solver finds green21 and right21 true while tc1 is false (Sec. 4, p. 10). The first explanation is {proceed(si21), ¬safe(rt2131), ¬safe(rt2133)} (Sec. 4, p. 10). Following definitions eventually selects occupied(track1), ¬tc1, and the omitted tc1 check as the reason for failure (Secs. 4, pp. 10–11).

Failure and assumptions. The rule is heuristic, not a formal minimal-cause theorem. The author says: “We have not attempted to give a formal characterisation of explanations.” (Sec. 3, p. 7) Inference: VL must present the result as a relevance-ranked explanation, not as proof that every omitted predicate is irrelevant.

## technique 2: dependency-driven explanation trees

What it is. Once the first phase returns explanation literals, the second phase unfolds any literal whose predicate has a definition. Each new formula is explained again, producing branches. The paper states: “In that case we will get a branching structure of explanations – an ‘explanation tree’.” (Sec. 3, p. 7)

How to do it.

1. Create one branch for each literal in the root explanation. (Sec. 3, p. 7)
2. If a literal’s predicate is defined, substitute its definition and run the relevance algorithm on the resulting formula. (Sec. 3, p. 7)
3. Continue recursively, carrying the same interpretation and interest measures. (Sec. 3, pp. 6–7)
4. Stop when no definition remains or when a literal already explained is encountered; the railway example cuts off the second occurrence of green21. (Sec. 4, p. 10)
5. Present the tree so a practitioner can follow domain concepts down to concrete input or state signals. (Sec. 4, pp. 10–11)

Inference: A Verus version can branch from a failed postcondition through helper predicates, spec functions, and invariant conjuncts to concrete fields and inputs. It should detect repeated predicates to avoid loops and retain the source span of each expansion. This requires extracting definitions from Rust specifications, which is outside the paper.

Evidence. In the railway tree, one branch explains that signal 21 shows proceed, then that route rt2131 is unsafe, then that it is occupied, and finally that tc1 is false; another branch explains why rt2133 is not safe through the expected point position (Fig. 2, pp. 10–11). The paper explicitly identifies the missing tc1 dependency in green21 as the failure cause (Sec. 4, p. 11).

Failure and assumptions. The tree can contain redundant branches. The discussion identifies ¬red21 and ¬safe(rt2133) as detours that do not point to the actual cause (Sec. 5, p. 12). The author says that algorithmically selecting the one useful branch requires understanding the system’s purpose (Sec. 5, p. 12). Inference: an LLM-generated explanation must not prune branches silently; it should show the ranking and explain why a branch was retained or cut.

## technique 3: syntactic interest assignment from definitions

What it is. To avoid requiring users to assign every predicate’s relevance manually, the worked example ranks predicates by definition dependency. The descending order is: undefined predicates, defined predicates depending on an undefined predicate, defined predicates depending on other defined predicates, defined predicates with no dependencies, and equality last (Sec. 4, p. 10).

How to do it.

1. Mark predicates without definitions as most interesting; in the railway model these are direct interlocking input signals such as tc1. (Sec. 4, p. 10)
2. Build a dependency graph from each defined predicate to predicates in its definition. (Sec. 4, p. 10)
3. Assign lower interest to definitions whose transitive dependencies are all defined, and lowest interest to structural predicates without dependencies and equality. (Sec. 4, p. 10)
4. Run expl with these values, then expand definitions into the tree. (Secs. 3–4, pp. 5–10)

Inference: In Verus, dependency depth can rank concrete program inputs and user contracts above compiler-generated arithmetic conditions. The ranking should remain configurable because a ghost predicate may be more informative than an input in one product domain.

Evidence. The railway method picks ¬tc1 as the decisive literal because tc1 is a free predicate and therefore highly interesting, while partof is less interesting; the detailed derivation of ¬unoccupied(rt2131) ends at {occupied(track1)} (Sec. 4, pp. 10–11). This is a worked example, not an evaluation over multiple railway layouts.

Failure and assumptions. The ordering assumes undefined predicates correspond to meaningful external signals. Inference: for Verus, an undefined or opaque predicate may instead be an untrusted axiom or an `assume`, so the ranking must expose trust boundaries rather than equate opacity with relevance.

## technique 4: iterative counterexamples for multiple faults

What it is. The false-false conjunction rule can retain only one of two equally interesting explanations. The paper argues that practical verification does not lose completeness because, after identifying one fault, the next verification run adds assumptions excluding that fault situation and obtains a different counterexample (Sec. 5, pp. 12–13).

How to do it.

1. Explain the first counterexample and identify a fault condition. (Sec. 5, pp. 12–13)
2. Add an assumption excluding the already identified situation. (Sec. 5, p. 13)
3. Re-run verification to obtain another counterexample if another fault exists. (Sec. 5, p. 13)
4. Explain the new counterexample; the previously hidden conjunction branch can now become decisive. (Sec. 5, p. 13)

Inference: In Verus, this can be implemented as a diagnostic loop that records a counterexample predicate and asks for a second model under a temporary exclusion. Such exclusions must not be added to the product specification or proof; they are exploration constraints.

Failure and assumptions. The method depends on being able to express an exclusion that removes only the diagnosed situation. Inference: a coarse exclusion can hide real faults, while a symbolic model may not provide a simple finite assignment to exclude.

## extensions and comparison

The paper discusses temporal logic and unbounded quantification as future work. For past-time LTL, it proposes moving through a sequence of interpretations and replacing a since connective with a fresh predicate plus an axiom (Sec. 7, p. 15). Unbounded quantification is harder because the finite-domain algorithm expands a universal quantifier into all instances; infinitely many uniform explanations cannot simply be listed (Sec. 7, pp. 15–16).

The paper compares its definition-directed explanations with provenance. Provenance can provide additional explanations, but it lacks the “sense of direction” supplied by definitions and can select facts irrelevant to the failure (Sec. 6, pp. 13–14). Inference: VL should prefer source-directed expansion through Rust specifications, while retaining provenance-like alternatives when a definition is unavailable.

## what is proved, measured, and trusted

The paper demonstrates an implemented explanation method on a small but realistic railway example and compares it conceptually with provenance and related counterexample methods. It does not report accuracy, runtime, or user-study denominators for the explanation trees. The conclusion says: “The main contribution is combining the use of a domain theory to define high-level concepts with a concept of interest to extract the information most likely to give a useful explanation.” (Sec. 7, p. 15)

Inference: the method’s trusted inputs are the domain definitions, interest assignment, SAT interpretation, and the mapping from low-level variables to domain predicates. A mistaken definition can produce a coherent but wrong explanation. For agent-written verified Rust, this creates a moderate product threat: explanations can misdirect repair even when the underlying Verus counterexample is valid.

Inference: VL should not redo generic recursive formula explanation, definition unfolding, or the distinction between decisive and redundant branches. It should implement a Verus adapter, expose trust and source links, and validate every natural-language explanation against the actual model and verification condition.

## techniques for the catalog

- relevance-guided formula explanation: rank subformulas by truth influence and an interest measure to extract decisive literals
- dependency-driven explanation trees: recursively unfold defined predicates into branching domain-level explanations
- syntactic interest assignment: derive relevance from undefined predicates and definition dependencies
- iterative counterexamples: exclude a diagnosed failure and rerun verification to expose additional faults

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
