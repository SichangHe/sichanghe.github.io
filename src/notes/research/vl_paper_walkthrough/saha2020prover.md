# PRover: Proof Generation for Interpretable Reasoning over Rules
(authored by agents unless marked 🧑)

Tag: `saha2020prover`, [paper](https://doi.org/10.18653/v1/2020.emnlp-main.9)

## problem and result

PRover is a transformer model for answering binary questions over natural-language facts and rules while generating a directed proof graph. The graph contains the facts, rules, and negation-as-failure (NAF) assumptions needed to derive or refute the question. Its architecture has a QA module, a node module, and an edge module on top of RoBERTa. Training uses a joint cross-entropy loss. Inference fixes the predicted node set and solves an integer linear program (ILP) for a high-scoring edge set satisfying semantic constraints, especially graph connectivity.

The paper's abstract says: “During inference, a valid proof, satisfying a set of global constraints is generated.” (Abstract, PDF p. 1.) It evaluates synthetic RuleTaker-style theories, out-of-distribution Birds-Electricity theories, and crowdsourced paraphrases. On the DU5 test set, the model's exact proof accuracy is 87.1% over 20,192 examples; on depth-5 questions it is 65.1% over 2,003 examples. QA remains 99.3% on the same DU5 set. The proof graph is therefore an interpretable artifact, but its accuracy degrades as reasoning depth and edge count increase.

## technique 1: represent a proof as a typed directed graph

Use this when a rule-based task has explicit facts and rules and requires an inspectable chain of reasoning. A proof is `P = (N, E)`: N is a subset of facts, rules, and NAF; E is a subset of ordered node pairs. Edges run from a fact or NAF node to a rule, or from a rule to another rule, indicating that a premise is consumed and a derived fact is passed onward. The representation supports cycles between rules and nodes with many incoming edges.

Steps from Sec. 3.1 (PDF pp. 2–3):

1. Parse each example into a context C containing fact set F and rule set R, a question Q, answer A, and gold proof P.
2. Create one candidate node for every fact, rule, and a special NAF node. NAF represents a negated statement whose positive form cannot be derived.
3. Select the nodes needed for the proof. For a true statement, connect supporting facts through rules; for a false statement, include a failed branch or NAF node as appropriate.
4. Predict directed edges between selected nodes. A proof may include rule-to-rule edges in either direction and more than two incoming edges at a rule.
5. Evaluate exact node, edge, and whole-proof matches. If multiple gold proofs exist, a prediction receives credit when it exactly matches any one.

The formal definition is explicit: “A proof, P = (N , E), is a directed graph with nodes n ∈ N and edges e ∈ E.” (Sec. 3.1, PDF p. 3.) The paper's Q1 example uses F2 and R4 to derive “The wire is conducting,” then NAF to support the false answer that the wire is not conducting. A failed proof displays the shallowest branch that cannot derive the question.

Verus form (Inference): model facts, rules, and NAF as an enum and edges as a finite sequence with uniqueness predicates in a `spec fn`. Inference: use `requires` to state that edge endpoints are valid nodes and that edge kinds obey the allowed fact-to-rule and rule-to-rule forms. Inference: an `ensures` clause on a checker can state that every accepted path is a valid derivation of the claimed answer. Inference: represent derivation rules as ghost specifications and keep graph traversal executable; a `proof fn` can establish that each edge's premises imply its consequent. The natural-language parsing and neural scores remain outside the Verus proof unless their contracts are separately specified.

## technique 2: jointly predict answers, proof nodes, and proof edges

Use this when answer-only supervision is insufficient and the system should learn which textual items form an explanation. The input is the concatenation of all facts and rules, separator tokens, and the question. A shared RoBERTa encoder produces token embeddings.

Steps from Sec. 3.3 (PDF pp. 3–4):

1. Encode `[CLS] context [SEP][SEP] question [SEP]` with RoBERTa.
2. Feed the `[CLS]` embedding to a two-layer QA head and predict the binary answer with softmax.
3. Mean-pool the token embeddings belonging to each fact or rule to obtain its node representation. Apply a linear transform to `[CLS]` for the NAF representation.
4. Feed every node representation to a node classifier that predicts presence or absence in the proof.
5. For each ordered pair of candidate nodes, concatenate source embedding, target embedding, and their elementwise difference. Feed this edge embedding to an edge classifier for a binary edge score.
6. Minimize the sum of QA, node, and edge binary cross-entropy losses.

The paper specifies the input and output design: “Our model consists of three modules: (1) QA module, (2) Node module, and (3) Edge module.” (Sec. 3.3, PDF p. 4.) It masks during training edges that are self-loops, connect absent nodes, connect fact-to-fact, or connect rule-to-fact. Masked labels do not contribute to loss. These masks impose semantic structure and shrink the edge-labeling problem.

Verus form (Inference): the neural model itself is not a Verus proof. Inference: expose a Rust API whose postcondition states that a returned proof candidate contains scores and typed nodes, then verify a separate deterministic constraint checker. Inference: use a `spec fn` to define legal edge kinds and an `ensures` clause to guarantee that masked illegal edges cannot appear in an accepted proof. Inference: model floating-point probabilities as an explicitly trusted input or replace them with fixed-point values; Verus cannot infer correctness from an unproved neural network implementation.

## technique 3: enforce valid graphs with constrained ILP inference

Use this after node predictions, when edge probabilities alone may select disconnected or semantically impossible explanations. PRover fixes the node set N from the node module and optimizes only edge variables. Let e(m,n) be a zero-one edge decision and φ(m,n) its predicted probability. The objective rewards selecting edges with high predicted probability and omitting edges with low probability.

Steps from Sec. 3.4 (PDF pp. 4–5):

1. Fix N, F, and R from the predicted node set and retain candidate edges only between selected nodes.
2. Forbid self-loops, fact-to-fact edges, and rule-to-fact edges; force edges incident to absent nodes to zero.
3. Add source and sink nodes. Connect source to every proof node and every proof node to sink in an augmented graph.
4. Introduce a capacity c(m,n): source-to-node capacity is |N|, node-to-sink capacity is 1, node-to-node capacity is |N|, and all other capacities are zero.
5. Introduce nonnegative flow variables f(m,n), constrain each by capacity, and impose flow conservation at every augmented node.
6. Force |N| units to leave the source. Couple flow to selected edges so that positive flow is possible only when the corresponding edge is selected.
7. Solve the ILP maximizing the edge score subject to these constraints; return the selected graph as the proof.

The connectivity construction is stated in the paper: “Now, there can be a maximum total flow of |N | from the source to the sink, if and only if the graph is connected.” (Sec. 3.4, PDF p. 5.) The source-to-sink max-flow reduction checks connectivity in the equivalent undirected graph, even though the proof edges are directed. Training also masks invalid edge labels, while ILP inference enforces the global constraints exactly.

Verus form (Inference): encode an ILP candidate as a Rust record with Boolean edge fields and integer flow fields. Inference: write `spec fn` predicates for capacity, conservation, node membership, and edge legality. Inference: a `proof fn` can show that a returned assignment satisfies connectivity by induction over a finite flow decomposition; its `ensures` clause can state that each selected node is reachable from the source. Inference: Verus can verify the checker and a bounded optimizer's result certificate, but it does not solve arbitrary ILPs automatically. The optimizer should therefore emit a witness assignment and objective value for deterministic checking.

## technique 4: handle negation as failure and failed branches

Use NAF when the rule language treats failure to prove a positive statement as evidence for its negation. PRover collapses all NAF nodes into one learned representation during training, although a proof can contain several NAF instances. For a failed question, it returns the shallowest branch that fails rather than fabricating a successful derivation.

Steps from Sec. 3.1 and Sec. 3.3 (PDF pp. 3–4):

1. Determine which positive statements are not derivable from the context.
2. Represent each needed negation as a NAF node linked to the rule or answer it supports.
3. Learn the NAF embedding from the `[CLS]` representation, which summarizes derivable context facts.
4. Include NAF in node and edge prediction and in the ILP's legal graph.
5. For an unprovable question, output a failed proof branch at the shallowest failure depth.

The paper defines the semantics: “NAF in logic programming is a non-monotonic inference rule used to derive ‘not s’ (negation of the statement) from failure to derive s.” (Sec. 3.1, PDF p. 3.) This assumption is a logic choice, not classical negation. It explains why the model needs a dedicated NAF embedding and why a proof can be inconsistent with an open-world interpretation.

Verus form (Inference): define a `spec fn derivable` over a finite fact/rule closure and a separate `spec fn naf_valid` requiring that the positive statement is absent from that closure. Inference: prove NAF edges only when `naf_valid` holds; use `requires` on a proof function and `ensures` to make the non-monotonic assumption explicit. Inference: do not encode NAF as ordinary negation unless the product's logic has that meaning. A finite closure bound and termination measure are needed for recursive rule evaluation.

## evidence and limitations

The main DU5 test experiment contains 20,192 examples: QA 99.2% for RuleTakers and 99.3% for PRover; PRover node accuracy 89.2%, edge accuracy 87.5%, proof accuracy 87.1%, and full accuracy 87.1%. The depth-specific proof denominator is 2,003 at depth 5, where proof and full accuracy are 65.1%; the paper reports an average of 6 correctly predicted edges out of 7 in such proofs. On Birds-Electricity zero-shot evaluation, the DU5-trained model is tested on 5,270 examples across B1–B2 and E1–E4; PRover QA is 86.5%, node 81.3%, edge 81.4%, proof 80.7%, and full 80.5%, compared with RuleTakers QA 80.1%.

Training-data ablation uses 10k, 30k, and 70k DU5 examples. With 30k (40% of the 70k training set), PRover reaches 97.8% QA but only 72.5% proof accuracy; with all 70k, QA is 99.3% and proof accuracy 87.1%. The ablation table's DU5 test denominator is 20,192. Removing NAF learning lowers node accuracy from 89.2% to 83.1% and proof accuracy from 87.1% to 81.7%. Removing constraints during training and inference lowers proof accuracy to 81.9%; adding ILP only at inference raises it to 82.9%. Removing connectivity alone changes proof accuracy to 87.0%; only 57 examples had disconnected proofs without that constraint.

On ParaRules, a model trained on DU3 plus paraphrased data is evaluated on 8,008 test examples. QA is 98.4%, node 96.0%, edge 95.8%, proof 95.4%, and full 95.1%. The reported counts and percentages are table-specific; they should not be mixed with DU5's 20,192-example denominator. The appendix reports a random-forest edge baseline at 47% edge accuracy, because lexical overlap cannot learn NAF or directionality.

The paper's implementation uses RoBERTa-large (355M parameters), batch size 8, maximum sequence length 300, at most 5 epochs, learning rate 10^-5, weight decay 0.1, dropout 0.1, random seed 42, and one V100 epoch time of 2.5 hours (Appendix A.1, PDF p. 12). Proof generation is supervised by gold graphs; creating that supervision is costly. Proof accuracy falls with depth, and the approach assumes the rule semantics and gold graph representation are correct.

## trust boundary and application to VeruLaw

PRover's “proof” is an exact match to a dataset graph, not a machine-checked proof of a theorem. The ILP guarantees only the encoded graph constraints. The transformer scores, tokenization, rule parsing, training data, NAF semantics, optimizer, and metric implementation remain trusted. The reported full-accuracy equality with proof accuracy is empirical consistency, not a formal implication.

Inference: for VeruLaw, the reusable idea is to separate a generative agent from a small deterministic artifact checker. Inference: an agent could propose a Rust proof plan or dependency graph, while Verus checks typed graph constraints, reachability, and explicit rule applications. Inference: node/edge decomposition suggests diagnostics for missing lemmas and incorrect dependency links. Inference: NAF is a warning for VL specifications because “cannot prove” must not silently mean “false”; Rust verification should require an explicit closed-world assumption. Inference: the product threat is moderate and indirect: neural proof suggestions can omit a needed premise while appearing plausible, but a sound Verus checker can reject malformed proof objects. The paper does not address executable Rust, memory safety, solver soundness, or specification adequacy.

Inference: VL should not redo generic graph-connectivity ILP or neural natural-language proof generation as new formal-verification algorithms. A useful new experiment would measure whether Verus proof graphs and certificate checkers improve agent repair time, with denominators for accepted and rejected proof plans.

## techniques for the catalog

- typed proof graphs — represent facts, rules, NAF, and derivation edges as an inspectable directed graph
- joint QA and proof prediction — train answer, node, and edge modules with one shared encoder and summed losses
- constrained ILP inference — choose a high-scoring edge set subject to legality and max-flow connectivity constraints
- negation as failure — represent unprovable positive statements with explicit NAF nodes and semantics
- failed-branch explanations — return the shallowest failed proof branch when a question is not derivable
- proof consistency metrics — measure exact node, edge, proof, and answer-plus-proof accuracy with explicit dataset denominators

Checked 2026-10-15 against the paper by a Codex agent for prover_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
