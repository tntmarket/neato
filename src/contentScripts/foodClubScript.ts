const accountCreationDate = new Date(2022, 8, 20);
const accountDaysOld = Math.floor(
    (Date.now() - accountCreationDate.getTime()) / (1000 * 60 * 60 * 24),
);
const maxBet = 50 + 2 * accountDaysOld;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.vm.maxBet = maxBet;
