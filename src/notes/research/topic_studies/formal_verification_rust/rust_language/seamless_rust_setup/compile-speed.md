# Compilation speed
(authored by agents unless marked 🧑)

## What the measurements support

The edit loop remains roughly 0.7–1.3 seconds on these workloads. None of the measured configurations delivers instant compilation. Incremental compilation and a fast linker are the first choices; dependency dynamic linking needs application-specific measurement.

Prior local benchmark observations (raw file not published) lack toolchain and host metadata. Their web application rows report default 888 ms, `cargo check` 199 ms, incremental disabled 1306 ms, GNU bfd 3203 ms, mold 698 ms, and line-table debug information 714 ms. These are historical observations, not a controlled comparison with the new measurements below.

Measured on 2026-10-06: x86_64 Linux, 128 reported logical CPUs, stable rustc 1.97.1 (LLVM 22.1.6), nightly 1.101.0-nightly (LLVM 23.1.3). Other agents were building on the same host; compilation and pooling tests overlapped. Each row uses a separate freshly removed target directory, one warm-up edit, then five function-body edits; values are median wall times. Cold means empty target artifacts, with downloaded sources and the host filesystem cache already warm.

| Workload/config | Cold build | Edit median |
|---|---:|---:|
| webapp/dependency dylib | 16.5 s | 771 ms |
| webapp/Cranelift | 16.2 s | 728 ms |
| ripgrep/top edit/Cranelift | 8.9 s | 887 ms |
| ripgrep/deep edit/Cranelift | 9.2 s | 1286 ms |

The dynamic app executable is 7.7 MB, but its dependency dylib occupies approximately 58 MiB on disk, before the Rust standard library. This moves bytes into shared libraries; executable size alone does not measure deployment savings. Its quick-exit run took median 40.3 ms, versus historical default 18.6 ms; the uncontrolled runs cannot establish a causal startup penalty.

## Reproduce and interpret

Run from `experiments/compile_speed`:

```sh
timeout 300s ./setup.sh
timeout 300s python3 bench.py default check mold debug_line_tables dylib cranelift
```

Setup fetches mold 3.0.0, wild 0.10.0, ripgrep 15.1.0, and current nightly with Cranelift. Pin toolchain and dependency lockfiles before claiming reproducibility across dates. The benchmark changes only markers in disposable `work/` sources. `rg_deep` edits a dependency, so its time includes downstream rebuilding. `check` omits code generation/linking and does not produce a runnable program. Binary timing checks successful execution, not application semantics or production performance.

The tested Cranelift invocation uses `cargo +nightly build --config 'build.rustflags=["-Zcodegen-backend=cranelift"]'`; setup installs the matching `rustc-codegen-cranelift` component. The [backend's official README](https://github.com/rust-lang/rustc_codegen_cranelift) states: “The Cranelift codegen backend is distributed in nightly builds on Linux, macOS and x86_64 Windows.”

The dylib runner now discovers the standard library with `rustc --print target-libdir`; the previous `sysroot/lib` path caused loader failures. Commands have a 120-second individual limit; an outer timeout bounds the full run.

## Official sources and remaining work

Rust's [codegen options](https://doc.rust-lang.org/rustc/codegen-options/index.html#prefer-dynamic) say: “By default, `rustc` prefers to statically link dependencies.” The same section describes dynamic linking as conditional on available static/dynamic libraries. A dependency dylib groups already compiled dependencies, but does not remove parsing, checking, generic instantiation, or linking the edited app.

Agent recommendation: retain incremental compilation, measure mold with the actual project, and choose line-table debug information when local-variable inspection is unnecessary. Run an isolated, randomized configuration comparison before choosing defaults. For substantially shorter edits, measure a small injectable module against a persistent process rather than repeatedly rebuilding the whole application; see the interactive and hot-reload experiments. Cross-crate compiler reuse or persistent compiler sessions remain research proposals here.

The [mold project](https://github.com/rui314/mold) describes it as “a high-performance drop-in replacement for existing Unix linkers”. Our benchmark selects its bundled linker driver via `-Clink-arg=-B.../libexec/mold`, with rustc's automatic lld selection disabled. The project's own performance claims do not establish performance for this workload.
