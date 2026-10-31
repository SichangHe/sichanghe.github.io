# A Certified Proof Checker for Deep Neural Network Verification in Imandra
(authored by agents unless marked 🧑)
Tag: `desmartin2024certified`, [paper](https://arxiv.org/abs/2405.10611v2)

## purpose and trust boundary
The paper implements and verifies a checker for Marabou UNSAT certificates in Imandra. The abstract states: “Here, we present an alternative implementation of the Marabou certificate checking in Imandra – an industrial functional programming language and an interactive theorem prover (ITP) – that allows us to obtain full proof of certificate correctness.” (p. 1). The supplied paper is arXiv:2405.10611v2, dated 24 June 2025 (p. 1); the link uses that identifier.

The checker avoids verifying the whole solver: “A solution was found: to produce (and then check) a proof certificate for each automatically generated proof, instead of checking the verifier in its entirety.” (Sec. 1, p. 2). Its formal guarantee concerns the encoded query, under structural assumptions: “Note that the proof assumes that all the query elements are well-formed w.r.t the variable vector, i.e. the tableau, bounds and variable vector dimensions match, and the proof-tree splits correspond to the query constraints.” (Sec. 5, p. 14). Figure 1 specifies that this paper addresses UNSAT certificates (p. 2).

## technique 1: Farkas certificates for linear leaves
A leaf contains a contradiction vector used to construct a linear combination of tableau equalities and bound inequalities. Equality multipliers may be arbitrary reals; inequality multipliers must be nonnegative (Theorem 5, p. 8). The certificate check requires the resulting polynomial to have zero variable coefficients and a negative constant: “In Imandra, we define a valid certificate as a linear combination of the tableau rows which gives a polynomial with all coefficients equal to 0 and a negative constant.” (Sec. 3.2, p. 8).

Steps: (1) obtain the tableau A, lower and upper bounds l,u, and the leaf vector w; (2) encode tableau rows as polynomial equalities, upper bounds as u_j−x_j≥0, and lower bounds as x_j−l_j≥0 (Definition 4, p. 8); (3) construct witness candidates I(x), C(x); (4) accept the leaf only if the certificate check proves their sum strictly negative. The paper states: “For a leaf node containing a list of reals w, the procedure mk_certificate computes witness candidates I(x), C(x) as in Theorem 6, then the algorithm checks whether I(x) + C(x) < 0 (mk_certificate in Figure 6, l. 6).” (Sec. 4, p. 11).

Only the direction needed for soundness is formalized: “The Imandra code covering one direction of Theorem 5 is given in Figure 3. It is the only direction needed to prove soundness of our implementation, and corresponds to the top double box in Figure 2.” (Sec. 3.2, p. 8). Theorems 6 and 7 connect polynomial unsatisfiability to the linear DNN query (Sec. 3.3, p. 9).

Inference: a Verus implementation could use exact rational coefficients and prove that the checked negative constant contradicts every satisfying assignment. It would need separate lemmas for equality combinations, nonnegative inequality combinations, and the conversion from the encoded query.

## technique 2: proof-tree checking with split refinement
The tree supports leaves and binary split nodes: “A proof tree t, represented by an inductive type proofTree, can be either a leaf Leaf w or a non-leaf node Node s tl tr.” (Sec. 4, p. 10). Figure 5 lists ReLU splits and single-variable splits (p. 11).

Steps: (1) validate each ReLU split against the query constraints; (2) compute the bounds of both children with `update_bounds`; (3) recursively check both children; (4) require valid splits and valid children. Figure 6 ends with “valid_split && valid_children” (p. 12). The paper explains the validation: “It re-iterates the check that ReLU splits indeed correspond to a known ReLU constraint of the verification query.” (Sec. 4, p. 12).

For a single-variable split at k, one child sets the upper bound of that variable to k and the other sets its lower bound to k. For f=ReLU(b), with aux=f−b, the code sets f=0 and b≤0 in the left child; it sets b≥0 and aux=0 in the right child (`update_bounds`, Sec. 4, p. 11). The right child's existing auxiliary equation then enforces f=b. The auxiliary variable is not set to zero in the inactive child.

The soundness proof combines leaf soundness with coverage of the parent solution space by the children: “Lemma 14 states that if the query corresponding to a parent node in the proof tree has a satisfying assignment, then this assignment will satisfy one of the child node’s queries.” (Sec. 5, p. 14). The overall statement is: “Theorem 15 (Algorithm 1 is sound). If check_tree(A, u, l, C, T ) returns true, then ¬(∃s.is_solution(⟨A, l, u, C⟩, s)).” (Sec. 5, p. 14).

Inference: a Verus version could use an enum for leaves and nodes, recursion decreasing on the tree, and lemmas for branch coverage and recursive soundness. The implementation should follow the bound-update code: the paper's prose reverses phase names on p. 11, and Lemma 13's stated right-child bounds on p. 13 differ from both that code and its proof on p. 14.

## technique 3: executable formalization in the prover
The checker and its proof share a language: “Imandra can implement – and prove properties of – programs written in a subset of OCaml, and thus avoids a potential discrepancy between implementation and formalisation.” (Sec. 1, p. 2). Its arithmetic avoids floating-point error: “Imandra supports arbitrary precision real arithmetic, and thus does not suffer from floating point imprecision that haunts DNN verifiers.” (Sec. 1, p. 2).

Apply this by implementing proof-tree traversal, certificate construction and bound updates in the prover's language, then proving well-formedness preservation and checker soundness (Secs. 4–5, pp. 10–15). The paper describes the implementation obligation: “In the implementation, we need to prove that these properties are preserved throughout the inductive steps, with lemmas such as well_formed_preservation (see Table 1).” (Sec. 5, p. 14).

Inference: a Verus port could pair Rust checker functions with specifications and proof functions, using an executable exact-arithmetic representation whose operations are connected to the mathematical model.

## evidence and limits
Table 2 reports 2,113 lines and 267 auxiliary lemmas (p. 16). Section 6 uses collision avoidance with 137 ReLU neurons and robotics navigation with 32 ReLU neurons (p. 15). It reports: “Overall, Marabou has solved all queries and successfully generated UNSAT proofs for 293 coav and 213 robotics queries.” It then limits the evaluated sample: “We evaluated the results of 276 coav and 180 robotics queries, which have proof size smaller than 5MB.” Both checkers accepted those proofs: “All UNSAT proofs were checked by the native Marabou checker and by Imandra, and both checkers have certified all queries.” (Sec. 6, p. 15).

Mean verification times were 5.40 s and 5.62 s; native checking times were 0.003 s and 0.03 s; Imandra checking times were 24.64 s and 26.72 s, for coav and robotics respectively (Sec. 6, p. 16). The paper describes the resulting comparison as follows: “Furthermore, even though Imandra’s checking time is considerably slower than Marabou’s, its effect on the overall verification process is of factor 4.56 × −4.76× slowdown.” (p. 16). Inference: these benchmark means do not establish a general runtime bound or independence from network size. The authors explicitly say: “This hypothesis needs to be further investigated.” (p. 16).

The evaluation disabled optimizations involving ReLU-derived bound-tightening proofs (Sec. 6, p. 15). Those theory lemmas are implemented but their certification remains future work: “We implemented them in Imandra, but certifying their soundness would be the next logical step to fully support proofs generated by Marabou.” (Sec. 7.2, p. 17). The same section states: “We plan to lift the soundness of the checker (Theorem 15) to the level of DNN verification queries, and, via a certified compilation procedure, to higher-order specification languages such as Vehicle [16].” Nonlinear activations require over-approximations, “which Marabou does not currently generate proofs for.” (p. 17).

## techniques for the catalog
- Farkas leaf certificate: combine equalities with arbitrary real multipliers and inequalities with nonnegative multipliers; check for a negative constant with zero variable coefficients
- inductive proof-tree checker: validate ReLU splits, update branch bounds, recursively certify both children, and prove that the branches cover the parent solution space
- executable formal checker: implement and prove the same certificate checker in one theorem-proving language
- certificate-producing verifier boundary: use a verified checker to validate solver-produced UNSAT evidence
