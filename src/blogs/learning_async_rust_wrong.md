# We are Learning Async Rust Wrong

Last year,
a conference talk on making Rust simpler for
beginners recommended slapping `async` on every function and `.await` on
every function call.
It shows a void of understanding of programming async Rust. However,
the phenomenon that most of us pause at some surface level understanding of
async Rust has to do with the way we get introduced to it and
the way we learn it.
I believe we fool our async newcomers too much and patch their understanding as
they hit confusing walls; instead,
we should adequately explain the important bits of async Rust in
the first place.

<!-- TODO: Below is in one of my email drafts. Revision needed. -->

I now understand that the key point in async is yielding the control back to
the runtime (`Future` returning `Poll::Pending` when polled).
This is an overhead, but it enables two very nice things:

1. Cooperative scheduling.
    One task cannot block for too long, all tasks ideally get to be run.
1. Cancellation.
    We the runtime gets back the control,
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
