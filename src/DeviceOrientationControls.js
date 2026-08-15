/**
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 * W3C Device Orientation control (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */

import {
  EventDispatcher,
  MathUtils,
  Quaternion,
  Euler,
  Vector3,
  Camera,
} from 'three';

const _sensorQ = new Quaternion(),
  _outQ = new Quaternion(),
  _out = new Float32Array(4),
  X_AXIS = new Vector3(1, 0, 0),
  Z_AXIS = new Vector3(0, 0, 1),
  SENSOR_TO_VR = new Quaternion(),
  deviceOrientationEventName = 'deviceorientation';

SENSOR_TO_VR.setFromAxisAngle(X_AXIS, -Math.PI / 2);
SENSOR_TO_VR.multiply(new Quaternion().setFromAxisAngle(Z_AXIS, Math.PI / 2));

const zee = new Vector3(0, 0, 1),
  euler = new Euler(),
  q0 = new Quaternion(),
  axisPos = Math.sqrt(0.5),
  q1 = new Quaternion(-axisPos, 0, 0, axisPos); // - PI/2 around the x-axis

let _onSensorReadRef;

export default class DeviceOrientationControls extends EventDispatcher {
  /**
   * Constructs a new DeviceOrientationControls
   *
   * @param {Camera} object - The camera object.
   * @param {Object} alphaOffset - The alpha offset.
   * @constructor
   */
  constructor(object, alphaOffset = 0) {
    super();
    /**
     * The Camera object.
     *
     * @type {Camera}
     */
    this.object = object;
    this.object.rotation.reorder('YXZ');

    /**
     * Enabled flag.
     *
     * @type {boolean}
     */
    this.enabled = false;

    /**
     * The device orientation event
     *
     * @type {DeviceOrientationEvent}
     */
    this.deviceOrientation = {};

    /**
     * The screen orientation alpha.
     *
     * @type {number}
     */
    this.screenOrientation = 0;

    /**
     * The alpha offset in radians.
     *
     * @type {number}
     */
    this.alphaOffset = alphaOffset; // radians

    /**
     * The original camera rotation.
     *
     * @type {Quaternion}
     */
    this.originalRotation = null;
    /**
     * The relative orientation sensor api.
     *
     * @type {RelativeOrientationSensor}
     */
    this.sensor = null;
  }

  // The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

  /**
   * set the object quaternion
   * @private
   * @param {Quaternion} quaternion - the quaternion object.
   * @param {number} alpha - the alpha.
   * @param {number} beta - the beta.
   * @param {number} gamma - the gamma.
   * @param {number} orient - the screen orientation.
   */
  setObjectQuaternion(quaternion, alpha, beta, gamma, orient) {
    euler.set(beta, alpha, -gamma, 'YXZ'); // 'ZXY' for the device, but 'YXZ' for us
    quaternion.setFromEuler(euler); // orient the device
    quaternion.multiply(q1); // camera looks out the back of the device, not the top
    quaternion.multiply(q0.setFromAxisAngle(zee, orient)); // adjust for screen orientation
    //quaternion.multiply(q0.setFromAxisAngle(zee, - orient)); // adjust for screen orientation
  }

  /**
   * Connect the controls
   */
  connect() {
    this.originalRotation = this.object.quaternion.clone();

    this.initOrientationSensor();

    this.enabled = true;
  }

  /**
   * Has sensor api
   */
  static get hasSensor() {
    return 'RelativeOrientationSensor' in window;
  }

  /**
   * Init sensor api or fallback to orientation events.
   */
  initOrientationSensor() {
    if (DeviceOrientationControls.hasSensor) {
      const options = { frequency: 60, referenceFrame: 'screen' };
      const sensor = (this.sensor = new RelativeOrientationSensor(options));

      Promise.all([
        navigator.permissions.query({ name: 'accelerometer' }),
        navigator.permissions.query({ name: 'gyroscope' }),
      ]).then((results) => {
        //console.log("results ", results);
        if (results.every((result) => result.state === 'granted')) {
          (this, sensor.start());
          _onSensorReadRef = () => this.onSensorRead();
          this.sensor.addEventListener('reading', _onSensorReadRef);
        } else {
          console.log('No permissions to use RelativeOrientationSensor.');
          this.useDeviceOrientation();
          this.detectOrientationError();
        }
      });
    } else {
      this.useDeviceOrientation();
    }
  }

  /**
   * Detect orientation error.
   */
  detectOrientationError() {
    setTimeout(() => {
      if (!this.deviceOrientation.alpha) this.dispatchEvent({ type: 'error' });
    }, 2000);
  }

  /**
   * On sensor api read.
   */
  onSensorRead() {
    const q = this.sensor.quaternion;
    _sensorQ.set(q[0], q[1], q[2], q[3]);

    const out = _outQ;
    //out.copy(this.originalRotation);
    out.copy(SENSOR_TO_VR);
    //out.multiply(SENSOR_TO_VR);
    out.multiply(_sensorQ);

    _out[0] = out.x;
    _out[1] = out.y;
    _out[2] = out.z;
    _out[3] = out.w;

    //console.log("sensor", _out);

    this.object.quaternion.fromArray(_out);
  }

  /**
   * IOS permissions check
   */
  static get requireOrientationPermission() {
    return (
      window.DeviceOrientationEvent !== undefined &&
      typeof window.DeviceOrientationEvent.requestPermission === 'function'
    );
  }

  /**
   * Use device orientation fallback
   */
  useDeviceOrientation() {
    this.onScreenOrientationChangeRef = () => {
      //switch x coordinates for reverse landscape
      switch (screen.orientation.type) {
        case 'landscape-secondary':
          //this.screenOrientation = 90;
          q1._x = axisPos;
          break;
        default:
          q1._x = -axisPos;
      }

      this.screenOrientation = screen.orientation.angle;
    };

    /**
     *
     * @param {DeviceOrientationEvent} e
     */
    this.onDeviceOrientationChangeRef = (e) => {
      this.deviceOrientation = e;

      //console.log("device ", this.deviceOrientation);
    };

    this.onScreenOrientationChangeRef();

    //get orientation permission for IOS
    if (DeviceOrientationControls.requireOrientationPermission) {
      window.DeviceOrientationEvent.requestPermission()
        .then((response) => {
          if (response == 'granted') {
            screen.orientation.addEventListener(
              'change',
              this.onScreenOrientationChangeRef,
              false,
            );
            window.addEventListener(
              deviceOrientationEventName,
              this.onDeviceOrientationChangeRef,
              false,
            );
          }
        })
        .catch(function (error) {
          console.error(
            'THREE.DeviceOrientationControls: Unable to use DeviceOrientation API:',
            error,
          );

          this.dispatchEvent({ type: 'error' });
        });
    } else {
      screen.orientation.addEventListener(
        'change',
        this.onScreenOrientationChangeRef,
        false,
      );
      window.addEventListener(
        deviceOrientationEventName,
        this.onDeviceOrientationChangeRef,
        false,
      );
    }
  }

  /**
   * Disconnect controls
   */
  disconnect() {
    this.enabled = false;

    if (this.sensor) {
      this.sensor.stop();
      this.sensor.removeEventListener('reading', _onSensorReadRef);
      _onSensorReadRef = null;
      this.sensor = null;
    } else {
      screen.orientation.removeEventListener(
        'change',
        this.onScreenOrientationChangeRef,
        false,
      );
      window.removeEventListener(
        deviceOrientationEventName,
        this.onDeviceOrientationChangeRef,
        false,
      );
    }

    //reset to original rotation
    this.screenOrientation = 0;
    this.deviceOrientation = null;
    this.object.quaternion.copy(this.originalRotation);
  }

  /**
   * Update controls
   * @returns
   */
  update() {
    if (this.enabled === false) return;

    if (this.sensor) {
      return;
    }

    const device = this.deviceOrientation;

    if (device) {
      //IOS alpha compass fix
      //const heading = device.webkitCompassHeading || device.compassHeading;

      /*const alpha = device.alpha || heading
				? MathUtils.degToRad(
					heading
						? 360 - heading
						: device.alpha || 0) + this.alphaOffset
				: 0, // Z*/

      //const alpha = device.alpha ? MathUtils.degToRad( device.alpha ) + this.alphaOffset : 0, // Z
      const alpha = MathUtils.degToRad(device.alpha) + this.alphaOffset, // Z
        beta = MathUtils.degToRad(device.beta), // X'
        gamma = MathUtils.degToRad(device.gamma), // Y''
        orient = MathUtils.degToRad(this.screenOrientation); // O

      //console.log("alpha", alpha);

      this.setObjectQuaternion(
        this.object.quaternion,
        alpha,
        beta,
        gamma,
        orient,
      );

      /*if ( 8 * ( 1 - lastQuaternion.dot( this.object.quaternion ) ) > EPS ) {

				lastQuaternion.copy( scope.object.quaternion );
				scope.dispatchEvent( _changeEvent );
		
			}*/
    }
  }

  /**
   * Dispose
   */
  dispose() {
    this.disconnect();
  }
}
