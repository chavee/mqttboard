import localforage from 'localforage';
import Q from 'q';
import _ from 'lodash';

class FolderDbWorker {

    constructor() {
        this.db = localforage.createInstance({name:"MQTT_FOLDER_SETTINGS",driver:localforage.INDEXEDDB});
    }

    saveFolder(obj) {
        Q.invoke(this.db,'setItem',obj.folderId,obj).done();
    }

    getAllFolders() {
        var folders = [];
        return Q.invoke(this.db,'iterate',
            function(value, key, iterationNumber) {
                folders.push(value);
            }
        ).then(function() {
            return _.sortBy(folders, ['order']);
        });
    }

    deleteFolder(folderId) {
        return Q.invoke(this.db,'removeItem',folderId).done();
    }
}

export default new FolderDbWorker();