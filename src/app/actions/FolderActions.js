import AppDispatcher from '../dispatcher/AppDispatcher';
import FolderConstants from '../utils/FolderConstants';

class FolderActions {

    static createFolder(name) {
        AppDispatcher.dispatch({
            actionType: FolderConstants.ACTION_CREATE_FOLDER,
            data: {name: name}
        });
    }

    static deleteFolder(folderId) {
        AppDispatcher.dispatch({
            actionType: FolderConstants.ACTION_DELETE_FOLDER,
            data: folderId
        });
    }

    static renameFolder(folderId, name) {
        AppDispatcher.dispatch({
            actionType: FolderConstants.ACTION_RENAME_FOLDER,
            data: {folderId: folderId, name: name}
        });
    }

    static reorderFolder(folderId, newOrder) {
        AppDispatcher.dispatch({
            actionType: FolderConstants.ACTION_REORDER_FOLDER,
            data: {folderId: folderId, newOrder: newOrder}
        });
    }
}

export default FolderActions;