use vstd::prelude::*;

// 🧑 "Also have it do the program verification, Verus stuffs"
verus! {
proof fn append_preserves_prefix(old: Seq<u8>, chunk: Seq<u8>)
    ensures
        (old + chunk).len() == old.len() + chunk.len(),
        (old + chunk).subrange(0, old.len() as int) == old,
{
    assert((old + chunk).subrange(0, old.len() as int) =~= old);
}

proof fn stateful_work_bound(bytes: nat, chunks: nat)
    ensures bytes + chunks <= 2 * bytes + chunks,
{
}

proof fn repeated_prefix_cost(n: nat)
    requires n >= 3,
    ensures n * (n + 1) > 2 * n,
{
    assert(n * n >= n) by(nonlinear_arith)
        requires n >= 3;
    assert(n * (n + 1) > 2 * n) by(nonlinear_arith)
        requires n >= 3;
}
}
fn main() {}
