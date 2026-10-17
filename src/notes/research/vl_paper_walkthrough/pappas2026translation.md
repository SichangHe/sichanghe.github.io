# Translation Tag Team: Formal Rules and LLMs Translate More Macros Together Than Apart
(authored by agents unless marked 🧑)
Tag: `pappas2026translation`, [paper](https://doi.org/10.1145/3832783.3837412)

## scope and result

Inference: the paper addresses C preprocessor macros, motivated by C-to-Rust translation; MerC itself translates macros to C, so that downstream C translators can handle them. Existing translators preprocess first, which removes macro abstractions; the paper instead identifies macro uses whose semantics overlap with C variables, enums, or functions. The authors state: “We introduce the first formally-specified, semantics-aware macro translator.” (Section 1, p. 2) The tool is MerC, and the benchmark is MacroBench.

Inference: the central deployment pattern is a formal front end followed by an LLM. The paper's abstract states: “Our key insight is that running MerC first then using LLMs on the remainder reaps greater benefits than using either technique alone.” (Abstract, p. 1) MerC translates only cases covered by its rules; an LLM handles the remainder, where a developer must still validate output.

## technique: semantic eligibility rules for macro rewriting

what it is

Inference: MerC uses seven inference rules. Rules I and II rewrite object-like macros to a global variable or enum. Rules III and IV rewrite function-like macros to non-void or void functions. Rules V and VI recursively translate empty and non-empty argument lists, and Rule VII translates an individual macro argument to a typed C argument. The formal rules are in Figure 2 (Section 2, p. 4; discussion in Sections 2.3–2.4, pp. 3–5).

Inference: each rule is a conjunction of semantic premises computed over every invocation. The paper's helper properties include global definition, environment capture, token metaprogramming, expression versus statement context, address and size requirements, compile-time-constant requirements, call-by-name behavior, and monomorphic type. MerC rejects syntax fragments and variadic macros: “MerC does not translate macros like MY_IF() (Listing 1) that expand to C syntax fragments, or variadic macros.” (Section 2.2, p. 3)

when to use it

Inference: use the rules when a macro's call sites must remain textually unchanged and the macro's behavior fits a C construct. A global object-like macro can become a variable only if all uses avoid address-of, `sizeof`, constant-expression contexts, environment capture, and metaprogramming, and its expansion is a constant expression with one non-void type. An enum instead requires every invocation to be an integer constant expression (ICE) and the type to fit in `int`; unlike Rule I, Rule II does not exclude uses where a compile-time constant is required (Rules I–II, Figure 2, p. 4; Section 2.3, p. 4).

Inference: a function-like macro can become a function only when all invocations are expression or statement contexts allowed by the selected rule, have one type, avoid address and size sensitivity, and its arguments are not call-by-name or environment-capturing. This excludes macros whose repeated or conditional argument expansion changes side effects.

how to do it

1. Inference: parse unpreprocessed C and identify AST-aligned macro invocations. MerC delegates semantic extraction to Maki, which computes the Boolean properties used by the premises (Section 2.2, p. 3; Section 3, p. 5).
2. Inference: collect all invocations for a macro and its argument expansions. Check every universal premise, not just the example invocation; the rule's `μ`, `Γ`, `A`, and `Δ` contexts represent invocation sets, expansion types, and argument expansions (Figure 2, p. 4).
3. Inference: choose at most one rule whose premises all hold. For Rule I, replace `#define name body` with `static const type name = body`; for Rule II, use `enum { name = body }` (Figure 2, p. 4).
4. Inference: for Rule III, infer one type for each argument, emit `static type name(args') { return body; }`; for Rule IV, emit a `static void` function. Rules V–VII perform the recursive argument rewrite (Figure 2, p. 4).
5. Inference: leave invocation sites and unrelated source unchanged. The paper's `MUL` example turns `#define MUL(X,Y) ((X)*(Y))` into `static inline int MUL(int X, int Y) { return ((X)*(Y)); }` while preserving `MUL(n,m)` at the call site (Section 2.4, pp. 4–5).
6. Inference: the paper's evaluation, which is not a MerC step, checked MacroBench translations first for compile errors with GCC; the remaining 20% of failures were checked and labeled by trained students, and a co-author validated all results (Section 5.2, p. 7). Separately, for the whole-program experiment, the authors compiled the MerC-translated programs and ran their built-in test suites; all 23 compiled and passed (Section 6.2, p. 11).

verus form

Inference: in Verus, first model the macro's intended expression as an executable or `spec fn`, then use a Rust function with `requires` and `ensures` for the translated operation. A macro that expands to a pure arithmetic expression can become a function whose postcondition equates its result to the mathematical expression; a constant macro can become a `const` plus a lemma proving the expected value. A macro that changes syntax, captures caller identifiers, depends on preprocessing conditionals, or relies on call-by-name behavior needs a different Rust encoding and should remain outside this rewrite.

Inference: preserve call sites only when Rust's function-call semantics match the macro. Rust arguments are evaluated once, so a C macro that duplicates an argument or short-circuits it cannot be replaced by an ordinary function without changing behavior. Use Verus `assert`, `requires`, `ensures`, and `proof fn` lemmas to prove the semantic relation; proof functions are erased and must not be called as run-time code. This is a Verus adaptation, not a claim made by the paper.

what shows it works

Inference: MerC is 952 lines of Python and processes unpreprocessed C through Maki, a rule-premise layer, and a macro translator (Section 3, p. 5). The paper reports: “MerC translates all MacroBench’s test cases in 37 seconds and produces no incorrect translations, but only emits translations for 50% of MacroBench’s test cases.” (Section 1, p. 2) The denominator is 398 MacroBench test cases, so 198 attempted cases are the 50% shown in Figure 4 (Section 5.4, pp. 7–8).

Inference: MacroBench is a stratified random sample of 398 macros from 23 real-world C programs, with a 95% confidence level and 5% margin of error; 22% are function-like and 78% object-like (Section 4.1, p. 6; Section 1, p. 2). The benchmark preserves surrounding declarations and invocation context, but isolates one macro per test file.

Inference: MerC attempted 198/398 cases and had 0 failures. GPT-4o attempted 350/398 (88%) with 97 failures, a 28% failure rate among attempts; Claude 3.5 Sonnet attempted 241/398 (61%) with a 13% failure rate; o1 Preview attempted 279/398 (70%) with an 8% failure rate (Figure 4, p. 8; Sections 5.3–5.4, p. 7). The paper defines failure as invalid or semantically different C, not merely refusal to translate.

## technique: MerC–LLM tag team

what it is and when to use it

Inference: run MerC first, then send only unsupported macros to an LLM with a prompt that forbids changing call sites or creating macros. The paper's zero-shot prompt says: “translate this code to pure C, translating the macro MACRO_NAME to an enum, function, or variable without changing program semantics or callsites.” (Section 5.2, p. 7) The prompt continues by forbidding changes to the macro's call sites or creating new macros, instructs the model to decline when preserving semantics and call sites is impossible, and asks for a confidence percentage (the paper notes the LLMs almost always reported high confidence, even for incorrect translations; Section 5.4, p. 8).

how to do it

1. Inference: run MerC on every MacroBench-like source file and record translated definitions.
2. Inference: for each remaining macro, start a fresh LLM chat, provide the isolated C file, request a variable/function/enum translation, and save the result. The paper used GPT-4o and Claude 3.5 Sonnet through Copilot and o1 Preview through the OpenAI API (Sections 5.1–5.2, p. 7). The paper does not describe a separate pipeline run for the tag team; its tag-team figures are reported against the LLM-alone translations (Figures 5–6, pp. 8–9). Inference: they appear to be computed by restricting those results to the macros MerC did not translate.
3. Inference: compile all LLM outputs with GCC and manually inspect those that compile, as the paper's evaluation did. The paper notes that with a nonzero LLM failure rate developers must validate all LLM translations (Section 5.4, p. 7).
4. Inference: combine the verified MerC translations and validated LLM translations, retaining the original macro where neither is safe.

what shows it works and limits

Inference: the tag team translated an average of 51% more test cases than MerC alone and had an average 32% lower failure rate than LLMs alone. The paper reports the tag teams' failure rate as 7%–22%, averaging 13%, versus LLM-only rates of 8%–28%; total attempted translations were 30%–80% above MerC's 198, and correct translations averaged 32% more (Section 5.6, pp. 8–9; the introduction gives the ranges as 18% to 45% lower failure rate than LLMs alone and 30% to 80% more translations than MerC alone, p. 2). Separately, Section 5.5 reports that LLMs alone took 48 minutes (GPT-4o), about an hour and a half (Claude 3.5 Sonnet) and two and a half hours (o1 Preview), against under a minute for MerC (Figure 4c, p. 8); the tag teams took 30 minutes to 1.3 hours on the cases MerC left (Figure 6 and text, p. 9).

Inference: failures include compile-time errors, runtime behavior changes, and non-functional preprocessor or layout changes. Table 2 counts 97 GPT-4o, 31 Claude, and 22 o1 failures; MerC has zero. Most failures (80%, Section 5.2, p. 7; Table 2, p. 10) are compile-time errors. Few-shot and few-shot chain-of-thought reduce o1's 22 failures, but also reduce attempted translations; the paper reports that few-shot corrected eight prior failures and left five incorrect, while nine were no longer attempted (Section 5.8, p. 10).

Inference: unsupported cases remain substantial. Thirty macros are never translated by any approach; the paper says these “use features like token-pasting [20] that lack a direct C equivalent” (Section 5.4, p. 8). MerC does not handle syntax fragments, variadic macros, some nested macro analyses, conditional-preprocessor semantics, or macros whose behavior depends on call-by-name evaluation. Repeatedly running MerC can peel nested macro layers, but that is an implementation workaround stated under threats to validity (Section 6.1, p. 10). In the whole-program run MerC found and translated 8,211 of 100,711 invocations (8%), which the authors attribute partly to macros defined in shared headers and to macros called within other macros (Section 6.2, p. 11).

## techniques for the catalog

- seven-rule semantic macro translation — classify every macro invocation with semantic premises, then rewrite only eligible object-like and function-like macros to C constructs
- MerC analyzer pipeline — compute Maki properties, select one rule, emit a definition, and preserve original call sites
- MerC–LLM tag team — translate safe cases formally first and send only the remainder to an LLM followed by compile and behavior validation
- translation validation — check compilation, runtime tests, and non-functional preprocessing/layout behavior, with denominators reported over attempted cases
