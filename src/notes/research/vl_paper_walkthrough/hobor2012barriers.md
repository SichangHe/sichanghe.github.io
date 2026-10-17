# Barriers in Concurrent Separation Logic: Now With Tool Support!
(authored by agents unless marked 🧑)
Tag: `hobor2012barriers`, [paper](https://doi.org/10.2168/LMCS-8(2:02)2012)

## scope and result

The paper develops a concurrent separation logic for Pthreads-style barriers, proves the logic sound, mechanizes the proofs in Coq, and integrates the rules into HIP/SLEEK. The central problem is simultaneous ownership transfer: a barrier releases several threads together, and each thread can receive a different postcondition. The authors state, “Unlike locks and critical sections, Pthreads barriers enable simultaneous resource redistribution between multiple threads and are inherently stateful, leading to significant complications in the design of the logic and its soundness proof.” (Abstract, p. 1)

The running example has two threads repeatedly reading one array and writing another, with a barrier state machine controlling ownership changes and loop termination. The paper reports that five of PARSEC's thirteen workloads use barriers, “covering the application domains of financial analysis (blackscholes), computer vision (bodytrack), engineering (canneal), animation (fluidanimate), and data mining (streamcluster) [5].” (Introduction, p. 2) This is an occurrence count from the cited PARSEC suite, not a claim about all concurrent workloads.

## technique 1: model a barrier as a stateful ownership-redistribution automaton

What it is. A barrier assertion is `barrier(bn, π, cs)`: barrier identifier `bn`, fractional permission `π`, and current state `cs`. Each transition has a current state, next state, and one pre/post pair per participating thread. The resource equation is that the separating conjunction of all preconditions equals the separating conjunction of all postconditions, except that the barrier state changes from `cs` to `ns`; the preconditions must contain the full barrier share. This makes the barrier a finite automaton whose transitions redistribute read/write permissions while preserving values and unrelated framed resources.

When to use it. Use this representation when multiple threads rendezvous and ownership must be transferred at the rendezvous. It handles pipeline stages, where a later stage may read data that an earlier stage wrote, and it handles a state-dependent final transition.

How to apply it, from §3 (pp. 5–7) and §4 (pp. 8–9).

1. Choose the barrier's participant count and a finite list of states (§4, p. 8).
2. For each state, list mutually exclusive outgoing transitions (§4, p. 8).
3. For each transition, write exactly one precise pre/post pair for every participant (§4, p. 8).
4. Put a positive share of the barrier in the current state in every precondition (§4, p. 9, item 7). The SLEEK checker also requires each postcondition to contain a fraction of the barrier in the next state (§8.5, p. 26).
5. Check that the joined preconditions and joined postconditions contain the full barrier and agree on every other resource (§4, pp. 8–9).
6. In the program, give each thread the appropriate initial share, then call the barrier at every phase boundary (§3, pp. 5–7).

The example starts with full ownership of `x1`, `x2`, `y1`, `y2`, and condition cell `i`; it partitions these resources between two threads. At state 1, the transition to state 2 is enabled only when `i < 30`, while the transition to state 3 is enabled when `i ≥ 30`. The barrier therefore synchronizes both data ownership and loop termination. The paper says, “Note that only the permissions on the memory cells change during a transition; the contents (values) do not.” (Example, p. 7)

Verus form. Inference: model the barrier state as a Verus `struct` or state-machine state, and model each thread's permission/ownership fact in ghost state. Use a Verus state-machine transition with `requires`-style preconditions and `ensures`-style postconditions; use `invariant` declarations for preservation facts. Verus does not carry over the paper's separation-logic assertion syntax or HIP/SLEEK barrier lookup directly, so the ownership transfer must be encoded in ghost tokens and state-machine transitions. Inference: a full barrier share can be represented by a unique ghost token that no two threads can duplicate; fractional read permission needs a project-specific ghost algebra unless the chosen Verus API already supplies one.

Evidence. The authors give a complete two-thread barrier diagram and an executable HIP/SLEEK variant in Appendix A. The Coq development includes `SLB Ex` with 2,700 lines and 48 seconds of compilation for the example barrier (Figure 5, p. 17); this is the proof of the barrier definition's soundness, not the runtime of the program.

Assumptions and failure modes. Every precondition is required to be precise in the soundness development, and transitions from one state must be mutually exclusive. The paper's prototype checks the weaker token condition instead of precision and says the proof is still being updated (§8.5, pp. 26–27). The logic has no barrier-definition inference (§9, p. 29), and static barriers are used in the mechanized development even though the prototype supports a proposed first-class rule.

## technique 2: enforce barrier-definition consistency with dependent data and entailment checks

What it is. `BarDef`, `BarStateDef`, and `BarMoveList` record barrier identity, participant count, state index, transitions, and pre/post formulas (Figure 2, p. 8). Coq dependent types enforce bookkeeping constraints. Semantic constraints enforce (i) store independence of public pre/postconditions, (ii) precise preconditions, (iii) a positive barrier share in each precondition, (iv) conservation of all non-barrier resources, and (v) mutual exclusion between different directions in one state (§4, pp. 8–9).

How to apply it. First reject malformed identifiers, state indices, participant counts, and move-list lengths. Then check each precondition for the barrier assertion and positive share. Join every precondition and every postcondition separately, remove the barrier state component, and require equality of the remaining resources. Finally, for every pair of distinct directions, prove that their preconditions cannot both hold. In the example, `i < 30` and `i ≥ 30` make the two state-1 transitions disjoint (§4, p. 9).

The paper's key requirement is quoted exactly: “the sum of the preconditions must equal the sum of the postconditions, except for the state of the barrier; moreover, the sum of the preconditions must include the full share of the barrier (equation (1.2), repeated here)” (§4, p. 9).

Verus form. Inference: encode each transition as a ghost record and prove a validation predicate over the list of records. Use `requires`/`ensures` on a proof function that checks resource conservation and state change; use `assert` and lemmas for mutual exclusion. A Rust type can enforce list lengths only when the participant count is encoded at the type level; otherwise the verifier must prove the length relation. Inference: dependent-type guarantees from Coq become ordinary Verus proof obligations unless a dedicated typestate encoding is built.

Evidence. SLEEK checks these conditions automatically from textual barrier diagrams. For each transition it checks the participant count, state assertions, token condition, full barrier coverage, residue equality, and pairwise mutual exclusion (§8.5, pp. 26–27). It verified six definitions (five besides the running example) in 2.3 seconds and 279 entailments (Table, p. 27).

## technique 3: use a barrier Hoare rule with thread-modular verification

The judgment is `Γ ⊢ {P} c {Q}`, where `Γ` contains barrier definitions. Standard Hoare rules cover sequencing, branching, loops, assignment, consequence, and framing; separation rules cover load, store, allocation, and free. The barrier rule is `Γ[bn] = bd`, `lookup move(bd, cs, dir, mv) = (P,Q)`, therefore `Γ ⊢ {P} barrier bn {Q}` (Figure 3, p. 10).

How to apply it. Verify each thread independently. At a barrier call, select the unique state direction whose precondition is entailed by that thread's current resources, then apply the corresponding postcondition. The full-share and mutual-exclusion requirements ensure that all threads agree on the transition. If a thread satisfies multiple move preconditions, precision/token accounting means another thread cannot fill the missing slot; under partial correctness, a non-returning barrier establishes any postcondition (§5, pp. 10–11). At the top level, combine independently verified threads with the concurrent safety theorem (§5, p. 11).

Verus form. Inference: write a ghost `proof fn` for each transition and call it at the barrier API boundary; the proof function should consume a state/token fact and return the post-state fact. Use `requires` and `ensures` on the API, and use a state-machine invariant to connect all threads. Do not make a proof function part of executable control flow; Verus erases proof code. Inference: the paper's partial-correctness escape for a stuck barrier should be modeled explicitly as a liveness assumption or omitted when the product requires termination.

Evidence. The paper verifies a modified variant of the example against three specifications: `barrier-paper.ss` (postcondition `True`, meaning the program does not get stuck), `barrier-weak.ss` (a relationship between `x1`, `x2`, and `n`), and `barrier-strong.ss` (the exact value `x1 = 59` after the loop; only this one is listed, in Appendix A, p. 34). Each has 73 lines of code plus specification; HIP times are 2.55 s, 2.91 s, and 3.04 s respectively (§8.7, pp. 27–28). The loop was replaced with recursion and arithmetic expressions were changed to suit Omega, so these timings are for the modified example, not the original source.

## technique 4: separate unerased concurrent semantics, oracle semantics, and erased execution

The unerased sequential semantics carries store, heap, and barrier map and gets stuck on an invalid permission or out-of-bounds access (§6, pp. 11–12). The concurrent state contains a scheduler, allocation pool, thread list, and barrier pool (Figure 4, p. 13). A waiting thread deposits a substate satisfying its selected precondition into a wait pool. When the wait pool is full, `bp transition` joins all slots, redistributes resources by postconditions, and resumes all threads simultaneously (§6, pp. 14–15).

The oracle semantics hides the rest of the concurrent machine in an oracle. Ordinary commands use the sequential relation; a barrier consults the oracle, which runs other threads until control returns. If control never returns, the oracle semantics loops (§6, p. 15). This lets the authors prove sequential Hoare rules first and then connect them to the concurrent machine with oracle soundness. The paper reports, “A direct consequence of oracle soundness is that if each thread is verified with the Hoare rules, and is loaded onto a single concurrent machine, then if the machine does not get stuck and if it halts then all of the postconditions hold.” (Soundness proof outline, p. 16)

Erasure removes permission metadata and turns barrier state into a waiting-count/final-count pair. The authors prove a step-preserving conservative approximation from unerased to erased semantics (§6, p. 16), allowing executable evaluation while retaining a proof model.

Verus form. Inference: represent the unerased model as ghost state and the executable model as ordinary Rust state, then prove an abstraction relation preserved by each operation. Use a state-machine invariant or ghost predicate for scheduler/barrier consistency. Inference: the erased relation is analogous to proving that proof-only ownership state does not affect the compiled Rust behavior, but the exact erasure theorem is outside ordinary Verus contracts and must be stated for the chosen implementation.

Trusted boundary. The development uses Coq's standard axioms plus dependent and propositional extensionality and excluded middle (§7, p. 16). The paper explicitly omits realistic byte-addressable memory, code in the heap, and realistic allocator/scheduler behavior (§6, p. 16). These are model assumptions, not verified properties of POSIX or hardware.

## technique 5: mechanize soundness in Coq and account for proof cost

The authors machine-check the barrier rules, semantics, oracle soundness, and erasure relation. Figure 5 reports 16,598 total lines and 7 minutes 34 seconds on a 2.66 GHz, 8 GB machine. `SLB HRulesSound` has 1,664 lines and takes 1m14s; `SLB ESEquiv` has 3,352 lines and takes 30s; `SLB Ex` has 2,700 lines and takes 48s (Figure 5, p. 17). The loop (While) rule is only proved on paper because it is "known to be painful to mechanize" and was skipped for time (§6, footnote 12, p. 15); the authors estimate a further 2,000-3,000 lines for it (§7, p. 17).

How to use the technique (Inference: this order summarizes §6-§7; the paper does not present it as a procedure). Define the assertion and operational semantics; prove each sequential rule; prove barrier-rule soundness, including resource accounting and the token/precision argument; prove oracle soundness by progress/preservation; then prove erasure conservativity. Keep proof-size and compilation-time measurements by file so later changes can be audited.

Verus form. Inference: split the development into executable API lemmas, state-machine invariants, and abstraction/erasure lemmas. Use `proof fn`, `lemma`, `requires`, `ensures`, `assert`, and `invariant` only in forms supported by the Verus reference used by this project. Inference: Verus's SMT automation may discharge local arithmetic and ownership facts, but the paper's Coq dependent-type bookkeeping and metatheory still require explicit Rust ghost encodings.

## technique 6: automate fractional-share entailment in SLEEK

SLEEK extends its entailment checker with Dockins et al.'s binary-tree share algebra. It translates share constraints into formulas containing joins, equalities, bounds, conjunctions, disjunctions, and existentials. The solver is sound but incomplete: it returns `UNSAT` or variable assignments/bounds that overapproximate all solutions (§8.1, pp. 18–20). The algorithm performs substitution, constant joins/differences, duplicate-variable consistency checks, domain initialization, and iterative forward/backward bound propagation to a fixpoint (§8.1, pp. 19–20).

SLEEK answers three queries: unsatisfiability, unique existential elimination, and implication. Formulas are first put in disjunctive normal form; each disjunct becomes a constraint system. `UNSAT` is accepted only when every system is unsatisfiable; existential elimination is accepted when every system gives the same assignment; implication is accepted only for unsatisfiable antecedents or precise antecedent solutions matching a consequent system (§8.1, pp. 19–20).

Verus form. Inference: implement a ghost share algebra only if the product needs fractional read ownership. Encode shares as ghost values with a partial join predicate and prove solver lemmas as Verus proof functions. Inference: because Verus SMT does not automatically reproduce SLEEK's custom binary-tree decision procedure, use a verified executable checker or a finite share representation with lemmas; never treat an unverified external solver result as a proof.

Evidence and limits. The solver handled all fractional-permission entailments in the paper's example, but the authors call it incomplete (§8.1, p. 19). SLEEK delegates extracted pure fragments to Omega, Redlog, and MONA (§8.1, p. 18), expanding the trusted/tool boundary.

## technique 7: extend entailment to inductive predicates and fractional heap matching

SLEEK supports user-defined inductive predicates that describe data-structure shapes and properties such as list length, tree height, and bag of values (§8.2, p. 20). Its base entailment reduces heap obligations by matching, folding, and unfolding, with restrictions that guarantee termination (§8.3, pp. 22–23). Fractional permissions require three changes: `FXPure` records pointers with shares so unequal pointers are required only when shares overlap; folding/unfolding propagates a node's share through every abstracted node; and matching supports full, left-split, and right-split cases (§8.4, pp. 24–25).

How to apply it. Define an inductive predicate with a shape and pure invariant. During entailment, match aliased nodes, unfold a predicate only when the exposed node can match, and fold only when the definition is entailed. When permissions differ, split the larger share and add a join constraint for the pieces. Prune cases by comparing share inclusion before attempting all three match forms (§8.4, pp. 24–25).

Verus form. Inference: encode the inductive predicate as a recursive `spec fn` or ghost predicate over a mathematical sequence/tree, and prove fold/unfold lemmas. Encode share splitting with ghost values and join lemmas. Inference: Verus's recursive specifications need explicit termination/decreases arguments where SLEEK's entailment engine uses syntactic fold/unfold restrictions.

## what is proved, measured, and trusted

Proved: the stated Hoare rules are sound for the paper's unerased semantics (the While rule only on paper, not in Coq); oracle soundness connects thread-local proofs to the concurrent machine; erasure is conservative; and the example barrier satisfies the stated consistency conditions. Measured: Coq proof size and compilation time (16,598 LOC, 7m34s); SLEEK's six-definition check (279 entailments, 2.3 s); and HIP's three 73-LOC examples (2.55–3.04 s) (Figures 5 and §8.7, pp. 17, 27–28).

Trusted or assumed: Coq's standard axioms and excluded middle; the correctness of Omega, Redlog, and MONA; the SLEEK prototype and its sound-but-incomplete solver; precise/token preconditions; static barrier declarations in the mechanized model; private stores; a simplified allocator and scheduler; and the correspondence between the model and real Pthreads. The authors also say, “We also do not address the tricky problem of barrier definition inference.” (§9, p. 29)

Inference: the strongest product threat is specification and model mismatch. An agent can reproduce a sound proof for a barrier state machine while choosing the wrong states, shares, or termination condition. Inference: the paper's independent-thread workflow and explicit resource-conservation checks are directly useful for agent-written verified Rust, but the missing inference step and incomplete share solver remain high-risk automation gaps. Inference: the 2.55–3.04 s HIP timings are too small and too modified to predict performance on a large Rust codebase.

## what VL should not redo

Inference: the paper already supplies a soundness pattern for stateful rendezvous: explicit barrier automata, full-share accounting, mutually exclusive transitions, thread-modular Hoare rules, unerased/erased semantics, and a machine-checked proof. A new VL component should reuse these ideas rather than invent another informal barrier invariant. It should focus on Rust/Verus encodings, inference of barrier definitions, realistic memory models, and checking that generated specifications match ordinary Rust intent.

## techniques for the catalog

- stateful barrier automaton — encode each rendezvous as mutually exclusive state transitions that conserve all non-barrier resources
- barrier consistency checking — validate participant counts, shares, precision/token conditions, conservation, and transition exclusion
- thread-modular barrier Hoare rule — verify each thread against a selected pre/post move and combine them with a concurrent safety theorem
- unerased/oracle/erased semantics — separate resource-aware execution, proof-friendly oracle execution, and executable erased behavior
- Coq soundness mechanization — machine-check sequential rules, barrier accounting, oracle soundness, and erasure conservativity
- fractional-share decision procedure — solve share joins, bounds, existential elimination, unsatisfiability, and implication with a sound overapproximation
- inductive fractional entailment — combine predicate fold/unfold with full and split permission matching
- automated HIP/SLEEK integration — compile barrier diagrams to entailment obligations and discharge calls through structured specifications
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Oracle soundness says that if each of the threads on a machine are safe with respect to the oracle semantics, then the entire concurrent machine combining the threads together is safe."): read the whole paper text (pp. 1-36 including Appendix A) and checked every quotation, number, Figure 5 and benchmark-table figure, section and page reference, and the technique steps against it; changed the link to the DOI printed in the paper (the arXiv link was from the fetch record), corrected the step-4 postcondition claim (the postcondition-state check is from SLEEK, §8.5), corrected the loop-rule citation (footnote 12, p. 15), corrected the description of the three HIP specifications (only barrier-strong.ss is in Appendix A), reworded the SLEEK predicate list, and marked two own-conclusion passages as Inference; did not check the Verus encodings (marked Inference, not claims of the paper), the Coq files or the HIP/SLEEK tool themselves, or the cited external papers.
