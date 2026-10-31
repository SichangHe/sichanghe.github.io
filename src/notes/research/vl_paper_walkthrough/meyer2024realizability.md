# Realizability in Semantics-Guided Synthesis Done Eagerly
(authored by agents unless marked 🧑)
Tag: `meyer2024realizability`, [paper](http://arxiv.org/abs/2403.05607v1)

## scope and result
The paper introduces two logics for semantics-guided synthesis (SemGuS). Realizability logic reasons about a set of candidate programs at once; realization logic uses that proof as backward guidance to choose one candidate. The abstract states: “We present realizability and realization logic, two program logics that jointly address the problem of finding solutions in semantics-guided synthesis.” (abstract, p. 1). The target is synthesis where a user supplies states, commands, and command semantics, including loops and abstract domains, rather than only SMT expressions (Introduction, pp. 1–4).

The paper's basic object is a sketch. A sketch is a while-language expression containing commands, sequential composition, choice, Kleene star, and non-terminals with productions. A classical Hoare triple `{r} prog {s}` is demonic: every execution from `r` ends in `s`. A realizability triple `⟨R⟩ sketch ⟨S⟩` uses finite selections (sets) of predicates and is valid when every `s` in `S` has some `r` in `R` and some program derived from the sketch that proves `{r} program {s}` (Sections 2.2–3.2, pp. 5–8). This separates compile-time selection of a program from run-time demonic branching.

## technique 1: eager realizability analysis

what it is

Realizability logic keeps alternatives eagerly as sets of predicates. Rule COM checks one command; GATHER unions independently proved alternatives; ANG unfolds a non-terminal production; SEQ composes selections; LOOP requires a singleton invariant precondition; DEM handles run-time choice only with a singleton precondition; CSQ strengthens the precondition selection and weakens the postcondition selection according to versatility; SHARE reuses a previously proved non-terminal subproof (Figure 3, p. 7; Sections 3.2–3.3, pp. 7–9; Figure 5, p. 7).

when to use it

Use it when checking each complete candidate is expensive, as in SemGuS programs whose validity reduces to constraint Horn clauses. The authors explain: “In SemGuS, checking the validity of a candidate program is expensive: Messy-Enum reduces it to a constraint Horn clause (CHC) query, and solving them may turn out as hard as conducting a full verification run.” (Introduction, p. 2). Eager composition is useful when input-output behavior can abstract programs compositionally and assertions can represent sets of states compactly.

how to apply it

1. Define `States`, the command set, and each command's state-to-predicate semantics (Section 2.1, p. 5).
2. Define the sketch grammar and each non-terminal's nonempty productions (Section 3.1, p. 6).
3. Represent candidate postconditions and preconditions as finite selections of predicates; start from a singleton `true` or the task's precondition (Section 3.2, pp. 7–8).
4. For each command, prove a singleton triple using COM; combine alternatives with GATHER.
5. Unfold a non-terminal with ANG and recursively prove its production. Compose sketches with SEQ.
6. For a loop, use LOOP with the same singleton selection as precondition and postcondition; process multiple possible invariants one at a time and gather them (Section 3.2, p. 8).
7. For run-time choice, apply DEM only when the incoming selection is singleton. The paper's counterexample is `assert(x==0) + assert(x==1)`: allowing two incoming predicates would incorrectly let compile-time synthesis react to the run-time branch (Figure 4 and Section 3.2, pp. 7–8).
8. Use CSQ to strengthen the precondition selection and weaken the postcondition selection according to `R ⊑a S` iff every predicate in `S` has a more precise predicate in `R` (Section 3.2, p. 8).
9. Share repeated non-terminal proofs with SHARE, replacing a non-terminal by the proved pair of selections while retaining a pointer to its subproof (Section 3.3, p. 9).

The worked Boolean sketch starts with `M ::= x=0 | x=1` and `N ::= y=0 | y=1`, gathers four combinations before `assert(x=1 ∧ y=1)`, and yields the postcondition selection `{x=1 ∧ y=1, fail}`. Backward realization subsequently removes `fail` and retains the successful combination (Figures 1–2 and surrounding text, pp. 2–4).

Verus form

Inference: For a Verus adaptation, represent the sketch and its finite selections as ghost data, prove the command and composition rules, and connect the chosen program to executable Rust through a refinement proof. This is a proposed adaptation; the paper does not implement or evaluate Verus.

evidence

Theorem 3.1 states soundness and completeness (Section 3.2, p. 8; proof in Appendix A.1, pp. 24–25). The appendix supplies the additional EMPTY rule for an empty postcondition. The evidence is an induction for soundness and reduction to complete classical Hoare logic for completeness. The paper defines selections as finite sets of semantic predicates, without prescribing a general assertion language (Sections 2.2 and 3.2, pp. 6–7).

limits and assumptions

The logic drops the relationship between an individual program and its particular predicates; it therefore yields a proof outline rather than the selected program. The paper says, “all we know is that the program sketch M; N; assert(x = 1 ∧ y = 1) can be completed to a program that passes the assertion, but we do not know the program” (Introduction, p. 3). It fixes sequential composition, choice, and Kleene star; extending SemGuS operators requires user-supplied sound rules (Section 3.3, p. 9). Selection sets can grow, so Cartesian abstraction is used in experiments to keep assertions concise (Introduction, p. 3).

## technique 2: realization logic and backtracking-free elimination

what it is

Realization logic rewrites a valid realizability proof outline backward from the desired postcondition. It removes failing predicates and alternatives, propagates the resulting weaker precondition toward earlier non-terminals, and eventually leaves a concrete derivation. The paper's example first removes `fail`, then propagates `x=1 ∧ y=1` backward, then removes the `y=0` alternative and selects `x=1; y=1` (Introduction, pp. 3–4; Section 4, pp. 9–11).

how to apply it

1. Construct a valid realizability outline for the sketch.
2. At an assertion, delete alternatives whose postcondition is `fail` or cannot imply the target.
3. For a command, use RCOM to choose a sufficient precondition and check its command semantics against the target postcondition. RCSQ drops the unwanted postcondition; RCOM justifies weakening the precondition in the introductory example (Section 4, pp. 10–11). Propagate the new requirement to preceding alternatives with RSEQR.
4. At each non-terminal, delete productions whose postcondition cannot meet the propagated requirement; retain at least one valid production.
5. Repeat backward until all non-terminals are resolved, then read the surviving program derivation.
6. In the implementation, interleave verification-condition construction with these choices. The authors explain: “What is new is that the verification condition checks have to be interleaved with their construction, because they control the choice of the program and thus the future verification conditions.” (Introduction, p. 4).

Inference: A Verus implementation can represent the outline as ghost enums and prove each rewrite preserves a refinement predicate. The selected executable Rust is produced only after the ghost search; a final proof function should establish that the selected code satisfies the original `requires`/`ensures` contract.

evidence and guarantees

The central guarantee is explicit: “The guarantee given by realization logic is that valid proof outlines are rewritten to valid proof outlines.” (Introduction, p. 3; Theorem 4.1, p. 9). Backtracking freedom applies to a valid outline and a selected predicate in its postcondition; rewriting must preserve that target predicate (Theorem 4.4 and discussion, p. 11). It does not promise that arbitrary production deletion or an invalid starting outline will succeed.

The synthesis algorithm `syn` traverses the outline backward. For a sequence it first synthesizes the suffix, then uses the returned precondition as the prefix's target. For a non-terminal it chooses a production supporting the target. For a demonic choice it must use a common singleton precondition for both branches. For a loop it chooses a sufficient invariant predicate and synthesizes a body preserving it. Previously stored singleton subproofs support the choice and loop cases; loop invariants must remain available when outer assertions are weakened (Section 6, pp. 15–16; Figure 10, p. 17).

Theorem 6.1 assumes a valid outline and a target predicate `s ∈ S` with `s ≠ fail`. It guarantees a derived program and a non-failing precondition from `R` satisfying the ordinary Hoare triple, with at most `|po|` SMT solver calls (p. 15). This bounds calls by proof-outline size, not total synthesis time or sketch size.

## technique 3: strongest-postcondition and verification-condition construction

what it is and how to apply it

The authors generalize deductive verification to selections. Start with a sketch annotated with loop invariants and non-terminal selection transformers, or a recursion depth for unwinding non-terminals. Compute missing intermediary selections with strongest postconditions; generate verification conditions whose validity entails realizability; discharge those conditions with an SMT solver (Section 5, pp. 12–14). Realization then checks ordinary predicate comparisons while constructing the selected program (Section 6, pp. 14–17). The factorial example selects multiplication rather than addition to calculate `42!` (Sections 5.2 and 6.1, pp. 14–17).

For a selection comparison, each target predicate needs a more precise source predicate, requiring at most quadratically many SMT queries in selection sizes (Section 5.1, p. 12). The verification conditions check annotation soundness, so supplied annotations are not simply trusted. Complete annotations are required for the completeness guarantee. Checking a non-terminal transformer enumerates derived programs until their strongest posts justify the transformer output; an unsound transformer causes this condition generation to run forever (Theorems 5.1–5.2 and discussion, pp. 12–13).

Inference: A Verus adaptation could encode the generated conditions as proof obligations and prove the selected program against its contract. The paper provides no Verus implementation or evidence about the effort needed for that adaptation.

## techniques for the catalog

- eager realizability selections — track many synthesis alternatives as finite predicate selections and compose them with sound Hoare-style rules
- realization backward elimination — remove failing alternatives from a valid outline and propagate requirements to obtain a candidate without backtracking
- selection strongest postconditions — compute intermediary assertions and verification conditions for sketches, then discharge them with solver queries
- proof-outline sharing — reuse a proved non-terminal suboutline at repeated or recursive occurrences
