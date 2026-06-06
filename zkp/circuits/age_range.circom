pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

template AgeRange() {
    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;
    signal input threshold;

    // Calculate age difference in years
    signal yearDiff;
    yearDiff <== currentYear - birthYear;

    // We want to know if current date is before birth date in the current year.
    // That happens if: currentMonth < birthMonth OR (currentMonth == birthMonth AND currentDay < birthDay)
    
    component isMonthLess = LessThan(8);
    isMonthLess.in[0] <== currentMonth;
    isMonthLess.in[1] <== birthMonth;

    component isMonthEq = IsEqual();
    isMonthEq.in[0] <== currentMonth;
    isMonthEq.in[1] <== birthMonth;

    component isDayLess = LessThan(8);
    isDayLess.in[0] <== currentDay;
    isDayLess.in[1] <== birthDay;

    signal monthEqAndDayLess;
    monthEqAndDayLess <== isMonthEq.out * isDayLess.out;

    signal isBeforeBirthdayThisYear;
    isBeforeBirthdayThisYear <== isMonthLess.out + monthEqAndDayLess - (isMonthLess.out * monthEqAndDayLess);

    // Actual age
    signal actualAge;
    actualAge <== yearDiff - isBeforeBirthdayThisYear;

    // Check actualAge >= threshold
    component isAgeValid = GreaterEqThan(8); // GreaterEqThan is not in standard circomlib, we should use GreaterEqThan or check standard naming
    isAgeValid.in[0] <== actualAge;
    isAgeValid.in[1] <== threshold;

    isAgeValid.out === 1;
}

component main {public [currentYear, currentMonth, currentDay, threshold]} = AgeRange();
