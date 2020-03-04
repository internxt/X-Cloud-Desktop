import async from 'async'
import Logger from '../../../libs/logger'

/*
 * Sync Method: One Way, from CLOUD to LOCAL (Only Download)
 */

const SYNC_METHOD = '1way-toLocal'
let isSyncing = false

function SyncLogic(callback) {
    async.waterfall([
        // Get the remote tree
        next => {

        }
    ], (err, results) => {
        if (callback) { callback(err, results) }
    })
}

export default {
    SYNC_METHOD
}