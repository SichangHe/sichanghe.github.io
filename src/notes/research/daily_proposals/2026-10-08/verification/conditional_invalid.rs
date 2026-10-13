use vstd::prelude::*;
verus! {
proof fn check()

{ let x: int = 3; let y: int = 2; let z = if x < y { x } else { y }; assert(z == 3); }
}
fn main() {}
