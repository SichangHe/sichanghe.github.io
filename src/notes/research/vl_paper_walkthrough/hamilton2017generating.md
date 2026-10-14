# Generating Loop Invariants for Program Verification by Transformation
(authored by agents unless marked 🧑)
Tag: `hamilton2017generating`, [paper](http://arxiv.org/abs/1708.07223v1)

## what the paper does

The paper presents a terminating algorithm that discovers loop invariants from a program's postcondition. Its abstract says: “Our approach makes use of the distillation program transformation algorithm to transform clauses into a simplified form that facilitates the identification of similarities and differences between them and thus help discover invariants.” (Abstract, p. 36). The method works backward through loop iterations with weakest liberal preconditions, detects homeomorphic embedding, generalizes embedded predicates, and then uses the Poitín theorem prover to find definitions for the generated variables (§§4–5, pp. 39–44).

Inference: the algorithm is useful when a programmer can provide a postcondition but does not want to invent the loop invariant. The paper's object language is a small imperative language with assignments, sequencing, conditionals, local blocks, and `WHILE` loops (§2, pp. 36–38). It treats partial correctness: Floyd-Hoare triples do not establish program termination (§2, p. 38).

The paper gives four worked examples. Example 1 derives the invariant for exponentiation; Example 2 handles a conditional inside the loop; Example 3 handles a nested loop; Example 4 shows a failure caused by generalization removing an updated variable (§6, pp. 44–50). No aggregate benchmark denominator or percentage is reported. The evidence is these symbolic examples, the termination proof, and the reported failure characterization.

## technique 1: calculate backward approximations from the postcondition

What it is. For a loop `WHILE B DO S` with postcondition `Q`, start with the assertion true when the loop exits, `¬B ∧ Q`, and repeatedly calculate the weakest liberal precondition of the body, conjoin the loop guard, and simplify. The paper defines the loop-invariant requirements as: “1. P ⇒ I  2. {I ∧ B} S {I}  3. (I ∧ ¬B) ⇒ Q” (§3, p. 39).

When to use it. Use backward calculation when the desired loop invariant is a weakening or generalization of the postcondition. The paper explains that the postcondition is usually available as part of the specification and is less onerous than supplying invariants (§1, p. 36).

How to do it.

1. Write the precondition `P`, guard `B`, body `S`, and postcondition `Q` (§3, pp. 38–39)
2. Initialize the current predicate to `¬B ∧ Q` (§5.1, p. 41)
3. Compute `WLP(S,current)` using the assignment, sequence, conditional, block, and annotated-loop rules in Figure 5 (§3, p. 40)
4. Conjoin the result with `B`, then simplify using distillation (§5.1, p. 41)
5. Repeat until the current predicate is a renaming of an earlier approximation or an embedding triggers generalization (§5.1, pp. 41–42)
6. Check the three invariant requirements with the theorem prover (§5.1, p. 42)

Example. For `x := 0; y := 1; while x < n do x := x + 1; y := y * k`, the exit assertion simplifies to `x ≥ n ∧ y = k^n`; the next approximations become `x + 1 = n ∧ y*k = k^n` and `x + (1 + 1) = n ∧ y*(k*k) = k^n` (§5.2, pp. 42–43).

Verus form. Inference: use the postcondition as an `ensures` clause, calculate candidate predicates in a generator, and emit them as loop `invariant` clauses. Inference: Verus's proof then checks initialization, preservation, and exit implication; the generator must express Rust arithmetic and ownership facts in forms accepted by Verus. Inference: use `decreases` separately for termination because the paper's weakest liberal precondition does not establish termination.

Evidence and limits. The paper proves partial-correctness obligations for its examples with Poitín (§5.2, pp. 42–44). The method assumes a supplied postcondition and a language whose expressions can be transformed. It does not claim completeness: “our technique is guaranteed to terminate but may not be able to find a suitable invariant.” (§8, p. 52)

## technique 2: distillation and homeomorphic embedding control growth

What it is. Distillation is a fold/unfold transformation that simplifies predicates and exposes structural similarities. It unfolds predefined operators and normalizes associative operators to right-associative form (§4, p. 40). Homeomorphic embedding detects when a current predicate structurally contains an earlier one. The paper defines diving into a subexpression and coupling corresponding subexpressions with the same top-level functor (§4.1, pp. 40–41).

When to use it. Use it before comparing successive weakest-precondition predicates, especially when conditionals would otherwise produce exponentially many conjuncts. The paper says its approach avoids the induction-iteration method's “potentially exponential blow-up in clauses” (Abstract, p. 36).

How to do it.

1. Distill the exit predicate and each backward approximation (§4, p. 40)
2. Compare the current predicate `P` with previous predicates `φ` using homeomorphic embedding (§4.1, p. 40)
3. If a previous predicate is embedded and coupled at the top level, generalize the pair (§5.1, p. 41)
4. Continue from the generalized predicate; stop when it is a variable renaming of an earlier predicate (§5.1, pp. 41–42)

Example. In Example 1, the predicates `x + (1 + 1) = n ∧ y*(k*k) = k^n` and `x + 1 = n ∧ y*k = k^n` are embedded, producing `x + v = n ∧ y*w = k^n`; another iteration yields a renaming and identifies the putative invariant (§5.2, pp. 42–43).

Verus form. Inference: run distillation and embedding on Verus specification syntax before emitting a loop invariant. Inference: the resulting generalized variables become ghost terms or quantified expressions, while Rust executable code remains unchanged. Inference: Verus does not provide this transformation automatically, so this method belongs in VL's candidate-invariant generator and every candidate must pass Verus's own proof checker.

Evidence and limits. Example 2 uses a conditional exponentiation loop and derives `y * z^x = k^n` after generalized approximations (§6, pp. 44–46). The paper does not report a count of all programs attempted. Embedding guarantees termination only for the finite-functor setting proved in Lemma 5.2 (§5.3, p. 44).

## technique 3: instantiate generalized variables from the three proof obligations

What it is. Generalization can introduce variables whose initial, inductive, and final values differ. The paper solves for these values with Poitín. For a loop `{P} WHILE B DO {I} S {Q}`, it finds `v0` from `P ⇒ I{v := v0}`, `vi+1` from `{I{v := vi} ∧ B} S {I{v := vi+1}}`, and `vn` from `(I{v := vn} ∧ ¬B) ⇒ Q` (§5.1, pp. 42–43).

How to do it.

1. Keep the generalized invariant schema with fresh variables (§5.1, p. 42)
2. Generate the initialization implication and solve for each variable's initial value (§5.1, p. 42)
3. Generate the preservation Hoare triple and solve for the next-iteration value (§5.1, p. 42)
4. Generate the exit implication and solve for the final value (§5.1, p. 42)
5. Substitute the definitions and simplify the resulting invariant (§5.2, pp. 43–44)

Example. For Example 1, Poitín finds `v0' := n`, `w0' := k^n`, `vi+1' := vi' − 1`, `wi+1' := wi'/k`, `vn' := 0`, and `wn' := 1`; the resulting invariant is equivalent to `x ≤ n ∧ y = k^x` (§5.2, pp. 43–44).

Verus form. Inference: represent the schema as a ghost `spec fn` or proof-state relation, and emit lemmas that establish initialization and preservation for concrete expressions. Inference: use `requires` and `ensures` on proof lemmas, not on a `spec fn`; use loop `invariant` for the executable loop. Inference: if solver search cannot infer a generalized variable, VL should expose the unsolved obligation rather than silently weaken the invariant.

Evidence and limits. The paper says Poitín can be replaced by a SAT solver (§5.2, p. 42). Example 4 fails because generalization removes updated `y` from the invariant; the authors note that putting updated variables in the left operand can ameliorate this for some operators (§6, pp. 49–50). Inference: the variable-instantiation phase is therefore incomplete and sensitive to expression shape.

## technique 4: handle nested loops inside-out

What it is. The weakest liberal precondition of a loop requires that its invariant is already annotated, so the method analyzes inner loops before outer loops (§3, p. 39). Example 3 supplies the inner-loop postcondition `v = y*k`, derives the inner invariant `z ≤ k ∧ v = y*z`, then uses it while calculating the outer-loop invariant (§6, pp. 46–48).

How to do it.

1. Supply or derive the inner loop's postcondition (§6, p. 46)
2. Run backward approximation, distillation, embedding, and variable solving on the inner loop (§6, pp. 46–48)
3. Use the resulting inner invariant as the annotated-loop fact in the outer loop's WLP calculation (§3, p. 39; §6, p. 48)
4. Continue the same process for enclosing loops (§6, p. 48)

Verus form. Inference: verify the inner Rust loop with its own `invariant` first, then expose that contract to the outer proof. Inference: this matches Verus's need for a proved loop invariant before reasoning about a caller's loop, but the exact contract must include ownership and bounds facts absent from the paper's scalar language.

Evidence and limits. Example 3 is a single nested-loop exponentiation example; the paper says the technique could also derive the inner postcondition but would recalculate its invariant for every outer WLP (§6, p. 46). Inference: caching inner-loop summaries is necessary for a practical VL generator.

## termination proof and failure boundary

The paper proves the algorithm terminates by showing homeomorphic embedding is a well-quasi-order on predicates and arguing that every infinite sequence would contain an embedded pair (§5.3, pp. 44–45). The theorem states: “The loop invariant algorithm always terminates.” (Theorem 5.3, p. 44). The proof relies on finitely many functors, bounded arities, constructor encoding of case expressions, and bounded de Bruijn indices (§5.3, p. 44).

Inference: the termination theorem concerns the generator, not the program being verified. The paper explicitly leaves program termination for future work, which would require a weakest precondition and a decreasing variant (§8, p. 52). Inference: a Verus implementation must add `decreases` measures or equivalent progress proofs for executable loops.

The main failure is loss of information during generalization. In Example 4, swapped multiplication yields a putative invariant that omits updated `y`, and Poitín cannot prove any of the three requirements (§6, pp. 49–50). Inference: VL should retain failed candidate schemas and report which updated variable disappeared, instead of claiming that no invariant exists. The paper also identifies richer data structures and pointers as future extensions requiring universally quantified invariants or separation logic (§8, p. 52).

## what is proved, measured, and trusted

The paper proves termination of its invariant-generation algorithm under its finite-expression assumptions and demonstrates successful derivations for three examples plus one failure (§§5–6, pp. 41–50). It measures no aggregate success rate, time, memory, or denominator across programs. It trusts the WLP calculus, distillation implementation, embedding and generalization algorithms, Poitín theorem prover, and the supplied pre/postconditions. Inference: a Verus deployment additionally trusts the translation from Rust expressions to generator expressions, Verus's solver and compiler, proof erasure, and contracts for libraries or pointers.

Inference: this paper is a moderate threat to a product that claims automatic loop-proof generation: it already supplies a principled backward candidate generator and a termination argument. Inference: VL should not re-do generic postcondition-to-invariant search without comparing against this distillation and embedding baseline. Inference: the product opportunity is Rust-aware extension, including ownership, arrays, pointers, quantified data invariants, and an explicit failure explanation when generalization drops a needed variable.

## techniques for the catalog

- weakest-liberal-precondition search: work backward from a loop postcondition and guard to generate successive invariant approximations
- distillation normalization: fold and unfold predicates and normalize operators before structural comparison
- embedding-triggered generalization: use homeomorphic embedding and renaming to detect convergence while avoiding clause explosion
- obligation-driven variable solving: solve initialization, preservation, and exit constraints for generalized invariant variables
- inside-out nested-loop analysis: derive inner-loop invariants before using them in outer-loop WLP calculations
- well-quasi-order termination: prove generator termination from finite functors and homeomorphic embedding
- failure diagnosis by shape: detect lost updated variables and adjust expression orientation or candidate generation
Checked 2026-10-13: audit record hamilton2017generating; paper-study comparison complete; gate executed; experiments not rerun
