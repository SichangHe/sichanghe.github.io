# Linear Haskell: practical linearity in a higher-order polymorphic language
(authored by agents unless marked 🧑)
Tag: `bernardy2017linearhaskell`, [paper](https://doi.org/10.1145/3158093)

## what is proved and why it matters

Linear Haskell adds usage guarantees to an existing lazy, polymorphic language while preserving existing code. The paper's abstract says: “Rather than bifurcate types into linear and non-linear counterparts, we instead attach linearity to function arrows.” (Abstract, p. 1) A linear arrow `a ⊸ b` means that if the result is consumed exactly once, the argument is consumed exactly once. The design targets two applications: safe in-place mutation and resource protocols such as files and sockets (Sections 1–2, pp. 1–3).

The core calculus `λ→q` has multiplicity-annotated arrows, datatype constructor fields, cases, lets, and multiplicity polymorphism. Theorems 3.5 and 3.6 establish type preservation and progress; a second mutable semantics is bisimilar to the pure semantics, yielding preservation, progress, and observational equivalence (Section 3.4, pp. 12–14). The implementation modifies GHC's type checker, not its runtime or intermediate language (Section 4, p. 15).

## technique: arrow linearity and multiplicity contexts

Use linearity when an API must consume a resource exactly once. The paper defines consumption structurally: “In general, to consume a value of an algebraic datatype exactly once, pattern-match on it, and consume all its linear components exactly once (Sec. 2.5)” (Definition 2.1, p. 3).

1. Mark a function argument with `⊸` (`→1`); unrestricted arrows use `→ω` (Sections 2.1 and 3.1, pp. 2, 10)
2. Type an application by scaling the argument's free-variable context by the arrow multiplicity and adding it to the function context: `Γ + π∆ ⊢ t u : B` (rule `app`, Section 3.2, p. 11)
3. Use multiplicity expressions `1`, `ω`, variables, sums, and products; contexts form a module under addition and scaling (Definitions 3.1–3.4 and Lemma 3.3, p. 11)
4. For a case, annotate how often the scrutinee is consumed; using a linear field nonlinearly forces `caseω`, preserving soundness (Section 3.3, p. 12)

Multiplicity polymorphism lets one library function serve linear and unrestricted clients. The paper gives `map :: ∀p. (a →p b) → [a] →p [b]`, `foldl :: ∀p q. (a →p b →q a) → a →p [b] →q a`, and composition with product multiplicity `p·q` (Section 2.6, p. 7). The paper says that “in a context where client code does not use linearity, all inputs will have unlimited multiplicity, ω” (Section 2.6, p. 8), so linearity annotations can be hidden from such clients. Backwards compatibility is also supported by the paper's finding that the base GHC libraries and nofib compile with linear constructors (Section 5, p. 16), which the paper calls “preliminary evidence”.

Inference: Verus's ownership and borrow checker already prevent many duplicate mutable references, and the closest analogue to the paper's linear arrow is a Rust API whose methods consume `self` and return the next state. A Verus `spec fn`/`proof fn` can state and prove state transitions. I do not know of a Verus feature matching multiplicity-polymorphic arrows. This is my inference, not from the paper; the Verus claims were not checked in this recheck.

## technique: linear mutable arrays with pure interfaces

Replace `ST` plus `unsafeFreeze` with an API that threads a unique array value. The paper gives:

```haskell
newMArray :: Int → (MArray a ⊸ Unrestricted b) ⊸ b
write     :: MArray a ⊸ (Int,a) → MArray a
read      :: MArray a ⊸ Int → (MArray a, Unrestricted a)
freeze    :: MArray a ⊸ Unrestricted (Array a)
```

Apply it step by step: allocate with `newMArray`; fold `write` over updates so each call consumes and returns the sole `MArray`; call `freeze` exactly once to obtain an unrestricted immutable array. The example is `array size pairs = newMArray size (λma → freeze (foldl write ma pairs))` (Section 2.2, p. 4). Safety follows from three conditions: allocation introduces one linear value, consumers return at most one pointer, and the continuation must wrap its result in `Unrestricted` so no mutable pointer escapes.

The trusted API primitives still must be correctly implemented; the paper says they “are still part of the trusted code base, in particular, they must not lie about linearity.” (Section 2.2, p. 5) Inference: Verus can express the array invariant with a ghost sequence and `requires`/`ensures` on consuming methods, but alias control remains primarily Rust's ownership discipline.

## technique: protocol-safe files, sockets, and typestate

Thread a linear resource through I/O and encode its state in types. The file API uses `openFile :: FilePath → IOL 1 File`, `readLine :: File ⊸ IOL 1 (File,Unrestricted ByteString)`, and `closeFile :: File ⊸ IOL ω ()`; `firstLine` opens, reads, closes, and returns the unrestricted bytes (Section 2.3, p. 5). `IOL p a` generalizes `IO` with result multiplicity; `bindIOL :: IOL p a ⊸ (a →p IOL q b) ⊸ IOL q b` controls the continuation's use of a linear result (Section 2.7, p. 8).

For sockets, define a phantom state `State = Unbound | Bound | Listening | Connected` and signatures such as `bind :: Socket Unbound ⊸ SocketAddress → IOL 1 (Socket Bound)`, `listen :: Socket Bound ⊸ IOL 1 (Socket Listening)`, `accept :: Socket Listening ⊸ IOL 1 (Socket Listening,Socket Connected)`, and `send/receive` only on `Socket Connected` (Section 5.2, pp. 20–21). The paper's wrapper is specialised to TCP; it says “the wrappers are implemented with a generic type-state evolving according to the rules of a deterministic automaton. Each protocol can define it’s own automaton, which is represented as a set of instances of a type class.” (Section 5.2, p. 21) The paper describes this design, not a generator.

Inference: Verus can encode the same state machine with Rust enums or phantom types and `requires`/`ensures` on consuming methods; a `proof fn` can show that only legal transitions preserve an invariant. External I/O effects and the OS remain trusted.

## technique: indexed serialized buffers and linear construction

Use a phantom type-level list to track the remaining fields in a serialized value. For reading, `Packed (a':r) ⊸ (a,Packed r)` consumes one field. For writing, `Needs (a':r) t ⊸ Needs r t` removes one obligation; `finish :: Needs '[] t ⊸ Unrestricted (Packed '[t])` is callable only when no fields remain; `done :: Packed '[] ⊸ ()` consumes exhausted input (Section 5.1.1, pp. 17–18). Datatype-specific `startLeaf` and `startBranch` write tags and create the field obligations. The complete construction `newBuffer (finish ◦ writeLeaf 4 ◦ writeLeaf 3 ◦ startBranch)` creates a packed tree without heap values.

The paper says an `ST`-style `Needs` pointer allows interleaved writes of a `Leaf` and a `Branch` to the same pointer, so “We can receive a corrupted 8-byte integer, clobbered by a tag from an interleaved “alternate future”.” (Section 5.1.2, p. 18) Inference: the linear `Needs` pointer rules out that aliasing because each `write` consumes it. `mapLeaves` traverses packed input with `caseTree`, reads leaves, writes transformed leaves, calls `done` on input, and `finish` on output (Section 5.1.1, p. 18). The paper's ST-based variant (Section 5.1.2, p. 18) allows the corruption described above and also needs `unsafeFreeze`.

Inference: in Verus, encode the remaining-field state as a Rust enum or typestate parameter and prove each write removes exactly one obligation. The byte layout, parser, and `unsafe` operations need verified contracts or trusted external bodies; the paper's metatheory (Section 3.4 and Appendix A) covers the core calculus with array primitives, not the `Packed`/`Needs` API or the byte layout.

## techniques for the catalog

- linear arrows and multiplicity contexts — scale and add usage contexts so one arrow tracks exact resource consumption
- consuming mutable-array API — allocate, thread, and freeze a unique array without `unsafeFreeze`
- linear I/O and typestate — encode file/socket protocols as consuming transitions and phantom states
- indexed serialized buffers — make each read/write consume a type-level field obligation before finishing
- multiplicity-polymorphic libraries — write one `map`, `foldl`, or composition operator usable by linear and unrestricted clients
