static analysis without LLMs: how bug finders work, where they fail, what to study
(authored by agents unless marked 🧑)

bottom line

- a bug finder is a search tool, not a proof
    - every tool in use skips parts of the language or the program on purpose
    - [Livshits et al., CACM 2015](http://yanniss.github.io/Soundiness-CACM.pdf): “we are not aware of a single realistic whole-program analysis tool” that avoids this
- tools reach millions of lines by not looking at everything
    - analyze one function at a time and keep a short summary of it
    - follow a value only from where it is set to where it is used
    - cap paths, loop rounds, and call depth
    - skip code they cannot see, e.g. the core kernel or a library
- the numbers in papers mostly measure the authors' own judgment
    - kernel maintainers took about half of what authors called real bugs
        - Crix: 151 of 278 patches accepted
        - UBITect: 52 of 118 confirmed, 35 “will not happen in reality”
    - an outside re-run of Rudra labeled 25.6% of its warnings true
    - how many real bugs a tool misses is almost never measured
- whether developers act depends more on when and where a warning shows up than on its accuracy
    - Facebook: same analysis, about 0% fixed from a nightly list, over 70% fixed when shown in code review
    - Google: FindBugs as a command line tool “was used by only 35 developers in 2014”
- what I would study, in order
    - 1: replay real Linux bug-introducing commits through the stock analyzers and count what they flag
    - 2: an outside head-to-head of Rust unsafe-code bug finders on real advisory crates, plus how fast these tools stop building
    - 3: count warnings that diff-only reporting hides
    - 4: a checker for the safe wrappers of Rust for Linux
    - the first version's idea, reusing results across edits, is now shipped by GitHub for CodeQL; what is left is C and C++ with real builds
- novelty of 1 to 4 is my belief from this reading, not a checked fact
    - the web search quota ran out before the dedicated prior-art searches
    - open checks are listed under each idea

scope and how this was read

- sources through 7 October 2026 UTC
- topic: tools that look for bugs in code without running it and without an LLM
    - proofs with Verus and friends are in the formal verification group
    - LLM plus analysis is in [static_analysis_with_llms.md](static_analysis_with_llms.md)
- who read what
    - reader agents read papers start to end and returned notes with exact quotes checked against the PDF text
    - I read Szabó's CodeQL paper and the tool documents myself
    - each entry says “read: full”, “read: partial”, or “carried over”
        - carried over: taken from the first version of this file, not re-read
- labels in the text
    - plain statements with a link are what the source reports
    - “author claim” is a number only the authors measured
    - “I think” marks my inference

basic words

- static analysis: examine code without running it
- false alarm (false positive): a reported bug that is not there
- missed bug (false negative): a real bug with no report
- sound: never misses a bug of the kind it checks, so it over-reports
- soundy: sound except for a named list of skipped language features
- path: one way execution can go through the branches of a function
- path-sensitive: keeps different paths apart instead of merging what is known at joins
- interprocedural: follows calls into other functions
- function summary: a short record of what a function needs and what it does, reused at each call
- compositional: builds the result for a program from summaries of its parts
- points-to analysis: works out which memory a pointer may refer to
- call graph: which function may call which
- taint: mark data from an untrusted source and report if it reaches a dangerous use, called a sink
- Datalog: a rule language, “if these facts hold then that fact holds”, run until nothing new appears
- IR: the compiler's internal form of the program, e.g. LLVM IR, Rust MIR

how the analyzers work: eight families

pattern checkers: match shapes in the code

- Engler, Chelf, Chou, and Hallem, [checking system rules using system-specific, programmer-written compiler extensions](https://www.usenix.org/legacy/events/osdi2000/full_papers/engler/engler.pdf), OSDI 2000
    - read: full
    - idea: the kernel programmer writes a tiny state machine per rule, e.g. “interrupts off, then on again”
        - the compiler runs it down every path of each function
        - a path that reaches a place in a state seen before is dropped: “If an SM arrives at a node in the same state as” an earlier one, “the system prunes it”
    - size: 8 checkers, 669 lines in total
    - author-judged result: 511 errors and 292 false alarms in Linux, OpenBSD, and two research systems
        - the lock checker alone: 82 errors, 201 false alarms
    - limits
        - no tracking of copies of a variable, mostly one function at a time
        - no run times given
        - “In general, many compiler problems” like this “are undecidable”, so they call these “checkers rather than verifiers”
- Lawall and Muller, [Coccinelle: 10 years of automated evolution in the Linux kernel](https://www.usenix.org/system/files/conference/atc18/atc18-lawall.pdf), USENIX ATC 2018
    - read: full
    - idea: write a patch-like pattern where `...` means “any code path”; the tool finds and rewrites matches
    - deliberately shallow: “Coccinelle performs no alias analysis or other form of dataflow analysis.”
    - never expands macros, so it needs no kernel configuration
    - cost on Linux 4.15 (16.5M lines), one laptop: all but one of 59 shipped patterns finish within the 54 minutes of a full build
    - use: “resulting in over 6000 commits to the Linux kernel”
    - limit: finding buffer overflows by scripting failed; “The code patterns were small and generic, and the scripts implementing the required analyses were complex.”
- Semgrep, [dataflow analysis engine overview](https://semgrep.dev/docs/writing-rules/data-flow/data-flow-overview), tool document read 7 October 2026
    - read: full page
    - the free engine looks inside one function only
    - stated trade-offs
        - “No path sensitivity: All potential execution paths are considered, even though some may not be feasible.”
        - “No pointer or shape analysis”
        - “No soundness guarantees”
        - “Expect both false positives and false negatives.”
    - the paid engine follows calls across files, but its [cross-file page](https://semgrep.dev/docs/semgrep-code/semgrep-pro-engine-intro) says “cross-file analysis does not currently run on diff-aware (pull request or merge request) scans”
- Clippy, [documentation](https://doc.rust-lang.org/clippy/), tool document
    - read: introduction page
    - “over 800 lints”, grouped by how often they are wrong
    - `clippy::pedantic` is described as “lints which are rather strict or have occasional false positives”
    - Qin et al. below: “the Rust-clippy detector failed to detect any of our collected bugs”

walk the paths and summarize each function

- Bush, Pincus, and Sielaff, [a static analyzer for finding dynamic programming errors](http://osq.cs.berkeley.edu/public/Pincus-StaticAnalyzer.pdf) (PREfix), Software: Practice and Experience 2000
    - read: full
    - idea: simulate one path at a time with a model of memory, callees first, and save each function's outcomes as a model for its callers
    - gives up: at most 50 paths per function by default, recursion unrolled twice
    - chooses to miss bugs over false alarms: “avoid generating incorrect messages, even at the” cost of missing real defects
    - author numbers
        - Mozilla, 540K lines: about 11 hours on 1998 hardware, 1,159 warnings
        - false warnings “under 10% (GDI demo, Apache) to roughly 25% (Mozilla)”
        - without cross-function models it “finds only 5% as many” defects
        - with 1% of the path budget it “gets roughly 1/3 of the warnings; 10% gets 3/4, and 25% gets 9/10.”
    - lesson that still holds: “In practice, ‘noise’ warnings are a far more significant problem than spurious messages.”
        - noise: true but nobody cares
- Calcagno, Distefano, O'Hearn, and Yang, [compositional shape analysis by means of bi-abduction](https://www.cs.ox.ac.uk/people/hongseok.yang/paper/popl09.pdf), POPL 2009
    - carried over
    - idea: for each function, guess the memory it needs and the memory it leaves untouched, so a “procedure is analyzed independently of its callers”
    - this is the engine under Infer
- Calcagno et al., [moving fast with software verification](http://www.sc.ehu.es/jiwlucap/Moving%20Fast%20with%20Software%20Verification.pdf), NASA Formal Methods 2015
    - read: full
    - Infer runs on every code change at Facebook: “it should report in under 10 minutes on average”
    - why it can: “Only functions modified by a diff and functions depending on them need to be analysed.”
    - honest limit: its model ignores concurrency and dynamic dispatch, “Thus, soundness does not translate to “no bugs are missed.””
    - no bug counts or rates in this paper
- O'Hearn, [incorrectness logic](http://www0.cs.ucl.ac.uk/staff/p.ohearn/papers/IncorrectnessLogic.pdf), POPL 2020
    - read: full
    - theory for bug finders: only claim states the code can really reach
        - “Under-approximation removes false positives, but opens the way to false negatives (missed bugs).”
    - why it matters for scale: the tool may drop paths without lying
        - “For incorrectness reasoning, you must remember information as you go along a path, but you get to forget some of the paths.”
    - one anecdote, not a benchmark: keeping 20 paths instead of 50 “was ∼2.75x wall clock time faster” and “found 97% of the issues”
- Le, Raad, Villard, Berdine, Dreyer, and O'Hearn, [finding real bugs in big programs with incorrectness logic](https://people.mpi-sws.org/~dreyer/papers/finding-real-bugs/paper.pdf) (Pulse-X), OOPSLA 2022
    - read: full
    - idea: report a bug only if it happens whatever the caller does; they call that a manifest bug
        - a bug that needs a particular caller is kept silent but used when analyzing callers
    - result on old OpenSSL: “Pulse-X found 26 bugs, 19 of which had been fixed”, against Infer's 39 fixed of 80 reported
    - without the manifest filter: “Pulse-X found 280 of these latent issues, more than 23 times the number of manifest issues reported.”
    - on new OpenSSL: 30 reports, 15 sent upstream, “The maintainers agreed that all 15 bugs were legitimate”
    - limits
        - false alarms came from code it could not see; a pthread model was missing
        - “From H1 we cannot conclude that Pulse-X is “better” than Infer.”
        - 4 to 900 CPU-minutes on 10 programs; whole-program runs, not per-change runs
- Blackshear, Gorogiannis, O'Hearn, and Sergey, [RacerD](https://ilyasergey.net/papers/racerd-oopsla18.pdf), OOPSLA 2018
    - carried over
    - per-method summaries of memory accesses, locks, and threads; chooses “reporting high-confidence bugs over ensuring their absence”
    - Distefano et al. below: over 2500 fixes in a year, about 50% fix rate, 10k lines “in under 2 seconds”
- Meta, [Pulse documentation](https://fbinfer.com/docs/checker-pulse/), tool document
    - carried over
    - “Pulse makes optimistic assumptions about calls to unknown functions”
- Clang Static Analyzer, [cross translation unit analysis](https://clang.llvm.org/docs/analyzer/user-docs/CrossTranslationUnit.html) and [inlining](https://clang.llvm.org/docs/analyzer/developer-docs/IPA.html), tool documents
    - read: partial
    - walks paths with symbolic values and inlines callees it can see
    - “Normally, static analysis works in the boundary of one translation unit (TU).”
        - a translation unit is one source file plus its headers
    - Pinpoint's authors below report it finished fast and found 2 real use-after-frees among 26 reports

follow values, not control flow

- Sui and Xue, [SVF: interprocedural static value-flow analysis in LLVM](https://yuleisui.github.io/publications/cc16.pdf), CC 2016
    - read: full
    - idea: run a cheap points-to analysis first, then build a graph with an edge from each place a value is set to each place it is used
        - checks become graph searches
    - no measurements in this paper
- Shi, Xiao, Wu, Zhou, Fan, and Zhang, [Pinpoint](https://www.cse.ust.hk/~charlesz/papers/pinpoint.pdf), PLDI 2018
    - read: full
    - problem with SVF's order: a cheap points-to analysis adds false edges, a precise one does not scale
    - idea: do cheap local pointer work per function, keep branch conditions as formulas, and only ask a solver about the paths from a source to a sink
    - author numbers
        - MySQL, about 2M lines, in 1.5 hours; Firefox, 8M lines, about 4 hours; 256 GB machine
        - use-after-free: 14 reports, 12 real
        - an SVF-based checker gave about 10,000 reports and no real bug in the sampled ones
        - Infer: “all of the thirty-five use-after-free” reports were false
    - limits
        - loops unrolled once, function pointers not handled
        - “we make no claims of breakthroughs” on the basic cost of pointer analysis and solving
        - the false alarm rate counts only reports the authors screened first
- Oh, Heo, Lee, Lee, and Yi, [design and implementation of sparse global analyses for C-like languages](https://prosys.kaist.ac.kr/publications/pldi12.pdf) (Sparrow), PLDI 2012
    - read: full
    - same trick for a sound analyzer: pass each fact straight from where it is defined to where it is used
    - result: interval analysis goes from about 100K lines to 1.4M lines; ghostscript in about 4 hours
        - cost follows how many variables each statement touches more than code size
    - limits: unknown external calls are assumed to “have no side-effect”; no alarm or bug counts

ask questions of a database of program facts

- Avgustinov, de Moor, Peyton Jones, and Schäfer, [QL: object-oriented queries on relational data](https://drops.dagstuhl.de/storage/00lipics/lipics-vol056-ecoop2016/LIPIcs.ECOOP.2016.2/LIPIcs.ECOOP.2016.2.pdf), ECOOP 2016
    - read: full
    - the language behind CodeQL
    - “A static analysis implemented in QL is simply a query run on a special database”
    - 101 Error Prone checks rewritten in under 2,000 lines of QL, against about 10,500 lines of Java
        - “about 4x slower, at 201 seconds for the same 97 analyses”
    - whole-program by design, so slower to answer than a per-file check
    - no bug counts or false alarm rates
- CodeQL, [about CodeQL](https://codeql.github.com/docs/codeql-overview/about-codeql/), tool document
    - read: partial
    - sold for variant analysis: “using a known security vulnerability as a seed to find similar problems in your code”
    - “For compiled languages, extraction works by monitoring the normal build process.”
        - I think this build step is the main cost of adopting it on systems code
- Bravenboer and Smaragdakis, [strictly declarative specification of sophisticated points-to analyses](https://courses.cs.washington.edu/courses/cse503/10wi/readings/p243-bravenboer.pdf) (Doop), OOPSLA 2009
    - read: full
    - a full Java points-to analysis in about 180 Datalog rules
    - speed came from hand-ordering the rules: unoptimized versions “run over 1000 times more slowly”
    - reports speed and precision of points-to sets, not bugs
- Scholz, Jordan, Subotić, and Westmann, [on fast large-scale program analysis in Datalog](https://souffle-lang.github.io/pdf/cc.pdf) (Soufflé), CC 2016
    - read: full
    - compiles Datalog rules into a C++ program
    - OpenJDK points-to in 35 seconds; the more precise variant took 6 h 44 min and 826 GB of memory
    - I think the memory number is the practical ceiling of whole-program Datalog

taint tracking

- Arzt et al., [FlowDroid](https://www.bodden.de/pubs/far+14flowdroid.pdf), PLDI 2014
    - read: full
    - builds a fake `main` that calls an Android app's callbacks in any order, then tracks private data to network or log calls
    - author benchmark of 39 hand-written apps: “93% recall and 86% precision”
    - limits: threads treated as one after another, “which is generally unsound as well”; whole arrays are tainted
    - they could not run any other academic tool: “we were unable to successfully evaluate even a single scientific taint-analysis tool for Android on our own”
- Zoncolan at Facebook, in Distefano et al. below
    - 100M lines of Hack “in less than 30 minutes, on a 24 core server”

prove there is no error, for one kind of program

- Cousot et al., [the ASTRÉE analyzer](https://www.di.ens.fr/~cousot/publications.www/CousotEtAl-ESOP05.pdf), ESOP 2005, and [why does Astrée scale up?](https://www.di.ens.fr/~rival/papers/fmsd09.pdf), FMSD 2009
    - read: full (2005); nearly full (2009)
    - proves no overflow, no out-of-bounds, no division by zero in flight-control C generated from diagrams
    - 400,000 lines in 11 h 48 min with zero false alarms
    - how: no recursion, no dynamic memory, and number tricks added by hand for that code family
    - cost: “about 7 years of effort for a small team of four to” five
    - authors: it “is likely to be imprecise on programs outside this family.”
- Ball, Levin, and Rajamani, [a decade of software model checking with SLAM](https://dl.acm.org/doi/10.1145/1965724.1965743), CACM 2011
    - read: full article text
    - checks that Windows drivers call kernel functions in a legal order
        - keeps only a few yes/no facts about the driver, searches all paths, adds facts when a reported path turns out impossible
    - “On WDM drivers, 90% of the defects reported by SDV are true bugs”
    - late in the Windows 7 cycle it “found 270 real bugs in 140 WDM and WDF drivers”
    - limits
        - “unable to handle very large programs (with hundreds of thousands of lines of code)”
        - rules and kernel stubs are written by hand; a manager's remark: “It takes a Ph.D. to develop API rules.”
- Oh et al. (Sparrow) above is the general-C attempt

let the code vote on its own rules

- Engler, Chen, Hallem, Chou, and Chelf, [bugs as deviant behavior](https://web.stanford.edu/~engler/deviant-sosp-01.pdf), SOSP 2001
    - read: full
    - idea: nobody writes the rule; if code does X after Y 999 times and not once, the one is probably a bug
        - “We want to find what is incorrect without knowing what” is correct
    - rank reports by a statistic so that many agreements and few exceptions come first
    - author-judged: hundreds of bugs in Linux and OpenBSD; “We have hand-examined in excess of a thousand errors”
    - my observation: a bug copied many times looks like a rule
- Kremenek and Engler, [z-ranking](https://web.stanford.edu/~engler/sas-camera-ready.pdf), SAS 2003
    - read: full
    - same statistic, used to sort any checker's reports
    - “within the first 10% of reports inspected, z-ranking found 3-7 times more real bugs on average than found by randomized ranking”
    - fails when a rule is broken everywhere at once
    - also the source of an often-repeated belief: “users tend to immediately discard a tool if the first two or three error reports are false positives”
        - this is the authors' experience, not a measurement
- Crix and DCUAF under kernels below use the same voting idea

make it a type check

- Banerjee, Clapp, and Sridharan, [NullAway](https://arxiv.org/pdf/1907.02127), ESEC/FSE 2019
    - read: full
    - developers mark what may be null; the checker looks at one method at a time inside the compiler
    - knowingly unsound: calls into unchecked code are assumed fine, methods are assumed to have no side effects
    - cost: “NullAway’s build times are only 1.15× those of standard builds, compared to 2.8× for Eradicate and 5.1× for CFNullness.”
    - test of the unsoundness at Uber: of 100 null crashes in 30 days, “not a single NPE in this dataset was due to any of NullAway’s unsound assumptions for fully-checked code”
        - 64 came from library code without annotations
    - it blocks every build, so warnings cannot pile up
    - limits: one company, 30 days, benchmarks that already used the tool
- sparse in the kernel is the same style: annotations for user pointers, byte order, and locks, checked per file
    - [kernel testing guide](https://docs.kernel.org/dev-tools/testing-overview.html): “Sparse does type checking, such as verifying that annotated variables do not cause endianness bugs”

how they scale: the tricks and their price

- summarize each function once and reuse it
    - used by PREfix, Infer, Pulse, Pinpoint, DCUAF, UBITect, Coverity
    - Distefano et al.: run time can be “a linear combination of the times to analyze the individual procedures”
    - price: what the summary leaves out is lost for every caller
- follow values instead of statements (sparse)
    - Sparrow and Pinpoint: about ten times more code in the same time
    - price: needs a pointer analysis first, and its errors spread
- cap the search
    - 50 paths per function in PREfix, loops unrolled once in Pinpoint and Crix, six call levels in Pinpoint, inlining depth 3 in UnsafeChecker
    - price: bugs behind the cap are missed, and nobody reports how many
- skip what you cannot or will not see
    - DR. CHECKER skips the core kernel; with it included “only 18 of these 100 entry points finished within the 4 hours”
    - NullAway and Pulse assume unknown calls are harmless
    - price: Sui et al. below measured the call graph alone missing about 11% of methods that really ran
- look at one file or one function only
    - Clang Static Analyzer by default, Semgrep's free engine, Coccinelle, Tricorder's checks, Rudra
    - price: PREfix's authors measured that “on the order of 90% of these errors are caused by the interaction of multiple functions”
        - Facebook: in 2017 over half of fixes for null, race, and security reports had traces across functions
- store facts as tables and let a database engine do the work
    - CodeQL, Doop, Soufflé
    - price: memory, and a full build to get the facts
- split the work across cores and reuse old results
    - McPeak, Gros, and Ramanathan, [scalable and incremental software bug detection](https://dl.acm.org/doi/10.1145/2491411.2501854) (Coverity), ESEC/FSE 2013
        - read: abstract only; the paper is paywalled
        - abstract: “complete analysis of code bases with millions of lines of code in a few hours”, “about one crash-causing defect per thousand lines of code, with a false positive rate of 10--20%”
- Sui, Dietrich, Tahir, and Fourtounis, [on the recall of static call graph construction in practice](https://ecs.wgtn.ac.nz/foswiki/pub/Main/JensDietrich/recall.pdf), ICSE 2020
    - read: full
    - ran 31 Java programs' tests and compared what ran with what the static call graph contained
    - “the median recall is 0.884”
    - more precision did not help: “adding precision to the static analysis has little impact on recall”
    - reflection is not the main cause; objects created in native code and calls made by the runtime are
    - turning on reflection support raised recall to 0.935 but only 20 of 31 programs finished in 6 hours
    - limit: the tests are themselves an incomplete view of what can run
    - I have seen no such measurement for C or the kernel beyond MLTA's small check below

false alarms and missed bugs: what the numbers say

- what gets called a false alarm differs by paper
    - author judged it not a bug
    - maintainer rejected it
    - developer did not act; Google's definition: “We define an effective false positive as any report from the tool where a user chooses not to take action to resolve the report.”
- reports a person had to read per bug the authors called real
    - DCUAF 1.06, SafeDrop about 1.1 to 1.4, Rudra about 2 to 6, UBITect 2.4, Crix 2.9
    - UnsafeChecker 15 after merging duplicates, MirChecker about 21, DR. CHECKER about 32
    - these are my divisions of the papers' own counts
    - they hide earlier filtering: UBITect's 190 read reports are what is left of 147,643 raw warnings
- when someone else judges, the share drops
    - Crix: authors 278 bugs; maintainers accepted 151
    - UBITect: authors 78 true; of 118 patches sent, 52 confirmed and 35 “will not happen in reality”
    - Rudra: authors 16% to 53% by setting; [Akilesh et al., EASE 2026](https://arxiv.org/abs/2605.04000) re-ran it on about 20,000 crates and one expert labeled “1,247 true positives (25.6%) and 3,632 false positives (74.4%)”
    - Pinpoint on Infer and SVF, UnsafeChecker on Rudra, SafeDrop and MirChecker: each new tool's authors find the older tools weak
        - UnsafeChecker's benchmark: MirChecker found 0 of 53 known bugs, SafeDrop 1, Rudra 11
        - I think these comparisons are biased toward the new tool's bug kind and cannot be taken as the older tools' true rate
- missed bugs are rarely measured, and the few measurements are bad
    - DCUAF on 22 recent fix commits: “finds the bugs in 6 of these commits” and “misses the bugs in the remaining 16 commits”
    - Bai et al. on 949 kernel use-after-free fixes: “Only 7 of the commits fix bugs found by these tools, with no bug involving concurrency.”
    - Crix put 350 old bugs back and missed 4%, but those were the bug kind it was built for
    - Facebook counts “observed missed bugs”; about 11 for Zoncolan
- ranking and learning from labels, without LLMs
    - Raghothaman, Kulkarni, Heo, and Naik, [user-guided program reasoning using Bayesian inference](https://www.cis.upenn.edu/~mhnaik/papers/pldi18a.pdf) (Bingo), PLDI 2018
        - read: full
        - alarms that share a cause go up or down together when the user labels one
        - “the user needs to inspect 58.5% fewer alarms with Bingo compared to Base-R”, a random order
        - one round of re-ranking took from 3 seconds to an hour: “The running time of Bingo could preclude its integration into an IDE.”
        - labels were simulated, not real developer sessions
    - Akilesh et al. above: a small learned filter plus 30 to 60 seconds of fuzzing per warning raised Rudra's share of true warnings from 25.6% to 59.0% and lost a quarter of the true ones
- still to add: the group of studies on developer surveys and on tools run against known bug sets
    - reader notes for those were not finished when this version was saved

how industry uses them

- Bessey et al., [a few billion lines of code later](https://web.stanford.edu/~engler/BLOC-coverity.pdf) (Coverity), CACM 2010
    - carried over
    - “Our product did not verify the absence of errors”
    - most of the work was real build systems and explaining reports
- Sadowski, van Gogh, Jaspan, Söderberg, and Winter, [Tricorder](https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/43322.pdf), ICSE 2015
    - read: full
    - Google's platform: many small checks post comments in code review, with a “not useful” button
    - a check stays only if developers accept it: “Developers should feel that we are pointing out an actual issue at least 90% of the time.”
    - the checks are shallow on purpose: “We are not using any control or data-flow information, pointer analysis, wholeprogram analysis, abstract interpretation, or other similar techniques.”
    - why: “when developers have to navigate to a dashboard or run a standalone command line tool, analysis usage drops off”
    - click data only; no count of real bugs found or missed
- Sadowski, Aftandilian, Eagle, Miller-Cushon, and Jaspan, [lessons from building static analysis tools at Google](https://storage.googleapis.com/gweb-research2023-media/pubtools/4365.pdf), CACM 2018
    - carried over
    - “Careful developer workflow integration is key for static analysis tool adoption”
- Distefano, Fähndrich, Logozzo, and O'Hearn, [scaling static analyses at Facebook](https://discovery.ucl.ac.uk/id/eprint/10084236/1/O'Hearn%20AAM%20scaling-static-analysis-at-facebook.pdf), CACM 2019
    - read: full
    - deep analysis in code review, the opposite bet from Google
    - the key story: “We had worked hard to get the false positive rate down to what we thought was less than 20%, and yet the fix rate—the proportion of reported issues that developers resolved—was near zero.”
        - then: “The same program analysis, with same false positive rate, had much greater impact when deployed at diff time.”
        - my caution: one episode with 20 to 30 issues, and who got the report also changed
    - they stopped claiming accuracy numbers: “we don’t make claims about their rates and pay more attention to the action rate and the (observed) missed bugs.”
    - security: “We measured that 43.3% of the severe security bugs are detected via Zoncolan.”
    - new rules start with security engineers and move to code review only after tuning
- Harman and O'Hearn, [from start-ups to scale-ups](https://discovery.ucl.ac.uk/id/eprint/10068035/1/from-start-ups-to-scale-ups-opportunities-and-open-problems-for-static-and-dynamic-program-analysis.pdf), SCAM 2018
    - read: full
    - cost is real: after one improvement “Infer went from taking 3% of the datacenter capacity allocated to iOS CI, to taking over 20%.”
    - open problems they name
        - make the cost of analyzing a change follow the size of the change
        - tell whether a warning was fixed or just moved: “The problem of detecting fixes conservatively, yet with minimal false positives remains an interesting challenge”
        - send a report to the right person
        - replay open-source history as a fake code review stream to test tools
    - their own limit: “our experience may be somewhat specific to continuous deployment in the technology sector”
- Uber: NullAway above, a type check that blocks the build
- Microsoft: PREfix on product code, SLAM as a release check for drivers
- Airbus: Astrée, proof for one code family
- what I take from these
    - fact: every deployment that reports success shows results inside code review or the build
    - fact: Google and Uber chose simple local checks; Facebook and Microsoft paid for deep ones with dedicated teams
    - I think the deciding cost is people who tune rules and models, not machines

kernels and other systems code

- what the kernel community runs
    - [kernel testing guide](https://docs.kernel.org/dev-tools/testing-overview.html), read: static analysis section
        - sparse for annotations; Smatch for flow and cross-function checks, “where is this buffer allocated? How big is it?”; Coccinelle for patterns and automatic patches
        - “Beware, though, that static analysis tools suffer from false positives.”
        - “If you just created a Smatch warning and try to push the work of converting on to the maintainers they would be annoyed.”
    - Intel's 0-day service runs Coccinelle on new commits and mails reports (Lawall and Muller)
    - Smatch is mainly one person's work; a 2026 news search result says its funding is at risk
        - search result only, not read
- how buggy, and for how long
    - Chou, Yang, Chelf, Hallem, and Engler, [an empirical study of operating systems errors](https://pdos.csail.mit.edu/archive/6.097/readings/osbugs.pdf), SOSP 2001
        - read: full
        - ran 12 checkers over 21 Linux versions
        - “device drivers have error rates up to three to seven times higher than the rest of the kernel”
        - “bugs remain in the Linux kernel an average of 1.8 years before being fixed”
        - “It is unknown whether this set of bugs is representative of all errors.”
    - Palix, Thomas, Saha, Calvès, Lawall, and Muller, [faults in Linux: ten years later](https://coccinelle.gitlabpages.inria.fr/website/papers/asplos11.pdf), ASPLOS 2011
        - read: full
        - had to rewrite the checkers because “Chou et al.’s fault finding tool and checkers were not released”
        - Linux 2.6: “3,915 different reports (after correlation), of which we have determined that 2,370 represent faults”
        - faults per line halved while the code doubled; drivers no longer the worst part
        - “The average fault lifespan across all files of Linux 2.6 is 1.5 years”
        - “tools, while used, are under-exploited”
        - carried labels across versions, so only 232 new reports needed reading for one new release
- one tool per bug kind
    - Machiry et al., [DR. CHECKER](https://www.usenix.org/system/files/conference/usenixsecurity17/sec17-machiry.pdf), USENIX Security 2017
        - read: full
        - taint and pointer tracking from each entry point of phone vendor drivers; core kernel calls skipped
        - 5,071 warnings, all read by the authors, “158 critical zero-day bugs”
        - “90% of the entry points took less than 100 seconds to complete.”
        - stock tools on the same code: flawfinder 44,900 warnings, Sparse 31,929
    - Lu and Hu, [where does it go? refining indirect-call targets with multi-layer type analysis](https://www-users.cse.umn.edu/~kjlu/papers/mlta.pdf) (MLTA), CCS 2019
        - read: full
        - problem: a call through a function pointer could go to any function of the same type
        - idea: also match the struct the pointer is stored in
        - Linux: average targets per such call 134 down to 7.7; whole-kernel call graph “within four minutes”
        - checked against real runs: 3,566 recorded calls, 5 targets missed; “such evaluation can never be used as a complete proof”
    - Lu, Pakki, and Wu, [detecting missing-check bugs](https://www-users.cse.umn.edu/~kjlu/papers/crix.pdf) (Crix), USENIX Security 2019
        - read: full
        - voting: if most similar code checks a value and one place does not, report it
        - whole kernel “in 64 minutes”
        - “it took three researchers, a total of 36 man-hours” to read 804 reports
        - authors' false alarm rate 65%; “over 48% of false positives” come from imprecise pointer analysis, 25% from checks nobody needs
        - found bugs were on average 4 years 7 months old
    - Bai, Lawall, Chen, and Hu, [effective static analysis of concurrency use-after-free bugs in Linux device drivers](https://www.usenix.org/system/files/atc19-bai.pdf) (DCUAF), USENIX ATC 2019
        - read: full
        - voting again, to learn which driver functions can run at the same time, then compare held locks
        - 679 reports, 640 called real by the authors; “randomly selected 130 of the real bugs and reported them to Linux kernel developers, and 95 have been confirmed”
        - 28 minutes on a desktop
        - without the voting step: “runs for 350 minutes and reports around 50K bugs”
    - Zhai et al., [UBITect](https://www.cs.ucr.edu/~zhiyunq/pub/fse20_UBITect.pdf), ESEC/FSE 2020
        - read: full
        - cheap whole-kernel pass, then slow path search on what is left
        - “7 and 205 days of CPU time” for the two stages
        - the cheap pass alone “scales well but generates too many warnings to inspect manually”
        - Clang Static Analyzer on the same task: 96 minutes for 78 files
    - Brown, Stefan, and Engler, [Sys](https://cseweb.ucsd.edu/~dstefan/pubs/brown:2020:sys.pdf), USENIX Security 2020
        - carried over
        - same two-stage shape on browsers: cheap checks pick places, symbolic execution confirms; “51 bugs, 43 confirmed”
- what I take from the kernel work
    - fact: each paper is a one-time run on one kernel version by its authors
    - fact: every one needed hand-made lists, e.g. 531 error-handling functions for Crix, 26 function models for UBITect
    - fact: the tools in daily kernel use are the shallow ones
    - I think the missing piece is upkeep and a shared way to score them, more than a new algorithm
- still to add: 2022 to 2026 kernel papers and a 2026 survey of the kernel bug life cycle
    - reader notes for those were not finished when this version was saved

Rust

- where Rust bugs are
    - Qin, Chen, Yu, Song, and Zhang, [understanding memory and thread safety practices and issues in real-world Rust programs](https://doi.org/10.1145/3385412.3386036), PLDI 2020
        - read: full
        - 170 bugs read by hand; all memory bugs involve `unsafe` code
        - but the mistake is often in safe code: 17 of 21 buffer overflows compute the bad index in safe code
        - “Surprisingly, 25 of our studied non-blocking bugs happen in safe code.”
        - advice: “Future memory bug detectors can ignore safe code that is unrelated to unsafe code”
    - Li, Guo, Yang, Wang, and Xu, [an empirical study of Rust-for-Linux](https://www.usenix.org/system/files/atc24-li-hongyu.pdf), USENIX ATC 2024
        - read: full
        - “In total, we have found 25 bugs from merged and staged RFL code.”
        - “6 are in the safe abstraction layer and break memory safety and 3 break thread safety”
            - safe abstraction layer: Rust wrappers that hide the kernel's C functions behind safe types
        - “with RFL, Linux becomes more “securable” but still cannot be fully secure”
        - no analyzer was run in this study
- the bug finders
    - Bae, Kim, Askar, Lim, and Kim, [Rudra](https://doi.org/10.1145/3477132.3483570), SOSP 2021
        - read: full
        - three patterns in `unsafe` code, checked on generic code before types are filled in
        - whole registry: “43k packages) in 6.5 hours”, “264 previously unknown memory safety bugs”
        - 2,390 reports read “at a rough rate of 150 reports per man-hour”
        - 15.7% of packages “did not compile with the rustc version RUDRA was based on”
        - “both algorithms cannot detect any bugs caused by an interprocedural interaction”
        - two of its patterns became Clippy lints
        - maintainers did not argue: Rust's rule that safe code must never cause undefined behavior gives a clear definition of a bug
    - Cui, Chen, Xu, and Zhou, [SafeDrop](https://arxiv.org/abs/2103.15420), arXiv 2021, later ACM TOSEM 2023
        - read: full (arXiv version)
        - tracks which variables share a buffer, per path, to catch double frees from automatic cleanup
        - found all 9 known bugs it was built around; 8 crates with new problems
        - “does not provide the support for primitive array type, closure, raw pointer offset, and function pointer”
    - Li, Wang, Sun, and Lui, [MirChecker](https://www.cse.cuhk.edu.hk/~cslui/PUBLICATION/CCS2021.pdf), CCS 2021
        - read: full
        - tracks number ranges to find overflow and out-of-bounds panics
        - 33 bugs in 12 crates out of about 1,000 tried
        - “Most of the generated warnings are false positives.”
        - skips calls into other crates: “this design obviously introduces unsoundness and makes our analysis result unreliable”
    - Yin, Zhang, Feng, and Xu, [UnsafeChecker](https://arxiv.org/abs/2609.09641), arXiv September 2026, not peer reviewed
        - read: full; no LLM is used
        - tracks ownership, object state, and pointer bounds through each public function
        - own benchmark: “detecting 32 CVEs and covering 36 bugs (67.9% recall) with 51.6% alert-level precision”
            - the bugs were cut down to small libraries because the older tools could not build the original crates
        - registry scan: “114 previously unknown bugs across 83 crates, with 45 confirmed”
            - each bug needed a hand-written test that fails under Miri
        - in the same 10,000-crate sample, “Rudra successfully compiled and analyzed 2,892 crates”
            - Rudra's own paper had 77.9% in 2020; I think the drop is the old compiler version it is tied to
    - Carrott, Ayoun, and Raad, [compositional bug detection for internally unsafe libraries](https://doi.org/10.4230/LIPIcs.ECOOP.2025.5) (RUXt), ECOOP 2025
        - read: full except proof details
        - theory in the Pulse-X line: build values only through the safe functions and report when one reaches undefined behavior, so every report is real
        - runs on a toy language and three small examples; “we will perform a large-scale evaluation of RUXt by applying it to real Rust codebases”
- the running-code comparison point
    - Jung et al., [Miri](https://doi.org/10.1145/3776690), POPL 2026
        - read: full
        - an interpreter that runs tests and stops at any undefined behavior; no false reports by design
        - ran the tests of the top 100,778 crates: 11 days, “approximately 1.9 CPU-years”
            - “about half of the crates are successfully checked”; undefined behavior in 4,595 crates, not examined further
        - “about 3000x slower than the native code”
        - sees only what a test runs; Rudra's authors: “Miri did not find any of the nine bugs found by RUDRA because all unit tests explore the monomorphized forms of generic functions”
            - monomorphized: generic code with concrete types filled in
- what I take from the Rust work
    - fact: the reader found no head-to-head of these tools by people who did not build one of them
        - a 2025 [literature review of Rust analysis tools](https://par.nsf.gov/biblio/10674354-literature-review-rust-analysis-tools) says it tests several; its full text is closed until 22 October 2026
    - fact: each tool is tied to one compiler version and stops building as the language moves
    - fact: the bug kinds barely overlap, so “which is best” has no single answer
    - fact: nobody has measured any of them on kernel Rust

code changes: reusing results and tracking warnings

- reuse within one analysis
    - Arzt and Bodden, [Reviser](https://www.bodden.de/pubs/ab14reviser.pdf), ICSE 2014
        - read: full
        - after an edit, delete facts at changed places and recompute from the nearest unchanged ones
        - “always produces the same results as a full recomputation”
        - saves up to 80%, but with a big change the update took 205 seconds against 215 from scratch
        - the call graph is rebuilt every time; only two simple analyses tested
    - Szabó, Erdweg, and Bergmann, [incremental whole-program analysis in Datalog with lattices](https://szabta89.github.io/publications/inca-pldi2021.pdf), PLDI 2021
        - carried over
        - updates derived facts as code facts change; the update “must yield the exact same results”
    - Szabó, [incrementalizing production CodeQL analyses](https://arxiv.org/abs/2308.09660), ESEC/FSE 2023
        - read: full except appendix
        - first finding: CodeQL numbered program elements in order, so a one-line edit renumbered nearly everything; the change in stored facts was bigger than the fact table itself
            - fix: name each element by its position in its file's syntax tree
        - with stable names, commits up to 1000 lines changed at most 5% of the results
        - prototype on two Ruby projects of 6K and 9K lines: updates in 15 seconds to under a minute
        - cost: about an hour and 70 GB to start, or 15 minutes and 20 GB in a mixed mode
            - “even ~ 20 GB is too large for a regular GitHub Actions runner”
        - Ruby was chosen because it needs no build: “for compiled languages CodeQL requires more than just parsing, so this is not a full solution in general”
    - GitHub then shipped it
        - [May 2025](https://github.blog/changelog/2025-05-28-incremental-security-analysis-makes-codeql-up-to-20-faster-in-pull-requests): pull request scans “up to 20% faster”
            - and a change in what is shown: “The CodeQL GitHub Action will now only report new alerts found within the changed code (the diff range).”
        - [September 2025](https://github.blog/changelog/2025-09-23-incremental-security-analysis-with-codeql-is-now-available-for-all-languages/): all languages; “C# and C/C++ evaluations are roughly 5% faster, Go evaluations around 20% faster”
        - [March 2026](https://github.blog/changelog/2026-03-24-faster-incremental-analysis-with-codeql-in-pull-requests/): a second step, a small database for the changed code joined with a cached one for the rest, only for projects “using the build mode none extraction mechanism”
        - I think this means a 5% gain is the state of practice for C and C++ with a real build
    - Infer keeps old results with `--reactive`, per its [workflow page](https://fbinfer.com/docs/infer-workflow/)
- reuse in proof-style checking
    - Yu, He, and Wang, [incremental predicate analysis for regression verification](https://feihe.github.io/materials/oopsla20b.pdf), OOPSLA 2020
        - carried over
        - “reuse the previously-yielded assertion annotation in regression verification”
    - Beyer et al., [reusing precisions for efficient regression verification](https://www.sosy-lab.org/research/pub/2013-PA-TR1302.Reusing_Precisions_for_Efficient_Regression_Verification.pdf), 2013 technical report
        - carried over
        - reuse the hints that guide the check, then rerun it; “59 device drivers with 1 119 revisions”
- which warnings are new
    - Li and Yang, [tracking the evolution of static code warnings](https://arxiv.org/abs/2210.02651) (StaticTracker), arXiv 2024, IEEE TSE
        - read: full
        - matching warnings between two commits by file, line, and text is wrong a third of the time: “only 66.0% (2,277/3,451)”
            - causes: renames and moved code, shifted lines, compiler-made names
        - with rename detection and best-overall matching: 90.3%
        - telling “fixed” from “code deleted” is still weak: 69.9%
        - Java, two tools, four projects
    - Heo, Raghothaman, Si, and Naik, [continuously reasoning about programs using differential Bayesian inference](https://www.cis.upenn.edu/~mhnaik/papers/pldi19.pdf) (Drake), PLDI 2019
        - read: full
        - hiding every warning that was already there can hide a real new bug, when a changed helper breaks old code
            - “syntactic alarm masking suppresses 4 of the 26 bugs overall”
        - idea: compare how each alarm was derived before and after, and rank alarms whose reasons changed
        - “the Drake user has to inspect only 30 alarms on average per benchmark, compared to 85 (3× more) alarms and 118 (4× more)”
        - limits: 10 small C programs, version pairs between releases, labels from an oracle

what remains unsolved

- nobody knows what these tools miss on real code
    - recall is measured on the tool's own bug kind or not at all
    - no shared bug set for kernels or for Rust that outsiders ran several tools on
- “false alarm” has no common meaning, so rates cannot be compared across papers
- the unseen parts of a program
    - library and kernel functions need hand-written models; every paper above has such a list
    - calls through pointers, inline assembly, macros, build options, code made at build time
    - Livshits et al.: experts “failed to pinpoint a single reliable survey of the use of so-called dangerous features”
- depth against time
    - what developers will wait for is minutes; deep whole-kernel runs take an hour to weeks
    - cross-file analysis is turned off for pull request scans in Semgrep
- changes
    - reuse works for languages without a build; small gain for C and C++
    - showing only warnings in changed lines can hide new bugs elsewhere; how often is unmeasured outside Drake's 26 bugs
    - telling a fixed warning from a moved one
- upkeep
    - research tools are tied to one compiler or kernel version and are not kept running
    - Chou's checkers were never released; FlowDroid's authors could not run any peer tool; the older Rust tools could not build today's crates
- concurrency
    - most tools assume one thread; the race tools rely on voting and hand-made lists
- Rust and mixed C and Rust
    - no interprocedural tool at registry scale that keeps building
    - nothing measured on kernel Rust wrappers, where the reported soundness bugs are

research we could do

1: which real kernel bugs do the stock analyzers flag on the day the bug is written

- why this one
    - it measures the number the field lacks: recall on real bugs, at the moment a warning is cheapest to act on
    - easy sell: “the kernel's own tools would have caught X% of N thousand later-fixed bugs, and cost Y warnings per commit”
    - needs no new analyzer
- what exists that makes it doable
    - kernel fix commits name the commit that introduced the bug with a `Fixes:` tag
    - Smatch, sparse, Coccinelle scripts, Clang Static Analyzer, GCC's `-fanalyzer`, and CodeQL all run on the kernel
- smallest useful version
    - sample 500 fixes with `Fixes:` tags from one year, spread over drivers, filesystems, and networking
    - for each, build the introducing commit and its parent for the changed files
    - run each tool on both, keep warnings that are new
    - count a hit when a new warning is in the function the later fix changed
        - read a sample of hits and misses by hand to check that rule
- measures
    - share of bugs flagged, per tool and per bug kind
    - new warnings per commit that are not hits, the price of looking
    - time per commit
    - how long the flagged bugs lived before the fix
- what would sink it
    - `Fixes:` tags pointing at the wrong commit too often; check a sample first
    - hits so rare that nothing can be said per bug kind; then widen to all fixes of one year
    - tools that cannot run per commit in reasonable time; Smatch needs a cross-function database, which could be rebuilt per release instead
- prior art I know of
    - Chou 2001 and Palix 2011 count what checkers report, not what they miss
    - DCUAF checked 22 commits for one bug kind
    - the reader group on tool-versus-known-bug studies had not reported when this was saved; their Java and C results must be compared before claiming novelty
- still to check
    - any study running analyzers at bug-introducing kernel commits
    - datasets built by running Infer before and after fix commits, e.g. IBM's D2A

2: an outside test of Rust unsafe-code bug finders, and how fast they rot

- why
    - four tools, each scored by its own authors on its own bug kind; the only shared benchmark cut the crates down to fit
    - Rust safety is an easy sell, and the registry keeps every old version of every crate
- smallest useful version
    - take advisories from the RustSec database with a fixed version
    - for each, fetch the last vulnerable version of the real crate
    - run Rudra, SafeDrop, MirChecker, UnsafeChecker, and Miri on the crate's tests, each with the compiler it needs
    - record: did the crate build under that tool, time, warnings, and whether a warning points at the function the fix changed
- measures
    - share of crates each tool can build, by crate release year; this is the rot curve
    - share of advisories flagged, by bug kind
    - warnings per flagged advisory
    - overlap between tools, and with Miri
- what would sink it
    - most tools failing to build most real crates; that is itself the result, but then the accuracy part shrinks
    - the embargoed literature review turning out to have done this; check after 22 October 2026
- follow-on if it works
    - the 4,595 crates where Miri saw undefined behavior are unexamined; check which the static tools also flag
    - a thin layer that keeps one of these tools building on new compilers, e.g. on the Charon framework that the Rust group covers

3: how many new warnings does diff-only reporting hide

- why
    - GitHub now reports on pull requests only alerts “within the changed code (the diff range)”; Semgrep turns cross-file analysis off for pull request scans
    - Drake found hiding old-looking warnings lost 4 of 26 real bugs, on 10 small programs
    - a concrete, checkable hole in how most projects use these tools today
- smallest useful version
    - pick 20 open-source projects with CodeQL already set up
    - for 200 merged pull requests each, run the full analysis before and after
    - match warnings across the two runs with StaticTracker-style matching
    - count new warnings whose location is outside the changed lines
    - read a sample to see which are real
- measures
    - share of new warnings outside the diff
    - share of those that are real and how long they stayed
    - which kinds of edits cause them, e.g. a changed helper or a removed check
- what would sink it
    - near zero outside-diff warnings; then diff-only reporting is fine and that is worth one paragraph, not a paper
    - matching errors as large as the effect; StaticTracker's 90% may not be enough, so hand-check
- still to check
    - GitHub's own documents on what later full scans catch
    - any study after Drake that measures this on real pull requests

4: a checker for the safe wrappers in Rust for Linux

- why
    - 9 of the 25 bugs found in kernel Rust code were soundness bugs in the wrappers
    - each wrapper carries its safety rule only as a comment
    - no existing tool has been run there, and the kernel is not a registry crate, so the build path differs
- smallest useful version
    - run Rudra and UnsafeChecker patterns on the kernel's `rust/` directory and report what breaks and what they flag
    - then add the kernel-specific part: a rule the C side states, e.g. “must not sleep while holding this lock”, checked across the C and Rust boundary
- risk
    - larger than 1 to 3; needs kernel build work and kernel knowledge
    - the kernel's own tool for this, klint, may already cover the first rules; read it first

5: what is left of reusing results across edits

- GitHub ships reuse for CodeQL; the idea as stated in the first version is no longer open
- open part
    - C and C++ with real builds, where the reported gain is about 5%
    - changes outside the source: a library model, a build flag, a macro
- smallest useful version
    - measure on a C project's commit history how much of the extracted facts change per commit, the way Szabó did for Ruby
    - split the change by cause: edited source, changed headers, changed build options
- what would sink it
    - if header changes touch most files on most commits, reuse cannot help and the answer is “fix the build model first”
- link to software complexity
    - the same measurement says how far a small edit spreads through a code base
    - that is a measure of coupling as an analyzer sees it; it would still need a human task to say anything about how hard code is to understand
