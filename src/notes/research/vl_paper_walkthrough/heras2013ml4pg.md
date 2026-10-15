# ML4PG in Computer Algebra verification
(authored by agents unless marked 🧑)
Tag: `heras2013ml4pg`, [paper](http://arxiv.org/abs/1302.6421v3)

## scope and trust boundary

Heras and Komendantskaya use ML4PG, a machine-learning extension to Proof General, to suggest proof patterns during Coq/SSReflect development. The abstract says it “provides statistical proof hints during the process of Coq/SSReflect proof development.” (Abstract, p. 1). They apply it to CoqEAL, a refinement library for verified computer-algebra algorithms, and use the suggestions to formalize an efficient triangular-matrix inverse.

ML4PG is a proof-development assistant, not a proof checker. It extracts low-level features from existing proof scripts, clusters lemmas, and presents likely analogues for a stuck goal. The developer still inspects the suggested proofs and formulates a strategy. The paper states: “the user is left with the task of finding a proof strategy from the suggestions provided by ML4PG.” (Section 2, p. 3). Inference: a Verus analogue may prioritize candidate lemmas or proof traces, but only Verus checking establishes correctness; statistical similarity is evidence for search, not a trusted fact.

## technique 1: separate efficient algorithm correctness into refinement stages

what it is and when to use it. Define a rich, easily specified algorithm, prove its correctness, then refine it through progressively executable representations. Use this when a fast representation is difficult to reason about directly.

steps from the paper. CoqEAL splits formalization into three steps: “S1. define the algorithm relying on rich dependent types, which will make the proof of its correctness easier”; “S2. refine this definition to an efficient algorithm described on high-level data structures”; and “S3. implement it on data structures which are closer to machine representations.” (Section 2, p. 2). For triangular matrices, use SSReflect's abstract `invmx`, define recursive `fast_invmx` on a high-level matrix decomposition, prove equivalence between `invmx` and `fast_invmx`, then define list-of-lists `cfast_invmx` and prove `seqmx_of_mx (fast_invmx M) = cfast_invmx (seqmx_of_mx M)` (Lemma 1, p. 3). The morphism lemma changes representation, and translation lemmas relate executable operations to abstract operations.

Verus form. Inference: define a mathematical Rust/Verus spec over sequences or maps, prove the algorithmic implementation correct against it, then refine to an executable vector or slice representation. Use `spec fn` for abstract operations, `ensures` for refinement equivalence, and `proof fn` lemmas for representation morphisms. Keep the executable data structure and its invariants explicit; unlike Coq's locked matrices, Rust code executes directly, so refinement must also preserve ownership and bounds.

evidence and limits. The paper's CoqEAL library contains approximately 400 definitions and 700 lemmas (Section 2, p. 2), making manual strategy search difficult. The triangular inverse example demonstrates a method for one algorithm; it does not report a percentage of all CoqEAL developments successfully refined. Inference: staged refinement can reduce proof complexity, but each abstraction boundary adds a theorem and a potential mismatch.

## technique 2: retrieve proof patterns by feature extraction and clustering

what it is and when to use it. Represent proof scripts by simple structural features, cluster similar lemmas, and show clusters containing a stuck goal. Use this when a library has many related lemmas but its methodology is hard for a new user to discover.

steps from the paper. During Proof General interaction, extract low-level features from Coq/SSReflect proofs; extend Coq's compilation to extract features from already-developed library lemmas (Section 3, Step 1, p. 4). In the example, extract features from 18 CoqEAL files containing 720 lemmas. Send the statistics to a selected unsupervised clustering implementation (Step 2). ML4PG integrates MATLAB K-means and Gaussian and Weka K-means, FarthestFirst, and Expectation Maximisation; the example uses MATLAB K-means by default. Choose a granularity from 1 to 5; ML4PG computes the number of clusters from library size (Step 3). Run clustering repeatedly, then use cluster proximity and frequency to display the most reliable cluster (Step 4).

Verus form. Inference: extract features from Verus proof functions, lemma calls, invariant shapes, quantified triggers, and contract structure. Cluster successful proof traces and use the nearest cluster to suggest lemma names or a sequence of calls. The features should identify the target obligation and relevant type/trait parameters; otherwise similarity can be syntactic noise. Feed every suggestion back through Verus, and store only accepted traces as training evidence.

evidence and limits. Table 1 evaluates five clustering algorithms at five granularities. The four target lemmas (`cfast_invmxP`, rank, fast multiplication, determinant) occur together in Gaussian clusters of sizes 24, 12, 10, 10, 10 for granularities 1–5; MATLAB K-means gives 20, 14, 4, 0, 0; Weka K-means 16, 11, 4, 0, 0; Expectation Maximisation 52, 45, 43, 39, 14; FarthestFirst 30, 27, 27, 26, 20 (Table 1, p. 5). The denominator for each number is one cluster containing all four target lemmas under that algorithm/granularity; zero means no such cluster. The authors report that most variations include the target lemmas, but larger clusters can contain distracting lemmas (Section 3, p. 5). Inference: cluster size is a retrieval tradeoff, not a proof-success rate.

## technique 3: inspect retrieved analogues to synthesize a reusable strategy

what it is and when to use it. Treat cluster members as worked examples, compare their proof scripts, and abstract the common sequence into a strategy. Use this when the machine learner can find similar lemmas but cannot safely invent the proof itself.

steps from the paper. Invoke ML4PG while stuck on the inductive case of `cfast_invmxP`. Inspect the three suggested counterparts for rank, determinant, and fast matrix multiplication (Figure 1, Section 2, p. 3). Compare their scripts and extract the shared strategy: apply the morphism lemma to change from abstract to executable matrices, then apply translation lemmas for each matrix operation. Apply this strategy to the target lemma. The paper calls it “Proof Strategy 1 Apply the morphism lemma to change the representation from abstract matrices to executable ones. Subsequently, apply the translation lemmas of the operations involved in the algorithm.” (Section 2, p. 3).

Verus form. Inference: when a Verus goal about a concrete vector implementation resembles prior verified algorithms, retrieve complete proof functions and identify shared representation lemmas. Apply a `proof fn` that first establishes the abstraction relation, then calls operation-preservation lemmas. Use `assert`/`calc` to bridge equalities and `ensures` to expose the final relation. Keep strategy extraction as an offline or interactive tool; do not generate executable proof calls without Verus checking.

evidence and limits. The target strategy was inferred from four analogous lemmas, not mechanically generated. The authors explicitly identify future work: “we could apply symbolic machine-learning techniques such as Rippling and Theory Exploration to automatically conceptualise the proof strategies” (Section 2, p. 3). Thus the demonstrated workflow still depends on expert inspection. Inference: agent-written Rust benefits from retrieval, but an agent can copy a superficially similar invariant and prove the wrong property if contracts are weak.

## technique 4: tune granularity and repetition to balance precision and recall

what it is and when to use it. Vary clustering granularity and repeat randomized clustering, then select results with high within-cluster proximity and frequency. Use this when one clustering run or one cluster size gives either too many unrelated suggestions or misses relevant analogues.

steps from the paper. Let granularity 1 produce few large clusters with low correlation and granularity 5 produce many small clusters with high correlation (Section 3, Step 3, p. 4). For each selected algorithm and granularity, run clustering 200 times because one run can differ from another (Step 4, p. 4). Count how often each cluster appears and combine that frequency with proximity to choose the single most reliable cluster shown to the user. Inspect the resulting cluster rather than accepting its membership as a proof.

Verus form. Inference: expose a retrieval parameter controlling cluster size and rerun randomized embedding/clustering, but report run count, corpus size, feature schema, and solver-verified suggestion count. Use high granularity for a narrow invariant pattern and lower granularity for discovering broader library analogies. The only accepted outcome is a Verus proof that compiles under the recorded configuration.

evidence and limits. The paper's 200-run repetition is a stability heuristic, not a statistical confidence interval. Expectation Maximisation and FarthestFirst retained more lemmas at low granularities, which the authors say made common-pattern discovery difficult; higher granularity refined some clusters (Section 3, p. 5). Inference: a product should show several candidate clusters and their stability rather than hide the parameter choice.

## proved, measured, trusted, and product threat

The paper demonstrates ML4PG-assisted discovery of a CoqEAL proof strategy and reports cluster memberships for 720 lemmas, five algorithms, five granularities, and 200 runs per configuration. It does not prove that clustering is semantically sound, nor does it report an end-to-end percentage of lemmas solved by ML4PG. Trusted components include Coq/SSReflect's kernel, feature extraction, clustering implementation, and human interpretation of suggestions. Existing work already provides library-scale proof-pattern retrieval and a refinement methodology; VL should reuse these ideas rather than build a generic language model that guesses lemma names without corpus evidence. Inference: the threat to agent-written verified Rust is search bias and specification drift, not unsoundness when Verus checks every result. The larger threat is accepting a retrieved pattern before checking that its abstraction relation and postcondition match the product code.

## techniques for the catalog

- staged refinement for efficient verification — prove an abstract algorithm, refine to high-level structures, then prove correspondence to machine representations
- proof-feature clustering — extract proof-script features and cluster library lemmas to retrieve likely analogues
- human-guided strategy synthesis — inspect analogous proofs and abstract their common lemma sequence into a reusable strategy
- stability and granularity tuning — vary cluster granularity and repeat randomized runs, using proximity and frequency to select suggestions

Checked 2026-10-15 against the paper by a Codex agent for ml4pg_in_computer_algebra_verification_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
