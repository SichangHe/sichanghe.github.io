# CertRL: Formalizing Convergence Proofs for Value and Policy Iteration in Coq
(authored by agents unless marked 🧑)
Tag: `vajjha2021certrl`, [paper](https://arxiv.org/abs/2009.11403)

## result and scope
CertRL is a Coq library that formalizes convergence of value iteration and policy iteration for finite-state, infinite-horizon discounted Markov decision processes (MDPs) with deterministic stationary policies. The abstract states, “The central results are a formalization of the Bellman optimality principle and its proof, which uses a contraction property of Bellman optimality operator to establish that a sequence converges in the infinite horizon limit.” (abstract, p. 1)

The development replaces stochastic matrices with a finitary Giry monad and replaces repeated epsilon arguments with metric and contraction coinduction. The authors summarize, “CertRL obviates these challenges using a combination of the Giry monad [Gir82, Jac18] and a proof technique called Metric coinduction [Koz07].” (section 1, p. 2)

## technique: finitary Giry monad and Kleisli composition
what it is
A finitely supported probability mass function is a list of outcomes and nonnegative probabilities summing to one. `ret` creates a point mass; `bind` sequences probabilistic computations. Kleisli composition of transition arrows reproduces Chapman–Kolmogorov without matrix multiplication.

when to use it
Use this representation when a finite stochastic process is easier to compose as probability-valued functions than as matrices, and when proofs should follow the process structure.

how to do it
1. Define `Pmf A` with an outcomes list and a `sum1` proof that probabilities sum to 1 (section 2.4, p. 8).
2. Define `ret` and `bind`; prove the three monad laws (section 2.4, p. 8).
3. For a transition rule `f : A → P(B)` and successor rule `g : B → P(C)`, define Kleisli composition as `λx, bind (f x) g` (section 2.4.1, p. 9).
4. Instantiate an MDP transition under policy π as `Tπ : S → P(S)` and iterate it with Kleisli composition (section 3.1.2, pp. 10–11).
5. Define expected rewards and long-term discounted values over these iterates (section 3.1.3, pp. 11–12).

Verus form
Inference: Represent finite distributions as ghost maps or sequences with nonnegativity and sum-to-one predicates. Use `spec fn` for `ret`, `bind`, and Kleisli composition; prove monad laws with `proof fn`. State executable transition code's relation to the ghost distribution with `ensures`. Verus has no built-in Giry monad, so this library would be new specification infrastructure.

evidence and limits
The paper says, “This obviates the need for reasoning about operators on linear vector spaces, thereby substantially simplifying the formalization effort.” (section 2.4.1, p. 9) The formalization assumes finite support, finite state/action types, deterministic stationary policies in the infinite-horizon development, and a discount factor below one (section 3.1, p. 10; Definition 9, p. 11). The paper leaves matrix-based implementations to future extension: “Extending CertRL with correctness theorems for algorithms that use matrix operations requires nothing more than a proof that the relevant matrix operations satisfy the definition of Kleisli composition.” (section 3.5.1, p. 16)

## technique: metric and contraction coinduction
what it is
Banach's fixed-point theorem is restated as an inductive proof rule. To show a closed property φ of a fixed point, prove φ for an initial point and show one application of a contraction preserves φ. In an ordered metric space, contraction coinduction proves inequalities to or from the fixed point.

when to use it
Use this when an iterative algorithm converges to a unique fixed point and the desired property is closed and preserved by one iteration.

how to do it
1. Build a complete metric space and define a contraction F with constant γ<1 (section 2.2, p. 6).
2. Define closed predicates as Coq `X → Prop` ensembles (section 2.2, p. 5).
3. Prove the initial predicate and one-step preservation; apply `metric_coinduction` to conclude it at `fixpt F init` (section 2.2, pp. 6–7).
4. Add a pointwise order and prove the lower/upper sets are closed to obtain contraction coinduction (section 2.2, Definition 4 and Theorem 5; section 2.3; p. 7).
5. Instantiate the space of functions `A → R` with the L∞ norm, completeness, and pointwise order for finite A (section 2.3, p. 7).

Verus form
Inference: Encode function spaces and norms in ghost/spec code. State contraction, closedness, and one-step preservation as `requires`; prove fixed-point properties with recursive `proof fn` lemmas and explicit `decreases` arguments. Verus's solver will need supplied real-analysis lemmas; it cannot be assumed to derive Banach's theorem.

evidence and limits
The paper provides a Coq theorem snippet for `metric_coinduction` and states that coinduction avoids low-level ε–δ reasoning (sections 2.2 and 3.5.2, pp. 6–7 and 16) and compares a Coq proof of Theorem 15 with an English proof of roughly equal length (Table 1, p. 17). No benchmark denominator is given for proof length or speed. The paper says, “Our formalization of the proof of closedness for these sets relies on classical reasoning. Additionally, we rely on functional extensionality to reason about equality between functions.” (section 2.3, p. 7) Inference: the imported Banach theorem and completeness results are also library foundations that the proofs depend on.

## technique: Bellman optimality through contraction
what it is
The Bellman operator maps a value function to one-step reward plus discounted expected successor value. For a finite MDP it is a contraction in the L∞ norm. Its unique fixed point is shown to equal the optimal value by comparing every policy and then the greedy policy using contraction coinduction.

when to use it
Use this pattern for dynamic-programming algorithms whose update operator is monotone, contractive, and has an optimal fixed point.

how to do it
1. Define MDP states, dependent finite action types, transition distributions, rewards, and stationary policies (section 3.1.1, p. 10).
2. Define the policy Bellman operator and prove it is a contraction and order-preserving (Theorem 11, section 3.1.3, pp. 11–12).
3. Define the optimality operator as the pointwise maximum over actions and prove contraction and monotonicity (Definition 12 and Theorem 13, section 3.2, p. 12).
4. Use contraction coinduction to prove every policy value is ≤ the optimal operator's fixed point (Theorem 14, section 3.2, p. 13).
5. Define the greedy policy and use coinduction in the opposite direction to prove its value equals the fixed point; conclude optimality (Theorem 15, section 3.2, p. 13).
6. Define value iteration as repeated optimality-operator application and invoke Banach convergence (section 3.2, p. 13).

Verus form
Inference: Model values as ghost finite maps and Bellman updates as `spec fn`s. Use `ensures` for monotonicity and contraction inequalities and `proof fn` lemmas for greedy argmax and fixed-point equality. Executable iteration can carry a loop invariant relating the current value to the abstract operator; do not encode proof functions as runtime calls.

evidence and limits
The paper reasons over Coq reals and finite state and action types. Inference: it has no treatment of floating-point error or of extracting policies from executable code; I found no mention of floating point in the paper text.

## technique: policy improvement and finite-horizon induction
what it is
Policy iteration alternates evaluating a policy's value and selecting a greedy (improved) policy. A separate finite-horizon theorem proves n-step optimal values by induction with the Bellman operator, without assuming the optimal policy is stationary (section 3.4, p. 14).

when to use it
Use policy improvement when a monotone update can be shown to increase value; use finite-horizon induction when an implementation has a hard iteration cutoff.

how to do it
1. Define `Qπ(s, a) := r̄(s, a) + γ E_{T(s,a)}[Vπ]` and an improved policy τ of σ as `τ(s) = argmax_a Qσ(s, a)` (section 3.3, pp. 13–14, Definition 16).
2. Prove the policy improvement theorem: if `Bτ Vσ ≥ Bσ Vσ` then `Vτ ≥ Vσ` (Theorem 17); then prove that an improved policy has value at least as high (Theorem 18) (section 3.3, p. 14).
3. Iterate evaluation and improvement, stopping when `Vπn = Vπn+1`; since the set of policies is finite, the sequence of policies stabilizes and the algorithm terminates (section 3.3, pp. 13–14).
4. For finite sequences of decision rules, define n-step expected value by Kleisli iterates and the recursion (28) (section 3.4, pp. 14–15).
5. Show `V̂*_{n+1} = B̂ V̂*_{n}`; the paper derives this from (28)–(31) and identifies the recursion with value iteration (Theorem 20, section 3.4, p. 15).

Verus form
Inference: Encode policy/value relations as ghost predicates and state improvement as `ensures` pointwise inequality. Use a loop invariant for policy iteration's monotonic value and a `decreases` measure for finite-horizon recursion. The exact real-valued proof remains specification code.

evidence and limits
The paper states the finite-horizon theorem for every finite n (Theorem 20, p. 15), while infinite-horizon convergence uses contraction. Section 3.3 shows that policy iteration produces improving policies and terminates; I did not find in the text a proof that the final stable policy is optimal, although the list of main results in section 3 (p. 9) states that the policy sequence converges to a global optimum. The paper does not report counts of iterations, states, or policies in experiments because this is a library formalization, not an empirical algorithm evaluation.

## what is proved, trusted, and relevant to VL
The paper reports formalized MDP definitions, Giry monad laws, Bellman operator properties, value-iteration convergence, the policy improvement theorem, and finite-horizon optimality; the text presents policy-iteration termination (section 3.3) while the list of results (section 3, p. 9) also claims policy-iteration convergence to a global optimum. The development builds on Coquelicot and the Banach fixed-point proof of Boldo et al. (section 4, p. 18). Inference: these libraries, Coq, and the formalized MDP definitions are the trusted base. The assumptions are finite state/action types (mechanized as surjective finiteness with decidable equality, footnote 2, p. 10), rewards bounded because the spaces are finite (p. 10), discount 0 ≤ γ < 1, and deterministic stationary policies in the infinite-horizon part.

Inference: The threat to agent-written verified Rust is substantial for RL components: an implementation can satisfy safety constraints while lacking convergence guarantees, exactly the gap the paper identifies. The reusable lesson is to make the abstract transition/value model explicit and connect implementation updates to it with contracts. VL should reuse contraction-coinduction and monadic transition specifications where applicable; it should not redo CertRL's finite MDP library without a concrete RL component.

## techniques for the catalog
- finitary Giry monad — represent finite stochastic transitions with probability-valued functions
- Kleisli composition — compose MDP transitions without matrix algebra
- contraction coinduction — prove fixed-point inequalities from closed one-step invariants
- Bellman fixed-point proof — derive value and policy optimality from contraction and monotonicity
- finite-horizon induction — establish n-step optimality through Bellman recursion
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Kleisli composition provides an alternative and more elegant mechanism for reasoning about compositions of probabilistic choices."): read the whole paper text (arXiv v2, 18 pages plus references) and checked every quotation, theorem and section reference, page number (PDF page numbers, 1 to 18) and each how-to step against it; changed the link to the arXiv page printed in the paper text, restored the omitted citations inside the section 1 quote, corrected page references throughout, corrected the policy-improvement steps (Definition 16, Theorems 17 and 18, stopping test), narrowed the policy-iteration claim to what the text shows, and marked trusted-base and floating-point remarks as inferences; did not check the Coq development at https://github.com/IBM/FormalML, the cited works, or the Verus-form inferences, which are the author's design suggestions, and did not verify the year 2021 (the paper text shows the arXiv v2 date of 15 Dec 2020).
