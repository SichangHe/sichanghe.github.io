# Estimating verification time
(authored by agents unless marked 🧑)
Tag: `gonzalez2014estimating`, [paper](http://arxiv.org/abs/1402.6478v1)

## scope and result

The essay proposes a statistical macro-model for predicting the time a symbolic-execution verifier will spend on a function. It is a method for finding verification hot spots, rather than a proof of program correctness. The paper says, “This essay is divided in four parts: In section (I) I explain why I think detecting hot-spots in verification is complicated ... In section (III) I propose a method to find functions that are most promising to be optimized.” (opening page, p. 1)

Inference: The useful VL lesson is to measure proof cost as an engineering signal and use the signal to prioritize proof refactoring. The model predicts cost; it does not establish a Verus theorem or show that a specification is adequate.

## what affects verification cost

The paper first describes a generic symbolic-execution pipeline: parse and transform code, instrument and compile it, fork at branches while asking a solver which branches are feasible, then run the annotated code and solver on an operating system. The numbered pipeline is in §1, p. 1. It warns that transformations, forking, and solving use tuned heuristics, so source-level intuition is insufficient.

The paper gives an explicit ranking: “Performance of symbolic execution is dominated by the following factors (in order of importance):” (§2, p. 1). It then lists path diversity (especially loops with variable iteration counts), complexity of symbolic branch conditions (variables, depth, and linear versus non-linear queries), memory accesses, and arithmetic operations. It also says that measurements must account for compiler transformations, naming algebraic simplification, removal of redundant operations, constant propagation, loop unrolling, discarded CPU-specific optimization, and aggressive inlining (§2, p. 1).

Inference: A Verus cost dashboard should record quantified proof paths or branch cases, quantified and non-linear arithmetic, memory-oriented proof lemmas, and arithmetic normalization. These are analogues of the paper's factors, not claims that Verus has the same execution pipeline.

## macro-model method

The central method is a white-box/black-box combination. “White-box analysis means that we have access to the variables that affect verification time, we can modify them with little constraints and devise experiments that illustrate the effects of these changes.” (§3, p. 2) “Black-box measurement means that we measure the verification time at the end of the previously commented chain, when all the transformation and heuristics are considered.” (§3, p. 2) The method maps code to a model relating measured verification time to observable parameters.

The paper divides the process into five stages (§3, pp. 2–3): parameter identification; experimental design and data collection; macro-model fitting; accuracy assessment; and human intervention where automated selection is inadequate. The first stage starts with candidate factors. Its concrete list is cyclomatic complexity; an array giving instructions inside each symbolic loop; an array marking each symbolic branch query as linear or non-linear; a symbolic-versus-constant flag for each parameter; sizes of arrays passed directly or through pointers; and scalar parameter values (§3.1, pp. 2–3). The paper notes that array sizes may require serialization and manual annotation, or may be omitted when a separate size parameter exists.

Inference: To apply the method to a Verus crate, collect a row per verification target containing target identity, loop and branch structure, quantified/non-linear trigger counts, symbolic input shape, and scalar ranges. Keep these measurements tied to the exact compiler, Verus version, and solver configuration, because the paper's black-box definition includes all transformations and heuristics.

For data collection, the paper says to design characterization experiments that isolate each factor, then instrument the source and run the planned experiments. It points to experimental-design techniques that maximize information with few runs (§3.2, p. 3). For fitting, least-squares linear models are easy but miss complex interactions; symbolic regression can express general dependencies but hill-climbing or genetic search can settle in local optima (§3.3, p. 3). For assessment, it requires an error estimate and a confidence interval and says, “We must take special care of making the set of experiments used to assess the model different than the one used to fit the data.” (§3.4, p. 3)

Inference: In Verus, the target output can be verification time or solver-query count, while the executable Rust remains unchanged. A regression model can rank targets before proof refactoring. It cannot replace `requires`, `ensures`, loop `invariant` declarations, `assert`, `assert forall`, or proof lemmas; those remain the mechanisms that establish functional properties.

## evidence, limits, and trusted parts

The essay reports no benchmark, fitted coefficients, sample count, denominator, confidence interval, or measured speedup. Its evidence is a proposed methodology and references to experimental-design and macromodeling literature. Therefore no numerical accuracy or optimization benefit is established by this paper.

The paper claims three practical benefits: heuristics are included; adapting to a new compiler or solver is straightforward once the method exists; fitting removes the need to verify the target during later estimates; and statistical confidence intervals are available (§4, p. 4). It lists limits: dynamic data and allocation complicate parameter identification; choosing a function template may require deep human understanding; and models apply only to calls whose parameter distributions resemble the training distribution (§4, p. 4). It explicitly warns that a model trained for ordinary coverage may be poor at rare corner cases (§4, p. 4).

Inference: For agent-written verified Rust, the threat is indirect and operational: an inaccurate cost model can make an agent avoid a difficult but necessary proof or spend effort on a cheap target. It does not create a soundness hole if the final Verus proof is checked. Trusted components remain the Verus verifier, solver, compiler, proof erasure, specifications, and any external contracts; this paper measures none of them.

## techniques for the catalog

- verification-hotspot macro-model — measure observable code and input factors, fit a cost model, and rank functions for optimization
- white-box/black-box cost analysis — vary identifiable factors while measuring end-to-end verifier time after transformations and solver heuristics
- experimental-design data collection — design characterization runs that isolate factors while minimizing solver executions
- held-out accuracy assessment — fit on one experiment set and estimate error and confidence intervals on a separate set
Checked 2026-10-15 against paper gonzalez2014estimating: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
