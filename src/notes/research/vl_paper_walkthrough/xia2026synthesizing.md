# Synthesizing Feature Extractors: An Agentic Approach for Algorithm Selection
(authored by agents unless marked 🧑)
Tag: `xia2026synthesizing`, [paper](https://doi.org/10.5281/zenodo.20161743)

## what the paper does

The paper synthesizes executable, interpretable feature extractors from MiniZinc constraint models. The abstract states: “We present an automated approach that uses Large Language Models (LLMs) in an agentic check–fix–verify loop to synthesize executable Python scripts that act as interpretable, problem-specific feature extractors.” Given a `.mzn` model and `.dzn` instance, the agent writes Python that constructs a typed graph and computes structural features such as density, clustering, and constraint tightness. A downstream algorithm selector maps those features to one of five solvers: Gurobi, CPLEX, SCIP, Gecode, or OR-Tools (Sections 1 and 4.1, pp.1 and 5).

The key engineering claim is that one-shot prompting is unreliable. The paper says weaker open backends fail in 10/10 trials and that removing any loop step makes success zero even for strong models (Introduction, p.2). The output is a visible program rather than a latent embedding, so a domain expert can inspect and edit it.

## technique 1: check–fix–verify synthesis loop

what it is

The agent receives a MiniZinc model, data schema, and strict output requirements. It uses four repeated operations: clear old content, insert the complete script, check and fix syntax or structural errors, then execute and validate the output. Figure 1 summarizes the workflow as “Clear, Insert, Check/Fix, and Execute steps until an executable Python script that produces a validated feature vector is obtained.” (Figure 1 caption, p.4).

The general prompt requires a script with imports, constants, helper functions, a main block, a result dictionary, and a final `output_results(result_dict)` call (Listing 1, p.4). The MiniZinc-specific prompt additionally requires `input_data()` and `output_results()`, NetworkX and NumPy, no file I/O, and exactly 50 features in a standardized dictionary (Listing 2, p.5). The agent chooses the identity of the 50 features anew on each run. The paper reports: “Each step of the check–fix–verify loop is load-bearing: in pilot ablations, removing any one of the four steps produced zero executable extractors, and weaker LLM backends that drift from the protocol fail in 10/10 trials.” (Section 3, p.5).

how to apply it

1. Supply `.mzn`, `.dzn`, and an input schema to the agent (Section 3, p.4)
2. Clear prior script content and insert a complete candidate (Listing 1, p.4)
3. Run syntax and structural checks; feed validation errors back for a fix (Section 3, p.4)
4. Execute the script on an instance through `input_data()` and inspect the standardized output (Listing 2, p.5)
5. Repeat check, fix, and execution until the result is executable and has exactly 50 features (Figure 1, p.4; Listing 2, p.5)
6. Reuse the resulting extractor on instances from the same problem family (Section 4.9, p.10)

verus form

Inference: Generate a Rust extractor with a typed result struct and a `spec fn` describing feature-vector shape and numeric domains. Use executable functions for parsing and graph construction, `requires` for valid model/data inputs, and `ensures` for output length and per-feature invariants. A Verus proof function can establish that a checked extractor returns 50 finite values and preserves graph edge-count relationships; candidate generation and repair remain outside the proof. Inference: Python execution checks do not carry over as a proof of semantic feature correctness, so the Verus form needs explicit contracts for every feature whose meaning matters to selection.

what demonstrates it

The system was evaluated on vehicle routing (VRP), car sequencing (CS), and fixed-length error-correcting codes (FLECC), using five solvers (Section 4.1, p.5). The synthesized 50-feature extractor outperformed the 95-feature mzn2feat baseline and 116-feature trans2feat in many selector configurations. Table 1 reports, for example, LLM2feat+RF test accuracy of 85.3% on VRP versus mzn2feat+RF 82.4%; 84.7% on FLECC versus 76.4%; and 58.1% on CS versus 54.7% (Table 1, p.8). On FLECC the best LLM2feat gain over mzn2feat is 8.3 percentage points, as stated in the paper (Section 4.6, p.8).

Table 2 aggregates independent runs with explicit denominators: CS/AutoSK uses n=9 valid LLM2feat runs and n=17 trans2feat variants; FLECC/AutoSK uses n=9 and n=14 respectively (Table 2, p.9). For FLECC/AutoSK, LLM2feat best/mean/worst are 84.6%/83.6%/82.2%, while trans2feat gives 78.4%/68.2%/8.3% (Table 2, p.9). Feature analysis reports VRP top-20-feature mean absolute correlation |r|=0.221 for LLM2feat versus 0.429 for mzn2feat, a 48.5% lower value (Section 4.4, p.7). The utilization threshold is feature importance above 0.001; on VRP 96% of LLM2feat dimensions versus 56.8% of mzn2feat dimensions exceed it (Section 4.5, p.7).

limits and assumptions

OpenAI o4-mini and Claude Sonnet 4 succeed in 10/10 trials; DeepSeek R1 and Llama 3.3-8b-instruct succeed in 0/10 because they do not follow the protocol (Table 3, p.10). Table 4 summarizes 30 o4-mini runs: average 17.3 iterations, 210.0 seconds, 259,913 input tokens, 19,238 output tokens, 279,150 total tokens, and $0.2695 average cost (Table 4, p.10). The paper therefore measures a specific model and protocol, not universal synthesis reliability.

Inference: A Verus implementation should reject a candidate when parsing, feature count, or proof obligations fail, just as this loop rejects non-executable scripts. Inference: the model’s 0/10 result on two open backends is an operational threat to any product assuming cheap local models can produce verified code.

## technique 2: semantic graph and solver-aware features

what it is

The extractor interprets the declarative model instead of flattening it into primitive constraints. It constructs a typed graph and computes problem-size, graph, data-distribution, and structural-complexity features. Examples include graph density, degree statistics, clustering, tightness, propagation-strength proxies, supports per constraint family, demand concentration, depot eccentricity, and route-length lower-bound surrogates (Listings 1–2, pp.4–5; Section 4.8, p.9).

how to apply it

1. Read variables, constraints, objective, global constraints, and parameter roles from `.mzn` and `.dzn` (Section 4.8, p.9)
2. Create a typed graph whose nodes and edges preserve semantic roles (Section 3, p.4)
3. Compute generic statistics such as size, density, degree, clustering, and sparsity (Listing 2, p.5)
4. Add solver-aware quantities such as tightness or propagation-strength proxies and family supports (Section 4.8, p.9)
5. Add domain features, for example demand concentration and depot eccentricity for VRP (Section 4.8, p.9)
6. Return named features with a methodology README so experts can inspect and refine them (Listing 2, p.5)

verus form

Inference: In Rust/Verus, define graph node and edge types with invariants for valid indices and non-duplicated edge counts. Prove `ensures` relating density to edge and node counts and prove that each named feature is derived from the declared model fields. Keep floating-point or statistical approximations outside the proof unless represented with fixed-point or bounded rational types. The paper’s typed Python graph and NumPy statistics are a design pattern, not Verus syntax.

what demonstrates it

The authors attribute gains to preserving high-level structure that mzn2feat’s flat primitive list discards and to solver-aware quantities that opaque neural embeddings do not expose (Section 4.8, p.9). On VRP, the generated demand-distribution and depot-centrality features explain a +2.9 percentage-point test-accuracy gain over mzn2feat (Section 4.8, p.9). LLM2feat uses 50 features versus mzn2feat’s 95 and trans2feat’s 116, so the gain is not explained by feature count (Section 4.8, p.9).

limits

Inference: A semantic feature can be wrong while remaining executable, and a Verus proof of its implementation only establishes the encoded definition. Feature choice is rerun per problem family and per synthesis, so reproducibility requires storing scripts, feature lists, and values; the paper says these ship with the supplement (Section 3, p.5).

## technique 3: selector evaluation with baselines and ablations

The paper trains Random Forest and AutoSklearn selectors with five-fold cross-validation and also reports AutoFolio and LLAMA (Section 4.2, p.6). It compares Single Best and Virtual Best references, expert mzn2feat, all released trans2feat variants, and ten independent LLM2feat syntheses. This protocol prevents a single favorable run from standing for the method. The paper evaluates feature correlation, importance above a 0.001 threshold, accuracy as top-feature count grows, and best/mean/worst across runs (Sections 4.3–4.7, pp.7–9).

The paper’s scope is specific. Extractor synthesis adds less than one minute while solver runs can last 20 minutes per instance (Section 4.6, p.8). It does not show that generated features transfer to unseen problem families, that neural baselines are semantically interpretable, or that feature importance proves causation. Inference: the product risk is moderate: executable, inspectable generated programs are easier to audit than opaque embeddings, but a specification gap or data-distribution shift can make a verified extractor select a poor solver.

## what is proved, measured, and trusted

Measured: script success rates by backend, synthesis cost and tokens, feature correlations and utilization, selector accuracy and rank, and comparisons across VRP, CS, and FLECC. The paper does not formally prove that any feature captures the true solver-relevant structure, that the chosen portfolio is optimal, or that held-out accuracy persists after distribution shift. The trusted components are the Python runtime, MiniZinc parser and input framework, solver implementations and benchmark labels, and the training/test split.

Inference: A Verus product should make its trusted parser, model interpretation, and feature specification explicit, and then use proof-carrying extractors as the acceptance boundary. Inference: check–fix–verify is a reusable generate-then-check loop, but the verifier must be independent enough that generated code cannot redefine what counts as a valid feature.

## techniques for the catalog

- check–fix–verify synthesis — repeatedly clear, insert, validate, execute, and repair a complete extractor until it produces the required vector
- typed semantic graph extraction — preserve model roles in a graph and compute named structural features instead of flattening constraints
- solver-aware feature engineering — add tightness, propagation, constraint-family, and domain metrics correlated with solver behavior
- inspectable fixed-shape output — require exactly 50 named features and a methodology description for downstream selection
- multi-run selector evaluation — compare baselines, all independent syntheses, and valid-run denominators with held-out accuracy and rank
