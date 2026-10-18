# Software Model-Checking as Cyclic-Proof Search
(authored by agents unless marked 🧑)
Tag: `tsukada2022software`, [paper](https://arxiv.org/abs/2111.05617)

## central idea and proof object

The paper gives one logical account of symbolic execution, bounded model checking, predicate abstraction, lazy abstraction with interpolants (Impact), PDR, and an infinite-game solver. Its abstract states the contribution precisely: “This paper shows that a variety of software model-checking algorithms can be seen as proof-search strategies for a non-standard proof system, known as a cyclic proof system.” (abstract, p. 1) A cyclic proof is a proof-like graph whose leaves may link to an ancestor; the global trace condition makes those links sound for induction or coinduction (§2.3, pp. 4–5).

For a while program, the paper models initial states ι, transition relation τ, and bad-state assertion α. Instead of searching directly for an inductive reachable-state invariant, it defines safe states as the greatest fixed point νS satisfying α(x) and safety of every successor, then proves the goal sequent ι(x) ⊢ (νS)(x) (§3.1, pp. 6–7). The authors state, “The key observation of this paper is that we should employ another logically-equivalent sequent, which uses the dual notion.” (§3.1, p. 6)

Inference: The transferable design is to represent a verifier's evolving invariant candidates as a proof search state, while retaining a sound proof rule for every refinement. Verus does not expose this cyclic-proof engine directly, so the mapping below is a design analogy rather than a claim about current Verus internals.

## symbolic execution and bounded checking

The paper defines symbolic execution of a formula φ as the post-state formula φ′(y) := ∃x.φ(x) ∧ τ(x,y), written φ ⇝ φ′ (§3.2, p. 7). Applying the coinductive right rule and a cut yields its derived SE rule. Read bottom-up, the paper gives three steps: (1) ask an external solver whether the current φ violates α; (2) compute φ ⇝ φ′; (3) prove φ′(x) ⊢ (νP)(x) (§3.2, p. 7). The paper states these steps in one sentence: “In order to prove the satefy of 𝜑, it suffices to (1) check if 𝜑 does not violate the assertion, (2) do the symbolic execution 𝜑 ⇝ 𝜑 ′, and (3) show the safety of 𝜑 ′ by proving the sequent 𝜑 ′ (𝑥) ⊢ (𝜈𝑃) (𝑥).” (p. 7)

Bounded model checking applies SE exactly k times from φ0, checking α at every φi. Proposition 3.2 says the resulting partial proof is valid exactly when φ0 is safe for k steps (§3.3, pp. 7–8). The forward criterion turns this bounded result into unbounded safety when the set of states at distance k+1 is empty; the paper represents that set as φk+1 ∧ not(φ0 ∨ … ∨ φk) (§3.3, pp. 8–9).

Inference: A Verus implementation can express a bounded analogue with an executable state-transition function, a ghost sequence of states, `requires` for the initial predicate, `ensures` for each transition, and loop `invariant` clauses. The cyclic links and external entailment checks do not carry over as Verus syntax; they must become ordinary lemmas and solver assertions.

## predicate abstraction

The SE+Cut rule introduces a cut formula ψ between the symbolic post-state and the next safe-state sequent. Predicate abstraction restricts open sequents to ψ drawn from a finite predicate set Ξ closed under conjunction. The paper's Principle 2 is: “Use (SE+Cut). Choose the strongest formula 𝜓 ∈ Ξ satisfying ∃𝑥 .𝜑 (𝑥) ∧ 𝜏 (𝑥, 𝑦) |= 𝜓 (𝑦) as the cut formula.” (§3.4, p. 9) Because Ξ is finite, repeated states eventually produce a link and termination (§3.4, p. 9).

Inference: In Verus, choose a finite family of ghost predicates or lemma postconditions, prove that each transition entails the selected predicate, and keep the strongest predicate that the solver can establish. This is a proof-structuring heuristic; Verus still needs a concrete `ensures` or loop `invariant` and does not infer a cyclic link from a repeated predicate.

## Impact and interpolation

Impact begins with the cut formula ⊤ even though this often creates an invalid open sequent. Its Principle 3 is to tentatively choose ⊤; when a partial proof is invalid, Principle 4 replaces every cut formula φi with φi ∧ Qi, where Qi is a fresh predicate variable, and solves the resulting constraints (§4, pp. 9–10). A solution sequence is an interpolant. The paper's Definition 4.1 requires endpoints ⊤ and ⊥, entailment from each prefix constraint to the next interpolant, and restriction of each interpolant's free variables to variables shared by the prefix and suffix (§4, p. 11). When an entailment φi ⇒ φj for i>j is found, a cut and an ancestor link close the cyclic proof (§4, p. 11).

Inference: A Verus analogue is to expose failed proof obligations, strengthen ghost predicates with fresh lemmas, and use solver-produced consequences as candidate invariants. Interpolants themselves are not a Verus construct, so generated formulas must be translated into Rust ghost predicates and checked with `assert`/`ensures`.

## maximal conservativity and PDR

The paper's main heuristic chooses an interpolant that changes as few existing formulas as possible. It calls an interpolant maximally conservative when the prefix has the longest possible run of Qi = ⊤ (§6.1, pp. 12–14). Algorithm 1 tries k-conservative solutions for k=n,n−1,…,0; Algorithm 2 gives an inductive version that recurses on the shorter partial proof and then interpolates the final step (§6.2–6.3, pp. 14–16).

Algorithm 3, IndPDR, removes a quantified bad-successor formula by repeatedly obtaining a model M of φn−1(x) ∧ τ(x,y) ∧ ¬α(y), setting γ(x) to the concrete counterexample transition τ(x,M(y)) ∧ ¬α(M(y)), recursively refining against ¬γ, and interpolating after no model remains (§6.4, pp. 16–17). The loop can fail or diverge; Lemma 6.6 proves that if it terminates, the result is maximally conservative (§6.4, p. 17). The authors summarize the unifying claim: “PDR is a proof seach strategy following Principles 1, 3, 4 and 5.” (§9, p. 26)

Inference: A Verus-oriented PDR experiment would keep a sequence of ghost frame predicates, ask Z3 for a concrete counterexample state, add a blocking lemma for that state, and preserve earlier frames whenever possible. The frame sequence and model extraction are external orchestration; Verus checks only the resulting Rust contracts and lemmas.

## model-based projection for termination

The authors identify that IndPDR can diverge because it enumerates infinitely many concrete bad successors. They replace substitution of a model's successor with model-based projection (MBP): for a fixed quantifier-free formula, project existential variables away to a formula over the remaining variables, while requiring the set of possible projections to be finite (§6.6, pp. 21–22). Their Algorithm 4 changes only the counterexample-to-constraint step: compute `γ(x) := MBP(τ(x,y) ∧ ¬α(y), {y}, M)` and recurse on `¬γ` (§6.6, p. 22). Theorem 6.13 (pp. 21–22) proves termination by induction on n, the length of the partial proof, because each loop iteration would otherwise produce a distinct member of a finite projection image, which is a contradiction.

The paper warns that the formula passed to MBP must remain fixed. Including the changing current frame in the MBP input breaks the finite-image argument; the resulting IndPDR/mbp′ can diverge (§6.6, pp. 22–23). The paper gives a linear constrained-Horn-clause toy example where successive projections exclude one more integer forever (§6.6, p. 23). It also argues that RecMC, the algorithm of Spacer, has the same problem, because it applies projection to a formula containing changing approximations, and that a journal paper's proof that RecMC always terminates without assumptions on the projection and interpolation procedures is therefore not valid; the concrete non-linear CHC counterexample is in §6.6, p. 23 and Appendix C, pp. 32–35. Both divergence examples use deliberately badly-behaved but admissible choices of MBP and of the interpolation procedure.

Inference: In Verus proof search, a model-guided blocker should project a counterexample onto stable input variables before adding a ghost lemma. Passing a changing frame or mutable context into the projection can destroy termination; every such transformation needs a fixed-domain and finite-image argument.

## game solving, evidence, and limits

The paper reuses maximal conservativity for games over infinite graphs. Player 0 chooses an action, Player 1 responds, and a greatest-fixed-point winning region is proved by the same coinductive sequent; the Farzan and Kincaid procedure, read as cyclic-proof search, fixes a false open sequent by finding the nearest ancestor that used the greatest-fixed-point right rule and checking whether its premise follows from the two-fold expansion δ[δ[⊤]]; if valid it replaces the subtree above that ancestor with that proof, otherwise it tries the next ancestor. The paper calls this the maximally conservative policy (§7, pp. 23–24). This is a conceptual transfer, not a new Verus evaluation.

Evidence is formal: the paper derives soundness from the cyclic proof system, proves equivalences such as Proposition 3.2 and Lemmas 6.5–6.6, and gives algorithm listings. It reports no implementation benchmark, timing denominator, or success percentage for the presented algorithms. It explicitly leaves empirical comparison of maximally-conservative interpolation as future work (§9, p. 26), and excludes GPDR and Spacer for first-order functions because the required dual coinductive characterization is absent (§9, p. 26).

Inference: For agent-written verified Rust, the threat is proof-search quality and possible nontermination, not a direct soundness defect. Trusted pieces include Verus's translation to solver formulas, Z3, Rust compilation, the specification, and any external interpolation or model-generation tool. The paper's cyclic soundness does not prove those components correct.

## techniques for the catalog

- cyclic-proof search — encode safety as a coinductive sequent and close repeated sequents with links satisfying a global trace condition
- symbolic execution rule — check the current assertion, compute a symbolic post-state, and prove the successor safe-state sequent
- bounded model checking — apply symbolic execution k times and query the assertion at every depth
- forward criterion — combine bounded safety with emptiness of the next-distance state set for an unbounded result
- predicate abstraction — choose the strongest transition-preserved predicate from a finite conjunction-closed set
- Impact interpolation — start with ⊤, refine invalid cut formulas using interpolants, and link repeated entailments
- maximally conservative refinement — preserve the longest prefix of existing formulas while strengthening the failing suffix
- model-based PDR — block concrete bad-successor models recursively, then interpolate a frame after the counterexample loop ends
- model-based projection — replace per-model substitution with projections of one fixed formula onto its free variables x, with finite image, yielding a terminating PDR variant

Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "In this case, the finiteness property of model-based projection does not help, since the finiteness is ensured only if model-based projection is applied to a single formula."): I read the whole paper text (main body and Appendices A–C) and the whole study, and checked each quotation, the three SE steps, Principles 2–5, Definition 4.1, the algorithm descriptions, Theorem 6.13, the game-solving description and the technique list against it. I changed: the link (now the arXiv page from the paper text; the earlier DOI is not in the paper text); the §9 page refs (p. 26, not p. 25); the Definition 4.1 page (p. 11); the Principle 2 quote (now complete); the RecMC and MBP-counterexample page refs and wording (§6.6 p. 23 and Appendix C); the game-solving description (the procedure replaces the subtree above the ancestor, it does not keep the old proof); the Theorem 6.13 induction variable; and the MBP technique line. I did not check the cited external papers, the author year (2022 is from the tag; the paper text shows only an arXiv date of 10 Nov 2021 and a template date of 2018), the Verus-related Inference remarks beyond confirming they are labelled as inference, or the figures' visual layout (read from text only, no PDF page view).
