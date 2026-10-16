# Counterexample-Guided Prophecy for Model Checking Modulo the Theory of Arrays
(authored by agents unless marked 🧑)
Tag: `mann2022counterexample`, [paper](https://doi.org/10.6084/m9.figshare.13619096)

## goal and trust boundary

The paper turns some quantified array invariants into quantifier-free invariants by adding history and frozen prophecy variables during CEGAR refinement. Its abstract states: “We develop a framework for model checking infinite-state systems by automatically augmenting them with auxiliary variables, enabling quantifier-free induction proofs for systems that would otherwise require quantified invariants.” (abstract, p. 1). The implementation, prophic3, uses ic3ia, MathSAT, and a custom array-axiom checker. The model checker and SMT solver remain trusted for returned proofs; the paper proves that auxiliary-variable introduction and array refinement preserve invariance.

Inference: a Verus analogue could add ghost snapshots or predicted indices to proofs of array or map invariants, but Verus proofs are source-level contracts rather than an automatic transition-system transformation. Ghost state affects verification only if its update and framing lemmas are proved.

## technique 1: universal prophecy with finite delay

what it is and when to use it. A frozen variable can stand in for a universally quantified value of a term at a chosen time. Use it when a property fails to be inductive only because the induction hypothesis leaves an array index unconstrained.

steps from Algorithm 2. Given STS `S=<X,I,T>`, property `P(X)`, target term `t`, and delay `n`: (1) if `n>0`, apply `Delay` to add history variables `h1t,...,hnt` that pass the value of `t` forward; (2) add a fresh prophecy variable `pt`; (3) constrain it to be frozen with `p′t = pt`; (4) replace the property with `pt = t` implying `P(X)` (or `pt = hnt` implying `P(X)` after delay). The algorithm is printed as: “if n = 0 then return hhX ] {pt }, I, T ∧ p0t = pt i, pt = t =⇒ P (X)” (Algorithm 2, p. 6). History variables preserve a past value; the prophecy variable chooses a future value while remaining behaviorally auxiliary.

The running example reads an array one step before assigning `dr`. Prophecize targets `ir` with delay 1, yielding the quantifier-free invariant `read(a,p_ir)<200`; this replaces the quantified invariant `∀i. read(a,i)<200` (Section 3, p. 6). The paper explains: “The invariant learned over the prophecy variable has the same form as the original quantified invariant. However, we have instantiated that universal quantifier with a fresh, frozen prophecy variable.” (Section 3, p. 6).

Verus form. Inference: introduce a ghost index `p` and a ghost history value in a proof function, constrain `p` to remain unchanged, and prove the array property at `p`. Verus has no transition-system `p′=p` syntax for ghost variables across arbitrary executions; encode the same fact with immutable ghost values and loop invariants. Delay becomes a ghost snapshot updated under a `decreases`-controlled loop. This technique is useful for proving a single relevant index, not for replacing all quantifiers automatically.

Evidence and limits. Theorem 2.2 states that adding history preserves invariance; Theorems 2.3 and 2.4 establish prophecy soundness (Section 2.3, pp. 4–6). The method requires a finite delay and a target term available in the index set. The authors warn that “it is possible that the procedure may not terminate” when no finite set of prophecy variables captures all relevant indices (Section 5.2, p. 13). Inference: a Verus automation should expose a cutoff and report when ghost snapshots are insufficient.

## technique 2: array abstraction and lazy axiom refinement

what it is and when to use it. Start with a weak, quantifier-free abstraction that treats arrays as uninterpreted sorts and reads/writes as uninterpreted functions. Refine only when a bounded counterexample violates an instantiated array axiom.

steps from Sections 4.1–4.2 and Algorithm 3. (1) Replace each array sort by an uninterpreted sort; replace constant arrays by frozen abstract variables; replace `read` and `write` by uninterpreted functions. (2) Compute an index set containing every read/write index in the bounded formula, witness indices for array equalities, and a fresh λ index distinct from all other indices. (3) Run BMC at bound `k`. (4) For each abstract counterexample, instantiate read-over-write, extensionality, and constant-array axioms at those indices. (5) Separate consecutive and nonconsecutive axiom instances. (6) For each nonconsecutive instance, call Prophecize on the index with delay `k−n_i`, replace the distant timed index with the prophecy variable, and add the resulting consecutive axiom. (7) Lift consecutive axioms into the initial condition or transition relation according to whether they mention one time step or adjacent steps. (8) Repeat BMC/refinement until unsatisfiable (property holds to bound) or an axiom-free counterexample remains (real bug).

Algorithm 3's loop begins: “I ← ComputeIndices(S, Pb, k)” and then “ρ ← BMC(S, Pb, k)” (Algorithm 3, p. 8). The authors describe the abstraction as “memoryless arrays, i.e., the array axioms are not initially enforced on the abstraction.” (Section 4.1, p. 7).

Verus form. Inference: model a Rust slice/map as an uninterpreted ghost map during early proof search, then add read/write lemmas only for indices appearing in a counterexample. Verus's `Map` and `Seq` specifications are mathematical and do not permit replacing their semantics dynamically; the abstraction therefore belongs in an external invariant synthesizer that emits targeted ghost lemmas. A final Verus proof must use the real map axioms.

Evidence and correctness. Theorem 4.1 proves that a `true` result implies the concrete property; Theorem 4.2 proves that `false` means a concrete counterexample (Section 4.3, pp. 10–12). The proof relies on complete enumeration for the array-property fragment and valid axiom instantiations. The method assumes infinite index sorts so a fresh λ index exists; for finite domains, omitting λ can produce spurious counterexamples (Section 6.1, pp. 16–17).

## technique 3: heuristics that keep refinement tractable

weak versus strong abstraction. Weak abstraction treats array equality as an uninterpreted predicate and checks the congruence axiom, creating more opportunities for prophecy targets; strong abstraction uses equality and UF axioms. The default is weak abstraction (Section 6.1, p. 14). Inference: choose weak mode when finding a proof is harder than minimizing ghost state; choose strong mode when solver cost dominates.

filtering. Check consecutive axioms before nonconsecutive ones, because only the latter need history variables. Use unsat cores to remove nonconsecutive axioms whose targets are far from the trace end, and retain only axioms appearing in an unsat core when BMC becomes unsatisfiable (Section 6.1, pp. 14–15). Keep predicates involving prophecy variables when IC3IA mines interpolants; these predicates are likely necessary to exclude the spurious trace (Section 6.1, p. 16).

pre-state assumption. Assume the original safety property in the pre-state when checking the first violation. The paper's array-initialization example diverges without this assumption but converges when it predicts one index one step before the violation (Section 6.1, pp. 15–16). Inference: this is analogous to strengthening a Verus loop invariant with the no-panic property at loop entry; it is sound only when the proof concerns the first violation.

## evidence, contradictions, and product threat

The evaluation uses four benchmark sets: freqhorn (81), quic3 (43), vizel (33), and chc-comp-2020 (501), with a two-hour timeout and 32 GB memory (Section 7.1, pp. 17–18). Results are reported as Q/QF/US counts. prophic3 totals 171/167/57 across the 658 benchmarks and solves 66/5/0, 41/0/0, 22/3/1, and 42/159/56 in the four sets respectively (Figure 6, p. 20). On solved Q instances, it introduces an average of 1.2 prophecy variables and median 1 (Section 7.2, p. 18). The paper notes a discrepancy on one benchmark where gspacer disagrees with other tools and excludes that instance from gspacer's solved count (Section 7.2, p. 19); this is a reported benchmark inconsistency, not evidence that prophic3 is wrong.

The method is sensitive to encoding: prophic3 solves 6 SeaHorn-translated quic3 instances versus 41 with direct Kratos2 encoding, while other CHC solvers solve the same numbers on both encodings (Section 7.2, pp. 20–21). It can diverge when infinitely many array indices matter and quantifier-free interpolation is unavailable. Inference: threat to agent-written verified Rust is moderate. Ghost prophecy may expose the one index needed for a difficult proof, but unsound ghost updates, incomplete map axioms, or encoding-dependent heuristics can create false confidence; every generated invariant still needs a concrete Verus proof.

Existing work already provides CEGAR, lazy array-axiom instantiation, history variables, and prophecy soundness theorems. VL should reuse these proof obligations and report nontermination/encoding sensitivity rather than presenting prophecy as complete quantifier elimination.

## techniques for the catalog

- delayed universal prophecy — add history plus a frozen variable targeting a term at a finite delay to obtain a quantifier-free invariant
- lazy array abstraction refinement — abstract arrays as uninterpreted functions, instantiate violated axioms from BMC traces, and lift them into transitions
- refinement tractability heuristics — prefer consecutive axioms, prune with unsat cores, retain prophecy predicates, and assume the property in the pre-state when sound
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
