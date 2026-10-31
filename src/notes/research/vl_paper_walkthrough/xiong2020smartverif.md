# SmartVerif: Push the Limit of Automation Capability of Verifying Security Protocols by Dynamic Strategies
(authored by agents unless marked 🧑)
Tag: `xiong2020smartverif`, [paper](https://www.usenix.org/system/files/sec20summer_xiong_prepub.pdf) (link from the fetch record)

## purpose and setting

The paper presents SmartVerif, a framework that changes the proof-search strategy of the Tamarin security-protocol prover while leaving Tamarin as the backend. Its target is protocols with global state or unbounded sessions, where static search can loop or exhaust memory. The authors state: "The primary technical contribution is the dynamic strategy inside SmartVerif, which can be used to smartly search proof paths." (Abstract, p. 1.) A Tamarin proof is represented as a tree: each node is a constraint system and each edge applies a constraint-reduction rule (Section 3, p. 3). The authors describe a correct path as one whose nodes represent supporting lemmata (Section 1, p. 2); SmartVerif returns a path when it is correct and complete (Section 4, p. 4).

The input is a Tamarin multiset-rewriting model and a security lemma. Rules consume and produce linear or persistent facts; action facts record protocol events; the lemma quantifies over events and adversary knowledge (Section 5, pp. 4–5). In the paper's worked example, C sends S an encrypted fresh key and S returns its hash. The `Key_secrecy` lemma says that there must not be an execution containing both `SessKeyC(S,k)` and adversary knowledge of `k` without `LtkReveal(S)` (Section 5, pp. 4–5). Tamarin's active Dolev–Yao adversary controls the network, can forge messages, and cannot invert cryptographic functions such as a hash (Section 5, p. 4).

## technique 1: dynamic proof-path search with a DQN

what it is and when to use it

SmartVerif replaces a fixed Tamarin heuristic with a learned policy that chooses which child rule to explore. The policy is a Deep Q Network (DQN): its state is the current proof-tree node, and its action is the child number. The paper's workflow is explicit: "The Deep Q Network (DQN) is initialized with a purely random strategy, which takes multiple candidates as input, and randomly chooses a candidate with the uniform probability as output." (Section 4, p. 3.) Inference: use this when a static heuristic repeatedly selects an unproductive candidate rule and causes non-termination. Table 1 shows that ordinary Tamarin is faster on some protocols it already verifies automatically.

how to do it

1. Build a Tamarin model and security lemma. SmartVerif starts with the ordinary Tamarin constraint-reduction tree (Sections 3 and 5, pp. 3–5).
2. Initialize the DQN's policy randomly, with equal probability over candidate child rules (Section 4, p. 3).
3. In each round, select a path through the current tree using the policy. Run several acquisition threads in parallel; each invokes the modified Tamarin prover and records the selected rules (Sections 4 and 6.2, pp. 3 and 6).
4. Run correctness determination on each path. If a path is correct and complete, return it as the proof. If all selected paths are estimated incorrect, start a new epoch and retrain using negative rewards along those paths. If a path is estimated correct but incomplete because the tree is incomplete, expand the selected endpoint and continue (Section 4, pp. 3–4; Appendix B, p. 18).
5. Train from replay memory. Appendix B stores transitions `(state, action, reward, next state)`, samples random transitions, and performs gradient descent on squared differences between bootstrapped targets and updated Q values (Section 7.2, pp. 7–8; Algorithm 2, p. 18).

The reward design follows the paper's probabilistic insight: under uniform random search and its stated tree assumptions, supporting children occur on incorrect paths less often than their unconditional selection probability. The authors summarize the purpose as: "The DQN updates the strategy according to historical incorrect paths." (Section 1, p. 2.) Their theorem assumes that each candidate node has at least one non-supporting child and that random choice is uniform; under those assumptions, conditional on the selected path being incorrect and the parent having been chosen, the probability that the chosen child is supporting is below the ratio of supporting children to total children (Section 7.3, p. 8; proof in Appendix A).

Verus form (inference)

Inference: model each protocol state as a Rust ghost state and each transition as a proof function. A Verus `spec fn` can describe the state and candidate-rule relation; a `proof fn` can establish that a selected rule preserves the protocol invariant. The DQN itself is executable machine-learning code and should remain outside the proof boundary, while a verified wrapper can require that every returned path consists of valid rule applications. Verus does not provide Tamarin's symbolic protocol semantics, so the cryptographic algebra and unbounded-session semantics would need explicit specifications or trusted external models. These are proposed adaptations, not features evaluated in the paper.

what works and limits

On the paper's benchmark, SmartVerif reports automatic verification for every selected protocol row in Table 1 (24 rows, including the five observational-equivalence cases discussed in Section 8.1). For Yubikey, SmartVerif takes 79 training epochs, 19 minutes of acquisition, 40 minutes of network training, 2 minutes of verification, and 61 minutes total (Table 1, p. 10). For the Security API in PKCS#11, the corresponding values are 175 epochs, 31 minutes, 50 minutes, 2 minutes, and 83 minutes total (Table 1, p. 10). The setup is one Intel Broadwell E5-2660V4 at 2.0 GHz, 128 GB RAM, four GTX 1080 Ti GPUs, Ubuntu 16.04, modified Tamarin 1.4.0, learning rate 0.01, a reported “memory batch” size of 7,000, eight acquisition threads, and epsilon annealed from 0.99 to 0.1 over 100 epochs (Section 8.1, p. 9). The denominator for the claimed 100% success is the selected benchmark set, not all security protocols; the paper excludes falsified properties and says it does not choose additional practical protocols such as TLS and 5G AKA for comparison (Section 8.1, pp. 9–10).

Inference: the DQN guides search rather than establishing the validity of a protocol property; that validity depends on Tamarin's constraint reasoning and the model. Loop detection supplies training feedback. The authors write: "Note that there is not necessarily a loop on every incorrect path." (Section 7.1, p. 7.) Inference: a path without a detected loop is not thereby proved correct. The paper trains a standalone network for each protocol, retrains after changing a protocol or property, and discusses pretraining, scalability, and efficiency as future work (Section 9, pp. 13–14).

## technique 2: compact verification-tree acquisition

what it is and when to use it

A full Tamarin tree can be infinite or too large to hold. SmartVerif stores only a compact signature for each proof state and expands one endpoint at a time. Each node stores (1) the hash of its constraint-reduction rule, displayed using its first eight characters, (2) the proof-step number, and (3) the rule string (Section 6.1, p. 6). These fields are intended both to encode the DQN state and to identify equal states when trees from different rounds are merged.

how to do it

1. Initialize a root whose rule is the requested security lemma (Section 6.2, p. 6).
2. Select one endpoint according to the current DQN policy (Section 6.2, p. 6).
3. Ask the modified Tamarin prover for the possible constraint-reduction rules at that endpoint and generate a depth-two subtree: the selected endpoint is the root and its children are candidate rules (Section 6.2, p. 6).
4. Merge that subtree into the existing tree using the node signatures. Leave other endpoints collapsed (Sections 6.1–6.2, p. 6).
5. Repeat in later rounds; acquisition threads build multiple trees so that one DQN epoch receives more training paths (Section 6.2, p. 6).

The worked example starts from `Key_secrecy`; Tamarin first chooses `simplify`, then exposes two candidates, `Send(S,k) .o #i` and `KU(h(k))@#vk` (Section 6.1, p. 6). This concrete representation is important: "For each node in the verification tree, we choose the constraint reduction rule and and step number, i.e., distance from the node to the root, as the stored information." (Section 6.1, p. 6.)

Verus form (inference)

Inference: represent a tree node with a Rust struct containing a rule identifier, depth, and rule payload, and prove a `spec fn` stating that every child is an allowed reduction of its parent. A `proof fn` could establish that merging preserves admissible paths if signature equality implies equality of the relevant proof states. Hash collisions, symbolic-rule generation, and solver behavior are external trust assumptions unless formally modeled; Verus's standard integer and sequence proofs do not themselves validate Tamarin's constraint semantics.

what works and limits

The tree representation reduces memory by expanding only one endpoint per round, but it can make a path appear incomplete. SmartVerif explicitly handles that case by expanding the endpoint in the next round (Section 4, p. 4). Acquisition remains expensive: the paper reports that a new node takes seconds to traverse and that depth-10 and depth-100 Yubikey nodes average 0.2 s and 0.4 s respectively, with 1 s initialization (Section 8.1, p. 11). Inference: incremental expansion controls stored tree size while symbolic-solving costs remain.

## technique 3: loop detection with bounded Levenshtein similarity

what it is and when to use it

The correctness-determination module estimates that a path is incorrect when sampled rule strings are sufficiently similar. Section 7.1 motivates it with patterns such as `[... a,b,a,b]` and rule strings differing in generated indices, such as `ni.1`, `ni.2`, and `ni.3` (p. 7). Inference: use it for training feedback, not to prove that a path without a detected loop is correct.

how to do it

1. Convert the selected path into a sequence of rule strings `(s1,…,sk)` (Section 7.1, p. 7).
2. Wait until the sequence length reaches α. For each period `j` from 1 to `k−1`, form `S=(sk, sk−j, sk−2j, …)` and keep at most ρ entries (Algorithm 1, p. 7).
3. For each ordered pair `x,y` in `S`, Algorithm 1 checks `x ≠ y` before computing similarity. Section 7.1 calls its measure Levenshtein distance, defined as the minimum number of single-character insertions, deletions, or substitutions needed to change one string into the other (p. 7).
4. Count a pair if `v[m]/m < β`, where the printed algorithm sets `m` to the length of `y`. Return TRUE when at least δ qualifying ordered pairs are found for a sampled sequence; return FALSE if no period qualifies (Algorithm 1, p. 7).
5. In the implementation, use α=20, β=0.1, ρ=20, and δ=3 (Section 7.1, p. 7), and assign negative rewards to nodes on a TRUE path (Section 7.2, p. 7).

Verus form (inference)

Inference: a Verus implementation could specify edit distance and verify a standard dynamic-programming implementation against that specification. Similar strings alone do not prove repeated semantic states or non-termination, so this detector should guide search while the proof backend establishes the property.

what works and limits

The detector estimates loops; the paper documents a non-zero distance between the first incorrect node and the first detected node; a naive depth-first search then explores exponentially many paths before backtracking (Section 7.3, p. 8). SmartVerif mitigates this by rewarding all nodes on an incorrect path, rather than only its final node. Inference: this supports an efficiency argument within the paper's assumptions, not a soundness theorem for arbitrary protocol trees. Inference: the printed `x ≠ y` condition excludes equal string values, so exact-cycle detection cannot be assumed from the motivating examples alone. The prose normalizes by the length of `x`, whereas Algorithm 1 uses the length of `y`; the paper does not resolve this discrepancy (Section 7.1, p. 7).

## techniques for the catalog

- dynamic DQN proof search: train a policy from negative rewards on failed Tamarin paths to select supporting lemmas automatically
- incremental verification-tree acquisition: store rule signatures and expand one endpoint with depth-two subtrees to control memory
- bounded loop detection: classify repeated or near-repeated rule sequences using Levenshtein distance and fixed thresholds
- multi-threaded acquisition and replay: generate multiple trees in parallel and train from a replay dataset of node/reward tuples
