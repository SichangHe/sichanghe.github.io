# An Immune System Inspired Approach to Automated Program Verification
(authored by agents unless marked 🧑)
Tag: `banerjee2009immune`, [paper](http://arxiv.org/abs/0905.2649v1)

## purpose and result

The paper proposes an artificial immune system (AIS) that predicts the polynomial shape of program invariants from program fragments, then uses deterministic methods such as quantifier elimination to obtain an exact invariant. It treats a fragment as an antigen and a candidate invariant as an antibody. The abstract states: “An AIS algorithm is proposed to carry out the machine-learning task of predicting invariant shape from an instance of a program.” (abstract, p. 1). The reported result is qualitative: the algorithm correctly predicted invariant shapes for benchmark programs, with no dataset size, accuracy denominator, runtime, or mutation-count table.

## technique: fragment-to-invariant AIS

What it is. Break a program into assignment statements and other fragments, retrieve a remembered invariant shape for a similar fragment, mutate its operators and operands until it becomes an invariant for the presented fragment, store the result as memory, and linearly combine fragment invariants into a whole-program polynomial shape. The paper’s analogy is explicit: “The analogue of an antigen is a program fragment and the corresponding analogue of an antibody is an invariant for the program fragment.” (Sect. V, p. 3).

Steps from the paper’s algorithm (Sect. VII, p. 4):

1. Train on a program fragment P1 and a known invariant I1; store I1 as a memory detector.
2. Split a new whole program into fragments and present them one at a time.
3. If a fragment is similar to a stored fragment, use the stored invariant as a candidate.
4. If it is not an invariant, mutate operands and operators repeatedly (somatic hypermutation) until a candidate invariant is obtained.
5. Store each successful invariant in the memory population.
6. Combine the individual invariants linearly to produce a polynomial invariant shape for the whole program.

The paper’s P1/P2 demonstration trains on `x := x + 2` with `x = x + 2n`, then mutates the identifier to handle `t := t + 2`, producing `t = t + 2n`; it calls this one mutation in both antigen and antibody distance (Sect. VI, p. 4). In a larger gcd/lcm example, it derives fragment invariants for `x := x − y`, `v := v + u`, `y := y − x`, and `u := u + v`, combines them into a polynomial shape, and uses quantifier elimination to obtain `xu + yv − ab = 0` (Sect. VIII, pp. 5–6).

Verus form. Inference: use AIS only as a hint generator. Encode a candidate invariant as a Verus `spec fn` over loop variables, then prove initialization, preservation, and postcondition with `proof fn` lemmas and a loop `invariant`. The mutation and similarity search are ordinary Rust tooling outside the proof; Verus proves the selected invariant, not the AIS prediction. If the invariant is polynomial, arithmetic triggers and nonlinear reasoning may still require auxiliary lemmas. No claim in the paper establishes that AIS-generated shapes are sound before deterministic checking.

## technique: shape space and antigenic distance

The AIS needs a numeric similarity measure. Represent fragment characteristics (identifier names, exponents, operators, and similar features) as coordinates in an N-dimensional Euclidean shape space. Distance between fragments guides reuse and mutation; distance between their invariant representations measures antibody similarity. The paper defines “program fragment antigenic distance as the distance ||P1 - P2|| between 2 program fragments P1 and P2 in program fragment shape space.” (Sect. VI, p. 4).

To apply it, choose feature coordinates, encode training fragments and invariants, compute nearest or similar remembered patterns, and initialize mutation from the nearest antibody. The paper’s `x := x + 2` to `t := t + 2` example has distance 1 because only the identifier changes. Inference: a Verus workflow could use AST-normalized features to suggest lemma templates, but Euclidean closeness is a heuristic and does not imply semantic similarity; the proof must establish the actual invariant.

## technique: memory, reinforcement, and mutation

Keep a small set of high-affinity candidates rather than every candidate. Repeated exposure to related fragments yields faster retrieval, while mutation explores local alternatives and receptor editing introduces diversity. The paper summarizes learning as “repeated exposure to an Ag,” “affinity maturation of the receptor molecules,” “low-grade chronic infection,” and “cross-reactivity.” (Sect. II.A, p. 2). In the computational algorithm, a successful fragment invariant enters memory and can seed later fragments.

When to use it. Use memory when programs contain repeated or renamed idioms; use mutation when a known invariant shape is close but not exact. The method has explicit scope limits: the conclusion says, “the AIS algorithm does not consider program fragments having iteration constructs like while, repeat, etc.” (Sect. IX, p. 7). Inference: this is a major limitation for Verus, because loop invariants are the main target; the paper’s demonstrations still use loop semantics, but fragment training focuses on assignments.

## technique: deterministic completion with quantifier elimination

AIS predicts only a shape, such as `Ax + By + Cz + Dxy + Eyz + Fxz + Gxyz + H = 0`. Quantifier elimination then solves for coefficients and yields an exact invariant. For the multiplication-by-doubling program, the paper reports `z + xy − AB = 0`; for the gcd/lcm program, it reports `xu + yv − ab = 0` (Sect. III and Sect. VIII). For the exponentiation-style example, it obtains `zxy = AB` after combining fragment shapes (Sect. VIII, p. 6).

Verus form. Inference: use the predicted polynomial as a candidate `spec fn` and prove it with arithmetic lemmas; Verus is the checker, while quantifier elimination is an external synthesizer. The paper does not provide complexity or failure rates for quantifier elimination, and future work asks whether linear combinations always suffice.

## evidence, trust, and VL relevance

The paper tested the AIS on two nontrivial benchmark programs: a gcd/lcm program and a multiplication program, and says it “correctly generate[d] the general form of the program invariant.” (Sect. IX, p. 7). These are demonstrations, not a statistically sized evaluation. Trusted elements include training invariants, the feature encoding and distance metric, mutation policy, quantifier-elimination implementation, and the final proof method. Inference: for agent-written verified Rust, AIS is a possible invariant-hint generator that may reduce human search effort, but it does not threaten Verus’s proof guarantees because every candidate still needs a machine-checked preservation proof. Existing invariant-generation work cited by the paper already covers the deterministic completion step; VL should reuse the idea of learning shapes from analogous code rather than treating AIS as a verifier.

## techniques for the catalog

- immune-memory invariant hints — remember fragment/invariant pairs and reuse them for similar code
- somatic hypermutation — mutate candidate operators and operands until a fragment invariant fits
- shape-space similarity — encode fragments and invariants as vectors and use distance for retrieval
- linear invariant assembly — combine fragment invariants into a whole-program polynomial shape
- quantifier-elimination completion — solve a predicted shape into an exact invariant and check the resulting program
Checked 2026-10-14 against the paper by a Codex agent: audit record banerjee2009immune; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
