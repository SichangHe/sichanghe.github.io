# Verifying Relational Properties using Trace Logic
(authored by agents unless marked 🧑)
Tag: `barthe2019tracelogic`, [paper](http://arxiv.org/abs/1906.09899v3)

## purpose and result

Barthe and coauthors introduce trace logic, a first-order logic whose functions explicitly take program timepoints and execution traces. The method encodes a while-language program's semantics and a relational property into one first-order validity problem. A theorem prover then checks partial correctness. The representation is designed for hyperproperties such as non-interference and sensitivity, where one must compare two executions.

The abstract says: “Our framework reduces verification of relational properties of imperative programs to a validity problem in trace logic” (p. 1). The paper's key implementation is R APID, which emits SMT-LIB and invokes VAMPIRE's resolution and superposition (Section VI-A, p. 7). Inference: VL can use the same two-trace specification pattern for information-flow properties of Rust functions, but Verus proofs would encode relations as ghost sequences and state-machine invariants rather than invoke R APID directly.

## technique 1: encode variables by timepoint-and-trace functions

What it is. For each program variable `v`, trace logic introduces a function `v : (L × T) → I`, where `L` is a sort of timepoints, `T` is a sort of traces, and `I` is integer data. Arrays receive an additional index argument. Expressions are evaluated at a timepoint and trace. Equality predicates compare variables at two timepoints; `EqAll` conjoins equality for every variable. The paper defines `Eq(v,tp1,tp2)` and `EqAll(tp1,tp2)` in Equations (4)–(5), Section IV-B, p. 4. The source language W has mutable and constant integer and integer-array variables (Section III-B, p. 3).

When to use it. Inference: use this representation when the property relates multiple executions or intermediate loop states, including non-interference, program sensitivity, and array correspondence. It is less suitable when a simple state invariant is enough or when the program's semantics cannot be expressed in the chosen first-order theory. The paper notes that for non-relational properties the trace argument can be omitted (Section IV-B, p. 4).

How to do it.

1. Create a trace constant `t1`, `t2`, … for each run to compare.
2. Create a timepoint symbol for each source location and loop iteration. The paper defines `start s` and `end s` recursively over statement nesting (Section IV-A, pp. 3–4).
3. Represent scalar variables as `v(tp,tr)` and arrays as `v(tp,pos,tr)`.
4. Define expression evaluation `JeK(tp,tr)` and equality predicates. For an array, equality quantifies over every position (Equation (4), p. 4).
5. State the relational property over the resulting functions. For non-interference, initial equality of low variables implies final equality of low variables (Equation (12), p. 5).

Verus form. Inference: use ghost `Seq` or map values indexed by a ghost timepoint and trace identifier, with a `spec fn` for variable lookup. A Verus `proof fn` can maintain `EqAll` over two ghost states; loop invariants quantify over array positions or use sequence extensionality. Rust's executable state remains ordinary structs, while the trace relation is ghost-only. Verus's `old(...)` expression can relate post-state values to pre-state values, but arbitrary unbounded trace quantification may need explicit lemmas and finite prefixes.

Evidence. The paper states: “As a consequence, the semantics of any terminating program p expressed in L, as defined in (6), is W-sound.” (Theorem 1, Section IV-D, p. 5) Theorem 1 says the trace axioms (7)–(11) are W-sound for a given terminating program; the proof by structural induction over statements is in the Appendix. The paper defines correctness as proving `JP K ⊨ F` for a property F in trace logic (Section IV-E, p. 5). The implementation states: “R APID produced the SMT-LIB-encodings for each benchmark in less than a second.” (Section VI-B, p. 7) The authors collected 27 verification problems (Section VI-B, p. 7).

Failure and assumptions. The framework proves partial correctness, not termination: the paper explicitly says “We use L to express and prove that P ‘satisfies’ F , that is P is partially correct w.r.t. F” (Section IV-E, p. 5). Inference: array and integer theories are first-order abstractions, and the generated axioms must be sound for the source language. A Verus adaptation must separately prove termination or bound the trace prefix if progress matters.

## technique 2: generate sound semantics for statements and loops

What it is. The semantics of each statement is a conjunction of trace axioms. Skip preserves all variables (Equation (7)). Assignments constrain the post-timepoint value and preserve all other variables (Equations (8)–(9)). Conditionals preserve values at branch entry and conjoin the selected branch semantics (Equations (10a)–(10d)). A while loop uses a natural-number iteration counter, a `lastIt` function for the first iteration where the condition is false, and an equality between the loop's end state and the state at `lastIt` (Equations (11a)–(11e), Section IV-C, pp. 4–5).

How to do it.

1. Translate each top-level statement `s_i` and conjoin them as `JP K = ∧ JsiK` (Equation (6), p. 4).
2. For an assignment `v=e`, assert `v(end s) = JeK(tps,tr)` and preserve every other variable with `Eq` (Equation (8), p. 4).
3. For an array assignment, quantify positions different from the assigned index and constrain the assigned position to the old expression value (Equation (9), p. 4).
4. For `if`, assert branch-entry equality and include the semantics of whichever branch its condition selects (Equation (10), p. 5).
5. For `while`, assert the condition on every iteration before `lastIt`, false at `lastIt`, body-entry equality, body semantics per iteration, and final-state equality (Equation (11), p. 5).
6. Prove W-soundness by structural induction over statements (Appendix). Theorem 1 states that these axioms are W-sound for a given terminating program (Section IV-D, p. 5).

Verus form. Inference: executable Rust loops need ordinary Verus loop invariants, with a ghost iteration counter and a ghost snapshot for the second trace. Encode the five while conditions as `invariant` clauses and prove each body step with a `proof fn`. A loop's final state can use `ensures` after termination; Verus does not have a `lastIt` primitive, so define a ghost counter and establish its minimality with arithmetic lemmas. For arrays, use `Seq` or a map model and prove unchanged positions with quantified assertions.

Evidence and limits. The generated semantics are W-sound only under the paper's terminating-program condition (Theorem 1). The source language W is a simple while-language with if-then-else, a single top-level function `main`, and integer and integer-array variables (Section III-B, p. 3). Inference: arbitrary Rust features, aliasing, panics, and unsafe code are outside this encoding, and directly translating Rust syntax would require a separate sound semantics proof.

## technique 3: add generated trace lemmas for induction

What it is. The paper says that state-of-the-art SMT solvers and theorem provers cannot automatically infer most of the inductive consequences R APID needs. R APID therefore generates generic lemmas over loop iterations and adds them as axioms, “for each variable and each loop of the program” (Section VI-A, p. 7). Examples include the equality-preservation lemma (2) (Section II, p. 2), simultaneous-loop-termination (Equation (17)) and equality-preservation for arrays (Equation (18), Section V-c/d, pp. 6–7). The paper states that “Each trace lemma is logically implied by standard induction axioms of natural numbers and the semantics of the program” (Section VI-A, p. 7). Inference: the lemmas are therefore sound proof accelerators.

When to use it. Inference: add such lemmas when a relational property needs an invariant across all iterations or needs two traces to stop at the same iteration, but avoid adding every lemma indiscriminately. The experiments report that two failures became provable when unnecessary lemmas were removed manually.

How to do it.

1. Generate a lemma for each variable and loop (Section VI-A, p. 7). Lemma (2) says that if `v` is equal in both traces at iteration 0 and equality at `it` implies equality at `succ(it)` for every `it` below an arbitrary bound `itB`, then `v` is equal at `itB` (Section II, p. 2).
2. For two traces, use the simultaneous-termination lemma: if the second trace's condition holds at every iteration below the first trace's last iteration `ns(t1)` and is false at `ns(t1)`, then `ns(t2) ≃ ns(t1)` (Equation (17), p. 7).
3. For arrays, define `Eq_a(it,pos)` and quantify an initial equality plus one-step preservation to derive equality at any later iteration (Equation (18), p. 7).
4. Emit the generated lemmas alongside the program axioms and property in SMT-LIB (Section VI-A, p. 7).
5. Let a first-order prover use the lemmas with resolution and superposition.

Verus form. Inference: each generated trace lemma corresponds to a reusable Verus `proof fn` with a quantified `ensures` or a sequence induction lemma. Use `invariant` in the executable loop for one-step preservation and a separate lemma for arbitrary iteration counts. For two traces, keep both states in a ghost struct and prove a synchronized-step invariant. The paper's automatic lemma generation is external to Verus; an agent could generate lemma stubs, but each must be proved rather than treated as an axiom.

Evidence. R APID generated lemmas for each variable and loop (Section VI-A, p. 7). VAMPIRE proved 25 of 27 benchmark encodings; the paper says the two unproved problems “could actually be proved by VAMPIRE by using only a subset of trace lemmas, i.e. by removing unnecessary lemmas manually” (Section VI-B, p. 7). Inference: this shows both the utility of the lemmas and the cost of having too many.

Failure and assumptions. Inference: the lemmas are sound only if their semantics are correct, and they do not make first-order validity decidable. Adding generated lemmas to a Verus proof without proving them would enlarge the trusted base and defeat the product's assurance goal.

## technique 4: encode security hyperproperties and choose a prover

What it is. Non-interference is encoded as equality of low variables at the initial timepoint implying equality at the final timepoint (Equation (12)). Sensitivity says that if the output variables differ by less than `k` between two traces at the start, they differ by less than `k` at the end (Equation (15), p. 6). The approach is value-sensitive, so a high guard can be secure when both branches produce the same low result. The paper's examples show this: it says the program with equal branches on a high guard would be classified insecure by type-based tools and by JOANA, and that value-insensitive type systems would reject the output-loop example (Examples 3–4, Section V, pp. 5–7).

How to do it.

1. Partition variables into low/public and high/private sets.
2. Define `EqTr(v,tp)` as equality of v across traces at a timepoint, with array positions universally quantified (Section V-a, p. 5).
3. State the non-interference implication over low variables, or state the sensitivity inequality over the output variables (Equations (12), (15), pp. 5–6).
4. Add trace lemmas for loops and arrays.
5. Run VAMPIRE on the generated first-order clauses; compare Z3/CVC4 only as baseline provers.

Verus form. Inference: define two ghost executions or two calls under different high inputs and prove equal low outputs with a relational `proof fn`. Sensitivity can use integer arithmetic on two ghost outputs and `ensures abs(out1-out2) < k`. Verus's function contracts can express the relation for deterministic functions; nondeterministic IO requires an explicit model. Do not infer non-interference from a type system alone when value-sensitive branch reasoning is needed.

Evidence. The benchmark set has 27 problems, each program up to 50 lines (Section VI-B, p. 7). VAMPIRE proved 25 of 27; Z3 proved 13 and CVC4 14 (Table I, p. 8). The VAMPIRE settings S, S+A, F, F+A proved 15, 18, 17, and 19 examples respectively, with S+A proving four examples that no other VAMPIRE setting proved (Table I, p. 8). Each prover had a 60-second limit on an Intel Core i5 3.1Ghz machine with 16 GB of RAM (Section VI-B, p. 7).

Failure and assumptions. The experiments use small W programs and security properties; they do not measure real Rust, unsafe code, concurrency, or maintenance (Inference from the benchmark description). The authors name better theory reasoning in VAMPIRE, in particular “better reasoning support for transitive relations like <N and <I”, as further research (Section VI-B, pp. 7–8), and conclude that improving superposition reasoning with theories and quantifiers would further strengthen trace logic (Section VIII, p. 9). Inference: the product threat is a relational specification that omits an output channel or models only terminating executions.

## what is proved, measured, and trusted

The paper states W-soundness of the statement semantics for terminating programs (Theorem 1, proof in the Appendix); benchmark properties are proved when VAMPIRE finds a refutation. Measured results are 27 benchmark encodings, under-one-second encoding generation, and solver counts 25/27 (VAMPIRE), 13/27 (Z3), and 14/27 (CVC4) (Section VI-B, pp. 7–8). Inference: trusted components include the W-to-trace encoding, generated trace lemmas, the SMT-LIB translator, arithmetic and array theories, and VAMPIRE's implementation. Inference: for agent-written verified Rust, the approach threatens only the relational-verification gap; it does not replace Verus's source semantics or establish that low/high labels match product policy.

## what VL should not redo

VL should not redo the trace-logic definitions, generic loop lemmas, or the 27-problem R APID comparison. A useful extension would test a generated relational-contract layer on real Verus APIs, with explicit measurements of proof repair after code and dependency changes.

## techniques for the catalog

- trace-indexed variables: model every variable as a function of program timepoint and execution trace
- sound statement encoding: translate assignments, branches, and loops into first-order trace axioms
- generated trace induction: add proved loop and array lemmas for synchronized iterations and preservation
- hyperproperty contracts: encode non-interference and sensitivity as first-order relations over two traces

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Property (17) is essential to prove that the loops in both traces have the same last iteration, and therefore terminate after the same number of iterations."): read all 816 lines of the paper text, including related work and appendix; checked every quotation, number, equation/section/page reference (page numbers are PDF pages), the benchmark counts and Table I totals; changed the page references for Equations (8)-(12), (15), (18), Theorem 1, Section VI and Table I, which were off by one or two pages, fixed Equation (7) (skip, not assignment), the sensitivity description, the claim about future work, the Section VI-A reference for lemma generation, and marked unsupported own conclusions as Inference; I did not check the Verus adaptation advice against Verus, and did not re-derive the appendix proof of Theorem 3 or run RAPID.
