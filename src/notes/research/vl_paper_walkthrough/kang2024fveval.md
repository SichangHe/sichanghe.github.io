# FVEval: Understanding Language Model Capabilities in Formal Verification of Digital Hardware
(authored by agents unless marked 🧑)
Tag: `kang2024fveval`, [paper](https://doi.org/10.23919/date64628.2025.10992720)

## scope and result

FVEval is a benchmark for language models generating SystemVerilog Assertions (SVA) and reasoning about RTL. It has three tasks: NL2SVA-Human, NL2SVA-Machine, and Design2SVA. The paper describes the benchmark as “the first comprehensive benchmark and evaluation framework for characterizing LLM performance in tasks pertaining to FV.” (Abstract, p. 1.) Its evaluation uses commercial formal-verification tools, so syntax and semantic results are measured by compilation, formal equivalence, or proof rather than text similarity.

NL2SVA-Human contains 79 expert-written assertions for common units such as FIFOs, arbiters, counters, RAMs, and finite-state machines (§3.2, p. 3). NL2SVA-Machine contains 300 synthetic natural-language/SVA pairs (§3.3, p. 5). Design2SVA contains 96 parameterized pipeline instances and 96 parameterized FSM instances (§3.4, p. 6). These denominators are task-set sizes; the tables report model pass rates over the relevant instances or samples.

The paper frames the target as follows: “LLMs could potentially improve FV productivity by automating the implementation of such SVA assertions from natural language specifications.” (§3.1, p. 3.) The central finding is a large syntax/function gap. On NL2SVA-Human, GPT-4o has syntax 0.911, exact functional correctness 0.456, and partial functional correctness 0.582 (Table 1, p. 8). On NL2SVA-Machine with three-shot prompting, GPT-4o has syntax 0.927, exact function 0.430, and partial function 0.540 (Table 3, p. 10). On Design2SVA, GPT-4o's pass@5 functional rates are 0.427 for pipelines and 0.900 for FSMs (Table 5, p. 13). A syntactically valid assertion therefore often does not express the intended property.

## technique: NL2SVA-Human benchmark with formal equivalence

When to use it: use this task to test whether a model can ground a natural-language requirement in an existing human-authored testbench, including its signal names, reset semantics, and helper logic.

How to do it:

1. Remove the original assertions from an expert SystemVerilog testbench but retain modeling code, internal wires and state, and module ports (§3.2, p. 4).
2. Give the model the remaining testbench and a high-level natural-language description of one intended assertion.
3. Require an SVA response. For example, the paper asks for a FIFO non-underflow assertion and shows the expected form `assert property (@(posedge clk) !(rd_pop && fifo_empty));` (Figure 1, p. 2).
4. Check syntax with an industry formal tool such as Cadence Jasper. Then compare model and reference assertions by formally proving logical equivalence; also test implication in either direction to identify partial equivalence (§3.2, p. 5).
5. Report syntax, exact functional correctness, partial functional correctness, and BLEU separately. The paper warns that “commercial FV tools are required for accurate evaluation of SVA assertions.” (§3.2, p. 5.)

The distinction between exact and partial equivalence matters. In one example, a generated liveness assertion is weaker than the reference but implies it; the benchmark records syntax pass and partial functional pass (Figure 7, p. 9). The authors report that BLEU is a poor substitute: correlation between BLEU and formal correctness is 0.0563 for GPT-4o and 0.0926 for Llama-3.1-70B (Figure 6, p. 8). These are correlations over the benchmark outputs, not success rates.

Inference: for Verus, this suggests evaluating generated contracts with verifier-backed semantic checks rather than text similarity. Exact equivalence could compare postconditions or proof obligations; implication could identify stronger or weaker contracts. Verus does not provide the paper's SVA equivalence primitive, so the specific check requires a new harness.

## technique: synthetic NL2SVA-Machine generation

When to use it: use this task to stress temporal-logic translation across many operators and wording styles, independent of domain-specific RTL context.

How to do it:

1. Randomly sample SVA operators and symbolic signal names to generate assertions.
2. Ask an LLM to write a natural-language description of each assertion.
3. Use a critic LLM to check whether the description preserves the assertion's temporal logic. Generate again if it fails.
4. Have humans inspect and finalize descriptions. The paper uses temperature 1.0 for description generation with gpt-4o and greedy temperature 0.0 for critique with gpt-4-turbo (§3.3, p. 5).
5. Evaluate generated SVA with the same syntax, exact-equivalence, partial-equivalence, and BLEU protocol as NL2SVA-Human.

The resulting 300 cases vary SVA operators and natural-language formulations (§3.3, p. 5). With three-shot examples, GPT-4o scores syntax 0.927, exact function 0.430, and partial function 0.540; Llama-3.1-70B scores 0.887, 0.303, and 0.397 in zero-shot, and 0.920, 0.457, and 0.567 in three-shot (Table 3, p. 10). Sampling five candidates improves GPT-4o exact functional pass from 0.430 at pass@1 to 0.512 at pass@5 and Llama-3.1-70B from 0.457 to 0.566 for the corresponding three-shot setting (Table 4, p. 11). The paper notes that examples can also distract smaller models: one model used `$bits` (signal width) where odd parity was required (Figure 8, p. 11).

Inference: a Verus benchmark can generate specifications from verified predicates, paraphrase them, and test whether models reconstruct equivalent `requires`/`ensures` clauses. The paper's random SVA grammar and temporal operators do not transfer directly to Rust.

## technique: Design2SVA from RTL alone

When to use it: use this task to measure whether a model can identify a useful property without a human-written specification, a harder setting than translating an explicit requirement.

How to do it:

1. Generate parameterized RTL instances from two industrially common patterns: arithmetic pipelines and finite-state machines (§3.4, p. 6).
2. Randomize controlled parameters. Pipeline parameters include number of execution units, pipeline depth, data width, and combinational-unit complexity. FSM parameters include state count, transition count, pipeline depth, data width, and transition-logic complexity (Figure 4, p. 7).
3. Generate a formal testbench for each RTL instance. Provide only the design RTL and testbench interface to the model, and ask it to generate the most important SVA assertion; permit supporting wires or registers (Figure 5, p. 7).
4. Reformat the testbench with the model assertion and run a commercial formal engine. Count syntax and proven functionality. Because many different valid properties may exist, use pass@k: an instance is solved when any of k sampled candidates is correct (§3.4, p. 7).

The 96-instance-per-category sets are generated by controlled parameter sweeps (§3.4, p. 6). In Table 5, GPT-4o has pipeline syntax@1 0.802, syntax@5 1.000, function@1 0.104, and function@5 0.427; for FSMs it has 0.993, 1.000, 0.373, and 0.900. These denominators are the 96 pipeline or 96 FSM instances, with pass@k estimated from sampled outputs. The paper reports that complex instances can exceed 16K input tokens (§4.4, p. 12), limiting models without a sufficiently large context window.

Inference: for Verus, a corresponding task would provide Rust implementation and API types but omit the contract, then check whether generated specifications verify and are useful. A proof passing under a vacuous or weak contract must be distinguished from a property that captures intended behavior; this is an inference from the benchmark's need to evaluate relevance and proof, not a result measured in Verus.

## evidence, trusted parts, and failure modes

FVEval's functional metrics rely on Jasper assertion equivalence and commercial proof engines. The trusted setup includes reference assertions, synthetic generators, model-checker semantics, testbench assumptions, and the correctness of the formal tool. A model can pass syntax while hallucinating operators: the authors report non-existent or misused operators such as `eventually`, `s_eventually`, and `strong` (Figure 7, p. 9). Functional correctness can also fail because natural language is ambiguous; the authors explain that partial equivalence captures assertions that imply the reference or are implied by it (§4.2, p. 9).

The benchmark does not prove that a reference assertion is the complete specification. It tests whether outputs match the reference or are formally related to it. Design2SVA's “most important” property is judged by whether a commercial tool proves it, so a trivially true assertion may pass unless the generated testbench and evaluation criteria exclude vacuity; the paper does not claim a complete solution to that problem. The authors list broader limitations: more design/testbench varieties, stronger prompting, structural inference, and tool-feedback agents remain future work (§6, p. 15).

Inference: the threat to VeruLaw is diagnostic: high syntax pass rates can create false confidence while exact semantic correctness remains low. FVEval demonstrates that verifier-backed equivalence and proof metrics expose this gap. VL should not redo a generic benchmark of SVA syntax; the reusable lesson is to evaluate agent-written Rust with denominator-labeled semantic checks, include partial-strength relations, and separate compilation from contract adequacy.

## techniques for the catalog

- human-grounded assertion benchmark: remove expert assertions, provide testbench context and NL requirements, and score generated SVA with formal equivalence
- synthetic temporal-logic benchmark: randomize SVA formulas, paraphrase with an LLM, critic-check descriptions, and human-audit the resulting dataset
- RTL-to-property benchmark: generate parameterized pipelines and FSMs, ask for assertions from RTL alone, and score syntax and proof pass@k
- semantic metrics: report exact equivalence, one-way implication or partial equivalence, syntax, and BLEU separately
- sampled candidate evaluation: use pass@k over multiple model responses to measure inference-time scaling
