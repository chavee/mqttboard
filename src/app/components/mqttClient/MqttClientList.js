import React, {Component} from 'react';
import _ from 'lodash';

import {IconFolder, IconEdit, IconX, IconStar, IconCopy} from '../common/Icons';
import NavUtils from '../../utils/NavUtils';
import MqttClientService from '../../services/MqttClientService';
import MqttClientActions from '../../actions/MqttClientActions';
import MqttClientConstants from '../../utils/MqttClientConstants';
import FolderService from '../../services/FolderService';
import FolderActions from '../../actions/FolderActions';

const styles = {
    brandText: {
        color: '#337ab7',
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 0.5
    },
    navbarBtn: {
        marginTop: 10,
        marginRight: 5
    },
    filterContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 9,
        marginRight: 12
    },
    filterInput: {
        width: 520,
        boxShadow: 'none'
    },
    filterInputWrap: {
        position: 'relative',
        display: 'inline-block'
    },
    filterInputWithClear: {
        paddingRight: 30
    },
    filterClearBtn: {
        position: 'absolute',
        top: 7,
        right: 8,
        border: 'none',
        background: 'transparent',
        color: '#9aa5af',
        cursor: 'pointer',
        fontSize: 18,
        lineHeight: 1,
        padding: 0
    }
};
const LAST_SELECTED_FOLDER_STORAGE_KEY = 'mqttboard.lastSelectedFolderId';
const CLIENT_FILTER_TEXT_STORAGE_KEY = 'mqttboard.clientFilterText';
const FILTER_PROTOCOL_TOKENS = ['mqtt', 'mqtts', 'ws', 'wss'];

class MqttClientList extends Component {

    constructor(props) {
        super(props);

        this.updateData = this.updateData.bind(this);
        this.selectFolder = this.selectFolder.bind(this);
        this.startNewFolder = this.startNewFolder.bind(this);
        this.confirmNewFolder = this.confirmNewFolder.bind(this);
        this.cancelNewFolder = this.cancelNewFolder.bind(this);
        this.confirmRenameFolder = this.confirmRenameFolder.bind(this);
        this.cancelRenameFolder = this.cancelRenameFolder.bind(this);
        this.deleteFolder = this.deleteFolder.bind(this);
        this.reorderFolders = this.reorderFolders.bind(this);
        this.deleteClient = this.deleteClient.bind(this);
        this.confirmRenameClient = this.confirmRenameClient.bind(this);
        this.cancelRenameClient = this.cancelRenameClient.bind(this);
        this.onCardDragStart = this.onCardDragStart.bind(this);
        this.onCardDragEnd = this.onCardDragEnd.bind(this);
        this.onCardDragOver = this.onCardDragOver.bind(this);
        this.onCardDragLeave = this.onCardDragLeave.bind(this);
        this.onCardDrop = this.onCardDrop.bind(this);
        this.onGridDragOver = this.onGridDragOver.bind(this);
        this.onGridDrop = this.onGridDrop.bind(this);
        this.onFolderItemDragStart = this.onFolderItemDragStart.bind(this);
        this.onFolderItemDragEnd = this.onFolderItemDragEnd.bind(this);
        this.onFolderDragOver = this.onFolderDragOver.bind(this);
        this.onFolderDragLeave = this.onFolderDragLeave.bind(this);
        this.onFolderDrop = this.onFolderDrop.bind(this);
        this.syncSelectedFolder = this.syncSelectedFolder.bind(this);
        this.onClientFilterTextChange = this.onClientFilterTextChange.bind(this);
        this.clearClientFilterText = this.clearClientFilterText.bind(this);
        this.createClientInSelectedFolder = this.createClientInSelectedFolder.bind(this);
        this.toggleFavorite = this.toggleFavorite.bind(this);
        this.duplicateClient = this.duplicateClient.bind(this);
        this.setViewMode = this.setViewMode.bind(this);

        this.state = {
            selectedFolderId: this.getPersistedSelectedFolderId() || FolderService.getDefaultFolderId(),
            newFolderMode: false,
            newFolderName: '',
            editingFolderId: null,
            editingFolderName: '',
            editingClientId: null,
            editingClientName: '',
            draggedClientId: null,
            draggedFolderId: null,
            dragOverClientId: null,
            dragOverFolderId: null,
            clientFilterText: this.getPersistedClientFilterText(),
            viewMode: 'folder'
        };
    }

    updateData() {
        if(this.syncSelectedFolder()) {
            return;
        }
        this.forceUpdate();
    }

    componentDidMount() {
        MqttClientService.addChangeListener(MqttClientConstants.EVENT_MQTT_CLIENT_DATA_CHANGED, this.updateData);
        MqttClientService.addChangeListener(MqttClientConstants.EVENT_MQTT_CLIENT_CONN_STATE_CHANGED, this.updateData);
        FolderService.addChangeListener(this.updateData);
        this.syncSelectedFolder();
    }

    componentWillUnmount() {
        MqttClientService.removeChangeListener(MqttClientConstants.EVENT_MQTT_CLIENT_DATA_CHANGED, this.updateData);
        MqttClientService.removeChangeListener(MqttClientConstants.EVENT_MQTT_CLIENT_CONN_STATE_CHANGED, this.updateData);
        FolderService.removeChangeListener(this.updateData);
    }

    // ---- Folder handlers ----

    selectFolder(folderId) {
        this.persistSelectedFolderId(folderId);
        this.setState({selectedFolderId: folderId, viewMode: 'folder'});
    }

    startNewFolder() {
        this.setState({newFolderMode: true, newFolderName: ''});
    }

    confirmNewFolder() {
        var name = this.state.newFolderName.trim();
        if(name.length > 0) {
            FolderActions.createFolder(name);
        }
        this.setState({newFolderMode: false, newFolderName: ''});
    }

    cancelNewFolder() {
        this.setState({newFolderMode: false, newFolderName: ''});
    }

    startRenameFolder(folderId, currentName) {
        this.setState({editingFolderId: folderId, editingFolderName: currentName});
    }

    confirmRenameFolder(folderId) {
        var name = this.state.editingFolderName.trim();
        if(name.length > 0) {
            FolderActions.renameFolder(folderId, name);
        }
        this.setState({editingFolderId: null, editingFolderName: ''});
    }

    cancelRenameFolder() {
        this.setState({editingFolderId: null, editingFolderName: ''});
    }

    deleteFolder(folderId, e) {
        e.stopPropagation();
        var clients = MqttClientService.getClientsByFolderId(folderId);
        if(clients.length > 0) {
            var msg = 'This folder contains ' + clients.length + ' client' + (clients.length > 1 ? 's' : '') + '.\nDelete the folder and all clients inside?';
            if(window.confirm(msg) !== true) {
                return;
            }
            for(var i = 0; i < clients.length; i++) {
                MqttClientActions.deleteMqttClientSettings(clients[i].mcsId);
            }
        }
        FolderActions.deleteFolder(folderId);
        var defaultFolderId = FolderService.getDefaultFolderId();
        if(this.state.selectedFolderId === folderId) {
            this.persistSelectedFolderId(defaultFolderId);
            this.setState({selectedFolderId: defaultFolderId});
        }
    }

    reorderFolders(draggedFolderId, targetFolderId) {
        var folders = FolderService.getAllFolders();
        var reorderedFolders = folders.filter(function(folder) {
            return folder.folderId !== draggedFolderId;
        });
        var draggedFolder = _.find(folders, {folderId: draggedFolderId});
        var targetIndex = _.findIndex(reorderedFolders, {folderId: targetFolderId});

        if(draggedFolder == null || targetIndex === -1) {
            return;
        }

        reorderedFolders.splice(targetIndex, 0, draggedFolder);
        for(var i = 0; i < reorderedFolders.length; i++) {
            if(reorderedFolders[i].order !== i) {
                FolderActions.reorderFolder(reorderedFolders[i].folderId, i);
            }
        }
    }

    // ---- Client card handlers ----

    goToDashboard(mcsId, e) {
        if(this.state.editingClientId) return;
        NavUtils.goToMqttClientDashboard(mcsId);
    }

    deleteClient(mcsId, e) {
        e.stopPropagation();
        if(window.confirm('Delete this MQTT client?') !== true) {
            return;
        }
        MqttClientActions.deleteMqttClientSettings(mcsId);
    }

    startRenameClient(mcsId, currentName, e) {
        e.stopPropagation();
        e.preventDefault();
        this.setState({editingClientId: mcsId, editingClientName: currentName});
    }

    confirmRenameClient(mcsId) {
        var name = this.state.editingClientName.trim();
        if(name.length > 0) {
            MqttClientActions.renameMqttClient({mcsId: mcsId, name: name});
        }
        this.setState({editingClientId: null, editingClientName: ''});
    }

    cancelRenameClient() {
        this.setState({editingClientId: null, editingClientName: ''});
    }

    // ---- Drag and drop handlers ----

    onCardDragStart(mcsId, e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', mcsId);
        this.setState({draggedClientId: mcsId});
    }

    onCardDragEnd() {
        this.setState({draggedClientId: null, dragOverClientId: null, dragOverFolderId: null});
    }

    onCardDragOver(mcsId, e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if(mcsId !== this.state.draggedClientId) {
            this.setState({dragOverClientId: mcsId});
        }
    }

    onCardDragLeave() {
        this.setState({dragOverClientId: null});
    }

    onCardDrop(targetMcsId, e) {
        e.preventDefault();
        e.stopPropagation();
        var draggedId = this.state.draggedClientId || e.dataTransfer.getData('text/plain');
        if(draggedId && draggedId !== targetMcsId) {
            var targetClient = MqttClientService.getMqttClientSettingsByMcsId(targetMcsId);
            var draggedClient = MqttClientService.getMqttClientSettingsByMcsId(draggedId);

            if(draggedClient && targetClient) {
                var targetFolderId = targetClient.folderId;
                if(draggedClient.folderId !== targetFolderId) {
                    MqttClientActions.moveMqttClient({mcsId: draggedId, folderId: targetFolderId});
                }

                var folderClients = MqttClientService.getClientsByFolderId(targetFolderId);
                var reordered = folderClients.filter(function(c) { return c.mcsId !== draggedId; });
                var targetIndex = _.findIndex(reordered, {mcsId: targetMcsId});
                if(targetIndex === -1) targetIndex = reordered.length;
                reordered.splice(targetIndex, 0, draggedClient);

                var mcsIds = reordered.map(function(c) { return c.mcsId; });
                MqttClientActions.reorderMqttClient({mcsIds: mcsIds});
            }
        }
        this.setState({draggedClientId: null, dragOverClientId: null, dragOverFolderId: null});
    }

    onGridDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    onGridDrop(e) {
        e.preventDefault();
        var draggedId = this.state.draggedClientId || e.dataTransfer.getData('text/plain');
        if(draggedId) {
            var draggedClient = MqttClientService.getMqttClientSettingsByMcsId(draggedId);
            if(draggedClient) {
                var targetFolderId = this.state.selectedFolderId || FolderService.getDefaultFolderId();
                if(draggedClient.folderId !== targetFolderId) {
                    MqttClientActions.moveMqttClient({mcsId: draggedId, folderId: targetFolderId});
                }
            }
        }
        this.setState({draggedClientId: null, draggedFolderId: null, dragOverClientId: null, dragOverFolderId: null});
    }

    onFolderItemDragStart(folderId, e) {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/x-mqttboard-folder-id', folderId);
        this.setState({draggedFolderId: folderId, dragOverFolderId: folderId});
    }

    onFolderItemDragEnd() {
        this.setState({draggedFolderId: null, dragOverFolderId: null});
    }

    onFolderDragOver(folderId, e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if(this.state.draggedFolderId != null) {
            if(folderId !== this.state.draggedFolderId && this.state.dragOverFolderId !== folderId) {
                this.setState({dragOverFolderId: folderId});
            }
            return;
        }

        if(this.state.draggedClientId != null) {
            this.setState({dragOverFolderId: folderId});
        }
    }

    onFolderDragLeave(e) {
        this.setState({dragOverFolderId: null});
    }

    onFolderDrop(folderId, e) {
        e.preventDefault();
        e.stopPropagation();
        var draggedFolderId = this.state.draggedFolderId || e.dataTransfer.getData('application/x-mqttboard-folder-id');
        if(draggedFolderId) {
            if(draggedFolderId !== folderId) {
                this.reorderFolders(draggedFolderId, folderId);
            }
            this.setState({draggedFolderId: null, dragOverFolderId: null});
            return;
        }

        var draggedId = this.state.draggedClientId || e.dataTransfer.getData('text/plain');
        if(draggedId) {
            MqttClientActions.moveMqttClient({mcsId: draggedId, folderId: folderId});
        }
        this.setState({draggedClientId: null, draggedFolderId: null, dragOverClientId: null, dragOverFolderId: null});
    }

    onClientFilterTextChange(e) {
        var value = e.target.value;
        this.persistClientFilterText(value);
        this.setState({clientFilterText: value});
    }

    clearClientFilterText() {
        this.persistClientFilterText('');
        this.setState({clientFilterText: ''});
    }

    toggleFavorite(mcsId, e) {
        e.stopPropagation();
        MqttClientActions.toggleFavoriteMqttClient(mcsId);
    }

    duplicateClient(mcsId, e) {
        e.stopPropagation();
        MqttClientActions.duplicateMqttClient(mcsId);
    }

    setViewMode(mode) {
        this.setState({viewMode: mode});
    }

    createClientInSelectedFolder() {
        var selectedFolderId = this.state.selectedFolderId || FolderService.getDefaultFolderId();
        NavUtils.gotToAddMqttClient(null, selectedFolderId);
    }

    shouldShowCreateClientActions(folders, allClients, viewMode) {
        if(viewMode === 'online' || viewMode === 'favorite') {
            return false;
        }

        var defaultFolder = FolderService.getDefaultFolder();
        var hasOnlyDefaultFolder = folders.length === 1 && defaultFolder != null && folders[0].folderId === defaultFolder.folderId;
        var isFirstRunEmptyState = hasOnlyDefaultFolder && allClients.length === 0;

        return isFirstRunEmptyState !== true;
    }

    // ---- Helpers ----

    getPersistedSelectedFolderId() {
        try {
            return window.localStorage.getItem(LAST_SELECTED_FOLDER_STORAGE_KEY);
        } catch(e) {
            return null;
        }
    }

    getPersistedClientFilterText() {
        try {
            return window.localStorage.getItem(CLIENT_FILTER_TEXT_STORAGE_KEY) || '';
        } catch(e) {
            return '';
        }
    }

    persistSelectedFolderId(folderId) {
        try {
            if(folderId == null) {
                window.localStorage.removeItem(LAST_SELECTED_FOLDER_STORAGE_KEY);
                return;
            }
            window.localStorage.setItem(LAST_SELECTED_FOLDER_STORAGE_KEY, folderId);
        } catch(e) {
        }
    }

    persistClientFilterText(value) {
        try {
            if(value == null || value.length === 0) {
                window.localStorage.removeItem(CLIENT_FILTER_TEXT_STORAGE_KEY);
                return;
            }
            window.localStorage.setItem(CLIENT_FILTER_TEXT_STORAGE_KEY, value);
        } catch(e) {
        }
    }

    syncSelectedFolder() {
        var selectedFolderId = this.state.selectedFolderId;
        var defaultFolderId = FolderService.getDefaultFolderId();
        var persistedFolderId = this.getPersistedSelectedFolderId();

        if(defaultFolderId == null) {
            return false;
        }

        if(persistedFolderId != null && persistedFolderId !== selectedFolderId && FolderService.getFolderById(persistedFolderId) != null) {
            this.setState({selectedFolderId: persistedFolderId});
            return true;
        }

        if(selectedFolderId == null || FolderService.getFolderById(selectedFolderId) == null) {
            this.persistSelectedFolderId(defaultFolderId);
            this.setState({selectedFolderId: defaultFolderId});
            return true;
        }

        return false;
    }

    getFilteredClients() {
        var viewMode = this.state.viewMode;
        var clientConnStates = MqttClientService.getAllMqttClientStates();
        var clients;

        if(viewMode === 'favorite') {
            clients = _.filter(MqttClientService.getAllMqttClientSettings(), function(c) {
                return c.isFavorite === true;
            });
        } else if(viewMode === 'online') {
            clients = _.filter(MqttClientService.getAllMqttClientSettings(), function(c) {
                return clientConnStates[c.mcsId] === MqttClientConstants.CONNECTION_STATE_CONNECTED;
            });
        } else {
            var folderId = this.state.selectedFolderId || FolderService.getDefaultFolderId();
            if(folderId == null) {
                return [];
            }
            clients = MqttClientService.getClientsByFolderId(folderId);
        }

        var filterText = (this.state.clientFilterText || '').trim().toLowerCase();
        var filterTokens = filterText.length > 0 ? filterText.split(/\s+/).filter(Boolean) : [];
        var requestedProtocols = filterTokens.filter(function(token) {
            return FILTER_PROTOCOL_TOKENS.indexOf(token) !== -1;
        });
        var searchTokens = filterTokens.filter(function(token) {
            return FILTER_PROTOCOL_TOKENS.indexOf(token) === -1;
        });

        return _.filter(clients, function(client) {
            var protocol = (client.protocol || '').toLowerCase();
            if(requestedProtocols.length > 0 && requestedProtocols.indexOf(protocol) === -1) {
                return false;
            }

            if(searchTokens.length === 0) {
                return true;
            }

            var searchableText = [
                client.mqttClientName,
                client.mqttClientId,
                client.mcsId,
                client.host
            ].join(' ').toLowerCase();

            return searchTokens.every(function(token) {
                return searchableText.indexOf(token) !== -1;
            });
        });
    }

    render() {
        var folders = FolderService.getAllFolders();
        var clients = this.getFilteredClients();
        var clientConnStates = MqttClientService.getAllMqttClientStates();
        var selectedFolderId = this.state.selectedFolderId || FolderService.getDefaultFolderId();
        var selectedFolder = selectedFolderId ? FolderService.getFolderById(selectedFolderId) : null;
        var viewMode = this.state.viewMode;
        var allClients = MqttClientService.getAllMqttClientSettings();
        var favoriteCount = _.filter(allClients, function(c) { return c.isFavorite === true; }).length;
        var onlineCount = _.filter(allClients, function(c) { return clientConnStates[c.mcsId] === MqttClientConstants.CONNECTION_STATE_CONNECTED; }).length;
        var panelTitle = viewMode === 'favorite' ? 'Favorites' : viewMode === 'online' ? 'Online' : (selectedFolder ? selectedFolder.name : 'Default');
        var shouldShowCreateClientActions = this.shouldShowCreateClientActions(folders, allClients, viewMode);
        var self = this;

        // ---- Build folder items ----
        var folderItems = [];
        for(var i = 0; i < folders.length; i++) {
            (function(folder) {
                var isEditing = self.state.editingFolderId === folder.folderId;
                var isActive = self.state.selectedFolderId === folder.folderId && (!self.state.viewMode || self.state.viewMode === 'folder');
                var isDragOver = self.state.dragOverFolderId === folder.folderId;
                var isDraggingFolder = self.state.draggedFolderId === folder.folderId;

                var itemClass = 'folder-item';
                if(isActive) itemClass += ' active';
                if(isDragOver) itemClass += ' drag-over';
                if(isDraggingFolder) itemClass += ' dragging';

                if(isEditing) {
                    folderItems.push(
                        <div key={folder.folderId} className={itemClass}>
                            <span className="folder-item-icon"><IconFolder size={15}/></span>
                            <div className="folder-item-name">
                                <input
                                    autoFocus
                                    value={self.state.editingFolderName}
                                    onChange={function(e) { self.setState({editingFolderName: e.target.value}); }}
                                    onBlur={self.confirmRenameFolder.bind(self, folder.folderId)}
                                    onKeyDown={function(e) {
                                        if(e.key === 'Enter') self.confirmRenameFolder(folder.folderId);
                                        if(e.key === 'Escape') self.cancelRenameFolder();
                                    }}
                                    onClick={function(e) { e.stopPropagation(); }}
                                />
                            </div>
                            <span className="view-item-count">{MqttClientService.getClientsByFolderId(folder.folderId).length}</span>
                        </div>
                    );
                } else {
                    folderItems.push(
                        <div
                            key={folder.folderId}
                            className={itemClass}
                            draggable="true"
                            onClick={self.selectFolder.bind(self, folder.folderId)}
                            onDoubleClick={self.startRenameFolder.bind(self, folder.folderId, folder.name)}
                            onDragStart={self.onFolderItemDragStart.bind(self, folder.folderId)}
                            onDragEnd={self.onFolderItemDragEnd}
                            onDragOver={self.onFolderDragOver.bind(self, folder.folderId)}
                            onDragLeave={self.onFolderDragLeave}
                            onDrop={self.onFolderDrop.bind(self, folder.folderId)}
                        >
                            <span className="folder-item-icon"><IconFolder size={15}/></span>
                            <span className="folder-item-name">{folder.name}</span>
                            <span className="view-item-count">{MqttClientService.getClientsByFolderId(folder.folderId).length}</span>
                            <span className="folder-item-actions">
                                <button
                                    className="btn-icon"
                                    title="Rename"
                                    onClick={function(e) { e.stopPropagation(); self.startRenameFolder(folder.folderId, folder.name); }}
                                ><IconEdit size={13}/></button>
                                <button
                                    className="btn-icon btn-delete"
                                    title="Delete folder"
                                    onClick={self.deleteFolder.bind(self, folder.folderId)}
                                ><IconX size={13}/></button>
                            </span>
                        </div>
                    );
                }
            })(folders[i]);
        }

        // ---- New folder input ----
        var newFolderInput = null;
        if(this.state.newFolderMode) {
            newFolderInput = (
                <div className="folder-item">
                    <span className="folder-item-icon">&#128193;</span>
                    <div className="folder-item-name">
                        <input
                            autoFocus
                            placeholder="Folder name..."
                            value={this.state.newFolderName}
                            onChange={(function(e) { this.setState({newFolderName: e.target.value}); }).bind(this)}
                            onBlur={this.confirmNewFolder}
                            onKeyDown={(function(e) {
                                if(e.key === 'Enter') this.confirmNewFolder();
                                if(e.key === 'Escape') this.cancelNewFolder();
                            }).bind(this)}
                        />
                    </div>
                </div>
            );
        }

        // ---- Build client cards ----
        var clientCards = [];
        for(var j = 0; j < clients.length; j++) {
            (function(client) {
                var conState = clientConnStates[client.mcsId];
                var connClass = '';
                var conStateText = 'Not Connected';
                if(conState == MqttClientConstants.CONNECTION_STATE_CONNECTED) {
                    connClass = 'connected';
                    conStateText = 'Connected';
                } else if(conState == MqttClientConstants.CONNECTION_STATE_ERROR) {
                    connClass = 'error';
                    conStateText = 'Connection Error';
                }

                var cardClass = 'client-card ' + connClass;
                if(self.state.draggedClientId === client.mcsId) {
                    cardClass += ' dragging';
                }

                var isEditingClient = self.state.editingClientId === client.mcsId;

                clientCards.push(
                    <div
                        key={client.mcsId}
                        className={cardClass}
                        draggable="true"
                        onDragStart={self.onCardDragStart.bind(self, client.mcsId)}
                        onDragEnd={self.onCardDragEnd}
                        onDragOver={self.onCardDragOver.bind(self, client.mcsId)}
                        onDragLeave={self.onCardDragLeave}
                        onDrop={self.onCardDrop.bind(self, client.mcsId)}
                        onClick={self.goToDashboard.bind(self, client.mcsId)}
                    >
                        <button
                            className={'card-star-btn' + (client.isFavorite ? ' active' : '')}
                            title={client.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                            onClick={self.toggleFavorite.bind(self, client.mcsId)}
                        ><IconStar size={13} filled={client.isFavorite}/></button>
                        <button
                            className="card-duplicate-btn"
                            title="Duplicate client"
                            onClick={self.duplicateClient.bind(self, client.mcsId)}
                        ><IconCopy size={13}/></button>
                        <button
                            className="card-delete-btn"
                            title="Delete client"
                            onClick={self.deleteClient.bind(self, client.mcsId)}
                        ><IconX size={13}/></button>
                        {isEditingClient ? (
                            <div className="card-name">
                                <input
                                    autoFocus
                                    value={self.state.editingClientName}
                                    onChange={function(e) { self.setState({editingClientName: e.target.value}); }}
                                    onBlur={self.confirmRenameClient.bind(self, client.mcsId)}
                                    onKeyDown={function(e) {
                                        if(e.key === 'Enter') self.confirmRenameClient(client.mcsId);
                                        if(e.key === 'Escape') self.cancelRenameClient();
                                    }}
                                    onClick={function(e) { e.stopPropagation(); }}
                                />
                            </div>
                        ) : (
                            <div
                                className="card-name"
                                onDoubleClick={self.startRenameClient.bind(self, client.mcsId, client.mqttClientName)}
                            >{client.mqttClientName}</div>
                        )}
                        <div className="card-host">{client.protocol}://{client.host}</div>
                        <div className={'card-status ' + connClass}>{conStateText}</div>
                    </div>
                );
            })(clients[j]);
        }

        // ---- Empty state ----
        var emptyState = null;
        if(clientCards.length === 0) {
            var emptyMsg = viewMode === 'online' ? 'No online clients.' : viewMode === 'favorite' ? 'No favorite clients.' : 'No MQTT clients in this folder.';
            emptyState = (
                <div className="card-empty-state">
                    <p>{emptyMsg}</p>
                    {shouldShowCreateClientActions ? (
                        <button className="btn btn-primary btn-create" onClick={this.createClientInSelectedFolder}>
                            <b>Create MQTT Client</b>
                        </button>
                    ) : null}
                </div>
            );
        }

        return (
            <div>
                <nav className="navbar navbar-default navbar-fixed-top">
                    <div className="navbar-two-col">
                        <div className="navbar-sidebar-col" style={{display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 10}}>
                            <img src="images/icon-128.png" alt="MQTTBoard" style={{height: 34, width: 34, borderRadius: 8, flexShrink: 0}}/>
                            <span style={styles.brandText}>MQTTBoard</span>
                        </div>
                        <div className="navbar-panel-col">
                            <div style={styles.filterContainer}>
                                <span style={styles.filterInputWrap}>
                                    <input
                                        type="text"
                                        className="form-control mqttboard-filter-input"
                                        style={Object.assign({}, styles.filterInput, this.state.clientFilterText ? styles.filterInputWithClear : {})}
                                        placeholder="Filter by name, client id, host"
                                        value={this.state.clientFilterText}
                                        onChange={this.onClientFilterTextChange}
                                    />
                                    {this.state.clientFilterText ? (
                                        <button
                                            type="button"
                                            title="Clear filter"
                                            style={styles.filterClearBtn}
                                            onClick={this.clearClientFilterText}
                                        >&#215;</button>
                                    ) : null}
                                </span>
                            </div>
                            {shouldShowCreateClientActions ? (
                                <button onClick={this.createClientInSelectedFolder} type="button" className="btn btn-primary btn-sm" style={{marginRight: 12, whiteSpace: 'nowrap'}}>
                                    <b>+ Create MQTT Client</b>
                                </button>
                            ) : null}
                        </div>
                    </div>
                </nav>
                <div className="app-layout">
                    {/* ---- Left sidebar ---- */}
                    <div className="folder-sidebar">
                        <div className="view-section">
                            <div
                                className={'folder-item' + (viewMode === 'favorite' ? ' active' : '')}
                                onClick={this.setViewMode.bind(this, 'favorite')}
                            >
                                <span className="folder-item-icon">&#9733;</span>
                                <span className="folder-item-name">FAVORITE</span>
                                <span className="view-item-count">{favoriteCount}</span>
                            </div>
                            <div
                                className={'folder-item' + (viewMode === 'online' ? ' active' : '')}
                                onClick={this.setViewMode.bind(this, 'online')}
                            >
                                <span className="folder-item-icon" style={{fontSize: 22}}>&#9679;</span>
                                <span className="folder-item-name">ONLINE</span>
                                <span className="view-item-count">{onlineCount}</span>
                            </div>
                        </div>
                        <div className="folder-sidebar-header">
                            <b>FOLDERS</b>
                            <button className="btn-add-folder" title="New folder" onClick={this.startNewFolder}>+</button>
                        </div>
                        <div className="folder-list">
                            {folderItems}
                            {newFolderInput}
                        </div>
                    </div>

                    {/* ---- Right panel: Client cards ---- */}
                    <div className="card-panel">

                        <div
                            className="card-grid"
                            onDragOver={this.onGridDragOver}
                            onDrop={this.onGridDrop}
                        >
                            {clientCards}
                            {emptyState}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default MqttClientList;
