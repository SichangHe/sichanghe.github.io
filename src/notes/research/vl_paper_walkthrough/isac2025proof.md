# Proof Minimization in Neural Network Verification
(authored by agents unless marked 🧑)
Tag: `isac2025proof`, [paper](http://arxiv.org/abs/2511.08198v1)

## scope and result

The paper minimizes UNSAT proof objects produced by a proof-producing DNN verifier. Its object is a proof tree, from the framework of Isac et al. [39], whose leaves carry Farkas proof vectors and whose nodes may carry bound-tightening lemmas, each with its own proof vector. The paper's motivation is that proofs checkable by an external proof checker mitigate verifier bugs, but that such proofs "tend to be extremely large" (abstract, p. 1). The authors state: “In this work, we address this problem by minimizing proofs of unsatisfiability produced by DNN verifiers.” (abstract, p. 1) Their best-performing algorithm reduces proof size by 37%−82% and proof checking time by 30%−88%, with a runtime overhead of 7%−20% (abstract, p. 1; Section 4.2 attributes the 7%–20% to Dep. Min. Glob. and 5%–24% to Dep. Min.).

Inference: the directly reusable idea for VeruLaw is certificate dependency slicing: retain only facts needed by a final proof, then check the smaller certificate independently. The paper operates on linear DNN constraints, not Rust or Verus programs.

## prerequisites and proof representation

A DNN verification query is encoded as Q = ⟨V, A, l, u, R⟩. V contains variables, A linear equations, and l,u lower and upper bounds; R contains ReLU constraints. A proof vector w certifies that the linear combination wᵀAV has a negative upper bound. A learned lemma tightens one variable bound and stores its own proof vector. A proof of each search-tree leaf is needed to establish UNSAT for the whole query.

The paper explains the central invariant: “As proving UNSAT of all leaves in the proof tree is necessary for proving UNSAT for the whole query, proof minimization is achieved by reducing the number of lemmas used within the proof.” (Section 3, p. 7) A bound used with a positive coefficient contributes its upper bound; a negative coefficient contributes its lower bound. Lemma identifiers are chronological, and recursive analysis may use only earlier identifiers, preventing cycles.

Inference: a Rust implementation would need an explicit certificate data type whose nodes record the fact proved, the facts consumed, and the checker rule; Verus can verify the checker but does not automatically recover this dependency graph from ordinary proof functions.

## technique 1: recursive dependency analysis

What it is. `proofDeps` reconstructs which learned lemmas a proof vector actually reads, then recursively expands each used lemma's own proof. It removes eagerly recorded facts that never reach the final contradiction.

When to use it. The paper applies the minimization algorithms "upon deducing UNSAT on each proof tree leaf" (Section 3, p. 7), which enables on-the-fly minimization. Section 3.3 says the algorithms extend to other piecewise-linear constraints if the verifier supports proof production for them.

How to do it.

1. Reconstruct the scalar expression wᵀAV = Σ ci·xi from the proof vector (Algorithm 1, Section 3.1).
2. For each ci > 0, add the lemma that established u(xi), if that upper bound is learned; for each ci < 0, add the lemma that established l(xi) (Algorithm 1, lines 2–8).
3. Mark each selected lemma as included, obtain bounds with IDs no greater than that lemma, and retrieve its proof vector (lines 9–13).
4. Recursively repeat steps 1–3 for each selected lemma and take the union of dependencies (lines 13–15).
5. Give every lemma a unique chronological ID and record, for every bound, the lemma or split that derived it; this makes the recursion acyclic (Section 3.1).

The worked example says: “As u(b3 ) is deduced using one of the lemmas in Example 5, this lemma forms the dependency list of w.” (Example 6, Section 3.1, p. 9) It then observes that a lemma for u(f2) is not on the recursive path and can be removed (Example 6).

Verus form. Inference: represent each certificate node with a `struct` carrying its bound, proof vector, and predecessor IDs; define a `spec fn` for the linear combination and a `proof fn` that proves the dependency set contains every bound selected by the coefficient sign. Use `requires` and `ensures` on the proof function and sequence/set lemmas to establish that recursively collected IDs are earlier than the node. Do not use the paper's algorithm names as Verus syntax.

Evidence. The paper states no soundness theorem for Algorithm 1; its only theorem about the algorithms is Theorem 2 (minimality of Algorithm 2's output). The justification for Algorithm 1 is the explanation in Section 3.1 that the proof uses only l(xi) for negative and u(xi) for positive coefficients. The evaluation (Section 4) measures proof size, verification time, proof-checking time with the native Marabou checker, and solved-query counts.

Limits. Inference: it requires proof-producing verification and recorded provenance for bounds; the paper stores, for every bound, the lemma or split that deduced it (Section 3.1). The method is not directly applicable to the symbolic reliability approach that reduces verification to an additional SMT query; the authors state: “Our approach is then not directly applicable to [61].” (Section 5, p. 20)

## technique 2: greedy local dependency minimization

What it is. Algorithm 2 removes dependencies whose bound contributions can be relaxed while the refutation remains negative. For a proof vector, compute Δ = Σci>0 ci·u(xi) + Σci<0 ci·l(xi). For each learned upper bound define cont(u_j,w)=cj·(u(xj)−uinput(xj)); for a lower bound define cont(l_j,w)=cj·(linput(xj)−l(xj)). Contributions are non-positive because linput ≤ l ≤ u ≤ uinput.

When to use it. Run after dependency analysis on each proof vector when the goal is the smallest dependency subset for that vector. It may be run before recursive analysis to avoid recursing into dependencies that will be discarded.

How to do it.

1. Compute Δ from current bounds (Algorithm 2, line 1, Section 3.2).
2. Sort dependencies by contribution (line 2).
3. Accumulate absolute contributions in that order (lines 3–5).
4. Remove a dependency while the accumulated amount remains at most |Δ|; stop at the first dependency that would cross the margin (lines 6–10).
5. Example 7 (not a step of Algorithm 2) illustrates the effect: with u(b3) relaxed to its input bound 1, the expression evaluates to −1 < 0, so that lemma can be dropped.

The paper gives the concrete condition: “Those lemmas with only a small contribution could potentially be omitted from the proof, without altering the sign of ∆.” (Section 3.2, p. 10) It proves that the resulting set is minimal in cardinality for that vector (Theorem 2), not globally minimal across the tree.

Verus form. Inference: encode Δ and each contribution as mathematical integer or real specifications matching the checker’s arithmetic; prove that replacing a learned bound by its input bound leaves Δ negative. Store the retained dependency IDs and prove a set-subset relation. Verus arithmetic proofs must follow the actual certificate numeric model; this paper's floating-point DNN implementation cannot be copied as a Verus real-number theorem without a model correspondence.

Limits. Local minimality can retain a globally redundant lemma; Section 3.3 gives the case where a lemma ℓ is already retained for another proof vector, so removing it from this vector's dependencies does not shrink the proof and wastes budget (Example 8). Inference: the summing of contributions is sound because Δ is linear in the bounds, but the paper does not state this as a lemma.

## technique 3: global saturation heuristic

What it is. Algorithm 3 orders dependencies by recursively computed total dependency count, breaking ties by contribution, then repeatedly removes dependencies until a full pass makes no change. The aim is to remove first the lemmas with many dependencies, whose elimination is "likely to trigger the removal of additional downstream lemmas" (Section 3.2).

How to do it.

1. Recursively analyze each dependency once, caching `wasAnalyzed`, and assign its dependency-set size as a score (sortByDepsLength, lines 1–7, Section 3.2).
2. Sort dependencies by decreasing score, with contribution as tie breaker (Algorithm 3, line 2).
3. In each pass, add a dependency's absolute contribution to δ; remove the dependency if δ ≤ |Δ|, otherwise revert the addition (lines 7–14).
4. Repeat passes until a pass removes nothing, i.e. saturation (lines 4–6, 11, 16).

The authors qualify the guarantee: “This ensures minimality of the subset of dependencies, though it does not guarantee the resulting subset is smallest.” (Section 3.2, p. 12) Inference: use this as a deterministic heuristic in a Verus certificate pipeline, and separately prove checker soundness; do not claim global cardinality optimality.

## technique 4: proof-tree engineering and deletion

The paper adds three practical reductions. First, consider removing dependencies only from lemmas not currently used in the proof, because removing an already retained lemma from one vector's dependencies does not shrink the proof. Second, cache each lemma's dependency analysis because multiple vectors may share it. Third, delete an unused lemma once the search subtree rooted at its deduction state is fully explored: “At that point, any lemma in S that was not involved in any dependency analysis can be safely deleted.” (Section 3.3, p. 13)

Inference: in Verus, these are certificate-memory policies around a verified checker. A mutable runtime cache can remain untrusted if the checker receives the final certificate and proves every retained edge; deletion is safe only after a proof that no retained node references the deleted ID.

## evidence, assumptions, and contradictions

The implementation extends proof-producing Marabou. Experiments ran Debian 12 on one CPU. Acas-Xu and Cora used 16 GB RAM and a five-hour timeout; other suites used 2 GB and 2.5 hours (Section 4.1, p. 14). Table 1 averages only queries solved by all compared methods. For example, Acas-Xu has 82 UNSAT and 39 SAT queries in that common solved set: baseline proof size 302,021.14, global minimization 53,144.84 (−82.4%); checking time 66.37 s versus 8.15 s (−87.7%); verification time 265.98 s versus 288.42 s (+8.4%) (Table 1, p. 17). Cora's common set has 104 UNSAT queries; global minimization reduces proof size 49,202.05 to 11,549.88 (−76.5%) but increases verification time 1,277.88 s to 1,405.65 s (+10.0%) (Table 1).

Resource outcomes are not uniformly better. On 177 MaxLeaky queries under 2.5 hours and 2 GB, baseline solves 12 SAT and 163 UNSAT, while global minimization solves 12 SAT and 160 UNSAT and has five memory-outs (Table 4, p. 19). On 180 Acas-Xu queries, dependency analysis solves 44 SAT and 107 UNSAT with zero memory-outs, versus baseline 41 SAT, 82 UNSAT, and 57 memory-outs (Table 2, p. 18). Dependency analysis on Acas-Xu also has 29 timeouts versus 0 for the baseline (Table 2). For the MaxLeaky regression the paper says it is "likely a result of the relatively moderate reduction of proof size" combined with the overhead of keeping additional information per lemma (Section 4.2, MaxLeaky paragraph).

What is proved: Theorem 2 (Section 3.2) proves that Algorithm 2 returns a dependency subset minimal in size; the soundness of Algorithms 1–3 is argued informally. Inference: what remains trusted is the external proof checker, the mathematical encoding of the DNN, and the correspondence between floating-point verifier behavior and the proof's arithmetic. The paper's Introduction notes that verifiers "typically use floating-point arithmetic", and the Conclusion says that "modeling any specific DNN implementations remains a challenge" (Section 6, p. 20).

Inference: threat to a product that writes agent-generated verified Rust is indirect but material. Smaller certificates reduce checker cost and memory, while provenance exposes which facts an agent's proof actually uses. The product still needs a sound, independently checked certificate format; proof minimization does not prove the Rust program itself correct.

## what VL should reuse and avoid

Inference: reuse provenance recording, recursive slicing, contribution-based deletion, cached analysis, and end-of-subtree reclamation for any certificate-producing verification service. Do not redo the paper's DNN-specific ReLU encoding or claim a globally smallest certificate from Algorithm 3. Existing VL work on Verus proof scripts should instead focus on extracting dependencies from Rust specifications and verifying the checker/data-model correspondence.

## techniques for the catalog

- recursive proof dependency analysis — recursively collect only learned bounds selected by a proof vector's coefficient signs
- greedy contribution minimization — sort dependencies by contribution and remove those that preserve a negative refutation margin
- global dependency saturation — order by recursive dependency count and iterate removals to a fixed point
- certificate engineering — cache analyses, ignore already globally used dependencies, and delete unreferenced lemmas after subtree completion
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Since each lemma is applicable only in the search state S where it was deduced and in all descendant states of S, it becomes irrelevant once the sub-tree rooted at S has been fully explored."): read the whole paper text (pdftotext) and checked every quotation, Table 1, 2 and 4 numbers, algorithm line references, and section and PDF page references (pages are PDF page numbers of the arXiv v1 file, 26 pages); changed page numbers, the description of the proof object, the evidence and what-is-proved claims (the paper proves only Theorem 2), the Algorithm 2 step 5, the Algorithm 3 loop lines, and the MaxLeaky attribution; marked unsupported statements as Inference. Did not check the reference list against the cited works, the Verus-form suggestions (all Inference), the VL-specific claims, Tables 3 and 5 values beyond reading them, or the figure 5 plots.
