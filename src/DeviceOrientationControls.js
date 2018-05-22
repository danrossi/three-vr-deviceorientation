/**
 * @author richt / http://richt.me
 * @author WestLangley / http://github.com/WestLangley
 *
 * W3C Device Orientation control (http://w3c.github.io/deviceorientation/spec-source-orientation.html)
 */

import { Vector3 } from '../../three.js/src/math/Vector3';
import { Euler } from '../../three.js/src/math/Euler';
import { Quaternion } from '../../three.js/src/math/Quaternion';
import { _Math } from '../../three.js/src/math/Math';


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

		const zee = new Vector3( 0, 0, 1 ),
		euler = new Euler(),
		q0 = new Quaternion(),
		q1 = new Quaternion( - Math.sqrt( 0.5 ), 0, 0, Math.sqrt( 0.5 ) ); // - PI/2 around the x-axis

		euler.set( beta, alpha, - gamma, 'YXZ' ); // 'ZXY' for the device, but 'YXZ' for us

		quaternion.setFromEuler( euler ); // orient the device
		quaternion.multiply( q1 ); // camera looks out the back of the device, not the top
		quaternion.multiply( q0.setFromAxisAngle( zee, - orient ) ); // adjust for screen orientation

	}

	connect() {

		this.onScreenOrientationChangeRef = (e) => {
			this.screenOrientation = window.orientation || 0;
		};

		this.onDeviceOrientationChangeRef = (e) => {
			this.deviceOrientation = e;
		};

		this.onScreenOrientationChangeRef();

		window.addEventListener( 'orientationchange', this.onScreenOrientationChangeRef, false );
		window.addEventListener( 'deviceorientation', this.onDeviceOrientationChangeRef, false );

		this.enabled = true;
	}

	disconnect() {

		window.removeEventListener( 'orientationchange', this.onScreenOrientationChangeRef, false );
		window.removeEventListener( 'deviceorientation', this.onDeviceOrientationChangeRef, false );

		this.enabled = false;

	}

	update() {

		if ( this.enabled === false ) return;

		const device = this.deviceOrientation;

		if ( device ) {

			const alpha = device.alpha ? _Math.degToRad( device.alpha ) + scope.alphaOffset : 0, // Z
			beta = device.beta ? _Math.degToRad( device.beta ) : 0, // X'
			gamma = device.gamma ? _Math.degToRad( device.gamma ) : 0, // Y''
			orient = scope.screenOrientation ? _Math.degToRad( scope.screenOrientation ) : 0; // O

			this.setObjectQuaternion( this.object.quaternion, alpha, beta, gamma, orient );
		}
	}

	dispose() {
		this.disconnect();
	}
}

export { DeviceOrientationControls };
