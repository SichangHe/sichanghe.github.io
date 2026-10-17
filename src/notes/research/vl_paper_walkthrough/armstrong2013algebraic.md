# Algebraic Principles for Rely-Guarantee Style Concurrency Verification Tools
(authored by agents unless marked 🧑)
Tag: `armstrong2013algebraic`, [paper](http://arxiv.org/abs/1312.1225v1)

## what the paper proves or measures

The paper builds a rely-guarantee verification tool from algebraic models of programs. It derives concurrency inference rules from a small set of axioms, connects those algebras to finite execution traces, and implements the result in Isabelle/HOL. The paper explains the motivation in one sentence: “A main benefit of this method is compositionality: the verification of large concurrent programs can be reduced to the independent verification of individual subprograms.” (Introduction, p. 1) The implementation verifies two examples, a parallel pair of assignments and the FINDP search program (the FINDP proof is only sketched); the authors state that the trace model “is restricted to finite executions and disregards termination and synchronisation” and call the Isabelle implementation “a tool prototype” (Introduction, p. 2).

## technique 1: rely-guarantee algebra and derived rules

what it is: represent sequential choice, composition, parallel composition, iteration, meet, and interference in a rely-guarantee algebra. A rely condition constrains what the environment may do to a component; a guarantee condition constrains what the component may do to its environment.

how to do it:
1. start with a trioid/bi-Kleene algebra `(K,I,+,⊓,·,||,⋆,0,1)` and choose a distinguished set `I` of interference elements (Section 4, p. 6)
2. require the four rely axioms: `r||r ≤ r`, `r ≤ r||r'`, `r||(x·y)=(r||x)·(r||y)`, and `r||x⁺ ≤ (r||x)⁺` (Section 4, p. 6)
3. encode a quintuple as `r,g ⊢ {p} x {q}` iff `p·(r||x) ≤ q` and `x ≤ g` (Equation 5, p. 7)
4. apply the derived rules for skip, weakening (consequence), sequential composition, parallel composition, choice, and star (Theorem 3, Fig. 1, p. 7). The parallel rule has side conditions `g1 ≤ r2` and `g2 ≤ r1`, so each component's guarantee must satisfy the other component's rely (Fig. 1, p. 7). The derivation does not use the interchange law (Section 4, p. 6)
5. if refinement is needed, add residuals and use the equivalent encoding `c ≤ r/(p→q) ⊓ g`, which the paper reads as the weakest program that, placed in parallel with interference from `r` and guaranteeing at most `g`, goes from `p` to `q` (Equation 6, p. 7).

Verus form: Inference: model a concurrent protocol as a Verus state machine or state-machine-plus-ghost permissions. Encode rely assumptions as preconditions on environment transitions and guarantees as postconditions of each transition. Use proof lemmas to show that a component preserves the other's invariant. Verus does not provide algebraic `||` or residuals directly, so the algebra must be represented by a ghost relation and explicit composition lemmas.

evidence and limits: Theorem 1 uses Isabelle Nitpick counterexample models to show axioms (1)–(3) are independent (Section 4, p. 6). Theorem 2 says axiom (3) implies (4) in a quantale where `||` distributes over arbitrary suprema; for first-order Kleene algebras (3) and (4) are independent, but Nitpick cannot show it because it generates only finite counterexamples (Section 4, pp. 6–7). The paper concludes that axioms (1) to (4) are “a minimal set of axioms from which these inference rules can be derived” (Section 4, p. 7). The paper says the Isabelle code is online (Introduction, p. 2) and gives no soundness result for a concrete concurrent implementation. Inference: the paper establishes algebraic derivations and a trace model, not a theorem about running concurrent code.

## technique 2: break compositional equality with a healthiness projection

what it is: ordinary algebra makes `x=y` imply `x||z=y||z`, which is too strong for interference-sensitive traces. Add a projection `π:K→K` that filters ill-defined traces and compare programs with `≤π`, defined by `π(x)≤π(y)`.

how to do it:
1. redefine the quintuple using `p·(r||c) ≤π q` and `x ≤ g`, where `x ≤π y` means `π(x) ≤ π(y)` (Section 5, p. 8; the paper writes `c` where Equation 5 has `x`, apparently a typo)
2. choose a projection satisfying the paper's star, sequential, and induction conditions (7)–(10), plus further properties that the paper says it does not list (Section 5, p. 8)
3. the paper shows `π` is a retraction (`π²=π`) and states that `π(K)` is a Kleene algebra (Theorem 4, p. 8)
4. all Figure 1 rules then derive in the redefined algebra with proofs “the same, mutatis mutandis” (Theorem 5, p. 8). Inference: the projection is what lets the algebraic derivations coexist with interference-sensitive traces.

Verus form: Inference: represent `π` as a ghost predicate over histories and define every transition invariant modulo that predicate. A Verus proof should state the healthiness predicate explicitly and prove that each operation preserves it. This makes the trace filter a specification component rather than an untrusted simplification.

evidence and limits: the paper says the properties of `π` “are extracted from properties of the trace model”, and that in its model `π = λx. x ⊓ c` for a healthiness condition `c` (Section 5, p. 8). Theorem 7 states that the finite language model is a rely-guarantee algebra with `π` (Section 6, p. 9). There is no experimental measurement.

## technique 3: finite trace and shuffle semantics

what it is: interpret programs as languages of words over state-pair alphabet `(Σ²)`. Sequential composition is language product; parallel composition is shuffle. A word is consistent when each transition starts at the previous transition's end state. The projection is `π(X)=X∩C`, where `C` is the set of consistent words (Section 6, p. 9; Theorems 6 and 7).

how to do it:
1. define finite words and language union/product/shuffle
2. lift a state relation `R` to one-step words `⟨R⟩`, then define rely elements as `⟨R⟩⋆` (Section 6, p. 9)
3. use stuttering `⟨Id⟩⋆` and mumbling closure so tests compose despite different trace lengths (Section 7, p. 10)
4. encode conditionals as `test(P);X + test(¬P);Y` and loops as `(test(P);X)⋆;test(¬P)` (Section 7, p. 11)
5. define assignments by collecting all state/value pairs that satisfy the expression and use `preserves(P)` and `unchanged(X)` as rely conditions (Section 7, p. 11).

The paper's assignment rule requires the environment to leave expression variables unchanged, preserve the precondition and postcondition, and permits the command to change only its assigned variable (Section 7, p. 11). The two-assignment example verifies `x := x + 2 || y := z` from `x=2,y=2,z=5` to `x=4,y=5,z=5` under rely `⟨Id⟩⋆` by weakening and strengthening so that each assignment's rely is the other's guarantee (Section 8, p. 12).

Verus form: Inference: represent a trace as a ghost sequence of states and a transition relation. A parallel proof can use a Verus state machine with separate transitions and a shared invariant; each transition's `ensures` clause is its guarantee, while assumptions on environment steps are the rely. Stuttering and mumbling become lemmas over sequence concatenation, not executable code.

evidence and limits: the model's shuffle can create consistent words from previously inconsistent words; restricting directly to consistent traces would lose that operation (Section 6, p. 10). The model is finite in the paper, and the paper says non-termination and synchronisation remain to be explored (Conclusion, p. 13), while noting that its Isabelle formalisation already has lazy-list words and a weakly-fair shuffle for infinite languages (Section 6, p. 9).

## technique 4: compositional proof of FINDP

FINDP runs an even-index search A and an odd-index search B in parallel and sets `f = min(fA, fB)` (Fig. 2, p. 13). The goal is `FINDP ≤π end(leastP(f)) + end(f=len(array))` (Section 8, p. 12). The paper says “we only sketch the correctness proof” (Section 8, p. 12). Each subprogram guarantees that it does not modify the variables used by the other, except its own result variable (`fA` or `fB`), which it guarantees will only decrease (Section 8, p. 13). The paper reports: “More work must be done to manage the complexity of such proofs within interactive theorem provers.” (Section 8, p. 13). This is evidence about proof engineering difficulty, not a success rate.

Verus form: Inference: split the proof into two state-machine transitions, prove noninterference for disjoint fields, and establish a monotonically decreasing result-variable invariant for each worker. The final minimum result is a lemma over the two component summaries.

## techniques for the catalog

- rely-guarantee algebra — derive sequential, parallel, choice, and iteration rules from four interference axioms
- projection-based trace healthiness — use a `π` projection to break overstrong algebraic compositionality
- shuffle trace semantics — model parallel execution as interleaving languages with consistency and closure operations
- assignment rely conditions — express unchanged and preservation assumptions for shared-memory assignments
- compositional parallel proof — verify each worker against the other's guarantee and combine results
