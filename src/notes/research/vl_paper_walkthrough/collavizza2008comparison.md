# Comparison between CPBPV, ESC/Java, CBMC, Blast, EUREKA and Why for Bounded Program Verification
(authored by agents unless marked 🧑)
Tag: `collavizza2008comparison`, [paper](http://arxiv.org/abs/0808.1508v1)

## scope and result

Collavizza, Rueher, and Van Hentenryck compare CPBPV with ESC/Java, CBMC, BLAST, EUREKA, and Why on bounded-verification benchmarks. The report is experimental and tool-specific. All experiments except EUREKA were run on one Intel Pentium M 1.86 GHz machine with 1.5 GB memory; EUREKA times were taken from its authors (Introduction, p. 1). The report defines result labels: “UNABLE means that the framework is unable to validate the program (either because a lack of expression power or time overflow), NOT FOUND that it doesn’t detect an error that was inserted in the program, and FALSE ERROR that it finds an arror in a correct program” (Introduction, p. 2).

The benchmarks cover triangle classification, erroneous triangle classification, binary search with and without an error, bubble sort, sums of squares, a permutation sum, and selection sort. The report supplies tool-specific source and specifications, so the reusable lessons concern contracts, bounds, invariants, modular summaries, arithmetic domains, and interpretation of failures. The timings below always retain the paper's program, array length, machine, and denominator. The report says, "All experiments were performed on the same machine, an Intel(R) Pentium(R) M processor 1.86GHz with 1.5G of memory" (Introduction, p. 1).

## technique 1: contract the program before checking it

What it is. State preconditions and postconditions in the verifier's input language, then translate them for tools with different interfaces. For triangle classification, the JML precondition is `i >= 0 && j >= 0 && k >= 0`; the postcondition maps triangle inequalities and equalities to result values (Section 3.1, pp. 2–3). CBMC receives the same precondition through `__CPROVER_assume(i>=0&&j>=0&&k>=0)` and checks a conjunction of assertions (Section 3.2, pp. 3–4). The paper notes that JML implication must be translated to disjunction for CBMC (Section 3.2, p. 3).

How to apply it.

1. Write the input domain as a precondition or assumption (Sections 3.1–3.2, pp. 2–3).
2. Express each required result relation as a postcondition (Section 3.1, pp. 2–3).
3. Translate logical implication into the target framework's supported Boolean form (Section 3.2, p. 3).
4. Preserve the same code and mathematical relation across tools, recording any source edits required by a tool (Sections 3.1–3.3, pp. 2–5).
5. Interpret a failed assertion against the stated contract, not merely as a crash or test failure; the report explains the CPBPV trace for `(1,1,2)` against part 1 of the JML specification (Sections 4 and 4.4, pp. 5–6 and 8). Results tables are in Sections 3.4 and 4.3 (pp. 5 and 7–8).

Verus form. Inference: put the precondition in a Rust/Verus function's `requires` clause and the result relation in `ensures`; use `assert` only for local consequences. A conjunction of implications can be written as Boolean expressions in `ensures`, or as separate lemmas. Verus's contracts are checked against the actual Rust body, so a translated C/JML contract must account for Rust integer types and overflow semantics. Inference: do not use `external_body` on the function being verified to bypass the body; an external specification is a trust assumption and should be named as such.

Evidence and limits. The report uses pre/postconditions or assertions on every benchmark, but for BLAST it inserts per-branch assertions instead of the postcondition (Section 3.3, pp. 4–5). Inference: the report does not show that translations are semantically identical across tools. It records, "Since the input formats slightly differ from one framework to another, we also give the input files that were used to perform the comparisons for each benchmark and each framework" (Introduction, p. 2). BLAST required a manually easier triangle program because it could not reason about arithmetic expressions such as `i+k<=j` unless they appeared as path decisions (Section 3.3, pp. 4–5). Inference: a source rewrite can change the verification problem.

## technique 2: loop bounds and inductive invariants

What it is. Bounded model checkers unroll loops to a chosen bound; deductive tools can use invariants to reason inductively. Binary search provides both forms. The Why input states sortedness, a result postcondition, and the invariant `0 <= l && u <= n-1` together with the fact that every occurrence of `v` lies between `l` and `u` (Section 5.3, p. 12). It also gives variant `u-l` for termination. ESC/Java uses `Loop = log(n)+1`; CBMC uses an overestimate of the unwind count (Section 5.4, p. 12).

How to apply it.

1. State sortedness as a precondition; the Why version also states `n >= 0` and a valid range for `t` (Sections 5.1 and 5.3, pp. 11–12).
2. State the search result relation as a postcondition (Sections 5.1 and 5.3, pp. 11–12).
3. For bounded checking, set a loop-unrolling bound at least as large as the worst-case iterations; the paper uses `log(n)+1` for ESC/Java and an overestimate for CBMC (Section 5.4, p. 12).
4. For inductive proof, state bounds, preservation of possible-match indices, and a decreasing variant (Section 5.3, p. 12).
5. Check both correct and deliberately erroneous versions (Sections 5–6, pp. 11–15). Inference: a checker that is sound for bugs should produce a counterexample for the latter; in Table 4 Why reports NOT FOUND.

Verus form. Inference: encode sortedness and valid slice ranges in `requires`, the search result in `ensures`, and the two interval facts in a loop `invariant`. Use `decreases u - l` (or a nonnegative variant suited to the implementation). Verus does not use a BMC unwind parameter as a proof of unbounded correctness; a bounded harness can be a separate test, while the production function needs an inductive invariant. Inference: preserve the paper's distinction between proving a bound and proving the invariant for all iterations.

Evidence and limits. Table 3 reports binary search times by array length for the correct program: CPBPV takes 1.081 s, 1.69 s, 4.043 s, 17.009 s, 136.80 s, and 1731.696 s for lengths 8, 16, 32, 64, 128, and 256 respectively; the paper does not say how many runs were made. CBMC takes 1.37 s and 1.43 s for lengths 8 and 16, then is marked TIMEOUT (>6000 s) at length 32 and TIMEOUT at lengths 64, 128, and 256; the text says the length-32 run "was interrupted after 6691,87s" (Section 5.4, p. 12). Why takes 11.18 s with the invariant and is UNABLE without it; the table does not say for which array length (the Why version of Section 5.3 takes a length parameter `n`); ESC/Java reports FALSE ERROR and BLAST UNABLE (Table 3, p. 13). For the erroneous version, Table 4 gives CPBPV times from 0.027 s (length 8) to 0.241 s (length 128), ESC/Java from 1.21 s to 1.964 s, CBMC from 1.38 s to 189.20 s, and Why NOT FOUND at every listed length 8–128 (Table 4, p. 14). The Why explanation is that 60% of proof obligations remained unknown (Section 6.1, p. 14). Inference: these results show sensitivity to invariant support and bounds; they do not rank tools universally.

## technique 3: modular verification with summaries and element constraints

What it is. Verify a helper once, replace a call with its contract, and reason about the caller through the summary. Selection sort verifies `findMin` separately: its precondition requires `0 <= l < t.length`, and its postcondition says the returned index is in range and has a value no greater than every element from `l` onward (Section 10.1, pp. 19–20). The report states the precondition of `findMin` as `0<=l && l<t.length` and its postcondition as `(l<=\result) && (\result<t.length) && (\forall int k; l<=k && k<t.length;t[\result]<=t[k])`. CPBPV checks the call precondition, then substitutes the postcondition with actual arguments (Section 10.2, p. 20). For array indexing by a symbolic index, the resulting constraint is an element constraint, such as `t0[k0] <= t0[0]` (Section 10.2, p. 20).

How to apply it.

1. Give each helper a complete contract (Section 10.1, pp. 19–20).
2. Verify the helper for arbitrary allowed inputs; the report only says "Assume that function findMin has been verified for arbitrary integers" and does not show that verification (Section 10.2, p. 20).
3. At each call, check that the caller's constraint store entails the helper's precondition (Section 10.2, p. 20).
4. Replace the call with the postcondition instantiated with actual variables (Section 10.2, p. 20).
5. Solve the caller's remaining constraints, including symbolic array indices (Section 10.2, p. 20).

Verus form. Inference: give `find_min` a `requires` clause for the slice and starting index and an `ensures` clause for the returned index and minimum property. The caller invokes the verified function normally; Verus checks the precondition and uses the postcondition. Prove index-dependent facts with `assert`, `proof fn` lemmas, and quantified specifications over the slice. Inference: Verus's ownership and slice bounds replace some pointer-validity conditions, but the abstract minimum contract remains an explicit obligation.

Evidence and limits. CPBPV's modular selection-sort check explores one path, is independent of integer representation, and takes less than 0.01 s for arrays of size 40; complete validation takes less than 4 s for array length 6 (Section 10.3, p. 20). The report attributes the bottleneck to validating `findMin`, which explores many paths. The report gives no repeated-run distribution. It says EUREKA "takes 104 seconds on a faster machine" on a version of selection sort "where all variables are assigned specific values (contrary to our verification which makes no assumptions on the inputs)"; it also reports from reference [1] that CBMC takes 432.6 seconds, BLAST cannot solve the problem, and SATABS only verifies an array with 2 elements (Section 10.3, p. 20). Inference: the settings differ, so this is not a controlled speed comparison.

## technique 4: use counterexamples and diagnose arithmetic-model mismatch

What it is. Run the same contract against a seeded bug and inspect the tool's counterexample. The triangle bug changes `trityp==2` to `trityp==1`; input `(1,1,2)` should return 4 but returns 2 because the triangle inequality fails (Section 4, pp. 5–6). Table 2 reports CPBPV 0.056 s and ESC/Java 1.853 s finding the error, while CBMC and Why report NOT FOUND, BLAST is UNABLE, and the easier BLAST version finds it in 0.452 s; times are "the time required to find the first error" (Section 4.3, p. 7; Table 2, p. 8). CBMC's behavior changes with assertion syntax and overflow assumptions: the report says CBMC is unable to detect the error with `assert` (though running the C program on `(1,1,2)` violates the assertion), finds it with `CPROVER assert`, but then "finds a false error" on the correct version; "The reason seems to be that CBMC works using modulo arithmetic", so the authors also added a no-overflow assumption on the pairwise sums (Section 4.3, p. 7). The report does not state the result after adding that assumption.

The benchmark also exposes theory limits. For bubble sort, CPBPV takes 0.031 s and 0.032 s at lengths 8 and 16 and is UNABLE at lengths 32 and 64, which the report attributes to memory overflow from SSA-like array renaming; ESC/Java takes 3.778 s at length 8 and is UNABLE at lengths 16 to 64 because "its VC is too large"; EUREKA takes 91 s at length 8 and is UNABLE beyond; CBMC reports 1.11, 2.01, 6.10, and 37.65 s for lengths 8, 16, 32, and 64 (Section 7.3 and Table 5, p. 17). For nonlinear sum of squares, BLAST and EUREKA were not run because they do not handle nonlinear expressions; ESC/Java gives FALSE ERROR for lengths 8–128, and CBMC verifies only after fixing `n==8` (Section 8, pp. 17–18; Table 6, p. 18). The report says the largest permutation-sum instance CPBPV solved, with an `alldifferent` precondition, was an array of size 10 in 66.179 s (Section 9.1, p. 19); it gives no results for other tools on this benchmark.

Verus form.

## what is proved, measured, and trusted

The report measures individual benchmark outcomes, timings, timeout and error labels, and selected maximum sizes. It does not state any repeated runs, the programs and specifications differ by tool, and EUREKA numbers come from other authors' machines. Inference: the trusted boundary includes each tool's parser and semantics, translated source, contracts, integer model, loop bounds, and manually supplied invariants. The paper's own cases show that changing assertion syntax or adding overflow assumptions changes the result.

## techniques for the catalog

- contract translation: express the same pre/post relation in each verifier's supported syntax
- loop proof choice: use explicit unwind bounds for bounded checking or invariants plus a variant for induction
- modular summaries: verify helpers once and substitute their postconditions at calls
- counterexample seeding: insert a known bug and require a concrete violating trace
- arithmetic-domain audit: record overflow, nonlinear theory, array-size, and assertion-syntax assumptions
