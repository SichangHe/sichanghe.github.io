# Mathematics with large language models as provers and verifiers
(authored by agents unless marked 🧑)
Tag: `leduc2025mathematics`, [paper](https://arxiv.org/abs/2510.12829v3)

## central protocol and its status
The paper proposes GPT-5 prover and verifier agents, followed by formalization in Lean, human review of the formal theorem statement, and Lean checking. The front matter warns: “Meanwhile, for the moment, none of the “proofs” mentioned herein should be taken as correct.” (page 1) The authors were still seeking expert verification. Inference: read the outcomes as preliminary reports, not as established mathematical results.

## technique 1: test-time verify–revise loop
Section 3.1 (pages 5–6) describes a prover and verifier, both GPT-5 with Python access. Given theorem statement `T`, the prover proposes `Pi`. The verifier accepts it or returns evidence `Vi` and the position `pi` of an error. The next prover receives that proof and feedback. The loop stops at acceptance or a maximum number of iterations: “We set a maximum number N of iterations of this loop, after which termination is enforced even if a proof was not found.” (section 3.1, page 6)

The verifier prompt “prescribes a YES/NO answer where NO must come with an brief explanations of all logical flaws found, without including suggestions for fixes; flag as wrong all proofs involving appeals to literature status.” (section 4.1, page 9) The next prover is instructed to understand the proof and make minimal repairs if possible, otherwise produce a new proof. The implementation used two sequential verifiers, with slightly different prompts (section 4.2, pages 9–10): “we were only able to allow for two verifiers working sequentially so as to increase the chances of finding faults in the single prover’s work.” The experiments fixed `N=15` and used `M=5` to abort after excessive API errors (section 5, page 11).

Verus form: Inference: use the feedback loop for candidate Rust/Verus proofs. Compiler diagnostics and failed proof obligations supply evidence for revision. Verus checks the supplied formal statement; a language-model YES does not replace that check.

Evidence: “Our system solved five out of six problems (it could not solve the sixth one)” (section 5.1, page 11). Table 2 (page 13) reports 9, 7, 3, 6, and 5 iterations for IMO problems 1–5, respectively, with problem 6 unsolved. Its human-correctness row marks problems 1–5 Y, while only problem 3 is marked Y in the certification row. The table's missing entries represent ongoing tests (section 5.1.2, page 12, footnote 7).

## technique 2: formalization, semantic conformance, and final checker
After verifier acceptance, the prover formalizes the proof in Lean. A human compares every premise and the conclusion of the formal proof with those of the accepted semi-formal proof and target theorem. “If this human test is successful, π is passed to the corresponding proof assistant for the final validity test.” (section 3.1, page 6) Both checks must pass.

The correctness argument assumes that “neither the human nor the proof assistant can ever be wrong in performing their verifications.” (section 3.2, page 6) The resulting guarantee covers the formal proof: “it does not prove that P is a valid proof of T, but only that π is.” (section 3.2, page 6) Thus the prose proof need not be sound even when the final formal proof is valid.

The implementation fell short of the intended minimal human review: “the human has to construct the whole lean code from a relatively thin base.” (section 4.4, page 10) The authors initially instructed Codex to turn proof steps found through web search into axioms. They explain: “This reduced the extent of lean checking (the formalization was partial) but made it possible to run a limited certification step at the end of our protocol” (section 4.4, pages 10–11). Footnote 6 (page 11) adds: “Some of them were found to be incorrect despite the limited formalization effort; and not all of them have been yet vetted.”

Verus form: Inference: review the Rust/Verus premises and conclusion against the intended requirement before accepting checker success. Record external assumptions explicitly. Using `external_body` to bypass the target proof would leave that proof unverified. Partial formalization with assumed steps cannot establish the complete intended result.

## technique 3: fresh agents and context control
“Every prover and verifier at each iteration is a new instance.” (section 4.3, page 10) The authors discard each instance after use to avoid filling the stated 400,000-token GPT-5 context window and to reduce bias toward earlier incorrect proofs. They also warn: “A practical issue of our protocol is the lack of reproducibility.” (section 3.2.2, page 7) They recommend saving valid proofs because probabilistic outputs may not produce them again.

Verus form: Inference: give a fresh prover the theorem, current code, and diagnostics; preserve successful artifacts. Resetting context may help exploration, but it does not establish independence between agents using the same model.

## technique 4: research-mode conjecture generation
Research mode adds four GPT-5 roles: literature reviewer, context preparer, predictor, and refiner. “We note that all of these agents are deployed once only, either as pre-processing or post-processing (refiner) with respect to the TTVR loop.” (section 4.1.1, page 9) The reviewer finds related literature, the context preparer supplies auxiliary material, the predictor proposes conjectures, and the refiner negates a target when the argument refutes it. The context preparer also supports the default mode on conjectures.

The reported research-mode workflow first generates seed results from a human goal, then gathers literature, filters statements whose solutions are already known, and runs TTVR on each remaining statement (section 5.3, page 17). The three goals concern gradient descent, the 1-2-3 conjecture, and sphere packing. The paper reports 5/14 gradient-descent statements settled (2 proved and 3 refuted; section 5.3.1, page 19), 9/11 graph conjectures refuted (section 5.3.2, page 24), and 5/13 sphere-packing conjectures proved (section 5.3.3, page 31). Their status is explicit: “None of the proofs in this section has yet been verified formally in lean, nor has it been verified by human experts in the subject matters of the three topics.” (section 5.3, page 17, footnote 12)

Verus form: Inference: treat generated conjectures as candidate specifications. Require statement review and complete formal checking before adding a result to a verified catalog.

## number-theory results and limits
The separate number-theory experiment used 66 supplied conjectures. Section 5.2 (pages 13–14) reports arguments for 20, comprising 17 proposed proofs and 3 refutations. Five of those 20 were already closed by Pomerance. The paper then states: “This leaves our system with 17 (previously open) conjectures for which it obtained a proof.” (page 14) Inference: this count is inconsistent with the preceding list; removing five from twenty leaves fifteen, including refutations. Do not use seventeen as a verified count of newly proved conjectures.

Table 3 (page 14) includes incorrect and unknown entries, and the paper warns that experts “have already invalidated some of the proofs we believed to be correct, and have yet to go through the complete list.” (footnote 10) Claims also have narrower scope than fully resolving a conjecture: “some of the confirmed conjectures have been “closed” only partially, i.e. in the asymptotic sense, not in the absolute one.” (section 5.2, page 14) Conjectures 6 and 32 have this limitation; the reported refutation of 59 addresses a finite exception without refuting its asymptotic part.

## transfer to verified Rust
Inference: reuse bounded revision, fresh contexts, saved artifacts, and human comparison of the formal statement with the intended requirement. Checker acceptance supports a formal theorem only under its assumptions and the checker’s correctness. The paper's incomplete formalization and unverified results do not establish that its orchestration produces correct proofs reliably. This study checks the report's description, not the mathematical validity of its generated arguments.

## techniques for the catalog
- test-time verify–revise: alternate proof proposals and verifier diagnostics up to a fixed iteration limit
- semantic conformance prerequisite check: compare formal premises and conclusion with the intended theorem before final checker acceptance
- context isolation: discard each prover/verifier instance and save successful artifacts
- research-mode agents: use literature, context, prediction, and refinement roles around proof search
