# Contract Based Verification of Non-functional Requirements for Embedded Automotive C Code
(authored by agents unless marked 🧑)
Tag: `amilon2026contract`, [paper](https://arxiv.org/abs/2605.21532v2)

## problem and contribution

Inference: The paper addresses a gap between function-level functional contracts and module-level restrictions on calls, visibility, initialization, and data flow in safety-critical embedded C. Its artifact is an Interface Specification (IS) contract language plus the VerNFR Frama-C plugin and a compiler/Wp/Cppcheck/VerNFR workflow. The scope is a module as one `.c` file paired with one `.h` file. The authors explicitly motivate untrusted subcontractor, junior-developer, and LLM-generated code.

> “Our rules are orthogonal to popular C rulesets such as MISRA-C and center on modules and their interactions through interfaces.” (Abstract, p. 1)

Inference: The core reusable idea for Verus is to make the interface itself a checked artifact. A function proof can show that an allowed call has the right postcondition while missing a forbidden call; an interface contract can reject that call before the function proof is considered complete.

## interface principles and rules

Table 1 (p. 6) states six module principles: every cross-module interaction is a function call; the `.h`/`.c` interface shape is standardized; the IS names exactly the entry points; it names exactly which external functions may be called; it constrains their order under an assumed entry-point order; and it is one standalone artifact. The paper's Table 1 gives the motivations, including information hiding and initialized-before-read behavior.

Tables 2–3 (pp. 7–8) turn those principles into explicit rules. Control-flow rules are CFR1 (only permitted external calls), CFR2 (external-call order respects the IS order), CFR3 (no function pointers), CFR4 (no function definitions or initializations in headers), CFR5 (only headers are included), CFR6 (entry points are non-static declarations in `.h`), CFR7 (entry points are defined in `.c`), CFR8 (non-entry points are static declarations in `.c`), CFR9 (only IS entry points are declared in `.h`), CFR10 (no `extern` except entry-point declarations), and CFR11 (header declaration types exactly match the IS). Data-flow rules are DFR1 (file-global variables are static in `.c`), DFR2 (no pointer arithmetic), DFR3 (no explicit casts from or to pointers), DFR4 (static variables are explicitly initialized or written before read), DFR5 (no pointer literals), and DFR6 (use typedefs where applicable).

> “We operationalize the principles from Table 1 into 17 rules that are necessary to follow for a module to adhere to the 6 principles.” (Section 3.2, p. 7)

Inference: For Verus, encode the permitted interface as a trusted specification module and expose only verified entry functions. Use Rust visibility and modules for CFR6–CFR11 analogues, typed signatures for CFR11, and explicit state ownership instead of global mutable state for DFR1. For call-order properties, use a ghost protocol state or a Verus state machine whose transitions represent permitted phases; this is an inference because the paper uses a C checker and does not specify Verus.

## IS contract syntax and how to apply it

Write a `module` block containing four fields: `entry_functions`, `entry_order`, `external_calls` grouped by header, and `external_call_order` (Section 4.2, Figure 5, p. 10). The running `tmon` example declares `tmon_init` and `tmon_step`, assumes `tmon_init < tmon_step`, lists sensor/warning/util declarations, and orders creation before reads and warning creation before warning writes.

> “Given an interface specification and a module, our intention is that these rules can be checked using conventional methods for static analysis or formal verification.” (Section 3.2, pp. 7–8)

Section 4.2 (pp. 10–11) defines three conditions for satisfying an IS contract. First, exactly the IS entry functions are declared in the header and defined in the C file. Second, every external function invoked by the implementation is listed. Third, assuming entry points occur in the declared order, external invocations obey each order constraint. Figure 4a passes these conditions; Figure 4b fails by declaring an unlisted `get_tmon_timer`, making `tmon_step` static, calling an illicit warning function, and omitting the required warning initialization.

Inference: A Verus translation can represent this as a ghost `phase` value and proof preconditions/postconditions. An initialization entry requires `phase == Uninitialized` and ensures `phase == Ready`; the periodic entry requires `phase == Ready`. External resources could be exposed through traits; a separate check would still be needed to enforce that implementations call only permitted dependencies. The exact proof shape is an inference; the paper only gives the three semantic conditions and an informal semantics, explicitly leaving formal semantics for future work.

## VerNFR checker and toolchain

VerNFR generally traverses the AST built by the Frama-C kernel and implements eleven command-line tasks (T1–T11; Section 5, Table 4, pp. 11–12). T1 checks permitted external calls; T2 function-pointer absence; T3 no function definitions in headers; T4 header-only includes; T5/T6 entry declarations/definitions; T7 non-entry static declarations; T8 static storage for file-global variables; T9 initialized-before-read using EVA input/output locations and IS predecessor order; T10 pointer-literal absence; and T11 typedef use. T4 is a source regex search; the other tasks generally traverse the AST.

> “For each function and each input global variable, we then check that it is either explicitly initialized in the .c file or that it is an output of some predecessor function according to the order constraints in the IS contract.” (Section 5, p. 12)

The current checker does not cover all rules (Section 5, p. 12). CFR10, DFR2, and DFR3 are not implemented because preprocessing obscures the source constructs; CFR2 call-order checking is also not implemented because symbolic inference of possible call sequences is difficult. Thus a passing VerNFR result means only that the implemented checks pass.

Section 6 (Figure 6, pp. 12–14) describes four workflow stages. (1) Trusted inputs contain the IS contract, natural-language behavior, ACSL entry and external contracts, and headers. (2) An untrusted human or LLM agent emits the `.c` and `.h` implementation. (3) GCC checks syntax/types first; Frama-C Wp checks ACSL with `wp-rte`; Cppcheck checks MISRA-C; VerNFR checks the non-functional rules. (4) An output parser aggregates each critic's result into verified or not verified. A failed critic means correctness was not established, not necessarily that the program is incorrect.

Inference: A possible Verus prerequisite check would combine Rust compilation, Verus verification of entry contracts and helper invariants, a linter for interface policy, and a report aggregator. The paper evaluates C tools; this adaptation would require its own implementation and validation.

## case-study evidence

The authors wrote IS and ACSL contracts from natural-language requirements, then checked two proprietary Scania ECU modules (Sections 7.1–7.3, Tables 5–6, pp. 15–17). Specification and verification took about two person-weeks per case study; the IS contract took about one person-day, with the remainder spent on functional ACSL specifications. SFLD has 88 implementation LOC, 127 entry ACSL LOC, 109 external ACSL LOC, and a 35-LOC IS contract. SGMM has 138 implementation LOC, 124 entry ACSL LOC, 58 external ACSL LOC, and a 28-LOC IS contract.

> “The total specification and verification effort amounts to approximately two person-weeks per case study for a verification engineer.” (Section 7.1, p. 15)

For reference implementations (Section 7.4, Table 7, pp. 18–19), SGMM passed GCC and Wp (86/86 obligations) and VerNFR in 0.4 s, 14.8 s, and 13.2 s respectively, but Cppcheck rejected six required MISRA violations; total CPU time was 87.3 s. SFLD passed GCC and Wp (80/80) and VerNFR in 0.3 s, 8.4 s, and 12.0 s, but Cppcheck reported four required and two advisory violations in included headers; total was 40.7 s. SFLD had no reported MISRA-C violations when included headers were excluded. SGMM’s six required violations were in the module implementation itself. The denominator for Wp is generated obligations, and the setting is WSL2 on Intel Core i7-1365U, six cores, twelve threads, 16 GB RAM.

In preliminary LLM experiments (Section 7.5, Table 8, pp. 19–20), each row is one generated implementation, not an aggregate success rate. Sonnet 4.6 generated SGMM with the IS and passed all four critics (93 LOC; GCC 1.7 s, Wp 8.6 s, Cppcheck 57.0 s, VerNFR 14.3 s). GPT-4o SGMM with the IS passed GCC/Wp/VerNFR but failed Cppcheck. Sonnet and GPT-4o SFLD runs compiled and passed VerNFR but timed out at the 600-second Wp limit and failed Cppcheck. Sonnet 4.6 also passed all four critics on SGMM without the IS input (94 LOC). Omitting the IS sometimes still produced the intended interface. The authors attribute this tentatively to header context: “We suspect that these header files provide enough contextual information for the model to infer which RTDB functions to use, since the function names often describe their intended roles.” (Section 7.5, p. 20) They retain the IS contract for formal interface verification.

Inference: The results motivate separate interface checks for agent-written Rust and attention to functional specifications. They do not establish Rust or Verus performance, detection rates, or assurance. The paper reports reference-module VerNFR CPU times of 12.0–13.2 seconds, while generated SFLD implementations timed out in Wp.

## techniques for the catalog

- interface contract — specify entry points, permitted external calls, signatures, and call-order constraints in one artifact; VerNFR checks a subset and does not implement external-call-order verification (CFR2)
- rule decomposition — split module control-flow and data-flow requirements into individually checkable static rules
- critic pipeline — compile first, then run functional proof, coding checks, and interface checks with one aggregated verdict
- initialized-before-read analysis — use predecessor order and abstract input/output locations to reject reads without explicit initialization
- untrusted-agent workflow — treat generated implementation as untrusted while specifications and critics remain trusted
