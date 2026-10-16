# Data Verification is the Future of Quantum Computing Copilots
(authored by agents unless marked 🧑)
Tag: `song2026data`, [paper](http://arxiv.org/abs/2602.04072v1)

## scope and positions

Inference: This position and experiment paper argues that quantum copilots need verified training data and generation-time constraints because valid circuits occupy a tiny part of the design space. It defines a verification-aware model as one exposed to formally verified examples, data verification as proving training examples against domain constraints, and a priori constraints as checks embedded during generation (§2, p.2). The three positions are explicit: “P1 Data verification must be the minimum requirement for quantum copilots”; “P2 Verification should provide a priori constraints, not a posteriori filtering”; and “P3 Verification-aware architecture required for highly constrained scientific domains.” (§2, pp.2–3)

## technique 1: formally verified corpus construction

Inference: What it is. The authors construct MAJ and UMA quantum-circuit corpora and prove each design before using it as training/evaluation data. “Each design in the dataset is formally verified with Lean to show correctness for any n and with Z3 to show correctness for modular level decomposition of MAJ and UMA operations.” (§3, p.6)

Inference: How to do it. (1) Define the circuit specification, using the Cuccaro adder relation `|c0⟩|x⟩|y⟩|0⟩ 7→ |c0⟩|x⟩|x + y⟩` (Eq. 1, §3, p.3). (2) Enumerate candidate MAJ/UMA gate arrangements for depths 3–6. (3) Use Lean to prove whole-circuit correctness for arbitrary n. (4) Use Z3 to prove modular decomposition correctness. (5) Retain only verified designs. (6) Combine verified MAJ and UMA modules into adder designs and attach optimization scores.

Inference: Evidence and denominators. Exhaustive search plus formal verification found 540 MAJ and 529 UMA designs. Their product is `540 × 529 = 285660` distinct adders (§3, p.6). Each module has approximately 12.2 million gate arrangements across depths 3–6; the combined space exceeds 148 trillion configurations, while verification identifies over 200,000 valid adders, “a ratio on the order of 10−9.” (§3, p.6) Inference: the 200,000 numerator is rounded and the 148-trillion denominator is an approximate search-space estimate, so the ratio is order-of-magnitude evidence, not an exact census.

Inference: Verus form. Inference: for Rust, generate candidate implementations, define `spec fn` reference behavior, and prove each candidate with Verus before adding it to a training corpus. Use `proof fn` lemmas for decomposition and optimization relations; retain source, proof, and model metadata. Inference: this protects corpus examples from known bugs but does not ensure the reference specification matches the product requirement.

## technique 2: verification-aware evaluation suite

Inference: What it is. The paper evaluates whether models trained on verified data can choose the best valid circuit. For each bit width n from 2 through 8 it creates 10,000 four-option multiple-choice questions; every candidate circuit satisfies the adder specification, but candidates differ in gate count, depth, and Toffoli usage. The score is `0.5 × Toffoli_n + 0.25 × Depth_n + 0.25 × TotalGates_n` (§3, p.5).

Inference: How to do it. (1) Generate equal-validity candidate circuits. (2) Compute the weighted objective for each. (3) Ask each model to select the minimum-score option. (4) Evaluate 34 publicly available models from 270M to 120B parameters through Ollama with default settings. (5) Run 70,000 questions per model—10,000 for each of seven bit widths. (6) Retry malformed answers up to three times, counting unanswered questions as incorrect (§3, p.5). (7) Compare verification-aware checkpoints with generic checkpoints and the 25% four-choice random baseline.

Inference: Verus form. Inference: construct an analogous benchmark where every candidate Rust function has a Verus proof of a common contract, then ask models to optimize proof-preserving cost (allocations, latency, or proof obligations). Score only after checking both contract validity and objective value. Inference: this tests selection among valid programs, not whether a model can invent a correct proof from scratch.

## technique 3: calibration from token probabilities

Inference: What it is. The authors extract log probabilities for answer tokens A–D and softmax-normalize them because raw values do not form a consistent distribution. “Since raw log-probabilities do not sum to a consistent value across the four options, we apply softmax normalization to obtain calibrated confidence scores that form a proper probability distribution.” (§3, p.5)

Inference: How to do it. (1) Capture token-level log probabilities for each answer option. (2) Apply softmax across A–D. (3) Compare confidence assigned to correct answers across bit widths and model families. (4) Treat malformed explanations or refusals as incorrect, as in the accuracy harness. The paper reports GPT-OSS models assigning 60–80% confidence to correct responses and Gemma3 models 20–35% (§3, p.5).

Inference: Verus form. Inference: use proof status as a binary correctness signal and separately measure model confidence or selection probability. Never treat confidence as evidence of a successful Verus proof; the verifier result is authoritative for acceptance.

Inference: Evidence and limits. Some mixtral and deepseek-r1 variants fell below the 25% random baseline because they produced malformed outputs (§3, p.5). Inference: output-format handling is a confounder; a low score may reflect protocol failure rather than circuit reasoning.

## technique 4: constrain generation with symbolic checks

Inference: What it is. The paper's future architecture places SMT or symbolic constraints inside generation. “For FD1, we suggest that each proposed circuit fragment should satisfy satisfiability modulo theories constraint or symbolic specifications before being committed to the design.” (§4, p.6)

Inference: How to do it. (1) Generate a fragment. (2) Translate its semantics and resource constraints into SMT or symbolic form. (3) Check satisfiability and domain properties. (4) Commit the fragment only if the check succeeds. (5) Continue generation from the constrained partial design, so invalid branches are pruned before completion (§4, p.6).

Inference: Verus form. Inference: generate Rust incrementally, run Verus after each proof-relevant fragment, and retain only fragments with discharged obligations. For long functions, use ghost state and loop invariants to expose partial correctness. Inference: current Verus invocation is generally whole-program/function verification rather than a token-by-token decoder constraint, so an agent harness would approximate the proposed architecture through checkpoints.

## what is proved, measured, and trusted

Inference: The paper proves circuit properties with Lean and Z3 for its corpus and reports model accuracy, confidence, search-space estimates, and counts. It does not prove that verified training improves general quantum programming outside the Cuccaro-adder task, nor that generation-time integration is implemented in the experiment. Its “100% correct outputs” in Figure 1 is a conceptual diagram for a verified-data pipeline, not an empirical result (§1, p.1). Inference: trusted elements include Lean/Z3, the circuit specification, exhaustive-search implementation, model checkpoints, and answer parser.

Inference: threat to agent-written verified Rust is high when agents train on unverified examples and moderate when every corpus item is proved. Verified data can teach useful invariants, but it cannot prevent a wrong Rust specification, unsupported unsafe behavior, or proof assumptions about external libraries. The paper's 14TB QDataSet example also shows cost: it required more than three months of HPC time and covered only one- and two-qubit systems (§1, p.2).

## techniques for the catalog

- Inference: verified corpus filtering: prove every generated example against a domain specification before training or evaluation
- Inference: equal-validity optimization benchmark: compare models on objective quality while every option already satisfies correctness
- Inference: calibrated confidence: softmax answer-token log probabilities and separate confidence from verifier acceptance
- Inference: generation-time SMT gate: check each partial artifact before committing it to the design
- Inference: constraint-rich benchmark: publish executable oracles and explicit denominators for reproducible verification-aware evaluation
