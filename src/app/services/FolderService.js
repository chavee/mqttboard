import Events from 'events';
import UUID from 'node-uuid';
import _ from 'lodash';
import AppDispatcher from '../dispatcher/AppDispatcher';
import FolderConstants from '../utils/FolderConstants';
import FolderDbService from './FolderDbService';
import MqttClientActions from '../actions/MqttClientActions';
import MqttClientConstants from '../utils/MqttClientConstants';
import MqttClientService from './MqttClientService';

const DEFAULT_FOLDER_NAME = 'Default';

class FolderService extends Events.EventEmitter {

    constructor() {
        super();
        this.folders = {};
        this.foldersLoaded = false;
        this.isEnsuringDefaultFolderState = false;

        this.ensureDefaultFolderState = this.ensureDefaultFolderState.bind(this);

        this.registerToAppDispatcher();
        this.syncFolderCache();
        MqttClientService.addChangeListener(MqttClientConstants.EVENT_MQTT_CLIENT_DATA_CHANGED, this.ensureDefaultFolderState);
    }

    registerToAppDispatcher() {
        AppDispatcher.register(function(action) {
            switch(action.actionType) {
                case FolderConstants.ACTION_CREATE_FOLDER:
                    this.createFolder(action.data.name);
                    break;
                case FolderConstants.ACTION_DELETE_FOLDER:
                    this.deleteFolder(action.data);
                    break;
                case FolderConstants.ACTION_RENAME_FOLDER:
                    this.renameFolder(action.data.folderId, action.data.name);
                    break;
                case FolderConstants.ACTION_REORDER_FOLDER:
                    this.reorderFolder(action.data.folderId, action.data.newOrder);
                    break;
                default:
            }
        }.bind(this));
    }

    syncFolderCache() {
        FolderDbService.getAllFolders()
        .then(function(folders) {
            if(folders!=null && folders.length>0) {
                for(var i=0;i<folders.length;i++) {
                    this.folders[folders[i].folderId] = folders[i];
                }
            }
            this.foldersLoaded = true;
            this.ensureDefaultFolderState();
            this.emitChange();
        }.bind(this))
        .done();
    }

    createFolder(name) {
        var allFolders = _.values(this.folders);
        var maxOrder = allFolders.length > 0 ? (_.maxBy(allFolders, 'order') || {}).order || 0 : -1;
        var folder = {
            folderId: UUID.v4(),
            name: name,
            order: maxOrder + 1,
            createdOn: +(new Date())
        };
        this.folders[folder.folderId] = folder;
        FolderDbService.saveFolder(folder);
        this.emitChange();
        return folder;
    }

    deleteFolder(folderId) {
        FolderDbService.deleteFolder(folderId);
        delete this.folders[folderId];
        this.emitChange();
    }

    renameFolder(folderId, name) {
        var folder = this.folders[folderId];
        if(folder) {
            folder.name = name;
            FolderDbService.saveFolder(folder);
            this.emitChange();
        }
    }

    reorderFolder(folderId, newOrder) {
        var folder = this.folders[folderId];
        if(folder) {
            folder.order = newOrder;
            FolderDbService.saveFolder(folder);
            this.emitChange();
        }
    }

    getAllFolders() {
        return _.sortBy(_.values(this.folders), ['order']);
    }

    getFolderById(folderId) {
        return this.folders[folderId];
    }

    getDefaultFolder() {
        return _.find(this.getAllFolders(), {name: DEFAULT_FOLDER_NAME}) || null;
    }

    getDefaultFolderId() {
        var defaultFolder = this.getDefaultFolder();
        return defaultFolder != null ? defaultFolder.folderId : null;
    }

    ensureDefaultFolderState() {
        if(this.foldersLoaded !== true) {
            return;
        }

        if(this.isEnsuringDefaultFolderState === true) {
            return;
        }

        this.isEnsuringDefaultFolderState = true;

        try {
            var folders = this.getAllFolders();
            var clients = MqttClientService.getAllMqttClientSettings();
            var defaultFolder = this.getDefaultFolder();
            var clientsNeedingDefaultFolder = _.filter(clients, function(client) {
                return client.folderId == null || this.getFolderById(client.folderId) == null;
            }.bind(this));

            if(defaultFolder == null && (folders.length === 0 || clientsNeedingDefaultFolder.length > 0)) {
                defaultFolder = this.createFolder(DEFAULT_FOLDER_NAME);
            }

            if(defaultFolder != null && clientsNeedingDefaultFolder.length > 0) {
                for(var i = 0; i < clientsNeedingDefaultFolder.length; i++) {
                    if(clientsNeedingDefaultFolder[i].folderId !== defaultFolder.folderId) {
                        MqttClientActions.moveMqttClient({
                            mcsId: clientsNeedingDefaultFolder[i].mcsId,
                            folderId: defaultFolder.folderId
                        });
                    }
                }
            }
        } finally {
            this.isEnsuringDefaultFolderState = false;
        }
    }

    emitChange() {
        this.emit(FolderConstants.EVENT_FOLDER_DATA_CHANGED);
    }

    addChangeListener(callback) {
        this.on(FolderConstants.EVENT_FOLDER_DATA_CHANGED, callback);
    }

    removeChangeListener(callback) {
        this.removeListener(FolderConstants.EVENT_FOLDER_DATA_CHANGED, callback);
    }
}

export default new FolderService();
