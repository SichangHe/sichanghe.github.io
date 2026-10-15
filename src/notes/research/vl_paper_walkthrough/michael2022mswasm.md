# MSWasm: Soundly Enforcing Memory-Safe Execution of Unsafe Code
(authored by agents unless marked 🧑)
Tag: `michael2022mswasm`, [paper](https://www.semanticscholar.org/paper/0ffa5c19b055a7f7b9369fe2722003727eca6d69)

## scope and claims

MSWasm extends WebAssembly with segment memory and typed, unforgeable handles. The paper's goal is an end-to-end argument that unsafe C can be compiled to a target whose execution is memory safe. It claims five contributions: a formal syntax, type system, and operational semantics; a color-based memory-safety monitor; a formal C-to-MSWasm compiler; AOT, JIT, and LLVM implementations; and a PolyBenchC evaluation (§1, pp. 1–3). The authors state, “Our semantics give precise meaning to the previous informal design” (§1, p. 2), and “we can prove that all well-typed MSWasm programs are robustly memory safe” (§1, p. 2).

Inference: for VeruLaw, the reusable lesson is to make pointer provenance and allocation state explicit in a small semantic model, then prove a compiler or adapter preserves that model. MSWasm is a language and compiler design, not a Verus library, so the Verus forms below are inferences.

## technique: capability-like handles and checked segments

MSWasm separates ordinary linear memory from segment memory. A segment is a bounded, linearly addressable allocation; it cannot be accessed by ordinary load/store. A handle is the only access capability and contains `base`, `offset`, `bound`, `isCorrupted`, and a unique allocation identifier `id` (§2.4, pp. 5–6). `segalloc` creates a segment and handle, `handle.add` changes only the offset, `segload` and `segstore` check corruption, bounds, and liveness, and `segfree` makes the segment reusable (§2.4, pp. 6–7). Handle forgery is permitted as a value but causes a trap on access; delaying the check permits benign C pointer arithmetic (§2.4, p. 6).

To compile the paper's buffer-overflow example, allocate 1024 bytes with `segalloc`, keep the handle in `$trimmed`, add `$j` to its offset, and use `i32.segment_store`. If the offset passes the bound, the store traps (§2.4, p. 7). For a struct, a handle to the whole allocation could reach a neighboring field. The compiler therefore emits `slice`, which narrows base and bound to the selected field; an overflow from `name` then traps before it reaches `id` (§2.4, pp. 7–8).

Inference: Verus can represent a handle as a spec-level record with base, offset, bound, allocation id, and validity, and represent segment bytes as a ghost map. `requires` on a verified access should state validity, allocation identity, and bounds; `ensures` should preserve the map except for the accessed range. A `proof fn` can establish that slicing a field produces a narrower range. Executable Rust still needs a concrete representation and runtime checks unless all accesses are statically proved.

## technique: color-and-shade memory-safety monitor

The monitor abstracts implementation details with provenance colors, field shades, and allocated/free tags (§4.1, p. 20). Every allocation receives a fresh color; each location gets that color, and each struct field can receive a distinct shade. A read or write is safe only when pointer color and shade equal the shadow-memory entry and the entry is allocated. The paper explains: “If the colors or the shades do not match, or the memory location is free, the state machine simply gets stuck, thus detecting a memory violation.” (§4.2, p. 21).

Apply the monitor as follows. Start with empty shadow memory and event history. On `alloc(n,a_c,φ)`, require `n` free contiguous locations, choose fresh color `c`, and tag each location allocated with shade `φ(i)`. On `read(a_(c,s))` or `write(a_(c,s))`, require the exact allocated `(c,s)` tag. On `sfree(a_c)`, require a matching prior allocation that has not already been freed, then mark all locations of color `c` free (§4.2, pp. 21–22). A trace is memory safe exactly when this machine never gets stuck (Definition 1, p. 22).

The monitor is language independent. MSWasm events are related to monitor events through a partial bijection from segment address and identifier to colored shadow address (§4.3, pp. 22–24). A typed MSWasm read or write expands to one event per byte; allocation carries a shading function; a trap maps to the empty trace. The proof maintains the bijection as allocations occur and uses handle integrity and bounds checks to show every generated access satisfies the monitor premises (§4.3, pp. 23–25).

Inference: in Verus, a ghost `Map` from addresses to `(color, shade, allocated)` plus a sequence of events can encode this monitor. `spec fn` predicates express a safe event; a transition `proof fn` can maintain the shadow-map invariant. `invariant` belongs on a loop, while `ensures` belongs on the proof of one transition. Inference: colors can model ownership provenance and shades can model disjoint field ranges, but Verus's type and borrow system does not automatically recover the paper's dynamic allocation identifiers.

## technique: typed semantics and robust-safety theorem

The MSWasm syntax extends Wasm value types with `handle` and adds segment instructions (Figure 1, §3.1, p. 12). Typing uses stack judgments; the key restriction is that raw linear-memory load cannot produce a handle (§3.1, p. 13). Small-step labeled semantics records allocations, accesses, and frees (§3.2, p. 13). The type system therefore prevents forging a handle by reading bytes, while the operational rules check the handle's metadata at use.

The authors define robust memory safety for a module as memory safety after linking with every valid attacker module (Definition 4, §4.3, p. 25). Theorem 1 states: “If ⊢ M : wt then ⊢ RMS (M)” (§4.3, p. 25). The proof sketch maintains the invariant that every valid handle, including one stored in segment memory, corresponds to an allocated segment; invalid handles trap, so they cannot produce an unsafe event (§4.3, p. 25).

Inference: a Verus analogue would quantify over an abstract adversarial callback in a state-machine model and prove the invariant across callback boundaries. This requires explicit contracts for imported functions; Verus cannot quantify over arbitrary native code without modeling its effects. The paper's robust theorem is therefore stronger than a local Rust function proof only when the linking model and attacker assumptions are encoded.

## technique: type-directed C-to-MSWasm compilation

The source calculus is a small C subset with integers, pointers, arrays, structs, pointer arithmetic, dereference, allocation, and free (Figure 7, §5.1, pp. 27–28). Its semantics intentionally permits unsafe writes and records memory events. The compiler is inductive on typing derivations (Figure 9, §5.2, pp. 30–31): source integers map to `i32`; pointers map to `handle`; array pointer arithmetic emits `handle.add` scaled by element size; `malloc` computes byte size then emits `segalloc`; dereference emits a typed `segload`; struct-field address emits constants for field offsets followed by `slice` (§5.2, pp. 30–31).

The proof introduces a cross-language value relation: a source pointer's base, offset, length, and allocation id correspond to a valid MSWasm handle under a partial address/id bijection (Figure 10, §5.3, p. 32). Event relations require related types and valid handles. Theorem 2 states that a well-typed, memory-safe C trace compiles to a related, memory-safe MSWasm trace (§5.3, p. 33). Theorem 3 states that when a source trace's next event would violate the monitor, the compiled execution emits `trap` at that point (§5.3, p. 33). Corollary 1 states that every compiled execution trace is memory safe (§5.3, p. 33).

The proof is induction over source reductions. A source step and its allocator change are simulated by a finite sequence of related target steps; a state relation lifts pointer/value correspondence to whole program states. For safety preservation, the proof composes the source-to-target and source-to-monitor bijections. For trapping, it case-analyzes the first monitor rule that gets stuck and matches it to a failed MSWasm check (§5.3, pp. 33–35).

Inference: Verus can encode the source/target relation as a ghost `spec fn` over source and compiled states, with `ensures` for each translation rule. A recursive proof over an event trace can use `decreases` and lemmas about map/bijection extension. The compiler itself can remain executable Rust, while the translation relation and safety theorem are proof-only. Inference: the generated Rust must expose enough metadata for these lemmas; opaque unsafe pointer casts would break the relation.

## technique: interchangeable enforcement implementations

The AOT compiler extends rWasm in its parser, stack analysis, and code generator. Its “segments as vectors” implementation stores each segment as bytes plus tags, implements handles as a tagged enum, clears freed segments, and prevents segment-index reuse for temporal safety (§6.1, pp. 38–39). A faster “segments with Baggy Bounds” implementation uses one byte vector, a buddy allocator, 64-bit handles containing offset and size logarithm, and checks only handle-modifying operations; it gives up temporal safety and handle integrity (§6.1, p. 39). The extension adds about 1,900 lines, roughly 500 per technique (§6.1, p. 39). The JIT implementation uses Java `SegmentMemory` and `Segment` objects, enforcing spatial and temporal safety but not handle integrity (§6.2, pp. 40–41). The C frontend extends CHERI LLVM, puts globals and address-taken stack objects in segment memory, and recompiles WASI libc (§6.3, pp. 41–42).

Inference: this separation suggests keeping a Verus-verified abstract contract independent of the concrete allocator or hardware checks. Each backend then proves refinement to the same handle and monitor model. A backend that omits temporal safety or handle integrity cannot claim the full abstract contract; its specification must state the weaker guarantee.

## evidence, measurements, and boundaries

The evaluation compiles PolyBenchC from C with Clang and modified CHERI Clang at `-O3`, runs one core on an Intel Xeon 8160 under Linux, and normalizes execution to native code (§7, pp. 42–43). The AOT spatial-only configuration has 21.4% geometric-mean overhead over normal Wasm; spatial plus temporal has 52.2%; adding handle integrity has 197.5%. The JIT spatial-plus-temporal configuration has 42.3% overhead. The paper also reports normal-Wasm overheads of 71.8% (AOT) and 3230.0% (JIT) over native (§7, p. 43). These are geometric means over the PolyBenchC benchmark suite; the text gives no benchmark count in the cited passage. The conclusion rounds the range to 22%–198% (§9, p. 44), so rounding explains the apparent difference from 21.4% and 197.5%.

What is proved: well-typed MSWasm is robustly memory safe; the formal compiler preserves safe traces and traps at the first unsafe event; the implementations execute the proposed instruction set. What stays trusted or outside scope: the omitted auxiliary proofs and full compiler/runtime code, the C subset and its memory model, type correctness of imported code, hardware and JVM `Unsafe`, the compiler implementation's conformance to the formal model, and the intended source specification. The single-segment C stack implementation can let one stack buffer corrupt another (§6.3, p. 42), a stated engineering tradeoff.

Inference: the threat to agent-written verified Rust is high for unsafe interoperation and allocator code, because this paper shows a mature way to state and enforce provenance, temporal, spatial, and intra-object properties. It is less direct for safe Rust APIs whose borrow contracts already encode ownership. VL should reuse the monitor and cross-language-refinement ideas where it generates unsafe code, and avoid redoing the already-established handle semantics and compiler proof pattern.

## techniques for the catalog

- capability-like segment handles — represent allocations with bounded, typed handles and trap on invalid access
- slicing for intra-object safety — narrow a handle to a struct field before dereference
- color-and-shade monitor — check provenance, field shade, and allocation status over event traces
- robust memory-safety semantics — prove typed modules safe under arbitrary modeled attackers
- type-directed C-to-target compilation — compile pointer operations, allocation sizes, and field offsets into checked handle instructions
- cross-language trace refinement — relate source pointers/events to target handles/events with a growing bijection
- first-violation trapping — prove an unsafe source event becomes a target trap
- pluggable enforcement backends — preserve one abstract safety contract while swapping software or hardware checks

Checked 2026-10-15 against the paper by a Codex agent for mswasm_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
