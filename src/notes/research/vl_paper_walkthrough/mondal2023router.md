# What do LLMs need to Synthesize Correct Router Configurations?
(authored by agents unless marked 🧑)
Tag: `mondal2023router`, [paper](https://arxiv.org/abs/2307.04945)

## central result

The paper studies GPT-4 synthesis of router configurations and proposes Verified Prompt Programming (VPP): combine an LLM with verifiers, convert verifier diagnostics into localized natural-language prompts, and iterate. The experiments cover Cisco-to-Juniper translation on one router and no-transit policy synthesis on a seven-router star network. The abstract reports 10× leverage for translation and 6× for no-transit, where leverage is automated correction prompts divided by human prompts.

The authors explicitly warn that verification cannot compensate for a missing specification or unusable diagnostics: “Verification requires a specification and actionable localized feedback to be effective.” (Abstract, p. 1). They also state, “We emphasize we have not built C O S YNTH.” and “While we use GPT-4 we have not been able to access the APIs, and so manually simulated the API calls with prompts to ChatGPT.” (Section 2, p. 2). Inference: the results provide feasibility evidence for a prompting method, rather than demonstrating a deployed autonomous system.

## technique: verified prompt programming loop

What it is. VPP combines a fast verifier-to-LLM loop with a slower human fallback. A human supplies context and desired behavior; the model emits configuration; verifiers check syntax and semantics, plus topology for the multi-router task; a humanizer turns diagnostics into a prompt; the model emits a complete revised configuration; iteration stops on success, timeout, or too many attempts. This is the proposed workflow; the experiments manually submitted the generated prompts.

Steps from the paper.

1. Form a triple `(A,H,V)` of AI, human, and verification suite (Section 1, p. 1).
2. Give the LLM a precise natural-language description of context and task (Section 2, p. 2).
3. Run the syntax verifier first; the paper uses Batfish (Section 2, p. 2).
4. Humanize error lines into natural-language feedback and send it to the LLM (Sections 2–3, pp. 2–3).
5. After syntax passes, run a semantic verifier; feed localized semantic differences back to the model, returning to syntax checks if new syntax errors appear (Section 2, pp. 2–3).
6. Return the output to the human when verification succeeds or the correction limit is reached; the general VPP description also specifies a time bound (Sections 1–2, pp. 2–3).

The paper says, “Notice that there is a fast inner loop between V and A, where verifier results are automatically fed back to GPT-4.” (Section 1, p. 2). Inference: a Verus version could run the Verus verifier after each generated Rust patch, humanize diagnostics by function or proof obligation, and retain a human fallback. Feedback templates and localization would need to suit Verus diagnostics.

## technique: modular verification and local specifications

The authors find that global feedback confuses GPT-4 in their no-transit experiment, while modular checks localize errors. For multi-router synthesis, a Modularizer converts a machine-readable JSON topology into natural-language prompts and can emit local policy specifications for each router. A Composer reassembles the generated pieces for Batfish (Section 2, p. 3). The paper says, “We found it was easier for the LLM to correct itself using feedback from modular verification of components of a network (individual routers [9] or even route maps within a router [10]), rather than the network as a whole.” (Section 1, p. 1).

Steps from the paper.

1. Represent modules, topology, and connections in JSON (Section 2, p. 3).
2. Generate a textual topology prompt and separate local-policy prompts (Section 4.1, p. 5).
3. Synthesize one router configuration per prompt (Section 4.1, p. 5).
4. Check syntax with Batfish, topology against the JSON description, and local policies with Batfish Search Route Policies; return errors or counterexamples to GPT-4 (Section 4.1, p. 5).
5. After correcting the errors, simulate the entire BGP communication with Batfish to check the global policy (Section 4.1, p. 5).

In the no-transit experiment, GPT-4 oscillated when given the global policy and feedback as a counterexample packet. Local policy prompts told R1 to add communities to routes arriving from ISPs and filter those communities on egress to ISPs. The authors explain: “We found that specifying local policies as in Lightyear [9] gave us better results because it allowed us to localize verification errors to specific routers and specific route maps within those routers.” (Section 4.1, p. 5).

## technique: humanizers, error classes, and reusable instruction prompts

For Cisco-to-Juniper translation, the humanizer classifies diagnostics into syntax errors, structural mismatches, attribute differences, and policy-behavior differences (Section 3.1, p. 3). Syntax and structural errors are handled first because they can mask semantic differences. Each class has a formulaic prompt with fields filled from Batfish or Campion; policy differences use an example prefix because the affected input space is difficult to describe (Section 3.1, p. 3). An initial-instruction-prompt database (IIP) records expert rules that prevent recurring mistakes; the Modularizer also decomposes complex prompts into smaller prompts (Section 2, p. 3).

Steps from the paper.

1. Parse verifier output and assign an error class (Section 3.1, p. 3).
2. Fill the class's prompt template with affected lines, components, attributes, or example prefixes (Section 3.1, p. 3).
3. Ask the model to print the entire configuration and re-run all verifiers (Section 3.1, p. 3).
4. Add expert instructions to IIP as recurring mistakes are observed (Sections 2 and 4.2, pp. 3, 5–6).

The authors describe the instruction database as extensible: “The IIP database can be built and added by experts over time.” (Section 2, p. 3). However, for the AND/OR policy mistake, “Our attempts to help GPT-4 distinguish between AND and OR semantics using an example in the IIP also failed.” (Section 4.2, p. 6). Inference: Verus humanizers should preserve the exact failing obligation, source span, assumptions, and remaining unsatisfied postcondition. An IIP could encode project conventions, but should not replace verification.

## evidence and limitations

In translation, Table 2 lists eight error types: six fixed with generated prompts and two not fixed with those prompts. The six successes were missing BGP local-as, invalid prefix-list syntax, missing/extra BGP route policy, OSPF link cost, OSPF passive-interface setting, and wrong BGP MED. Different matched prefix lengths and redistribution behavior needed more help; these entries do not mean the final configuration remained incorrect. The authors report: “The entire cycle of prompts was around 2 human prompts and 20 automated prompts, for a leverage of 10X.” They also state: “To be clear, we “simulated” each API call by feeding our automatically generated prompts manually to GPT-4.” (Section 3.2, p. 4). The experiment's scope was limited: “For our experiment we focus exclusively on behavior related to routing and forwarding, ignoring potentially important features such as NTP servers.” (Section 3.1, p. 3).

In no-transit synthesis, “The entire cycle took 2 human prompts and 12 automated prompts, for a leverage of 6X.” GPT-4 needed human intervention for neighbor commands placed outside `router bgp` and for AND/OR route-map semantics (Section 4.2, pp. 5–6). The paper describes a seven-router network (Section 1, p. 2) and says, “In our experiments, we limited our scope to star networks where one router would be attached to a CUSTOMER IP, while the other routers are connected to different ISPs (Figure 4).” (Section 4.1, p. 5). The conclusion begins, “Our experiments are very preliminary but suggest:” (Section 6, p. 6).

For translation, the authors report: “However, we were able to reach a point where Campion and Batfish no longer produced errors.” (Section 3.2, p. 4). For no-transit, they describe a final Batfish simulation to ensure the global policy (Section 4.1, p. 5). They caution: “First, a verifier cannot prove correctness without a specification.” and “In practice, specifications are incomplete, so not all solutions are in fact acceptable to the user.” (Section 1, p. 1). Inference: these results establish acceptance by the selected tools within their modeled scope, rather than correctness of the LLM or prompting machinery. For Verus, verification likewise depends on the supplied contracts and trusted implementation assumptions; localized feedback cannot establish missing requirements.

## techniques for the catalog

- verified prompt programming — iterate LLM generation with syntax and semantic verifiers that emit localized correction prompts
- modular verification prompts — synthesize and verify local components, then compose and check the global property
- diagnostic humanization — classify verifier output and fill reusable prompt templates with precise affected locations
- initial instruction prompts — maintain expert rules for recurring model mistakes while continuing to verify every result
- leverage measurement — report automated correction prompts divided by human prompts with the complete denominator
