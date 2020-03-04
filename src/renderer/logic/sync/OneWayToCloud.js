import async from 'async'
import Logger from '../../../libs/logger'
import watcher from '../watcher'

/*
 * Sync Method: One Way, from LOCAL to CLOUD (Only Upload)
 */

const SYNC_METHOD = '1way-toCloud'
let isSyncing = false
let wtc = null

function SyncLogic(callback) {
    async.waterfall([
        // Start the watcher
        next => {

        }
    ], (err, results) => {
        if (callback) { callback(err, results) }
    })
}

function Monitor() {

}

export default {
    SYNC_METHOD
}