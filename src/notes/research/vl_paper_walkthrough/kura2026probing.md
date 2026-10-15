# Formal Verification of Probing Security via Conditional Independence
(authored by agents unless marked 🧑)
Tag: `kura2026probing`, [paper](http://arxiv.org/abs/2605.23316v2)

This paper recasts simulator-based probing security as conditional independence and verifies it in Lilac, a probabilistic separation logic. The main theorem connects an algorithm's simulator to a Lilac Hoare triple, then additional rules support masked refresh, noise addition, loops, and multiplication. The abstract states: “By establishing a connection between noninterference and conditional independence, we show how noninterference can be verified using Lilac, a separation logic for conditional independence.” (Abstract, PDF p. 1). The method targets information-theoretic masked algorithms, not ordinary memory safety.

## technique: simulator-to-conditional-independence reduction

What it is. Let A be secret input, B public input, and C observed output. A simulator that computes C from B alone exists exactly when `A ⟂ C | B`, or equivalently `Pr[C|A,B] = Pr[C|B]`. Lilac models random variables as owned resources; separating conjunction expresses probabilistic independence. The paper's canonical triple is `{own M} OTP(M) {C. own M ∗ own C}` (Section II-A, PDF p. 2).

How to apply it. (1) Expose secret, public, and observed variables. (2) Write the simulator-based security definition. (3) Translate it to conditional independence. (4) State a Lilac precondition owning all inputs and a postcondition that separates the non-secret inputs from observed outputs under a conditioning modality. (5) Prove the Hoare triple with Lilac's entailment, ownership, uniform-bijection, frame, and consequence rules. (6) Recover a simulator from the conditional-independence proof, or show a simulator implies the triple.

Verus form. Inference: model distributions and ownership as ghost state; define a `spec fn` conditional-independence predicate and use `requires`/`ensures` on proof functions. Inference: Verus's ownership system can express exclusive access, but it does not provide Lilac's probability-space disintegration or separating conjunction for random variables. A verified Rust implementation therefore needs a separately justified probabilistic model and lemmas connecting random sampling to it.

Evidence and limits. Theorem V.1 proves equivalence between the Lilac triple and existence of a simulator (PDF pp. 5–6). The paper emphasizes measure-theoretic work because Lilac uses independent combination and disintegration rather than a simple product-space construction. The theorem is semantic; it does not test a side channel or establish computational security.

## technique: semi-graphoid and monotonicity rules

What it is. The authors prove symmetry, decomposition, weak union, and contraction for conditional independence in Lilac. They also provide monotonicity: if a program is `(I,O)`-noninterfering, then enlarging the hidden input set and shrinking the observed output set preserves noninterference. The paper says: “In particular, we show that semi-graphoid axioms for conditional independence hold in Lilac.” (Section VI, PDF p. 6).

How to apply it. (1) Express independence with `own` and the conditioning modality. (2) Apply symmetry to swap independent groups. (3) Apply decomposition to discard components from a tuple. (4) Apply weak union to move a variable into the conditioning set. (5) Apply contraction to combine two entailments. (6) Use monotonicity to weaken a proof when a component consumes fewer inputs or exposes fewer outputs. These rules avoid reproving equivalent independence facts for every probe set.

Verus form. Inference: encode independence relations as ghost predicates and each axiom as a `proof fn` whose `ensures` gives the transformed predicate. Inference: this is a relational probability theory layer; Rust borrow separation alone cannot establish statistical independence.

Evidence and limits. Proposition VI.1 supplies the entailments and Lemma VI.4 derives the monotonicity weakening. The rules are proved in Lilac's measure semantics, while all random distributions, almost-sure equalities, and the corrected semantics of Lilac remain trusted foundations for a Verus port.

## technique: compositional noninterference for sequence and loops

What it is. If M is `(I,OM)`-NI and N is `(I∪OM,ON)`-NI, sequential composition `X←M;N` is `(I,ON)`-NI. A for-loop rule propagates per-iteration input and output slices through changing index sets. A weakening rule frames variables that are carried unchanged, even when they are not independent of the component's inputs (Section VI-D–F, PDF pp. 7–8).

How to apply it. (1) Partition inputs into secret I and non-secret remainder. (2) Prove M's post separates its observed outputs OM. (3) Feed OM into N's input set and prove N's post. (4) Apply the sequence rule to obtain the final output property. For loops, define index-dependent subsets Ii and prove the body preserves each transition from Ii to Ii+1; require initial expression variables to lie in I. For weakening, extend both hidden inputs and outputs with carried variables.

Verus form. Inference: use ghost state-machine or sequence relations for the ownership split; put each component's relational contract in `requires`/`ensures`, and prove composition with a `proof fn` lemma. Inference: loop `invariant` clauses can carry the index-dependent independence relation, but probability semantics and probe quantification remain external.

## technique: symbolic probe proofs for masked primitives

For MiniAddRepNoise, the paper uses a loop invariant `I(j;X)` recording owned inputs and equalities `X^k=V^k+ρ^k` for processed shares, then applies a frame rule and generalized weak union. Theorem VII.1 proves `(I,O)`-NI for any probe set with `|O|≤t`; Corollary VII.3 gives t-NIU (PDF pp. 8–9). For Refresh, a lexicographic `(i,j)` invariant records uniform random masks and affine equations for every intermediate share; Theorem VII.4 proves `(I,O)`-NI and Corollary VII.5 gives t-SNI (PDF pp. 9–10).

How to apply it. (1) Symbolically quantify an arbitrary probe set O rather than enumerate all sets. (2) Compute the input set I from variables that influence probed outputs. (3) State a loop invariant containing ownership, uniformity, and algebraic equalities. (4) Prove initialization. (5) Prove each random assignment preserves the invariant using uniformity and frame rules. (6) Project away unprobed internals with weak union and conclude the conditional-independence postcondition.

Verus form. Inference: represent shares, masks, and probe influence as ghost sequences or maps; state affine equations in loop `invariant`s and prove uniform-bijection facts with `proof fn` lemmas. Inference: a Verus proof can establish algebraic noninterference for a modeled sampler, but not the paper's measure-theoretic uniformity without an explicit distribution model.

## technique: compositional AddRepNoise and masked multiplication

The paper composes MiniAddRepNoise and Refresh across l variables and r repetitions using the sequence and for-loop rules. Theorem VII.6 and Corollary VII.7 establish t-SNIU for AddRepNoiseER (PDF p. 10). For SecMult, it tracks product variables, random masks Q/R/S, and a loop invariant; an `Add` operation propagates the input index sets through each random pair. Theorem VII.8 and Corollary VII.9 establish t-SNI (PDF pp. 10–11). The proof partitions random variables into KQ, KS\KQ, KC, and the remainder, then uses uniform-bijection and transfer-ownership rules to simulate probes.

Evidence and limits. These are symbolic proofs for arbitrary probe sets, not exhaustive tests. The conclusion says: “Our current results focus on the information-theoretic setting of probing security.” (Section IX, PDF p. 11). Computational security, an interactive prover implementation, and broader cryptographic applications are future work. Inference: agent-written verified Rust handling cryptographic shares faces high threat from a wrong leakage model; VL should use symbolic probe contracts as a specification layer and keep implementation, compiler, hardware, and side-channel assumptions explicit.

## what is proved, measured, and trusted

The paper proves Lilac semantic rules and four algorithmic noninterference theorems; it reports no benchmark denominator or runtime study. Trusted elements are Lilac's probability-space semantics, disintegration lemmas, random-source assumptions, arithmetic/group axioms, and faithful exposure of all internal variables. Existing masking and simulator-based verification already establish the underlying security notions, so VL should not claim novelty for generic noninterference; the transferable contribution is the conditional-independence interface and compositional proof rules.

## techniques for the catalog

- simulator-to-independence reduction — replace existence of a simulator with a conditional-independence Hoare triple
- semi-graphoid entailments — derive symmetry, decomposition, weak union, contraction, and monotonicity facts
- sequence and loop composability — propagate noninterference contracts through calls and index-dependent loops
- symbolic probe invariants — quantify arbitrary probes and track ownership, uniform masks, and affine share equations
- compositional masked primitives — combine refresh, noise addition, and multiplication proofs with uniform-bijection rules
Checked 2026-10-15 against paper kura2026probing: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
