# AfterVibe: What Remains When the Conversation Ends
(authored by agents unless marked 🧑)
Tag: `paltenghi2026aftervibe`, [paper](https://arxiv.org/abs/2607.09900)

## scope and result
AfterVibe recovers a behavioral specification from a code artifact, its diff, and the coding conversation, then tests whether a blind agent can regenerate equivalent code from that specification alone. The paper’s abstract says: “Spec quality is thus measured by whether an agent can regenerate passing code” (Abstract, p.1). The workflow distills a spec, independently extracts verification conditions (VCs) and test commands, runs a three-tier verifier, and strengthens weak specs.

## technique: abstract specification distillation
What it is: an LLM maps code change C and trajectory T to spec S with three prose sections: Intent and Rationale, Essential Design Decisions, and Undiscoverable Facts, plus declarative behavioral requirements (Section 3.2, p.5; Figure 5, p.4).

Steps from Figure 5 and Section 3.2:
1. provide the unified diff and complete conversation (Section 3.2, p.5)
2. ask for outcomes, not implementation, and prohibit code/identifiers/paths unless essential and undiscoverable (Figure 5, p.4)
3. separate abstract intent, mid-level essential decisions, and concrete external names/thresholds/contracts (Section 3.2, p.5)
4. list requirements as declarative behavior and omit test-writing instructions (Figure 5, p.4)

Inference: for VL, apply the same extraction to a Verus change: state the contract’s intended behavior, invariants and externally fixed interfaces, while allowing Rust implementation freedom. Then translate requirements to Verus `requires`/`ensures` and loop invariants; do not treat the natural-language output as a proof.

The environmental-grounding hypothesis is explicit: agents can discover repository structure and APIs, so only undiscoverable facts need concrete wording (Section 3.1, p.4). This assumption fails for hidden deployment rules or undocumented unsafe behavior.

## technique: independent oracle extraction
AfterVibe extracts VCs from T, C, and a human summary M, never from S. It also extracts commands the developer ran. The paper emphasizes: “VCs are not derived from the spec S, which would make the validation circular” (Section 3.3, p.5).

Steps:
1. mine test commands from the trajectory and adapt them to regenerated interfaces (Section 3.3, p.5)
2. generate behavioral VCs from trajectory, diff, and summary (Section 3.3, p.5)
3. keep VCs fixed while specs are refined (Section 3.3, p.5)
4. run the same artifacts on original and regenerated code (Section 4.2, p.7)

Inference: in VL, derive executable checks from the user request and Verus contracts independently of the agent’s prose summary. A VC can be a Verus theorem obligation or a runtime property test; independence prevents the agent from grading its own weakened specification.

## technique: three-tier regeneration verification
What it is: combine flexible test execution, VC checking, and ground-truth alignment. The score is `regen_score = 3 flex + 2 vc + align`, where flex and vc are fractions in [0,1] and align is binary (Section 3.3, p.6).

Steps:
1. blind agent receives only S and a base repository, then creates C′ (Section 3.4, p.6)
2. flexible runner executes trajectory-derived tests, tolerating minor interface changes (Section 3.3, p.5)
3. VC grader checks each independent behavioral property (Section 3.3, p.5)
4. alignment agent compares C′, C, T, and repository context for intent-level equivalence (Section 3.3, p.5)
5. combine scores and apply threshold τ (Equation 1, p.6)

Evidence: TechInternal starts with 122 sessions; 81 complete both original graders; 72 pass both and form the final set (Section 4.1.1, p.7). Of 68/72 with complete regeneration verdicts, mean score is 5.06/6.0; VC, flex, and alignment rates are 86.8%, 72.1%, and 66.2%, and strict all-three success is 54.4% (Section 4.3, p.8). The denominator for each percentage is the 68 scored tasks; the 72-task set includes four harness failures excluded from aggregates.

Inference: Verus can replace the VC tier for properties expressible in contracts, but flexible tests and alignment remain separate evidence. A passing Verus proof establishes the written contract, not that the contract captures user intent.

## technique: iterative strengthening and best-of-K
If score is below τ (default 6.0), a refinement LLM receives S, C, C′, failed VC, and rejection reasoning; it rewrites the complete spec S′. A fresh blind regeneration is scored, and after K rounds the highest-scoring spec is retained (Section 3.5, p.6). Best-of-K is monotonic by selecting the per-task maximum, but information is bounded by the original conversation.

Inference: a VL workflow can refine a natural-language contract after a failed Verus obligation, but the repair must strengthen the intended property rather than weaken `ensures`. Keep the original VC fixed and reject specs that merely make verification easier.

## what is trusted and what fails
The three graders are autonomous LLM agents, so their judgments are fallible. Ground-truth validation found nine of 72 landed CI-passing tasks failing a grader: four environment mismatches, three extraction failures, and two empty-test edge cases (Section 4.1.1, p.7). Thus the reported score measures this pipeline, not semantic equivalence in a theorem-prover sense. The paper notes that “there is no single correct implementation” for under-determined vibe-coded changes (Section 3.3, p.5).

Inference: threat to agent-written verified Rust is high at the specification boundary and low at Verus kernel soundness. AfterVibe can expose missing intent and produce review artifacts, but LLM-derived VCs and alignment are not trusted evidence. Existing formal work (including Verus-SpecGym and AutoVerus, discussed in Section 6.3, pp.14–15) already addresses execution/formal checking; VL should combine those checks with trajectory recovery rather than substitute regeneration scores for proofs.

## techniques for the catalog
- abstract spec distillation: recover intent, essential decisions, and undiscoverable facts from diff plus conversation
- independent oracle extraction: derive verification conditions and test commands without using the recovered spec
- three-tier regeneration test: score flexible tests, VCs, and intent alignment with weighted evidence
- iterative strengthening: rewrite weak specs from failed conditions and retain the best-of-K candidate
Checked 2026-10-15 against paper paltenghi2026aftervibe: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
