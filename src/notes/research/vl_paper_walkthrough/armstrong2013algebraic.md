# Algebraic Principles for Rely-Guarantee Style Concurrency Verification Tools
(authored by agents unless marked 🧑)
Tag: `armstrong2013algebraic`, [paper](http://arxiv.org/abs/1312.1225v1)

## what the paper proves or measures

The paper builds a rely-guarantee verification tool from algebraic models of programs. It derives concurrency inference rules from a small set of axioms, connects those algebras to finite execution traces, and implements the result in Isabelle/HOL. The paper explains the motivation in one sentence: “A main benefit of this method is compositionality: the verification of large concurrent programs can be reduced to the independent verification of individual subprograms.” (Introduction, p. 2) The implementation verifies two examples, including parallel assignments and the FINDP search program; the authors repeatedly emphasize that the model is finite, ignores termination and synchronization, and remains a prototype.

## technique 1: rely-guarantee algebra and derived rules

what it is: represent sequential choice, composition, parallel composition, iteration, meet, and interference in a rely-guarantee algebra. A rely condition constrains what the environment may do to a component; a guarantee condition constrains what the component may do to its environment.

how to do it:
1. start with a trioid/bi-Kleene algebra `(K,I,+,⊓,·,||,⋆,0,1)` and choose a distinguished set `I` of interference elements (Section 4, p. 6)
2. require the four rely axioms: `r||r ≤ r`, `r ≤ r||r'`, `r||(x·y)=(r||x)·(r||y)`, and `r||x⁺ ≤ (r||x)⁺` (Section 4, p. 6)
3. encode a quintuple as `r,g ⊢ {p} x {q}` iff `p·(r||x) ≤ q` and `x ≤ g` (Equation 5, p. 7)
4. apply the derived rules for consequence, sequential composition, parallel composition, choice, and star. The parallel rule requires each component's guarantee to satisfy the other component's rely (Fig. 1, p. 7)
5. if refinement is needed, add residuals and use the paper's encoding `c ≤ r/(p→q) ⊓ g` (Equation 6, p. 7).

Verus form: Inference: model a concurrent protocol as a Verus state machine or state-machine-plus-ghost permissions. Encode rely assumptions as preconditions on environment transitions and guarantees as postconditions of each transition. Use proof lemmas to show that a component preserves the other's invariant. Verus does not provide algebraic `||` or residuals directly, so the algebra must be represented by a ghost relation and explicit composition lemmas.

evidence and limits: Theorem 1 uses Isabelle Nitpick to show axioms (1)–(3) are independent (Section 4, p. 6). The paper describes its scope as: “The complete Isabelle code can be found online.” (Introduction, p. 2) The authors therefore do not establish a general concurrent implementation theorem.

## technique 2: break compositional equality with a healthiness projection

what it is: ordinary algebra makes `x=y` imply `x||z=y||z`, which is too strong for interference-sensitive traces. Add a projection `π:K→K` that filters ill-defined traces and compare programs with `≤π`, defined by `π(x)≤π(y)`.

how to do it:
1. define the quintuple's pre/post relation using `p·(r||c) ≤π q` and `x ≤ g` (Section 5, p. 8)
2. choose a projection satisfying the paper's star, sequential, and induction conditions (7)–(10) (Section 5, p. 8)
3. prove the retracted carrier `π(K)` is a Kleene algebra (Theorem 4, p. 8)
4. use the projection to retain algebraic derivations while excluding inconsistent interleavings.

Verus form: Inference: represent `π` as a ghost predicate over histories and define every transition invariant modulo that predicate. A Verus proof should state the healthiness predicate explicitly and prove that each operation preserves it. This makes the trace filter a specification component rather than an untrusted simplification.

evidence and limits: the projection is validated in the finite language model below; the paper says the general properties are extracted from its trace model rather than measured experimentally (Section 5, p. 8).

## technique 3: finite trace and shuffle semantics

what it is: interpret programs as languages of words over state-pair alphabet `(Σ²)`. Sequential composition is language product; parallel composition is shuffle. A word is consistent when each transition starts at the previous transition's end state. The projection is `π(X)=X∩C`, where `C` is the set of consistent words (Section 6, pp. 9–10).

how to do it:
1. define finite words and language union/product/shuffle
2. lift a state relation `R` to one-step words `⟨R⟩`, then define rely elements as `⟨R⟩⋆` (Section 6, p. 9)
3. use stuttering `⟨Id⟩⋆` and mumbling closure so tests compose despite different trace lengths (Section 7, p. 10)
4. encode conditionals as `test(P);X + test(¬P);Y` and loops as `(test(P);X)⋆;test(¬P)` (Section 7, p. 10)
5. define assignments by collecting all state/value pairs that satisfy the expression and use `preserves(P)` and `unchanged(X)` as rely conditions (Section 7, p. 11).

The paper's assignment rule requires the environment to leave expression variables unchanged, preserve the precondition and postcondition, and permits the command to change only its assigned variable (Section 7, p. 11). The two-assignment example verifies `x := x + 2 || y := z` from `x=2,y=2,z=5` to `x=4,y=5,z=5` by matching each assignment's rely to the other's guarantee (Section 8, pp. 11–12).

Verus form: Inference: represent a trace as a ghost sequence of states and a transition relation. A parallel proof can use a Verus state machine with separate transitions and a shared invariant; each transition's `ensures` clause is its guarantee, while assumptions on environment steps are the rely. Stuttering and mumbling become lemmas over sequence concatenation, not executable code.

evidence and limits: the model's shuffle can create consistent words from previously inconsistent words; restricting directly to consistent traces would lose that operation (Section 6, p. 10). The model is finite in the paper, and the authors note that fairness, synchronization, and nontermination need further work.

## technique 4: compositional proof of FINDP

FINDP runs even- and odd-index searches in parallel and keeps the least found index. The proof states `FINDP ≤π end(leastP(f)) + end(f=len(array))` (Section 8, p. 12). Each subprogram guarantees that it does not modify the other's variables and only decreases its own candidate index. The paper reports: “More work must be done to manage the complexity of such proofs within interactive theorem provers.” (Section 8, p. 13). This is evidence about proof engineering difficulty, not a success rate.

Verus form: Inference: split the proof into two state-machine transitions, prove noninterference for disjoint fields, and establish a decreasing candidate-index invariant. The final minimum result is a lemma over the two component summaries.

## trusted boundary, contradictions, and VL implications

The trusted base includes Isabelle/HOL, the algebra definitions, the trace model, assignment semantics, and the chosen rely/guarantee conditions. The paper proves algebraic soundness for its model and checks examples; it does not prove that the finite model covers all scheduler behavior. Inference: VL can reuse the compositional shape but must state the scheduler and memory model explicitly. A Verus proof of component invariants still depends on the correctness of the state-machine abstraction and any unsafe synchronization wrapper.

What VL should not redo (Inference): derive generic rely-guarantee composition from scratch. The useful product work is a Verus library that packages these obligations around Rust ownership and state machines. Threat to agent-written verified Rust is high for shared-state code: agents can satisfy local contracts while choosing a rely condition that excludes a real interference pattern. The paper's explicit environment assumptions show where review must focus.

## techniques for the catalog

- rely-guarantee algebra — derive sequential, parallel, choice, and iteration rules from four interference axioms
- projection-based trace healthiness — use a `π` projection to break overstrong algebraic compositionality
- shuffle trace semantics — model parallel execution as interleaving languages with consistency and closure operations
- assignment rely conditions — express unchanged and preservation assumptions for shared-memory assignments
- compositional parallel proof — verify each worker against the other's guarantee and combine results
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
