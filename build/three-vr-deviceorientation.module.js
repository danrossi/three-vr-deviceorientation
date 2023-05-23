import { Quaternion, Vector3, Euler, MathUtils } from 'three';

/**
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 * W3C Device Orientation control (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */

const _sensorQ = new Quaternion(),
_outQ = new Quaternion(),
_out = new Float32Array(4),
X_AXIS = new Vector3(1, 0, 0),
Z_AXIS = new Vector3(0, 0, 1),
SENSOR_TO_VR = new Quaternion();


SENSOR_TO_VR.setFromAxisAngle(X_AXIS, -Math.PI / 2);
SENSOR_TO_VR.multiply(new Quaternion().setFromAxisAngle(Z_AXIS, Math.PI / 2));

const zee = new Vector3( 0, 0, 1 ),
euler = new Euler(),
q0 = new Quaternion(),
q1 = new Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis


let _onSensorReadRef;


class DeviceOrientationControls {

	constructor(object) {
		this.object = object;
		this.object.rotation.reorder( 'YXZ' );

		this.enabled = true;

		this.deviceOrientation = {};
		this.screenOrientation = 0;

		this.alphaOffset = 0; // radians

		this.connect();
	}

	// The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''



	setObjectQuaternion(quaternion, alpha, beta, gamma, orient ) {

		euler.set( beta, alpha, - gamma, 'YXZ' ); // 'ZXY' for the device, but 'YXZ' for us

		quaternion.setFromEuler( euler ); // orient the device
		quaternion.multiply( q1 ); // camera looks out the back of the device, not the top
		quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) ); // adjust for screen orientation

	}

	connect() {
		this.initOrientationSensor();
		
		this.enabled = true;
	}

	static get hasSensor() {
		return "RelativeOrientationSensor" in window;
	}

	initOrientationSensor() {

		if (DeviceOrientationControls.hasSensor) {
			const options = { frequency: 60, referenceFrame: 'screen' };
			const sensor = this.sensor = new RelativeOrientationSensor(options);
			Promise.all([navigator.permissions.query({ name: "accelerometer" }),
			             navigator.permissions.query({ name: "gyroscope" })])
			       .then(results => {
			         if (results.every(result => result.state === "granted")) {
			           sensor.start();
			           _onSensorReadRef = () => this.onSensorRead();
					   this.sensor.addEventListener('reading', _onSensorReadRef);
			           
			         } else {
			           console.log("No permissions to use RelativeOrientationSensor.");
			           this.useDeviceOrientation();
			         }
			   });
		} else {
			this.useDeviceOrientation();
		}

		


	}

	onSensorRead() {
		const q = this.sensor.quaternion;
	    _sensorQ.set(q[0], q[1], q[2], q[3]);

		const out = _outQ;
		out.copy(SENSOR_TO_VR);
		out.multiply(_sensorQ);
			   
		_out[0] = out.x;
		_out[1] = out.y;
		_out[2] = out.z;
		_out[3] = out.w;

		//console.log("sensor", _out);

		this.object.quaternion.fromArray(_out);
		//this.object.quaternion.fromArray(this.sensor.quaternion);
	}

	static get requireOrientationPermission() {
		return window.DeviceOrientationEvent !== undefined && typeof window.DeviceOrientationEvent.requestPermission === 'function';
	}

	useDeviceOrientation() {
		this.onScreenOrientationChangeRef = (e) => {
			this.screenOrientation = window.orientation || 0;

			//fix for chrome bug
			this.screenOrientation = screen.orientation && screen.orientation.type.indexOf("landscape") > -1 && !this.screenOrientation ?
			90 : this.screenOrientation;
		};

		this.onDeviceOrientationChangeRef = (e) => {
			this.deviceOrientation = e;
		};

		this.onScreenOrientationChangeRef();

		if ( DeviceOrientationControls.requireOrientationPermission ) {

			window.DeviceOrientationEvent.requestPermission().then( ( response ) => {

				if ( response == 'granted' ) {

					window.addEventListener( 'orientationchange', this.onScreenOrientationChangeRef, false );
					window.addEventListener( 'deviceorientation', this.onDeviceOrientationChangeRef, false );

				}

			} ).catch( function ( error ) {

				console.error( 'THREE.DeviceOrientationControls: Unable to use DeviceOrientation API:', error );

			} );

		} else {

			window.addEventListener( 'orientationchange', this.onScreenOrientationChangeRef, false );
			window.addEventListener( 'deviceorientation', this.onDeviceOrientationChangeRef, false );

		}

	}

	disconnect() {

		this.enabled = false;

		if (this.sensor) {
			this.sensor.stop();
			this.sensor.removeEventListener('reading', _onSensorReadRef);
			_onSensorReadRef = null;
			this.sensor = null;
			return;
		}

		window.removeEventListener( 'orientationchange', this.onScreenOrientationChangeRef, false );
		window.removeEventListener( 'deviceorientation', this.onDeviceOrientationChangeRef, false );

	}

	update() {

		if ( this.enabled === false ) return;

		if (this.sensor) {
			return;
		}

		const device = this.deviceOrientation;

		if ( device ) {

			const alpha = device.alpha ? MathUtils.degToRad( device.alpha ) + this.alphaOffset : 0, // Z
			beta = device.beta ? MathUtils.degToRad( device.beta ) : 0, // X'
			gamma = device.gamma ? MathUtils.degToRad( device.gamma ) : 0, // Y''
			orient = this.screenOrientation ? MathUtils.degToRad( this.screenOrientation ) : 0; // O

			this.setObjectQuaternion( this.object.quaternion, alpha, beta, gamma, orient );
		}
	}

	dispose() {
		this.disconnect();
	}
}

export { DeviceOrientationControls };
