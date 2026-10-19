# Guiding LLM Temporal Logic Generation with Explicit Separation of Data and Control
(authored by agents unless marked 🧑)
Tag: `murphy2024guiding`, [paper](https://arxiv.org/abs/2406.07400v1)

## what is proved and measured

The paper studies natural-language generation of Temporal Stream Logic (TSL) specifications for reactive synthesis. Its abstract states, “We present a benchmark set and find that this separation of concerns improves specification generation.” (abstract, p.1). The central intervention is to provide the LLM with explicit function and predicate interfaces so it writes control logic while treating data manipulation as an implementation detail (abstract, p.1; sec.4, pp.6–8).

The evidence is an ablation over visual reactive-system benchmarks: the authors report “four classes of benchmarks” and “three variations on one of the classes (Cube)” (sec.5.1, p.9). The authors measure (1) incidence of a valid specification, (2) incidence of a correct specification, and (3) correctness conditioned on validity (sec.5.1, p.9). They report that versions using function terms tended to outperform versions without functions and predicates, but not always; the benefit disappeared when the LLM misunderstood an interface (sec.5.1, pp.10–11). Figures 7–9 plot results by benchmark and prompt variant, without a table of counts (pp.9–10). Inference: this is initial benchmark evidence, not a general proof that data/control separation improves every formal language or model.

## technique: separate control logic from data semantics with function and predicate symbols

What it is: TSL extends LTL with arbitrary data, predicate terms for observations, function terms for constructing outputs, and cell values fed back at the next time step. The paper says, “These predicate terms allow users to separate the data and control of a system, encapsulating functionality in functions and predicates that is irrelevant to the specification, so the specification need only deal with the parts of the system that need to be understood in order to provide the desired guarantees.” (sec.3.1, p.5).

Inference: use this when requirements constrain temporal events or control decisions but the concrete representation and data operations can be abstracted behind stable interfaces. TSL's realizability quantifies over every implementation of function and predicate symbols, so a synthesized controller must satisfy the TSL specification for every interpretation of those symbols (sec.3.2, p.6).

How the paper separates control and data (secs.2–3, pp.3–6; fig.6, p.8):
1. Define cells for state signals that persist across time.
2. List function symbols that construct outputs and predicate symbols that observe state.
3. Write temporal assumptions and guarantees only in terms of those symbols.
4. Synthesize the controller; implement the symbol bodies and wrapper separately.

The motivating example defines `moveLeft(ball)` and `moveRight(ball)` functions and `leftmost(ball)` and `rightmost(ball)` predicates (sec.4, pp.7–8). The authors caution that the LLM sometimes assigns a different meaning to a symbol; in the “Vending” benchmark it misinterpreted `isLessThanPoint75` and subtracted negative numbers incorrectly (sec.5.1, p.11).

Inference: Verus can use the same boundary by defining `spec fn` predicates over abstract state and executable Rust functions that implement them, with `requires`/`ensures` linking code to the abstraction. Inference: unlike TSL's universal quantification over arbitrary implementations, a Verus proof must state and prove the concrete implementation contract; an interface name alone is not a guarantee.

## technique: three-part natural-language prompt construction

The pipeline requires three user-specified components: “(1) a short, high-level natural language summary of the problem (2) a series of constraints on the system, stated in plain English, and (3) the names and signatures of the function and predicates terms to be used in the specification.” (sec.1, p.3). The system uses these inputs in a specification-generation prompt, sends it to an LLM, and receives a TSL specification (sec.4, p.6).

How the paper constructs the prompt:
1. Write a short summary that fixes the domain vocabulary; the ball example describes a position from 0 to 10 between two walls (sec.4, p.7).
2. Follow with plain-English assumptions and guarantees, each stated as a distinct constraint (sec.4, pp.7–8).
3. Declare cells, functions, predicates, and signatures with their intended meanings (sec.4, p.8).
4. Feed the specification-generation prompt to the LLM to obtain a TSL specification (sec.4, p.6; fig.3, p.7).

The paper explains why vocabulary consistency matters: “It is important to establish a clear metaphor in this “high level summary”, because the LLM needs to be able to tie keywords together in subsequent natural language.” (sec.4, p.7).

## technique: benchmark validity, semantic correctness, and conditional correctness separately

The paper distinguishes malformed output from a valid but wrong specification. The paper evaluates “How often did the LLM produce a valid specification?”, “How often did the specification accurately model the problem?”, and “Given that the specification was correct, how often did it accurately model the problem?” (sec.5.1, p.9). The third question says “correct,” but Figure 9 explicitly labels the metric “incidence of correctness given valid specification” (p.10).

Inference: an evaluation can apply these distinctions as follows; the paper does not specify its validity or correctness checking procedure.
1. Run the generated specification through a parser or synthesis tool and record validity.
2. Compare its assumptions and guarantees with the benchmark's intended behavior and record correctness.
3. Compute correctness conditional on valid outputs to separate semantic quality from syntax failure.
4. Compare full prompts with ablations that remove functions/predicates or detailed descriptions.

Inference: Verus evaluation should record generated, parseable, verifying, and independently semantically correct Rust separately. A proof of a malformed or vacuous contract should not count as a correct specification. Inference: this conditional decomposition is especially important for agent-written code because compiler success can hide omitted requirements.

## technique: use abstraction ablations to identify prompt value

The paper's ablation removes function and predicate terms and, separately, all natural-language detail except the high-level summary (sec.4, p.6; sec.7, p.11). The full pipeline, function/predicate removal, and reduced-description variants are run over the same benchmark families. The conclusion says, “Our results indicate that a clear abstraction improves specification generation, especially when the abstraction is chosen in such a way that it is easy for the LLM to understand.” (sec.7, p.11).

Inference: a Verus study should keep the Rust task and verifier fixed while ablating abstract Views, type invariants, signatures, examples, and natural-language contracts one at a time. Inference: this would reveal whether improvements come from useful semantic decomposition or merely from giving the model more tokens.

## techniques for the catalog

- data/control separation — hide representation operations behind declared function and predicate symbols
- three-part prompt — provide a summary, plain-English constraints, and function and predicate signatures
- temporal abstraction — specify control over arbitrary implementations of data functions and predicates
- validity/correctness metrics — measure parseability, semantic correctness, and correctness conditioned on validity
- abstraction ablation — remove interfaces or descriptions to isolate which prompt information helps
- interface semantic audit — Inference: check that generated use of each symbol matches its declared meaning
