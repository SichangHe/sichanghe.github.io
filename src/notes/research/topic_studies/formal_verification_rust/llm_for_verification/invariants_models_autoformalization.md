LLMs for invariants, models, and requirements-to-spec
(authored by agents unless marked 🧑)

short version

- LLMs are decent at proposing invariants when a checker rejects bad guesses, and bad at being trusted without one
  - Quokka's failure study: most failed invariants were useless or too slow, not wrong
  - Guiding Likely Invariant Synthesis: GPT-o3 alone lost to a symbolic tool, but LLM-as-predicate-suggester caught up
  - inference: the LLM is best used inside a search loop that already has a sound checker
- the model checker certifies the model, not that the model matches the system
  - TLA+-Bench: the same outputs score 10.0% or 1.7% correct depending on grading choices
  - Specula found 249 bugs with LLM-written TLA+ models, but every bug was confirmed in the real code, which is the only filter that matters
  - inference: the missing piece is a test that a model is neither too loose nor too tight against the real code
- requirements to formal spec works when the input is narrow and the output language is small
  - Req2LTL and AeroReq2LTL: about 85 to 88% on real aerospace requirements, using an intermediate form and a data dictionary
  - RFC2TLA+: 14 RFCs, TLC catches injected deadlocks in 33 of 42 runs
  - inference: all numbers depend on hand-built ground truth, and none of these compare against a human-written spec of the same RFC for ambiguity
- Alloy, Quint, P, and Ivy have far less LLM evaluation than TLA+
  - Alloy has two small studies and one validation study; Quint and P have tools and blog claims, no peer-reviewed measurements that I found
- nobody I found has run LLMs on the Kondo and Basilisk Dafny protocol corpora, or measured how much of a protocol proof is invariant discovery versus the rest
  - inference, from searching, not proof of absence

best research ideas (details at the end)

- model sensitivity benchmark: inject real bugs into a system, then check whether an LLM-written TLA+ model plus trace validation notices
- LLM invariants on Basilisk and Kondo corpora (Dafny), with a count of human hints
- RFC ambiguity audit: compare LLM-extracted models against several independent implementations, and treat disagreement as the signal

what the topic is, in plain words

- a proof checker needs three inputs before it can say yes
  - the front part: a statement of what the system should do (a spec) and a simplified model of the system
  - the middle part: invariants, meaning facts that hold throughout a run, and that make the proof go through
  - the back part: the proof itself, covered in [proof synthesis](proof_synthesis.md)
- this file covers the front and the middle
  - invariants for loops in programs, and for distributed protocols
  - models written for checkers: TLA+, P, Alloy, Quint, Ivy
  - turning English (requirements, RFCs, docs) into formal specs
- scope boundary
  - contracts for Verus and Dafny functions are in [specifications](specifications.md)
  - code generation and repository agents are in [code and agents](code_and_agents.md)
  - benchmark hygiene is in [evaluation](evaluation.md)
  - a separate agent owns TLA+-to-verified-Rust experiments; I only review literature here
- how to read the labels
  - fact: stated by the source, I read it
  - claim: the authors say so
  - inference: mine
  - peer reviewed or preprint is stated for each
  - experiments were not rerun

what existing work shows

a. loop invariants for programs

- Lemur, Wu, Barrett, Narodytska, ICLR 2024, peer reviewed
  - [paper](https://arxiv.org/abs/2310.04870)
  - fact: the LLM proposes invariants as sub-goals, a conventional verifier checks them, and the paper gives transition rules and a soundness proof
  - quote: "We formally describe this methodology as a set of transition rules and prove its soundness"
  - main number (Table 1): on 133 Code2Inv programs, 107 solved with GPT-4, versus 92 for Code2Inv and 68 for ESBMC; on 47 SV-COMP programs, 25 versus 1 for UAutomizer and 1 for ESBMC
  - limit: GPT-3 and GPT-4 era, 30 second default limit; Quokka below reruns this style with newer models
- Finding Inductive Loop Invariants using LLMs, Kamath et al., arXiv 2311.07948, 2023 preprint (opened abstract only)
  - claim: a hybrid of LLM and symbolic checker improves over purely symbolic baselines
  - this is the Loopy tool that Quokka compares against
- Ranking LLM-Generated Loop Invariants, Chakraborty et al., EMNLP Findings 2023 (opened abstract only)
  - claim: LLMs "require several samples to generate the correct invariants"; a contrastive ranker cuts verifier calls
  - inference: cost is verifier calls, not just tokens, and nobody uses this in current agent setups
- Quokka, Wei et al., COLM 2026, peer reviewed ([arXiv 2509.21629](https://arxiv.org/abs/2509.21629))
  - fact: the LLM's invariant is accepted only if it helps prove the target assertion, no repair of the text
  - quote: "directly validates whether each LLM-generated invariant helps prove the target assertion"
  - main number: 866 evaluation instances from SV-COMP, 9 LLMs; verified invariants range from 342 (Llama-3.1-8B) to 710 (gpt-5.2)
  - failure study of 50 random timeouts: 7 wrong invariants (14%), 19 identical to the assertion (38%), 9 trivial bounds (18%), 5 strong but still slow (10%)
  - quote: "the majority are due to timeouts"
  - claim: beats Lemur, Clause2Inv, Loopy, LaM4Inv; supervised fine-tuning gave only "modest" gain, Best-of-N helped
  - limit: C programs from a verification competition, not systems code
- LORIS, Li et al., TOPLAS 2026, peer reviewed ([arXiv 2605.17914](https://arxiv.org/abs/2605.17914))
  - fact: when an invariant fails, the LLM writes a natural-language proof of why it should work, a second pass turns each step into logic, and the invalid step becomes the feedback
  - reported count: "solved 445 of the programs" out of 460, plus a 50-program non-linear set
    - these counts imply 96.7%; the earlier draft's 93.1% was inconsistent and is removed
    - the source denominator still needs confirmation before using this result in a comparison
  - inference: feedback pinpointing which step of the argument fails is what separates this from retry loops
- InvWeaver, Wu et al., arXiv 2607.05478, 2026 preprint (opened abstract and intro)
  - claim: earlier LLM methods "struggle with multi-loop programs"; it passes proof obligations between loops
- Laurel, Mugnier et al., OOPSLA 2025, peer reviewed
  - fact: Dafny assertions (hints the solver needs), placed using the verifier's error message
  - quote: "generate over 56.6% of the required assertions given only a few attempts" (82 of 145 in the DafnyGym set)
  - inference: assertions are the same kind of object as loop invariants; this is the Dafny-side evidence
- already covered, one line each: [AutoVerus and LemmaNet](../../../autoverus_citations_20260801.md), [Verus proof agents in code and agents](code_and_agents.md)
- what is not shown
  - nobody I opened separates invariants for loops that call library code from the pure-arithmetic loops in SV-COMP
  - Quokka reports speed-up and counts, not whether the proved assertion was the one a human cared about

b. inductive invariants for distributed protocols

- the non-LLM baseline matters first: DistAI (OSDI 2021), DuoAI (OSDI 2022), SWISS (NSDI 2021), IC3PO, Endive, Kondo, Basilisk
  - all already summarised, with exact numbers, in the local protocol invariant review (not yet published)
  - one fact to keep: DuoAI solves "all but 1 of the 27 protocols" with a week of time per tool and protocol per that note
  - inference: any LLM paper should beat DuoAI or SWISS on those 27 Ivy models under the same budget before claiming anything
- Guiding Likely Invariant Synthesis on Distributed Systems with LLMs, Xia et al., FMCAD 2025, peer reviewed
  - fact: 8 distributed systems modeled in Promela, checked with Spin; invariants are "likely" ones from traces
  - quote: GPT-o3 "when it is used to generate invariants directly, is less effective than the symbolic invariant synthesis method RunVS"
  - claim: PSyn (the LLM suggests atomic predicates from counterexamples) "has comparable performance with RunVS"
  - limit: trace-based likely invariants; true inductive proofs only if a model checker is added
- IC3Syn, Cao et al., arXiv 2605.24619, 2026 preprint
  - already read in the distributed note; fact: an LLM supplies clauses that exclude counterexamples to induction inside an IC3 loop
  - claim: all 29 protocols, with Claude Opus 4.6; invariants are "only on finite instances", the unbounded proof still goes through TLAPS
  - my reading: the closest work to idea 2 below, but in TLA+, not Dafny or Ivy
- CIll, Su et al., arXiv 2602.23389, 2026 preprint
  - fact: hardware model checking; LLM proposes invariants from counterexamples to induction
    - bounded model checking screens candidates; IC3 and k-induction supply proof obligations beyond the bound
  - claim: proves full compliance with RISCV-Formal for NERV and PicoRV32, including cases the baseline checkers could not solve in 5 hours (76 of 222 instances)
  - inference: not distributed protocols, but the cleanest recipe I found for "LLM inside a counterexample loop"
- Ilya Sergey, "Verifying Distributed Protocols in Veil", Feb 2026 blog, author account, not a paper
  - covered in the same distributed note: Claude Code found FloodSet invariants, but also wrote a model "missing crucial parts, making them vacuously correct but also useless"
  - inference: this is the failure the whole topic is about, and it came from the model side, not the invariant side
- Can LLMs Perform Synthesis?, Egolf, Zhou, Tripakis, arXiv 2603.20264, 2026 preprint (opened abstract)
  - fact: tests LTL reactive synthesis, SyGuS, distributed protocol synthesis, and recursive function synthesis
  - quote: "In all domains, the symbolic tools solve more benchmarks than Qwen and either outperform or are about on par with GPT-5"
  - inference: a warning to compare against the specialised tool every time
- what is not shown
  - no LLM result on the Dafny corpora (Kondo, Basilisk); I searched for it and found none
  - no study counts LLM-supplied "hints" the way Kondo and Basilisk count human ones

c. models for checkers, written from code

- SysMoBench, Cheng et al., ICLR 2026, peer reviewed ([arXiv 2509.23130](https://arxiv.org/abs/2509.23130))
  - fact: asks an LLM or agent to write a TLA+ model of real code (etcd and Redis Raft, ZooKeeper election, Asterinas spinlock, mutex, ringbuffer); scored on syntax, TLC running, conformance to code traces, and invariants
  - quote: models are "notoriously expensive to write and maintain"
  - fact (cited from the paper by the distributed note (local note; not yet published)): invariant templates are given by the benchmark; an LLM adapts them
  - external review, A. Jesse Jiryu Davis, 1 Apr 2026 blog: "for distributed systems like etcd Raft (thousands of lines of Go), performance craters" and "The humans have already done most of the intellectual work before the AI even starts"
  - same review says liveness is much harder than safety: 42% versus about 8% (a blogger's reading of the paper, I did not re-derive it)
  - limit: eleven artifacts, and sampled traces do not show the model is not too loose
- Specula, Cheng et al., arXiv 2607.25333, 2026 preprint (already noted (local note; not yet published))
  - fact: Claude Code with Opus-4.8 writes TLA+ models, invariants, and trace-validation instrumentation for 48 open source systems
  - claim: "Specula found 249 bugs"; 89 reported, 68 confirmed, 24 fixed; "reports no false positive as all the bugs are reproduced at the code level"
  - claim: "reward hacking" and hallucination are real, so loops are "self-evolving" with trace validation as the judge
  - inference: "no false positive" holds because each bug is replayed in the code; it says nothing about missed bugs, and says nothing about how loose the models are
- TLA+-Bench, Bisharat et al., arXiv 2607.23425, 2026 preprint
  - fact: 403 gold specs graded by running TLC over the full state space, from English descriptions
  - quote: "the correct rate moves sixfold, from 10.0% to 1.7%" when only unstated grading choices change
  - quote: the strongest model is "correct 16% of the time by default and 26% when given the interface names"
  - inference: any TLA+-generation percentage is meaningless without the grading recipe, so cite the recipe
- Can LLMs Write Correct TLA+ Specifications?, Bisharat et al., arXiv 2606.05792, 2026 preprint
  - quote: "LLMs achieve up to 26.6% syntactic correctness but only 8.6% semantic correctness"
  - limit: 205 specs, 30 models, mostly open-weight and few-shot; older than the Specula and TLA+-Bench results
- TLA-Prover, Spencer et al., arXiv 2606.06133, 2026 preprint
  - fact: 20B model trained with TLC as the reward; "Diamond" tier changes the property slightly and requires TLC to fail, to catch always-true properties
  - quote: "TLA-Prover reaches 9/30 (i.e. pass@1= 30%) at both Gold and Diamond"
  - limit: 30 held-out problems; small, from the same group as the benchmark
- TraceFix, Xia et al., CAIS 2026, peer reviewed ([arXiv 2605.07935](https://arxiv.org/abs/2605.07935))
  - fact: the model being checked is the agent's own coordination protocol, not an existing system
  - claim: "all tasks reach full TLC verification; 62.5% pass on the first attempt" over 48 tasks; deadlock and livelock drop from 31.1% to 14.1% in runs
  - inference: a different use of the same loop, with no code to disagree with, so "correct" means only "passes the checker I wrote"
- Alloy: On the Effectiveness of LLMs in Writing Alloy Formulas, Hong et al., arXiv 2502.15441, 2025 preprint
  - fact: 11 well-known Alloy specs, ChatGPT and DeepSeek; write from English, write an equivalent variant, complete a sketch
  - claim: "generally perform well" and can enumerate several different correct answers
  - limit: textbook models, checked by equivalence with the known answer; no systems code
- Alloy: Validating Formal Specifications with LLM-generated Test Cases, Cunha and Macedo, arXiv 2510.23350, 2026 preprint
  - fact: GPT-5 writes positive and negative examples from English requirements, which are run against student-written Alloy specs
  - claim: "can detect many wrong specifications written by humans"
  - inference: this is the Spec-Harness idea from [specifications](specifications.md) applied to Alloy; neither was applied to a distributed protocol
- Alloy: LLM2Alloy, Rashid and Malik, arXiv 2607.18555, 2026 preprint
  - fact: Alloy specs from docs and from code for two Python libraries, then tests from the specs
  - claim: found that Flipper "silently accepts duplicate flag names, directly contradicting its documented uniqueness requirement"; a direct LLM test generator missed it in three runs
  - limit: two libraries, 5 pages; exploratory
  - inference: the useful idea is writing two specs, one from docs and one from code, and treating disagreement as the signal
- Quint
  - Gabriela Moreira, [Quint blog post "llm_era"](https://quint.sh/posts/llm_era), 17 Nov 2025, author account
  - claim: executable specs are "the sweet spot between English and code"; a Malachite consensus change took about a week instead of months, and English spec review found "two small bugs in Manu's English spec in one afternoon"
  - not peer reviewed; no measurement of generated Quint correctness
- P
  - the p-org/P README lists PeasyAI, which generates P "directly from design documents" with 27 tools, 1,200+ RAG examples, and an auto-fix loop
  - not peer reviewed; no evaluation numbers in the README
- Ivy
  - Ivy and mypyvy are infrastructure for DuoAI and SWISS inputs; I found no LLM-for-Ivy study
- also covered elsewhere in this repo: Agora, DDBench, Multi-Grained specifications, TLA-Verus and TLAPS proof work in the local TLA-Prover review (not yet published) and the local TLA-Verus review (not yet published)

d. requirements, RFCs and documents into specs

- the older temporal-logic line
  - nl2spec, Cosler et al., CAV 2023, peer reviewed
    - fact: LLM maps sub-formulas back to the English fragment so a user can fix one piece
    - quote: "we utilize LLMs to map subformulas of the formalization back to the corresponding natural language fragments of the input"
  - Req2LTL, Ma et al., arXiv 2512.17334, 2025 (collection lists ASE 2025)
    - claim: "88.4% semantic accuracy and 100% syntactic correctness on real-world aerospace requirements" using a layered intermediate form plus rule-based synthesis
  - AeroReq2LTL, Ma et al., arXiv 2604.21715, 2026 (collection lists FM 2026)
    - claim: "85% precision and 88% recall" on a real aerospace set, via a data dictionary for terms and a template requirement language
    - inference: the industrial lesson is that a controlled input language did the heavy lifting
  - ClarifySTL, arXiv 2605.01209, 2026 preprint
    - fact: asks the user questions when a requirement is vague or ambiguous before translating to signal temporal logic
    - claim: "clarifies 93.8% of defective requirements"
  - inference: they target temporal logic over atomic propositions; distributed-system properties need quantifiers over nodes, which these tools do not handle
- requirements to contracts for programs
  - nl2postcond, Endres et al., FSE 2024, peer reviewed
    - claim: postconditions "were able to catch 64 real-world historical bugs from Defects4J"
  - Lahiri, Evaluating LLM-driven User-Intent Formalization for Verification-Aware Languages, FMCAD 2024
    - fact: argues tests-as-ground-truth does not extend to Dafny/F* specs with quantifiers and ghost state; proposes a symbolic check instead
  - Expecto, Lee and Heo, PLDI 2026, peer reviewed
    - fact: top-down, modular synthesis in a small DSL, with tree search
    - claim: finds more Defects4J bugs than baselines
  - VeriSpecGen, Ye et al., arXiv 2604.10392, 2026 preprint
    - fact: splits English into atomic requirements, writes a test for each, and blames the failing requirement when a test fails
    - claim: 86.6% on Verina's spec-generation task with Claude Opus 4.5, up from 59.0 baseline (Table 2)
  - FM-Agent, Ding, Wang, Chen, arXiv 2604.11556, 2026 preprint
    - fact: derives each function's spec from how its callers use it, so a buggy callee's spec still reflects intent
    - [links to](specifications.md) the implementation-versus-intent point
  - From Informal to Formal, Cao et al., ACL 2025, peer reviewed
    - fact: 18k instruction pairs over Coq, Lean4, Dafny, ACSL, TLA+
    - claim: fine-tuning gives "nearly threefold improvement at most"
  - Seeking Specifications, Granberry et al., arXiv 2504.21061, 2025 preprint
    - fact: ACSL from C with DeepSeek-R1; tests how bugs in the code change the generated spec
    - inference: the earlier study of the effect that [candidate 2](research_directions.md) wants to measure at scale
  - Doc2Spec, Xia et al., arXiv 2602.04892, 2026 preprint
    - fact: LLM agents first induce a grammar from English API rules, then generate specs using it
    - claim: seven benchmarks, three languages; average recall 0.74 in one reported table
  - FormalBench, Le-Cong et al., ACL 2025, peer reviewed: JML spec inference as a probe of program understanding
- RFCs and protocols
  - RFC2TLA+, Ding et al., ASE 2026, peer reviewed ([PDF](https://security.csl.toronto.edu/wp-content/uploads/2026/08/gding-ase2026-rfc2tla.pdf))
    - fact: three passes (states, transitions, invariants) with tool calls and TLC; compared on PSMBench (14 RFCs) against RFC2PSM
    - claim: generates models in 36 of 42 runs; TLC catches injected deadlocks in 33 of 42 and invariant violations in 36 of 42; on three synthetic RFCs, 16 of 18 injected bugs
    - claim: synthetic RFCs were added "to minimize the effects of LLM memorization"
    - limit: bug injection is into the extracted model, so it measures coverage of the invariants the tool wrote, not agreement with what the RFC authors meant
  - RFCLLM, Chen, Goldwasser, Nita-Rotaru, arXiv 2609.13389, 2026 preprint
    - fact: 4 tasks, 1,482 queries, 16 protocols; asks whether an LLM correctly reasons about a finite state machine described in text
    - quote: "document understanding is the primary bottleneck"; models do better with a structured FSM than with raw RFC prose
    - inference: reading prose is the weak step, which is exactly what RFC2TLA+ must do first
  - FlowFSM, Wael et al., arXiv 2507.11222, 2025 preprint
    - fact: prompt chaining over FTP and RTSP only
    - claim: "high extraction precision while minimizing hallucinated transitions"
    - limit: two protocols, 6 pages
  - not opened, only seen in search results: SpecGPT for 3GPP documents (arXiv 2510.14348), RFCAudit and RFCNLP, which RFCLLM cites, and LL-Verifier (arXiv 2609.10537, Maude models of application logic)
- survey: Beg, O'Donoghue, Monahan, [Leveraging LLMs for Formal Software Requirements](https://arxiv.org/abs/2507.14330), 2025 preprint (found in search, abstract not opened)

what is missing

- a model-side "too loose or too tight" test
  - evidence: Specula says trace validation alone permits loose models and uses model checking against properties to expose extra behaviour; TLA-Prover's Diamond check only catches always-true properties; Sergey's FloodSet model was vacuously correct
  - I did not find a benchmark combining injected implementation bugs, trace conformance, and safety-property violations within the searches listed below
- invariants on proof-oriented corpora
  - evidence: IC3Syn and Guiding Likely are both in model checking languages (TLA+, Promela); my searches for LLM + Ivy, Dafny, Veil, Kondo or Basilisk found only Sergey's blog
- human-input accounting
  - evidence: Kondo and Basilisk report hand-written clause counts; LLM papers report success rates
- an English-to-spec task where the answer is not fixed by a hand FSM
  - evidence: RFC2TLA+ and RFCLLM score against curated ground truth; RFCLLM notes ambiguity in RFC 9260 (SCTP), but nobody scores models against several implementations
- Alloy, Quint, P at systems scale
  - evidence: Alloy studies use textbook models or two Python libraries; Quint and P have only author accounts
- liveness
  - evidence: Davis reports liveness failures dominate in SysMoBench (42% versus about 8% for safety); Kondo and Basilisk exclude liveness; I found no LLM liveness-invariant paper

research we can do

1. model sensitivity benchmark ("does the model notice a real bug?")
  - question: when an LLM writes a TLA+ model of a system and trace validation accepts it, how often does the model also accept a version of the system with a real bug?
  - builds on
    - [SysMoBench](https://arxiv.org/abs/2509.23130) for systems and trace conformance
    - [Specula](https://arxiv.org/abs/2607.25333) for the agent
    - [TLA-Prover's Diamond tier](https://arxiv.org/abs/2606.06133) for the mutation idea, applied to properties
    - [Spec-Harness](specifications.md) for mutation of outputs
  - proposed extension: mutate code and evaluate both trace conformance and safety-property violations
  - why it matters: a faithful behavioral model can admit a buggy trace while exposing its violated safety property
  - first experiment: take 3 SysMoBench systems with known historical bugs; build the buggy and fixed versions; have the same agent write models from the fixed code; replay traces from both
  - convincing result: on traces that exhibit the known bug, measure conformance separately from violation of independently stated safety requirements
    - accepting a buggy trace is useful when the model also identifies the violated requirement
  - cost: a few weeks, API cost in the hundreds of dollars; the hard part is buggy builds that can be traced
  - closest scoop: Specula or SysMoBench authors adding a mutation track; Specula already has trace validation and code-level bug reproduction
2. LLM-proposed invariants on Basilisk and Kondo corpora
  - question: with a Dafny checker, how many of the invariant clauses that humans wrote for Paxos, Two-Phase Commit, and Raft leader election can an agent find, and how many hints does it need?
  - builds on [Basilisk](https://www.usenix.org/conference/osdi25/presentation/zhang-tony), [Kondo](https://www.usenix.org/conference/osdi24/presentation/zhang-tony), [IC3Syn](https://arxiv.org/abs/2605.24619), [CIll](https://arxiv.org/abs/2602.23389)
  - what is new: Dafny, not TLA+; and report hints, tokens, and checker calls per case
  - why it matters: Dafny and Verus are the checkers the human works with
  - first experiment: 16 Basilisk cases; give the model only the protocol and the safety goal; use the checker's failing counterexample as feedback; compare to Basilisk's own automatic result and DuoAI where a case overlaps
  - convincing result: matching Basilisk on more than half the cases with zero human clauses, plus a clear failure taxonomy
  - cost: a month; corpora and checkers are public
  - closest scoop: IC3Syn authors extending to Dafny, or Sergey's Veil work
3. RFC ambiguity audit
  - question: where an LLM-extracted model disagrees with an implementation, is the model wrong or the RFC unclear?
  - builds on [RFC2TLA+](https://security.csl.toronto.edu/wp-content/uploads/2026/08/gding-ase2026-rfc2tla.pdf), [RFCLLM](https://arxiv.org/abs/2609.13389), nl2spec's idea of mapping each part back to text
  - what is new: three or more independent implementations as the oracle rather than a hand-drawn FSM
  - why it matters: the RFC is itself the spec under test; models that fail only where implementations also disagree are evidence of ambiguity
  - first experiment: pick 3 protocols with known implementation differences (SCTP INIT in Cookie-Echoed state is the example RFCLLM cites); extract models; replay recorded traces from each implementation
  - convincing result: a list of disagreements that human reading confirms as real RFC gaps
  - cost: weeks; needs implementations that can be run and traced
  - closest scoop: RFC2TLA+ authors, or RFCAudit (not opened)
- smaller options
  - an execution-graded NL-to-Alloy benchmark in the style of TLA+-Bench, since none exists that I found
  - a two-source spec (docs and code) disagreement detector, from LLM2Alloy, on Rust crates

what I searched

- sources opened: 38 papers or posts, about 26 in full text from the collection, the rest abstract or intro only
  - full text: Lemur, Quokka, LORIS, CIll, Guiding Likely Invariants, Laurel, SysMoBench, Specula, TLA+-Bench, Can LLMs Write TLA+, TLA-Prover, TraceFix, nl2spec, Req2LTL, AeroReq2LTL, ClarifySTL, nl2postcond, Lahiri FMCAD, Expecto, VeriSpecGen, FM-Agent, From Informal to Formal, Seeking Specifications, FormalBench, RFC2TLA+, RFCLLM and others
  - abstract only: Loopy, Ranking, InvWeaver, Can LLMs Perform Synthesis, Doc2Spec numbers, Alloy papers (full text read for the numbers I cite), Quint post, P README, Davis blog
- searches (web, 7 Oct 2026)
  - "LLM generate Alloy specifications from natural language evaluation 2025 2026"
  - "LLM RFC protocol specification formal model extraction state machine verification 2025 2026"
  - "LLM Quint OR P language specification generation distributed protocol model checking 2026"
  - "LLM inductive invariant Ivy OR Dafny distributed protocol proof generation 2026"
  - "LLM loop invariant generation 2026 benchmark Clause2Inv LaM4Inv Loopy"
  - "LLM autoformalization software requirements survey 2026"
  - "LLM TLA+ specification from code agent model checking 2026"
  - "LLM P language / PeasyAI"; "LLM formalize API documentation into formal specification 2026"
- papers added to /hdd1/sichanghe/paper_collection: RFC2TLA+, RFCLLM, FlowFSM, Alloy formulas, LLM2Alloy, Validating Formal Specifications with LLM-generated Test Cases, Doc2Spec; author lists in file names are abbreviated, check before citing formally
- not covered
  - Pei et al., ICML 2023 (LLM invariant prediction), Clause2Inv, LaM4Inv, AutoSpec, SpecGen full text: only seen as citations or search results
  - hardware assertion generation (AssertLLM and the SVA line)
  - requirement languages such as EARS or controlled English outside aerospace
  - the LLM-for-smart-contract invariant literature
  - PSMBench and SpecGPT full text
  - ChatGPT consultation: unavailable, so none was done
