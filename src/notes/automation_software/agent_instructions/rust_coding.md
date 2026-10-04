Pass clippy, cargo fmt.

NEVER EVER `.unwrap`; `.expect` ONLY EVER when it should crash.

Try to keep compilation fast. Try to use as few dependencies as possible.
Extract and vendor relevant code as suitable if only need a small subset of
a dependency.

Avoid complex types.
Strongly prefer enum over trait, especially avoid async generics.
Use things like `tokio_gen_server` as suitable, instead of trait objects.
When suitable, use find-replace scripts to duplicate code instead of
overcomplicated generics if there are only a few cases.
Box things if that removes overly complex lifetime and
no profiling shows it's a bottleneck.
