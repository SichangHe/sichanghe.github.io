<!-- toc -->
# We are Learning Async Rust Wrong
<!-- TODO: Change to "I was?" -->

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
use certain libraries.
This is the most prominent if you try Rust for web-related endeavors.
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
you get the impression that async/await is this special syntax that
you stick on top of regular code to make them run "asynchronously"…
whatever that means.
If you are a legitimate learner,
you may read the Tokio tutorial and [the Async Book][async-book]
instead of merely watching videos online.
These valuable resources teach you additional important "caveats", including:

- Running async Rust requires a runtime.
- Async Rust is only suitable for doing many things at once,
    not for CPU-bound tasks.
- You need to leverage synchronization primitives and adhere to
    thread safety (hello `Send + Sync + 'static`).

<!-- TODO: Double check async guides to see if they cover blah. -->

However, you probably also miss several fundamental ideas of async Rust,
which would bite you in the future either in programming or performance.

## The missing context for async

As async Rust becomes more prominent,
more and more people start doubting whether it brings more value than troubles.
Common criticism include:

1. High programming complexity when lifetime or generics are involved.\
    E.g., lots of tricky trait bounds are needed;
    the error messages are contrived.
1. Difficulty in performance debugging.\
    E.g., arbitrary functions can bottleneck the system,
    and it is hard to reason about.
1. Poor integration with synchronous code.\
    E.g., confusing panics when running blocking code in async context.

With all these overhead, one would naturally wonder if async Rust is worth it.
Many even argue that going "asynchronous" is only worth it if
you have extreme concurrency loads, and that operating system (OS)
threads suit most applications better.
To understand these concerns, we need a clearer context for async Rust.

The key point of async is yielding the control back to the runtime
(`Future` returning `Poll::Pending` when polled).
Although yielding is an overhead, it enables two superb features:

1. Cooperative scheduling.\
    One task cannot block for too long; all tasks get a chance to run soon.
1. Cancellation.\
    When the runtime gets back the control, it can then apply cancellation,
    check other branches of `select!`, etc.

Now, to understand the nicety of these features,
let's consider Erlang's preemptive scheduling,
since async Rust shares many goals with it.
Erlang powered soft massive-scale real-time systems such as
telephone services and WhatsApp.
It has OS-like preemptive scheduling over lightweight green threads called
Erlang processes. Therefore, every Erlang process soon gets a chance to run.
Bad Erlang processes never block the whole system.
These guarantees enable services like telephone to
function during massive overload periods, albeit slower.
Additionally, you can terminate any Erlang process,
and it would exit immediately unless it traps exit
(in which case you can "brutal kill" it),
providing the ultimate developer-friendly and reliable cancellation.
In summary, to support massively concurrent real-time systems,
Erlang's OS-like preemptive scheduling optimizes for minimum latency and
reliability.

Now, comparing Erlang's scheduling to Rust without async,
you would see the significant gap in between.
While Erlang is built from the ground up to
achieve preemptive scheduling using a virtual machine,
Rust cannot even afford a runtime in the language.
Additionally,
Rust offers heavyweight OS threads that cannot be terminated from
other threads, a big sucker!
Hence, to get the niceties of async scheduling,
Rust's users are bound to make some sacrifices in terms of ease of development.

## The missing lessons

If Rust fundamentally does not support preemptive scheduling or
thread termination in the language,
how can it achieve features similar to Erlang's?
This brings the core idea of async Rust: you, the programmer,
bears the responsibility to make your program suitable for
cooperative scheduling!

- Using data structures that implement the `Future` trait,
    you specify tasks that can be suspended.
- To complete these tasks, you continuously try to execute ("poll") them.

That is the core of async Rust programming!
`Future` provides a common interface for tasks that can be suspended,
so that your code can yield control back to its caller, usually a runtime;
only then, the runtime retains control for cooperative scheduling, suspension,
and cancellation.

The runtime cannot achieve these features if your code does not yield!
This fact brings several often missing yet important lessons:

- The benefits async Rust brings are not for free.\
    To emulate preemptive scheduling and immediate cancellation,
    each yield point must be close to each other.
    Thus,
    you need to meticulously insert yield points in suitable places of
    your async code, a daunting task that demands experience.
- A single blocking function can break the benefits of async Rust!\
    If you have a sucker async function that runs for
    a whole millisecond before it yields,
    it surely will eat a whole millisecond as soon as it starts.

The async/await syntactic sugar, albeit eases programming,
obfuscates async Rust's actual underlying mechanism for beginners.
In handwritten structures that implements `Future`,
yield points are obvious—they are when you return `Poll::Pending`.
In contrast, the async/await syntax hides yield points from programmers.
Consequently, most beginners have no idea what a yield point is;
even those who know the concept often hold this mistake that
calling `.await` creates a yield point, presumably from JavaScript knowledge.

<!-- TODO: This part is WIP. -->

The lack of understanding in
async Rust among beginners causes widespread mistakes that
visibly hurt their performance.
Many beginners thoughtlessly slap `async` on their functions,
and call them like regular functions but with `.await`,
just like the aforementioned conference talk depicts.

<!-- TODO: Below is in one of my email drafts. Revision needed. -->

It also revealed why Rust would always suck compared to
Erlang—cancellation is not free.

- In Tokio, you can "cancel" a task,
    but it only *may* get stopped when it yields the control back to
    the runtime.

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
