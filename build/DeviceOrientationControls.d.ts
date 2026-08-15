import { EventDispatcher, Camera, Quaternion } from 'three';
export default class DeviceOrientationControls extends EventDispatcher<any> {
    /**
     * Has sensor api
     */
    static get hasSensor(): boolean;
    /**
     * IOS permissions check
     */
    static get requireOrientationPermission(): boolean;
    /**
     * Constructs a new DeviceOrientationControls
     *
     * @param {Camera} object - The camera object.
     * @param {Object} alphaOffset - The alpha offset.
     * @constructor
     */
    constructor(object: Camera, alphaOffset?: Object);
    /**
     * The Camera object.
     *
     * @type {Camera}
     */
    object: Camera;
    /**
     * Enabled flag.
     *
     * @type {boolean}
     */
    enabled: boolean;
    /**
     * The device orientation event
     *
     * @type {DeviceOrientationEvent}
     */
    deviceOrientation: DeviceOrientationEvent;
    /**
     * The screen orientation alpha.
     *
     * @type {number}
     */
    screenOrientation: number;
    /**
     * The alpha offset in radians.
     *
     * @type {number}
     */
    alphaOffset: number;
    /**
     * The original camera rotation.
     *
     * @type {Quaternion}
     */
    originalRotation: Quaternion;
    /**
     * The relative orientation sensor api.
     *
     * @type {RelativeOrientationSensor}
     */
    sensor: RelativeOrientationSensor;
    /**
     * set the object quaternion
     * @private
     * @param {Quaternion} quaternion - the quaternion object.
     * @param {number} alpha - the alpha.
     * @param {number} beta - the beta.
     * @param {number} gamma - the gamma.
     * @param {number} orient - the screen orientation.
     */
    private setObjectQuaternion;
    /**
     * Connect the controls
     */
    connect(): void;
    /**
     * Init sensor api or fallback to orientation events.
     */
    initOrientationSensor(): void;
    /**
     * Detect orientation error.
     */
    detectOrientationError(): void;
    /**
     * On sensor api read.
     */
    onSensorRead(): void;
    /**
     * Use device orientation fallback
     */
    useDeviceOrientation(): void;
    onScreenOrientationChangeRef: (() => void) | undefined;
    /**
     *
     * @param {DeviceOrientationEvent} e
     */
    onDeviceOrientationChangeRef: ((e: DeviceOrientationEvent) => void) | undefined;
    /**
     * Disconnect controls
     */
    disconnect(): void;
    /**
     * Update controls
     * @returns
     */
    update(): void;
    /**
     * Dispose
     */
    dispose(): void;
}
