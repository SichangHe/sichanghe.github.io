# Guiding LLM Temporal Logic Generation with Explicit Separation of Data and Control
(authored by agents unless marked 🧑)
Tag: `murphy2024guiding`, [paper](http://arxiv.org/abs/2406.07400v1)

## what is proved and measured

The paper studies natural-language generation of Temporal Stream Logic (TSL) specifications for reactive synthesis. Its abstract states, “We present a benchmark set and find that this separation of concerns improves specification generation.” (abstract, p.1). The central intervention is to provide the LLM with explicit function and predicate interfaces so it writes control logic while treating data manipulation as an implementation detail (abstract, p.1; sec.4, pp.6–7).

The evidence is an ablation over visual reactive-system benchmarks, including four benchmark classes and three Cube variations (sec.5.1, p.9). The authors measure (1) incidence of a valid specification, (2) incidence of a correct specification, and (3) correctness conditioned on validity (sec.5.1, p.9). They report that versions using function terms tended to outperform versions without functions and predicates, but not always; the benefit disappeared when the LLM misunderstood an interface (sec.5.1, pp.10–11). No aggregate numeric table is available in the extracted text because results are plotted in Figures 7–9. Inference: this is initial benchmark evidence, not a general proof that data/control separation improves every formal language or model.

## technique: separate control logic from data semantics with typed symbols

What it is: TSL extends LTL with arbitrary data, predicate terms for observations, function terms for constructing outputs, and cell values fed back at the next time step. The paper says, “These predicate terms allow users to separate the data and control of a system, encapsulating functionality in functions and predicates that is irrelevant to the specification, so the specification need only deal with the parts of the system that need to be understood in order to provide the desired guarantees.” (sec.3.1, p.5).

When to use it: use this when requirements constrain temporal events or control decisions but the concrete representation and data operations can be abstracted behind stable interfaces. TSL's realizability quantifies over every implementation of function and predicate symbols, so a synthesized controller must work for any implementation consistent with those symbols (sec.3.2, p.6).

How to apply it:
1. Define cells for state signals that persist across time.
2. List function symbols that construct outputs and predicate symbols that observe state.
3. Write temporal assumptions and guarantees only in terms of those symbols.
4. Synthesize the controller; implement the symbol bodies and wrapper separately.
5. Check that each implementation preserves the intended symbol meaning.

The motivating example defines `moveLeft(ball)` and `moveRight(ball)` functions and `leftmost(ball)` and `rightmost(ball)` predicates (sec.4, pp.7–8). The authors caution that the LLM sometimes assigns a different meaning to a symbol; in the “Vending” benchmark it misinterpreted `isLessThanPoint75` and subtracted negative numbers incorrectly (sec.5.1, p.10).

Inference: Verus can use the same boundary by defining `spec fn` predicates over abstract state and executable Rust functions that implement them, with `requires`/`ensures` linking code to the abstraction. Inference: unlike TSL's universal quantification over arbitrary implementations, a Verus proof must state and prove the concrete implementation contract; an interface name alone is not a guarantee.

## technique: three-part natural-language prompt construction

The pipeline requires three user-specified components: “(1) a short, high-level natural language summary of the problem (2) a series of constraints on the system, stated in plain English, and (3) the names and signatures of the function and predicates terms to be used in the specification.” (sec.1, p.3). The system concatenates these into a specification-generation prompt, sends it to an LLM, and receives a TSL specification (sec.4, p.6).

How to apply it:
1. Write a short metaphor-rich summary that fixes the domain vocabulary; the ball example describes a position from 0 to 10 between two walls (sec.4, p.7).
2. Follow with plain-English assumptions and guarantees, each stated as a distinct constraint (sec.4, pp.7–8).
3. Declare cells, functions, predicates, and signatures with their intended meanings (sec.4, p.8).
4. Instruct the LLM to use those symbols and emit only TSL.
5. Inspect the generated TSL before synthesis or verification.

The paper explains why vocabulary consistency matters: “It is important to establish a clear metaphor in this ‘high level summary’, because the LLM needs to be able to tie keywords together in subsequent natural language.” (sec.4, p.7). Inference: for VL, a prompt should similarly separate Rust data representation from contract-level predicates, list exact types and signatures, and state each safety/functional obligation in plain language before asking for Verus code.

## technique: benchmark validity, semantic correctness, and conditional correctness separately

What it is: distinguish malformed output from a valid but wrong specification. The paper evaluates “How often did the LLM produce a valid specification?”, “How often did the specification accurately model the problem?”, and “Given that the specification was correct, how often did it accurately model the problem?” (sec.5.1, p.9).

How to apply it:
1. Run the generated specification through a parser or synthesis tool and record validity.
2. Compare its assumptions and guarantees with the benchmark's intended behavior and record correctness.
3. Compute correctness conditional on valid outputs to separate semantic quality from syntax failure.
4. Compare full prompts with ablations that remove functions/predicates or detailed descriptions.

Inference: Verus evaluation should record generated, parseable, verifying, and independently semantically correct Rust separately. A proof of a malformed or vacuous contract should not count as a correct specification. Inference: this conditional decomposition is especially important for agent-written code because compiler success can hide omitted requirements.

## technique: use abstraction ablations to identify prompt value

The paper's ablation removes function and predicate terms and, separately, all natural-language detail except the high-level summary (sec.4, p.6; sec.7, p.11). The full pipeline, function/predicate removal, and reduced-description variants are run over the same benchmark families. The conclusion says, “Our results indicate that a clear abstraction improves specification generation, especially when the abstraction is chosen in such a way that it is easy for the LLM to understand.” (sec.7, p.11).

Inference: a Verus study should keep the Rust task and verifier fixed while ablating abstract Views, type invariants, signatures, examples, and natural-language contracts one at a time. Inference: this would reveal whether improvements come from useful semantic decomposition or merely from giving the model more tokens.

## evidence, limitations, and VL threat

The paper's benchmarks are intentionally simple visual reactive systems, and the extracted text gives no aggregate counts for each figure. The authors explicitly report that separation “tended to outperform” but “not always” and that misunderstanding an abstraction can erase the benefit (sec.5.1, pp.10–11). TSL also leaves data functions universally quantified and focuses synthesis on temporal control (sec.3.2, p.6). Inference: the benchmark does not establish performance on arithmetic-heavy systems, memory safety, concurrency, or Rust ownership.

Inference: the threat to VL is high when agents must translate prose requirements into contracts: explicit abstract predicates and signatures can reduce accidental entanglement with representation details, but a wrong abstraction can make a clean proof certify the wrong behavior. Inference: the residual trust boundary includes the human-authored natural-language requirements, abstraction definitions, and semantic link between each executable Rust function and its Verus `spec fn`; Verus verifies only the stated contract.

## what VL should not redo

The paper already contributes a reusable prompt decomposition, a data/control abstraction pattern, and a three-part benchmark that separates validity from semantic correctness. Inference: a VL benchmark should cite and extend this design rather than present giving the model interfaces and examples as a new principle. Its distinctive missing dimension is executable proof checking; Verus can add that dimension by requiring verifier-passing code and independently reviewed contracts.

## techniques for the catalog

- data/control separation — hide representation operations behind declared function and predicate symbols
- three-part prompt — provide a summary, plain-English constraints, and typed symbol signatures
- temporal abstraction — specify control over arbitrary implementations of data functions and predicates
- validity/correctness metrics — measure parseability, semantic correctness, and correctness conditioned on validity
- abstraction ablation — remove interfaces or descriptions to isolate which prompt information helps
- interface semantic audit — check that generated use of each symbol matches its declared meaning
Checked 2026-10-15 against paper murphy2024guiding: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
