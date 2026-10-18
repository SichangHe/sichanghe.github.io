# On Counterexample Guided Quantifier Instantiation for Synthesis in CVC4
(authored by agents unless marked 🧑)
Tag: `reynolds2015counterexample`, [paper](http://arxiv.org/abs/1502.04464v3)

## what the paper proves and builds

The paper turns synthesis into proof search inside an SMT solver. Its abstract states: “We introduce the first program synthesis engine implemented inside an SMT solver.” The input is a second-order conjecture `∃f ∀x P[f,x]`; the implementation searches for a refutation of `∀f ∃x ¬P[f,x]`, then extracts a function from the finite ground instances used in that refutation (Sections 1–2, pp. 1–4). The approach assumes a satisfaction-complete background theory for the formulas considered. It is solution-sound: every returned function satisfies the specification, but the unrestricted single-invocation procedure is not solution-complete. The syntax-guided datatype procedure is solution-complete when its decidable theory and fair size enumeration apply (Sections 3–4, pp. 5–11).

## technique: refutation-based synthesis for single-invocation contracts

Use this when every occurrence of the unknown function has the form `f(x)` for one common input tuple and the contract can be written `Q[x,y]`. Section 3 defines this as a single-invocation property and gives the equivalence `∃f ∀x Q[x,f(x)]` ↔ `∀x ∃y Q[x,y]` (p. 5).

1. Skolemize the negation to `∀y ¬Q[k,y]`, where `k` is a fresh tuple of constants (Section 3, p. 5)
2. Start `Γ` with `G ⇒ Q[k,e]`; `e` is a candidate result and `G` records that a solution remains possible (Figure 1, p. 6)
3. Ask the SMT solver for a model of `Γ ∧ G`; choose a term `t[k]` whose interpretation equals the model's `e`, then add `¬Q[k,t[k]]` to `Γ` (Figure 1 and “Finding instantiations,” pp. 6–7)
4. Repeat until `Γ` is unsatisfiable or all models falsify `G`; in the first case extract the nested conditional `λx. ite(Q[x,tp[x]],tp[x], … ite(Q[x,t2[x]],t2[x],t1[x]) …)` (Figure 1, p. 6)

The paper's worked maximum example uses `Q[x,y] := y ≥ x1 ∧ y ≥ x2 ∧ (y ≈ x1 ∨ y ≈ x2)`. Instantiating with `a1` and `a2` makes `{¬Q[a,a1], ¬Q[a,a2]}` unsatisfiable and yields `λx. ite(x2 ≥ x1,x2,x1)` (Example 1, p. 6). The paper explicitly warns: “The procedure is not solution-complete, that is, it is not guaranteed to return a solution whenever there is one.” (Section 3, p. 7)

The crucial heuristic is counterexample-guided quantifier instantiation, rather than ordinary E-matching. CVC4 chooses another term in the equivalence class of `e`; for `max`, the DPLL(T) model forces that class to contain `a1` or `a2`, so at most two iterations produce the refuting instances (Section 3, p. 7). The returned term is sound by Proposition 1: if the ground instances are jointly unsatisfiable, the conditional selects a value satisfying `Q` for every input.

The paper records the stopping behavior precisely: “The procedure, which may not terminate in general, terminates either when Γ becomes unsatisfiable, in which case it has found a solution, or when Γ is still satisfiable but all of its models falsify G, in which case the search for a solution was inconclusive.” (Section 3, p. 7)

Inference: in Verus, the analogous workflow is to expose a pure specification `spec fn q(x: Input, y: Output) -> bool`, prove a finite candidate set of `ensures` obligations with `assert`/`assert forall`, and use a `proof fn` to derive the conditional choice. Verus does not synthesize an executable function from a Z3 refutation automatically; candidate generation and the final `if` implementation remain Rust code. This is an inference from the paper's SMT extraction algorithm and general knowledge of Verus; the paper does not mention Verus, and I did not check the local Verus notes.

## technique: syntax-guided synthesis by datatype embedding

Use this when solutions must obey a grammar. Encode grammar nonterminals as algebraic datatypes; add evaluation functions `ev` and axioms for each constructor. Example 2 uses constructors `x1`, `x2`, `zero`, `one`, `plus`, `minus`, `if` and Boolean constructors `leq`, `eq`, `and`, `not` (Section 4, pp. 8–9). The unknown function becomes a first-order datatype value `g`; `Pev[g,x]` evaluates that syntax tree. Run the two-sided loop in Figure 3: (a) find a model of `Γ ∧ G`, add a negated counterexample for its candidate `e`; (b) find a model of `Γ`, add `G ⇒ Pev[e,kJ]`; if no model exists, return `e` (p. 9). Enumerate datatype values by increasing constructor size using `size(e) ≤ n`, where `size` counts non-nullary constructor applications; Proposition 2 states solution completeness when a solution exists (Section 4, pp. 9–11), and Section 6 reports that `cvc4+sg` "always produces solutions of minimal term size" (p. 15).

The datatype embedding is stated directly: “The datatypes are meant to encode a term signature that includes nullary constructors for the variables x1 and x2 of (6), and constructors for the symbols of the arithmetic theory T.” (Example 2, p. 8)

For the maximum example, the sixth candidate `if(leq(x1,x2),x2,x1)` has no counterexample and is returned; CVC4 solved that run in about 0.5 seconds (Section 4, p. 9). Proposition 2 states solution soundness, refutation soundness, and solution completeness under the paper's satisfaction-completeness assumptions.

The implementation claim is concrete: “We implemented the procedure in the CVC4 solver.” (Section 4, p. 9)

Inference: a Verus analogue is a Rust enum representing the permitted syntax, a recursive `spec fn eval`, and a proof that `eval(ast,x)` satisfies the contract. The enum search is external to Verus; the verifier can check each generated AST but does not provide the CVC4 datatype enumerator.

## technique: reconstruct a grammar-compliant term after unrestricted synthesis

When the contract is single-invocation, first run the faster unrestricted procedure, normalize its result `t` to `t↓`, then call `rcon(t↓, S, A)` where `S` is the grammar and `A` caches equivalent subterms (Figure 5, pp. 12–13). If `rcon` reports a violating subterm `(s′,D′)`, enumerate the next datatype term for `D′`, add its equivalent triple to `A`, and retry. The paper's example rewrites `x1 + (2*x2)` to the grammar term `x1 + (x2+x2)` after adding the equivalence `(2*x2) ≡ (x2+x2)` (Example 3, pp. 12–13). Normal forms underapproximate semantic equivalence, so termination and success depend on the theory normalizer and optimizations.

The reconstruction precondition is explicit: “For that it is useful to assume that terms t in T can be effectively reduced to some (T-equivalent and unique) normal form, which we denote by t ↓.” (Section 5, p. 12)

## evidence, limits, and trusted remainder

On 243 SyGuS 2014 benchmarks, 176 were recognized as single-invocation. `cvc4+si-r` solved 168/176 (159 of those in under one second); reconstruction `cvc4+si` succeeded on 102/176 = 58.0% (the paper rounds this to 61% of the total benchmark set in its prose, an inconsistency: 102/176 is 58.0%, while 102/168 is 60.7%). ESOLVER solved 70/176 in the comparison (Figure 6 and text, p. 14). Across all 243 benchmarks, CVC4 configurations solved 155 and parallel configurations 156, versus ESOLVER's 128 (p. 15). For non-single-invocation cases, `cvc4+sg` solved 53/67 and ESOLVER 58/67 (Figure 7, p. 15). The maximum-of-n experiment reports CVC4 times from 0.01 seconds at n=2 to 81.5 seconds at n=10, while ESOLVER has a result only for n=2 (0.01 s) and n=3 (1377.10 s), and none for n=4 to 10 (Figure 8, p. 16). These denominators, timeout (3600 s), StarExec cluster, and benchmark classes are the paper's settings.

Inference: the procedure trusts the SMT theory implementation, quantifier-instantiation engine, datatype decision procedure, normalizer, and the faithfulness of the evaluation axioms. It proves the generated term against the encoded formula, not that the formula captures a product requirement. The paper says the single-invocation procedure "may not terminate in general" (p. 7), and reconstruction succeeded on only 102 of the 168 solved single-invocation benchmarks (p. 14), so grammar reconstruction can fail despite an unrestricted solution. Inference: the paper does not address program cost, side channels, external libraries, or unsafe Rust.

Inference: the threat to agent-written verified Rust is moderate and indirect. The technique can generate candidate contracts or small pure helpers, but Verus still requires explicit specifications and proofs, and synthesis soundness is only relative to those specifications. The paper's SMT extraction should be reused as a candidate-generation component rather than treated as end-to-end Rust verification.

## techniques for the catalog

- counterexample-guided quantifier instantiation — grow ground counterexamples inside the SMT solver and extract a conditional function from an unsatisfiable set
- datatype-embedded syntax-guided synthesis — encode a grammar as algebraic datatypes plus evaluation axioms and search candidates by refutation
- minimal-size datatype enumeration — constrain constructor size incrementally to obtain smallest grammar terms
- normal-form reconstruction — rewrite an unrestricted solution into an equivalent term accepted by a syntax grammar using cached subterm equivalences
