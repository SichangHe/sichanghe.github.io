# Formal Theorem Proving by Rewarding LLMs to Decompose Proofs Hierarchically
(authored by agents unless marked 🧑)
Tag: `dong2024formal`, [paper](https://doi.org/10.48550/arxiv.2411.01829)

## scope and result
The paper introduces Proof Decomposer (ProD), an Isabelle workflow in which a model proposes lemmas inside a proof and proves those lemmas as child nodes. “We design an RL-based training algorithm that encourages the model to decompose a theorem into lemmas, prove the lemmas, and then prove the theorem by using the lemmas.” (abstract, p. 1) The key training result is that partial success is useful: “even if a theorem is too challenging to be proved by the current model, a positive reward is still given to the model for any correct and novel lemmas that are proposed and proved in this process.” (abstract, p. 1)

Inference: this is a recipe for training a proof generator from verifier outcomes rather than a claim that an LLM can discover arbitrary specifications. The experiments are Isabelle-specific, but the decomposition and checker-feedback pattern is relevant to Verus.

## technique 1: conditional proof trees

what it is
The input is a context and theorem statement. The output starts with `<use_invoke>` or `<no_invoke>`, then a conditional proof. A conditional proof inserts proposed statements as `<invoke> lemma </invoke>` between ordinary proof segments. “A node in a proof tree is a tuple of premises, context, a theorem statement, and a conditional proof.” (setup, §2, p. 4)

when to use it
Use this when a direct proof is too long and intermediate facts can be stated independently. The paper distinguishes local correctness (the parent proof verifies when proposed lemmas are assumed) from global correctness (all child lemmas are themselves locally correct and form a valid tree). “Global correctness corresponds to the standard notion of correctness (i.e., whether the theorem is proved), and local correctness is a weaker concept, referring to the correctness of conditional proofs assuming the proposed lemmas.” (setup, §2, p. 4)

how to do it
1. Give the model context `c` followed by statement `s`; ask for the special token and conditional proof (§3.1, p. 5).
2. Parse every `<invoke> l </invoke>` and create the next generation `Gι+1 = {(c,l)}` (Algorithm 1, p. 6).
3. Sample each child proof with the same context. At maximum depth, replace the prompt with `c s <no_invoke>` so the tree terminates (Algorithm 1, lines 2–8, p. 6).
4. Check the parent after adding the proposed lemmas as premises. A globally correct node is assembled from locally correct nodes and emitted child-first with invocation markers removed (§2, p. 4).

The paper’s example splits cardinality by cases: it invokes `icard_insert_disjoint: "x ∈ / A =⇒ ..."` and `icard_insert_eq: "x ∈ A =⇒ ..."`, then closes with `by (simp add: icard_insert_eq icard_insert_disjoint)` (§4.4, p. 11). The PDF line break places the slash on the next line; the complete source statement is the quoted fragment as extracted.

Verus form
Inference: represent each proposed lemma as a separate `proof fn` or `lemma`-style proof function with `requires` and `ensures`; call it from the parent proof and let Verus check the resulting postcondition. Verus uses proof functions and `ensures`, while the paper’s `<invoke>` markers are orchestration metadata and do not carry into Rust. Inference: use `assert`/`assert forall` and `requires`/`ensures` to expose the child fact, and keep executable code unchanged because proof code is erased. A Verus proof cannot call a proof function at run time; the generated tree must stay in proof context.

evidence and limits
The paper parses Archive of Formal Proofs (AFP), makes 312k SFT examples, and uses 104k peeled-off tree examples for RL (§4.1, p. 8). Testing samples k trees per theorem and reports pass@k; context is truncated to the last 1k tokens, temperature is 0.7, and trees are truncated at depth 2 (§4.1, p. 8). On AFP test, pass@16 is 40.8% for ProD-SFT and 45.5% for ProD-RL; on AFP 2023 it is 36.5% and 39.5%, respectively (Table 2, p. 9). The denominator is the theorem set in each holdout, and pass@16 means at least one of sixteen sampled trees is globally correct (§4.3, p. 9). The authors report 37.7% of lemmas proved during training were absent from the dataset (abstract, p. 1).

Inference: these percentages measure theorem pass rates under sampled Isabelle trees, not Verus proof success or semantic adequacy of generated contracts. The model is Llemma 7B; RL runs 20 rounds of 5k examples, with depth-3 training trees (§4.1, p. 8). The paper reports 10-second timeouts per Isabelle proof step and uses Sledgehammer to fill low-level steps (§4.1, p. 8). Sledgehammer, Isabelle, the parser, and the AFP premises are trusted infrastructure for this measurement.

## technique 2: verifier-shaped reinforcement learning

method
Start from an SFT model. For each random batch, (1) generate trees, forcing `<use_invoke>` for the top half of examples by its probability; (2) verify local and global correctness; (3) filter trivial lemmas and remove unnecessary proposals; and (4) update with weighted cross-entropy (methods §3.2, pp. 6–7). The weight is `w = γ^h ∏ Vϕ(li)` for a locally correct node with proof length h and proposed lemmas li, and zero otherwise (§3.2, p. 7). A value model predicts the probability of `<true>` versus `<false>` for each node. Human proofs, augmented examples with lemmas moved into context, and a replay buffer are also added (§3.2, p. 7).

Inference: for Verus, the analogous reward oracle is the Verus compiler/verifier outcome plus explicit filters for vacuous or duplicate lemmas. A training record can contain `(Rust/Verus prompt, proof text, verifier reward)`; a value model can estimate success for a child proof. The exact discount and value calibration are engineering choices, not established Verus facts.

why it helps
The paper calls this “an instantiation of hindsight experience replay” because correct subtrees train even when the root fails (remarks, §3.2, p. 7). It reports that RL without lemma proposals does not improve the SFT baseline (Table 2 and Fig. 3, pp. 9–10), supporting the claim that the extra signal comes from discovered lemmas rather than RL alone.

failure modes
ProD-RL improves mainly for ground-truth proof depth at most two; harder theorems remain low-success (Fig. 4, p. 10). On miniF2F, pass@64 is lower than SFT without proposals: valid 41.4% versus 46.3%, test 39.3% versus 40.6% (Table 3, p. 13). “We also observe that when tested on miniF2F theorems, our model failed to propose meaningful lemmas.” (conclusion, §6, p. 13) The authors attribute the shift to domain difference and note that miniF2F problems often do not require hierarchical decomposition (§6, p. 13). Inference: a Verus deployment should gate decomposition by proof shape and fall back to direct proof search when child lemmas add noise.

## what is proved, trusted, and relevant to VL
The formal verifier proves Isabelle theorem statements under imported premises and generated proof trees. The benchmark does not prove that the statements encode a product requirement, that AFP premises are sound outside Isabelle, or that the method transfers to Rust. Inference: for VL, the threat is medium for proof-generation cost and proof-structure search, but low evidence exists for automatic specification discovery. Reusing the idea may reduce long-proof search by learning reusable intermediate facts; it does not remove the need for a human- or agent-selected Verus contract and invariant.

Inference: VL should not redo a generic claim that checker rewards can train proof generation; this paper already supplies that result with AFP denominators and an out-of-distribution set. A distinct VL experiment would need Verus modules, fixed specifications, dependency-separated train/test projects, and a check that generated child proofs compile without weakening `requires` or `ensures`.

## techniques for the catalog
- conditional proof trees: insert proposed lemmas as child goals, verify locally, and assemble globally correct trees child-first
- verifier-shaped RL: reward locally and globally verified subtrees with value-weighted cross-entropy and replay
- depth and proposal controls: force no-invoke leaves, filter trivial or unnecessary lemmas, and use direct-proof fallback under distribution shift
Checked 2026-10-15 against paper dong2024formal: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
