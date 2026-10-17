# Djinnlang: Higher-Level Programming by Unambiguous Specification with an LLM in the Compiler
(authored by agents unless marked 🧑)
Tag: `henniger2026djinnlang`, [paper](https://arxiv.org/abs/2609.23954)

source: Henniger, Chong, Amin (Harvard), arXiv:2609.23954v1, 21 Sep 2026, preprint; 14 PDF pages, no appendix. The preprint prints no page numbers; p.N below is the N-th PDF page.

## what it is

Djinnlang is a language in which the programmer writes only constraints relating inputs to outputs. A translator (`djinnc`) lowers each declaration to Dafny predicates plus a fixed list of empty lemmas and one empty function; a coding agent fills the bodies; Dafny checks them. The new requirement is that the constraints must determine the output uniquely. The abstract: “We argue that an unambiguity constraint is key: in addition to proving that its implementation satisfies the specification, the LLM must also prove that any other implementation satisfying it must produce the same outputs on the same inputs, i.e. that the relation formed by the constraints is deterministic.” (Abstract, p.1). The authors name Verus as a planned target: “We are hoping to create variants that build on Verus instead of Dafny, as well as on emerging Lean-based code verification systems.” (Section 4, p.4).

## the guarantee, the measurements and the trust base

proved, per function, by Dafny on agent-written proofs: the specification admits at most one output per input; it admits at least one; the implementation terminates and its output satisfies the specification; each declared postcondition follows from the specification; each call meets its callee's precondition (Section 4.2, pp.5-6).

measured: for three programs and the translator itself, whether two agents discharged all obligations, at what token cost and time, how many lines of code and proof resulted, and how fast the resulting programs run (Section 7, Tables 1-3).

trusted, in the paper's words: “A developer must trust the ambient Dafny supplying the datatypes and helpers a spec is written against plus the external I/O bindings, the unverified main glue, the pinned drivers, the translator, as well as Dafny, Boogie, and Z3.” (Section 9, p.12). And the specification itself: “The specifications were themselves LLM-generated, but we checked them carefully.” (Section 7.1, p.9).

not covered: performance and timing behaviour, which the paper leaves to the implementer by design (Section 2.4, pp.3-4); concurrency (Section 9, p.12).

## technique 1: the unambiguity and existence obligations

what it is: two proof obligations about a specification alone, before any code. With pre the conjunction of preconditions and q the relation the constraints define between inputs x and output o (Section 2.1, pp.2-3):
- unambiguity: for all x, o1, o2, if pre(x) and q(x, o1) and q(x, o2) then o1 = o2
- existence: for all x, if pre(x) then some o satisfies q(x, o)

the consequence the paper draws: “Once 𝑞 is a total deterministic relation, an implementation has nothing left to decide about what the program computes.” (Section 2.1, p.3).

Inference: use it when code is written by an untrusted generator and nobody will read it. A postcondition that is true but weak lets many implementations pass; a unique-output proof closes that gap for the input-output behaviour.

how it is done, on the paper's `max` example (Figure 1, p.2). The source:

```
func max(list: seq<int>) -> r: int
  requires |list| >= 1:
  r in list
  for x in list:
    x <= r
```

the translator emits a precondition predicate, a specification predicate, and these stubs, whose statements the model cannot change:

```
lemma max_is_unambiguous(list: seq<int>, o1: int, o2: int)
  requires max_spec(list, o1)
  requires max_spec(list, o2)
  ensures o1 == o2
lemma max_exists(list: seq<int>) requires max_preconditions(list)
  ensures exists r: int :: max_spec(list, r)
function max(list: seq<int>): int requires max_preconditions(list)
lemma max_implementation_is_correct(list: seq<int>)
  requires max_preconditions(list)
  ensures max_spec(list, max(list))
```

Verus form. Inference (the paper has no Verus version):

```rust
spec fn max_pre(list: Seq<int>) -> bool { list.len() >= 1 }
spec fn max_spec(list: Seq<int>, r: int) -> bool {
    max_pre(list) && list.contains(r) && forall|x: int| list.contains(x) ==> x <= r
}
proof fn max_is_unambiguous(list: Seq<int>, o1: int, o2: int)
    requires max_spec(list, o1), max_spec(list, o2),
    ensures o1 == o2,
{ }
proof fn max_exists(list: Seq<int>)
    requires max_pre(list),
    ensures exists|r: int| max_spec(list, r),
{ }
```

and the implementation is an executable `fn` whose `ensures` is the specification predicate applied to its result, so the separate implementation-correctness lemma of the Dafny form merges into the function's contract. What changes: (a) executable Rust returns machine types, so the specification is stated over the result's view (for example `v@` for a `Vec`), and unambiguity then means equal views, not equal representations; (b) with bounded integers the existence proof must also show the unique output fits the return type, which the Dafny example with unbounded `int` does not face; (c) the two `proof fn` bodies above are empty placeholders, as in the paper's stubs, and the agent fills them. What does not change: both obligations are about `spec fn`s only and need no code to exist.

evidence: all obligations of four programs were discharged (technique 9). During drafting of the translator's own specification, some obligation could not be discharged four times because the draft was wrong; the paper does not say which obligation kind it was, so this is not evidence for the unambiguity or existence obligations in particular: “While we were still drafting the specification, the compiler found four distinct bugs in it — in each case an obligation that could not be discharged because the draft was genuinely wrong, not merely hard.” (Section 6.5, p.9).

where it fails or what it assumes:
- uniqueness is not intent. A specification can be unique and total and still describe the wrong function. The paper says its approach narrows the trusted artifact to the specification and does not fully resolve the elicitation problem (Section 8, p.11).
- Inference: it forces a decision on everything the outputs contain, including things nobody cares about; the paper lists the exact wording of an error message as a case where relaxation is wanted (Section 10, p.12).
- an unprovable obligation gives no diagnosis: “The three explanations — the specification is unsatisfiable, the proof is merely hard, the model is too weak — are indistinguishable from outside.” (Section 9, p.12). The paper adds that it did not meet this outcome in the four programs compiled.
- it says nothing about speed, so a model can produce a correct but uselessly slow program (technique 8 results).

## technique 2: the full obligation list per function, with pinned statements

what it is: a fixed, mechanically generated checklist per declaration. For a function the translator writes two predicates into a trusted file and these stubs, in this order, into the solution file (Section 4.2, pp.5-6):
1. unambiguity
2. postconditions: one lemma per `ensures` clause, derived from the specification predicate. “A postcondition that does not follow from the body is rejected rather than assumed.” (p.5)
3. existence. “A contradictory specification dies here.” (p.5)
4. implementation: a compiled, terminating function with the same signature, the only stub that is code
5. implementation correctness: the implementation's output satisfies the specification predicate on the whole precondition domain
6. call sites: where the body calls something with a precondition, that precondition holds there; omitted if there are none

Verus form. Inference: items 1-3 are `proof fn`s over `spec fn`s as in technique 1; items 4-5 are one executable `fn` with `requires` and `ensures`; item 6 Verus checks by itself at every call. Item 2 is worth copying as is: any extra `ensures` a human wants to rely on is a `proof fn` from the specification predicate to that property, so a redundant claim is checked against the specification and not merely against one implementation.

## technique 3: tamper checks around the agent

what it is: the acceptance command that decides whether an agent's output counts (Section 6.1, p.8).

how it is done:
1. regenerate the trusted file from the source: “verify first retranslates the specification, so that a stale or tampered spec.dfy can never be what the solution is checked against.”
2. scan the solution for ways to skip proof, and check that every obligation is still stated as generated: “It then scans the solution for escape hatches — the substrings assume, {:axiom}, {:extern}, and {:verify — and checks that every regenerated obligation appears in the solution verbatim: the comment, the signature, and the contract, everything except the body between the braces.”
3. run Dafny with a 120-second limit per obligation
4. not part of the acceptance command: the translator's first mode, which writes the files, writes the solution file only when absent or when forced, since it holds work that is costly to reproduce (Section 6.1, p.8)

Verus form. Inference: (1) regenerate the specification module from its source of truth before each acceptance run and verify against that copy; (2) reject a solution containing `assume`, `admit`, `#[verifier::external_body]` or `#[verifier::external]` outside an allow-listed trusted module, and compare each required item's signature with its `requires` and `ensures` text against the generated stub; (3) run Verus with a fixed resource limit. A substring scan is crude but cheap; helper `proof fn`s and `spec fn`s the agent adds are allowed because they do not alter pinned statements.

limits: the scan covers only the named substrings. Whether other Dafny features could weaken a proof is not discussed in the paper.

## technique 4: relations as loose vocabulary, resolved at the use site

what it is: three kinds of declaration (Section 4, p.5). A `func` is pure and unambiguous. A `rel` is pure but may relate one input to many outputs or none; it becomes a predicate and has no code. A `proc` is unambiguous and may have effects. A relation can be used inside a function if the function adds constraints that pick one output.

the paper's example (Sections 4.3 and 5.1, pp.6-7): `perm(list)` relates a list to every permutation of it; `sort` is `perm(list) = r` plus `r[i] <= r[i+1]` for each adjacent pair. The paper notes that proving `sort` unambiguous requires showing that `<=` is a total order on `int`, and that on a type where it is not, the verifier flags the issue (Section 5.1, p.7).

partial and total (Section 4.3, p.6): a relation is partial unless marked `total`, which adds the existence obligation. `x in domain(q)` holds exactly when `q` relates `x` to some output, so a specification can branch on solvability without producing a solution.

Verus form. Inference: a relation is a `spec fn` returning `bool` over input and output; `domain` is an `exists` over it; a function specification conjoins the relation with a tie-breaking constraint and then carries the unambiguity `proof fn`. Nothing new is needed.

## technique 5: specify a function as the preimage of another

what it is: because `=` is equality and not assignment, a parser can be specified as the inverse of a printer (Sections 4.1 and 5.3, pp.5 and 8):

```
func stringtoint(s: string) -> r: Result<int>:
  if s in range(inttostring):
    r.ok()
    inttostring(r.value) = s
  else:
    r = Failure
```

to accept more inputs (leading whitespace), the paper replaces the printer by a relation from a number to many strings and takes the preimage of that; the printer is then redefined on top of the relation with extra constraints that exclude whitespace.

Inference: use it for encode/decode, print/parse, serialize/deserialize pairs, where one direction is easy to state.

Verus form. Inference: `ensures` of the parser says: if some `r` has `print_spec(r) == s@` then the result is `Ok` of that `r`, else `Err`. Unambiguity of the parser then needs injectivity of the printer's specification, which is a useful lemma in its own right. The round-trip property is the specification here, not a test.

## technique 6: deliberate redundancy in the specification

what it is: write the same intent several ways, including concrete input-output cases, so that a slip in one line contradicts another and the existence or unambiguity proof fails. The paper turns the DRY rule around and argues it will be good practice to repeat yourself (Section 2.2, p.3).

the paper's example (Section 5.2, pp.7-8): `nattostring` constrains each digit by a formula, then adds that each character is at least `'0'` and at most `'9'`, and two cases, `i = 5 => s = "5"` and `i = 128 => s = "128"`. Three seeded mistakes and how they are caught:
- `% 100` instead of `% 10`: contradicts the `<= '9'` line
- index `s[|s|-k]` instead of `s[|s|-1-k]`: constrains an out-of-bounds index at k = 0, and leaves `s[0]` unconstrained so determinism fails too
- index `s[|s|-2-k]`: out of bounds at the other end, and the last character is left unconstrained

Verus form. Inference: in a `spec fn` specification add range facts and a few concrete cases as conjuncts; a slip then makes the existence `proof fn` unprovable. Concrete cases can also be stated as separate `proof fn`s with `ensures spec(5, ...)`. This is a cheap defence against a wrong specification and it needs no new tooling.

limits: the three mistakes are the authors' illustrations; the paper does not report a study of how many real specification mistakes redundancy catches, and does not say that the four drafting bugs of Section 6.5 were caught by it.

## technique 7: effects as an unambiguous step function plus a generated driver

what it is: a way to keep the constraints-only style for code with side effects (Section 4.4, pp.6-7). A `proc` is lowered to a pure step function from the last completed step to the next one, which the model implements and which must be unambiguous like any function, and a driver loop that performs the effect each step names.

how it is done:
1. each effect is a `do` line; `do` lines are chained in textual order, the one place where order matters
2. an `if` condition is conjoined onto the guards of the events inside it
3. a loop's last event chains to the first event of the next iteration or to what follows the loop
4. clauses sharing a predecessor have mutually exclusive guards, so the machine is deterministic by construction and the translator discharges that proof itself
5. `ordered for` marks a loop whose body has effects; `then:` blocks scope a pure constraint to hold only after a step, since otherwise a pure constraint in a `proc` holds for the whole run
6. the driver is generated, not written by the model: “Because the Dafny driver function is mechanically generated by the translator and never touched by the LLM, we can trust it.” (p.6)
7. termination is proved by default; `noreturn` turns that off for event loops

Verus form. Inference: Verus verifies imperative Rust directly, so this encoding is not needed to write effectful code. The idea that does transfer is the split of trust: the model writes a pure, uniquely specified transition function, and a small fixed loop, never edited by the model, performs I/O through functions whose contracts are trusted. What does not carry over: the paper's guarantee about the order of events relies on its generated machine; in Verus an event-order property would need a ghost trace threaded through the I/O functions' `requires` and `ensures`.

limits: the paper calls procedures the hardest part of the design to settle (Section 4.4, p.6) and says the language cannot yet say much about effects beyond which happen and in what order (Section 10, p.12).

## technique 8: performance as a second, verified pass

what it is: once a solution verifies, a second prompt asks for a faster one under the same obligations. Acceptance rule: “In this round, we only accept the agent’s changes if the proofs still pass verification and the solution is actually faster across the workloads.” (Section 6.4, p.9).

evidence (Table 2, p.10; fastest of repeated runs in seconds, Dafny release builds via the C# backend, MacBook Pro M4 Max; base then optimized):
- Claude Fable 5.1: Sudoku hard puzzles 0.65 to 0.13; LZ77 on 4 MB text 0.91 to 0.63; Imp VM on 10^9 steps 76.9 to 18.5
- GPT 6 Astra: Sudoku hard puzzles over 900 (timeout) to 47.84; LZ77 on 4 MB text crash (stack overflow) to 25.63; Imp VM on 10^9 steps 211.7 to 189.3; sieve over 900 to 61.7
- on all three LZ77 workloads the GPT 6 Astra baseline crashed, and on both Sudoku workloads it timed out

Verus form. Inference: unchanged; the `ensures` of the executable function is the fixed point, and any rewrite that still verifies is the same function by the unambiguity proof. A product would add a benchmark gate as the paper does.

limits: a verified program can be unusable. Two of the three baseline programs from one implementer (GPT 6 Astra: Sudoku and LZ77) could not finish their workloads, though every obligation was proved.

## technique 9: an unmodified coding agent as the back end, with a guide and a single command

how it is done (Sections 6.2-6.3, pp.8-9):
1. give the agent a directory with the specification and its ambient Dafny, the stub file, and a written guide saying what each obligation kind means, how the verifier judges, and which proof tactics tend to work
2. the agent loops: edit, run the verify command, read errors, repeat, until it passes
3. the agents built their own support tooling, outside the trusted base: they split the declarations into disjoint groups, gave each group to its own agent on its own copy of the solution, and merged the copies with a tool
4. bootstrapping the translator (Section 6.5, p.9): a throwaway seed translator in Python, whose output was checked by hand, produced the first obligations; a second model filled them; the binary built from that then regenerated its own obligations byte for byte and re-ran the whole proof

evidence:
- “Both implementers discharged all 256 obligations of all three specifications, and the compiler’s 2,106 obligations (Section 6.5) came out of a single run as well.” (Section 7, p.9). The three programs: Sudoku 70 lines and 61 obligations, LZ77 81 lines and 63, Imp VM 166 lines and 132 (61 + 63 + 132 = 256)
- the translator: 4,088 lines of Djinnlang in 487 declarations, 2,106 obligations, discharged with 4,715 lines of implementation, 31,823 lines of proof and 1,549 helper declarations, by GPT 6 Astra, 1.4 billion tokens, an estimated $1,950 at API prices, over multiple days (Section 6.5, p.9)
- sizes (Table 1, p.10; content lines, baseline then optimized): Claude Fable 5.1 code/proof for Sudoku 303/929 then 448/1274, LZ77 448/2339 then 545/2585, Imp VM 257/655 then 1440/2564; GPT 6 Astra for Sudoku 76/348 then 197/468, LZ77 72/206 then 210/356, Imp VM 187/395 then 359/514
- cost (Table 3, p.11; list API prices, not actually paid since subscriptions were used): Claude Fable 5.1 with Claude Code, implementation $51 + $236 + $73 = $360, optimization $36 + $84 + $546 = $666, total $1026 in 2,823 turns; the paper's summary: “Codex compiled all three programs in 33 minutes of elapsed time for an estimated $47, against 21 hours and $1026 for Claude Code — it is roughly thirty times faster and twenty times cheaper.” (Section 7.2, p.9)
- the table's caption warns the two costs are not directly comparable, because the Claude figure is dominated by cache writes that the Codex logs do not record

Verus form.

## specification patterns shown in the benchmarks

- unique answer for a search problem without quantifying over all answers (Sudoku): “Completions are a relation, since a puzzle may have none or many; minimality is pinned down without quantifying over grids by requiring that for every empty cell and every smaller digit, the puzzle that keeps the answer’s prefix and places that digit has no completion at all.” (Section 7.1, p.9)
- optimality as a recurrence (LZ77): the minimum token count is a recurrence over the finite set of tokens usable at a position, which states shortest among all encodings without naming one; the compression ratio thereby belongs to the specification (Section 7.1, p.9)
- totality by fuel (Imp VM): the interpreter runs under a fuel bound so it is total, and any implementation must stop at exactly the same step count when fuel runs out (Section 7.1, p.9)

Inference: each is a way to meet the unambiguity obligation for a problem that naturally has many valid answers: pick a canonical answer by an order (lexicographically least), specify the optimum's measure, or bound the computation. In Verus these are `spec fn` definitions of the same shape. The paper does not say how the LZ77 specification picks one encoding among several with the same minimal token count.

## where the paper's numbers and statements do not agree

- Table 3, GPT 6 Astra: the six rows sum to $39.50, 349 turns and 112.2 k output tokens; the “all three” row prints $46.89, 416 turns and 127 k. The Claude column's rows do sum to its totals ($1026, 2,823 turns, about 2.2 M tokens).
- speed ratio: 21 hours against 33 minutes is about 38 times, which the text rounds to thirty; $1026 against $47 is about 22 times.
- elapsed time: Section 7.2 says 21 hours, Section 9 says 20.8 hours; the per-stage wall times in Table 3 sum to 25.1 hours, which is compatible only because the three programs were compiled concurrently.
- Section 7.2 says the cheaper compilation produced programs three to four hundred times slower. In Table 2 that ratio holds for one workload after optimization (Sudoku hard puzzles, 47.84 against 0.13, about 368 times); for LZ77 on 4 MB text it is about 41 times and for the VM on 10^9 steps about 10 times.
- Section 7.1 mentions nine long-running tasks per suite; Table 2 lists eight workloads in total. Section 7.3 cites matrix multiplication going from 217 to 38 seconds, a workload not in Table 2.
- Section 7.3 says Claude Code moved the VM from 5 to 13 to 53 million steps per second across three machines, while each implementer produced two artifacts per program; 13 and 53 match Table 2 (10^9 steps in 76.9 s and 18.5 s), the 5 matches the other implementer's optimized figure.
- Section 7.1 says correctness was also checked by black-box test suites of 14, 30 and 65 cases; the paper does not state the outcome of those tests.
- the Abstract says the generated code never needs to be read; the Introduction says there is almost never a need. Inference: the crashes and timeouts of the GPT 6 Astra baselines do not contradict either, since the claim concerns what the program computes, not its speed.

## what this paper has already done

- stated and implemented uniqueness-of-output as a mandatory proof obligation for LLM-written verified code
- shown that current agents can discharge such obligations for programs up to a 4,088-line specification without human proof work
- shown on three seeded mistakes that redundancy lets the verifier catch specification slips, and reported four drafting bugs caught by undischargeable obligations of unstated kind
- shown a pinned-stub and substring-scan protocol that lets an unmodified agent be used without trusting it
- named Verus as a target, not built

## techniques for the catalog

- unambiguity obligation: prove that any two outputs satisfying the specification for the same input are equal, so the specification leaves the implementer no semantic choice
- existence obligation: prove that every input meeting the precondition has some output satisfying the specification, which rejects contradictory specifications before code exists
- derived postconditions: prove each exported postcondition from the specification predicate, not from the implementation
- pinned stubs: generate every obligation's signature and contract mechanically and accept a solution only if each appears verbatim with only its body filled
- escape-hatch scan and retranslation: before verifying, regenerate the trusted specification file and reject solutions containing assumption or externalization markers
- relation plus tie-breaker: define a nondeterministic relation as vocabulary and make a function unambiguous by adding constraints that select one output
- domain test on a partial relation: branch a specification on whether a relation has any output for the input, without exhibiting one
- preimage specification: specify a parser as the inverse of a printer, or of a one-to-many printing relation
- deliberate redundancy: restate intent as range facts and concrete cases so a slip in one line makes existence or unambiguity unprovable
- step function with generated driver: express effects as a pure, uniquely specified transition function that the model implements and a mechanically generated loop that performs them
- canonical-answer specification: make search and optimization problems unambiguous by a least-element condition stated per position or by a recurrence for the optimum
- fuel-bounded totality: make an interpreter specification total by a fuel bound and require the exact stopping step
- verified performance pass: accept an optimization only if all proofs still pass and the result is faster on fixed workloads
- obligation guide for the agent: give an unmodified coding agent the stubs, a guide to each obligation kind and one verify command, and let it partition declarations among sub-agents
