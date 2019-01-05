class RateLimitError extends Error {
	isRateLimitError = true;
	constructor(message: string) {
		super(message);
		Object.setPrototypeOf(this, RateLimitError.prototype);
	}
}

export { RateLimitError };
