# LLM-Assisted Automatic Security Proofs for Cryptographic Protocols: How Far Are We?
(authored by agents unless marked 🧑)
Tag: `liu2026llm`, [paper](http://arxiv.org/abs/2609.35434v1)

## scope and result

Liu et al. evaluate large language models generating Tamarin security lemmas for already available cryptographic protocol models. The task is Step 2 of the paper's pipeline: “formalizing the cryptographic protocol, (Step 2) defining security properties, and (Step 3) analyzing counterexample traces.” (Abstract/Introduction, p. 1). The paper introduces CRoST, Coverage Rate of Solve Tree, which compares normalized solve obligations in Tamarin proof skeletons rather than text similarity (Sections III–IV, pp. 3–6).

Inference: the direct Verus analogue is asking an LLM to propose `requires`, `ensures`, invariants, or lemmas and measuring which proof obligations the proposal reaches. The paper's Tamarin multiset-rewriting language, action facts, and temporal lemmas do not translate directly to Rust. Verus can check generated specifications only after parsing them and proving them in its supported subset.

## technique 1: tool-grounded proof-skeleton coverage (CRoST)

What it is. Tamarin's automatic proof produces a tree containing `solve(c)` obligations and case distinctions. CRoST extracts every root-to-solve path from target and generated lemma trees and marks a target path covered when it is a subsequence of a generated path. The paper defines the metric as: “The solve-level coverage is defined as ... Cover(L; L⋆) := |S(L) ∩ S(L⋆)| / |S(L⋆)| = k/n = c ∈ [0,1].” (Definition 2, Section III-B, p. 4).

How to apply it.
1. Fix a protocol theory and proving configuration, including Tamarin version, flags, heuristics, and resource bounds (Definition 1, p. 4).
2. Autoprove every reference and generated lemma and normalize each solve constraint by alpha-renaming, erasing proof-local indices, and canonicalizing commutative constructs (Definition 1, p. 4).
3. Traverse each proof tree recursively; append a node label at solve nodes and retain the prefix at other nodes (Algorithm 1, lines 1–10, p. 3).
4. Build target footprint P⋆ and generated footprint P (Algorithm 1, lines 11–17, p. 3).
5. For each target path p, mark it covered if some generated path q satisfies subsequence relation p ⪯ q; return covered-target count divided by target-path count (Algorithm 1, lines 18–27, p. 3).

Inference: in Verus, collect proof-obligation identifiers or normalized formulas from verifier runs and compare target obligations with generated obligations. This requires a stable Verus proof-artifact format; the referenced Verus material does not establish one. CRoST's fixed-configuration assumption is essential because changing solver heuristics changes the tree.

Evidence and assumptions. The authors justify tool-grounding because textual BLEU and truth-table comparisons do not capture quantified temporal lemmas (Section III-A, pp. 3–4). Their formal capability model assumes a fixed target footprint and a random overlap model conditional on overlap size (Assumption 1, p. 5). The paper states, “If Cover(L; L⋆) = 1, then by definition S(L⋆) ⊆ S(L).” (Section III-B, p. 5). This supports a sufficiency sanity check, not semantic equivalence of lemmas.

## technique 2: minimal-generator and predecessor analysis

What it is. The paper models a sufficient family of solve-item sets as upward closed and defines minimal generators, the smallest sets sufficient for the target outcome. It then measures whether a generated footprint hits predecessors of a minimal-generator item and estimates continuation probability to the full generator (Definitions 3–5 and Estimation 1, pp. 5–6).

How to apply it.
1. Represent the sufficient family F over a finite universe U of normalized solve items (Definition 3, p. 5).
2. Enumerate inclusion-minimal generators `Cj` and their sizes (Definition 3, p. 5).
3. For every target item `uj,k`, compute `Predκ(uj,k)` as target items whose reduction can lead to it (Definition 5, p. 6).
4. Record a predecessor hit when the generated footprint intersects that predecessor set (Equation 12, p. 6).
5. Estimate the probability that the rest of the minimal generator is covered conditional on a hit, then use it as a lower-bound factor for capability (Estimation 1, p. 6).

Inference: a Verus product could learn which proof obligations are prerequisites for a successful lemma and prioritize generation toward those obligations. However, Verus's proof search is not Tamarin's deterministic tree, so the predecessor relation would need an independently defined artifact.

Evidence. The paper gives an exists-trace example with a singleton minimal generator and contrasts it with all-traces properties whose branches must all be discharged (Figure 5, p. 6). The reported continuation estimate is ρb ≈ 0.513 for one experiment (Section III-C, p. 6); the denominator is the repeated generated-lemma runs conditioned on a predecessor hit, not all generated lemmas.

## technique 3: few-shot lemma generation and mutation validation

What it is. Models receive protocol rewriting rules and one to four corresponding lemmas as in-context demonstrations. A generated lemma counts as syntactically successful only if Tamarin parses and compiles it (Section IV-B, p. 7).

How to apply it.
1. Prepare a fixed prompt with the protocol rules, task description, and few-shot rule/lemma examples (Section IV-B, p. 7).
2. Generate one or more Tamarin lemmas for secrecy, authentication, or sanity (Sections II-B and IV-A, pp. 2, 7).
3. Parse and compile each output; discard syntax failures before proof evaluation (Section IV-B, p. 7).
4. Autoprove successful outputs and compute CRoST against human reference lemmas (Sections III-B and IV-B, pp. 3–4, 7).
5. Validate the metric with mutants that inject explicit protocol flaws, then reverify. A lemma that was verified on the original but falsified on the mutant detects that mutation (Figure 7 and Section IV-B, pp. 7–8).

The mutation operations include direct secret leakage, weak key derivation, removed signature/MAC checks, weakened identity/nonce binding, missing freshness checks, incomplete messages, broken message flow, and missing responses (Table II, p. 8). Inference: a Verus analogue could mutate Rust specifications or protocol-state transitions and check whether generated proofs fail, but mutation adequacy remains only supporting evidence.

Evidence. Few-shot prompting improves qwen3-coder-plus syntax success by 30.4 percentage points over zero-shot (Section IV-B, p. 7). CRoST and mutation flip rate correlate at 0.75 with p-value 0.005 (Section IV-B, p. 8); the denominator is the set of tested generated lemmas/mutants used in that experiment, not every protocol in existence. The authors caution that handcrafted mutants do not cover the full vulnerability spectrum (Section IV-B, p. 8).

## technique 4: capability and cost evaluation

The benchmark covers 18 protocols and three property families: secrecy, authentication, and sanity (Threats to Validity, p. 10). Table I reports few-shot syntax success: for example, grok-4 generated 75 outputs and 74 compiled (98.67%), while gpt-5.2-codex generated 118 and 114 compiled (96.61%). The denominator is each model's generated outputs. Table III reports CRoST for the top four models as 38.82% overall, with 33.90% secrecy, 40.56% authentication, and 39.95% sanity (Table III, p. 9). The abstract's 14.4% figure is the fraction of generated lemmas exceeding 80% coverage; its denominator is all generated lemmas in that summary, not the 18 protocols.

A repeated deepseek-v3.2 sampling study increased cumulative generated lemmas from 239 to 2672 while CRoST improved only about 24 percentage points and plateaued after the eighth run (Section IV-C, p. 9). The authors infer diminishing returns from redundant paths. The SSH-R case study identifies stage-point confusion: models relate `AcceptP2` to the wrong phase's `AcceptS` event, losing temporal correspondence (Section IV-C, pp. 9–10).

Runtime is measured on an Intel i9-14900, 24 cores, 32 GB RAM, with Tamarin `+RTS -N -RTS --auto-sources` (Section IV-D, p. 10). Baseline reference lemmas: 91 lemmas, 59.91 seconds total, 0.66 seconds per lemma. Generated sets cost 238.24–1267.76 seconds total and 2.51–6.79 seconds per lemma for the four reported models (Table V, p. 10). Thus generated verification is roughly 4×–21× slower than baseline, with the denominator for each mean being that model's listed lemma count.

## what is proved and trusted

The paper proves properties of CRoST under its finite-footprint and random-overlap assumptions, and empirically validates correlation with mutation flips. It does not prove that a high-CRoST lemma is semantically equivalent to the human lemma. Trusted components include Tamarin's parser, symbolic semantics, deterministic proof-search configuration, reference lemmas, mutation design, and model/provider behavior. Inference: in Verus, the analogous trusted boundary includes the verifier, solver, proof-obligation extraction, compiler, and the correctness of the generated specification.

## techniques for the catalog

- solve-tree coverage: normalize verifier solve obligations and score generated lemmas by covered target proof paths
- minimal-generator analysis: model sufficient proof-item sets and estimate predecessor-to-generator continuation probability
- few-shot property generation: prompt LLMs with protocol rules and example lemmas, then parse and autoprove outputs
- mutation-based metric validation: inject controlled protocol flaws and correlate proof-coverage scores with verification flips
- cost and saturation analysis: measure syntax yield, coverage by security family, repeated-sampling gains, and verification time
