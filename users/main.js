/**
 * @file Asynchronous user fetcher.
 * @version 1.0.0
 * @author Kevin Fedyna
 */

const { promisify } = require("node:util");
const exec = promisify(require("node:child_process").exec);
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
    
    const { stdout, stderr } = await exec(`aws iam list-users --query 'Users[].UserName' --output text`);
    const users = stdout.split("\t");

    log("Requesting users [OK]");
    log("Requesting groups...");

    let userGroupsPromises = [];
    let done = 0;
    
    let indices = new Array(MAX_SHELL);


    for (let user of users) {
        const promise = fetch(`https://us-east-1.console.aws.amazon.com/iam/home?region=eu-west-1#/users/details/${user}?section=groups`);
        userGroupsPromises.push(promise.then(({ stdout, stderr }) => {
            progress(++done / users.length);
            return { user, groups: stdout.split("\t") }
        }));
    }

    const userGroups = await Promise.all(userGroupsPromises);
    log("Requesting groups [OK]");

}

const MAX_SHELL = 10;

async function test() {
    const client = new IAMClient();
    const input = {};
    const command = new ListUsersCommand(input);
    const response = await client.send(command);
    console.log(response);
}

test()