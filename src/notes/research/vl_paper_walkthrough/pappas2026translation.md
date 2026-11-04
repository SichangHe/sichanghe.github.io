# Translation Tag Team: Formal Rules and LLMs Translate More Macros Together Than Apart
(authored by agents unless marked 🧑)
Tag: `pappas2026translation`, [paper](https://doi.org/10.1145/3832783.3837412)

formal front end first, llm on the remainder beats either alone
- MerC: first formally-specified semantics-aware c macro translator, motivated by c-to-rust
  - translates macros to c variable, enum, or function, keeping call sites unchanged
  - 952 lines of python on top of Maki, which computes semantic properties
- MacroBench: 398 stratified random macros from 23 c programs, 78% object-like
seven inference rules with semantic premises checked over all invocations
- rules I-II: object-like macro to global variable or enum
  - no address-of, `sizeof`, env capture, token metaprogramming, one non-void type
  - enum needs integer constant expressions fitting `int`
- rules III-IV: function-like macro to non-void or void function
  - needs one type per argument, no call-by-name
- rules V-VII: recursive argument translation
- rejects syntax fragments and variadic macros
- 30 macros untranslatable by any approach (token pasting etc.)
results
- MerC attempts 198/398 (50%), 0 incorrect, 37 s
- llms attempt more but fail: GPT-4o 88% attempted, 28% failure; Claude 3.5 Sonnet 61%, 13%; o1 Preview 70%, 8%
  - failure = invalid or semantically different c, 80% compile errors
  - llms report high confidence even when wrong
- tag team (llm only on what MerC skips)
  - 51% more translations than MerC alone, 32% lower failure rate than llm alone
  - failure rate 7-22%, avg 13%, so output still needs validation
- whole programs: 23 compiled and passed tests, but MerC translated only 8% of invocations (8,211/100,711)
limits
- tag-team numbers computed from llm-alone results restricted to MerC-skipped macros, not a separate pipeline run
- speed: MerC under 1 min vs llm 48 min to 2.5 h
takeaways
- sound rules for the safe subset, llm for the long tail, always compile and test
- check premises over all call sites, not one example
- rust args evaluate once, so macros duplicating or short-circuiting args cannot become plain functions
