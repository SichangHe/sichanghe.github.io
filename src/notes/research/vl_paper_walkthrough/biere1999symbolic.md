# Symbolic Model Checking without BDDs?
(authored by agents unless marked 🧑)
Tag: `biere1999symbolic`, [paper](https://doi.org/10.1007/b107031130014)

## scope and result

The paper replaces binary decision diagrams (BDDs) in symbolic model checking with propositional decision procedures, especially Davis–Putnam SAT and Stålmarck’s method. Its second contribution is bounded model checking (BMC) for LTL: a finite unrolling plus an optional back loop is translated to one propositional formula. A satisfying assignment is a witness/counterexample; unsatisfiability at a bound rules out witnesses of that bound. The method is complete when bounds are increased far enough, and several structural bounds are given. The implementation, called BMC, emits DIMACS or PROVE input and is measured against SMV on multiplier, barrel-shifter, and DME examples.

The paper states: “In this paper we show how boolean decision procedures, like Stålmarck’s Method [16] or the Davis & Putnam Procedure [7], can replace BDDs.” (abstract, p. 193). It also states: “We introduce a bounded model checking procedure for LTL which reduces model checking to propositional satisfiability.” (abstract, p. 193). These are the two techniques below.

## technique 1: encode a finite-state machine as propositional constraints

What it is. A Kripke structure is represented by Boolean state vectors. `I(s)` denotes initial states, `T(s,t)` transitions, and each atomic proposition is a Boolean formula over a state vector. The paper requires every state to have a successor and uses a finite Boolean state space `S={0,1}^n` (Definition 1, p. 196). Instead of storing a canonical BDD, send these formulas to a Boolean decision procedure.

When to use it. Use this representation when the system has a finite-state Boolean encoding and BDDs are too large or their variable ordering is problematic. The paper's setting is explicit: “In model checking, the specification is expressed in temporal logic and the system is modeled as a finite state machine.” (Introduction, p. 193).

How to apply it.

1. Choose Boolean variables for every state bit (Definition 1, p. 196).
2. Write `I(s)` and `T(s,t)` as propositional formulas, and write each atomic label as a formula over `s` (Definition 1, p. 196).
3. Form the finite-path constraint `[[M]]_k = I(s0) ∧ ⋀(i=0..k−1) T(si,si+1)` (Definition 10, p. 200).
4. Conjoin a temporal-property translation, described in technique 2, and invoke a SAT/Boolean decision procedure.

The three-bit shift-register example gives the concrete shape. Its transition is `(x'[0]=x[1]) ∧ (x'[1]=x[2]) ∧ (x'[2]=1)` (Example, p. 195). For `k=2`, the paper expands `I(x0) ∧ T(x0,x1) ∧ T(x1,x2)` into the six equalities shown on p. 195. Inference: SAT can expose a transition error through a satisfying counterexample assignment.

Verus form (Inference: the paper is not about Rust or Verus). Model a bounded transition system as executable Rust data plus proof specifications. Use a `spec fn` for the mathematical transition and an `ensures` contract on a step function; use `assert`/`proof fn` lemmas to establish the Boolean encoding and path constraints. Keep proof-only functions erased and do not call them at run time. A Verus proof establishes the stated transition contract, not that the contract captures the intended hardware behavior. A direct SAT solver call is outside ordinary Verus source; the SAT formula would be generated or checked by a trusted external tool, so that tool and translation remain trusted unless separately verified.

Evidence. The authors implemented BMC and tested designs “where BDDs are known to behave badly” (Experimental Results, p. 204). In Table 1, the 16×16 sequential multiplier is checked one output bit at a time (16 bits plus overflow). SATO with `-g 50` takes 0–6,847 seconds per bit and 1–31 MB; its total is 22,578 seconds. Official SMV1 reports a partial sum of 71,923 seconds for bits 0–6 and exceeds 17 hours for bit 7 (Table 1, p. 204). These benchmark measurements do not establish a general speed theorem. The table caption defines the units as seconds and megabytes.

Assumptions and failure modes. The model must be finite and Boolean-encodable. The method inherits SAT encoding cost and solver behavior; no guarantee is given that SAT scales on every design. BDD comparison depends on the manually chosen interleaved variable ordering: “Dynamic reordering failed to find a considerably better ordering in a reasonable amount of time” (Experimental Results, p. 205). Inference: the mathematical translation theorem does not validate the chosen model or certify the SAT solver and translation implementation.

## technique 2: bounded LTL model checking with a loop-aware SAT translation

What it is. Universal checking is reduced to existential checking of the negated formula. A prefix `s0,…,sk` is unrolled. A back edge from `sk` to some `sl` turns the prefix into an infinite lasso, which is necessary to witness properties such as `G p`. The paper defines bounded semantics for loop and non-loop paths (Definitions 4–6, pp. 197–198), then translates both cases to propositional formulas (Definitions 11–15, pp. 200–201).

When to use it. Use it to find finite counterexamples quickly, especially when a bug has a short trace or a lasso-shaped witness. It is also useful as a progressively deepening proof procedure: increase `k`; a satisfying formula proves an existential property and supplies a witness, while unsatisfiability at all required bounds proves the universal property (Corollary 17, p. 201).

How to apply it.

1. Put the LTL property in negation normal form and negate a universal claim. The paper explains: “In order to solve the universal model checking problem, we negate the formula and show that the existential model checking problem for the negated formula has no solution” (Semantics, p. 197).
2. Select a bound `k` and create state variables `s0,…,sk`; assert `I(s0)` and each transition between adjacent states (Definition 10, p. 200).
3. Add a loop choice `L_k^l := T(sk,sl)` for each `l≤k`, or assert that no loop exists (Definition 14, p. 201).
4. For a non-loop, translate atoms, Boolean operators, `F`, `X`, `U`, and `R` recursively over positions `i…k`; the paper deliberately translates `G f` as false because the finite prefix says nothing about state `k+1` (Definition 11, p. 200).
5. For a `(k,l)` loop, use the loop successor `succ(k)=l` and translate `G` as a conjunction and `F` as a disjunction over positions `min(i,l),…,k` at current position `i` (Definitions 12–13, p. 201).
6. Disjoin the no-loop branch and the possible loop branches, each with its own loop condition; conjoin this disjunction with the path constraints (Definition 15, p. 201), then call SAT. Theorem 16 states that this formula is satisfiable exactly when the bounded existential model-checking problem holds.
7. If no bound-specific witness is found, increase `k`. Theorem 9 proves equivalence between unbounded existential semantics and existence of some finite bound (p. 199).

The paper's worked shift-register formula illustrates the complete construction. For `G(x≠0)` at `k=2`, it adds `L_i=T(x2,xi)` for `i=0,1,2` and `S_i=(xi[0]=1)∨(xi[1]=1)∨(xi[2]=1)` at every state. It states: “This formula is satisfiable iff there is a counterexample of length 2 for the original formula F(x = 0).” (Example, p. 196). Setting every `xi[j]` to 1 satisfies it and is a counterexample to `F(x=0)`.

Verus form (Inference). Represent the bounded path as a fixed-length `Seq` or array in a specification, with a `spec fn` for `valid_path` and a separate `spec fn` for the LTL fragment being checked. State the transition and property as `requires`/`ensures`; prove loop closure and induction lemmas with `proof fn`. Rust `while` loops need `invariant` clauses for path and formula obligations. Verus does not provide this paper's SAT translation or temporal-logic decision procedure, so the practical Verus adaptation is to verify a generated finite checker and its contracts, or to prove a particular bounded instance. Any external SAT result is an assumption unless its encoding and solver are trusted separately.

Evidence and limits. Theorem 16 is the paper's correctness evidence for the translation; Theorem 9 is its completeness argument over all bounds. The LTL bound in Theorem 25 is `|M| × 2^{|f|}` (p. 203), reflecting the exponential formula tableau. For ECTL, Theorem 18 gives `k≤|M|`; for `EFp`, the tighter diameter bound in Theorem 20 gives `k≤d`. These are mathematical bounds, not measured runtimes. Non-loop bounded semantics intentionally breaks the usual duality of `G/F` and `R/U` (Semantics, p. 198), so treating a non-loop prefix as infinite is unsound.

## technique 3: structural bounds for stopping deepening

The paper gives three ways to replace indefinite `k=0,1,2,…` search.

* ECTL state bound. For an ECTL formula, check through `k≤|M|` (Theorem 18, p. 202).
* Diameter bound. Define diameter `d` as the shortest universal reachability bound; for `EFp`, check only `k≤d` (Definition 19 and Theorem 20, p. 202). The exact diameter can be characterized by the quantified Boolean formula in Theorem 21 (p. 202), although the authors say they do not know an efficient QBF procedure.
* Recurrence diameter. Define recurrence diameter as the least `d` such that every path of length `d+1` revisits a previous state (Definition 22, p. 203). It bounds all ECTL formulas (Theorem 23) and is itself characterized by a propositional formula (Theorem 24, p. 203). It can be looser: a fully connected graph has diameter 1 but recurrence diameter equal to its number of states (p. 203).
* LTL general and lasso bounds. General LTL has `k≤|M|×2^{|f|}` (Theorem 25, p. 203). If every path is lasso-shaped with prefix/loop limits `(u,v)`, use `k≤u+v` (Definition 26 and Theorem 27, p. 203).

Verus form (Inference). Encode a candidate diameter or recurrence invariant as a quantified `spec fn`; prove it with `assert` and lemmas over the finite state representation. A Verus `invariant` can maintain reachability facts in an explicit bounded loop. Quantified formulas and solver termination remain practical limitations; no Verus construct automatically computes these graph bounds.

## implementation evidence and product implications

BMC accepts a subset of SMV and outputs DIMACS or PROVE format (Experimental Results, p. 204). The barrel-shifter experiment proves its recurrence diameter to be `|r|` and reports that this took little time relative to verification (p. 205). For DME liveness, each of `n` cells has 18 logic elements, so the model has `18n` fairness constraints; the authors explicitly say they could not verify liveness completely without a counterexample bound and instead checked `k=5,10` (p. 205). Removing fairness constraints from the buggy design yields a 2-loop counterexample instantly in both tools (p. 205).

Inference: for agent-written verified Rust, the most relevant reusable pattern is contract-driven bounded exploration with an explicit loop witness. It can expose short safety bugs and produce a concrete trace, but it does not establish unbounded liveness without a sound bound or an independent induction argument. A possible competing capability for finite-state control code is that existing SAT/BMC automation can discover many bugs outside a language-model proof workflow, while specification errors, unmodeled environment behavior, fairness assumptions, and trusted solver/translation components remain open. VL should not redo SAT-based BMC or standard diameter/recurrence bounds; it should connect such analyses to Rust/Verus contracts and make assumptions visible.

What is proved or measured. Theorems 9 and 16 establish bounded-semantics and SAT-translation correctness; Theorems 18–27 establish completeness bounds under stated structural hypotheses. Tables 1–4 measure seconds and MB for particular tools, models, and settings. What stays trusted includes the finite-state model, formula translation, SAT/PROVE implementation, and the specification itself. The paper reports no proof that BMC's implementation is correct independent of its mathematical definitions.

## techniques for the catalog

- SAT replacement for BDDs — encode Boolean state, initial, transition, and label formulas and solve symbolic checks with a propositional decision procedure

- Loop-aware bounded LTL-to-SAT — unroll `k+1` states, add each possible back edge, and translate temporal operators by loop/non-loop semantics

- Progressive counterexample search — increase `k`; a satisfying assignment is a witness, and unsatisfiability excludes witnesses at that bound

- Diameter and recurrence bounds — stop ECTL deepening at a proven graph diameter or recurrence diameter

- LTL and lasso bounds — use `|M|×2^{|f|}` generally or `u+v` for lasso-shaped systems

- Fairness-aware bounded liveness — encode fairness constraints and report bounded results explicitly when no complete bound is known
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The size of [[ M, f ]]k is polynomial in the size of f if common subformulas are shared (as in our tool BMC)."): checked the entire extracted paper, quotations, formulas, numerical results, references, tag and source link; corrected abstract/introduction/example and recurrence-diameter pages, SATO time/memory and partial SMV total, loop translation, source DOI, and inference wording; did not independently prove the theorems, run BMC, or validate Verus adaptations.
