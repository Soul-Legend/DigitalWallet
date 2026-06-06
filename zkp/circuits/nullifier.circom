pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template Nullifier() {
    signal input secret;
    signal input electionId;
    signal output nullifier;

    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== secret;
    poseidon.inputs[1] <== electionId;

    nullifier <== poseidon.out;
}

component main {public [electionId]} = Nullifier();
