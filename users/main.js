/**
 * @file Asynchronous user fetcher.
 * @version 1.0.0
 * @author Kevin Fedyna
 */

const { IAMClient, ListUsersCommand } = require("@aws-sdk/client-iam");

/**
 * Prints log with custom tag.
 * @param  {...any} data The data to log.
 */
function log(...data) {
    console.log("\x1b[1m\x1b[93m[group audit]\x1b[0m  ", ...data);
}

/**
 * Prints progress bar.
 * @param  {number} percentage The percentage of progress from 0 to 1.
 */
function progress(percentage) {
    let full = Math.floor(percentage * 50);
    process.stdout.write(`\r\x1b[1m\x1b[93m[group audit]\x1b[0m  [${"#".repeat(full)}${".".repeat(50 - full)}] (${(percentage * 100).toFixed(1)}%)`);

    if (percentage == 1) {
        console.log("");
    }
}

/**
 * Get all users that match provided groups. 
 * @param {string[]} groups The groups filter.
 */
async function getUsers(groups) {
    log("Requesting users...");
    
    let response;
    let users = [];
    let marker = undefined;

    do {
        const input = { Marker: marker };
        const command = new ListUsersCommand(input);
        response = await client.send(command);

        users = users.concat(response.Users);
        marker = response.Marker;
    } while (response.IsTruncated);

    log("Requesting users [OK]");

    return users;
}

const client = new IAMClient();
getUsers();