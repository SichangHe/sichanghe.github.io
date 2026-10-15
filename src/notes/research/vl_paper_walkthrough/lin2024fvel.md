# FVEL: Interactive Formal Verification Environment with Large Language Models via Theorem Proving
(authored by agents unless marked 🧑)
Tag: `lin2024fvel`, [paper](http://arxiv.org/abs/2406.14408v2)

## system and verification workflow

FVEL turns a program-verification interaction into an Isabelle theorem-proving interaction. Its input is C code, optionally accompanied by SIMPL or Isabelle text; its output is success or failure. The paper states: “The input format is flexible as one can choose to input an ensemble of C code and its corresponding SIMPL and/or Isabelle content as supplements.” (Sec. 3, p. 4). The workflow has a specification phase and iterative proof phase. At S0, FVEL transforms C into Isabelle facts and gives them to an LLM, which generates a lemma describing the code specification. At each later Si, the LLM generates proof steps and FVEL sends Isabelle errors back; the loop ends only after a complete lemma proof. In the authors' words, “If the proof success in proving the lemma, FVEL outputs ‘success’, otherwise outputs ‘failure’.” (Sec. 3, p. 4).

When to use it. Use this architecture when a verifier can expose a machine-checkable intermediate language and proof state, and an LLM is useful for proposing specifications or proof steps. It is not a soundness substitute: Isabelle, the C translation, and the generated lemma all remain part of the trusted/checked pipeline.

How to apply it. (1) Give FVEL a C function and optional helper material. (2) C-Parser translates a supported C99 subset to SIMPL. (3) AutoCorres simplifies SIMPL to a higher-level Isabelle functional definition. (4) PISA starts Isabelle with C-Parser and AutoCorres in `sessionRoots`, sets the C file as working directory, imports the tools, unfolds the function fact, and returns the definition to the LLM. (5) Prompt the LLM to write an Isabelle lemma specification. (6) Ask for proof steps, invoke Isabelle after each step, and feed error messages/proof states back until the lemma verifies. These implementation steps are specified in Sec. 3, pp. 4–5.

Verus form. Inference: replace C-Parser/AutoCorres with a Rust-to-Verus front end that exposes the target function, preconditions, postconditions, and loop invariants as a specification obligation. The LLM can propose a `requires`/`ensures` contract or a `proof fn`, then emit `assert`, `have`, `reveal`, and loop-`invariant` steps. Run Verus after each proposal and return its diagnostic and remaining verification state. Inference: the source-level contract must be checked independently of generated proof text; an LLM-generated contract that is weaker than the intended property is a statement error even if Verus accepts its proof.

## technique: dependency graph and step-wise proof dataset

FVEL ER extracts training and evaluation material from the seL4 Isabelle project. It has two components: theory/session dependencies, and lemmas paired with their intermediate proof states. A theory graph has `.thy` files as nodes and import relationships as edges. The paper says: “With the theory dependency graph, it is convenient to locate and extract multi-depth lemmas and their corresponding proofs.” (Sec. 4.3, p. 6).

Extraction steps. (1) Traverse the seL4 ROOTS file in order. (2) Parse each session's name, parents, directories, and theory list. (3) In every theory, parse text between `imports` and `begin`. (4) Recursively parse imported theories across sessions. (5) Build session and theory dependency graphs. (6) Build seL4 and its binary heap images. (7) For each theory, load all dependent sessions in PISA, set its working directory, and temporarily copy session files so imports resolve. (8) Interact with Isabelle one proof step at a time, storing each returned proof state and command. These steps are Secs. 4.3–4.4, pp. 6–7.

The resulting dataset contains 758 theories, 29,125 lemmas, and 200,646 proof steps. The split by lemma is 26,081 train, 1,115 validation, 1,077 test, and 852 test-hard lemmas (Table 1, p. 7). The maximum theory dependency depth is 156 and the maximum proof length is 963 steps. The authors report that 12,089 of 29,125 lemmas take one step, 12,957 take 2–10 steps, and 28,954 take at most 100 steps (Sec. 4.5, pp. 7–8). The test-hard set is selected from SysInit, SysInitExamples, and LibTest because those lemmas have deeper dependency relationships.

Verus form. Inference: construct a crate/module graph from Rust `use`, module, trait, specification, and proof dependencies. Save each lemma's Verus command together with the verifier state after that command. Split by lemma/function, not by individual proof step, so declarations from one proof cannot leak into test. Inference: retain failed diagnostics as feedback examples, but label them separately from verified transitions.

Assumptions and exclusions. The extraction omits experimental theories that Isabelle or PISA cannot verify, and excludes documentation, C-Parser, and AutoCorres sessions because they contain no relevant lemmas (Sec. 4.4, p. 7). Thus coverage is not the complete seL4 source tree. The dataset is drawn from seL4's ARM verification project, not arbitrary C programs.

## technique: fine-tune then interactively verify

FVEL converts training samples to Alpaca format: one fixed instruction, the lemma statement as input, and a complete Isabelle proof as output. It fine-tunes Llama-3-8B-Instruct and Mistral-7B-Instruct with LoRA. The appendix specifies a cosine scheduler with maximum learning rate 1e−4, minimum 1e−5, warmup ratio 0.1, up to 10 epochs with early stopping, and about 30 GPU-hours per model (Appendix D.1, p. 21). At inference, C functions are transformed into Isabelle facts, the model generates a lemma specification and proof, and PISA/Isabelle decides success. Temperature is 0.0 and needed imports/theorems are manually added (Appendix D.1, p. 21).

The benchmark comparison uses Code2Inv (133 C programs), SV-COMP-47 (47 programs), and a 1,000-program SV-COMP sample. Table 2 reports passed tasks. On Code2Inv, Mistral-7B rises from 37/133 to 40/133 after fine-tuning, and Llama3-8B from 46/133 to 46/133. On SV-COMP-47, Mistral rises 10/47 to 14/47 and Llama 11/47 to 16/47. On SV-COMP-1,000, Mistral rises 75/1,000 to 84/1,000 and Llama 69/1,000 to 81/1,000. The paper summarizes the latter as “performances on SV-COMP of 17.39% (69→81) by Llama3-8B and 12% (75→84) by Mistral-7B” (Sec. 6, p. 9). The percentages are relative increases in counts, not absolute pass rates; 69 to 81 is 6.9% to 8.1% of 1,000.

Failure analysis separates specification and proof errors. On Code2Inv, Mistral-7B-FT has 72.0% statement errors and 28.0% proof errors; Llama3-8B-FT has 66.7% and 33.3%. On SV-COMP, Mistral-7B-FT has 59.0% statement and 41.0% proof errors; Llama3-8B-FT has 61.8% and 38.2% (Table 3, p. 9). Inference: a Verus deployment should report contract/specification failures separately from proof failures, because successful proof search cannot repair a wrong contract.

The authors compare symbolic tools too: UAutomizer passes 92/133 Code2Inv, 1/47 SV-COMP-47, and 374/1,000 SV-COMP; ESBMC passes 68/133, 1/47, and 358/1,000. Lemur-GPT-4 passes 107/133 and 25/47 where reported (Table 2, p. 9). These denominators differ by benchmark and should not be combined.

## what is proved, trusted, and risky for VL

A successful result means Isabelle accepted the generated lemma proof through PISA. The paper's C translation and AutoCorres abstraction are trusted enough to formulate the Isabelle fact; the source C property's adequacy is not established by the LLM itself. Proof-state interaction is stronger than one-shot generation, but the experiment's inference path manually adds imports and theorem context. The authors identify data scarcity and tactic-style proof states as causes of low pass rates and say that whole-proof generation without interactive state is difficult (Appendix D.2, p. 22).

Inference: for agent-written verified Rust, FVEL suggests a useful product design: generate a contract, compile/verify it, then repair one obligation at a time with diagnostics. Inference: the threat is moderate to high for automation throughput: on the 1,000-program SV-COMP sample, the best fine-tuned model verifies only 81/1,000, while symbolic solvers verify hundreds. Inference: soundness risk arises if VL accepts a model-supplied specification without an independently reviewed requirement. Inference: existing FVEL already demonstrates Isabelle/seL4 dependency extraction, step-wise proof-state datasets, and statement-versus-proof error accounting; VL should adapt these ideas to Verus rather than repeat a C/Isabelle benchmark.

## techniques for the catalog

- interactive specification-and-proof loop: translate code to theorem facts, generate a lemma, verify each proof step, and feed prover errors back
- dependency graph extraction: recursively parse session/import declarations to expose multi-hop proof context
- step-wise proof-state dataset: store each command with Isabelle's resulting state and split by lemma
- verifier-aware fine-tuning: fine-tune on complete formal proofs, then accept only proofs checked by the theorem prover
- statement-versus-proof error audit: classify failures by incorrect specification versus failed proof generation
Checked 2026-10-15 against paper lin2024fvel: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
