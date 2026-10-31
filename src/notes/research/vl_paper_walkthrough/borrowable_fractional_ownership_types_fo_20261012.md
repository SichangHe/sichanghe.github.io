# Borrowable Fractional Ownership Types for Verification
(authored by agents unless marked 🧑)
Tag: `nakayama2023borrowable`, [paper](https://doi.org/10.1007/978-3-031-50521-8_11)

## scope and prior notes

This arXiv 2023 paper by Takashi Nakayama et al. combines ConSORT fractional permissions with RustHorn borrow lifetimes. I found no earlier paper-specific walkthrough in the notes. The paper's goal is to reduce reference-program verification to reference-free functional verification: "we can use it to automatically reduce the program verification problem for imperative programs with references to that for functional programs without references" (abstract, p. 1). The paper formalizes the source language, type system, target translation, soundness proof, and experiments. Verus mappings are inferences.

## technique 1: borrowable fractional ownership types

What it is. A reference has type `int ref^alpha,r_B`, where alpha is its lifetime, r in [0,1] is fractional ownership, and B records a loan `(beta,s)` or no loan. Full ownership (1) permits writes; nonzero ownership permits reads. Ownership can be shared among aliases at one lifetime or borrowed to a shorter lifetime. The lifetime environment is a strict partial order; if a reference lends to beta, beta < alpha. The type system therefore expresses partial lending and later recovery.

When to use it. Use this model when programs mix aliasing, fractional sharing, mutable borrows, dynamic aliases, or lifetime-scoped loans that ConSORT or Rust alone rejects. The paper's `minmax`/`rand_choose` example is rejected by both ancestors but accepted here because a dynamically chosen alias can borrow half ownership.

How to apply it.

1. Assign every reference a lifetime and ownership fraction
2. Record a loan `(beta,s)` when another lifetime borrows s
3. Enforce `r+s <= 1` and the lender/borrower lifetime order
4. Split ownership on alias creation using share or borrow addition
5. Require ownership 1 for assignment; permit dereference for nonzero ownership
6. Introduce and end lifetimes explicitly (in Rust the compiler inserts endlft automatically, Sec. 1, p. 3; the paper leaves type inference to future work)
7. At lifetime end, return the borrowed fraction to the lender

The paper defines the new shape directly: "the type of a reference is now of the form int ref α,r_B, where α is the lifetime of the reference, r is the (fractional) ownership ... and B is the borrowing information" (Sec. 1, p. 4). It warns why the lifetime order is necessary: a cyclic-borrow example makes ownership sum 2 (Remark 1, p. 13).

Verus form (inference). Rust's borrow checker already enforces exclusive mutable access and shared immutable borrows, but Verus specifications may need ghost permission fractions for shared state or interior-mutable abstractions. Encode a loan as a ghost predicate carrying a lifetime token and fraction; require full permission in mutating lemmas and split/merge tokens on borrow boundaries. Verus does not expose this paper's fractional type syntax, so this is a library-level encoding, not a direct construct.

Evidence and limits. The type preservation theorem states that ownership sums at each heap address never exceed 1 (Theorem 1, Sec. 3.3, p. 13). The approach excludes nested reference types in the formal development and leaves type inference and nested references as future work (Sec. 7, p. 20).

## technique 2: ownership transfer and lifetime typing rules

What it is. Type addition `tau1 + tau2 = tau` models alias ownership transfer. `A-Share` splits ownership among same-lifetime aliases; `A-Borrow` transfers a fraction to a shorter-lifetime borrow. `T-Let` checks alias creation by splitting the source type; `T-Alias` redistributes ownership using an explicit alias assumption; `T-Assign` requires `Own(x)=1`; `T-NewLft` and `T-EndLft` create and eliminate lifetime variables.

How to apply it.

1. For `let x = y`, choose `tau_x` and `tau_y` whose addition equals y's old type
2. For same-lifetime aliases, apply `A-Share` so fractions sum to the old ownership
3. For a borrow, apply `A-Borrow`, recording the lender's `(beta,s)` and borrower fraction
4. Type the body under the split environment and ensure the new alias does not escape
5. For `alias(x=y)`, require equal runtime addresses and redistribute type information
6. End only a minimal lifetime; remove its bindings and return lent fractions

The text explains `T-Let`: "The split expressed by the type addition τ = τx + τy ... intuitively means that some portion of y's ownership is passed to its new alias x" (Sec. 3.2, p. 9). It also states: "that only a reference with full ownership is updated." (Sec. 3.2, pp. 10–11).

Verus form (inference). Model split/merge as ghost lemma preconditions and postconditions on permission tokens. Use Rust lexical scopes for `newlft`/`endlft`; a custom token can track fractional read permission when Verus's normal borrow checker cannot express dynamic aliasing. Alias assumptions must be replaced with proven pointer equality or a carefully specified abstraction; do not use an unchecked `assume`.

Evidence and limits. The typing judgment carries both lifetime and type environments before and after an expression. The rules reject cyclic borrows because they violate the ownership invariant. Explicit alias annotations are a burden (our inference; the paper's Sec. 1 says ConSORT relies on them) and the paper's language has only integer references, not nested references.

## technique 3: prophecy-pair translation to a reference-free program

What it is. Every source reference becomes a target pair `<current, prophecy>`. The first component is the current value when ownership is nonzero; the second predicts the value at the end of a borrowed lifetime. New references become `<value,_>` with nondeterministic prophecy. Dereference reads `fst` for positive ownership and nondeterministic `_` for zero ownership. Assignment updates `fst` while preserving `snd`. Ending a lifetime inserts `assume(fst x = snd x)` to resolve prophecy values.

How to apply it.

1. Translate `mkref y` to a pair `<y,_>`
2. Translate a positive-ownership dereference to `fst ref`
3. Translate a zero-ownership dereference to nondeterministic `_`
4. Translate assignment to `<new_value, snd old_pair>`
5. On a borrow end, insert equality assumptions matching current and prophecy values
6. Translate aliases with the ownership-sensitive `T` function so current and future components move correctly
7. Verify the resulting pure functional program with Why3, MoCHi, or another backend

The paper names the two invariants: "Trustable XOR Zero (TXZ): If a reference x has non-zero ownership, then the first element of the translation of x indeed holds the current value" and "Prophecy for Zero (PFZ): The translation of a reference with zero ownership holds a prophesized value of a borrowing reference" (Sec. 4.2, p. 16). The simple RustHorn example becomes a pair program whose `assume(fst y = snd y)` makes the final assertion provable (Fig. 3, p. 4).

Verus form (inference). A ghost struct `{ current: T, prophecy: T }` can represent a reference snapshot, with lemmas connecting `current` to owned memory and resolving `prophecy` at borrow end. Verus's `ensures` can state the equality that a borrow-return lemma establishes. For actual Rust references, prefer Verus's native borrow semantics when possible; use pair translation for automation or dynamic-alias patterns that native borrowing cannot express.

Evidence and limits. The target has no heap or lifetimes and is therefore easier for functional verifiers. Nondeterminism must be constrained by equality assumptions; an incorrect translation can under- or over-approximate behavior. The translation converts all references to pairs, unlike RustHorn, which converts only mutably borrowing references (Remark 2, p. 18).

## technique 4: alias translation and prophecy chains

What it is. Alias translation redistributes current and future values according to old and new ownership. If a variable loses all ownership, it receives the future component of the borrower to satisfy PFZ; if a borrower retains ownership, the old current value is propagated to maintain TXZ. For reborrowing, the soundness proof uses a prophecy chain over all aliases sharing an address.

How to apply it.

1. Compute old and new ownership for both aliases
2. If an alias goes from positive to zero ownership, replace its current value with the borrower's prophecy
3. If a borrower gains ownership, initialize its current value from the lender's old current value
4. Preserve each prophecy component through subsequent alias operations
5. At lifetime end, equate each pair's components and recover ownership
6. For proof, maintain a chain of aliases at one address in which only the last has positive ownership and each alias's current value equals the next alias's prophecy (Appendix C, Definition 2)

The appendix defines the chain conditions, including that all references share an address. The main text explains the essential case: "all the ownership of x. In this case, x takes the future value of y to obey PFZ." (Sec. 4.2, p. 17).

Verus form (inference). Encode a prophecy chain as a ghost sequence of alias tokens with equalities between predecessor current and successor prophecy. Borrow-return lemmas consume the chain and restore the lender's permission. This is useful for custom smart-pointer or arena abstractions; it is unnecessary for ordinary lexical Rust borrows already checked by the compiler.

Evidence and limits. The simulation relation requires TXZ, PFZ, integer preservation, and arbitrary prophecy values. Sec. 4.3 states: "if the translated program does not reach Fail neither does the original program" (Sec. 4.3, p. 18). This is a one-way safety reduction; it does not show completeness or that every safe source program is typable.

## measured results and trust boundary

The authors hand-typed and translated representative programs, then ran MoCHi (Z3 4.11.2 and HorSat2 0.95) on an AMD Ryzen 7 5700G with 32 GB RAM (Sec. 5, pp. 18–19). Table 1 includes safe and unsafe variants of `simple-loop`, `just-rec`, `shuffle-in-call`, `inc-max`, `minmax`, and `linger-dec`, plus `consort-demo`, `rusthorn-demo`, `borrow-merge`, and `hhk2008`. Translated programs grew by roughly 1.79× to 4.06× in bytes; reported verification times range from under 0.1 s to 2.7 s. These are small demonstrations, not a broad benchmark denominator. Translation was performed by hand with slight optimizations, and automation is future work.

Proved: type preservation and ownership invariant; simulation soundness of the translation; absence of source `Fail` follows from target safety. Measured: backend runtime on a handful of examples. Trusted: source and target operational semantics, typing annotations, translation implementation, nondeterminism/assume encoding, and MoCHi/Z3/HorSat2. The target verifier does not validate that a programmer's ownership annotations reflect intended API behavior beyond the formal type rules.

## techniques for the catalog

- borrowable fractional ownership — combine permission fractions with ordered borrow lifetimes to type dynamic aliases
- ownership-splitting rules — use share/borrow addition, full-permission assignment, alias redistribution, and lifetime end
- prophecy-pair reduction — replace each reference with current and future values in a heap-free target
- TXZ/PFZ invariants — connect positive ownership to current values and zero ownership to prophecy values
- alias and prophecy chains — preserve values across reborrowing with a sequence of linked prophecy equalities
- simulation soundness — prove target safety implies source safety through a step-indexed relation

## study status

The PDF title was confirmed on its first page before reading. The complete paper text, formal rules, translation, soundness discussion, experiments, and appendices relevant to the techniques were read. Quotations are verbatim with section/page pointers. The study remains in staging pending the gate.
Audited 2026-10-12 against the paper: checked the abstract and Sec. 1, 3, 4, 5, 7 and Appendix C claims, Table 1 (byte ratios 1.79 to 4.06, times under 0.1 s to 2.7 s, machine and solver versions), the typing and translation rule descriptions, Theorems 1 and 2, and all quotations; changed the prophecy chain step (the paper's chain links the current value of each alias to the next alias's prophecy, not matching prophecies), the page of the Fig. 3 pointer (p. 4) and of the full-ownership quotation (pp. 10-11), the Theorem 2 attribution (the quoted sentence is Sec. 4.3 prose), an unsupported lifetime-inference step, and marked the alias-annotation burden as inference; Verus forms are labeled inference prose with no code, and I judged them consistent with the Verus notes but did not test them; left the stale process sentences in the study status section as they are.
