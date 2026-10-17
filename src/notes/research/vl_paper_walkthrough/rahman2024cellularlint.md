# CellularLint: A Systematic Approach to Identify Inconsistent Behavior in Cellular Network Specifications
(authored by agents unless marked 🧑)
Tag: `rahman2024cellularlint`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/rahman)

CellularLint searches 4G/5G Non-Access Stratum (NAS) and security specifications for pairs of descriptions that prescribe conflicting behavior. It combines domain pre-training, similarity-based pair reduction, weakly supervised textual entailment and manual validation, then investigates implementation choices and attacks for selected conflicts. The abstract reports "157 inconsistencies with 82.67% accuracy." Section 6 separates model evaluation from the manual filtering that produced those 157 pairs.

## technique: quantize long protocol events into comparable segments

Use this when a protocol event spans pages and direct all-pairs comparison is computationally infeasible. The scope is NAS mobility/session procedures and security specifications, not every cellular layer (Section 3.1).

1. Remove tables, figures, cross-document references, code and malformed text for domain pre-training (Section 4.2, p. 5221).
2. Extract section- or paragraph-level, sub-event-oriented segments without cutting an event in half. Keep short self-contained sections intact; split sections whose paragraphs describe independent events (Section 4.1, p. 5220).
3. Pre-train BERT-base, RoBERTa-base and XLNet-base on the 3GPP corpus so the language models learn cellular vocabulary and semantics; this is separate from TF-IDF vectorization (Sections 4.1 and 5, pp. 5220, 5223).
4. Convert each segment to TF-IDF, compute pairwise cosine similarity ψ, and retain only pairs in `[ψmin, ψmax]`. A lower bound removes unrelated events; an upper bound removes near-duplicate wording (Sections 4.2–4.3, pp. 5221–5222).
5. For supervised training, remove common-sentence pairs. Define seven relations: consistent, inconsistent, unrelated, either temporal ordering, and either direction of containing more detail. Map consistency and both temporal orderings to entailment, inconsistency and both detail-containment relations to contradiction, and unrelatedness to neutral (Sections 4.3–4.4, p. 5222). Expert annotation covers small samples, not every retained pair.

The paper states, “The key challenge in finding inconsistencies in 4G/5G protocols is that there are no ground truth labels for model training.” (Section 4.4, p. 5222). For 4G, 2,599 unique segments give the paper's all-pairs count of about 6.75 million, reduced to 1,881 retained pairs; for 5G, 3,529 segments give about 12.45 million, reduced to 2,541 (Section 6.1.1, p. 5224). The cosine-similarity bounds are 0.65–0.99 for 4G and 0.7–0.99 for 5G. The paper says, “To obtain a scalable solution, we initially cast the documents in sizeable segments based on domain-specific knowledge.” (Our Approach, p. 5216).

Inference: In Verus, represent a segment with a ghost record containing event, precondition and action, and verify filtering against a specified similarity interval. This would require a model of the numerical computation. Such a proof would establish compliance with the bounds, not that TF-IDF similarity captures protocol meaning.

## technique: weakly supervised, domain-adapted inconsistency classification

The challenge is the absence of a ground-truth cellular contradiction dataset. CellularLint first fine-tunes the domain models on the general SNLI textual-entailment corpus, then uses ensemble predictions to select a small sample for expert correction. It retrains on those corrected pairs and repeats this informed phase three times (Sections 4.1 and 4.4–4.6, pp. 5220–5223).

1. Train BERT, RoBERTa and XLNet separately on SNLI’s entailment, contradiction and neutral labels (Section 4.1).
2. Majority-vote their predictions to obtain candidate labels (Section 4.1).
3. Have domain experts validate and rectify 150 sampled pairs per phase, 450 across three phases; use corrected examples for the next phase (Sections 4.1 and 4.5).
4. Repeat the cycle and combine the final models as EnCell. Use weighted cross-entropy so mistakes on the rare inconsistent class cost more (Sections 4.5–4.6, p. 5222).
5. Classify the filtered PoS and manually inspect high-confidence results.

The implementation uses about 2,500 Google Colab pro+ computing units with Nvidia A100 GPUs for pre-training, a 64-core server with three RTX 3090Tis and 128 GB RAM for fine-tuning, and reports about four days to pre-train each base model (Section 5, p. 5223). It also adds synthetic pairs using Easy Data Augmentation at each informed phase. Table 1 (p. 5225) reports EnCell F1 increasing from 0.498 to 0.7962 and phase-3 accuracy of 0.8267. These are model-evaluation metrics. Separately, after 6 hours of manual filtration, 186 predicted inconsistent pairs of segments (PoS) become 157 pairs that may affect design choices; around 16% are removed because broader context resolves the apparent conflict (Section 6.3, p. 5224): “After filtering, we found a total of 157 PoS that may affect design choices.” Inference: the 82.67% classification accuracy should not be read as a measurement of the correctness of all 157 final pairs.

Inference: A Verus integration could treat the classifier as an untrusted source of candidates. Each conflict record could store the two source spans, labels and a human-approved relation. A `proof fn` could require that a downstream model use only approved records; human approval would not itself prove the interpretation correct.

## technique: dispatch conflicts into implementation and attack checks

The Dispatcher checks predicted conflicts against srsRAN, Open5GS and OpenAirInterface and selects a subset for device testing (Section 4.1, p. 5221). The investigation uses srsRAN v23.04.1, Open5GS v2.6.6 and OpenAirInterface v2.0.0, plus 17 commercial user-equipment (UE) devices and software-defined-radio testbeds (Sections 5 and 6.3.1, Tables 5–6). Some functionality was unimplemented, handover scenarios could not be tested, commercial-device substates could not be confirmed, and commercial-carrier attacks were not performed (Section 6.3.1, p. 5225). The threat model allows message generation and modification in man-in-the-middle, fake-base-station and signal-injection scenarios without cryptographic capabilities (pp. 5225–5226). Researchers manually design attacks from conflicting statements. Section 8 (p. 5230) warns, “We want to emphasize that not all inconsistencies can lead to exploitable attacks.”

Concrete findings include conflicting security-context handling, deletion of the Globally Unique Temporary ID (GUTI), and tracking area update (TAU)/detach precedence. One specification pair directs different sub-state transitions after the same attach-reject cause; srsRAN implements both branches, which the authors identify as a potential interoperability problem (Section 6.3.5, Figure 12, p. 5229). Another pair leaves GUTI deletion inconsistent; the authors report 16 commercial devices not properly deleting GUTI for the relevant reject messages and describe the resulting linkability risk (Section 6.3.3, pp. 5227–5228). Their exact observation is: “In commercial UEs, we found a total of 16 devices not properly deleting GUTI for these reject messages (Table 6).”

The evaluation measures classifier performance, pair-count reduction and implementation behavior. Removed figures and broader context can resolve a predicted conflict: an EAP-TLS case required manual rejection, while a timing diagram outside the processed text clarified it (Section 8, p. 5230). The authors write, “However, figure B.2.1.1-1 under Annex B.2 in TS 33.501 describes a timing diagram of that authentication procedure more clearly.” Section 8 also reports approximately 16 expert hours for active-learning corrections, separate from 6 hours filtering results. Inference: segmentation, expert labels, implementation mapping and attack design require review beyond classifier metrics. For agent-written verified Rust, a useful adaptation would retain source evidence and conflicting interpretations for review before specifying behavior; a proof of one interpretation alone would not establish interoperability with peers following another.

## techniques for the catalog

- context-preserving specification quantization: split long protocol events into sub-event segments before comparison
- similarity-filtered weak supervision: use TF-IDF bounds, SNLI transfer, ensemble voting and expert corrections to classify conflicting pairs
- implementation dispatcher: map conflicts to source code and devices, then manually construct attacks under an explicit channel threat model
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Furthermore, we could not execute any attacks on the commercial carrier side as it is prohibited by law."): checked every study quotation, number, section/page reference and technique step against the complete paper, including references; corrected the publisher link, page and section references, pre-training/vectorization distinction, relation mapping, evaluation interpretation and device-testing scope, and marked proposed Verus applications as inferences; did not reproduce experiments, inspect implementation code or verify external artifacts.
