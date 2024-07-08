/**
 * @file Asynchronous user fetcher.
 * @version 1.0.0
 * @author Kevin Fedyna
 */

const { IAMClient, ListUsersCommand, ListGroupsForUserCommand } = require("@aws-sdk/client-iam");

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
 * Get all AWS users.
 */
async function getUsers() {
    log("Requesting users...");
    let response;
    let users = [];
    let marker = undefined;

    do {
        const input = { Marker: marker };
        const command = new ListUsersCommand(input);
        response = await client.send(command);

        const usernames = response.Users.map(user => user.UserName);
        users = users.concat(usernames);

        marker = response.Marker;
    } while (response.IsTruncated);

    log(`${users.length} users found.`);
    log("Requesting users [OK]");
    return users;
}

/**
 * Get all user groups asynchronously.
 * @param {string[]} users The list of users. 
 */
async function getUsersGroups(users) {
    log("Retreiving users groups...");

    const requestUserGroup = async user => {
        const input = { UserName: user };
        const command = new ListGroupsForUserCommand(input);
        return client.send(command);
    };

    let groups = [];
    let usersCopy = [...users];
    
    while (usersCopy.length) {
        const responses = await Promise.all(usersCopy.splice(0, MAX_SOCKET).map(requestUserGroup));
        const responsesGroups = responses.map(response => response.Groups.map(group => group.GroupName));
        groups = groups.concat(responsesGroups);
    }

    log("Retreiving users groups [OK]");
    return groups;
}

async function main() {
    const users = await getUsers();
    const groups = await getUsersGroups(users);

    console.log(groups);
}

const MAX_SOCKET = 15;  // Throttling exceptions after this number
const client = new IAMClient();
main();