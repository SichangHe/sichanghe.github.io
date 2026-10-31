# Industrial-Strength Verification of Solid State Interlocking Programs
(authored by agents unless marked 🧑)
Tag: `iliasov2021industrial`, [paper](http://arxiv.org/abs/2108.10091v2)

## result and system boundary

Inference: SafeCap verifies railway interlocking configurations as engineers already produce them. The paper's abstract reports, “In the last two years SafeCap has been successfully used to verify 26 real-world mainline interlockings, developed by different suppliers and design offices.” (abstract, p. 1) It is an industrial deployment report, not a new foundational logic.

SSI GDL "resembles a program in a procedural programming language" and is "iteratively executed in a typical loop" (section 1, p. 2). The loop has three stages: polling of inputs, computation of responses, and formation and transmission of equipment control commands (section 2, p. 5). SafeCap verifies the response-computation stage; the paper says the safety of the other stages "is assured through the safety cases underpinning the generic interlocking hardware and the site-specific wiring" (section 2, p. 5). The authors call it "almost hopeless" to verify absence of collisions and derailments in the strictest sense, so correctness is established against signalling principles derived from the basic principles. "At the time of writing this paper the SSI SafeCap verifies 55 signalling principles." (section 2, p. 5)

## technique 1: domain-specific modelling and notation-preserving translation

Inference: Keep the signalling engineer's schema and GDL notations at the boundary, then translate them into a common mathematical model. SafeCap DSL is graph-oriented and extensible with plug-ins for signals, speed limits, stopping points, and other concepts (section 2, p. 4). The core requirements listed are: "use the existing industrial signalling notations for the inputs and for reporting the results of verification" and "fully hide formal methods from the engineers that use them" (section 2, p. 4).

Steps from the paper's process (Fig. 1 and the text around it, p. 7; Fig. 2, pp. 7–9). Fig. 1 labels: 0 schema preparation, 1 model construction, 2 model typing, 3 SSI/schema validation, 4 SSI to GVF translation, 5 GVF to state transitions, 6 PO generation, 7 automated proof, 8 witness discovery, 9 engineer report. The text groups them as input preparation (steps 0-3), "translation and symbolic execution of the signalling logic (steps 4-5)", formal verification (steps 6-8), and report generation (step 9); "All but the very first stage are automated." (p. 7)
1. prepare the schema from an electronic plan and construct a mathematical model (steps 0-1)
2. type the model and validate the SSI/schema pair (steps 2–3)
3. translate SSI GDL into the Generic Verification Framework (GVF) (step 4)
4. turn the GVF into many individually simple state transitions (step 5)
5. generate proof obligations, prove them, and discover witnesses (steps 6-8)
6. generate the engineer report (step 9)

The paper says, “All model transformations during steps 0-9 in Figure 1 are traceable in both directions via meta-references created during the tool operation to allow the tool to create the final report describing the findings in terms of the initial inputs”. (section 2, p. 9) Inference: this traceability is a technique in its own right: findings can cite the relevant GDL fragment and plan fragment rather than exposing solver formulas. The paper says each violation's report includes "the relevant part of the SSI code and the schema plan fragment" (p. 9).

Verus form (Inference): A Verus-based product can parse a domain DSL into Rust data structures and preserve source spans in ghost fields or external metadata. Verified transition code can then use `requires` and `ensures` over typed schema objects. The parser, importer, and report mapper remain trusted unless separately verified; source-span traceability improves review but does not prove semantic preservation.

## technique 2: inductive safety invariants and proof-obligation enumeration

Inference: Turn each signalling principle into an inductive invariant that must hold at boot and after every state update. The paper says each signalling principle is "rendered as an inductive safety invariant – a system property that must hold when a system boots up and must be maintained (or, equivalently, be re-established) after any state update" (section 2, p. 5); verification generates conjectures of the form "if an invariant holds in a previous state and a certain state update happens, is it true that the invariant holds for the new state?", each represented as a sequent `H |- G` with hypotheses H and goal G (section 2, p. 6). One example requires point tracks to be clear whenever a point command changes; another requires all subroutes to be locked when a route is set (section 2, pp. 6–7).

Steps from the paper:
1. agree a semi-formal statement with signalling engineers, such as "[for] every point commanded to a new state [it holds that] all point tracks are proved clear" (section 2, p. 6)
2. encode that statement as a quantified invariant (the paper shows formulas in its own notation) (section 2, pp. 6–7)
3. generate a conjecture for every pair of safety invariant and possible state update (section 2, pp. 6–7)
4. prove or disprove the conjectures automatically (steps 7-8 in Fig. 1); the paper says "the vast majority" are automatically proved or disproved (section 2, p. 7)
5. report violations to engineers, classed as errors, vulnerabilities, intentional violations, or false positives (section 3, p. 9); the report includes "the relevant part of the SSI code and the schema plan fragment" (section 2, p. 9), and the railway expert selects the counter examples (section 3, p. 11)

The paper gives scale: "The number of such conjectures is m * n, where m is the number of safety invariants (circa 50) and n is the number of possible state updates (typically around 10,000)." This "is a small number when contrasted against the number of potentially reachable states (circa 2^2,000)"; the superscript is lost in the text extraction and was checked on the PDF page (section 2, p. 7). It reports "a tiny number (less than 1 in 10,000 for recent results) of provable conjectures failing to prove and resulting in a false positive" (section 2, p. 7). Inference: the 1-in-10,000 figure is relative to provable conjectures, not all generated obligations, and the paper gives no absolute count for that sample.

Verus form (Inference): Encode each signalling invariant as a predicate over a Rust state struct. For every transition function, put the pre-state invariant in `requires` and state preservation in `ensures`; prove a loop `invariant` for the global control loop. Quantified invariants may need ghost sets and lemmas. Verus does not provide SafeCap's domain prover or automatic enumeration, so a generator would emit transition obligations and invoke Verus per transition. Use only supported Verus constructs such as `requires`, `ensures`, `invariant`, and `proof fn`; proof functions are erased before runtime. None of this Verus mapping is in the paper.

## technique 3: customised symbolic prover and proof tactics

Inference: Specialize the prover to the shape of railway transition models instead of using a general-purpose model checker. The authors removed SafeCap features unnecessary for SSI (animation, simulation, capacity measurement), simplified the architecture, and “replaced all its solvers and provers with a dedicated inference-based symbolic prover” (section 2, p. 4). The paper also says "we have developed a library of proof tactics that can improve the proof automation" (section 3, p. 12) and "a limited set of possible proof tactics, from which we could quickly select the most suitable one when necessary" (section 3, p. 11). The paper describes no step-by-step tactic procedure; the list below collects what it states.

What the paper states:
1. interlockings "do not explicitly test signalling principles in every instance they apply"; they test specific instances and infer compliance in other instances, so proving one principle can require properties that exclude cases violating other principles, plus properties for those other principles (section 3, p. 10)
2. the formal-methods expert "needs to adjust the proof tactics and properties for a specific project" and the signalling engineer helps adjust the properties and interpret results (section 3, pp. 10–11)
3. practical experience led to "refinements of safety properties to reduce false positives" (section 3, p. 10); the authors also worked on safety invariants to reduce verification time and improve diagnostics (section 3, p. 12)

Inference: This is a domain automation strategy. The paper says projects have on average "1.5-2.5K Boolean variables and 100-200 Integer variables, but this is irrelevant to the type of verification we conduct" (section 3, p. 11). It says scheme elements "are not a good predictor of verification complexity"; complexity, "especially its upper boundary, is better explained by the maximum cyclomatic code complexity of the verified SSI program" (section 3, p. 11).

## technique 4: industrial diagnostics and safety-case traceability

Inference: Treat reporting and deployment assumptions as part of verification, not as a separate user-interface concern. SafeCap violations fell into four categories: errors, vulnerabilities, intentional violations, and false positives (section 3, p. 9). A formal-methods expert and an experienced signalling engineer remain involved; the railway expert "leads the production of the final report including the categorisation of the violations found and the selection of the counter examples" (section 3, p. 11).

Steps from the paper's safety-case method:
1. define the SafeCap system boundary, interfaces, environment, assumptions, and existing safety measures (section 4, p. 13)
2. record hazards in a hazard log; the paper names the interpretation of SSI GDL and the reporting of safety property violations as principal hazards (section 4, pp. 13–14)
3. trace each safety property to specific clauses in railway standards ("requirements tracing") (section 4, p. 14)
4. when one signalling principle depends on others, use goal structured notation (section 4, p. 14, Fig. 4)
5. document application constraints, including that trackside equipment is installed per the signalling plans, hardware inputs and outputs are wired consistently with the functions assigned in data, and points shown as always moving together are wired to do so (section 4, p. 15)
6. increase dependency on SafeCap in stages as the safety case is extended; the paper describes an "iterative approach" (section 4, p. 13)

The paper states that “SafeCap is currently used in an advisory capacity, supplementing manual checking and testing processes” (abstract, p. 1). The authors say replacing established manual checks or tests by SafeCap verification "is believed to be significant and hence necessitating the application of the full CSM-REA process" (section 4, p. 13), where CSM-REA is the European Common Safety Method for Risk Evaluation and Assessment.

Verus form (Inference): A verified Rust product should preserve a machine-readable trace from each contract to the requirement and report. The safety case should list trusted parser, compiler, verifier, libraries, and deployment assumptions. Verus can prove transition invariants, but it cannot establish that railway wiring, hardware I/O, or the selected invariant set matches the physical railway without additional models and evidence.

## evidence and limits

Inference: Deployment evidence covers 26 UK interlockings: per the paper, six were analysed as trial applications that "consistently find known errors in the data (both deliberately seeded and unintentional in non-in-service data sets)", and the remaining 20 were commercial applications in live signalling projects (section 3, p. 9). The paper reports "minutes rather than weeks" for trial checking compared with manual checking, but gives no per-interlocking times or counts for that comparison (section 3, p. 9).

Table 1 gives three recently completed projects run on a professional PC with 16 cores. Project X: 140 routes, 48 points, 83 signals, 55 invariants, 11,078 state transitions, 37 seconds, 42 GB peak RAM. Y: 64 routes, 29 points, 92 signals, 55 invariants, 4,462 transitions, 3 seconds, 4 GB. Z: 190 routes, 64 points, 84 signals, 55 invariants, 112,560 transitions, 265 seconds, 67 GB (section 3, Table 1, p. 11). The paper calls Z one of the projects with the longest verification run. These are three projects, not a statistical benchmark; the paper reports no failure percentage across all 26. Elsewhere the paper says it takes "no longer than 5-6 minutes to verify the safety of any UK signalling interlocking" (section 3, p. 12), a claim without further data.

Inference: The main assumptions are that signalling standards correctly capture acceptable risk, that schema and GDL match installed equipment, and that the tool's interpretation and reporting are correct. The paper names an undetected serious error in signalling data (a "false negative") as the credible worst-case failure consequence in replacing manual checks (section 4, p. 13). Current use is advisory and "proven manual processes remain in place" (section 4, p. 13).

## techniques for the catalog

- notation-preserving domain translation: import industrial schemas and programs into a common formal model with bidirectional source traceability
- inductive proof-obligation generation: express safety principles as invariants and check preservation over every generated state update
- domain-specialized automation: use a custom symbolic prover and reusable tactics tuned to recurring transition structures
- safety-case integration: trace invariants to standards, maintain hazard logs and assumptions, and stage deployment dependency
