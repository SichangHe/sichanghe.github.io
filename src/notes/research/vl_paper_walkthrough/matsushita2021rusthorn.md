# RustHorn: CHC-based Verification for Rust Programs
(authored by agents unless marked 🧑)
Tag: `matsushita2021rusthorn`, [paper](https://doi.org/10.1145/3462205)

RustHorn reduces pointer-manipulating Rust programs to constrained Horn clauses (CHCs), logical implications whose unknown predicates describe program behavior. Matsushita, Tsukada and Kobayashi say the reduction “clears away pointers and memory states by leveraging Rust’s guarantees on permission” (abstract, p.1). The main technique represents a mutable reference by its current target value and its target value when the borrow ends. This supports functional-correctness checks while avoiding an explicit address-to-value memory array.

The paper proves soundness and completeness for its typed core language, Calculus of Ownership and Reference (COR), and evaluates a more capable MIR-based prototype on small benchmarks. The authors explicitly distinguish these: “This algorithm performs a more advanced reduction than our formalized reduction presented in §3.” (§5.1, p.43). A direct proof of the implemented reduction remains open. All page references below use the article’s page numbers, 1–53.

## techniques

### represent mutable references by current and final values

Rust’s permissions allow multiple readers or one writer for an object. A mutable borrow temporarily transfers update permission and freezes the lender. In this paper a lifetime denotes the time when a borrow ends, rather than its whole active interval (§1.2, pp.4–9; §2.2, pp.13–17).

How to apply the reduction:

1. Obtain the typed context at each program point, including active/frozen variables and lifetime constraints
2. Represent an owning pointer or immutable reference by a box containing its target value; represent a mutable reference by `⟨current, final⟩`
3. On a mutable borrow, introduce a fresh logical variable for the final value, use it as the frozen lender’s modeled value, and give the borrower the current/final pair
4. On mutation, update only the current component
5. On release or conversion to an immutable reference, equate the final component with the current component; the frozen lender already refers to that final value

For `take_max`, which returns a mutable reference to the larger of two integers, a later increment changes whichever input was selected. The final-value components connect the result back to both original inputs without recording which address was returned. The incremented larger input cannot equal the smaller input, under the paper’s unbounded-integer model (§1.2, pp.6–9).

The final value is future information, related to a prophecy variable: a logical placeholder later constrained to the actual value. It is not a runtime prediction. COR’s formal rules use pattern matching to impose equalities (§3.2, pp.23–27).

Inference: for Verus, this suggests contracts relating a borrowed value before mutation to the state returned to its owner. The paper supplies no Verus implementation, and arbitrary ghost variables do not by themselves justify access to future state.

### preserve nested-borrow and structural relationships

A reborrow needs a new final-value variable while retaining the lender reference’s original final value. If the lender was `⟨a, outer_final⟩`, reborrow it as `⟨a, inner_final⟩` and model the frozen lender as `⟨inner_final, outer_final⟩`. Releasing the inner borrower resolves `inner_final`; it does not resolve `outer_final` (§3.2, pp.24–25).

Splitting a mutable reference to a pair splits both current and final pairs. Matching a mutable reference to a variant similarly decomposes its payload and fixes the variant tag. Dereferencing nested pointers has six cases based on the outer and inner pointer kinds; mutable-to-mutable dereference preserves the relationship to the inner reference’s final target value (§3.2, pp.24–25).

The linked-list example `inc_some` selects any element, increments it, and checks that the total sum increases by one. A useful relation equates the selected element’s change with the list’s sum change. Once found, the proposed CHC solution can be checked by unfolding `sum` at most once per clause, without an induction about `sum`. HoIce discovers such a recursive summary heuristically; this is not a general guarantee of successful solving (§3.4, pp.30–32).

Inference: Verus proofs for updates through nested borrows can use corresponding structural invariants and explicit recursive summaries. The mathematical current/final decomposition is useful guidance; translating it into accepted Rust/Verus contracts requires separate work.

### generate type-directed continuation predicates

For each labeled statement `(f,L)`, create a predicate whose inputs are the local values at `L` and whose final argument is the result of function `f`. It describes the remainder of the function. Generate one CHC for an instruction or return and two for a variant match. Lifetime information selects the encoding rules but is removed from the CHC sorts (§3.1–3.2, pp.20–27).

Allocation wraps a target value in a box. Swapping references exchanges current target components while retaining their final components. A function call conjoins the callee’s entry predicate and the caller’s continuation predicate. A return identifies the result argument with the returned value. This is a backward reduction: clause implications point opposite to execution, even though the clauses can be read as symbolic rewriting steps (§1, p.2, footnote 3; §3.2, pp.23–26).

COR makes releases and lifetimes explicit and uses primitive swaps; assignment is expressed by copy, swap and release operations. Its types include recursive sums/products, owning pointers and references. It supports reborrowing and recursive lists/trees. It lacks unsafe blocks, type traits, closures, type polymorphism and direct place access to substructures; borrowing and subdividing the whole object covers some, but not all, substructure-borrow patterns (§2.1–2.2, pp.10–17).

Inference: a generated Verus proof could express transfer relationships as lemmas and loop invariants. RustHorn’s external CHC syntax and completeness theorem do not directly apply to those generated proofs.

### connect the logical model to concrete execution

Theorem 1 identifies the least CHC solution with the operational input/output relation (§3.3, p.29). The operational relation is defined for “simple” functions whose input/output types contain no mutable references; internal calls and intermediate configurations can contain them (§3.3, pp.27–28).

The proof introduces SLDC resolution, a variant of logical resolution with calculation steps. It extracts structured patterns from the concrete heap and uses fresh logical variables for borrowed parts. A safety condition pairs exactly one giver and one taker of each future-value variable, agreeing on address, type and lifetime ordering. Memory footprints separately enforce compatible access permissions. Theorem 4 establishes a bisimulation: each concrete execution step corresponds to a resolution step and conversely. Progress and preservation connect these conditions to type safety (§4, pp.34–42).

This establishes the meaning of the reduction for the formal model. It does not guarantee that an incomplete CHC solver will find a solution, prove termination of a Rust program, or directly verify the production Rust compiler.

### use MIR blocks for the implemented reduction

The approximately 2,500-line Rust prototype reads rustc MIR and generates one predicate per basic block, rather than per statement. It symbolically executes each block, including direct access to nested places, then emits clauses for its terminator. Before a jump or return it cleans up unused locals and constrains final values for mutable references inside them. It relies on rustc’s borrow checking and ignores explicit lifetime information. The implementation depends on an unstable nightly compiler interface (§5.1, pp.42–43).

The proof supports the central idea, but the authors leave a direct correctness proof of these additional implementation features as a challenge. Inference: the compiler frontend, MIR translation and solver are therefore part of the trusted implementation unless separately verified.

### generalize through nondeterministic guesses and assumptions

The same reduction can produce a stateless functional program. Guess a final target value nondeterministically at borrow creation; at release, retain only executions where that guess equals the actual final value. The paper illustrates this in OCaml and reports MoCHi verification of the translated `inc_max` and `linger_dec` examples (§3.5, p.32).

The authors discuss extensions to other verification methods and library models. Interior mutability such as `RefCell` can require a global memory array and reference counters, reintroducing expensive memory reasoning. Verifying unsafe library implementations is separate work. Memory leaks involving mutable references can prevent determination of final values and lose completeness (§3.5, p.33). These are limits or proposed extensions, not features proved by the COR theorem.

## evaluation and limits

Table 1 reports solver times and failures on selected small programs, including arithmetic loops, nested mutable references, lists and trees. The experiments used a 2.6 GHz Intel Core i7 MacBook Pro with 16 GB RAM. Reduction took at most approximately 0.3 seconds per program; the table reports subsequent CHC solving with Spacer and HoIce, with a 180-second limit (§5.2–5.3, pp.43–48).

RustHorn paired with either solver collectively handled all programs handled by unmodified SeaHorn. HoIce verified safe `lists/inc-some` in 0.3 seconds and safe `trees/inc-some` in 0.4 seconds; it timed out on safe `lists/inc-some2` and safe `trees/inc-all`, and produced a tool error for safe `trees/inc-some2`. Spacer produced tool errors on the recursive list/tree cases (Table 1, p.44). Nested references also increase modeled value size: double and triple mutable references to an integer contain four and eight integer components respectively, sometimes making RustHorn slower than manually modified SeaHorn (§5.3, p.48).

The benchmark selection required supported features, compliance with Rust permissions, and size small enough for manual C-to-Rust translation. Arrays, function pointers and larger tests were omitted. The authors warn: “Although the benchmark set used for the experiments is small and more or less contrived, we believe that the experimental results already indicate effectiveness of our verification method.” (§5.3, p.48). These results do not measure coverage of arbitrary Rust programs.

Inference: for VL, the reusable idea is to exploit ownership to remove explicit alias state before solving functional properties. Applying it still requires correct contracts, justified final-value relationships, and evidence for each unsupported library or language feature.

## techniques for the catalog

- current/final pair encoding — connect mutable-reference updates to the state restored to the lender
- nested-borrow encoding — retain outer final values while resolving inner borrows
- structural subdivision — split both current and final values across recursive data structures
- continuation CHCs — generate typed predicates and clauses for program continuations
- execution/resolution bisimulation — connect concrete heaps to logical future-value variables
- MIR block translation — symbolically execute blocks and constrain references at cleanup
- nondeterministic functional translation — guess future values and filter inconsistent executions with assumptions

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We build a mechanism for extracting structured values from the heap memory, which is a finite map from addresses to integers."): read all 3,088 lines of the 53-page paper text including references and the whole study; checked quotes, theorem scope, references, encoding rules, prototype distinction and experimental results; corrected false absence of benchmarks, recursive-type support, page/section errors and theorem attribution, and expanded nested borrows, MIR translation, functional translation and limitations; did not execute RustHorn or solvers, inspect source, reproduce experiments, mechanically validate the proof, or visually inspect the PDF.
