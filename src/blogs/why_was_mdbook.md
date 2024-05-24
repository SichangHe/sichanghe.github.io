<!-- toc -->

<!-- TODO: This is a draft. -->

# Why Was mdBook-KaTeX in a Mess and How did I Clean It Up—Celebrating mdBook-KaTeX v0.5

## Prelude

With the release of mdBook-KaTeX v0.5, I have finally cleaned up the mess it was in:

- The fake KaTeX renderer support is finally dropped, so [issue 68](https://github.com/lzanini/mdbook-katex/issues/68), opened three months ago, was closed as completed.
- [Tokio](https://crates.io/crates/tokio) and many other dependencies have been removed, [reducing over 1000 lines in `Cargo.lock`](https://github.com/lzanini/mdbook-katex/pull/88). In stead, we now use [Rayon](https://crates.io/crates/rayon) for the parallelism.

So, the questions come:

- Why was mdBook-KaTeX in a mess?
- Why did it have a fake renderer?
- Why was it using Tokio?

## What mdBook-KaTeX does in a nutshell

<!-- TODO: Summarize -->

---

*2023-05-31*
