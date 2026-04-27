import PlatformMqttClientService from './PlatformMqttClientService';
import PlatformMqttLoadService from './PlatformMqttLoadService';
import MqttClientService from '../services/MqttClientService';
import MqttLoadService from '../services/MqttLoadService';
import CommonConstants from '../utils/CommonConstants';

class PlatformDispatcherService {

    constructor() {
        this.ipcRenderer = null;

        if(typeof window !== 'undefined' && typeof window.require === 'function') {
            try {
                this.ipcRenderer = window.require('electron').ipcRenderer;
            } catch (error) {
                this.ipcRenderer = null;
            }
        }

        if(this.ipcRenderer != null) {
            this.ipcRenderer.on(CommonConstants.SERVICE_TYPE_MQTT_CLIENTS, function(event, eventObj) {
                this.processEvents(eventObj, CommonConstants.SERVICE_TYPE_MQTT_CLIENTS);
            }.bind(this));
        }
    }

    dispatcherAction(action,serviceType) {
        if(serviceType == CommonConstants.SERVICE_TYPE_MQTT_CLIENTS) {
            if(this.ipcRenderer != null) {
                this.ipcRenderer.send(CommonConstants.SERVICE_TYPE_MQTT_CLIENTS, action);
            } else {
                PlatformMqttClientService.processAction(action);
            }
        } else if(serviceType == CommonConstants.SERVICE_TYPE_MQTT_LOAD) {
            PlatformMqttLoadService.processAction(action);
        }
    }

    processEvents(event,serviceType) {
        if(serviceType == CommonConstants.SERVICE_TYPE_MQTT_CLIENTS) {
            MqttClientService.processEvents(event);
        } else if(serviceType == CommonConstants.SERVICE_TYPE_MQTT_LOAD) {
            MqttLoadService.processEvents(event);
        }
    }
}

export default new PlatformDispatcherService();
