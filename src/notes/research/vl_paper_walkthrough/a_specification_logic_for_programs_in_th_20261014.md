# A Specification Logic for Programs in the Probabilistic Guarded Command Language (Extended Version)
(authored by agents unless marked 🧑)
Tag: `pardo2022specification`, [paper](https://doi.org/10.48550/arxiv.2205.04822)

## purpose and semantic model
This paper defines probabilistic dynamic logic (pDL) for programs in a probabilistic guarded command language (pGCL). Its target is a specification language, not a finished verifier. The authors state: “The specification language introduced in this paper constitutes a step in this direction, especially by embedding probabilistic programs into the modalities of the specification language.” (Section 1, p. 4.) The intended future direction is explicit: “Our motivation for this work is ultimately to define a proof system which allows us to mechanically verify high-level properties for programs written in probabilistic programming languages.” (Section 1, p. 4.)

pGCL extends guarded commands with probabilistic and demonic (adversarial) choice. A probabilistic choice `s e⊕ s'` selects `s` with state-dependent probability `e` and `s'` with probability `1-e`; a demonic choice `s1 ▹ s2` is resolved by a policy. Programs are interpreted as Markov decision processes (MDPs), with states pairing a valuation and a residual program (Section 4, pp. 5–6). The authors exclude stuck programs: “we henceforth rule out such programs and only consider programs that successfully reduce to a single skip statement under all policies with probability 1.” (Section 4, p. 6.)

Inference: for VL, the key boundary is that pDL reasons about a mathematical MDP and a probabilistic specification. It does not prove that a Rust implementation has the intended random source, distribution, scheduler, or termination behavior.

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

Theorem 11 unfolds `skip`, sequencing with `skip`, and assignment. In particular, `[x:=e;s]pϕ` is equivalent to checking `[s]pϕ` in the valuation updated with `x` (Theorem 11, p. 11). Theorem 12 handles conditionals by selecting the branch whose guard holds. For loops, the paper provides only one operational unrolling rule: `[if e {s; while e{s}} else {skip}]pϕ` is equivalent to `[while e{s}]pϕ` (Theorem 12, p. 12). The authors explicitly say: “In this paper, we show the simplest possible reasoning rule for loops that performs a single unrolling, exactly along the operational semantics.” (Section 7, p. 11.) They leave invariant, prefix, and converging-probability rules as future work (Section 7, p. 11).

how to apply it
1. Rewrite assignments by substituting the assigned expression into the continuation.
2. Rewrite conditionals using the guard and the selected branch.
3. Unroll one loop iteration into an `if` with a recursive loop in the body.
4. Repeat the rewrite for a statically bounded loop, or supply an external invariant and termination argument for an unbounded one; the last step is an inference because pDL does not provide that rule.

Verus form
Inference: use a Verus `invariant` declaration on a `while` loop for the loop relation, and prove the probabilistic invariant as a ghost lemma. Do not write `invariant(...)` as a function call. For a statically bounded loop, a decreasing counter and an induction lemma can reproduce the paper’s repeated unrolling. For an unbounded loop, pDL’s single-unrolling rule is insufficient to establish termination or a limiting probability; Verus also requires explicit termination reasoning or a suitable non-terminating specification.

## technique: pure-probability and deterministic simplifications

The paper proves that fixing a policy turns pGCL into a purely probabilistic program and obtains deterministic simplifications for pDL (Section 8, pp. 12–13). The lower-bound semantics handles demonic choice by requiring the bound under every policy; once a policy is fixed, the expectation is taken over ordinary probabilistic paths. The resulting rules let an analyst replace a demonic branch with a minimum of branch guarantees and calculate exact probabilities for finite paths.

Inference: the analogous Verus model should separate an adversarial transition relation from a finite probability distribution. Prove a worst-case bound over all policy choices first; then prove a weighted sum for the fixed-policy model. Collapsing these two quantifiers would make the product specification weaker than pDL’s semantics.

## worked technique: Monty Hall calculation

The Monty Hall program has nondeterministic prize placement, a uniformly distributed contestant choice, nondeterministic host choice when two doors are available, and a switch strategy (Listing 1.1, p. 13). The specification for switching is `ε[switch↦true] |= [Monty_Hall]p(choice = prize)` (Section 9.1, p. 14).

The paper applies the rules as follows:
1. Use the demonic-choice rule twice to set `p = min(p0,p1,p2)` for the three possible prize locations (Section 9.1, p. 14).
2. Use the probabilistic-choice rule to split the contestant’s three-way choice into probabilities `1/3`, `1/3`, and `1/3` (Section 9.1, p. 14).
3. For the branch where prize and choice are both door 1, use the conditional rule and demonic host choice; switching then makes the postcondition false on both host branches, so the branch probability is zero (Section 9.1, pp. 14–15).
4. For the other two choices, the postcondition holds, giving branch probabilities one. The paper computes `p1 = 1/3·1 + 2/3·1/2·0 + 2/3·1/2·1 = 2/3`, and obtains the same value for each prize location (Section 9.1, p. 15).

The conclusion is bounded and exact for this model: “we have proven that switching door maximizes the probability of winning the prize.” (Section 9.1, p. 15.) Inference: a Verus proof would need a finite three-door datatype, explicit uniform weights, and a lemma that the host’s nondeterministic choices preserve the lower bound.

## worked technique: bounded Bernoulli convergence

The Bernoulli program repeats `s := 0 µ⊕ s := 1` for `n` iterations and increments a counter. The specification is `ε |= [Bernoulli]p(|c/n − µ| > δ)` (Section 9.2, p. 16). The authors first replace the bounded loop by a sequence of `n` bodies using repeated loop unfolding. They then calculate each path probability: a path with `i` zero outcomes and `j` one outcomes has probability `µ^i(1−µ)^j` (Section 9.2, pp. 16–17). Summing paths that satisfy the error predicate gives `p`; there are `2^n` paths, and the binary representation of the path index enumerates them (Section 9.2, p. 17).

For the displayed experiment, `µ=0.5`, `δ∈{0.1,0.2,0.4}`, and at most 20 samples (Figure 3, p. 17). The text reports that with 20 iterations the probability of error greater than 0.2 is below 5%, while error greater than 0.1 is above 20% (Section 9.2, p. 17). The denominators are the complete `2^n` path space for each fixed `n` and parameter setting; the paper does not report confidence intervals or repeated Monte Carlo runs.

Inference: in Verus, encode the finite path space as a ghost recursive function or finite sequence and prove the weighted-sum recurrence. A direct executable enumeration costs `2^n`; a scalable proof would need a separately proved binomial identity or concentration bound. The paper’s exact path sum is therefore a specification oracle, not automatically an efficient Rust algorithm.

## what is proved, trusted, and left open

The paper defines model-theoretic semantics and proves sound algebraic properties and rules for its pDL model. It does not implement a complete proof system; the conclusion says pDL is a “step toward” mechanical verification and lists proof rules as future work (Section 10, p. 18). The semantics assumes valid pGCL expressions, almost-sure termination, an MDP transition model, and correct interpretation of expectations. The correctness of a real random-number generator, scheduler, floating-point arithmetic, and source-to-MDP translation remains outside the model.

Inference: the threat to a product that emits agent-written verified Rust is low for ordinary deterministic data structures and moderate for randomized components. pDL gives a precise vocabulary for probabilities and adversarial choices, but its loop reasoning is intentionally weak and its proof system is unfinished. A VL integration would need a trusted probabilistic model plus Verus lemmas connecting that model to executable Rust. The paper does not address memory safety, ownership, concurrency implementation, or LLM-generated proofs.

Inference: VL should not redo the basic p-box syntax, MDP semantics, branch expectation rules, sequencing rule, or Monty Hall/Bernoulli demonstrations as new ideas. A useful new contribution would be a verified Rust library that refines finite pDL models, proves the random-source assumptions, and measures proof and runtime overhead.

## techniques for the catalog

- p-box probability contracts: specify a lower bound on the postcondition expectation of a probabilistic program
- demonic/probabilistic choice rules: combine worst-case branch bounds by minimum and random branch bounds by weighted sum
- backward expectation sequencing: propagate a postcondition bound through preceding program fragments using MDP expectations
- bounded-loop path expansion: unroll a fixed iteration count and sum weighted paths satisfying a quantitative predicate
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
