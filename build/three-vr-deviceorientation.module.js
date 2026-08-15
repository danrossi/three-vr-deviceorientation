import { Euler, EventDispatcher, MathUtils, Quaternion, Vector3 } from "three";
//#region src/DeviceOrientationControls.js
var _sensorQ = new Quaternion();
var _outQ = new Quaternion();
var _out = new Float32Array(4);
var X_AXIS = new Vector3(1, 0, 0);
var Z_AXIS = new Vector3(0, 0, 1);
var SENSOR_TO_VR = new Quaternion();
var deviceOrientationEventName = "deviceorientation";
SENSOR_TO_VR.setFromAxisAngle(X_AXIS, -Math.PI / 2);
SENSOR_TO_VR.multiply(new Quaternion().setFromAxisAngle(Z_AXIS, Math.PI / 2));
var zee = new Vector3(0, 0, 1);
var euler = new Euler();
var q0 = new Quaternion();
var axisPos = Math.sqrt(.5);
var q1 = new Quaternion(-axisPos, 0, 0, axisPos);
var _onSensorReadRef;
var DeviceOrientationControls = class DeviceOrientationControls extends EventDispatcher {
	constructor(object, alphaOffset = 0) {
		super();
		this.object = object;
		this.object.rotation.reorder("YXZ");
		this.enabled = false;
		this.deviceOrientation = {};
		this.screenOrientation = 0;
		this.alphaOffset = alphaOffset;
		this.originalRotation = null;
		this.sensor = null;
	}
	setObjectQuaternion(quaternion, alpha, beta, gamma, orient) {
		euler.set(beta, alpha, -gamma, "YXZ");
		quaternion.setFromEuler(euler);
		quaternion.multiply(q1);
		quaternion.multiply(q0.setFromAxisAngle(zee, orient));
	}
	connect() {
		this.originalRotation = this.object.quaternion.clone();
		this.initOrientationSensor();
		this.enabled = true;
	}
	static get hasSensor() {
		return "RelativeOrientationSensor" in window;
	}
	initOrientationSensor() {
		if (DeviceOrientationControls.hasSensor) {
			const options = {
				frequency: 60,
				referenceFrame: "screen"
			};
			const sensor = this.sensor = new RelativeOrientationSensor(options);
			Promise.all([navigator.permissions.query({ name: "accelerometer" }), navigator.permissions.query({ name: "gyroscope" })]).then((results) => {
				if (results.every((result) => result.state === "granted")) {
					sensor.start();
					_onSensorReadRef = () => this.onSensorRead();
					this.sensor.addEventListener("reading", _onSensorReadRef);
				} else {
					console.log("No permissions to use RelativeOrientationSensor.");
					this.useDeviceOrientation();
					this.detectOrientationError();
				}
			});
		} else this.useDeviceOrientation();
	}
	detectOrientationError() {
		setTimeout(() => {
			if (!this.deviceOrientation.alpha) this.dispatchEvent({ type: "error" });
		}, 2e3);
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
		this.object.quaternion.fromArray(_out);
	}
	static get requireOrientationPermission() {
		return window.DeviceOrientationEvent !== void 0 && typeof window.DeviceOrientationEvent.requestPermission === "function";
	}
	useDeviceOrientation() {
		this.onScreenOrientationChangeRef = () => {
			switch (screen.orientation.type) {
				case "landscape-secondary":
					q1._x = axisPos;
					break;
				default: q1._x = -axisPos;
			}
			this.screenOrientation = screen.orientation.angle;
		};
		this.onDeviceOrientationChangeRef = (e) => {
			this.deviceOrientation = e;
		};
		this.onScreenOrientationChangeRef();
		if (DeviceOrientationControls.requireOrientationPermission) window.DeviceOrientationEvent.requestPermission().then((response) => {
			if (response == "granted") {
				screen.orientation.addEventListener("change", this.onScreenOrientationChangeRef, false);
				window.addEventListener(deviceOrientationEventName, this.onDeviceOrientationChangeRef, false);
			}
		}).catch(function(error) {
			console.error("THREE.DeviceOrientationControls: Unable to use DeviceOrientation API:", error);
			this.dispatchEvent({ type: "error" });
		});
		else {
			screen.orientation.addEventListener("change", this.onScreenOrientationChangeRef, false);
			window.addEventListener(deviceOrientationEventName, this.onDeviceOrientationChangeRef, false);
		}
	}
	disconnect() {
		this.enabled = false;
		if (this.sensor) {
			this.sensor.stop();
			this.sensor.removeEventListener("reading", _onSensorReadRef);
			_onSensorReadRef = null;
			this.sensor = null;
		} else {
			screen.orientation.removeEventListener("change", this.onScreenOrientationChangeRef, false);
			window.removeEventListener(deviceOrientationEventName, this.onDeviceOrientationChangeRef, false);
		}
		this.screenOrientation = 0;
		this.deviceOrientation = null;
		this.object.quaternion.copy(this.originalRotation);
	}
	update() {
		if (this.enabled === false) return;
		if (this.sensor) return;
		const device = this.deviceOrientation;
		if (device) {
			const alpha = MathUtils.degToRad(device.alpha) + this.alphaOffset, beta = MathUtils.degToRad(device.beta), gamma = MathUtils.degToRad(device.gamma), orient = MathUtils.degToRad(this.screenOrientation);
			this.setObjectQuaternion(this.object.quaternion, alpha, beta, gamma, orient);
		}
	}
	dispose() {
		this.disconnect();
	}
};
//#endregion
export { DeviceOrientationControls };
