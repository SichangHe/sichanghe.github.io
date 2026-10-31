# The Faithfulness Gap: Certifying Semantic Equivalence Between Natural-Language and Formal Mathematical Statements
(authored by agents unless marked 🧑)
Tag: `mohammad2026faithfulness`, [paper](http://arxiv.org/abs/2606.16541v1)
## problem and contribution

The paper addresses a specific failure of autoformalization: a formal statement can typecheck and be provable while expressing a different theorem. It names this the “faithfulness gap.” The proposed remedy is Bidirectional Provability Fingerprinting (BPF), which compares what a candidate formal statement implies and what would imply it against probes predicted from the natural-language statement. The paper also supplies Counterfactual Probe Generation (CPG), the Equivalence Spectrum, Adaptive Probe Budget Allocation (APBA), and Faithfulness-Guided Decoding (FGD).

The authors state: “A formal statement can be syntactically well-formed, provable, and wrong: it can mean something other than what the mathematician wrote.” (section 1, PDF p. 1). They define ε-faithfulness as the probability, over an interpretation distribution, that the candidate is provably equivalent to an accepted formalization: “A candidate F ∈ F is ε-faithful to N under DN if Pr[T ⊢ F ↔ I] ≥ 1 − ε.” (section 3, PDF p. 3). The four drift classes are quantifier inversion (∆∀), hypothesis omission (∆H), conclusion generalisation (∆C), and type coercion (∆T); the paper reports that they account for 94% of human-labeled drift in a pilot sample of 400 outputs (section 3, PDF p. 3).

## technique 1: bidirectional provability fingerprinting (BPF)

What it is. For a probe set P, BPF records a forward fingerprint Φ⁺F(P) = {P: T ⊢ F → P} and a backward fingerprint Φ⁻F(P) = {P: T ⊢ P → F}; the full fingerprint is their pair (section 3, PDF p. 3). The paper says: “The forward fingerprint captures the downstream commitments of F, everything that follows from it, while the backward fingerprint captures its upstream conditions—everything that would suffice to prove it.” (section 3, PDF p. 3). Forward-only checking misses a strict strengthening; backward-only checking misses a strict weakening (section 4.2, PDF p. 4).

When to use it. Use BPF when a generated formal statement must be checked against natural-language intent and no canonical reference formalization is available. It is most useful for well-typed, provable candidates whose semantic drift is not visible from syntax.

How to do it. The paper’s Algorithm 1 gives these steps (section 4.3, PDF pp. 3–4):
1. Input natural-language statement N, candidate F, theory T, probe budget k, tactic, and timeout τ.
2. Generate labeled probes PN with CPG.
3. Autoformalize the probes and filter out probes that fail to typecheck.
4. Route probes by APBA. For a positive probe, try to prove F → P; if refuted, record a witness. For a negative probe, try to prove F → P; if proved, record a witness.
5. Compute the spectrum from the observed witness set and return a verdict plus witness probes.

The entailment oracle is Lean 4 + mathlib4 with `exact?`, `aesop`, and small mathlib-aware closers, capped at 30 seconds per query; unresolved queries become `?` (section 3, PDF p. 3). The paper’s core equivalence claim is: “Two statements with identical fingerprints over a sufficiently rich probe set are provably equivalent (Theorem 4.2).” (figure 3 caption, PDF p. 3).

Verus form. Inference: represent the natural-language requirement as a set of expected implications over Verus `spec fn` predicates. Generate probe predicates as additional `spec fn`s; check forward implications with `ensures`-style proof obligations and backward conditions with separate proof functions. Inference: this requires explicit Verus proof lemmas and a trusted mapping from each probe to the intended requirement; BPF’s Lean tactic oracle does not carry over automatically. Use valid Verus syntax from the known language: `spec fn` for logical values and `proof fn` for proofs, with `requires` and `ensures` on executable or proof functions, and `invariant` as a loop annotation rather than a function call.

Evidence and limits. On the controlled DRIFT BENCH split, BPF + CPG reaches F1 0.91, detection 0.896 at 3% false-positive rate, and cost 26× relative to typechecking; BPF + CPG + APBA keeps F1 0.91 and detection 0.894 while reducing cost to 8× (Table 2, PDF p. 7). Removing bidirectional matching lowers F1 to 0.80, versus 0.91 for the full system (Table 4, PDF p. 8). These denominators are the controlled benchmark split and the 3% FPR operating point specified in Table 2. The paper’s theorem requires the entailment oracle to be complete on chosen probes; with timeout uncertainty η(30s) ≈ 0.07, the detection bound degrades to 1 − δ − kη(τ) (sections 8.1 and 8.3, PDF pp. 5–6). It cannot detect convention drift when the convention is invisible to provability (section 8.3, PDF p. 6).

## technique 2: counterfactual probe generation (CPG)

What it is. CPG turns probe generation into contrastive synthesis. For each drift class D, construct a mechanically perturbed drifted twin ND, then ask an LLM for probes that distinguish N from ND. The paper gives the distribution: “QD(P) ∝ Pr[P entailed by N] · Pr[P not entailed by ND], estimated through an LLM scoring step.” (section 5.1, PDF p. 4).

When and how. Use CPG when generic specializations, generalizations, and edge cases fail to target the suspected drift. For each D in {∆∀, ∆H, ∆C, ∆T}: (1) mechanically apply the class-specific perturbation, such as swapping adjacent quantifiers or dropping a hypothesis; (2) condition the probe generator on the contrast N versus ND; (3) score candidate probes for being entailed by N and not by ND; (4) sample kD probes, with kD selected by APBA; (5) autoformalize and typecheck them before BPF. The paper insists that the twin is mechanical: “Mechanical perturbation guarantees the drift class label is unambiguous and that ND exhibits exactly the targeted failure.” (section 5.2, PDF p. 4).

Evidence. Figure 4 reports that CPG reaches the BPF-naive k = 32 detection rate at k ≈ 12 and outperforms generic probes at every budget on three of four drift classes (section 5.3, PDF p. 4). In Table 4, removing CPG lowers F1 from 0.91 to 0.85 on the controlled split (PDF p. 8).

Verus form. Inference: construct drifted twins by editing Verus spec predicates or contracts, for example deleting a `requires` clause or changing a quantified bound, then generate probe `spec fn`s whose truth differs between the original and twin. Inference: the perturbation rules and probe-label predictor are additional tooling; Verus itself supplies proof obligations, not natural-language contrast generation.

Failure assumptions. LLM probe labels can be wrong, and CPG depends on a complete enough entailment oracle. The paper reports that convention drift remains outside BPF’s provability signal and is handled by a separate structural check (section 12, PDF p. 8).

## technique 3: equivalence spectrum and APBA

The Equivalence Spectrum E(F,N) is a weighted continuous score over probe cells rather than a binary verdict. The paper calibrates ACCEPT at E ≥ 0.93, REVIEW at 0.78 ≤ E < 0.93, and REJECT below 0.78 on a held-out DRIFT BENCH subset (section 6, PDF p. 5). It uses the score to rank candidates, triage review cases, and shape FGD rewards (section 6, PDF p. 5).

APBA routes the next probe to the drift class with maximum expected information gain, IG(D) = H(pD) − Er∼πD H(pD|r) (section 7.1, PDF p. 5). Theorem 7.1 states a budget reduction bound with heterogeneity ratio γ; the paper estimates γ ≈ 3.2 on DRIFT BENCH (section 7, PDF p. 5). In the scaling experiment, uniform allocation needs k ≈ 28 probes to reach detection 0.87, while APBA reaches it at k ≈ 9, a 3.1× reduction (Figure 9, PDF p. 7). Table 2 reports the broader cost reduction as 26× to 8× at the same controlled split and operating point (PDF p. 7); these are different comparisons and should not be conflated.

Verus form.

## technique 4: faithfulness-guided decoding (FGD)

FGD feeds BPF back into generation. Given N, sample m candidates, compute a low-budget E with k = 8 probes per class, rerank by E, and optionally re-prompt candidates below 0.78 with their highest-scoring witness probe as an in-context repair hint (section 9, PDF p. 6). On the wild split of 384 pairs, baseline drift is 19.4%; with m = 4, FGD reduces it to 10.3%, a 47% relative reduction, and m = 8 reduces it to 8.7% (section 11.6, PDF p. 8). The wild split has two expert labels with κ = 0.81; BPF + CPG agrees with experts at κ = 0.77, while LLM judges reach κ = 0.58 (sections 10 and 11.3, PDF pp. 6–7).

Verus form. Inference: sample several Rust/Verus contract candidates, run lightweight probe proofs, rerank by the spectrum, and re-prompt with a concrete failed probe. This can reduce semantic drift in generated `requires`/`ensures`, but it does not prove executable Rust or external assumptions.

## what is proved, measured, and trusted

The paper proves a drift-detection theorem under witnessability rate α(D): k ≥ (1/α(D)) log(1/δ) gives detection probability at least 1 − δ when the oracle is complete (Theorem 8.1, PDF p. 5). It also proves a PAC-faithfulness result for an autoformalizer output distribution under a lower witnessability bound α0 (Theorem 8.2, PDF p. 6). DRIFT BENCH contains 2,183 controlled NL/Lean pairs across six mathlib4 subfields, plus a wild split of 384 LLM-generated pairs (section 10, PDF p. 6).

Inference: trusted components include the interpretation distribution linking English to accepted formal statements, probe-label correctness, mechanical perturbation rules, Lean/Verus entailment completeness within the timeout, calibration labels, and the specification itself. The paper explicitly warns: “BPF should be deployed as a triage tool that prioritizes expert review, not a replacement for it.” (section 12, PDF p. 8).

The table arithmetic is internally consistent for Table 1: faithfulness totals 932 + 284 + 348 + 267 + 156 + 145 = 2,132, while the text says 2,183 pairs; the displayed row totals sum to 2,183 only when the six row faithfulness values are summed with the other columns. Inference: the apparent 51-pair difference comes from reading the column total as a separate count; the six row totals sum to 2,183, so no contradiction is established by the column display alone. The paper reports Isabelle/HOL F1 = 0.88 versus Lean 4 F1 = 0.91 in preliminary experiments, but gives no denominator or split size (section 12, PDF p. 8).

## techniques for the catalog

- BPF — compare forward and backward entailment fingerprints of a candidate with probes predicted from the natural-language statement

- CPG — synthesize probes contrastively against mechanically drifted twins for quantifier, hypothesis, conclusion, and coercion drift

- Equivalence Spectrum — turn weighted probe mismatches into calibrated ACCEPT, REVIEW, and REJECT regions

- APBA — allocate entailment queries by expected information gain across drift classes

- FGD — rerank sampled formalizations by the spectrum and re-prompt with witness probes to repair drift
