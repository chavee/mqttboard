# MQTTBoard
#### Developers helper program to create and test MQTT connectivity protocol.
Supercharge your MQTT workflow with MQTTBoard Apps available on Chrome, Linux, Mac, Web and Windows! Build, test, and document your MQTT connectivity protocol.

#### [MQTTBoard Apps are available for following platforms - Download MQTTBoard Apps HERE!](http://workswithweb.com/html/mqttbox/downloads.html)

![Chrome](http://workswithweb.com/images/platforms/chrome.png "Chrome Store app")![Linux](http://workswithweb.com/images/platforms/linux.png "Linux")![MAC](http://workswithweb.com/images/platforms/mac.png "MAC app")![HTML App](http://workswithweb.com/images/platforms/html.png "HTML App")![Windows](http://workswithweb.com/images/platforms/windows.png "Windows app")

#### MQTTBoard Client features include:
- Connect to multiple mqtt brokers with TCP or Web Sockets protocols
- Connect with wide range of mqtt client connection settings
- Publish/Subscribe to multiple topics at same time
- Supports Single Level(+) and Multilevel(#) subscription to topics
- Copy/Republish payloads
- History of published/subscribed messages for each topic
- Reconnect client to broker

#### MQTTBoard Load test features include:
- Load test MQTT publisher/Subscriber.
- Run load test with wide range load test settings
- View load test data 
- View load test results in graphs

Please report Feature Requests, Enhancements or Bugs to workswithweb@gmail.com or on [Github](https://github.com/issues)

## Getting Started
Make sure you have [Node.js](https://nodejs.org/en/) installed and follow below steps to build and execute.

- `git clone git@github.com:workswithweb/MQTTBox.git`

- `cd MQTTBoard`

- `npm install`

- `Open /node_modules/mqtt/lib/connect/ws.js file and goto line 56 or where ever you find below code.`
    else {
        throw new Error('Could not determine host. Specify host manually.')
    }
 `Remove this else block completely. We need this step to make mqtt.js works with webworkers`.

Thats it !!! Your project is setup. Execute below commands in your current folder (MQTTBoard) as per your app requirements.

###### Desktop App
- `npm run desktop` - Launches MQTTBoard as an Electron desktop app using the checked-in `build/` assets.
- Use `File -> Export Config JSON` to back up `clients`, `loads`, and `folders` to a JSON file.
- Use `File -> Import Config JSON` to restore a JSON backup. The desktop app reloads after import.

###### Desktop Release
- GitHub Actions workflow at `.github/workflows/release.yml` builds desktop packages for macOS Intel, macOS Apple Silicon, Windows x64, and Linux x64 when you push a tag that starts with `v`.
- Required repository secrets for macOS signing/notarization: `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPSTORE_KEY_ID`, `APPSTORE_ISSUER_ID`, `APPSTORE_PRIVATE_KEY`.
- Create and push a release tag:
  - `git tag v1.0.1`
  - `git push origin v1.0.1`
- The workflow creates or updates a draft GitHub Release and uploads artifacts collected from `dist/`.
- You can also run the workflow manually with `workflow_dispatch`; macOS builds from manual runs are unsigned by design.

###### Web App Builds
- `gulp build` - Generates `build` folder with all compiled static web assets in your current directory (MQTTBoard). You can deploy `build` in you web/app server.

- `gulp` - Live development mode. Use while development to see live reload of your web app when changes done in code.

By default `master` branch has MQTTBoard web app. Please check other MQTTBox branches for other platform apps.
 
NOTE: 
1.Web App supports only Websockets because of browser limitations.
2.We are working to make all apps to look in sync.
3.We are working to make all features avaliable to all platforms.
