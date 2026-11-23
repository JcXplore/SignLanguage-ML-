# FSL-105 sign classifier

Trained on FSL-105 (Tupal, 2023, CC BY 4.0, DOI 10.17632/48y2y99mb9.2), dataset train split; evaluated once on its test split.

- top-1: 0.9765
- top-5: 0.9953
- clips: 1534 train, 170 validation, 426 test

## Weakest signs (test accuracy)

- SEVEN: 0.50
- YOURE WELCOME: 0.75
- FAST: 0.75
- JUNE: 0.75
- WEDNESDAY: 0.75
- AUNTIE: 0.75
- PARENTS: 0.75
- GRAY: 0.75
- NOVEMBER: 0.80
- GOOD MORNING: 1.00

## Most common confusions (true -> predicted)

- SEVEN -> FOUR: 2
- JUNE -> SEPTEMBER: 1
- NOVEMBER -> SEPTEMBER: 1
- GRAY -> DAUGHTER: 1
- AUNTIE -> YELLOW: 1
- YOURE WELCOME -> NICE TO MEET YOU: 1
- PARENTS -> UNCLE: 1
- WEDNESDAY -> SIX: 1
- FAST -> DEAF: 1
