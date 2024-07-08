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
 * Run promises as pool.
 * @param {any[]} args The arguments for the function fn.
 * @param {Function} fn The function to process asynchronously.
 * @param {number} limit The pool limit.
 * @returns The outputs of the functions.
 */
async function promisePool(args, fn, limit) {
    return new Promise((resolve) => {
        const argQueue = [...args].reverse();

        let count = 0;
        const outs = [];

        const pollNext = () => {
            if (argQueue.length === 0 && count === 0) {
                resolve(outs);
            } else {
                while (count < limit && argQueue.length) {
                    const index = args.length - argQueue.length;
                    const arg = argQueue.pop();
                    count++;
                    const out = fn(arg);
                    const processOut = (out, index) => {
                        outs[index] = out;
                        count -= 1;
                        pollNext();
                    };
                    if (typeof out === 'object' && out.then) {
                        out.then(out => processOut(out, index));
                    } else {
                        processOut(out, index);
                    }
                }
            }
        };

        pollNext();
      });
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

    const process = async user => {
        const { stdout, stderr } = await exec(`aws iam list-groups-for-user --user-name ${user} --query "Groups[].GroupName" --output text`);
        progress(++done / users.length);
        return { user, groups: stdout.split("\t") }
    }

    const userGroups = await promisePool(users, process, MAX_SHELL);
    log("Requesting groups [OK]");

}

const MAX_SHELL = 10;
getUsers();