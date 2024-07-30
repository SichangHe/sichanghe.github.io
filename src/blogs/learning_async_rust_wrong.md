<!-- toc -->
# We are Learning Async Rust Wrong

A Rust conference talk recommended beginners to slap `async` on
every function and `.await` on every function call when
programming async Rust. I believe such suggestions reveal that many of
us are stuck at surface-level understanding of async Rust. However,
such phenomenon has to do with the way we get introduced to async Rust:
many of us were fooled too much when we started learning async,
we patched our understandings as we hit confusing walls.
Instead,
I believe we should adequately explain to newcomers the important bits of
async Rust in the first place.

## Lies: a common learning path

A primary reason people get started with async Rust is to
use certain libraries. This is the most prominent in web-related endeavors.
Consider the following scenario for a Python developer:

Having heard that Rust is fast like C++ without the SegFault,
you recently learned some basic Rust. Soon,
one of your Rust scripts needs to make HTTP requests,
so you naturally search for a library akin to Python's [Requests].
You find [Reqwest], which uses this async/await syntax in its examples.
"Okay," you think, "guess I need to learn this new async await thing." So,
you search for how to use async await in Rust and find [Tokio].

In fact, most developers either do Python or JavaScript.
Then, consider this other scenario for a Node.js developer:

To test Rust as an alternative to Node.js,
you start a new web backend in Rust. You search for Rust backend frameworks and
find [Actix] and [Axum], both uses async/await. "Ha!" you think, "I know this.
This is basically the same as async await in JavaScript."

In either case,
you get the impression that
async/await is this slightly annoying special syntax that you stick on top of
regular code to make them run "asynchronously"… whatever that means.
If you are a legitimate learner,
you may read the Tokio tutorial and [the Async Book][async-book].
These valuable resources teach you several important facts:

- Async Rust needs a runtime.
- Async Rust is only suitable for doing many things at once,
    not for CPU-bound tasks.
- You need to leverage synchronization primitives and adhere to
    thread safety.

<!-- TODO: Double check async guides to see if they cover blah. -->

However, you probably also overlook several fundamental ideas of async Rust,
which would bite you in the future either in programming or performance.

## The missing lessons

<!-- TODO: Below is in one of my email drafts. Revision needed. -->

I now understand that the key point in async is yielding the control back to
the runtime (`Future` returning `Poll::Pending` when polled).
This is an overhead, but it enables two very nice things:

1. Cooperative scheduling.
    One task cannot block for too long, all tasks ideally get to be run.
1. Cancellation.
    When the runtime gets back the control,
    it can then apply cancellation or check the other branches of `select!`.

It also revealed why Rust would always suck compared to
Erlang—cancellation is not free.

- In Erlang, when you kill a process,
    it dies immediately or runs the traps-exit code.
- In Rust, you cannot kill a thread (big sucker!),
    so you need to code the thread to constantly check whether it should stop.
- In Tokio, you can "cancel" a task,
    but it only *may* get stopped when it yields the control back to
    the runtime.

If you have a sucker async function that runs for
a whole millisecond before it yields,
it surely will eat a whole millisecond as soon as it starts.
This means any async function needs to be carefully written,
with lots of yield points inserted (using `yield_now()`),
and all heavy sync functions need to be wrapped in either `spawn_blocking` or
`block_in_place` plus a `yield_now()` (I have tested,
`block_in_place` does not yield).

[Actix]: https://actix.rs/
[async-book]: https://rust-lang.github.io/async-book/
[Axum]: https://github.com/tokio-rs/axum
[Requests]: https://requests.readthedocs.io/en/latest/
[Reqwest]: https://docs.rs/reqwest/latest/reqwest/
[Tokio]: https://tokio.rs
