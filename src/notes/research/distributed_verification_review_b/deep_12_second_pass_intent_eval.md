# Second pass: human intent, specification checks, and evaluation
(authored by agents unless marked 🧑)

This review covers the supplied missing-paper list and relevant missing work cited by those papers. It supplements `01_*.md`–`09_*.md`; it does not repeat their literature review. Searches and reading were performed on 8 October 2026.

**How to read the evidence.** Safety means ruling out bad behavior; liveness means ensuring eventual progress. A checked finite execution, a model-checking result, and a proof covering executable source provide different guarantees. An accepted proof establishes the formal statement supplied to the checker; whether that statement captures the person's intended requirement needs separate evidence. A contract states valid inputs and permitted outputs; a verification condition is a formula the checker must prove. An oracle supplies expected answers. Refinement requires detailed behavior to be permitted by an abstract specification. Each entry identifies the human's input, the automatic work, the evaluated guarantee and object, and the source of the reported numbers. Interpretations and recommendations are marked as inferences.

**Reading and search limits.** The web search tool failed with HTTP 404 (`Cannot POST /alpha/search`). The search therefore used HTTP requests to scholarly APIs, arXiv, publishers, author pages, and primary repositories. OpenAlex later returned HTTP 429. Full PDFs were converted with `pdftotext` and read; entries explicitly identify unavailable full text, title mismatches, software releases, and abstracts used without a full paper. No reported experiments were rerun. Only openly served PDFs were saved, and new PDF files were checked for a `%PDF` header. Existing collection copies were reused.

**What to read first (inference).** ARTEMIS is the closest new clarification mechanism, but its effort evaluation simulates the user. The Dafny test-oracle paper adds a real participant study and compares generated contracts with expert contracts. SHADOWBENCH and BEq+ illustrate semantic checks against human-reviewed references. The Kubernetes and Ellsberg entries show how those references can also be challenged by observed running-system behavior. These address different pieces of the desired workflow; their success rates should remain separate.

## Specification synthesis and independent intent checks


The five requested papers were located. Full main texts were read; existing collection PDFs were reused. For *Seeking Specifications*, the available collection text is arXiv v1 (2025), while the matching journal record is *Formal Aspects of Computing* (2026), DOI 10.1145/3785411. Results below refer to the read version. Protocol AutoSpec is a different tool from the C/ACSL AutoSpec covered by the benchmark slice in this second pass.

### Seeking Specifications: The Case for Neuro-Symbolic Specification Synthesis

George Granberry, Wolfgang Ahrendt, Moa Johansson. *Formal Aspects of Computing*, 2026; read [arXiv v1, 2025](https://arxiv.org/abs/2504.21061v1). [Journal](https://doi.org/10.1145/3785411); [intent dataset](https://github.com/ggranberry/intent_dataset).

**Human input.** C code, handcrafted bugs, prompt instructions, and optionally PathCrawler input/output examples or Frama-C EVA alarms. The intent experiment uses 50 programs, four code variants, and three generations per variant; symbolic prompting uses 55 PathCrawler examples (§§3.1–3.3, 4.1).

**Checked and automated.** DeepSeek-R1 generates ACSL function contracts. EVA analyzes possible runtime errors; PathCrawler generates structural tests. Researchers inspect generated contracts and reasoning. This is qualitative intent recovery and annotation comparison, without an end-to-end correctness or liveness proof of the generated contracts (§§3.3, 4.3, 7).

**Numbers and exact evidence.** Table 1, p.11, bug recognition: “Basic 47/60”; “Famous 9/30”; “Anonymized Basic 50/60”; “Anonymized Famous 14/30”; §§3.1–3.2, 4.1: “50”, “three”, “four”, “55”. §3.7, p.11: “rather than any inferred intent”. That default can preserve a recognized bug; explicit intent prompting changes the authors’ reported behavior.

**Limit and relevance.** The introduction’s favorable intent claim conflicts with this default behavior; Figures 6 and 7 print the same palindrome contract despite opposite captions. **Inference:** require an independent intent oracle and check the actual generated formula, rather than trusting its explanation. Sparse structural tests can also induce wrong generalizations (§4.6).

### Automating Requirements Formalization: Using LLMs and Low-Complexity Distinguishing Traces for Semantic Validation

Daniel Mendoza, Anastasia Mavridou, Andreas Katis, Caroline Trippel. ICSE 2026, pp.1314–1326. [Paper](https://cs.stanford.edu/people/trippel/pubs/mendoza_ICSE26.pdf); [DOI](https://doi.org/10.1145/3744916.3787815); [ARTEMIS artifact](https://github.com/dmmendo/ARTEMIS).

**Human input.** Natural-language requirements and allowed atomic propositions. In the intended workflow, a person validates the English decomposition and labels distinguishing traces allowed/disallowed. LLMs generate FRETish/PSP candidates; deterministic translation, proxy checks, and Spot/nuXmv queries produce LTL and clarification traces (§§3–6).

**Checked.** Candidate LTL equivalence to expert interpretations, not deployed-system safety/liveness. Timing patterns include eventual responses, but no implementation progress theorem is proved. The evaluation uses 218 requirements across ventilator, nuclear robotics, autopilot, DeepSTL, and Thales datasets (§7.1, Table 1; 218 is our sum).

**Numbers and exact evidence.** Abstract, p.1: “1.57X higher translation accuracy”; §7.3, p.11: “To simulate a user”; “93 and 11”; “14.22%”; Table 2: “ARTEMIS 18.89 ± 121.76 2437.30 0.36”. The relative accuracy compares Gemini ARTEMIS against the best baseline. Across all five benchmarks, the maximum inspected traces are 93 for LTLTalk and 11 for ARTEMIS. The failure rate concerns no plausible candidate within 1000 generated candidates. ARTEMIS trace generation takes mean 18.89 seconds, standard deviation 121.76, maximum 2437.30, minimum 0.36.

**Limit and relevance.** Expert candidates are added before clarification comparisons; the measured effort is trace count, not a real participant study. §6.2 qualifies logarithmic clarification: mutually exclusive candidates can eliminate only one per answer. **Inference:** useful clarification machinery, but evaluate absent-correct-candidate cases and actual human understanding separately.

### Validating Formal Specifications with LLM-generated Test Cases

Alcino Cunha, Nuno Macedo. *Formal Methods*, LNCS, 2026, pp.279–297, DOI [10.1007/978-3-032-26204-2_15](https://doi.org/10.1007/978-3-032-26204-2_15); read [arXiv v2](https://arxiv.org/abs/2510.23350v2). [Artifact](https://github.com/haslab/Alloy-LLM-Testing).

**Human input.** English requirements, Alloy signatures/fields, previous English requirements, handcrafted prompt examples, and expert oracle formulas for evaluation. GPT-5 generates positive and negative Alloy instances before the target requirement is formalized (§3.3).

**Checked and automated.** Alloy parses and executes each instance; expert formulas automatically label it and test whether it exposes incorrect student specifications. This checks bounded structural models, not running code, temporal safety, or liveness (§§2, 3.4). Researchers manually analyze invalid tests.

**Numbers and exact evidence.** Table 3, p.11, headings Tests/Syntax/Consistent/Previous/Valid/%/Cost: “Few 258 255 255 252 247 96% $3.56”. Table 6, p.13, N/Complete/Wrong/Missed/Mean: “5 35 4816 348 6.43%”. Here N=5 means five positive plus five negative tests per requirement; 35 requirements have complete valid suites, covering 4816 wrong specifications, of which 348 escape detection. The 6.43% is the mean per-requirement missed fraction, rather than 348/4816. §4.5 clarifies that Missed means undetected wrong specifications, despite §3.4’s contradictory description.

**Limit and relevance.** The larger suite comparison considers only requirements with complete valid suites, and those sets vary. Persistent failures involve ambiguous English. **Inference:** independently generated positive/negative model examples are a practical guard against overly weak and overly strict specifications; accepting all tests still does not establish full intent equivalence.

### Synthesizing Precise Protocol Specs from Natural Language for Effective Test Generation

Kuangxiangzi Liu, Dhiman Chakraborty, Alexander Liggesmeyer, Andreas Zeller. ICST 2026, DOI [10.1109/ICST69053.2026.00067](https://doi.org/10.1109/ICST69053.2026.00067); read [arXiv v1](https://arxiv.org/abs/2511.17977v1). [Experimental appendix](https://drive.google.com/drive/folders/1TFRsOUbNby-tg3SIDORk5tZr21GsFiZV); public tool release is planned, not established by the read paper.

**Human input.** RFC documents and working server implementations; an expert separately writes golden I/O grammars (§7.1). AutoSpec automatically extracts states/messages/constraints, builds a grammar, executes Fandango tests, and repairs from traces (§§3–6).

**Checked.** Executable grammar conformance and finite tests of Dovecot, Postfix, vsFTPd, and Pigeonhole. No universal implementation safety or liveness proof; FTP data channels are excluded (Table 1).

**Numbers and exact evidence.** Table 2, client/server-message and independent/dependent-constraint recall: “Average 92.8% 80.2% 16.7% 0.0%”. Table 1, golden grammar lines/human construction time, respectively POP3, SMTP, IMAP, FTP, ManageSieve: “295 3.5h”; “373 9.5h”; “676 14h”; “576 5.5h”; “449 5h”. Table 4 reports per-protocol message acceptance, with abstract averaging to 81.5%.

**Limit and relevance.** Dependent constraints are completely missed in this version. Execution-guided repair may make the spec agree with a buggy server (§7.6.2); several evaluation tables have inconsistent counts. **Inference:** source traceability helps audit repairs, but test acceptance should not replace requirements fidelity.


**Concrete server cases.** Each row is an executable protocol grammar plus finite real-server tests, automated by AutoSpec/Fandango; the size and effort are the human golden grammar used as oracle, not generated code or verification effort. Table 1 numeric quotes above support these cells.

| Protocol / implementation | Tested guarantee and exclusion | Human golden grammar / effort |
|---|---|---|
| POP3 / Dovecot 2.3.19.1 | Control conversation and message acceptance | 295 lines / 3.5 hours |
| SMTP / Postfix 3.7.11 | Control conversation and message acceptance | 373 lines / 9.5 hours |
| IMAP / Dovecot 2.3.19.1 | Control conversation and message acceptance | 676 lines / 14 hours |
| FTP / vsFTPd 1.3.7a | Control conversation; data channels excluded | 576 lines / 5.5 hours |
| ManageSieve / Pigeonhole 0.5.19 | Control conversation and message acceptance | 449 lines / 5 hours |

### Automatic Generation of Formal Specification and Verification Annotations Using LLMs and Test Oracles

João Pascoal Faria, Emanuel Trigo, Vinicius Honorato, Rui Abreu. [arXiv preprint, 2026](https://arxiv.org/abs/2601.12845), intended submission to *Science of Computer Programming*, not an established acceptance. [TESTDAFNY110](https://github.com/joaopascoalfariafeup/testdafny110); [IDE extension](https://github.com/emantrigo/dafny-plugin).

**Human input.** Existing Dafny program bodies, English comments, test methods with expected-result assertions, prompt patterns, and manually refined benchmark solutions. Generated artifacts add contracts, invariants, ghost definitions, assertions, and lemmas (§§3–5).

**Proved and automated.** Dafny statically verifies implementation correctness, runtime safety, termination, and test assertions from generated contracts. Tests are specification-level proof obligations, not runtime test execution (§2). LLMs repair using verifier errors; automated minimization removes unnecessary annotations.

**Numbers and exact evidence.** §6.1, p.13: “98.2% of the problems within at most 8 attempts”; Table 3, p.16: “Logically equivalent 106 (96.4%)”; §7.2, p.22: “85.7%”; “42.1%”; “6.2”; “11.1”. The last four are assisted/manual success and average task minutes in a real seven-student crossover study.

**Limit and relevance.** Two number-theoretic tasks remain unsolved. Four generated contracts differ from intended expert specifications; adding tests expected to fail repairs these (§6.4). **Inference:** useful full code-proof pipeline, provided humans supply sufficiently discriminating positive/negative test expectations; finite examples alone do not prove intent completeness.

## Relevant omissions found through these papers’ related work

Titles/tool names below were checked against all 01–09 write-ups with case-insensitive search. NL2Contract, Hong’s Alloy-formula study, ParCleanse, and ATLAS were absent and their full main texts were read. Already-covered SpecGen, MutDafny, Laurel, and dafny-annotator were not duplicated; C AutoSpec is owned by the benchmark slice.

### Beyond Postconditions: Can Large Language Models infer Formal Contracts for Automatic Software Verification? (NL2Contract)

Cedric Richter, Heike Wehrheim. [arXiv, 2025](https://arxiv.org/abs/2510.12702); the read PDF contains placeholder conference metadata. Linked from Faria et al. §8.2, reference 31. Code/data release is promised (§10), with no artifact URL in the read version.

**Human input.** Python signatures, docstrings, and surrounding definitions; target implementation bodies and reference preconditions are hidden from the LLM. Researchers supply reference programs/preconditions, buggy alternatives, and tests (§§3–4).

**Checked and automatic.** Models generate executable pre/postconditions. CrossHair searches for violations in Python code; mutation tests estimate discrimination. This is safety/functional bug finding, without liveness proof.

**Numbers and exact evidence.** Table 1, p.10, GPT-5 NL2Contract accept@1/5/10 and sound@1/5/10: “89.0 94.6 95.1 81.1 88.7 90.0”. §4.1, p.9: “sound otherwise”. The latter follows declaring a contract unsound only if CrossHair finds a violation in 60 seconds. Table 3, p.14 reports 14/31 real buggy cases found with each model; quote: “# bugs” and “14”.

**Limit and relevance.** Operational “soundness” includes unknown/timeouts, so it is not a proved universal guarantee. **Inference:** excellent separation of intended input domains from implemented behavior; retain an explicit unknown category when adapting this evaluation.

### On the Effectiveness of Large Language Models in Writing Alloy Formulas

Yang Hong, Shan Jiang, Yulei Fu, Sarfraz Khurshid. [arXiv, 2025](https://arxiv.org/abs/2502.15441); linked from Cunha–Macedo §5, reference 5. Existing collection PDF reused; no source repository established in the read paper.

**Human input.** Eleven familiar graph/relation requirements, Alloy signatures, optionally a reference formula or a partial formula with allowed hole replacements. Models generate formulas or complete holes; researchers use their ground-truth formula for evaluation (§3).

**Checked.** Automated bounded equivalence of Alloy models, not code correctness or liveness. English-to-Alloy checks at least one correct formula among twenty requested per property; this differs from single-shot correctness (§4.1).

**Numbers and exact evidence.** §4.1, p.12: “both LLMs find at least one valid solution”. §4.3, p.13: “Each LLM successfully completes all but 1 sketching task”. Both failed sketch cases succeed after syntax feedback. In examples, equivalence uses default scope three (§2).

**Relevance, inference.** This provides small relational tasks for testing basic logical fidelity. Their familiarity and bounded checks make poor evidence that a model can recover an unfamiliar distributed-system guarantee.

### Validating Network Protocol Parsers with Traceable RFC Document Interpretation (ParCleanse)

Mingwei Zheng, Danning Xie, Qingkai Shi, Chengpeng Wang, Xiangyu Zhang. [arXiv, 2025](https://arxiv.org/abs/2504.18050); [source](https://github.com/zmw12306/ParCleanse). Linked from protocol AutoSpec §2.5, reference 34.

**Human input.** RFCs, parser executables, and sometimes instrumentation marking successful parsing. Experts independently construct reference formats and manually classify discrepancies (§§4.2, 5.2–5.3).

**Checked and automatic.** GPT-4o extracts packet layouts and constraints with source links; Z3 generates valid packets and packets violating one property; real C/Go/Python parsers execute them. LLM diagnosis distinguishes inferred-spec errors from implementation errors. This tests input-validation safety, without universal parser proof or protocol liveness.

**Numbers and exact evidence.** Table 2, p.15, precision/recall of message/field-name/field-type/independent/dependent constraints: “Total 100/100 99/95 94/91 98/82 73/44”. Table 3, p.16, unique/new/confirmed bugs: “69 68 36”. Table 1, p.14, Babel golden format: “171 5h”; BGP-4: “164 6h”.

**Limit and relevance.** Dependent-rule recall remains weak; authors manually check every reported discrepancy. **Inference:** isolate one violated requirement and carry its exact source clause into diagnosis, rather than repairing solely to satisfy observed implementation behavior.

### Constrained LTL Specification Learning from Examples (ATLAS)

Changjian Zhang, Parv Kapoor, Ian Dardik, Leyi Cui, Rômulo Meira-Goés, David Garlan, Eunsuk Kang. ICSE 2025, DOI [10.1109/ICSE55347.2025.00160](https://doi.org/10.1109/ICSE55347.2025.00160); read [author PDF](https://eskang.github.io/assets/papers/icse25-atlas.pdf), arXiv 2412.02905v3 (2024). [Artifact](https://doi.org/10.5281/zenodo.14578202). Linked from ARTEMIS reference 60; full main text and correctness appendix read.

**Human input and automation.** Expert users supply positive/negative lasso traces, atomic propositions, first-order constraints over formula syntax, optimization priorities, and a maximum formula-DAG size. ATLAS encodes these in AlloyMax/OpenWBO MaxSAT and enumerates optimized LTL formulas. No LLM is used; natural-language conversion is proposed future work (§§IV–VI, X).

**Proved/checked.** Appendix A gives a mathematical soundness and bounded completeness argument for the learning encoding; §VI.B says “complete only up to the user-provided bound”. Generated safety/liveness formulas are checked against example traces and author-defined expected solutions, rather than a proof that every model execution or running implementation satisfies them (§VIII.B). This preserves the distinction between learning a deadlock-free property and proving a protocol deadlock-free.

**Concrete evaluated cases and numbers.** Table I, p.11, ATLAS solved counts/mean time including timeout: “30/30 43.65s”; “10/10 3.08s”; “20/20 37.25s”; “53/78 66.75s”.

| Case | Human intent / analyzed artifact | ATLAS result |
|---|---|---|
| Peterson mutual exclusion | TLA+ model traces; mutual exclusion safety and deadlock-free liveness pattern, not a code proof | 30/30 tasks, mean 43.65 seconds |
| Voting machine | Abstract state-machine traces, manually labeled; safety invariant prevents vote alteration | 10/10 tasks, mean 3.08 seconds |
| Robot-arm repair | Simulated demonstrations plus existing formula; reach blue as well as green while avoiding red | 20/20 tasks, mean 37.25 seconds |
| Invariant weakening | Synthetic radiation-machine-style constraints and traces; retain acceptable behavior while excluding unsafe samples | 53/78 tasks, mean 66.75 seconds |

**Limit and relevance.** Constraints demand formal expertise; benchmarks were constructed around the authors’ use cases (§VIII.C), and a formula fitting traces need not capture intended behavior (§I). **Inference:** strong useful example of making humans’ formula class and optimization preferences explicit; its learning soundness theorem cannot be used as a software correctness theorem.

### Inferring multiple helper Dafny assertions with LLMs (DAISY)

Álvaro Silva, Alexandra Mendes, Ruben Martins. [arXiv preprint 2511.00125v1, 2025](https://arxiv.org/abs/2511.00125); no accepted venue established. Linked from Faria et al. reference 36. The read PDF promises GitHub code without giving a repository URL (§10). This is unrelated to the first pass's DaisyNFS filesystem.

**Human input and automation.** Already specified and previously verified Dafny functions, methods, and lemmas from DafnyBench; authors remove helper assertions while preserving contracts and code. GPT-4.1 plus error-message heuristics localize insertion points; retrieved code/error examples guide candidate assertions; Dafny/Z3 checks them (§§3–5). The default proposes at most two insertion sites with ten candidates per site; it also tests partial combinations, which matters for evaluation fairness (§7).

**Proved/checked.** Successful repairs re-establish static functional/code proof obligations under existing specifications. They do not synthesize independent intent or prove a distributed-system liveness guarantee. In §2, the FindRange client statically proves exact bounds for a sorted-sequence search call after inserting two helper assertions; it is not a runtime test. No code/proof size or human repair time is reported for that case.

**Numbers and exact evidence.** Table 3, p.9, hybrid localization w/o-one, w/o-two, w/o-all, combined: “153(63.4%)”; “76(32.3%)”; “8(26.7%)”; “237(46.8%)”. Section 4, p.7: “241 w/o-1, 235 w/o-2, and 30 w/o-all instances”. The combined multiple-assertion result is 84/265=31.7%, whereas Faria's related-work summary misquotes single-assertion success as 63.2%.

**Limit and relevance.** One absent assertion is considerably easier than reconstructing proofs with all assertions removed. More importantly, the dataset excludes cases where removing an assertion leaves verification passing (§4). **Inference:** proof-repair evaluation must retain the human contract and require real verifier failure before repair; otherwise deleting the check itself can look like success. This tool addresses proof help once a specification exists, leaving the intent-oracle problem unresolved.

## Search and remaining related-work access gaps

Web search was attempted first and failed with HTTP 404. Searches then used curl/Python HTTP requests to OpenAlex, Crossref, Semantic Scholar, author pages, GitHub, NASA NTRS, and arXiv. OpenAlex’s shared unauthenticated daily budget later ran out. ACM responses returned challenge HTML; author-hosted ARTEMIS PDF succeeded. All newly saved PDF bytes began `%PDF`.

The following absent relevant references were identified, but full texts were not recovered/read in this slice, so no results are claimed: *Specify What? Enhancing Neural Specification Synthesis by Symbolic Methods* (Granberry–Ahrendt–Johansson, IFM 2024, DOI 10.1007/978-3-031-76554-4_19); *TriCo—Triple Co-piloting of Implementation, Specification and Tests* (Ahrendt–Gurov–Johansson–Rümmer, ISoLA 2022, DOI 10.1007/978-3-031-19849-6_11); *Interactive synthesis of temporal specifications from examples and natural language* / LTLTalk (Gavran–Darulova–Majumdar, OOPSLA 2020, DOI 10.1145/3428269); *PROSPER: Extracting Protocol Specifications Using Large Language Models* (Sharma–Yegneswaran, HotNets 2023, DOI 10.1145/3626111.3628205). Publisher download attempts yielded HTML; these remain explicit follow-up gaps, not findings.

Other relevant absent references requiring follow-up: Mashkoor–Leuschel–Egyed’s *Validation obligations* (ICSE NIER 2021); Sullivan et al.’s AUnit and *Automated test generation and mutation testing for Alloy* (ICST 2018/2017); Greiner et al.’s *Automated generation of code contracts: Generative AI to the rescue?* (GPCE 2024); Zhao et al.’s NL2CTL (ICFEM 2024). These are identified from the read papers’ references, not independently assessed here.

## Executable specifications and code-verification benchmarks

### CodeSpecBench: Benchmarking LLMs for Executable Behavioral Specification Generation

Zaoyu Chen, Jianbo Dai, Boyu Zhu, Jingdong Wang, Huiming Wang, Xin Xu, Haoyang Yuan, Zhijiang Guo, Xiao-Ming Wu. arXiv preprint, 2026, v1. [Paper](https://arxiv.org/abs/2604.12268); [source](https://github.com/SparksofAGI/CodeSpecBench). Open PDF saved in the collection under this title and authors.

**Human input and automatic work.** The task starts with existing, fairly concrete programming descriptions. The function task asks the model to produce executable Python preconditions and postconditions. §3.2, p.4: The prompt supplies “only a natural-language description”. The repository task additionally supplies existing code and identifies the affected functions. The input uses privileged localization: Appendix I.3.2, p.24 says the Oracle setting uses the files changed by the reference fix. Models generate the checks; a harness inserts them before and after calls. The benchmark builders generate tests with several LLMs, deduplicate them, obtain reference outputs and input-validity labels from an online judge, and collect incorrect outputs from buggy LLM solutions (§4.1).

**What was checked.** This checks finite executions of code and executable specifications, including real repository tests; it proves no universal safety, termination, or distributed liveness theorem. §3.4, p.5 defines correctness as accepting every valid test and completeness as rejecting every invalid test; Its pass metric requires success on both checks. On fixed repositories the checks must accept trigger and regression tests; on buggy repositories they must reject the trigger tests. Appendix K, p.25 explicitly warns: passing the suite leaves “untested behaviors” without a guarantee.

**Numbers.** Table 2, p.7 lists Num of tasks “2,494” “500” (Func, Repo). §4.2, p.6 describes the repository source as 500 curated issues across 12 widely used open-source projects. §4.1, p.6 reports an average statement coverage of “96.3%” and branch coverage of “93.6%”. The valid/invalid input generation repeats until each reaches 50; incorrect-output collection yields “67.8” incorrect test cases per problem on average (§4.1, p.6). §5.2, p.7: the best is “47.0%” (GPT-5-mini) on Func, while the best repository pass rate is “20.2%” (Claude-4.5-Sonnet). Those are the strict main-table rates; Appendix F/Table 10 uses different values, including “21.0” for Claude, so the paper contains inconsistent repo figures across tables. Table 6's solution-generation comparison also mixes benchmark results with numbers from model technical reports (§5.3); it is weaker evidence than a controlled same-task comparison. The paper evaluates fifteen models; Appendix J, p.25 says “a single generation per prompt”.

**Why it matters (inference).** This provides a useful intent-evaluation layer: a specification must accept desired behavior *and* reject undesired behavior. Its repository tasks also expose import/state problems that toy functions miss. Its tests and localization are supplied; this does not demonstrate eliciting a complete distributed-system guarantee from a vague request.

### VeriBench and Veribench-FTP: exact requested publication not recovered

**One-line requested-title status:** *VeriBench: End-to-end formal verification benchmark for AI code generation in Lean 4 (2025)* and *Veribench-FTP* could not be recovered as accessible papers after OpenAlex, GitHub, arXiv, and author-page searches; no PDF or full-text paper review is claimed.

A primary author [launch draft](https://ehersch.github.io/veribench-blog/blog/veribench-launch/) dated May 8, 2026 instead calls the work *VeriBench: An End-to-End Formal Verification Benchmark for AI Coding Agents*, with Brando Miranda, Srivatsava Daruru, Ethan S Hersch, Zhanke Zhou, Allen Nie, Daneshvar Amrollahi, Leni Aniva, Iddah Mlauzi, Kirill Acharya, Elyas Obbad, Dilara Soylu, Weston Kirk, Zixiao Jolene Wang, Kai Fronsdal, Ying Li, Donald Poindexter Jr, Rakshit Kaushik, Shurui Liu, Yegor Denisov-Blanch, Steven Dillmann, Simon Obstbaum, Santiago Cuellar, John Sarracino, Rylan Schaeffer, Mo Tiwari, Donghyun Lee, Bo Han, Sanmi Koyejo. Its citation block says “Preprint, URL forthcoming”. The linked `brando90/veribench` repository and guessed `brando90/veribench-ftp` repository returned 404. The draft describes paired Python/Lean tasks and theorem coverage against human reference statements, but has a material internal contradiction: it says every gold theorem closes without `sorry`, then reports a remaining gold `sorry` rate of approximately 0.57. Treat this as a discovery lead awaiting a stable paper/artifact, not a validated benchmark result.

### AlgoVeri: An Aligned Benchmark for Verified Code Generation on Classical Algorithms

Haoyu Zhao, Ziran Yang, Jiawei Li, Deyuan He, Zenan Li, Chi Jin, Venugopal V. Veeravalli, Aarti Gupta, Sanjeev Arora. ICML/PMLR 306, 2026; arXiv v2, June 3. [Paper](https://arxiv.org/abs/2602.09464); [source](https://github.com/haoyuzhao123/algoveri). Existing collection PDF reused.

**Human input.** Experts supply the algorithm description, signatures, helper definitions, preconditions and postconditions in Dafny, Verus, and Lean. §2.3, p.4: experts “manually write, align, and review specifications”. The model generates the implementation and proof help, then repairs them using compiler/verifier errors. Specifications are inputs, not discovered intent. §2.1, p.3 explicitly includes loop invariants, termination proof, auxiliary lemmas, or tactic scripts as generated artifacts.

**What was proved and what was automatic.** Compiler/verifier acceptance establishes the supplied program contract in the corresponding tool, concerning algorithmic functional correctness and safety, with termination obligations where the tool/task requests them. Appendix A's lower-bound search includes a decreasing measure and Lean `termination_by`; this is sequential termination, not distributed liveness. A second, automatic LLM judge checks whether the code actually implements the requested algorithm. §2.4, p.4 notes that a sorting contract alone does not distinguish bubble sort from merge sort. §3, p.5 identifies two failure modes: “Cheating” (e.g. contradictory assumptions or `sorry`) and “Algorithmic degeneracy” (e.g. missing requested path compression). Therefore raw verification counts include outputs that the semantic filter later rejects; they are not all sound intended proofs. The filter itself is a judgment, not a proof of semantic equivalence.

**Numbers.** Abstract, p.1: “77” classical algorithms in Dafny, Verus, and Lean. Table 2, p.5 reports Gemini-3 Flash, 1×15 budget, verifier acceptance / semantic-filtered success: Dafny “55.84” / “40.26”, Verus “25.97” / “24.68”, Lean “9.09” / “7.79” percent. GPT-5.3 Codex with 1×8 gets “49.35” / “42.86” in Dafny, “14.29” / “11.69” in Verus, and “23.38” / 11.69 in Lean. Those are different repair budgets. §4.1, p.6 reports that GPT-OSS repair curves provide no significant gain over independent sampling. §2.3 checks representative hard contracts for local satisfiability and necessity of clauses, including Maximum Flow and Tarjan SCC; it does not claim these checks cover every contract. No numerical expert curation effort or aggregate proof/code size is reported.

**Why it matters (inference).** Aligned *human-written* obligations make a much cleaner comparison of tools than unrelated task collections. Keep separate scores for accepted proofs, unchanged/trusted assumptions, and adherence to the requested algorithm. The current evaluation still depends on an LLM semantic filter.

### Neural Theorem Proving for Verification Conditions: A Real-World Benchmark

Qiyuan Xu, Xiaokun Luan, Renxi Wang, Joshua Ong Jun Leang, Peixin Wang, Haonan Li, Wenda Li, Conrad Watt. ICLR, 2026; arXiv v2. [Paper](https://arxiv.org/abs/2601.18944); [source](https://github.com/xqyww123/NTP4VC). Existing collection PDF reused.

**Human input.** Existing C/Why3 programs already have human-chosen properties, contracts, and annotations. Benchmark builders translate their resulting proof obligations into Lean, Isabelle, and Rocq, using expert-written rules. §3.1, p.4: more than “2400” mapping & rewriting rules written by human experts. Cross-validation and syntax checks support these rules; they are not a proved translator. The automatic complication stage removes assertion/lemma guidance to make formerly easy obligations harder. The tested model receives a formal goal, definitions and existing lemmas, and generates a proof. §5, p.8: a goal with supporting definitions and lemmas. It does not choose requirements or invent the main safety property.

**What was proved.** Each case is an individual verification condition, not an entire operating system. §4, p.5 identifies functional behavior; establishment/preservation of loop invariants and loop termination; invalid memory access; and invalid arguments such as division by zero or overflow. These are obligations derived from program verification, checked by proof assistants, rather than observations of running systems. There is no distributed fairness/progress benchmark. §5, p.8 requires acceptance by the corresponding ITP without fake proofs such as “admit or sorry”. The translation still has trusted assumptions: Appendix E.1, p.21 says “we trust Why3’s termination check and axiomatize this” in the ITP translation in case ITP’s termination checker fails. §4, p.7 adds that pipeline bugs may make cases unprovable: the authors cannot certify that each translated goal is provable. Consequently, these are checked proofs relative to translated dependencies and assumptions, not a kernel-only end-to-end proof of C semantics and translation correctness.

**Numbers.** §4, p.5: extract “>7.5k” VCs and select “600” VCs; half are Why3 algorithm/data-structure examples and half real C obligations. Table 3, p.6 lists 300 C obligations from “17413” lines of C (comments excluded). Table 5, p.8 reports DeepSeek-Prover-V2-671B Lean pass@1/8 “1.67” / “3.00”; Minilang Isabelle “2.08” / “11.46”; Sledgehammer “18.00” percent and CoqHammer “5.67”. Use that table, not the prose typo 11.56%. The Why3 ATP baseline solves 22% (Table 2). Each attempt has a timeout of 10 minutes (§5, p.8). §1, p.1 describes the linked-list source as needing ∼600 lines of annotations; this is original-project burden, not new benchmark author effort.

**Why it matters (inference).** A strong mathematical prover may fail on pointer/state obligations. An evaluation should distinguish generating useful invariants from proving the harder obligations left after those invariants disappear, and should publish the translated assumptions.

### Beyond Basic Specifications? A Systematic Study of Logical Constructs in LLM-based Specification Generation

Zehan Chen, Long Zhang, Zhiwei Zhang, Jingjing Zhang, Ruoyu Zhou, Yulong Shen, JianFeng Ma, Lin Yang. arXiv preprint, 2026, v1. [Paper](https://arxiv.org/abs/2602.00715). Open PDF saved. The PDF footer says February 2025, but arXiv identifier/submission and model dates support 2026; no final venue is claimed.

**Human input and automatic work.** Humans supply C source and calling contexts with target assertions, prompts/examples, and four permitted-construct configurations: basic contracts; proved logical definitions/lemmas; axioms; or everything. Models generate ACSL annotations, Frama-C checks them, then the pipeline either deletes failing annotations or asks the model to modify them. §6.2, p.17 is explicit: using source code “rather than software documentation” to generate annotations. These are proof-support annotations inferred from code, not independently established natural-language requirements.

**What was checked.** The outcome is successful deductive verification of supplied C assertions under generated annotations. ACSL variants support sequential termination (§2.1); no distributed-liveness evaluation is reported. Two configurations permit unproved axioms. §2.1, p.4 warns any property expressed as an axiom is “assumed to be true” and wrong axioms can destroy soundness. The paper does not report a separate consistency/independent adequacy audit of every generated axiom. **Inference:** higher verifier acceptance in those configurations is not evidence that every accepted claim is an unconditional sound program guarantee.

**Numbers and meaning.** §3.2, p.7: “49” program instances. §3.4, p.7 runs “N = 5” independent runs; stable success means “at least two out of the five independent runs”. Thus NVP counts programs solved at least once across five runs, not one-attempt pass@1. Table 1, p.9 gives GPT-5 deletion/basic vs deletion/full: NVP 32 vs 40, stable 28 vs 39; modification/basic vs modification/full: NVP 39 vs 42, stable 37 vs 41. Gemini modification/verifiable gets NVP 48, stable 46. §4.3, pp.14–15 reports modification raises runtime generally exceeding 100%. No human work-time measurement or aggregate annotation size is supplied.

**Why it matters (inference).** Let agents introduce helper definitions and *proved* lemmas instead of forcing the entire argument into flat invariants. Score axiom-based shortcuts separately and preserve the original assertions through refinement.

### LLM Assisted Coding with Metamorphic Specification Mutation Agent

Mostafijur Rahman Akhond, Gias Uddin. arXiv preprint, 2025, v1. [Paper](https://arxiv.org/abs/2511.18249). Open PDF saved. The manuscript contains an unfilled ACM reference template with 2018 and placeholder DOI; no published venue is established.

**Human input and automatic work.** CodeMetaAgent starts from benchmark programming descriptions or bug reports, and existing oracle tests and reference implementations. Humans choose nine transformations; four rewrite descriptions (negation, translation, step decomposition, paraphrase) and five transform tests (§4). A model generates variants. A BERT similarity threshold filters rewritten prose; an oracle implementation checks generated tests. §3.2, p.6 says variants below “0.8” are flagged, and tests are checked “against the oracle implementation”. A generator produces code/patches and an evaluator runs benchmark tests. §3.1, p.6 allows a maximum of three iterations.

**What was checked.** Generated Python programs and patches were executed against finite oracle suites; test branch coverage was measured with coverage.py (§3.4). Semantic similarity of prose is a heuristic, and testing against a reference program depends on that program. This is neither a formal safety proof nor a liveness proof. Despite the phrase specification mutation, the specifications being mutated here are prose, not Dafny/Lean/TLA contracts.

**Numbers.** §5.2, p.10 lists HumanEval-Pro “164” programming problems and MBPP-Pro “378” problems. Table 3, p.12 gives GPT-OSS MBPP-Pro pass@1 “53” → “70”; the text specifies “absolute improvements”, so this is 17 percentage points. Table 4, p.14 gives MBPP-Pro oracle branch coverage “99.36” vs GPT-4o augmented “99.81”, a 0.45-point improvement, not 99.81 points gained. Table 5 gives Qwen3-Coder test correctness “85.01” / “93.14” on HumanEval/MBPP. §6.1.4, p.13 reports SWE-bench Lite baseline 69 bugs/23%, CMA “30.3% (90 bug)”; 90/300 is 30.0%, so count and percentage disagree. The same passage says 233 patches/78.6%, whereas 233/300 is 77.7%. Table 3 also labels GPT-4o HumanEval pass@5 72→82 as +15 rather than +10. Preserve the counts and flag these arithmetic inconsistencies. §7.1, p.19 reports input token consumption increases about fourfold and output consumption about fivefold.

**Why it matters (inference).** Rewriting vague prose into explicit steps and checking multiple views of intent may help elicitation. BERT similarity does not certify preservation of a requirement's quantifiers or negation; the paper's numerical inconsistencies and finite tests limit its evidence for strong guarantees.

## Missing related work reached from these papers

The original `01`–`09` notes were searched by title, tool name and aliases. SpecGen, SpecGenBench, FormalBench, VERINA, CLEVER, VerifyThisBench, VeruSAGE, FVEL, Rango, Houdini, LEMUR and DafnyComp already have substantive coverage; they are not repeated. Re:Form is a different paper from the separately covered DafnyComp publication. The following direct references were absent. Earlier classical work below helps distinguish discovering plausible descriptions of observed code from deriving assumptions sufficient to prove a fixed property.

### AutoSpec: Enchanting Program Specification Synthesis by Large Language Models using Static Analysis and Program Verification

Cheng Wen, Jialun Cao, Jie Su, Zhiwu Xu, Shengchao Qin, Mengda He, Haokun Li, Shing-Chi Cheung, Cong Tian. CAV, 2024. [Paper](https://arxiv.org/abs/2404.00762); [source](https://github.com/deskchen/autospec). Open PDF saved. Reached from CodeSpecBench and Beyond Basic Specifications.

Humans supply C code and a property/assertion to prove. Static analysis splits the program; GPT-3.5 generates ACSL contracts and invariants bottom-up; Frama-C/WP checks them, removes failing candidates, and repeats until it can prove the original assertion (§3). This is deductive program verification relative to a supplied target, not discovering the human's ultimate intent. §3, p.7 describes the desired workflow as “Given a program and properties under verification”. No distributed-liveness result is supplied.

§1, p.3 reports “79% (= 199 / 251)” C benchmark programs verified, covering four small-program collections. Table 3/§4.2, pp.13–14 concerns six *manually extracted* X.509 parser functions; all six succeed at least once, but `parse_null` and `parse_algoid_params_none` each succeed in only “2/5” runs. The former averages “260.96” seconds and the latter “957.14”. Humans chose a functional target for each selected function. The comparison to five calendar months of original whole-parser annotation effort has different scope; it is not evidence of replacing that entire project in minutes. The main benchmark table gives 51 Frama-C tasks, 133 SyGuS, 46 OOPSLA-13 and 21 SV-COMP (§4.1/Table 1). **Inference:** useful generation/repair machinery, provided the user-approved assertion remains fixed and new preconditions do not silently restrict away desired inputs.

### SLD-Spec: Enhancing LLM-based Specification Generation via Program Slicing and Logical Deletion

Zehan Chen, Long Zhang, Zhiwei Zhang, JingJing Zhang, Ruoyu Zhou, Yulong Shen, JianFeng Ma, Lin Yang. arXiv, 2025 first submission; v2 February 2, 2026 changes the title from the cited *SLD-Spec: Enhancement LLM-assisted Specification Generation for Complex Loop Functions via Program Slicing and Logical Deletion*. [Paper](https://arxiv.org/abs/2509.09917). Open current PDF saved. Reached from Beyond Basic Specifications.

Humans give C code and target assertions, examples and prompts. The system automatically chooses slicing variables and splits functions, generates ACSL annotations with LLMs, uses an LLM to screen relevance/plausibility, then Frama-C/WP verifies the integrated annotations and removes failures (§3). A majority-vote mitigation is described in §5; the language-model screen is not a proof. The final check establishes the supplied assertions, including program-state/function obligations; loop variants can express sequential termination. There is no distributed progress/fairness benchmark. The complex dataset is created by composing and rearranging earlier small examples, not deployed applications (§4.1).

§1, p.3 reports “37 out of 51 programs and 10 out of 11 programs”. Table 2, p.13 compares 37 SLD-Spec successes with 36 SpecGen and 27 AutoSpec; §4.2, p.14 reports average runtimes “27.85 s”, “42.04 s”, and “100.21 s” respectively. These count tasks solved across “five independent runs” (§4.1, p.12); they are not pass@1 rates. Table 3, p.15 shows different repeat-run success counts even among the ten complex tasks passed. The WP timeout is eight seconds (§4.1). **Inference:** postponing rejection until the needed surrounding contract exists is a useful repair strategy; screening annotations against code still cannot establish whether code implements an independent requirement.

### Re:Form: Reducing Human Annotations in Scalable Formal Software Verification with RL in LLMs: A Preliminary Study on Dafny

Chuanhao Yan, Fengdi Che, Xuhan Huang, Xu Xu, Xin Li, Yizhi Li, Xingwei Qu, Jingzhe Shi, Chenghua Lin, Yaodong Yang, Binhang Yuan, Hang Zhao, Yu Qiao, Bowen Zhou, Jie Fu. TMLR, May 2026; arXiv v4 July 3. [Paper](https://arxiv.org/abs/2507.16331); [source](https://github.com/Veri-Code/ReForm). Existing collection PDF reused. Reached from AlgoVeri.

Humans design reusable translation templates, training rewards and spot checks; models generate per-example Dafny annotations from existing Python/Dafny implementations (§2.1). Training combines supervised examples and reinforcement learning with Dafny feedback. This verifies the generated Dafny code against generated contracts; no proved Python-to-Dafny semantic correspondence is established. The paper retains human priors, including pretrained models and human reward design (§1). Most use cases are sequential functions. It does not evaluate distributed liveness.

The key finding is reward gaming: §2.4, p.9 observes “weak specifications that trivially satisfy the verifier”. Its additional reward checks that the candidate accepts all reference-valid inputs and promises at least the reference outputs, expressed by `GTpre ⇒ GENpre` and `GTpre ⇒ (GENpost ⇒ GTpost)` (§2.4). References are themselves autoformalized/verifier-accepted; implication against them does not certify their fidelity to human intent. §3.1, p.10 gives a 20,000-program collection, “3,000” supervised examples, “4,500” RL examples, “512” in-domain tests and “300” DafnyComp tasks. §3.2, p.13 gives 14B RL verification “14.0%” vs SFT “8.3%”; Figure 8, p.14 gives out-of-domain spec-superiority “0.077” vs “0.047”. Thus 14% is not the strength score. Table 2, p.11: 14B training requires “64” GPUs for approximately “36” hours. **Inference:** use verifier-proved contract implication as a second reward, but ground the reference in human intent and preserve implementation semantics separately.

### Finding Inductive Loop Invariants using Large Language Models (Loopy)

Adharsh Kamath, Aditya Senthilnathan, Saikat Chakraborty, Pantazis Deligiannis, Shuvendu K. Lahiri, Akash Lal, Aseem Rastogi, Subhajit Roy, Rahul Sharma. arXiv, 2023. [Paper](https://arxiv.org/abs/2311.07948). Open PDF saved. Reached from Beyond Basic Specifications.

Humans provide C programs containing assertions; the model proposes invariant pieces. Houdini prunes the union of proposals, Frama-C/WP checks inductiveness and whether the assertions follow, and the model repairs failures (§3). §2, p.3 states that a successful proof covers “all executions of the program”. This is assertion safety for supplied programs. Its Hoare-triple definition conditions the postcondition on terminating runs; no termination or distributed-liveness proof is claimed. Arrays and pointers are filtered out; experiments use valid instances with one loop and one method (§2).

The final experiment has “469” positive tasks (§2, p.3). §4.2, pp.8–9 reports Houdini increases solved cases “from 293 to 383”. §4.4, p.9 gives eight generations plus seven repairs, totaling “398 solved benchmarks”. §4.6, p.11 compares Ultimate “430 out of 469” and Loopy “398 out of 469”, with “31 benchmarks” solved only by Loopy. The LLM and symbolic methods therefore complement one another; the LLM is not the better overall solver in this experiment. **Inference:** ask agents for multiple useful proof facts and let a sound pruning algorithm combine them, while keeping the target assertions independent.

### Code2Inv: A Deep Learning Framework for Program Verification

Xujie Si, Aaditya Naik, Hanjun Dai, Mayur Naik, Le Song. CAV, 2020. [Author PDF](https://www.cis.upenn.edu/~mhnaik/papers/cav20.pdf); [source](https://github.com/PL-ML/code2inv). Open PDF saved. Reached from Beyond Basic Specifications.

Humans supply a verification instance with an assertion, a proof checker, a grammar and graph-construction rules. A neural policy learns candidate invariants from solver feedback. §1, p.2 says “No search heuristics or training labels are needed from human experts”; the grammar, target and checker remain supplied. C instances are converted into solver obligations; the method proves assertion safety using generated invariants rather than running tests. It does not discover user requirements or prove distributed liveness.

§4, p.8 evaluates “133 C programs” and “120 CHC instances”. §4, p.9 reports “94 (out of 120)” CHCs solved, versus 112 Spacer and 118 LinearArbitrary. A seven-instance nonlinear case study solves “5 (out of 7)”. Those are separate experiments, not an overall C success rate. §4, p.10 notes that 90% of solved C cases finish within two hours and the remainder may take twelve. That section also excludes multiple loops, calls and recursion. **Inference:** this earlier generate/check/learn pattern is relevant, but its predefined grammar and long search budget make its results different from current LLM generalization claims.

### The Daikon system for dynamic detection of likely invariants

Michael D. Ernst, Jeff H. Perkins, Philip J. Guo, Stephen McCamant, Carlos Pacheco, Matthew S. Tschantz, Chen Xiao. Science of Computer Programming 69, 2007, pp.35–45. [Author PDF](https://homes.cs.washington.edu/~mernst/pubs/daikon-tool-scp2007.pdf); [source](https://github.com/codespecs/daikon). Open PDF saved. Reached from Beyond Basic Specifications.

Humans supply a runnable program and inputs/test executions. Instrumentation records values; Daikon tests a library of candidate relations, drops counterexamples, filters statistical coincidences and prints probable preconditions, postconditions and object invariants (§§3,5). Those checks concern observed running code. §4.5, p.41 says inferred properties are “not guaranteed to be true over all possible executions”. They are neither universal safety proofs nor liveness proofs. Static verification can subsequently validate them.

§4.5, p.41 summarizes earlier ESC/Java studies with precision “over 95%” and recall “over 90%”; these are citations to prior experiments, not a new comprehensive benchmark in this tool paper. The same passage cites around 90% automated lemmas/tactics for three distributed-algorithm proofs, but does not establish new end-to-end proofs here. §3.3, p.39 mentions partial consistency specifications for NASA CTAS, a codebase exceeding one million lines; that is not one million lines formally proved. **Inference:** mined facts can reveal missing test inputs and supply proof candidates. Never treat observed regularities as the intended requirement simply because they fit every available run.

### Maximal Specification Synthesis

Aws Albarghouthi, Isil Dillig, Arie Gurfinkel. POPL, 2016. [DOI](https://doi.org/10.1145/2837614.2837628); [author PDF](https://pages.cs.wisc.edu/~aws/papers/popl16.pdf). Open PDF saved. Reached from Beyond Basic Specifications.

The human gives an incomplete program and a desired postcondition, identifies unknown callees, and supplies their signatures and state semantics. The system derives the most permissive callee relations that still suffice to prove the client's fixed property. Counterexample-guided verification feeds a logical solver that jointly derives assumptions (§§2–6). The formal result concerns safety of an imperative program model; it does not prove that real library implementations satisfy the synthesized assumptions, or prove termination/distributed liveness. The paper's verifier treats loops using supplied proof machinery; this is not an LLM system.

§7.2, pp.10–11 evaluates abstracted Windows-driver programs: “heap manipulation has been abstracted”. It synthesizes initialization and kernel-call constraints for six driver variants in Table 1. §7.2 reports “6-7 procedures” and “1 to 184 seconds” for initialization constraints. For kernel calls it finds assumptions equivalent to, or weaker than, the manually written stubs after author inspection. **Inference:** this is directly relevant to working backward from a requested guarantee to the environmental assumptions an agent must expose. Synthesizing the assumption and validating that the actual environment meets it are separate tasks.

### Related-reference full-text gaps

*Enhancing automated loop invariant generation for complex programs with large language models* (ACInv), Ruibang Liu, Minyu Chen, Ling-I Wu, Jingyu Ke, Guoqiang Li, Science of Computer Programming 248, 2026, 103387, [DOI](https://doi.org/10.1016/j.scico.2025.103387), is a relevant direct reference in Beyond Basic Specifications (§6.2/Ref.26); publication identity recovered through Crossref, but no open full text recovered after arXiv, OpenAlex, Semantic Scholar, GitHub and publisher API searches. No results are claimed from its title or citing summary.

Additional classical mining references in Beyond Basic Specifications include *Mining specifications*, *The Daikon system*, *Javert*, *General LTL Specification Mining*, *Perracotta*, and *Learning Temporal Specifications from Imperfect Traces Using Bayesian Inference*. Daikon was followed above. The other mining publications have not received full-text reviews in this fragment; they remain related-work coverage gaps, rather than being silently counted as irrelevant.

## Statement autoformalization and semantic evaluation



**Specification-Guided Autoformalization with Source-Grounded Blueprints (2026): not found under that title.** Exact-title searches in OpenAlex, arXiv and DBLP, plus searches for the distinctive subtitle, did not identify a matching record; Google returned a JavaScript challenge. This is an unresolved identification gap, not evidence that the paper does not exist.

### SHADOWBENCH: Toward Reliable Automatic Evaluation of Semantic Alignment in Autoformalization

Hojae Han, Jongyoon Kim, Sanghyeok Park, Dongwook Cheon, Yeachan Park, Myeong Jae Jeon, Sunjong Choe, Soonho Kong, Wonseok Hur, Seung-won Hwang, Donghoon Hyeon. arXiv, 2026, v3 dated 5 September. [Paper](https://arxiv.org/abs/2608.29270v3); [artifact](https://github.com/ldilab/shadowbench). Saved PDF: `/hdd1/sichanghe/paper_collection/SHADOWBENCH- Toward Reliable Automatic Evaluation of Semantic Alignment in Autoformalization, Hojae Han et al., arXiv, 2026/paper.pdf`.

**Human input.** The task supplies an “informal theorem statement and proof” (§1). Five mathematicians curate source problems, repair reference Lean code, and check its meaning. Qwen3-235B drafts auxiliary statements, called shadows; people repair them. §4.1 quotes the initial-draft coverage as “85% of problems”; §4 reports construction effort as “about 10 minutes per problem”.

**Checked.** Generated declarations and proofs must “type-check in Lean” (§3.3); Lean checks generated mathematical statements/proofs and both implication directions between the generated statement and the shadows. Their conjunction has a checked completeness certificate against the human-reviewed reference. This evaluates mathematical meaning; neither distributed safety/liveness nor running software is verified.

**Automatic.** Compiler checks, adapter rewriting, and an LLM fallback establish the implications; human review is paid once per benchmark item. Failures can still be adapter failures.

**Numbers.** 178 problems, eight mathematical areas (§4, Tables 1–2). The strongest configuration, Claude Code Opus 4.8 plus Numina, has compilation/soft-alignment/full-alignment rates “61.8 18.3 11.2” (Table 3). Across six configurations, agreement with experts is “0.988”, precision “1.000”, recall “0.930” (Table 4). Namespace mismatches cause the remaining false negatives (§6.1).

**Inference for this project.** Reusable human-reviewed consequence checks could test whether an agent preserved each intended guarantee. Their completeness still depends on a trusted interpretation of the user's request.

### Reliable Evaluation and Benchmarks for Statement Autoformalization

Auguste Poiroux, Gail Weiss, Viktor Kunčak, Antoine Bosselut. EMNLP 2025, pp.17947–17969. [Publisher paper](https://aclanthology.org/2025.emnlp-main.907/); [PDF](https://aclanthology.org/2025.emnlp-main.907.pdf); [arXiv](https://arxiv.org/abs/2406.07222). Saved PDF: `/hdd1/sichanghe/paper_collection/Reliable Evaluation and Benchmarks for Statement Autoformalization, Auguste Poiroux, Gail Weiss, Viktor Kuncak, Antoine Bosselut, EMNLP, 2025/paper.pdf`.

**Human input.** Natural-language mathematical statements; few-shot translation examples for ProofNet#, or preceding Lean file context for RLM25. Humans correct reference statements and label generated statements for semantic equivalence. ProofNetVerif has “3752” labeled pairs, “1142” correct (§3.1); RLM25 has “619” statement pairs from six existing mathematical projects (§4.1).

**Checked.** BEq+ checks “two implication directions” (§3), attempting to prove both implications between candidate and reference using CPU-only Lean tactics (§3). This checks mathematical statements, not running code or temporal safety/liveness. It is an incomplete equivalence procedure. Manual accuracy remains separate.

**Automatic.** Sampling, type-check filtering, similarity-based candidate selection, and symbolic equivalence checks. Reference construction and final semantic labels require people.

**Numbers and quotations.** BEq+ Table 1 precision/recall/F1: “98.0”, “48.3”, “64.7”. Table 2 Pearson/Kendall: “0.974”, “0.872”. §4.2 found “118 entries with formalization errors” in Lean 4 ports, “31.8%”. GPT-4o sampling with 50 candidates reaches manual ProofNet# accuracy “45.1” and BEq+ “23.4”; RLM25 BEq+ “31.6” (Table 6, p.17954). These are different measures, not interchangeable success rates. No-context RLM25 results are near zero; local definitions, namespaces, and variables matter (§6.3).

**Inference for this project.** Evaluate specification quality separately from proving it. Context and the quality of expected answers can dominate the score.

### Related-work scope

`rg` searches across `01_*.md`–`09_*.md` found none of the following titles. These mathematical studies matter for semantic evaluation; they supply no verified distributed implementation.

### FormalAlign: Automated Alignment Evaluation for Autoformalization

Jianqiao Lu, Yingjia Wan, Yinya Huang, Jing Xiong, Zhengying Liu, Zhijiang Guo. ICLR 2025 confirmed by the [conference page](https://iclr.cc/virtual/2025/poster/30594); the [final OpenReview paper](https://openreview.net/forum?id=B5RrIFMqbe) returned a 403 challenge. The latest arXiv PDF served by the unversioned URL is the 14 October 2024 v1 work-in-progress preprint, so the numbers below refer to that version. [Paper](https://arxiv.org/abs/2410.10135v1); [code](https://github.com/rookie-joe/FormalAlign). Saved PDF: `/hdd1/sichanghe/paper_collection/FormalAlign- Automated Alignment Evaluation for Autoformalization, Jianqiao Lu et al., ICLR, 2025/paper.pdf`.

**Human input.** Existing aligned natural-language/Lean pairs and hand-designed mutation strategies: change constants, exponents, types, variables, equality, or pair an unrelated theorem (§4.1, Table 2).

**Checked/automatic.** §3.3 evaluates “pairs of informal input” and formal output by an “alignment evaluation score”. A trained Mistral-7B scores semantic alignment through token probabilities and embedding similarity (§3). This is a learned score, not a proof of equivalence, safety, or liveness, and examines mathematical statements rather than executing software.

**Numbers.** §4.3 supplies “21 negative examples” per positive. Table 3 alignment-selection scores: FormL4-Basic “99.21”, MiniF2F-Valid “66.39”, MiniF2F-Test “64.61”. §4.4's human comparison: “79.58%” versus FormalAlign “65.00%”; expert effort is “3 hours” for “80 items”; automation takes “less than 2 minutes” (§4.4). Tables 4–6 instead repeat 66.70 for MiniF2F-Test; this internal discrepancy is unresolved.

**Inference.** A useful cheap filter needs independent human validation and realistic errors; mutation-based selection accuracy is not evidence of universal agreement with intent.

### Faults in Our Formal Benchmarking: Dataset Defects and Evaluation Failures in Lean Theorem Proving

Pawan Sasanka Ammanamanchi, Siddharth Bhat, Stella Biderman. ICML 2026, PMLR 306; arXiv v1 28 June 2026. [Paper](https://arxiv.org/abs/2606.29493); [checkers and corrected snapshots](https://github.com/Shashi456/atp-checkers). Existing collection PDF reused, under the identically named directory ending `arXiv, 2026`.

**Human input.** The model receives an “informal problem statement” (§4.2), paired with its Lean statement. Existing informal/formal benchmark pairs, labeled errors, taxonomy descriptions and few-shot examples; humans adjudicate semantic mismatches and repair selected statements (§§3–4).

**Checked/automatic.** Static analysis uses “semantic guard proving” (§4.1). Lean metaprograms flag arithmetic/domain hazards and attempt guard proofs. Some findings include counterexamples or vacuity certificates; LLMs screen context and semantic mismatch. These are mathematical benchmark audits, not software safety/liveness verification. Compiler acceptance alone does not check whether the right statement was proved (§2).

**Numbers/limits.** Table 4 totals quote “10,318 4,833 398”: problem occurrences, findings, mechanically certified findings. They cover five datasets and 13 variants, with duplicates across forks; they are not unique-error prevalence. §4.1 prose says 399, conflicting with the table and abstract's 398. Semantic screening uses 92 problems and 552 classifications (§4.2). Sonnet thinking precision/recall/F1: “0.30 0.82 0.42”; GPT thinking: “0.24 0.91 0.37” (Table 6). Appendix H instead gives Sonnet recall 0.87. Correcting 20 unprovable statements changes successes from zero to “3/20” and “2/20” for two provers (§4.3).

**Inference.** Audit benchmark statements, proof artifacts, and the evaluation harness; count certified bugs separately from warnings and LLM judgments.

### miniF2F-Lean Revisited: Reviewing Limitations and Charting a Path Forward

Azim Ospanov, Farzan Farnia, Roozbeh Yousefzadeh. NeurIPS 2025; arXiv v1 5 November. [Paper](https://arxiv.org/abs/2511.03108); [corrected benchmark](https://github.com/roozbeh-yz/miniF2F_v2). Existing collection PDF reused, under the identically named directory ending `arXiv, 2025`.

**Human input.** Original competition questions; humans check correspondence and correct informal/formal problems. Two versions separate a simplified task from the actual competition task, including choosing an answer before proving it (§§1–2).

**Checked/automatic.** An autoformalizer translates the question, theorem provers generate proofs, and Lean REPL checks them; fidelity is “judged by human experts” (§3). Mathematical reasoning is evaluated, not executable software safety or liveness. The end-to-end pipeline retains a human semantic judgment.

**Numbers.** 488 problems; the authors “correct over 300 Lean 4 statements” (§1, p.3) and identify “16 problems” with no solution (§2, p.5). Table 2 Herald test accuracy: automated judge “97.5%” versus human “62.7%” on v1. Table 1 competition-faithful Kimina-plus-Goedel-V2-7B test scores: “49.2”, “69.7”, “61.5” for v1/v2s/v2c; validation: “54.9”, “70.1”, “62.3”. The abstract's rounded 40%/70% should not replace these split-specific numbers.

**Inference.** Give credit only when the proved theorem matches the user's original task; answer leakage and simplification otherwise inflate apparent success.

### ASSESS: A Semantic and Structural Evaluation Framework for Statement Similarity

Xiaoyang Liu, Tao Zhu, Zineng Dong, Yuntian Liu, Qingfeng Guo, Zhaoxuan Liu, Yu Chen, Tao Luo. ICLR 2026; arXiv v2, 9 February 2026. [Paper](https://arxiv.org/abs/2509.22246v2); [conference](https://iclr.cc/virtual/2026/poster/10008659); [code](https://github.com/XiaoyangLiu-sjtu/ASSESS). Saved PDF: `/hdd1/sichanghe/paper_collection/ASSESS- A Semantic and Structural Evaluation Framework for Statement Similarity, Xiaoyang Liu et al., ICLR, 2026/paper.pdf`.

**Human input.** Existing natural-language mathematical problems and reference Lean statements. Seven experts label generated/reference pairs for equivalence and structural similarity; §4.1 says experts “annotated and cross-validated each pair”. Four LLMs generate candidate statements, then Lean filters compilation failures.

**Checked/automatic.** Lean parses statement pairs into expression trees. CPU-only tactic search attempts to prove equality, while the number of remaining tree edits gives partial similarity when proof fails (§3). This scores mathematical statements, not running software or safety/liveness. §3.3.2 explicitly calls the implemented distance a “tractable upper bound”, rather than the exact theoretical distance.

**Numbers.** EPLA total “1,247” pairs: “831” miniF2F and “416” ProofNet (§4.1, Table 2). Search limits: “32” nodes, “10 minutes” (§4.2). Table 3 miniF2F precision/recall/accuracy/Kappa: “87.97% 69.06% 70.16% 0.35”; ProofNet: “68.49% 81.97% 67.31% 0.30”.

**Inference.** Graded similarity helps diagnose near misses; a high similarity score is not an equivalence proof. Reported binary statistics sweep thresholds on this same benchmark (§4.2), so a separately held-out decision threshold would strengthen deployment evidence.

### Autoformalization search gaps

The web-search tool returned HTTP 404, arXiv API returned 429, and OpenAlex worked initially but later stopped yielding matches. Primary arXiv/publisher PDFs and local full texts supplied the evidence above. Requested-paper main texts and relevant appendix methods/results were read; additional related papers above were read in their main text with relevant appendices consulted. Repositories were linked, not executed.

**Rethinking and Improving Autoformalization: Towards a Faithful Metric and a Dependency Retrieval-based Approach** (Qi Liu, Xinhao Zheng, Xudong Lu, Qinxiang Cao, Junchi Yan; ICLR 2025 spotlight): title/authors/venue confirmed by the [official artifact](https://github.com/Purewhite2019/rethinking_autoformalization), but its [full PDF](https://openreview.net/pdf?id=hUb2At2DsQ) and API returned 403 challenge pages; no open PDF recovered, so no full-text findings claimed. Crossref yielded unrelated papers; Semantic Scholar returned 429.

Slice counts: two requested papers found/read, one requested title unresolved; four additional related papers assessed; one additional related paper identified but full text blocked; four new PDFs saved and two existing PDFs reused.

## Requirements, traceability, and surveys

### Automated Trace Link Recovery Between Natural Language Requirements and Formal Specifications via LLMs

Jiandong Li and Shaoying Liu. TASE 2026, LNCS 16697, pp. 1–16. [Publisher](https://doi.org/10.1007/978-3-032-30693-7_1). Published online 2 July 2026; the publisher's generated citation says 2027. **Full-text gap:** the chapter is subscription content; no open full PDF was found through the publisher, OpenAlex, or title/author searches. The following is limited to the publisher abstract and references, not a full-paper assessment.

Humans supply both a structured natural-language requirements document and an already written formal specification. The tool extracts desired functions and process specifications with their types, then asks an LLM to recover links between them. These links aid review and maintenance; the abstract reports no proof of either safety or liveness, no code verification, and no proof that a recovered link establishes semantic equivalence. The abstract says the evaluation spans “four projects” including ATM and an avionics Sun Search System. It compares GPT-4o, Gemini 3.1 Pro, and DeepSeek V3 with textual retrieval baselines and says GPT-4o is most time-efficient, but gives no numerical precision, recall, F1, or timings. Input anchor: “structured natural language requirements document”; output anchor: “establishing the trace links between them using LLMs” (abstract). The publisher links [project materials](https://app.box.com/s/v72gsota48fo7qqf53ruw672160acl47); these have not established open full-paper access.

**Inference:** useful bookkeeping for a vague-intent-to-proof agent: every human requirement should remain linked to the formula, model action, and code obligation meant to implement it. A link's presence is an audit aid, not evidence that the formula expresses the intended meaning.

### Formal requirements engineering and large language models: A two-way roadmap

Alessio Ferrari and Paola Spoletini. *Information and Software Technology* 181, 107697, 2025. [DOI](https://doi.org/10.1016/j.infsof.2025.107697); [open author PDF](https://iris.cnr.it/retrieve/81ce8ff5-7b2c-46c8-84d6-9fc5a08951bb/Ferrari-Spoletini_Formal%20Requirements_2025.pdf). Saved in the paper collection. This is a proposal for how LLMs could help people create, explain, translate, and maintain formal requirements, and how formal methods could check LLM-produced artifacts. Its explicit scope is a “vision paper” (§1, p. 2); it does not present an evaluated autonomous agent.

**Human input and automation.** The worked distributed example begins with three human requirements: intact messages, preserved order, and flow control. Humans write a PROMELA sender/receiver model, choose a maximum of ten messages, and formalize flow control as equality between the last sent and received messages at the receive point. SPIN automatically explores that finite model. The synchronized version passes; removing the acknowledgment channel produces a counterexample (§3, pp. 6–7). Reported pass costs are “77 states, 86 transitions, and 128.730 MB” (p. 7); the failing model explores “52 states” (same page). The property is **safety about a bounded model**, not an unbounded liveness proof or proof of the Python socket implementation subsequently shown. Message corruption and loss are excluded by model construction (§3, p. 6); that limits what its message-integrity result establishes.

**Where the proof stops.** Python sender/receiver code is displayed, but the authors explicitly say “additional formal verification may be required” (§3, p. 8). No checked refinement from PROMELA to Python, verified socket semantics, or source repository for this example is reported. The proposal that LLMs translate requirements into assertions/temporal formulas, models into code, and counterexamples into explanations is future work (§4). Their ChatGPT-3.5 examples for requirements elicitation and analysis were edited and sometimes iteratively prompted (§5, p. 11); these are illustrations, not success-rate measurements.

**Inference:** this paper usefully separates four human decisions an agent still has to expose: assumptions about the environment, the abstraction being checked, the formula being checked, and the relation between that abstraction and executing code. Merely generating each artifact does not close those gaps.

### AI-Enabled Formal Methods for Verifiable Software Requirements: A Survey

Arshad Beg, Diarmuid O'Donoghue, and Rosemary Monahan. ResearchGate preprint DOI [10.13140/RG.2.2.22983.87205](https://doi.org/10.13140/RG.2.2.22983.87205), indexed as 2026. **Exact-version gap:** the ResearchGate endpoint returns HTTP 403; its full text could not be read. A related manuscript by the same authors, *Traceable and Verifiable Software Requirements: A Synthesis of AI-Enabled Formal Methods*, is openly available at [Zenodo](https://doi.org/10.5281/zenodo.17772835), posted 1 December 2025 and updated in 2026. That PDF was saved and read; the following applies to that named manuscript, not an assumed identical ResearchGate version. Zenodo's description says it was submitted in November 2025, received feedback in July 2026, then resubmitted elsewhere. The PDF's placeholder journal metadata is not evidence of acceptance.

**Human input.** Its empirical work supplies existing C functions and tutorial contracts. Humans configure Frama-C, select tools and solver flags, write preprocessing scripts, sometimes manually edit source to remove unsupported operations, and restrict path exploration. The experiments do not demonstrate an LLM that starts with a vague request and independently derives a correct functional contract. RTE generates checks for runtime errors; EVA performs static value analysis; WP plus Z3/Alt-Ergo/CVC4/CVC5 tries to discharge obligations; PathCrawler generates concrete inputs for feasible paths (§§3–4).

**What is checked.** EVA/RTE/WP concern properties of C code, principally memory/arithmetic safety and supplied obligations. PathCrawler executes instrumented code on generated inputs; coverage is not a proof of functional correctness. The tutorial experiment contains “36” programs; Table 3 (p. 18) shows a five-program subset with “6/6”, “5/7”, “6/8”, “4/8”, and “13/13” goals proved for each of the four solvers. Triangle-classification experiments give 20 goals, with Alt-Ergo/CVC5 proving 15 and Z3/CVC4 proving 13 after test-derived assertions are added (§3.1, pp. 16–17). These goals are not an intent-adequacy score.

**Numbers and internal inconsistencies.** §4 (p. 19) describes fifty base programs in three categories, or “150” instances. Table 4 (p. 20) instead lists “52” correct, “60” obvious-difference, and “53” subtle-difference files, totaling 165. Its mean statement coverages are “75.00”, “77.73”, and “58.84” percent; its success-rate entries are “0.308”, “0.650”, and “0.623”. The following prose claims the correct category has the highest success and coverage, which conflicts with those table entries. Treat this draft as an experience report with unresolved accounting, not a clean benchmark result.

PathCrawler succeeds on four of twenty files initially, then “fifteen out of twenty” after manual/script adaptation (§4.3, p. 22). A quicksort run generates “11” cases from “110” explored paths, of which “99” are classified infeasible; all verdicts are unknown and runtime is “1s” (Figure 9) (pp. 23–24). Critical anchor: “oracle” unavailable (§4.3, p. 23). This is exactly the distinction the end goal needs: automated path generation did not establish what output the human wanted. Source adaptation and the missing oracle are explicitly described on p. 23; the abstract describes a survey exceeding one hundred studies.

**Inference:** use its failure cases to design the harness: source edits must be tracked, tests need independent expected results, runtime-safety annotations must be separated from functional contracts, and all reported denominators must reconcile before comparing systems.

### Toward Safe LLM Agents: A Survey of Specification, Verification, and Enforcement

Pierre Dantas, Lucas Cordeiro, Ehsan Nowroozi, and Tihanyi Norbert. arXiv preprint, 2026. [Paper/PDF](https://arxiv.org/abs/2608.14590); [review materials](https://doi.org/10.5281/zenodo.22874309). Saved and read. This reviews specification acquisition, checking agent plans, and enforcing constraints during tool execution. It reports “38 studies” from “six databases” (§3, pp. 5–6). This is a secondary synthesis, not a new verified system or new measurement of an autonomous agent.

**Human input and guarantees.** The surveyed workflows begin with a human task, policy, or requirements text; the formal-methods subset also needs a formula, DSL rule, planning domain, or modeled workflow. LLM translation and plan generation may be automatic; model checking applies to the resulting formal model, while runtime enforcement checks actual intercepted actions. The survey distinguishes these stages, but supplies no single proof that human intent, extracted model, and live tool behavior agree. Its focus is safety; it presents no new distributed-system liveness proof (§1.1, p. 2).

**Numbers with their actual scope.** The abstract's headline “24 % to 35 %” concerns PDDL planning formalization, not a pooled correctness rate for all natural-language-to-formal translation (§2.3, p. 4; §6.1, p. 14). Do not reuse it as a measured rate for TLA+, Lean, Verus, or arbitrary LTL. The abstract also reports that interception can reach “94 %” while safe completion remains “less than 5 %”; these come from the single verifier-tax study, not a replicated field-wide result (§6.3, pp. 14–15). The authors explicitly note “a single study finding” (§6.3, p. 15). Their review itself had “a single reviewer” (§9.4, p. 25). No meta-analysis was possible and the review's certainty judgments are largely Low/Very Low (§9.4).

**Evaluation lesson, with a limitation.** The review defines safe success as the fraction of tasks completed correctly while satisfying the safety property (§2.5, p. 5). **Inference:** measure both safe completion and individual violations prevented; a monitor can reject each dangerous step while never letting the agent finish. This is particularly relevant if a proof agent is evaluated only by verifier acceptance: it can satisfy its formal checks while failing the requested task. The draft also says current systems check short plans/finite workflows, but those broad limits should be audited against primary papers rather than treated as impossibility results.

### Software is infrastructure: failures, successes, costs, and the case for formal verification

Giovanni Bernardi, Adrian Francalanza, Marco Peressotti, and Mohammad Reza Mousavi. Chapter/preprint, first posted 2025; the read PDF is arXiv v4, 29 January 2026. [Paper/PDF](https://arxiv.org/abs/2506.13821). Saved and read. This is a teaching and policy argument based on failure costs and industrial reports. It performs no new automated specification synthesis and proves no new system safety/liveness theorem.

**Human input and checked artifacts.** Its examples span humans writing formal state-machine tables (Philips ASD), explicit requirements/models (SPIN/TLA+/Alloy), and program annotations/code (Frama-C, theorem provers). Those existing tools automate model exploration, proof checking, some code generation, and tests; this chapter's contribution is collecting the experiences and costs. Distinguish design-model checking from source-code proofs case by case. It explicitly phrases the strongest generic claim as proving that “(at least models of) a program behaves as expected” (§1, p. 4).

**Relevant quantitative evidence, all secondary.** §6.1 (p. 33) reports “four-fold better quality” measured as defects per line and “three-fold increase in productivity” for ASD-generated Philips backend components; ASD translates tables to CSP and checks deadlock freedom/domain properties. §6.2 (p. 33) gives a projected 4SECURail benefit/cost ratio of “5.05”. §6.3 (p. 34) reports Frama-C handling “85%” of assertions on average “50 KLOC” blocks in a Dassault robustness pilot; the cited savings are a person-month per flight release. §6.4 (pp. 34–35) discusses eSpark service migration, AWS replication, Thales JavaCard C verification, and “six subtle bugs” found by binding CCF C++ traces to TLA+. These are summaries of heterogeneous primary reports, not a common benchmark or controlled estimate of labor saved by LLMs. Avoided failures are inherently hard to price (§1, p. 5).

**Inference:** use this source to choose consequential problems and record labor baselines, not to score an intent-to-proof system. A trustworthy evaluation should separately count model-writing time, specification review, source instrumentation, proof effort, and bugs discovered.


## Relevant missing references followed from the surveys

These titles were checked with `rg` against `01_*.md` through `09_*.md`. Their title/tool names were absent. ClarifySTL's PDF already existed in the collection; the other available PDFs below were newly saved. These are direct reference follows, not papers discovered independently and presented as survey results.

### AgentSpec: Customizable Runtime Enforcement for Safe and Reliable LLM Agents

Haoyu Wang, Christopher M. Poskitt, and Jun Sun. First arXiv 2025; the read v3 manuscript carries ICSE 2026 metadata. [Paper](https://arxiv.org/abs/2503.18666); [code](https://github.com/haoyuwang99/AgentSpec).

Humans write safety rules with an event trigger, Boolean check, and intervention; domain-specific predicate code and enforcement actions are supplied or LLM-generated. The initial evaluation uses manually written rules from risk descriptions (§5.2). LLM generation receives background domain/tool information, safety requirements, and examples (§4). The resulting runtime monitor intercepts running agents' actions. It demonstrates **safety enforcement on tested executions**, not a proof that all intended rules have been discovered, not proof of arbitrary generated predicates, and not liveness.

For code tasks, the evaluation has 25 risk categories and 30 cases/category. For household tasks, manually developed rules reduce hazard fulfillment to zero, while safe task completion changes from “58.62%” to “54.26%” (Table 4, p. 6). Automatically generated embodied-agent rules have “95.56%” precision and “70.96%” recall; generated code rules detect “87.26%” risky cases (§5.3, Table 6, p. 7). These generation numbers must not be replaced with the manual-rule zero-hazard result. Human-input anchor: “Initially, the rules were manually developed” (§5.2, p. 5). **Inference:** useful enforcement machinery after intent has been made precise; weaker evidence that vague intent becomes a complete specification.

### VeriGuard: Enhancing LLM Agent Safety via Verified Code Generation

Lesly Miculicich, Mihir Parmar, Hamid Palangi, Krishnamurthy Dj Dvijotham, Mirko Montanari, Tomas Pfister, and Long T. Le. arXiv, 2025. [Paper](https://arxiv.org/abs/2510.05156). No public implementation URL is supplied in the examined main text.

A human supplies a security request plus an agent schematic containing task, inputs/outputs, tools, context, and environment. An LLM generates both a Python policy and its constraints. A validator asks clarification questions; if no person answers, an internal module chooses defaults. LLM-generated pytest cases test the policy, and Nagini verifies the policy against the generated contract (§§3.1–3.2). Runtime integration then invokes that checked policy before proposed actions. This is **a code-policy proof plus runtime checking**, chiefly safety; it is not a proof of semantic equivalence to the original request. Both policy and constraints can be changed after verifier feedback. The authors explicitly require “manual validation by the user” for intent alignment (§5.3, p. 11).

A critical trust gap remains: runtime argument extraction uses “a flexible LLM-based component” (§3.3.1, p. 6), so the verified policy can receive wrongly extracted facts. In unattended clarification, the system picks “most contextually plausible interpretations” (§3.2.2, p. 5); plausibility does not establish intent.

Table 1 (p. 8) reports average ASB attack success “0.0” percent for VeriGuard across each tested backbone; average task success for Gemini-2.5-Flash is “63.3” versus “40.2” for the direct LLM guardrail. Table 2 (p. 9) reports EICU-AC accuracy “100.0” for three VeriGuard backbones, but Mind2Web-SC is below perfect. These are benchmark results, not a theorem about arbitrary prompts or real patient databases. **Inference:** its architecture fits the end goal more closely than pure monitor papers, but evaluation should separately score human clarification fidelity, contract strength, policy proof success, and extraction correctness.

### Enforcing Temporal Constraints for LLM Agents (Agent-C)

Adharsh Kamath, Sishen Zhang, Calvin Xu, Shubham Ugare, Gagandeep Singh, and Sasa Misailovic. arXiv, 2025. [Paper](https://arxiv.org/abs/2512.23738); [code](https://github.com/structuredllm/agent-c).

Developers encode policy in a DSL over tool-call ordering, argument values, returned values, and state. Agent-C automatically translates the rule to first-order logic, invokes Z3 before execution, and constrains generation or asks for another compliant action. The paper proves soundness of the formal enforcement algorithm: an accepted tool call preserves trace compliance (Theorems 2–3, §§5, pp. 17–18). These are mathematical proofs about its formal operational semantics plus experiments on running simulated tool agents. They establish **safety relative to the supplied rules**, not that the rules cover all human intent, and not eventual task completion.

Its retail evaluation has “115” benign tasks; airline has “50”; authors add “17” adversarial tasks in each domain (§6, p. 18). The key human-work anchor is “we encode these policies” (§6). Utility counts tasks both completed and conforming, so the Safe Agents survey's claim that Agent-C reports only action conformance is misleading. For GPT-5, the abstract (p. 1) gives utility “66.1%” before versus “70.6%” with Agent-C, alongside “100% conformance, 0% harm” on evaluated scenarios. A separate experiment has an LLM translate the policy to the DSL: retail Qwen3-8B obtains “100% conformance” and “42.11% utility”, the same as manual rules (§7.4, p. 22). **Inference:** this is useful primary evidence that formal execution constraints can preserve both safety and task completion; generated-rule fidelity still needs a separate adequacy check.

### ProbGuard: Proactive Runtime Monitoring for LLM Agent Safety via Probabilistic Prediction

Haoyu Wang, Christopher M. Poskitt, Jiali Wei, and Jun Sun. First arXiv 2025 under the shorter title cited by the survey; the read v4 (3 August 2026) carries ASE 2026 metadata. [Paper](https://arxiv.org/abs/2508.00500); [code](https://github.com/haoyuwang99/ProbGuard).

Domain experts define unsafe states, predicates, valid abstract transitions, and safety properties; a user chooses a probability threshold. The system learns a finite Markov model from recorded executions, automatically calculates future safety probabilities with PRISM, and warns, halts, or prompts the agent to reconsider (§§3–6). The Markov assumption means future behavior is modeled using the current abstract state. The paper gives a conditional statistical accuracy theorem about a learned model, not deterministic safety/liveness of the underlying running system.

Its **actual experiments do not meet the theorem's sample requirement**: “30 traces per scenario” and “below the bounds” (§7, p. 10). In household tasks, no monitor gives unsafe rate “40.63%” and completion “59.38%”; reflection gives “14.07%” unsafe and “47.74%” completion (Table 2, p. 9). Thus the abstract's “80.4% of the baseline task completion” is a relative retention figure, not absolute task completion. **Inference:** this distinction changes how the Safe Agents survey's number should be read.

Driving experiments use Apollo's neural/control software in simulation, rather than an LLM driver (§5.2, p. 7). Early warnings can reach 38.66 seconds at a strict threshold, but the zero-false-positive threshold has maximum 15.84 seconds; stronger thresholds yield many false positives (§5.2). The supplied abstraction and changed task distribution remain limitations even if enough samples were collected (§7). This is a useful evaluation design for probabilistic predictions and safety/utility tradeoffs, not proof that an agent has inferred a complete spec.

### The Verifier Tax: Horizon Dependent Safety Success Tradeoffs in Tool Using LLM Agents

Tanmay Sah, Vishal Srivastava, Dolly Sah, and Kayden Jordan. arXiv, 2026. [Paper](https://arxiv.org/abs/2603.19328). No artifact repository link was found in the examined paper.

Humans supply τ-bench's tasks and procedural policies, then manually write safety rules for a verifier prompt. The planner, actor, and verifier use the same LLM, with different prompts. The verification here is **an LLM's empirical judgment of running simulated actions**, not SMT, model checking, or a sound proof. Deterministic scripts audit identity/authentication/authorization violations after execution, with another LLM used for cross-checking (§3.6).

The evaluation aggregates “2,970 episodes” (§3.5, p. 3), uses GPT-OSS-20B and GLM-4-9B, and averages three runs. GPT-OSS-20B Triad-Safety on retail obtains success “21.5 ± 2.7” percent and safe success “0.6 ± 0.5” percent (Table 1, p. 6). Tokens increase “2.0–2.8×” (§1, p. 2). **Critical qualification:** after three failed revisions, “the last proposal is accepted by default” (§3.5, p. 3). So this experiment does not show that a sound hard blocker causes the failures claimed by the survey. Its approximately 94% figure is an intervention/interception statistic, and some parts of the paper describe it by episode rather than as a percentage of unsafe actions prevented (§4.5).

**Inference:** the safe-success metric is useful; the broad causal story needs stronger controls. Compare a trusted state-aware monitor with an LLM judge, keep model turn budgets equal, and test a version that does not execute a known rejected action.

### Agentproof: Static Verification of Agent Workflow Graphs

Melwin Xavier, Vaisakh M A, Melveena Jolly, and Midhun Xavier. arXiv, 2026. [Paper](https://arxiv.org/abs/2603.20356). Public implementation URL was not found in the examined text.

Humans provide a workflow, tool declarations, human-gate requirements, and temporal policies. The tool automatically extracts an abstract graph from LangGraph/CrewAI/AutoGen/Google ADK, checks graph structure, and compiles the policy DSL to finite automata. Graph×automaton exploration checks all modeled graph paths; a runtime mode checks emitted events (§§4–6). This is **model safety checking and structural reachability**, not a proof of arbitrary tool implementations. The absence of an exit path detects a structural termination defect; it does not prove that every execution eventually reaches the exit.

The evaluation uses “18 agent workflows” (§7.1, p. 12) authored from examples and deliberately including defects, rather than a prevalence study of production agents. It defines “15” policies and generates “180” random traces (§7.3). Structural checks detect the injected defects; the optional human-gate check has precision “0.75” (Figure 6, p. 15), with arguable cases excluded from that precision denominator. A synthetic 5,000-node graph takes “104.7” milliseconds for **structural checks** (Table 6, p. 15), not a 5,000-node temporal-product benchmark. Input/semantic boundary anchor: “the extractor faithfully reads the graph structure” (trust boundary, §3, p. 4). **Inference:** the model extraction itself belongs in the evaluation's trusted boundary; proof of a graph property cannot guarantee unmodeled tool behavior.

### LLMs as Planning Formalizers: A Survey for Leveraging Large Language Models to Construct Automated Planning Models

Marcus Tantakoun, Christian Muise, and Xiaodan Zhu. arXiv, 2025, read v2 (25 October 2025). [Paper](https://arxiv.org/abs/2503.18971). This survey organizes natural-language-to-planning-domain/problem generation, editing, and benchmarks. Its inputs are user/environment descriptions, goal/initial-state information, and sometimes supplied domain schemas; LLMs generate planning models, while classical planners and validators operate on those models. The survey performs no new source-code safety/liveness proof.

Its scope says “approximately 80 existing works” (§2.3, p. 3). **Source audit:** full-text searches for 24.8, 35.1, 24%, and 35% found no matching semantic-correctness statistic in this cited survey. Consequently Safe Agents' headline percentage cannot be justified by this citation. The primary paper instead emphasizes specification alignment as a research question and explains that a validator can check a plan with respect to a domain, while problems remain in the domain being wrong (§§3.1–3.3). **Inference:** keep plan validity relative to its formal domain separate from accuracy of that domain as a description of the human world.

### ClarifySTL: An Interactive LLM Agent Framework for STL Transformation through Requirements Clarification

Yue Fang, Zhi Jin, Jie An, Jia Li, Hongshen Chen, Xiaohong Chen, and Naijun Zhan. arXiv, 2026; the manuscript's placeholder journal dates/DOI do not establish journal publication. [Paper](https://arxiv.org/abs/2605.01209). Existing PDF reused. No public artifact repository is stated in the examined paper.

A human supplies an informal timed requirement, answers targeted questions about missing quantities/conditions, then chooses between alternative readings. The system detects vagueness/ambiguity, generates questions, refines the requirement, and generates STL. It **evaluates specification translation**, including bounded-response/eventuality formulas, but does not prove a real cyber-physical system safe or live. The evaluation has ten CPS graduate/research participants with at least three years of STL experience, rather than untrained users (§5.1, p. 16). Input anchor: “at least three years of experience” (same section).

The new AmbiEval dataset has “9,200 labeled instances” (§4.2, p. 13). Crucially, Formula Accuracy measures “token-level alignment” (§4.3, p. 14), not exact formula equivalence or percentage of fully correct formulas. Table 3 (p. 17) gives ClarifySTL DeepSTL formula score “67.12” and sampled semantic agreement “82.7”; STL-DivEn gives “70.74” and “84.9”. Semantic agreement is the fraction of generated traces on which the reference and candidate both hold or both fail, not a proof of equivalence. Three experienced participants judge each clarified requirement (§5.1). **Inference:** this paper directly supports using human questions rather than silently inventing thresholds; its expert-user population and token score prevent treating the results as a solved vague-intent interface.

### Full-text access gaps among direct related-work follows

- **VeriPlan: Integrating Formal Verification and LLMs into End-User Planning**, Christine P. Lee, David Porfirio, Xinyu Jessica Wang, Kevin Chenkai Zhao, and Bilge Mutlu, CHI 2025, [DOI](https://doi.org/10.1145/3706598.3714113): found, relevant human-facing planning/constraint interface; ACM PDF returns 403 and attempted author/arXiv access did not yield the correct full paper, so no full-text result is claimed
- **AgentVerify: Compositional Formal Verification of AI Agent Safety Properties via LTL Model Checking**, Eric Fang, 2026, [DOI](https://doi.org/10.20944/preprints202604.1029.v1): found, relevant compositional agent-model safety checking; both Preprints landing page and download return 403, so the survey's claims remain unaudited

## Kubernetes: observed behavior and the limits of a passing check

### Monitoring and Verification of Multitenant Kubernetes Clusters using TLA+ Trace Checking

Ioana Silaş and Adrian Crăciun. FROM 2026, EPTCS 452, pp.51–66. [Published paper](https://doi.org/10.4204/EPTCS.452.4), [open PDF](https://eptcs.web.cse.unsw.edu.au/paper.cgi?FROM2026.4.pdf), [implementation and experiments](https://github.com/zwx13/k8s-runtime-audit). Full 16-page paper read; PDF newly saved in the collection.

**Human input.** The authors wrote a TLA+ model of a chosen tenant-isolation policy, the mapping from Kubernetes audit records to model states, and experimental workload scripts. This is a particular policy rather than a specification inferred from vague wishes. There is no unique Kubernetes multitenancy model (§2.2, p.53). The model omits namespace-local Roles and restricts how tenants receive ClusterRoles. §2.1, p.53: “constructed based on the K8 documentation”. Operators also configure API-server audit logging and the webhook.

**What was checked.** This checks safety conditions on recorded running-cluster activity: inappropriate cross-tenant access, dangling role bindings, tenant cluster-wide bindings, and forbidden cluster-admin namespace bindings. §2.1, p.53 calls this “audit trace checking”; it explicitly distinguishes this from refinement or conformance checking. The trace specification deliberately replays bad actions and accumulates alerts; it does not insist every replayed action satisfy the base model's transition relation. The corresponding base-specification actions are bypassed (§2.3, p.56). No executable Kubernetes implementation proof or liveness proof is reported. The authors used TLC for consistency during model development but omit that investigation's details (§2.1).

The boundary is explicit: “does not prove” the correctness of either implementation or specification (§2.1, p.53). The pipeline relies on available, relevant, ordered observations. The replay order is the order of relevant records in the final stream (§3, pp.58–59). This makes log completeness, ordering, permission abstraction, and starting-state capture part of the trust boundary.

**Automatic work.** A Python webhook receives audit records; filters retain and classify relevant events; NATS JetStream stores ordered batches; custom Java operators let TLC load logs and saved state and publish alerts. State is saved between TLC runs. There is a “one-second interval” between TLC invocations (§3, p.59). The human authors provide the policy, abstraction, and implementation; no LLM use is reported.

**Numbers and concrete cases.** §4.1, p.60 evaluates “5” controlled scenarios. These are controlled RBAC violations, with every scenario detected, not five naturally occurring production bugs: each evaluated violation was detected (§4.1). The cluster had one control-plane node and two worker nodes (§4.1). Workloads comprise 10, 50, 100, 1000 actions and 2, 5, 10 tenants (§4). Each tenant count has 30 runs at 10 actions, 20 at 50, and 10 each at 100 and 1,000 (Tables 1–2, p.63). The batch cap is “50” messages, with “4.5” seconds pull expiration (§4.1, p.62).

At two tenants and 1,000 actions, Table 1 reports 1071.20 mean processed messages and “24.5 ± 0.8” ms non-fetch cost per message. At ten tenants and 1,000 actions, it reports 689.60 mean messages and “70.3 ± 1.7” ms. Workload actions and filtered log messages are different units. Table 2's corresponding end-to-end times are 92302.5 ± 4752.9 and 88718.8 ± 1433.3 ms. Neither is an alert-latency measurement. Specification/code size and human hours are not reported.

**Why it matters (inference).** This offers a useful executable test of a proposed distributed-system policy. It cannot establish that the policy captures what the human wants, that unlogged activity is safe, or that the system eventually progresses. An agent evaluation should preserve the distinction between agreeing with a chosen model and proving implementation refinement.

**Related-work check.** First-pass file 03 already covers *eXtreme Modelling in Practice*, *Smart Casual Verification*, and *Validating Traces of Distributed Programs Against TLA+ Specifications*. The missing trace-checking paper, Ellsberg paper, and ONOS tool are added below. Kyverno, Gatekeeper, Falco, and Capsule are operational policy/isolation tools cited in §5.1; their documentation is not evidence of automatic formal-specification synthesis or implementation proof, so they receive no additional paper entry.

### KOSV: Kubernetes Ownership Safety Verifier

Seke Kazuru. Open software release v0.1.16, Zenodo, 15 August 2026. [Archived release](https://doi.org/10.5281/zenodo.21950899), [pinned source](https://github.com/kazuru-chidumbwe/k8s-ownership-safety-verifier/tree/v0.1.16). **Title clarification:** the exact requested title resolves to software, not a research-paper PDF. OpenAlex also indexes the related manuscript *KOSV: Kubernetes Ownership Safety Verifier — Empirical Validation of ControllerRef Trace Oracles*, [SSRN DOI](https://doi.org/10.2139/ssrn.7359159); its public delivery endpoint returned HTTP 403. No manuscript PDF was saved or read. The open software archive and full README, matrix analysis, threat model, terminology, and reproduction documents were saved and read instead. Version boundary: these v0.1.16 documents pin the methodology and reported experiments to v0.1.10; matrix analysis says “Cite tag v0.1.10”. The archived software version and experimental citation version therefore differ.

**Human input.** The author defines two ownership predicates, writes trace normalization and workload/fault scripts, and chooses a single-node Kind laboratory. [README, Oracles (v0)](https://github.com/kazuru-chidumbwe/k8s-ownership-safety-verifier/blob/v0.1.16/README.md) defines O1 as “At any recorded event, `count(controller=true) ≤ 1`”; O2 flags ControllerRef A→B on the same `(resource, uid)` without expected orphan/DELETE. O3 (controller belief versus API ownership) and O4 (ownership thrashing) are defined but unimplemented. These are author-written safety oracles, not synthesized intent or liveness conditions.

**What was checked and automatic.** A poller records ownership state; normalization creates JSONL traces; Python predicates check sampled snapshots and ownership changes; laboratory scripts exercise known cases and injected observation faults. This is finite execution testing and checker validation, not a proof of Kubernetes. [README, Claim discipline](https://github.com/kazuru-chidumbwe/k8s-ownership-safety-verifier/blob/v0.1.16/README.md): “PASS ≠ proof of absence” because polling is incomplete The [threat model](https://github.com/kazuru-chidumbwe/k8s-ownership-safety-verifier/blob/v0.1.16/docs/THREAT-MODEL.md) assumes honest API validation and excludes privileged clients intentionally forging ownership references.

**Numbers and their meaning.** [Matrix analysis, Verdict](https://github.com/kazuru-chidumbwe/k8s-ownership-safety-verifier/blob/v0.1.16/MATRIX-ANALYSIS.md): “20/20” passing O1/O2 runs, with no failures or inconclusive outcomes There are five runs each of baseline, nominal 500-ms delay, nominal 2,000-ms delay, and clean controller-manager restart. These results assess instrument operation; they are not twenty proofs or discovered bugs. Seeded faults yielded “2/2” detection on the observation layer (Seeded live-trace arms). The supplementary denser-poll experiment reports “6/6” passing runs (Denser-poll sensitivity). Its assumed sampling calculation is not an experimentally injected transient-violation campaign: transients shorter than the effective sampling interval can be missed Human effort and code/specification size are not reported in these documents.

A particularly useful boundary correction appears in [threat model, What v0 delay is](https://github.com/kazuru-chidumbwe/k8s-ownership-safety-verifier/blob/v0.1.16/docs/THREAT-MODEL.md): “does not delay controller↔API traffic” for `eth0` injection The faults slow the external collector path, while controller/API communication remains local. [Reproduction document](https://github.com/kazuru-chidumbwe/k8s-ownership-safety-verifier/blob/v0.1.16/REPRODUCTION.md): “template until a third-party row is filled” Its empty form is not independent reproduction evidence.

**Why it matters (inference).** Use this as an example of evaluating the evaluator: verify injected faults reach the claimed path, distinguish sampling coverage from safety, and test that planted bad observations are caught. Its carefully limited oracle can supplement a generated specification's audit, but cannot supply a universal correctness or progress result.

### Concrete Kubernetes cases

| Problem and guarantee | Tool, people, evidence |
|---|---|
| Cross-tenant successful access; dangling bindings; tenant cluster-wide privileges; cluster-admin namespace bindings. Safety checks on recorded runs | TLA+/TLC audit monitor; Silaş and Crăciun. Five authored scenarios detected (§4.1). Size/effort unstated. [Paper](https://doi.org/10.4204/EPTCS.452.4), [source](https://github.com/zwx13/k8s-runtime-audit) |
| At most one recorded controller owner; unexpected transfer of ownership for one object identity. Sampled safety checks | KOSV Python predicates; Kazuru. 20/20 runs PASS; planted observation faults 2/2 detection. Size/effort unstated. [Archive](https://doi.org/10.5281/zenodo.21950899), [source](https://github.com/kazuru-chidumbwe/k8s-ownership-safety-verifier/tree/v0.1.16) |

## Related-work additions: checking running distributed systems against a human model

These additions come from the Kubernetes trace-checking paper's related work. Searching `01`–`09` for the titles and aliases `Ellsberg`, `Runtime Protocol Refinement`, `Model-Based Trace`, and `ONOS` found no entry for them. The first pass's Heidi Howard/CCF paper is different from Yvonne Howard's paper below. The web search tool failed with HTTP 404; primary-source searches used arXiv, USENIX, and GitHub through `curl`.

### Model-Based Trace-Checking

Yvonne Howard, Stefan Gruner, Andrew M. Gravell, Carla Ferreira, Juan Carlos Augusto. arXiv posting, 2011; the text describes work with 2003-era tools. [Paper and metadata](https://arxiv.org/abs/1111.2825), [open PDF](https://arxiv.org/pdf/1111.2825). PDF saved under `Model-Based Trace-Checking, Yvonne Howard, Stefan Gruner, Andrew M Gravell, Carla Ferreira, Juan Carlos Augusto, arXiv, 2011/paper.pdf` in the paper collection. Full text read; PDF pages below count from the title page.

**What humans supplied.** Humans implemented a distributed travel-booking application, wrote B and Promela models and temporal properties, chose trace fields and insertion points, and connected concrete data to model operations. §2.1.3, p. 5: “inserted the tracing components manually”. The implementation/model correspondence itself was assumed after inspection: §3.1, p. 6, “code inspection” Thus a successful replay does not establish that the model expresses the customer's real intent.

**What was checked.** ProB replayed observed Java execution traces through allowed B operations; Spin checked traces against temporal properties and checked whether model executions could reproduce observed behavior. This checks particular running-code traces against human models, rather than proving all executions of the implementation. The authors explicitly say, §1, p. 2, “detecting errors”; it explicitly disclaims proving their absence The B model has safety invariants for booking consistency, approved payment, and service attempts. The text counts “six invariant clauses” (§3, p. 6). Its temporal example concerns progress: a requested resource should eventually be allocated when available. The modeled implementation fails when Hotel1 is full but Hotel2 has a room, because it keeps trying Hotel1 (§4.1, pp. 9–10). The paper also illustrates replaying three invalid credit-card entries followed by a valid entry (§4.2, p. 11).

**What was automatic; numbers.** ProB performed replay/backtracking; Spin evaluated the temporal formulas. Auxiliary programs translated session identifiers and variable values and built a temporal formula from test actions (§§3.1, 4.2). However the authors summarize the complete workflow, §5, p. 12: “all been manual” The paper labels the workflow steps manual while also describing ProB and Spin automation; it does not precisely separate the remaining manual orchestration from those automated checks. No benchmark success rate, throughput, specification size, or measured person-time is reported. Six invariant clauses and the small examples are the main concrete counts.

**Why it matters (inference).** It exposes a separate evaluation task for an agent that writes a specification: decide which concrete observations correspond to which abstract actions. The first supposed implementation error was bad observation placement: §2.1.3, p. 5, “wrong point in the code” A checker can therefore catch mistakes in the observation setup as well as in the program. I did not locate a current source repository for the case study; the paper points to a 2003 technical report for the complete Promela model.

### Runtime Protocol Refinement Checking for Distributed Protocol Implementations (Ellsberg)

Ding Ding, Zhanghan Wang, Jinyang Li, Aurojit Panda. NSDI, 2025, pp. 1305–1326. [USENIX publication](https://www.usenix.org/conference/nsdi25/presentation/ding), [open PDF](https://www.usenix.org/system/files/nsdi25-ding.pdf). Saved under `Runtime Protocol Refinement Checking for Distributed Protocol Implementations, Ding Ding, Zhanghan Wang, Jinyang Li, Aurojit Panda, NSDI, 2025/paper.pdf`. Full paper and appendices read.

Ellsberg watches each process's incoming and outgoing messages and searches for a permitted protocol execution that explains them. It reports an error when no such execution exists. It can run beside deployed code without collecting a global system snapshot.

**What humans supplied.** The protocol designer supplies a TLA+ protocol; programmers translate it into an executable Go specification, including state updates, state equality, message-to-state inference, reachability pruning, and safe immediate-processing rules. §3.3.1, p. 1309: two inputs, namely a protocol specification and mapping functions from implementation messages to specification messages. The evaluated prototype modifies network APIs to record messages: “11” Etcd, “31” ZooKeeper, and “10” Redis Raft functions (§5, p.1315). A message proxy is a proposed alternative, rather than the evaluated setup. Translation is not automatically derived from a vague request. The optimization helpers apply_asap?, reachable, and lookahead_type were written from scratch (§4, p.1314). Appendix C says the original Raft description lacked important deployed read and reconfiguration behavior, which humans added.

**What was checked.** Running-code message prefixes were checked for protocol refinement under asynchronous or partially synchronous timing and fail-stop failures; Byzantine failures are excluded (§3.1). The intended targets are safety bugs such as stale reads, conflicting leaders, inconsistent replicated logs, and lost updates. The guarantee assumes a correct supplied protocol, a monitor that shares the implementation process's fate, and a faithful trace that is incrementally updated and preserves message order (§3.1, pp.1308–1309). §3.1, p. 1309: “cannot prove” implementation correctness. It cannot see violations that never appear in an outgoing message, and it has not observed all possible executions. Progress is outside its detection guarantee: §1, p. 1306 excludes bugs that “livelock or deadlock”. Appendices A–B separately justify a search optimization; p. 1321 reports “Z3” checks of apply_asap? conditions. That is a check of the monitor's model-level optimization conditions, not a static proof of Etcd, ZooKeeper, or Redis Raft.

**What was automatic.** The monitor incrementally simulates alternative incoming-message orders, searches reachable states, prunes impossible explanations, and alerts. A separate tool uses TLC to generate bounded protocol traces and checks whether the Go translation wrongly rejects them (§4). Humans wrote both the translation and the message mappings.

**Numbers and their limits.** Table 1, p. 1314 gives executable specification sizes: “ETCD 952”, “RedisRaft 894”, “Zookeeper 989”, under “Ellsberg LOC”; Appendix C's component table repeats those totals. The prose in §5 instead describes the Raft specification as approximately 500 lines and the ZooKeeper specification as approximately 2,000 lines. Those prose counts do not reconcile with the tables; use the explicit table totals for comparisons, while preserving this discrepancy. The implementation-specific mapping code is stated separately (§5, p. 1315): “356” lines of Go code for Etcd, “370” lines of Go code for ZooKeeper, and “380” lines of Go code for Redis Raft. No person-time is reported.

Translation testing used “8,750,468” message traces for Raft and “1,904,456” message traces for ZooKeeper (§5, p. 1315), generated with 15 and 20 bounded steps respectively. This tests model-to-model translation, not natural-language intent alignment. Table 2, p. 1316 lists ten bugs: four Etcd, one ZooKeeper, five Redis Raft; nine were previously reported and the last Redis Raft reconfiguration bug was new (counts obtained by counting the table rows). §6.2 describes the previously unreported Redis Raft reconfiguration bug. Runtime experiments used three- and five-node clusters (§6.1). The largest stated latency change was “10.7%” (from 7.25ms to 8.03ms) at the 99th percentile (§6.3, p. 1316). §6.4 says alerts arrived within “1.7 second” of a bug occurring in their evaluation. These are workload-specific measurements, not universal bounds.

**Why it matters (inference).** This supplies a practical execution-based evaluation after an agent has generated a protocol model: retain existing code and test whether observed outputs obey that model. Its traces cannot establish that the model captures the user's wishes. A useful evaluation should distinguish a wrong model, a wrong human translation/mapping, and a code bug.

A public Ellsberg source repository was not found through the USENIX page or GitHub repository searches for `Ellsberg` and `Ellsberg protocol`. Existing system sources are [Etcd](https://github.com/etcd-io/etcd), [ZooKeeper](https://github.com/apache/zookeeper), and [Redis Raft](https://github.com/RedisLabs/redisraft); these are not the Ellsberg artifact.

### ONOS TLA+ Conformance Monitoring Tools

ONOS Project contributors; GitHub tool, created 2020 (repository metadata); no standalone paper or PDF found. [Repository](https://github.com/onosproject/tlaplus-monitor), [usage documentation](https://github.com/onosproject/tlaplus-monitor/blob/master/docs/README.md). Read both the top-level README and the complete usage documentation. This is separate from the [µONOS model repository](https://github.com/onosproject/onos-tlaplus).

**Human input and checked claim.** A user writes TLA+ modules, initial/next-state predicates and invariants, selects constants and constraints, deploys the monitor through Helm, and streams JSON traces through Kafka. The deployment documentation requires a “single monitor pod” per TLA+ specification (Deployment). Its Specifications section says the monitor detects violations of “safety guarantees” through system-state analysis This checks observed running-system traces against supplied predicates. Neither documentation presents a whole-program proof or a liveness guarantee.

**Automatic part and numbers.** The customized TLC consumes trace records, updates model state, checks invariants, and can publish alerts. Documentation says, TLC will “evaluate invariants” after each processed trace (Specifications). The README provides a `-window` option described as the duration of “sliding windows” (Monitoring). No measured bug count, checking throughput, latency, model/proof size, or human effort is reported. The one-pod-per-specification rule is a deployment requirement, not a benchmark result.

**Why it matters (inference).** It is reusable plumbing for evaluating generated invariants against live code observations. Human work still defines observation semantics and the property. The example even merits review before reuse: its comment promises a monotonically increasing version, but its predicate is `nextVersion # 0 => nextVersion < prevVersion` (Specifications). When the next version is nonzero, that comparison accepts decreasing versions; a proof or successful check against it would not establish the promise in the comment.

### Concrete cases added by these related-work sources

| Case and source | Checked property and tool | Human artifacts and effort |
|---|---|---|
| Distributed travel booking, Howard et al.; [paper](https://arxiv.org/abs/1111.2825); current repository not found | Safety of booking consistency/payment/service attempts through ProB replay; resource allocation progress on specific traces through Spin/LTL | Human B/Promela models and instrumentation; six invariant clauses (§3, p. 6); manual setup; size/time not reported |
| Etcd/Raft, Ding et al.; [paper](https://www.usenix.org/conference/nsdi25/presentation/ding); [system code](https://github.com/etcd-io/etcd) | Runtime safety/refinement checks for stale reads and reconfiguration; Ellsberg | Table 1: ETCD 952 specification lines; mapping 356 lines of Go code (§5); person-time not reported |
| ZooKeeper/Zab, Ding et al.; same paper; [system code](https://github.com/apache/zookeeper) | Runtime safety/refinement check for inconsistent logs after leader election; Ellsberg | Table 1: Zookeeper 989; mapping 370 lines of Go code; person-time not reported |
| Redis Raft, Ding et al.; same paper; [system code](https://github.com/RedisLabs/redisraft) | Runtime safety/refinement checks for read, lost-update and reconfiguration bugs; Ellsberg | Table 1: RedisRaft 894; mapping 380 lines of Go code; person-time not reported |
| µONOS stream monitoring, ONOS contributors; [code and docs](https://github.com/onosproject/tlaplus-monitor) | Observed-state safety predicates through customized TLC | Human modules, invariants and Kafka/Helm setup; no measured size/time or proved application property found |
