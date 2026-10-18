# PRover: Proof Generation for Interpretable Reasoning over Rules
(authored by agents unless marked 🧑)

Tag: `saha2020prover`, [paper](https://arxiv.org/abs/2010.02830)

## problem and result

PRover is a transformer model for answering binary questions over natural-language facts and rules while generating a directed proof graph. The graph contains the facts, rules, and negation-as-failure (NAF) assumptions needed to derive or refute the question. Its architecture has a QA module, a node module, and an edge module on top of RoBERTa. Training uses a joint cross-entropy loss. Inference fixes the predicted node set and solves an integer linear program (ILP) for a high-scoring edge set satisfying semantic constraints, especially graph connectivity.

The paper's abstract says: “During inference, a valid proof, satisfying a set of global constraints is generated.” (Abstract, PDF p. 1.) It evaluates synthetic RuleTaker-style theories, out-of-distribution Birds-Electricity theories, and crowdsourced paraphrases. On the DU5 test set, the model's exact proof accuracy is 87.1% over 20,192 examples; on depth-5 questions it is 65.1% over 2,003 examples (Table 1, PDF p. 7). QA is 99.3% on the same DU5 set. Inference: the proof graph is therefore an interpretable artifact whose accuracy degrades as reasoning depth and edge count increase; the paper itself states that "Proof generation becomes harder with increasing depth (and hence, more nodes and edges)".

## technique 1: represent a proof as a typed directed graph

Use this when a rule-based task has explicit facts and rules and requires an inspectable chain of reasoning. A proof is `P = (N, E)`: N is a subset of facts, rules, and NAF; E is a subset of ordered node pairs. Edges run from a fact or NAF node to a rule, or from a rule to another rule, indicating that a premise is consumed and a derived fact is passed onward. The representation supports edges between two rules in both directions (the paper's example is R4 → R5 and R5 → R4) and nodes with more than two incoming edges.

Steps from Sec. 3.1–3.2 (PDF pp. 3–4), with the evaluation step from Sec. 4.1 (PDF p. 6):

1. Parse each example into a context C containing fact set F and rule set R, a question Q, answer A, and gold proof P.
2. Create one candidate node for every fact, rule, and a special NAF node. NAF represents a negated statement whose positive form cannot be derived.
3. Select the nodes needed for the proof. The datasets contain three proof types: successful proofs without NAF, successful proofs with NAF nodes, and failed proofs.
4. Predict directed edges between selected nodes. A proof may include rule-to-rule edges in either direction and more than two incoming edges at a rule.
5. Evaluate exact node, edge, and whole-proof matches (Sec. 4.1). If multiple gold proofs exist, a prediction receives credit when it exactly matches any one.

The formal definition is explicit: “A proof, P = (N , E), is a directed graph with nodes n ∈ N and edges e ∈ E.” (Sec. 3.1, PDF p. 3.) The paper's Q1 example (Figure 2) uses F2 and R4 to derive “The wire is conducting,” and hence the answer to “The wire is not conducting.” is false; this proof contains no NAF node. A failed proof, as in Q3, shows the shallowest branch of the proof tree that fails.

Verus form (Inference): model facts, rules, and NAF as an enum and edges as a finite sequence with uniqueness predicates in a `spec fn`. Inference: use `requires` to state that edge endpoints are valid nodes and that edge kinds obey the allowed fact-to-rule and rule-to-rule forms. Inference: an `ensures` clause on a checker can state that every accepted path is a valid derivation of the claimed answer. Inference: represent derivation rules as ghost specifications and keep graph traversal executable; a `proof fn` can establish that each edge's premises imply its consequent. The natural-language parsing and neural scores remain outside the Verus proof unless their contracts are separately specified.

## technique 2: jointly predict answers, proof nodes, and proof edges

Use this when answer-only supervision is insufficient and the system should learn which textual items form an explanation. The input is the concatenation of all facts and rules, separator tokens, and the question. A shared RoBERTa encoder produces token embeddings.

Steps from Sec. 3.2–3.3 (PDF pp. 4–5):

1. Encode `[CLS] context [SEP][SEP] question [SEP]` with RoBERTa.
2. Feed the `[CLS]` embedding to a two-layer QA head (two linear layers with dropout) and predict the binary answer with softmax.
3. Mean-pool the token embeddings belonging to each fact or rule to obtain its node representation. Apply a linear transform to `[CLS]` for the NAF representation.
4. Feed every node representation to a node classifier, with an architecture similar to the QA classifier, that predicts presence or absence in the proof.
5. For each ordered pair of candidate nodes, concatenate source embedding, target embedding, and their elementwise difference. Feed this edge embedding to an edge classifier for a binary edge score.
6. Minimize the sum of QA, node, and edge binary cross-entropy losses, L = L_QA + L_Node + L_Edge.

The paper specifies the input and output design: “Our model consists of three modules: (1) QA module, (2) Node module, and (3) Edge module.” (Sec. 3.3, PDF p. 4.) Sec. 3.2 (PDF p. 4) says that during training it masks the edge labels for self-loops, edges between absent nodes, and edges from fact to fact or from rule to fact. Masked labels do not contribute to the training loss. The paper says this enforces a semantic constraint and "simplifies the learning problem, since a smaller number of edges need to be labeled".

Verus form (Inference): the neural model itself is not a Verus proof. Inference: expose a Rust API whose postcondition states that a returned proof candidate contains scores and typed nodes, then verify a separate deterministic constraint checker. Inference: use a `spec fn` to define legal edge kinds and an `ensures` clause to guarantee that masked illegal edges cannot appear in an accepted proof. Inference: model floating-point probabilities as an explicitly trusted input or replace them with fixed-point values; Verus cannot infer correctness from an unproved neural network implementation.

## technique 3: enforce valid graphs with constrained ILP inference

Use this after node predictions, when edge probabilities alone may select disconnected or semantically impossible explanations. PRover fixes the node set N from the node module and optimizes only edge variables. Let e(m,n) be a zero-one edge decision and φ(m,n) its predicted probability. The objective sums φ(m,n)·e(m,n) + (1 − φ(m,n))·(1 − e(m,n)) over ordered pairs m ≠ n, so it rewards agreeing with the predicted edge probabilities.

Steps from Sec. 3.4 (PDF pp. 5–6):

1. Fix N, F, and R from the predicted node set and retain candidate edges only between selected nodes.
2. Exclude self-loops (the objective sums over m ≠ n), forbid fact-to-fact and rule-to-fact edges, and force edges incident to absent nodes to zero (constraints 2–4).
3. Build an augmented graph with source and sink nodes. The paper adds an edge from the source to any one of the nodes x in the proof, and edges from all proof nodes to the sink.
4. Introduce a capacity c(m,n): source-to-x capacity is |N|, node-to-sink capacity is 1, node-to-node capacity is |N|, and all other capacities are zero.
5. Introduce flow variables f(m,n), constrain each by 0 ≤ f ≤ capacity (Eq. 5), and impose flow conservation at every augmented node (Eq. 6).
6. Force the flow out of the source to be |N| (Eq. 7). Couple flow to selected edges with e(m,n) + e(n,m) − f(m,n)/|N| ≥ 0 (Eq. 8), so that connectivity is checked only on edges that are part of the proof.
7. Solve the ILP maximizing the edge score subject to these constraints; return the selected graph as the proof. The appendix says the ILP is modeled using PuLP (PDF p. 12).

The connectivity construction is stated in the paper: “Now, there can be a maximum total flow of |N | from the source to the sink, if and only if the graph is connected.” (Sec. 3.4, PDF p. 6.) Footnote 4 says that proofs are directed graphs and connectivity is checked in the equivalent undirected graphs. Training masks invalid edge labels, while ILP inference enforces the constraints listed above on the final edge set.

Verus form (Inference): encode an ILP candidate as a Rust record with Boolean edge fields and integer flow fields. Inference: write `spec fn` predicates for capacity, conservation, node membership, and edge legality. Inference: a `proof fn` can show that a returned assignment satisfies connectivity by induction over a finite flow decomposition; its `ensures` clause can state that each selected node is reachable from the source. Inference: Verus can verify the checker and a bounded optimizer's result certificate, but it does not solve arbitrary ILPs automatically. The optimizer should therefore emit a witness assignment and objective value for deterministic checking.

## technique 4: handle negation as failure and failed branches

Use NAF when the rule language treats failure to prove a positive statement as evidence for its negation. PRover collapses all NAF nodes into one node with a unified learned representation, although a proof can contain several NAF instances (footnote 3, PDF p. 5). The gold proofs for unprovable statements show the shallowest branch of the proof tree that fails, and the model is trained on these proofs; the paper does not describe a separate failed-branch procedure.

Steps from Sec. 3.1 and Sec. 3.3 (PDF pp. 3–5):

1. Determine which positive statements are not derivable from the context.
2. Represent each needed negation as a NAF node; its edges go to the rules that consume it (the paper's examples have edges from NAF to rules).
3. Learn the NAF embedding as a linear transformation of the `[CLS]` representation, which the paper says summarizes the set of all derivable facts given the context and the question.
4. Include NAF in node and edge prediction and in the ILP's legal graph.
5. For an unprovable question, the dataset's proof is a failed branch at the shallowest failure depth, which the model learns to predict.

The paper defines the semantics: “NAF in logic programming is a non-monotonic inference rule used to derive “not s” (negation of the statement) from failure to derive s.” (Sec. 3.1, PDF p. 4.) Inference: this assumption is a logic choice, not classical negation; it explains why the model needs a dedicated NAF embedding, and it means a proof can disagree with an open-world reading of the same facts.

Verus form (Inference): define a `spec fn derivable` over a finite fact/rule closure and a separate `spec fn naf_valid` requiring that the positive statement is absent from that closure. Inference: prove NAF edges only when `naf_valid` holds; use `requires` on a proof function and `ensures` to make the non-monotonic assumption explicit. Inference: do not encode NAF as ordinary negation unless the product's logic has that meaning. A finite closure bound and termination measure are needed for recursive rule evaluation.

## evidence and limitations

The main DU5 test experiment (Table 1, PDF p. 7) contains 20,192 examples: QA 99.2% for RuleTakers and 99.3% for PRover; PRover node accuracy 89.2%, edge accuracy 87.5%, proof accuracy 87.1%, and full accuracy 87.1%. The depth-specific proof denominator is 2,003 at depth 5, where proof and full accuracy are 65.1%; the paper reports that "on average, PROVER correctly predicts 6 out of 7 edges present in a depth 5 proof" (Sec. 4.2, PDF p. 7). On Birds-Electricity zero-shot evaluation (Table 2, PDF p. 7), the DU5-trained model is tested on 5,270 examples across B1–B2 and E1–E4; PRover QA is 86.5%, node 81.3%, edge 81.4%, proof 80.7%, and full 80.5%, compared with RuleTakers QA 80.1%.

Training-data experiment (Table 4, PDF p. 8) uses 10k, 30k, and 70k DU5 training examples. With 30k (the paper calls this 40% of the data), PRover reaches 97.8% QA but only 72.5% proof accuracy; with all 70k, QA is 99.3% and proof accuracy 87.1%. Ablations (Table 5, PDF p. 9): removing NAF learning (random NAF embeddings) lowers node accuracy from 89.2% to 83.1% and proof accuracy from 87.1% to 81.7%. Removing constraints during training and inference ("UT + No ILP") gives proof accuracy 81.9%; adding ILP only at inference ("UT + ILP") raises it to 82.9%. Removing connectivity alone gives proof accuracy 87.0%; only 57 examples had disconnected proofs without that constraint (Sec. 4.7, PDF p. 8). Inference: the Table 5 rows equal the Table 1 PRover row, so they are on the DU5 test set, but the table does not state a count.

On ParaRules (Table 3, PDF p. 8), a model trained on DU3 plus ParaRules training data is evaluated on 8,008 test examples. QA is 98.4% (RuleTakers 98.8%), node 96.0%, edge 95.8%, proof 95.4%, and full 95.1%. The reported counts and percentages are table-specific; they should not be mixed with DU5's 20,192-example denominator. The appendix (A.6, PDF p. 14) reports a random-forest edge baseline with lexical features at 47% edge accuracy, and gives three reasons it fails: NAF edges cannot be learned without a latent representation, overlap features are mostly symmetric and so cannot learn directionality, and the baseline lacks overall context information.

The paper's implementation uses RoBERTa-large (355M parameters), batch size 8, maximum sequence length 300, at most 5 epochs, learning rate 10^-5, weight decay 0.1, dropout 0.1, random seed 42, and one V100 epoch time of 2.5 hours (Appendix A.1, PDF p. 12). Proof generation is supervised by gold graphs; the paper says "proof construction for supervised training is expensive" (Sec. 4.4). Proof accuracy falls with depth. Inference: the approach assumes the rule semantics and gold graph representation are correct.

## trust boundary and application to VeruLaw

Inference: PRover's "proof" is judged by exact match to a dataset graph (Sec. 4.1), not by a machine-checked proof of a theorem. Inference: the ILP guarantees only the encoded graph constraints. Inference: the transformer scores, tokenization, rule parsing, training data, NAF semantics, optimizer, and metric implementation remain trusted. The paper says: "We empirically verify the consistency between the predicted answer and the generated proof by showing that the full accuracy matches the proof accuracy" (Sec. 5, PDF p. 9). In the reported tables the two are equal or differ by at most 1.3 points (the 10k-example row of Table 4). Inference: this is empirical consistency, not a formal implication.

Inference: for VeruLaw, the reusable idea is to separate a generative agent from a small deterministic artifact checker. Inference: an agent could propose a Rust proof plan or dependency graph, while Verus checks typed graph constraints, reachability, and explicit rule applications. Inference: node/edge decomposition suggests diagnostics for missing lemmas and incorrect dependency links. Inference: NAF is a warning for VL specifications because “cannot prove” must not silently mean “false”; Rust verification should require an explicit closed-world assumption. Inference: the product threat is moderate and indirect: neural proof suggestions can omit a needed premise while appearing plausible (the paper's depth-5 error analysis finds that, among examples with incorrectly predicted node sets, 42% have a predicted set that is a subset of the gold set, Sec. 4.7), but a sound Verus checker can reject malformed proof objects. The paper does not address executable Rust, memory safety, solver soundness, or specification adequacy.

Inference: VL should not redo generic graph-connectivity ILP or neural natural-language proof generation as new formal-verification algorithms. A useful new experiment would measure whether Verus proof graphs and certificate checkers improve agent repair time, with denominators for accepted and rejected proof plans.

## techniques for the catalog

- typed proof graphs — represent facts, rules, NAF, and derivation edges as an inspectable directed graph
- joint QA and proof prediction — train answer, node, and edge modules with one shared encoder and summed losses
- constrained ILP inference — choose a high-scoring edge set subject to legality and max-flow connectivity constraints
- negation as failure — represent unprovable positive statements with explicit NAF nodes and semantics
- failed-branch explanations — gold proofs for underivable statements show the shallowest failing branch, which the model learns to predict
- proof consistency metrics — measure exact node, edge, proof, and answer-plus-proof accuracy with explicit dataset denominators

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Proof generation, however, is much harder and with increased training data, the rate of increase in proof accuracy is much more gradual."): read the whole paper text including appendix, and checked the quotations, all numbers in Tables 1-5 and appendix A.1/A.6, section and PDF page references, and the technique steps against Sec. 3.1-3.4 and 4.1-4.7. Changed: replaced the DOI link with the arXiv link from the paper text; corrected the Q1 example (no NAF node); corrected the source-to-sink construction (source connects to one node, not every node); corrected PDF page numbers for the NAF and max-flow quotes; removed unsupported claims (NAF edges to "answer", failed branch "returned" by a procedure, cycles, open-world explanation now marked Inference); added table and page references and marked own conclusions "Inference:". Did not check: the references list, the PDF figure images beyond their extracted text, the code repository, the DOI, or Appendix A.7 and A.8 in detail.
