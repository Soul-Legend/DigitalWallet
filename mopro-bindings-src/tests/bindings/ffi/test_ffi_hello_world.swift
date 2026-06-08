import Foundation
import mopro_bindings

let helloWorld = moproHelloWorld()
assert(helloWorld == "Hello, World!", "Test string mismatch")
