import React from 'react';

import LeftMenuButton from '../common/LeftMenuButton';
import NavUtils from '../../utils/NavUtils';
import CommonConstants from '../../utils/CommonConstants';

const styles = {
    buttonContainer: {
        marginTop: 10,
        marginRight: 5
    },
    page: {
        margin: 10
    },
    hero: {
        marginBottom: 20
    },
    section: {
        minHeight: 180
    },
    bodyText: {
        fontSize: 15,
        lineHeight: 1.6
    }
};

export default class AboutApp extends React.Component {

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <nav className="navbar navbar-default navbar-fixed-top">
                    <div>
                        <div className="navbar-header">
                            <LeftMenuButton/>
                        </div>
                        <div id="navbar" className="navbar-collapse collapse">
                            <ul className="nav navbar-nav">
                                <li style={styles.buttonContainer}>
                                    <button onClick={NavUtils.goToMqttClientList} title="MQTT CLIENTS" type="button" className="btn btn-default">
                                      <span className="glyphicon glyphicon-modal-window" aria-hidden="true"></span>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </nav>
                <div className="container-fluid" style={styles.page}>
                    <div style={styles.hero} className="media">
                        <div className="media-left">
                            <img style={{width: 100, height: 100}} className="media-object"
                                src="./images/icon-128.png" alt="MQTTBoard"/>
                        </div>
                        <div className="media-body">
                            <h3 className="media-heading">MQTTBoard</h3>
                            <h4 className="media-heading">Version {CommonConstants.APP_VERSION}</h4>
                            <p style={styles.bodyText}>
                                Desktop MQTT client for connecting to brokers, publishing test payloads, subscribing to topics,
                                and arranging per-device dashboards for debugging and control.
                            </p>
                        </div>
                    </div>
                    <div style={{textAlign: 'center'}} className="row">
                        <div className="col-xs-12 col-sm-6 col-md-3">
                            <div style={styles.section} className="thumbnail">
                                <div className="caption">
                                    <h4>Connections</h4>
                                    <p>Manage broker profiles in one place and switch quickly between test environments.</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-12 col-sm-6 col-md-3">
                            <div style={styles.section} className="thumbnail">
                                <div className="caption">
                                    <h4>Publish and Subscribe</h4>
                                    <p>Open publisher and subscriber cards per device to inspect message flow without leaving the dashboard.</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-12 col-sm-6 col-md-3">
                            <div style={styles.section} className="thumbnail">
                                <div className="caption">
                                    <h4>Layout</h4>
                                    <p>Drag cards freely or snap to grid and keep the layout preference with each MQTT client configuration.</p>
                                </div>
                            </div>
                        </div>
                        <div className="col-xs-12 col-sm-6 col-md-3">
                            <div style={styles.section} className="thumbnail">
                                <div className="caption">
                                    <h4>Desktop Runtime</h4>
                                    <p>Electron build supports direct `mqtt://` and `mqtts://` usage for local debugging workflows.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{textAlign: 'center', marginTop: 30, color: '#777'}}>
                        <p>Copyleft © 2026 Chavee Issariyapat</p>
                        <p>Inspired by Workswithweb MQTTBox</p>
                    </div>
                </div>
            </div>
        );
    }
}
