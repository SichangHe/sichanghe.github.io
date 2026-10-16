# Plans You Can Check: Verifier-Grounded Learning of an Open-Weight Planner for Executable Video-Editing
(authored by agents unless marked 🧑)
Tag: `wang2026plans`, [paper](https://arxiv.org/abs/2608.25622)

## what is proved or measured
RefineCut treats video editing as executable planning. A task is a brief, clip pool, music metadata, initial timeline, and explicit constraint ledger. The planner emits typed RFC 6902-style JSON patches; `Apply` updates the timeline and `Verify` recomputes ledger satisfaction (§2.1, p. 2). The paper’s central claim is operational: “Because every requirement is an explicit ledger entry, a deterministic verifier, rather than a learned LLM judge, can apply each patch and recompute the ledger entry by entry.” (§1, p. 2.)

RefineCut-Bench has 3,578 canonical tasks, 7,971 captioned clips, 499 music tracks, and seven field-level constraint families (§2.4, p. 3; Appendix B, pp. 25–27). The primary Common-100 test has 100 tasks; a canonical-clean subset has N=92 (§4.1, p. 5; §4.8, p. 10). Verifier metrics are protocol-internal; rendered quality is separately judged by three annotators (§2.3, p. 3; §4.9, p. 11). The paper reports Video-Editing Score (VES) 0.620 for raw imitation, 0.858 after verifier-replayed SFT, and 0.924 after RefineCut-Evo (§4.3, p. 8). Inference: these results show learning under this ledger and verifier, not general video quality or semantic correctness.

## technique: explicit typed state and constraint ledger
What it is: represent the editable timeline as typed state and each obligation as a ledger row `(item_id, type, spec, satisfied, evidence)`. Families include duration, transition, music sync, clip inclusion/exclusion, repeat limits, and pacing (§2.2, p. 2; Appendix B.4, p. 26). Hard constraints require all entries to pass; softer entries receive graded credit (§2.2, p. 2).

How to apply:
1. Build a task tuple `(brief, clip pool, music, initial state, ledger)` (§2.1, p. 2).
2. Restrict patches to typed operations over canonical timeline paths; reject references outside the supplied pool (Appendix B.5, p. 26).
3. After every patch, apply it and recompute every ledger entry (§2.1, p. 2).
4. Stop after a small repair budget; the paper uses T=3 (§3.1, p. 4).

Verus form (Inference): encode timeline and ledger as Rust structs, expose a spec view of each ledger predicate, and verify `apply_patch` with `ensures` that the resulting state satisfies the recomputed entry values. Use `requires` for schema and clip-pool membership. Keep parser, renderer, captioner, and music extractor as trusted boundaries unless separately specified.

Evidence and limits: every ledger has at least four items and a target-duration item (Appendix B.4, p. 26). The planner reads captions and metadata, not pixels; caption errors can therefore bound quality (§4.8, p. 11). The verifier checks structural correctness, not taste, story quality, factual accuracy, fairness, or social appropriateness (Limitations, p. 11).

## technique: verifier-replayed trajectory distillation
What it is: convert noisy multi-teacher trajectories into supervision by canonicalizing every branch, replaying it, scoring the resulting state, and selecting the verifier-best branch. The paper says, “Verifier replay thus converts an inherently noisy resource into a consistently graded supervi­sion signal.” (§2.5, p. 3.)

Steps (Algorithm 1, Appendix F, p. 30):
1. For each teacher branch, canonicalize JSON paths, aliases, and trajectory structure.
2. Reject invalid patches; otherwise apply the patch and recompute the ledger.
3. Score each branch from ledger improvement, targeted repair, required-clip recall, patch applicability, no regression, and locality using fixed weights `(0.35, 0.20, 0.20, 0.10, 0.10, 0.05)` (Eq. 4, Appendix D, p. 28).
4. Advance with the highest-scoring valid branch.
5. Fine-tune on verifier-best patches with next-token cross-entropy; construct step- and trajectory-level preference pairs from score gaps (§3.3–3.4, pp. 4–5).

Verus form (Inference): model replay as a pure transition function over a ghost/spec timeline and prove score monotonicity for the selected branch where the ledger specification permits it. Rust execution still needs runtime validation for malformed JSON; proof code cannot validate an unmodeled renderer.

Evidence: raw teacher first-choice branches produce VES 0.620, while verifier-best SFT reaches 0.858 from 3,317 examples instead of 9,690 raw examples (§4.3–4.4, p. 8). Teacher replay diagnostics show hard-pass rates only 0.015–0.028 despite patch-apply rates 0.872–0.989 (Table 12, Appendix G, p. 31), demonstrating that executable branches usually repair partially rather than solve the whole ledger.

## technique: verifier-centered self-improvement with DPO
What it is: sample K=4 student repairs, score each with the deterministic verifier plus rubric ER1–ER7, retain high-margin chosen/rejected pairs, and train with offline DPO (§3.5, p. 5). The verifier contributes the primary signal; rubric criteria cover intent, ledger satisfaction, grounding, coherence, duration/pacing, music, and economy (Appendix F, pp. 30–31).

Steps:
1. Start from the verifier-replayed SFT model.
2. At sampled training states, generate four patches and discard parse/apply failures.
3. Compute `S(c)=0.65 V(c)+0.35 R(c)` and choose the highest score; retain negatives at least margin τ below it (Eq. 3, p. 5).
4. Train DPO with the frozen SFT reference model; choose the step-300 checkpoint on dev100 VES (Appendix E, p. 30).
5. At inference, run planner–Apply–Verify for at most three steps, with no teacher calls (§3.6, p. 5).

Verus form (Inference): use verifier score components as executable predicates and define preference only over states whose patches pass schema and safety preconditions. DPO itself is outside Verus; Verus can verify the transition and ledger contracts used to generate training labels.

Evidence: RefineCut-Evo reaches VES 0.924, HardPass 0.820, and Converged@3 0.950 (Table 3, p. 9). Verifier-only DPO reaches 0.909; rubric margins add 0.015, while no-margin and UCPO-lite variants fall to 0.8965 and 0.8800 (Table 3, p. 9). On 100 tasks, Evo improves 22 and degrades 5 (§4.5, p. 9). It transfers: verified SFT gains over raw are +0.238 on Qwen3-8B, +0.153 on Llama-3.1-8B, and +0.079 on GLM-4-9B (Table 4, p. 9).

## technique: closed-loop execution and failure accounting
The deployed planner reads only current state and violated ledger entries, emits one patch, and repeats Apply/Verify up to T=3 (§3.6, p. 5). Report component metrics, not only VES: final constraint-satisfaction rate, HardPass, required-clip recall, duration pass, timeline validity, and no regression (Appendix D, pp. 27–28). In Common-100, OK plans rise from 74 to 91 and duration mismatches fall from 16 to 1 (Figure 5, p. 10). Evo uses fewer patches per task (1.76 vs. 2.72 prompted), fewer operations (3.77 vs. 5.95), and similar output length (67.5 vs. 69.1) (Table 21, Appendix G, p. 34).

Verus form (Inference): prove each transition preserves previously satisfied ledger predicates with a loop invariant over the bounded repair loop. Runtime should still fail closed on invalid patches; a proof of the transition relation does not prove that captions describe the actual video.

## trust boundaries and threat to VL
The paper trusts the typed schemas, ledger authoring, upstream captions and beat tracks, verifier implementation, model training, and renderer. It explicitly says, “The verifier checks structural correctness, not factual accuracy, fairness, or social appropriateness.” (Limitations, p. 11.) The benchmark’s ledgers are LLM-generated, revised by assistants, and checked by editors (§4.8, p. 10). Human preview evaluation uses 150 randomized A/B pairs and three annotators (§4.9, p. 11), but VES remains an in-protocol metric.

Inference: threat to VL is substantial at specification capture and trusted-input boundaries. Verus can prove a Rust implementation satisfies a ledger, yet a wrong ledger, stale caption, omitted obligation, or unsound renderer contract leaves the product behavior wrong. The reusable design is the execution gate plus fail-closed Apply/Verify loop, verifier replay before learning, and explicit provenance for fields. VL should not redo raw imitation of teacher traces; the paper’s matched comparison already shows it wastes noisy labels. What remains open is proving semantic correspondence between natural-language requirements, ledger entries, upstream observations, and the rendered artifact.

## techniques for the catalog
- typed executable planning: represent actions as schema-checked patches over a typed state
- constraint ledger: turn requirements into per-entry deterministic predicates and evidence
- verifier replay: canonicalize, execute, score, and select branches before training
- verifier-best SFT: train on replay-selected patches rather than teacher first choices
- verifier-centered DPO: sample repairs, score with verifier/rubric, and train on high-margin pairs
- closed-loop Apply/Verify: bound repairs, reject invalid patches, and recompute obligations after every step
- component failure accounting: report hard-pass, recall, duration, no-regression, and execution metrics separately
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
