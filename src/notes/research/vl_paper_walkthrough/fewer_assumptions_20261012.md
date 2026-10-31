# Fewer Assumptions by Design: reusable DLL verification guidance
(authored by agents unless marked 🧑)

## What is attempted

A doubly linked list must preserve agreement between forward and backward links. Eleven implementations from earlier work share eight operations but use heap pointers, array slots or map keys. §1, printed p.104: “the work presents the first steps we take to achieve this goal.” It does not verify all eleven implementations.

§2.2, p.106 describes “an interactive, exploratory methodology where a user collaborates with an agent to progressively strengthen specifications.” This differs from evaluating autonomous generation under a fixed, controlled benchmark.

The progressive study first hand-writes a weak index-list proof, then targets chain validity, then strengthens the whole list invariant with Claude. Tables 3–4 report 9 assumptions and 3 axiomatic lemmas in the first experiment, then 6 and 2 with fewer operations covered. §3.3, p.109: “The final state is 45 verified, 0 errors, 11 assumes”. The remaining assumptions bridge exact-hop reachability to sequence indices. Inference: verifier item counts should be reported alongside residual trust.

## Demonstrations and what they show

Table 5, printed p.117 contains six runs: four index-list runs, one standard-list run and one SlotMap run. I1/Codex 5.2 High: 46 assumes, zero axioms, 612 lines, 10 minutes. I2/Claude 4.8 Max: zero/zero, 2259 lines, 50 minutes. I3/same model: zero/zero, 1539 lines, 40 minutes. I4/Claude 4.6 High: 18/1, 1122 lines, 20 minutes. Standard and SlotMap/same model: zero/8 each, 485 and 762 lines, 10 minutes each. These are author-reported demonstrations, not repeated model-comparison estimates. I2 additionally asks for “a full demonstration” (§4.3), so prompts are not identical.

Table 6 and §4.5 distinguish the results. I2 proves chain reachability and allocator invariants but has low order precision: “lacks a positional witness for ordering”. I3 adds a ghost order witness and exact order postconditions. The authors qualify it: “However, a ghost-heavy specification is less faithful to the concrete implementation” (§4.5, p.119). Inference: inspect the relation between ghost order and concrete links rather than treating extra ghost state itself as a defect. I4 makes the central `link` mutator external: “The proof is incomplete in the most mutation-critical parts.” Standard-list verification “cannot expose implementation bugs or justify allocator freshness beyond trust assumptions” (p.119). SlotMap also assumes its backend.

## Limits and useful evaluation dimensions

§3.4.2, p.112: “it leaves the implementation's space behaviour unverified.” The abstract deletion contract does not model physical recovery. Heap, array and map representations still need different ownership/storage infrastructure. A storage-agnostic chain model does not remove that obligation.

## Prior work and threat

The paper contrasts itself with AutoVerus, VeriStruct and VeruSAGE (§2.2, p.105–106). Its useful addition is reusable DLL guidance aimed at stronger specifications and lower trust.

## Validation

Material quotations were checked against the PDF text. No code or published experimental results were independently reproduced.

An earlier ChatGPT attempt on 2026-10-12 failed (multi-file upload, then `account_ui_retry_required`, then a login prompt), so the study above was first written from the paper text alone. A later run produced a complete answer; the cross-check part below adds what held up against the paper. The primary-text synthesis and independent review remain the evidence.

## ChatGPT cross-check (2026-10-12)

The available ChatGPT answer was checked against `fewer_assumptions.txt`. These additions hold:

- the paper defines `assume` statements as introducing “unproven hypotheses inside a proof or executable block” (§3, p. 108)
- its workflow marks executable functions with `external_body` when “code bodies should not be proved” (§4.2, p. 115), so an assumption count must distinguish opaque implementations from proved mutators
- the strongest Index run says it “achieves full verification while enabling high-precision ordering postconditions” (§4.5, p. 119), while the authors' “longer-term goal remains verifying all eleven implementations against the single shared specification” (§5, p. 120)

The answer's direct-threat rating is an opinion; these quotations do not establish repository-scale completion.
