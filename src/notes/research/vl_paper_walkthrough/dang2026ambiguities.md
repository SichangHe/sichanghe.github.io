# Can LLMs help find Ambiguities in Protocol Specifications?
(authored by agents unless marked 🧑)
Tag: `dang2026ambiguities`, [paper](https://arxiv.org/abs/2609.38752)

## result and problem model

Dang et al. study semantic underspecification in 5G and DNS standards. A message can satisfy formal ASN.1 syntax while prose procedures fail to determine the receiver's behavior. The paper models a protocol as communicating finite state machines (CFSMs), classifies openings as Trigger, Effect, Ordering, or Eventuality, then distinguishes a gap (`|Δspec| = 0`) from a fork (`|Δspec| ≥ 2`) (Sections 3.1–3.3, pp. 3–4). Inference: this method analyzes specifications and generates tests; it does not prove implementation conformance to a complete specification.

The key design claim is that an LLM supplies prose reading while the state-machine scaffold supplies coverage and deterministic judgment. The paper says, “The scaffold supplies structure, process, and coverage; the LLM supplies the reading.” (Section 4.3, p. 5). The unit is a named procedure and its cross-reference closure, not an arbitrary document chunk (Section 5.1, p. 6).

## technique 1: CFSM lens and four-part taxonomy

purpose and trigger

Use the lens before asking a model to find ambiguity. A CFSM transition has a trigger and effect; runs also have temporal arrangement. The four exhaustive components are local Trigger, local Effect, cross-step Ordering, and cross-step Eventuality (Section 3.2, p. 4). A gap means silence requiring a new rule; a fork means the text permits incompatible readings requiring a narrowed rule or an explicit choice negotiated on the wire (Section 3.3, p. 4). Report a case only when it is reachable and its alternatives produce observable divergence (Section 3.3, p. 4).

application sequence

1. represent each protocol role with finite states, messages, and transitions (Section 3.1, p. 3)
2. choose a reachable state and syntactically valid message
3. identify whether the opening concerns trigger, effect, ordering, or eventuality
4. enumerate the transitions the normative prose allows
5. classify zero alternatives as a gap and two or more as a fork
6. discard unreachable cases and latent alternatives whose outcomes are observationally identical (Sections 3.1–3.3, pp. 3–4)

The F1AP example asks what happens when a UE Context Release Request names a connection the receiver does not hold; the syntax permits it, but the procedure gives no transition (Section 3.1, p. 3). The paper defines the target directly: “A complete protocol would fix exactly one such transition for every reachable state and every message that can arrive there.” (Section 3.1, p. 3).

Verus form

Inference: encode local states, messages, and transitions as Rust enums and finite sequences; define `spec fn` predicates for reachability, allowed transitions, gap, fork, and observational equality. A `proof fn` can show that a fixed transition table has one or more successors and that an invariant is preserved. The LLM's extraction and the normative interpretation remain input data. Verus can prove a Rust model's classification, but it cannot decide whether English prose was interpreted correctly without a trusted extraction and review process.

reported evidence and boundary

The authors claim that the four components are exhaustive for their model (Section 3.2, p. 4; Appendix A.3, p. 18). The authors note that richer timed or extended state machines can express data and deadlines but increase extraction difficulty (Section 10, p. 12).

## technique 2: procedure-closure construction

purpose and trigger

Apply Stage 1 when a procedure's meaning is scattered across sections, message tables, information-element tables, and local references. The closure gives each later prompt the context a human reader would assemble (Section 5.1, p. 6).

application sequence

1. start from the named procedure
2. locate matching section titles and text
3. render message and IE tables as Markdown
4. recursively inline referenced clauses
5. guard against reference cycles
6. retain a self-contained closure bundle and request more sections only once under a fixed character budget if context is insufficient (Section 5.1, p. 6)

Verus form

Inference: represent the closure as an immutable Rust map from clause identifiers to text and references. A `spec fn` can state that every included reference resolves within the closure and a `proof fn` could prove that traversal terminates on a finite graph by tracking visited clauses. The parser, Word-document extraction, and cross-reference correctness remain trusted. Verus should verify the closure data structure and downstream state-machine code, not pretend that text extraction is semantic proof.

reported evidence and boundary

The implementation uses `python-docx` and a section tree; the paper reports about 5,500 lines of Python (Section 6, p. 7). It leaves cross-procedure analysis open (Section 7, p. 8) and broader cross-document analysis as future work (Section 10, p. 12). Of the 530 agentic findings, 30 depend on a normative reference outside the source document (Section 10, p. 12; Table 3, p. 9). DNS adds cross-RFC references and checks findings against the RFC family (Appendix I, pp. 24–25).

## technique 3: taxonomy-based staged LLM mining

purpose and trigger

Use Stage 2 to turn an absence-finding task into bounded prompts. The local pass mines Trigger and Effect; the temporal pass mines Ordering and Eventuality only when concurrency, overlap, loops, retries, or pending obligations make those categories applicable (Section 5.2, p. 6). Every candidate must cite messages, IEs, sections, and a concrete reachability trace.

application sequence

1. feed the procedure closure to the local pass and ask about one transition's trigger or effect
2. apply the prerequisite check: mine Ordering only for concurrent or overlapping transactions over shared state, and Eventuality only for loops, retries, or pending obligations that may fail to progress
3. require each candidate to include cited text and a reachability argument
4. emit typed JSON for the next stage
5. repeat from a fresh start rather than few-shot seeding previous findings (Section 5.6, p. 7)
6. deduplicate with a keyword filter followed by embedding similarity in a persistent vector store
7. stop when two consecutive runs are at least 80% duplicates (Section 5.6, p. 7)

Verus form

Inference: make each typed candidate a Rust struct validated by `requires` and `ensures` on parsing functions; use `spec fn` predicates for category and citation completeness. A proof function can establish that the deterministic stages consume only well-formed candidates. The model remains a proposal generator. Verus must separately verify any extracted protocol monitor and cannot prove that an LLM citation supports a semantic claim.

reported evidence and boundary

On 36 procedures across six protocols, the pipeline produced 525 findings versus 551 from naïve prompting. It touched 336 distinct sections versus 287 and 127 distinct messages versus 103; repeated missing-rule findings were 155 versus 269 (Table 2, p. 9). These are pooled counts across three backends, not per-model averages. Cross-step findings were 58% versus 42% under the first blinded judge (Table 2, p. 9). Inference: this comparison supports the workflow’s broader search on the evaluated procedures; it does not establish complete coverage.

## technique 4: LLM gap/fork triage and deterministic impact ladder

purpose and trigger

Use Stage 3 and Stage 4 after mining. In Stage 3, the LLM reads the cited excerpts and labels silence as Gap or multiple incompatible readings as Fork; it records intent without deciding it and defaults to Gap when evidence is unclear. In Stage 4, the LLM proposes two to four permissible completions and extracts a partial CFSM. The deterministic engine sets aside findings with a missing reachability trace or slot, then compares completion pairs by decision, resulting state, and emitted output in that order (Sections 5.3–5.4, pp. 6–7).

application sequence

1. let the LLM assign Gap or Fork from the cited text
2. let the LLM enumerate completions and extract specified transitions, the exposing configuration, reachability trace, and open slot
3. parse and normalize the extracted JSON (Section 6.1, p. 8)
4. set aside findings with no grounded slot or reachability trace
5. compare every completion pair: decision first, then next state, then output; decisions are accept, reject, ignore, or no-progress
6. for differing states, use a bounded search over specified transitions for a later distinguishing message (Section 6.1, p. 8)
7. classify the first differing dimension as Conflicting Actions, Inconsistent Internal States, or Inconsistent Notifications; drop pairs that agree on all three as latent
8. prioritize a finding by its worst surviving class (Section 5.4, p. 7)

The paper stresses that “Deciding severity mechanically keeps the LLM from grading its own findings, and the distinguishing message the state check finds becomes the discriminator the generated test probes with.” (Section 5.4, p. 7). Stage 5 converts the verdict into a test: setup is the reachability trace, the trigger is the exposing message, and the engine supplies the discriminator; the LLM fills protocol-specific values but cannot change the branch expectations (Section 5.5, p. 7).

Verus form

Inference: encode each completion as a transition record and prove deterministic comparison lemmas with `proof fn`s. Use `spec fn` for outcome equality and an executable test planner whose `ensures` returns the engine's discriminator. This is a natural Verus target because the classification is finite and deterministic. The source text, model-produced alternatives, and real implementation behavior are outside the proof unless modeled.

reported evidence and boundary

Proposal validity uses 197 gpt-5.4-mini proposals: static code review confirmed divergent handling for 40, and two experts examined the remaining 157. Of those 157, both accepted 145 (92.4%), and at least one accepted 155 (98.7%). Combining expert and code review supports 185 of 197 conservatively and 195 with code or at least one expert (Section 7.3, p. 10). These populations differ from the 525 pooled findings used for the effectiveness comparison. Differential tests found 60 divergences across the six protocols: 32 conflicting actions, 16 inconsistent states, and 12 inconsistent notifications (Section 7.4, p. 10). Of those 60, 37 ran exactly as designed and 19 retained the generated trigger with an adapted harness (Section 7.4, p. 10). The paper reports no recall because there is no ground-truth set of all valid-but-unhandled cases (Section 7, p. 8).

## technique 5: differential implementation testing

purpose and trigger

Compile every finding exercised by both independent implementations against pinned OpenAirInterface and srsRAN sources. Stub surrounding SCTP, MAC, RRC, and DU-manager dependencies; fork process-abort cases; and advance a manual clock for liveness tests (Section 6.3, p. 8). Use the test only after the symbolic engine supplies a branch discriminator.

application sequence

1. instantiate the engine-generated setup and trigger
2. compile against fixed implementation commits
3. isolate control-plane logic with stubs
4. run both implementations deterministically
5. compare acceptance, state, output, and progress
6. preserve the test and observed divergence as evidence for standards review

Verus form

Inference: represent each implementation as a separately specified transition function and prove that a test harness compares their outputs without altering inputs. Verus can prove harness bookkeeping and a reference model's properties. It cannot prove C/C++ implementation behavior from this paper's tests; those binaries, stubs, compiler, and pinned commits remain trusted.

The paper's concrete examples include one stale PDU Session ID causing OpenAirInterface to free one session while srsRAN tears down the device connection, and an identifier pairing that leaves conflicting contexts in one implementation but returns an error in the other (Section 7.4, pp. 10–11). Inference: these divergences establish different implementation behavior, but do not establish which repair a standard should adopt.

## techniques for the catalog

- CFSM underspecification taxonomy: classify reachable openings as Trigger, Effect, Ordering, or Eventuality, then separate gaps from forks
- procedure closure construction: recursively gather sections, tables, and referenced clauses into a self-contained context bundle
- staged taxonomy mining: ask bounded typed questions in local and temporal passes, then iterate and deduplicate
- deterministic impact analysis: compare model completions by decision, state, and output and derive a discriminator
- differential implementation testing: run generated deterministic tests against independent implementations to expose observable divergence
