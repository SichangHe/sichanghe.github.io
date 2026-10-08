# Dependency bloat: measured choices
(authored by agents unless marked 🧑)

Feature selection and a smaller regex implementation are useful first steps. Forking Tokio is a research project with compatibility costs; the measurements below do not establish that it is needed.

## Scope and method

Measured on 2026-10-06, Linux x86-64, rustc 1.97.1, LLVM 22.1.6. Each generated application calls the dependency rather than merely declaring it. Independent, initially absent target directories; downloaded registry sources already cached; two Cargo build jobs. Profile: release with `opt-level="z"`, fat LTO, one codegen unit, aborting panics, stripped binaries. Times are single observations, not statistical estimates. Other agents built concurrently, and filesystem caches remained warm. These are dependency-cold builds, not cold machines.

`target` bytes are the sum of file lengths, not allocated disk blocks. They include build intermediates. Binary bytes are complete stripped executable sizes, including Rust/std baseline. Different workloads cannot establish a runtime ranking. Results say nothing about debug-build incremental latency. Exact transitive versions remain in local ignored locks; the checked-in report preserves only direct versions. These numbers cannot be reconstructed exactly from the public repository alone.

Run `python3 experiments/dependency_bloat/measure.py CASE...`; cases come from `gen_cases.py`. Set `CARGO_HOME` to an already populated registry cache or fetch each generated manifest first. Successful binaries are run with a 15-second limit. The runner rejects pre-existing targets to avoid accidentally reporting warm builds. Generated manifests, locks, binaries and logs stay under ignored `cases/`; resolved versions below are retained in this document.

## Observations

Sizes in bytes; time in seconds. Versions: shame 0.0.4, regex 1.13.1, regex-lite 0.1.9, tracing-subscriber 0.3.23, chrono 0.4.45, time 0.3.55, Tokio 1.53.1. Check the generated locks if your registry resolves different versions.

| case | build s | binary bytes | target bytes |
|---|---:|---:|---:|
| hello | 3.542 | 290224 | 582845 |
| shame | 29.095 | 1795480 | 85163139 |
| regex | 18.295 | 1500872 | 32509119 |
| regex-lite | 4.631 | 360264 | 2440735 |
| tracing + env filter | 17.909 | 767408 | 47921494 |
| tracing, fmt/std only | 9.499 | 389120 | 32550145 |
| chrono, defaults | 6.635 | 393768 | 10774797 |
| time, UTC parse/format | 6.533 | 306704 | 19483701 |
| time, local-offset/custom format | 8.042 | 325072 | 31377961 |
| Tokio, rt only | 5.238 | 344904 | 5459624 |
| Tokio, rt-multi-thread/sync/time | 7.538 | 421400 | 10191297 |
| Tokio, full | 15.408 | 453096 | 56492379 |
| Tokio, common network/file APIs | 14.155 | 446144 | 51422553 |

Tokio full and selected-feature cases execute identical runtime/channel/timer code. Narrowing enabled features reduced binary bytes by 7%, intermediate bytes by 82%, and this observed build time by 51%. Binary linking already drops much unused code; enabled APIs can still cost substantial compilation artifacts. The common-network case additionally binds a listener and obtains file metadata, so it is a different workload. smol did not resolve from the offline cache and was not measured; no runtime ranking is claimed.

The two regex cases execute the same dynamic-pattern match. regex-lite cut the complete binary by 76% and this observed build time by 75%. This is a functionality/performance tradeoff. Its author describes the priority as “smaller binary sizes and shorter Rust compile times over performance and functionality.” Unicode property matching and Unicode case folding differ; benchmark the application's patterns before substituting it. [regex-lite documentation](https://docs.rs/regex-lite/latest/regex_lite/)

The tracing pair changes both features and configuration: regex-based environment filtering versus a fixed INFO threshold. Binary size nearly halves, but filtering behavior changes. This does not isolate the cost of one Cargo feature.

## shame: feature-gate before forking

The [author's manifest](https://github.com/SichangHe/shame.rs/blob/main/Cargo.toml) says: “Commonly used utilities to trade performance and compilation time for development velocity.” It unconditionally depends on anyhow, derive-new, derive-where, derive_everything, pub-fields, regex, thiserror, tracing and tracing-subscriber. The [prelude](https://github.com/SichangHe/shame.rs/blob/main/src/prelude.rs) initializes a formatter with `EnvFilter::from_default_env()`. The measured shame program uses regex, tracing initialization, and anyhow errors. It does not exercise every re-export.

Recommendation: add optional groups for regex, tracing initialization, and derive macros; retain current defaults for compatibility. Offer a simple fixed-level tracing initializer and an explicit regex-lite option. Measure a real shame consumer's actual regex patterns and requested tracing filters before replacing defaults. Procedural macros can add compile dependencies without remaining in a final executable. Removing unused imports alone does not remove manifest dependencies from compilation.

## time: requirements determine the replacement

chrono and time examples parse RFC3339, add one day, and format timestamps. chrono also obtains local time and formats a custom calendar pattern; time_min uses UTC and RFC3339 only. Thus their 393768 versus 306704 byte sizes do not prove time wins on equal functionality. time_min also leaves more intermediate bytes in this run. A smaller executable does not imply less compilation storage.

The time authors document `local-offset`: “This feature enables a number of methods that allow obtaining the system’s UTC offset.” [time feature documentation](https://docs.rs/time/latest/time/)

Recommendation: use time for UTC timestamps, parsing, durations and calendar arithmetic when its API suffices. A small application wrapper can cover repeated formatting needs. A timezone offset is not a named timezone with historical/future transition rules. Applications needing those rules require a timezone database and an explicit requirement list before removing chrono/chrono-tz. The time case with local-offset intentionally falls back to UTC if local-offset discovery fails; consumers must decide whether that behavior is acceptable.

## Tokio compatibility and size

Tokio's authors say: “By default, Tokio does not enable any features but allows one to enable a subset for their use case.” [Tokio feature documentation](https://docs.rs/tokio/latest/tokio/#feature-flags)

Select features from actual APIs; inspect `cargo tree -e features -i tokio` in the whole application, because another dependency may enable more. Use a current-thread runtime for workloads that do not require parallel task execution; this alters scheduling and cannot replace all multithreaded applications. The rt-only case just spawns and joins. The selected-feature case uses a multithread runtime, a channel, and a timer; the size difference also includes those extra behaviors.

Pretending to be Tokio requires matching its types and runtime contracts, not just package names. Network/timer operations may rely on runtime context. A Cargo patch replacing Tokio would need the features and APIs demanded by the complete dependency graph. Upstream-compatible narrowing is a smaller first experiment than a new runtime fork.

async-compat's authors state: “the future will manually enter the context of a global tokio runtime.” Its adapter retains Tokio runtime context while another executor polls a future; it does not erase Tokio from the dependency graph. [async-compat documentation](https://docs.rs/async-compat/latest/async_compat/)

Recommendation: measure a real network client with narrowly selected Tokio features, then compare an alternative implementation with the same protocol and workload. Track binary bytes, artifact bytes, compile latency, throughput, tail latency and task observability separately. No result here establishes that smol or a custom executor can transparently replace Tokio across its ecosystem.
