# Premise Selection for Mathematics by Corpus Analysis and Kernel Methods
(authored by agents unless marked 🧑)
Tag: `alama2011premise`, [paper](https://www.semanticscholar.org/paper/91ab9a65e276cff7f62c7279dd507967804c2477)

## what the paper proves and measures

The paper builds a two-phase system for automated theorem proving in a large formal library. The first phase extracts exact, minimal dependencies from Mizar proofs. The second learns which premises are useful for a new conjecture, first with naive Bayes and then with a kernel-based multi-output ranking method (MOR). The abstract states: “Smart premise selection is essential when using automated reasoning as a tool for large-theory formal proof development.” (Abstract, p. 1.)

The evaluation has 2,078 Mizar problems from 33 articles (Section 5, p. 15). Vampire 0.6 runs on one CPU of an Intel Xeon E5520 2.27GHz server with 8GB RAM; the baseline uses a 10-second limit (Section 6, pp. 16–17). The headline claim is relative to this benchmark and these settings: MOR plus fine dependencies reaches 795 solved problems (MOR-60) versus 548 for Vampire/SInE, a 45.1% gain; combining MOR-40 and MOR-100 reaches 824, a 50.4% gain (Tables 4–5, pp. 19–21). The denominator for every percentage in those tables is the 2,078-problem benchmark, and the gain denominator is the corresponding 548 or 556 baseline, not all possible Mizar theorems.

## technique: exact dependency extraction by micro-articles and greedy minimization

### what it is

An interactive prover can suppress typing, notation, and other inferences. This paper exposes them by splitting each source article into one-item “micro-articles”, then finding the smallest environment that still verifies each item. The paper says: “The first step in the computation of fine-grained dependencies in Mizar is to break up each article in the mml into a sequence of Mizar texts, each consisting of a single top-level item (e.g., theorem, definition).” (Section 3, p. 4.)

The environment initially contains a conservative over-approximation of imported knowledge. The minimizer repeatedly removes parts and recompiles. The paper's algorithm is described explicitly: “The basic greedy minimization proceeds by checking if an article still compiles after removing increasingly larger parts of the environment.” (footnote 6, p. 5.) A dependency is minimal in the stated sense when removing any one dependency makes verification fail. The result includes syntactic dependencies (notations and macros) and semantic dependencies (theorems, typings, and other formulas); ATP training uses the semantic formulas.

### when to use it

Inference: Use this when source-level imports are much larger than the facts actually needed by a verified function or lemma, and when a checker can re-run verification after an import is removed. It produces training labels and a small re-proving context; it is not a proof search algorithm by itself.

### steps from the paper

1. Refactor each library article into a sequence of valid one-item articles (Section 3, p. 4). The paper warns that this can require nontrivial refactoring.
2. For each item, retain its complete environment and confirm that the item verifies (Section 3, p. 4).
3. Greedily remove environment items, recompiling after each removal or group removal. Keep a removal only when verification still succeeds (Section 3, pp. 4–5).
4. Record the remaining syntactic and semantic dependencies. Translate semantic dependencies to first-order formulas for ATP problems (Section 3, p. 5).
5. Use the exact set for a pruned re-proving problem or as labels for premise-learning (Sections 3–4, pp. 5–8).

### Verus form

Inference: In a Verus crate, the analogue is to identify a target `proof fn` or verified executable function, construct the smallest set of imported lemmas, specs, and type facts that still lets Verus verify it, and record the surviving dependency names. A practical loop is: remove one candidate `use` or lemma call, run Verus, restore it if verification fails, then repeat. The output should be a dependency manifest used to build a small proof context. Verus does not provide the Mizar micro-article refactoring or a general import-minimization command in the material consulted here, so the refactoring and recompilation driver are an inference. Verus specifications remain in `spec fn`, `requires`, `ensures`, and `invariant` clauses; proof-only derivations belong in `proof fn`, and a `proof fn` is erased rather than called at run time.

### evidence and limits

Table 1 averages fine dependencies against the old MPTP approximation for 33 articles. For example, `funct 1` has 22.94 fine dependencies per theorem versus 42.05 MPTP dependencies, while `yellow 19` has 53.02 versus 137.2 (Table 1, p. 6). The paper evaluates the effect directly: on 2,078 problems with a 10-second Vampire limit, chainy (all prior premises) solves 548/2,078 = 26.4%, bushy-old solves 1,023/2,078 = 49.2%, and bushy with fine dependencies solves 1,105/2,078 = 53.2% (Table 3, p. 17). The paper states: “Using the pruning based on the new fine-grained analysis Vampire solves 1105 problems, which is an 8% improvement over the heuristic pruning in the number of problems solved.” (Section 6.1, p. 17.) The arithmetic 1,105 − 1,023 = 82, and 82/1,023 = 8.0%, agrees with the claim.

The method assumes that the checker can be run repeatedly and that a greedy locally minimal environment is useful. Greedy removal can be expensive; the paper calls the minimization of some dependencies time consuming (Section 3, p. 5). “Minimal” is relative to the checker and the chosen article: alternative proofs may need different facts, and a dependency set that supports the recorded proof is not necessarily the only sufficient set.

## technique: proof matrix and formula features

### what it is

The exact dependencies become supervised labels. For each formula pair `(c,p)`, define `μ(c,p)=1` when premise `p` occurs in the recorded proof of conjecture `c`, otherwise `0`. The paper names this the proof matrix: “Using the fine-grained Mizar proof analysis - which says for each pair of formulas p, c ∈ Γ whether p is used in the mml proof of c - define the function μ : Γ × Γ → {0, 1} by” (Definition 2, p. 7.) The matrix is the adjacency matrix of direct proof dependencies.

Each formula is represented by a binary vector over all symbols and subterms in the corpus. Variables use de Bruijn indices, so syntactic term equality is string equality. `Φ(c,i)=1` exactly when feature `t_i` occurs in formula `c`; the feature set is the set of present terms (Definition 3, p. 8). For a conjecture, the learner scores every candidate premise and ranks the scores; the top `n` are advised.

### steps from the paper

1. Translate Mizar formulas and dependencies into first-order formulas (Section 4, p. 7).
2. Build `Γ`, the set of formulas, and set `μ(c,p)` from each proof's exact dependencies (Definition 2, p. 7).
3. Enumerate all symbols and subterms `T` in `Γ`; represent each formula by its binary occurrence vector `ϕ_c` (Definition 3, p. 8).
4. For each candidate premise, train a real-valued classifier over conjecture features; at query time rank all candidates and retain a chosen top segment (Section 4, pp. 8–9).

### Verus form

Inference: Treat each Verus `spec fn`, `lemma`, and proved function contract as a node. Build labels from the lemmas that actually occur in a successful proof, after dependency extraction. Encode identifiers, operators, types, quantified variable shapes, and normalized terms as binary or weighted features. Given a new verification obligation, rank candidate lemmas and expose only the top `n` to the proof-generation or solver-context layer. This is a retrieval layer around Verus; it does not replace Verus's checking and cannot turn a wrong lemma into a valid proof.

### evidence and limits

The corpus has one recorded Mizar proof per theorem, so the label set is the premises used by that proof, not all premises that could support an alternative proof (Section 4, pp. 7–8). The authors explicitly caution that training on a human proof may differ from training on an ATP-discovered proof. Feature choice is arbitrary; symbols that are used inconsistently across a corpus may need abstraction (Conclusion, pp. 23–24). This leaves a direct failure mode for Verus: renamed APIs, generic instantiations, and equivalent but differently written specifications may not share surface features.

## technique: naive-Bayes premise ranking

### what it is and how to do it

For each premise `p`, train a classifier `C_p(c)` estimating the probability that `p` is used for conjecture `c`, conditional on the conjecture's features. The paper converts the naive-Bayes log odds into a linear feature score: “Line (6) shows that the naive-Bayes classifier is ‘essentially’ (after the monotonic transformation) a linear function of the features of the conjecture.” (Section 4.1, p. 10.) Compute each feature weight from the log likelihood ratio in equation (7), add the prior log odds, score every candidate premise, and rank by score. The paper uses SNoW's multiclass naive Bayes as the comparison learner (Sections 4 and 6.2, pp. 9, 18).

Inference: In Verus, fit one binary classifier per lemma or a multiclass ranker from successful proof traces, then retrieve the highest-scoring lemma names for the current goal. Keep the retrieved lemmas available to proof search, while Verus remains the authority. The method's conditional-independence assumption is unlikely to hold for correlated lemma families, so treat scores as ranking advice rather than probabilities with calibrated meaning.

### evidence

On the chronological MPTP2078 training protocol, SNoW places about 80% of the recorded premises within its top 50 predictions, whereas MOR places 88% there (Section 6.2, p. 18). The denominator is the number of premises used in each recorded proof, averaged over the 2,078 problems; this is recall against Mizar labels, not the fraction of problems proved. In the ATP experiment with a 10-second limit, SNoW-70 solves 722/2,078 = 34.7%, a 31.8% gain over 548, while MOR-60 solves 795/2,078 = 38.2%, a 45.1% gain (Table 4, p. 19). The table's 31.8% is `(722−548)/548`; 45.1% is `(795−548)/548`.

## technique: Gaussian-kernel multi-output ranking (MOR)

### what it is

MOR replaces the linear score with a kernel function over formula features. The linear kernel is the feature-vector dot product; the paper also defines a Gaussian kernel with width `σ` (Example 1, p. 11). A classifier is a weighted sum of kernel comparisons, regularized by `λ` to control complexity. The optimization is square loss plus `λ‖f‖²` (equation 9, p. 12). For all premise outputs together, construct kernel matrix `K` and label matrix `Y`, then solve `A=(K+λI)⁻¹Y` (equations 12–14, p. 14). The paper says: “Thus, to fully determine the classifiers, it remains to find good values for the parameters λ and σ.” (Section 4.3, p. 14.) It chooses them by logarithmic grid search and cross-validation using a 70/30 split (p. 14).

### steps from the paper

1. Construct the binary formula features and choose a kernel, using the Gaussian kernel for the reported experiments (Sections 4 and 4.2, pp. 8, 11).
2. Build `K` from pairwise kernel values over the `n` training formulas and `Y` from the proof matrix (Section 4.3, p. 13).
3. Choose `λ` and `σ` by logarithmic grid search with a 70/30 training split and cross-validation (Section 4.3, p. 14).
4. Solve `A=(K+λI)⁻¹Y`; each column gives one premise classifier (Section 4.3, p. 14).
5. For a new conjecture, evaluate all premise columns, rank scores, and give Vampire the selected top segment (Sections 4.3 and 6.3, pp. 14, 19).

### Verus form

Inference: Build `K` between the new obligation's normalized feature vector and the vectors of prior verified obligations. Store `Y` as lemma-use labels and solve the same regularized multi-output ranking problem outside Verus. Pass only selected lemma declarations or proof hints to a Verus proof-generation loop. Verus has no kernel matrix, Gaussian classifier, or `A=(K+λI)⁻¹Y` construct; these are an external recommendation service. The final proof must still use valid Verus constructs and be checked by Verus.

### evidence, assumptions, and failure

MOR's 88% top-50 recall is measured against Mizar's single human proof, while its end-to-end result is 795 solved in 10 seconds and 729 solved in 5 seconds at the best reported single top-segment setting (Section 6.3, pp. 19–20). The combined MOR-40/100 runs solve 824/2,078 = 39.7%, which is 50.4% above the 548 baseline (Table 5, p. 21); `(824−548)/548 = 50.36%`. The paper notes that later chronological problems become harder and that human selection increasingly outperforms the algorithms (Section 6.3, pp. 21–22). Kernel computation is quadratic in the number of training points in the general case (Section 4.2.4, p. 13), and poor feature or hyperparameter choices can overfit. The result therefore assumes a sufficiently similar, ordered corpus and a budget that can pay for training and ranking.

## what remains trusted, contradictions, and product threat

The formal checker, Mizar's translation to first-order formulas, Vampire, the solver implementation, the hardware, and the correctness of the recorded specifications remain trusted. The dependency minimizer only establishes that the retained environment verifies the recorded item; it does not establish that the theorem expresses the intended property. The machine learner is not trusted for soundness because it only chooses premises; a proof checker accepts or rejects the final proof.

The paper's 50% headline is internally consistent for Table 5: 824/2,078 and `(824−548)/548`. Its Section 6.1 prose calls 1,105 versus 1,023 an “8% improvement”; the exact ratio is 8.01%. The 88% versus 80% recall values in Section 6.2 are read from Figure 1, not table fractions, so no exact numerator is supplied. The 5-second and 10-second results use different time limits and must not be compared as if they were one denominator.

Inference: VL should not redo exact premise ranking, proof-dependency labels, kernel regularization, or the basic “retrieve then check” pattern as if they were new. What remains specific to Verus is extracting dependencies from Rust/Verus proof bodies, normalizing ownership and quantified-state features, and evaluating whether retrieved contexts reduce solver time without destabilizing proofs. The threat to an agent-written verified-Rust product is medium: premise retrieval could materially reduce proof search cost and token use, but this paper does not address Rust ownership, specification correctness, unsafe code, or whether an LLM can produce faithful Verus proofs. Its 2,078-problem Mizar benchmark is much narrower than product-scale Rust crates, and its training labels come from human-written proofs.

## techniques for the catalog

- exact dependency minimization — split verified articles into one-item units and greedily remove environment facts while recompiling to retain only checker-required dependencies
- proof-matrix supervision — label each conjecture–premise pair from exact proof dependencies and train retrieval on those labels
- structural formula features — represent symbols and subterms as binary formula features for premise scoring
- naive-Bayes premise ranking — estimate per-premise usefulness from feature likelihood ratios and advise the highest-ranked premises
- Gaussian-kernel MOR — learn regularized nonlinear premise scores with a shared kernel matrix, cross-validated `λ` and `σ`, and multi-output ranking
- retrieve-then-ATP evaluation — measure both label recall and solved-problem counts after giving selected premises to an automated prover

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
