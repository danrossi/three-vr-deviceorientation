export default [
	{
		input: './three-vr-deviceorientation.js',
		external: ['three'],
		plugins: [
		],
		output: [
			{
				format: 'esm',
				file: 'build/three-vr-deviceorientation.module.js'
			}
		]
	}
];
