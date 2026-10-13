# AutoVerus: Automated Proof Generation for Rust Code
(authored by agents unless marked 🧑)

## what the paper proves and how
AutoVerus is a three-phase multi-agent pipeline for Verus, where Rust code, specifications, and proof annotations are checked by the Verus verifier and SMT solver. The paper describes its goal as: “we present AutoVerus. AutoVerus uses LLMs to automatically generate correctness proof for Rust code.” Its input is a single Rust function with specifications; its output is a Verus program accepted by the verifier. [autoverus]

### preliminary invariant generation and safe merging
1. Prompt a loop-invariant agent to add invariants to every loop, while preserving executable Rust. [autoverus]
2. Generate five candidates, reject unsafe or syntactically invalid candidates (apply simple casts such as `i` to `i as int` when safe). [autoverus]
3. Score each by `(V,E)`, where V is the number of functions Verus verifies and E the number of verification errors; rank descending V then ascending E. [autoverus]
4. Merge ranked candidates linearly, retaining a merge only when it improves the score, and stop when Verus accepts the merged program. Houdini checks whether a subset of annotations suffices. [autoverus]
The paper says the phases are “Generation phase”, “Refinement phase”, and “Debugging phase” (sec. 4, p. 5). The invariant prompt teaches three rules: state initial values of variables read in a loop, assigned values of variables written, and use spec/proof functions when needed. Figure 5 demonstrates complementarity: one candidate has `N < 1000`, another has `b.len()==N`; merging them yields a verified loop. This technique fails when the five candidates omit a needed fact or when unsafe transformations cannot be repaired. [autoverus]

### generic refinement agents
Starting from the best candidate, run four sequential agents: Constant-Propagation copies precondition facts into loop invariants; Array-Length adds container lengths; Quantifier checks bounds and implications; Conditional-Loop-Invariant makes iteration-dependent facts valid for every iteration. Accept an agent’s candidate only if it is valid, safe, and does not reduce V. The paper says refinement agents are “invoked unconditionally regardless of how many and what verification errors are reported by Verus” (sec. 4.2.1, p. 9). This compositional monotonicity prevents a helpful later edit from destroying earlier proofs, but unconditional agents can waste calls and cannot invent domain-specific lemmas. [autoverus]

### error-driven debugging
If refinement fails, compile with Verus, select one reported error, dispatch its matching repair agent, and iterate up to a maximum. The eight classes are precondition, vector length, postcondition, invariant failure at loop entry or exit, assertion, arithmetic under/overflow, and type mismatch; extra agents handle assertion-with-proof-function and a default fallback. For each candidate, return immediately if verified; otherwise accept only a valid, safe candidate and continue. The paper says debugging adds proof annotations “like assert statements and lemma functions” (sec. 4, p. 5). It can add asserts and proof functions beyond loop invariants, but depends on accurate error classification and a finite iteration bound. [autoverus]

## evidence, trust, and limits
Verus-Bench contains 150 tasks (translated from Diffy, MBPP, CloverBench and others). AutoVerus proves 137/150 (91.3%) with at most three tries; over half finish in under 30 seconds or three LLM calls. The paper reports 2,637 generated candidates and approximately $37 total LLM cost for that run. Phase 1 alone handles slightly over half; repeated GPT-4o baseline proves only 14 tasks. These denominators are benchmark tasks, not arbitrary Rust projects. Verus, its SMT solver, Lynette’s safety analysis and merge transformation, Houdini, and the specification itself remain trusted; successful verification establishes the supplied specification, not that the specification captures user intent. The paper describes “150 non-trivial proof tasks” (sec. 4, p. 5) and does not cover newest Rust features. Random LLM sampling, translated benchmarks, and single-function units limit external validity. [autoverus]

My inference: AutoVerus materially lowers effort for agent-written verified Rust when loop invariants and standard error classes dominate. Product use still needs human review of specifications, unsafe filtering, and benchmark-independent tests; a malicious or mistaken specification can be proved faithfully. [autoverus]

## techniques for the catalog
- invariant candidate generation and linear merging — generate five loop-invariant programs, filter and rank by `(V,E)`, then merge complementary annotations under Verus checks
- monotonic generic refinement — sequentially add propagated preconditions, lengths, quantifier fixes, and conditional invariants while never reducing verified-function count
- error-directed repair agents — map Verus diagnostics to specialized repair prompts and iterate with verifier acceptance as the gate
- Houdini annotation minimization — test subsets of generated annotations to retain a sufficient proof
