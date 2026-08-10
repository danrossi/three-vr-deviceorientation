import { EventDispatcher } from 'three';
export default class DeviceOrientationControls extends EventDispatcher<any> {
    static get hasSensor(): boolean;
    static get requireOrientationPermission(): boolean;
    constructor(object: any, alphaOffset?: number);
    object: any;
    enabled: boolean;
    deviceOrientation: {};
    screenOrientation: number;
    alphaOffset: number;
    setObjectQuaternion(quaternion: any, alpha: any, beta: any, gamma: any, orient: any): void;
    connect(): void;
    originalRotation: any;
    initOrientationSensor(): void;
    sensor: any;
    detectOrientationError(): void;
    onSensorRead(): void;
    useDeviceOrientation(): void;
    onScreenOrientationChangeRef: ((e: any) => void) | undefined;
    onDeviceOrientationChangeRef: ((e: any) => void) | undefined;
    disconnect(): void;
    update(): void;
    dispose(): void;
}
