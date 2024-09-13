# `mdbook-katex`

20230315

## What and why I use it

As I progressed in developing the 2022 DKU iGEM Wiki using mdBook,
I realized that the iGEM competition requires that all content be hosted on
iGEM,
so using MathJax from a CDN was technically against the rules.
Instead of hosting a MathJax ourselves,
I tended to another option I found—compiling math expressions into HTML
using KaTex, provided by mdBook plugin `mdbook-katex`.
Previously, my notes have already being using it,
so I was confident that it works well.

Advantages above MathJax:

- No need to write weird `\\(` delimiters, just use `$` and `$$`.
- Page load is fast.
- No jumping around when reloading when doing `mdbook serve`.

## The project was in a bad condition

It was November 2022, the owner of `mdbook-katex`, lzanini,
had not made any updates on the project for a year.

The last stable release it has was 0.2.10,
the CI started failing after that and never got fixed.
Despite that, another contributor, Matthewacon, added many features.
Therefore, the README suggested users to install `mdbook-katex` via
Cargo and Git:

```shell
cargo install --git "https://github.com/lzanini/mdbook-katex"
```

There were also several very old issues lying there,
such as math blocks breaking tables and code blocks.
Pull requests were made, but they got no response neither.

The option `static-css` was extremely slow for me,
taking around 20 seconds on my slow network.
I later would find out that I was downloading all the fonts twice
every time the book gets rebuilt.

I posted an issue asking whether the repo was being maintained.
That issue got no response.

## `mdbook-katex2`

I decided that I should fork the project and maintain it myself because I
relied on it.

An issue with a simple fork would be that I could not `cargo install` it.
Cargo has a "first come first server" policy so that new packages can never
take old packages' name.
I still wanted to have my fork on crates.io so I changed the package name to
`mdbook-katex2`.

I did many tries to fix the CI on my fork,
creating an array of "CI failed" message in my mailbox,
and eventually got the CI to pass.

I published the crate and people could install it using just Cargo and no Git.
So, I opened [an issue introducing `mdbook-katex2` and thanking the original
author](https://github.com/lzanini/mdbook-katex/issues/37).

To my surprise, that issue lead to a speedy response from lzanini.
The original author offered to add me as a collaborator so I can maintain the
original repository.
They argued that it would be more convenient for the users.

It turned out quite well, in my opinion.
I accepted the collaborator invitation and started to maintain `mdbook-katex`.
