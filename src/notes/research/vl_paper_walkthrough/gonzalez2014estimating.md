# Estimating verification time
(authored by agents unless marked 🧑)
Tag: `gonzalez2014estimating`, [paper](http://arxiv.org/abs/1402.6478v1)

## scope and result

The essay (a four-page arXiv essay by one author) proposes a statistical macro-model for predicting the time a symbolic-execution verifier will spend on a function; the conclusion scopes it to "functions in the C standard library" (§4, p. 3). It is a method for finding verification hot spots, rather than a proof of program correctness. The paper says, “This essay is divided in four parts: In section (I) I explain why I think detecting hot-spots in verification is complicated ... In section (III) I propose a method to find functions that are most promising to be optimized.” (opening page, p. 1)

## what affects verification cost

The paper first describes a generic symbolic-execution pipeline: parse and transform code, instrument and compile it, fork at branches while asking a solver which branches are feasible, then run the annotated code and solver on an operating system. The numbered pipeline is in §1, p. 1. It says that the transformations, the forking scheme and the constraint solver "are guided by heuristics that have been tuned and optimized during years, so it is impossible in practice to obtain a formal method to derive execution time directly from the high-level description of the function under test" (§1, p. 1).

The paper gives an explicit ranking: “Performance of symbolic execution is dominated by the following factors (in order of importance):” (§2, p. 1). It then lists path diversity (especially loops with variable iteration counts), complexity of symbolic branch conditions (variables, depth, and linear versus non-linear queries), memory accesses, and arithmetic operations. It also says that one must "take account of the compiler transformations, and measure the above factors over optimized code" (§2, p. 1), listing as examples algebraic simplifications, removal of redundant operations and constant propagation, loop unrolling, discarding CPU-specific optimizations, and aggressive inlining, and cites [1] (-OVERIFY).

Inference: A Verus cost dashboard should record quantified proof paths or branch cases, quantified and non-linear arithmetic, memory-oriented proof lemmas, and arithmetic normalization. These are analogues of the paper's factors, not claims that Verus has the same execution pipeline.

## macro-model method

The central method is a white-box/black-box combination. “White-box analysis means that we have access to the variables that affect verification time, we can modify them with little constraints and devise experiments that illustrate the effects of these changes.” (§3, p. 2) “Black-box measurement means that we measure the verification time at the end of the previously commented chain, when all the transformation and heuristics are considered.” (§3, p. 2) The method maps code to a model relating measured verification time to observable parameters.

The paper says it divides the methodology into "5 stages" to enable human intervention (§3, p. 2), but it presents four numbered subsections (§3.1 to §3.4, pp. 2–3): parameter identification; experimental design and data collection; macro-model fitting (called "the forth step"); and accuracy assessment ("The last step"). The paper text names no third step and no separate human-intervention stage; it only says human insight can help select parameters but should be reduced as much as possible (§3.1, p. 2). The first stage starts with candidate factors. Its concrete list is cyclomatic complexity; an array giving instructions inside each symbolic loop; an array marking each symbolic branch query as linear or non-linear; a symbolic-versus-constant flag for each parameter; sizes of arrays passed directly or through pointers; and scalar parameter values (§3.1, pp. 2–3). The paper notes that array sizes are hard to obtain at run time, that serialization can help but "requires manual annotation of the code", and that sizes may be omitted "under the empirical observation that most functions of the standard library use a separate parameter to identify this size" (§3.1, p. 3). It says two of the candidates (the item numbers are garbled in the text extraction) can be obtained statically from the code and the others need only light instrumentation, and that a solver must still be called to measure verification time, with experimental design reducing the number of measurements (§3.1, p. 3).

Inference: To apply the method to a Verus crate, collect a row per verification target containing target identity, loop and branch structure, quantified/non-linear trigger counts, symbolic input shape, and scalar ranges. Keep these measurements tied to the exact compiler, Verus version, and solver configuration, because the paper's black-box definition includes all transformations and heuristics.

For data collection, the paper says to design characterization experiments that isolate each factor, then instrument the source and run the planned experiments. It points to references [3] and [4] for obtaining "the maximum amount of information about performance running the minimum number of experiments", and to [2] for serialization-based data collection (§3.2, p. 3). For fitting, least-squares linear models are easy but miss complex interactions; symbolic regression can express general dependencies but hill-climbing or genetic search can settle in local optima (§3.3, p. 3). For assessment, it says the model's error provides a confidence interval for later predictions, which is statistical and "does not consider corner-cases", and says, “We must take special care of making the set of experiments used to assess the model different than the one used to fit the data.” (§3.4, p. 3)

Inference: In Verus, the target output can be verification time or solver-query count, while the executable Rust remains unchanged. A regression model can rank targets before proof refactoring. It cannot replace `requires`, `ensures`, loop `invariant` declarations, `assert`, `assert forall`, or proof lemmas; those remain the mechanisms that establish functional properties.

## evidence, limits, and trusted parts

The essay reports no benchmark, fitted coefficients, sample count, denominator, confidence interval, or measured speedup. Its evidence is a proposed methodology and references to experimental-design and macromodeling literature. Therefore no numerical accuracy or optimization benefit is established by this paper.

The paper claims four practical benefits: it considers many of the heuristics involved in program transformation and verification; adapting to new compilers and solvers is "easy and straightforward" once the method is developed; once models are fitted the code under test need not be verified, so estimation is fast; and statistical confidence intervals can be obtained (§4, p. 3). It lists limits: dynamic data and allocation complicate parameter identification; choosing a function template may require deep human understanding; and the model applies only when the function is called with parameters that follow the same statistical distributions as the training ones (§4, p. 4). It warns that when one is interested in corner-cases that are seldom executed, "the model will have poor accuracy for these test-cases" (§4, p. 4).

Inference: For agent-written verified Rust, the threat is indirect and operational: an inaccurate cost model can make an agent avoid a difficult but necessary proof or spend effort on a cheap target. It does not create a soundness hole if the final Verus proof is checked. Trusted components remain the Verus verifier, solver, compiler, proof erasure, specifications, and any external contracts; this paper measures none of them.

## techniques for the catalog

- verification-hotspot macro-model — measure observable code and input factors, fit a cost model, and rank functions for optimization
- white-box/black-box cost analysis — vary identifiable factors while measuring end-to-end verifier time after transformations and solver heuristics
- experimental-design data collection — design characterization experiments that isolate the effect of each factor while running as few experiments as possible
- held-out accuracy assessment — fit on one experiment set and estimate error and confidence intervals on a separate set
