# FSL-105 sign classifier

Trained on FSL-105 (Tupal, 2023, CC BY 4.0, DOI 10.17632/48y2y99mb9.2), dataset train split; evaluated once on its test split.

- top-1: 0.9601
- top-5: 0.9977
- clips: 1534 train, 170 validation, 426 test

## Weakest signs (test accuracy)

- AUGUST: 0.20
- SEVEN: 0.50
- SEPTEMBER: 0.50
- YOURE WELCOME: 0.75
- DON’T KNOW: 0.75
- FOUR: 0.75
- JULY: 0.75
- GRANDMOTHER: 0.75
- UNCLE: 0.75
- PARENTS: 0.75

## Most common confusions (true -> predicted)

- AUGUST -> NOVEMBER: 2
- AUGUST -> APRIL: 2
- SEVEN -> FOUR: 2
- DON’T KNOW -> FISH: 1
- SEPTEMBER -> NOVEMBER: 1
- FOUR -> SEVEN: 1
- SEPTEMBER -> OCTOBER: 1
- NOVEMBER -> OCTOBER: 1
- YOURE WELCOME -> CORRECT: 1
- JULY -> JUNE: 1
