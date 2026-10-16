# A Probabilistic Separation Logic
(authored by agents unless marked 🧑)
Tag: `barthe2020probabilistic`, [paper](http://arxiv.org/abs/1907.10708v4)

## purpose and model
The paper introduces PSL, a program logic for probabilistic programs in which separating conjunction represents probabilistic independence. The abstract states: “We propose a probabilistic separation logic PSL, where separation models probabilistic independence.” It gives a resource semantics over deterministic memories paired with distributions of randomized memories. A configuration combines when deterministic memories agree on overlap and randomized-variable domains are disjoint; the randomized parts combine by the product distribution. The central assertion `ϕ * ψ` therefore means that the state can be split into independent factors satisfying `ϕ` and `ψ` (Section 3.2, pp. 7–9).

The motivation is operational: fresh samples create independent variables, local updates preserve independence from untouched variables, and conditioning on an independent guard preserves facts about the other variables. The authors state: “Independence is preserved under local modifications.” They also warn that syntactic separation is insufficient after conditioning: in Example 1, independent fair bits `x` and `y` become correlated after conditioning on `z = x ∨ y` being true (Section 4.3, pp. 11–12).

## technique 1: encode independence as probabilistic BI

What it is. Start with BI formulas (`∧`, `∨`, implication, separating conjunction `*`, and magic wand), but interpret worlds as program configurations. Atomic assertions include uniformity `U_S[e_r]`, randomized-expression equality `e_r ~ e'_r`, and deterministic equalities/inequalities. The product operation uses independent distribution products. Definition 4 interprets `U_S[e_r]` as assigning probability `1/|S|` to every value in a finite set; `e_r ~ e'_r` requires equal distributions on the support of the current memory.

How to apply it.

1. Classify program state into deterministic variables and randomized variables (Sections 2.2 and 3.2).
2. Give each randomized expression a distribution and each assertion a footprint of free variables; validity depends only on the projected distribution over that footprint (Lemma 1, “Restriction”).
3. Use `U[e]` for uniformity, `e ~ e'` for distribution equality, and `D[e]` as shorthand for self-distribution (Section 3.2).
4. Write `ϕ * ψ` when the memory can be factored into disjoint variable sets whose distributions are independent; use ordinary conjunction when independence is not claimed. The paper explicitly distinguishes `U[x] ∧ U[y]` (possibly correlated) from `U[x] * U[y]` (independent), Section 3.4.
5. Apply the paper's valid axioms for symmetry/transitivity and uniformity (Lemma 3 and Lemma 4), plus Restriction and Extrusion when moving deterministic or footprint facts across `*`.

Inference: in Verus, the corresponding design is a ghost probability model and predicates/specification functions describing finite distributions, with proof lemmas for product, projection, conditioning, and uniformity. Inference: Verus's ordinary ownership separation is about resources and aliases, so it cannot by itself mean probabilistic independence; an explicit probabilistic model and contracts are required. Inference: PSL's BI connectives would be represented by ghost predicates and `proof fn`s rather than new executable Rust syntax.

Evidence and assumptions. The paper proves its probabilistic configuration structure is a Kripke resource monoid (Definition 3) and proves sound axioms including Restriction, Extrusion, and weakening. The semantics assumes countable values and discrete distributions; uniformity is over a nonempty finite set. The logic is intuitionistic under its nontrivial world order, and the authors leave a classical probabilistic BI variant for future work (Section 3.4).

## technique 2: use PSL proof rules for randomized code

What it is. PSL judgments have the form `{ϕ} c {ψ}`. Deterministic assignments, sequencing, conditionals, and loops use Hoare-style rules. Randomized assignment uses `RAssn`: if the expression does not mention the destination, `{⊤} x_r ← e_r {x_r ~ e_r}`. Uniform sampling uses `RSamp`: `{⊤} x_r ←$ U_S {U[x_r]}`. The paper states: “Both rules are presented in their ‘local’ form, where the pre-condition is trivial.”

How to apply it.

1. Prove local facts for each random assignment or sample using RAssn or RSamp (Figure 3, p. 11).
2. For deterministic code, use DAssn, DCond, DLoop, sequencing, and the derived DFor rule with the loop invariant substituted at each iteration (Figure 2 and Section 4.2).
3. For a randomized conditional, use RDCond only when the guard's truth value is covered by the precondition; use RCond when the guard is separated from the rest of the precondition as `ϕ * D[b]`, branch proofs preserve the guard, and the postcondition is supported (SP) (Figure 3, Definition 6).
4. Use Weak, True, Conj, Case, and RCase to combine branch proofs. Use Const when a fact mentions no possibly modified variable.
5. Use Frame to carry an independent fact through a command. Check its side conditions: the frame mentions no modified variable; the postcondition mentions only the input footprint and command-written variables; and the input footprint includes variables read by the command (Figure 4 and the discussion on pp. 12–13).
6. Derive global sampling, for example `{ϕ} x_r ←$ U_S {ϕ * U[x_r]}` when `x_r` is absent from `ϕ`, using Frame (Example 4).

The key guard condition is substantive. The paper explains: “This separation is crucial for ϕ to be soundly used as a pre-condition in each branch.” It gives a counterexample where `D[x]` is not a supported postcondition because it holds in incomparable point distributions; allowing it in RCond would be unsound (Example 2, pp. 11–12).

Inference: a Verus encoding would put executable sampling and branch code in Rust, model random choices with ghost values or a finite sampler contract, and use `requires`/`ensures`, loop `invariant`, `assert`, and `proof fn` lemmas for the PSL rules. Inference: the SP and Frame side conditions must be stated as explicit ghost predicates; Verus will not infer distribution independence from variable non-aliasing. Inference: if randomness comes from an external RNG, its distribution contract remains trusted unless separately verified.

Evidence. Theorem 2 states: “If ⊢ {ϕ} c {ψ } is derivable, then it is valid: |= {ϕ} c {ψ }.” The proof is a metatheoretic soundness result for the rules, not an implementation test. The logic's completeness is limited: the authors say the atomic axioms are not complete, the randomized conditional rules are incomplete, and several cryptographic examples rely on a restricted language.

## technique 3: prove information-theoretic security by uniformity or input independence

What it is. The examples encode a cryptographic protocol as a probabilistic program and prove either that the observer's view is uniform regardless of a secret input (uniformity/non-interference) or that the view is probabilistically independent of the input. The abstract lists private information retrieval, oblivious transfer, secure three-party addition, and simple oblivious RAM.

How to apply it.

1. Model the protocol as a program whose private and public inputs and observer view are explicit variables (Section 1.2).
2. Choose the target: uniformity `U[view]`, or independence between `view` and secret (Definitions 8 and 9, Section 5).
3. Annotate every fresh random value with `U`; preserve independent components with Frame and structural rules.
4. For PIR and secure addition, prove each server's/party's observed shares are uniform or independent, then compose the array/tuple facts with separating conjunction. For ORAM, compile the high-level operations to the pWhile core and prove the leakage sequence uniform for every program length (Section 5.5).
5. Conclude the security definition from the proved uniformity or independence postcondition. The ORAM proof reduces security to uniform leakage and independence from initial memory (Section 5.5.2).

Inference: in Verus, this pattern can verify a finite-state cryptographic protocol's distributional contracts, but it needs ghost distributions and explicit finite-domain lemmas. Inference: it is suitable for proving information-theoretic properties of a verified Rust implementation only when the executable protocol, sampler, and leakage model are connected by contracts.

## what is proved, measured, and trusted
The paper proves semantic soundness of PSL and derives security proofs for four classes of constructions; it reports no runtime benchmark or denominator-based empirical success rate. Trusted elements include the mathematical distribution model, the pWhile operational semantics, finite-domain arithmetic, protocol encodings, and the correctness of any cryptographic abstraction. Inference: a Verus product inherits the gap between a proof of a distributional specification and the real RNG, machine arithmetic, compiler, and side-channel behavior unless those are modeled and verified. Inference: the threat to agent-written verified Rust is high for randomized cryptographic code when independence or leakage is a required property, because ordinary functional postconditions do not express it; PSL supplies a design vocabulary but not a drop-in Verus library.

The paper's limits include incomplete conditional rules, non-complete atomic axioms, finite uniformity assumptions, and a simple probabilistic language. Inference: VL should reuse the guard-separation and Frame side conditions rather than redo the basic soundness theory; new work should connect these abstractions to concrete Rust RNG and memory models.

## techniques for the catalog
- probabilistic BI model: interpret separating conjunction as factorization into independent distributions over disjoint randomized variables
- PSL randomized rules: verify sampling, randomized assignment, conditioning, and framing with independence side conditions
- security by distributional postconditions: prove cryptographic uniformity or input independence and derive information-theoretic security
- supported assertions: restrict randomized conditional postconditions to SP formulas so conditioning remains sound
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
