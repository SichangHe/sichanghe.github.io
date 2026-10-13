use vstd::prelude::*;

// 🧑 "Also have it do the program verification, Verus stuffs"
verus! {
proof fn replacing_buffer_loses_prefix()
{
    let old = seq![1u8];
    let chunk = seq![2u8];
    assert(chunk.subrange(0, old.len() as int) == old);
}
}
fn main() {}
