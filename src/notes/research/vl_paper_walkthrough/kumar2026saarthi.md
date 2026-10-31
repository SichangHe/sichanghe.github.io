# Saarthi for AGI: Towards Domain-Specific General Intelligence for Formal Verification
(authored by agents unless marked 🧑)
Tag: `kumar2026saarthi` , [paper](http://arxiv.org/abs/2603.03175v1)

## what is evaluated and what stays trusted

Saarthi is an AutoGen-based sequential multi-agent workflow for hardware formal verification. Its agents generate a verification plan and SystemVerilog Assertions (SVAs), repair syntax, place properties, run the formal tool, analyze counterexamples, and improve coverage. The paper's abstract states, “Saarthi [1] is an agentic AI framework that uses multi-agent collaboration to perform end-to-end formal verification.” The new contributions are a structured rulebook/specification grammar, GraphRAG-style retrieval, automated coverage-hole filling, human-in-the-loop (HIL) data collection, and benchmarks on six RTL designs (§I, §III, §IV).

The reported improvements are empirical, not a soundness theorem: the abstract claims a 70% improvement in generated-assertion accuracy and a 50% reduction in iterations to coverage closure, but the paper does not define one pooled denominator for those headline percentages. Table I instead reports per-design and per-model `% Proven` and `% Coverage`, at Pass@1/2/3. The trusted boundary includes the natural-language specification, model output, rulebook, retrieved corpus and graph, orchestration code, RTL, formal engine, and the human's interpretation of coverage. Inference: the same boundary matters to Verus. A proved Verus function establishes only the contract supplied to it; it does not establish that a generated contract states the product requirement.

## technique 1: multi-agent verification workflow

Use this when verification work naturally decomposes into generation, syntax checking, placement, execution, coverage analysis, and diagnosis. The paper's sequential flow is:

1. A coordinator/lead initializes the run and manages the end-to-end plan for the Design Under Verification (§III-A/B).
2. Property-generation agents translate requirements and protocol rules into candidate SVAs and attach target-module, interface, and signal-binding metadata (§III-B).
3. A syntax analyzer finds parser/lint violations, a code fixer applies canonical rewrites and naming conventions, and a syntax validator checks the result against compilers (§III-B).
4. A location analyzer chooses insertion points in the RTL hierarchy, while an SVA property engineer writes assertions for uncovered behavior (§III-B).
5. A code extractor materializes generated code into the repository or verification environment and binds it to modules (§III-B).
6. Formal execution produces proofs, coverage reports, vacuity warnings, and counterexamples; diagnostics route back to the relevant agents (§III-B).
7. Critic feedback is iterated to a convergence threshold; if the iteration limit is reached, HIL is triggered (§III-A).

The paper says, “Coverage feedback and tool diagnostics drive the next iteration.” Inference: in Verus, the analogous roles can generate Rust and contracts, run `verus`, classify diagnostics, and ask a proof agent to add a `proof fn`, `requires`, `ensures`, or invariant. The hardware role split and SVA syntax do not carry over; Verus construct names and proof erasure must follow the Verus language.

## technique 2: rulebook and specification grammar

Use this when free-form requirements cause inconsistent assertions. Encode a requirement as keywords for signals, property kind, clock edge, trigger, temporal window, reset, and exception. The cached-error rulebook records the incorrect property, each error, and the corrected property so later agents can reuse the repair (§III-D, Figure 5). The paper's concrete example specifies `req`, `ack`, and `error`, with “if req is high, then ack must be high within 2 cycles unless error is high”; the incorrect assertion uses `negedge`, a three-cycle window, and the wrong signal, while the corrected form uses `@(posedge clk) req |-> (error or ##[1:2] ack)` (Figure 5).

Figure 6 applies the same discipline to `i_start`, `enc_done`, and `o_done`: the structured form preserves the immediate-next-cycle implication and adds `disable iff (!rst_async_n)` for reset. Steps are: normalize prose into keyword fields; generate an SVA template; run syntax and formal checks; append any failure and correction to the learning cache; reuse the cache on later designs (§III-D). Inference: a Verus grammar could normalize requirements into named state predicates and explicit pre/postconditions before generating Rust proof code. The rulebook cannot substitute for a semantic review: adding a reset disable condition may change the property being proved.

## technique 3: retrieval and GraphRAG grounding

Use retrieval when agents need standards, prior assertions, signal relationships, or proof/counterexample provenance. Basic RAG indexes chunked standards, repositories, and logs with embeddings (for example FAISS), combines dense and lexical retrieval, reranks candidates, and supplies cited passages to generation (§II-A). GraphRAG first builds a graph whose nodes are requirements, signals, properties, proofs, and counterexamples and whose edges include “implements,” “constrains,” “proven by,” and “violated by”; a query retrieves a connected subgraph and puts it into the prompt (§II-C).

The paper's AXI example links `AWLEN`, `WLAST`, and the `WVALID && WREADY` handshake, then derives the check that `WLAST` is high on beat `AWLEN+1` and low earlier, while assuming `AWLEN` is stable during the burst (§II-C). The response cites the retrieved nodes for auditability. Inference: a Verus agent could retrieve API contracts, state-machine invariants, and counterexamples and attach source pointers to generated lemmas. Retrieval remains advisory evidence; only the verifier checks the final Rust proof.

## technique 4: counterexample root-cause analysis

Use this after a property violation. Feed the VCD trace, specification, RTL, and failing SVA to four agents: a VCD parser extracts timestamps and values; a specification–assertion analyst checks property meaning; an RTL-analysis agent diagnoses signal dependencies; and a verification agent reconciles the analyses (§III-E). They produce an evidence report, bug location, root-cause class, and patch. After three unresolved iterations, HIL takes over. Figure 7's FIFO example identifies `full` failing to assert when `wr_pointer_next == rd_pointer` during a write-only operation and proposes changing the condition.

Inference: in Verus, a counterexample or failed proof obligation can be routed to separate trace, specification, implementation, and consistency analyses. The evidence should be preserved as a regression test and the patch reverified; a plausible diagnosis is not proof.

## techniques for the catalog

- role-separated agent orchestration — split generation, syntax repair, placement, execution, coverage, and review into coordinated agents
- rulebook specification grammar — normalize requirements into keyword fields and retain corrected failures as reusable rules
- hybrid and graph retrieval — ground generation in cited lexical/vector passages and connected verification-artifact subgraphs
- counterexample root-cause analysis — combine traces, specs, RTL, and specialized diagnoses before patching and rechecking
- human-in-the-loop learning cache — store approved corrections with prompts, errors, and resolutions for later refinement
