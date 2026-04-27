import CommonConstants from '../../utils/CommonConstants';

class PlatformConstants {}

var isElectronRuntime = typeof navigator !== 'undefined' && navigator.userAgent != null && navigator.userAgent.indexOf('Electron') > -1;

PlatformConstants.PLATFORM_TYPE = isElectronRuntime ? CommonConstants.PLATFORM_ELECTRON_APP : CommonConstants.PLATFORM_WEB_APP;

export default PlatformConstants;
