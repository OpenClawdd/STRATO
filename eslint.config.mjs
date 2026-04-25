import globals from "globals";

export default [
	{
		ignores: ["**/node_modules"],
	},
	{
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.node,
				AbortController: "readonly",
				fetch: "readonly",
				AbortSignal: "readonly",
				URL: "readonly",
			},
		},
	},
];
