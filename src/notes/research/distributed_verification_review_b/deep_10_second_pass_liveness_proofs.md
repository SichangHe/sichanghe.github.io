# Second pass: liveness, proofs, and executable specifications
(authored by agents unless marked 🧑)

This review extends `01`–`09` only with the requested papers and relevant citations missing from those files. Each card distinguishes what the human supplied, what the checker established, and what was automatic. Safety means a bad outcome never occurs; liveness means a promised outcome eventually occurs. A proof about a model reaches running code only when an implementation correspondence is also established. An exhaustive finite check remains limited to its configured bounds.

Read the concrete input and guarantee in each card before using a result as an agent benchmark. **Inference from this review:** proof checking is much more automated than choosing the property, assumptions, model, or proof decomposition. The strongest agent evaluation would score those choices separately from whether the chosen checker accepts an artifact. Numerical evidence and its exact source appear beside each paper; absence of reported human hours is stated rather than estimated from lines of code.

## Coverage and reading guide

The requested list has 22 titles. Choreo's exact paper title remains unlocated; its existing Quint repository is already in the first pass. Three confirmed requested publications currently have inaccessible full text: *Liveness to Safety*, *On the Power of Temporal Prophecy*, and *A Practical TLA+ Library*. The Rust cryptographic-protocol paper has an advertised open PDF that returns HTTP 403. These are retrieval gaps; the cards do not pretend that abstracts establish the requested full-text details. The Temporal Prophecy proof artifact and the practical library's open precursor give narrower evidence.

The sections below group the evidence by task. Related additions are marked. All downloaded PDFs were checked for a `%PDF` header; existing collection copies were reused. Page references are printed paper pages unless labelled PDF pages. Tools and source repositories were inspected where noted; this review did not rerun their verification experiments.

## Temporal proofs, rankings, and rlive


### Liveness to Safety for Distributed Systems (2026): found; full text unavailable

Lenore D. Zuck. *On the Pursuit of Insight and Elegance: Essays Dedicated to Andreas Podelski*, Springer LNCS, 2026, pp. 23–39. [Publisher](https://doi.org/10.1007/978-3-032-13711-1_2), [author publication list](https://www.cs.uic.edu/~lenore/publications.html). The abstract describes replacing a progress proof with a monitor of a sequence of weakly fair states. Its concrete examples are spanning tree construction, leader selection in each tree of a forest, and maximal independent set. Evidence: “The method is extended to protocols with probabilistic elements” (publisher abstract). Springer returned a subscription preview instead of a PDF; Semantic Scholar reports `"status": "CLOSED"`. No open full text found through the author page, Crossref, Semantic Scholar, OpenAlex, or exact-title search. Human inputs, proof checking, sizes, times, and related-work details cannot be established from full text; do not treat this as a completed paper review.

### On the Power of Temporal Prophecy (2026): paper inaccessible; proof artifact recovered

Jochen Hoenicke, Oded Padon, Sharon Shoham. Same Springer festschrift, 2026, pp. 40–53. [Publisher](https://doi.org/10.1007/978-3-032-13711-1_3), [Ivy proof at the publisher's pinned revision](https://github.com/odedp/ivy/blob/b006fee/examples/liveness/ackermann_termination_proof.ivy). Author/artifact metadata says 2024; published chapter metadata says 2026. The publisher abstract states it can “prove termination of the Ackermann function, which is not primitive recursive”. No open chapter PDF found; full paper not read.

The complete open Ivy file was read. The human wrote a first-order model, the termination conjecture, prophecy terms, and invariants; Ivy checks the supplied proof of eventual completion, about that model. The artifact specifically says: “This Ivy file is slightly different from Fig. 1 in the paper because of the way Ivy adds an idle action, which requires adding a fairness assumption that the protocol steps are taken infinitely often.” It also says “this file is not in EPR and contains cyclic quantifier alternations” and gives `ivy_check complete=fo ackermann_termination_proof.ivy` (file introduction). No paper runtime or human-effort figures available. The artifact was inspected, not rerun. **Inference:** proof state and idle-step semantics must be kept separate from an executable program's termination claim.

### Verifying First-Order Temporal Properties of Infinite-State Systems via Timers and Rankings

Raz Lotan, Neta Elad, Oded Padon, Sharon Shoham. TACAS 2026, LNCS 16506, pp. 353–372. [Paper](https://doi.org/10.1007/978-3-032-22749-2_18), [open author PDF](https://www.wisdom.weizmann.ac.il/~padon/timers-tacas2026.pdf), [code](https://github.com/neta-elad/implicit-rankings-timers), [artifact](https://doi.org/10.5281/zenodo.18157346). Full conference paper read; existing arXiv v1 extended PDF reused, including its appendices. Publisher page numbers below refer to the conference edition consulted; Table 2 is also on arXiv p.16.

The tool turns a temporal claim into a termination problem by adding timers predicting when formulas become true. A human supplies the model and claim **and the proof ingredients**: “an implicit ranking given by a composition of constructors, an inductive invariant, and ... also inductively-finite approximations” (§6, p.367). It “computes the timer reduction ... generates the verification conditions ... and discharges them using the Z3 solver” (same page). Thus automatic checking is not automatic discovery of rankings or specifications. The guarantees concern first-order transition-system models, including liveness and termination, not deployed protocol code. Original scheduling/delivery assumptions remain in the temporal claim; timers remove the need for a separate fairness condition on the transformed termination problem (§4).

Table 2 (p.368) defines “Time ... in seconds”, “Inv. ... number of conjuncts”, and “|Proof| ... number of tokens in the entire proof”. Its complete 17-task results are below. Sizes count proof tokens, not implementation LOC or time a person spent. Runtime is Z3 validation on Apple M1 Pro with Z3 4.13.3 (§6). **Inference:** these tasks evaluate generation of rankings/invariants and explicit fairness assumptions; they do not yet evaluate vague request → specification.

| Model / guarantee | Seconds; ranking constructors; finite-set approximations; invariant conjuncts; proof tokens |
|---|---|
| Ticket: every waiting thread enters its critical section under fair scheduling (§2) | `2; 6; 2; 20; 256` |
| Paxos: eventually a quorum votes for one value at the selected round (repository `paxos.py`) | `101; 11; 1; 20; 238` |
| ABP: every transmitted array position eventually received, with fair scheduling and delivery | `4; 31; 2; 34; 539` |
| HRB-Correct: some node accepts under initial-message and send/receive assumptions | `135; 7; 0; 6; 99` |
| HRB-Relay: all correct nodes eventually accept under relay assumptions | `56; 8; 0; 17; 316` |
| Ackermann: termination | `0.8; 5; 2; 9; 211` |
| LexArray: termination of decreasing array | `0.08; 4; 1; 2; 30` |
| TimestampedQueue: every sent value eventually received if receive attempts recur | `0.5; 6; 1; 2; 73` |
| CascadingQueue: every sent value eventually received if intermediate polling and receive attempts recur | `1.2; 9; 2; 7; 175` |
| ReorderingQueue: each message from sender 1 eventually received under queue-1 polling/receive fairness | `2.3; 9; 2; 11; 220` |
| MutexRing: each waiting node eventually enters critical section under fair scheduling | `0.5; 8; 0; 5; 93` |
| LeaderRing: eventually some leader exists under fair scheduling | `0.3; 8; 1; 4; 76` |
| ToyStabilization: a token movement condition eventually makes top move | `0.3; 5; 0; 3; 69` |
| Dijkstra k-State: eventually exactly one privileged node exists | `64.8; 6; 0; 3; 213` |
| BinaryCounter: termination | `0.02; 4; 0; 0; 21` |
| SAT-Backtrack: termination | `0.3; 9; 0; 8; 157` |
| SAT-CDCL: termination | `5.3; 8; 0; 8; 148` |

All numeric cells are verbatim Table 2 rows with columns reordered only into a compact list; all tasks are by Lotan et al. using the Python/Z3 framework. [Every example's source](https://github.com/neta-elad/implicit-rankings-timers/tree/main/examples) supplies the exact temporal formula; terse “progress” labels above do not substitute for its fairness premises. Source comments corroborate HRB-Correct: “then eventually some node accepts”; HRB-Relay: “then eventually all correct nodes accept”; Dijkstra: “eventually only a single privileged node exists”. For six examples, Table 2's Ivy comparison proof sizes are `407, 521, 860, 446, 593, 748` tokens respectively for Ticket, Paxos, ABP, HRB-Correct, HRB-Relay, Ackermann. These compare proof encodings, not human effort.

### Simplifying Safety Proofs with Forward-Backward Reasoning and Prophecy

Eden Frenkel, Kenneth L. McMillan, Oded Padon, Sharon Shoham. PLDI 2026, PACMPL 10, Article 263, 25 pages. [Paper](https://doi.org/10.1145/3808341), [open author PDF](https://www.wisdom.weizmann.ac.il/~padon/forward-backward-pldi2026.pdf), [mypyvy](https://github.com/wilcoxjay/mypyvy), [artifact](https://doi.org/10.5281/zenodo.19071811). Full paper read; identical pre-existing PLDI PDF reused.

Humans wrote all models and proofs: “All proofs were manually written and mechanically checked using mypyvy ... which discharges logical queries to the Z3 ... SMT solver” (§6.2, p.263:20). Forward reasoning constrains states reachable from the start; backward reasoning constrains states that could reach a bad outcome; prophecy selects future witnesses such as the quorum that decides. The checked property is consensus **safety**, on first-order protocol models: “only a single value can be decided” (§6.1, p.263:16). Raft is explicitly “an abstract model” (§6.2). It establishes no implementation or liveness result.

Table 1 (p.263:20) contains 13 model variants; timings are “median runtime of 15 runs”. Examples: Paxos with decisions storing only a value changes from `Q=4, A=1, B=5` and `0.59 s` to universal clauses and `0.43 s`; Fast Paxos value-only from `Q=5, A=1, B=7`, `1.5 s` to `0.8 s`; Raft from `Q=7, A=2, B=9`, `3.7 s` to `2.8 s` with no alternation in user predicates. Q/A/B mean quantifiers/alternations/Boolean connectives. Existential reasoning survives in the automatically constructed prophecy soundness obligation (§6.2, p.263:21). Human-effort and LOC figures are not reported. **Inference:** promising search-space reduction for an agent, but no proof-generation success rate was measured.

| Concrete models / guarantee | Tool, authors, evidence and sources |
|---|---|
| Paxos, Flexible Paxos, Multi-Paxos, Fast Paxos: agreement | mypyvy/Z3; Frenkel et al.; 12 Paxos model variants in Table 1, plus [artifact](https://doi.org/10.5281/zenodo.19071811) |
| Abstract Raft: agreement | same; Table 1 `raft-epr`; [source](https://github.com/wilcoxjay/mypyvy) |

### Infinite-State Liveness Checking with rlive

Alessandro Cimatti, Alberto Griggio, Christopher Johannsen, Kristin Yvonne Rozier, Stefano Tonetta. CAV 2025, LNCS 15931, pp.215–236. [Open PDF](https://link.springer.com/content/pdf/10.1007/978-3-031-98668-0_11.pdf), [IC3ia](https://es-static.fbk.eu/people/griggio/ic3ia/), [source/benchmarks/logs artifact](https://doi.org/10.5281/zenodo.15310253). Full paper read; PDF saved.

A human supplies a symbolic transition-system model and temporal property in VMT. The implemented domain is “Boolean and linear arithmetic constraints” (§8, p.231). The tool automatically searches for counterexamples, learns abstraction predicates, and synthesizes ranking functions to exclude loops that cannot run forever (§4.1). It checks eventual stabilization (`FGq`), with general LTL reduced to this form; this is model checking, not a proof that running software implements the model.

Evidence: “835 liveness verification problems” (§8, p.231); “a timeout of 1200 s and a memory limit of 8 Gb per instance”; “solving 22 more instances than αL2S”; “an average speedup of 6.47x on instances solved by both tools”; virtual best solves “34 more than rlive-inf alone” (§8, p.232). The paper does not tabulate absolute solved counts in extractable text; do not infer them from a plot. No human-effort or LOC numbers reported. Important boundary: it “will diverge ... for even simple systems whose only counterexamples are not lasso-shaped” (§6, p.228). **Inference:** pair automated checkers, and distinguish a timeout from a valid proof.

| Concrete benchmark problems | Guarantee and tool / who |
|---|---|
| BIP models, real-time models, imperative programs, termination problems; 835 inputs | liveness/termination or violating trace; rlive-inf/IC3ia; Cimatti et al.; [complete benchmark artifact](https://doi.org/10.5281/zenodo.15310253) |

### Related work absent from the first pass: αL2S

Jakub Daniel, Alessandro Cimatti, Alberto Griggio, Stefano Tonetta, Sergio Mover. **Infinite-State Liveness-to-Safety via Implicit Abstraction and Well-Founded Relations**, CAV 2016, pp.271–291. [Open PDF](https://link.springer.com/content/pdf/10.1007/978-3-319-41528-4_15.pdf), [IC3ia source and publication files](https://es-static.fbk.eu/people/griggio/ic3ia/). Direct predecessor and comparison baseline in rlive §7. Full text read; PDF saved.

Human input is a formal transition system/LTL property, or a C program translated by Kratos; automated refinement learns predicates and ranking functions (§4.3, §5). It checks liveness in models; program-derived benchmarks concern the translated semantics. Figure 4 (p.287) reports `L2Sia-wfr 602 477 125` meaning solved/valid/violated, versus `Ultimate-LTL 263 185 78`. Resource bound: “timeout of 1200 s and a memory limit of 6 GB” (§5, p.286). Specialized T2 termination solves `191` versus this general LTL method's `152` on the `193` termination benchmarks (Fig.3). **Inference:** benchmark representation and property class can reverse the winner. No human-effort figure reported.

### Related work absent from the first pass: original finite-state rlive

Yechuan Xia, Alessandro Cimatti, Alberto Griggio, Jianwen Li. **Avoiding the Shoals - A New Approach to Liveness Checking**, CAV 2024, pp.234–254. [Open PDF](https://link.springer.com/content/pdf/10.1007/978-3-031-65627-9_12.pdf), [nuXmv tool](https://nuxmv.fbk.eu/), [benchmarks](https://fmv.jku.at/hwmcc17/). rlive-inf's direct predecessor, reference 47. Full text read; PDF saved.

Humans supply finite hardware circuit models and liveness properties in AIGER; automatic search and invariant construction checks eventual stabilization or finds a repeating violating execution. This is about circuit models. Evidence: “223 benchmarks”; “memory limit to 8GB and the time limit to 1 h” (§5.1, p.248). Table 2 (p.249): `nuXmv -rlive -d 159 66 93` solved/proved/violated versus `nuXmv -k-Liveness + BMC 146 61 85`. Table 3's virtual best proves `82` and refutes `101`; removing rlive leaves `82`/`85`. **Inference:** complementary engines matter even when one wins overall. No circuit size or human-effort totals reported; paper's modified nuXmv source archive was not identified.

### Related work absent from the first pass: certifying rlive

Giulia Sindoni, Alberto Griggio, Stefano Tonetta. **Certifying rlive: A New Proof Strategy for Liveness Model Checking**, FroCoS 2025 proceedings, published 2026, pp.386–403. [Open PDF](https://link.springer.com/content/pdf/10.1007/978-3-032-04167-8_21.pdf), [toolchain / proofs / benchmarks](https://gitlab.fbk.eu/gsindoni/Certifying_Rlive_25). Full text read; PDF saved. Date distinction follows the PDF: “FroCoS 2025 ... 2026”.

Human input is the AIGER hardware model/property. nuXmv automatically discovers invariants; a Python translator generates a PVS theory and proof script; PVS checks the temporal proof, using Yices for propositional obligations (§4.4–4.5). It certifies **model liveness**, not running code or infinite-state rlive. The paper explicitly leaves extension to infinite-state systems as future work (§6).

“53 instances are the safe instances that could be successfully proved by nuXmv in the time limit of 1200 s” (§5, p.398). “41 in total were successfully proved by PVS ... whilst remaining 12 cases exceeded the available memory resources” (p.399). PVS limits are 8GB/3600 seconds, versus nuXmv 4GB/1200 seconds. This is a selected set of already successful positive checks, not 41/53 success on arbitrary liveness requests. PVS/Yices remain trusted, as does fidelity of the model translator. **Inference:** evaluate both solver success and independent certificate checking; memory failures are material.

### Search and remaining reference coverage

Exact titles were checked against `0[1-9]_*.md` using `rg`; the two rlive papers, αL2S, and Certifying rlive were absent. Timers' already-covered direct predecessors (implicit rankings, relational rankings, temporal prophecy 2018/2021, threshold decomposition, Anvil, Shipwright, LiDO/Trillium) were not repeated. Searches used Crossref metadata, Springer chapter/PDF URLs, author publication pages, Semantic Scholar DOI lookup, OpenAlex DOI lookup, and GitHub. The web-search tool failed with HTTP 404 `/alpha/search`; Google returned a JavaScript challenge and arXiv API rate-limited requests.

Further absent leads identified but not yet reviewed (Semantic Scholar and Unpaywall show no open copy for Vick/McMillan or Zhang): *Synthesizing History and Prophecy Variables for Symbolic Model Checking* (Vick/McMillan, VMCAI 2023, [DOI](https://doi.org/10.1007/978-3-031-24950-1_15), publisher returned subscription HTML); *First Order Büchi Automata and Their Application to Verification of LTL Specifications* (Zhang, 2025, [DOI](https://doi.org/10.1016/j.jlamp.2024.101021)). *Neural Model Checking* (Giacobbe et al., NeurIPS 2024) is handled by the refinements slice. The first-pass check found no matching titles. These are explicit coverage gaps, not silently counted as read papers.

### Related work absent from the first pass: certifying transformations as well as solver answers

Giulia Sindoni, Paolo Pasini, Gianpiero Cabodi, Paolo E. Camurati, Alberto Griggio, Marco Palena, Marco Roveri, Stefano Tonetta. **A Theorem Prover Based Approach for SAT-Based Model Checking Certification**, CADE 2025, pp.449–467. [Open PDF](https://link.springer.com/content/pdf/10.1007/978-3-031-99984-0_24.pdf), [source/benchmarks/certificates](https://gitlab.fbk.eu/gsindoni/fbk_pdt_cert25). Direct predecessor of Certifying rlive, reference 28. Full text read; PDF saved.

Humans supply circuit models and safety claims. nuXmv/PdTRAV automatically produce invariants; Python generates PVS theories; PVS/Yices checks safety on the original model even when the solver first discards initialization steps or groups clock phases. “Both tools take as input a model in Aiger ... format” (§5, p.460). The demonstrated guarantee is **safety of circuit models**: extension to liveness is future work (§6). Translator verification is also future work (§5).

Evidence: “105 distinct problem instances”; selected inputs could already be verified “without any form of simplification ... 1800 seconds” (§5, pp.460–461). “166 out of ... 189 runs in total were successfully proved by PVS” (p.462). Runs include different transformations of the same benchmark, so 189 is not 189 distinct systems. Certification limits: 8GB/3600 seconds; solver limits: 4GB/1800 seconds. Invariants are “between one and two order of magnitude smaller than the original benchmarks”, measured in AND gates (p.462), rather than proof LOC. **Inference:** an agent pipeline needs certificates for its abstraction and preprocessing steps, not only the final invariant.

| Concrete problem family | Guarantee, authors, tools, size/effort evidence |
|---|---|
| 105 hardware competition circuit instances, 189 transformation runs | safety; Sindoni et al.; nuXmv/PdTRAV → PVS/Yices; 166 certified runs; no human-effort figure; [complete artifact](https://gitlab.fbk.eu/gsindoni/fbk_pdt_cert25) |

### Related work absent from the first pass: First-Order Automata

Luca Geatti, Alessandro Gianola, Nicola Gigante. **First-Order Automata**, AAAI 2025, pp.14940–14948. [Paper](https://doi.org/10.1609/aaai.v39i14.33638), [open PDF](https://ojs.aaai.org/index.php/AAAI/article/download/33638/35793?download=1), [extended version](https://arxiv.org/abs/2405.20057). Cited by Timers, reference 12. Full conference paper read; PDF saved.

This is a mathematical foundation, not an evaluated proof-generation tool. The human supplies a first-order temporal sentence and background theory. The paper defines a construction of an automaton recognizing its **finite** traces, proving expressiveness/closure and conditional decision procedures. It does not verify distributed running code. Evidence: “any FOLTL sentence over any first-order theory” (contribution 3, p.14940); “An extension of first-order automata to infinite words is the natural next step” (§8, p.14946). Consequently, this paper alone does not supply the infinite-execution liveness guarantee required by the brief.

Its non-emptiness procedure is a “semi-decision procedure ... if satisfiability of [initial] and of [acceptance] and T-satisfiability of [transition] are decidable” (Theorem 8, p.14945). This means that finding an accepted trace can terminate, while failure to find one need not terminate. No experiments, code repository, benchmark counts, LOC, or human-effort measurements are reported. **Inference:** use it to delimit expressive specification languages and solver assumptions; do not count its constructions as an end-to-end agent proof benchmark.

Duplicate audit: `rg --files --no-ignore` found pre-existing flat PDFs for Forward-Backward (byte-identical SHA256 to the author download) and Timers (arXiv v1 extended edition with the same main results/Table 2). Both originals were preserved, and the newly created duplicate PDF/text directories were removed. Six PDFs were newly saved in this slice; two existing PDFs were reused.


## Refinement, hardware, real time, and termination follow-up

### A Higher-Order Separation Logic for Verifying Liveness-Preserving Refinements of Distributed Systems

Jonas Kastberg Hinrichsen, Léo Stefanesco, Lars Birkedal, Amin Timany. HAL preprint, submitted 7 June 2026. [Full paper](https://hal.science/hal-05647709v1/document).

**Human input:** AnerisLang implementation, a chosen labeled transition model, invariants, socket contracts, terminating producer/transformer/consumer contracts, and refinement proofs. Fairneris transfers model progress to implementation progress under scheduler and network fairness. Its network permits drops, duplication, and reordering. Fairness covers sets of messages, allowing payloads to change across retries (§2). This verifies code in the language's operational semantics; the paper establishes no production Rust/OCaml executable boundary.

**Checked:** Rocq mechanizes logic soundness and HORPC safety plus recurring progress. The implementation has two nodes; every sequence number eventually receives a reply, assuming callback termination and fairness (§4, Lemma 4.2). **Automatic:** proof-assistant checking and inherited symbolic-execution rules, not automatic invention of models/contracts/proofs.

**Evidence:** §1.2, p.3: “always eventually process a new value produced by 𝑝”; §2.1, p.4: “only three states” describes the introductory retransmission model. No LOC, person-time, or benchmark timing reported. Reference [3] names an anonymous mechanization without a usable URL.

**Additional evidence:** §1.1 p.2 calls the input the “(user) model”; §4.3 p.16 describes “symbolic execution”; abstract p.1 says “mechanized”.

**Inference:** useful eval: require agents to supply and justify fairness and callback termination, then prove both model progress and its transfer to code.

### Liveness Proofs for Hardware Model Checking

Nils Froleyks, Emily Yu, Bart Bogaerts, Armin Biere, Keijo Heljanko. CAV 2026, pp.3–27. [Paper](https://link.springer.com/content/pdf/10.1007/978-3-032-32537-2_1.pdf); [artifact](https://zenodo.org/records/19649249).

**Human input:** a Boolean circuit model, initialization, transitions, environment constraints, and safety/liveness signals (§3). **Checked:** safety and eventual permanent truth of the liveness signal for all infinite circuit traces. This is finite-state hardware-model verification. Certificate construction supports k-liveness, liveness-to-safety, rLive, and stabilizer extraction; eight SAT obligations independently validate a witness circuit (§4). The proof of certificate soundness is mathematical, not a reported proof-assistant mechanization.

**Automatic:** model checking, witness generation, and SAT checking. HWMCC preprocessing uses the unverified `aigunfair` converter (§6).

**Numbers/evidence:** §4 p.8: “each of the eight conditions”; §6 p.19: “73 were found to be UNSAT”; §6 p.20: “4%”, “7%”, “59%” certificate-checking overhead respectively for k-liveness, rLive, L2S. Limits per instance: “14 GB”, “one hour” (§6 p.18). All generated certificates validated; preprocessing and the SAT checker remain trusted. No human effort reported.

**Additional evidence:** §6 p.18 identifies “model” as input; §4 p.9 concludes “safe and live”; §4 p.8 uses a “SAT solver call”.

**Inference:** valuable evaluation separation: an agent's solver success should count only after independently checking a certificate against the original model.

Fig.7 / §6 p.18 compares the older Sindoni certificate pipeline: 16 optimized and 13 unoptimized rLive instances could not be certified; overhead was 309%/469%, calculated only over successfully certified instances. This differs from counting all 73 selected UNSAT benchmarks and should not be interpreted as universal performance.

### VeriRT: An End-to-End Verification Framework for Real-Time Distributed Systems

Yoonseung Kim, Sung-Hwan Lee, Yonghyun Kim, Chung-Kil Hur. POPL 2025, Article 61, 28 pages. [Paper](https://sf.snu.ac.kr/publications/veriRT.pdf); [source artifact](https://zenodo.org/records/13937956).

**Human input:** C programs, timed abstract specifications, clock/network/system-call/execution-time assumptions, invariants, and Coq simulation proofs. **Checked:** timed behavioral refinement through C to CompCert-generated assembly. Cristian clock synchronization bounds clock skew; simplified PALSware implements logical synchrony. An active/standby resource scheduler supplies the application (§7–8). Its description claims safety/liveness under device failures and at most one controller failure; this report does not strengthen that into a per-request progress theorem.

**Automatic:** Coq checking and CompCert compilation. Timing bounds must be separately tested or analyzed against hardware; §1 p.2 explicitly says “externally validated”. They are assumptions of the theorem, not machine-derived timing guarantees.

**Numbers/evidence:** Table 2 p.24 reports C implementation counts, verbatim: “313” (ClockSync), “327” (PALSware), “352” (Active-Standby). ImplVerif proof lines: “3526”, “5913”, “4718”; refinement proof lines: “6597”, “8861” respectively for ClockSync/PALSware. Counts exclude blanks/comments. No person-time reported.

**Additional evidence:** §1 p.3: “user-specified timing assumptions”, “All results are formalized in Coq”; §8.2 p.22: “timed behavioral refinement”.

**Inference:** strong task family for making agents expose environmental assumptions and distinguish compiler correctness from measured execution-time guarantees.

### Feedback & Synthesis in LLM-Assisted Termination Proofs

Zeke Medley, Panagiotis Manolios. ITP 2026, Article 22, 19 pages. [Paper](https://drops.dagstuhl.de/storage/00lipics/lipics-vol382-itp2026/LIPIcs.ITP.2026.22/LIPIcs.ITP.2026.22.pdf); [source](https://github.com/0xekez/fslatp).

**Human input:** typed ACL2s function definitions; humans curated course/competition problems and manually translated competition programs. **Checked:** functions terminate for every input, a liveness/total-correctness property of functional code, not distributed-system progress. LLMs propose decreasing measures; ACL2s admits/checks them, reports errors/counterexamples, decomposes failures into loops, and combines successful subproofs (Algorithms 1–2).

**Automatic:** measure proposal, feedback iteration, termination-core decomposition, proof checking and combination. gpt-oss-120b/Qwen3-32B run locally; full history performs worse than focused verification feedback (§7).

**Numbers/evidence:** §5 p.8: “42” base functions; §1 p.1: “786 hours on an H200 GPU”; §7 p.11: “thirty-minute time limit per problem”; Abstract p.1: “39% more problems”. §5 p.8 also reports gpt-oss with admission errors/counterexamples solved “70%” course and “93%” competition problems, versus built-in ACL2s “65%” and “63%”; these are the original corpus results. GPU hours measure machine cost. The last compares integrated core-guided search with the best LLM alone, not a 39-percentage-point gain. Abstract also claims more than triple built-in-analysis solves. Synthetic variants reduce training-contamination concerns, but remain derived from a small corpus. No person-time reported.

**Additional evidence:** Algorithm 2 p.13 requires “function f”; §1 p.1 states “prove functions terminate”; Algorithm 2 accumulates measure hints.

**Inference:** directly useful agent architecture: let established symbolic analysis choose subproblems; evaluate formal proofs, not termination guesses.

### Towards Composable Proofs of Cache Coherence Protocols

Martina Camaioni, Yann Herklotz, Tz-Ching Yu, Thomas Bourgeat. CPP 2026, pp.338–351. [Paper](https://yannherklotz.com/papers/cpp26_tcp.pdf); [source artifact](https://zenodo.org/records/17805558).

**Human input:** transition-system descriptions, decomposition into MI/SI, local invariants, simulation relations, and Lean proofs. **Checked:** safety through trace refinement to atomic memory; MSI is proved via independently verified subprotocols. Multi-line proof covers MI, equal child/parent capacity, and restrictive sharing (§5–6.1). No liveness theorem established. The Bluespec hardware translation is manual and tested, not proved equivalent to Lean.

**Automatic:** Lean proof checking; randomized differential hardware tests. The authors designed the decomposition/invariants.

**Numbers/evidence:** §6.1 p.349: “9228” lines, excluding whitespace/comments; §6 p.348: “three person-days” for manual hardware translation/testing; §6 p.349: “100,000 load responses” in the first testbench. Hardware test uses two 64-KB L1s and a 64-KB L2 (§6 p.348). The person-days do not measure proof-development effort.

**Additional evidence:** abstract p.338: “local invariants”; §1 p.339: “formalized in the Lean4 proof assistant”.

**Inference:** valuable proof-planning benchmark: ask an agent to invent/check a decomposition and state which protocol variants, capacities, and implementation layers its theorem covers.

### Related work absent from the first pass: Nola

Yusuke Matsushita, Takeshi Tsukada. *Nola: Later-Free Ghost State for Verifying Termination in Iris*. PLDI 2025, Article 151, 27 pages. [Paper](https://doi.org/10.1145/3729250); [source](https://github.com/hopv/nola). Existing collection PDF reused.

Fairneris §6 points to Nola; `rg -i Nola 0[1-9]_*.md` found no mention. **Human input:** specifications and Rocq proofs over a core Rust language, including ownership/borrows and induction measures. **Checked:** termination plus functional correctness of examples, and soundness of the Nola/RustHalt proof rules. **Automatic:** Rocq checking, not automatic extraction of production Rust proofs. RustHalt is a prototype, with incomplete re-mechanization of RustHornBelt (§7 p.151:19).

**Evidence:** §7 p.151:20: “using meta-level induction on the lexicographic order over pairs of natural numbers” describes two Ackermann variants. Also proves mutable-list traversal assuming its callback terminates. No LOC, runtime, or person-time reported. §8 p.151:21 records the one axiom: uniqueness of identity proofs.

**Additional evidence:** §7 p.151:20: “always terminates”; abstract p.151:1: “fully mechanized”; §7 supplies “functional specifications”.

**Inference:** directly relevant missing Rust termination foundation; useful small benchmarks for agents choosing induction orders while reasoning about mutation.

### Related work absent from the first pass: Hemiola

Joonwon Choi, Adam Chlipala, Arvind. *Hemiola: A DSL and Verification Tools to Guide Design and Proof of Hierarchical Cache-Coherence Protocols*. CAV 2022, pp.317–339. [Paper](https://link.springer.com/content/pdf/10.1007/978-3-031-13188-2_16.pdf); [source](https://github.com/mit-plv/hemiola).

CPP paper §7 cites it; no first-pass title match. **Human input:** cache tree, transition rules chosen from DSL templates, invariants/predicate messages, and Coq proofs. **Checked:** DSL serializability soundness and protocol-model coherence of inclusive/noninclusive MSI and noninclusive MESI. Templates automatically manage a locking discipline, allowing invariant proofs to consider one transaction at a time (§3–5).

**Automatic:** template expansion, proof checking, compilation of single-line descriptions into multi-line Kami hardware, and FPGA differential testing. Compiler pipeline verification remains future work (§6.2); the running hardware tests do not establish its formal refinement.

**Numbers/evidence:** §6.2 p.334: “over 10⁹ memory requests for each protocol” denotes randomized FPGA checking of safety/liveness, not a universal liveness proof. Simulations use 500,000 cycles; hardware includes two-/three-level MESI configurations. No code-size or person-time numbers reported here.

**Additional evidence:** §5.2 p.331 requires a “precondition”; abstract p.317 guarantees “serializability”; §1 p.318 says locking is “handled automatically”.

**Inference:** illustrates both useful human scaffolding and an important evaluation trap: universal protocol safety can coexist with tested-only compiled hardware progress.

### Related work absent from the first pass: Calling Context Graphs

Panagiotis Manolios, Daron Vroon. *Termination Analysis with Calling Context Graphs*. CAV 2006, pp.401–414. [Paper](https://link.springer.com/content/pdf/10.1007/11817963_36.pdf). ACL2s implementation.

ITP 2026 §2 cites this mechanism; no first-pass title match. **Human input:** first-order functional code and existing ACL2 libraries. **Checked:** termination on all inputs through conservative call graphs and well-founded decreasing measures (§3–4). **Automatic:** call-context extraction, theorem-prover queries, measure heuristics, graph analysis. Experiments remove explicit hints/measures but retain existing auxiliary lemmas; this is not proof from entirely annotation-free libraries (§5).

**Numbers/evidence:** Table 1 p.412, verbatim row: “All 10,442 10,308 98.7%”; the difficult subset row is “With Explicit Guidance 421 287 68.2%”. The columns are functions attempted, proved, percentage. Implicit human lemmas were not removed. No person-time quantified.

**Additional evidence:** §1 p.402: “function definitions”, “automatically prove termination”, “no user interaction”.

**Inference:** the symbolic decomposition behind the 2026 LLM improvement already has substantial independent power; benchmark comparisons should retain its standalone baseline and disclose retained human lemmas.

### Related work absent from the first pass: Termination Cores

Panagiotis Manolios, Daron Vroon. *Interactive Termination Proofs using Termination Cores*. ITP 2010, pp.355–370. [Author PDF](https://www.ccs.neu.edu/home/pete/pub/interactive-termination.pdf); [DOI](https://doi.org/10.1007/978-3-642-14052-5_25). ACL2s implementation.

ITP 2026 §2 cites it; no first-pass title match. **Human input:** functional program; after failure, repaired code, suggested measures, or auxiliary lemmas. **Checked:** all-input function termination. **Automatic:** generates one unresolved recursive loop, preserving solved work; theorem-prover checks hinted measures and recombines progress reasoning. Core generation has PSPACE-complete worst-case complexity (§3).

**Numbers/evidence:** §4 author PDF p.14: “under 2 seconds” for automatically proving a repaired nested-loop program; “4–6 hours” describes an expert's unsuccessful earlier measure search; “about 20 minutes” describes manually constructing/checking a measure after repair. This is one motivating example, not a controlled productivity study. The original bug tested the wrong variable; authors repaired it after inspecting the core.

**Additional evidence:** §1 p.2 explains “a single simple cycle”; §4 p.14 says “CCG analysis proves termination”.

**Inference:** useful eval cases should include actual nontermination and repair, not just guessing missing annotations for preselected terminating programs.

### Related work absent from the first pass: Formalising CXL Cache Coherence

Chengsong Tan, Alastair F. Donaldson, John Wickerson. ASPLOS 2025, pp.437–450. [Paper](https://johnwickerson.github.io/papers/cxl_cache_ASPLOS25.pdf); [source](https://github.com/ChengsongTan/CXLcacheFormalisation).

CPP §7 references this study; no first-pass title match. **Human input:** the standard's English text, an Isabelle transition model, handwritten definitions, and repeatedly strengthened invariants. **Checked:** single-writer/multiple-reader safety: a writer excludes simultaneous readers/writers. It covers two devices and one location, assumes perfect tracking, and omits several messages. Data-value correctness, deadlock freedom and liveness remain unproved (§8). **Automatic:** `super_sketch` orchestrates Sledgehammer and inserts generated proofs, using human proof methods/heuristics (§7); Isabelle checks the result.

**Evidence/numbers:** abstract: “English prose specification”; §2: “single writer, multiple reader”; §6: “around 211k lines of code”, “12 person-months”; §1 p.2: “796” invariant conjuncts, “68” rules, “53,332” lemmas; §7: “super_sketch”. Definitions are below ten thousand lines; most proof text is generated. The reported lemma number conflicts with 796×68=54,128; the follow-up paper below reports the latter. No running CXL implementation is proved.

**Inference:** a strong natural-language-to-specification case, but specification interpretation still required expert dialogue, and one proved safety component must not be called complete cache coherence.

### Related work absent from the first pass: Modular Deductive Verification of Multiprocessor Hardware Designs

Muralidaran Vijayaraghavan, Adam Chlipala, Arvind, Nirav Dave. CAV 2015, pp.109–127. [Paper](https://link.springer.com/content/pdf/10.1007/978-3-319-21668-3_7.pdf); [source](https://github.com/vmurali/SeqConsistency).

CPP §7 cites this predecessor; no first-pass title match. **Human input:** Coq transition-system descriptions modeled closely on Bluespec designs, component interfaces, invariants, simulation relations and proofs. **Checked:** sequential-consistency safety of a composition of speculative processors and hierarchical MSI memory, parameterized by arbitrary processor/cache counts and hierarchy. No liveness theorem established. This verifies the Coq hardware description; synthesis-equivalence verification is not established (§1, §10).

**Automatic:** Coq checking and modular theorem composition; protocol-specific invariant discovery/proofs are human-guided.

**Evidence:** §1 p.110: “human-guided deductive techniques”; abstract p.109: “implements sequential consistency”, “machine-checked proofs”; §8 p.124: “12,000 lines of Coq code”, “80 % can be reused as-is”. The reuse statement concerns other inclusive invalidation protocols, not measured effort savings for all designs. No person-time reported.

**Inference:** useful tasks for agents choosing interfaces that permit independent component proofs and reuse across a parameterized family.

### Related work absent from the first pass: The Burden of Proof

Chengsong Tan, Alastair F. Donaldson, Jonathan Julián Huerta y Munive, John Wickerson. *The Burden of Proof: Automated Tooling for Rapid Iteration on Large Mechanised Proofs*. FormaliSE 2025. [Paper](https://johnwickerson.github.io/papers/supersketch_FORMALISE25.pdf); [artifact](https://zenodo.org/records/14273542).

CXL §7 cites this tooling follow-up; no first-pass title match. **Human input:** Isabelle goals, invariant changes, and user-selected simplification/case-splitting methods. **Checked:** generated/repaired Isabelle proof scripts for the CXL SWMR safety proof. **Automatic:** `super_sketch` splits goals, invokes Sledgehammer concurrently and assembles proofs; `super_fix` repairs errors after changes. Unsolved goals remain explicit `sorry` placeholders; success requires subsequent complete checking (§IV–V). Neither tool automatically designs the whole invariant.

**Evidence/numbers:** §IV.A: “user-specified proof methods”; §II: “310k lines of code”, “54,128”; §IV.C: “about one day” per obligation-matrix iteration, “less than 100” unresolved subgoals out of 50,000+; §IV.A: “sorry”. §II's two-year development span is elapsed time, not person-years. This larger proof revision drops earlier simplifying assumptions; its counts are separate from ASPLOS25's 211k lines/12 person-months.

**Inference:** evaluate agent proof maintenance separately from theorem discovery; measure leftover obligations and manual intervention, not generated proof-text volume.

### Related work absent from the first pass: Neural Model Checking

Mirco Giacobbe, Daniel Kroening, Abhinandan Pal, Michael Tautschnig. NeurIPS 2024, pp.86375–86398. [Paper](https://papers.nips.cc/paper_files/paper/2024/file/9d0947107ea92d6ce369dce7749180dd-Paper-Conference.pdf); [artifact](https://github.com/aiverification/neuralmc).

Hardware-liveness §2 cites this missing paper. **Human input:** SystemVerilog circuits and LTL specifications; benchmark design and training settings. **Checked:** universal LTL safety/liveness over finite word-level hardware models, using ranking functions on the circuit/Büchi-product model. This is a symbolic guarantee for accepted candidates, not only a trajectory test. **Automatic:** simulation samples, neural ranking-function training, quantization, and SMT validation over all transitions; PyTorch/EBMC/Spot/Verilator/Bitwuzla pipeline. Neither implementation equivalence to physical hardware nor human-proof development is established.

**Evidence/numbers:** abstract p.1: “symbolically check their validity”; §2 p.2: “LTL formula Φ”; Table 1 p.8: “194” tasks, own tool “180”, ABC “57”, nuXmv “117”, commercial X “156”; §5 p.8: “five hours” per task. Ten parameterized designs include PWM, UART, load-store and VGA. VGA solves 0/10, attributed to training local minima (§5); easy UART tasks can be faster symbolically. No person-time reported.

**Inference:** relevant architecture for agents synthesizing progress arguments: learned candidates gain credibility only after universal symbolic checking; training failures and solver timeouts remain separate from proved violations.

### Related work absent from the first pass: Compound Memory Models

Andrés Goens, Soham Chakraborty, Susmit Sarkar, Sukarn Agarwal, Nicolai Oswald, Vijay Nagarajan. PLDI 2023, Article 153, 24 pages. [Paper](https://goens.org/publications/pldi23.pdf); [artifact](https://doi.org/10.5281/zenodo.7711175); [Lean model](https://github.com/goens/lost-pop-lean); [Alloy](https://github.com/goens/cmm-axiomatic).

Composable-cache §7 cites this missing work. **Human input:** operational LOST-POP/axiomatic CMM memory models, device configurations, scoped compiler mappings, proof arguments, and litmus tests. **Proved:** scoped C/C++→x86TSO/PTX mapping correctness for race-free executions, a safety/model theorem (§6.3 p.153:20); paper presents a mathematical proof argument, not a claimed complete mechanized proof. **Checked automatically:** Lean executable model exploration and Alloy bounded consistency checks, with guided exploration/manual inspection; gem5 tests heterogeneous implementations. No liveness theorem or verified running compiler established.

**Evidence/numbers:** §5.1 pp.153:15–16: “manual interactive inspection”, “34” x86 tests, “73” PTX variants; §6.2 p.153:19: “139 litmus tests” (while §5.1 p.153:16 separately says 159 total compound tests; the paper does not reconcile these counts); §7.1 p.153:21: “512–2048 times” per simulator test; Theorem 6.1 p.153:20: “mapping scheme in Figure 13 is correct”. No proof LOC/person-time. Operational model excludes mixed-size concurrency and RMWs (§2); axiomatic model includes RMWs. Gem5 is not exhaustive evidence about real hardware.

**Inference:** useful composition benchmark for checking which inter-device coherence assumptions retain component compiler guarantees; weakening SWMR permits a previously forbidden message-passing outcome (§7.2).

Related unresolved full text: *Let a Neural Network be Your Invariant* (Giacobbe et al., NeurIPS 2025) is confirmed by the [conference page](https://neurips.cc/virtual/2025/poster/115893) and [artifact](https://github.com/aiverification/neuralmc/tree/main/NeurIPS25), but [OpenReview PDF](https://openreview.net/pdf?id=qBPb7g1SEa) returns HTTP 403 challenge; no full-text claims made.

### Concrete case rows

The evidence and counts above apply to these rows; the rows add no stronger theorem.

| problem | guarantee and boundary | tool / who | source |
|---|---|---|---|
| retransmitting ping/done; HORPC | eventual reply / recurring processing under fairness; AnerisLang semantics | Fairneris/Rocq; Hinrichsen et al. | HAL paper above; artifact URL not supplied |
| HWMCC25 liveness; saturating counter | safety plus eventual permanent signal, finite circuit model | SAT witness checking; Froleyks et al. | CAV paper / Zenodo above |
| Cristian clock synchronization | bounded skew under timing assumptions; C through assembly | VeriRT/Coq/CompCert; Kim et al. | paper / Zenodo above |
| simplified PALSware; active/standby scheduling | timed refinement to synchronous semantics; scheduler property scope as stated above | VeriRT/Coq; Kim et al. | paper / Zenodo above |
| typed recursive functions and synthesized combinations | termination for every input; ACL2s code | LLM measures + CCG; Medley/Manolios | paper / GitHub above |
| MI, SI, MSI | coherence safety; Lean transition models | Lean 4; Camaioni et al. | paper / Zenodo above |
| mutable-list traversal; Ackermann variants | termination + functional behavior; core Rust semantics | Nola/RustHalt/Rocq; Matsushita/Tsukada | paper / GitHub above |
| hierarchical MSI / MESI | universal protocol-model coherence; FPGA safety/liveness testing | Hemiola/Coq; Choi et al. | paper / GitHub above |
| CXL.cache two-device, one-location model | SWMR safety only; no data-value/liveness proof | Isabelle + super_sketch; Tan et al. | ASPLOS paper / GitHub above |
| speculative processors + hierarchical MSI | sequential-consistency safety, parameterized hardware description | Coq; Vijayaraghavan et al. | CAV paper / GitHub above |
| CXL proof maintenance | repair safety proof scripts after model changes | super_sketch/super_fix; Tan et al. | FormaliSE paper / Zenodo above |
| PWM | pulse is low infinitely often, `GF !pulse`; finite hardware model | neuralmc SMT-checked ranking; Giacobbe et al. | NeurIPS24 Appendix B p.18 / GitHub above |
| UART transmitter / LCD controller | repeatedly waiting / ready, subject to stated reset/enable assumptions | neuralmc; Giacobbe et al. | NeurIPS24 Appendix B p.18 |
| delay / Gray counter / load-store | recurring signal, and selected checks that it does not stay high forever | neuralmc; Giacobbe et al. | NeurIPS24 Appendix B p.18 |
| VGA | recurring display enable after resets stop; 0/10 solved, no guarantee produced | neuralmc; Giacobbe et al. | NeurIPS24 §5 / Appendix B |
| heterogeneous x86TSO + PTX; message-passing / IRIW | compiler-mapping safety theorem plus bounded/model/simulator tests | LOST-POP/Lean/Alloy/gem5; Goens et al. | PLDI23 paper / artifacts above |
| ACL2 regression functions | all-input termination, retained implicit lemmas | CCG/ACL2s; Manolios/Vroon | CAV 2006 above |
| faulty nested-loop program; mergesort | core-guided repair / hinted all-input termination | ACL2s; Manolios/Vroon | ITP 2010 above |

Searches used exact titles in OpenAlex, Crossref, primary HAL/Springer/Dagstuhl pages, author publication pages, GitHub and Zenodo. The web search tool returned HTTP 404; arXiv API returned a rate-limit response. OpenAlex incorrectly associates the 2026 termination paper with arXiv:1507.03670, a cited 2015 paper; the Dagstuhl full text confirms the correct paper. Fairneris's artifact URL remains unresolved. Related-work reading is selective: DuoAI, Inductive Invariants That Spark Joy, and Basilisk are already in the first pass and excluded. Older cache papers on FLASH/parameterized proof and the 2016 Vijayaraghavan dissertation remain unexpanded; these are relevant background, not classified irrelevant. Let a Neural Network be Your Invariant has an inaccessible OpenReview full text; the 2015 core paper is covered above.

Unexpanded direct relevant cache references (titles verified in CPP26 §7/bibliography, not full-text-reviewed): *A Novel Approach to Parameterized Verification of Cache Coherence Protocols* (Li et al., ICCD 2016, DOI 10.1109/ICCD.2016.7753341); *Proofs of Correctness of Cache-Coherence Protocols* (Stoy/Shen/Arvind 2001, DOI 10.1007/3-540-45251-6_4; Springer PDF endpoint returned HTML); *Exact and Efficient Verification of Parameterized Cache Coherence Protocols* (Emerson/Kahlon 2003); *Parameterized Verification of the FLASH Cache Coherence Protocol by Compositional Model Checking* (McMillan 2001); *Verification of FLASH Cache Coherence Protocol by Aggregation of Distributed Transactions* (Park/Dill 1996); *A Simple Method for Parameterized Verification of Cache Coherence Protocols* (Chou/Mannava/Park 2004); *An ACL2 Proof of Write Invalidate Cache Coherence* (Moore 1998); *Modular Verification of Hardware Systems* (Vijayaraghavan 2016 dissertation). These are acknowledged gaps, not found-irrelevant exclusions.


## Consensus, cloud controllers, and broker crash windows


The six requested titles were found. Four PDFs were saved; the PRDT and SoK PDFs already existed and were reused. Search used OpenAlex, Figshare, HAL, Zenodo, Springer, arXiv, and GitHub over HTTP after the web search endpoint returned HTTP 404. No requested title in this slice was dismissed as absent or irrelevant. Two additional related papers were read from existing PDFs. All new files begin with `%PDF`. Page references below refer to printed pages unless stated otherwise. For the dissertation, the detailed reading covered its models, reduction arguments, evaluations, limitations, and relevant appendices; it was not a line-by-line audit of every formal derivation.

### Automating Formal Verification of Distributed Systems via Property-Driven Reductions

Christopher Wagner. Purdue University PhD dissertation, May 2025. [Thesis and open PDF](https://doi.org/10.25394/pgs.28525628). Saved in the collection under the full title, author, Purdue PhD thesis, and 2025.

**Human input.** A developer writes a Mercury or Coalition process model and a safety formula limiting how many processes can occupy particular states. Agreement primitives stand for independently verified agreement protocols. The developer may need to change the model after receiving feedback about missing reactions or unsupported structure. This is a formal model and property as input, rather than an English request. In one exception, a human supplies a process cutoff that the automatic procedure cannot find.

**What is established.** The dissertation develops sound reductions from selected families with arbitrarily many processes and, later, unbounded data values to small finite models. QuickSilver checks safety of distributed agreement-based models. D-Escalate checks safety of systems with clients communicating through a central server. Venus reduces large or infinite data domains before QuickSilver. The resulting safety guarantees cover the parameterized model when the reduction's conditions hold. They do not prove running implementations or independently prove the agreement primitives' liveness. Agreement, validity, and termination of those primitives are premises of modular verification (§3.9.3, pp.84–85).

**Automatic work and remaining human work.** The tools parse models, compute structure conditions, generate environmental behavior, find process/data cutoffs, and run finite model checking; QuickSilver also suggests model repairs. Humans supply protocols, properties, and some model repairs. The concrete exception is unusually useful evidence against reading “fully automatic” literally: §5.7, p.160, footnote 4 says “manually computing a process cutoff of 2”.

**Numbers.** Table 3.1, p.88, reports 12 Mercury models, 32–99 lines, process cutoffs 2–5, and verification times 0.059–736.417 seconds. Table 4.1, p.119, reports 23 base/buggy Coalition cases, 78–126 lines, mostly cutoff 2 and one cutoff 6; every reported mean is under a second. Table 5.1, p.159, reports 10 Venus cases, 34–79 lines, data cutoffs 2–3, process cutoffs 2–5, and 0.202–1.620 seconds. Exact table excerpts: “Distributed Lock Service 38 2 2 0.059 ± 0.002”; “SATS Landing Protocol II∗ 99 5 5 736.417 ± 3.659”. Runtime means use 10 runs, with 95% confidence intervals. Human modeling time is not quantified. 

**Concrete cases.** The dissertation's §2.2 and Appendix A.10 describe the problems rather than just names: replicated stores/registers must not disagree; distributed locks must exclude simultaneous owners; sensor aggregation/tracking and consortium decisions must agree; aircraft landing and robot movement must exclude conflicting assignments; access control must exclude unauthorized clients; Breakout must avoid inconsistent group membership; cache coherence must exclude incompatible cache states; dispatchers must report consistent alerts. These are safety model checks. The thesis provides an open [QuickSilver artifact](https://doi.org/10.5281/zenodo.5501650); no verified production-code repository is claimed.

**Inference for evaluation.** This supplies tests of whether an agent can select a sound bounded reduction, distinguish primitive contracts from proved application properties, react to structural feedback, and report where a human still supplied a missing bound.

### Formal Verification of Multi-Controller Systems in Cloud Management

Tengfei An and Maria Potop Butucaru. HAL research report, 2026. [Record and PDF](https://hal.science/hal-05611615v1). Saved under full title, authors, HAL report, 2026.

**Human input.** The authors derive a simplified resource/controller model from real Kubernetes operator incidents. They write NuXMV modules, initialize each user's requested resource state, select whether resources overlap or depend on other resources, and write temporal formulas. The model fixes two controllers, two resources, two users, and an optional shared subresource (§5.2, pp.12–13). It does not extract the state machine from controller code.

**What is checked.** Resource states should eventually match the requested states and stay there; a controller that starts reconciling should eventually become idle. These are convergence/progress properties about a finite symbolic model. Listing 1.3, p.11, gives the first formula verbatim: “LTLSPEC F G ( r1 . state = u1 . spec & r2 . state = u2 . spec )”. `F G` means eventually always. The formula combines reaching the requested state with staying there; the displayed checks do not independently isolate a pure safety theorem.

**Automatic work and results.** NuXMV checks all executions of the supplied finite model and returns counterexample cycles. Table 2, p.13, compares four settings. With neither overlap nor dependencies, all checks pass. Overlap alone causes repeated resource changes and fails conformity/stability, while controllers still finish individual reconciliations. Dependencies alone, or dependencies with overlap, fail all three criteria because a dependency may remain unavailable forever. The latter result depends on the model allowing nondeterministic unavailability indefinitely; it is not a theorem that every Kubernetes dependency causes permanent failure. Human proof/model effort, solver runtime, and total source size are not reported. The paper prints three module listings, but supplies no public model repository in its references.

**Concrete problem.** Two reconcilers want different states for a shared resource, causing an endless overwrite cycle; alternatively both wait forever for prerequisites. Tool: NuXMV; authors: An and Potop Butucaru; guarantee: convergence and completion of a finite abstract model. Real incidents cited include [Argo CD #2913](https://github.com/argoproj/argo-cd/issues/2913) and [FoundationDB operator #1226](https://github.com/FoundationDB/fdb-kubernetes-operator/issues/1226). These incident repositories are sources of the problem, not verified implementations.

**Inference.** This is a compact specification task for agents: discover interference and identify an environmental assumption that is needed for progress. The counterexample to permanently unavailable dependencies should prompt an explicit question about availability guarantees.

### Systematization of Knowledge: Formal Verification of Consensus Protocols

Nikita Bondarev, Kirill Ziborov, Yury Yanovich. arXiv preprint, 22 August 2026, arXiv:2608.21935v1. [Record and full text](https://arxiv.org/abs/2608.21935). Existing collection PDF reused.

This is a survey, so **human input** is the authors' selected literature and classification; **proved/checked here** is no new protocol safety or liveness theorem; **automatic work** is no measured autonomous verification pipeline. The authors classify model checking, deductive proofs, code proofs, and hybrid approaches, and keep several important distinctions: Casper finality-gadget progress is narrower than whole-chain progress; an executable formalization is different from a proof about existing deployed code; fixed finite model checking differs from parameterized proofs (§§2–3).

**Numbers and evidence.** The abstract says “over 20 verified consensus protocols”; §4.1, p.15, says “only ≈ 30% of surveyed works addressing liveness”. No search date range, reproducible paper-selection denominator, or human reading-time measurement supports treating this fraction as an unbiased census of all consensus verification. Table 1, pp.7–8, is a discovery map of protocols and properties. Its entries require checking the cited papers before accepting them as evaluation ground truth. The paper itself does not introduce a benchmark or new verified implementation repository.

**Inference.** Useful for finding missed papers and for labeling model-versus-code and safety-versus-progress boundaries. The fraction is descriptive of this selected corpus, not an agent success baseline.

### Survey of Consensus Protocol’s Formal Verification

Zelin Feng and Rui Zhang. *Cybersecurity* 9:81, 2026. [Publisher, open PDF](https://doi.org/10.1186/s42400-025-00501-2). Saved under full title, authors, Cybersecurity, 2026. This is the requested title despite the typographic apostrophe.

This is a 42-page survey, not a new verified protocol. **Human input** is selected literature, protocol descriptions, attack categories, and the authors' classifications. **What is proved/checked in this paper**: no new safety/liveness theorem about a model or executable code. **Automatic work**: no measured synthesis or checking pipeline. It distinguishes explicit/symbolic checking, bounded checking, theorem proving, and probabilistic analyses. Tables 3–6 collect papers, targets, properties, tools, and experimental parameters; tables are leads to primary sources, not fresh experimental results. Table 6, p.27, includes exact column headings “Target”, “Properties”, “Tools”, “Modeling method”, “Experimental parameter”. These make the survey useful for recovering which parameters a probabilistic result actually covered. Author effort and a quantitative literature-search protocol are not stated.

**Caution from direct reading.** Some explanations are too broad to inherit as technical facts. The discussion characterizes SMT generally as NP-complete and treats probabilistic verification as abandoning complete search; these statements do not distinguish the logical theories or statistical simulation from exact probabilistic model checking. The authors' comparison of theorem provers also makes generalized capability judgments. Use the cited primary study for each tool or verified property.

**Inference.** Useful as a catalog of attacks and formalized targets. It does not supply evidence that agents can infer a strong specification from vague human goals.

### PRDTs: Composable Design and Verification of Consensus Protocols using Replicated Data Types

Julian Haas, Ragnar Mogk, Annette Bieniusa, Mira Mezini. arXiv:2504.05173v3, 19 June 2026. [Current version](https://arxiv.org/abs/2504.05173). Existing PDF filename says PACMPL 2025; the PDF's actual front page says June 2026, and its data-availability statement still describes a forthcoming artifact submission. Do not silently turn the filename into confirmed final-venue metadata.

**Human input.** Developers write executable Scala components implementing state merging, local actions, action preconditions, and decisions, and supply an ordering on decisions. They instantiate a `Consensus` trait. The paper makes the remaining effort explicit: §3.5, p.13, says “automated verification often needs auxiliary lemmas and carefully placed assertions”. The supplied state model is designed for composition; it does not begin with English requirements.

**What is proved.** A mathematical model establishes that two local obligations suffice for consensus safety: a decision cannot become inconsistent after a permitted local action, and other processes' permitted actions cannot invalidate a precondition. Stainless checks these obligations for supplied Scala implementations; verified components can support proofs of compositions. This is safety of executable protocol logic under the PRDT communication/model assumptions. §3.2 distinguishes agreement/validity from termination and does not claim a verified eventual-response theorem. Network dissemination, serialization, storage, and the entire measured key-value store are not all established by those two Scala laws.

**Automatic work and numbers.** Stainless generates/checks verification conditions and reuses component facts. §6, p.25, describes reducing the obligations “from four to two”. Voting, parallel voting, Paxos-style composition, repeated consensus, Multi-Paxos optimization, and participant reconfiguration illustrate the programming model. §4.1/Appendix A give a high-level Paxos proof; the manuscript promises a Stainless Paxos encoding in a later artifact, so that promise should not be reported as a retrievable completed artifact. The paper gives empirical key-value-store comparisons with etcd in one-data-center and three-region deployments, and a leader-failure experiment after 10 seconds with a 5-second timeout (§5). These are performance experiments rather than liveness proofs. Source/proof lines, proof runtime, and person-hours are not reported in the read manuscript. §8, p.26: implementations “will be made available with the non-anonymized version”. No official public source repository was verified from that promise; unrelated GitHub name matches were rejected.

**Inference.** Valuable agent design pattern: pick a component interface whose algebra supplies part of the correctness argument, then synthesize only the remaining local obligations. It also tests whether an agent mistakes executable Scala laws for verified networking and eventual progress.

### Deductive Verification of Temporal Collisions in Distributed Message Brokers

Illia Rochev, independent researcher. Zenodo/SSRN preprint, 2026. [Open record and PDF](https://zenodo.org/records/21594139); [SSRN DOI](https://doi.org/10.2139/ssrn.7095038). Zenodo's parent record 21298528 resolves to version record 21594139. Saved PDF has 20 pages. The API description says three brokers/12 models/108 configurations; the actual PDF adds Pulsar and reports four brokers/16 models/112 configurations. The write-up uses the PDF's figures.

**Human input.** The author writes TLA+ templates for broker consumer actions, chooses model parameters, defines a no-duplicate-execution invariant, writes runner and fault-injection code, and creates scenario descriptions for a separate LLM prediction experiment. These are hand-designed formal templates, not measured LLM-generated specifications. §6.2 explicitly contrasts the templates with LLM-generated models.

**What is checked.** TLC checks bounded safety models in which a result is stored, the consumer crashes before acknowledgment, and redelivery can repeat the effect. Despite the title's “deductive”, the reported verification is finite-state model checking, plus an informal structural argument. Liveness, ordering, and fairness are explicitly outside the checked invariant (§4.8, p.11). Six Docker/Toxiproxy experiments test whether predicted collisions appear in actual consumers. This is empirical cross-validation, not a refinement proof connecting all broker code to TLA+.

**Automatic work and numbers.** A runner renders configurations, invokes TLC, captures verdicts/traces, and for Kafka automates container provisioning and crash/restart testing; other brokers have manual fault-injection steps (§4.5). §4.1, p.7: “112 unique architecture configurations”. Tasks are bounded to 1–3 and maximum results to 1. §3.5, p.7: “120-second timeout”; states range 16–211,201, search depth 5–17. Table 1 reports faulty 10/10 violated; idempotent 3 violated/7 pass; dual-async 7 violated/3 pass; synchronization 55 violated/27 pass. §4.5, pp.9–10, reports 6/6 physical predictions matching. §4.6 reports GPT-4o-mini's “540 total API calls”, “Balanced Accuracy”, “47.8%”, and “$0.01”. That classification experiment compares predictions with TLC verdicts even though the paper identifies some TLC-model verdicts as artifacts. It is not an agent formal-proof success rate.

**Important limits visible in the source.** RabbitMQ idempotent models allow an execute branch even when a duplicate should be skipped. The author acknowledges these three false positives. Thirty RabbitMQ dual-async/synchronization PASS results are attributed to inadequate bounds and asserted to become violations at higher bounds, but the manuscript does not report those larger checks. Thus a claimed structural extrapolation is not an executed proof. Table 7's “All invariants proven” wording conflicts with its own violation results. Treat such wording as an author claim, not certification. “Fixture Pass” counts an SMT rejection of a corrupt specification as success, so its 100% score is not 100% correct formal specs or 100% safety.

**Concrete problem.** Kafka, RabbitMQ, NATS JetStream, and Pulsar consumers must avoid executing the same task twice across crash/redelivery. Tool: TLA+/TLC; author: Rochev. [Model/config/results artifact](https://zenodo.org/records/21298530). The paper says toolchain code is available on request; no public code repository is established. Spec/proof size and person-hours are not measured.

**Inference.** A useful evaluation case precisely because the model can be wrong: require an agent to fix the idempotent branch and separate bounded PASS, counterexample, structural argument, and physical experiment. Do not adopt the manuscript's cross-paper LLM comparison as a matched benchmark.

### Related addition: Reusable Formal Verification of DAG-based Consensus Protocols

Nathalie Bertrand, Pranav Ghorpade, Sasha Rubin, Bernhard Scholz, Pavle Subotić. NFM 2025; arXiv:2407.02167v2. [Paper](https://arxiv.org/abs/2407.02167), [source](https://github.com/pranavg5526/Reusable-Formal-Verification-of-DAG-based-Consensus). Existing PDF reused. The exact title and distinctive authors were absent from first-pass write-ups; found through the SoK's §3.1 and reference 5.

**Human input.** The team studies five protocols, writes separate DAG-construction and ordering specifications, invents abstractions and inductive invariants, and writes structured TLA+ proofs. **What is proved**: safety, including integrity and common ordering, for DAG-Rider, Cordial Miners, Hashgraph, Eventual Synchronous BullShark, and a minor Aleph variant. These are parameterized protocol specifications, not a proved implementation. §2 explicitly leaves liveness outside its focus. **Automatic work**: TLAPS discharges leaf obligations in supplied proofs; reusable components reduce repeated human arguments.

**Numbers.** §4, p.16: “approximately 14 person-months, distributed across 5 people”. Table 1 compares five reusable specifications: spec lines 403/160/230/272/136; proof lines 460/594/554/822/2120; invariants 6/6/7/10/18; obligations 633/895/665/1302/3316; checking seconds 49/68/74/125/651. These are component totals, not five separate end-to-end protocol code sizes. The abstract claims almost-half effort reduction; the measured 14 person-month figure does not itself establish a controlled no-reuse baseline.

**Exact numeric evidence.** Table 1, p.16: “Size of spec. (# loc) 403 160 230 272 136”; “Size of proof (# loc) 460 594 554 822 2120”; “# obligations in TLAPS 633 895 665 1302 3316”; “Time to check by TLAPS (s) 49 68 74 125 651”. Hardware: 2.10 GHz CPU, 8 GB memory, Windows 11, TLAPS 1.4.5. Concrete protocols appear separately in the problem table below.

**Inference.** Strong human-effort comparator for proof reuse, and an example where syntax/proof checking is automatic but the abstractions and proof decomposition consume substantial human time.

### Related addition: On the Formal Verification of the Stellar Consensus Protocol

Giuliano Losa and Mike Dodds. FMBC 2020, OASIcs 84, article 9. [Paper](https://doi.org/10.4230/OASIcs.FMBC.2020.9), [proof repository](https://github.com/stellar/scp-proofs). Existing PDF reused. Found through SoK §3.1 and reference 27; first-pass notes include Stellar quorum artifacts and a Veil example, but no write-up of this paper's complete safety/liveness methodology.

**Human input.** Humans supply a first-order model of quorums and balloting, axioms, safety invariants, liveness formulas, and a higher-order Isabelle model proving the abstraction sound. **What is proved**: agreement among appropriately intertwined well-behaved nodes and termination for intact sets under eventual synchrony, for arbitrary but fixed configurations. Abstract, p.9:1: “we verify safety and liveness under eventual synchrony”. This is about the formal protocol model, not a proof that a deployed implementation refines it, and it does not prove arbitrary dynamic membership changes.

**Automatic work.** Ivy transforms temporal obligations to safety checks and Z3 handles decidable first-order verification conditions; humans still develop invariants for the generated system. Isabelle checks soundness arguments connecting the first-order quorum abstraction to a more direct set-based model. §1, p.9:2: “The user can then verify that the synthesized transition system is safe”. The short paper omits detailed protocol safety/liveness proofs and points to the repository. It reports no measured person-hours, proof-line total, or solver timing.

**Concrete problem.** SCP balloting: prevent conflicting decisions and eventually decide under stated intact-set and synchrony conditions; tools Ivy/Isabelle/Z3; authors Losa/Dodds; paper/repo above; effort unquantified. **Inference:** a good test of whether an agent can justify an abstraction separately from proving properties in that abstraction.



## second pass: executable specifications and leases

## Specifying Paxos for System Builders: Pseudocode Made Executable

Yanhong A. Liu and Rahul Sihag. SSS 2026 invited paper; 41-page extended version, arXiv:2609.12239, submitted 10 September 2026. [Paper](https://arxiv.org/abs/2609.12239); [original Paxos-SB implementation](https://jhu-dsn.github.io/Paxos-SB.html); [DistAlgo](https://github.com/DistAlgo/distalgo). Saved PDF: `/hdd1/sichanghe/paper_collection/Specifying Paxos for System Builders- Pseudocode Made Executable, Yanhong A. Liu, Rahul Sihag, arXiv, 2026/paper.pdf`. Full text inspected, including protocol/code appendices.

**Human input.** Existing, detailed Paxos-SB pseudocode, plus manual transcription into DistAlgo, manually supplied initial values and helper functions, and consultation with the protocol's designers. This is considerably more input than a vague guarantee. §3.1, p.8: “initial values are not specified in the pseudocode except for 5 scalar variables in the recovery procedure, but we created all and confirmed them with the C code.”

**What was checked.** Runtime checks on the executable DistAlgo implementation, not a universal safety or liveness theorem. Agreement and validity were checked as safety; timeout-based progress checks found stuck executions. §4, p.15: “For Paxos-SB, usual agreement and validity properties were specified for safety, and various timeouts were specified for liveness.” The two liveness defects are in the published pseudocode, not the original C implementation: a surviving non-leader fails to count its own Accept, and both surviving servers fail to count their own View Change. §4.2 gives exact executions with one of three servers crashed. These are concrete missing-self-vote benchmark tasks. §3.4, p.15 states: “the recovery procedure is not implemented separately”; performance comparison omits disk writes.

**Automatic part.** Execute/compile DistAlgo to Python; inject process/communication failures; check the supplied queries; trace and visualize runs. Humans implement, interpret failures, repair the pseudocode, and confirm fixes. No LLM workflow or specification inference experiment is reported.

**Numbers.** Table 1, p.18: “Total 598” lines including comments and blank lines; §4.3, p.17: “about 370 lines” after excluding comments, blanks and setup; core protocol about 200. §1, p.2: original C implementation “about 7000 lines”; pseudocode “about 330 lines, spread in 13 figures”. §4.3, p.18: “running 3 servers with 2 clients and 100,000 requests each client takes less than 170 seconds, averaged over 5 runs”; “average latency of each request is less than 1.7 ms”; “about 10 times the running time of the C code.” Hardware: Intel Core Ultra 7 258V, 32GB RAM, Windows 11, Python 3.9.13, DistAlgo 1.2.0b2. No hours of human effort or exhaustive success denominator reported.

**Inference for our goal.** A precise runnable specification can expose progress defects with a very small fault scenario. Evaluate whether an agent fills omitted initializations and detects the missing self-votes, then distinguish passing runtime traces from an unbounded proof.

## PaxosLease Revisited: A Checked Model of Diskless Distributed Leases

Márton Trencséni. arXiv:2609.14640v2, 1 October 2026; preprint, no conference claimed. [Paper](https://arxiv.org/abs/2609.14640); [complete artifacts and recorded results](https://github.com/mtrencseni/paxoslease-revisited). Saved PDF: `/hdd1/sichanghe/paper_collection/PaxosLease Revisited- A Checked Model of Diskless Distributed Leases, Márton Trencséni, arXiv, 2026/paper.pdf`. Full text inspected, including evidence inventory and authorship appendix.

**Human input.** The original 2012 protocol, historic Keyspace/ScalienDB C++ implementations, an explicit clock/crash/network model, manual choices of rules and finite configurations, and line-by-line review. Appendix F, p.15: “Large language models produced much of the TLA+ specifications and TLC configurations, the TLAPS proofs, the Python programs, the source audit, and some of the article prose, under the author’s manual, iterative direction, with line-by-line reviews and rewrites; the overall process spanned months.” Models/prompts, calls, acceptance rates and manual hours are not identified.

**What was proved/checked.** Safety: at most one proposer has authority at a time. TLC exhaustively checks small, explicitly bounded TLA+ graphs. TLAPS checks six arithmetic obligations, not a complete parameterized distributed protocol proof. Appendix E, p.15: “They are arithmetic facts; the protocol-level premises they are applied to are the argument of Section 4, checked by TLC.” The prose safety argument is manual. §4, p.5: “This is a safety argument only.” Liveness needs eventual delivery, accurate timers, an available quorum, and protection against competing proposers; it is discussed rather than proved. Python models replay selected schedules and assert invariants; an audit and executable witnesses identify implementation bugs. There is no refinement theorem from TLA+ to production C++ or the demonstration Python program. §9, p.7 states: “we did not run the described executions against the shipped binaries”.

Three acceptor changes: reject lower ballots after an accept; refuse to replace another owner's live lease; quarantine a restarted acceptor for a proposer-attempt duration. Owners must include proposer incarnation. §5, p.5 bounds the successful checks: “at most two proposers, three acceptors, three ballots, one restart per proposer, a time horizon of three units”; configurations also cap messages in flight. Table 3 explicitly records learner deadline/clock rules as outside the base model.

**Automatic part and evidence.** TLC finds counterexample schedules after scripted weakening of individual rules; TLAPS checks arithmetic proofs; Python tests replay negative witnesses; Make targets parse artifacts and verify recorded counts. Table 1, p.6 has five variants and traces of 27, 36, 18, 36 and 43 states. Table 2, p.14 includes 491,037 base states, 37,425,056 crash/restart states, and 76,749,192 states at quarantine equal to proposer duration. The two below-bound configurations fail in 25/26 states. Completed Retry and Renew+Retry runs have 2,179,760,458 and 2,411,951,538 distinct states. Two larger searches stop at 3,863,685,436 and 4,461,465,229 states: “stopped, no violation” is not an exhaustive pass. Appendix E reports substantial TLC fingerprint-collision estimates for the largest completed runs, so even their completeness is qualified. Eighteen structured Python witnesses cover known failures, seventeen expected to fail for the named reason and one demonstrating a fenced repair.

**Human effort and runtime.** Appendix F, p.15: “takes more than 40 hours on a 4-core, 8-thread Xeon server with 64 GB of memory”; most runtime is in the billion-state searches. Human-directed work “spanned months”, with no tighter effort accounting. This is unusually direct evidence of LLM help producing distributed verification artifacts, with the human contribution stated plainly.

**Inference for our goal.** This gives reproducible safety bug tasks, mutation tests, and a record of which tool supports each claim. It also shows why an agent evaluation must distinguish a finite TLC check, a checked arithmetic lemma, a selected executable witness and a proof about all executions. Its negative variants are more useful for measuring error detection than raw billion-state counts.

## A Practical TLA+ Library for Designing and Verifying Distributed Systems

Diogo Canut Freitas Peixoto and Odorico Machado Mendizabal. LADC 2025, proceedings pp.183–200; Springer CCIS 2697 chapter published 12 February 2026. [SBC record](https://sol.sbc.org.br/index.php/ladc/article/view/41078); [publisher chapter](https://doi.org/10.1007/978-3-032-11539-3_11); [library and examples](https://github.com/diogocanut/tla-communication-module).

**Full-text gap.** The SBC link labelled PDF redirects to the subscription-only Springer chapter, and OpenAlex reports no open PDF. No PDF saved for this title; do not mistake the open precursor below for this full paper. Publisher abstract: “We formally verified classic atomic broadcast properties for the library’s primitives”; it also says “specifying and verifying the Deferred Update Replication Protocol.” These are abstract-level claims; exact checked properties, configurations, state counts, effort and proof/code sizes remain unverified without the chapter. Human input is a TLA+ protocol model composed from predefined channel abstractions and chosen communication faults; this interpretation is supported by the repository's examples, but the publication's precise workflow remains a full-text gap. Current repository tests are model safety/temporal checks with TLC, not a code-refinement theorem; current repository content may have grown after publication.

**Inference for our goal.** A reusable library makes communication assumptions selectable rather than forcing each agent to invent them. That is useful for assumption-discovery evaluation; a reliable broadcast abstraction must not be mistaken for verified implementation of reliable broadcast.

## Choreo: A Framework for Modular and Reusable Formal Specifications of Distributed Protocols (2025)

Exact paper title not found in OpenAlex title/keyword searches, Semantic Scholar search, arXiv API (rate-limited), or the official [Choreo repository](https://github.com/quint-co/choreo); that existing Quint library is already covered in first-pass `03_spec_tools_and_tla_to_code.md` and `05_llm_agents.md`, so no paper/PDF or new proof claim is asserted.

## Newly found related work absent from the first pass

### Reusable TLA+ Communication Primitives for Modeling and Verifying Distributed Systems

Diogo Canut Freitas Peixoto and Odorico Machado Mendizabal. WTF 2025, pp.113–125. [Open paper](https://sol.sbc.org.br/index.php/wtf/article/view/35652); [source](https://github.com/diogocanut/tla-communication-module). This is reference 17 of the Practical TLA+ Library chapter and its explicitly identified preliminary version. Saved PDF: `/hdd1/sichanghe/paper_collection/Reusable TLA+ Communication Primitives for Modeling and Verifying Distributed Systems, Diogo Canut Freitas Peixoto, Odorico Machado Mendizabal, WTF, 2025/paper.pdf`. Full 13-page text read.

**Human input and automation.** Humans write PlusCal Echo process bodies, three temporal properties, choose link semantics, fairness and drop/duplication bounds. PlusCal translates to TLA+; TLC explores the bounded model automatically. §5.5, PDF p.9: “We delegate the handling of message-dropping non-determinism to the end user”; eventual delivery of inbox messages is also the user's responsibility. No code correspondence proof or autonomous requirement inference.

**Checked properties.** §6, PDF p.10: “If process A sends a message m, then process A eventually delivers m”; “Eventually both process A and B will receive the FIN signal and terminate”; received messages must previously have been sent. Thus two liveness checks and one safety check on a model. Perfect FIFO communication passes for finitely many messages. Fair-loss without retry can deadlock before temporal checking; §6.2: “particularly when MaxDrops was set to a value greater than zero.” With stubborn delivery and two copies, termination and eventual return can fail under duplication/reordering, while no-creation remains true. §6.3, PDF p.12: “We set the value of MaxCopies to two”; “Property 3 was the only property that held true”. No state counts, timings, LOC or manual hours are reported.

**Inference.** Useful small evaluation tasks: specify FIN handling, duplicate elimination and retry; ask an agent to identify which network/fairness assumptions make eventual return true. The paper's 'perfect' implementation is FIFO, stronger than perfect links generally need to be; keep the exact library semantics in the evaluation.

### What's Live? Understanding Distributed Consensus

Saksham Chand and Yanhong A. Liu. arXiv:2001.04787v2, 21 June 2021; shorter PODC 2021 brief announcement. Directly referenced as CL20/CL21 by Specifying Paxos. [Full paper](https://arxiv.org/abs/2001.04787); [PODC author PDF](https://www.cs.stonybrook.edu/~liu/papers/Liveness-PODC21.pdf). Existing collection PDF reused: `/hdd1/sichanghe/paper_collection/What's Live- Understanding Distributed Consensus, Saksham Chand, Yanhong A. Liu, arXiv, 2021.pdf`. Full main text, experiment appendix, and protocol evidence appendices consulted; no new PDF saved.

**Human input.** Humans extract published liveness statements and assumptions, formalize them in a temporal language and TLA+, compare implication relationships, and supply existing Paxos models plus finite process/round bounds. There is no LLM specification generation. This is primarily an analytical comparison, supplemented by finite TLC experiments, not newly verified implementation code.

**Main result and numbers.** §1, p.2: “out of the 31 algorithms listed in Table 1, only 18 (58%) of them mention liveness”; “only 11 (35%) of them give some kind of liveness proof”. The authors distinguish three link assumptions, seven server assumptions and six progress assertions (§1 pp.2–3). Reaching a quorum vote, some server learning, executing and answering the client are different guarantees. The proof hierarchy is mathematically argued; TLC experiments illustrate finite single-value Paxos liveness patterns. §1, p.3: “on up to 4 proposers and 4 acceptors in a few hours”, while multi-value or larger models are too expensive. Appendix A uses an explicit tick bound (Figure 7), not a theorem over arbitrary implementation executions. Human hours and model LOC are unstated.

**Inference.** This is a particularly useful reference for evaluating whether agents silently weaken the user's intended progress. 'Eventually there is a live majority' can mean a changing majority or one fixed majority, and 'consensus progresses' can stop short of responding to every request. An agent should expose those choices explicitly.

### Assurance of Distributed Algorithms and Systems: Runtime Checking of Safety and Liveness

Yanhong A. Liu and Scott D. Stoller. RV 2020 tutorial, LNCS 12399, pp.47–66; arXiv:2008.09735v2. Direct reference LS20 in Specifying Paxos. [Full paper](https://arxiv.org/abs/2008.09735); [polling/checker source](https://github.com/DistAlgo/examples/tree/master/polling); [tutorial](https://distalgo.cs.stonybrook.edu/tutorial). New PDF: `/hdd1/sichanghe/paper_collection/Assurance of Distributed Algorithms and Systems- Runtime Checking of Safety and Liveness, Yanhong A. Liu, Scott D. Stoller, RV, 2020/paper.pdf`; full 19-page text read.

**Human input.** A complete distributed program and its inputs, executable safety/progress queries, fault configurations, and explicit timeout values. §7, p.14 lists the three inputs: “A distributed algorithm, plus input taken by the algorithm”; “Safety and liveness requirements to be checked”; “Process and communication failures to be considered”. The polling example has a poller ask ten processes a question, receive replies, and broadcast the outcome. Humans implement the checker and choose which events and logical/real times to observe.

**Guarantee and automation.** Check observed executions of runnable DistAlgo code. Safety includes having all replies before publishing the result and all respondents receiving the same result. Progress includes receiving a reply and all respondents receiving the outcome, within supplied deadlines. §1, p.2: “the liveness properties we check are bounded liveness”; §4, p.9: “imposing this time bound changes the liveness property to a safety property.” The framework automatically intercepts messages, collects timestamps, evaluates user queries and emits timeout witnesses, without modifying the original algorithm body. This is runtime verification, not a proof that all executions eventually complete.

**Numbers.** Figure 1, p.5 has a 24-line polling program (including setup); Figure 2, p.11 has a 41-line safety checker/program listing; Figure 3, p.13 sets `TIMEOUTS = { 'q-r':0.00001, 'o-o':0.0001, 'total':1 }` seconds. §7, p.15: “increased the timeout for ’o-o’ to 0.01 seconds”; then “no (L2) timeout was reported in all dozens of runs checked.” At “message loss rate of 10%”, some runs have total/all three timeout failures. These are demonstration observations without a fixed evaluation denominator or false-alarm rate; no manual hours stated.

**Inference.** Useful for evaluating whether an agent chooses executable events, distinct sender identity and reasonable observation deadlines. A monitor's timeout failure can reflect its observation channel and chosen threshold; the agent must explain what the monitor actually establishes.

### Moderately Complex Paxos Made Simple: High-Level Executable Specification of Distributed Algorithms

Yanhong A. Liu, Saksham Chand and Scott D. Stoller. PPDP 2019; extended arXiv:1704.00082v4, 12 August 2019. Direct reference LCS19 in Specifying Paxos. [Full paper](https://arxiv.org/abs/1704.00082); [author proceedings PDF](https://www3.cs.stonybrook.edu/~stoller/papers/ppdp2019.pdf); artifact address in paper is `darlab.cs.stonybrook.edu/paxos` (HTTPS failed at retrieval); [DistAlgo](https://github.com/DistAlgo/distalgo). New PDF: `/hdd1/sichanghe/paper_collection/Moderately Complex Paxos Made Simple- High-Level Executable Specification of Distributed Algorithms, Yanhong A. Liu, Saksham Chand, Scott D. Stoller, PPDP, 2019/paper.pdf`; extended full text and proof appendix read.

**Human input and automation.** Humans start from Lamport's English and van Renesse/Altinbuken's detailed pseudocode; restructure it into message-history queries, manually translate the DistAlgo specification into TLA+, choose invariants and manually develop proofs. §6, p.18: “This was done systematically but manually”; §6.1: “Our proofs are manually developed and automatically machine-checked using TLAPS”. Direct execution compiles through DistAlgo; TLAPS automates obligation checking. Earlier automatic translators existed but were not used for these proofs because they introduced difficult low-level control detail. No intent-only input, LLM generation or automated invariant inference is claimed.

**What was proved.** Safety of TLA+ models of Multi-Paxos with preemption, replicated state-machine behavior, reconfiguration, state reduction and failure detection. §6, p.18: “for each slot, only a single command may be decided and it must be one of the commands proposed.” This is a proof about manually translated models, with no machine-checked translation/compiler refinement proof claimed. Liveness defects under lost messages are identified and timeout repairs discussed, not formal liveness proofs. The lost-slot defect prevents replicas from applying any later decisions and eventually exhausts the proposal window; missing Phase-1/Phase-2 replies can block a leader. §4 cautions that the source pseudocode assumes fair links/retransmission, so these are defects under weaker transport assumptions, not violations of its stated reliable-link model. A failed safety proof also exposed a preemption bug in an earlier author-written specification (§6.2).

**Numbers.** §3.2, p.11: new core DistAlgo specification “51 vs. 142 lines” of original pseudocode (100 without scope-ending lines). §6, pp.18–19: translated TLA+ models 154, 157, 217 lines; proofs 4,959, 5,005, 7,006 lines excluding comments. Figure 5, p.23 gives 4,364, 4,517, 5,580 TLAPS obligations and 590, 569, 781 seconds respectively on i7-4720HQ, 16GB, Ubuntu 16.04, TLAPS 1.5.2. Main-text approximate timings differ in rounding/order; use the appendix table for exact values. §5.4, p.17 reports 10 processes/10 requests, “77.822 milliseconds (ranging from 74.141 to 84.825), averaged over 10 runs” on i7-6650U/16GB/Windows10/Python3.7. No manual effort duration stated.

**Inference.** A valuable stronger-specification benchmark: it measures manual modeling and proof burden after practical details are retained. The model/proof sizes show why comparing proof LOC without matching guarantees and translation trust is misleading.

### Towards a Formal Verification of the Lightning Network with TLA+

Matthias Grundmann and Hannes Hartenstein. arXiv:2307.02342v1, 5 July 2023, work-in-progress. Direct reference in the Practical Library bibliography. [Full text](https://arxiv.org/abs/2307.02342); normative [BOLT source](https://github.com/lightning/bolts), separate TLA+ artifact not located. New PDF: `/hdd1/sichanghe/paper_collection/Towards a Formal Verification of the Lightning Network with TLA+, Matthias Grundmann, Hannes Hartenstein, arXiv, 2023/paper.pdf`; full main text and appendices read.

**Human input.** Humans formalize the BOLT payment-channel protocol, Bitcoin transactions, adversarial actions, ideal payment channels and ideal payment network; design time and single-channel abstractions and refinement mappings; give pen-and-paper composition arguments. §IV/Figure 5 decomposes the protocol into ten specifications and nine proof steps. TLC checks two difficult finite refinement steps, while the other steps require manual mathematical reasoning. This is no intent-to-model automation or source-code verification.

**Guarantee and limitations.** Security safety: an adversary cannot steal an honest user's funds; intermediates' total balances are preserved by multi-hop forwarding, and sender/recipient amounts are correct. However, the abstract's broad fulfillment language must be read with the introduction, PDF p.1: “Our work is still in-progress and, thus, not all steps are complete”. §V says “currently working on fully formalizing every step of the proof.” The contribution is a partially checked refinement architecture, not a completed universal theorem or implementation proof. Weak fairness appears in the ideal withdrawal model, but the reported central result is funds safety rather than a complete liveness proof. §IV checks `(IV) ⇒ (V)` and `(IX) ⇒ (X)` by model checking; no model-state counts, runtimes, LOC or human hours are stated.

**Bugs and inference.** §III-B reports “two subtle flaws” in an earlier published formalization (Kiayias/Litos, CSF 2020), one exposed by model checking an analogous error in the authors' own draft. Appendix D explains penalty logic and HTLC transaction-signature/locktime issues. These are formalization defects, not demonstrated defects in shipped Lightning binaries. Useful as an agent task for constructing and justifying intermediate abstractions; any evaluation should require agents to distinguish proposed composition from already checked refinements.

### Quartz: A Framework for Engineering Secure Smart Contracts

John Kolb, John B. Yang, Randy H. Katz and David E. Culler. UC Berkeley technical report UCB/EECS-2020-178, 31 August 2020. Direct Practical Library reference. [Report and open PDF](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2020/EECS-2020-178.html). Separate implementation repository not located; appendices provide language grammar and generated auction PlusCal. New PDF: `/hdd1/sichanghe/paper_collection/Quartz- A Framework for Engineering Secure Smart Contracts, John Kolb, John B. Yang, Randy H. Katz, David E. Culler, UC Berkeley technical report, 2020/paper.pdf`; full main text, references and code appendices read.

**Human input and automation.** Humans write an extended finite-state-machine contract in a DSL (fields, typed parameters, guards, authorization, transition actions), choose invariants and finite search bounds (identities, integer values, time and call-stack depth), interpret counterexamples and repair the DSL. §4.1, printed p.6: “a contract author must write the invariants she would like to have verified”; Quartz then “fully automates the more difficult task of writing a formal specification”. The generator emits PlusCal/TLA+ including Ethereum exceptions and adversarial reentrancy; TLC automatically searches the bounded model. A second generator emits deployable Solidity. No verified correspondence theorem between generated Solidity and checked TLA+ is claimed. The guarantee is finite model safety for user-selected invariants, not consensus correctness, full unbounded liveness or a production-code proof.

**Numbers and effort.** Abstract: “16 contract case studies”. Table 2, p.9: auction 33 DSL/40 handwritten Solidity/53 generated Solidity/205 TLA+ lines; ERC-1540 114/143/181/464; ERC-1850 110/182/242/588; DAO 126/126/150/390. §6.1, p.8 reports mean DSL/handwritten Solidity ratio 0.68 and minimum 0.34; this is a concision proxy, not measured human time. §6.2, p.9 uses TLC 2.13, i7-6700, 32 GiB and eight workers. Auction highest-bid safety fails when token refund throws, found “in 2 seconds”; reentrancy overwrites a larger bid, “in 6 seconds”. Auction balance ≥0 fails under reentrant withdrawal “in 15 seconds” (§6.2.1, p.10). ERC-1540 share conservation counterexample takes “4 minutes”; separate transfer arithmetic failure “27 minutes” (§6.2.2, p.10). After inspection, humans add two lines resetting shares on ownership conversion. Gas comparison against manually written Solidity on private Geth 1.8.26/Clique: §6.3, p.11, overhead “53% for the simple ERC-1630 contract”; substantial contracts “never exceeds 20%”. Figure 8 gives ratios 0.82–1.53. No author-hour or contract-repair-count aggregate is given.

**Inference.** This is adjacent to the brief rather than a distributed consensus proof: the smart contract is a multi-party protocol atop an assumed ledger. It is useful for measuring generation of executable specifications, vulnerability witnesses and source repairs with the explicit limitation that bounded-model checking plus code generation does not prove the deployed compiler pipeline.

## Concrete cases

| problem and property | tool/person; evidence and artifact |
|---|---|
| Paxos-SB missing self-vote, surviving follower eventually executes/responds; missing View Change self-vote, system resumes progress | DistAlgo runtime checks; Liu/Sihag; 598 total lines (Table 1), two three-server failure schedules (§4.2), [paper](https://arxiv.org/abs/2609.12239), [original source](https://jhu-dsn.github.io/Paxos-SB.html); executable listing in Appendix B, distinct downloadable new source not located |
| polling: collect all replies before result; consistent outcome; response/outcome within deadlines | DistAlgo runtime checking; Liu/Stoller; 24-line protocol, 41-line safety listing, ten respondents; [paper](https://arxiv.org/abs/2008.09735), [source](https://github.com/DistAlgo/examples/tree/master/polling) |
| detailed Multi-Paxos safety: one proposed command per slot, with optimization variants | TLA+/TLAPS; Liu/Chand/Stoller; 154–217 model lines, 4,959–7,006 proof lines; [paper](https://arxiv.org/abs/1704.00082), [project artifact address](http://darlab.cs.stonybrook.edu/paxos) unavailable during retrieval; [DistAlgo proof repository](https://github.com/DistAlgo/proofs), although its vRA directory currently holds only an empty README |
| diskless lease mutual exclusion under bounded crashes/restarts/time | TLC finite safety, TLAPS arithmetic, Python witnesses; Trencséni; Table 2 bounded state counts above; months manual iteration, >40h full checks; [paper](https://arxiv.org/abs/2609.14640), [source](https://github.com/mtrencseni/paxoslease-revisited) |
| lease-plus-Multi-Paxos admission barrier: leader recovers its own epoch before accepting new work | abstract TLC composition, deterministic Python protocol model; Trencséni; Table 2 “Lease+Paxos” 2,095 states, pass; [paper Appendix A](https://arxiv.org/abs/2609.14640), [source](https://github.com/mtrencseni/paxoslease-revisited) |
| Echo eventual return, FIN termination, no invented message under perfect/lossy/duplicating channels | PlusCal/TLA+/TLC; Peixoto/Mendizabal; MaxCopies=2, sizes/time/effort unstated; [open precursor](https://doi.org/10.5753/wtf.2025.8866), [source](https://github.com/diogocanut/tla-communication-module/tree/main/protocols/echo) |
| Lightning payment-channel funds safety and multi-hop refinement | TLC plus manual abstractions/proofs; Grundmann/Hartenstein; ten specifications, nine steps, two checked refinements, unfinished overall proof; [paper](https://arxiv.org/abs/2307.02342), [normative BOLT source](https://github.com/lightning/bolts); separate TLA artifact unavailable |
| auction reentrancy/refund safety; ERC-1540 share conservation | Quartz DSL → TLA+/TLC and Solidity; Kolb/Yang/Katz/Culler; auction witnesses 2/6/15 seconds, share witnesses 4/27 minutes; [open report](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2020/EECS-2020-178.html); generated PlusCal in appendix, separate repo not located |
| Deferred Update Replication and atomic broadcast | Peixoto/Mendizabal; chapter abstract claims verification, full properties/counts unavailable; [chapter](https://doi.org/10.1007/978-3-032-11539-3_11), [source model](https://github.com/diogocanut/tla-communication-module/blob/main/protocols/DeferredUpdate.tla) |

## Search and remaining leads

The web search tool returned HTTP 404 (`Cannot POST /alpha/search`); requests against primary arXiv/publisher/author/GitHub pages, OpenAlex and Semantic Scholar were used. Every title above was searched against `0[1-9]_*.md`; Choreo/DistAlgo general tooling already present, but the specific newly written cards were absent. New PDFs were checked for `%PDF` before saving; existing What's Live PDF reused.

Related-work sections contain further absent leads that remain **not fully audited**: Shivam/Paladugu/Liu, *Specification and Runtime Checking of Derecho* (2023); Bodade's *Formal Specification and Runtime Checking of Lumiere* thesis (2025); House/Tang's *A TLA+ Module for Asynchronous Message-Passing Systems* (2018); the Pastry and Zab TLA+ papers; original PaxosLease (2012), Keyspace (2012), ScalienDB (2013), and Paxos Quorum Leases (2014). The last four are protocol/implementation background rather than established formal-verification papers; they were not counted as additional verified cases. The first-pass grep found none of those exact titles. Derecho was identified by Crossref (DOI 10.1145/3584684.3597275), but ACM returned 403 and guessed author PDFs 404; Lumiere thesis full text was not located; House/Tang (DOI 10.1109/SECON.2018.8479004), Pastry (DOI 10.1007/978-3-642-21461-5_16), and Zab (DOI 10.1007/s11390-020-0538-7) were identified but primary full texts were inaccessible. These remain retrieval gaps; this fragment does not present them as read papers. Generic protocol/background references were not silently treated as verified code cases.


## Rust cryptographic protocol implementations

### Formal Security and Functional Verification of Cryptographic Protocol Implementations in Rust (2025)

Karthikeyan Bhargavan, Lasse Letager Hansen, Franziskus Kiefer, Jonas Schneider-Bensch, Bas Spitters. ACM CCS 2025, pp. 2729–2743. [Publisher](https://doi.org/10.1145/3719027.3765213), [open ePrint landing page](https://eprint.iacr.org/2025/980), [advertised PDF](https://eprint.iacr.org/2025/980.pdf), [hax repository](https://github.com/cryspen/hax).

**Full-text gap:** the paper exists, and its ePrint page advertises an open PDF, but both that PDF and the ACM PDF returned HTTP 403. OpenAlex and Semantic Scholar exposed no alternative PDF. Author-page and GitHub searches did not find a copy. I could read only the abstract; consequently I cannot substantiate full theorem scope, evaluation numbers, human effort, or related-work coverage.

**What can be established from the authors' abstract:** the human writes Rust annotations and chooses the prover. Exact evidence: “All analysis tasks are driven by the software developer who writes annotations in the Rust source code and chooses a backend prover”. The authors describe runtime safety, parsing correctness, and cryptographic security, evaluated on Bert13, a Rust post-quantum TLS 1.3 implementation. This is an implementation-verification claim, not an abstract-only protocol result; the accessible abstract supplies no liveness claim. The translation pipeline is hax; prover choice includes F*, ProVerif, and SSProve. **Inference:** useful for separating proof-tool selection and source annotations from automatic checking. These remain abstract-level observations, not a full-text review.

### OwlC: Compiling Security Protocols to Verified, Secure, High-Performance Libraries (2025)

Pratap Singh, Joshua Gancher, Bryan Parno. USENIX Security 2025, pp. 5071–5090. [Paper and presentation](https://www.usenix.org/conference/usenixsecurity25/presentation/singh), [PDF](https://www.usenix.org/system/files/usenixsecurity25-singh.pdf), [code](https://github.com/secure-foundations/owl), [archived artifact](https://doi.org/10.5281/zenodo.15605318). Full paper, §§1–12 and Appendices A–C, read. Existing collection PDF reused: `OwlC- Compiling Security Protocols to Verified, Secure, High-Performance Libraries, Pratap Singh, Joshua Gancher, Bryan Parno, USENIX Security, 2025.pdf`. Publisher full text read.

**Human input:** a protocol written in Owl, including parties, key declarations, message formats, procedures, information-flow types, and security conditions. The new WireGuard and HPKE designs/security specifications were written by the authors. Applications written directly in Verus additionally need a handwritten effect specification and loop invariant (§7.2). This paper does not start with vague English requirements.

**What is proved:** Owl checks computational secrecy and authenticity under cryptographic assumptions. Generated Rust library routines are checked by Verus to follow their effect specification, return its results, and obey a source-level discipline preventing secret-dependent operations. This is safety/security about generated executable source code. Exact evidence, §4.1, p. 5075: “our ITrees only handle terminating computations and cannot handle general loops.” There is no distributed eventual-delivery proof. Termination of the finite mathematical specification is not a network progress theorem.

**Automatic part:** OwlC emits executable Rust and its Verus specification; Verus checks their agreement. §4.2, p. 5076: “verification proceeds completely automatically just using the ITree specification and the executable code.” Owl checking of the human design precedes this step. The specification compiler is trusted; the implementation compiler need not be. Cryptographic library bindings, I/O axioms, Owl, Verus, and rustc remain trusted (§2.1). Source-level timing protection does not establish assembly/hardware protection (§1). WireGuard's surrounding UDP, virtual device, packet demultiplexing, and rekey timers are outside the verified core (§9.2).

**Numbers, with original table evidence:** Figure 13, p. 5082, labels the columns “LoC” (Owl, Verus) and “Verif. Time (s)” (Owl, Verus). These are design LOC, generated LOC, design checking seconds, and implementation checking seconds respectively; generated LOC is not manual effort. Exact rows:

```text
Basic-Hash                     52    849    2.8     2.0
Hash-Lock                      62  1,489    3.8     2.9
LAK                            76  1,699    3.4     3.2
MW                             77  2,051    5.8     4.3
Feldhofer                      36    825    0.9     1.6
Private Auth                   76  1,653   10.1     3.0
Needham-Schroeder (sym)        115  2,743    6.8     4.9
Needham-Schroeder (pub)         95  2,299   25.8     3.5
Otway-Rees                    221  5,210   27.3    10.7
Yahalom (sym)                 175  4,028   13.4     7.4
Denning-Sacco (pub)            103  2,133    7.9     3.1
Core Kerberos                 274  4,376   15.5     6.4
Diffie-Hellman Key Ex           78  1,266    9.6     2.4
SSH Forwarding Agent          223  3,130   33.0     4.5
WireGuard                     910  6,499  659.8    13.1
HPKE                          332  4,030   83.0     7.8
```

The fourteen older designs are simplified; their interoperability/performance was not evaluated (§10.1). The timing setup uses an i7-12700K, 32 GB RAM, Ubuntu 20.04 (§10). Figure 13's caption says: “In all cases, OwlC compiles the protocol to Verus in under a second.” That excludes design and implementation proof-checking time shown in the table. Human hours for writing designs are not reported.

**Concrete verified cases:** shared [paper](https://www.usenix.org/system/files/usenixsecurity25-singh.pdf) and [source](https://github.com/secure-foundations/owl) apply to every row; the table above supplies the exact size/time evidence.

| problem | guarantee and tool |
|---|---|
| WireGuard core handshake and transport | secrecy and authenticity, conditioned on clean sessions and key compromises; Owl design checking plus Verus Rust refinement; replay-once, anonymity, full dynamic-compromise forward secrecy, and whole VPN code are outside scope (§9.2) |
| HPKE AuthPSK | secrecy/authenticity for the strongest authentication mode under the stated extended PRF-ODH assumption; Owl plus Verus; other HPKE modes and stronger CCA properties are future work (§9.3, Appendix C) |
| Basic-Hash | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| Hash-Lock | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| LAK | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| MW | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| Feldhofer | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| Private Auth | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| Needham–Schroeder (symmetric) | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| Needham–Schroeder (public) | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| Otway–Rees | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| Yahalom (symmetric) | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| Denning–Sacco (public) | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| Core Kerberos | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| Diffie–Hellman Key Ex | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| SSH Forwarding Agent | simplified Owl design security plus Verus-checked generated Rust refinement; exact size/check times above, human hours not reported (§10.1) |
| secure echo server | one-round application checked in Owl, or fuel-bounded handwritten Verus specification with a loop invariant; infinite wrapper in the Owl variant is trusted (§7) |

**Inference for the end goal:** OwlC demonstrates a reusable route from a precise, checked human protocol design to executable Rust and an automatically checked refinement. It supports evaluating whether agents supply the right security types and assumptions before running the compiler. It supplies no measured success rate for agents discovering those inputs.



### Related work absent from the first pass: Owl (2023)

**Owl: Compositional Verification of Security Protocols via an Information-Flow Type System.** Joshua Gancher, Sydney Gibson, Pratap Singh, Samvid Dharanikota, Bryan Parno; IEEE S&P 2023. [Full paper](https://www.andrew.cmu.edu/user/bparno/papers/owl.pdf), [ePrint record](https://eprint.iacr.org/2023/473), [source and 2023 release](https://github.com/secure-foundations/owl/releases/tag/ieee-sp-2023). Found through OwlC §11/reference 42. No `Owl` title occurred in `01`–`09`. Open PDF saved under `Owl- Compositional Verification of Security Protocols via an Information-Flow Type System, Joshua Gancher et al., IEEE SP, 2023/paper.pdf`.

Humans write protocol routines, parties, names and keys, secret/public labels, result refinements, module interfaces, corruption case splits, and endpoints in the Owl language (§3, §§5.1–5.2). The checker automatically establishes computational secrecy and authenticity for that *protocol description*, under cryptographic assumptions and static corruption; refinement obligations go to Z3. Its temporal authentication claim says an accepted message was previously sent, which is safety, not eventual delivery. The theory is an on-paper proof for the core calculus, and does not formally model the surface language's indices or `happened` event predicate (§4). Exact input/automation anchor: “requires no manual proof effort, except for writing the protocol itself in OWL” (§5.1, p.12). This includes the type specifications, rather than deriving them from vague wishes.

The 2023 Rust extractor produces runnable prototypes, but the paper explicitly says it is “not yet verified for functional correctness or security” (§3.4, p.6). Thus the 2023 result must not inherit OwlC's later generated-implementation verification. It uses trusted extraction, RustCrypto and TCP (§5.2); extraction discovered an unrealizable public-key message size in Private Authentication, then humans changed the protocol to hybrid encryption (§6, p.14). Other explicit limits: static corruption, asymptotic rather than concrete security bounds, no unlinkability or injective correspondence, and no Kerberos session-key freshness proof (§§1, 3.4, 6).

Numbers: Figure 13 (p.13) reports the following exact numeric cells, in order Owl lines / generated Rust lines / check seconds: Basic-Hash `46 / 541 / 0.71`; Hash-Lock `61 / 682 / 0.96`; LAK `73 / 998 / 1.09`; MW `76 / 947 / 1.12`; Feldhofer `35 / 421 / 0.32`; Private Authentication `59 / 794 / 0.47`; symmetric Needham–Schroeder `108 / 1207 / 2.48`; public-key Needham–Schroeder `80 / 1019 / 7.74`; Otway–Rees `197 / 2589 / 5.77`; symmetric Yahalom `164 / 2007 / 3.27`; public-key Denning–Sacco `91 / 1368 / 1.19`; simplified Kerberos `270 / 3292 / 8.21`; Diffie–Hellman key exchange `80 / 719 / 2.38`; simplified SSH forwarding agent `183 / 1445 / 9.77`. §5 p.12 reports approximately 7,300 Haskell framework lines plus 580 shared Rust lines. No protocol authoring hours are reported.

Inference for our goal: module types are useful reusable specifications; the natural-language-to-types work, corruption model, and missing freshness/injective-authentication requirements remain human obligations. Extracting and testing a model exposes omissions but does not prove implementation refinement.

Concrete problem rows (compact):

| Problem | Guarantee and tool | Human input / size |
|---|---|---|
| Basic-Hash | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 46 Owl lines; detailed numeric cells above |
| Hash-Lock | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 61 Owl lines; detailed numeric cells above |
| LAK | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 73 Owl lines; detailed numeric cells above |
| MW | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 76 Owl lines; detailed numeric cells above |
| Feldhofer | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 35 Owl lines; detailed numeric cells above |
| Private Authentication | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 59 Owl lines; detailed numeric cells above |
| symmetric Needham–Schroeder | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 108 Owl lines; detailed numeric cells above |
| public-key Needham–Schroeder | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 80 Owl lines; detailed numeric cells above |
| Otway–Rees | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 197 Owl lines; detailed numeric cells above |
| symmetric Yahalom | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 164 Owl lines; detailed numeric cells above |
| public-key Denning–Sacco | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 91 Owl lines; detailed numeric cells above |
| simplified Kerberos | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 270 Owl lines; detailed numeric cells above |
| Diffie–Hellman key exchange | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 80 Owl lines; detailed numeric cells above |
| simplified SSH forwarding agent | secrecy/authentication safety of Owl description; no verified Rust refinement | human protocol routines, labels and refinements; 183 Owl lines; detailed numeric cells above |

All rows: Gancher et al.; paper and source links above; no liveness theorem or verified Rust refinement; no measured human authoring effort.

### Related work absent from the first pass: verified QUIC record layer (2021)

**A Security Model and Fully Verified Implementation for the IETF QUIC Record Layer.** Antoine Delignat-Lavaud, Cédric Fournet, Bryan Parno, Jonathan Protzenko, Tahina Ramananandro, Jay Bosamiya, Joseph Lallemand, Itsaka Rakotonirina, Yi Zhou; IEEE S&P 2021; preprint first posted 2020. [Full paper](https://www.microsoft.com/en-us/research/wp-content/uploads/2020/10/2020-114.pdf), [ePrint record](https://eprint.iacr.org/2020/114), [F*/C record-layer source](https://github.com/project-everest/everquic-crypto), [Dafny/C++ transport source](https://github.com/secure-foundations/everquic-dafny). Found through OwlC §11/reference 33. First-pass QUIC entries cover Ivy models and testing, not this paper. Open PDF saved under `A Security Model and Fully Verified Implementation for the IETF QUIC Record Layer, Antoine Delignat-Lavaud et al., IEEE SP, 2021/paper.pdf`.

Humans supply the packet privacy/authenticity security games, mathematical packet/header specification, F*/Low* implementation, Dafny protocol logic, refinements, validity/ownership invariants, cryptographic idealization interfaces, helper lemmas and selected on-paper game transformations (§§III–V). F* constructs proof obligations; Z3, tactics and manual proof steps discharge them (§IV-A). EverParse combinators automatically prove parser/serializer inversion and injectivity, but its format front end did not support QUIC and required manually written combinator parsers (§IV-D). The record layer is proved memory safe, a refinement of the detailed specification, functionally correct (decrypting an appropriate encryption recovers its header/payload), and cryptographically secure. Those results extend to extracted C under the Low*/compiler trust assumptions. It also uses abstract secret types and constant-time operations; Appendix B explicitly declassifies a payload offset and acknowledges a potential cache-access channel.

The larger transport's implemented stateful logic is checked for memory/type safety, integer overflow, local termination and selected data-structure correctness (§V-B). It is not an eventual-delivery/connection-progress proof. The paper calls functional correctness of the transport future work (§VIII). Exact scope anchor: “this is not yet an end-to-end verification of the protocol” (p.2). Humans still must connect TLS handshake and record-layer guarantees through stronger transport proofs.

Numbers: §VI-A p.14 gives approximately 10K F* record-layer lines / 6K extracted C lines, 10K Dafny transport lines / 13K compiled C++ lines; about 800 trusted C++ interface lines and 700 trusted OS-interface lines. Exact effort phrase: “about 20 person-months” (§VI-A, p.14); this includes training new team members. Figure 9's reported transport total is `10,223` lines and `19m46s` checking; record-layer total `9,836` lines and `16m30s`. **Source inconsistency:** the record-layer component rows (5,463 specification, 5,509 implementation, 1,751 model, 2,011 bitfields, 2,502 bitsum) exceed its printed total; do not silently add them or treat the total as independently reconciled. Individual routines and abstractions overlap or counting differs, but the paper does not clarify this in the inspected text. §V-B p.13 reports several person-months for a verified generic doubly linked list in F*, versus three hours in Dafny. §VI-B reports `1.98 GB/s` at 1300-byte MTU; §VI-C reports roughly twice-as-slow small file transfers and about 21% slower large transfers than ngtcp2. §IV-A reports two packet-number reconstruction errors, fixed in QUIC draft 24; §III-D traces authentication changes to drafts 17 and 27.

Inference for our goal: a complete evaluation must distinguish checked code safety, proven cryptographic refinement, local routine termination and unproved application/transport progress. This paper also offers a practical counterexample to treating SMT automation as eliminating human specification and invariant work.

| Problem | Guarantee / tool | Human work / size |
|---|---|---|
| QUIC record-layer packet/header protection | cryptographic secrecy/authenticity, parser inversion and injectivity, decode/encode correctness, C memory safety and refinement; F*/Low*, Z3, EverParse/EverCrypt | human games, interfaces, specification, implementation and helper proofs; roughly 10K F* lines; paper/source above |
| QUIC transport prototype and file transfer | implementation memory/type safety, no integer overflow, local termination and selected data structures; Dafny/Z3, extracted C++ | validity and disjointness invariants, ghost state, trusted FFI; 10,223 Dafny lines; overall project about 20 person-months |
| generic doubly linked list | data-structure correctness, reused in QUIC | several person-months in F* versus three hours in Dafny (§V-B); same paper/repositories |

### Related work absent from the first pass: Tamarin models to verified Go/Java (2023)

**Sound Verification of Security Protocols: From Design to Interoperable Implementations.** Linard Arquint, Felix A. Wolf, Joseph Lallemand, Ralf Sasse, Christoph Sprenger, **Sven N. Wiesner**, David Basin, Peter Müller; IEEE S&P 2023. [Full paper](https://pm.inf.ethz.ch/publications/ArquintWolfLallemandSasseSprengerWiesnerBasinMueller23.pdf), [long version](https://arxiv.org/abs/2212.04171), [archived source artifact](https://doi.org/10.5281/zenodo.7409524). Found through OwlC reference 7; absent from first-pass title searches. Author page supplied the exact open PDF URL. Saved under `Sound Verification of Security Protocols- From Design to Interoperable Implementations, Linard Arquint et al., IEEE SP, 2023/paper.pdf`.

Humans provide the Tamarin protocol roles/rules, desired secrecy/authentication formulas, supporting lemmas and proof-search heuristic; implementations; library contracts; message-format consistency proofs; pre/postconditions, loop invariants, assertions, lemma calls and predicate unfolding annotations (§§4, 6). Translation automatically produces each role's separation-logic specification, which grants permission for exactly the model's allowed I/O. Gobra checks the annotated Go code, and VeriFast checks Java. This proves code traces are among the model's traces, and transfers the model's proved symbolic secrecy/authentication safety to actual implementation code under the paper's assumptions. **No eventual-delivery or distributed-progress property is reported.** The soundness theorem concerns finite trace inclusion; the implementation's unbounded transport loop is a behavioral model requirement, not a liveness theorem. The adversary at the byte level is constrained by the Dolev–Yao assumptions; cryptographic collision freedom and related algebraic properties are assumed (§§4.3.3, 5.1). Observational-equivalence properties are future work (§8).

WireGuard verification uses an adapted official Go implementation, removing DDoS protection, metrics and load balancing; network/crypto calls use trusted stubs with trusted contracts. Network socket and cryptographic key setup are unverified (§6.4). It still interoperates with the original implementation and carries VPN traffic. The proof covers both protocol roles, handshake and arbitrary transport-message sequences. Authentication is mutual agreement after the first transport message; forward secrecy holds if long-term secrets were not compromised before key exchange ended (§6.3, Table 1). Exact automation boundary: “We had to manually write three lemmas and an oracle” (§6.3, p.12). That oracle is a proof-search heuristic, not a cryptographic random oracle.

Numbers: §6.3 reports about 250 Tamarin rule lines, 100 lemma/property lines and about 3 minutes of model verification. §6.4 p.13 reports 608 verified Go code lines excluding stubs, 3,936 specification/proof lines, 1,241 (32%) generated lines, 87 term/bytestring algebra and axiom lines; initiator/responder proof checking about 148/138 seconds. §6.4 also reports signed Diffie–Hellman examples: 106 verified Go lines / 1,015 specification lines / 623 generated (61%), and 113 verified Java lines / 1,022 specification lines / 780 generated (76%). No authoring hours are reported. The paper says “excluding library stubs” (§6.4, p.13), a material boundary on those implementation sizes.

Inference for our goal: this turns an expert-written abstract protocol into reusable implementation contracts and therefore reduces a genuine part of specification work. It does not automate choosing the desired security property, finding all helper facts, proving realistic cryptographic primitives, or repairing unmodeled implementation features.

| Problem | Guarantee / tools | Human input and size |
|---|---|---|
| adapted official WireGuard Go handshake + transport | key agreement, forward secrecy and memory safety, code I/O refinement; Tamarin + Gobra | model, 3 helper lemmas + oracle, contracts and proof annotations; 608 Go / 3,936 proof-spec lines; 32% generated; 148/138 s checking |
| signed Diffie–Hellman in Go | exchanged-key secrecy/agreement and I/O refinement; Tamarin + Gobra | protocol model, message formats, contracts, annotations; 106 Go / 1,015 spec lines; 61% generated |
| signed Diffie–Hellman in Java | same symbolic safety/model-to-code property; Tamarin + VeriFast | same inputs; 113 Java / 1,022 spec lines; 76% generated |

All rows: Arquint et al.; full paper and archived source linked above. The authors also injected an implementation that sends the secret exponent instead of its public share; checking correctly rejects its unauthorized output (§6.1). This is a useful concrete negative evaluation case.



