# Weakening Goals in Logical Specifications
(authored by agents unless marked 🧑)
Tag: `andrew2025weakening`, [paper](http://arxiv.org/abs/2510.15718v1)

## problem and contribution
The paper addresses verification failure after environmental change or system degradation. Its abstract states: “We present a counterexample-guided technique for iteratively weakening properties, apply it to propositional logic specifications, and discuss planned extensions to state-based representations.” (Abstract, p. 1.) A weakening is defined semantically: “a weakening of a property P is any property that specifies a superset of the behaviours of P.” (Section 1, p. 1.) The returned property must remain between the desired and critical properties under implication (Section 2, p. 3). Inference: its practical usefulness depends on the chosen critical property.

The method uses a specification triple `⟨A, PD, PC⟩`: `A` is the system and environment, `PD` the desired property, and `PC` the minimum acceptable property. The triple is well formed when `PD → PC` (Section 2, p. 2). The paper's algorithm is implemented in OCaml on Why3 with Alt-Ergo, “a tableau-based solver.” (Section 2, p. 2.)

## technique 1: critical-property-bounded weakening
what it is
The critical property limits the permitted weakening. The paper writes: “Not all weakenings of the desired property are useful, as evidenced by the trivial property ⊥ that any system guarantees.” (Section 2, p. 2.) `PC` is the minimum requirement: every returned candidate must satisfy `PI → PC`. Inference: the quoted `⊥` appears to be a notation error; under the implication ordering used here, `⊤` is the property that every system guarantees. The example itself chooses `PC = ⊤` (Section 2, p. 4), so this bound can permit a trivial result.

when to use it
Inference: use this when a failed proof permits relaxation and a minimum acceptable property can be specified. The paper motivates compositional assume-guarantee reasoning: “providing guarantees that feed into the assumptions of other components’ specifications” (Section 1, pp. 1–2). How weakening affects other components and system properties is RQ2, rather than a demonstrated application (Section 1, p. 2; Section 3, p. 4).

how it is done
1. Build `⟨A,PD,PC⟩` and check well-formedness `PD→PC` (Section 2, p. 2).
2. Check `A→PD`; if valid, return `PD` unchanged (Section 2, p. 2).
3. If `A→PC` is false, fail because the critical property does not hold (Section 2, p. 3).
4. Otherwise search for an intermediate `PI` with `PD→PI`, `PI→PC`, and `A→PI` (Section 2, p. 3).

Verus form
Inference: In Verus, encode `PD`, `PC`, and candidate relations as `spec fn` predicates over the program's abstract state. A `proof fn` can establish implication lemmas and an `ensures` clause can require the returned specification to imply `PC`. Verus does not provide the paper's SAT-model enumeration automatically; a Rust-side search would need a finite representation and proof obligations for each candidate.

evidence and limits
The paper states a finite-variable completeness claim: “The algorithm is complete for systems with finite numbers of variables.” (Section 2, p. 4.) It bounds iterations by `2^N`, where `N` is the number of unique variables in `PD` and `PC` combined (Section 2, p. 4). Section 3 proposes state-based extensions (p. 4). Inference: the iteration bound does not establish efficiency for large formulas.

## technique 2: counterexample-guided candidate expansion
what it is
Starting at `PI0=PD`, the algorithm checks a formula `F(i)` containing three implications: `A→PIi`, `PD→PIi`, and `PIi→PC` (Section 2, p. 3). If invalid, the SAT solver returns a model satisfying `A` but not `PIi`; the algorithm projects away hidden variables and turns the visible assignment into a conjunction `Ci`, then sets `PIi+1=PIi∨Ci` (Section 2, p. 3).

when to use it
Inference: use this for finite propositional specifications when admitting the missing behaviors identified by counterexamples is an acceptable relaxation, subject to the critical property.

how it is done
1. Initialize `PI0=PD` (Section 2, p. 3).
2. Construct `F(i)` from the three implications above and ask the SAT solver for validity (Section 2, p. 3).
3. If valid, return `PIi` (Section 2, p. 3).
4. If invalid, obtain a counterexample model satisfying `A` and falsifying `PIi` (Section 2, p. 3).
5. Remove hidden variables that occur in `A` but not in `PD` or `PC` when the goal is to avoid exposing internal state (Section 2, p. 3).
6. Convert the remaining assignment into a conjunction of positive or negative variables, call it `Ci`, and update `PIi+1=PIi∨Ci` (Section 2, p. 3).

The paper's drone example sets `A = R3 ∧ ((R4 ∧ (WH∨WL))→L) ∧ ((R3∧WL)→L)`, `PD = (WH∨WL)→L`, and `PC = ⊤`. Here `R3` and `R4` describe whether three or four rotors work, `WH` and `WL` describe high and low wind, and `L` means the drone can land. It uses `¬L∧WH∧¬WL∧R3∧¬R4` as the solver model, removes hidden `R3` and `R4`, and adds `¬L∧WH∧¬WL`. The resulting candidate simplifies from `((WH∨WL)→L)∨(¬L∧WH∧¬WL)` to `WL→L`, which is valid for the degraded drone (Section 2, p. 4).

Verus form
Inference: a possible Verus implementation could represent visible assignments as ghost values and define a `spec fn` that disjoins their conjunctions, often called cubes. A proof would need to establish `PD→PI`, `PI→PC`, and, on termination, `A→PI`. A projected cube need not imply `A`: hidden variables have been removed. Its connection to `A` is that the solver found a full assignment satisfying `A` with those visible values. Because `PC` contains no hidden variables, each cube must still imply `PC`. This is a proposed proof structure, not an implementation or verification result from the paper.

evidence and limits
The paper gives this termination argument: “As each step adds at least one complete interpretation to the candidate property, the number of iterations is bounded by 2N, where N is the number of unique propositional variables in PD and PC combined.” Here `2N` in the extracted text denotes `2^N` (Section 2, p. 4). The paper does not report iteration counts, solver times, or a benchmark beyond the drone example. Inference: those missing measurements leave scalability and usefulness under realistic specification sizes unknown.

## what is proved, measured, and trusted
The paper claims completeness for finite propositional variables, gives the iteration-bound argument above, and works through one drone instance; it does not yet solve DFA, Büchi-automata, or abstract-state-machine weakening. Those are proposed extensions using automata learning with L* (Section 3, p. 4). Section 2 identifies OCaml, Why3, and Alt-Ergo (p. 2) and describes validity checks using a SAT solver (p. 3), without reporting a separate experimental evaluation. Inference: trusting the implementation's results requires trusting the formula encoding and verification tools, unless their outputs are independently checked. A VL deployment could check the final three implications before accepting a weakened contract.

## implications for VL
Section 2 provides a propositional weakening loop: bound the candidate by `PC`, obtain a counterexample, remove hidden assignments, add the visible behavior, and repeat (pp. 2–3). Inference: VL should treat every weakened contract as a new specification requiring human-approved `PC`; otherwise automated repair can silently make the guarantee vacuous. Inference: weakening changes the promise being proved; checking `PI→PC` protects only the requirement actually expressed by `PC`. The paper supplies no product comparison or basis for assigning a threat rating.

## techniques for the catalog
- critical-property-bounded weakening: constrain an automatically weakened desired property between the original goal and an explicit minimum property
- counterexample-guided expansion: add a projected counterexample cube to the candidate until the system implication becomes valid
- hidden-variable projection: remove internal assignments from a counterexample before integrating it when the public specification should hide implementation state
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Including them would expose the inner logical workings of the system which may sometimes be desirable, but for the purposes of overapproximating the weakened property, we remove all hidden variables from the counterexample."): checked the whole paper, quotations, formulas, iteration bound, page references, technique steps, author, year, and arXiv identifier; corrected page references and the projected-counterexample proof proposal, qualified the completeness and usefulness claims, flagged the paper’s apparent ⊥ notation error, and removed unsupported comparison claims; did not run the implementation, inspect its repository, or validate the proposed Verus encodings. The paper prints arXiv:2510.15718v1; the existing paper link uses that identifier.
