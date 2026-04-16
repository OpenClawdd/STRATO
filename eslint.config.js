import js from "@eslint/js";

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2024,
			sourceType: "module",
			globals: {
				console: "readonly",
				process: "readonly",
				setInterval: "readonly",
				clearInterval: "readonly",
				setTimeout: "readonly",
				clearTimeout: "readonly",
			},
		},
		rules: {
			"no-unused-vars": "warn",
			"no-console": "off",
			"no-constant-condition": "warn",
		},
	},
];
