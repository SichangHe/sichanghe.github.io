# Lemma Functions for Frama-C: C Programs as Proofs
(authored by agents unless marked 🧑)
Tag: `volkov2018lemma`, [paper](https://arxiv.org/abs/1811.05879)

source: Volkov, Mandrykin, Efremov (Higher School of Economics; Ivannikov Institute for System Programming, Moscow), arXiv:1811.05879v1, 14 Nov 2018, 8 pages in two columns. References below are to the paper's sections (I to VI), tables and its one figure.

## what is proved and what stays trusted

The paper adds lemma functions to ACSL, the specification language of the C verifier Frama-C, in the authors' fork with the AstraVer plugin (Why3 and SMT solvers underneath). A lemma function is a C function whose contract states a lemma and whose body proves it. The authors use it on VerKer, their set of verified Linux kernel library functions, where 32 lemmas had been left unproved.

Proved: a minimum set of 31 lemma functions that replaced the old lemmas (the paper says it did not match them one to one), verified with SMT solvers (§IV, Table II).

Inference, not discussed in the paper as a trusted base: the trusted parts are the fork's translation of a proved lemma function into an axiom; the solvers Alt-Ergo and CVC4 (§III); and the purity and termination checks that make the axiom legitimate.

Inference: for Verus this paper is the same idea Verus has built in as `proof fn`. Its value for a Verus user is the reasoning about why the idea is sound, the patterns for writing such proofs, and what an old code base with unproved lemmas looks like when converted.

## technique 1: write the lemma as a pure, total, recursive function

What it is. “The proofs are expressed as ordinary pure (i. e., without side-effects) total (i. e., always successfully terminating) imperative functions.” (§III) The contract's `requires` is the lemma's hypothesis, `ensures` its conclusion, the body the proof. A recursive call is a use of the induction hypothesis.

When to use it. For facts about recursively defined specification functions, which solvers do not prove unaided: “One of the most significant cases where verification tools need such a guide is with inductive proofs as they have very limited support in automatic provers.” (§III)

Steps, from the paper's worked example in §III:

1. start from the recursive logic function the lemma is about. Here `strchrnul(s, c)` is `s` if `*s` equals `c`, else `s` if `*s` is the terminator, else `strchrnul(s + 1, c)`
2. write a ghost function with the lemma as contract: `requires valid_str(s)`, `ensures` that the result of `strchrnul(s, c)` lies between `s` and `s + strlen(s)`, and a `decreases strlen(s)` clause
3. write the body to follow the definition's recursion: `if (*s != '\0' && *s != c) strchrnul_in_range(s + 1, c);` and nothing else. The inductive case also uses a lemma about the length of `s + 1` that the paper says is "implicitly present in the proof context" because an earlier lemma function proved it. “Then the if statement in the function body splits between the base and inductive cases.” (§III)
4. leave the base cases empty; they follow from the definition
5. make sure the measure drops at the call. “The recursion is well-founded since in the only recursive call the value of the variant strlen(s) specified in the decreases clause is strictly smaller than that in the caller function.” (§III)
6. run the verifier on the lemma function as on any function

Why the solver now succeeds: the body has turned one inductive goal into non-inductive ones. “The automatic proofs require no induction and only a few quantifier instantiations, while all the necessary terms are explicitly present in the VCs.” (§III)

Verus form. Inference: this is a `proof fn` with `requires`, `ensures` and `decreases`; purity and termination need no extra clauses because Verus enforces both for proof code. The paper's example over a byte sequence and an index, as a sketch that has not been run through Verus:

```rust
verus! {
spec fn chrnul(s: Seq<u8>, c: u8, i: int) -> int
    decreases s.len() - i
{
    if i < 0 || i >= s.len() { s.len() as int }
    else if s[i] == c { i }
    else { chrnul(s, c, i + 1) }
}

proof fn chrnul_in_range(s: Seq<u8>, c: u8, i: int)
    requires 0 <= i <= s.len(),
    ensures i <= chrnul(s, c, i) <= s.len(),
    decreases s.len() - i
{
    if i < s.len() && s[i] != c {
        chrnul_in_range(s, c, i + 1);
    }
}
}
```

Inference on what changes: the C string with its terminator and `valid_str` becomes a `Seq<u8>` with a length, so the memory-validity hypothesis disappears. What does not carry over: pointer arithmetic in the lemma; in Verus the lemma is stated over the abstract sequence and tied to the executable buffer separately.

Evidence. For this example: “So in either solver, the verification takes far less than a second.” (§III) Across the project: “By these means in our examples we were able to reduce the verification time of each lemma function (cumulative time of the solvers on all function’s VCs) to a few seconds.” (§IV)

Typographic slips in the paper's example: the `ensures` writes `str + strlen(s)` where the parameter is `s`, and the prose once spells the logic function without its `r`.

## technique 2: use the proved lemma by call or by automatic instantiation

What it is. Once the function is verified for all arguments, its contract is a universally quantified lemma. The paper on its two uses: “This lemma can be automatically generated from the function contract and used in the proofs later in the program code, both explicitly by the user by calling the function strchrnul_in_range with some concrete arguments or implicitly by the SMT solver by instantiating the lemma with some concrete terms.” (§III)

When to use which. The paper gives no rule; it reports that explicit calls gave the engineer control: “The ability to instantiate lemmas by explicitly calling the corresponding lemma functions and the availability of all general C constructs in the proof code provided the verification engineer with sufficient control.” (§IV)

Verus form. Inference: Verus separates the two uses where the paper's fork makes every lemma function implicit for all later code. An ordinary `proof fn` is available only by explicit call, inside a `proof { }` block of executable code or from another `proof fn`. To get the implicit use, declare it a `broadcast proof fn`, mark the matching term with `#[trigger]`, and enable it where wanted with `broadcast use`. The Verus default is the safer one for solver time: the paper's design puts every earlier lemma into every later function's context.

## technique 3: make the generated axiom sound (how the fork does it)

What it is. The implementation turns each lemma function into an axiom for later code, and takes several measures so that the axiom cannot prove itself or be used before it is proved.

Steps (§III-A):

1. a new `lemma` keyword marks a C function specification
2. from a contract `requires R; ensures E;` over parameters and globals, generate the axiom: for all parameters and globals there exists a result such that `R` implies `E`
3. put the axiom in a new axiomatic block. AstraVer imports a block only when a symbol it defines is used, and the axiom's own name cannot be used, so the lemma function does not see its own axiom. The paper: “In particular, this approach removes the axiom from the context of the lemma function itself, preventing the axiom from trivially proving the function’s verification conditions.”
4. generate an always-true predicate with a unique name inside that block
5. add a precondition requiring that predicate to every function located after the lemma function, which pulls the block, and so the axiom, into their context and into no earlier one
6. add to the lemma function's own contract `assigns \nothing; allocates \nothing` for purity and `terminates \true` against abrupt exit; loop and recursion termination is already required by the plugin

A second design was rejected: removing the axiom from earlier functions' contexts with a Why3 pragma, which needed the tools to track the link between function and axiom. “A minimal implementation that fully translates lemma functions into existing specification entities was chosen in the end.” (§III-A)

Verus form. Inference: nothing to build; Verus does this natively. The steps are worth knowing as the list of conditions under which calling a proved function may stand for a logical fact: it has no effect on state, it always returns, its recursion is well-founded, and its own statement is not among its hypotheses. In Verus the last two are the `decreases` check on a recursive `proof fn`. The trap that remains in Verus is the one step 3 guards against in another form: a `proof fn` whose body is `admit()` or contains `assume(...)` is an axiom, not a lemma.

Limit (inference from §III-A and §V-B). The scheme orders lemmas by their position in the file, so a lemma function cannot use one defined below it.

## technique 4: generalise a per-value lemma to a quantified one with a loop

What it is. In this fork a lemma function's parameters are C values, so it cannot directly prove a statement quantified over a logic type. “Therefore lemma functions cannot be directly used to prove the lemmas with quantification over logic types.” (§V-A) The workaround applies when the quantified variable ranges over a bounded interval of C values.

Steps (§V-A):

1. prove an auxiliary lemma function `aux(v)` for one C value `v` in `[v1, v2)`
2. write a second lemma function with no parameters whose `ensures` is the quantified statement
3. its body is a loop from `v1` to `v2` calling `aux(i)`, with loop invariants `v1 <= i <= v2` and the quantified statement restricted to `[v1, i)`: for all `j` there, `P(j)`

Verus form. Inference: Verus needs no loop, because a `proof fn` may take `int`, `nat` or `Seq` arguments, and a per-value lemma is lifted with `assert forall ... by`. Assuming a per-index lemma `skipped(s, c, i, j)` with `requires 0 <= i <= j < chrnul(s, c, i)` and `ensures s[j] != c` (the counterpart of the paper's `strchrnul_skipped`, §V-C), a sketch not run through Verus:

```rust
proof fn all_skipped(s: Seq<u8>, c: u8)
    ensures forall|j: int| 0 <= j < chrnul(s, c, 0) ==> s[j] != c,
{
    assert forall|j: int| 0 <= j < chrnul(s, c, 0) ==> s[j] != c by {
        if 0 <= j < chrnul(s, c, 0) {
            skipped(s, c, 0, j);
        }
    }
}
```

The paper's loop pattern is still the right one in Verus when the per-value fact depends on the previous value, that is, for induction written as iteration in a proof-mode loop with an `invariant` clause.

## technique 5: proxy functions for logic expressions

What it is. To use a logic expression `l(u)` whose values range over C values `v1 <= l(u) < v2` as a C value inside ghost code, declare a C function whose postcondition says its result equals `l(u)` and which assigns nothing (§V-A).

The risk, in the authors' words: “In general, proxies should be introduced carefully as their post-conditions are not checked and may introduce inconsistencies, but in some cases, the proxy can be given an implementation (definition) that satisfies the corresponding specification.” (§V-A) They add that their proofs used only proxies with definitions.

Verus form. Inference: no counterpart is needed, since proof code calls a `spec fn` directly. The nearest Verus construct with the same risk is a function marked `#[verifier::external_body]`, whose `ensures` is likewise believed without a check. The paper's rule transfers: give it a body and verify it wherever possible.

## technique 6: order lemma functions by strongly connected components

What it is. A rule for when lemma A may be used in proving lemma B. “To be well-founded, the lemma functions should be split into strongly connected components and topologically ordered.” (§V-B)

How the fork does it (§V-B): lemma functions may have separate declarations and definitions; they are grouped into strongly connected components; the definition of the first function of a component fixes the component's place in the order. The difficulty specific to lemmas is that they “can be instantiated implicitly”, so a use is not visible as a call. The authors propose, and have not implemented, putting lemma function bodies inside axiomatic blocks.

Verus form. Inference: explicit `proof fn` calls make every use visible, and mutual recursion among them is handled by `decreases` clauses, so file order is free. The paper's worry returns only with `broadcast proof fn`: a broadcast lemma enabled inside its own proof, or inside a lemma it depends on, is the implicit self-use the paper's ordering exists to forbid.

## technique 7: one parametrised lemma in place of near-copies (proposed)

What it is. The authors observe: “Careful consideration of the resulting auto-active proofs from our study reveals that many of them are very similar to each other and represent instances of some more general proof patterns.” (§V-C) Their example is `strchr_skipped` and `strchrnul_skipped`, which differ in what the logic function returns at the terminator and in the extra hypothesis that the result of `strchr` is not null. “Currently, the lemmas have to be proved as two separate lemma functions.” (§V-C)

Proposed steps (§V-C), not implemented:

1. write a generic logic function `strchrcomb` taking the match condition `cond` and the value at the terminator `dft` as parameters
2. place it in a module with abstract `cond` and `dft`, and prove the lemma once for the module
3. instantiate the module with concrete `cond` and `dft` to get `strchr` and `strchrnul`; the instantiated lemmas become axioms without new proof

Verus form. Inference: for this pair no higher-order feature is needed. One `spec fn` with an extra `bool` argument choosing the terminator value, and one `proof fn` about it with the not-found case as an extra hypothesis, should cover both functions.

## technique 8: replace an inherited lemma set by the minimum needed

What it is. A conversion policy for an existing proof base. The authors did not port the old lemmas one by one: “Instead, the goal was to ensure all the code can be verified without resorting to any additional assumptions by completely replacing all the lemmas involved with a minimum required set of lemma functions.” (§IV)

Background on the old style (§II-A): “A common way to write formal specifications is to factor out the most complex logical statements into theorems and lemmas so that the provers can discharge the rest of the verification conditions automatically.” Those lemmas were to be proved manually with an interactive prover; in VerKer they had not been.

Evidence, with the columns summed:

- before, Table I: 9 functions with 69 lemmas, 37 proved automatically and 32 unproved (the per-function rows sum to these totals). By function, lemmas and unproved: check_bytes8 3 and 0; strlen 10 and 6; skip_spaces 7 and 6; strchr 7 and 3; strchrnul 7 and 2; strspn 8 and 3; strcspn 5 and 3; strnlen 17 and 6; strpbrk 5 and 3
- after, Table II: 8 functions, 9 ghost functions and 31 lemma functions in total (rows sum to these). By function, ghost and lemma functions: strlen 4 and 2; skip_spaces 1 and 3; strchr 0 and 5; strchrnul 0 and 5; strspn 1 and 5; strcspn 0 and 3; strnlen 3 and 6; strpbrk 0 and 2
- one side-by-side proof, Fig. 1, of `strchr_skipped`: the Coq script runs to line 129, of which the figure marks 93 lines as user proof; the lemma function is 15 lines including its contract (lines 2 to 8)

The authors refuse to generalise from Fig. 1: “Unfortunately, a thorough comparison of the proof overhead between the interactive and auto-active proofs turned out to be very hard.” (§IV) Their Coq support was basic, so the Coq proofs were long. And, in one sentence that runs across a column break with no words left out: “This example shows the reduction in proof overhead of more than tenfold, yet a different more optimized manual proof augmented with appropriate” “custom tactics could potentially result in a much smaller number.” (§IV)

Inference on the tenfold figure: 93 user lines against the 15-line lemma function is about six to one; it exceeds ten to one only if the contract, which restates the lemma, is not counted: the function without the contract is 6 lines and its body 4. The paper does not say which count it used.

Verus form. Inference: when taking over Verus code that contains assumed lemmas (`proof fn` bodies with `admit()`), the same policy applies: do not prove each assumed lemma as stated; find the few facts the executable functions' proofs really need, prove those, and delete the rest.

## why the authors left external provers

The paper's five reasons against external provers (§II-A and §II-B); inference: each is a property a Verus-only workflow keeps. Two languages and tool sets to learn; proofs that break “after small supposedly irrelevant changes” because generated names change; proofs stored apart from the code; solver-friendly encodings of the verification conditions being unusable for interactive proof; and proof location and sharing problems when one lemma is included in several source files. The generated names are visible in Fig. 1, where the Coq theorem quantifies over variables such as `charP_charM_str_0_30_at_L`.

## gaps and inconsistencies

- the conclusion says the evaluation was done “by proving all string-related lemmas” (§VI), while §IV says the old lemmas were not matched and were replaced by a smaller set; the 32 formerly unproved lemmas as stated were not all proved
- speed is given as far less than a second for the example (§III) and a few seconds per lemma function (§IV); no table of times, no solver versions, no machine
- no count of lines of lemma-function code against lines of Coq beyond the single figure
- Table II omits check_bytes8, consistent with its 0 unproved lemmas in Table I

## techniques for the catalog

- lemma function: state a lemma as the contract of a pure terminating function and prove it by a body whose recursive calls are the induction hypotheses
- recursion-mirroring proof: give the proof function the same case split and recursive call as the specification function it is about, with the same measure
- explicit or implicit lemma use: call the lemma function with concrete arguments for control, or let the solver instantiate its generated axiom
- sound axiom generation: turn a proved contract into an axiom that is hidden from its own proof and from earlier code, and force purity and termination clauses onto the function
- loop generalisation: prove a per-value lemma, then obtain the bounded quantified statement from a loop that calls it under an invariant
- proxy with a body: wrap a logic expression in a function with an equality postcondition, and always give it a checked definition
- component ordering of lemmas: group mutually recursive lemma functions and order the groups topologically so no lemma is used before it is proved
- parametrised lemma module: prove one lemma over abstract condition and default functions and instantiate it, in place of near-identical proofs (proposed only)
- minimal lemma replacement: when converting a proof base with unproved lemmas, prove the smallest set the code proofs need, not each old lemma
