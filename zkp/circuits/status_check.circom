pragma circom 2.0.0;

template StatusCheck() {
    signal input status;
    signal input expected;

    // Constrain that status equals expected
    status === expected;
}

component main {public [expected]} = StatusCheck();
