# Fewer Assumptions by Design: reusable DLL verification guidance
(authored by agents unless marked 🧑)

Andrada-Livia Antoneac, Dorel Lucanu and Dragoș Teodor Gavriluț, [arXiv 2609.34886v1](https://arxiv.org/abs/2609.34886v1), September 28, 2026; EPTCS 452, pp.104–121, [DOI](https://doi.org/10.4204/EPTCS.452.8). [Saved PDF](/ssd1/sichangheagent/vlpw/fewer_assumptions.pdf), [text](/ssd1/sichangheagent/vlpw/fewer_assumptions.txt). [Skill repository](https://github.com/andradaAntoneac/generate-verus-specification), [experiment repository](https://github.com/andradaAntoneac/Verus-dll-Experiments).

This is direct prior work for VL: an agent skill translates DLL requirements and Rust implementations into Verus specifications and proofs. Its six demonstrations vary substantially in both trust and behavioral precision. Zero assumptions alone does not mean an adequate specification.

## What is attempted

A doubly linked list must preserve agreement between forward and backward links. Eleven implementations from earlier work share eight operations but use heap pointers, array slots or map keys. §1, printed p.104: “the work presents the first steps we take to achieve this goal.” It does not verify all eleven implementations.

§2.2, p.106 describes “an interactive, exploratory methodology where a user collaborates with an agent to progressively strengthen specifications.” This differs from evaluating autonomous generation under a fixed, controlled benchmark.

The progressive study first hand-writes a weak index-list proof, then targets chain validity, then strengthens the whole list invariant with Claude. Tables 3–4 report 9 assumptions and 3 axiomatic lemmas in the first experiment, then 6 and 2 with fewer operations covered. §3.3, p.109: “The final state is 45 verified, 0 errors, 11 assumes”. The remaining assumptions bridge exact-hop reachability to sequence indices. Verifier item counts must therefore be reported alongside residual trust.

## Techniques VL can reuse

§3.3 splits bookkeeping `wf()` from structural `full_wf()`: “decouples the helper primitives (e.g., allocate and link) from chain reasoning” Do not force a slot allocator to prove a complete linked chain in a transient state. Add an explicit ghost membership set instead of relying exclusively on opaque computed set expressions. A ghost boolean captures a postcondition before a later mutation removes the relevant local context. The study reduced assumptions from 75 to 11 through invariant strengthening, acyclicity lemmas, ghost facts and direct witnesses.

§3.4, pp.110–113 supplies concrete engineering lessons:

- Ghost snapshots must identify intermediate states: “old(self) always refers to the function entry state.” Place snapshots and proof blocks after the mutation whose state they describe.
- Mutable helper contracts need frame clauses: “retaining only the facts explicitly guaranteed by the callee's postconditions.” State preservation of untouched fields explicitly.
- Quantified invariants need usable trigger anchors. A syntactically valid but overly specific trigger may never instantiate at the needed proof site. This is a proof-search failure, not evidence the proposition is false.
- Recursive reachability needs explicit induction lemmas and controlled unfolding. §3.4.3: “both a fuel-bounded reachability predicate and an exact-count predicate should be maintained.” The former expresses bounded reachability; the latter supports precise induction.
- Prove lower bounds before converting an integer subtraction back to a natural number. Separate arithmetic sorts deliberately.
- Split large proof contexts into helper lemmas to avoid solver resource exhaustion.
- Track live slots, free slots and reachable nodes separately; they are not interchangeable sets. Duplicate-free recycling needs its own invariant.
- Exact ghost order sequences make append, insertion and removal postconditions precise. Reachability or endpoint preservation alone does not determine order.

§4.1, p.114 requires traceability: “is justified by a specific abstract requirement.” It also says: “Weakening specifications to help the verifier or to generate the specification faster should be forbidden.” These are valuable design principles, not evidence that every generated result follows them.

The skill separates input analysis, abstract-to-Verus mapping, generation, invariant construction, verification, debugging and discrepancy reporting (§4.2). Its assets include property modules, syntax/pattern references, templates and examples. For unsupported representations it deliberately chooses a documented axiom boundary: “executable functions are marked with external_body, code bodies should not be proved” (p.115). Such a result is a conditional abstract specification, not verified implementation correctness.

## Demonstrations and what they show

Table 5, printed p.117 contains six runs: four index-list runs, one standard-list run and one SlotMap run. I1/Codex 5.2 High: 46 assumes, zero axioms, 612 lines, 10 minutes. I2/Claude 4.8 Max: zero/zero, 2259 lines, 50 minutes. I3/same model: zero/zero, 1539 lines, 40 minutes. I4/Claude 4.6 High: 18/1, 1122 lines, 20 minutes. Standard and SlotMap/same model: zero/8 each, 485 and 762 lines, 10 minutes each. These are author-reported demonstrations, not repeated model-comparison estimates. I2 additionally asks for “a full demonstration” (§4.3), so prompts are not identical.

Table 6 and §4.5 distinguish the results. I2 proves chain reachability and allocator invariants but has low order precision: “lacks a positional witness for ordering”. I3 adds a ghost order witness and exact order postconditions. The authors qualify it: “However, a ghost-heavy specification is less faithful to the concrete implementation” (§4.5, p.119). Inference: inspect the relation between ghost order and concrete links rather than treating extra ghost state itself as a defect. I4 makes the central `link` mutator external: “The proof is incomplete in the most mutation-critical parts.” Standard-list verification “cannot expose implementation bugs or justify allocator freshness beyond trust assumptions” (p.119). SlotMap also assumes its backend.

## Limits and useful evaluation dimensions

§3.4.2, p.112: “it leaves the implementation's space behaviour unverified.” The abstract deletion contract does not model physical recovery. Heap, array and map representations still need different ownership/storage infrastructure. A storage-agnostic chain model does not remove that obligation.

Count assumptions and external bodies, but also inspect where they occur. The paper evaluates trust boundary, requirement alignment, order precision, type/representation restrictions, allocation modeling and proof ergonomics (§4.4). Recommendation: adopt these dimensions in VL reviews rather than a single pass/fail count. Require temporary `assume` stubs to be either discharged or explicitly retained in the final evidence. The skill itself permits temporary assumptions in step 5; that permission needs an exit criterion.

## Prior work and threat

The paper builds on AutoVerus, VeriStruct and VeruSAGE (§2.2). Its useful addition is reusable DLL guidance aimed at stronger specifications and lower trust. It is directly overlapping prior art for domain skills, generation workflow, framing and proof-debugging guidance. VL should reuse or compare against this workflow rather than describe these ideas as new.

Inference: the product threat is real within index-list generation, but the scope is narrow and interactive. Six heterogeneous demonstrations do not establish robust repository-wide autonomous generation. The strongest opportunity for VL is demonstrating semantic adequacy and low trust across representations under fixed inputs, not competing on the number of verifier-accepted items alone.

## Evidence and VL context

Page numbers below are PDF pages unless printed pages are explicitly named. Quotations and reported results come from the linked primary paper, not an independent reproduction. Recommendations and competitive assessments are our inferences. VL's current [vision](/ssd1/sichangheagent/VeruLaw/docs/vision.md) says: “The product direction is autonomous Verus project generation.” Its intended inputs are ordinary intent, code, tests and project documents. This study does not establish that VL currently achieves that goal.

## Validation

Material quotations were checked against the PDF text, including a second raw-text extraction for Vosti's two-column layout. A separate reviewer checked all five studies against the primary text; the citation correction and omitted scope qualifications were incorporated. No code or published experimental results were independently reproduced.

ChatGPT offload was attempted with full PDFs. The multi-file upload failed, the combined-PDF job ended with `account_ui_retry_required`, and its retry required login. No ChatGPT answer was used to support the claims in this study. The primary-text synthesis and independent review remain the evidence.

## ChatGPT cross-check (2026-10-12)

The available ChatGPT answer was checked against `fewer_assumptions.txt`. These additions hold:

- the paper defines `assume` statements as introducing “unproven hypotheses inside a proof or executable block” (§3, p. 108)
- its workflow marks executable functions with `external_body` when “code bodies should not be proved” (§4.2, p. 115), so an assumption count must distinguish opaque implementations from proved mutators
- the strongest Index run says it “achieves full verification while enabling high-precision ordering postconditions” (§4.5, p. 119), while the authors' “longer-term goal remains verifying all eleven implementations against the single shared specification” (§5, p. 120)

The answer's direct-threat rating is an opinion; these quotations do not establish repository-scale completion.
