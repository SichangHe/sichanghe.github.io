# CodeCircuit: Toward Inferring LLM-Generated Code Correctness via Attribution Graphs
(authored by agents unless marked 🧑)
Tag: `he2026codecircuit`, [paper](https://arxiv.org/abs/2602.07080)

## what the paper does

He et al. propose CodeCircuit, a white-box diagnostic that predicts whether each generated code line is logically correct from the generating model’s internal attribution graph. It is a predictor and debugging instrument, not a formal proof. The paper’s problem formulation reads: “The problem is thus transformed into learning a diagnostic mapping F : Gi → yi.” (section 2, p.3) Here `Gi` is the graph for line `i`, and `yi` is its binary correctness label.

The experiment uses Gemma-2-2B-IT with a corresponding transcoder and Circuit-Tracer. It traces 1,447 Python, 3,423 C++, and 3,126 Java line instances (Appendix A.1, p.12). Labels come from GPT-4o’s line-wise checker, not execution or Verus (section 4.1, p.5). The checker prompt tells the judge to score every line after the first requirement violation as 0 (Table 6, p.13), so later lines are labeled incorrect by rule, not by separate inspection. Python has 81.6% correct lines, C++ 66.8%, and Java 61.7% (Appendix A.1, p.12). Inference: these are labeled records, not independent programs, so a line-level score cannot be read as whole-program correctness.

## technique: replace MLPs with sparse transcoders and build a causal graph

What it is: CodeCircuit uses a local replacement model. Per-layer transcoders map each residual stream to sparse interpretable features, reconstruct the MLP output, and retain an error residual. Nodes include feature nodes, token embeddings, error terms, and output logits; edges carry linearized influence under a frozen forward pass (sections 2 and 3.1, pp.2–4).

How to apply it:

1. Run the code-generation model on a prompt and split the generated code into logical lines (section 2, p.3)
2. At each layer, encode residual stream `x(l)` as `f(l) = σ(Wenc(l)x(l)+benc(l))`; decode it as `m̂(l)=Wdec(l)f(l)+bdec(l)` (section 2, p.2)
3. Add the reconstruction residual `e(l)=m(l)−(Wdec(l)f(l)+bdec(l))` as an error node (section 3.1, p.4)
4. Connect source node `i` to later node `j` with the Jacobian-based attribution weight `wij = ai vin,jᵀ Jij vout,i`, while stopping gradients through nonlinearities (section 2, Eq. 3, p.2)
5. Attribute nodes to the target output logit in one backward pass and prune nodes below the influence threshold (section 2, pp.2–3; the appendix reports a node threshold of 0.8, Appendix A.3, p.12)

Verus form: Inference: there is no sound Verus translation of a neural attribution graph that preserves its meaning. A Verus `spec fn` could define a graph data structure and prove graph algorithms such as acyclicity or influence aggregation, but it would prove only those mathematical operations on recorded values. It would not prove that an attribution weight reflects code semantics or that a line is correct. This is unlike Verus functional contracts, where the specification states the behavior to be proved.

Evidence and limits: extraction used bfloat16 on one GPU, at most ten output logits, cumulative target probability 0.95, at most 8,192 feature nodes, mini-batches of 64, and skipped prompts over 550 characters (Appendix A.2, p.12). Inference: these settings bound memory and runtime but tie reproducibility to one model and tooling stack. The authors call the graph “a formal proxy for the model’s latent algorithmic execution” (section 2, p.3). Inference: this is a modeling choice, not a formal correctness guarantee.

## technique: fixed structural feature vector

What it is: a mapping `Φ(Gi)=xi` turns each variable-sized pruned graph into a fixed-length vector. It includes graph size, node and error counts, output probability and entropy, influence statistics, density, connected components, clustering coefficient, centrality, and total logit attribution (section 3.2, pp.4–5).

How to apply it: first prune with the influence mask (the appendix uses threshold 0.8). Then compute: active feature count; pruned feature and error counts; top-1 probability and entropy; mean influence; total and mean error influence; error-to-feature ratio `ηi`; graph density `ρi=|Ei|/(|Vi|(|Vi|−1))`; connected components; clustering coefficient; moments of betweenness centrality; and integrated feature-to-logit influence (Appendix A.3, pp.12–13; section 3.2, pp.4–5). Section 3.2 says Appendix A.3 enumerates all features, but the appendix list omits `ηi`, the clustering coefficient, the betweenness standard deviation, and total logit attribution, which appear only in section 3.2; the appendix adds the layer-wise histogram, edge-weight statistics, shortest-path length, and an input-to-logit distance. A high `ηi` is interpreted as greater reliance on unexplained residual computation, while disconnected structure may indicate fragmented state tracking (section 3.2, p.4).

Verus form: Inference: define a Rust record for the feature vector and pure `spec fn`s for density, component counts, and ratios. Use `requires` to exclude zero denominators and `ensures` to relate each result to the graph. These proofs check feature extraction, not the empirical interpretation that a high ratio predicts a bug.

## technique: supervised diagnostic classifier and cross-language transfer

What it is: a Gradient Boosting Decision Tree maps `xi` to `ŷi=P(yi=1|Gi;ϕ)`. Training minimizes cross-entropy over labeled lines (section 3.3, p.5). Feature importance is used to diagnose which structural property is associated with a failure.

How to apply it: generate labeled lines; extract vectors; fit the GBDT; treat incorrect lines as the positive class; and report AUROC, AUPR, and FPR@95 (section 4.1, p.5). Train on one language and test on another to measure transfer. The paper translates MBPP specifications into semantically equivalent Java and C++ tasks, keeping algorithmic logic while changing surface syntax (section 4.1, p.5).

Evidence: Table 1 reports CodeCircuit AUROC/AUPR/FPR@95 of 79.89/54.77/77.84 for Python, 68.06/56.83/79.66 for Java, and 72.21/64.55/80.51 for C++ (Table 1, p.6). These values use the line-level datasets above. The paper does not state the train/test split, test-set sizes, number of runs, or any confidence interval. Baseline AUROC is much lower in the same table, for example 51.42 for Python Entropy and 59.07 for C++ CoE-R, the best baseline AUROC in C++ (Table 1, p.6). Cross-language transfer remains above the MaxProb baseline: a Java-trained probe tested on C++ obtains AUROC 59.33 versus C++ MaxProb 54.06, and a Python-trained probe tested on Java obtains 62.15 versus 56.29 (Table 2, p.6). Transfer is far below in-language results, for example 55.42 for a Java-trained probe on Python versus 79.89 in-language.

Verus form: Inference: a GBDT should remain an external diagnostic because Verus does not verify its learned model. A verified pipeline could use the classifier only to prioritize review, then require a Verus contract and proof for acceptance. A proof function cannot be called at run time to certify generated code.

Limits: labels are GPT-4o judgments and the model is one Gemma-2-2B-IT checkpoint. Inference: the paper does not show that classifier confidence corresponds to semantic correctness on unseen specifications, and high FPR@95 remains substantial. Inference: a predictor that is better than confidence heuristics still cannot replace execution or formal proof.

## technique: causal activation intervention

What it is: after a structural anomaly is identified, CodeCircuit intervenes on a feature node during generation. The paper tests suppression of a maladaptive “greedy matching” transcoder feature and amplification of under-active variable-binding features (section 4.4, pp.7–8).

How to apply it: identify a suspicious feature from the graph and feature analysis; install a forward hook; zero the feature or increase a selected activation; regenerate the continuation; and inspect the resulting algorithm. The binary-search case changes `high = mid`, which the paper says is “a common bug that leads to infinite loops” (section 4.4, p.7), to `high = mid - 1` (Table 3, p.8). The paper’s trace for the intervened output says: “Suppressing the “greedy” feature allows the model to correctly update the boundary.” (Table 3, p.8)

Evidence: this is one qualitative case study, not a denominator-based success rate. The authors report that the intervention produced a functionally correct solution in this example and call it “a proof-of-concept for latent debugging” (section 4.4, p.8). It also says feature amplification gave “successful corrections” without examples or counts (section 4.4, p.8). The introduction goes further, claiming the interventions prove “that the attribution graph captures the functional mechanism of generation” (section 1, p.2); Inference: one case study does not support that. Inference: because no systematic intervention count or independent correctness checker is given for all patched outputs, this evidence does not establish reliable repair.

Verus form: Inference: model activation clamping as an untrusted generation-time transformation. Let Verus check the generated Rust after intervention with ordinary `requires`, `ensures`, loop invariants, and `decreases`; only a passing proof should authorize use. Do not represent an activation change as a proof step.

## what is measured and trusted

Measured facts are graph features, line labels, classifier metrics, cross-language transfer, complexity trends, and one causal patch. The text reports CodeCircuit AUROC rising “from approximately 80 to nearly 92” as the number of lines N goes over 10, 20, 30 on Python tasks, while surface-level baselines such as MaxProb “remain stagnant” (section 4.2, p.6; Figure 3, p.7). The conclusion states: “Correct and incorrect code exhibit consistent and distinguishable internal structures across programming languages, indicating that code correctness is encoded in the model’s internal representations.” (section 6, p.8)

## techniques for the catalog

- local replacement attribution graph — substitute sparse transcoders for MLPs and trace line-level causal influence
- influence pruning — retain nodes that contribute enough to the target logit under a stated threshold
- structural feature encoding — summarize graph size, errors, topology, centrality, and logit influence in a fixed vector
- diagnostic GBDT — learn line-correctness probabilities from graph vectors and inspect feature importance
- cross-language transfer — train on one translated programming language and test on another
- causal activation patching — suppress or amplify selected features, regenerate code, and inspect a targeted repair
