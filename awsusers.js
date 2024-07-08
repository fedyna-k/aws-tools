/**
 * @file Asynchronous user fetcher.
 * @version 1.0.0
 * @author Kevin Fedyna
 */

const writeFileSync = require("fs").writeFileSync;
const { IAMClient, ListUsersCommand, ListGroupsForUserCommand } = require("@aws-sdk/client-iam");

/**
 * Prints log with custom tag.
 * @param  {...any} data The data to log.
 */
function log(...data) {
    console.log("\x1b[1m\x1b[93m[awsusers.js]\x1b[0m  ", ...data);
}

/**
 * Prints progress bar.
 * @param  {number} percentage The percentage of progress from 0 to 1.
 */
function progress(percentage) {
    let full = Math.floor(percentage * 50);
    process.stdout.write(`\r\x1b[1m\x1b[93m[awsusers.js]\x1b[0m   [${"#".repeat(full)}${".".repeat(50 - full)}] (${(percentage * 100).toFixed(1)}%)`);

    if (percentage == 1) {
        console.log("");
    }
}

/**
 * Get all AWS users.
 * @returns {string[]} The list of all users.
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

    log(`${users.length} users fetched.`);
    log("Requesting users [OK]");
    return users;
}

/**
 * Get all user groups asynchronously.
 * @param {string[]} users The list of all users.
 * @returns {string[][]} The list of all groups 
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
    
    // Send batch of size MAX_SOCKET
    while (usersCopy.length) {
        const responses = await Promise.all(usersCopy.splice(0, MAX_SOCKET).map(requestUserGroup));
        const responsesGroups = responses.map(response => response.Groups.map(group => group.GroupName));
        groups = groups.concat(responsesGroups);

        progress(groups.length / users.length);
    }

    log("Retreiving users groups [OK]");
    return groups;
}

/**
 * Filter users according to given users filters.
 * @param {string[]} users The user list.
 * @param {string[]} filters the filter list (regex).
 * @returns The filtered users.
 */
function filterUsers(users, filters) {
    const regexFilters = filters.map(filter => new RegExp(filter));
    return users.filter(user => 
        regexFilters.reduce((matching, filter) => user.match(filter) != null || matching, false));
}

/**
 * Filter users according to given groups filters.
 * @param {string[]} users The user list.
 * @param {string[][]} groups The groups associated to users.
 * @param {string[]} filters the filter list (regex).
 * @returns The filtered users.
 */
function filterByGroups(users, groups, filters) {
    const regexFilters = filters.map(filter => new RegExp(filter));
    return users.filter((user, index) =>
        groups[index].reduce((matchingGroup, group) =>
            regexFilters.reduce((matching, filter) => group.match(filter) != null || matching, false) || matchingGroup, false));
} 

/**
 * Read the CLI args and return help message if unable to parse.
 * @param {string[]} args The CLI args.
 * @returns {[string[], string[]]} The user and group filters.
 */
function readArgs(args) {
    const help = () => {
        log("Usage: node awsusers.js [-u <...usernames>] [-g <...groups>]");
        log("Arguments:");
        log("   usernames: regex matching user names.");
        log("   group:     regex matching group names.");
        process.exit(0);
    }

    let userFilters = [];
    let groupFilters = [];
    let inUser = false;
    let inGroup = false;

    for (let arg of args) {
        if (arg == "-u") {
            inUser = true;
            inGroup = false;
        } else if (arg == "-g") {
            inGroup = true;
            inUser = false;
        } else if (inUser) {
            userFilters.push(arg);
        } else if (inGroup) {
            groupFilters.push(arg);
        } else {
            help();
        }
    }

    if (inUser && userFilters.length == 0 || inGroup && groupFilters.length == 0) {
        help();
    }

    return [ userFilters, groupFilters ];
}

/**
 * Main function to run.
 * @param {string[]} args The CLI args. 
 */
async function main(args) {
    const [ userFilters, groupFilters ] = readArgs(args);

    let users = await getUsers();

    if (userFilters.length) {
        users = filterUsers(users, userFilters);
        log(`${users.length} users with matching name.`);
    }
    
    if (groupFilters.length) {
        const groups = await getUsersGroups(users);
        users = filterByGroups(users, groups, groupFilters);
        log(`${users.length} users with matching groups.`);
    }
    
    log("Generating CSV output file...")
    users = users.map(user => `${user},https://www.office.com/search?q=${user}`);
    writeFileSync("awsusers.csv", users.join("\n"));
    log("Generating CSV output file [CREATED awsusers.csv]")
}

const MAX_SOCKET = 10;  // Optimum bucket size to avoid throttling
const client = new IAMClient();
main(process.argv.slice(2));