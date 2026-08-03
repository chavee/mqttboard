import React from 'react';

function SvgBase(props) {
    var size = props.size || 16;
    var baseStyle = {
        verticalAlign: 'middle',
        display: 'inline-block',
        flexShrink: 0
    };
    var style = props.style ? Object.assign({}, baseStyle, props.style) : baseStyle;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={style}
            aria-hidden="true"
        >
            {props.children}
        </svg>
    );
}

export function IconArrowLeft(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
        </SvgBase>
    );
}

export function IconWifi(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
            <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
        </SvgBase>
    );
}

export function IconUpload(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
        </SvgBase>
    );
}

export function IconDownload(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </SvgBase>
    );
}

export function IconGrid(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
        </SvgBase>
    );
}

export function IconSettings(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </SvgBase>
    );
}

export function IconGrip(props) {
    var size = props.size || 16;
    var baseStyle = {
        verticalAlign: 'middle',
        display: 'inline-block',
        flexShrink: 0
    };
    var style = props.style ? Object.assign({}, baseStyle, props.style) : baseStyle;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
            style={style}
            aria-hidden="true"
        >
            <circle cx="9" cy="5" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/>
            <circle cx="9" cy="19" r="1.5"/>
            <circle cx="15" cy="5" r="1.5"/>
            <circle cx="15" cy="12" r="1.5"/>
            <circle cx="15" cy="19" r="1.5"/>
        </svg>
    );
}

export function IconTrash(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </SvgBase>
    );
}

export function IconRefresh(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </SvgBase>
    );
}

export function IconFolder(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </SvgBase>
    );
}

export function IconEdit(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </SvgBase>
    );
}

export function IconCopy(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </SvgBase>
    );
}

export function IconStar(props) {
    var size = props.size || 16;
    var baseStyle = {
        verticalAlign: 'middle',
        display: 'inline-block',
        flexShrink: 0
    };
    var style = props.style ? Object.assign({}, baseStyle, props.style) : baseStyle;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={props.filled ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={style}
            aria-hidden="true"
        >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
    );
}

export function IconX(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
        </SvgBase>
    );
}

export function IconMenu(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
        </SvgBase>
    );
}

export function IconMonitor(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
        </SvgBase>
    );
}

export function IconZap(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </SvgBase>
    );
}

export function IconInfo(props) {
    return (
        <SvgBase size={props.size} style={props.style}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </SvgBase>
    );
}
