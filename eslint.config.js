import js from "@eslint/js";
import globals from "globals";

export default [
	{
		ignores: ["node_modules/", "competitors/", "public/uv/"]
	},
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2024,
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.node,
				...globals.serviceworker,
                registerSW: "readonly",
                BareMux: "readonly",
                scramjetController: "readonly",
                __uv$config: "readonly",
                __scramjet$config: "readonly",
                ScramjetServiceWorker: "readonly",
			},
		},
		rules: {
			"no-unused-vars": "warn",
			"no-console": "off",
			"no-constant-condition": "warn",
            "no-empty": "warn"
		},
	},
];
