import React, {Component} from 'react';

import LeftMenuButton from '../common/LeftMenuButton';
import {IconArrowLeft, IconWifi, IconUpload, IconDownload, IconGrid, IconSettings, IconGrip, IconX} from '../common/Icons';
import NavUtils from '../../utils/NavUtils';
import MqttClientService from '../../services/MqttClientService';
import MqttClientPublisher from './MqttClientPublisher';
import MqttClientSubscriber from './MqttClientSubscriber';
import MqttClientActions from '../../actions/MqttClientActions';
import MqttClientConstants from '../../utils/MqttClientConstants';
import PublisherSettings from '../../models/PublisherSettings';
import SubscriberSettings from '../../models/SubscriberSettings';

const MIN_CARD_WIDTH = 320;
const CARD_GAP = 20;
const CARD_HEIGHT = 640;
const DRAG_HANDLE_HEIGHT = 34;
const MIN_BOARD_WIDTH = MIN_CARD_WIDTH;
const SNAP_GRID_HEIGHT = CARD_HEIGHT + CARD_GAP;

const styles = {
    button: {
        margin: 10
    },
    iconButton: {
        margin: 10,
        minWidth: 42
    },
    iconButtonActive: {
        backgroundColor: '#337ab7',
        borderColor: '#2e6da4',
        color: '#fff'
    },
    boardContainer: {
        position: 'relative',
        width: '100%',
        minHeight: CARD_HEIGHT,
        paddingBottom: 20
    },
    cardShell: {
        position: 'absolute',
        maxWidth: 'calc(100vw - 40px)'
    },
    dragHandle: {
        height: DRAG_HANDLE_HEIGHT,
        lineHeight: DRAG_HANDLE_HEIGHT + 'px',
        paddingLeft: 12,
        paddingRight: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '4px 4px 0 0',
        color: '#fff',
        cursor: 'move',
        userSelect: 'none',
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    dragHandleTitle: {
        display: 'inline-flex',
        alignItems: 'center'
    },
    dragHandleActions: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8
    },
    dragHandleActionButton: {
        background: 'transparent',
        border: 'none',
        color: '#fff',
        cursor: 'pointer',
        padding: 0,
        lineHeight: 1
    },
    dragHandlePublisher: {
        backgroundColor: '#1976d2'
    },
    dragHandleSubscriber: {
        backgroundColor: '#eea236'
    }
};

class MqttClientDashboard extends Component {

    constructor(props) {
        super(props);

        this.savePublisherSettings = this.savePublisherSettings.bind(this);
        this.saveSubscriberSettings = this.saveSubscriberSettings.bind(this);
        this.changeConnectionState = this.changeConnectionState.bind(this);
        this.updatePageData = this.updatePageData.bind(this);
        this.updateConnectionStatus = this.updateConnectionStatus.bind(this);
        this.startCardDrag = this.startCardDrag.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.saveCardPosition = this.saveCardPosition.bind(this);
        this.saveResolvedCardPositions = this.saveResolvedCardPositions.bind(this);
        this.setBoardContainerRef = this.setBoardContainerRef.bind(this);
        this.toggleSnapToGrid = this.toggleSnapToGrid.bind(this);
        this.handleWindowResize = this.handleWindowResize.bind(this);
        this.getSnapToGridEnabled = this.getSnapToGridEnabled.bind(this);
        this.persistSnapToGridPreference = this.persistSnapToGridPreference.bind(this);
        this.deleteCard = this.deleteCard.bind(this);

        var mqttClientSettings = MqttClientService.getMqttClientSettingsByMcsId(this.props.params.mcsId);
        var snapToGridEnabled = this.getSnapToGridEnabled(mqttClientSettings);
        var cardPositions = this.buildCardPositions(mqttClientSettings);
        if(snapToGridEnabled) {
            cardPositions = this.getResolvedCardPositions(cardPositions, null, null, mqttClientSettings);
        }
        this.state = {
            conState: MqttClientService.getMqttClientStateByMcsId(this.props.params.mcsId),
            mqttClientSettings: mqttClientSettings,
            cardPositions: cardPositions,
            dragInfo: null,
            snapToGridEnabled: snapToGridEnabled
        };
    }

    setBoardContainerRef(node) {
        this.boardContainer = node;
    }

    componentDidMount() {
        MqttClientService.addChangeListener(MqttClientConstants.EVENT_MQTT_CLIENT_DATA_CHANGED, this.updatePageData);
        MqttClientService.addChangeListener(MqttClientConstants.EVENT_MQTT_CLIENT_CONN_STATE_CHANGED, this.updateConnectionStatus);
        window.addEventListener('mousemove', this.handlePointerMove);
        window.addEventListener('mouseup', this.handlePointerUp);
        window.addEventListener('resize', this.handleWindowResize);
        if(this.state.snapToGridEnabled) {
            this.setState({cardPositions: this.getResolvedCardPositions(this.state.cardPositions, null, null, this.state.mqttClientSettings)});
        }
    }

    componentWillUnmount() {
        MqttClientService.removeChangeListener(MqttClientConstants.EVENT_MQTT_CLIENT_DATA_CHANGED, this.updatePageData);
        MqttClientService.removeChangeListener(MqttClientConstants.EVENT_MQTT_CLIENT_CONN_STATE_CHANGED, this.updateConnectionStatus);
        window.removeEventListener('mousemove', this.handlePointerMove);
        window.removeEventListener('mouseup', this.handlePointerUp);
        window.removeEventListener('resize', this.handleWindowResize);
    }

    handleWindowResize() {
        if(this.state.snapToGridEnabled) {
            this.setState({cardPositions: this.getResolvedCardPositions(this.state.cardPositions, null, null, this.state.mqttClientSettings)});
        } else {
            this.forceUpdate();
        }
    }

    buildCardPositions(mqttClientSettings) {
        var positions = {};
        var orderedCards = [];

        if(mqttClientSettings != null && mqttClientSettings.publishSettings != null) {
            for(var i = 0; i < mqttClientSettings.publishSettings.length; i++) {
                orderedCards.push({
                    id: mqttClientSettings.publishSettings[i].pubId,
                    posX: mqttClientSettings.publishSettings[i].posX,
                    posY: mqttClientSettings.publishSettings[i].posY
                });
            }
        }

        if(mqttClientSettings != null && mqttClientSettings.subscribeSettings != null) {
            for(var j = 0; j < mqttClientSettings.subscribeSettings.length; j++) {
                orderedCards.push({
                    id: mqttClientSettings.subscribeSettings[j].subId,
                    posX: mqttClientSettings.subscribeSettings[j].posX,
                    posY: mqttClientSettings.subscribeSettings[j].posY
                });
            }
        }

        for(var k = 0; k < orderedCards.length; k++) {
            var defaultPosition = this.getDefaultCardPosition(k);
            positions[orderedCards[k].id] = {
                x: this.getValidCoordinate(orderedCards[k].posX, defaultPosition.x),
                y: this.getValidCoordinate(orderedCards[k].posY, defaultPosition.y)
            };
        }

        return positions;
    }

    getValidCoordinate(value, fallback) {
        if(value == null || Number.isNaN(Number(value))) {
            return fallback;
        }
        return Number(value);
    }

    getSnapToGridEnabled(mqttClientSettings) {
        return mqttClientSettings != null && mqttClientSettings.snapToGridEnabled !== false;
    }

    getDefaultCardPosition(index) {
        var gridMetrics = this.getGridMetrics();
        return {
            x: this.getGridColumnLeft(index % gridMetrics.columns, gridMetrics),
            y: Math.floor(index / gridMetrics.columns) * SNAP_GRID_HEIGHT
        };
    }

    getBoardWidth() {
        if(this.boardContainer != null && this.boardContainer.clientWidth > 0) {
            return this.boardContainer.clientWidth;
        }

        if(window != null && window.innerWidth != null) {
            return Math.max(MIN_BOARD_WIDTH, window.innerWidth - 40);
        }

        return MIN_BOARD_WIDTH;
    }

    getGridMetrics() {
        var boardWidth = this.getBoardWidth();
        var columns = Math.max(1, Math.floor((boardWidth + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP)));
        var cardWidth = Math.floor((boardWidth - ((columns - 1) * CARD_GAP)) / columns);

        return {
            boardWidth: boardWidth,
            columns: columns,
            cardWidth: cardWidth,
            rowHeight: SNAP_GRID_HEIGHT
        };
    }

    getGridColumnLeft(columnIndex, gridMetrics) {
        return columnIndex * (gridMetrics.cardWidth + CARD_GAP);
    }

    getGridCell(position, gridMetrics) {
        var columnIndex = Math.round(position.x / (gridMetrics.cardWidth + CARD_GAP));

        return {
            columnIndex: Math.max(0, Math.min(gridMetrics.columns - 1, columnIndex)),
            rowIndex: Math.max(0, Math.round(position.y / gridMetrics.rowHeight))
        };
    }

    getPositionFromGridCell(columnIndex, rowIndex, gridMetrics) {
        return {
            x: this.getGridColumnLeft(columnIndex, gridMetrics),
            y: rowIndex * gridMetrics.rowHeight
        };
    }

    getNormalizedCardPosition(posX, posY) {
        var normalizedPosition = {
            x: Math.max(0, posX),
            y: Math.max(0, posY)
        };

        if(this.state.snapToGridEnabled) {
            var gridMetrics = this.getGridMetrics();
            var gridCell = this.getGridCell(normalizedPosition, gridMetrics);
            normalizedPosition = this.getPositionFromGridCell(gridCell.columnIndex, gridCell.rowIndex, gridMetrics);
        }

        return normalizedPosition;
    }

    toggleSnapToGrid() {
        var nextSnapToGridEnabled = !this.state.snapToGridEnabled;
        var nextCardPositions = this.state.cardPositions;

        if(nextSnapToGridEnabled) {
            nextCardPositions = this.getResolvedCardPositions(this.state.cardPositions, null, null, this.state.mqttClientSettings);
        }

        this.setState({
            snapToGridEnabled: nextSnapToGridEnabled,
            cardPositions: nextCardPositions
        }, function() {
            this.persistSnapToGridPreference(nextSnapToGridEnabled);
            if(nextSnapToGridEnabled) {
                this.saveResolvedCardPositions(nextCardPositions);
            }
        }.bind(this));
    }

    persistSnapToGridPreference(enabled) {
        if(this.state.mqttClientSettings == null) {
            return;
        }

        MqttClientActions.updateMqttClientLayout({
            mcsId: this.props.params.mcsId,
            snapToGridEnabled: enabled
        });
    }

    getCardOrder(mqttClientSettings) {
        var orderedCardIds = [];
        var clientSettings = mqttClientSettings || this.state.mqttClientSettings;

        if(clientSettings != null && clientSettings.publishSettings != null) {
            for(var i = 0; i < clientSettings.publishSettings.length; i++) {
                orderedCardIds.push(clientSettings.publishSettings[i].pubId);
            }
        }

        if(clientSettings != null && clientSettings.subscribeSettings != null) {
            for(var j = 0; j < clientSettings.subscribeSettings.length; j++) {
                orderedCardIds.push(clientSettings.subscribeSettings[j].subId);
            }
        }

        return orderedCardIds;
    }

    getResolvedCardPositions(basePositions, movingCardId, targetPosition, mqttClientSettings) {
        var orderedCardIds = this.getCardOrder(mqttClientSettings);
        var gridMetrics = this.getGridMetrics();
        var nextPositions = {};
        var columns = [];
        var movingCell = null;
        var oldMovingCell = null;

        for(var c = 0; c < gridMetrics.columns; c++) {
            columns.push([]);
        }

        for(var i = 0; i < orderedCardIds.length; i++) {
            var cardId = orderedCardIds[i];
            var position = basePositions[cardId] || this.getDefaultCardPosition(i);
            var cell = this.getGridCell(position, gridMetrics);

            if(cardId == movingCardId) {
                oldMovingCell = cell;
                movingCell = targetPosition != null ? this.getGridCell(targetPosition, gridMetrics) : cell;
            } else {
                columns[cell.columnIndex].push({
                    id: cardId,
                    rowIndex: cell.rowIndex
                });
            }
        }

        if(movingCardId != null && movingCell == null) {
            movingCell = oldMovingCell || {columnIndex: 0, rowIndex: 0};
        }

        for(var colIndex = 0; colIndex < columns.length; colIndex++) {
            columns[colIndex].sort(function(a, b) { return a.rowIndex - b.rowIndex; });

            var compactedColumn = [];
            for(var row = 0; row < columns[colIndex].length; row++) {
                compactedColumn.push(columns[colIndex][row].id);
            }

            if(movingCardId != null && movingCell.columnIndex == colIndex) {
                var insertRow = Math.max(0, Math.min(movingCell.rowIndex, compactedColumn.length));
                compactedColumn.splice(insertRow, 0, movingCardId);
            }

            for(var rowIndex = 0; rowIndex < compactedColumn.length; rowIndex++) {
                nextPositions[compactedColumn[rowIndex]] = this.getPositionFromGridCell(colIndex, rowIndex, gridMetrics);
            }
        }

        return nextPositions;
    }

    savePublisherSettings() {
        MqttClientActions.savePublisherSettings({mcsId: this.props.params.mcsId, publisher: new PublisherSettings()});
    }

    saveSubscriberSettings() {
        MqttClientActions.saveSubscriberSettings({mcsId: this.props.params.mcsId, subscriber: new SubscriberSettings()});
    }

    changeConnectionState() {
        if(this.state.conState == MqttClientConstants.CONNECTION_STATE_CONNECTED) {
            MqttClientActions.disConnectFromBroker(this.props.params.mcsId);
        } else if(this.state.conState == MqttClientConstants.CONNECTION_STATE_ERROR) {
            MqttClientActions.disConnectFromBroker(this.props.params.mcsId);
        } else {
            MqttClientActions.connectToBroker(this.state.mqttClientSettings);
        }
    }

    updatePageData(mcsId) {
        if(mcsId == this.props.params.mcsId) {
            var mqttClientSettings = MqttClientService.getMqttClientSettingsByMcsId(this.props.params.mcsId);
            var snapToGridEnabled = this.getSnapToGridEnabled(mqttClientSettings);
            var cardPositions = this.buildCardPositions(mqttClientSettings);
            if(snapToGridEnabled) {
                cardPositions = this.getResolvedCardPositions(cardPositions, null, null, mqttClientSettings);
            }
            this.setState({
                mqttClientSettings: mqttClientSettings,
                cardPositions: cardPositions,
                conState: MqttClientService.getMqttClientStateByMcsId(this.props.params.mcsId),
                snapToGridEnabled: snapToGridEnabled
            });
        }
    }

    updateConnectionStatus(connStateObj) {
        if(connStateObj.mcsId == this.props.params.mcsId) {
            this.setState({conState: MqttClientService.getMqttClientStateByMcsId(this.props.params.mcsId)});
        }
    }

    startCardDrag(cardType, cardId, event) {
        event.preventDefault();
        var boardRect = this.boardContainer != null ? this.boardContainer.getBoundingClientRect() : {left: 0, top: 0};
        var cardPosition = this.state.cardPositions[cardId] || {x: 0, y: 0};
        this.setState({
            dragInfo: {
                cardType: cardType,
                cardId: cardId,
                offsetX: event.clientX - boardRect.left - cardPosition.x,
                offsetY: event.clientY - boardRect.top - cardPosition.y
            }
        });
    }

    handlePointerMove(event) {
        if(this.state.dragInfo == null) {
            return;
        }

        var dragInfo = this.state.dragInfo;
        var boardRect = this.boardContainer != null ? this.boardContainer.getBoundingClientRect() : {left: 0, top: 0};
        var nextPositions = Object.assign({}, this.state.cardPositions);
        var pointerPosition = this.getNormalizedCardPosition(
            event.clientX - boardRect.left - dragInfo.offsetX,
            event.clientY - boardRect.top - dragInfo.offsetY
        );
        if(this.state.snapToGridEnabled) {
            nextPositions = this.getResolvedCardPositions(nextPositions, dragInfo.cardId, pointerPosition);
        } else {
            nextPositions[dragInfo.cardId] = pointerPosition;
        }
        this.setState({cardPositions: nextPositions});
    }

    handlePointerUp() {
        if(this.state.dragInfo == null) {
            return;
        }

        var dragInfo = this.state.dragInfo;
        var position = this.state.cardPositions[dragInfo.cardId];
        this.setState({dragInfo: null});
        if(position != null) {
            if(this.state.snapToGridEnabled) {
                this.saveResolvedCardPositions(this.state.cardPositions);
            } else {
                this.saveCardPosition(dragInfo.cardType, dragInfo.cardId, position.x, position.y);
            }
        }
    }

    saveCardPosition(cardType, cardId, posX, posY) {
        if(this.state.mqttClientSettings == null) {
            return;
        }

        var normalizedPosition = this.getNormalizedCardPosition(posX, posY);

        if(cardType == 'publisher' && this.state.mqttClientSettings.publishSettings != null) {
            for(var i = 0; i < this.state.mqttClientSettings.publishSettings.length; i++) {
                var publisher = this.state.mqttClientSettings.publishSettings[i];
                if(publisher.pubId == cardId) {
                    MqttClientActions.savePublisherSettings({
                        mcsId: this.props.params.mcsId,
                        publisher: Object.assign({}, publisher, {posX: normalizedPosition.x, posY: normalizedPosition.y})
                    });
                    return;
                }
            }
        }

        if(cardType == 'subscriber' && this.state.mqttClientSettings.subscribeSettings != null) {
            for(var j = 0; j < this.state.mqttClientSettings.subscribeSettings.length; j++) {
                var subscriber = this.state.mqttClientSettings.subscribeSettings[j];
                if(subscriber.subId == cardId) {
                    MqttClientActions.saveSubscriberSettings({
                        mcsId: this.props.params.mcsId,
                        subscriber: Object.assign({}, subscriber, {posX: normalizedPosition.x, posY: normalizedPosition.y})
                    });
                    return;
                }
            }
        }
    }

    saveResolvedCardPositions(cardPositions) {
        if(this.state.mqttClientSettings == null) {
            return;
        }

        if(this.state.mqttClientSettings.publishSettings != null) {
            for(var i = 0; i < this.state.mqttClientSettings.publishSettings.length; i++) {
                var publisher = this.state.mqttClientSettings.publishSettings[i];
                var publisherPosition = cardPositions[publisher.pubId];
                if(publisherPosition != null && (publisher.posX != publisherPosition.x || publisher.posY != publisherPosition.y)) {
                    this.saveCardPosition('publisher', publisher.pubId, publisherPosition.x, publisherPosition.y);
                }
            }
        }

        if(this.state.mqttClientSettings.subscribeSettings != null) {
            for(var j = 0; j < this.state.mqttClientSettings.subscribeSettings.length; j++) {
                var subscriber = this.state.mqttClientSettings.subscribeSettings[j];
                var subscriberPosition = cardPositions[subscriber.subId];
                if(subscriberPosition != null && (subscriber.posX != subscriberPosition.x || subscriber.posY != subscriberPosition.y)) {
                    this.saveCardPosition('subscriber', subscriber.subId, subscriberPosition.x, subscriberPosition.y);
                }
            }
        }
    }

    buildBoardHeight(cardItems) {
        var maxBottom = CARD_HEIGHT;
        for(var i = 0; i < cardItems.length; i++) {
            var position = this.state.cardPositions[cardItems[i].id] || {x: 0, y: 0};
            var bottom = position.y + CARD_HEIGHT;
            if(bottom > maxBottom) {
                maxBottom = bottom;
            }
        }
        return maxBottom + CARD_GAP;
    }

    deleteCard(cardType, cardId, event) {
        if(event != null) {
            event.preventDefault();
            event.stopPropagation();
        }

        if(this.state.mqttClientSettings == null || window.confirm('Delete this ' + cardType + ' card?') !== true) {
            return;
        }

        if(cardType == 'publisher') {
            MqttClientActions.deletePublisher({mcsId: this.props.params.mcsId, pubId: cardId});
            return;
        }

        var subData = MqttClientService.getSubscribedData(this.props.params.mcsId, cardId);
        if(subData != null && subData.isSubscribed === true && subData.topic != null && subData.topic.length > 0) {
            MqttClientActions.unSubscribeToTopic(this.props.params.mcsId, cardId, subData.topic);
        }
        MqttClientActions.deleteSubscriber({mcsId: this.props.params.mcsId, subId: cardId});
    }

    renderCardShell(cardType, cardId, label, component) {
        var position = this.state.cardPositions[cardId] || {x: 0, y: 0};
        var handleStyle = cardType == 'publisher' ? styles.dragHandlePublisher : styles.dragHandleSubscriber;
        var gridMetrics = this.getGridMetrics();

        return (
            <div key={cardId} style={Object.assign({}, styles.cardShell, {left: position.x, top: position.y, width: gridMetrics.cardWidth})}>
                <div style={Object.assign({}, styles.dragHandle, handleStyle)} onMouseDown={this.startCardDrag.bind(this, cardType, cardId)}>
                    <span style={styles.dragHandleTitle}>
                        <IconGrip size={14} style={{marginRight: 8, opacity: 0.7}}/>
                        {label}
                    </span>
                    <span style={styles.dragHandleActions}>
                        <button type="button" title={'Delete ' + label.toLowerCase()} style={styles.dragHandleActionButton} onMouseDown={function(event) { event.stopPropagation(); }} onClick={this.deleteCard.bind(this, cardType, cardId)}>
                            <IconX size={14}/>
                        </button>
                    </span>
                </div>
                {component}
            </div>
        );
    }

    render() {
        var cardItems = [];
        var message = '';
        var mqttClientLabel = '';
        var conStateColor = 'btn btn-primary';
        var conStateText = 'Not Connected';

        if(this.state.conState == MqttClientConstants.CONNECTION_STATE_CONNECTED) {
            conStateColor = 'btn btn-success';
            conStateText = 'Connected';
        } else if(this.state.conState == MqttClientConstants.CONNECTION_STATE_ERROR) {
           conStateColor = 'btn btn-danger';
           conStateText = 'Connection Error';
        }

        if(this.state.mqttClientSettings != null) {
            mqttClientLabel = this.state.mqttClientSettings.mqttClientName + ' - ' + this.state.mqttClientSettings.protocol + '://' + this.state.mqttClientSettings.host;

            if(this.state.mqttClientSettings.publishSettings != null && this.state.mqttClientSettings.publishSettings.length > 0) {
                for(var i = 0; i < this.state.mqttClientSettings.publishSettings.length; i++) {
                    var publisherSettings = this.state.mqttClientSettings.publishSettings[i];
                    cardItems.push({
                        id: publisherSettings.pubId,
                        type: 'publisher',
                        node: this.renderCardShell(
                            'publisher',
                            publisherSettings.pubId,
                            'Publisher',
                            <MqttClientPublisher conState={this.state.conState} mcsId={this.props.params.mcsId} publisherSettings={publisherSettings}/>
                        )
                    });
                }
            }

            if(this.state.mqttClientSettings.subscribeSettings != null && this.state.mqttClientSettings.subscribeSettings.length > 0) {
                for(var j = 0; j < this.state.mqttClientSettings.subscribeSettings.length; j++) {
                    var subscriberSettings = this.state.mqttClientSettings.subscribeSettings[j];
                    cardItems.push({
                        id: subscriberSettings.subId,
                        type: 'subscriber',
                        node: this.renderCardShell(
                            'subscriber',
                            subscriberSettings.subId,
                            'Subscriber',
                            <MqttClientSubscriber conState={this.state.conState} mcsId={this.props.params.mcsId} subscriberSettings={subscriberSettings}/>
                        )
                    });
                }
            }
        }

        if(cardItems.length == 0) {
            message = <div className="alert alert-success" role="alert"><b>You have no publisher or subscriber added for this MQTT client. Please click above buttons to add new MQTT publisher or MQTT subscriber for this MQTT client</b></div>;
        }

        return (
            <div>
                <nav className="navbar navbar-default navbar-fixed-top">
                    <div>
                        <div className="navbar-header" style={{paddingTop: 8}}>
                            <a href="#/mqttclientslist" style={{marginLeft: 10}} className="btn btn-default"><IconArrowLeft size={14}/></a>
                        </div>
                        <div id="navbar" className="navbar-collapse collapse">
                            <ul className="nav navbar-nav">
                                <li>
                                    <button onClick={this.changeConnectionState} style={styles.button} type="button" className={conStateColor} aria-label="Left Align">
                                        <IconWifi size={15} style={{marginRight: 6}}/>{conStateText}
                                    </button>
                                </li>
                                <li>
                                    <button onClick={this.savePublisherSettings} title="Add new publisher" style={styles.button} type="button" className="btn btn-default" aria-label="Left Align">
                                        <IconUpload size={15} style={{marginRight: 6, color: '#337ab7'}}/>Add publisher
                                    </button>
                                </li>
                                <li>
                                    <button onClick={this.saveSubscriberSettings} title="Add new subscriber" style={styles.button} type="button" className="btn btn-default" aria-label="Left Align">
                                        <IconDownload size={15} style={{marginRight: 6, color: '#eea236'}}/>Add subscriber
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={this.toggleSnapToGrid}
                                        title={this.state.snapToGridEnabled ? 'Disable snap to grid' : 'Enable snap to grid'}
                                        style={this.state.snapToGridEnabled ? Object.assign({}, styles.iconButton, styles.iconButtonActive) : styles.iconButton}
                                        type="button"
                                        className="btn btn-default"
                                        aria-label="Snap to grid"
                                    >
                                        <IconGrid size={15}/>
                                    </button>
                                </li>
                                <li>
                                    <button onClick={NavUtils.gotToAddMqttClient.bind(this, this.props.params.mcsId)} title="Edit MQTT Client Settings"
                                    style={styles.button} type="button" className="btn btn-default" aria-label="Left Align">
                                        <IconSettings size={15}/>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>
                <div style={{marginLeft: 15}}><small><code style={{color: '#337ab7'}}>{mqttClientLabel}</code></small></div>
                <div className="container-fluid">
                    <div ref={this.setBoardContainerRef} style={Object.assign({}, styles.boardContainer, {minHeight: this.buildBoardHeight(cardItems)})}>
                        {cardItems.map(function(cardItem) { return cardItem.node; })}
                    </div>
                    <div>
                        {message}
                    </div>
                </div>
            </div>
        );
    }
}

export default MqttClientDashboard;
