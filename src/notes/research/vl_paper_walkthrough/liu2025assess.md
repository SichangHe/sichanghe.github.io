# ASSESS: A Semantic and Structural Evaluation Framework for Statement Similarity
(authored by agents unless marked 🧑)
Tag: `liu2025assess`, [paper](https://arxiv.org/abs/2509.22246v2)

## paper contribution

ASSESS evaluates whether two formal theorem statements are semantically equivalent or structurally alike. Its two-stage metric parses each Lean statement into an operator tree, then searches transformations that reduce an equality to sufficient proof obligations, using tree-edit distance (TED) as a heuristic. The authors' problem statement is that proof-based metrics give no graded score when proving equivalence fails, while strings miss meaning. They introduce EPLA, an expert-annotated benchmark of 1,247 pairs: 831 EPLA-miniF2F and 416 EPLA-ProofNet (abstract and section 1, pp. 1–2).

The contribution is an evaluation technique for autoformalization. The paper states: “Existing metrics often fail to balance semantic and structural information: string-based methods neglect semantics, whereas proof-based approaches offer no graded similarity when proofs fail.” (abstract, p. 1) Inference: a nonzero similarity score does not establish the equality searched. The paper reports TransTED accuracy/Kappa of 70.16%/0.35 on EPLA-miniF2F and 67.31%/0.30 on EPLA-ProofNet (Table 3, p. 8), using thresholded real-valued scores against expert provability labels.

## technique 1: construct operator trees and TED similarity

1. Parse each formal statement with the Lean Language Server and derive a labeled, ordered operator tree. Operators are parent nodes and arguments are ordered children (section 3.2.1, p. 4).
2. Append `<SLOT>` to every non-leaf operator label to mark functional role, and omit parentheses because tree topology already encodes precedence (section 3.2.1, p. 4).
3. Compute Tree Edit Distance as the minimum cost of deleting, inserting, or relabelling nodes. Insertion and deletion costs must be equal for symmetry (section 3.2.2, p. 5).
4. Normalize unit-cost distance as `simTED = 1 − dTED / max(|T1|, |T2|)`, where the denominator is the larger tree's node count (Definition 3, p. 5).

The paper's example compares two summation statements with `Finset.range` versus `Finset.Icc`; the resulting trees retain hierarchy while exposing different operators (Figure 2, p. 5; example statement on p. 4). TED is useful as a structural baseline but penalizes equivalent reorderings such as `a + b` and `b + a` (section 3.3, p. 5).

Inference: a Verus adaptation would parse supported Rust/Verus specifications into an analogous AST, retaining operators, quantifiers, function calls, and contract clauses. The result is a triage score for candidate specs, not a proof. This would require a Verus parser integration and a definition of which specification nodes contribute to the score.

## technique 2: TransTED semantic transformation search

The paper defines a pseudometric constrained by two properties: the new distance cannot exceed TED, and a logically stronger transformed equality cannot have smaller distance than the original. It formulates the largest such pseudometric as a linear program and proves a unique optimum (Theorem 1, section 3.3.1, pp. 5–6).

The practical algorithm is finite and computes an upper bound. The paper states: “Since practical implementations are constrained by a finite set of transformations, our algorithm computes a tractable upper bound of TransTED rather than its exact theoretical value.” (section 3.3.2, p. 6) Its stated procedure is:

1. Form an equality `eq := (FL1 = FL2)` from the two statements. If it fails to compile, return TED directly (Appendix D, lines 1–6, p. 17).
2. Try `exact?`; return distance zero if it completes the equality (Appendix D, lines 8–10).
3. Otherwise run heuristic search from `eq`, allowing `rw?` suggestions and the curated transformations in Table 1. Valid search nodes contain one equality goal or `completed` (Appendix D, lines 12–18).
4. Prioritize a tactic that reduces TED between the left and right expression trees. Stop on proof completion, node-limit exceeded (NLE), or time-limit exceeded (TLE) (section 3.3.2, p. 7; Appendix D, p. 17).
5. On TLE, return the smallest TED seen among visited nodes. The pseudocode otherwise returns zero (Appendix D, lines 19–23, p. 17). Normalize the distance analogously to TED Similarity (section 3.3.2, p. 7).

Inference: Appendix D leaves an ambiguity for NLE: NLE can stop the search, but the return branch tests only TLE and otherwise returns zero. Therefore, the pseudocode alone does not establish that every returned zero corresponds to a completed proof. The implementation was not inspected.

The curated commands are `apply congrArg`, `apply congrFun`, `apply forall_congr; intro _`, `apply implies_congr; all_goals (try rfl)`, `ext`, `rw [propext and_imp]`, `norm_cast`, and `rw?` (Table 1, p. 6). The authors use top-five `rw?` suggestions, maximum tree size 32, and a ten-minute timeout in experiments (section 4.2, p. 8).

Inference: Verus could use a comparable proof-search wrapper only for transformations expressible in Verus proof code and solver lemmas. A candidate relation could become a proof obligation; a timeout would give no proof. The score and search trace could help users locate remaining differences.

## technique 3: EPLA benchmark construction and calibration

Build the benchmark as follows (section 4.1, p. 7 and Appendix E, pp. 17–18):

1. Start with the Numina version of miniF2F-test and the DeepSeek version of ProofNet-test.
2. Generate Lean 4 candidate formalizations with four models: Herald Translator, Goedel-Formalizer-V2-8B, Gemini-2.5-Pro, and Qwen3-Max.
3. Keep candidates passing the Lean compiler's syntactic-validity filter.
4. Pair each candidate with its ground-truth formalization.
5. Have seven mathematically trained experts annotate three Boolean labels: provability, likeness before transformation, and likeness after transformation. Cross-validate annotations.
6. Enforce the label implications: provability implies post-transformation likeness, and pre-transformation likeness implies post-transformation likeness. The five valid combinations are listed in Appendix E.

Inference: for Verus, construct pairs from natural-language requirements, a reference Verus contract, and an agent candidate. Filter candidates by compilation, then have reviewers label contract semantic equivalence and structural likeness separately. Record the tool versions and specification assumptions.

The authors recommend domain-specific threshold calibration. The paper reports optimal TransTED thresholds 0.61 for EPLA-miniF2F and 0.38 for EPLA-ProofNet and recommends evaluating a spectrum because formal domains differ in structural diversity (Appendix F.1, p. 18). Thresholds were chosen by sweeping possible values and selecting the Kappa optimum (section 4.2, p. 8).

## evidence and failure boundaries

Experiments used Lean v4.9.0-rc1, one NVIDIA A800 80GB GPU, two Intel Xeon Silver 4216 CPUs (32 physical cores), and CPU execution except GPU-dependent BEq (section 4.2, p. 8). TransTED's Table 3 results are 70.16% accuracy and 0.35 Kappa on 831 miniF2F pairs, and 67.31% and 0.30 on 416 ProofNet pairs. The ablation improves TED from 69.56% to 70.16% (+0.60 points) on miniF2F and 64.67% to 67.31% (+2.64 points) on ProofNet; Kappa rises 0.31→0.35 and 0.23→0.30 respectively (section 4.3, p. 9). TransTED is slower: 42,028.544 seconds total/50.5759 average on 831 miniF2F pairs and 54,343.406/130.6332 on 416 ProofNet pairs (Tables 6–7, p. 19). Table 6 prints miniF2F TED accuracy as 69.55%, whereas Table 3 and the ablation text print 69.56%; the ablation gains above follow the main text.

The paper says: “The search halts upon satisfying any of the following conditions: successful proof generation (Proved), Node Limit Exceeded (NLE), or Time Limit Exceeded (TLE).” (Figure 1 caption, p. 3)

The paper documents two important failures. A limited tactic set misses a semantically equivalent pair when a variable definition must be bridged; EPLA-miniF2F #25 receives 0.17 from both metrics (Appendix B, p. 15). Structural-semantic tension creates false positives: an off-by-one index shift gets TED 0.51 but TransTED 0.81 (EPLA-ProofNet #360, Appendix B, p. 15). The authors state: “TransTED Similarity does not guarantee 100% precision” (Appendix B, p. 16). The authors suggest debugging as a possible use: “This suggests that TransTED Similarity might be highly effective for human-in-the-loop debugging, filtering nearly-correct candidates for expert review.” (Appendix B, p. 16)

Theorem 1 proves existence and uniqueness of the maximal pseudometric under the stated constraints (section 3.3.1, p. 6; proof in Appendix C, pp. 16–17). The authors report: “The resulting EPLA benchmark, detailed in Table 2, comprises 1,247 annotated instances.” (section 4.1, p. 7) Experiments measure agreement with expert provability labels. Inference: interpreting these scores requires trusting Lean parsing, tactic semantics, the finite tactic catalogue, heuristic search, expert labels, ground-truth formalizations, threshold selection, and the assumption that those labels represent semantic equivalence. The paper does not evaluate Verus contracts or Rust code.

Inference: VL could test whether a Verus adaptation helps users repair candidate specifications, while retaining final Verus verification. The paper's results alone do not establish that benefit.

## techniques for the catalog

- operator-tree representation: parse formal statements into ordered trees with explicit operator slots and omitted redundant parentheses
- normalized TED similarity: subtract the unit-cost insert/delete/relabel distance divided by the larger tree's node count from one
- semantic transformation metric: reduce statement equality to sufficient proof obligations while guiding search with TED
- bounded heuristic proof search: use curated rewrite/tactic suggestions and stop on proof, node, or time limits
- expert benchmark construction: compiler-filter generated statements and annotate provability plus pre/post-transformation likeness
- threshold calibration: sweep score thresholds on the target benchmark and report the denominator and Kappa optimum
- failure-aware triage: the authors propose using similarity and search results to locate near misses for expert review
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "By augmenting the structural comparison of operator trees with a set of semantic transformations, our method provides a more holistic and robust measure of statement similarity."): checked all paper text, study quotations, numbers, references, technique steps, and inference labels; corrected the unrelated DOI to this paper's arXiv link, page references, transformation wording, and the NLE return ambiguity; removed unsupported Verus prescriptions and risk claims; did not inspect code, rerun experiments, or validate a Verus adaptation.
