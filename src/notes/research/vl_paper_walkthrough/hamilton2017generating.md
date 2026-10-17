# Generating Loop Invariants for Program Verification by Transformation
(authored by agents unless marked 🧑)
Tag: `hamilton2017generating`, [paper](https://doi.org/10.4204/EPTCS.253.5)

## what the paper does

The paper presents a terminating algorithm that discovers loop invariants from a program's postcondition. Its abstract says: “Our approach makes use of the distillation program transformation algorithm to transform clauses into a simplified form that facilitates the identification of similarities and differences between them and thus help discover invariants.” (Abstract, p. 36). The method works backward through loop iterations with weakest liberal preconditions, detects homeomorphic embedding, generalizes embedded predicates, and then uses the Poitín theorem prover to find definitions for the generated variables (§§4–5, pp. 39–44; Poitín is named in §5.1, p. 42).

Inference: the algorithm is useful when a programmer can provide a postcondition but does not want to invent the loop invariant. The paper's object language is a small imperative language with assignments, sequencing, conditionals, local blocks, and `WHILE` loops (§2, pp. 37–38). It treats partial correctness: Floyd-Hoare triples do not establish program termination (§2, p. 38).

The paper gives four worked examples. Example 1 derives the invariant for exponentiation (§5.2, pp. 42–43); Example 2 handles a conditional inside the loop (§6, pp. 44–46); Example 3 handles a nested loop (§6, pp. 46–48); Example 4 shows a failure caused by generalization removing an updated variable (§6, pp. 48–49). No aggregate benchmark denominator or percentage is reported. The evidence is these symbolic examples, the termination proof, and the reported failure characterization.

## technique 1: calculate backward approximations from the postcondition

What it is. For a loop `WHILE B DO S` with postcondition `Q`, start with the assertion true when the loop exits, `¬B ∧ Q`, and repeatedly calculate the weakest liberal precondition of the body, conjoin the loop guard, and simplify. The paper defines the loop-invariant requirements as: “1. P ⇒ I  2. {I ∧ B} S {I}  3. (I ∧ ¬B) ⇒ Q” (Definition 3.1, §3, pp. 38–39).

When to use it. Use backward calculation when a postcondition is available. The paper says: “Our technique relies upon the programmer having provided a postcondition for the program; this is much less onerous than providing loop invariants as it generally forms part of the specification of the program.” (§1, p. 36). Citing Furia and Meyer [10], it also observes that “the required invariant is often a weakening of the postcondition for the loop” (§3, p. 39).

How to do it.

1. Write the precondition `P`, guard `B`, body `S`, and postcondition `Q` (§3, pp. 38–39)
2. Initialize the current predicate to `¬B ∧ Q` (§5.1, p. 41)
3. Compute `WLP(S,current)` using the assignment, sequence, conditional, block, and annotated-loop rules in Figure 5 (§3, p. 40)
4. Conjoin each conjunct of the result with `B`, simplify each using distillation, and generalize them together into one predicate (Figure 6, p. 41; text, p. 42)
5. Repeat until the current predicate is a renaming of an earlier approximation; if it embeds an earlier one (coupled at the top level), generalize the pair and continue from the generalization (§5.1, pp. 41–42)
6. Try to find values for the generalization variables that satisfy the three invariant requirements using Poitín; if this fails for any requirement, the paper says “we have failed in finding a suitable invariant” (§5.1, p. 42)

Example. For `x := 0; y := 1; while x < n do x := x + 1; y := y * k`, the exit assertion simplifies to `x ≥ n ∧ y = k^n`; the next approximations become `x + 1 = n ∧ y*k = k^n` and `x + (1 + 1) = n ∧ y*(k*k) = k^n` (§5.2, pp. 42–43).

Verus form. Inference: use the postcondition as an `ensures` clause, calculate candidate predicates in a generator, and emit them as loop `invariant` clauses. Inference: Verus's proof then checks initialization, preservation, and exit implication; the generator must express Rust arithmetic and ownership facts in forms accepted by Verus. Inference: use `decreases` separately for termination because the paper's weakest liberal precondition does not establish termination.

Evidence and limits. For Examples 1–3, the paper reports that Poitín finds assignments to the generalization variables that satisfy the three requirements (§5.2, pp. 42–43; §6, pp. 46, 48). It shows no machine-checked proof transcript. The method assumes a supplied postcondition and a language whose expressions can be transformed. It does not claim completeness: “our technique is guaranteed to terminate but may not be able to find a suitable invariant.” (§8, pp. 51–52)

## technique 2: distillation and homeomorphic embedding control growth

What it is. Distillation is a fold/unfold transformation that simplifies predicates and exposes structural similarities. It unfolds predefined operators and normalizes associative operators to right-associative form (§4, pp. 39–40). Homeomorphic embedding detects when a current predicate structurally contains an earlier one. The paper defines diving into a subexpression and coupling corresponding subexpressions with the same top-level functor (§4.1, pp. 40–41).

When to use it. Use it before comparing successive weakest-precondition predicates, so that similar predicates share a form. The abstract says the approach “avoids the potentially exponential blow-up in clauses that can result when using this and other methods” (Abstract, p. 36). The paper attributes the blow-up to the induction-iteration method, “particularly the case for conditionals”, and says its approach avoids it “by combining the conjuncts using generalisation” (§7, p. 51). Example 2 has a conditional in the loop (§6, p. 45).

How to do it.

1. Distill the exit predicate and each backward approximation (§4, p. 40)
2. Compare the current predicate `P` with previous predicates `φ` using homeomorphic embedding (§4.1, p. 40)
3. If a previous predicate is embedded and coupled at the top level, generalize the pair (§5.1, p. 41)
4. Continue from the generalized predicate; stop when it is a variable renaming of an earlier predicate (§5.1, pp. 41–42)

Example. In Example 1, the predicates `x + (1 + 1) = n ∧ y*(k*k) = k^n` and `x + 1 = n ∧ y*k = k^n` are embedded, producing `x + v = n ∧ y*w = k^n`; another iteration yields a renaming and identifies the putative invariant (§5.2, pp. 42–43).

Verus form.

Evidence and limits. Example 2 uses a conditional exponentiation loop and derives `y * z^x = k^n` after generalized approximations (§6, pp. 44–46). The paper does not report a count of all programs attempted. The termination argument relies on finitely many functors, as shown in the proof of Lemma 5.2 (§5.3, p. 44).

## technique 3: instantiate generalized variables from the three proof obligations

What it is. Generalization can introduce variables whose initial, inductive, and final values differ. The paper solves for these values with Poitín. For a loop `{P} WHILE B DO {I} S {Q}`, it finds `v0` from `P ⇒ I{v := v0}`, `vi+1` from `{I{v := vi} ∧ B} S {I{v := vi+1}}`, and `vn` from `(I{v := vn} ∧ ¬B) ⇒ Q` (§5.1, p. 42).

How to do it.

1. Keep the generalized invariant schema with fresh variables (§5.1, p. 42)
2. Generate the initialization implication and solve for each variable's initial value (§5.1, p. 42)
3. Generate the preservation Hoare triple and solve for the next-iteration value (§5.1, p. 42)
4. Generate the exit implication and solve for the final value (§5.1, p. 42)
5. Use the invariant with the solved variable definitions; the paper writes an equivalent simplified form for readability but states “Our technique does not actually convert the discovered invariant into this simplified form; however the discovered inductive version is sufficient for the purpose of verifying the program.” (footnote 3, §5.2, p. 43)

Example. For Example 1, Poitín finds `v0' := n`, `w0' := k^n`, `vi+1' := vi' − 1`, `wi+1' := wi'/k`, `vn' := 0`, and `wn' := 1`; the resulting invariant is equivalent to `x ≤ n ∧ y = k^x` (§5.2, p. 43).

Verus form.

Evidence and limits. A footnote says the variable-solving step “could also be done using a SAT solver” (footnote 1, §5.1, p. 42). Example 4 fails because generalization removes updated `y` from the invariant; the authors say the situation “can be avoided to a certain extent by making sure that such variables appear in the left operand of binary operations”, but “this may not always be possible if the operation is not commutative or if both operands contain variables that are updated in the loop body” (§6, p. 49). Inference: the variable-instantiation phase is therefore incomplete and sensitive to expression shape.

## technique 4: handle nested loops inside-out

What it is. The weakest liberal precondition of a loop requires that its invariant is already annotated, so the method analyzes inner loops before outer loops (§3, p. 39). Example 3 takes the programmer-given inner-loop postcondition `v = y*k` and derives the inner invariant `z ≤ k ∧ v = y*z`; the paper then says: “This invariant can then be used to calculate the invariant for the outer loop as shown in Example 1.” (§6, p. 48). It does not work out the outer-loop calculation for Example 3.

How to do it.

1. Supply the inner loop's postcondition (§6, p. 47)
2. Run backward approximation, distillation, embedding, and variable solving on the inner loop (§6, pp. 47–48)
3. Use the resulting inner invariant as the annotation of the inner loop in the outer loop's WLP calculation (§3, p. 39; §6, p. 48)
4. Inference: repeat for each enclosing loop, since §3 says to apply the technique “to inner loops first” (§3, p. 39)

Verus form. Inference: verify the inner Rust loop with its own `invariant` first, then expose that contract to the outer proof. Inference: this matches Verus's need for a proved loop invariant before reasoning about a caller's loop, but the exact contract must include ownership and bounds facts absent from the paper's scalar language.

Evidence and limits. Example 3 is a single nested-loop exponentiation example; the paper says the technique could also be applied without the given inner postcondition, using the postcondition from the outer loop's WLP calculation, but “the invariant of the inner loop would have to be re-calculated for every weakest liberal precondition calculation of the outer loop body” (§6, p. 47). It notes that Xu et al. [31] extended the induction-iteration method to nested loops in a way “very similar” to its own (§7, p. 51).

## termination proof and failure boundary

The paper proves the algorithm terminates by showing homeomorphic embedding is a well-quasi-order on predicates and arguing that every infinite sequence would contain an embedded pair (§5.3, p. 44). The theorem states: “The loop invariant algorithm always terminates.” (Theorem 5.3, p. 44). The proof relies on finitely many functors, bounded arities, constructor encoding of case expressions, and bounded de Bruijn indices (§5.3, p. 44).

Inference: the termination theorem concerns the generator, not the program being verified. The paper explicitly leaves program termination for future work, which would require a weakest precondition and a decreasing variant (§8, p. 52). Inference: a Verus implementation must add `decreases` measures or equivalent progress proofs for executable loops.

The main failure is loss of information during generalization. In Example 4, swapped multiplication yields a putative invariant that omits updated `y`, and Poitín cannot prove any of the three requirements (§6, p. 49).

## what is proved, measured, and trusted

The paper proves termination of its invariant-generation algorithm under its finite-expression assumptions and demonstrates successful derivations for three examples plus one failure (§§5–6, pp. 41–49). It measures no aggregate success rate, time, memory, or denominator across programs. Inference: it trusts the WLP calculus, distillation implementation, embedding and generalization algorithms, Poitín theorem prover, and the supplied pre/postconditions. Inference: a Verus deployment additionally trusts the translation from Rust expressions to generator expressions, Verus's solver and compiler, proof erasure, and contracts for libraries or pointers.

## techniques for the catalog

- weakest-liberal-precondition search: work backward from a loop postcondition and guard to generate successive invariant approximations
- distillation normalization: fold and unfold predicates and normalize operators before structural comparison
- embedding-triggered generalization: use homeomorphic embedding and renaming to detect convergence while avoiding clause explosion
- obligation-driven variable solving: solve initialization, preservation, and exit constraints for generalized invariant variables
- inside-out nested-loop analysis: derive inner-loop invariants before using them in outer-loop WLP calculations
- well-quasi-order termination: prove generator termination from finite functors and homeomorphic embedding
- failure characterization by shape: generalization can drop an updated variable, and operand order affects whether it does
