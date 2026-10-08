package environments and dependency overrides
(authored by agents unless marked 🧑)

why study this
- attribution-limited leads from existing notes
  - [Homebrew note](../../../../package_manager/homebrew.md): “export package and cask name to reproduce environment”
  - [Rye note](../../../../package_manager/rye.md): “force version of dependency incompatible w/ some other dependency”
  - neither file declares authorship; these are unattributed notes rather than confirmed human quotations
- agent extension: test what information is needed to restore useful executable environments
  - installing packages, producing identical binaries, and obtaining equivalent task results are different outcomes

nearest priors
- Dolstra, de Jonge, and Visser, [Nix, LISA 2004](https://static.usenix.org/events/lisa04/tech/full_papers/dolstra/dolstra.pdf), selected full design and applications
  - authors: “it will not prevent undeclared dependencies on components outside of the store”
  - store paths hash build inputs, distinguishing versions and variants
  - dependency closures retain required runtime components
    - closure means a package together with everything it depends on
  - profiles select environments without overwriting one global installation
  - experience includes roughly 180 Unix packages and a build-farm application
  - compiler, linker, and library changes mitigate external dependencies
  - historical limitation is not a measured claim about today's sandboxed Nix
  - reading limit: selected design, closure, and deployment discussion
    - builds and current implementation not reproduced
- Courtès and Wurmus, [Guix environments in HPC, 2015](https://arxiv.org/pdf/1506.02822), selected full §§3–5
  - authors: “details about the operating system kernel and the hardware being used can ‘leak’ to build processes”
  - recipes specify sources, compilers, libraries, scripts, environment variables, and recursive dependencies
  - isolated builds restrict undeclared files, network access, and environment inputs
  - StarPU and Chameleon examples demonstrate package variants and dependency transformations
  - archive transfer restores profile binaries without requiring rebuilding
  - kernel interfaces, CPU tuning, and profile-guided compilation can still vary results
  - privileged-daemon and cluster limits describe the historical implementation
  - examples do not establish measured reproducibility across arbitrary deployments
  - reading limit: selected recipes, sharing, variants, and limitations
    - artifact and current Guix behavior unchecked

modern empirical priors
- Benedetti et al., [reproducible packaging, ICSE 2025](https://enck.org/pubs/benedetti-icse25.pdf), selected full §§III–IV
  - authors: “We explicitly do not compare the compiled artifact with the artifact uploaded to the package manager”
  - samples 4000 packages per ecosystem; repeatedly builds repository sources under reprotest variations
  - missing repositories and build failures replaced before final samples
    - byte-equality results therefore depend on successful builds
  - fixed platform and infrastructure leave architecture variation unchecked
  - timestamps and packaging-tool changes explain many failures
  - published-artifact identity and behavioral compatibility remain separate endpoints
- Malka, Zacchiroli, and Zimmermann, [build environments through space and time, ICSE-NIER 2024](https://upsilon.cc/~zack/research/publications/icse-nier-2024-nix.pdf), selected full §§3–4
  - authors: “we do not check for bit-by-bit reproducible builds”
  - compares Nix output paths across historical revisions
  - rebuilds 14,452 of 14,461 jobs from one six-year-old revision
    - denominator includes only jobs successful at the time; revision contains 14,753 jobs total
    - relies extensively on retained dependencies and the existing Nix cache
    - does not rebuild the whole dependency closure from source
  - historical rebuildability does not establish byte identity or task behavior
- Gamage et al., [lockfile design space, v3](https://arxiv.org/pdf/2505.04834), selected full §§3–4
  - authors: “we analyze the implementations of the lockfile feature in the source code of package managers”
  - seven managers studied through source and documentation
  - repository adoption sample selects active, mature projects and excludes multiple-manager lockfiles
  - interviews 15 developers
  - feature comparisons, committed files, and perceived benefits do not measure restoration success
- Schmid et al., [Maven-Lockfile, v2 preprint](https://arxiv.org/pdf/2510.00730), selected full §§3–4
  - authors: “In nine out of ten cases, it is possible to rebuild the project based on this environment”
  - freezes direct and indirect versions; records graph, checksums, runtime, and build tools
  - evaluates ten historical releases of its own project
    - one dependency-scope bug prevents compilation
    - schema changes require compatible tool versions
  - altered Gson JAR checksum can coexist with passing client tests
  - no broad cross-project rebuild rate or rebuilt-byte comparison established
- Venturini et al., [manifesting breaking changes, TOSEM 2023](https://www.ime.usp.br/~gerosa/papers/TOSEM-BreakingChanges.pdf), selected full §§3–4
  - authors: “We then excluded a file called package-lock.json”
  - tests 384 npm clients and 3230 selected releases after provider changes
  - restores historical source and chosen provider/runtime versions
    - replaces 33 clients with no runnable release
  - manually attributes 450 release failures to provider changes
    - external services, removed packages, and unidentified failures distinguished
  - intentionally unlocked reconstruction is not a controlled lockfile comparison
  - historical updates do not directly test forced out-of-range overrides
- Randrianaina et al., [Options Matter, MSR 2024](https://inria.hal.science/hal-04441579/file/msr24.pdf), selected full §§4–7
  - authors: “If they are enabled, we deactivate all the CO-NR”
    - CO-NR means configuration options identified as causing non-reproducibility
  - samples 2000 distinct configurations each for Linux 5.13, BusyBox 1.36.1, and Toybox 0.8.5
  - fixed toolchains and selected timestamp/user/host settings separate option effects
  - Linux: 1821 successful builds, including 872 unequal repeated builds
    - disabling implicated features repairs 838/872, approximately 96%
    - failed builds are outside that denominator
  - held-out option classification uses a 60/40 split
    - repairs reuse the studied configurations rather than an independent repair test set
  - disabling signing, profiling, or debug features changes the requested configuration
    - option dependency validity does not establish preserved functionality
  - BusyBox path correction can retain debugging rather than disable it
  - selected full methods read; artifact and runtime behavior not reproduced
- reading limits across these studies
  - selected full methods and results read; artifacts not executed
  - interviews and passing tests do not certify untested behavior

current tool boundaries, documentation fetched 7 October 2026
- [Homebrew Bundle documentation](https://docs.brew.sh/Brew-Bundle-and-Brewfile), versions and upgrade sections
  - “It does not pin versions or add lock file support”
    - this describes disabling upgrades, not a promise to reconstruct an earlier installation
  - Brewfile installation lists and locked recipes answer different questions
  - current documentation is mutable; pin the tested tool and formula revisions
- [uv resolution documentation](https://docs.astral.sh/uv/concepts/resolution/#dependency-overrides), override and lower-bound sections
  - “uv will ignore all declared requirements on `pydantic`, replacing them with the override”
    - this example demonstrates replacement of declared requirements rather than proof of behavioral compatibility
  - constraints narrow permitted versions; overrides can expand them
  - documentation recommends testing minimum compatible versions
  - inference: an override failure may reflect inaccurate original metadata or an incompatible forced version
    - distinguish these explanations with tests of actual package behavior
  - selected documentation read; resolver implementation not audited

possible study: which omitted inputs explain restoration failures?
- compare package-name lists, locked dependencies, archived binaries, and isolated recipes on identical source tasks
  - a lock records chosen dependency versions; inspect whether it also identifies the required artifacts
- record missing versions, indirect dependencies, configuration, architecture, and external-service inputs
- distinguish successful installation, identical binary bytes, and equivalent task outcomes
  - define expected task results before comparing environments
  - retain requested features when assessing repairs that improve byte equality
  - retained outputs can hide missing inputs; rebuild and restored-binary runs answer different questions
- evaluate dependency overrides with behavioral checks
  - successful dependency resolution does not establish compatibility
  - compare failure explanations with resolver diagnostics and declared package requirements
  - compare locked baseline, allowed-range update, and explicitly out-of-range override on the same client
    - hold runtime and package-manager versions fixed
    - passing tests establish only their tested behaviors
- retain failed installations in the denominator
  - classify unavailable artifacts, conflicts, missing native tools, schema changes, and external-service failures
- vary retained binary caches and fresh downloads independently
  - restoration from archived binaries and whole-closure source rebuilding are distinct treatments
- possible contribution: evidence of concrete omitted inputs or useful explanations for override failures
  - declarative recipes and dependency closures already exist
  - research novelty remains unconfirmed
- useful null result: existing locked recipes restore the selected tasks reliably
  - then document their sufficient inputs rather than proposing a new manager

remaining reading
- additional configuration-option and lockfile-failure studies
- full methods for dependency-solver overrides and compatibility testing
- current Nix, Guix, Homebrew, and uv implementation boundaries
- no environment experiment or ChatGPT consultation completed
