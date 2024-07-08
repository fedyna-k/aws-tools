/**
 * @file Asynchronous user fetcher.
 * @version 1.0.0
 * @author Kevin Fedyna
 */

const { promisify } = require("node:util");
const exec = promisify(require("node:child_process").exec);


/**
 * Prints log with custom tag.
 * @param  {...any} data The data to log.
 */
function log(...data) {
    console.log("\x1b[1m\x1b[93m[group audit]\x1b[0m  ", ...data);
}


/**
 * Get all users that match provided groups. 
 * @param {string[]} groups The groups filter.
 */
async function getUsers(groups) {
    log("Requesting users...");
    const { stdout, stderr } = await exec(`aws iam list-users --query 'Users[].UserName' --output text`);
    const emails = stdout.split("\t");

    log("Requesting users [OK]");
    log("Requesting groups...");

    console.log(emails);
}

getUsers();