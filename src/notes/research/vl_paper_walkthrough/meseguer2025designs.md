# Capturing System Designs with Formal Executable Specifications
(authored by agents unless marked 🧑)
Tag: `meseguer2025designs`, [paper](https://doi.org/10.1007/978-3-031-90900-9_1)

## design-first claim

Meseguer argues for executable formal specifications from the beginning of system design. The abstract states: “Systems of high quality and trustworthiness can be developed in a faster and much more efficient way by capturing system designs with formal executable specifications and subjecting them to automated formal verification from the earliest stages of system design.” (Abstract, p. 1). Section 1 contrasts this approach with retrospective specification through examples: 13 new visual-spoofing attack types uncovered in Internet Explorer, semantic flaws in C theorem provers uncovered through an executable C semantics, and DNS attacks uncovered through an executable name-resolution semantics (pp. 1–2). These examples concern retrospective analysis; the early-design examples are discussed in Section 5.

## technique 1: executable formal specification in a computational logic

What it is. Capture a design as a theory T in a computational logic L and express requirements separately as formulas in property-specification logics. Section 2.1 lists six desirable features of L: efficient execution, support for deterministic and concurrent systems, an initial mathematical model, logical reflection, real-time and probabilistic specification, and verification tools (pp. 5–6). These are recommendations, introduced as “it is highly desirable that L supports features such as the following” (p. 5), rather than necessary conditions for every executable specification language. For Maude distributed designs, equations specify data types and auxiliary functions, and rewrite rules describe local concurrent transitions (Section 4, p. 9).

Steps. (1) Capture the system as an executable theory. (2) State its formal requirements in appropriate property logics. (3) Test and debug the specification and use model checking to uncover design flaws. (4) Explore changes to the executable design and analyze their correctness and quantitative properties before implementation. These activities are described in Section 1 (pp. 3–4) and Sections 2 and 4 (pp. 5–6, 8–9). The rationale is explicit: “Executable specifications are much easier to verify than imperative code.” (Section 1, p. 4). The author attributes this to smaller, simpler specifications and to verification staying within mathematics.

Verus form. Inference: use an executable Rust state model and transition functions, with Verus predicates for invariants and proofs that transitions preserve them. Relating this model to a separate implementation requires a correspondence argument. This is a proposed adaptation, not a Verus technique evaluated in the paper.

Evidence and limits. Inference: this is an argument supported by experience and examples, rather than a controlled evaluation of development cost. The chapter gives no measured development speedup for its overall methodology. It explicitly limits the scope of its experience report: “It is outside the scope of this paper to survey all such efforts.” (Section 5, p. 10).

## technique 2: formal patterns as verified transformations

“Formal patterns are formally specified generic solutions to commonly occurring computational problems.” (Section 3, p. 6). A pattern transforms an input theory T, possibly with parameters p, into P(T,p). Its correctness is conditional: assuming the input meets the pattern’s semantic requirements, the output enjoys specified properties (Sections 3–3.1, pp. 6–7).

Steps. (1) Identify the class C of theories meeting the input requirements. (2) Represent the transformation as a meta-program over theories, using logical reflection. (3) Apply it to a qualifying theory and parameters. The associated correctness result supplies guarantees under the input assumptions (Section 3.1, p. 7). Encapsulating T unchanged is one option, not a universal requirement: “the input theory T may not be kept as a subcomponent of P (T, p).” (p. 7). Other patterns relate input and output by simulation or bisimulation, possibly allowing stuttering (p. 7).

The D-transformation illustrates the approach: “What the D-transformation formal pattern does is to transform an object-oriented system design in Maude into a distributed implementation of it, also in Maude, that is stuttering bisimilar to the design.” (Section 5.2, p. 16). The transformation is listed in Section 3.2 (p. 8); its application to ROLA is described in Section 5.2 (pp. 16–17).

Verus form. Inference: express a reusable transformation’s input assumptions and output guarantees as contracts and prove the relationship between component and transformed behavior. A generator would also need an argument connecting its generated code to the transformation theorem. The paper does not demonstrate this in Verus.

## technique 3: qualitative and quantitative verification of designs

The paper distinguishes qualitative requirements, such as invariants, from quantitative requirements involving time, space, power, performance, or probabilities, while noting that “The difference between these two kinds of properties is not always clear-cut.” (Section 4, p. 8).

Steps. (1) Specify the design and requirements. (2) Select an analysis supported for the property and model. Maude provides explicit-state search and LTL model checking and narrowing-based invariant checking; additional tools support other logics. Real-Time Maude checks LTL and timed CTL requirements. QuaTEx expresses quantitative probabilistic temporal properties, and PVeStA supports statistical model checking (Section 4, p. 9). (3) Use results to compare design alternatives. In ROLA’s comparison with Walter and Jessy, the paper uses executable specifications, disables Walter’s and Jessy’s replication features, and adds a common probability distribution for inter-node communication times before statistical model checking (Section 5.2, p. 15). The reported performance comparison is conditional on these modeled settings, not a direct comparison of the original implementations.

Verus form. Inference: use Verus for deterministic invariants and postconditions; retain external tools for statistical and performance analysis. A proof of an invariant alone does not establish the quantitative predictions discussed here.

## technique 4: semantic plugins for model-based languages

A formal plugin maps a model in a modeling language to its executable formal semantics. Section 6 proposes plugins that “make simulation and formal analysis of models possible by mapping each model to its formal semantics.” (p. 18). Ptolemy II and AADL examples map into real-time rewrite theories in Real-Time Maude (pp. 18–22).

Steps. For Ptolemy II discrete-event models, the paper describes (1) defining a real-time rewriting semantics, (2) automating the mapping through Ptolemy II’s code generation facilities, and (3) providing a GUI plugin for stating temporal properties and invoking Real-Time Maude model checking (Section 6.1, p. 19). For AADL, the executable semantics covers a behavioral subset, not the entire language. AADL2Maude integrates translation and analysis with OSATE; SynchAADL2Maude supports Synchronous AADL models (Section 6.2, pp. 20–21). The paper motivates synchronous modeling through PALS, allowing analysis of smaller synchronous counterparts of suitable asynchronous systems (p. 20). It does not prescribe a separate simulation or bisimulation proof step for every plugin user.

Verus form. Inference: a VL front end could translate a restricted design language into Rust models and Verus contracts. Establishing that this translation preserves the intended source behavior would be a separate obligation; the paper does not supply such a translation.

## what is proved, trusted, and reusable

IBOS was designed in Maude from the start. The author describes close interaction to ensure that the kernel implementation, “about 60,000 lines of C++”, agreed with the design (Section 5.1, p. 12). This is not a reported formal proof of correspondence for the C++ kernel. The security invariant P comprises eleven conjuncts. The first ten were model checked; the full invariant P was later deductively verified in reachability logic (p. 13). Thus the deductive result is not merely a proof of one additional property. The author also states: “IBOS was an academic project. It did not become a commercial product.” (p. 13).

ROLA was designed, verified, and implemented in Maude from the beginning (Section 5.2, pp. 13–14). The D-transformation generated a distributed implementation. Comparing statistical predictions and implementation experiments in two scenarios, the author reports “a substantial agreement between the ROLA performance predictions and the corresponding experimental evaluations.” (pp. 16–17). The chapter refers to earlier papers for detailed consistency verification and experimental results.

Inference: VL could reuse this separation of executable designs, property specifications, verified transformations, and implementation correspondence arguments. A verified abstract design still needs a justified connection to the implementation. The chapter demonstrates Maude workflows; applicability and cost for agent-written Rust remain untested here.

## techniques for the catalog

- executable formal design — Capture behavior in an executable theory and analyze requirements from early design
- formal patterns — Reuse theory transformations with explicit input assumptions and proved output guarantees
- qualitative and quantitative checking — Select reachability, temporal, real-time, or statistical analysis for the property and model
- semantic plugins — Translate supported modeling-language constructs into an executable formal semantics for analysis

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Using the D-transformation it was then possible to automatically transform the ROLA Maude design into a ROLA implementation and to experimentally evaluate ROLA."): checked all paper text, study quotations, numbers, section and page references, technique steps, title, author, year, and DOI; corrected reference locations, conditional pattern behavior, IBOS verification scope, and unsupported procedural claims; marked proposed Verus and VL adaptations as Inference; did not check cited works, tool implementations, or reproduce experiments.
