# SYMDIFF: A Language-Agnostic Semantic Diff Tool for Imperative Programs
(authored by agents unless marked 🧑)
Tag: `lahiri2012symdiff`, [paper](https://www.semanticscholar.org/paper/e0764b9142c211ec094543c447612dfe79da2662)

## purpose and model

SymDiff checks whether two versions of an imperative program have identical output states on terminating executions from the same input state (partial equivalence), and displays semantic differences. The abstract says, “The tool operates on an intermediate verification language Boogie, for which translations exist from various source languages such as C, C# and x86.” (p. 712). The introduction adds, “A novel feature of the tool is that it displays abstract counterexamples for equivalence proofs by highlighting intra-procedural traces in the two versions” (§1, p. 712). Its language-independent core separates equivalence algorithms from source-language details, uses Boogie's modular verifier and Z3, and reports abstract counterexample traces (§1, p. 712).

Inference: this is directly useful for validating generated Rust versions or a generated implementation against a reference model. Verus is not Boogie, so a Verus adaptation would be a new integration rather than a feature supplied by this paper.

## technique: normalize two programs to Boogie

The tool takes two loop-free Boogie programs and a configuration file that matches procedures, globals, and constants (§2, p. 713). The default matches equal names; the user can override it. Loops are either unrolled to a requested depth or extracted as tail-recursive procedures. The user may list procedures assumed equivalent. For each matched pair `f1` and `f2`, SymDiff checks partial equivalence: terminating executions from the same parameter/global input must end with identical returns and globals (§2, p. 713).

To adapt a source language, write a translator that (1) represents state—including variables, pointers, and heap—as scalar and map variables and (2) translates each source statement to Boogie (§3, p. 714). The paper cautions that “The precision and soundness of the resulting tool will be parameterized by how faithful the translator is.” (§3, p. 714). Source-line attributes and expression mappings are optional but enable source-level traces (§3, p. 715).

Inference: a Verus pipeline can define a reference and candidate as ghost state machines and translate each Rust operation into a common event or state relation. The Verus contract must state which globals, returns, heap cells, and termination behavior are compared. Inference: unlike Boogie maps, Rust ownership may make some aliasing facts available statically, but unsafe code and FFI still require an explicit heap model.

## technique: modular procedure-pair equivalence

For each matched pair, SymDiff constructs a Boogie procedure `Eq.f1.f2`. The paper's Figure 2 shape is:

```text
gl0 := gl;
r1 := inline call f1(x);
gl1 := gl;
gl := gl0;
r2 := inline call f2(x);
gl2 := gl;
assert (r1 == r2 && gl1 == gl2);
```

The wrapper saves input globals, runs the first procedure, saves its outputs, restores the input, runs the second, and asserts equality of return and output globals (Figure 2, p. 714). Calls inside the wrapper (callees of f1 and f2) are replaced by uninterpreted functions that update the modified globals and the return, taking as input the parameters and the globals read by the procedure; the set of wrappers is checked by Boogie's verification-condition generator and Z3 (§2, p. 714). If every wrapper verifies, every matched pair is partially equivalent. If one assertion fails, SymDiff extracts intra-procedural paths through both procedures (§2, p. 714).

Inference: in Verus, write a proof function that snapshots ghost state, invokes the two specifications in separate proof branches, and proves equality of the resulting ghost outputs with `assert` and `ensures`. A call summary can be a `spec fn` contract for a callee. The paper's uninterpreted summary is an assumption unless the callee is separately proved equivalent. Inference: a Verus proof of equal poststates does not by itself prove termination, so a termination requirement must be added explicitly with `decreases` or a total-function specification.

## technique: differential inlining

SymDiff offers three non-recursive inlining choices (§2, p. 714): inline every callee; inline only callees not proved equivalent; or inline only behaviors in callees not proved equivalent (“differential inlining”). These options require a bottom-up call-graph traversal. The modular default scales by summarizing callees; selective inlining increases precision where summaries cannot establish equivalence.

Inference: a Verus project can use proved `spec fn` summaries as the modular default and unfold selected functions in a proof when a summary is too weak. This is a proof-structuring strategy, not an automatic Verus mode; the developer must choose which definitions to reveal.

## technique: deterministic heap and external-effect modeling

Nondeterministic statements such as Boogie `havoc` make a procedure potentially inequivalent to itself. Translators must model allocation, I/O, and external APIs deterministically (§3, p. 715). In the C frontend, HAVOC represents the heap with maps; field dereferences become map selects and updates. Allocation uses a ghost global `allocvar`: `malloc(n:int)` returns the current `allocvar` and updates it with an uninterpreted `newAlloc(allocvar,n)`; `free` has a similar model (§3.1, pp. 715–716). Identical malloc/free sequences therefore return the same arbitrary pointer sequence, though the authors note incompleteness when allocation orders differ (§3.1, p. 716).

Inference: Verus can model an allocator as a ghost map plus a monotonic token and give external calls deterministic contracts. Any nondeterminism omitted from the model can create false equivalence. Inference: for Rust, an ownership-aware heap model may be smaller than a raw map for safe code, but pointer casts, aliasing, and FFI need map-like state.

## technique: semantic counterexample traces

When equivalence fails, SymDiff reports one intra-procedural trace per procedure and values of relevant scalar expressions after each statement (§3, p. 715). The translator supplies source file/line attributes and associates display expressions with Boogie expressions. The C frontend automatically records expressions such as `x`, `x->f.g`, `x->f.g->h`, `y[i]`, and `z.f` for a statement like `x->f.g->h = y[i] + z.f` (§3.1, p. 716). Figure 1 shows the semantic diff as a pair of traces over two programs, where the second program performs refactoring and feature addition; the authors write that “A syntactic diff tool gets confused by the refactoring and offers little idea about the change in behavior.” (§3.1, p. 716).

Inference: Verus can expose a failing `assert` with ghost input values and intermediate state snapshots, but producing source-line paired traces needs instrumentation outside the verifier. A generated Rust validator should preserve stable source identifiers in ghost events if users must diagnose model differences.

## evidence and limits

The evaluation uses Siemens C benchmarks on a 3 GHz Windows 7 machine with 16 GB memory and loop-unroll depth 2 (§3.1, p. 716). Table 1 reports versions, changed procedures, runtime, path counts, and Z3 enumeration time. For example, `tcas` has 173 lines, 9 procedures, 42 versions, 1.2 changed procedures on average, 0.64 seconds analysis time, 26.72 paths, and 1.19 seconds enumeration; `print tokens2 n6` reports more than 10,000 paths and 160.63 seconds enumeration (Table 1, p. 716). The table's columns are labeled “(Avg)” for several quantities; the paper text does not state the averaging denominator, and the four `print tokens2` n/e rows list one version each. The authors report good scaling below 1,000 paths and successful application to programs of several thousand lines (§3.1, p. 716).

What is proved is partial equivalence of matched procedures under the translated Boogie semantics when all generated wrappers verify. Inference: what stays trusted is the source-to-Boogie translator, configuration and matching, summaries for assumed-equivalent procedures, the Boogie verifier, Z3, and the adequacy of deterministic heap/external models. Inference: loops are bounded by unrolling or transformed to recursion, so the chosen model determines what behavior is covered.

Inference: semantic diff poses a moderate threat to agent-written verified Rust because it can catch regressions that tests miss and focus review on paired traces, while an unsound translator or weak summary can still make equivalence appear true. VL should reuse modular equivalence wrappers, selective inlining, deterministic effect models, and counterexample presentation; it should not redo the basic Boogie algorithm without a Rust-specific reason.

## techniques for the catalog

- intermediate-language normalization — translate multiple source languages into a common verification language
- modular procedure equivalence — compare paired procedures by running both from the same saved state and asserting equal outputs
- differential inlining — inline all, only failed, or only failed behaviors to trade precision against scalability
- deterministic effect modeling — model allocation, I/O, and externals with repeatable state transformers
- semantic counterexample traces — report paired paths with source locations and expression values
- SMT verification-condition checking — discharge equivalence wrappers with modular VC generation and Z3

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We provide an example of deterministic modeling of allocation for C programs in the next section."): read the whole paper (pp. 712-717) and checked every quotation, page and section reference, the Figure 2 steps, the inlining options, the allocvar model, the C front-end expression example and the Table 1 numbers quoted (tcas row, print tokens2 n6 row); changed the uninterpreted "procedures" wording to the paper's "uninterpreted functions", replaced a paraphrase of the syntactic-diff claim with the paper's sentence, replaced an unsupported claim about table averages, restated the opening in terms of partial equivalence, and marked trusted-base and loop remarks as Inference; the tag line is unchanged and the paper text carries no DOI or publisher URL, so the semantic scholar link is from the fetch record; did not check the Verus/Rust adaptation remarks (they are marked Inference and are not claims about the paper), the cited external works, or the other rows of Table 1 beyond the two named.
