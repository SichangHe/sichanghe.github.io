# DocVAL: Validated Chain-of-Thought Distillation for Grounded Document VQA
(authored by agents unless marked 🧑)
Tag: `neogi2025docval`, [paper](https://arxiv.org/abs/2511.22521)

## what is proved or measured
DocVAL distills spatial reasoning from a large vision-language teacher into a compact student by filtering teacher traces with a rule-based validator and iteratively training on validator feedback. The initial pool has 102,447 examples; 95K pass the quality threshold, split into 76K training, 9.5K refinement, and 9.5K test examples (Sections 3.3–4, pp.5–6). On DocVQA, Gemma3-12B DocVAL reaches 91.4 ANLS and 82.4 mAP versus base Gemma3-12B at 84.6 ANLS; the student uses no OCR or detector at inference (Table 1, p.7).

## technique 1: dual-mode rule-based VAL
what it is: use one deterministic five-module validator first as a binary filter for teacher traces and later as a detailed verifier that returns prioritized, pixel-level corrections

when to use: Inference: when generated supervision includes answers, boxes, and reasoning whose quality must be checked reproducibly before training

how to do it:
1. detect text regions to guide teacher generation and training-time validation; do not give regions to the student (Appendix A, p.13; Algorithm 1, p.15)
2. match predicted boxes to detected regions using IoU for semantic verification (VAL Module 1, Section 3.2.1, p.4)
3. score answer text with Qans = 0.7·ANLS + 0.3·indicator[predicted answer in OCR regions] (Module 2, p.4)
4. score boxes with Qbbox = 0.8·IoU + 0.2·indicator[predicted region = ground-truth region] and compute a correction vector δ = [Δx1,Δy1,Δx2,Δy2] (Module 3, pp.4–5; Appendix B.2, p.14)
5. check reasoning structural completeness, coordinate consistency, and spatial-language alignment (Module 4, p.5)
6. combine scores as Q = 0.4·Qans + 0.4·Qbbox + 0.2·Qreason, where Qreason averages the three reasoning checks; in Filter mode output accept/reject, and in Verifier mode output structured error messages, prioritized fixes, and corrected outputs (Module 5 and Figure 2, p.5; Appendix B.2, p.14)

The paper says: “VAL consists of five specialized modules:” (Section 3.2.1, p.4) and “VAL is intentionally not implemented as a learned critic.” (Section 3.2, p.4)

Verus form: Inference: define pure `spec fn` predicates for answer membership, rectangle intersection, IoU bounds, and consistency; prove a `proof fn` that an accepted trace satisfies `ensures` clauses. Use `requires` for valid rectangle coordinates and explicit bounds. Inference: this can verify deterministic rules, but it cannot prove OCR detector recall or teacher semantic intent.

Evidence: applying Q > 0.85 retains 95K/102,447 = 92.7% (Figure 2 and Section 3.3, p.5). Table 2 shows DocVQA 88.1 ANLS/63.7 mAP with no validation, 89.5/76.1 with binary filter, and 91.4/82.4 with filter plus detailed verifier (p.7).

## technique 2: validated teacher trace curation
what it is: generate spatial chain-of-thought (CoT) from a large teacher conditioned on image, question, and ground-truth answer/box, then retain only traces above the VAL threshold

how to do it:
1. start with D1 = 102,447 document image/question/answer-box tuples (Section 3.3, p.5)
2. run DB-ResNet text detection; provide regions to the teacher and VAL, never to the student (Appendix A, p.13; Algorithm 1, lines 5–6, p.15)
3. ask Gemini 2.5 Pro by default for CoT, answer, and predicted box (Section 3.3, p.5)
4. compute VAL quality and retain examples over 0.85 (Algorithm 1, lines 4–11, p.15)
5. split retained traces into D3 76K, D4 9.5K, and Dtest 9.5K (Algorithm 1, line 11, p.15)

The paper states: “These regions are never used as student inputs.” (Section 3.3, p.5) Inference: this asymmetric setup prevents the student from copying detector coordinates and forces visual grounding.

Verus form: Inference: treat each accepted trace as a ghost training datum with a proof certificate for its validator predicates. A Rust implementation could keep detector and teacher outside deployment and verify the curation rules without proving learned model behavior.

Evidence: Table 6’s DocVQA mAP is 82.4 with DB-ResNet, 80.6 with CRAFT, 79.3 with PSENet, 78.7 with EasyOCR, and 74.1 without Phase-A detection (p.17). These are student results under different detection configurations. Appendix E.1 (p.16) states: “Removing region references from teacher CoT while retaining detection for VAL (76.8 mAP) further shows that region-aware reasoning generation contributes beyond validation alone, highlighting detection’s dual role as both supervision scaffolding and reasoning guide.”

## technique 3: validation-driven iterative refinement
what it is: use verifier feedback on student outputs to create correction examples and fine-tune model weights repeatedly, rather than merely prompting a correction

how to do it:
1. train Gemma3-12B with supervised autoregressive likelihood on D3, where the student sees only (I,q) and predicts CoT, answer, and box (Stage B1, Section 3.4.1, p.5)
2. for each D4 example, generate a student prediction without regions (Algorithm 1, lines 21–24, p.15)
3. run VAL Verifier with regions and ground truth to produce error text and pixel correction (Algorithm 1, lines 23–25, p.15)
4. append feedback-augmented examples and fine-tune for two epochs (Section 3.4.2, p.6; Algorithm 1, lines 25–27, p.15)
5. repeat up to ηmax = 20 iterations or until convergence (Section 3.4.2, p.6)
6. deploy the final student as one forward pass with image and question only (Section 3.5, p.6)

The paper states: “Unlike prompt-based refinement, this procedure updates model weights, enabling durable improvements in spatial reasoning.” (Section 3.4.2, p.6)

Verus form: Inference: represent each correction rule as a proof obligation over a model-output datatype; use `ensures` to guarantee that a correction preserves box bounds and answer consistency. Inference: training convergence and neural weights are outside Verus’s proof model, so Verus can check the validator and data transformation, not learned behavior.

Evidence: Table 3 gives DocVQA 88.3/72.7 after B1 only, 88.8/74.3 after five iterations, 90.3/78.9 after ten, and 91.4/82.4 at convergence; the paired values are ANLS/mAP on DocVQA. DocVQA converges at 14 iterations (Table 3, p.8). Appendix H.1 (p.19) says “converges in 12–16 iterations on average (13.2)”, although Table 3 lists 11 iterations for SROIE. VAL verifier throughput is 12 examples/sec (Figure 2, p.5; Appendix H.1, p.19).

## technique 4: explicit validation and refinement ablations
what it is: isolate the value of filtering, detailed feedback, detection scaffolding, teacher reasoning, data scale, and iteration count through controlled ablations

how to do it:
1. compare no validation on 102K unfiltered examples with binary Filter and Filter plus Verifier on curated data; these configurations change data curation and feedback, so the data are not identical (Table 2, p.7)
2. compare B1 only with five, ten, and converged B2 iterations (Table 3, p.8)
3. vary validated training data from 19K (25%) to 38K, 57K, and 76K while holding D4 at 9.5K (Table 4, p.8)
4. swap detectors and remove detection or region references from teacher CoT (Table 6, p.17)
5. swap teacher models and remove teacher CoT (Table 7, p.17)
6. vary quality threshold 0.75–0.95 and component weights (Appendix G, pp.18–19)

Evidence: with 38K validated traces, DocVQA is 88.9 ANLS/73.6 mAP; with 76K it is 91.4/82.4 (Table 4, p.8). The no-teacher-CoT baseline is 87.7 ANLS/65.4 mAP versus Gemini 2.5 Pro teacher 91.4/82.4 (Table 7, p.17). Threshold sensitivity ranges from 79.3 mAP at 0.75 to 82.4 at 0.85 and 78.9 at 0.95 (Table 10, p.18). These denominators are not fractions: the table entries are metrics under each fixed configuration.

## trusted boundary, contradictions, and scope
Inference: VAL, detector outputs, teacher traces, and the training data form assumptions of student training; a high VAL score alone does not establish human correctness. Inference: Verus can make the validator and dataset transformations auditable, but cannot prove the neural student’s learned mapping or detector coverage.

The paper reports handwriting with ANLS = 1.0 but IoU = 0.68 versus typical >0.9 for print in one qualitative example (Appendix C, p.15), and says handwriting, degraded scans, and chart/figure pages lie outside its current benchmark distribution (Appendix H, p.19). Inference: product risk is concentrated in specification or training-data validators that omit relevant cases; a checked validator can consistently reject or accept the wrong abstraction.

Inference: VL should reuse deterministic verifier feedback, accepted-trace filtering, and ablations that separate answer correctness from localization. It should not redo a generic teacher/student distillation baseline without a Verus-specific contract or proof-success measure. Inference: this paper’s method poses moderate threat to agent-written verified Rust because training-time checks can improve generation quality while leaving the generated specification’s adequacy unproved.

## techniques for the catalog
- dual-mode rule validator — apply deterministic answer, geometry, reasoning, and feedback checks as filter and verifier
- validator-curated teacher traces — keep only high-quality teacher CoT/answer/box tuples using a threshold
- iterative feedback distillation — fine-tune a compact student on structured verifier corrections until convergence
- validation ablation protocol — isolate filtering, feedback, detector, teacher, scale, threshold, and iteration effects
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The combination of CoT supervision and multi-aspect validation prevents error propagation and enables precise spatial learning."): checked all study quotations, numbers, section/page references, technique steps, tag, and arXiv identifier against the entire paper including appendices; corrected appendix pages, teacher use of detected regions, validator scoring, the nonidentical validation-ablation data, and the iteration-count inconsistency; did not reproduce experiments, inspect implementation/data, or validate the proposed Verus inferences.
