# Semantics for 2D Rasterization
(authored by agents unless marked 🧑)

Tag: `kulkarni2026rasterization`, [paper](https://www.semanticscholar.org/paper/12bcface6eb8073943c5dac904af7a9f7ac56ee2)

## what the paper builds

Kulkarni, Whiting, and Panchekha define μSkia, a formal semantics for a substantial part of Skia's 2D command language, mechanized in Lean. The semantics has three strata: an abstract model of points, colors, images, shapes, blends, and filters; functional `Layer` operations `DrawShape` and `BlendLayer`; and an imperative μSkia language whose operational semantics models canvas and layer stacks. The abstract model uses real-valued points and colors. The paper says this choice “in practice means it assumes away up to anti-aliasing and rounding” (Section 3.1, p. 7). The Lean mechanization has 453 lines and extends the core grammar with opacity, styles, affine transforms, and clip operations (Section 3.4, p. 9).

The purpose is verified optimization of command traces emitted by Chrome. The abstract model defines image equality extensionally, so two programs are equivalent when they produce the same color at every point. Layer equivalence then permits substitution inside larger layer terms. The paper states: “This fact means that equivalences over Layer terms can be used as rewrite rules, which we leverage in Section 4 to prove Skia optimizations correct” (Section 3.2, p. 8). The authors identify four recurring inefficient patterns, prove replacements, and implement an optimizer that rewrites Skia's in-memory `SkRecord` stream.

## technique 1: layered denotational and operational semantics

what it is: define a small mathematical language that preserves the semantic distinctions needed by optimization. An `Image` maps a `Point` to a `Color`; a `Shape` is a predicate on points; `Blend` and `Filter` are color operators. `Layer` has `Empty`, `DrawShape`, and `BlendLayer` constructors. μSkia commands manipulate a pair of stacks, one for layers and one for canvas clipping state. A `Draw` intersects its shape with the current clip and applies `DrawShape`; `Clip` intersects the current mask; `SaveLayer` pushes an empty layer and `Restore` blends it into the layer below.

when to use it: use this architecture when an optimizer changes a sequence of stateful rendering commands and direct source-level reasoning is too operational. The abstract layer terms isolate color algebra from stack manipulation, while the imperative semantics explains how real traces execute.

how it is done:

1. choose abstract `Point` and `Color` types and define `Image`, `Shape`, `Blend`, and `Filter` (Section 3.1, pp. 6–7)
2. define `Layer` constructors and their pointwise denotations; prove layer equivalence and congruence (Section 3.2, pp. 7–8)
3. define μSkia commands and the transition relation over layer and canvas stacks, including structured `Save`; `SaveLayer`; `Restore` (Section 3.3, pp. 8–9)
4. instantiate the abstract types for the target reasoning domain and mechanize all three strata in Lean (Section 3.4, p. 9)
5. add only the API features needed by the rewrites, preserving the Layer interface when possible (Section 3.4, p. 9)

The proof obligations include stack-shape preservation and determinism. The paper notes that proving programs do not get stuck requires induction showing that commands modify only the top of a stack and preserve stack size (footnote 6, p. 9).

evidence: the mechanization covers the semantics used by all four rewrite proofs and supports translation validation on real Chrome traces. It is 453 lines of Lean (Section 3.4, p. 9). The paper explicitly records the trusted modeling approximation: “By formalizing Point with reals, equivalences in this abstract model are only up to anti-aliasing” (Section 3.4, p. 9).

limits and assumptions: the model omits mask filters, blurs, image filters, bitmap images, and SkSL; these are listed as uncovered API areas (Section 3.4, p. 9). Real Skia uses 32-bit floating points and integer ARGB colors, while the model uses reals, so rounding, finite precision, and hardware-dependent anti-aliasing are abstracted away.

## technique 2: verified SrcOver SaveLayer elimination

what it is: replace an opaque `SaveLayer` using `SrcOver` and identity filtering with `Save` when the enclosed commands are all SrcOver draws and contain no nested `SaveLayer`. The replacement removes allocation and a blend while retaining canvas-state isolation.

when to use it: apply to a layer whose paint has SrcOver and identity color filter, whose body contains only SrcOver drawing commands, and whose body has no nested SaveLayer. The paper says the restriction is necessary because other blend modes such as DstIn would otherwise interact with the outer layer.

how to do it:

1. recognize `SaveLayer(p{SrcOver, Id}); ℓ2; Restore()` in an `SkRecord` (Section 4.1, p. 10)
2. scan the body; invalidate the match on a non-SrcOver draw or nested SaveLayer (Section 5.1, pp. 14–15)
3. on the matching restore, change the saved command to `Save`, leaving the body and surrounding commands in place (Section 5.1, p. 15)
4. prove the replacement by induction over the sequence `ℓ2`, peeling the last draw and reducing the step to a Layer equality (Section 4.1, p. 10)
5. discharge the Layer equality with associativity of SrcOver in the real-valued color model (Section 4.1, p. 10)

The paper gives the core reduction: “This equivalence is proven by induction over ℓ2” and the Layer step is `BlendLayer(ℓ1, DrawShape(ℓ2, g, pd {SrcOver}), p) = DrawShape(BlendLayer(ℓ1, ℓ2, p), g, pd)` (Section 4.1, p. 10).

evidence: this rewrite is one of the passes used in the translation-validation traces. The implementation's finite-state matcher has `Matching` and `Ignore` states and stores the index of the candidate SaveLayer for rewriting (Section 5.1, p. 15).

limits and assumptions: opacity is also required in the Lean extension (footnote 9, p. 10). A nested SaveLayer or non-SrcOver draw invalidates the proof conditions. Inference: in Verus, represent a command sequence as an inductive Rust datatype in spec mode, define a recursive `denote` function, and prove a `lemma_src_over_savelayer` by structural induction. The executable matcher can carry a ghost or spec state describing the current match; its postcondition should state that a successful rewrite preserves `denote`.

## technique 3: verified DstIn mask to Clip rewrite

what it is: replace a general-purpose DstIn mask implemented with a SaveLayer and mask draw by a clip operation plus an opaque SrcOver draw. The rewrite moves clipping so it applies to the previously drawn image while avoiding a temporary layer.

when to use it: use when the preexisting sequence `ℓ1` has no SaveLayer, the body `ℓ2` contains only intersection-style Clip operations, and the mask color is opaque after the two paint filters (Section 4.2, pp. 11–12).

how to do it:

1. recognize the complete pattern `SaveLayer(p1{DstIn}); ℓ2; Draw(g,p2{Solid(c2),SrcOver}); Restore()` (Section 4.2, p. 11)
2. require that `ℓ1` has no SaveLayer and `ℓ2` has only intersection Clips; require opacity of `c2` after filters (Section 4.2, p. 11)
3. define helper `clipAll` over Layer terms: it maps Empty to Empty and pushes the mask intersection into every DrawShape (Section 4.2, p. 11)
4. prove by induction over `ℓ1` that commuting Clip over the sequence yields `clipAll(ℓ1,m)` (Section 4.2, p. 11)
5. prove the resulting DstIn equality by case analysis on whether a point lies in the original shape and mask; opacity makes the mask preserve the source color (Section 4.2, p. 12)

The paper's helper is explicit: “clipAll : Layer → Shape → Layer” with `clipAll(Empty(), m) = Empty()` and `clipAll(Draw(ℓ,g,p), m) = Draw(clipAll(ℓ,m), g ∩ m, p)` (Section 4.2, p. 11).

evidence: the pass participates in the 34 successful translation validations out of 42 convertible traces (Section 6.2.1, p. 17). The paper also tests all 99 benchmarks with raster image comparison, including traces outside μSkia's coverage (Section 6.2.2, p. 17).

limits and assumptions: the proof does not cover nested SaveLayers in `ℓ1`; non-intersection clip operations are excluded (footnote 10, p. 12). Inference: Verus can encode `clipAll` as a recursive `spec fn` and prove the induction with a `proof fn`; an executable Rust rewrite should return a result whose `ensures` says the denotation is unchanged. Verus's sequence types and algebraic datatypes may require explicit extensionality lemmas where Lean's simplifier handles the pointwise cases.

## technique 4: subsuming a luminance filter

what it is: replace a nested luminance-filter SaveLayer around one mask draw with a single draw whose paint color is precomputed with `Luma`. The equivalence is unconditional for the fixed one-draw pattern.

when to use it: use when the inner layer contains exactly one draw of color `c`; do not generalize to multiple draws. The paper shows that multiple colors would require the false equation `Luma(SrcOver(c1,c2)) = SrcOver(Luma(c1),Luma(c2))` (Section 4.3, p. 12).

how to do it:

1. match the outer DstIn SaveLayer and inner Luma/SrcOver SaveLayer containing one solid draw (Section 4.3, p. 12)
2. replace the inner layer by one draw using `Solid(Luma(c))`, preserving the remaining SaveLayer (Section 4.3, p. 12)
3. prove the fixed command sequence by evaluating it for an arbitrary incoming state Σ (Section 4.3, p. 13)
4. reduce the proof to `Luma(SrcOver(Transparent,c)) = SrcOver(Transparent,Luma(c))`; simplify using SrcOver with Transparent (Section 4.3, p. 13)
5. optionally apply the DstIn-to-Clip rewrite to remove the remaining layer (Section 4.3, p. 12)

evidence: the rewrite is one of the four verified transformations and appears in the SVG/Canva motivating example (Section 4.3, pp. 12–13). Inference: a Verus proof should expose the color algebra as `spec fn` lemmas and use a precondition asserting a singleton body, preventing an unsound multi-draw application.

limits and assumptions: the single-draw condition is essential; the authors explicitly state that the rewrite “does not generalize to cases where the inner SaveLayer contains multiple Draw commands” (Section 4.3, p. 13). The real-valued model still abstracts finite color effects.

## technique 5: removing opaque gradient masks

what it is: remove a DstIn mask when every color stop in its gradient is opaque. The mask cannot change the already drawn image, so the four-command sequence reduces to the original draw.

when to use it: apply only when opacity of every gradient stop is proved and the DstIn layer contains the same shape as the initial draw (Section 4.4, p. 13).

how to do it:

1. match `Draw(s,p1{SrcOver}); SaveLayer({DstIn}); Draw(s,p2{Gradient(g),SrcOver,Id}); Restore()` (Section 4.4, p. 13)
2. check that all stops of `g` are opaque (Section 4.4, p. 13)
3. replace the sequence by `Draw(s,p1)` (Section 4.4, p. 13)
4. prove `DstIn(SrcOver(Transparent,a),b) = SrcOver(Transparent,a)` under opaque `b`, by unfolding the Layer denotation (Section 4.4, p. 13)

evidence: opaque gradient masks are one of the four Chrome-generated patterns; the optimizer applies the corresponding pass to real website traces (Sections 4.4 and 5.1, pp. 13–15). Inference: in Verus, opacity should be a predicate on colors and gradients, with a lemma that interpolation preserves opacity; the rewrite contract should require that predicate rather than trusting a runtime flag.

limits and assumptions: a non-opaque stop invalidates the equation. The paper's semantics does not model every Skia gradient or filter feature.

## technique 6: translation validation of emitted traces

what it is: validate each concrete optimizer trace after execution rather than trying to prove the entire C++ optimizer correct in one theorem. The optimizer emits an skp after each pass; a parser converts each trace step to a μSkia Lean term; Lean proves adjacent terms equivalent using the rewrite theorem and general μSkia lemmas.

how to do it:

1. run the optimizer in trace mode and save the skp after each individual rewrite pass (Section 6.2.1, p. 17)
2. convert each skp to JSON with Skia's `skp_parser`, then convert JSON to μSkia Lean terms with a short Python program (Section 6.2.1, p. 17)
3. assert one equivalence lemma per adjacent trace pair (Section 6.2.1, p. 17)
4. invoke Lean `grind` with the rewrite theorem and the μSkia equivalence database; Figure 8 uses `grind (gen := 80) [GradientMask]` (Figure 8, p. 16)
5. accept the trace only if every step validates (Section 6.2.1, p. 17)

evidence: 42 of the 99 benchmark traces converted cleanly; 34 of 99 translation-validated, while 8 of the convertible traces timed out in `grind` (Section 6.2.1, p. 17). The paper reports pixel comparison over all 99 benchmarks: 19 had significant pixel differences, all manually attributed to anti-aliasing along curved edges (Section 6.2.2, p. 17). The optimizer changed 35 benchmarks; all saw speedups from 1.035× to 3.584×, and the geometric-mean speedup over all 99 was 18.7% (Section 6.3, p. 18). Optimization took under 32 μs for every skp (Section 6.4, p. 19). The denominator for 34/99 is all primary benchmarks; the denominator for 42 is only traces convertible to μSkia.

limits and assumptions: translation validation covers only traces that the parser can express and whose proof search terminates. Pixel equality is a separate empirical check and is sensitive to tolerated anti-aliasing.

## optimizer implementation and measured scope

The compiler pass makes each rewrite a single scan over `SkRecord`. A `SkOptPass` callback receives each command; a stack of `Frame` values tracks nested SaveLayer depth, saved command indices, and a finite-state `MatchState` (Section 5.1, pp. 14–15). Insertion is buffered separately and merged after the pass, avoiding movement of the original record array (Section 5.2, p. 15). Inference: this is a practical implementation technique for low-latency verified rewriting: keep mutable matching state small, make each pass linear, and certify the resulting trace rather than symbolic-executing the C++ pass.

The primary measurement uses 99 skps from 100 top websites, Clang 17 `-O3 -flto=thin`, an Apple M2, Graphite/Metal, and 100 nanobench repetitions per benchmark with geometric means (Section 6.1, p. 16; Section 6.3, p. 18). Backend tests report 18.7% geometric-mean speedup for Graphite/Metal and 13.2% for Ganesh/Apple; the second machine reports 16.0% Graphite/Vulkan and 10.5% Ganesh/Intel (Section 6.5, pp. 19–20). A frozen-pass test on the next 100 websites yielded 180 new benchmarks and up to 2.543× speedup (Section 6.5.3, p. 21). These percentages and maxima have the stated benchmark denominators and hardware settings; they are not universal Skia guarantees.

## techniques for the catalog

- layered semantic modeling — separate abstract color/image algebra, functional layer terms, and imperative command transitions
- semantic rewrite proofs — prove optimized command patterns equivalent under explicit side conditions
- finite-state rewrite matching — implement each verified pattern as a linear scan with stack-aware matcher state
- trace translation validation — convert emitted optimization traces to formal terms and prove each adjacent step equivalent
- certificate-backed opacity and filter reasoning — expose blend, filter, and opacity assumptions as proof obligations before rewriting
