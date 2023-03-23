import { $All } from "@src/util/domHelpers";

const accountCreationDate = new Date(2022, 8, 20);
const accountDaysOld = Math.floor(
    (Date.now() - accountCreationDate.getTime()) / (1000 * 60 * 60 * 24),
);
const maxBet = 50 + 2 * accountDaysOld;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.vm.maxBet = maxBet;

function printTotalEarnings() {
    const earningDistributionTable = $All("#el > table:nth-child(12) table")[1];

    const tableRows = earningDistributionTable.querySelectorAll("tr");

    let totalEarnings = 0;
    Array.from(tableRows)
        .slice(1)
        .forEach((row) => {
            const winnings = parseInt(row.querySelectorAll("td")[0].innerText);
            const probability = parseFloat(
                row.querySelectorAll("td")[1].innerText,
            );
            const earnings = Math.round((winnings * probability) / 100);

            totalEarnings += earnings;

            const earningsColumn = document.createElement("td");
            earningsColumn.innerText = earnings.toString();
            row.append(earningsColumn);
        });

    const earningsHeader = document.createElement("th");
    earningsHeader.innerText = `Total (${totalEarnings})`;
    tableRows[0].append(earningsHeader);
}

setTimeout(printTotalEarnings, 1000);
