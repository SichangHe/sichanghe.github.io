# TacticToe: Learning to Reason with HOL4 Tactics
(authored by agents unless marked 🧑)
Tag: `gauthier2017tactictoe`, [paper](https://arxiv.org/abs/1804.00595)

## method
TacticToe learns tactic-level proof search directly in HOL4. It records prior tactic calls, predicts useful tactics from the current goal, explores a proof tree with a modified A* search, and reconstructs a readable HOL4 script. The abstract says: “Unlike the existing hammer methods, TacticToe avoids translation to FOL, working directly on the HOL level.” (Abstract, p. 1). The result remains a kernel-checked proof: “The result, if successful, is a certified human-level proof composed of HOL4 tactics.” (Section 1, p. 2).

## technique 1: automatic tactic recording
Use this when an interactive prover has many tactics and existing proof scripts are the training corpus. Instead of modifying all primitive kernel rules, transform completed proofs to single out tactic invocations and insert calls to a general recording mechanism. Store each tactic name and its arguments as strings, associated with the open goal at the call. The authors explain that modifying all 750 HOL4 tactics would be required by an older approach, so they “developed an automatic transformation on the actual proofs.” (Section 2, p. 3). Handle local `let`-bound tactics and arguments so recorded calls remain callable in another context (Section 2, p. 3).

Inference: In Verus, instrumentation would record each proof-triggering `assert`, `lemma` call, quantified fact, and solver configuration together with the outstanding verification obligation. Inference: Rust macro expansion and ownership-sensitive contexts make direct string replay less portable than HOL4 tactic replay; generated code must be checked afresh by Verus.

## technique 2: goal features and k-NN tactic prediction
For each open goal, extract features: constant names and logical operators; type constructors; first-order subterms with variables replaced by `V`; variable names; top-level logical structure with atoms replaced by `A`; and optionally higher-order subterms with unified variables (Section 3.1, pp. 3–4). For a new goal g, find similar recorded goals using modified distance-weighted k-nearest neighbours. Score a tactic by the TF-IDF-weighted features shared with its closest recorded goal; a second score normalizes for feature-set size (Section 3.2, p. 4). Preselect 500 tactics, then recompute scores as search proceeds. The paper states: “Given a goal g, the classifier selects a set of previously solved goals similar to g, and considers the tactics that were used to solve these goals as relevant for g.” (Section 3.2, p. 4).

Inference: A Verus predictor could use names, types, quantified-shape features, and prior successful proof obligations to rank candidate lemmas or assertions. Inference: features must include Rust ownership and mutable-state shape because syntactic similarity alone does not capture borrow and memory invariants.

## technique 3: modified A* proof search and reconstruction
Initialize a root node with the conjecture and 500 scored tactics. Apply the highest-scoring unused tactic, creating child nodes for its resulting goals. Keep selecting the node with lowest cost, using tactic scores plus depth and tactic-count penalties; cache applications and predictions, and enforce a 0.02-second tactic timeout in the experiments (Section 4, pp. 5–7). A node closes when its tactic returns no goals or all produced goals are already proven. When a successful tree is found, combine it with `THENL`: “It combines a tactic with a list of subsequent ones, in such a way that after the parent tactic is called, for each created goal a respective tactic from the list is called.” (Section 4.2, p. 7).

A “small hammer” optionally invokes Metis with premises selected from the current proof context; TacticToe combines this premise selection with tactic prediction (Section 4.3, pp. 7–8). The evaluation uses two best strategies: NH (no small hammer) and SH (small hammer).

Inference: In Verus, A* nodes would contain Rust code plus verifier state; child edges would add proof constructs and re-run verification. Inference: the final reconstruction analogue is ordinary Verus proof code that compiles and verifies, while an external model remains only a search guide.

## evidence and boundaries
The full-scale experiment re-proves a common set of 7,902 theorems from 134 HOL4 theories, with a five-second limit (Section 5.3, pp. 10–11; Table 4). TacticToe SH solves 3,115/7,902 = 39.42%; TacticToe NH solves 2,349/7,902 = 29.73%. HOL(y)Hammer's best single strategy solves 2,556/7,902 = 32.35%, and its auto strategy 1,965/7,902 = 24.87% (Table 4, p. 11). All successful TacticToe proofs reconstruct as readable HOL4 scripts; 96% of HOL(y)Hammer auto proofs reconstruct with Metis within two seconds (Section 5.4, p. 11). The 39% abstract figure therefore refers to the SH strategy and the 7,902-theorem common denominator, not all 10,229 HOL4 declarations.

The paper also reports theory-dependent rates, e.g. SH 60.1% arithmetic and 55.5% finite map versus 25.3% probability (Table 5, p. 12). Search statistics measure nodes on failing searches and time/proof size on successful searches, so those denominators differ (Section 5.5, p. 12). What is proved is HOL4 kernel acceptance. Trusted elements include HOL4's kernel, tactic implementations, feature extraction, learned scores, timeout policy, and recorded library proofs. Inference: the method threatens VL mainly by reducing repeated proof-search work; transfer risk is high because HOL4 tactics and a five-second theorem corpus differ from Rust verification.

## techniques for the catalog
- tactic-call recording — transform existing scripts into goal-associated tactic training examples
- feature-based k-NN prediction — rank tactics from TF-IDF similarity of goal features
- A*-guided tactic search — explore tactic proof trees with learned costs and reconstruct with `THENL`
- small-hammer integration — combine tactic prediction with premise selection and Metis
Checked 2026-10-14: audit record gauthier2017tactictoe; paper-study comparison complete; gate executed; experiments not rerun
