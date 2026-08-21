'use strict';

const mqtt = require('mqtt');
const { Qlobber } = require('qlobber');

const ACTION_MQTT_CLIENT_CONNECT = 'ACTION_MQTT_CLIENT_CONNECT';
const ACTION_MQTT_CLIENT_DISCONNECT = 'ACTION_MQTT_CLIENT_DISCONNECT';
const ACTION_PUBLISH_MESSAGE = 'ACTION_PUBLISH_MESSAGE';
const ACTION_SUBSCRIBE_TO_TOPIC = 'ACTION_SUBSCRIBE_TO_TOPIC';
const ACTION_UN_SUBSCRIBE_TO_TOPIC = 'ACTION_UN_SUBSCRIBE_TO_TOPIC';

const EVENT_MQTT_CLIENT_CONN_STATE_CHANGED = 'EVENT_MQTT_CLIENT_CONN_STATE_CHANGED';
const EVENT_MQTT_CLIENT_SUBSCRIBED_DATA_RECIEVED = 'EVENT_MQTT_CLIENT_SUBSCRIBED_DATA_RECIEVED';
const EVENT_MQTT_CLIENT_CONNECTION_CLOSED = 'EVENT_MQTT_CLIENT_CONNECTION_CLOSED';
const EVENT_MQTT_CLIENT_PUBLISHED_MESSAGE = 'EVENT_MQTT_CLIENT_PUBLISHED_MESSAGE';

const CONNECTION_STATE_CONNECTED = 'CONNECTED';
const CONNECTION_STATE_ERROR = 'CONNECT_ERROR';

class DesktopMqttClientWorker {
  constructor() {
    this.client = null;
    this.isDisconnecting = false;
    this.matcher = new Qlobber({ separator: '/', wildcard_one: '+', wildcard_some: '#' });
    this.mqttClientObj = null;

    process.on('message', this.processAction.bind(this));
  }

  emitChange(eventObj) {
    if (typeof process.send === 'function') {
      process.send(eventObj);
    }
  }

  processAction(action) {
    if (action == null) {
      return;
    }

    switch (action.actionType) {
      case ACTION_MQTT_CLIENT_CONNECT:
        this.connect(action.data);
        break;
      case ACTION_MQTT_CLIENT_DISCONNECT:
        this.disconnect();
        break;
      case ACTION_PUBLISH_MESSAGE:
        this.publishMessage(action.data);
        break;
      case ACTION_SUBSCRIBE_TO_TOPIC:
        this.subscribeToTopic(action.data);
        break;
      case ACTION_UN_SUBSCRIBE_TO_TOPIC:
        this.unSubscribeTopic(action.data);
        break;
      default:
        break;
    }
  }

  publishClientConnectionStatus(connState, error) {
    const payload = {
      event: EVENT_MQTT_CLIENT_CONN_STATE_CHANGED,
      data: {
        mcsId: this.mqttClientObj != null ? this.mqttClientObj.mcsId : null,
        connState: connState
      }
    };

    if (error != null) {
      payload.data.errorMessage = error.message || String(error);
      payload.data.errorCode = error.code || null;
    }

    this.emitChange(payload);
  }

  getConnectOptions() {
    const clId = this.mqttClientObj.timestampClientId === true
      ? this.mqttClientObj.mqttClientId + (+new Date())
      : this.mqttClientObj.mqttClientId;

    const options = {
      protocolId: this.mqttClientObj.protocolId,
      protocolVersion: this.mqttClientObj.protocolVersion,
      keepalive: Number(this.mqttClientObj.keepalive),
      reschedulePings: this.mqttClientObj.reschedulePings,
      clientId: clId,
      clean: this.mqttClientObj.clean,
      reconnectPeriod: Number(this.mqttClientObj.reconnectPeriod),
      connectTimeout: Number(this.mqttClientObj.connectTimeout),
      queueQoSZero: this.mqttClientObj.queueQoSZero
    };

    if (this.mqttClientObj.username != null && this.mqttClientObj.username.trim().length > 0) {
      options.username = this.mqttClientObj.username;
    }
    if (this.mqttClientObj.password != null && this.mqttClientObj.password.trim().length > 0) {
      options.password = this.mqttClientObj.password;
    }

    if (
      this.mqttClientObj.willTopic != null &&
      this.mqttClientObj.willTopic.length > 0 &&
      this.mqttClientObj.willPayload != null
    ) {
      options.will = {
        topic: this.mqttClientObj.willTopic,
        payload: this.mqttClientObj.willPayload,
        qos: this.mqttClientObj.willQos,
        retain: this.mqttClientObj.willRetain
      };
    }

    if (this.mqttClientObj.protocol === 'mqtts' || this.mqttClientObj.protocol === 'wss') {
      if (this.mqttClientObj.certificateType === 'ssc') {
        options.ca = this.mqttClientObj.caFile;
        options.cert = this.mqttClientObj.clientCertificateFile;
        options.key = this.mqttClientObj.clientKeyFile;
        options.passphrase = this.mqttClientObj.clientKeyPassphrase;
        options.rejectUnauthorized = true;
      } else if (this.mqttClientObj.certificateType === 'cc') {
        options.ca = this.mqttClientObj.caFile;
        options.rejectUnauthorized = true;
      } else if (this.mqttClientObj.certificateType === 'cssc') {
        options.rejectUnauthorized = false;
      }

      // Keep the desktop worker aligned with the profile setting and the
      // browser worker. This bypasses only hostname/SAN matching; the CA
      // chain and client certificate are still verified for mTLS profiles.
      if (this.mqttClientObj.skipDomainVerification === true) {
        options.checkServerIdentity = () => undefined;
      }

      if (this.mqttClientObj.sslTlsVersion != null && this.mqttClientObj.sslTlsVersion !== 'auto') {
        options.secureProtocol = this.mqttClientObj.sslTlsVersion;
      }
    }

    return options;
  }

  attachClientListeners() {
    this.client.on('connect', () => {
      this.publishClientConnectionStatus(CONNECTION_STATE_CONNECTED);
    });

    this.client.on('close', () => {
      if (this.isDisconnecting === false) {
        this.publishClientConnectionStatus(CONNECTION_STATE_ERROR);
      }
    });

    this.client.on('offline', () => {
      this.publishClientConnectionStatus(CONNECTION_STATE_ERROR);
    });

    this.client.on('error', (error) => {
      this.publishClientConnectionStatus(CONNECTION_STATE_ERROR, error);
    });

    this.client.on('message', (topic, message, packet) => {
      const topics = this.matcher.match(topic);
      if (message != null && topics != null && topics.length > 0) {
        topics.forEach((matchedTopic) => {
          this.emitChange({
            event: EVENT_MQTT_CLIENT_SUBSCRIBED_DATA_RECIEVED,
            data: {
              mcsId: this.mqttClientObj.mcsId,
              topic: matchedTopic,
              message: message.toString(),
              packet: packet
            }
          });
        });
      }
    });
  }

  connectToBroker() {
    const brokerUrl = this.mqttClientObj.protocol + '://' + this.mqttClientObj.host;
    this.isDisconnecting = false;
    this.client = mqtt.connect(brokerUrl, this.getConnectOptions());
    this.attachClientListeners();
  }

  connect(newMqttClient) {
    this.mqttClientObj = newMqttClient;

    if (this.client != null) {
      this.client.end(true, () => {
        this.connectToBroker();
      });
    } else {
      this.connectToBroker();
    }
  }

  disconnect() {
    this.isDisconnecting = true;

    const mcsId = this.mqttClientObj != null ? this.mqttClientObj.mcsId : null;

    const sendClosedAndExit = () => {
      this.emitChange({
        event: EVENT_MQTT_CLIENT_CONNECTION_CLOSED,
        data: { mcsId: mcsId }
      });
      process.exit(0);
    };

    // Safety timeout: ensure the worker always exits even if client.end()
    // callback never fires (can happen during error/reconnecting state)
    const forceExitTimer = setTimeout(() => {
      sendClosedAndExit();
    }, 2000);

    if (this.client != null) {
      this.client.end(true, () => {
        clearTimeout(forceExitTimer);
        sendClosedAndExit();
      });
    } else {
      clearTimeout(forceExitTimer);
      sendClosedAndExit();
    }
  }

  publishMessage(data) {
    if (this.client == null || data == null || data.topic == null || data.topic.trim().length === 0) {
      return;
    }

    const publishedTime = +(new Date());
    this.client.publish(data.topic, data.payload, { qos: parseInt(data.qos, 10), retain: data.retain }, (err) => {
      if (err == null) {
        this.emitChange({
          event: EVENT_MQTT_CLIENT_PUBLISHED_MESSAGE,
          data: {
            publishedTime: publishedTime,
            qosResponseReceivedTime: +(new Date()),
            mcsId: this.mqttClientObj.mcsId,
            pubId: data.pubId,
            topic: data.topic,
            payload: data.payload,
            qos: data.qos,
            retain: data.retain
          }
        });
      }
    });
  }

  subscribeToTopic(data) {
    if (this.client == null || data == null || data.topic == null || data.topic.trim().length === 0) {
      return;
    }

    this.client.subscribe(data.topic, { qos: parseInt(data.qos, 10) });
    this.matcher.add(data.topic, data.topic);
  }

  unSubscribeTopic(data) {
    if (this.client == null || data == null || data.topic == null || data.topic.trim().length === 0) {
      return;
    }

    this.client.unsubscribe(data.topic);
    this.matcher.remove(data.topic, data.topic);
  }
}

new DesktopMqttClientWorker();
