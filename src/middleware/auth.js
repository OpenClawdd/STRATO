import { getAuthPage } from "../auth.js";

export const authMiddleware = (req, res, next) => {
	// Skip auth for static assets and known public paths
	const publicPaths = [
		"/frog/",
		"/surf/",
		"/config/",
		"/login",
		"/api/proxy-status",
		"/scramjet/",
		"/js/",
	];

	if (
		publicPaths.some((p) => req.path.startsWith(p)) ||
		req.path.match(/\.(js|css|png|jpg|webp|ico|wasm|json|svg)$/)
	) {
		return next();
	}

	if (req.signedCookies.strato_auth === "granted") {
		return next();
	}

	if (req.path === "/" || req.path === "/index.html") {
		return res.send(getAuthPage());
	}

	return res.redirect(302, "/");
};

export const loginHandler = (req, res) => {
	const tosAccepted =
		req.body.tos_accepted === "true" || req.body.tos_accepted === true;

	if (!tosAccepted) {
		return res.status(400).send("You must accept the Terms of Service.");
	}

	// Set the auth cookie
	res.cookie("strato_auth", "granted", {
		signed: true,
		httpOnly: true,
		secure: process.env.SECURE_COOKIES === "true",
		sameSite: "strict",
		maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
	});

	res.redirect("/");
};
