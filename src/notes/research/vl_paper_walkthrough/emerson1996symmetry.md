# Symmetry and Model Checking
(authored by agents unless marked 🧑)
Tag: `emerson1996symmetry`, [paper](https://doi.org/10.1007/bf00625970)

## scope and result
This paper reduces model checking for concurrent systems with identical or isomorphic processes by quotienting the global transition graph under a permutation group. States in the same orbit are identified. If the group preserves both the transition structure and the specification formula, CTL* and μ-calculus truth is preserved between the original and quotient structures. The paper also gives practical ways to obtain a group from communication topology, decompose formulas, exploit state symmetry, and use an annotated quotient when formulas contain indexed propositions.

The central method is stated directly: “The basic idea underlying our method is to reduce model checking over the original structure M, to model checking over a smaller quotient structure M/G, where symmetric states are identified.” (Section 1, p. 105). A system has local process locations, shared finite-domain variables, and a finite transition relation (Section 2.1, pp. 107–108). Inference: a Verus analogue can quotient a replicated Rust protocol by a permutation action on process indices, but it must prove that the action preserves transitions and the property.

## technique 1: group-theoretic quotient model checking

What it is. Let `Aut M` be permutations of process indices that are graph automorphisms of the global structure, and `Auto f` the subgroup of permutations preserving the formula and its significant subformulas (the paper's “internal” symmetry, Section 2.6, pp. 111–112). Choose any subgroup `G ≤ Aut M ∩ Auto f`; identify states in the same G-orbit and build `M/G`. The Compression Theorem is stated for every fullpath `x`: `M,x ⊨ f` iff `M/G,x̄ ⊨ f` for CTL* (Theorem 3.3, p. 114, proof pp. 114–115); the introduction states the state form `M,s ⊨ f` iff `M/G,[s] ⊨ f` (Section 1, p. 106). The analogous result for closed μ-calculus formulas is Theorem 3.6 (p. 115, proof pp. 115–116).

How to apply it.
1. Model the concurrent program as processes `K1 … Kn`, derive its global transition structure, and identify process-index permutations that preserve transitions (Section 2.1, pp. 107–108).
2. Determine a subgroup of structure automorphisms. The paper proves that automorphisms of the process communication graph `CR` are contained in `Aut M` for normal isomorphic processes (Theorem 4.3, p. 119; “normal” processes are defined on p. 118 and require each shared variable to be shared by exactly two processes).
3. Determine `Auto f` by formula inspection and the inductive rules for CTL* or μ-calculus subformulas (Section 2.6, pp. 111–112; the paper says it “can often be determined manually by examination of the formula”, Section 1, p. 106).
4. Intersect the chosen structure group with `Auto f`; choose representatives `S` for the G-orbits and construct quotient transitions between representatives (Section 2.7, p. 112; Section 4.2, p. 120, with the incremental procedure of Figure 1).
5. Model-check the formula on the quotient. The correspondence lemma (Lemma 3.1, pp. 112–113) supplies paths in both directions, and the compression theorem supplies formula preservation (Section 3.1, pp. 112–115).

For full permutation symmetry `G=Sym[1:n]`, a system with `l` local states has about `l^n` original states and about `n^l` quotient states (Section 1, p. 106). The paper says these are orders of magnitude and that the saving is exponential when `l` is fixed and small and `n` is large (Section 1, p. 106). They are not measured counts. The paper cautions that computing maximal automorphism groups can be hard: “determination of this G seems to be a potentially difficult problem.” (Section 1, p. 106).

Verus form. Inference (none of this is in the paper): define a ghost permutation type or finite index bijection, an action on global states, and a `spec fn` stating that the permutation preserves the transition relation and initial state. Prove orbit-invariance of the property and a refinement lemma from quotient transitions to concrete transitions. For an executable Rust checker, use canonical representatives; for a proof-only certificate, quantify over permutations and representatives. Assumption, not checked here: Verus has no built-in quotient model checker, so the quotient exploration would be external and its result would need a checked transition-preservation certificate. Use `requires`, `ensures`, and loop `invariant`; keep permutation operations in specification/ghost code.

Evidence. Theorem 3.3 states the CTL* equivalence for every subgroup `G ≤ Aut M ∩ Auto f` and every fullpath (p. 114). The μ-calculus theorem states equivalence for every structure, closed formula, suitable subgroup, and state (p. 115). The paper's Section 6 example uses a complete communication graph, where `Aut M = Sym[1:n]`, and checks the quotient with representative states `(N1,N2,…,Nn)` and `(C1,N2,…,Nn)` for a mutual-exclusion program with formula `AG(∧i≠j ¬(Ci ∧ Cj))` (Section 6, pp. 127–128, Figures 2–4). It does not give runtime measurements or a denominator of benchmark instances.

Limits and trust. Compression requires the group to preserve both system and formula; the paper says that with only `Aut M` “the correspondence may not be sufficiently precise to (directly) model check a specification f” (Section 1, p. 106). Finding `Aut p` for a propositional formula `p` is co-NP-hard for universality, membership and non-triviality (Proposition 4.1, p. 117). Testing orbit equivalence `≡G` can be intractable when `G` is `Aut M` (Section 4.2, p. 120). The paper is “not fully automated” (Section 8, p. 129), and for rings (`Aut CR` is the dihedral group) it expects “much less” saving than for highly connected networks such as hypercubes (Section 8, p. 129). The structures are finite (Section 2.1). Inference: the main product threat is an unsound symmetry claim—especially treating non-identical process code, initial states, or indexed requirements as interchangeable. A Verus proof of the quotient correspondence can mitigate this, but cannot repair a formula that omits an identity-sensitive requirement.

## technique 2: formula decomposition

What it is. If a conjunction has little overall symmetry, check its constituent subformulas separately, using a larger group for each conjunct (Section 4.3, pp. 120–121). The paper's example `f = ∧i AG(Ni ⇒ AFCi)` has `Auto f = Pstab 1 ∩ … ∩ Pstab n = Id`, so no compression is possible, while each conjunct has `Auto fi = Pstab i`, written `Sym I \ {i}` and “of exponential size”.

How to apply it. Split the formula into conjuncts; compute `Auto fi` for each; construct and check one quotient per conjunct; combine the Boolean results. The paper says to break “the composite formula into its basic modalities (or other appropriate subformulae) and checking them individually” and that “While this may entail computing multiple quotients, it can still be more efficient.” (Section 4.3, p. 120). Inference: in Verus, split a large postcondition into lemmas whose symmetry assumptions match each lemma, then combine them with a final conjunction lemma.

Evidence and limits. The paper gives a qualitative size argument (`n` exponentially smaller quotients versus one quotient equal to the original structure), not measured times. Inference: the proof must preserve each subformula's indexing, and the paper's worked example is a conjunction over process indices.

## technique 3: state symmetry

What it is. When a particular state has a large stabilizer `Aut s`, evaluate multiple indexed conjuncts only for one representative index per orbit under `Aut s ∩ Aut M` (Section 4.4, pp. 121–122). Theorem 4.4 states `M,s ⊨ ∧i gi` iff `M,s ⊨ ∧j∈Rep gj`.

How to apply it. Compute the partition of process indices induced by `i ~ j` iff some permutation in `Aut s ∩ Aut M` maps i to j; select one representative from each part; check only those `gj`. If `Aut M=Sym I`, at most `|L|` conjuncts need checking, where `|L|` is the number of distinct local states; if also `Aut s=Sym I` (all processes in the same local state), a single class results when `Aut CR` is vertex-transitive, for example for rings (p. 122). Inference: a Verus proof can establish an index-orbit equivalence lemma and instantiate one representative per equivalence class.

## technique 4: annotated quotient and guides

What it is. For formulas with indexed propositions, use one quotient by `Aut M` and annotate each quotient edge with the permutation that maps coordinates from the source representative to the target. An automaton for the indexed formula follows these guides to reconstruct coordinate identities (Section 5, pp. 122–126).

How to apply it. Fix `G ≤ Aut M`; construct representative states and annotate each transition `(s̄, π, t̄)` so that `t = π(t̄)` (transitions between two non-representative states are dropped; Section 5.1, p. 122). For indexed CTL* formulas of the form `∨i E fi` or `∧i E fi`, with `fi` a propositional linear temporal formula, build a Büchi automaton for `fi` and a product graph over nodes `(s̄, q, j)` whose edges map the process index `j` to `π⁻¹(j)`; the formula holds at `s̄` iff a path with infinitely many recurrent nodes exists (Lemma 5.3, pp. 124–125). Formulas mentioning several processes use symmetric automata and indexed PLTL (Section 5.3, pp. 125–126). The paper explains: “The idea is to annotate the quotient with ‘guides’, indicating how coordinates are permuted from one state to the next in the quotient.” (Section 1, p. 106). 

Verus form. Inference: represent a guide as a ghost permutation attached to each quotient edge and prove that applying it to the representative transition yields a concrete transition. Prove that the automaton's indexed proposition evaluation is invariant under the accumulated guide. The automaton and quotient search can remain external, with Verus checking edge certificates and guide composition.

Limits and evidence. The automaton has `m` of order `2^|fi|` states and the product graph has `O(|S̄|mn)` nodes (Section 5.2, p. 125); for indexed PLTL the expanded formula can itself be exponentially longer (Section 5.3, p. 126). No benchmark timings are reported. The construction is unsuitable if guide permutations are not uniquely or consistently recorded; inference: dropped guide metadata can silently change the meaning of indexed properties.

## what is proved, measured, and trusted

The paper proves correspondence and compression theorems for CTL* and μ-calculus, the hardness result for `Aut p` (Proposition 4.1), the inclusions `Aut P ≤ Aut M` (Lemma 4.2) and `Aut CR ≤ Aut M` (Theorem 4.3), formula/state symmetry reductions, and the annotated-quotient correspondence. It reports no numerical experimental table; the `l^n` versus `n^l` figures are asymptotic state-count estimates. Trusted elements are the finite-state transition semantics, automorphism/group calculations, quotient construction, and temporal-logic model checker.

## techniques for the catalog

- group quotient — identify states in automorphism orbits and model-check the smaller quotient when the group preserves model and formula
- communication-graph symmetry — obtain a sound subgroup from automorphisms of the process communication graph (for normal, isomorphic processes sharing each variable between exactly two processes)
- formula decomposition — check low-symmetry conjuncts separately to recover larger per-formula quotient groups
- state symmetry — check one indexed subformula per orbit under the state's stabilizer
- annotated quotient guides — retain coordinate permutations on quotient edges so indexed temporal formulas can be checked
