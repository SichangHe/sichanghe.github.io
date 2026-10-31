# A Specification Logic for Programs in the Probabilistic Guarded Command Language (Extended Version)
(authored by agents unless marked 🧑)
Tag: `pardo2022specification`, [paper](https://arxiv.org/abs/2205.04822)

## purpose and semantic model
This paper defines probabilistic dynamic logic (pDL) for programs in a probabilistic guarded command language (pGCL). Its target is a specification language, not a finished verifier. The authors state: “The specification language introduced in this paper constitutes a step in this direction, especially by embedding probabilistic programs into the modalities of the specification language.” (Section 1, p. 2.) The intended future direction is explicit: “Our motivation for this work is ultimately to define a proof system which allows us to mechanically verify high-level properties for programs written in probabilistic programming languages.” (Section 1, p. 2.)

pGCL extends guarded commands with probabilistic and demonic (adversarial) choice. A probabilistic choice `s e⊕ s'` selects `s` with state-dependent probability `e` and `s'` with probability `1-e`; a demonic choice `s1 ▹ s2` is resolved by a policy. Programs are interpreted as Markov decision processes (MDPs), with states pairing a valuation and a residual program (Section 4, pp. 5–6). The authors exclude stuck programs: “we henceforth rule out such programs and only consider programs that successfully reduce to a single skip statement under all policies with probability 1.” (Section 4, p. 6.)

## technique: p-box specifications for probabilistic postconditions

what it is and when to use it
The pDL grammar is `ATF | ¬ϕ | ϕ1 ∧ ϕ2 | ∀l·ϕ | [s]p ϕ`, where `ATF` is an atomic first-order formula, `s` is a pGCL program, and `p` is an expectation lower-bound function into `[0,1]` (Section 5, p. 6). The p-box modality `[s]p ϕ` means that after successfully executing `s`, the expectation that postcondition `ϕ` holds is at least `p` in the current state. Satisfaction is defined as `p(ε) ≤ Eε[[ϕ]]` (Definition 2, p. 7). Quantifiers range over logical-variable domains and are substituted with constants.

step-by-step
1. Define program variables, logical variables, and a pGCL program with probabilistic and demonic choices (Sections 4–5, pp. 5–6).
2. State the postcondition as an atomic formula or Boolean combination, for example `choice = prize` or `|c/n − µ| > δ` (Section 9, pp. 13–16).
3. Choose a lower-bound function `p` (often a constant unknown to solve for).
4. Write `[s]p ϕ`, quantify logical variables if needed, and ask whether the formula is valid for all initial valuations (Definition 2 and validity equation (5), p. 7).
5. Use the expectation rules for the program constructs to calculate or bound `p`.

Verus form
Inference: a direct Verus encoding would put deterministic state updates in executable `fn` code and express a probability bound as a ghost mathematical model, such as a `spec fn` returning a real-valued expectation. A `requires` clause can constrain probabilities to `[0,1]`; `ensures` can state a lower bound on the model’s postcondition. The MDP policy and distribution must be modeled explicitly, usually as a finite ghost state machine. Verus’s ordinary arithmetic and quantifier support does not supply pDL’s expectation operator or probability measure, so the pDL semantics and proof rules would need a separately verified library.

## technique: compositional expectation rules

probabilistic and demonic choice
Theorem 8 gives two compositional rules. If both branches satisfy lower bounds `p1` and `p2`, a probabilistic choice satisfies `ε(e)p1 +(1−ε(e))p2`; a demonic choice satisfies `p` exactly when both branches satisfy `p` (Theorem 8, p. 10). The paper calls demonic reasoning worst-case reasoning because both branches must provide the same guarantee. This distinction is essential when a program has environmental nondeterminism in addition to randomness.

The paper demonstrates the distinction with a non-deterministic versus probabilistic assignment. Its specification is: “`|= ∀δ · ∀p · 0 ≤ p ≤ 1 → ([x:=0 u x:=1]p (x ≥ δ) → [x:=0 p ⊕ x:=1]p (x ≥ δ))`.” (Example 9, p. 10.) The proof splits on `δ≤0` and `δ>0`; in the latter case the demonic branch choosing `x:=0` forces the lower bound to zero, which is then valid for the probabilistic program (Example 9, pp. 10–11).

Inference: a Verus library could represent demonic choice as a universally quantified transition and probabilistic choice as a weighted sum over a finite outcome type. The weighted-sum lemma must be proved for the chosen finite distribution; it cannot be obtained by treating random choice as an arbitrary Rust branch.

sequencing and backwards propagation
Theorem 10 composes consecutive programs. If `ϕ1 → [s2]p ϕ2` is valid, then `[s1;s2]` satisfies `ϕ2` with a new lower bound obtained by evaluating the expectation of the second-stage bound backwards through `s1` (Theorem 10, p. 11). The authors describe this as “the basic step of a backwards reachability algorithm for MDPs” (Section 7, p. 11). This lets a proof proceed from a known postcondition of `s2` to a precondition for `s1`.

Inference: in Verus, write a lemma for each sequencing rule and expose the intermediate postcondition as a ghost predicate. The executable Rust sequence remains unchanged; proof code composes the contracts. A probability expression with state-dependent weights requires a ghost function whose well-formedness and range are proved in `requires` lemmas.

## technique: statement unfolding and loop reasoning

Theorem 11 unfolds `skip`, sequencing with `skip`, and assignment. In particular, `[x:=e;s]pϕ` is equivalent to checking `[s]pϕ` in the valuation updated with `x` (Theorem 11, p. 11). Theorem 12 handles conditionals by selecting the branch whose guard holds. For loops, the paper provides only one operational unrolling rule: `[if e {s; while e{s}} else {skip}]pϕ` is equivalent to `[while e{s}]pϕ` (Theorem 12, p. 12). The authors explicitly say: “In this paper, we show the simplest possible reasoning rule for loops that performs a single unrolling, exactly along the operational semantics.” (Section 7, p. 12.) They leave invariant, prefix, and converging-probability rules as future work (Section 7, p. 12).

how to apply it
1. Rewrite assignments by substituting the assigned expression into the continuation.
2. Rewrite conditionals using the guard and the selected branch.
3. Unroll one loop iteration into an `if` with a recursive loop in the body.
4. Repeat the rewrite for a statically bounded loop, or supply an external invariant and termination argument for an unbounded one; the last step is an inference because pDL does not provide that rule.

Verus form
Inference: use a Verus `invariant` declaration on a `while` loop for the loop relation, and prove the probabilistic invariant as a ghost lemma. Do not write `invariant(...)` as a function call. For a statically bounded loop, a decreasing counter and an induction lemma can reproduce the paper’s repeated unrolling. For an unbounded loop, pDL’s single-unrolling rule is insufficient to establish termination or a limiting probability; Verus also requires explicit termination reasoning or a suitable non-terminating specification.

## technique: upper bounds and purely probabilistic programs

The p-box gives only lower bounds, because demonic choice is resolved against the property. Section 8 (pp. 12–13) shows how pDL can still bound a probability from above, and where programs without demonic choice behave differently.
- Theorem 13 (“Joni’s Theorem”): for a fixed policy, if `[s]p1 ϕ` and `[s]p2 ¬ϕ` hold, the expected reward of `ϕ` under that policy lies in `[p1, 1 − p2]` (Theorem 13, p. 12).
- Theorem 14: for a purely probabilistic program (no demonic choice), if `[s]p (ϕ1 ∨ ϕ2)` holds, there exist `p1`, `p2` with `p1 + p2 ≥ p` everywhere such that `[s]p1 ϕ1` and `[s]p2 ϕ2` (Theorem 14, p. 12).
- Example 15: the demonic program `x := H ▹ x := T` satisfies `[ ]1 (x = H ∨ x = T)` but only `[ ]0 (x = H)` and `[ ]0 (x = T)`, and `0 + 0 < 1`, so Theorem 14 fails with demonic choice (Example 15, p. 13).

Inference: the analogous Verus model should keep the adversarial transition relation separate from the finite probability distribution. An upper bound on a probability would come from a lower bound on the negated postcondition (Theorem 13), not from a separate upper-bound modality, which pDL lacks (Section 6, pp. 9–10). Splitting a disjunction bound across the disjuncts must not be used when the program has demonic choice.

## worked technique: Monty Hall calculation

The Monty Hall program has nondeterministic prize placement, a uniformly distributed contestant choice, nondeterministic host choice when two doors are available, and a switch strategy (Listing 1.1, p. 13). The specification for switching is `ε[switch↦true] |= [Monty_Hall]p(choice = prize)` (Section 9.1, p. 14).

The paper applies the rules as follows:
1. Use the demonic-choice rule twice to set `p = min(p0,p1,p2)` for the three possible prize locations (Section 9.1, p. 14).
2. Use the probabilistic-choice rule twice, because the choice is nested (`choice:=0 1/3 ⊕ (choice:=1 1/2 ⊕ choice:=2)`), giving `p_i = 1/3·p_i0 + 2/3·1/2·p_i10 + 2/3·1/2·p_i11`, so the three door choices have weights `1/3`, `1/3`, and `1/3` (Section 9.1, p. 14).
3. For the branch where prize and choice are both door 1, use the conditional rule and demonic host choice; switching then makes the postcondition false on both host branches, so the branch probability is zero (Section 9.1, pp. 14–15).
4. For the other two choices, the postcondition holds, giving branch probabilities one. The paper computes `p1 = 1/3·1 + 2/3·1/2·0 + 2/3·1/2·1 = 2/3`, and obtains the same value for each prize location (Section 9.1, p. 15).

The paper concludes: “we have proven that switching door maximizes the probability of winning the prize.” (Section 9.1, p. 15.) Its preceding sentence says “the probability of choosing the door with the prize when switching is at most 2/3”, although the calculation derives `2/3` as a lower bound under pDL’s lower-bound semantics. The text works out only the `switch = true` case (Eq. 9); it does not work out the `switch = false` case. Inference: the “maximizes” claim therefore rests on the reader knowing the no-switch value (1/3), which this section does not derive. Inference: a Verus proof would need a finite three-door datatype, explicit uniform weights, and a lemma that the host’s nondeterministic choices preserve the lower bound.

## worked technique: bounded Bernoulli convergence

The Bernoulli program repeats `s := 0 µ⊕ s := 1` for `n` iterations and increments a counter. The specification is `ε |= [Bernoulli]p(|c/n − µ| > δ)` (Section 9.2, p. 16). The authors first replace the bounded loop by a sequence of `n` bodies using repeated loop unfolding. They then calculate each path probability: a path with `i` zero outcomes and `j` one outcomes has probability `µ^i(1−µ)^j` (Section 9.2, pp. 16–17). Since the program has no demonic choice, `p = Pr(|X − µ| > δ)`; summing path probabilities over the paths that satisfy the error predicate gives `p`. There are `2^n` paths, and the binary representation of the path index enumerates them (Section 9.2, pp. 16–17).

For the displayed experiment, `µ=0.5`, `δ∈{0.1,0.2,0.4}`, and at most 20 samples (Figure 3, p. 17). The text reports that with 20 iterations the probability of error greater than 0.2 is below 5%, while error greater than 0.1 is above 20% (Section 9.2, p. 17). The values come from summing over the complete `2^n` path space for each fixed `n` and parameter setting; the paper does not report confidence intervals or repeated Monte Carlo runs, and does not say how Figure 3 was computed beyond this path sum.

Inference: in Verus, encode the finite path space as a ghost recursive function or finite sequence and prove the weighted-sum recurrence. A direct executable enumeration costs `2^n`; a scalable proof would need a separately proved binomial identity or concentration bound. The paper’s exact path sum is therefore a specification oracle, not automatically an efficient Rust algorithm.

## what is proved, trusted, and left open

The paper defines model-theoretic semantics and proves sound algebraic properties and rules for its pDL model. It does not implement a proof system. The conclusion says: “In the future, we plan to develop a deductive proof system for pDL supported by tools for (semi-)automated reasoning about pGCL programs.” (Section 10, p. 17.) It also notes that “the current definition of pDL gives no syntax to the expectations” (Section 10, p. 17), and the Introduction says proof rules are left to “future work” (Section 1, p. 2). The semantics assumes well-formed expressions, almost-sure termination under all policies, and an MDP transition model (Sections 3–4, pp. 4–6). Inference: the correctness of a real random-number generator, scheduler, floating-point arithmetic, and source-to-MDP translation remains outside the model; the paper does not discuss them.

## techniques for the catalog

- p-box probability contracts: specify a lower bound on the postcondition expectation of a probabilistic program
- demonic/probabilistic choice rules: combine worst-case branch bounds by minimum and random branch bounds by weighted sum
- backward expectation sequencing: propagate a postcondition bound through preceding program fragments using MDP expectations
- bounded-loop path expansion: unroll a fixed iteration count and sum weighted paths satisfying a quantitative predicate
