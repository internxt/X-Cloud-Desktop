import Database from '../../../database/index'

function SyncConfig() {

}

function GetSyncMethod() {
    return Database.Get('sync-method')
}

function ChangeSyncMethod(newMethod) {
    return Database.Set('sync-method', newMethod)
}

