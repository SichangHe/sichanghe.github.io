# DistAI: Data-Driven Automated Invariant Learning for Distributed Protocols
(authored by agents unless marked 🧑)
Tag: `yao2021distai`, [paper](https://www.usenix.org/conference/osdi21/presentation/yao)

## scope and claim
DistAI learns inductive invariants for IVy distributed-protocol specifications. The target is a safety property: an invariant that holds in every reachable state. The paper's abstract says, “DistAI generates data by simulating the distributed protocol at different instance sizes and recording states as samples.” It then enumerates candidate formulas consistent with those samples and asks IVy/Z3 whether the candidates plus the requested safety property are inductive. The guarantee is conditional: “We prove that DistAI is guaranteed to find the ∃-free inductive invariant that proves the desired safety properties in finite time, if one exists.”

## technique 1: two-stage data sampling

what it is and when to use it

The input is an IVy protocol with typed domains, relations, initial states, actions, preconditions, and postconditions. DistAI first simulates finite instances, then projects each concrete state onto assignments of the quantified variables in a candidate invariant template. This is useful when the protocol is nondeterministic and the invariant must hold for arbitrary numbers of nodes, packets, or epochs. The paper explicitly warns that simulation need not be complete because IVy later checks candidates.

how to apply it

1. Translate the IVy specification to Python: relations become multidimensional arrays and actions become Python functions (Section 3, p. 409). The translation is a performance component, not trusted proof code: “The translation is not in the trusted computing base since learned invariants are eventually validated by IVy.”
2. Choose a finite instance size for every domain uniformly from the interval beginning at that domain's minimum useful size. The minimum for each domain is the maximum number of arguments of that type in any relation. The default width is four, so the four possible sizes are the minimum through minimum plus three: “DistAI uses w = 4 by default.”
3. From each valid initial state, run the stochastic simulation. Initialize the recorded set with the initial state. At each of at most `MA` actions, randomly choose an action and try randomly selected argument tuples until one satisfies its precondition. Remove unsuccessful tuples; if none remain, try another action. Stop if no action can run; otherwise execute it and record the resulting state. Algorithm 1 gives the concrete loop: “action := select_random(action_pool)” followed by argument selection, `precondition_holds`, execution, and insertion into `S`.
4. For a template such as `∀N1 N2`, map quantified variables to concrete nodes and extract only the corresponding relation values. With five nodes, the paper gives 20 assignments for two distinct variables (Section 3, p. 410). For every simulation state, randomly retain `SD` valid subsamples; deduplicate them. The defaults are `MI=1000`, `MIS=20`, `MA=50`, and `SD=3` (Section 3, p. 409).
5. Stop after `MI` instances or after `MIS` consecutive instances produce no new subsample. If a protocol calls another protocol as a black box, choose a state satisfying its postcondition as the simulated result; the later IVy check remains the correctness check.

The paper's Ricart–Agrawala example uses relations `requested`, `replied`, and `holds`. A five-node state is projected to two-node subsamples, producing boolean vectors for candidate formulas. The authors state that larger `MA` or `SD` costs more per round but can reduce the number of rounds, and that sampling parameters affect speed rather than whether a proof is eventually found.

Verus form (inference)

Inference: represent the protocol state as a Verus `struct` or state-machine state, and write a pure/spec projection function that selects the fields for a tuple of quantified node values. An executable Rust simulator can produce candidate tuples, but it should remain outside the proof's trusted argument. The Verus proof still needs a transition invariant and `ensures` clauses for each transition; sampled states do not replace universal quantification. For a concurrent protocol, use a Verus transition-system/state-machine encoding rather than an invented runtime `invariant(...)` call.

evidence and limits

Section 3 gives the sampling defaults; Table 2 reports runtime. Sampling can miss corner cases: “Our simple stochastic sampling procedure, while very efficient, may not achieve high coverage and can leave corner cases uncovered.” Sparse argument spaces make sampling expensive; the learning-switch experiment generated 33,000 subsamples. The authors state: “However, the correctness of learned invariants is guarded by the Z3 SMT solver used by IVy.” (Section 3, p. 410.) Inference: applying the result to a real system also requires a faithful protocol model.

## technique 2: strongest-candidate enumeration

what it is and when to use it

DistAI enumerates formulas in finite formula space, starting with the smallest quantified templates and literals. For each template it keeps only the strongest formulas true on all subsamples. A formula `I` is stronger than `I'` when `I` implies `I'`; therefore weaker formulas already covered by a stronger one are skipped. The paper gives the example that after finding `∀X.p(X)`, it does not enumerate `∀X.p(X)∨q(X)`.

how to apply it

1. Set a maximum number of quantified variables and literals and restrict the prefix to universal quantifiers (Section 4, pp. 411–413).
2. Decompose a template into subtemplates traversed from fewer variables to more, with every predecessor before its successors. For `∀N1 N2`, use the equal case `∀N1` and the unequal case `∀N1 ≠ N2`. For a totally ordered domain, use ordered distinct variables, such as `∀N1 < N2`, to avoid symmetric cases and move order constraints out of the formula body.
3. Project the subsample table onto each subtemplate. Build the literal pool `Pτ` containing all predicates expressible under the subtemplate and their negations, regardless of whether their values were true in a sample.
4. For literal counts `1..l`, enumerate combinations in increasing size. Treat each combination as a disjunction. Discard tautologies containing both a predicate and its negation. Keep a combination only if it holds on the projected table and no subset of its literals is already retained. Emit equivalent candidates by permuting same-type variables without rechecking the samples. Algorithm 2's checks are `check_subset_exists` and `check_inv_holds`.
5. Project each retained invariant to successor subtemplates to avoid redundant checks there. Union the subtemplate invariant sets, omitting projected formulas implied by their originals. Enumeration is therefore data filtered, but the filtered formulas are still sent to IVy.

Verus form (inference)

Inference: a Verus analogue would generate a finite set of candidate `spec fn` predicates over state and node values, then prove each selected conjunction with `requires`/`ensures` and transition lemmas. Candidate generation can be an external Rust/Python tool; proof functions must be compile-time proof code and cannot be called as runtime functions. Universal node quantification must be represented in the specification logic supported by Verus, often through quantified assertions and trigger-aware lemmas; the Ivy syntax itself does not carry over.

evidence and limits

The optimization reduces SMT queries, but enumeration remains exponential in maximum literal count. The paper's claim is specifically for universal (`∀`) invariants; existential quantifiers are unsupported. Theorem 1 states: “For any invariant set I under template τ with a maximum number of literals of no more than l, if I is satisfied by every subsample, then I ∗ ⇒ I.” (Section 4, p. 413.) This is strength relative to sampled data and a fixed formula bound, not a proof of protocol validity; IVy checks inductiveness.

## technique 3: monotonic weakening and convergence

what it is and when to use it

IVy checks the conjunction of candidates and the desired safety property. If a candidate fails, DistAI weakens it by adding literals (a disjunction with more cases), preserving the strength of the candidate set relative to any correct invariant set expressible within the current bounds. The paper describes this as “a novel monotonic invariant refinement approach.”

how to apply it

1. Send all strongest candidates plus the safety property to IVy.
2. If IVy reports a failed candidate, Algorithm 3 (Minimum Weakening) removes it from its current set. If it has fewer than `l` literals, add each one-literal disjunctive extension unless a retained subset already implies it. Also project the removed invariant to each successor subtemplate and add those projections; these may have been skipped earlier because the removed invariant implied them (Section 5, pp. 413–414).
3. Re-submit the weakened set. Repeat until IVy proves the conjunction or the safety property itself fails. The implementation first tries removal alone, then removal plus literal extensions, and finally all three steps if earlier attempts fail. It does not currently use counterexamples: IVy would return only the first failure with a counterexample, forcing extra solver calls instead of weakening all reported failed candidates between calls (Section 5, pp. 414–415).
4. If the safety property fails at the current formula size, increase either the number of quantified variables or maximum literals, then repeat sampling, enumeration, and refinement. The default alternation increases literals first, then variables by domain.

The Ricart–Agrawala example first rejects `∀N1 ≠ N2 . replied(N1,N2)` (Equation 4), then adds weakened formulas including `replied(N1,N2) ∨ replied(N2,N1)` (Equation 5) and `replied(N1,N2) ∨ ¬holds(N1)` (Equation 6), under the same distinct-node prefix. Equation 5 later fails at the literal bound and is discarded; Equation 6 survives. The paper says: “Equation (6) is never invalidated by IVy and will be part of the inductive invariant in the end.” (Section 2, pp. 408–409.)

Verus form (inference)

Inference: encode each refinement candidate as a separate Verus predicate or lemma, and prove the final conjunction against every transition. Verus does not provide an Ivy-style automatic candidate-weaken operation; a generator can emit new source, while the proof uses `assert`, `assume` only for explicitly trusted external facts, quantified lemmas, and transition-system invariants. Do not mark the implementation `external_body` when the implementation is the object being verified.

evidence and limits

Theorem 3 states: “If the safety property of a protocol is provable with a ∃-free invariant set, then DistAI will terminate with one such invariant set in finite time.” This does not cover a false safety property or a property requiring existential quantifiers; in those cases the loop may continue until timeout or memory exhaustion. Paxos is the concrete failure: DistAI times out because its required invariants include existential quantifiers. Inference: trusting the result requires trusting the formal checking path; relating it to a deployed system also requires a faithful IVy specification.

## evaluation, trust, and product implications

The evaluation uses 14 distributed protocols (Table 1, p. 416), with one-week (168-hour) limits for each tool and protocol. DistAI solves 13; I4 solves 9; FOL-IC3 solves 3 with its default setting and 9 with its universal-only option. DistAI runtimes in Table 1 range from 0.8 seconds (lock server) to 58.8 seconds (database chain replication); Paxos is unsolved. Table 2 decomposes DistAI's times into sampling, enumeration, refinement, and total seconds. The abstract's “successfully verifies 13 common distributed protocols automatically” therefore means 13 of the 14 listed benchmarks under their IVy models and settings, not 13 deployed implementations.

What is proved is inductiveness of the learned formulas relative to IVy transitions and the stated safety property. The Python simulator and IVy-to-Python translation are outside the trusted computing base, and sampling need not be complete. The paper explicitly says: “DistAI does not require sampling to be extensive or complete as the candidate invariants are checked by IVy.” (Section 1, p. 406.) Inference: the IVy implementation, Z3, and fidelity of the protocol specification remain trust or modeling assumptions. Black-box subprotocol behavior is sampled from postconditions and is not an executable implementation proof. For blockchain, the checked variant is that an honest leader at epoch `T` causes all transactions before `T` to be confirmed at `T`. The footnote states: “The original liveness property cannot be encoded as a safety property, thus falling out of the scope of DistAI, I4, and FOL-IC3.” (Section 6, p. 416.)

## techniques for the catalog

- two-stage sampling — simulate finite IVy instances, project states to quantified-variable subsamples, and use the data to prune candidate invariants
- strongest-candidate enumeration — enumerate small universal formulas and retain only strongest formulas that hold for all subsamples
- monotonic weakening — add literals to failed candidates, recheck with IVy, and increase formula size when the safety property itself fails
- finite convergence condition — termination is guaranteed only when the safety property has a finite ∃-free inductive invariant representation
