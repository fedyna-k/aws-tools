/**
 * @file Asynchronous user fetcher.
 * @version 1.0.0
 * @author Kevin Fedyna
 */

const { promisify } = require("node:util");
const exec = promisify(require("node:child_process").exec);

/**
 * Get all users that match provided groups. 
 * @param {string[]} groups The groups filter.
 */
async function getUsers(groups) {
    const { stdout, stderr } = await exec(`aws iam list-users --query 'Users[].UserName' --output text`);
    const emails = stdout.split("\t");

    console.log(emails);
}

getUsers();