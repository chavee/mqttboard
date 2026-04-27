import React from 'react';
import {IconMenu, IconMonitor, IconZap, IconInfo} from './Icons';

const styles = {
    button: {
        margin: 10
    }
};

export default React.createClass({
    render() {
        return (
            <span>
                <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
                    <span className="sr-only">Toggle navigation</span>
                    <span className="icon-bar"></span>
                    <span className="icon-bar"></span>
                    <span className="icon-bar"></span>
                </button>
                <button style={styles.button} type="button" className="btn btn-default dropdown-toggle" aria-label="Left Align" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    <IconMenu size={14} style={{marginRight: 6}}/><b>Menu</b>
                </button>
                <ul className="dropdown-menu">
                    <li><a href="#/mqttclientslist"><IconMonitor size={14} style={{marginRight: 6}}/><b>MQTT CLIENTS</b></a></li>
                    <li><a href="#/mqttloadlist"><IconZap size={14} style={{marginRight: 6}}/><b>MQTT LOAD</b></a></li>
                    <li><a href="#/aboutapp"><IconInfo size={14} style={{marginRight: 6}}/><b>ABOUT</b></a></li>
                </ul>
            </span>);
    }
});
